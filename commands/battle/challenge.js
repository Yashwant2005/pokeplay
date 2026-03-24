function registerChallengeCommand(bot, deps) {
  const {
    check,
    getUserData,
    sendMessage,
    loadMessageData,
    he,
    word,
    fs,
    c
  } = deps;

  bot.command("challenge", check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    const reply = ctx.message.reply_to_message;
    if (!reply || reply.from.id == ctx.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "Reply to a *User* to challenge them.", { reply_to_message_id: ctx.message.message_id });
      return;
    }
    const mdata = await loadMessageData();
    const activeBattles = Array.isArray(mdata.battle) ? mdata.battle : [];
    if (activeBattles.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "You Are In A *Battle*", { reply_to_message_id: ctx.message.message_id });
      return;
    }
    if (activeBattles.includes(reply.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "Opponent Is In A *Battle*", { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data2 = await getUserData(reply.from.id);
    if (!data2.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "*Start your journey now*", {
        reply_to_message_id: reply.message_id,
        reply_markup: { inline_keyboard: [[{ text: "Start My Journey", url: "t.me/" + bot.botInfo.username + "?start=start" }]] }
      });
      return;
    }
    if (!data.inv.team || data.inv.team == "" || data.teams[data.inv.team].length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "Create your *Teams* first.", { reply_to_message_id: ctx.message.message_id });
      return;
    }
    if (!data2.inv.team || data2.inv.team == "" || data2.teams[data2.inv.team].length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "Create your *Teams* first.", { reply_to_message_id: reply.message_id });
      return;
    }

    const challanger = he.encode(ctx.from.first_name);
    const challanged = he.encode(reply.from.first_name);
    let msg = "⚔ <a href=\"tg://user?id=" + ctx.from.id + "\"><b>" + challanger + "</b></a> Has Challenged <a href=\"tg://user?id=" + reply.from.id + "\"><b>" + challanged + "</b></a>\n";
    let f = false;
    let msg2 = "";
    const bword = word(7);

    let settings3 = {};
    try {
      settings3 = loadBattleData(bword);
    } catch (error) {
      settings3 = {};
    }
    settings3.set = data.settings || {
      max_poke: 6,
      min_6l: 0,
      max_6l: 6,
      min_level: 1,
      max_level: 100,
      switch: true,
      key_item: true,
      sandbox: false,
      random: false,
      preview: 'no',
      pin: false,
      type_effects: true,
      dual_type: true,
      allow_regions: [],
      ban_regions: [],
      allow_types: [],
      ban_types: []
    };
    settings3.users = {};
    settings3.users[ctx.from.id] = true;
    settings3.users[reply.from.id] = false;
    await saveBattleData(bword, settings3);
    const settings = settings3.set;
    settings.allow_regions = Array.isArray(settings.allow_regions) ? settings.allow_regions : [];
    settings.ban_regions = Array.isArray(settings.ban_regions) ? settings.ban_regions : [];
    settings.allow_types = Array.isArray(settings.allow_types) ? settings.allow_types : [];
    settings.ban_types = Array.isArray(settings.ban_types) ? settings.ban_types : [];

    if (settings.max_poke < 6) {
      f = true;
      msg2 += "\n<b>• Max number of pokemon:</b> " + settings.max_poke;
    }
    if (settings.min_6l > 0 || settings.max_6l < 6) {
      f = true;
      msg2 += "\n<b>• Number of legendaries:</b> " + settings.min_6l + "-" + settings.max_6l;
    }
    if (settings.min_level > 1 || settings.max_level < 100) {
      f = true;
      msg2 += "\n<b>• Level gap of pokemon:</b> " + settings.min_level + "-" + settings.max_level;
    }
    if (!settings.switch) {
      f = true;
      msg2 += "\n<b>• Switching pokemon:</b> Disabled";
    }
    if (!settings.key_item) {
      f = true;
      msg2 += "\n<b>• Form Changing:</b> Disabled";
    }
    if (settings.sandbox) {
      f = true;
      msg2 += "\n<b>• Sandbox mode:</b> Enabled";
    }
    if (settings.random) {
      f = true;
      msg2 += "\n<b>• Random mode:</b> Enabled";
    }
    if (settings.preview && settings.preview != "no") {
      f = true;
      msg2 += "\n<b>• Preview mode:</b> " + settings.preview;
    }
    if (settings.pin) {
      f = true;
      msg2 += "\n<b>• Pin mode:</b> Enabled";
    }
    if (!settings.type_effects) {
      f = true;
      msg2 += "\n<b>• Type efficiency:</b> Disabled";
    }
    if (!settings.dual_type) {
      f = true;
      msg2 += "\n<b>• Dual Types:</b> Disabled";
    }
    if (settings.allow_regions.length > 0) {
      f = true;
      msg2 += "\n<b>• Only regions:</b> [" + c(settings.allow_regions.join(" , ")) + "]";
    }
    if (settings.ban_regions.length > 0) {
      f = true;
      msg2 += "\n<b>• Banned regions:</b> [" + c(settings.ban_regions.join(" , ")) + "]";
    }
    if (settings.ban_types.length > 0) {
      f = true;
      msg2 += "\n<b>• Banned types:</b> [" + c(settings.ban_types.join(" , ")) + "]";
    }
    if (settings.allow_types.length > 0) {
      f = true;
      msg2 += "\n<b>• Types:</b> [" + c(settings.allow_types.join(" , ")) + "]";
    }

    if (f) {
      msg += msg2;
      msg += "\n\n-> <a href=\"tg://user?id=" + ctx.from.id + "\"><b>" + challanger + "</b></a> : ✓\n-> <a href=\"tg://user?id=" + reply.from.id + "\"><b>" + challanged + "</b></a> : ✗";
    } else {
      msg += "\n\n-> <a href=\"tg://user?id=" + ctx.from.id + "\"><b>" + challanger + "</b></a> : ✓\n-> <a href=\"tg://user?id=" + reply.from.id + "\"><b>" + challanged + "</b></a> : ✗";
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: "HTML" }, msg, {
      reply_to_message_id: reply.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Agree ✓", callback_data: "battle_" + ctx.from.id + "_" + reply.from.id + "_" + bword },
            { text: "Reject ✗", callback_data: "reject_" + ctx.from.id + "_" + reply.from.id + "_" + bword }
          ],
          [{ text: "Battle Settings ⚔", callback_data: "sytbr_" + ctx.from.id + "_" + reply.from.id + "_" + bword }]
        ]
      }
    });
  });
}

module.exports = registerChallengeCommand;

