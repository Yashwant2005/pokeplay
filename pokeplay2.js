let msgsent = []
const appr = [1072659486,6265981509]
//const botToken = '8734728430:AAEOH4b37Iq0gCyScapQBwE4Emiaqr-nRZs' //main bot
//const botToken = '8734728430:AAEOH4b37Iq0gCyScapQBwE4Emiaqr-nRZs' //backup bot
const botToken = '8734728430:AAEOH4b37Iq0gCyScapQBwE4Emiaqr-nRZs' // test bot
const { Telegraf } = require('telegraf')
const bot = new Telegraf(botToken)
if (process.env.QUIET_LOGS === '1') {
  console.log = () => {}
}
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})
const app = [6265981509]
const LocalSession = require('telegraf-session-local');
const session = new LocalSession({ database: 'data/hexa_session.json' });
bot.use(session.middleware());
loadGroupIdsFromFile()
setInterval(saveGroupIdsToFile, 5000)
process.on('beforeExit', () => {
  saveGroupIdsToFile()
})
bot.use(async (ctx, next) => {
  if(ctx.chat && ctx.chat.type !== 'private'){
    addGroupId(ctx.chat.id)
  }
  return next()
})
const commands = new Map();
commands.forEach((method, name) => {
  bot.command(name, method)
})
const tutors = [
520, 803, 338, 805, 519, 307, 799, 814, 815, 518,
  812, 308, 450, 282, 143,
  343, 351, 387,  20,
  401, 804, 798, 800, 802, 807, 797, 324,
  808, 806,   7,   8,   9, 200, 264, 530, 276,
  796, 352, 710, 809, 492, 813, 434,
  340, 547
]
const gmax = 'https://telegra.ph/file/69896185471b6a096ff06.jpg'
let rar = 0
let gma = 0
const trainers = {
"selene":"https://telegra.ph/file/9630b88c3d8e12f345d01.jpg",
"calem":"https://telegra.ph/file/7ab5b16c1c618b3295711.jpg",
"elio":"https://telegra.ph/file/dc50d855ef55787805e89.jpg",
"nate":"https://telegra.ph/file/e403ddd36c19ed1eda7d5.jpg",
"victor":"https://telegra.ph/file/fbf0184a2224eb69e3dcb.jpg",
"hilbert":"https://telegra.ph/file/c13833bd1ba27a1ec142e.jpg",
"lucas":"https://telegra.ph/file/d607a91c98a8b421c68af.jpg",
"brenden":"https://telegra.ph/file/9f7a41488fe4156c88429.jpg",
"ethan":"https://telegra.ph/file/e21588cecef8e6c230b8c.jpg",
"chase":"https://telegra.ph/file/9f7a41488fe4156c88429.jpg"
}
const event = ['kirlia','pacham','lilligant','decdueye','skitty','unown']
const userState2 = new Map()
const path = require('path')
const userState = new Map()
const stringSimilarity = require('string-similarity');
const schedule = require('node-schedule');
const NodeCache = require('node-cache');
const timeoutCache = new NodeCache();
const colors = ['red','orange','yellow','green','blue','lightblue','violet','darkviolet','black','grey','white','brown','pink','purple']
const fetch = require('node-fetch');
const { createCanvas, loadImage, registerFont } = require('canvas');
const registerCommands = require('./commands');
const registerCallbacks = require('./callbacks');
const { buildModuleDeps } = require('./utils');
registerFont('./CabalBold-78yP.ttf', { family: 'Cabal' });
registerFont('./SparkyStonesRegular-BW6ld.ttf', { family: 'Cool' });
const moment = require('moment');
const ballsdata = {
"regular":1.5,
"great":2.5,
"ultra":3,
"master":255,
"safari":3,
"level":2,
"friend":2.5,
"moon":2,
"sport":2.7,
"net":2,
"nest":2,
"repeat":2,
"luxury":3.5,
"quick":1.5,
"park":1.5,
"beast":1.5
}
bot.on('edited_message',async ctx => {
})
// Global error guard so one command error doesn't affect others
bot.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled command error:', error);
    try {
      await ctx.reply('Something went wrong. Please try again.');
    } catch (e) {
      // ignore reply failures
    }
  }
});
// Ignore updates sent before this bot instance started (stale updates)
bot.use((ctx, next) => {
  try {
    let ts;
    if (ctx.message && ctx.message.date) ts = ctx.message.date;
    else if (ctx.editedMessage && ctx.editedMessage.date) ts = ctx.editedMessage.date;
    else if (ctx.callbackQuery && ctx.callbackQuery.message && ctx.callbackQuery.message.date) ts = ctx.callbackQuery.message.date;
    else if (ctx.update && ctx.update.message && ctx.update.message.date) ts = ctx.update.message.date;
    else if (ctx.update && ctx.update.edited_message && ctx.update.edited_message.date) ts = ctx.update.edited_message.date;
    else if (ctx.update && ctx.update.callback_query && ctx.update.callback_query.message && ctx.update.callback_query.message.date) ts = ctx.update.callback_query.message.date;
    if (ts) {
      const msgMs = ts * 1000;
      if (msgMs < botStartTime) return;
    }
  } catch (e) {
    // fall through
  }
  return next();
});
const bags = {
"1":"https://te.legra.ph/file/340c9151c246c4262380d.jpg",
"2":"https://te.legra.ph/file/e60ce276626cc8f039ae2.jpg",
"3":"https://te.legra.ph/file/7bf7399dba1158909b3ee.jpg",
"4":"https://te.legra.ph/file/f635600afa470f91058b6.jpg",
"5":"https://te.legra.ph/file/3f97ddbd80bb1ea351191.jpg",
"6":"https://te.legra.ph/file/0ca46b70b24f64b496b5d.jpg",
"7":"https://te.legra.ph/file/e6cff8112d5d5d25ab4f9.jpg",
"8":"https://te.legra.ph/file/5b14ba8ad45e85376cc45.jpg",
"9":"https://te.legra.ph/file/017a600cc62b5af2ec0ec.jpg",
"10":"https://graph.org/file/5f0681dee62ffd3867a13.jpg"}
let he = require('he');
const fs = require('fs')
const groupListPath = './data/groups.json'
let groupIds = new Set()
let groupIdsDirty = false

function loadGroupIdsFromFile(){
  try{
    if(fs.existsSync(groupListPath)){
      const raw = fs.readFileSync(groupListPath,'utf8')
      const list = JSON.parse(raw)
      if(Array.isArray(list)){
        groupIds = new Set(list.map(id => String(id)))
      }
    }
  }catch(e){}
}

function saveGroupIdsToFile(){
  if(!groupIdsDirty) return
  try{
    if(!fs.existsSync('./data')){
      fs.mkdirSync('./data', { recursive: true })
    }
    fs.writeFileSync(groupListPath, JSON.stringify([...groupIds]))
    groupIdsDirty = false
  }catch(e){}
}

function addGroupId(id){
  const sid = String(id)
  if(!groupIds.has(sid)){
    groupIds.add(sid)
    groupIdsDirty = true
  }
}

function removeGroupIds(ids){
  let changed = false
  for(const id of ids){
    const sid = String(id)
    if(groupIds.delete(sid)){
      changed = true
    }
  }
  if(changed){
    groupIdsDirty = true
  }
}

function getGroupIds(){
  return Array.from(groupIds)
}
function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function replaceInPlace(target, source) {
  if (Array.isArray(target) && Array.isArray(source)) {
    target.length = 0;
    for (const item of source) {
      target.push(item);
    }
    return;
  }
  if (
    target &&
    source &&
    typeof target === 'object' &&
    typeof source === 'object' &&
    !Array.isArray(target) &&
    !Array.isArray(source)
  ) {
    for (const key of Object.keys(target)) {
      delete target[key];
    }
    for (const [key, value] of Object.entries(source)) {
      target[key] = value;
    }
    return;
  }
  console.warn('Cache reload skipped due to type mismatch.');
}

const safari = readJsonFile('data/safari.json');
const events = readJsonFile('data/event.json');
const lvls = readJsonFile('data/poke_level.json');
const catch_rates = readJsonFile('data/pokemon_rarity.json');
const stones = readJsonFile('data/stones.json');
const pokes = readJsonFile('data/pokemon_info55_modified2.json');
const pokemoves = readJsonFile('data/moveset_data_updated2.json');
const re = readJsonFile('data/poke_rarity.json');
const pokestats = readJsonFile('data/pokemon_base_stats_info2.json');
const trainerlevel = readJsonFile('data/levels.json');
const tmprices = readJsonFile('data/tm_prices.json');
const tms = readJsonFile('data/tms2.json');
const forms = readJsonFile('data/pokemon_data_updated.json');
const shiny = readJsonFile('data/shiny.json');
const dmoves = readJsonFile('data/moves_info.json');
const spawn = readJsonFile('data/pokemon_status_info.json');
const expdata = readJsonFile('data/pokemon_base_exp2.json');
const pokes2 = readJsonFile('data/pokemon_info2.json');
const chart = readJsonFile('data/exp_chart.json');
const chains = readJsonFile('data/evolution_chains2.json');
const growth_rates = readJsonFile('data/pokemon_data2.json');
const { getRandomAbilityForPokemon } = require('./utils/pokemon_ability');
const { toBaseIdentifier } = require('./utils/base_form_pokemon');
const rdata = readJsonFile('data/pokedex_data.json');
function reloadStaticData() {
  try {
    replaceInPlace(safari, readJsonFile('data/safari.json'));
    replaceInPlace(events, readJsonFile('data/event.json'));
    replaceInPlace(lvls, readJsonFile('data/poke_level.json'));
    replaceInPlace(catch_rates, readJsonFile('data/pokemon_rarity.json'));
    replaceInPlace(stones, readJsonFile('data/stones.json'));
    replaceInPlace(pokes, readJsonFile('data/pokemon_info55_modified2.json'));
    replaceInPlace(pokemoves, readJsonFile('data/moveset_data_updated2.json'));
    replaceInPlace(re, readJsonFile('data/poke_rarity.json'));
    replaceInPlace(pokestats, readJsonFile('data/pokemon_base_stats_info2.json'));
    replaceInPlace(trainerlevel, readJsonFile('data/levels.json'));
    replaceInPlace(tmprices, readJsonFile('data/tm_prices.json'));
    replaceInPlace(tms, readJsonFile('data/tms2.json'));
    replaceInPlace(forms, readJsonFile('data/pokemon_data_updated.json'));
    replaceInPlace(shiny, readJsonFile('data/shiny.json'));
    replaceInPlace(dmoves, readJsonFile('data/moves_info.json'));
    replaceInPlace(spawn, readJsonFile('data/pokemon_status_info.json'));
    replaceInPlace(expdata, readJsonFile('data/pokemon_base_exp2.json'));
    replaceInPlace(pokes2, readJsonFile('data/pokemon_info2.json'));
    replaceInPlace(chart, readJsonFile('data/exp_chart.json'));
    replaceInPlace(chains, readJsonFile('data/evolution_chains2.json'));
    replaceInPlace(growth_rates, readJsonFile('data/pokemon_data2.json'));
    replaceInPlace(rdata, readJsonFile('data/pokedex_data.json'));
  } catch (error) {
    console.error('Failed to reload static data cache:', error);
  }
}

setInterval(reloadStaticData, 60 * 60 * 1000);
const { chooseRandomNumbers, getLevel, stat, calculateTotalEV, calculateTotal,getRandomNature, getUserData, resetUserData, saveUserData2, saveUserData22, check, c, Stats, word, Bar, plevel, calc, calcexp, sleep, eff, findEvolutionLevel, saveMessageData,loadMessageData,loadBattleData,saveBattleData,pokelist,pokelisthtml,incexp,incexp2,check2,check2q,getAllUserData,getTopUsers,sort,generateRandomIVs,applyCaptureIvRules} = require('./func.js')
const regions = ['Kanto','Johto','Hoenn','Sinnoh','Unova','Kalos','Alola','Galar','Paldea']
const region = {
"Kanto":1,
"Johto":2,
"Hoenn":3,
"Sinnoh":4,
"Unova":5,
"Kalos":6,
"Alola":7,
"Galar":8,
"Paldea":9
}
const starters = {
  "Kanto": ["Bulbasaur", "Charmander", "Squirtle"],
  "Unova": ["Snivy", "Tepig", "Oshawott"],
  "Sinnoh": ["Turtwig", "Chimchar", "Piplup"],
  "Johto": ["Chikorita", "Cyndaquil", "Totodile"],
  "Hoenn": ["Treecko", "Torchic", "Mudkip"],
  "Paldea": ["Sprigatito", "Fuecoco", "Quaxly"],
  "Galar": ["Grookey", "Scorbunny", "Sobble"],
  "Alola": ["Rowlet", "Litten", "Popplio"],
  "Kalos": ["Chespin", "Fennekin", "Froakie"]
};
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
const STATUS_ICONS = {
  burn: "🔥",
  poison: "☠️",
  badly_poisoned: "☠️",
  freeze: "❄️",
  paralyze: "⚡"
}

function ensureBattleStatus(battleData) {
  if (!battleData.status || typeof battleData.status !== "object") {
    battleData.status = {};
  }
  return battleData.status;
}

function getBattleStatus(battleData, pass) {
  const status = ensureBattleStatus(battleData)[pass];
  return status || null;
}

function setBattleStatus(battleData, pass, status) {
  const statuses = ensureBattleStatus(battleData);
  if (!status) {
    delete statuses[pass];
    return;
  }
  statuses[pass] = status;
}

function getStatusLabel(status) {
  if (!status) return "";
  return status === "badly_poisoned" ? "Badly Poisoned" : c(status);
}

function getStatusTag(battleData, pass) {
  const status = getBattleStatus(battleData, pass);
  if (!status) return "";
  const icon = STATUS_ICONS[status] || "";
  return ` ${icon} [${getStatusLabel(status)}]`;
}

function getSpeedWithStatus(baseSpeed, battleData, pass) {
  const status = getBattleStatus(battleData, pass);
  if (status === "paralyze") {
    return Math.max(1, Math.floor(baseSpeed / 2));
  }
  return baseSpeed;
}

function canPokemonAct(battleData, pass, pokeName) {
  const status = getBattleStatus(battleData, pass);
  if (status === "freeze") {
    if (Math.random() < 0.2) {
      setBattleStatus(battleData, pass, null);
      return { canAct: true, msg: `âž£ <b>${c(pokeName)}</b> thawed out.` };
    }
    return { canAct: false, msg: `âž£ <b>${c(pokeName)}</b> is frozen solid.` };
  }
  if (status === "paralyze" && Math.random() < 0.25) {
    return { canAct: false, msg: `âž£ <b>${c(pokeName)}</b> is fully paralyzed and cannot move.` };
  }
  return { canAct: true, msg: "" };
}

function getMoveStatusEffect(move) {
  if (!move || !move.name) return null;
  const name = String(move.name).toLowerCase();
  const guaranteed = {
    "will-o-wisp": { status: "burn", chance: 1 },
    "toxic": { status: "badly_poisoned", chance: 1 },
    "poison-powder": { status: "poison", chance: 1 },
    "poison-gas": { status: "poison", chance: 1 },
    "thunder-wave": { status: "paralyze", chance: 1 },
    "stun-spore": { status: "paralyze", chance: 1 },
    "glare": { status: "paralyze", chance: 1 },
    "nuzzle": { status: "paralyze", chance: 1 }
  };
  if (guaranteed[name]) return guaranteed[name];

  if (["ember", "flamethrower", "fire-blast", "heat-wave", "flame-wheel", "fire-punch"].includes(name)) {
    return { status: "burn", chance: 0.1 };
  }
  if (["poison-sting", "smog", "sludge", "sludge-bomb", "poison-jab", "cross-poison", "gunk-shot"].includes(name)) {
    return { status: "poison", chance: 0.3 };
  }
  if (["thunderbolt", "thunder", "spark", "discharge", "body-slam", "lick"].includes(name)) {
    return { status: "paralyze", chance: 0.3 };
  }
  if (["ice-beam", "blizzard", "powder-snow", "ice-punch"].includes(name)) {
    return { status: "freeze", chance: 0.1 };
  }
  return null;
}

function isStatusImmune(status, defenderTypes = []) {
  const types = defenderTypes.map((t) => String(t).toLowerCase());
  if (status === "burn" && types.includes("fire")) return true;
  if ((status === "poison" || status === "badly_poisoned") && (types.includes("poison") || types.includes("steel"))) return true;
  if (status === "freeze" && types.includes("ice")) return true;
  if (status === "paralyze" && types.includes("electric")) return true;
  return false;
}

function applyDefenderResidualDamage(battleData, defenderPass, defenderName, defenderMaxHp) {
  const status = getBattleStatus(battleData, defenderPass);
  if (!status || !["burn", "poison", "badly_poisoned"].includes(status)) {
    return "";
  }
  const divisor = status === "burn" ? 16 : 8;
  const residual = Math.max(1, Math.floor(defenderMaxHp / divisor));
  battleData.ohp = Math.max(0, battleData.ohp - residual);
  battleData.tem2[defenderPass] = Math.max(0, battleData.tem2[defenderPass] - residual);
  return `\nâž£ <b>${c(defenderName)}</b> is hurt by ${status === "burn" ? "burn" : "poison"} and lost <code>${residual}</code> HP.`;
}

let botStartTime = new Date().getTime();
let lastClicked = {}
let lastUsed = {}
let lastClicked2 = {}
let globalClicks = [];
let lastmsg = {}
let globalmsg = [];
let lastInteractionAt = 0;
let battlec = {}
const banListFile2 = 'data/ban_list.json';
const admins = [6265981509, 8493023103, 8551864967]
const admins35 = [6265981509, 8493023103, 8551864967]

// Load the ban list from the file
let banList2 = [];
try {
    const banListData = fs.readFileSync(banListFile2, 'utf-8');
    banList2 = JSON.parse(banListData);
} catch (error) {
    console.error('Error loading ban list:', error);
}

const moduleDeps = buildModuleDeps({
  bot,
  botToken,
  app,
  session,
  commands,
  chooseRandomNumbers,
  getLevel,
  tutors,
  gmax,
  trainers,
  event,
  userState,
  userState2,
  check,
  check2,
  check2q,
  getUserData,
  resetUserData,
  saveUserData2,
  saveUserData22,
  sendMessage,
  editMessage,
  loadMessageData,
  loadBattleData,
  saveBattleData,
  regions,
  starters,
  trainerlevel,
  tms,
  stones,
  spawn,
  forms,
  lvls,
  pokes,
  pokemoves,
  dmoves,
  growth_rates,
  chart,
  stat,
  word,
  getRandomNature,
  generateRandomIVs,
  applyCaptureIvRules,
  c,
  he,
  fs,
  path,
  fetch,
  createCanvas,
  loadImage,
  registerFont,
  moment,
  timeoutCache,
  colors,
  bags,
  safari,
  lvls,
  catch_rates,
  re,
  trainerlevel,
  tmprices,
  expdata,
  pokes2,
  chains,
  rdata,
  region,
  stringSimilarity,
  ballsdata,
  calculateTotal,
  calculateTotalEV,
  calcexp,
  sleep,
  findEvolutionLevel,
  sort,
  pokelist,
  pokelisthtml,
  checkseen,
  formatDetails,
  appr,
  rar,
  gma,
  banList2,
  banListFile2,
  saveBanList,
  admins,
  admins35,
  getGroupIds,
  removeGroupIds,
  saveGroupIdsToFile
  ,
  pokestats,
  plevel,
  Stats,
  battlec,
  shiny,
  events,
  emojis,
  saveMessageData,
  incexp,
  incexp2,
  Bar,
  eff,
  calc,
  getStatusTag,
  ensureBattleStatus,
  getBattleStatus,
  canPokemonAct,
  getMoveStatusEffect,
  isStatusImmune,
  setBattleStatus,
  getStatusLabel,
  applyDefenderResidualDamage,
  getSpeedWithStatus,
  tutors
  ,
  getAllUserData,
  getTopUsers,
  botStartTime,
  lastClicked,
  lastUsed,
  lastClicked2,
  globalClicks,
  lastmsg,
  globalmsg,
  forwardMessageToAllUsers,
  reloadStaticData
});
registerCommands(bot, moduleDeps);
registerCallbacks(bot, moduleDeps);

bot.on('callback_query', async (ctx, next) => {
  try {

if(banList2.includes(String(ctx.from.id))|| banList2.includes(ctx.from.id)){
return
}
    lastInteractionAt = Date.now();
    const userId = ctx.from.id;
    const chatId = ctx.chat ? ctx.chat.id : 0;
const globalClicksPerSecond = globalClicks.filter(
  (timestamp) => Date.now() - timestamp < 1000
);

if (globalClicksPerSecond.length > 40) {
  const waitTime = Math.ceil((globalClicksPerSecond[0] + 1000 - Date.now()) / 1000);
  ctx.answerCbQuery(`Hold on 1 sec.`);
  return;
}

// Check chat-specific click rate for groups
if (ctx.chat && ctx.chat.type != 'private') {
  if (!lastClicked[chatId]) {
    lastClicked[chatId] = [];
  }

  // Check total clicks in the current minute
  const currentMinuteStart = Date.now() - (Date.now() % 60000);
  const clicksPerMinute = lastClicked[chatId].filter(
    (timestamp) => timestamp >= currentMinuteStart
  );

  if (clicksPerMinute.length >= 40) {
    const waitTime = Math.ceil((clicksPerMinute[0] + 60000 - Date.now()) / 1000);
    ctx.answerCbQuery(`Too many requests.`);
    return;
  }
}
if(ctx.chat.type=='private'){
 var sy = 1000
}else{
 var sy = 1000
}
if (lastClicked2[ctx.from.id] && Date.now() - lastClicked2[ctx.from.id] < sy) {

  ctx.answerCbQuery('Hold on 1 sec.');
  return;
}
await next();
}catch(error){
console.log(error)
}
})
bot.on('message',async (ctx,next) => {
try{
if(banList2.includes(String(ctx.from.id))|| banList2.includes(ctx.from.id)){
return
}
lastInteractionAt = Date.now();
ctx.session.groupChatLimitReached = false;
const updateTimestamp = ctx.message.date * 1000; // Convert to milliseconds
  if (updateTimestamp < botStartTime) {
    return;
  }
const userId = ctx.from.id;
    const chatId = ctx.chat ? ctx.chat.id : 0;
const globalClicksPerSecond = globalmsg.filter(
  (timestamp) => Date.now() - timestamp < 1000
);

if (globalClicksPerSecond.length > 40) {
  const waitTime = Math.ceil((globalClicksPerSecond[0] + 1000 - Date.now()) / 1000);
  return;
}

// Check chat-specific click rate for groups
if (ctx.chat && ctx.chat.type != 'private') {
  if (!lastmsg[chatId]) {
    lastmsg[chatId] = [];
  }

  // Check total clicks in the current minute
  const currentMinuteStart = Date.now() - (Date.now() % 60000);
  const clicksPerMinute = lastmsg[chatId].filter(
    (timestamp) => timestamp >= currentMinuteStart
  );

  if (clicksPerMinute.length >= 40) {
    const waitTime = Math.ceil((clicksPerMinute[0] + 60000 - Date.now()) / 1000);
if(!msgsent.includes(chatId)){
await sendMessage(ctx,ctx.chat.id,'*âš ï¸ Too many requests*',{parse_mode:'markdown'})
msgsent.push(chatId)
}
    return;
  }
}
if(ctx.chat.type=='private'){
var sy = 700
}else{
var sy = 1500
}
if (lastClicked2[ctx.from.id] && Date.now() - lastClicked2[ctx.from.id] < sy) {
    return;
  }
if(msgsent.includes(chatId)){
msgsent = msgsent.filter(id => id!=chatId)
}
const nam2 = (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) ? ctx.message.text.split(' ')[0].replace('/','') : 'b'
const name = nam2.includes('@'+bot.botInfo.username) ? nam2.replace('@'+bot.botInfo.username,'') : nam2
const command = commands.get(name)
if(ctx.message && ctx.message.text && ctx.message.text.startsWith('/')){
lastClicked2[ctx.from.id] = Date.now();
}
if(command){
command(ctx,next)
return
}
const data = await getUserData(ctx.from.id)
if(data.inv && (!data.settings)){
data.settings = {}
const s = data.settings
s['max_poke'] = 6
s['dual_type'] = true
s['min_6l'] = 0
s['max_6l'] = 6
s['min_level'] = 1
s['max_level'] = 100
s['switch'] = true
s['key_item'] = true
s['sandbox'] = false
s['random'] = false
s['preview'] = 'no'
s['pin'] = false
s['ban_types'] = []
s['allow_types'] = []
s['ban_regions'] = []
s['allow_regions'] = []
s['type_effects'] = true
await saveUserData2(ctx.from.id,data)
}

if(data.inv && !data.inv.exp){
data.inv.exp = 0
await saveUserData2(ctx.from.id,data)
}
if (userState2.has(ctx.from.id)) {
    const userData2 = userState2.get(ctx.from.id);

    // Check if the user's message is a reply to the waiting message
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.message_id === userData2.messageId) {
userState2.delete(ctx.from.id);
var regex = /[^a-zA-Z0-9 .]/g;
  // Find all invalid characters in the message
  var invalidCharacters = ctx.message.text.match(regex);
if(invalidCharacters!=null){
const message = await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Invalid Character: *'+invalidCharacters+'*',{reply_markup:{force_reply:true}})
const userData3 = {
      messageId: message,
      pass: userData2.pass // You can set the name to whatever you like
    };
    userState2.set(ctx.from.id, userData3);
return
}
if(ctx.message.text.length > 12){
const message = await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Maximum Length: *12*',{reply_markup:{force_reply:true}})
const userData3 = {
      messageId: message,
      pass: userData2.pass // You can set the name to whatever you like
    };
    userState2.set(ctx.from.id, userData3);
return
}
const poke = data.pokes.filter((pk)=>pk.pass==userData2.pass)[0]
if(!poke){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Pokemon Not Found',{reply_to_message_id:ctx.message.message_id})
return
}
if(ctx.message.text == '.'){
if(poke.nickname){
delete poke.nickname
}
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Removed nickname of *'+c(poke.name)+'*',{reply_to_message_id:ctx.message.message_id})
}else{
poke.nickname = ctx.message.text
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Nicknamed *'+c(poke.name)+'* as *'+c(ctx.message.text)+'*',{reply_to_message_id:ctx.message.message_id})
}
await saveUserData2(ctx.from.id, data);;
return
}
}
if (userState.has(ctx.from.id)) {
    const userData2 = userState.get(ctx.from.id);

    // Check if the user's message is a reply to the waiting message
    if (ctx.message.reply_to_message && ctx.message.reply_to_message.message_id === userData2.messageId) {
userState.delete(ctx.from.id);
var regex = /[^a-zA-Z0-9 ]/g;
  // Find all invalid characters in the message
  var invalidCharacters = ctx.message.text.match(regex);
if(invalidCharacters!=null){
const message = await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Invalid Character: *'+invalidCharacters+'*',{reply_markup:{force_reply:true}})
const userData3 = {
      messageId: message,
      teamn: userData2.teamn // You can set the name to whatever you like
    };
    userState.set(ctx.from.id, userData3);
return
}
if(ctx.message.text.length > 12){
const message = await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Maximum Length: *12*',{reply_markup:{force_reply:true}})
const userData3 = {
      messageId: message,
      teamn: userData2.teamn // You can set the name to whatever you like
    };
    userState.set(ctx.from.id, userData3);
return
}

if(ctx.message.text == ','){
delete data.inv[userData2.teamn]
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Successfully Removed Name Of *Team '+userData2.teamn+'*',{reply_to_message_id:ctx.message.message_id})
}else{
data.inv[userData2.teamn] = ctx.message.text
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Renamed *Team '+userData2.teamn+'* As *'+ctx.message.text+'*',{reply_to_message_id:ctx.message.message_id})
}
await saveUserData2(ctx.from.id, data);
return
}
}
if(data.inv && data.inv.team && data.teams){
const team = data.teams[data.inv.team]
for(const a of team){
const pk = data.pokes.filter((pk)=> pk.pass==a)[0]
if(!pk){
data.teams[data.inv.team] = data.teams[data.inv.team].filter((p)=> p!=a)
await saveUserData2(ctx.from.id,data)
}
}
}
if(data.inv && (!data.inv.name || data.inv.name!=ctx.from.first_name)){
data.inv.name = he.encode(ctx.from.first_name)
await saveUserData2(ctx.from.id,data)
}
if(data.inv && !data.extra){
data.extra = {}
await saveUserData2(ctx.from.id,data)
}
if(data.inv && !data.extra.megas){
data.extra.megas = {}
await saveUserData2(ctx.from.id,data)
}
if(data.inv && Object.keys(data.extra.megas).length > 0){
const messageData = await loadMessageData();
const userIdToFind = String(ctx.from.id)
const result = Object.keys(messageData).find(key => {
  const value = messageData[key];
  return typeof value === 'object' && (value.turn === userIdToFind || value.oppo === userIdToFind);
});
if(result){
let battleData = {};
    try {
      battleData = loadBattleData(result);
    } catch (error) {
      battleData = {};
    }
if(!battleData.megas){
battleData.megas = {}
}
if(!Object.keys(battleData.megas).includes(Object.keys(data.extra.megas)[0])){
const p = data.pokes.filter((pk)=> pk.pass == Object.keys(data.extra.megas)[0])[0]
if(p){
p.name = data.extra.megas[Object.keys(data.extra.megas)[0]]
}
data.extra.megas = {}
await saveUserData2(ctx.from.id,data)
}
}else{
const p = data.pokes.filter((pk)=> pk.pass == Object.keys(data.extra.megas)[0])[0]
if(p){
p.name = data.extra.megas[Object.keys(data.extra.megas)[0]]
}
data.extra.megas = {}
await saveUserData2(ctx.from.id,data)
}
}
if(data.pokes && data.pokes.length > 0){
if(!data.pokecaught){
data.pokecaught = []
}
if(!data.pokeseen){
data.pokeseen = []
}
const fu2 = data.pokes.filter((p)=>!data.pokecaught.includes(p.name))
const fu = data.pokes.filter((p)=>!data.pokeseen.includes(p.name))
if(fu2.length > 0){
for(const yy of fu2){
data.pokecaught.push(yy.name)
}
await saveUserData2(ctx.from.id,data)
}
if(fu.length > 0){
for(const yy of fu){
data.pokeseen.push(yy.name)
}
await saveUserData2(ctx.from.id,data)
}
}
if(data.inv && data.extra){
const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);
const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
if(data.extra.pending && level > 19){
const id = data.extra.pending*1
const userData2 = await getUserData(id)
if(!userData2.extra.refer){
userData2.extra.refer = []
}
if(!userData2.refers){
userData2.refers = 0
}
userData2.refers += 1
userData2.extra.refer.push(ctx.from.id)
data.inv.pc += 1000
data.extra.referred = id
delete data.extra.pending
await sendMessage(ctx,ctx.from.id,'You have successfully reached <b>Level 20</b> and your refer by <b>'+userData2.inv.name+' has been completed.\n+ 1k PC ðŸ’·</b>',{parse_mode:'HTML'})
let msg = '<b>'+ctx.from.first_name+'</b> has reached <b>Level 20</b>.'
userData2.inv.pc += 500
msg += '\n<b>+500</b> PokeCoins ðŸ’·'
if (userData2.refers % 3 === 0) {
const ballTypes = ['level','friend','moon','sport','net','nest','luxury','premier','quick','park','beast'];

// Shuffle the ballTypes array
for (let i = ballTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ballTypes[i], ballTypes[j]] = [ballTypes[j], ballTypes[i]];
}

const numTypesToAdd = Math.floor(Math.random() * 2) + 2;
const selectedTypes = ballTypes.slice(0, numTypesToAdd);
selectedTypes.forEach(type => {
    const randomAmount = Math.floor(Math.random() * 5) + 1;
    userData2.balls[type] = (userData2.balls[type] || 0) + randomAmount;
    msg += `\n<b>+${randomAmount}</b> ${c(type)} Balls`;
});
}
if(userData2.refers % 8 === 0){
const n5 = Object.keys(tms.tmnumber)
const num = n5[Math.floor(Math.random()*n5.length)]
if(!userData2.tms){
userData2.tms = {}
}
if(!userData2.tms[String(num)]){
userData2.tms[String(num)] = 0
}
userData2.tms[String(num)] += 1
userData2.inv.pc += 1000
if(!userData2.inv.pass){
userData2.inv.pass = 0
}
userData2.inv.pass += 1
msg += '\n<b>+1</b> TM'+num+' âš™\n<b>+1</b> Safari Pass\n<b>+1000</b> PokeCoins ðŸ’·'
}
if(userData2.refers % 13 === 0){
const n5 = Object.keys(tms.tmnumber)
const num = n5[Math.floor(Math.random()*n5.length)]
if(!userData2.tms){
userData2.tms = {}
}
if(!userData2.tms[String(num)]){
userData2.tms[String(num)] = 0
}
userData2.tms[String(num)] += 1
const num2 = n5[Math.floor(Math.random()*n5.length)]
if(!userData2.tms[String(num2)]){
userData2.tms[String(num2)] = 0
}
userData2.tms[String(num2)] += 1
const num3 = n5[Math.floor(Math.random()*n5.length)]
if(!userData2.tms[String(num3)]){
userData2.tms[String(num3)] = 0
}
userData2.tms[String(num3)] += 1
userData2.inv.pc += 3000
if(!userData2.inv.pass){
userData2.inv.pass = 0
}
userData2.inv.pass += 1
msg += '\n<b>+1</b> TM'+num+' âš™\n<b>+1</b> TM'+num2+' âš™\n<b>+1</b> TM'+num3+' âš™\n<b>+1</b> Safari Pass\n<b>+3000</b> PokeCoins ðŸ’·'
}

  if (userData2.refers % 22 === 0) {
if(!userData2.balls.master){
userData2.balls.master = 0
}
userData2.balls.master += 1
const st = Object.keys(stones)
const stone = st[Math.floor(Math.random()*st.length)]
if(!userData2.inv.stones){
userData2.inv.stones = []
}
userData2.inv.stones.push(stone)
const ar = ['legendary','legendry']
var list = Object.keys(spawn).filter(pk=>ar.includes(spawn[pk].toLowerCase()) && forms[pk])
const name5 = list[Math.floor(Math.random()*list.length)]
const nut = ['gmax','mega','origin','primal']
var fr = forms[name5].filter(pk=> !nut.some((pk2)=> pk.identifier.includes(pk2)) && ar.includes(spawn[pk.identifier].toLowerCase()))
let nam = fr[Math.floor(Math.random()*fr.length)].identifier
nam = toBaseIdentifier(nam, forms)
const ul = lvls[nam]
let m = Math.max(ul.split('-')[0]*1,5)
let m2 = ul.split('-')[1]*1
const level = Math.floor(Math.random()*(m2-m))+m
const pokeName = nam.toLowerCase()
  const poked = pokes[pokeName]
  if (poked) {
const moves = pokemoves[pokeName]
if(moves){
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at < level*1 && dmoves[move.id].power && dmoves[move.id].accuracy)
const am = Math.min(Math.max(moves2.length,1),4)
const omoves = moves2.slice(-am)
const ms = []
for(const m of omoves){
ms.push(m.id)
}
const iv = await generateRandomIVs(spawn[pokeName].toLowerCase())
  const ev = {
"hp":0,
"attack":0,
"defense":0,
"special_attack":0,
"special_defense":0,
"speed":0
};
const pass2 = word(8)
const nat = getRandomNature()
const g = growth_rates[pokeName]
var sy = ''
const exp = chart[g.growth_rate][level]
  const da = {
    name:pokeName,
    id: poked.pokedex_number,
    nature:nat,
    ability:getRandomAbilityForPokemon(pokeName, pokes),
    held_item:'none',
    exp:exp,
    pass:pass2,
    ivs: iv,
    symbol: sy,
    evs: ev,
    moves: ms, // Push the randomly selected move ID
  };
if(!userData2.pokes){
userData2.pokes = []
}
userData2.pokes.push(da)
}
}
msg += '\n<b>+1</b> Master Ball\n<b>+1</b> '+c(stone)+'\n<b>+1</b> '+c(nam)+''
  }
await sendMessage(ctx,id,msg,{parse_mode:'HTML'})
await sendMessage(ctx,-1003069884900,'#refer\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) has reached level 20 and <b>'+userData2.inv.name+'</b> (<code>'+id+'</code>) received :-.\n\n'+msg+'',{parse_mode:'html'})
await saveUserData2(id,userData2)
await saveUserData2(ctx.from.id,data)
return
}
}
await next();
}catch(error){
console.log(error,ctx.from.id)
}
})

const groupCommands = [
    { command: '/start', description: 'Start The Bot' },
    { command: '/hunt', description: 'hunt A Poke' },
    {command:'/events',description:'View active and upcoming events'},
{command:'/ivlock',description:'Lock one IV stat during IV boost event'},
{command:'/claimplate',description:'Claim one Arceus Plate once'},
    {command:'/daily',description:'Claim commemorative daily rewards'},
{command:'/reset',description:'Reset data for yourself or a replied user'},
{command:'/claim_safari_pass',description:'Claim your daily safari event pass'},
{command:'/challenge',description:'Battle With Other Players'},
{command:'/mybag',description:'Check Your Bag'},
{ command: '/mypokemons', description: 'Check Your All Pokes' },
{command:'/mycard',description:'View Your Trainer Card'},
{command:'/trainer_card',description:'Customize Your Trainer Card'},
{command: '/stats', description: 'Check Stats Of A Poke' },
{command:'/assignability',description:'Assign Ability If Missing'},
{command:'/assignitems',description:'Assign Held Item Field If Missing'},
{command:'/battlestats',description:'Show Live Battle Stats Of A Pokemon'},
{command:'/buy',description:'Buy Items From Poke Store'},
{command:'/sell',description:'Sell Item To Poke Store'},
{command:'/battlebox',description:'Open your Battle Box rewards'},
{command:'/transfer',description:'transfer PokeCoins To Other Users'},
{command: '/travel', description: 'Travel Another Place' },
{command:'/safari_zone',description:'Travel Into Safari Zone'},
{command:'/ev_train',description:'Train EVs Of Your Poke'},
{command:'/daycare',description:'Train Pokemon to Lv100 in daycare'},
{command:'/myteams',description:' Setup Your Teams'},
{command:'/pokestore',description:'Visit PokeStore'},
{command:'/trade',description:'Trade Pokemons With Others (Paid)'},
{command:'/nickname',description:'Nickname A Pokemon'},
{command:'/release',description:'Release A Pokemon'},
{command:'/candy',description:'Give Candy To Your Pokemon'},
{command:'/vitamin',description:'Give Vitamins To Your Pokemon'},
{command:'/berry',description:'Give Berry To Your Pokemon'},
{command:'/mint',description:'Use Nature Mint On Pokemon'},
{command:'/bottlecap',description:'Max One IV To 31'},
{command:'/goldbottlecap',description:'Max All IVs To 31'},
{command:'/evolve',description:'Evolve Your Pokemon'},
{command:'/relearner',description:'Relearn Level-Up Moves'},
{command:'/pokedex',description:'Pokedex A Pokemom'},
{command:'/referral',description:'Refer And Earn'},
{command:'/settings',description:'Battle Settings Information'}
    // Add more group chat commands as needed
  ];                                                                             
  bot.telegram.setMyCommands(groupCommands, {scope: {type: "default"}});

bot.on('text',async (ctx,next) => {
if(ctx.message.text && ctx.message.text.toLowerCase().includes('/tm')){
let num = ctx.message.text.toLowerCase().replace('/tm','')
if(num.includes('@'+bot.botInfo.username.toLowerCase()+'')){
num = num.replace('@'+bot.botInfo.username.toLowerCase()+'','')
}
const data = await getUserData(ctx.from.id)
if(tms.tmnumber[String(num)]){
if(!data.tms){
data.tms={}
}
if(data.tms[num] && data.tms[num] > 0){
const m = tms.tmnumber[num]
const tmSellValue = Number(tmprices.sell[String(num)] || 0)
const tmSellLp = Math.max(1, Math.round(tmSellValue / 20))
let msg = 'âœ¦ *TM'+num+'* ('+c(dmoves[m].name)+' '+emojis[dmoves[m].type]+')\n'
msg += '*Power:* '+dmoves[m].power+', *Accuracy:* '+dmoves[m].accuracy+' (_'+c(dmoves[m].category)+'_)\n'
msg += '\n• You Can Sell *TM'+num+'* For *'+tmSellLp+' League Points*'
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg,{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Use',callback_data:'tmuse_'+num+'_'+ctx.from.id+''},{text:'Sell',callback_data:'tmselly_'+num+'_'+ctx.from.id+''}]]}})
}else{
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Don\'t Have *TM'+num+'*',{reply_to_message_id:ctx.message.message_id})
}
}
}
await next();
})

async function editOverdueMessages() {
    const messageData = await loadMessageData();
 for(const id in messageData.moves){
   if(!id || id === 'undefined' || !messageData.moves[id] || !messageData.moves[id].chat){
     delete messageData.moves[id]
   }
 }
 await saveMessageData(messageData)
for(const id in messageData.tutor){
const time = messageData.tutor[id].tdy
const queryTime = new Date(time)
const options = {
timeZone: 'Asia/Kolkata',
month: 'numeric',
day: 'numeric',
hour: 'numeric',
minute: 'numeric',
  hour12: true,
};
const currentTime = new Date().toLocaleString('en-US', options)
const timeDifference = new Date(currentTime) - queryTime;
if(timeDifference > 900000){
try{
  if(!id || id === 'undefined' || !messageData.tutor[id] || !messageData.tutor[id].chat){
    delete messageData.tutor[id]
  }else{
    await bot.telegram.editMessageText(messageData.tutor[id].chat,id, null,'Unfortunately, Timeout For *15 Min* Has Over & *Move Tutor* has gone, you *Missed* opportunity to teach your pokemon *'+c(messageData.tutor[id].mv)+'*',{parse_mode:'markdown'})
  }
}catch(error){
  const d = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : ''
  if(!d.includes('message to edit not found')){
    console.error('Error editing message:', error)
  }
}
delete messageData.tutor[id]
await saveMessageData(messageData)
}
}

    Object.entries(messageData)
        .filter(([chatId, userMessageData]) =>
            (userMessageData.times && Date.now() - userMessageData.times > 90000) ||
            (userMessageData.timestamp && Date.now() - userMessageData.timestamp > 60000)
        )
        .map(async ([chatId, userMessageData]) => {
        try {
            if (userMessageData.times) {
                const { turn, oppo } = userMessageData;
            const d1 = await getUserData(turn);
            const d2 = await getUserData(oppo);
            const d1Name = d1 && d1.inv && d1.inv.name ? d1.inv.name : String(turn);
            const d2Name = d2 && d2.inv && d2.inv.name ? d2.inv.name : String(oppo);

                const elapsedTime = Date.now() - userMessageData.times;

                if (elapsedTime > 130000) {
              let newMessage = `<a href="tg://user?id=${turn}"><b>${d1Name}</b></a> has not moved and losses <b>25</b> PokeCoins ðŸ’·.`;
              newMessage += `\n<a href="tg://user?id=${oppo}"><b>${d2Name}</b></a> <b>+25</b> PokeCoins ðŸ’·.`;

              if (d1 && d1.inv && typeof d1.inv.pc === 'number' && d1.inv.pc > 25) {
                d1.inv.pc -= 25;
                    }

              if (d2 && d2.inv) {
                if (typeof d2.inv.pc !== 'number') d2.inv.pc = 0;
                d2.inv.pc += 25;
              }

              if (d1 && d1.inv) {
                await saveUserData2(turn, d1);
              }
              if (d2 && d2.inv) {
                await saveUserData2(oppo, d2);
              }
                    messageData.battle = messageData.battle.filter((chats) => chats !== parseInt(turn) && chats !== parseInt(oppo));
                    delete messageData[chatId];
await saveMessageData(messageData);
                    try {
                      await bot.telegram.editMessageText(userMessageData.chat, userMessageData.mid, null, newMessage, {
                        parse_mode: 'HTML'
                      })
                    } catch (error) {
                      const d = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : ''
                      if (!d.includes('chat not found') && !d.includes('message to edit not found')) {
                        console.error('Error editing overdue battle message:', error)
                      }
                    }
                }
            } else if (userMessageData.timestamp) {
                const elapsedTime = Date.now() - userMessageData.timestamp;
const dr = await getUserData(chatId)
              const isHunting = !!(dr && dr.extra && dr.extra.hunting);
              if (elapsedTime > 60000 || !isHunting) {
                    const newMessage = '*Timeover.*';
                    messageData.battle = messageData.battle.filter((chats) => chats !== userMessageData.id);
                    delete messageData[chatId];
                await saveMessageData(messageData);
                try {
                  await bot.telegram.editMessageText(chatId, userMessageData.mid, null, newMessage, {
                    parse_mode: 'markdown'
                  })
                } catch (error) {
                  const d = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : ''
                  if (!d.includes('chat not found') && !d.includes('message to edit not found')) {
                    console.error('Error editing overdue hunt message:', error)
                  }
                }
}
            }
          } catch (error) {
            console.error('Error while processing overdue message cleanup entry:', error)
          }
        });

}

schedule.scheduleJob('*/2 * * * * *', editOverdueMessages);

const dataFolderPath = './data/db/'; // Replace with the path to your data folder


function getRetryAfterSeconds(error) {
  const retryAfter = error && error.response && error.response.parameters && error.response.parameters.retry_after;
  if (typeof retryAfter === 'number' && retryAfter > 0) {
    return retryAfter;
  }
  const desc = (error && error.response && error.response.description) ? String(error.response.description) : '';
  const match = desc.match(/retry after (\d+)/i);
  if (match) {
    const value = parseInt(match[1], 10);
    if (!isNaN(value) && value > 0) return value;
  }
  return 0;
}

async function forwardMessageToAllUsers(ctx, msgid,id) {
  const userIds = getUserIdsFromDataFolder();
  if (!userIds.length) {
    await sendMessage(ctx,ctx.chat.id,'No users found for broadcast.');
    return;
  }

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    try {
      const idleMs = Date.now() - lastInteractionAt;
      if (idleMs < 1200) {
        await sleep(1200 - idleMs);
      }
      if (i > 0 && i % 20 === 0) {
        await new Promise((resolve) => setImmediate(resolve));
      }
//const msg = await sendMessage(ctx,userId, message,{parse_mode:'markdown'});
//await ctx.telegram.pinChatMessage(userId,msg.message_id);
 await bot.telegram.forwardMessage(userId,id,msgid)
      successCount++;
    } catch (error) {
      const retryAfter = getRetryAfterSeconds(error);
      if (retryAfter > 0) {
        await sleep((retryAfter + 1) * 1000);
        i--;
        continue;
      }
      const d = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : ''
      if(d.includes('chat not found') || d.includes('blocked by the user')){
        try{
          const p = path.join(dataFolderPath, `${userId}.json`)
          if(fs.existsSync(p)){
            fs.unlinkSync(p)
          }
        }catch(e){}
      }
      console.error(`Failed to forward message to user ${userId}: ${error.message}`);
      failureCount++;
    }

    // To avoid rate limiting, wait for 1 second before forwarding to the next user
    await sleep(400);
  }

  // Send a summary message
  const summaryMessage = `Total Users ${userIds.length}\nMessage forwarded to ${successCount} users.\n Failed to forward to ${failureCount} users.`;
  await sendMessage(ctx,ctx.chat.id,summaryMessage);
}

function getUserIdsFromDataFolder() {
  const userIds = [];
  if (!fs.existsSync(dataFolderPath)) {
    return userIds;
  }
  const files = fs.readdirSync(dataFolderPath);

  for (const file of files) {
    const userId = parseInt(path.parse(file).name, 10);
    if (!isNaN(userId)) {
      userIds.push(userId);
    }
  }

  return userIds;
}

async function checkseen(ctx,name){
const data56 = await getUserData(ctx.from.id)
if(!data56.pokeseen){
data56.pokeseen = []
}
if(!data56.pokeseen.includes(name)){
data56.pokeseen.push(name)
await saveUserData2(ctx.from.id,data56)
}
return
}
function formatDetails(details) {
const regions2 = {
  'Kanto': ['kanto', 'letsgo-kanto'],
  'johto':['johto'],
  'hoenn':['hoenn'],
'hisui': ['hisui'],
  'sinnoh':['sinnoh'],
  'unova':['unova'],
  'kalos':['kalos-central','kalos-mountain','kalos-coastal'],
  'alola':['alola','poni','melemele','akala','ulaula'],
  'Galar': ['galar','isle-of-armor', 'crown-tundra'],
  'paldea':['paldea','kitakami','blueberry'],
  'conquest-gallery':['conquest-gallery']
};
  const formattedDetails = [];
  for (const region in regions2) {
    const places = regions2[region];
    const regionDetails = places.map(place => {
      const detail = details.find(d => d.toLowerCase() === place);
      return detail ? detail.replace(/[-_]/g, ' ') : '';
    }).filter(Boolean);
    if (regionDetails.length > 0) {
      formattedDetails.push(`• <b>${c(region)}</b> - [${c(regionDetails.join(' , '))}]`);
    }
  }
  return formattedDetails.join('\n');
}


function saveBanList() {
    fs.writeFileSync(banListFile2, JSON.stringify(banList2, null, 2), 'utf-8');
}


async function editMessage(per,ctx, chatId, id, msg, parameters2) {
    let options = {};
try{
    if (typeof parameters2 === 'object') {
        options = { ...options, ...parameters2 };
    }
lastClicked2[ctx.from.id] = Date.now();
globalClicks = [...globalClicks, Date.now()];

if (chatId && ctx.chat && ctx.chat.type != 'private') {
  lastClicked[ctx.chat.id] = [...(lastClicked[ctx.chat.id] || []), Date.now()];
}
if(per=='markup'){
var m = await ctx.telegram.editMessageReplyMarkup(chatId,id,null,msg)
}else if(per=='media'){
var m = await bot.telegram.editMessageMedia(chatId,id,null,msg,options)
}else if(per=='text'){
var m = await bot.telegram.editMessageText(chatId,id,null,msg,options)
}else if(per=='caption'){
var m = await bot.telegram.editMessageCaption(chatId,id,null,msg,options)
}
return m.message_id
  }catch(error){
  const d = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : ''
  if(d.includes('message is not modified')){
  return null
  }
  if(d.includes('canceled by new editmessagemedia request')){
  return null
  }
  if(d.includes('message to edit not found')){
  return null
  }
  if(per=='caption' && d.includes('there is no caption in the message to edit')){
    try{
      var m2 = await bot.telegram.editMessageText(chatId,id,null,msg,options)
      return m2.message_id
    }catch(e2){
      return null
    }
  }
  console.error('Error sending message:', error)
  return null
  }
}
async function sendMessage(ctx, chatId, parameters1, msg, parameters2) {
    let options = {};
try{
    // Check if parameters1 is an object (contains options)
    if (typeof parameters1 === 'object') {
        options = { ...parameters1 };
    } else {
        // If parameters1 is not an object, it's the message content
        if(msg){
          parameters2 = msg
        }
        msg = parameters1;
    }

    // Merge parameters2 into options
    if (typeof parameters2 === 'object') {
        options = { ...options, ...parameters2 };
    }

lastClicked2[ctx.from.id] = Date.now();
globalmsg = [...globalmsg, Date.now()];

if (chatId && ctx.chat && ctx.chat.type != 'private') {
  lastmsg[ctx.chat.id] = [...(lastmsg[ctx.chat.id] || []), Date.now()];
}
if(options.source){
var m = await bot.telegram.sendPhoto(chatId,parameters1,msg)
}else if(options.caption){
var m = await bot.telegram.sendPhoto(chatId,msg,options)
}else{
var m = await bot.telegram.sendMessage(chatId, msg, options)
}
return m.message_id
}catch(error){
const d = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : ''
if(d.includes('chat not found')){
  return null
}
if(d.includes('message to be replied not found') && options && options.reply_to_message_id){
  try{
    const retryOptions = { ...options }
    delete retryOptions.reply_to_message_id
    let m2
    if(retryOptions.source){
      m2 = await bot.telegram.sendPhoto(chatId,parameters1,msg)
    }else if(retryOptions.caption){
      m2 = await bot.telegram.sendPhoto(chatId,msg,retryOptions)
    }else{
      m2 = await bot.telegram.sendMessage(chatId, msg, retryOptions)
    }
    return m2.message_id
  }catch(error2){
    console.error('Error sending message:', error2)
    return null
  }
}
console.error('Error sending message:', error)
return null
}
}
bot.launch();


