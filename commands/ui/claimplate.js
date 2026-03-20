function registerClaimPlateCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const { ARCEUS_PLATES, titleCaseHeldItem } = require('../../utils/held_item_shop');

  function ensurePlateClaimState(data) {
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.events || typeof data.extra.events !== 'object') data.extra.events = {};
    if (!data.extra.events.claimPlate || typeof data.extra.events.claimPlate !== 'object') {
      data.extra.events.claimPlate = {
        claimed: false,
        item: '',
        claimedAtUtc: null
      };
    }
    return data.extra.events.claimPlate;
  }

  function ensureHeldItemBox(data) {
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {};
    return data.extra.itembox.heldItems;
  }

  function buildClaimPlateText(data) {
    const state = ensurePlateClaimState(data);
    const lines = [
      '*Arceus Plate Claim*',
      '',
      'Choose *1 plate* of your choice.',
      'This claim can be used *only once*.'
    ];

    if (state.claimed) {
      lines.push('');
      lines.push('*Status:* Already claimed');
      lines.push('*Claimed Plate:* ' + c(titleCaseHeldItem(state.item || 'none')));
    } else {
      lines.push('');
      lines.push('*Status:* Not claimed yet');
      lines.push('Tap one plate below to claim it.');
    }

    return lines.join('\n');
  }

  function buildClaimPlateKeyboard(userId, claimed) {
    if (claimed) return undefined;
    const rows = [];
    const buttons = ARCEUS_PLATES.map((entry) => ({
      text: titleCaseHeldItem(entry.item),
      callback_data: 'claimplate_pick_' + entry.item + '_' + userId
    }));
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    return { inline_keyboard: rows };
  }

  bot.command('claimplate', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    const state = ensurePlateClaimState(data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, buildClaimPlateText(data), {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: buildClaimPlateKeyboard(ctx.from.id, !!state.claimed)
    });
  });

  bot.action(/^claimplate_pick_(.+)_(\d+)$/, async (ctx) => {
    const itemName = String(ctx.match[1] || '').toLowerCase();
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }

    const allowed = new Set(ARCEUS_PLATES.map((entry) => entry.item));
    if (!allowed.has(itemName)) {
      await ctx.answerCbQuery('Invalid plate', { show_alert: true });
      return;
    }

    const data = await getUserData(userId);
    const state = ensurePlateClaimState(data);
    if (state.claimed) {
      await ctx.answerCbQuery('You already claimed your plate', { show_alert: true });
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildClaimPlateText(data), {
        parse_mode: 'markdown'
      });
      return;
    }

    const heldItems = ensureHeldItemBox(data);
    heldItems[itemName] = Number(heldItems[itemName] || 0) + 1;
    state.claimed = true;
    state.item = itemName;
    state.claimedAtUtc = new Date().toISOString();

    await saveUserData2(userId, data);
    await ctx.answerCbQuery('Claimed ' + titleCaseHeldItem(itemName));
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, '*You claimed* *' + c(titleCaseHeldItem(itemName)) + '*.\n\n' + buildClaimPlateText(data), {
      parse_mode: 'markdown'
    });
  });
}

module.exports = registerClaimPlateCommand;
