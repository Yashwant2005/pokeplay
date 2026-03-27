const { MAX_TRAINER_LEVEL, getTrainerLevel, claimTrainerRankRewards, formatTrainerProgress } = require('../../utils/trainer_rank_rewards');

function getCurrentLevel(data) {
  return getTrainerLevel(data, trainerlevel, MAX_TRAINER_LEVEL);
}

function registerRankupCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, trainerlevel, tms, stones, c, admins } = deps;
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
    if (currentLevel >= MAX_TRAINER_LEVEL) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Trainer is already at max level (' + MAX_TRAINER_LEVEL + ').*');
      return;
    }

    const targetLevel = Math.min(MAX_TRAINER_LEVEL, currentLevel + amount);
    const reqExp = Number(trainerlevel[targetLevel]);

    if (Number.isFinite(reqExp)) {
      data.inv.exp = Math.max(data.inv.exp, reqExp);
    } else {
      // Fallback for undefined level rows in levels table.
      data.inv.exp += (targetLevel - currentLevel) * 10000;
    }

    data.extra.rankLevel = Math.max(Number(data.extra.rankLevel) || 1, targetLevel);

    // Keep claimedLevel at or below old level so new /rankup levels always claim rewards.
    if (!data.extra.rankRewards || typeof data.extra.rankRewards !== 'object') {
      data.extra.rankRewards = { claimedLevel: 0, lastClaimAtUtc: null };
    }
    if (!Number.isFinite(data.extra.rankRewards.claimedLevel)) {
      data.extra.rankRewards.claimedLevel = 0;
    }
    data.extra.rankRewards.claimedLevel = Math.min(data.extra.rankRewards.claimedLevel, currentLevel);

    const summary = claimTrainerRankRewards(data, { trainerlevel, tms, stones });
    await saveUserData2(targetId, data);

    const newLevel = getCurrentLevel(data);
    let msg = 'Ranked up *' + c(reply.from.first_name) + '* from *' + currentLevel + '* to *' + newLevel + '*.';
    if (summary && summary.levelsToClaim > 0) {
      msg += '\n\n*Rankup Rewards Applied:*';
      if (summary.rewards.pc > 0) msg += '\n- ' + summary.rewards.pc + ' PokeCoins 💷';
      if (summary.rewards.lp > 0) msg += '\n- ' + summary.rewards.lp + ' League Points ⭐';
      if (summary.rewards.ht > 0) msg += '\n- ' + summary.rewards.ht + ' Holowear Tickets 🎟️';
      if (summary.rewards.battleBoxes > 0) msg += '\n- ' + summary.rewards.battleBoxes + ' Battle Box 🎁';
    } else {
      msg += '\n\nNo new rank rewards were claimable.';
    }
    msg += '\n\n' + formatTrainerProgress(data, trainerlevel, MAX_TRAINER_LEVEL);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg);
  });
}

module.exports = registerRankupCommand;
