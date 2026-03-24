const {
  DAYCARE_CANDY_REDUCTION_MINUTES,
  ensureDaycareState,
  getDaycareSlots,
  getPokemonCurrentLevel,
  cleanupTeamsForPokemon,
  parseEvBuild,
  parseMoveSet,
  estimateDaycarePlan,
  finalizeDaycarePokemon,
  formatEvSummary,
  formatMoveSummary,
  formatDuration,
  formatRemaining,
  grantDaycareClaimCandy,
  spendDaycareCandyOnJob
} = require('../../utils/daycare');

function registerDaycareCallbacks(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function getDaycarePokemon(data, pass) {
    return (data.pokes || []).find((poke) => String(poke.pass) === String(pass));
  }

  function getEligiblePokemon(data) {
    return (data.pokes || []).filter((poke) => poke && poke.pass);
  }

  function buildMenuMessage(data) {
    const daycare = ensureDaycareState(data);
    const info = getDaycareSlots(data, trainerlevel);
    const jobs = daycare.jobs || [];

    let msg = '*Pokemon Daycare*\n';
    msg += `\n*Trainer Level:* ${info.trainerLevel}`;
    msg += `\n*Slots:* ${jobs.length}/${info.slots}`;
    msg += `\n*Daycare Candy:* ${Number(data.inv && data.inv.daycare_candy) || 0}`;
    msg += '\n*Capacity:* Up to 3 daycare pokemon at the same time';
    msg += `\n*Candy Effect:* 1 candy = ${DAYCARE_CANDY_REDUCTION_MINUTES}m less`;
    msg += '\n*Cost:* 500 EXP required = 1 PC, 1 EV = 5 PC';
    msg += '\n*Speed:* 100 EXP = 1s, 1 EV = 10s';
    msg += '\n*Order:* EV training finishes before EXP training starts';

    if (daycare.draft && daycare.draft.step) {
      msg += '\n\n*Pending Setup:* You still have a daycare setup in progress.';
    }

    if (!jobs.length) {
      msg += '\n\nNo pokemon are currently in daycare.';
      return msg;
    }

    msg += '\n\n*Active Jobs:*';
    jobs.forEach((job, index) => {
      const ready = Number(job.readyAt) <= Date.now();
      msg += `\n\n*${index + 1}.* ${c(job.pokemon.name)} (${job.pokemon.pass})`;
      msg += `\nLv. ${job.levelBefore} -> 100`;
      msg += `\nEVs: ${formatEvSummary(job.evs)}`;
      msg += `\nMoves: ${formatMoveSummary(job.moves, dmoves, c)}`;
      msg += `\nCost: ${job.cost} PokeCoins`;
      msg += `\nTime: ${formatDuration(job.durationSeconds || (job.durationMinutes * 60), 'seconds')}`;
      msg += ready ? '\nStatus: *Ready to claim*' : `\nStatus: *${formatRemaining(job.readyAt)} remaining*`;
    });

    return msg;
  }

  function buildMenuKeyboard(data, userId) {
    const daycare = ensureDaycareState(data);
    const info = getDaycareSlots(data, trainerlevel);
    const jobs = daycare.jobs || [];
    const rows = [];

    if (jobs.length < info.slots) {
      rows.push([{ text: 'Deposit Pokemon', callback_data: 'daycare_open_' + userId + '_1' }]);
    }

    const readyJobs = jobs.filter((job) => Number(job.readyAt) <= Date.now());
    if (readyJobs.length) {
      rows.push(readyJobs.slice(0, 3).map((job, idx) => ({
        text: 'Claim ' + (jobs.indexOf(readyJobs[idx]) + 1),
        callback_data: 'daycare_claim_' + readyJobs[idx].id + '_' + userId
      })));
      if (readyJobs.length > 1) {
        rows.push([{ text: 'Claim All Ready', callback_data: 'daycare_claimall_' + userId }]);
      }
    }

    const candy = Number(data.inv && data.inv.daycare_candy) || 0;
    const activeJobs = jobs.filter((job) => Number(job.readyAt) > Date.now());
    if (candy > 0 && activeJobs.length) {
      rows.push(activeJobs.slice(0, 3).map((job) => ({
        text: 'Boost ' + (jobs.indexOf(job) + 1),
        callback_data: 'daycare_speed_' + job.id + '_' + userId
      })));
      if (activeJobs.length > 3) {
        rows.push(activeJobs.slice(3, 6).map((job) => ({
          text: 'Boost ' + (jobs.indexOf(job) + 1),
          callback_data: 'daycare_speed_' + job.id + '_' + userId
        })));
      }
    }

    if (daycare.draft && daycare.draft.step) {
      rows.push([{ text: 'Cancel Pending Setup', callback_data: 'daycare_cancel_' + userId }]);
    }

    rows.push([{ text: 'Refresh', callback_data: 'daycare_menu_' + userId }]);
    return rows;
  }

  async function showDaycareMenu(ctx, userId, mode) {
    const data = await getUserData(userId);
    const text = buildMenuMessage(data);
    const keyboard = buildMenuKeyboard(data, userId);

    if (mode === 'edit') {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, text, {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
      return;
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, text, {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  async function showPokemonPicker(ctx, userId, page) {
    const data = await getUserData(userId);
    const info = getDaycareSlots(data, trainerlevel);
    const daycare = ensureDaycareState(data);

    if ((daycare.jobs || []).length >= info.slots) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'All daycare slots are already full.', {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: [[{ text: 'Back', callback_data: 'daycare_menu_' + userId }]] }
      });
      return;
    }

    const list = await sort(userId, getEligiblePokemon(data));
    if (!list.length) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'You do not have any pokemon to send to daycare.', {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: [[{ text: 'Back', callback_data: 'daycare_menu_' + userId }]] }
      });
      return;
    }

    const itemsPerPage = 20;
    const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
    const safePage = Math.max(1, Math.min(totalPages, Number(page) || 1));
    const startIndex = (safePage - 1) * itemsPerPage;
    const pageItems = list.slice(startIndex, startIndex + itemsPerPage);

    let text = `*Select A Pokemon For Daycare* (Page ${safePage}/${totalPages})\n\n`;
    text += await pokelist(pageItems.map((item) => item.pass), ctx, startIndex);
    text += '\n\nAfter selection, you will be asked for the final *EV build* and *moveset*.';

    const rows = [];
    let row = [];
    for (let i = 0; i < pageItems.length; i += 1) {
      row.push({
        text: String(startIndex + i + 1),
        callback_data: 'daycare_pick_' + pageItems[i].pass + '_' + userId
      });
      if (row.length === 5 || i === pageItems.length - 1) {
        rows.push(row);
        row = [];
      }
    }

    const nav = [];
    if (safePage > 1) nav.push({ text: '<', callback_data: 'daycare_open_' + userId + '_' + (safePage - 1) });
    if (safePage < totalPages) nav.push({ text: '>', callback_data: 'daycare_open_' + userId + '_' + (safePage + 1) });
    if (nav.length) rows.push(nav);
    rows.push([{ text: 'Back', callback_data: 'daycare_menu_' + userId }]);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, text, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: rows }
    });
  }

  bot.action(/^daycare_menu_(\d+)$/, check2q, async (ctx) => {
    const userId = Number(ctx.match[1]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your menu.');
      return;
    }
    await showDaycareMenu(ctx, userId, 'edit');
  });

  bot.action(/^daycare_open_(\d+)_(\d+)$/, check2q, async (ctx) => {
    const userId = Number(ctx.match[1]);
    const page = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your menu.');
      return;
    }
    await showPokemonPicker(ctx, userId, page);
  });

  bot.action(/^daycare_pick_([A-Za-z0-9]+)_(\d+)$/, check2q, async (ctx) => {
    const pass = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button.');
      return;
    }

    const data = await getUserData(userId);
    const pokemon = getDaycarePokemon(data, pass);
    if (!pokemon) {
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }

    const currentLevel = getPokemonCurrentLevel(pokemon, chart, growth_rates);
    if (currentLevel >= 100) {
      await ctx.answerCbQuery('Level 100 pokemon cannot be sent to daycare.');
      return;
    }
    let text = '*Daycare Deposit Preview*\n';
    text += `\n*Pokemon:* ${c(pokemon.nickname || pokemon.name)}`;
    text += `\n*Pass:* ${pokemon.pass}`;
    text += `\n*Current Level:* ${currentLevel}`;
    text += '\n*Target:* Lv. 100';
    text += '\n\nNext step: send the desired *EV build*.';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, text, {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Continue', callback_data: 'daycare_start_' + pass + '_' + userId }],
          [{ text: 'Back', callback_data: 'daycare_open_' + userId + '_1' }]
        ]
      }
    });
  });

  bot.action(/^daycare_start_([A-Za-z0-9]+)_(\d+)$/, check2q, async (ctx) => {
    const pass = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button.');
      return;
    }

    const data = await getUserData(userId);
    const daycare = ensureDaycareState(data);
    const info = getDaycareSlots(data, trainerlevel);
    const pokemon = getDaycarePokemon(data, pass);

    if (!pokemon) {
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }
    if (getPokemonCurrentLevel(pokemon, chart, growth_rates) >= 100) {
      await ctx.answerCbQuery('Level 100 pokemon cannot be sent to daycare.');
      return;
    }
    if ((daycare.jobs || []).length >= info.slots) {
      await ctx.answerCbQuery('All daycare slots are full.');
      return;
    }

    const promptId = await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      'Send the final *EV build* for *' + c(pokemon.nickname || pokemon.name) + '*.\n\nExample:\n`252 atk / 252 spe / 4 hp`',
      { reply_markup: { force_reply: true } }
    );

    daycare.draft = {
      step: 'evs',
      pokemonPass: pass,
      messageId: promptId,
      sourceMessageId: ctx.callbackQuery.message.message_id,
      createdAt: Date.now()
    };
    await saveUserData2(userId, data);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, '*Daycare Setup Started*\n\nReply to the new prompt with your EV build.', {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Cancel Setup', callback_data: 'daycare_cancel_' + userId }]] }
    });
  });

  bot.action(/^daycare_cancel_(\d+)$/, check2q, async (ctx) => {
    const userId = Number(ctx.match[1]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your setup.');
      return;
    }

    const data = await getUserData(userId);
    const daycare = ensureDaycareState(data);
    daycare.draft = null;
    await saveUserData2(userId, data);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Daycare setup cancelled.', {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Back To Daycare', callback_data: 'daycare_menu_' + userId }]] }
    });
  });

  bot.action(/^daycare_confirm_(\d+)$/, check2q, async (ctx) => {
    const userId = Number(ctx.match[1]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your setup.');
      return;
    }

    const data = await getUserData(userId);
    const daycare = ensureDaycareState(data);
    const draft = daycare.draft;
    if (!draft || (draft.step !== 'confirm' && draft.step !== 'moves_ready')) {
      await ctx.answerCbQuery('No pending daycare setup.');
      return;
    }

    const info = getDaycareSlots(data, trainerlevel);
    if ((daycare.jobs || []).length >= info.slots) {
      daycare.draft = null;
      await saveUserData2(userId, data);
      await ctx.answerCbQuery('All daycare slots are full now.');
      return;
    }

    const pokemon = getDaycarePokemon(data, draft.pokemonPass);
    if (!pokemon) {
      daycare.draft = null;
      await saveUserData2(userId, data);
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }

    if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
    const plan = estimateDaycarePlan(pokemon, {
      chart,
      growthRates: growth_rates,
      pokemoves,
      dmoves,
      evs: draft.evs,
      moveIds: draft.moves
    });
    if (data.inv.pc < plan.cost) {
      await ctx.answerCbQuery('Not enough PokeCoins.');
      return;
    }

    data.inv.pc -= plan.cost;
    data.pokes = (data.pokes || []).filter((poke) => String(poke.pass) !== String(pokemon.pass));
    cleanupTeamsForPokemon(data, pokemon.pass);

    const job = {
      id: word(8),
      pokemon: JSON.parse(JSON.stringify(pokemon)),
      levelBefore: plan.currentLevel,
      evs: draft.evs,
      moves: draft.moves,
      cost: plan.cost,
      durationMinutes: plan.durationMinutes,
      durationSeconds: plan.durationSeconds,
      growthRate: plan.growthRate,
      createdAt: Date.now(),
      readyAt: plan.readyAt
    };

    daycare.jobs.push(job);
    daycare.draft = null;
    await saveUserData2(userId, data);

    let msg = '*Pokemon Sent To Daycare*\n';
    msg += `\n*Pokemon:* ${c(pokemon.nickname || pokemon.name)}`;
    msg += `\n*Level:* ${plan.currentLevel} -> 100`;
    msg += `\n*EVs:* ${formatEvSummary(draft.evs)}`;
    msg += `\n*Moves:* ${formatMoveSummary(draft.moves, dmoves, c)}`;
    msg += `\n*Cost:* ${plan.cost} PokeCoins`;
    msg += `\n*Training Time:* ${formatDuration(plan.durationSeconds, 'seconds')}`;
    msg += `\n*Ready In:* ${formatRemaining(plan.readyAt)}`;

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Back To Daycare', callback_data: 'daycare_menu_' + userId }]] }
    });
  });

  bot.action(/^daycare_claim_([A-Za-z0-9]+)_(\d+)$/, check2q, async (ctx) => {
    const jobId = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button.');
      return;
    }

    const data = await getUserData(userId);
    const daycare = ensureDaycareState(data);
    const index = (daycare.jobs || []).findIndex((job) => String(job.id) === String(jobId));
    if (index < 0) {
      await ctx.answerCbQuery('Daycare job not found.');
      return;
    }

    const job = daycare.jobs[index];
    if (Number(job.readyAt) > Date.now()) {
      await ctx.answerCbQuery('This pokemon is still training.');
      return;
    }

    const pokemon = finalizeDaycarePokemon(job.pokemon, job.evs, job.moves, chart, growth_rates, chains, forms, pokes);
    data.pokes = data.pokes || [];
    data.pokes.push(pokemon);
    daycare.jobs.splice(index, 1);
    const candyReward = grantDaycareClaimCandy(data, 1);
    await saveUserData2(userId, data);

    let msg = '*Daycare Claim Complete*\n';
    msg += `\n*Pokemon:* ${c(pokemon.nickname || pokemon.name)}`;
    msg += '\n*Final Level:* 100';
    msg += `\n*EVs:* ${formatEvSummary(job.evs)}`;
    msg += `\n*Moves:* ${formatMoveSummary(job.moves, dmoves, c)}`;
    msg += `\n*Daycare Claims:* ${candyReward.totalClaims}`;
    if (candyReward.granted > 0) {
      msg += `\n*Bonus:* +${candyReward.granted} Daycare Candy`;
    }

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Back To Daycare', callback_data: 'daycare_menu_' + userId }]] }
    });
  });

  bot.action(/^daycare_claimall_(\d+)$/, check2q, async (ctx) => {
    const userId = Number(ctx.match[1]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button.');
      return;
    }

    const data = await getUserData(userId);
    const daycare = ensureDaycareState(data);
    const readyJobs = (daycare.jobs || []).filter((job) => Number(job.readyAt) <= Date.now());
    if (!readyJobs.length) {
      await ctx.answerCbQuery('No daycare pokemon are ready.');
      return;
    }

    data.pokes = data.pokes || [];
    for (const job of readyJobs) {
      data.pokes.push(finalizeDaycarePokemon(job.pokemon, job.evs, job.moves, chart, growth_rates, chains, forms, pokes));
    }
    daycare.jobs = (daycare.jobs || []).filter((job) => Number(job.readyAt) > Date.now());
    const candyReward = grantDaycareClaimCandy(data, readyJobs.length);
    await saveUserData2(userId, data);

    let msg = '*Claimed All Ready Daycare Pokemon*\n';
    readyJobs.forEach((job, index) => {
      msg += `\n\n*${index + 1}.* ${c(job.pokemon.nickname || job.pokemon.name)}`;
      msg += '\nLv. 100';
      msg += `\nEVs: ${formatEvSummary(job.evs)}`;
      msg += `\nMoves: ${formatMoveSummary(job.moves, dmoves, c)}`;
    });
    msg += `\n\n*Daycare Claims:* ${candyReward.totalClaims}`;
    if (candyReward.granted > 0) {
      msg += `\n*Bonus:* +${candyReward.granted} Daycare Candy`;
    }

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Back To Daycare', callback_data: 'daycare_menu_' + userId }]] }
    });
  });

  bot.action(/^daycare_speed_([A-Za-z0-9]+)_(\d+)$/, check2q, async (ctx) => {
    const jobId = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button.');
      return;
    }

    const data = await getUserData(userId);
    const spedUp = spendDaycareCandyOnJob(data, jobId);
    if (!spedUp.ok) {
      await ctx.answerCbQuery(spedUp.error);
      return;
    }

    await saveUserData2(userId, data);
    await ctx.answerCbQuery('-' + spedUp.reducedMinutes + 'm daycare time');
    await showDaycareMenu(ctx, userId, 'edit');
  });

  bot.on('text', async (ctx, next) => {
    const text = String(ctx.message && ctx.message.text ? ctx.message.text : '');
    if (!text || text.startsWith('/')) {
      await next();
      return;
    }

    const data = await getUserData(ctx.from.id);
    const daycare = ensureDaycareState(data);
    const draft = daycare.draft;
    if (!draft || !draft.step) {
      await next();
      return;
    }

    if (!ctx.message.reply_to_message || Number(ctx.message.reply_to_message.message_id) !== Number(draft.messageId)) {
      await next();
      return;
    }

    const pokemon = getDaycarePokemon(data, draft.pokemonPass);
    if (!pokemon) {
      daycare.draft = null;
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'That pokemon is no longer available for daycare setup.');
      return;
    }

    if (draft.step === 'evs') {
      const parsed = parseEvBuild(text);
      if (!parsed.ok) {
        const retryId = await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, parsed.error + '\n\nTry again with something like:\n`252 atk / 252 spe / 4 hp`', {
          reply_markup: { force_reply: true }
        });
        draft.messageId = retryId;
        await saveUserData2(ctx.from.id, data);
        return;
      }

      draft.evs = parsed.evs;
      draft.step = 'moves';
      const promptId = await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'EV build saved for *' + c(pokemon.nickname || pokemon.name) + '*.\n\nNow send the final moveset as *1 to 4 move names separated by commas*.\nExample:\n`earthquake, stone-edge, stealth-rock, crunch`\n\nOnly moves this pokemon can actually learn will be accepted.',
        { reply_markup: { force_reply: true } }
      );
      draft.messageId = promptId;
      await saveUserData2(ctx.from.id, data);
      return;
    }

    if (draft.step === 'moves') {
      const parsed = parseMoveSet(text, pokemon.name, pokemoves, dmoves, chains);
      if (!parsed.ok) {
        const retryId = await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, parsed.error + '\n\nSend the moves again as a comma-separated list.', {
          reply_markup: { force_reply: true }
        });
        draft.messageId = retryId;
        await saveUserData2(ctx.from.id, data);
        return;
      }

      draft.moves = parsed.moveIds;

      if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
      const plan = estimateDaycarePlan(pokemon, {
        chart,
        growthRates: growth_rates,
        pokemoves,
        dmoves,
        evs: draft.evs,
        moveIds: draft.moves
      });

      if (data.inv.pc < plan.cost) {
        const shortfall = plan.cost - data.inv.pc;
        daycare.draft = null;
        await saveUserData2(ctx.from.id, data);
        await sendMessage(
          ctx,
          ctx.chat.id,
          { parse_mode: 'markdown' },
          '*Daycare setup stopped.*\n'
          + '\nYour EVs and moveset were valid, but you do not have enough *PokeCoins* to start training.'
          + `\n\n*Pokemon:* ${c(pokemon.nickname || pokemon.name)}`
          + `\n*Cost:* ${plan.cost} PokeCoins`
          + `\n*Your PokeCoins:* ${data.inv.pc}`
          + `\n*Need More:* ${shortfall}`,
          { reply_markup: { inline_keyboard: [[{ text: 'Back To Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] } }
        );
        return;
      }

      data.inv.pc -= plan.cost;
      data.pokes = (data.pokes || []).filter((poke) => String(poke.pass) !== String(pokemon.pass));
      cleanupTeamsForPokemon(data, pokemon.pass);

      const job = {
        id: word(8),
        pokemon: JSON.parse(JSON.stringify(pokemon)),
        levelBefore: plan.currentLevel,
        evs: draft.evs,
        moves: draft.moves,
        cost: plan.cost,
        durationMinutes: plan.durationMinutes,
        durationSeconds: plan.durationSeconds,
        growthRate: plan.growthRate,
        createdAt: Date.now(),
        readyAt: plan.readyAt
      };

      daycare.jobs.push(job);
      daycare.draft = null;
      await saveUserData2(ctx.from.id, data);

      let msg = '*Pokemon Sent To Daycare*\n';
      msg += `\n*Pokemon:* ${c(pokemon.nickname || pokemon.name)}`;
      msg += `\n*Level:* ${plan.currentLevel} -> 100`;
      msg += `\n*EVs:* ${formatEvSummary(job.evs)}`;
      msg += `\n*Moves:* ${formatMoveSummary(job.moves, dmoves, c)}`;
      msg += `\n*Cost:* ${plan.cost} PokeCoins`;
      msg += `\n*Training Time:* ${formatDuration(plan.durationSeconds, 'seconds')}`;
      msg += `\n*Ready In:* ${formatRemaining(plan.readyAt)}`;

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
        reply_markup: { inline_keyboard: [[{ text: 'Back To Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] }
      });
      return;
    }

    await next();
  });
}

module.exports = registerDaycareCallbacks;
