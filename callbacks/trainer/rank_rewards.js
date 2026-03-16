const {
  getUnclaimedLevels,
  claimTrainerRankRewards,
  summarizeMints
} = require('../../utils/trainer_rank_rewards');

function buildClaimSummary(summary) {
  const lines = [];
  lines.push('*Trainer Rank Rewards Claimed*');
  lines.push('');
  lines.push('*Levels claimed:* ' + summary.levelsToClaim + ' (up to level ' + summary.currentLevel + ')');
  lines.push('');
  lines.push('*Guaranteed rewards:*');
  if (summary.guaranteed.pc > 0) lines.push('- ' + summary.guaranteed.pc + ' PokeCoins 💷');
  if (summary.guaranteed.lp > 0) lines.push('- ' + summary.guaranteed.lp + ' League Points');
  if (summary.guaranteed.ht > 0) lines.push('- ' + summary.guaranteed.ht + ' Holowear Tickets');

  const chanceLines = [];
  if (summary.bonus.pc || summary.bonus.lp || summary.bonus.ht) {
    chanceLines.push('- Bundle total: ' + summary.bonus.pc + ' PC, ' + summary.bonus.lp + ' LP, ' + summary.bonus.ht + ' HT');
  }
  if (summary.battleBoxes > 0) chanceLines.push('- Battle Boxes rolled: ' + summary.battleBoxes);
  if (summary.tmsAdded > 0) chanceLines.push('- TMs delivered: ' + summary.tmsAdded);
  if (summary.stonesAdded > 0) chanceLines.push('- Mega stones delivered: ' + summary.stonesAdded);
  if (summary.bottleCaps > 0) chanceLines.push('- Bottle Caps: ' + summary.bottleCaps);
  if (summary.goldBottleCaps > 0) chanceLines.push('- Gold Bottle Caps: ' + summary.goldBottleCaps);
  const mintSummary = summarizeMints(summary.mints);
  if (mintSummary !== 'None') chanceLines.push('- Nature Mints: ' + mintSummary);

  if (chanceLines.length > 0) {
    lines.push('');
    lines.push('*Chance rewards:*');
    lines.push(...chanceLines);
  }

  return lines.join('\n');
}

function registerTrainerRankRewardCallbacks(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.action(/trrank_claim_/, check2q, async (ctx) => {
    const id = Number(String(ctx.callbackQuery.data || '').split('_')[2]);
    if (ctx.from.id !== id) return;

    const data = await getUserData(ctx.from.id);
    if (!data || !data.inv) {
      await ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const pending = getUnclaimedLevels(data, trainerlevel);
    if (pending <= 0) {
      await ctx.answerCbQuery('No rank rewards to claim.');
      return;
    }

    const summary = claimTrainerRankRewards(data, { trainerlevel, tms, stones });
    await saveUserData2(ctx.from.id, data);

    await editMessage(
      'markup',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      { inline_keyboard: [[{ text: 'More Info', callback_data: 'cardmore' }]] }
    );

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, buildClaimSummary(summary));
    await ctx.answerCbQuery('Rank rewards claimed.');
  });
}

module.exports = registerTrainerRankRewardCallbacks;
