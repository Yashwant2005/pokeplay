function register_011_catch(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/catch_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const name = ctx.callbackQuery.data.split('_')[1]
const data56 = await getUserData(ctx.from.id)
await checkseen(ctx,name)
if(!ctx.session.name || ctx.session.name!=ctx.callbackQuery.message.message_id){
ctx.answerCbQuery(''+c(name)+' Has been fled')
return
}
const mdata = await loadMessageData();
if(mdata.battle.includes(ctx.from.id)){
ctx.answerCbQuery('You Are In A Battle')
return
}

const level = ctx.callbackQuery.data.split('_')[2]*1
const f = ctx.callbackQuery.data.split('_')[3]
const org = ctx.callbackQuery.data.split('_')[4]
let msg = '<b>✦ The Pokomon battle commences!</b>'
const op = pokes[name]
const data = await getUserData(ctx.from.id)
if(data.teams[data.inv.team].length < 1){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},' Add Some *Pokes* In Main Team.')
return
}
const ss = data.teams[data.inv.team][0]
const p = data.pokes.filter((poke)=>poke.pass==ss)[0]
const p2 = pokes[p.name]
k = 0
if(spawn[name].toLowerCase() == 'legendry' || spawn[name].toLowerCase()== 'legendary'){
k = 15
}
const iv = await generateRandomIVs(spawn[name].toLowerCase())

  const ev = {
"hp":0,
"attack":0,
"defense":0,
"special_attack":0,
"special_defense":0,
"speed":0
};
const nat = getRandomNature()
const base = pokestats[name]
const base2 = pokestats[p.name]
const uname = he.encode(ctx.from.first_name)
const stats2 = await Stats(base,iv,ev,c(nat),level)
const hp2 = stats2.hp
const clevel = plevel(p.name,p.exp)
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const hp = stats.hp
const moves5 = pokemoves[name]
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

msg += '\n\n<b>wild</b> '+c(name)+' ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+level+' | <b>HP :</b> '+hp2+'/'+hp2+''
msg += '\n<code>'+Bar(hp2,hp2)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+hp+'/'+hp+''
msg += '\n<code>'+Bar(hp,hp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
const bword = word(10)
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
for(const move2 of p.moves){
  const move = dmoves[move2]
  if(!move) continue
  msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
  moves.push(''+move2+'')
}
if(moves.length < 1){
  ctx.answerCbQuery('Your move data is missing. Use /reset_battle.')
  return
}
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'atk_'+word+'_'+bword+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'bag_'+bword+''},{text:'Escape',callback_data:'run_'+bword+''},{text:'Pokemon',callback_data:'pokemon_'+bword+''}]
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows,key2
  };
const cp = word(8)
battleData.c = p.pass
battleData.org = org
battleData.chp = hp
battleData.ochp = hp2
battleData.ohp = hp2
battleData.ivs = iv
battleData.evs = ev
battleData.nat = nat
battleData.cpass = cp
battleData.level = level
battleData.name = name
battleData.omoves = omoves
battleData.ded = []
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
battleData.symbol = ''
if(omoves.length < 1){
ctx.answerCbQuery('Unable To Catch This Poke, Admins Trying To Fix It. Till Please Hunt Another Pokemon',{show_alert:true})
return
}
if(f && f=='🪅'){
battleData.symbol = '🪅'
}
if(f && f=='✨'){
battleData.symbol = '✨'
}
var la = {}
var tem = {}
for(const p of data.teams[data.inv.team]){
const pk = data.pokes.filter((poke)=> poke.pass == p)
if(pk){
const base = pokestats[pk[0].name]
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la[pk[0].pass] = clevel
tem[pk[0].pass] = stats.hp
}
}
battleData.team = tem
battleData.la = la
await saveBattleData(bword, battleData);
ctx.session.name = ''
if(data.balls.safari && data.balls.safari > 0){
var mg = await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<b>wild</b> '+c(name)+' ['+c(op.types.join(' / '))+'] - <b>Level :</b> '+level+'\n\n<b>Safari Balls:</b> '+data.balls.safari+'',{
reply_markup:{
inline_keyboard:[[{text:'Use Safari Ball',callback_data:'ball_safari_'+bword+''},
{text:'Escape',callback_data:'run_'+bword+''}]]}})
}else{
var mg = await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},msg,{reply_markup:keyboard})
}
const messageData = await loadMessageData();
data.extra.hunting = true
await saveUserData2(ctx.from.id,data)
messageData.battle.push(ctx.from.id)
    messageData[ctx.chat.id] = { mid: mg, timestamp: Date.now(),id:ctx.from.id };
await saveMessageData(messageData);
})
}

module.exports = register_011_catch;


