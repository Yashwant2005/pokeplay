function register_089_cardmore(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action('cardmore', async ctx => {
    try {
      const data = await getUserData(ctx.from.id)
      if(!data.inv){
        ctx.answerCbQuery('Start your journey')
        return
      }
      const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);
      const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : 1;
      const caught = data.pokecaught ? data.pokecaught.length : 0
      const seen = data.pokeseen ? data.pokeseen.length : 0
      const wins = data.inv.win || 0
      const loses = data.inv.lose || 0
      const battles = data.inv.battle || 0
      const pc = data.inv.pc || 0
      const nicknameCount = data.nicknames ? Object.keys(data.nicknames).length : 0
      let msg = '*Trainer Card Details*\n'
      msg += `\n*User ID:* ${ctx.from.id}`
      msg += `\n*Trainer Level:* ${level}`
      msg += `\n*EXP:* ${data.inv.exp || 0}`
      msg += `\n*PokeCoins:* ${pc}`
      msg += `\n*Battles:* ${battles}`
      msg += `\n*Wins / Losses:* ${wins} / ${loses}`
      msg += `\n*Pokemons Caught:* ${caught}`
      msg += `\n*Dex Entries:* ${seen}`
      msg += `\n*Nicknames:* ${nicknameCount}`

      try{
        await ctx.answerCbQuery()
      }catch(e){}

      await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg)
    } catch (error) {
      console.log(error)
    }
  })
}

module.exports = register_089_cardmore;
