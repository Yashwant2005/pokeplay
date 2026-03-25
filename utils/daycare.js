const { getTrainerLevel } = require('./trainer_rank_rewards');
const { resolveEvolutionTargetIdentifier } = require('./evolution_rules');

const EV_STATS = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];
const EV_ALIASES = {
  hp: 'hp',
  atk: 'attack',
  attack: 'attack',
  def: 'defense',
  defense: 'defense',
  spa: 'special_attack',
  spatk: 'special_attack',
  spattack: 'special_attack',
  'special-attack': 'special_attack',
  special_attack: 'special_attack',
  spd: 'special_defense',
  spdef: 'special_defense',
  spdefense: 'special_defense',
  'special-defense': 'special_defense',
  special_defense: 'special_defense',
  spe: 'speed',
  speed: 'speed'
};

const GROWTH_MULTIPLIERS = {
  fast: 0.9,
  medium: 1.0,
  'medium-fast': 1.0,
  'medium-slow': 1.2,
  slow: 1.4,
  erratic: 1.3,
  fluctuating: 1.35
};

const DAYCARE_CANDY_STARTER = 5;
const DAYCARE_CANDY_REDUCTION_MINUTES = 10;
const DAYCARE_FIXED_SLOTS = 3;

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function ensureDaycareState(data) {
  if (!data.extra || typeof data.extra !== 'object') data.extra = {};
  if (!data.extra.daycare || typeof data.extra.daycare !== 'object') data.extra.daycare = {};
  if (!Array.isArray(data.extra.daycare.jobs)) data.extra.daycare.jobs = [];
  if (!data.extra.daycare.draft || typeof data.extra.daycare.draft !== 'object') {
    data.extra.daycare.draft = null;
  }
  if (!Number.isFinite(data.extra.daycare.starterClaimed)) {
    data.extra.daycare.starterClaimed = 0;
  }
  if (!Number.isFinite(data.extra.daycare.claimedCount)) {
    data.extra.daycare.claimedCount = 0;
  }
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Number.isFinite(data.inv.daycare_candy)) data.inv.daycare_candy = 0;
  return data.extra.daycare;
}

function grantDaycareStarterIfNeeded(data) {
  const daycare = ensureDaycareState(data);
  if (daycare.starterClaimed) {
    return { granted: false, amount: 0 };
  }
  daycare.starterClaimed = 1;
  data.inv.daycare_candy += DAYCARE_CANDY_STARTER;
  return { granted: true, amount: DAYCARE_CANDY_STARTER };
}

function spendDaycareCandyOnJob(data, jobId) {
  const daycare = ensureDaycareState(data);
  if (data.inv.daycare_candy < 1) {
    return { ok: false, error: 'You do not have any Daycare Candy.' };
  }
  const job = (daycare.jobs || []).find((entry) => String(entry.id) === String(jobId));
  if (!job) {
    return { ok: false, error: 'Daycare job not found.' };
  }
  if (Number(job.readyAt) <= Date.now()) {
    return { ok: false, error: 'That daycare pokemon is already ready.' };
  }

  data.inv.daycare_candy -= 1;
  const beforeReadyAt = Number(job.readyAt);
  job.readyAt = Math.max(Date.now(), beforeReadyAt - (DAYCARE_CANDY_REDUCTION_MINUTES * 60 * 1000));
  return {
    ok: true,
    beforeReadyAt,
    afterReadyAt: job.readyAt,
    reducedMinutes: Math.ceil((beforeReadyAt - job.readyAt) / 60000)
  };
}

function grantDaycareClaimCandy(data, claimedAmount) {
  const daycare = ensureDaycareState(data);
  const amount = Math.max(0, Math.floor(Number(claimedAmount) || 0));
  if (amount < 1) {
    return { granted: 0, totalClaims: daycare.claimedCount };
  }

  const beforeBuckets = Math.floor((Number(daycare.claimedCount) || 0) / 10);
  daycare.claimedCount += amount;
  const afterBuckets = Math.floor(daycare.claimedCount / 10);
  const granted = Math.max(0, afterBuckets - beforeBuckets);
  if (granted > 0) {
    data.inv.daycare_candy += granted;
  }

  return {
    granted,
    totalClaims: daycare.claimedCount
  };
}

function getDaycareSlotsForLevel(level) {
  return DAYCARE_FIXED_SLOTS;
}

function getDaycareSlots(data, trainerlevel) {
  const level = getTrainerLevel(data, trainerlevel, 100);
  return {
    trainerLevel: level,
    slots: getDaycareSlotsForLevel(level)
  };
}

function getPokemonCurrentLevel(pokemon, chart, growthRates) {
  if (!pokemon || !growthRates || !chart) return 1;
  const growth = growthRates[pokemon.name];
  if (!growth || !chart[growth.growth_rate]) return 1;
  const expTable = chart[growth.growth_rate];
  let level = 1;
  for (const key of Object.keys(expTable || {})) {
    const current = Number(key);
    if (Number.isFinite(current) && Number(pokemon.exp) >= Number(expTable[key])) {
      level = current;
    }
  }
  return Math.max(1, Math.min(100, level));
}

function findPokemonIndex(data, targetRaw) {
  const key = normalizeName(targetRaw);
  const nameKey = key.replace(/ /g, '-');
  return (data.pokes || []).findIndex((p) =>
    String(p.pass || '').toLowerCase() === key
    || (p.nickname && String(p.nickname).toLowerCase() === key)
    || String(p.name || '').toLowerCase() === nameKey
  );
}

function cleanupTeamsForPokemon(data, pass) {
  if (!data.teams || typeof data.teams !== 'object') return;
  for (const teamKey of Object.keys(data.teams)) {
    if (!Array.isArray(data.teams[teamKey])) continue;
    data.teams[teamKey] = data.teams[teamKey].filter((item) => String(item) !== String(pass));
  }
}

function parseEvBuild(input) {
  const text = String(input || '').trim().toLowerCase();
  if (!text) {
    return { ok: false, error: 'Send an EV build like `252 atk / 252 spe / 4 hp`.' };
  }

  const normalized = text
    .replace(/special attack/g, 'special_attack')
    .replace(/special atk/g, 'special_attack')
    .replace(/sp atk/g, 'spa')
    .replace(/special defense/g, 'special_defense')
    .replace(/special def/g, 'special_defense')
    .replace(/sp def/g, 'spd')
    .replace(/,/g, ' ')
    .replace(/\//g, ' ')
    .replace(/\+/g, ' ')
    .replace(/-/g, '_');

  const matches = [...normalized.matchAll(/(\d{1,3})\s*([a-z_]+)/g)];
  if (!matches.length) {
    return { ok: false, error: 'Could not read that EV build. Example: `252 atk / 252 spe / 4 hp`.' };
  }

  const evs = {
    hp: 0,
    attack: 0,
    defense: 0,
    special_attack: 0,
    special_defense: 0,
    speed: 0
  };

  for (const [, rawValue, rawStat] of matches) {
    const stat = EV_ALIASES[normalizeName(rawStat)];
    const value = Number(rawValue);
    if (!stat) {
      return { ok: false, error: `Unknown EV stat: \`${rawStat}\`.` };
    }
    if (!Number.isFinite(value) || value < 0 || value > 252) {
      return { ok: false, error: `Each EV stat must be between 0 and 252. Problem: \`${rawValue} ${rawStat}\`.` };
    }
    evs[stat] += value;
    if (evs[stat] > 252) {
      return { ok: false, error: `\`${formatStat(stat)}\` goes above 252 EVs.` };
    }
  }

  const total = getEvTotal(evs);
  if (total < 1) {
    return { ok: false, error: 'At least one EV point must be assigned.' };
  }
  if (total > 510) {
    return { ok: false, error: `Total EVs cannot go above 510. Current total: ${total}.` };
  }

  return { ok: true, evs, total };
}

function getFutureLevelUpEvolutionNames(pokemonName, chains) {
  const names = [];
  const seen = new Set([String(pokemonName || '').toLowerCase()]);
  let current = String(pokemonName || '').toLowerCase();

  while (current) {
    const next = (chains && Array.isArray(chains.evolution_chains))
      ? chains.evolution_chains.find((row) =>
        String(row.current_pokemon || '').toLowerCase() === current
        && String(row.evolution_method || '').toLowerCase() === 'level-up'
      )
      : null;

    if (!next) break;
    const evolved = String(next.evolved_pokemon || '').toLowerCase();
    if (!evolved || seen.has(evolved)) break;
    names.push(evolved);
    seen.add(evolved);
    current = evolved;
  }

  return names;
}

function getLearnableMoveMap(pokemonName, pokemoves, dmoves, chains) {
  const result = new Map();
  const species = [pokemonName, ...getFutureLevelUpEvolutionNames(pokemonName, chains)];

  for (const speciesName of species) {
    const entry = pokemoves && pokemoves[speciesName];
    if (!entry || !Array.isArray(entry.moves_info)) continue;

    for (const move of entry.moves_info) {
      const learnMethod = String(move.learn_method || '').toLowerCase();
      if (learnMethod !== 'level-up' && learnMethod !== 'evolution') continue;
      const moveId = Number(move.id);
      const details = dmoves && dmoves[String(moveId)];
      if (!details || !details.name) continue;
      const key = normalizeName(details.name).replace(/ /g, '-');
      if (!result.has(key)) {
        result.set(key, moveId);
      }
    }
  }

  return result;
}

function parseMoveSet(input, pokemonName, pokemoves, dmoves, chains) {
  const text = String(input || '').trim().toLowerCase();
  if (!text) {
    return { ok: false, error: 'Send 1 to 4 move names separated by commas.' };
  }

  const learnable = getLearnableMoveMap(pokemonName, pokemoves, dmoves, chains);
  if (!learnable.size) {
    return { ok: false, error: 'Move learnset data is missing for this Pokemon.' };
  }

  const parts = text
    .split(',')
    .map((item) => normalizeName(item).replace(/ /g, '-'))
    .filter(Boolean);

  if (parts.length < 1 || parts.length > 4) {
    return { ok: false, error: 'Send between 1 and 4 moves, separated by commas.' };
  }

  const moveIds = [];
  const seen = new Set();
  for (const part of parts) {
    if (seen.has(part)) {
      return { ok: false, error: `Duplicate move found: \`${part.replace(/-/g, ' ')}\`.` };
    }
    seen.add(part);
    const moveId = learnable.get(part);
    if (!moveId) {
      return { ok: false, error: `\`${part.replace(/-/g, ' ')}\` is not learnable by ${pokemonName.replace(/-/g, ' ')} or its future evolution line.` };
    }
    moveIds.push(moveId);
  }

  return { ok: true, moveIds };
}

function getGrowthMultiplier(growthRate) {
  return GROWTH_MULTIPLIERS[String(growthRate || '').toLowerCase()] || 1.15;
}

function estimateDaycarePlan(pokemon, options) {
  const { chart, growthRates, evs, moveIds } = options;
  const currentLevel = getPokemonCurrentLevel(pokemon, chart, growthRates);
  const growthRate = growthRates[pokemon.name] ? growthRates[pokemon.name].growth_rate : 'medium';
  const evTotal = getEvTotal(evs);
  const targetExp = Number(chart?.[growthRate]?.[100]) || 0;
  const currentExp = Math.max(0, Number(pokemon.exp) || 0);
  const expRequired = Math.max(0, targetExp - currentExp);
  const expCost = Math.ceil(expRequired / 500);
  const evCost = evTotal * 5;
  const expSeconds = Math.ceil(expRequired / 100);
  const evSeconds = evTotal * 10;
  const durationSeconds = evSeconds + expSeconds;
  const durationMinutes = durationSeconds / 60;
  const readyAt = Date.now() + (durationSeconds * 1000);

  return {
    currentLevel,
    targetLevel: 100,
    growthRate,
    expRequired,
    evTotal,
    newMoveCount: (moveIds || []).filter((id) => !(pokemon.moves || []).includes(id)).length,
    cost: expCost + evCost,
    durationMinutes,
    durationSeconds,
    readyAt
  };
}

function resolveDaycareEvolutionName(currentName, evolvedPokemon, forms) {
  const resolved = resolveEvolutionTargetIdentifier(currentName, evolvedPokemon, forms);
  return resolved || evolvedPokemon;
}

function applyDaycareLevelUpEvolutions(pokemon, targetLevel, chains, forms, pokes) {
  const clone = JSON.parse(JSON.stringify(pokemon));
  let guard = 0;

  while (guard < 10) {
    guard += 1;
    const evo = (chains && Array.isArray(chains.evolution_chains))
      ? chains.evolution_chains.find((chain) =>
        String(chain.current_pokemon || '').toLowerCase() === String(clone.name || '').toLowerCase()
        && String(chain.evolution_method || '').toLowerCase() === 'level-up'
        && Number(chain.evolution_level) <= Number(targetLevel)
      )
      : null;

    if (!evo) break;

    const nextName = resolveDaycareEvolutionName(clone.name, evo.evolved_pokemon, forms);
    clone.name = nextName;
    if (pokes && pokes[nextName] && Number.isFinite(Number(pokes[nextName].pokedex_number))) {
      clone.id = pokes[nextName].pokedex_number;
    }
  }

  return clone;
}

function finalizeDaycarePokemon(pokemon, evs, moveIds, chart, growthRates, chains, forms, pokes) {
  const clone = JSON.parse(JSON.stringify(pokemon));
  const evolved = applyDaycareLevelUpEvolutions(clone, 100, chains, forms, pokes);
  const growth = growthRates[evolved.name];
  if (growth && chart[growth.growth_rate] && Number.isFinite(Number(chart[growth.growth_rate][100]))) {
    evolved.exp = Number(chart[growth.growth_rate][100]);
  }
  evolved.evs = {
    hp: Number(evs.hp) || 0,
    attack: Number(evs.attack) || 0,
    defense: Number(evs.defense) || 0,
    special_attack: Number(evs.special_attack) || 0,
    special_defense: Number(evs.special_defense) || 0,
    speed: Number(evs.speed) || 0
  };
  evolved.moves = Array.isArray(moveIds) ? moveIds.slice(0, 4).map((id) => Number(id)) : [];
  return evolved;
}

function formatStat(stat) {
  const map = {
    hp: 'HP',
    attack: 'Attack',
    defense: 'Defense',
    special_attack: 'Sp. Attack',
    special_defense: 'Sp. Defense',
    speed: 'Speed'
  };
  return map[stat] || stat;
}

function getEvTotal(evs) {
  return EV_STATS.reduce((sum, stat) => sum + (Number(evs && evs[stat]) || 0), 0);
}

function formatEvSummary(evs) {
  return EV_STATS
    .filter((stat) => Number(evs && evs[stat]) > 0)
    .map((stat) => `${Number(evs[stat])} ${formatStat(stat)}`)
    .join(' / ') || 'No EVs';
}

function formatMoveSummary(moveIds, dmoves, c) {
  return (moveIds || [])
    .map((id) => {
      const move = dmoves && dmoves[String(id)];
      return move && move.name ? c(move.name) : `Move ${id}`;
    })
    .join(', ');
}

function formatDuration(durationValue, unit = 'minutes') {
  const totalSeconds = unit === 'seconds'
    ? Math.max(0, Math.round(Number(durationValue) || 0))
    : Math.max(0, Math.round((Number(durationValue) || 0) * 60));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || !parts.length) parts.push(`${seconds}s`);
  return parts.join(' ');
}

function formatRemaining(readyAt) {
  const ms = Math.max(0, Number(readyAt) - Date.now());
  return formatDuration(Math.ceil(ms / 1000), 'seconds');
}

module.exports = {
  DAYCARE_CANDY_STARTER,
  DAYCARE_CANDY_REDUCTION_MINUTES,
  ensureDaycareState,
  grantDaycareStarterIfNeeded,
  spendDaycareCandyOnJob,
  grantDaycareClaimCandy,
  getDaycareSlotsForLevel,
  getDaycareSlots,
  getPokemonCurrentLevel,
  findPokemonIndex,
  cleanupTeamsForPokemon,
  parseEvBuild,
  getLearnableMoveMap,
  parseMoveSet,
  estimateDaycarePlan,
  finalizeDaycarePokemon,
  formatEvSummary,
  formatMoveSummary,
  formatDuration,
  formatRemaining,
  getEvTotal
};
