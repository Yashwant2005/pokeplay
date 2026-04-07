const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'factions.json');

function cloneJson(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ factions: [] }, null, 2), 'utf8');
  }
}

function loadFactions() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    return (data && Array.isArray(data.factions)) ? data : { factions: [] };
  } catch (_) {
    return { factions: [] };
  }
}

function saveFactions(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {
    // ignore
  }
}

function ensureDefaults(faction) {
  if (!faction) return;
  if (!Array.isArray(faction.members)) faction.members = [];
  if (!Array.isArray(faction.admins)) faction.admins = [];
  if (!faction.inv || typeof faction.inv !== 'object') faction.inv = {};
  if (!Number.isFinite(faction.inv.vp)) faction.inv.vp = 0;
}

function findFactionByUser(data, userId) {
  const uid = String(userId);
  return (data.factions || []).find((f) => {
    if (!f) return false;
    if (String(f.captain) === uid) return true;
    return Array.isArray(f.members) && f.members.includes(uid);
  });
}

function isOfficer(faction, userId) {
  if (!faction) return false;
  const uid = String(userId);
  if (String(faction.captain) === uid) return true;
  return Array.isArray(faction.admins) && faction.admins.some((a) => String(a.userId) === uid);
}

function addFactionPcByUser(userId, amount) {
  const add = Math.floor(Number(amount) || 0);
  if (add <= 0) return { ok: false, reason: 'amount' };
  const data = loadFactions();
  const faction = findFactionByUser(data, userId);
  if (!faction) return { ok: false, reason: 'nofaction' };
  ensureDefaults(faction);
  faction.inv.vp += add;
  saveFactions(data);
  return { ok: true, faction, added: add };
}

function getFactionBank(userId) {
  const data = loadFactions();
  const faction = findFactionByUser(data, userId);
  if (!faction) return { ok: false, reason: 'nofaction' };
  ensureDefaults(faction);
  return { ok: true, faction };
}

function withdrawFactionPc(userId, amount) {
  const take = Math.floor(Number(amount) || 0);
  if (take <= 0) return { ok: false, reason: 'amount' };
  const data = loadFactions();
  const faction = findFactionByUser(data, userId);
  if (!faction) return { ok: false, reason: 'nofaction' };
  ensureDefaults(faction);
  if (!isOfficer(faction, userId)) return { ok: false, reason: 'noaccess' };
  if (faction.inv.vp < take) return { ok: false, reason: 'insufficient', balance: faction.inv.vp };
  faction.inv.vp -= take;
  saveFactions(data);
  return { ok: true, faction, taken: take };
}

module.exports = {
  loadFactions,
  saveFactions,
  ensureDefaults,
  findFactionByUser,
  isOfficer,
  addFactionPcByUser,
  withdrawFactionPc,
  getFactionBank,
  DATA_FILE
};
