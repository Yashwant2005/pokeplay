function register_010_exrtbt(bot, deps) {
  const { session, getUserData, sendMessage, loadMessageData, loadMessageDataFresh, loadBattleData, saveBattleData, spawn, pokes, pokemoves, dmoves, word, getRandomNature, generateRandomIVs, c, he, rdata, region, pokestats, plevel, Stats, battlec, emojis, saveMessageData, Bar } = deps;
  bot.action(/exrtbt_/,async ctx => {
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
const name = ctx.callbackQuery.data.split('_')[1]
const currentMessageId = ctx.callbackQuery && ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null
const chatId = (ctx.chat && ctx.chat.id)
  || (ctx.callbackQuery && ctx.callbackQuery.message && ctx.callbackQuery.message.chat && ctx.callbackQuery.message.chat.id)
  || null
const sessionName = ctx.session ? ctx.session.name : null
if(String(sessionName) !== String(currentMessageId)){
  let mdataCheck = await loadMessageData()
  const entry = chatId !== null ? mdataCheck[chatId] : null
  let match = entry && String(entry.id) === String(ctx.from.id) && String(entry.mid) === String(currentMessageId)
  if(!match && typeof loadMessageDataFresh === 'function'){
    mdataCheck = await loadMessageDataFresh()
    const freshEntry = chatId !== null ? mdataCheck[chatId] : null
    match = freshEntry && String(freshEntry.id) === String(ctx.from.id) && String(freshEntry.mid) === String(currentMessageId)
  }
  if(!match){
    ctx.answerCbQuery(''+c(name)+' Has already gone.')
    return
  }
  ctx.session.name = currentMessageId
}
const mdata = await loadMessageData();
if(mdata.battle.some(id => String(id) === String(ctx.from.id))){
ctx.answerCbQuery('You Are In A Battle')
return
}

const level = ctx.callbackQuery.data.split('_')[2]*1
const f = ctx.callbackQuery.data.split('_')[3]
let msg = '<b>✦ The Pokomon battle commences!</b>'
const data = await getUserData(ctx.from.id)
if(data.teams[data.inv.team].length < 1){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},' Add Some *Pokes* In Main Team.')
return
}
const bword = word(10)
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
const ss = data.teams[data.inv.team][0]
const p = data.pokes.filter((poke)=>poke.pass==ss)[0]
const ut = {}
const p2 = pokes[p.name]
const base2 = pokestats[p.name]
const uname = he.encode(ctx.from.first_name)
const clevel = plevel(p.name,p.exp)
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const hp = stats.hp
battleData.ot = {}
battleData.omoves = {}
battleData.ivs = {}
battleData.evs = {}
battleData.nat = {}
battleData.level = {}
for(let i=0; i<6;i++){
const o = ['common','medium']
const yr = rdata[data.inv.region].filter((i)=> !Object.keys(ut).includes(i) && !o.includes(spawn[i]))
const nam = yr[Math.floor(Math.random()*yr.length)]
const iv = await generateRandomIVs(spawn[nam].toLowerCase())
  const ev = {
"hp":0,
"attack":0,
"defense":0,
"special_attack":0,
"special_defense":0,
"speed":0
};
const nat = getRandomNature()
const base = pokestats[nam]
const level = 100
const stats2 = await Stats(base,iv,ev,c(nat),level)
const hp2 = stats2.hp
const moves5 = pokemoves[nam]
let moves2 = []
if(moves5 && Array.isArray(moves5.moves_info)){
  moves2 = moves5.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at < level && dmoves[move.id] && dmoves[move.id].power && dmoves[move.id].accuracy)
}
if(moves2.length < 1){
  const fallback = Object.keys(dmoves || {})
    .map((id)=> Number(id))
    .filter((id)=> {
      const mv = dmoves[id]
      return mv && mv.category !== 'status' && Number(mv.power) > 0 && Number(mv.accuracy) > 0
    })
  const pick = []
  while(pick.length < 4 && fallback.length > 0){
    const idx = Math.floor(Math.random() * fallback.length)
    pick.push({ id: fallback.splice(idx,1)[0] })
  }
  moves2 = pick
}
const am = Math.min(Math.max(moves2.length,1),4)
const omoves = moves2.slice(-am)
battleData.ot[nam] = hp2
battleData.omoves[nam] = omoves
battleData.ivs[nam] = iv
battleData.evs[nam] = ev
battleData.nat[nam] = nat
battleData.level[nam] = level
}
const cy = Object.keys(battleData.ot)[Math.floor(Math.random()*Object.keys(battleData.ot).length)]
const op = pokes[cy]
battleData.o = cy
const hp2 = battleData.ot[cy]
battleData.ohp = hp2
battleData.name = name
msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+bot.botInfo.id+'"><b>'+battleData.name+'</b></a>'
msg += '\n<b>'+c(cy)+'</b> ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+level+' | <b>HP :</b> '+hp2+'/'+hp2+''
msg += '\n<code>'+Bar(hp2,hp2)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+hp+'/'+hp+''
msg += '\n<code>'+Bar(hp,hp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
if(moves.length < 1){
  ctx.answerCbQuery('Your move data is missing. Use /reset_battle.')
  return
}

const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'exrmv_'+word+'_'+bword+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'bag_'+bword+''},{text:'Escape',callback_data:'run_'+bword+''},{text:'Pokemon',callback_data:'exrtpk_'+bword+''}]
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows,key2
  };
battleData.c = p.pass
battleData.chp = hp
battleData.name = name
battleData.ded = []
battleData.symbol = ''
if(f && f=='🪅'){
battleData.symbol = '🪅'
}
if(f && f=='✨'){
battleData.symbol = '✨'
}
var la = {}
var tem = {}
const heldItems = {}
for(const p of data.teams[data.inv.team]){
const pk = data.pokes.filter((poke)=> poke.pass == p)
if(pk){
const base = pokestats[pk[0].name]
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la[pk[0].pass] = clevel
tem[pk[0].pass] = stats.hp
heldItems[pk[0].pass] = getSanitizedHeldItemForPokemon(pk[0], pk[0].held_item)
}
}
battleData.team = tem
battleData.la = la
battleData.heldItems = heldItems
await saveBattleData(bword, battleData);
ctx.session.name = ''
var mg = await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},msg,{reply_markup:keyboard})
const messageData = await loadMessageData();
const _exrtbtUserId = String(ctx.from.id);
if (!messageData.battle.map(String).includes(_exrtbtUserId)) {
  messageData.battle.push(_exrtbtUserId);
}
if (!messageData._battleTimestamps) messageData._battleTimestamps = {};
messageData._battleTimestamps[_exrtbtUserId] = Date.now();
    messageData[ctx.chat.id] = { mid: mg, timestamp: Date.now(),id:ctx.from.id };
await saveMessageData(messageData);
})
}

module.exports = register_010_exrtbt;



const { getSanitizedHeldItemForPokemon } = require('../../utils/pokemon_item_rules');
