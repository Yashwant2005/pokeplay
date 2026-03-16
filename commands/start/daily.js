function registerDailyRewardCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const getUtcMidnightCountdown = () => {
    const next = moment.utc().add(1, 'day').startOf('day');
    const totalSec = Math.max(0, next.diff(moment.utc(), 'seconds'));
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return hours + ':' + mins + ':' + secs;
  };

  bot.command('daily', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.events || typeof data.extra.events !== 'object') data.extra.events = {};
    if (!data.extra.events.commemorativeDaily || typeof data.extra.events.commemorativeDaily !== 'object') {
      data.extra.events.commemorativeDaily = {};
    }

    const todayUtc = moment.utc().format('YYYY-MM-DD');
    const state = data.extra.events.commemorativeDaily;

    if (state.lastClaimDate === todayUtc) {
      const remaining = getUtcMidnightCountdown();
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, [
        '*Daily Reward*',
        '',
        'You already claimed today\'s reward.',
        '*Reward:* 2000 PokeCoins, 5 League Points, 1 Holowear Ticket',
        '',
        '*Time remaining to claim:* ' + remaining + ' (resets at 00:00 UTC)'
      ].join('\n'), {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
    if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
    if (!Number.isFinite(data.inv.holowear_tickets)) data.inv.holowear_tickets = 0;

    data.inv.pc += 2000;
    data.inv.league_points += 5;
    data.inv.holowear_tickets += 1;
    state.lastClaimDate = todayUtc;
    state.lastClaimAtUtc = moment.utc().toISOString();

    await saveUserData2(ctx.from.id, data);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, [
      '*Daily Reward*',
      '',
      'You claimed today\'s reward:',
      '- 2000 PokeCoins',
      '- 5 League Points',
      '- 1 Holowear Ticket',
      '',
      '*PokeCoins:* ' + data.inv.pc,
      '*League Points:* ' + data.inv.league_points,
      '*Holowear Tickets:* ' + data.inv.holowear_tickets
    ].join('\n'), {
      reply_to_message_id: ctx.message.message_id
    });
  });
}

module.exports = registerDailyRewardCommand;