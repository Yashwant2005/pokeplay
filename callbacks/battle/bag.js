function register_014_bag(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/bag_/,async ctx => {
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
const bword = ctx.callbackQuery.data.split('_')[1]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
const data = await getUserData(ctx.from.id)
if(!battleData || !battleData.c || !battleData.name){
  ctx.answerCbQuery('Battle expired. Start again.')
  return
}
if(data.extra.evhunt && data.extra.evhunt > 0){
ctx.answerCbQuery('Cant Catch Poke In Training Zone')
return
}
const p = data.pokes.filter((poke)=>poke.pass==battleData.c)[0]
if(!p){
  ctx.answerCbQuery('Battle desynced. Use /reset_battle.')
  return
}
const clevel = plevel(p.name,p.exp)
const balls = []
for(const ball in data.balls){
if(data.balls[ball] > 0){
balls.push(ball)
}
}
const base2 = pokestats[p.name]
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const buttons = balls.map((word) => ({ text: c(word), callback_data: 'ball_'+word+'_'+bword+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
const key = [{text:'⬅️ Back',callback_data:'btl_'+bword+''}]
rows.push(key)
const op = pokes[battleData.name]
const uname = he.encode(ctx.from.first_name)
let msg = '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
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
if(moves.length < 1){
  ctx.answerCbQuery('Your move data is missing. Use /reset_battle.')
  return
}
msg += '\n\n<i>Choose Which Ball To Use:</i>'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
})
}

module.exports = register_014_bag;


