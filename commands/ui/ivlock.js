function registerIvLockCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const {
    IV_STATS,
    IV_STAT_LABELS,
    loadIvBoostConfig,
    getIvBoostStatus,
    formatIvBoostStatus,
    formatIvBoostWindow,
    resolveIvStat,
    getCurrentIvLock,
    getIvLockDailyUsage,
    clearIvLock,
    setIvLock
  } = require('../../utils/iv_boost_campaign');

  function buildIvLockMessage(userData) {
    const config = loadIvBoostConfig();
    const status = getIvBoostStatus(config);
    const lock = getCurrentIvLock(userData);
    const daily = getIvLockDailyUsage(userData, config);
    const lines = [
      '*IVs Boost Campaign*',
      '',
      '*Status:* ' + formatIvBoostStatus(status),
      '*Duration:* ' + formatIvBoostWindow(config),
      '*Boost:* Wild hunt IVs are boosted during the event.',
      '*IV Lock:* Choose *1 IV stat* to lock for the next *' + config.lockHunts + '* hunts.',
      '*Daily Lock Sets:* ' + daily.used + '/' + daily.limit + ' used today'
    ];

    if (lock) {
      lines.push('*Current Lock:* ' + IV_STAT_LABELS[lock.stat] + ' = ' + lock.value + ' (' + lock.remainingHunts + ' hunts left)');
    } else {
      lines.push('*Current Lock:* None');
    }

    if (status === 'active') {
      lines.push('');
      lines.push('Tap one of the 6 stats below to lock it for the next few hunts.');
      lines.push('Choosing another stat replaces your current lock.');
    } else if (status === 'upcoming') {
      lines.push('');
      lines.push('The event is not active yet. IV locks can be set once it starts.');
    } else {
      lines.push('');
      lines.push('The event is not active right now.');
    }

    return lines.join('\n');
  }

  function buildIvLockKeyboard(userId, status, hasLock) {
    const rows = [];
    if (status === 'active') {
      rows.push([
        { text: 'HP', callback_data: 'ivlock_set_hp_' + userId },
        { text: 'ATK', callback_data: 'ivlock_set_attack_' + userId },
        { text: 'DEF', callback_data: 'ivlock_set_defense_' + userId }
      ]);
      rows.push([
        { text: 'SPA', callback_data: 'ivlock_set_special_attack_' + userId },
        { text: 'SPD', callback_data: 'ivlock_set_special_defense_' + userId },
        { text: 'SPE', callback_data: 'ivlock_set_speed_' + userId }
      ]);
      if (hasLock) {
        rows.push([{ text: 'Clear Lock', callback_data: 'ivlock_clear_' + userId }]);
      }
    }
    return rows.length ? { inline_keyboard: rows } : undefined;
  }

  bot.command('ivlock', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};

    const args = String(ctx.message.text || '').trim().split(/\s+/).slice(1);
    const action = String(args[0] || '').toLowerCase();

    if (action === 'clear' || action === 'remove' || action === 'off') {
      clearIvLock(data);
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'IV lock cleared.\n\n' + buildIvLockMessage(data), {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: buildIvLockKeyboard(ctx.from.id, getIvBoostStatus(loadIvBoostConfig()), false)
      });
      return;
    }

    if (action) {
      const stat = resolveIvStat(action);
      if (!stat) {
        const status = getIvBoostStatus(loadIvBoostConfig());
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Invalid stat.\nTap one of the 6 buttons below to lock a stat.', {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: buildIvLockKeyboard(ctx.from.id, status, Boolean(getCurrentIvLock(data)))
        });
        return;
      }

      const result = setIvLock(data, stat);
      if (!result.ok) {
        let reason = 'Invalid stat.';
        if (result.reason === 'inactive') reason = 'The IV boost event is not active right now.';
        if (result.reason === 'daily_limit') reason = 'You already used all *' + result.daily.limit + '* IV lock sets for today. Try again after the UTC reset.';
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, reason + '\n\n' + buildIvLockMessage(data), {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: buildIvLockKeyboard(ctx.from.id, result.status, Boolean(getCurrentIvLock(data)))
        });
        return;
      }

      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Locked *' + IV_STAT_LABELS[result.lock.stat] + '* at *' + result.lock.value + ' IV* for the next *' + result.lock.remainingHunts + '* hunts.\nYou can only lock *1 stat at a time*, and choosing another stat replaces the current one.\n*Today:* ' + result.daily.used + '/' + result.daily.limit + ' lock sets used.\n\n' + buildIvLockMessage(data), {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: buildIvLockKeyboard(ctx.from.id, result.status, true)
      });
      return;
    }

    const status = getIvBoostStatus(loadIvBoostConfig());
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, buildIvLockMessage(data), {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: buildIvLockKeyboard(ctx.from.id, status, Boolean(getCurrentIvLock(data)))
    });
  });

  bot.action(/^ivlock_set_(.+)_(\d+)$/, async (ctx) => {
    const stat = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }

    const data = await getUserData(userId);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    const result = setIvLock(data, stat);

    if (!result.ok) {
      let msg = 'Invalid stat';
      if (result.reason === 'inactive') msg = 'Event not active';
      if (result.reason === 'daily_limit') msg = 'Daily IV lock limit reached';
      await ctx.answerCbQuery(msg, { show_alert: true });
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildIvLockMessage(data), {
        parse_mode: 'markdown',
        reply_markup: buildIvLockKeyboard(userId, result.status, Boolean(getCurrentIvLock(data)))
      });
      return;
    }

    await saveUserData2(userId, data);
    await ctx.answerCbQuery('Locked ' + IV_STAT_LABELS[result.lock.stat] + ' at ' + result.lock.value + ' IV');
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildIvLockMessage(data), {
      parse_mode: 'markdown',
      reply_markup: buildIvLockKeyboard(userId, result.status, true)
    });
  });

  bot.action(/^ivlock_clear_(\d+)$/, async (ctx) => {
    const userId = Number(ctx.match[1]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }

    const data = await getUserData(userId);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    clearIvLock(data);
    await saveUserData2(userId, data);
    const status = getIvBoostStatus(loadIvBoostConfig());
    await ctx.answerCbQuery('IV lock cleared');
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildIvLockMessage(data), {
      parse_mode: 'markdown',
      reply_markup: buildIvLockKeyboard(userId, status, false)
    });
  });
}

module.exports = registerIvLockCommand;
