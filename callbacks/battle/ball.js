function register_015_ball(bot, deps) {
  Object.assign(globalThis, deps, { bot });
    const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
    const { getBattleHeldItemName } = require('../../utils/battle_abilities');
    const revertPowerConstructFormsOnBattleEnd = (battleDataArg, userData) => {
      if (!battleDataArg || !battleDataArg.powerConstructOriginal || !userData || !Array.isArray(userData.pokes)) return
      for (const pass of Object.keys(battleDataArg.powerConstructOriginal)) {
        const poke = userData.pokes.find((entry) => String(entry.pass) === String(pass))
        if (poke) {
          poke.name = battleDataArg.powerConstructOriginal[pass]
        }
      }
    }
  bot.action(/ball_/,async ctx => {
const now = Date.now();
const chatKey = ctx.chat && ctx.chat.id;
const userId = ctx.from && ctx.from.id;
const userKey = 'u_' + String(userId);
const chatLimited = chatKey !== undefined && battlec[chatKey] && now - battlec[chatKey] < 2000;
const userLimited = userId !== undefined && battlec[userKey] && now - battlec[userKey] < 2000;
if (chatLimited || userLimited) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
if (chatKey !== undefined) battlec[chatKey] = now;
if (userId !== undefined) battlec[userKey] = now;
const ball = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You Thrown A '+c(ball)+' Ball')
const data = await getUserData(ctx.from.id)
data.balls[ball] -= 1
await saveUserData2(ctx.from.id,data)
await sleep(600)
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
if(!battleData || !battleData.c || !battleData.name){
  ctx.answerCbQuery('Battle expired. Start again.')
  return
}
const p = data.pokes.filter((poke)=>poke.pass==battleData.c)[0]
if(!p){
  ctx.answerCbQuery('Battle desynced. Use /reset_battle.')
  return
}
const uname = he.encode(ctx.from.first_name)
const clevel = plevel(p.name,p.exp)
const op = pokes[battleData.name]
const base2 = pokestats[p.name]
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
let msg = '<i>Your <b>'+c(ball)+'</b> Failed.</i>'
msg += '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
const p2 = pokes[p.name]
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+stats.hp+''
msg += '\n<code>'+Bar(stats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
msg += '\n\n<i>Choose Your Next Move:</i>'
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'atk_'+word+'_'+bword+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'bag_'+bword+''},{text:'Escape',callback_data:'run_'+bword+''},{text:'Pokemon',callback_data:'pokemon_'+bword+''}]
const isstone = [...new Set(data.inv.stones)].filter(stone => stones[stone]?.pokemon === p.name)
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows,key2
  };
let bonusBall = ballsdata[ball];
if(ball=='level'){
if(clevel <= battleData.level){
bonusBall = 2
}else if(clevel > battleData.level && clevel < battleData.level*2){
bonusBall = 4
}else if(clevel > battleData.level*2 && clevel<battleData.level*4){
bonusBall = 8
}else if(clevel>battleData.level*4){
bonusBall = 16
}
}
if(ball=='net'){
if(op.types.includes('water') || op.types.includes('bug')){
bonusBall = 5.5
}
}
if(ball=='nest'){
if(battleData.level < 30){
bonusBall = ((52-battleData.level*1)/10)
}
}
if(ball == 'repeat'){
if(data.pokecaught.includes(battleData.name)){
bonusBall = 4.7
}
}
if(ball=='quick' && battleData.ochp == battleData.ohp){
bonusBall = 6
}
if(ball=='beast' && spawn[battleData.name].toLowerCase()== 'mythical'){
bonusBall = 7
}

const catchRate = catch_rates[battleData.name]
  const a = Math.floor(((3 * battleData.ohp - 2 * battleData.ochp) * catchRate * bonusBall) / (3 * battleData.ohp))

  for (let i = 0; i < 3; i++) {
    const shakeProbability = Math.floor((65536 / Math.pow((255 / a), 0.25)));
    if (Math.random() * 65536 > shakeProbability) {
if(Math.random()< 0.4){
if(Math.random()< 0.00003){
const idr = ctx.from.id
const dr = await getUserData(idr)
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
const my = String(tutors[Math.floor(Math.random()*tutors.length)])
const m77 = await sendMessage(ctx,idr,'As you were <b>Capturing</b> a <b>Pokemon</b>, an adept <b>Move Tutor</b> noticed your deliberate efforts in <b>Catching Pokemon</b>. He approaches you with a <b>Move Tutor</b> called "<b>'+c(dmoves[my].name)+'</b>." This move will only be accessible for the next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
const mdata = await loadMessageData();
if(!mdata.tutor){
mdata.tutor = {}
}
mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
await saveMessageData(mdata)
}
data.extra.hunting = false
revertPowerConstructFormsOnBattleEnd(battleData, data)
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Your *'+c(ball)+'* Failed And wild *'+c(battleData.name)+'* Has fled.',{parse_mode:'markdown'})
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
messageData.battle = messageData.battle.filter((chats)=> chats!== ctx.from.id)
delete messageData[ctx.from.id];
await saveMessageData(messageData)
}
return
}
const messageData = await loadMessageData();
    messageData[ctx.chat.id] = { mid: ctx.callbackQuery.message.message_id, timestamp: Date.now(),id:ctx.from.id };
    await saveMessageData(messageData);
if(ball=='safari'){
if(data.balls.safari && data.balls.safari > 0){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<i>Your Safari Ball Failed.</i>\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+'] - <b>Level :</b> '+battleData.level+'\n\n<b>Safari Balls:</b> '+data.balls.safari+'',{
parse_mode:'HTML',
reply_markup:{
inline_keyboard:[[{text:'Use Safari Ball',callback_data:'ball_safari_'+bword+''},
{text:'Escape',callback_data:'run_'+bword+''}]]}})
return
}else{
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*You are out of safari balls*',{parse_mode:'markdown'})
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
messageData.battle = messageData.battle.filter((chats)=> chats!== ctx.from.id)
delete messageData[ctx.from.id];
await saveMessageData(messageData)
}
return
}
return
}
      await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard})
await sleep(800)
      return;
    }
if(i==0){
var a2 = '★'
}else if(i==1){
var a2 = '★ ★'
}else if(i==2){
var a2 = '★ ★ ★'
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,a2)
await sleep(800)
  }
 let m = ''
 const g = growth_rates[battleData.name]
 const de = pokes[battleData.name]
 if(!g || !chart[g.growth_rate] || !de){
   data.extra.hunting = false
   revertPowerConstructFormsOnBattleEnd(battleData, data)
   await saveUserData2(ctx.from.id,data)
   try{
     await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Missing pokemon data. Please /hunt again.',{parse_mode:'markdown'})
   }catch(e){}
   const messageData = await loadMessageData();
   if(messageData[ctx.from.id]) {
     messageData.battle = messageData.battle.filter((chats)=> chats!== ctx.from.id)
     delete messageData[ctx.from.id];
     await saveMessageData(messageData)
   }
   return
 }
 const exp = chart[g.growth_rate][String(battleData.level)]
const nyio = battleData.name
if(battleData.org == 'yes' && Math.random()< 0.98){
const maxlv = plevel(battleData.name,exp)
battleData.name = (Math.random() < 0.7) ? 'ditto' : 'mew'
if(battleData.symbol == '✨'){
battleData.symbol = (Math.random() < 0.85) ? '' : '✨'
}
m = '*OH Shit!* That wasn\'t *'+(nyio)+'* that was *'+c(battleData.name)+'* who was in the form of *'+(nyio)+'*'
const g = growth_rates[battleData.name]
const exp5 = chart[g.growth_rate][String(maxlv)]
battleData.exp = exp5
const moves5 = pokemoves[battleData.name]
const moves2 = moves5.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at < maxlv && dmoves[move.id].power && dmoves[move.id].accuracy)
const am = Math.min(Math.max(moves2.length,1),4)
const omoves = moves2.slice(-am)
battleData.omoves = omoves
}
const ms = []
for(const m of battleData.omoves){
ms.push(m.id)
}
const pass2 = word(8)
const caughtIvs = applyCaptureIvRules(battleData.ivs, {
  isSafari: ball === 'safari',
  symbol: battleData.symbol
})
const caughtHeldItem = getBattleHeldItemName({
  battleData,
  pass: battleData.opass,
  heldItem: battleData.oheld_item
})
if(!data.extra || typeof data.extra !== 'object') data.extra = {}
data.extra.ivEventLastCaught = {
  name: battleData.name,
  ivs: { ...caughtIvs },
  atUtc: new Date().toISOString()
}
data.pokes.push({
name:battleData.name,
nature:battleData.nat,
  ability:getRandomAbilityForPokemon(battleData.name, pokes),
held_item:caughtHeldItem,
ivs:caughtIvs,
evs:battleData.evs,
moves:ms,
exp:exp,
id:de.pokedex_number,
pass:pass2,
cpass:battleData.cpass,
  symbol:battleData.symbol
})
// Auto-add to main team if there is space
if(!data.teams){
  data.teams = {}
}
const teamId = data.inv && data.inv.team ? data.inv.team : "1"
if(!data.teams[teamId]){
  data.teams[teamId] = []
}
const validPasses = new Set((data.pokes || []).map(p => p.pass))
data.teams[teamId] = data.teams[teamId].filter(p => validPasses.has(p))
if(data.teams[teamId].length < 6 && !data.teams[teamId].includes(pass2)){
  data.teams[teamId].push(pass2)
}
if(!data.pokecaught){
data.pokecaught = []
}
if(!data.pokecaught.includes(battleData.name)){
data.pokecaught.push(battleData.name)
}
revertPowerConstructFormsOnBattleEnd(battleData, data)
await saveUserData2(ctx.from.id,data)
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
messageData.battle = messageData.battle.filter((chats)=> chats !== ctx.from.id)
delete messageData[ctx.from.id];
await saveMessageData(messageData) 
}
if(Math.random()< 0.00003){
const idr = ctx.from.id
const dr = await getUserData(idr)
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
const my = String(tutors[Math.floor(Math.random()*tutors.length)])
const m77 = await sendMessage(ctx,idr,'As you were <b>Capturing</b> a <b>Pokemon</b>, an adept <b>Move Tutor</b> noticed your deliberate efforts in <b>Catching Pokemon</b>. He approaches you with a <b>Move Tutor</b> called "<b>'+c(dmoves[my].name)+'</b>." This move will only be accessible for the next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
const mdata = await loadMessageData();
if(!mdata.tutor){
mdata.tutor = {}
}
mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
await saveMessageData(mdata)
}
data.extra.hunting = false
revertPowerConstructFormsOnBattleEnd(battleData, data)
await saveUserData2(ctx.from.id,data)
await sendMessage(ctx,-1003069884900,'#caught\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) caught <code>'+c(battleData.name)+'</code>',{parse_mode:'HTML'})
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,''+m+'\n\nSuccessfully Caught *'+c(battleData.name)+'*',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Check Stats',callback_data:'stats_'+pass2+'_'+ctx.from.id+'_0'}]]}})
})
}

module.exports = register_015_ball;


