function registerTrainerRankRewardCallbacks(bot, deps) {
  const { check2q } = deps;
  bot.action(/trrank_claim_/, check2q, async (ctx) => {
    await ctx.answerCbQuery('Rank rewards are auto-claimed on level up.');
  });
}

module.exports = registerTrainerRankRewardCallbacks;
