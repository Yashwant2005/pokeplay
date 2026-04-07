function registerConvertCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage } = deps;

  bot.command('convert', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data || !data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey first.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (!Number.isFinite(data.inv.vp)) {
      data.inv.vp = 0;
      await saveUserData2(ctx.from.id, data);
    }

    const msg =
      '*Victory Points*\n\n' +
      'PokeCoins have been *discontinued*.\n' +
      'Any legacy PC balance is now handled automatically as *VP*.\n\n' +
      '*Current VP:* ' + data.inv.vp;

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message.message_id
    });
  });
}

module.exports = registerConvertCommand;

