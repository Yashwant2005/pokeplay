function register_003_delete(bot, deps) {
  const { bot } = deps;
  bot.action(/delete_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
if(ctx.from.id==id){
ctx.deleteMessage()
}
})
}

module.exports = register_003_delete;

