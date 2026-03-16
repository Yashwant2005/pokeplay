function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function hash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getCurrentWeekKey() {
  return String(Math.floor(Date.now() / 604800000));
}

function getDaysUntilWeeklyReset(weekKey) {
  const wk = Number(weekKey || getCurrentWeekKey());
  const endMs = (wk + 1) * 604800000;
  const leftMs = Math.max(0, endMs - Date.now());
  return Math.max(1, Math.ceil(leftMs / 86400000));
}

function getTmLpPrice(tm, tmprices) {
  const pcPrice = Number(tmprices?.buy?.[String(tm)] || 0);
  const scaled = Math.ceil((pcPrice * 0.25) / 100) * 100;
  return Math.max(1000, scaled || 1000);
}

function getAllBuyableTmList(tmprices, tms) {
  return Object.keys(tms.tmnumber || {})
    .map((k) => String(k))
    .filter((k) => Number(tmprices?.buy?.[k] || 0) > 0);
}

function sampleUnique(list, count, seedKey) {
  const seed = xmur3(seedKey)();
  const rand = mulberry32(seed);
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.max(0, Math.min(count, arr.length)));
}

function ensureShopState(data) {
  if (!data.extra) data.extra = {};
  if (!data.extra.tmshop) data.extra.tmshop = {};
  return data.extra.tmshop;
}

function getWeeklyTmShop(data, userId, tms, tmprices) {
  const state = ensureShopState(data);
  const weekKey = getCurrentWeekKey();
  const needsInit = state.weekKey !== weekKey || !Array.isArray(state.selection) || state.selection.length === 0;

  if (needsInit) {
    state.weekKey = weekKey;
    state.refreshNonce = 0;
    const allBuyable = getAllBuyableTmList(tmprices, tms);
    state.selection = sampleUnique(allBuyable, 10, `${userId}:${weekKey}:0`);
    if (state.purchasedWeekKey !== weekKey) {
      state.purchasedWeekKey = weekKey;
      state.purchasedSlots = [];
    }
  }

  if (state.purchasedWeekKey !== weekKey) {
    state.purchasedWeekKey = weekKey;
    state.purchasedSlots = [];
  }

  if (!Array.isArray(state.purchasedSlots)) {
    const legacy = state.purchasedTm ? [String(state.purchasedTm)] : [];
    state.purchasedSlots = legacy;
  }

  return {
    weekKey,
    selection: state.selection.map((x) => String(x)),
    refreshNonce: Number(state.refreshNonce || 0),
    purchasedWeekKey: String(state.purchasedWeekKey || ''),
    purchasedSlots: state.purchasedSlots.map((x) => String(x)),
  };
}

function refreshWeeklyTmShop(data, userId, tms, tmprices) {
  const state = ensureShopState(data);
  const weekKey = getCurrentWeekKey();
  const nextNonce = Number(state.refreshNonce || 0) + 1;
  state.weekKey = weekKey;
  state.refreshNonce = nextNonce;
  const allBuyable = getAllBuyableTmList(tmprices, tms);
  state.selection = sampleUnique(allBuyable, 10, `${userId}:${weekKey}:${nextNonce}`);
  return state.selection.map((x) => String(x));
}

function hasPurchasedSlotThisWeek(data, tm) {
  const state = ensureShopState(data);
  const weekKey = getCurrentWeekKey();
  if (String(state.purchasedWeekKey || '') !== weekKey) return false;
  const slots = Array.isArray(state.purchasedSlots) ? state.purchasedSlots : [];
  return slots.includes(String(tm));
}

function markPurchasedSlotThisWeek(data, tm) {
  const state = ensureShopState(data);
  state.purchasedWeekKey = getCurrentWeekKey();
  if (!Array.isArray(state.purchasedSlots)) state.purchasedSlots = [];
  const id = String(tm);
  if (!state.purchasedSlots.includes(id)) state.purchasedSlots.push(id);
}

module.exports = {
  getCurrentWeekKey,
  getDaysUntilWeeklyReset,
  getTmLpPrice,
  getWeeklyTmShop,
  refreshWeeklyTmShop,
  hasPurchasedSlotThisWeek,
  markPurchasedSlotThisWeek,
};
