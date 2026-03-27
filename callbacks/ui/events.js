function registerEventsCallbacks(bot, deps) {
  const { editMessage } = deps;
  const {
    buildEventsListMessage,
    buildEventsListKeyboard,
    buildEventDetailMessage,
    buildEventDetailKeyboard
  } = require('../../utils/events_catalog.js');

  bot.action(/^evtbr_(detail|back)_/, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const action = parts[1];
    const id = Number(parts[parts.length - 1]);

    if (ctx.from.id !== id) {
      ctx.answerCbQuery();
      return;
    }

    if (action === 'detail') {
      const eventId = parts[2];
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildEventDetailMessage(eventId), {
        parse_mode: 'markdown',
        reply_markup: buildEventDetailKeyboard(id)
      });
      return;
    }

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildEventsListMessage(), {
      parse_mode: 'markdown',
      reply_markup: buildEventsListKeyboard(id)
    });
  });
}

module.exports = registerEventsCallbacks;