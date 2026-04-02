function registerAcknowledgeCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage, stones, c, getAllUserData } = deps;
  const he = require('he');
  const {
    ensureAcknowledgeEventState,
    getAcknowledgersList,
    getPendingRewardTiers,
    claimRewardTier,
    pickRandomRewardStone
  } = require('../../utils/acknowledge_event');
  
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getDisplayName(raw, fallback) {
    let name = String(raw || fallback || '').trim();
    try {
      name = he.decode(name);
    } catch (_) {}
    return name || String(fallback || 'Unknown');
  }

  function userLink(userId, name) {
    return '<a href="tg://user?id=' + escapeHtml(userId) + '">' + escapeHtml(name) + '</a>';
  }

  async function findAcknowledgedTargetBySender(senderId) {
    if (typeof getAllUserData !== 'function') return null;
    const allUsers = await getAllUserData();
    for (const row of allUsers) {
      const data = row && row.data && typeof row.data === 'object' ? row.data : {};
      const state = (((data.extra || {}).events || {}).communityAcknowledge) || {};
      const acknowledgers = state.acknowledgers && typeof state.acknowledgers === 'object'
        ? state.acknowledgers
        : {};
      if (!acknowledgers[String(senderId)]) continue;
      return {
        userId: String(row.user_id || row.userId || ''),
        name: getDisplayName(data.inv && data.inv.name, row.user_id || row.userId || senderId)
      };
    }
    return null;
  }

  const MIN_DEX_ENTRIES_TO_ACKNOWLEDGE = 150;

  bot.command('acknowledge', check, async (ctx) => {
    const reply = ctx.message && ctx.message.reply_to_message;
    if (!reply || !reply.from || !reply.from.id) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Usage:* reply to a player and use */acknowledge*',
        { reply_to_message_id: ctx.message && ctx.message.message_id }
      );
      return;
    }

    if (reply.from.is_bot) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You can only acknowledge *players*.', {
        reply_to_message_id: ctx.message && ctx.message.message_id
      });
      return;
    }

    const giverId = String(ctx.from.id);
    const targetId = String(reply.from.id);

    if (giverId === targetId) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You cannot acknowledge *yourself*.', {
        reply_to_message_id: ctx.message && ctx.message.message_id
      });
      return;
    }

    const targetData = await getUserData(targetId);
    if (!targetData || !targetData.inv || !Array.isArray(targetData.pokes)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'That player has not started their journey yet.', {
        reply_to_message_id: ctx.message && ctx.message.message_id
      });
      return;
    }

    if (!targetData.inv || typeof targetData.inv !== 'object') targetData.inv = {};
    if (!Array.isArray(targetData.inv.stones)) targetData.inv.stones = [];

    const giverData = await getUserData(giverId);
    const giverState = ensureAcknowledgeEventState(giverData);
    const previousSent = giverState.sentAcknowledgement;
    if (previousSent && previousSent.userId && String(previousSent.userId) !== targetId) {
      const previousName = getDisplayName(previousSent.name, previousSent.userId);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'HTML' },
        'You can acknowledge only one person during this event.\n\nAlready acknowledged: ' + userLink(String(previousSent.userId), previousName),
        { reply_to_message_id: ctx.message && ctx.message.message_id }
      );
      return;
    }

    const globallyAcknowledgedTarget = await findAcknowledgedTargetBySender(giverId);
    if (globallyAcknowledgedTarget && globallyAcknowledgedTarget.userId && String(globallyAcknowledgedTarget.userId) !== targetId) {
      giverState.sentAcknowledgement = {
        userId: String(globallyAcknowledgedTarget.userId),
        name: globallyAcknowledgedTarget.name,
        atUtc: new Date().toISOString()
      };
      await saveUserData2(giverId, giverData);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'HTML' },
        'You can acknowledge only one person during this event.\n\nAlready acknowledged: ' + userLink(String(globallyAcknowledgedTarget.userId), globallyAcknowledgedTarget.name),
        { reply_to_message_id: ctx.message && ctx.message.message_id }
      );
      return;
    }

    const state = ensureAcknowledgeEventState(targetData);
    const acknowledgers = state.acknowledgers || {};
    if (acknowledgers[giverId]) {
      const targetName = getDisplayName(targetData.inv.name, reply.from.first_name || targetId);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'HTML' },
        'You already acknowledged ' + userLink(targetId, targetName) + ' during this event.',
        { reply_to_message_id: ctx.message && ctx.message.message_id }
      );
      return;
    }

    const giverDexEntries = Array.isArray(giverData && giverData.pokeseen) ? giverData.pokeseen.length : 0;
    if (giverDexEntries < MIN_DEX_ENTRIES_TO_ACKNOWLEDGE) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'You need at least *' + MIN_DEX_ENTRIES_TO_ACKNOWLEDGE + '* *Dex Entries* to acknowledge other players.\n\n*Your Dex Entries:* ' + giverDexEntries,
        { reply_to_message_id: ctx.message && ctx.message.message_id }
      );
      return;
    }

    const giverName = getDisplayName((giverData && giverData.inv && giverData.inv.name), ctx.from.first_name || giverId);
    giverState.sentAcknowledgement = {
      userId: targetId,
      name: getDisplayName(targetData.inv.name, reply.from.first_name || targetId),
      atUtc: new Date().toISOString()
    };
    acknowledgers[giverId] = {
      name: giverName,
      atUtc: new Date().toISOString()
    };

    const rewardedStones = [];
    for (const tier of getPendingRewardTiers(state)) {
      const rewardStone = pickRandomRewardStone(stones);
      if (!rewardStone) continue;
      targetData.inv.stones.push(rewardStone);
      claimRewardTier(state, tier, rewardStone);
      rewardedStones.push(rewardStone);
    }

    await saveUserData2(giverId, giverData);
    await saveUserData2(targetId, targetData);

    const updatedState = ensureAcknowledgeEventState(targetData);
    const totalAcknowledgements = getAcknowledgersList(updatedState).length;
    const targetName = getDisplayName(targetData.inv.name, reply.from.first_name || targetId);
    const lines = [
      userLink(giverId, giverName) + ' acknowledged ' + userLink(targetId, targetName) + '.',
      '',
      '<b>Current acknowledgements:</b> ' + totalAcknowledgements
    ];

    if (rewardedStones.length) {
      lines.push('');
      lines.push('<b>Rewards earned:</b>');
      for (const stoneKey of rewardedStones) {
        lines.push('- ' + escapeHtml(c(stoneKey)));
      }
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, lines.join('\n'), {
      reply_to_message_id: ctx.message && ctx.message.message_id
    });
  });
}

module.exports = registerAcknowledgeCommand;
