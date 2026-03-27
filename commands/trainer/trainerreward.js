const {
  MAX_TRAINER_LEVEL,
  getUnclaimedLevels,
  claimTrainerRankRewards,
  formatTrainerProgress
} = require('../../utils/trainer_rank_rewards');

function registerTrainerRewardCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage, trainerlevel, tms, stones } = deps;
  bot.command('trainerreward', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey first.*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    const unclaimed = getUnclaimedLevels(data, trainerlevel, MAX_TRAINER_LEVEL);
    if (unclaimed <= 0) {
      let msg = '*Trainer Rewards*\n';
      msg += '\nNo unclaimed trainer rewards were found.';
      msg += '\n\n' + formatTrainerProgress(data, trainerlevel, MAX_TRAINER_LEVEL);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const summary = claimTrainerRankRewards(data, { trainerlevel, tms, stones });
    await saveUserData2(ctx.from.id, data);

    let msg = '*Trainer Rewards Claimed*\n';
    msg += `\n*Levels Claimed:* ${summary.levelsToClaim}`;
    if (summary.rewards.pc > 0) msg += `\n*PokeCoins:* +${summary.rewards.pc}`;
    if (summary.rewards.lp > 0) msg += `\n*League Points:* +${summary.rewards.lp}`;
    if (summary.rewards.ht > 0) msg += `\n*Holowear Tickets:* +${summary.rewards.ht}`;
    if (summary.rewards.battleBoxes > 0) msg += `\n*Battle Boxes:* +${summary.rewards.battleBoxes}`;
    msg += '\n\n' + formatTrainerProgress(data, trainerlevel, MAX_TRAINER_LEVEL);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message.message_id
    });
  });
}

module.exports = registerTrainerRewardCommand;
