function registerSellCommand(bot, deps) {
  const { session, check, check2, getUserData, saveUserData2, sendMessage, stones, c, he } = deps;
  bot.command('sell', check, check2, async ctx => {
    const data = await getUserData(ctx.from.id);
    const sellInfo = {
      regular: 7,
      ultra: 20,
      great: 12,
      repeat: 25,
      beast: 50,
      quick: 40,
      net: 25,
      nest: 30,
      candy: 50,
      vitamin: 50,
      berry: 40,
      master: 3000,
      friend: 25,
      level: 25,
      moon: 35,
      sport: 15,
      luxury: 10,
      premier: 8,
      park: 75,
    };

    const item2 = ctx.message.text.split(' ')[1];
    const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2] * 1), 0);

    if (!item2) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage: /sell <item> <amount>*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const item = item2.toLowerCase();

    if (!data.inv.stones) {
      data.inv.stones = [];
    }

    const sellableMegaStones = [...new Set(data.inv.stones)].filter((stoneKey) => {
      const stoneInfo = stones && stones[stoneKey];
      const megaTarget = String((stoneInfo && stoneInfo.mega) || '').toLowerCase();
      return megaTarget.includes('-mega');
    });

    const stoneAliases = ['item', 'items', 'stone', 'stones'];
    if (stoneAliases.includes(item)) {
      if (sellableMegaStones.length < 1) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You do not have any *Mega Stone*', {
          reply_to_message_id: ctx.message.message_id
        });
        return;
      }

      const ore = [];
      let message = '*You Have Following Mega Stones :-*';
      const page = 1;
      const pageSize = 15;
      const startIdx = (page - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const stn = sellableMegaStones.slice(startIdx, endIdx);
      let b = 0;

      for (const p of stn) {
        ore.push({ text: c(p), callback_data: 'keyitem_' + b + '_' + ctx.from.id });
        b++;
      }

      const rows = [];
      for (let i = 0; i < ore.length; i += 3) {
        rows.push(ore.slice(i, i + 3));
      }

      if (sellableMegaStones.length > 15) {
        rows.push([
          { text: '<', callback_data: 'keyitem_page_' + ctx.from.id + '_' + (page - 1) },
          { text: '>', callback_data: 'keyitem_page_' + ctx.from.id + '_' + (page + 1) }
        ]);
      }

      const msg5 = await sendMessage(ctx, ctx.chat.id, message, {
        reply_markup: { inline_keyboard: rows },
        parse_mode: 'markdown',
        reply_to_message_id: ctx.message.message_id
      });

      ctx.session.itm = msg5;
      return;
    }

    if (!amount) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage: /sell <item> <amount>*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (isNaN(amount) || amount < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (!Object.keys(sellInfo).includes(item)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid Item*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (!data.balls) {
      data.balls = {};
    }

    if (!data.balls[item] && !data.inv[item]) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You Don\'t Have This Item*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (data.balls[item] && data.balls[item] < amount) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You does not have *Enough* item', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (data.inv[item] && data.inv[item] < amount) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You does not have *Enough* item', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (data.inv[item]) {
      data.inv[item] -= amount;
      data.inv.pc += amount * sellInfo[item];
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Successfully *Sold ' + amount + ' ' + c(item) + '* for *' + amount * sellInfo[item] + ' PokeCoins 💷*', {
        reply_to_message_id: ctx.message.message_id
      });
      await sendMessage(ctx, -1003069884900, '#sell\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) sold <code>' + amount + ' ' + item + '</code>', {
        parse_mode: 'HTML'
      });
    } else if (data.balls[item]) {
      data.balls[item] -= amount;
      data.inv.pc += amount * sellInfo[item];
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Successfully *Sold ' + amount + ' ' + c(item) + ' Balls* for *' + amount * sellInfo[item] + ' PokeCoins 💷*', {
        reply_to_message_id: ctx.message.message_id
      });
      await sendMessage(ctx, -1003069884900, '#sell\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) sold <code>' + amount + ' ' + item + '</code>', {
        parse_mode: 'HTML'
      });
    }
  });
}

module.exports = registerSellCommand;
