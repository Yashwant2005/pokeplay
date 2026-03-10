function register_020_locked(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action('locked',async ctx => {
ctx.answerCbQuery();
})
}

module.exports = register_020_locked;

