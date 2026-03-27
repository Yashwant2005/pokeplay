function register_020_locked(bot, deps) {
  
  bot.action('locked',async ctx => {
ctx.answerCbQuery();
})
}

module.exports = register_020_locked;

