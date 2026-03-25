module.exports = function registerExitMeCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function isUserEntry(entry, userId) {
    if (!entry || typeof entry !== 'object') return false;
    const idStr = String(userId);
    return (
      (entry.turn !== undefined && String(entry.turn) === idStr) ||
      (entry.oppo !== undefined && String(entry.oppo) === idStr) ||
      (entry.id !== undefined && String(entry.id) === idStr)
    );
  }

  async function clearUserFromMessageData(userId) {
    const mdata = await loadMessageDataFresh();
    if (!mdata || typeof mdata !== 'object') {
      return { cleared: false, battleChats: [] };
    }

    const key = String(userId);
    let dirty = false;
    const battleChats = new Set();

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
      if (!isUserEntry(entry, userId)) continue;
      battleChats.add(String(chatId));
      delete mdata[chatId];
      dirty = true;
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
      await saveMessageData(mdata);
    }

    return { cleared: dirty, battleChats: Array.from(battleChats) };
  }

  async function clearUserBattleState(userId, battleChats) {
    let clearedBattles = 0;
    for (const chatId of battleChats) {
      try {
        await saveBattleData(chatId, {});
        clearedBattles += 1;
      } catch (error) {
        // ignore cache clear failures for individual battle rooms
      }
    }

    let userDataCleared = false;
    try {
      const data = await getUserData(userId);
      if (data && typeof data === 'object') {
        data.extra = data.extra && typeof data.extra === 'object' ? data.extra : {};
        let dirty = false;

        if (data.extra.hunting) {
          data.extra.hunting = false;
          dirty = true;
        }
        if (data.extra.temp_battle && Object.keys(data.extra.temp_battle).length > 0) {
          data.extra.temp_battle = {};
          dirty = true;
        }
        if (data.extra.pendingMoveLearn && typeof data.extra.pendingMoveLearn === 'object' && Object.keys(data.extra.pendingMoveLearn).length > 0) {
          data.extra.pendingMoveLearn = {};
          dirty = true;
        }

        if (dirty) {
          await saveUserData2(userId, data);
          userDataCleared = true;
        }
      }
    } catch (error) {
      userDataCleared = false;
    }

    return { clearedBattles, userDataCleared };
  }

  bot.command('exitme', async (ctx) => {
    const targetId = ctx.from && ctx.from.id ? ctx.from.id : null;
    if (!targetId) return;

    const result = await clearUserFromMessageData(targetId);

    let sessionCleared = false;
    try {
      sessionCleared = await clearUserSessions(targetId);
    } catch (error) {
      sessionCleared = false;
    }

    const battleState = await clearUserBattleState(targetId, result.battleChats);

    const extras = [];
    if (result.cleared) extras.push('message state cleared');
    if (battleState.clearedBattles > 0) extras.push('battle cache cleared');
    if (battleState.userDataCleared) extras.push('user battle flags reset');
    if (sessionCleared) extras.push('session refreshed');
    const extraText = extras.length ? ' (' + extras.join(', ') + ')' : '';

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Done.* You were force-exited from all battle states' + extraText + '.',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
};
