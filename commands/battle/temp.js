function registerTempCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('temp', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (!args[0] || args[0].toLowerCase() !== 'clear') {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Usage:* /temp clear',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Start your journey now*',
        {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: {
            inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]]
          }
        }
      );
      return;
    }

    const mdata = await loadMessageData();
    if (mdata && mdata.battle && mdata.battle.includes(ctx.from.id)) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'You are in a *battle*. Finish it first before clearing temp pokemons.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (!data.extra) data.extra = {};
    const temp = data.extra.temp_battle || {};
    const tempPasses = Object.values(temp).flat().filter(Boolean);
    if (tempPasses.length < 1) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'No *temp pokemons* found to clear.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (!data.pokes) data.pokes = [];
    const before = data.pokes.length;
    data.pokes = data.pokes.filter(p => !tempPasses.includes(p.pass));
    data.extra.temp_battle = {};

    await saveUserData2(ctx.from.id, data);

    const removed = Math.max(0, before - data.pokes.length);
    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      `Cleared *${removed}* temp pokemon(s).`,
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerTempCommand;
