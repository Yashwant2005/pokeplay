const MAX_TRAINER_LEVEL = 100;

const CHANCE_REWARDS = [
  { key: 'bundle_small', chance: 60.0 },
  { key: 'bundle_large', chance: 25.0 },
  { key: 'battle_box', chance: 8.0 },
  { key: 'nature_mint', chance: 6.0 },
  { key: 'bottle_cap', chance: 0.9 },
  { key: 'gold_bottle_cap', chance: 0.1 }
];

const BATTLE_BOX_REWARDS = [
  { key: 'tm4', chance: 85.0 },
  { key: 'tm2_stone2', chance: 13.0 },
  { key: 'stone4', chance: 2.0 }
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

function getTrainerLevel(data, trainerlevel, maxLevel = MAX_TRAINER_LEVEL) {
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

function applyBattleBox(data, summary, deps) {
  const { tms, stones } = deps;
  const boxRoll = weightedPick(BATTLE_BOX_REWARDS);
  summary.battleBoxes += 1;

  if (boxRoll === 'tm4') {
    for (let i = 0; i < 4; i++) {
      const tmNo = randomTmNumber(tms);
      if (!tmNo) continue;
      addTm(data, tms, tmNo);
      summary.tmsAdded += 1;
    }
    return;
  }

  if (boxRoll === 'tm2_stone2') {
    for (let i = 0; i < 2; i++) {
      const tmNo = randomTmNumber(tms);
      if (!tmNo) continue;
      addTm(data, tms, tmNo);
      summary.tmsAdded += 1;
    }
    for (let i = 0; i < 2; i++) {
      const st = randomStone(stones);
      if (!st) continue;
      addStone(data, st);
      summary.stonesAdded += 1;
    }
    return;
  }

  for (let i = 0; i < 4; i++) {
    const st = randomStone(stones);
    if (!st) continue;
    addStone(data, st);
    summary.stonesAdded += 1;
  }
}

function ensureWallet(data) {
  if (!data.inv || typeof data.inv !== 'object') data.inv = {};
  if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
  if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
  if (!Number.isFinite(data.inv.holowear_tickets)) data.inv.holowear_tickets = 0;
}

function claimTrainerRankRewards(data, deps) {
  const { trainerlevel } = deps;
  const state = ensureRankRewardState(data);
  const currentLevel = getTrainerLevel(data, trainerlevel, MAX_TRAINER_LEVEL);
  const claimedLevel = Math.max(0, Math.min(MAX_TRAINER_LEVEL, Number(state.claimedLevel || 0)));
  const levelsToClaim = Math.max(0, currentLevel - claimedLevel);

  const summary = {
    currentLevel,
    claimedLevel,
    levelsToClaim,
    guaranteed: { pc: 0, lp: 0, ht: 0 },
    bonus: { pc: 0, lp: 0, ht: 0 },
    battleBoxes: 0,
    bottleCaps: 0,
    goldBottleCaps: 0,
    tmsAdded: 0,
    stonesAdded: 0,
    mints: {}
  };

  if (levelsToClaim <= 0) return summary;

  ensureWallet(data);

  for (let i = 0; i < levelsToClaim; i++) {
    data.inv.pc += 1000;
    data.inv.league_points += 50;
    data.inv.holowear_tickets += 5;
    summary.guaranteed.pc += 1000;
    summary.guaranteed.lp += 50;
    summary.guaranteed.ht += 5;

    const roll = weightedPick(CHANCE_REWARDS);

    if (roll === 'bundle_small') {
      data.inv.pc += 1000;
      data.inv.league_points += 30;
      data.inv.holowear_tickets += 2;
      summary.bonus.pc += 1000;
      summary.bonus.lp += 30;
      summary.bonus.ht += 2;
      continue;
    }

    if (roll === 'bundle_large') {
      data.inv.pc += 3000;
      data.inv.league_points += 70;
      data.inv.holowear_tickets += 10;
      summary.bonus.pc += 3000;
      summary.bonus.lp += 70;
      summary.bonus.ht += 10;
      continue;
    }

    if (roll === 'battle_box') {
      applyBattleBox(data, summary, deps);
      continue;
    }

    if (roll === 'nature_mint') {
      const mint = NATURE_MINT_POOL[Math.floor(Math.random() * NATURE_MINT_POOL.length)];
      data.extra.itembox.mints[mint] = ensureNumber(data.extra.itembox.mints[mint], 0) + 1;
      summary.mints[mint] = ensureNumber(summary.mints[mint], 0) + 1;
      continue;
    }

    if (roll === 'bottle_cap') {
      data.extra.itembox.bottleCaps += 1;
      summary.bottleCaps += 1;
      continue;
    }

    if (roll === 'gold_bottle_cap') {
      data.extra.itembox.goldBottleCaps += 1;
      summary.goldBottleCaps += 1;
      continue;
    }
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
  getTrainerLevel,
  getUnclaimedLevels,
  ensureRankRewardState,
  claimTrainerRankRewards,
  exchangeDuplicateTmsForVp,
  exchangeDuplicateStonesForVp,
  summarizeMints
};
