function register_087_dlt(bot, deps) {
  
  bot.action(/dlt_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
if(ctx.from.id==id){
ctx.deleteMessage();
}
})
}

module.exports = register_087_dlt;

