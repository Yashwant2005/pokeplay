const { openBattleBoxes } = require('../../utils/trainer_rank_rewards');

function registerBattleboxCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function appendListSection(msg, label, items, formatter, maxItems) {
    if (!Array.isArray(items) || items.length < 1) return msg;
    const take = Math.max(0, Math.min(items.length, maxItems));
    const shown = items.slice(0, take).map(formatter);
    msg += '\n  - ' + label + ': ' + shown.join(', ');
    if (items.length > take) {
      msg += ' ...and ' + (items.length - take) + ' more';
    }
    return msg;
  }

  function buildCompactSummary(summary, pokeballTotal) {
    let msg = '*Battle Box Opened:* ' + summary.opened + '\n';
    msg += '*Remaining:* ' + summary.remaining + ' 🎁';
    if (summary.holowearTicketsAdded > 0) msg += '\n• *Holowear Tickets:* +' + summary.holowearTicketsAdded + ' 🎟️';
    if (pokeballTotal > 0) msg += '\n• *Pokeballs:* +' + pokeballTotal;
    if (summary.tmsAdded > 0) msg += '\n• *TMs:* +' + summary.tmsAdded;
    if (summary.stonesAdded > 0) msg += '\n• *Mega Stones:* +' + summary.stonesAdded;
    if (summary.mintsAdded > 0) msg += '\n• *Nature Mints:* +' + summary.mintsAdded;
    if (summary.bottleCapsAdded > 0) msg += '\n• *Bottle Caps:* +' + summary.bottleCapsAdded;
    if (summary.goldBottleCapsAdded > 0) msg += '\n• *Gold Bottle Caps:* +' + summary.goldBottleCapsAdded;
    return msg;
  }

  function buildButtons(id, remaining) {
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return [[{ text: 'No Boxes Left', callback_data: 'crncl' }]];
    }

    return [
      [
        { text: 'Open 1', callback_data: 'bbopen_1_' + id },
        { text: 'Open 5', callback_data: 'bbopen_5_' + id },
        { text: 'Open 10', callback_data: 'bbopen_10_' + id }
      ],
      [
        { text: 'Open All', callback_data: 'bbopen_all_' + id }
      ]
    ];
  }

  async function openAndSend(ctx, requestedAmount, isCallback) {
    const uid = ctx.from.id;
    const data = await getUserData(uid);

    if (!data.inv || typeof data.inv !== 'object') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message ? ctx.message.message_id : undefined,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (!Number.isFinite(data.inv.battle_boxes)) data.inv.battle_boxes = 0;

    if (data.inv.battle_boxes < 1) {
      if (isCallback) {
        await ctx.answerCbQuery('No Battle Boxes left', { show_alert: true });
      }
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You do not have any *Battle Box* to open.', {
        reply_to_message_id: ctx.message ? ctx.message.message_id : undefined
      });
      return;
    }

    const summary = openBattleBoxes(data, { tms, stones }, requestedAmount);
    await saveUserData2(uid, data);

    let msg = '*Battle Box Opened:* ' + summary.opened + '\n';
    msg += '*Remaining:* ' + summary.remaining + ' 🎁';

    const b = summary.pokeballsAdded || {};
    const pokeballTotal = Object.keys(b).reduce((acc, key) => acc + (Number(b[key]) || 0), 0);

    if (summary.holowearTicketsAdded > 0) msg += '\n• *Holowear Tickets:* +' + summary.holowearTicketsAdded + ' 🎟️';
    if (pokeballTotal > 0) msg += '\n• *Pokeballs:* +' + pokeballTotal;
    for (const key of Object.keys(b)) {
      const count = Number(b[key]) || 0;
      if (count > 0) msg += '\n  - ' + c(key) + ': +' + count;
    }
    if (summary.tmsAdded > 0) {
      msg += '\n• *TMs:* +' + summary.tmsAdded;
      msg = appendListSection(msg, 'Received', summary.tmsReceived || [], (tm) => 'TM' + tm, 30);
    }
    if (summary.stonesAdded > 0) {
      msg += '\n• *Mega Stones:* +' + summary.stonesAdded;
      msg = appendListSection(msg, 'Received', summary.stonesReceived || [], (st) => c(st), 20);
    }
    if (summary.mintsAdded > 0) {
      msg += '\n• *Nature Mints:* +' + summary.mintsAdded;
      msg = appendListSection(msg, 'Received', summary.mintsReceived || [], (mint) => c(mint), 12);
    }
    if (summary.bottleCapsAdded > 0) msg += '\n• *Bottle Caps:* +' + summary.bottleCapsAdded;
    if (summary.goldBottleCapsAdded > 0) msg += '\n• *Gold Bottle Caps:* +' + summary.goldBottleCapsAdded;

    if (summary.mintsAdded > 0 || summary.bottleCapsAdded > 0 || summary.goldBottleCapsAdded > 0) {
      msg += '\n\n*Use items:*';
      if (summary.mintsAdded > 0) msg += '\n/mint <pokemon|pass|nickname> | <mint name>';
      if (summary.bottleCapsAdded > 0) msg += '\n/bottlecap <pokemon|pass|nickname> | <stat>';
      if (summary.goldBottleCapsAdded > 0) msg += '\n/goldbottlecap <pokemon|pass|nickname>';
    }

    if (msg.length > 3000) {
      msg = buildCompactSummary(summary, pokeballTotal);
    }
    if (msg.length > 3500) {
      msg = msg.slice(0, 3450) + '\n...';
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message ? ctx.message.message_id : undefined,
      reply_markup: { inline_keyboard: buildButtons(uid, summary.remaining) }
    });
  }

  bot.command('battlebox', check, async (ctx) => {
    const arg = String((ctx.message.text || '').split(' ')[1] || '').trim().toLowerCase();
    let requested = 1;

    if (arg === 'all') {
      requested = Number.MAX_SAFE_INTEGER;
    } else if (arg) {
      const parsed = Number(arg);
      if (!Number.isFinite(parsed) || parsed < 1) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /battlebox [amount|all]', {
          reply_to_message_id: ctx.message.message_id
        });
        return;
      }
      requested = Math.floor(parsed);
    }

    await openAndSend(ctx, requested, false);
  });

  bot.action(/^bbopen_(1|5|10|all)_\d+$/, async (ctx) => {
    const dataParts = String(ctx.callbackQuery.data || '').split('_');
    const amountRaw = dataParts[1];
    const id = Number(dataParts[2]);
    if (ctx.from.id !== id) {
      await ctx.answerCbQuery('This button is not for you', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery();

    const requested = amountRaw === 'all' ? Number.MAX_SAFE_INTEGER : Number(amountRaw);
    await openAndSend(ctx, requested, true);
  });
}

module.exports = registerBattleboxCommand;
