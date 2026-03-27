function register_073_nickname(bot, deps) {
  const { userState2, check2q, getUserData, sendMessage, pokes, c } = deps;
  bot.action(/nickname_/,check2q,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((p)=>p.pass===pass)[0]
if(id!=ctx.from.id){
ctx.answerCbQuery()
return
}
if(!poke){
ctx.answerCbQuery('Poke not found')
return
}
const p2 = poke
let uu = ''
if(p2.nickname){
uu = "Use '.' to remove current nickname."
}
ctx.deleteMessage();
const message = await sendMessage(ctx,ctx.chat.id,'Tell a new name for *'+c(p2.nickname || p2.name)+'*\n\n'+uu+'',{reply_markup:{force_reply:true},parse_mode:'markdown'})
const userData = {
      messageId: message,
      pass: p2.pass // You can set the name to whatever you like
    };
    userState2.set(ctx.from.id,userData)
})
}

module.exports = register_073_nickname;

