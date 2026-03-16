const { getTrainerLevel } = require('../../utils/trainer_rank_rewards');

function getCurrentLevel(data) {
  return getTrainerLevel(data, trainerlevel, 100);
}

function registerRankupCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('rankup', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const parts = String(ctx.message.text || '').trim().split(/\s+/);
    const requestedAmount = parts[1] ? parseInt(parts[1], 10) : 1;
    const amount = Number.isFinite(requestedAmount) ? Math.max(1, Math.min(100, requestedAmount)) : 1;

    const reply = ctx.message.reply_to_message;
    if (!reply || !reply.from || !reply.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Reply to a user and use /rankup <amount>.*');
      return;
    }

    const targetId = reply.from.id;
    const data = await getUserData(targetId);
    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Target user has not started yet.*');
      return;
    }

    if (!Number.isFinite(data.inv.exp)) data.inv.exp = 0;
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};

    const currentLevel = getCurrentLevel(data);
    if (currentLevel >= 100) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Trainer is already at max level (100).*');
      return;
    }

    const targetLevel = Math.min(100, currentLevel + amount);
    const reqExp = Number(trainerlevel[targetLevel]);

    if (Number.isFinite(reqExp)) {
      data.inv.exp = Math.max(data.inv.exp, reqExp);
    } else {
      // Fallback for undefined level rows in levels table.
      data.inv.exp += (targetLevel - currentLevel) * 10000;
    }

    data.extra.rankLevel = Math.max(Number(data.extra.rankLevel) || 1, targetLevel);

    await saveUserData2(targetId, data);

    const newLevel = getCurrentLevel(data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' },
      'Ranked up *' + c(reply.from.first_name) + '* from *' + currentLevel + '* to *' + newLevel + '*.'
    );
  });
}

module.exports = registerRankupCommand;
