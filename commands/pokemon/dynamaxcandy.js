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

const { getDynamaxLevel } = require('../../utils/dynamax_level');

function registerDynamaxCandyCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage, pokes, c } = deps;
  bot.command('dynamaxcandy', check, async (ctx) => {
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
    if (!Number.isFinite(data.extra.itembox.dynamaxCandy)) data.extra.itembox.dynamaxCandy = 0;

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /dynamaxcandy <pokemon name|nickname|pass>', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (data.extra.itembox.dynamaxCandy < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are out of *Dynamax Candy*.', { reply_to_message_id: ctx.message.message_id });
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
    const before = getDynamaxLevel(p);
    if (before >= 10) {
      p.dynamax_level = 10;
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(p.nickname || p.name) + '* already has max *Dynamax Level 10*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    p.dynamax_level = before + 1;
    data.extra.itembox.dynamaxCandy -= 1;
    await saveUserData2(ctx.from.id, data);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Used *Dynamax Candy* on *' + c(p.nickname || p.name) + '*.\n*Dynamax Level:* ' + before + ' -> ' + p.dynamax_level + '\n*Remaining:* ' + data.extra.itembox.dynamaxCandy, { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerDynamaxCandyCommand;
