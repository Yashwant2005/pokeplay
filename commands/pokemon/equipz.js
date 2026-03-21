const { Z_CRYSTALS, resolveZCrystalName, titleCaseZCrystal } = require('../../utils/z_crystals');

function registerEquipZCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('equipz', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.zCrystals || typeof data.extra.itembox.zCrystals !== 'object') data.extra.itembox.zCrystals = {};

    const raw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!raw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /equipz <crystal name>\nExample: `/equipz electrium-z`', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (raw.toLowerCase() === 'none' || raw.toLowerCase() === 'remove') {
      data.extra.equippedZCrystal = '';
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Removed your equipped *Z-Crystal*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const crystal = resolveZCrystalName(raw);
    if (!crystal || !Z_CRYSTALS.includes(crystal)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Invalid *Z-Crystal*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (Number(data.extra.itembox.zCrystals[crystal] || 0) < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You do not own *' + titleCaseZCrystal(crystal) + '*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    data.extra.equippedZCrystal = crystal;
    await saveUserData2(ctx.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Equipped *' + titleCaseZCrystal(crystal) + '*.\nUse `/equipz none` to remove it.', { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerEquipZCommand;
