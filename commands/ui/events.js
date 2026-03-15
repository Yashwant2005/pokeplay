function registerEventsCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const {
    buildEventsListMessage,
    buildEventsListKeyboard
  } = require('../../utils/events_catalog.js');

  bot.command('events', async (ctx) => {
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, buildEventsListMessage(), {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: buildEventsListKeyboard(ctx.from.id)
    });
  });
}

module.exports = registerEventsCommand;