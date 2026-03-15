function registerRelearnerCallbacks(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const RELEARN_COST = 0;

  const getRelearnableMoves = (poke) => {
    if (!poke || !pokemoves[poke.name] || !Array.isArray(pokemoves[poke.name].moves_info)) {
      return [];
    }
    const level = plevel(poke.name, poke.exp);
    const ids = [];
    for (const mv of pokemoves[poke.name].moves_info) {
      if (mv.learn_method !== 'level-up' || mv.level_learned_at > level || !dmoves[mv.id]) {
        continue;
      }
      if (!ids.includes(mv.id)) {
        ids.push(mv.id);
      }
    }
    return ids.filter((id) => !poke.moves.includes(parseInt(id)));
  };

  bot.action(/relearn_/, check2q, async (ctx) => {
    const id = parseInt(ctx.callbackQuery.data.split('_')[1]);
    if (ctx.from.id !== id) {
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const pks2 = await sort(ctx.from.id, data.pokes || []);
    const pks = pks2.filter((pk) => getRelearnableMoves(pk).length > 0);
    if (pks.length < 1) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'No pokemon can relearn level-up moves right now.', { parse_mode: 'markdown' });
      return;
    }

    const buttonsPerRow = 5;
    let page = parseInt(ctx.callbackQuery.data.split('_')[2]) || 1;
    const itemsPerPage = 20;
    const totalPages = Math.ceil(pks.length / itemsPerPage);

    if (page < 1 || page > totalPages) {
      ctx.answerCbQuery('Invalid page.');
      return;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, pks.length);
    const pks22 = pks.slice(startIndex, endIndex);

    const inlineKeyboard = [];
    let row = [];

    for (let i = startIndex; i < endIndex; i++) {
      const sortedIndex = pks.indexOf(pks[i]);
      row.push({
        text: `${sortedIndex + 1}`,
        callback_data: `relearnp_${pks[i].pass}_${id}`
      });
      if ((sortedIndex + 1) % buttonsPerRow === 0 || sortedIndex === endIndex - 1) {
        inlineKeyboard.push(row);
        row = [];
      }
    }

    if (page > 1 || endIndex < pks.length) {
      inlineKeyboard.push([
        { text: '<', callback_data: 'relearn_' + id + '_' + (page - 1) },
        { text: '>', callback_data: 'relearn_' + id + '_' + (page + 1) }
      ]);
    }

    if (totalPages > 10) {
      inlineKeyboard.push([
        { text: '(-5) <<', callback_data: 'relearn_' + id + '_' + (page - 5) },
        { text: '>> (+5)', callback_data: 'relearn_' + id + '_' + (page + 5) }
      ]);
    }

    let messageText = `List Of Your Pokes (*Page ${page}*):\n\n`;
    messageText += await pokelist(pks22.map((item) => item.pass), ctx, startIndex);
    messageText += `\n_Select Poke For Relearner_ (*Cost:* Free)`;

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, messageText, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: inlineKeyboard }
    });
  });

  bot.action(/relearnp_/, check2q, async (ctx) => {
    const pass = ctx.callbackQuery.data.split('_')[1];
    const id = parseInt(ctx.callbackQuery.data.split('_')[2]);
    if (ctx.from.id !== id) {
      return;
    }

    const data = await getUserData(ctx.from.id);
    const pk = (data.pokes || []).filter((poke) => poke.pass == pass)[0];
    if (!pk) {
      ctx.answerCbQuery('You do not have this Pokemon.');
      return;
    }

    const relearnable = getRelearnableMoves(pk);
    if (relearnable.length < 1) {
      ctx.answerCbQuery('No relearnable moves for this Pokemon.');
      return;
    }

    let msg = '<b>Pokemon:</b> ' + c(pk.name) + ' (Lv. ' + plevel(pk.name, pk.exp) + ')\n';
    msg += '<b>Cost:</b> Free\n\n';
    msg += '<i>Select a level-up move to relearn:</i>';

    const rows = [];
    const buttons = relearnable.map((mid) => ({
      text: c(dmoves[mid].name),
      callback_data: 'relearnm_' + pass + '_' + mid + '_' + id
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    rows.push([{ text: 'Back', callback_data: 'relearn_' + id + '_1' }]);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: rows }
    });
  });

  bot.action(/relearnm_/, check2q, async (ctx) => {
    const pass = ctx.callbackQuery.data.split('_')[1];
    const moveId = parseInt(ctx.callbackQuery.data.split('_')[2]);
    const id = parseInt(ctx.callbackQuery.data.split('_')[3]);
    if (ctx.from.id !== id) {
      return;
    }

    const data = await getUserData(ctx.from.id);
    const pk = (data.pokes || []).filter((poke) => poke.pass == pass)[0];
    if (!pk) {
      ctx.answerCbQuery('You do not have this Pokemon.');
      return;
    }

    const relearnable = getRelearnableMoves(pk);
    if (!relearnable.includes(moveId)) {
      ctx.answerCbQuery('This move cannot be relearned.');
      return;
    }

    if (pk.moves.length < 4) {
      const move = dmoves[moveId];
      const msg = 'Are you sure to teach <b>' + c(pk.name) + '</b> this move?\n\n' +
        '<b>Move:</b> ' + c(move.name) + ' [' + c(move.type) + ' ' + emojis[move.type] + ']\n' +
        '<b>Power:</b> ' + move.power + ', <b>Accuracy:</b> ' + move.accuracy + '\n' +
        '<b>Cost:</b> Free';

      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[
            { text: 'Confirm', callback_data: 'relearnc_' + pass + '_' + moveId + '_' + id },
            { text: 'Cancel', callback_data: 'relearnp_' + pass + '_' + id }
          ]]
        }
      });
      return;
    }

    let msg = '<b>Pokemon:</b> ' + c(pk.name) + ' (Lv. ' + plevel(pk.name, pk.exp) + ')\n\n';
    msg += '<i>Your Pokemon already knows 4 moves. Select one to replace:</i>';

    const rows = [];
    const buttons = pk.moves.map((knownId) => ({
      text: c(dmoves[knownId].name),
      callback_data: 'relearnf_' + pass + '_' + moveId + '_' + knownId + '_' + id
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    rows.push([{ text: 'Back', callback_data: 'relearnp_' + pass + '_' + id }]);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: rows }
    });
  });

  bot.action(/relearnf_/, check2q, async (ctx) => {
    const pass = ctx.callbackQuery.data.split('_')[1];
    const moveId = parseInt(ctx.callbackQuery.data.split('_')[2]);
    const forgetId = parseInt(ctx.callbackQuery.data.split('_')[3]);
    const id = parseInt(ctx.callbackQuery.data.split('_')[4]);
    if (ctx.from.id !== id) {
      return;
    }

    const data = await getUserData(ctx.from.id);
    const pk = (data.pokes || []).filter((poke) => poke.pass == pass)[0];
    if (!pk) {
      ctx.answerCbQuery('You do not have this Pokemon.');
      return;
    }
    if (!pk.moves.includes(forgetId)) {
      ctx.answerCbQuery('This move is not in your Pokemon set.');
      return;
    }

    const relearnable = getRelearnableMoves(pk);
    if (!relearnable.includes(moveId)) {
      ctx.answerCbQuery('This move cannot be relearned.');
      return;
    }

    const msg = 'Are you sure to replace <b>' + c(dmoves[forgetId].name) + '</b> with <b>' + c(dmoves[moveId].name) + '</b>?\n\n' +
      '<b>Pokemon:</b> ' + c(pk.name) + '\n' +
      '<b>Cost:</b> Free';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Confirm', callback_data: 'relearnc_' + pass + '_' + moveId + '_' + id + '_' + forgetId },
          { text: 'Cancel', callback_data: 'relearnp_' + pass + '_' + id }
        ]]
      }
    });
  });

  bot.action(/relearnc_/, check2q, async (ctx) => {
    const pass = ctx.callbackQuery.data.split('_')[1];
    const moveId = parseInt(ctx.callbackQuery.data.split('_')[2]);
    const id = parseInt(ctx.callbackQuery.data.split('_')[3]);
    const forgetId = ctx.callbackQuery.data.split('_')[4] ? parseInt(ctx.callbackQuery.data.split('_')[4]) : null;

    if (ctx.from.id !== id) {
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const pk = (data.pokes || []).filter((poke) => poke.pass == pass)[0];
    if (!pk) {
      ctx.answerCbQuery('You do not have this Pokemon.');
      return;
    }

    const relearnable = getRelearnableMoves(pk);
    if (!relearnable.includes(moveId)) {
      ctx.answerCbQuery('This move cannot be relearned now.');
      return;
    }

    if (pk.moves.length < 4 && forgetId === null) {
      pk.moves.push(moveId);
    } else {
      if (forgetId === null || !pk.moves.includes(forgetId)) {
        ctx.answerCbQuery('Invalid replace target.');
        return;
      }
      const idx = pk.moves.indexOf(forgetId);
      pk.moves[idx] = moveId;
    }

    data.inv.pc -= RELEARN_COST;
    await saveUserData2(ctx.from.id, data);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id,
      '*Relearner:* *' + c(pk.name) + '* learned *' + c(dmoves[moveId].name) + '*\n*Cost:* Free',
      { parse_mode: 'markdown' }
    );
  });
}

module.exports = registerRelearnerCallbacks;
