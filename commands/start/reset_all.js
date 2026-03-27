function registerResetAllCommand(bot, deps) {
  const { session, getUserData, resetUserData, sendMessage, loadMessageData, admins, clearUserSessions, saveMessageData, userExists } = deps;
  function clearUserFromMessageData(userId) {
    try {
      const mdata = loadMessageData();
      if (!mdata || typeof mdata !== 'object') return false;
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
      return dirty;
    } catch (error) {
      console.error('Failed to clear user from message data', error.message || error);
      return false;
    }
  }

  async function clearUserSessionData(userId) {
    return await clearUserSessions(userId);
  }

  const handleResetAll = async (ctx) => {
    const fullText = (ctx.message && (ctx.message.text || ctx.message.caption)) || '';
    const args = fullText.split(/\s+/).slice(1).filter(Boolean);
    console.log('[reset_all] invoked by', ctx.from && ctx.from.id, 'args', args);
    const requestedId = args[0] ? Number(args[0]) : ctx.from.id;
    const targetId = Number.isFinite(requestedId) ? requestedId : ctx.from.id;
    const key = String(targetId);
    const isAdmin = Array.isArray(admins) && admins.includes(ctx.from.id);

    if (!isAdmin && targetId !== ctx.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You can only reset your own data.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const userData = await getUserData(targetId);
    const hasRecord = await userExists(targetId);
    if ((!userData || Object.keys(userData).length === 0) && !hasRecord) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No saved data found for this user.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const clearedMsgData = clearUserFromMessageData(targetId);
    const resetOk = await resetUserData(targetId);
    const sessionCleared = await clearUserSessionData(targetId);

    if (!resetOk) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Failed to reset data. Please try again.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const selfReset = targetId === ctx.from.id;
    const extras = [];
    if (sessionCleared) extras.push('session cleared');
    if (clearedMsgData) extras.push('message state cleared');
    const extraText = extras.length ? ' (' + extras.join(', ') + ')' : '';
    const notice = selfReset
      ? '*All of your data has been removed*' + extraText + '.\nUse /start to begin again.'
      : '*All data for user* `' + key + '` *has been removed*' + extraText + '.';

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, notice, {
      reply_to_message_id: ctx.message.message_id
    });

    if (!selfReset) {
      try {
        await sendMessage(ctx, targetId, { parse_mode: 'markdown' }, '*Your account data was reset by an admin.*\nUse /start to begin again.');
      } catch (error) {
        // ignore notification failures
      }
    }
  };

  // Standard command (text messages)
  bot.command('reset_all', handleResetAll);

  // Allow command from captions (e.g., photo+caption)
  bot.on('message', async (ctx, next) => {
    try {
      const cap = ctx.message && ctx.message.caption;
      if (cap && cap.startsWith('/reset_all')) {
        return handleResetAll(ctx);
      }
    } catch (e) {
      // ignore and continue
    }
    return next();
  });

  // Fallback for any text that starts with /reset_all (covers forwards/edits)
  bot.hears(/^\/reset_all(\b|@|$)/, handleResetAll);
}

module.exports = registerResetAllCommand;
