const { getGigantamaxFormName, isGigantamaxName } = require('../../utils/gmax_utils');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function findPokemonMatches(data, targetRaw) {
  const key = normalizeName(targetRaw);
  const keyByName = key.replace(/ /g, '-');
  const list = Array.isArray(data && data.pokes) ? data.pokes : [];

  const byPass = list.filter((entry) => normalizeName(entry.pass) === key);
  if (byPass.length > 0) return byPass;

  const byNickname = list.filter((entry) => entry.nickname && normalizeName(entry.nickname) === key);
  if (byNickname.length > 0) return byNickname;

  return list.filter((entry) => normalizeName(entry.name) === keyByName);
}

function registerMaxSoupCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('maxsoup', check, async (ctx) => {
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
    if (!Number.isFinite(data.extra.itembox.maxSoup)) data.extra.itembox.maxSoup = 0;

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /maxsoup <pokemon name|nickname|pass>', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (data.extra.itembox.maxSoup < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are out of *Max Soup*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const matches = findPokemonMatches(data, targetRaw);
    if (matches.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (matches.length > 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Multiple pokemon matched. Use the *nickname* or *pass* for one exact pokemon.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const p = matches[0];
    if (isGigantamaxName(p.name) || String(p.symbol || '') === '✘' || String(p.symbol || '') === 'âœ˜') {
      p.symbol = '✘';
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(p.nickname || p.name) + '* is already *Gigantamax*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const gmaxForm = getGigantamaxFormName(p.name, forms);
    if (!gmaxForm || !pokes[gmaxForm]) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(p.nickname || p.name) + '* cannot use *Max Soup*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    p.symbol = '✘';
    data.extra.itembox.maxSoup -= 1;

    if (!data.pokeseen) data.pokeseen = [];
    if (!data.pokecaught) data.pokecaught = [];
    if (!data.pokeseen.includes(p.name)) data.pokeseen.push(p.name);
    if (!data.pokecaught.includes(p.name)) data.pokecaught.push(p.name);

    await saveUserData2(ctx.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Used *Max Soup* on *' + c(p.nickname || targetRaw) + '*.\nIt is now marked as *Gigantamax* ✘\n*Remaining:* ' + data.extra.itembox.maxSoup, { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerMaxSoupCommand;
