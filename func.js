const path = require('path')
const emojis = {
  "normal": "🔘",
  "fire": "🔥",
  "water": "💧",
  "electric": "⚡",
  "grass": "🌱",
  "ice": "❄️",
  "fighting": "🥊",
  "poison": "☠️",
  "ground": "🌍",
  "flying": "🦅",
  "psychic": "🧠",
  "bug": "🐛",
  "rock": "🪨",
  "ghost": "👻",
  "dragon": "🐲",
  "dark": "🌑",
  "steel": "🔩",
  "fairy": "🧚"
}
const fs = require('fs')
const { getCollection, ensureIndexes } = require('./mongo');
const { getKv, setKv } = require('./mongo_kv');
const catch_rates = JSON.parse(fs.readFileSync('data/pokemon_rarity.json', 'utf8'));
const pokes = JSON.parse(fs.readFileSync('data/pokemon_info55_modified2.json', 'utf8'));
const pokemoves = JSON.parse(fs.readFileSync('data/moveset_data_updated2.json', 'utf8'));
const pokestats = JSON.parse(fs.readFileSync('data/pokemon_base_stats_info2.json', 'utf8'));
const dmoves = JSON.parse(fs.readFileSync('data/moves_info.json', 'utf8'));
const expdata = JSON.parse(fs.readFileSync('data/pokemon_base_exp2.json', 'utf8'));
const pokes2 = JSON.parse(fs.readFileSync('data/pokemon_info2.json', 'utf8'));
const chart = JSON.parse(fs.readFileSync('data/exp_chart.json', 'utf8'));
const chains = JSON.parse(fs.readFileSync('data/evolution_chains2.json', 'utf8'));
const growth_rates = JSON.parse(fs.readFileSync('data/pokemon_data2.json', 'utf8'));
const rdata = JSON.parse(fs.readFileSync('data/pokedex_data.json', 'utf8'));
const spawn = JSON.parse(fs.readFileSync('data/pokemon_status_info.json', 'utf8'));

// Mongo-backed persistence with in-memory caches for hot state (message/battle).

const DEFAULT_MESSAGE_DATA = { battle: [], moves: {}, tutor: {} };
let messageCache = { ...DEFAULT_MESSAGE_DATA };
let messageCacheLoaded = false;
let initPromise = null;
const battleCache = new Map();
let lastMessagePruneAt = 0;
const MESSAGE_PRUNE_INTERVAL_MS = 2000;
const USER_CACHE_TTL_MS = 5000;
const USER_CACHE_MAX = 5000;
const userCache = new Map();

function cloneJson(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

function getCachedUserData(key) {
  const entry = userCache.get(key);
  if (!entry) return null;
  if ((Date.now() - entry.t) > USER_CACHE_TTL_MS) {
    userCache.delete(key);
    return null;
  }
  return cloneJson(entry.v);
}

function setCachedUserData(key, data) {
  userCache.set(key, { v: cloneJson(data), t: Date.now() });
  if (userCache.size > USER_CACHE_MAX) {
    const firstKey = userCache.keys().next().value;
    if (firstKey) userCache.delete(firstKey);
  }
}

function normalizeMessageData(data) {
  const base = (data && typeof data === 'object') ? data : {};
  return {
    ...DEFAULT_MESSAGE_DATA,
    ...base,
    battle: Array.isArray(base.battle) ? base.battle : [],
    moves: base.moves && typeof base.moves === 'object' ? base.moves : {},
    tutor: base.tutor && typeof base.tutor === 'object' ? base.tutor : {}
  };
}

function isMessageEntryExpired(entry, now) {
  if (!entry || typeof entry !== 'object') return true;
  const hasTimes = typeof entry.times === 'number';
  const hasTimestamp = typeof entry.timestamp === 'number';
  if (!hasTimes && !hasTimestamp) return true;
  if (hasTimes && now - entry.times > 130000) return true;
  if (hasTimestamp && now - entry.timestamp > 60000) return true;
  return false;
}

function pruneMessageData(data) {
  const now = Date.now();
  const out = normalizeMessageData(data);
  let changed = false;
  const activeIds = new Set();
  for (const key of Object.keys(out)) {
    if (key === 'battle' || key === 'moves' || key === 'tutor') continue;
    const entry = out[key];
    if (!entry || typeof entry !== 'object') {
      delete out[key];
      changed = true;
      continue;
    }
    if (isMessageEntryExpired(entry, now)) {
      delete out[key];
      changed = true;
      continue;
    }
    if (entry.turn !== undefined || entry.oppo !== undefined) {
      const battleData = loadBattleData(key);
      if (!battleData || Object.keys(battleData).length === 0) {
        delete out[key];
        changed = true;
        continue;
      }
      if (entry.turn !== undefined) activeIds.add(String(entry.turn));
      if (entry.oppo !== undefined) activeIds.add(String(entry.oppo));
      continue;
    }
    if (entry.id !== undefined && entry.mid) {
      activeIds.add(String(entry.id));
    }
  }
  if (!Array.isArray(out.battle)) {
    out.battle = [];
    changed = true;
  } else {
    const filtered = out.battle.filter((id) => activeIds.has(String(id)));
    if (filtered.length !== out.battle.length) {
      out.battle = filtered;
      changed = true;
    }
  }
  return { data: out, changed };
}

function maybePruneMessageCache() {
  if (!messageCacheLoaded) return;
  const now = Date.now();
  if ((now - lastMessagePruneAt) < MESSAGE_PRUNE_INTERVAL_MS) return;
  lastMessagePruneAt = now;
  const { data, changed } = pruneMessageData(messageCache);
  if (changed) {
    messageCache = data;
    messageCacheLoaded = true;
    saveMessageData(messageCache).catch(() => {});
  }
}

async function hydrateCaches() {
  try {
    const msg = await getKv('msg_data', null);
    messageCache = normalizeMessageData(msg);
    messageCacheLoaded = true;
  } catch (error) {
    console.error('Failed loading message cache:', error.message || error);
    messageCache = { ...DEFAULT_MESSAGE_DATA };
    messageCacheLoaded = true;
  }

  // Battle data stays in memory only.
}

async function initDataStores(options = {}) {
  const loadCaches = options.loadCaches !== false;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await ensureIndexes();
      } catch (error) {
        console.error('Mongo index init failed:', error.message || error);
      }
      if (loadCaches) {
        await hydrateCaches();
      }
    })();
  }
  return initPromise;
}

function parseJsonFileNoBom(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const normalized = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

function writeJsonAtomically(filePath, value) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(value), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function mergeUniquePrimitiveArrays(left, right) {
  const out = [];
  for (const list of [left, right]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!out.includes(item)) out.push(item);
    }
  }
  return out;
}

function mergePokemonLists(latestList, incomingList) {
  const latest = Array.isArray(latestList) ? latestList : [];
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  const merged = [];
  const indexByPass = new Map();
  for (const poke of latest) {
    const pass = String(poke && poke.pass || '');
    if (!pass) continue;
    indexByPass.set(pass, merged.length);
    merged.push(poke);
  }
  for (const poke of incoming) {
    const pass = String(poke && poke.pass || '');
    if (!pass) continue;
    if (indexByPass.has(pass)) {
      merged[indexByPass.get(pass)] = poke;
    } else {
      indexByPass.set(pass, merged.length);
      merged.push(poke);
    }
  }
  return merged;
}

function mergeTeams(latestTeams, incomingTeams, validPasses) {
  const latest = latestTeams && typeof latestTeams === 'object' ? latestTeams : {};
  const incoming = incomingTeams && typeof incomingTeams === 'object' ? incomingTeams : {};
  const mergedTeams = { ...latest };
  for (const key of Object.keys(incoming)) {
    const list = Array.isArray(incoming[key]) ? incoming[key] : [];
    mergedTeams[key] = [...new Set(list.map((pass) => String(pass)))].filter((pass) => validPasses.has(String(pass)));
  }
  for (const key of Object.keys(mergedTeams)) {
    if (!Array.isArray(mergedTeams[key])) mergedTeams[key] = [];
    mergedTeams[key] = [...new Set(mergedTeams[key].map((pass) => String(pass)))].filter((pass) => validPasses.has(String(pass)));
  }
  return mergedTeams;
}

function mergeUserDataForSave(latestData, incomingData) {
  const latest = latestData && typeof latestData === 'object' ? latestData : {};
  const incoming = incomingData && typeof incomingData === 'object' ? incomingData : {};
  const replacePokes = Boolean(incoming._replacePokes || incoming.__replacePokes);
  const merged = {
    ...latest,
    ...incoming,
    inv: { ...(latest.inv || {}), ...(incoming.inv || {}) },
    balls: { ...(latest.balls || {}), ...(incoming.balls || {}) },
    extra: { ...(latest.extra || {}), ...(incoming.extra || {}) },
    settings: { ...(latest.settings || {}), ...(incoming.settings || {}) },
    tms: { ...(latest.tms || {}), ...(incoming.tms || {}) }
  };
  merged.pokes = replacePokes
    ? (Array.isArray(incoming.pokes) ? incoming.pokes : [])
    : mergePokemonLists(latest.pokes, incoming.pokes);
  merged.pokecaught = mergeUniquePrimitiveArrays(latest.pokecaught, incoming.pokecaught);
  merged.pokeseen = mergeUniquePrimitiveArrays(latest.pokeseen, incoming.pokeseen);
  const validPasses = new Set((merged.pokes || []).map((poke) => String(poke && poke.pass || '')).filter(Boolean));
  merged.teams = mergeTeams(latest.teams, incoming.teams, validPasses);
  delete merged._replacePokes;
  delete merged.__replacePokes;
  return merged;
}

async function check(ctx, next) {
  const data = await getUserData(ctx.from.id);

  if (!data.pokes) {
    ctx.replyWithMarkdown('*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
reply_markup:{inline_keyboard:[[
{text:'Start My Journey',url:'t.me/PokePlayBot?start=start',}]]}})
return
  }

await next();
}
async function check2(ctx,next){
const msgdata = await loadMessageData();
const now = Date.now();
const isEntryExpired = (entry) => {
  if (!entry || typeof entry !== 'object') return true;
  const hasTimes = typeof entry.times === 'number';
  const hasTimestamp = typeof entry.timestamp === 'number';
  if (!hasTimes && !hasTimestamp) return true;
  if (hasTimes && now - entry.times > 130000) return true;
  if (hasTimestamp && now - entry.timestamp > 60000) return true;
  return false;
};
const hasActiveBattleReference = (data, userId) => {
  const idStr = String(userId);
  for (const [key, entry] of Object.entries(data || {})) {
    if (key === 'battle' || key === 'moves' || key === 'tutor') continue;
    if (!entry || typeof entry !== 'object') continue;
    if (isEntryExpired(entry)) continue;
    if (entry.turn !== undefined && String(entry.turn) === idStr) return true;
    if (entry.oppo !== undefined && String(entry.oppo) === idStr) return true;
    if (entry.id !== undefined && String(entry.id) === idStr && entry.mid) return true;
  }
  return false;
};
let needsSave = false;
if (Array.isArray(msgdata.battle) && msgdata.battle.includes(ctx.from.id)) {
  if (!hasActiveBattleReference(msgdata, ctx.from.id)) {
    msgdata.battle = msgdata.battle.filter((id) => String(id) !== String(ctx.from.id));
    needsSave = true;
  }
}
if (msgdata[ctx.from.id] && isEntryExpired(msgdata[ctx.from.id])) {
  delete msgdata[ctx.from.id];
  needsSave = true;
}
if (needsSave) {
  await saveMessageData(msgdata);
}
if ((Array.isArray(msgdata.battle) && msgdata.battle.includes(ctx.from.id)) || msgdata[ctx.from.id]){
  ctx.replyWithMarkdown('You are in *Battle*',{reply_to_message_id:ctx.message.message_id})
  return
}
await next();
}
async function check2q(ctx,next){
const msgdata = await loadMessageData();
const now = Date.now();
const isEntryExpired = (entry) => {
  if (!entry || typeof entry !== 'object') return true;
  const hasTimes = typeof entry.times === 'number';
  const hasTimestamp = typeof entry.timestamp === 'number';
  if (!hasTimes && !hasTimestamp) return true;
  if (hasTimes && now - entry.times > 130000) return true;
  if (hasTimestamp && now - entry.timestamp > 60000) return true;
  return false;
};
const hasActiveBattleReference = (data, userId) => {
  const idStr = String(userId);
  for (const [key, entry] of Object.entries(data || {})) {
    if (key === 'battle' || key === 'moves' || key === 'tutor') continue;
    if (!entry || typeof entry !== 'object') continue;
    if (isEntryExpired(entry)) continue;
    if (entry.turn !== undefined && String(entry.turn) === idStr) return true;
    if (entry.oppo !== undefined && String(entry.oppo) === idStr) return true;
    if (entry.id !== undefined && String(entry.id) === idStr && entry.mid) return true;
  }
  return false;
};
let needsSave = false;
if (Array.isArray(msgdata.battle) && msgdata.battle.includes(ctx.from.id)) {
  if (!hasActiveBattleReference(msgdata, ctx.from.id)) {
    msgdata.battle = msgdata.battle.filter((id) => String(id) !== String(ctx.from.id));
    needsSave = true;
  }
}
if (msgdata[ctx.from.id] && isEntryExpired(msgdata[ctx.from.id])) {
  delete msgdata[ctx.from.id];
  needsSave = true;
}
if (needsSave) {
  await saveMessageData(msgdata);
}
if ((Array.isArray(msgdata.battle) && msgdata.battle.includes(ctx.from.id)) || msgdata[ctx.from.id]){
  ctx.answerCbQuery('You are in Battle')
  return
}
await next();
}



async function saveUserData2(userId, userData) {
  try {
    const key = String(userId);
    const users = await getCollection('users');
    const cached = getCachedUserData(key);
    const existing = cached ? null : await users.findOne({ _id: key });
    const latestData = cached || (existing && existing.data ? existing.data : {});
    const mergedData = mergeUserDataForSave(latestData, userData);
    await users.updateOne(
      { _id: key },
      {
        $set: {
          user_id: key,
          userId: key,
          data: mergedData,
          reset: false,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    setCachedUserData(key, mergedData);
  } catch (error) {
    console.error('Error saving data to MongoDB:', error);
  }
}
const saveUserData22 = saveUserData2;
async function getUserData(userId) {
  try {
    const key = String(userId);
    const cached = getCachedUserData(key);
    if (cached) return cached;
    const users = await getCollection('users');
    const doc = await users.findOne({ _id: key });
    if (!doc || !doc.data) return {};
    setCachedUserData(key, doc.data);
    return doc.data;
  } catch (error) {
    console.error('Error getting data from MongoDB:', error);
    return {};
  }
}
function getRandomNature() {
  const natures = ['Adamant', 'Bold', 'Brave', 'Calm', 'Careful', 'Gentle', 'Hasty', 'Impish', 'Jolly', 'Lax', 'Lonely', 'Mild', 'Modest', 'Naive', 'Naughty', 'Quiet', 'Quirky', 'Rash', 'Relaxed', 'Sassy', 'Serious', 'Timid'];
  const randomIndex = Math.floor(Math.random() * natures.length);
  return natures[randomIndex];
}

function calculateTotal(ivs) {
  const values = Object.values(ivs);
  return values.reduce((sum, iv) => sum + iv, 0);
}

function calculateTotalEV(ivs) {
  const values = Object.values(ivs);
  const evs = values.map((iv) => Math.floor(iv / 4));
  return evs.reduce((sum, ev) => sum + ev, 0);
}
function stat(name){
if(Math.random()< 0.3){
var value = Math.floor(Math.random()*31)
}else{
var value = Math.floor(Math.random()*25)
}
return value
}
function c(sentence) {
const a = String(sentence ?? '').replace(/[-_]/g,' ')
return a.replace(/\b\w/g, char => char.toUpperCase());
}
function getLevel(exp,char){
const data = chart
let currentLevel, nextLevel, nextExp;

  for (const level in char) {
    if (exp >= char[level]) {
      currentLevel = parseInt(level);
    }
  }

  return {
    currentLevel,
    nextLevel,
    nextExp
  };
}
const NATURE_MODIFIERS = {
  Adamant: { increased: 'attack', decreased: 'special_attack' },
  Bashful: {},
  Bold: { increased: 'defense', decreased: 'attack' },
  Brave: { increased: 'attack', decreased: 'speed' },
  Calm: { increased: 'special_defense', decreased: 'attack' },
  Careful: { increased: 'special_defense', decreased: 'special_attack' },
  Docile: {},
  Gentle: { increased: 'special_defense', decreased: 'defense' },
  Hardy: {},
  Hasty: { increased: 'speed', decreased: 'defense' },
  Impish: { increased: 'defense', decreased: 'special_attack' },
  Jolly: { increased: 'speed', decreased: 'special_attack' },
  Lax: { increased: 'defense', decreased: 'special_defense' },
  Lonely: { increased: 'attack', decreased: 'defense' },
  Mild: { increased: 'special_attack', decreased: 'defense' },
  Modest: { increased: 'special_attack', decreased: 'attack' },
  Naive: { increased: 'speed', decreased: 'special_defense' },
  Naughty: { increased: 'attack', decreased: 'special_defense' },
  Quiet: { increased: 'special_attack', decreased: 'speed' },
  Quirky: {},
  Rash: { increased: 'special_attack', decreased: 'special_defense' },
  Relaxed: { increased: 'defense', decreased: 'speed' },
  Sassy: { increased: 'special_defense', decreased: 'speed' },
  Serious: {},
  Timid: { increased: 'speed', decreased: 'attack' },
};

const STAT_NAMES = ['attack', 'defense', 'special_attack', 'special_defense', 'speed'];

const STATS_CACHE = new Map();
const STATS_CACHE_MAX = 5000;
const STATS_CACHE_TTL_MS = 5 * 60 * 1000;

function getStatsCacheKey(baseStats, ivs, evs, natureName, level) {
  const b = baseStats || {};
  const i = ivs || {};
  const e = evs || {};
  return [
    natureName || '',
    level || 0,
    b.hp || 0, b.attack || 0, b.defense || 0, b.special_attack || 0, b.special_defense || 0, b.speed || 0,
    i.hp || 0, i.attack || 0, i.defense || 0, i.special_attack || 0, i.special_defense || 0, i.speed || 0,
    e.hp || 0, e.attack || 0, e.defense || 0, e.special_attack || 0, e.special_defense || 0, e.speed || 0
  ].join('|');
}

function Stats(baseStats, ivs, evs, natureName, level) {
  if (!baseStats || typeof baseStats !== 'object') {
    return {
      hp: 1,
      attack: 0,
      defense: 0,
      special_attack: 0,
      special_defense: 0,
      speed: 0
    };
  }
  const cacheKey = getStatsCacheKey(baseStats, ivs, evs, natureName, level);
  const cached = STATS_CACHE.get(cacheKey);
  if (cached && (Date.now() - cached.t) < STATS_CACHE_TTL_MS) {
    return cached.v;
  }
  const stats = {};

  // Calculate HP
  stats.hp = Math.floor(((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;

  // Calculate other stats (Attack, Defense, Special Attack, Special Defense, Speed)
  STAT_NAMES.forEach((stat) => {
    // Apply nature modifiers
    const natureModifier = NATURE_MODIFIERS[natureName] && NATURE_MODIFIERS[natureName].increased === stat
      ? 1.1
      : NATURE_MODIFIERS[natureName] && NATURE_MODIFIERS[natureName].decreased === stat
      ? 0.9
      : 1;

    // Calculate the stat
    stats[stat] = Math.floor(
      ((2 * baseStats[stat] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100
    ) + 5;

    // Apply nature modifier
    stats[stat] = Math.floor(stats[stat] * natureModifier);

    // Apply EVs
//    stats[stat] += Math.floor(evs[stat] / 4);
  });
  STATS_CACHE.set(cacheKey, { v: stats, t: Date.now() });
  if (STATS_CACHE.size > STATS_CACHE_MAX) {
    const firstKey = STATS_CACHE.keys().next().value;
    if (firstKey) {
      STATS_CACHE.delete(firstKey);
    }
  }

  return stats;
}

function word(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let mixedWord = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    mixedWord += characters.charAt(randomIndex);
  }

  return mixedWord;
}

function Bar(totalValue, currentValue) {
try{
const progressBarMaxLength = 10
const total = Number(totalValue)
const current = Math.max(Number(currentValue) || 0,0)
if(!Number.isFinite(total) || total<=0){
return '░'.repeat(progressBarMaxLength)
}
const ratio = Math.max(0,Math.min(1,current/total))
const filledCount = Math.max(0,Math.min(progressBarMaxLength,Math.round(ratio*progressBarMaxLength)))
const unfilledCount = progressBarMaxLength - filledCount
const progressBar = '█'.repeat(filledCount) + '░'.repeat(unfilledCount)
return `${progressBar}`
}catch (error){
console.log(error)
return '░░░░░░░░░░'
}
}

function chooseRandomNumbers(array, count) {
  const randomNumbers = [];
  const maxIndex = array.length - 1;

  while (randomNumbers.length < count) {
    const randomIndex = Math.floor(Math.random() * (maxIndex + 1));
    const randomNumber = array[randomIndex];

    if (!randomNumbers.includes(randomNumber)) {
      randomNumbers.push(randomNumber);
    }
  }

  return randomNumbers;
}
function plevel(name,exp){
const g = growth_rates[name]
const exp2 = chart[g.growth_rate]
const matchingLevels = Object.keys(exp2).filter(level => exp >= exp2[level]);
const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;

return currentLevel
}
function calc(attackerStat, defenseStat,level, movePower, typeMultiplier) {
const random = (Math.floor(Math.random()*15)+85)/100  
const baseDamage = (((100+attackerStat+(15*level))*movePower)/(defenseStat+50))/5

//const baseDamage = (2 * level / 5 + 2) * attackerStat * (movePower / defenseStat) / 50 + 2;
  const totalDamage = baseDamage * typeMultiplier * random;

  return Math.floor(totalDamage);
}
function calcexp(b,l,p) {
return Math.floor(((b * l) / 5) * Math.pow((2 * l + 10) / (l + p + 10), 2.5) + 1);
}
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function eff(attackerType, defenderType1, defenderType2 = null) {
const typeChart = {
  Normal: { Ghost: 0, Rock: 0.5, Steel: 0.5 },
  Fire: {
    Fire: 0.5,
    Water: 0.5,
    Rock: 0.5,
    Dragon: 0.5,
    Grass: 2,
    Ice: 2,
    Bug: 2,
    Steel: 2
  },
  Water: { Water: 0.5, Grass: 0.5, Dragon: 0.5, Fire: 2, Ground: 2, Rock: 2 },
  Electric: {
    Ground: 0,
    Electric: 0.5,
    Grass: 0.5,
    Dragon: 0.5,
    Water: 2,
    Flying: 2
  },
  Grass: {
    Fire: 0.5,
    Grass: 0.5,
    Poison: 0.5,
    Flying: 0.5,
    Bug: 0.5,
    Dragon: 0.5,
    Steel: 0.5,
    Water: 2,
    Ground: 2,
    Rock: 2
  },
  Ice: {
    Fire: 0.5,
    Water: 0.5,
    Ice: 0.5,
    Steel: 0.5,
    Grass: 2,
    Ground: 2,
    Flying: 2,
    Dragon: 2
  },
  Fighting: {
    Ghost: 0,
    Poison: 0.5,
    Flying: 0.5,
    Psychic: 0.5,
    Bug: 0.5,
    Fairy: 0.5,
    Normal: 2,
    Ice: 2,
    Rock: 2,
    Dark: 2,
    Steel: 2
  },
  Poison: {
    Steel: 0,
    Poison: 0.5,
    Ground: 0.5,
    Rock: 0.5,
    Ghost: 0.5,
    Grass: 2,
    Fairy: 2
  },
  Ground: {
    Flying: 0,
    Grass: 0.5,
    Bug: 0.5,
    Fire: 2,
    Electric: 2,
    Poison: 2,
    Rock: 2,
    Steel: 2
  },
  Flying: {
    Electric: 0.5,
    Rock: 0.5,
    Steel: 0.5,
    Grass: 2,
    Fighting: 2,
    Bug: 2
  },
  Psychic: { Dark: 0, Psychic: 0.5, Steel: 0.5, Fighting: 2, Poison: 2 },
  Bug: {
    Fire: 0.5,
    Fighting: 0.5,
    Poison: 0.5,
    Flying: 0.5,
    Ghost: 0.5,
    Steel: 0.5,
    Fairy: 0.5,
    Grass: 2,
    Psychic: 2,
    Dark: 2
  },
  Rock: {
    Fighting: 0.5,
    Ground: 0.5,
    Steel: 0.5,
    Fire: 2,
    Ice: 2,
    Flying: 2,
    Bug: 2
  },
  Ghost: { Normal: 0, Dark: 0.5, Psychic: 2, Ghost: 2 },
  Dragon: { Fairy: 0, Steel: 0.5, Dragon: 2 },
  Dark: { Fighting: 0.5, Dark: 0.5, Fairy: 0.5, Psychic: 2, Ghost: 2 },
  Steel: {
    Fire: 0.5,
    Water: 0.5,
    Electric: 0.5,
    Steel: 0.5,
    Ice: 2,
    Rock: 2,
    Fairy: 2
  },
  Fairy: {
    Fire: 0.5,
    Poison: 0.5,
    Steel: 0.5,
    Fighting: 2,
    Dragon: 2,
    Dark: 2
  }
}
    let effectiveness = 1;

    if (!attackerType || !typeChart[attackerType]) {
        return effectiveness;
    }
    if (defenderType1 && defenderType1 in typeChart[attackerType]) {
        effectiveness *= typeChart[attackerType][defenderType1];
    }

    if (defenderType2 && defenderType2 in typeChart[attackerType]) {
        effectiveness *= typeChart[attackerType][defenderType2];
    }

    return effectiveness;
}

function findEvolutionLevel(pokemonName) {
  for (const nestedArray of chains) {
    for (const pokemon of nestedArray) {
      if (pokemon.current_pokemon === pokemonName) {
        return {level:pokemon.evolution_level,form:pokemon.evolved_pokemon}
      }
    }
  }
  return null; // Return null if not found
}
function loadMessageData() {
  if (!messageCacheLoaded) {
    return cloneJson(DEFAULT_MESSAGE_DATA);
  }
  maybePruneMessageCache();
  return cloneJson(messageCache);
}

async function loadMessageDataFresh() {
  try {
    const msg = await getKv('msg_data', null);
    const normalized = normalizeMessageData(msg);
    const pruned = pruneMessageData(normalized);
    messageCache = cloneJson(pruned.data);
    messageCacheLoaded = true;
    if (pruned.changed) {
      await setKv('msg_data', cloneJson(messageCache));
    }
    return cloneJson(messageCache);
  } catch (error) {
    console.error('Error loading fresh message data:', error.message || error);
    return loadMessageData();
  }
}

async function saveMessageData(data) {
  try {
    const normalized = normalizeMessageData(data);
    messageCache = cloneJson(normalized);
    messageCacheLoaded = true;
    await setKv('msg_data', cloneJson(messageCache));
  } catch (error) {
    console.error('Error saving message data:', error);
  }
}

function loadBattleData(bword) {
  try {
    const key = String(bword);
    const cached = battleCache.get(key);
    return cached ? cloneJson(cached) : {};
  } catch (error) {
    return {};
  }
}

async function saveBattleData(bword, data) {
  const key = String(bword);
  try {
    battleCache.set(key, cloneJson(data || {}));
  } catch (error) {
    console.error('Error saving battle data:', error);
  }
}

async function resetUserData(userId) {
  const key = String(userId);
  try {
    const users = await getCollection('users');
    const res = await users.deleteOne({ _id: key });
    return res && res.deletedCount > 0;
  } catch (error) {
    console.error('Error resetting user data for', key, error.message || error);
    return false;
  }
}

// Flush functions removed - all data is written immediately to disk

// All data flushing removed - write immediately on every save operation
async function pokelisthtml(pokemon,id,str){
let msg = ''
const data = await getUserData(id)
let i = 0
for (const poke of pokemon) {
const p = data.pokes.filter((poke3)=>poke3.pass==poke)[0]
const g = growth_rates[p.name]
const exp = chart[g.growth_rate]
const matchingLevels = Object.keys(exp).filter(level => p.exp >= exp[level]);
    const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;

    msg += '\n<b>' + (i + 1 + str*1) + '.</b> ' + c(p.name) + ' (<b>Lv.</b> ' + currentLevel + ') '+p.symbol+'';
i++;
  }
return msg
}
async function pokelist(pokemon,ctx,str){
let msg = ''
const data = await getUserData(ctx.from.id)
const { getDisplayPokemonSymbol } = require('./utils/gmax_utils')
let i = 0
for (const poke of pokemon) {
const p = data.pokes.filter((poke3)=>poke3.pass==poke)[0]
const g = growth_rates[p.name]
const exp = chart[g.growth_rate]
const matchingLevels = Object.keys(exp).filter(level => p.exp >= exp[level]);
    const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
const sym = []
for(const ty of pokes[p.name].types){
sym.push(emojis[ty])
}
const cat2 = spawn[p.name] ?spawn[p.name] : 'N/A'
const cat = (cat2=='legendry') ? 'legendary' : cat2
const stats = await Stats(pokestats[p.name],p.ivs,p.evs,c(p.nature),currentLevel)
const displaySymbol = getDisplayPokemonSymbol(p)
if(!data.extra || !data.extra.display || data.extra.display=='none'){
msg += '\n*' + (i + 1 + str*1) + '.* ' + c(p.nickname || p.name) + ' '+displaySymbol+''
}else if(data.extra.display=='level'){
    msg += '\n*' + (i + 1 + str*1) + '.* ' + c(p.nickname || p.name) + ' (*Lv.* ' + currentLevel + ') '+displaySymbol+'';
}else if(data.extra.display=='iv-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+calculateTotal(p.ivs)+' *IVs* '+displaySymbol+''
}else if(data.extra.display=='ev-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+calculateTotal(p.evs)+' *EVs* '+displaySymbol+''
}else if(data.extra.display=='nature'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - *'+c(p.nature)+'* '+displaySymbol+''
}else if(data.extra.display=='type'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - \['+c(pokes[p.name].types.join(', '))+'\] '+displaySymbol+''
}else if(data.extra.display=='type-symbol'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - ' + sym.join(', ') + ' ' + displaySymbol;
}else if(data.extra.display=='category'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+cat+' '+displaySymbol+''
}else if(data.extra.display=='hp-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.hp+' *HP* '+displaySymbol+''
}else if(data.extra.display=='attack-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.attack+' *Atk* '+displaySymbol+''
}else if(data.extra.display=='defense-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.defense+' *Def* '+displaySymbol+''
}else if(data.extra.display=='special-attack-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.special_attack+' *SpA* '+displaySymbol+''
}else if(data.extra.display=='special-defense-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.special_defense+' *SpD* '+displaySymbol+''
}else if(data.extra.display=='speed-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.speed+' *Spe* '+displaySymbol+''
}else if(data.extra.display=='total-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+calculateTotal(stats)+' *Stats* '+displaySymbol+''
}



i++;
  }
return msg
}
async function incexp(winner,win,losser,lose,ctx,battleData,bot){
const av = []
let b = 1
let al = []
const baseexp = expdata.filter((poke)=> poke.name == lose.name)[0]
const g = growth_rates[win.name]
const exp69 = chart[g.growth_rate]["100"]
const clevel = plevel(win.name,win.exp)
winner.inv.exp += 40
await saveUserData2(battleData.oid,winner)
if(baseexp && clevel!=100){
const ee = await calcexp(baseexp.baseExp,plevel(lose.name,lose.exp),clevel)
win.exp = Math.min((win.exp+ee),exp69)
await saveUserData2(battleData.oid,winner)
var l2 = await plevel(win.name,win.exp)
const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==win.name)[0]
if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= l2 && evo.evolution_level > clevel){
if(ctx.chat.type!='private'){
ctx.replyWithHTML('<a href="tg://user?id='+battleData.oid+'"><b>'+winner.inv.name+'</b></a> Your Pokemon <b>'+c(win.name)+'</b> Is Ready To Evolve',{reply_markup:{inline_keyboard:[[{text:'Evolve',url:'t.me/pokeplaybot'}]]}})
}
bot.telegram.sendMessage(battleData.oid,'*'+c(win.name)+'* Is Ready To Evolve',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+win.name+'_'+win.pass+''}]]}})
}
if((l2-clevel)!= 0){
const moves = pokemoves[win.name]
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at > clevel && move.level_learned_at <= l2 && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
if(moves2.length > 0){
for(const m of moves2){
if(!win.moves.includes(m.id)){
if(win.moves.length < 4){
win.moves.push(m.id)
await saveUserData2(battleData.oid,winner)
bot.telegram.sendMessage(battleData.oid,'<b>'+c(win.name)+'</b> (<b>Lv.</b> '+l2+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})
}else{
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
if(ctx.chat.type!='private'){
ctx.replyWithHTML('<a href="tg://user?id='+battleData.oid+'"><b>'+winner.inv.name+'</b></a>, <b>'+c(win.name)+'</b> (<b>Lv.</b> '+l2+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/pokeplaybot'}]]}})
}
const mdata = await loadMessageData();
const m77 = await bot.telegram.sendMessage(battleData.oid,'<b>'+c(win.name)+'</b> (<b>Lv.</b> '+l2+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(win.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+win.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})
if(!mdata.moves){
mdata.moves = {}
}
mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:win.name,move:dmoves[m.id].name}
await saveMessageData(mdata)
}
}
}
}
}
await saveUserData2(battleData.oid,winner)
}
const data99 = pokes[lose.name]
let highestEv = { stat: "", value: 0 };

    const evYield = data99.ev_yield;
    evYield.forEach(([stat, value]) => {
      if (value > highestEv.value) {
        highestEv = { stat, value };
      }
    });
if(highestEv.stat=='special-attack'){
highestEv.stat = 'special_attack'
}
if(highestEv.stat=='special-defense'){
highestEv.stat = 'special_defense'
}
const t2 = calculateTotal(win.evs)
if((win.evs[highestEv.stat]+highestEv.value) < 252 && (t2+highestEv.value) < 510 && clevel*1 != 100){
win.evs[highestEv.stat] = Math.min((highestEv.value+win.evs[highestEv.stat]),252)
await saveUserData2(battleData.oid,winner)
}
return
}
async function incexp2(winner,win,losser,lose,ctx,battleData,bot){
const av = []
let b = 1
let al = []
const baseexp = expdata.filter((poke)=> poke.name == lose.name)[0]
const g = growth_rates[win.name]
const exp69 = chart[g.growth_rate]["100"]
const clevel = plevel(win.name,win.exp)
if(baseexp && clevel!=100){
const ee = Math.floor(await calcexp(baseexp.baseExp,plevel(lose.name,lose.exp),clevel)/6)
win.exp = Math.min((win.exp+ee),exp69)
const l2 = await plevel(win.name,win.exp)
const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==win.name)[0]
if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= l2 && evo.evolution_level > clevel){
if(ctx.chat.type!='private'){
ctx.replyWithHTML('<a href="tg://user?id='+battleData.cid+'"><b>'+winner.inv.name+'</b></a> Your Pokemon <b>'+c(win.name)+'</b> Is Ready To Evolve',{reply_markup:{inline_keyboard:[[{text:'Evolve',url:'t.me/pokeplaybot'}]]}})
}
bot.telegram.sendMessage(battleData.cid,'*'+c(win.name)+'* Is Ready To Evolve',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+win.name+'_'+win.pass+''}]]}})
}
if((l2-clevel)!= 0){
const moves = pokemoves[win.name]
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at > clevel && move.level_learned_at <= l2 && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
if(moves2.length > 0){
for(const m of moves2){
if(!win.moves.includes(m.id)){
if(win.moves.length < 4){
win.moves.push(m.id)
await saveUserData2(battleData.cid,winner)
bot.telegram.sendMessage(battleData.cid,'<b>'+c(win.name)+'</b> (<b>Lv.</b> '+l2+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})
}else{
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
if(ctx.chat.type!='private'){
ctx.replyWithHTML('<a href="tg://user?id='+battleData.cid+'"><b>'+winner.inv.name+'</b></a>, <b>'+c(win.name)+'</b> (<b>Lv.</b> '+l2+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/pokeplaybot'}]]}})
}
const mdata = await loadMessageData();
const m77 = await bot.telegram.sendMessage(battleData.cid,'<b>'+c(win.name)+'</b> (<b>Lv.</b> '+l2+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(win.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+win.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})
if(!mdata.moves){
mdata.moves = {}
}
mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:win.name,move:dmoves[m.id].name}
await saveMessageData(mdata)
}
}
}
}
}
await saveUserData2(battleData.cid,winner)
}
return
} 
async function getAllUserData() {
  try {
    const users = await getCollection('users');
    const docs = await users.find({}).toArray();
    return docs.map((doc) => ({
      user_id: doc.user_id || doc._id,
      userId: doc.userId || doc.user_id || doc._id,
      data: doc.data || {},
      reset: Boolean(doc.reset)
    }));
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return [];
  }
}

async function getUserCount() {
  try {
    const users = await getCollection('users');
    return await users.countDocuments();
  } catch (error) {
    console.error('Error counting users:', error);
    return 0;
  }
}

async function getUserIds() {
  try {
    const users = await getCollection('users');
    const docs = await users.find({}, { projection: { _id: 1 } }).toArray();
    return docs
      .map((doc) => Number(doc._id))
      .filter((id) => Number.isFinite(id));
  } catch (error) {
    console.error('Error listing user ids:', error);
    return [];
  }
}

async function userExists(userId) {
  try {
    const key = String(userId);
    const users = await getCollection('users');
    const doc = await users.findOne({ _id: key }, { projection: { _id: 1 } });
    return Boolean(doc);
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
}
function getTopUsers(userData, attribute, count) {
  try {
      return userData
        .filter((user) => !user.reset && user.data.inv && user.data.pokes)
        .sort((a, b) => {
          try {
            return (b.data.inv[attribute] || 0) - (a.data.inv[attribute] || 0);
          } catch (error) {
            console.error('Error sorting users:', error);
            console.log('Problematic user data:', a, b);
            return 0; // Return 0 to keep the existing order
          }
        })
        .slice(0, count);
  } catch (error) {
    console.error('Error in getTopUsers In '+user.user_id+':', error);
//    console.log('User data causing error:', userData);
    return [];
  }
}
async function sort(id,pokes2){
const data = await getUserData(id)
if(!data.extra){
data.extra = {}
}
if(!data.extra.sort_order){
data.extra.sort_order = 'desc'
}
const dir = data.extra.sort_order == 'asc' ? 1 : -1
if(data.extra.sort){
if(data.extra.sort=='level'){
pokes2.sort((a, b) => (plevel(a.name,a.exp) - plevel(b.name,b.exp))*dir);
}else if(data.extra.sort=='pokedex-number'){
pokes2.sort((a,b)=> (pokes[a.name].pokedex_number - pokes[b.name].pokedex_number)*dir)
}else if(data.extra.sort=='iv-points'){
pokes2.sort((a,b)=> (calculateTotal(a.ivs)- calculateTotal(b.ivs))*dir)
}else if(data.extra.sort=='ev-points'){
pokes2.sort((a,b)=> (calculateTotal(a.evs)- calculateTotal(b.evs))*dir)
}else if(data.extra.sort=='name'){
pokes2.sort((a, b) => (a.nickname || a.name).localeCompare(b.nickname || b.name)*dir);
}else if(data.extra.sort=='hp-points'){
pokes2.sort((a,b)=> (Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp)).hp - Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp)).hp)*dir)
}else if(data.extra.sort=='attack-points'){
pokes2.sort((a,b)=>  (Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp)).attack -  Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp)).attack)*dir)
}else if(data.extra.sort=='defense-points'){
pokes2.sort((a,b)=>  (Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp)).defense -  Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp)).defense)*dir)
}else if(data.extra.sort=='special-attack-points'){
pokes2.sort((a,b)=>  (Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp)).special_attack -  Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp)).special_attack)*dir)
}else if(data.extra.sort=='special-defense-points'){
pokes2.sort((a,b)=>  (Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp)).special_defense -  Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp)).special_defense)*dir)
}else if(data.extra.sort=='speed-points'){
pokes2.sort((a,b)=>  (Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp)).speed -  Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp)).speed)*dir)
}else if(data.extra.sort=='total-points'){
pokes2.sort((a,b)=> (calculateTotal( Stats(pokestats[a.name],a.ivs,a.evs,a.nature,plevel(a.name,a.exp))) - calculateTotal( Stats(pokestats[b.name],b.ivs,b.evs,b.nature,plevel(b.name,b.exp))))*dir)
}
}
return pokes2
}
function generateRandomIVs(rarity) {
  const ivs = {};
  const stats = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed']; // Pokémon stats
for(const a of stats){
ivs[a] = 0
}
  if (rarity === 'Legendary' || rarity === 'legendry' || rarity === 'legendary' || rarity === 'mythical') {
    let totalIVs = 0;
const rt = Math.random()
if(rt<0.0000005){
var minTotal = Math.floor(Math.random() * 6) + 180;
}else if(Math.random()< 0.000005){
var minTotal = Math.floor(Math.random() * 8) + 172;
}else if(Math.random()< 0.00005){
var minTotal = Math.floor(Math.random() * 7) + 165;
}else if(Math.random()< 0.0005){
var minTotal = Math.floor(Math.random() * 5) + 160;
}else if(Math.random()< 0.005){
var minTotal = Math.floor(Math.random() * 10) + 150;
}else if(Math.random()< 0.05){
var minTotal = Math.floor(Math.random() * 10) + 140;
}else if(Math.random()< 0.2){
var minTotal = Math.floor(Math.random() * 10) + 130;
}else if(Math.random()< 0.7){
var minTotal = Math.floor(Math.random() * 20) + 110;
}else{
var minTotal = Math.floor(Math.random() * 25) + 85;
}
    // Ensure minimum total IVs
    while (totalIVs < minTotal) {
      let statToIncrease = stats[Math.floor(Math.random() * stats.length)];
      const AIv = (Math.random() < 0.002 || minTotal > 155) ? 31 : 30
if (!ivs[statToIncrease] || ivs[statToIncrease] < AIv) {
            ivs[statToIncrease] = (ivs[statToIncrease] || 0) + 1;
            totalIVs++;
        }
    }
  } else{
    let totalIVs = 0;
const mx = Math.random() < 0.001 ? 140 : 80
const rt = Math.random()
if(rt<0.0000005){
var minTotal = Math.floor(Math.random() * 6) + 180;
}else if(Math.random()< 0.000005){
var minTotal = Math.floor(Math.random() * 8) + 172;
}else if(Math.random()< 0.00005){
var minTotal = Math.floor(Math.random() * 7) + 165;
}else if(Math.random()< 0.0005){
var minTotal = Math.floor(Math.random() * 5) + 160;
}else if(Math.random()< 0.01){
var minTotal = Math.floor(Math.random() * 30) + 120;
}else if(Math.random()< 0.1){
var minTotal = Math.floor(Math.random() * 10) + 120;
}else if(Math.random()< 0.3){
var minTotal = Math.floor(Math.random() * 20) + 100;
}else if(Math.random()< 0.9){
var minTotal = Math.floor(Math.random() * 20) + 80;
}else{
var minTotal = Math.floor(Math.random() * 50) + 20
}
    // Ensure minimum total IVs
    while (totalIVs < minTotal) {
      let statToIncrease = stats[Math.floor(Math.random() * stats.length)];
      const AIv = (Math.random() < 0.07 || minTotal>165) ? 31 : 30
if (!ivs[statToIncrease] || ivs[statToIncrease] < AIv) {
            ivs[statToIncrease] = (ivs[statToIncrease] || 0) + 1;
            totalIVs++;
        }
    }
}

  return withGuaranteedIvSpread(ivs, 20, 31, 25);
}

function clampIvValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(31, Math.floor(n)));
}

function withMinimumIvs(ivs, minPerStat) {
  const stats = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];
  const out = {};
  const minIv = Math.max(0, Math.min(31, Math.floor(Number(minPerStat) || 0)));
  for (const statName of stats) {
    const base = clampIvValue(ivs && ivs[statName]);
    out[statName] = Math.max(minIv, base);
  }
  return out;
}

function withRandomIvRange(ivs, minPerStat, maxPerStat) {
  const stats = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];
  const out = {};
  const minIv = Math.max(0, Math.min(31, Math.floor(Number(minPerStat) || 0)));
  const maxIv = Math.max(minIv, Math.min(31, Math.floor(Number(maxPerStat) || 31)));
  for (const statName of stats) {
    const roll = Math.floor(Math.random() * (maxIv - minIv + 1)) + minIv;
    const base = clampIvValue(ivs && ivs[statName]);
    out[statName] = Math.max(base, roll);
  }
  return out;
}

function withGuaranteedIvSpread(ivs, minPerStat, maxPerStat, guaranteedMinimum) {
  const stats = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];
  const out = withRandomIvRange(ivs, minPerStat, maxPerStat);
  const guaranteedMin = Math.max(
    Math.max(0, Math.min(31, Math.floor(Number(guaranteedMinimum) || 0))),
    Math.max(0, Math.min(31, Math.floor(Number(minPerStat) || 0)))
  );
  const hasGuaranteedStat = stats.some((statName) => Number(out[statName]) >= guaranteedMin);
  if (!hasGuaranteedStat) {
    const chosenStat = stats[Math.floor(Math.random() * stats.length)];
    const boostRoll = Math.floor(Math.random() * (31 - guaranteedMin + 1)) + guaranteedMin;
    out[chosenStat] = Math.max(clampIvValue(out[chosenStat]), boostRoll);
  }
  return out;
}

function applyCaptureIvRules(ivs, options = {}) {
  const symbol = String(options.symbol || '');
  const isShiny = Boolean(options.isShiny) || symbol === '✨' || symbol === '?';
  const isSafari = Boolean(options.isSafari);
  let minPerStat = 0;
  if (isSafari) minPerStat = Math.max(minPerStat, 10);
  if (isShiny) minPerStat = Math.max(minPerStat, 20);
  return withMinimumIvs(ivs, minPerStat);
}

module.exports = {
  chooseRandomNumbers,
  getLevel,
  stat,
  calculateTotalEV,
  calculateTotal,
  getRandomNature,
  getUserData,
  saveUserData2,
  saveUserData22,
  check,
  c,
  Stats,
  word,
  Bar,
  plevel,
  calc,
  calcexp,
  sleep,
  eff,
  findEvolutionLevel,
  saveMessageData,
  loadMessageData,
  loadMessageDataFresh,
  loadBattleData,
  saveBattleData,
  pokelist,
  pokelisthtml,
  incexp,
  incexp2,
  check2,
  check2q,
  getAllUserData,
  getTopUsers,
  sort,
  generateRandomIVs,
  applyCaptureIvRules,
  resetUserData,
  initDataStores,
  getUserCount,
  getUserIds,
  userExists
}

