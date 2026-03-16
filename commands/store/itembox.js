const {
  exchangeDuplicateTmsForVp,
  exchangeDuplicateStonesForVp,
  summarizeMints
} = require('../../utils/trainer_rank_rewards');

function countTmTotals(data) {
  const tmsData = data.tms || {};
  let total = 0;
  let unique = 0;
  for (const key of Object.keys(tmsData)) {
    const count = Number(tmsData[key]) || 0;
    if (count > 0) {
      total += count;
      unique += 1;
    }
  }
  return { total, duplicates: Math.max(0, total - unique) };
}

function countStoneTotals(data) {
  const stonesArr = Array.isArray(data?.inv?.stones) ? data.inv.stones : [];
  const counts = {};
  for (const stone of stonesArr) {
    const key = String(stone || '');
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  const unique = Object.keys(counts).length;
  return { total: stonesArr.length, duplicates: Math.max(0, stonesArr.length - unique) };
}

function buildItemboxMessage(data) {
  if (!data.extra || typeof data.extra !== 'object') data.extra = {};
  if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};

  const box = data.extra.itembox;
  const bottleCaps = Number(box.bottleCaps) || 0;
  const goldBottleCaps = Number(box.goldBottleCaps) || 0;
  const mints = box.mints || {};
  const vp = Number(data?.inv?.vp) || 0;
  const tmTotals = countTmTotals(data);
  const stoneTotals = countStoneTotals(data);
  const hasOmniRing = !!(data?.inv?.omniring || data?.inv?.ring || data?.inv?.gmax_band);

  let msg = '*Item Box*\n';
  msg += '\n*Bottle Caps:* ' + bottleCaps;
  msg += '\n*Gold Bottle Caps:* ' + goldBottleCaps;
  msg += '\n*Nature Mints:* ' + summarizeMints(mints);
  msg += '\n*Total TMs:* ' + tmTotals.total + ' (duplicates: ' + tmTotals.duplicates + ')';
  msg += '\n*Mega Stones:* ' + stoneTotals.total + ' (duplicates: ' + stoneTotals.duplicates + ')';
  msg += '\n*VP:* ' + vp;
  msg += '\n*OmniRing:* ' + (hasOmniRing ? 'Equipped' : 'Not owned');
  msg += '\n\n*Exchange rates:*';
  msg += '\n- TM duplicate -> 50 VP';
  msg += '\n- Mega Stone duplicate -> 500 VP';

  const rows = [];
  if (tmTotals.duplicates > 0) rows.push([{ text: 'Exchange TM Duplicates', callback_data: 'itmbx_xch_tm_' + data.user_id }]);
  if (stoneTotals.duplicates > 0) rows.push([{ text: 'Exchange Stone Duplicates', callback_data: 'itmbx_xch_stone_' + data.user_id }]);

  return { msg, rows };
}

function registerItemboxCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('itembox', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    data.user_id = ctx.from.id;
    const view = buildItemboxMessage(data);
    await saveUserData2(ctx.from.id, data);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, view.msg, {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: view.rows.length ? { inline_keyboard: view.rows } : undefined
    });
  });

  bot.action(/itmbx_xch_tm_/, check2q, async (ctx) => {
    const id = Number(String(ctx.callbackQuery.data || '').split('_')[3]);
    if (ctx.from.id !== id) return;

    const data = await getUserData(ctx.from.id);
    const out = exchangeDuplicateTmsForVp(data);
    await saveUserData2(ctx.from.id, data);

    const view = buildItemboxMessage({ ...data, user_id: ctx.from.id });
    const note = out.duplicates > 0
      ? '\n\nExchanged ' + out.duplicates + ' TM duplicates for ' + out.gainedVp + ' VP.'
      : '\n\nNo TM duplicates available for exchange.';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, view.msg + note, {
      parse_mode: 'markdown',
      reply_markup: view.rows.length ? { inline_keyboard: view.rows } : undefined
    });
  });

  bot.action(/itmbx_xch_stone_/, check2q, async (ctx) => {
    const id = Number(String(ctx.callbackQuery.data || '').split('_')[3]);
    if (ctx.from.id !== id) return;

    const data = await getUserData(ctx.from.id);
    const out = exchangeDuplicateStonesForVp(data);
    await saveUserData2(ctx.from.id, data);

    const view = buildItemboxMessage({ ...data, user_id: ctx.from.id });
    const note = out.duplicates > 0
      ? '\n\nExchanged ' + out.duplicates + ' stone duplicates for ' + out.gainedVp + ' VP.'
      : '\n\nNo stone duplicates available for exchange.';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, view.msg + note, {
      parse_mode: 'markdown',
      reply_markup: view.rows.length ? { inline_keyboard: view.rows } : undefined
    });
  });
}

module.exports = registerItemboxCommand;
