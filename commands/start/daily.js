function registerDailyRewardCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage, moment, admins, events, getAllUserData } = deps;
  const getRequiredBioTag = () => '@' + String((bot && bot.botInfo && bot.botInfo.username) || 'pokeplaybot').toLowerCase();
  const hasBotTagInBio = async (ctx) => {
    const requiredTag = getRequiredBioTag();
    try {
      const chat = await ctx.telegram.getChat(ctx.from.id);
      const bio = String((chat && chat.bio) || '').toLowerCase();
      return bio.includes(requiredTag);
    } catch (error) {
      return false;
    }
  };
  const ensureDailyState = (data) => {
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.events || typeof data.extra.events !== 'object') data.extra.events = {};
    if (!data.extra.events.commemorativeDaily || typeof data.extra.events.commemorativeDaily !== 'object') {
      data.extra.events.commemorativeDaily = {};
    }
    return data.extra.events.commemorativeDaily;
  };

  const normalizeBattleBoxInventory = (data) => {
    if (!data.inv || typeof data.inv !== 'object') data.inv = {};
    const legacyKeys = ['battlebox', 'battle_box', 'battleboxes', 'battle_boxes'];
    let total = 0;
    for (const key of legacyKeys) {
      const value = Number(data.inv[key]);
      if (Number.isFinite(value) && value > 0) {
        total = Math.max(total, Math.floor(value));
      }
    }
    data.inv.battle_boxes = total;
    for (const key of legacyKeys) {
      if (key !== 'battle_boxes' && key in data.inv) delete data.inv[key];
    }
    return data.inv.battle_boxes;
  };

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

    const requiredBioTag = getRequiredBioTag();
    const bioEligible = await hasBotTagInBio(ctx);
    if (!bioEligible) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, [
        '*Daily Reward*',
        '',
        'Add *' + requiredBioTag.replace('_', '\\_') + '* to your Telegram bio to claim daily rewards.',
        '',
        'After updating your bio, use */daily* again.'
      ].join('\n'), {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const todayUtc = moment.utc().format('YYYY-MM-DD');
    const state = ensureDailyState(data);

    if (state.lastClaimDate === todayUtc) {
      const remaining = getUtcMidnightCountdown();
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, [
        '*Daily Reward*',
        '',
        'You already claimed today\'s reward.',
        '*Reward:* 2000 PokeCoins, 5 League Points, 1 Holowear Ticket, 1 Battle Box',
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
    normalizeBattleBoxInventory(data);

    data.inv.pc += 2000;
    data.inv.league_points += 5;
    data.inv.holowear_tickets += 1;
    data.inv.battle_boxes += 1;
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
      '- 1 Battle Box',
      '',
      '*PokeCoins:* ' + data.inv.pc,
      '*League Points:* ' + data.inv.league_points,
      '*Holowear Tickets:* ' + data.inv.holowear_tickets,
      '*Battle Boxes:* ' + data.inv.battle_boxes
    ].join('\n'), {
      reply_to_message_id: ctx.message.message_id
    });
  });

  bot.command('dailyreset', check, async (ctx) => {
    const adminIds = Array.isArray(admins) ? admins.map((id) => String(id)) : [];
    if (!adminIds.includes(String(ctx.from.id))) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Only admins can use /dailyreset.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    // Reset daily state for all users
    const allUsers = await getAllUserData();
    let resetCount = 0;
    for (const user of allUsers) {
      if (!user.data) continue;
      const state = ensureDailyState(user.data);
      state.lastClaimDate = null;
      state.lastClaimAtUtc = null;
      await saveUserData2(user.userId, user.data);
      resetCount++;
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, [
      '*Daily Reward Reset*',
      '',
      `Daily reward timer was reset for ${resetCount} users.`,
      'Everyone can use */daily* again now.'
    ].join('\n'), {
      reply_to_message_id: ctx.message.message_id
    });
  });
}

module.exports = registerDailyRewardCommand;
