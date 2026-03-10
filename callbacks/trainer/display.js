function register_071_display(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/display_/,async ctx => {
const item = ctx.callbackQuery.data.split('_')[1]
const data = await getUserData(ctx.from.id)
if(!data.extra){
data.extra = {}
}
if(!data.extra.display){
data.extra.display='none'
}
if(data.extra.display==item){
ctx.answerCbQuery()
return
}
data.extra.display = item
await saveUserData2(ctx.from.id,data)
const items = ['none','level','nature','type','type-symbol','category','iv-points','ev-points','hp-points','attack-points','defense-points',
'special-attack-points','special-defense-points','speed-points','total-points']
const inlineKeyboard = [];
  let row = [];
let msg = '*Which Pokemom Detail You Wanna Display?*\n'
for (let i = 0; i < items.length; i++) {
msg += '\n*'+(i+1)+'.* '+c(items[i])+''
  row.push({
    text: `${i + 1}`,
    callback_data: `display_${items[i]}`,
  });

  if ((i+ 1) % 4 === 0 || i === items.length - 1) {
    inlineKeyboard.push(row);
    row = [];
  }
}
const dis = data.extra.display ? data.extra.display : 'None'
msg += '\n\n*Currently Displaying :* '+c(dis)+''
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{reply_markup:{inline_keyboard:inlineKeyboard},parse_mode:'markdown'})
})
}

module.exports = register_071_display;

