const { fetchCanonicalAbilities, getRandomAbilityForPokemon } = require('./pokemon_ability');

const Z_MOVE_NAMES = new Set([
  'breakneck-blitz',
  'all-out-pummeling',
  'supersonic-skystrike',
  'acid-downpour',
  'tectonic-rage',
  'continental-crush',
  'savage-spin-out',
  'never-ending-nightmare',
  'corkscrew-crash',
  'inferno-overdrive',
  'hydro-vortex',
  'bloom-doom',
  'gigavolt-havoc',
  'shattered-psyche',
  'subzero-slammer',
  'devastating-drake',
  'black-hole-eclipse',
  'twinkle-tackle',
  'catastropika',
  '10-000-000-volt-thunderbolt',
  'stoked-sparksurfer',
  'pulverizing-pancake',
  'extreme-evoboost',
  'genesis-supernova',
  'sinister-arrow-raid',
  'malicious-moonsault',
  'oceanic-operetta',
  'guardian-of-alola',
  'soul-stealing-7-star-strike',
  'clangorous-soulblaze',
  'splintered-stormshards',
  'lets-snuggle-forever',
  'searing-sunraze-smash',
  'menacing-moonraze-maelstrom',
  'light-that-burns-the-sky'
]);

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getSpeciesKey(name, forms) {
  const key = normalizeName(name);
  if (forms && forms[key]) return key;
  for (const species of Object.keys(forms || {})) {
    const rows = Array.isArray(forms[species]) ? forms[species] : [];
    if (rows.some((entry) => normalizeName(entry.identifier) === key)) {
      return species;
    }
  }
  return key;
}

function collectFamilySpecies(species, chains) {
  const normalized = normalizeName(species);
  const seen = new Set();
  const stack = [normalized];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    for (const row of (chains && chains.evolution_chains) || []) {
      const from = normalizeName(row.current_pokemon);
      const to = normalizeName(row.evolved_pokemon);
      if (from === current && to && !seen.has(to)) {
        stack.push(to);
      }
      if (to === current && from && !seen.has(from)) {
        stack.push(from);
      }
    }
  }

  return Array.from(seen);
}

function buildAllowedMoveData(entry, deps) {
  const { pokemoves, dmoves, chains, forms, growth_rates, chart } = deps;
  const speciesKey = getSpeciesKey(entry && entry.name, forms);
  const familySpecies = collectFamilySpecies(speciesKey, chains);
  const allowedMoveIds = new Set();
  const levelUpMoves = [];
  const currentSpeciesMoves = (pokemoves && pokemoves[normalizeName(entry && entry.name)] && pokemoves[normalizeName(entry && entry.name)].moves_info) || [];
  const fallbackSpeciesMoves = (pokemoves && pokemoves[speciesKey] && pokemoves[speciesKey].moves_info) || [];
  const ownMoveRows = currentSpeciesMoves.length > 0 ? currentSpeciesMoves : fallbackSpeciesMoves;

  for (const species of familySpecies) {
    const moveRows = (pokemoves && pokemoves[species] && pokemoves[species].moves_info) || [];
    for (const row of moveRows) {
      const moveId = Number(row.id);
      if (!Number.isFinite(moveId)) continue;
      allowedMoveIds.add(moveId);
    }
  }

  const levelTable = growth_rates && entry && growth_rates[entry.name] && chart && chart[growth_rates[entry.name].growth_rate]
    ? chart[growth_rates[entry.name].growth_rate]
    : null;
  let currentLevel = 1;
  if (levelTable) {
    currentLevel = 1;
    for (const key of Object.keys(levelTable)) {
      const level = Number(key);
      if (Number.isFinite(level) && Number(entry.exp) >= Number(levelTable[key])) {
        currentLevel = Math.max(currentLevel, level);
      }
    }
  }

  for (const row of ownMoveRows) {
    const moveId = Number(row.id);
    if (!Number.isFinite(moveId)) continue;
    const learnMethod = normalizeName(row.learn_method);
    const levelLearned = Number(row.level_learned_at);
    if ((learnMethod === 'level-up' && levelLearned <= currentLevel) || learnMethod === 'evolution') {
      levelUpMoves.push({
        id: moveId,
        level: Number.isFinite(levelLearned) ? levelLearned : 0
      });
    }
  }

  levelUpMoves.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return a.id - b.id;
  });

  return {
    allowedMoveIds,
    levelUpMoveIds: levelUpMoves.map((row) => row.id)
  };
}

function isBannedSpecialMove(moveName) {
  const name = normalizeName(moveName);
  return name.startsWith('max-') || name.startsWith('g-max-') || Z_MOVE_NAMES.has(name);
}

async function repairPokemonAbilityEntry(entry, deps) {
  const { pokes, fetch } = deps;
  if (!entry || typeof entry !== 'object') {
    return { changed: false, reason: 'invalid-entry' };
  }

  const currentAbility = normalizeName(entry.ability);
  const canonical = await fetchCanonicalAbilities(entry.name, fetch);

  if (canonical.length > 0) {
    if (currentAbility && canonical.includes(currentAbility)) {
      return { changed: false, reason: 'valid' };
    }
    const nextAbility = canonical[Math.floor(Math.random() * canonical.length)] || currentAbility || 'none';
    const previousAbility = entry.ability || 'none';
    entry.ability = nextAbility;
    return {
      changed: normalizeName(previousAbility) !== normalizeName(nextAbility),
      reason: currentAbility ? 'repaired-invalid' : 'assigned-missing',
      previousAbility,
      nextAbility
    };
  }

  if (currentAbility) {
    return { changed: false, reason: 'no-canonical-data' };
  }

  const nextAbility = getRandomAbilityForPokemon(entry.name, pokes);
  entry.ability = nextAbility;
  return {
    changed: true,
    reason: 'assigned-fallback',
    previousAbility: 'none',
    nextAbility
  };
}

function sanitizePokemonMoves(entry, deps) {
  const { dmoves } = deps;
  if (!entry || typeof entry !== 'object') {
    return { changed: false, removedCount: 0, addedCount: 0, finalMoves: [] };
  }

  const moveData = buildAllowedMoveData(entry, deps);
  const currentMoves = Array.isArray(entry.moves) ? entry.moves.map((id) => Number(id)).filter(Number.isFinite) : [];
  const validMoves = [];
  const removedMoves = [];
  const seen = new Set();

  for (const moveId of currentMoves) {
    const move = dmoves && dmoves[String(moveId)];
    const moveName = move ? normalizeName(move.name) : '';
    const banned = !move || isBannedSpecialMove(moveName);
    const allowed = moveData.allowedMoveIds.has(moveId);

    if (banned || !allowed || seen.has(moveId)) {
      removedMoves.push(moveId);
      continue;
    }
    seen.add(moveId);
    validMoves.push(moveId);
  }

  const addedMoves = [];
  for (const moveId of moveData.levelUpMoveIds) {
    if (validMoves.length >= 4) break;
    if (seen.has(moveId)) continue;
    const move = dmoves && dmoves[String(moveId)];
    if (!move || isBannedSpecialMove(move.name)) continue;
    seen.add(moveId);
    validMoves.push(moveId);
    addedMoves.push(moveId);
  }

  entry.moves = validMoves.slice(0, 4);
  return {
    changed: removedMoves.length > 0 || addedMoves.length > 0 || entry.moves.length !== currentMoves.length,
    removedCount: removedMoves.length,
    addedCount: addedMoves.length,
    removedMoves,
    addedMoves,
    finalMoves: entry.moves.slice()
  };
}

module.exports = {
  repairPokemonAbilityEntry,
  sanitizePokemonMoves,
  isBannedSpecialMove
};
