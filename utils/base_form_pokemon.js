const BLOCKED_FORM_TOKENS = [
  'battle-bond',
  'ash',
  'crowned',
  'eternamax',
  'complete',
  'power-construct',
  'starter',
  'gmax',
  'mega',
  'primal',
  'origin',
  'totem'
];

function normalize(v) {
  return String(v || '').toLowerCase().trim();
}

function formIdentifier(entry) {
  return normalize(entry && entry.form_identifier);
}

function identifier(entry) {
  return normalize(entry && entry.identifier);
}

function isBattleOnly(entry) {
  return normalize(entry && entry.is_battle_only) === '1';
}

function pickBaseIdentifierForSpecies(speciesKey, forms) {
  const key = normalize(speciesKey);
  const rows = Array.isArray(forms && forms[key]) ? forms[key] : [];
  if (!rows.length) return key;

  // Prefer canonical default form_identifier "" when available.
  const canonical = rows.find((r) => !isBattleOnly(r) && formIdentifier(r) === '');
  if (canonical) return identifier(canonical);

  // Zygarde has no empty form_identifier in this dataset; prefer 50% form.
  if (key === 'zygarde') {
    const z50 = rows.find((r) => !isBattleOnly(r) && identifier(r) === 'zygarde-50');
    if (z50) return 'zygarde-50';
    const z10 = rows.find((r) => !isBattleOnly(r) && identifier(r) === 'zygarde-10');
    if (z10) return 'zygarde-10';
  }

  const fallback = rows.find((r) => {
    if (isBattleOnly(r)) return false;
    const id = identifier(r);
    return !BLOCKED_FORM_TOKENS.some((tok) => id.includes(tok));
  });
  if (fallback) return identifier(fallback);

  const nonBattle = rows.find((r) => !isBattleOnly(r));
  if (nonBattle) return identifier(nonBattle);

  return identifier(rows[0]);
}

function buildIdentifierToSpeciesMap(forms) {
  const map = new Map();
  for (const species of Object.keys(forms || {})) {
    const rows = forms[species] || [];
    for (const row of rows) {
      map.set(identifier(row), normalize(species));
    }
  }
  return map;
}

function toBaseIdentifier(name, forms) {
  const n = normalize(name);
  if (!n) return n;

  if (forms && forms[n]) {
    return pickBaseIdentifierForSpecies(n, forms);
  }

  const idToSpecies = buildIdentifierToSpeciesMap(forms || {});
  const species = idToSpecies.get(n);
  if (species) return pickBaseIdentifierForSpecies(species, forms);

  return n;
}

function isBaseIdentifier(name, forms) {
  const n = normalize(name);
  return n === toBaseIdentifier(n, forms);
}

module.exports = {
  toBaseIdentifier,
  isBaseIdentifier,
  pickBaseIdentifierForSpecies,
};
