function register_044_keyitem(bot, deps) {
  const { getUserData, editMessage, stones, c, catch_rates } = deps;
  const getMegaStoneKeys = (data) => [...new Set((data && data.inv && data.inv.stones) || [])].filter((stoneKey) => {
    const stoneInfo = stones && stones[stoneKey];
    const megaTarget = String(stoneInfo && stoneInfo.mega || '').toLowerCase();
    return megaTarget.includes('-mega');
  });

  const getStoneSell = (stoneName) => {
    const poke = stones[stoneName] ? stones[stoneName].pokemon : '';
    const rate = Number(catch_rates[poke] || 190);
    if (rate <= 45) return { lp: 120, tier: 'Ultra Rare' };
    if (rate <= 75) return { lp: 90, tier: 'Rare' };
    if (rate <= 120) return { lp: 70, tier: 'Uncommon' };
    return { lp: 50, tier: 'Common' };
  };

  bot.action(/keyitem_/, async (ctx) => {
    const id = ctx.callbackQuery.data.split('_')[2];
    if (ctx.from.id != id) {
      return;
    }

    const data = await getUserData(ctx.from.id);
    const item = ctx.callbackQuery.data.split('_')[1];
    const filteredStones = getMegaStoneKeys(data);

    if (item == 'page') {
      const ore = [];
      let message = '*You Have Following Mega Stones :-*';
      const page = ctx.callbackQuery.data.split('_')[3] * 1;
      const pageSize = 15;
      const startIdx = (page - 1) * pageSize;
      let b = startIdx;
      if (page < 1 || startIdx > filteredStones.length) {
        return;
      }

      const endIdx = startIdx + pageSize;
      const stn = filteredStones.slice(startIdx, endIdx);
      for (const p of stn) {
        ore.push({ text: c(p), callback_data: 'keyitem_' + b + '_' + ctx.from.id + '' });
        b++;
      }

      const rows = [];
      for (let i = 0; i < ore.length; i += 3) {
        rows.push(ore.slice(i, i + 3));
      }
      if (filteredStones.length > 15) {
        rows.push([{ text: '<', callback_data: 'keyitem_page_' + ctx.from.id + '_' + (page - 1) + '' }, { text: '>', callback_data: 'keyitem_page_' + ctx.from.id + '_' + (page + 1) + '' }]);
      }
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, message, { parse_mode: 'markdown', reply_markup: { inline_keyboard: rows } });
      return;
    }

    if (!filteredStones[item * 1]) {
      ctx.answerCbQuery('Something Went Wrong With This Stone');
      return;
    }

    const selectedStone = filteredStones[item * 1];
    const meta = getStoneSell(selectedStone);
    await editMessage(
      'text',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      'â˜… This *Mega Stone* known as *' + c(selectedStone) + '*\nâ€¢ Which helps *' + c(stones[selectedStone].pokemon) + '* to transform into *' + c(stones[selectedStone].mega) + '* in a battle.\n\n*Sell value:* ' + meta.lp + ' LP (' + meta.tier + ')\n\n_Do you wanna sell your_ *' + c(selectedStone) + '*',
      {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: [[{ text: 'Yes', callback_data: 'syllity_' + item + '_' + ctx.from.id + '' }, { text: 'No', callback_data: 'keyitem_page_' + ctx.from.id + '_1' }]] },
        link_preview_options: { show_above_text: true, url: stones[selectedStone].image }
      }
    );
  });
}

module.exports = register_044_keyitem;
