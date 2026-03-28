function registerClearAllCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage } = deps;

  bot.command('clearall', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data || typeof data !== 'object') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'User data not found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!Array.isArray(data.pokes)) data.pokes = [];

    const tempPasses = data.extra.temp_battle
      ? Object.values(data.extra.temp_battle).flat().map((p) => String(p))
      : [];
    const rbPasses = Array.isArray(data.extra.randombattle_pokes)
      ? data.extra.randombattle_pokes.map((p) => String(p))
      : [];
    const allPasses = new Set([...tempPasses, ...rbPasses]);

    if (allPasses.size > 0) {
      data.pokes = data.pokes.filter((p) => !allPasses.has(String(p.pass)));
    }

    data.extra.temp_battle = {};
    data.extra.randombattle_pokes = [];

    await saveUserData2(ctx.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Cleared all random-battle pokes from your data.*', { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerClearAllCommand;
