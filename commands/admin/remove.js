function toKey(value) {
  return String(value || '').trim().toLowerCase();
}

function parsePositiveInt(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function parseNameAndAmount(tokens) {
  const arr = (tokens || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (!arr.length) return { name: '', amount: 1 };
  const last = arr[arr.length - 1];
  if (/^\d+$/.test(last)) {
    return {
      name: arr.slice(0, -1).join(' ').trim(),
      amount: parsePositiveInt(last, 1)
    };
  }
  return { name: arr.join(' ').trim(), amount: 1 };
}

function removeFromArray(list, value, amount) {
  const arr = Array.isArray(list) ? [...list] : [];
  let removed = 0;
  for (let i = arr.length - 1; i >= 0 && removed < amount; i -= 1) {
    if (String(arr[i]) === String(value)) {
      arr.splice(i, 1);
      removed += 1;
    }
  }
  return { next: arr, removed };
}

function registerRemoveCommand(bot, deps) {
  const { admins, getUserData, saveUserData2, sendMessage, stones, c } = deps;
  const { normalizeHeldItemShopName } = require('../../utils/held_item_shop');

  bot.command('remove', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const reply = ctx.message && ctx.message.reply_to_message;
    if (!reply || !reply.from || !reply.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Reply to a user and use:*\n/remove stone <stone_name> [amount]');
      return;
    }

    const args = String(ctx.message.text || '').split(' ').slice(1);
    const itemType = toKey(args[0]);
    if (!itemType) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n/remove stone <stone_name> [amount]\n/remove mint <mint_name> [amount]');
      return;
    }

    const targetId = reply.from.id;
    const data = await getUserData(targetId);
    if (!data.inv || typeof data.inv !== 'object') data.inv = {};
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {};

    if (['stone', 'stones', 'mega', 'megastone', 'mega-stone'].includes(itemType)) {
      const parsed = parseNameAndAmount(args.slice(1));
      const stoneName = toKey(parsed.name).replace(/\s+/g, '-');
      const amount = parsed.amount;
      if (!stoneName) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n/remove stone <stone_name> [amount]');
        return;
      }

      if (!stones[stoneName]) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid stone:* ' + c(stoneName));
        return;
      }

      if (!Array.isArray(data.inv.stones)) data.inv.stones = [];
      const result = removeFromArray(data.inv.stones, stoneName, amount);
      if (result.removed < 1) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(reply.from.first_name || String(targetId)) + '* does not have *' + c(stoneName) + '*.');
        return;
      }

      data.inv.stones = result.next;
      await saveUserData2(targetId, data);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Removed *' + result.removed + '* *' + c(stoneName) + '* from *' + c(reply.from.first_name || String(targetId)) + '*.'
      );
      return;
    }

    if (['mint', 'mints', 'naturemint', 'nature-mint', 'nature_mint'].includes(itemType)) {
      const parsed = parseNameAndAmount(args.slice(1));
      const mintName = normalizeHeldItemShopName(parsed.name).replace(/-/g, ' ').trim();
      const amount = parsed.amount;
      if (!mintName) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n/remove mint <mint_name> [amount]');
        return;
      }

      const current = Number(data.extra.itembox.mints[mintName]) || 0;
      if (current < 1) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(reply.from.first_name || String(targetId)) + '* does not have *' + c(mintName) + '*.');
        return;
      }

      const removed = Math.min(current, amount);
      const left = current - removed;
      if (left > 0) data.extra.itembox.mints[mintName] = left;
      else delete data.extra.itembox.mints[mintName];

      await saveUserData2(targetId, data);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Removed *' + removed + '* *' + c(mintName) + '* from *' + c(reply.from.first_name || String(targetId)) + '*.'
      );
      return;
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Currently supported:* stone, mint\n\n*Usage:*\n/remove stone <stone_name> [amount]\n/remove mint <mint_name> [amount]');
  });
}

module.exports = registerRemoveCommand;
