function registerTrainerResetCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('treset', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const allUsers = await getAllUserData();
    if (!Array.isArray(allUsers) || allUsers.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No users found to reset.*');
      return;
    }

    let updated = 0;
    for (const entry of allUsers) {
      if (!entry || !entry.user_id || !entry.data) continue;
      const data = entry.data;
      if (!data.inv || typeof data.inv !== 'object') continue;

      if (!data.extra || typeof data.extra !== 'object') data.extra = {};
      if (!data.extra.rankRewards || typeof data.extra.rankRewards !== 'object') {
        data.extra.rankRewards = { claimedLevel: 0, lastClaimAtUtc: null };
      }

      data.inv.exp = 0;
      data.extra.rankLevel = 1;
      data.extra.rankRewards.claimedLevel = 0;
      data.extra.rankRewards.lastClaimAtUtc = null;

      await saveUserData2(entry.user_id, data);
      updated += 1;
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Trainer rank reset completed.*\nUsers reset: *' + updated + '*\nAll trainer ranks now start again from level 1.'
    );
  });
}

module.exports = registerTrainerResetCommand;
