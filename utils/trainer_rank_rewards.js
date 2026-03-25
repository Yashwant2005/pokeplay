const MAX_TRAINER_LEVEL = 200;

const CHANCE_REWARDS = [
  { key: 'bundle_small', chance: 60.0 },
  { key: 'bundle_large', chance: 25.0 },
  { key: 'battle_box', chance: 8.0 },
  { key: 'nature_mint', chance: 6.0 },
  { key: 'bottle_cap', chance: 0.9 },
  { key: 'gold_bottle_cap', chance: 0.1 }
];

const BATTLE_BOX_REWARDS = [
  { key: 'holowear_ht_5', chance: 40.0 },
  { key: 'pokeballs', chance: 30.0 },
  { key: 'tm4', chance: 20.0 },
  { key: 'stone1', chance: 7.0 },
  { key: 'mint1', chance: 1.0 },
  { key: 'bottlecap1', chance: 0.3 },
  { key: 'goldcap1', chance: 0.0025 }
];

const POKEBALL_REWARDS = [
  { key: 'pokeballs_common_15', chance: 99.999 },
  { key: 'masterball_1', chance: 0.001 }
];

const BATTLE_BOX_POKEBALL_POOL = [
  'premier',
  'net',
  'nest',
  'luxury',
  'quick',
  'park',
  'beast',
  'level',
  'moon',
  'sport',
  'origin'
];

const NATURE_MINT_POOL = [
  'adamant mint',
  'modest mint',
  'jolly mint',
  'timid mint',
  'bold mint',
  'calm mint',
  'careful mint',
  'impish mint',
  'brave mint',
  'quiet mint',
  'relaxed mint',
  'sassy mint'
];

function ensureNumber(v, fallback) {
  return Number.isFinite(v) ? v : fallback;
}

function buildProgressBar(current, total, size = 10) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeCurrent = Math.max(0, Number(current) || 0);
  if (safeTotal <= 0) return '░'.repeat(size);
  const ratio = Math.max(0, Math.min(1, safeCurrent / safeTotal));
  const filled = Math.max(0, Math.min(size, Math.round(ratio * size)));
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

function extendTrainerLevelTable(trainerlevel, maxLevel = MAX_TRAINER_LEVEL) {
  if (!trainerlevel || typeof trainerlevel !== 'object') return trainerlevel;

  const levels = Object.keys(trainerlevel)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (!levels.length) {
    trainerlevel[1] = 0;
  }

  let highest = levels.length ? levels[levels.length - 1] : 1;
  if (highest >= maxLevel) return trainerlevel;

  let previousLevel = Math.max(1, highest - 1);
  let previousExp = Number(trainerlevel[previousLevel]) || 0;
  let currentExp = Number(trainerlevel[highest]) || 0;
  let delta = Math.max(5000, currentExp - previousExp);

  for (let level = highest + 1; level <= maxLevel; level += 1) {
    delta = Math.max(5000, Math.round((delta * 1.035) + 350));
    currentExp += delta;
    trainerlevel[level] = currentExp;
  }

  return trainerlevel;
}

function getTrainerLevel(data, trainerlevel, maxLevel = MAX_TRAINER_LEVEL) {
  extendTrainerLevelTable(trainerlevel, maxLevel);
  const exp = ensureNumber(data?.inv?.exp, 0);
  const levels = Object.keys(trainerlevel || {})
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  let current = 1;
  for (const level of levels) {
    if (exp >= trainerlevel[level]) current = level;
  }
  const overrideLevel = Number(data?.extra?.rankLevel) || 0;
  if (overrideLevel > current) current = overrideLevel;
  return Math.max(1, Math.min(maxLevel, current));
}

function getTrainerProgress(data, trainerlevel, maxLevel = MAX_TRAINER_LEVEL) {
  extendTrainerLevelTable(trainerlevel, maxLevel);
  const currentLevel = getTrainerLevel(data, trainerlevel, maxLevel);
  const totalExp = ensureNumber(data?.inv?.exp, 0);
  const currentLevelExp = ensureNumber(trainerlevel?.[currentLevel], 0);

  if (currentLevel >= maxLevel) {
    return {
      currentLevel,
      maxLevel,
      totalExp,
      currentLevelExp,
      nextLevel: null,
      nextLevelExp: currentLevelExp,
      progressExp: 0,
      neededExp: 0,
      progressBar: buildProgressBar(1, 1)
    };
  }

  const nextLevel = currentLevel + 1;
  const nextLevelExp = ensureNumber(trainerlevel?.[nextLevel], currentLevelExp);
  const span = Math.max(1, nextLevelExp - currentLevelExp);
  const progressExp = Math.max(0, totalExp - currentLevelExp);
  const neededExp = Math.max(0, nextLevelExp - totalExp);

  return {
    currentLevel,
    maxLevel,
    totalExp,
    currentLevelExp,
    nextLevel,
    nextLevelExp,
    progressExp,
    neededExp,
    progressBar: buildProgressBar(progressExp, span)
  };
}

function formatTrainerProgress(data, trainerlevel, maxLevel = MAX_TRAINER_LEVEL) {
  const progress = getTrainerProgress(data, trainerlevel, maxLevel);
  let msg = `*Trainer Level:* ${progress.currentLevel}/${progress.maxLevel}`;
  msg += `\n*Trainer EXP:* ${progress.totalExp}`;
  if (!progress.nextLevel) {
    msg += '\n*Progress:* `██████████` MAX';
    return msg;
  }
  const span = Math.max(1, progress.nextLevelExp - progress.currentLevelExp);
  msg += `\n*Progress:* \`${progress.progressBar}\` ${progress.progressExp}/${span}`;
  msg += `\n*Need For Lv. ${progress.nextLevel}:* ${progress.neededExp} EXP`;
  return msg;
}

function ensureRankRewardState(data) {
  if (!data.extra || typeof data.extra !== 'object') data.extra = {};
  if (!data.extra.rankRewards || typeof data.extra.rankRewards !== 'object') {
    data.extra.rankRewards = { claimedLevel: 0, lastClaimAtUtc: null };
  }
  if (!Number.isFinite(data.extra.rankRewards.claimedLevel)) {
    data.extra.rankRewards.claimedLevel = 0;
  }
  if (!data.extra.itembox || typeof data.extra.itembox !== 'object') {
    data.extra.itembox = {};
  }
  if (!Number.isFinite(data.extra.itembox.bottleCaps)) data.extra.itembox.bottleCaps = 0;
  if (!Number.isFinite(data.extra.itembox.goldBottleCaps)) data.extra.itembox.goldBottleCaps = 0;
  if (!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {};
  return data.extra.rankRewards;
}

function getUnclaimedLevels(data, trainerlevel, maxLevel = MAX_TRAINER_LEVEL) {
  const state = ensureRankRewardState(data);
  const currentLevel = getTrainerLevel(data, trainerlevel, maxLevel);
  const claimedLevel = Math.max(0, Math.min(maxLevel, Number(state.claimedLevel || 0)));
  return Math.max(0, currentLevel - claimedLevel);
}

function weightedPick(table) {
  const total = table.reduce((sum, row) => sum + row.chance, 0);
  const rand = Math.random() * total;
  let cursor = 0;
  for (const row of table) {
    cursor += row.chance;
    if (rand <= cursor) return row.key;
  }
  return table[table.length - 1].key;
}

function addTm(data, tms, tmNo) {
  if (!data.tms || typeof data.tms !== 'object') data.tms = {};
  const key = String(tmNo);
  if (!Number.isFinite(data.tms[key])) data.tms[key] = 0;
  data.tms[key] += 1;
}

function addStone(data, stone) {
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Array.isArray(data.inv.stones)) data.inv.stones = [];
  data.inv.stones.push(stone);
}

function randomTmNumber(tms) {
  const ids = Object.keys(tms?.tmnumber || {});
  if (!ids.length) return null;
  return ids[Math.floor(Math.random() * ids.length)];
}


function randomStone(stones) {
  const ids = Object.keys(stones || {});
  if (!ids.length) return null;
  return ids[Math.floor(Math.random() * ids.length)];
}


// Stones that should NOT be in hunt rewards (the new stones)
const NEW_STONES = [
  'raichuite-x','raichuite-y','clefableite','victreebelite','starmieite','dragoniteite','meganiumite','feraligatrite','skarmoryite','chimechoite','absolite-z','staraptorite','garchompite-z','lucarioite-z','froslassite','emboarite','excadrillite','scolipedeite','scraftyite','eelektrossite','chandelureite','golurkite','chesnaughtite','delphoxite','greninjaite','pyroarite','meowsticite','malamarite','barbaracleite','dragalgeite','hawluchaite','crabominableite','golisopodite','drampaite','magearnaite','falinksite','scovillainite','glimmoraite','tatsugiriite','baxcaliburite'
];

function randomOldStone(stones) {
  const ids = Object.keys(stones || {}).filter(s => !NEW_STONES.includes(s));
  if (!ids.length) return null;
  return ids[Math.floor(Math.random() * ids.length)];
}

function addPokeballs(data, ballType, count) {
  if (!data.balls || typeof data.balls !== 'object') data.balls = {};
  if (!Number.isFinite(data.balls[ballType])) data.balls[ballType] = 0;
  data.balls[ballType] += count;
}

function addHolowearTickets(data, count) {
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Number.isFinite(data.inv.holowear_tickets)) data.inv.holowear_tickets = 0;
  data.inv.holowear_tickets += count;
}

function addNatureMint(data) {
  if (!data.extra || typeof data.extra !== 'object') data.extra = {};
  if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
  if (!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {};
  const mintName = NATURE_MINT_POOL[Math.floor(Math.random() * NATURE_MINT_POOL.length)];
  if (!Number.isFinite(data.extra.itembox.mints[mintName])) data.extra.itembox.mints[mintName] = 0;
  data.extra.itembox.mints[mintName] += 1;
  return mintName;
}

function addBottleCap(data) {
  if (!data.extra || typeof data.extra !== 'object') data.extra = {};
  if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
  if (!Number.isFinite(data.extra.itembox.bottleCaps)) data.extra.itembox.bottleCaps = 0;
  data.extra.itembox.bottleCaps += 1;
}

function addGoldBottleCap(data) {
  if (!data.extra || typeof data.extra !== 'object') data.extra = {};
  if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
  if (!Number.isFinite(data.extra.itembox.goldBottleCaps)) data.extra.itembox.goldBottleCaps = 0;
  data.extra.itembox.goldBottleCaps += 1;
}

function applyBattleBox(data, summary, deps) {
  const { tms, stones } = deps;
  const boxRoll = weightedPick(BATTLE_BOX_REWARDS);
  summary.battleBoxes += 1;

  if (boxRoll === 'holowear_ht_5') {
    addHolowearTickets(data, 5);
    summary.rewards.ht += 5;
    summary.holowearTicketsAdded += 5;
    return;
  }

  if (boxRoll === 'pokeballs') {
    const ballRoll = weightedPick(POKEBALL_REWARDS);
    if (ballRoll === 'pokeballs_common_15') {
      const ballTypes = BATTLE_BOX_POKEBALL_POOL;
      const randomBall = ballTypes[Math.floor(Math.random() * ballTypes.length)];
      addPokeballs(data, randomBall, 15);
      if (!Number.isFinite(summary.pokeballsAdded[randomBall])) summary.pokeballsAdded[randomBall] = 0;
      summary.pokeballsAdded[randomBall] += 15;
    } else if (ballRoll === 'masterball_1') {
      addPokeballs(data, 'master', 1);
      if (!Number.isFinite(summary.pokeballsAdded.master)) summary.pokeballsAdded.master = 0;
      summary.pokeballsAdded.master += 1;
    }
    return;
  }

  if (boxRoll === 'tm4') {
    if (!Array.isArray(summary.tmsReceived)) summary.tmsReceived = [];
    for (let i = 0; i < 4; i++) {
      const tmNo = randomTmNumber(tms);
      if (!tmNo) continue;
      addTm(data, tms, tmNo);
      summary.tmsAdded += 1;
      summary.tmsReceived.push(tmNo);
    }
    return;
  }

  if (boxRoll === 'stone1') {
    if (!Array.isArray(summary.stonesReceived)) summary.stonesReceived = [];
    const st = randomStone(stones); // all stones (old + new)
    if (st) {
      addStone(data, st);
      summary.stonesAdded += 1;
      summary.stonesReceived.push(st);
    }
    return;
  }

  if (boxRoll === 'mint1') {
    const mintName = addNatureMint(data);
    summary.mintsAdded += 1;
    if (mintName) {
      if (!Number.isFinite(summary.mintBreakdown[mintName])) summary.mintBreakdown[mintName] = 0;
      summary.mintBreakdown[mintName] += 1;
      if (!Array.isArray(summary.mintsReceived)) summary.mintsReceived = [];
      summary.mintsReceived.push(mintName);
    }
    return;
  }

  if (boxRoll === 'bottlecap1') {
    addBottleCap(data);
    summary.bottleCapsAdded += 1;
    return;
  }

  if (boxRoll === 'goldcap1') {
    addGoldBottleCap(data);
    summary.goldBottleCapsAdded += 1;
    return;
  }
}

function openBattleBoxes(data, deps, requestedAmount) {
  ensureWallet(data);
  ensureRankRewardState(data);

  const available = Number.isFinite(data.inv.battle_boxes) ? data.inv.battle_boxes : 0;
  const safeRequested = Math.max(1, Math.floor(Number(requestedAmount) || 1));
  const toOpen = Math.min(available, safeRequested);

  const summary = {
    available,
    opened: 0,
    remaining: available,
    rewards: { pc: 0, lp: 0, ht: 0, battleBoxes: 0 },
    battleBoxes: 0,
    tmsAdded: 0,
    stonesAdded: 0,
    mintsAdded: 0,
    bottleCapsAdded: 0,
    goldBottleCapsAdded: 0,
    holowearTicketsAdded: 0,
    mintBreakdown: {},
    pokeballsAdded: {}
  };

  if (toOpen <= 0) return summary;

  for (let i = 0; i < toOpen; i += 1) {
    data.inv.battle_boxes -= 1;
    applyBattleBox(data, summary, deps);
    summary.opened += 1;
  }

  summary.remaining = data.inv.battle_boxes;
  return summary;
}

function ensureWallet(data) {
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
  if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
  if (!Number.isFinite(data.inv.holowear_tickets)) data.inv.holowear_tickets = 0;
  if (!Number.isFinite(data.inv.battle_boxes)) data.inv.battle_boxes = 0;
}

function grantBundle(data, summary) {
  data.inv.pc += 1000;
  data.inv.league_points += 100;
  data.inv.holowear_tickets += 10;
  summary.rewards.pc += 1000;
  summary.rewards.lp += 100;
  summary.rewards.ht += 10;
}

function grantSingleCycleReward(level, data, summary) {
  const idx = (level - 1) % 3;
  if (idx === 0) {
    data.inv.pc += 1000;
    summary.rewards.pc += 1000;
    return;
  }
  if (idx === 1) {
    data.inv.league_points += 100;
    summary.rewards.lp += 100;
    return;
  }
  data.inv.holowear_tickets += 10;
  summary.rewards.ht += 10;
}

function grantBattleBox(data, summary) {
  data.inv.battle_boxes += 1;
  summary.rewards.battleBoxes += 1;
}

function applyRankRewardForLevel(level, data, summary) {
  if (level <= 30) {
    grantSingleCycleReward(level, data, summary);
    return;
  }

  if (level <= 50) {
    // Stage 2: levels 31-50 repeat as 2x bundle, then 1x battle box.
    const cycle = (level - 31) % 3;
    if (cycle === 2) {
      grantBattleBox(data, summary);
    } else {
      grantBundle(data, summary);
    }
    return;
  }

  // Stage 3: levels 51-100 alternate bundle and battle box.
  if (level % 2 === 1) {
    grantBundle(data, summary);
  } else {
    grantBattleBox(data, summary);
  }
}

function claimTrainerRankRewards(data, deps) {
  const { trainerlevel } = deps;
  extendTrainerLevelTable(trainerlevel, MAX_TRAINER_LEVEL);
  const state = ensureRankRewardState(data);
  const currentLevel = getTrainerLevel(data, trainerlevel, MAX_TRAINER_LEVEL);
  const claimedLevel = Math.max(0, Math.min(MAX_TRAINER_LEVEL, Number(state.claimedLevel || 0)));
  const levelsToClaim = Math.max(0, currentLevel - claimedLevel);

  const summary = {
    currentLevel,
    claimedLevel,
    levelsToClaim,
    rewards: { pc: 0, lp: 0, ht: 0, battleBoxes: 0 }
  };

  if (levelsToClaim <= 0) return summary;

  ensureWallet(data);

  for (let level = claimedLevel + 1; level <= currentLevel; level++) {
    applyRankRewardForLevel(level, data, summary);
  }

  state.claimedLevel = currentLevel;
  state.lastClaimAtUtc = new Date().toISOString();
  return summary;
}

function exchangeDuplicateTmsForVp(data) {
  if (!data.tms || typeof data.tms !== 'object') data.tms = {};
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Number.isFinite(data.inv.vp)) data.inv.vp = 0;

  let duplicates = 0;
  for (const key of Object.keys(data.tms)) {
    const count = ensureNumber(data.tms[key], 0);
    if (count > 1) {
      duplicates += (count - 1);
      data.tms[key] = 1;
    }
  }

  const gainedVp = duplicates * 50;
  data.inv.vp += gainedVp;
  return { duplicates, gainedVp };
}

function exchangeDuplicateStonesForVp(data) {
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Array.isArray(data.inv.stones)) data.inv.stones = [];
  if (!Number.isFinite(data.inv.vp)) data.inv.vp = 0;

  const keep = new Set();
  const next = [];
  let duplicates = 0;

  for (const raw of data.inv.stones) {
    const stone = String(raw || '');
    if (!stone) continue;
    if (keep.has(stone)) {
      duplicates += 1;
    } else {
      keep.add(stone);
      next.push(stone);
    }
  }

  data.inv.stones = next;
  const gainedVp = duplicates * 500;
  data.inv.vp += gainedVp;
  return { duplicates, gainedVp };
}

function summarizeMints(mints) {
  const keys = Object.keys(mints || {}).filter((k) => Number(mints[k]) > 0);
  if (!keys.length) return 'None';
  return keys.map((k) => k + ' x' + Number(mints[k])).join(', ');
}

module.exports = {
  MAX_TRAINER_LEVEL,
  extendTrainerLevelTable,
  getTrainerLevel,
  getTrainerProgress,
  formatTrainerProgress,
  getUnclaimedLevels,
  ensureRankRewardState,
  claimTrainerRankRewards,
  openBattleBoxes,
  exchangeDuplicateTmsForVp,
  exchangeDuplicateStonesForVp,
  summarizeMints
};
