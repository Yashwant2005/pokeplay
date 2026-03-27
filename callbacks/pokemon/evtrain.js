function register_083_evtrain(bot, deps) {
  const { editMessage, stat, word, c } = deps;
  bot.action('evtrain',async ctx => {
const bt = ['hp','attack','defense','special-attack','special-defense','speed']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'rvyr_'+word+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Select which stat *EV Training* you want.',{parse_mode:'markdown',reply_markup:{inline_keyboard:rows}})
})
}

module.exports = register_083_evtrain;

