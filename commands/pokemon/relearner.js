function registerRelearnerCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  commands.set('relearner', async (ctx) => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    const nam3 = ctx.message.text.replace('/', '').replace(/ /g, '-');
    const nam2 = nam3.includes('@' + bot.botInfo.username) ? nam3.replace('@' + bot.botInfo.username, '') : nam3;

    if (ctx.chat.type !== 'private') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Use this command in *Private* to use *Relearner*.', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Relearner', url: 't.me/' + bot.botInfo.username + '?start=' + nam2 }]] }
      });
      return;
    }

    const mdata = await loadMessageData();
    if (mdata.battle.some(id => String(id) === String(ctx.from.id))) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are in a *battle*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Move Relearner* is *free* now.\nSelect a pokemon:',
      { reply_markup: { inline_keyboard: [[{ text: 'Open Relearner', callback_data: 'relearn_' + ctx.from.id + '_1' }]] }, reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerRelearnerCommand;
