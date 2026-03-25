function registerChallengeCommand(bot, deps) {
  const {
    check,
    getUserData,
    sendMessage,
    loadMessageData,
    saveBattleData,
    he,
    word
  } = deps;

  bot.command('challenge', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    const reply = ctx.message.reply_to_message;
    if (!reply || reply.from.id == ctx.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Reply to a *User* to challenge them.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const mdata = await loadMessageData();
    const activeBattles = Array.isArray(mdata.battle) ? mdata.battle : [];
    if (activeBattles.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You Are In A *Battle*', { reply_to_message_id: ctx.message.message_id });
      return;
    }
    if (activeBattles.includes(reply.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Opponent Is In A *Battle*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data2 = await getUserData(reply.from.id);
    if (!data2.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: reply.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (!data.inv.team || data.inv.team == '' || data.teams[data.inv.team].length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Create your *Teams* first.', { reply_to_message_id: ctx.message.message_id });
      return;
    }
    if (!data2.inv.team || data2.inv.team == '' || data2.teams[data2.inv.team].length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Create your *Teams* first.', { reply_to_message_id: reply.message_id });
      return;
    }

    const challenger = he.encode(ctx.from.first_name);
    const challenged = he.encode(reply.from.first_name);
    const bword = word(7);
    const battleData = {
      set: {
        max_poke: 6,
        min_6l: 0,
        max_6l: 6,
        min_level: 1,
        max_level: 100,
        switch: true,
        key_item: true,
        sandbox: false,
        unrestricted: false,
        random: false,
        preview: 'no',
        pin: false,
        type_effects: true,
        dual_type: true,
        allow_regions: [],
        ban_regions: [],
        allow_types: [],
        ban_types: []
      },
      users: {
        [ctx.from.id]: true,
        [reply.from.id]: false
      },
      userReasons: {}
    };

    await saveBattleData(bword, battleData);

    const msg = 'Challenge: <a href="tg://user?id=' + ctx.from.id + '"><b>' + challenger + '</b></a> vs <a href="tg://user?id=' + reply.from.id + '"><b>' + challenged + '</b></a>\n'
      + '\n-> <a href="tg://user?id=' + ctx.from.id + '"><b>' + challenger + '</b></a> : Ready'
      + '\n-> <a href="tg://user?id=' + reply.from.id + '"><b>' + challenged + '</b></a> : Pending';

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, msg, {
      reply_to_message_id: reply.message_id,
      reply_markup: {
        inline_keyboard: [[
          { text: 'Agree', callback_data: 'battle_' + ctx.from.id + '_' + reply.from.id + '_' + bword },
          { text: 'Reject', callback_data: 'reject_' + ctx.from.id + '_' + reply.from.id + '_' + bword }
        ]]
      }
    });
  });
}

module.exports = registerChallengeCommand;
