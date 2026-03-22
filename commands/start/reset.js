function registerResetCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

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

  async function handleReset(ctx) {
    const reply = ctx.message && ctx.message.reply_to_message;
    const targetId = reply && reply.from ? Number(reply.from.id) : ctx.from.id;
    const key = String(targetId);
    const isAdmin = Array.isArray(admins) && admins.includes(ctx.from.id);

    if (targetId !== ctx.from.id && !isAdmin) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Only admins can reset other users.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (targetId !== ctx.from.id && !reply) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Reply to the user you want to reset.*', {
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

    const extras = [];
    if (sessionCleared) extras.push('session cleared');
    if (clearedMsgData) extras.push('message state cleared');
    const extraText = extras.length ? ' (' + extras.join(', ') + ')' : '';

    const notice = targetId === ctx.from.id
      ? '*Your data has been reset*' + extraText + '.\nUse /start to begin again.'
      : '*Reset complete for user* `' + key + '`' + extraText + '.';

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, notice, {
      reply_to_message_id: ctx.message.message_id
    });

    if (targetId !== ctx.from.id) {
      try {
        await sendMessage(ctx, targetId, { parse_mode: 'markdown' }, '*Your account data was reset by an admin.*\nUse /start to begin again.');
      } catch (error) {
        // ignore notification failures
      }
    }
  }

  bot.command('reset', handleReset);
}

module.exports = registerResetCommand;
