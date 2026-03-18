function registerTrainerRankRewardCallbacks(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.action(/trrank_claim_/, check2q, async (ctx) => {
    await ctx.answerCbQuery('Rank rewards are auto-claimed on level up.');
  });
}

module.exports = registerTrainerRankRewardCallbacks;
