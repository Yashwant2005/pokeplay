function registerReplyResetCommand(bot, deps) {
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

      if (dirty) saveMessageData(mdata);
      return dirty;
    } catch (error) {
      console.error('Failed to clear user from message data', error.message || error);
      return false;
    }
  }

  async function clearUserSessionData(userId) {
    return await clearUserSessions(userId);
  }

  bot.command('reset', async (ctx) => {
    if (!Array.isArray(admins) || !admins.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Only admins can use /reset.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const reply = ctx.message && ctx.message.reply_to_message;
    if (!reply || !reply.from || !reply.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Reply to a user with /reset to clear their data.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const targetId = Number(reply.from.id);
    if (!Number.isFinite(targetId)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid target user.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const key = String(targetId);
    const userData = await getUserData(targetId);
    const hasRecord = await userExists(targetId);

    if ((!userData || Object.keys(userData).length === 0) && !hasRecord) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No saved data found for this user.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const resetOk = await resetUserData(targetId);
    const sessionCleared = await clearUserSessionData(targetId);
    const messageStateCleared = clearUserFromMessageData(targetId);

    if (!resetOk) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Failed to reset user data. Please try again.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const extras = [];
    if (sessionCleared) extras.push('session cleared');
    if (messageStateCleared) extras.push('message state cleared');
    const extraText = extras.length ? ' (' + extras.join(', ') + ')' : '';

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*User data reset completed for* `' + key + '`' + extraText + '.',
      { reply_to_message_id: ctx.message.message_id }
    );

    try {
      await sendMessage(ctx, targetId, { parse_mode: 'markdown' }, '*Your account data was reset by an admin.*\nUse /start to begin again.');
    } catch (error) {
      // ignore notify failures
    }
  });
}

module.exports = registerReplyResetCommand;
