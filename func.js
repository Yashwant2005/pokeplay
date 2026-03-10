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
if(msgdata.battle.includes(ctx.from.id) || msgdata[ctx.from.id]){
ctx.replyWithMarkdown('You are in *Battle*',{reply_to_message_id:ctx.message.message_id})
return
}
await next();
}
async function check2q(ctx,next){
const msgdata = await loadMessageData();
if(msgdata.battle.includes(ctx.from.id) || msgdata[ctx.from.id]){
ctx.answerCbQuery('You are in Battle')
return
}
await next();
}



async function saveUserData2(userId, userData) {
  try {
    const filePath = './data/db/'+userId+'.json';
    let userDataEntry = [];
    if (fs.existsSync(filePath)) {
      const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(existingData)) {
        userDataEntry = existingData;
      } else {
        // If it's an object, convert to array
        userDataEntry = [existingData];
      }
    } else {
      userDataEntry = [{ user_id: userId, data: {}, reset: false }];
    }
    // Find or create the entry
    let entry = userDataEntry.find(e => e.user_id == userId);
    if (!entry) {
      entry = { user_id: userId, data: {}, reset: false };
      userDataEntry.push(entry);
    }
    entry.data = userData;
    fs.writeFileSync(filePath, JSON.stringify(userDataEntry, null, 2), 'utf8');
    console.log('Data saved successfully.');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}
const saveUserData22 = saveUserData2;
const FILE_PATH = './data/db.json';
async function getUserData(userId) {
  try {
    const filePath = './data/db/'+userId+'.json';
    if (!fs.existsSync(filePath)) {
      return {};
    }
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let dataArray = [];
    if (Array.isArray(existingData)) {
      dataArray = existingData;
    } else {
      // If it's an object, treat as single entry
      dataArray = [existingData];
    }
    const userDataEntry = dataArray.filter((data) => data.user_id == userId)[0];
    if (!userDataEntry) {
      console.error('User data not found');
      return {};
    }
    return userDataEntry.data;
  } catch (error) {
    console.error('Error getting data:', error);
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
const a = sentence.replace(/[-_]/g,' ')
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

console.log(currentLevel)
  return {
    currentLevel,
    nextLevel,
    nextExp
  };
}
function Stats(baseStats, ivs, evs, natureName, level) {
  const stats = {};

  // Nature modifiers for each stat
  const natureModifiers = {
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

  // Calculate HP
  stats.hp = Math.floor(((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;

  // Calculate other stats (Attack, Defense, Special Attack, Special Defense, Speed)
  const statNames = ['attack', 'defense', 'special_attack', 'special_defense', 'speed'];

  statNames.forEach((stat) => {
    // Apply nature modifiers
    const natureModifier = natureModifiers[natureName] && natureModifiers[natureName].increased === stat
      ? 1.1
      : natureModifiers[natureName] && natureModifiers[natureName].decreased === stat
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

    if (defenderType1 in typeChart[attackerType]) {
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
    try {
        const data = fs.readFileSync('data/msg_data.json', 'utf8');
        return JSON.parse(data) || {};
    } catch (err) {
        console.error('Error loading message data:', err.message);
        return {};
    }
}

function saveMessageData(data) {
    fs.writeFileSync('data/msg_data.json', JSON.stringify(data,null,2), 'utf8');
}
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
if(!data.extra || !data.extra.display || data.extra.display=='none'){
msg += '\n*' + (i + 1 + str*1) + '.* ' + c(p.nickname || p.name) + ' '+p.symbol+''
}else if(data.extra.display=='level'){
    msg += '\n*' + (i + 1 + str*1) + '.* ' + c(p.nickname || p.name) + ' (*Lv.* ' + currentLevel + ') '+p.symbol+'';
}else if(data.extra.display=='iv-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+calculateTotal(p.ivs)+' *IVs* '+p.symbol+''
}else if(data.extra.display=='ev-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+calculateTotal(p.evs)+' *EVs* '+p.symbol+''
}else if(data.extra.display=='nature'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - *'+c(p.nature)+'* '+p.symbol+''
}else if(data.extra.display=='type'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - \['+c(pokes[p.name].types.join(', '))+'\] '+p.symbol+''
}else if(data.extra.display=='type-symbol'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - ' + sym.join(', ') + ' ' + p.symbol;
}else if(data.extra.display=='category'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+cat+' '+p.symbol+''
}else if(data.extra.display=='hp-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.hp+' *HP* '+p.symbol+''
}else if(data.extra.display=='attack-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.attack+' *Atk* '+p.symbol+''
}else if(data.extra.display=='defense-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.defense+' *Def* '+p.symbol+''
}else if(data.extra.display=='special-attack-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.special_attack+' *SpA* '+p.symbol+''
}else if(data.extra.display=='special-defense-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.special_defense+' *SpD* '+p.symbol+''
}else if(data.extra.display=='speed-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+stats.speed+' *Spe* '+p.symbol+''
}else if(data.extra.display=='total-points'){
msg += '\n*'+(i+1+str*1)+'.* '+c(p.nickname || p.name)+' - '+calculateTotal(stats)+' *Stats* '+p.symbol+''
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
    const dataFolderPath = './data/db/';
    const fileNames = fs.readdirSync(dataFolderPath);

    const userData = fileNames.map((fileName) => {
      const filePath = path.join(dataFolderPath, fileName);
      try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return fileData;
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null; // or handle the error in a way that fits your needs
      }
    });

    return userData.filter((data) => data !== null).flat();
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return [];
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

  return ivs;
}

module.exports = { chooseRandomNumbers, getLevel, stat, calculateTotalEV, calculateTotal,getRandomNature, getUserData, saveUserData2, saveUserData22, check, c, Stats, word, Bar, plevel, calc, calcexp, sleep, eff, findEvolutionLevel,saveMessageData,loadMessageData,pokelist,pokelisthtml,incexp,incexp2,check2,check2q,getAllUserData,getTopUsers,sort,generateRandomIVs}

