const {
  MAX_TRAINER_LEVEL,
  getTrainerLevel,
  claimTrainerRankRewards,
  formatTrainerProgress
} = require('../../utils/trainer_rank_rewards');

function registerAddExpCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, trainerlevel, tms, stones, c, admins } = deps;
  bot.command('addexp', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const reply = ctx.message.reply_to_message;
    if (!reply || !reply.from || !reply.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Reply to a user and use:*\n/addexp <amount>');
      return;
    }

    const amount = Math.max(0, Math.floor(Number(String(ctx.message.text || '').split(' ')[1]) || 0));
    if (!amount) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n/addexp <amount>');
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

    const oldLevel = getTrainerLevel(data, trainerlevel, MAX_TRAINER_LEVEL);
    data.inv.exp += amount;
    const newLevel = getTrainerLevel(data, trainerlevel, MAX_TRAINER_LEVEL);
    if (newLevel > oldLevel) {
      data.extra.rankLevel = Math.max(Number(data.extra.rankLevel) || 1, newLevel);
    }

    const rewardSummary = newLevel > oldLevel
      ? claimTrainerRankRewards(data, { trainerlevel, tms, stones })
      : null;

    await saveUserData2(targetId, data);

    let msg = 'Added *' + amount + '* trainer EXP to *' + c(reply.from.first_name || String(targetId)) + '*.';
    msg += '\n*Level:* ' + oldLevel + ' -> ' + newLevel;
    if (rewardSummary && rewardSummary.levelsToClaim > 0) {
      msg += '\n\n*Auto-claimed Rewards:*';
      if (rewardSummary.rewards.vp > 0) msg += '\n- ' + rewardSummary.rewards.vp + ' Victory Points';
      if (rewardSummary.rewards.lp > 0) msg += '\n- ' + rewardSummary.rewards.lp + ' League Points';
      if (rewardSummary.rewards.ht > 0) msg += '\n- ' + rewardSummary.rewards.ht + ' Holowear Tickets';
      if (rewardSummary.rewards.battleBoxes > 0) msg += '\n- ' + rewardSummary.rewards.battleBoxes + ' Battle Box';
      if (rewardSummary.rewards.tms > 0) msg += '\n- ' + rewardSummary.rewards.tms + ' TMs';
      if (rewardSummary.rewards.stones > 0) msg += '\n- ' + rewardSummary.rewards.stones + ' Mega Stones';
    }
    msg += '\n\n' + formatTrainerProgress(data, trainerlevel, MAX_TRAINER_LEVEL);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg);
  });
}

module.exports = registerAddExpCommand;
