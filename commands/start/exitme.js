module.exports = function registerExitMeCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function isEntryExpired(entry, now) {
    if (!entry || typeof entry !== 'object') return true;
    const hasTimes = typeof entry.times === 'number';
    const hasTimestamp = typeof entry.timestamp === 'number';
    if (!hasTimes && !hasTimestamp) return true;
    if (hasTimes && now - entry.times <= 130000) return false;
    if (hasTimestamp && now - entry.timestamp <= 60000) return false;
    return true;
  }

  function isUserEntry(entry, userId) {
    const idStr = String(userId);
    return (
      (entry.turn !== undefined && String(entry.turn) === idStr) ||
      (entry.oppo !== undefined && String(entry.oppo) === idStr) ||
      (entry.id !== undefined && String(entry.id) === idStr)
    );
  }

  function clearUserFromMessageData(userId) {
    const mdata = loadMessageData();
    if (!mdata || typeof mdata !== 'object') return { cleared: false, active: false };

    const now = Date.now();
    let active = false;
    for (const [key, entry] of Object.entries(mdata)) {
      if (key === 'battle' || key === 'moves' || key === 'tutor') continue;
      if (!entry || typeof entry !== 'object') continue;
      if (!isUserEntry(entry, userId)) continue;
      if (!isEntryExpired(entry, now)) {
        active = true;
        break;
      }
    }

    if (active) {
      return { cleared: false, active: true };
    }

    const key = String(userId);
    let dirty = false;

    if (mdata[key]) {
      delete mdata[key];
      dirty = true;
    }
    if (Array.isArray(mdata.battle)) {
      const filtered = mdata.battle.filter((id) => String(id) !== key);
      if (filtered.length !== mdata.battle.length) {
        mdata.battle = filtered;
        dirty = true;
      }
    }

    for (const [chatId, entry] of Object.entries(mdata)) {
      if (chatId === 'battle' || chatId === 'moves' || chatId === 'tutor') continue;
      if (entry && isUserEntry(entry, userId)) {
        delete mdata[chatId];
        dirty = true;
      }
    }

    if (mdata.moves && typeof mdata.moves === 'object') {
      for (const moveId of Object.keys(mdata.moves)) {
        const entry = mdata.moves[moveId];
        if (entry && (String(entry.chat) === key || String(entry.oppo) === key)) {
          delete mdata.moves[moveId];
          dirty = true;
        }
      }
    }

    if (mdata.tutor && typeof mdata.tutor === 'object') {
      for (const tutorKey of Object.keys(mdata.tutor)) {
        const entry = mdata.tutor[tutorKey];
        if (entry && (String(entry.chat) === key || String(entry.user_id) === key)) {
          delete mdata.tutor[tutorKey];
          dirty = true;
        }
      }
    }

    if (dirty) {
      saveMessageData(mdata);
    }
    return { cleared: dirty, active: false };
  }

  bot.command('exitme', async (ctx) => {
    const targetId = ctx.from && ctx.from.id ? ctx.from.id : null;
    if (!targetId) return;

    const result = clearUserFromMessageData(targetId);
    if (result.active) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'You are in an *active* battle/hunt right now.\nFinish it first, or wait a minute and try again.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    let sessionCleared = false;
    try {
      sessionCleared = await clearUserSessions(targetId);
    } catch (error) {
      sessionCleared = false;
    }

    const extras = [];
    if (result.cleared) extras.push('battle state cleared');
    if (sessionCleared) extras.push('session refreshed');
    const extraText = extras.length ? ' (' + extras.join(', ') + ')' : '';

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Done.* Your stuck state has been refreshed' + extraText + '.',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
};
