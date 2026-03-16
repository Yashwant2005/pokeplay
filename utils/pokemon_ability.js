const fs = require('fs');
const path = require('path');

function titleCaseAbility(value) {
  return String(value || 'none')
    .split('-')
    .map((x) => x ? x.charAt(0).toUpperCase() + x.slice(1) : x)
    .join(' ');
}

const ABILITY_CACHE_PATH = path.join(process.cwd(), 'data', 'pokemon_abilities_cache.json');

function loadAbilityCache() {
  try {
    if (!fs.existsSync(ABILITY_CACHE_PATH)) return {};
    const raw = fs.readFileSync(ABILITY_CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch (_) {
    return {};
  }
}

const abilityCache = loadAbilityCache();

function saveAbilityCache() {
  try {
    fs.writeFileSync(ABILITY_CACHE_PATH, JSON.stringify(abilityCache, null, 2) + '\n');
  } catch (_) {
    // best-effort cache write
  }
}

function normalizeName(name) {
  return String(name || '').toLowerCase().trim();
}

function specialCaseAbilities(name) {
  const n = normalizeName(name);
  if (n === 'greninja-ash' || n === 'greninja-battle-bond') return ['battle-bond'];
  return null;
}

const TYPE_ABILITIES = {
  normal: ['adaptability', 'scrappy', 'inner-focus'],
  fire: ['blaze', 'flash-fire', 'flame-body'],
  water: ['torrent', 'swift-swim', 'water-absorb'],
  electric: ['static', 'lightning-rod', 'motor-drive'],
  grass: ['overgrow', 'chlorophyll', 'natural-cure'],
  ice: ['ice-body', 'snow-cloak', 'slush-rush'],
  fighting: ['guts', 'iron-fist', 'steadfast'],
  poison: ['poison-point', 'corrosion', 'liquid-ooze'],
  ground: ['sand-veil', 'sand-force', 'mold-breaker'],
  flying: ['keen-eye', 'gale-wings', 'big-pecks'],
  psychic: ['synchronize', 'magic-guard', 'telepathy'],
  bug: ['swarm', 'compound-eyes', 'tinted-lens'],
  rock: ['sturdy', 'rock-head', 'solid-rock'],
  ghost: ['cursed-body', 'infiltrator', 'frisk'],
  dragon: ['rough-skin', 'multiscale', 'clear-body'],
  dark: ['pressure', 'unnerve', 'moxie'],
  steel: ['clear-body', 'light-metal', 'sturdy'],
  fairy: ['cute-charm', 'pixilate', 'friend-guard']
};

const FALLBACK_ABILITIES = ['pressure', 'inner-focus', 'adaptability'];

function pickRandom(list) {
  if (!Array.isArray(list) || !list.length) return 'none';
  return list[Math.floor(Math.random() * list.length)];
}

function getCachedAbilities(name) {
  const n = normalizeName(name);
  const special = specialCaseAbilities(n);
  if (special) return special;
  const list = abilityCache[n];
  if (!Array.isArray(list) || list.length < 1) return [];
  return Array.from(new Set(list.map((x) => normalizeName(x)).filter(Boolean)));
}

async function fetchCanonicalAbilities(name, fetchFn) {
  const n = normalizeName(name);
  if (!n) return [];

  const cached = getCachedAbilities(n);
  if (cached.length > 0) return cached;

  const special = specialCaseAbilities(n);
  if (special) return special;

  if (typeof fetchFn !== 'function') return [];

  const tries = [n];
  if (n.includes('-')) tries.push(n.split('-')[0]);

  for (const key of tries) {
    try {
      const res = await fetchFn('https://pokeapi.co/api/v2/pokemon/' + encodeURIComponent(key));
      if (!res || !res.ok) continue;
      const body = await res.json();
      const list = Array.isArray(body.abilities)
        ? body.abilities.map((a) => normalizeName(a && a.ability && a.ability.name)).filter(Boolean)
        : [];
      if (list.length > 0) {
        abilityCache[n] = Array.from(new Set(list));
        saveAbilityCache();
        return abilityCache[n];
      }
    } catch (_) {
      // try next option
    }
  }

  return [];
}

function getRandomAbilityForPokemon(name, pokes) {
  const n = String(name || '').toLowerCase();
  if (!n) return 'none';

  const special = specialCaseAbilities(n);
  if (special) return pickRandom(special);

  const cached = getCachedAbilities(n);
  if (cached.length > 0) return pickRandom(cached);

  const p = pokes && pokes[n] ? pokes[n] : null;
  const types = Array.isArray(p && p.types) ? p.types : [];
  const pool = [];

  for (const t of types) {
    const list = TYPE_ABILITIES[String(t || '').toLowerCase()];
    if (Array.isArray(list)) pool.push(...list);
  }

  const unique = Array.from(new Set(pool));
  if (unique.length) return pickRandom(unique);
  return pickRandom(FALLBACK_ABILITIES);
}

function ensureAbilityOnPokemonEntry(entry, pokes) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.ability && String(entry.ability).trim().length > 0) return false;
  entry.ability = getRandomAbilityForPokemon(entry.name, pokes);
  return true;
}

async function ensureCanonicalAbilityOnPokemonEntry(entry, pokes, fetchFn) {
  if (!entry || typeof entry !== 'object') return false;
  if (entry.ability && String(entry.ability).trim().length > 0) return false;

  const canonical = await fetchCanonicalAbilities(entry.name, fetchFn);
  if (canonical.length > 0) {
    entry.ability = pickRandom(canonical);
    return true;
  }
  return false;
}

module.exports = {
  fetchCanonicalAbilities,
  getRandomAbilityForPokemon,
  ensureAbilityOnPokemonEntry,
  ensureCanonicalAbilityOnPokemonEntry,
  titleCaseAbility,
};
