const fs = require('fs');
const path = require('path');
const moment = require('moment');

const CONFIG_PATH = path.join(process.cwd(), 'data', 'iv_boost_event.json');
const IV_STATS = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];
const IV_STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  special_attack: 'Sp. Attack',
  special_defense: 'Sp. Defense',
  speed: 'Speed'
};
const IV_STAT_ALIASES = {
  hp: 'hp',
  attack: 'attack',
  atk: 'attack',
  defense: 'defense',
  def: 'defense',
  special_attack: 'special_attack',
  spa: 'special_attack',
  spatk: 'special_attack',
  specialattack: 'special_attack',
  special_defense: 'special_defense',
  spd: 'special_defense',
  spdef: 'special_defense',
  specialdefense: 'special_defense',
  speed: 'speed',
  spe: 'speed'
};

function getDefaultIvBoostConfig() {
  return {
    enabled: true,
    startAtUtc: '2026-03-20T00:00:00Z',
    endAtUtc: '2026-03-22T07:00:00Z',
    regularMinPerStat: 6,
    legendaryMinPerStat: 8,
    regularMinTotal: 100,
    legendaryMinTotal: 130,
    lockHunts: 40,
    lockMinValue: 14,
    lockSetsPerDay: 3
  };
}

function loadIvBoostConfig() {
  const defaults = getDefaultIvBoostConfig();
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { ...defaults };
    }
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    return {
      ...defaults,
      ...parsed
    };
  } catch (_) {
    return { ...defaults };
  }
}

function parseUtcMillis(value) {
  if (!value) return null;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : null;
}

function getIvBoostStatus(config = loadIvBoostConfig()) {
  const now = Date.now();
  const start = parseUtcMillis(config.startAtUtc);
  const end = parseUtcMillis(config.endAtUtc);
  if (!config.enabled) return 'disabled';
  if (start !== null && now < start) return 'upcoming';
  if (end !== null && now >= end) return 'ended';
  return 'active';
}

function formatIvBoostStatus(status) {
  if (status === 'active') return 'Active';
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'ended') return 'Ended';
  return 'Inactive';
}

function formatIvBoostWindow(config = loadIvBoostConfig()) {
  const start = config.startAtUtc ? moment.utc(config.startAtUtc) : null;
  const end = config.endAtUtc ? moment.utc(config.endAtUtc) : null;
  if (!start || !end || !start.isValid() || !end.isValid()) {
    return 'Configured event window.';
  }
  return start.format('D/M/YY H:mm [UTC]') + ' - ' + end.format('D/M/YY H:mm [UTC]');
}

function clampIvValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(31, Math.floor(n)));
}

function normalizeIvMap(ivs) {
  const out = {};
  for (const stat of IV_STATS) {
    out[stat] = clampIvValue(ivs && ivs[stat]);
  }
  return out;
}

function getIvTotal(ivs) {
  return IV_STATS.reduce((sum, stat) => sum + clampIvValue(ivs && ivs[stat]), 0);
}

function withMinimumIvs(ivs, minPerStat) {
  const out = normalizeIvMap(ivs);
  const minIv = clampIvValue(minPerStat);
  for (const stat of IV_STATS) {
    if (out[stat] < minIv) out[stat] = minIv;
  }
  return out;
}

function ensureMinimumTotal(ivs, minTotal) {
  const out = normalizeIvMap(ivs);
  const target = Math.max(0, Math.floor(Number(minTotal) || 0));
  let total = getIvTotal(out);
  let guard = 0;
  while (total < target && guard < 2000) {
    guard += 1;
    const candidates = IV_STATS.filter((stat) => out[stat] < 31);
    if (!candidates.length) break;
    const stat = candidates[Math.floor(Math.random() * candidates.length)];
    out[stat] += 1;
    total += 1;
  }
  return out;
}

function isLegendaryLike(rarity) {
  const value = String(rarity || '').toLowerCase();
  return value === 'legendary' || value === 'legendry' || value === 'mythical';
}

function resolveIvStat(input) {
  const raw = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return IV_STAT_ALIASES[raw] || null;
}

function getCurrentIvLock(userData) {
  const lock = userData && userData.extra ? userData.extra.ivLock : null;
  if (!lock || typeof lock !== 'object') return null;
  const stat = resolveIvStat(lock.stat);
  const value = clampIvValue(lock.value);
  const remainingHunts = Math.max(0, Math.floor(Number(lock.remainingHunts) || 0));
  if (!stat || remainingHunts < 1) return null;
  return {
    stat,
    value,
    remainingHunts
  };
}

function clearIvLock(userData) {
  if (userData && userData.extra && userData.extra.ivLock) {
    delete userData.extra.ivLock;
  }
}

function parseSnapshotMillis(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return 0;
  const millis = Date.parse(snapshot.atUtc);
  return Number.isFinite(millis) ? millis : 0;
}

function getSnapshotIvValue(snapshot, stat) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.ivs || typeof snapshot.ivs !== 'object') return null;
  const value = clampIvValue(snapshot.ivs[stat]);
  if (!Number.isFinite(value)) return null;
  return value;
}

function getLastKnownLockValue(userData, stat) {
  const extra = userData && userData.extra && typeof userData.extra === 'object' ? userData.extra : {};
  const lastCaught = extra.ivEventLastCaught;
  const lastEncounter = extra.ivEventLastEncounter;

  const caughtValue = getSnapshotIvValue(lastCaught, stat);
  const encounterValue = getSnapshotIvValue(lastEncounter, stat);

  if (caughtValue === null && encounterValue === null) return { value: null, source: 'random' };
  if (caughtValue !== null && encounterValue === null) return { value: caughtValue, source: 'last_caught' };
  if (caughtValue === null && encounterValue !== null) return { value: encounterValue, source: 'last_encounter' };

  const caughtAt = parseSnapshotMillis(lastCaught);
  const encounterAt = parseSnapshotMillis(lastEncounter);
  if (caughtAt >= encounterAt) return { value: caughtValue, source: 'last_caught' };
  return { value: encounterValue, source: 'last_encounter' };
}

function getUtcDateKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getIvLockDailyState(userData) {
  if (!userData.extra || typeof userData.extra !== 'object') userData.extra = {};
  const today = getUtcDateKey();
  const current = userData.extra.ivLockDaily;
  if (!current || typeof current !== 'object' || current.date !== today) {
    userData.extra.ivLockDaily = {
      date: today,
      used: 0
    };
  } else {
    userData.extra.ivLockDaily.used = Math.max(0, Math.floor(Number(current.used) || 0));
  }
  return userData.extra.ivLockDaily;
}

function getIvLockReferralBonus(userData) {
  const refers = Math.max(0, Math.floor(Number(userData && userData.refers) || 0));
  return refers >= 3 ? 1 : 0;
}

function getIvLockDailyUsage(userData, config = loadIvBoostConfig()) {
  const daily = getIvLockDailyState(userData);
  const baseLimit = Math.max(1, Math.floor(Number(config.lockSetsPerDay) || 1));
  const bonus = getIvLockReferralBonus(userData);
  const limit = baseLimit + bonus;
  return {
    used: daily.used,
    remaining: Math.max(0, limit - daily.used),
    limit,
    bonus,
    baseLimit
  };
}

function setIvLock(userData, statInput) {
  const config = loadIvBoostConfig();
  const status = getIvBoostStatus(config);
  const stat = resolveIvStat(statInput);
  if (!stat) {
    return { ok: false, status, reason: 'invalid_stat', config };
  }
  if (status !== 'active') {
    return { ok: false, status, reason: 'inactive', config };
  }
  if (!userData.extra || typeof userData.extra !== 'object') userData.extra = {};
  const daily = getIvLockDailyState(userData);
  const dailyUsage = getIvLockDailyUsage(userData, config);
  const dailyLimit = dailyUsage.limit;
  if (daily.used >= dailyLimit) {
    return {
      ok: false,
      status,
      reason: 'daily_limit',
      config,
      daily: dailyUsage
    };
  }
  const minValue = Math.max(clampIvValue(config.lockMinValue), 1);
  const snapshotPick = getLastKnownLockValue(userData, stat);
  const fetchedValue = snapshotPick.value;
  const value = fetchedValue !== null ? fetchedValue : (Math.floor(Math.random() * (31 - minValue + 1)) + minValue);
  userData.extra.ivLock = {
    stat,
    value,
    remainingHunts: Math.max(1, Math.floor(Number(config.lockHunts) || 1)),
    createdAtUtc: new Date().toISOString(),
    source: fetchedValue !== null ? snapshotPick.source : 'random'
  };
  daily.used += 1;
  return {
    ok: true,
    status,
    config,
    lock: getCurrentIvLock(userData),
    daily: getIvLockDailyUsage(userData, config)
  };
}

function applyIvBoostEventToEncounter(ivs, options = {}) {
  const config = loadIvBoostConfig();
  const status = getIvBoostStatus(config);
  const rarity = options.rarity;
  const legendaryLike = isLegendaryLike(rarity);
  let out = normalizeIvMap(ivs);

  if (status === 'active') {
    out = withMinimumIvs(out, legendaryLike ? config.legendaryMinPerStat : config.regularMinPerStat);
    out = ensureMinimumTotal(out, legendaryLike ? config.legendaryMinTotal : config.regularMinTotal);
  }

  let lockApplied = null;
  let lockRemaining = 0;
  const userData = options.userData;
  const lock = getCurrentIvLock(userData);
  if (status === 'active' && lock) {
    out[lock.stat] = lock.value;
    lockApplied = { ...lock };
    lockRemaining = Math.max(0, lock.remainingHunts - 1);
    if (lockRemaining > 0) {
      userData.extra.ivLock.remainingHunts = lockRemaining;
      userData.extra.ivLock.stat = lock.stat;
      userData.extra.ivLock.value = lock.value;
    } else {
      clearIvLock(userData);
    }
  }

  return {
    ivs: out,
    status,
    config,
    lockApplied,
    lockRemaining
  };
}

module.exports = {
  IV_STATS,
  IV_STAT_LABELS,
  loadIvBoostConfig,
  getIvBoostStatus,
  formatIvBoostStatus,
  formatIvBoostWindow,
  resolveIvStat,
  getCurrentIvLock,
  getIvLockDailyUsage,
  clearIvLock,
  setIvLock,
  applyIvBoostEventToEncounter
};
