const {
  ensureDaycareState,
  getDaycareSlots,
  formatRemaining,
  getPokemonCurrentLevel,
  estimateDaycarePlan,
  formatEvSummary,
  formatMoveSummary,
  formatDuration,
  getEvTotal,
  getLearnableMoveMap,
  cleanupTeamsForPokemon,
  grantDaycareClaimCandy
} = require('../../utils/daycare');

const DAYCARE_BLOCKED_FORM_TOKENS = [
  'ash',
  'battle-bond',
  'busted',
  'complete',
  'crowned',
  'eternamax',
  'gmax',
  'mega',
  'origin',
  'primal',
  'starter',
  'totem',
  'zen'
];

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getBaseSpeciesName(name, forms) {
  const key = normalizeName(name);
  if (forms && forms[key]) return key;
  for (const [baseName, rows] of Object.entries(forms || {})) {
    if (!Array.isArray(rows)) continue;
    if (rows.some((entry) => normalizeName(entry && entry.identifier) === key)) {
      return normalizeName(baseName);
    }
  }
  return key;
}

function getFormCandidates(speciesKey, forms) {
  const key = normalizeName(speciesKey);
  const rows = Array.isArray(forms && forms[key]) ? forms[key] : [];
  return rows.filter((entry) => {
    if (!entry) return false;
    if (String(entry.is_battle_only) === '1') return false;
    const identifier = normalizeName(entry.identifier);
    const formIdentifier = normalizeName(entry.form_identifier);
    return !DAYCARE_BLOCKED_FORM_TOKENS.some((tok) => identifier.includes(tok) || formIdentifier.includes(tok));
  });
}

function pickRandomEvolutionForm(speciesKey, forms) {
  const candidates = getFormCandidates(speciesKey, forms);
  if (!candidates.length) return normalizeName(speciesKey);
  if (candidates.length === 1) return normalizeName(candidates[0].identifier);
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return normalizeName(pick.identifier);
}

function getFinalEvolutionNameRandom(startName, chains, forms) {
  let current = getBaseSpeciesName(startName, forms);
  let guard = 0;
  while (guard < 10) {
    guard += 1;
    const evo = (chains && Array.isArray(chains.evolution_chains))
      ? chains.evolution_chains.find((row) =>
        normalizeName(row.current_pokemon) === current
        && normalizeName(row.evolution_method) === 'level-up'
        && Number(row.evolution_level) <= 100
      )
      : null;
    if (!evo) break;
    const nextBase = normalizeName(evo.evolved_pokemon);
    current = pickRandomEvolutionForm(nextBase, forms) || nextBase;
  }
  return current;
}

function getJobDisplayName(job, c) {
  const maybePokemon = job && (job.pokemon || job.poke || job.pk);
  const rawName =
    (job && (job.nickname || job.name || job.species)) ||
    (maybePokemon && (maybePokemon.nickname || maybePokemon.name)) ||
    'Pokemon';
  return c(String(rawName).replace(/-/g, ' '));
}

function renderMenu(data, trainerlevel, c) {
  const daycare = ensureDaycareState(data);
  const info = getDaycareSlots(data, trainerlevel);
  const jobs = Array.isArray(daycare.jobs) ? daycare.jobs : [];

  let msg = '*Daycare Menu*\n';
  msg += `\n*Trainer Level:* ${info.trainerLevel}`;
  msg += `\n*Slots:* ${info.slots}`;
  msg += `\n*Active Jobs:* ${jobs.length}/${info.slots}`;
  msg += `\n*Daycare Candy:* ${data.inv.daycare_candy}`;

  if (!jobs.length) {
    msg += '\n\n_No daycare jobs yet._';
    return msg;
  }

  msg += '\n\n*Jobs:*';
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const readyAt = Number(job && job.readyAt) || 0;
    const isReady = readyAt > 0 && readyAt <= Date.now();
    const status = isReady ? '*Ready*' : (readyAt ? `Time left: ${formatRemaining(readyAt)}` : 'In progress');
    msg += `\n${i + 1}. ${getJobDisplayName(job, c)} - ${status}`;
  }

  return msg;
}

function buildMovesPool(pokemonName, pokemoves, dmoves, chains) {
  const moveMap = getLearnableMoveMap(pokemonName, pokemoves, dmoves, chains);
  const list = [];
  for (const [key, id] of moveMap.entries()) {
    const move = dmoves && dmoves[String(id)];
    const label = move && move.name ? move.name : key.replace(/-/g, ' ');
    list.push({ id: Number(id), name: label });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function renderMovesMenu(ctx, state, deps, page) {
  const { editMessage, dmoves, c } = deps;
  const selected = Array.isArray(state.selectedMoves) ? state.selectedMoves : [];
  const moves = Array.isArray(state.learnableMoves) ? state.learnableMoves : [];
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(moves.length / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * perPage;
  const pageMoves = moves.slice(start, start + perPage);

  let msg = '*Select Moves* (1-4)\n';
  if (selected.length) {
    const pickedNames = selected.map((id) => c(dmoves[String(id)]?.name || 'Move ' + id));
    msg += '\n*Selected:* ' + pickedNames.join(', ');
  } else {
    msg += '\n*Selected:* None';
  }
  msg += `\n\n_Page ${safePage}/${totalPages}_`;

  const rows = [];
  let row = [];
  for (const mv of pageMoves) {
    const isSelected = selected.includes(mv.id);
    row.push({
      text: (isSelected ? '✅ ' : '') + c(mv.name),
      callback_data: 'daycare_move_toggle_' + mv.id + '_' + ctx.from.id + '_' + safePage
    });
    if (row.length === 2) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);

  if (totalPages > 1) {
    rows.push([
      { text: '<', callback_data: 'daycare_moves_' + ctx.from.id + '_' + (safePage - 1) },
      { text: '>', callback_data: 'daycare_moves_' + ctx.from.id + '_' + (safePage + 1) }
    ]);
  }

  rows.push([
    { text: 'Done', callback_data: 'daycare_moves_done_' + ctx.from.id },
    { text: 'Back', callback_data: 'daycare_menu_' + ctx.from.id }
  ]);

  return editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
    parse_mode: 'markdown',
    reply_markup: { inline_keyboard: rows }
  });
}

function registerDaycareMenuCallbacks(bot, deps) {
  const {
    check2q,
    getUserData,
    saveUserData2,
    editMessage,
    sendMessage,
    trainerlevel,
    c,
    sort,
    pokelist,
    pokemoves,
    dmoves,
    chains,
    forms,
    growth_rates,
    chart,
    pokes,
    daycareState
  } = deps;

  bot.action(/^daycare_menu_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data || !data.inv) {
      await ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const msg = renderMenu(data, trainerlevel, c);
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Add', callback_data: 'daycare_add_' + ctx.from.id + '_1' },
          { text: 'Remove', callback_data: 'daycare_remove_' + ctx.from.id + '_1' }
        ],
        [
          { text: 'Refresh', callback_data: 'daycare_menu_' + ctx.from.id },
          { text: 'Close', callback_data: 'daycare_close_' + ctx.from.id }
        ]
      ]
    };

    await editMessage(
      'text',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      msg,
      { parse_mode: 'markdown', reply_markup: keyboard }
    );
  });

  bot.action(/^daycare_close_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }
    try {
      await ctx.deleteMessage();
    } catch (e) {
      await ctx.answerCbQuery();
    }
  });

  bot.action(/^daycare_add_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    const page = Number(parts[3]) || 1;
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data || !data.inv) {
      await ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const daycare = ensureDaycareState(data);
    const info = getDaycareSlots(data, trainerlevel);
    const slotsLeft = info.slots - (daycare.jobs || []).length;
    if (slotsLeft <= 0) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Your daycare is full.', { parse_mode: 'markdown' });
      return;
    }

    const rbList = data.extra && Array.isArray(data.extra.randombattle_pokes) ? data.extra.randombattle_pokes : [];
    const eligible = (data.pokes || []).filter((pk) => {
      if (pk.temp_battle) return false;
      if (rbList.includes(pk.pass)) return false;
      const lvl = getPokemonCurrentLevel(pk, chart, growth_rates);
      return lvl < 100;
    });

    if (!eligible.length) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'No eligible pokemon (not level 100) available.', { parse_mode: 'markdown' });
      return;
    }

    const sorted = await sort(ctx.from.id, eligible);
    const pageSize = 20;
    const totalPages = Math.ceil(sorted.length / pageSize);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);

    const rows = [];
    let row = [];
    for (let i = 0; i < pageItems.length; i += 1) {
      const index = start + i + 1;
      row.push({
        text: String(index),
        callback_data: 'daycare_pick_' + pageItems[i].pass + '_' + ctx.from.id + '_' + safePage
      });
      if (row.length === 5) {
        rows.push(row);
        row = [];
      }
    }
    if (row.length) rows.push(row);

    if (totalPages > 1) {
      rows.push([
        { text: '<', callback_data: 'daycare_add_' + ctx.from.id + '_' + (safePage - 1) },
        { text: '>', callback_data: 'daycare_add_' + ctx.from.id + '_' + (safePage + 1) }
      ]);
    }

    rows.push([{ text: 'Back', callback_data: 'daycare_menu_' + ctx.from.id }]);

    const totalOwned = (data.pokes || []).length;
    let msg = `*Select Pokemon* (Slots left: ${slotsLeft})\n`;
    msg += `*Eligible:* ${eligible.length}/${totalOwned}`;
    msg += `\n_Excludes level 100, random battle, and temp battle pokes._\n\n`;
    msg += await pokelist(pageItems.map((item) => item.pass), ctx, start);
    msg += '\n_Select Pokemon for Daycare_';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: rows }
    });
  });

  bot.action(/^daycare_pick_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const pass = parts[2];
    const id = parts[3];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }
    const data = await getUserData(ctx.from.id);
    const poke = (data.pokes || []).find((pk) => pk.pass === pass);
    if (!poke) {
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }
    const lvl = getPokemonCurrentLevel(poke, chart, growth_rates);
    if (lvl >= 100) {
      await ctx.answerCbQuery('This pokemon is already level 100.');
      return;
    }

    const prompt = 'Send EV spread (max 510).\nExample: `252 atk / 252 spe / 4 hp`';
    const messageId = await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, prompt, { reply_markup: { force_reply: true } });
    daycareState.set(ctx.from.id, {
      step: 'ev',
      pass,
      messageId,
      _ts: Date.now()
    });
  });

  bot.action(/^daycare_evo_yes_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[3];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const state = daycareState.get(ctx.from.id);
    if (!state || !state.pass) {
      await ctx.answerCbQuery('Daycare session expired.');
      return;
    }

    const data = await getUserData(ctx.from.id);
    const poke = (data.pokes || []).find((pk) => pk.pass === state.pass);
    if (!poke) {
      daycareState.delete(ctx.from.id);
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }

    state.evolveChoice = true;
    state.finalEvolutionName = getFinalEvolutionNameRandom(poke.name, chains, forms);
    state.step = 'moves';
    state._ts = Date.now();
    daycareState.set(ctx.from.id, state);

    let msg = '*Evolution Selected: Yes*';
    msg += '\n\nFinal form will be: *' + c(state.finalEvolutionName.replace(/-/g, ' ')) + '*';
    msg += '\n\nSelect moves for your daycare pokemon:';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Select Moves', callback_data: 'daycare_moves_' + ctx.from.id + '_1' }]] }
    });
  });

  bot.action(/^daycare_evo_no_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[3];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const state = daycareState.get(ctx.from.id);
    if (!state || !state.pass) {
      await ctx.answerCbQuery('Daycare session expired.');
      return;
    }

    state.evolveChoice = false;
    state.finalEvolutionName = null;
    state.step = 'moves';
    state._ts = Date.now();
    daycareState.set(ctx.from.id, state);

    let msg = '*Evolution Selected: No*';
    msg += '\n\nSelect moves for your daycare pokemon:';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Select Moves', callback_data: 'daycare_moves_' + ctx.from.id + '_1' }]] }
    });
  });

  bot.action(/^daycare_moves_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    const page = Number(parts[3]) || 1;
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const state = daycareState.get(ctx.from.id);
    if (!state || !state.pass || state.step !== 'moves') {
      await ctx.answerCbQuery('Daycare session expired.');
      return;
    }

    const data = await getUserData(ctx.from.id);
    const poke = (data.pokes || []).find((pk) => pk.pass === state.pass);
    if (!poke) {
      daycareState.delete(ctx.from.id);
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }

    if (!state.learnableMoves) {
      state.learnableMoves = buildMovesPool(poke.name, pokemoves, dmoves, chains);
      state.selectedMoves = [];
    }

    state._ts = Date.now();
    daycareState.set(ctx.from.id, state);
    await renderMovesMenu(ctx, state, deps, page);
  });

  bot.action(/^daycare_move_toggle_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const moveId = Number(parts[3]);
    const id = parts[4];
    const page = Number(parts[5]) || 1;
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const state = daycareState.get(ctx.from.id);
    if (!state || state.step !== 'moves') {
      await ctx.answerCbQuery('Daycare session expired.');
      return;
    }

    const selected = Array.isArray(state.selectedMoves) ? state.selectedMoves : [];
    if (selected.includes(moveId)) {
      state.selectedMoves = selected.filter((id2) => id2 !== moveId);
    } else {
      if (selected.length >= 4) {
        await ctx.answerCbQuery('Max 4 moves.');
        return;
      }
      state.selectedMoves = [...selected, moveId];
    }
    state._ts = Date.now();
    daycareState.set(ctx.from.id, state);
    await renderMovesMenu(ctx, state, deps, page);
  });

  bot.action(/^daycare_moves_done_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[3];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const state = daycareState.get(ctx.from.id);
    if (!state || state.step !== 'moves') {
      await ctx.answerCbQuery('Daycare session expired.');
      return;
    }

    const selected = Array.isArray(state.selectedMoves) ? state.selectedMoves : [];
    if (selected.length < 1) {
      await ctx.answerCbQuery('Select at least 1 move.');
      return;
    }

    const data = await getUserData(ctx.from.id);
    const poke = (data.pokes || []).find((pk) => pk.pass === state.pass);
    if (!poke) {
      daycareState.delete(ctx.from.id);
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }

    const allMoves = (state.learnableMoves || []).map((mv) => mv.id);
    const finalMoves = selected.slice(0, 4);
    while (finalMoves.length < 4 && allMoves.length) {
      const remaining = allMoves.filter((id2) => !finalMoves.includes(id2));
      if (!remaining.length) break;
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      finalMoves.push(pick);
    }

    const plan = estimateDaycarePlan(poke, {
      chart,
      growthRates: growth_rates,
      evs: state.evs,
      moveIds: finalMoves
    });

    const evTotal = getEvTotal(state.evs);
    const expCost = Math.ceil(plan.expRequired / 500);
    const evCost = evTotal * 5;
    const totalCost = expCost + evCost;

    state.finalMoves = finalMoves;
    state.plan = plan;
    state.step = 'confirm';
    state._ts = Date.now();
    daycareState.set(ctx.from.id, state);

    let msg = '*Daycare Preview*\n';
    msg += '\n*Pokemon:* ' + c(poke.nickname || poke.name);
    msg += '\n*Evolve:* ' + (state.evolveChoice ? 'Yes' : 'No');
    if (state.evolveChoice && state.finalEvolutionName) {
      msg += '\n*Final Form:* ' + c(state.finalEvolutionName.replace(/-/g, ' '));
    }
    msg += '\n*EVs:* ' + formatEvSummary(state.evs);
    msg += '\n*Moves:* ' + formatMoveSummary(finalMoves, dmoves, c);
    msg += '\n\n*Training Cost:*';
    msg += '\n• Every *500 EXP required* costs *1 PC*';
    msg += '\n• Every *1 EV* costs *5 PC*';
    msg += `\n*Total Cost:* ${totalCost} PC`;
    msg += '\n\n*Training Time:*';
    msg += '\n• Every *100 EXP* takes *1 second*';
    msg += '\n• Every *1 EV* takes *10 seconds*';
    msg += '\n*Total Time:* ' + formatDuration(plan.durationSeconds, 'seconds');

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Confirm', callback_data: 'daycare_confirm_' + ctx.from.id },
          { text: 'Cancel', callback_data: 'daycare_cancel_' + ctx.from.id }
        ]]
      }
    });
  });

  bot.action(/^daycare_confirm_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const state = daycareState.get(ctx.from.id);
    if (!state || state.step !== 'confirm') {
      await ctx.answerCbQuery('Daycare session expired.');
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data || !data.inv) {
      await ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const daycare = ensureDaycareState(data);
    const info = getDaycareSlots(data, trainerlevel);
    if ((daycare.jobs || []).length >= info.slots) {
      await ctx.answerCbQuery('Daycare is full.');
      return;
    }

    const pokeIndex = (data.pokes || []).findIndex((pk) => pk.pass === state.pass);
    if (pokeIndex < 0) {
      await ctx.answerCbQuery('Pokemon not found.');
      return;
    }

    const plan = state.plan;
    const evTotal = getEvTotal(state.evs);
    const expCost = Math.ceil(plan.expRequired / 500);
    const evCost = evTotal * 5;
    const totalCost = expCost + evCost;

    if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
    if (data.inv.pc < totalCost) {
      await ctx.answerCbQuery('Not enough PokeCoins.');
      return;
    }

    const pokemon = data.pokes[pokeIndex];
    const job = {
      id: String(Date.now()) + '_' + Math.floor(Math.random() * 10000),
      createdAt: Date.now(),
      readyAt: plan.readyAt,
      pokemon: JSON.parse(JSON.stringify(pokemon)),
      evs: state.evs,
      moveIds: state.finalMoves,
      evolve: !!state.evolveChoice,
      finalEvolutionName: state.finalEvolutionName || null
    };

    data.inv.pc -= totalCost;
    data.pokes.splice(pokeIndex, 1);
    cleanupTeamsForPokemon(data, pokemon.pass);
    daycare.jobs.push(job);
    await saveUserData2(ctx.from.id, data);
    daycareState.delete(ctx.from.id);

    let msg = '*Daycare Started!*';
    msg += '\n\n*Pokemon:* ' + c(pokemon.nickname || pokemon.name);
    msg += '\n*Ready In:* ' + formatRemaining(plan.readyAt);
    msg += `\n*Cost:* ${totalCost} PC`;

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Open Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] }
    });
  });

  bot.action(/^daycare_cancel_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }
    daycareState.delete(ctx.from.id);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Daycare setup cancelled.', { parse_mode: 'markdown' });
  });

  bot.action(/^daycare_remove_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const id = parts[2];
    const page = Number(parts[3]) || 1;
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const data = await getUserData(ctx.from.id);
    const daycare = ensureDaycareState(data);
    const jobs = Array.isArray(daycare.jobs) ? daycare.jobs : [];
    if (!jobs.length) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'No daycare jobs to remove.', { parse_mode: 'markdown' });
      return;
    }

    const pageSize = 10;
    const totalPages = Math.ceil(jobs.length / pageSize);
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    const pageJobs = jobs.slice(start, start + pageSize);

    let msg = '*Daycare Jobs*\n\n';
    for (let i = 0; i < pageJobs.length; i += 1) {
      const job = pageJobs[i];
      const readyAt = Number(job.readyAt) || 0;
      const isReady = readyAt > 0 && readyAt <= Date.now();
      msg += `${start + i + 1}. ${getJobDisplayName(job, c)} - ${isReady ? '*Ready*' : `Time left: ${formatRemaining(readyAt)}`}\n`;
    }

    const rows = [];
    let row = [];
    for (let i = 0; i < pageJobs.length; i += 1) {
      row.push({
        text: String(start + i + 1),
        callback_data: 'daycare_remove_pick_' + pageJobs[i].id + '_' + ctx.from.id + '_' + safePage
      });
      if (row.length === 5) {
        rows.push(row);
        row = [];
      }
    }
    if (row.length) rows.push(row);

    if (totalPages > 1) {
      rows.push([
        { text: '<', callback_data: 'daycare_remove_' + ctx.from.id + '_' + (safePage - 1) },
        { text: '>', callback_data: 'daycare_remove_' + ctx.from.id + '_' + (safePage + 1) }
      ]);
    }
    rows.push([{ text: 'Back', callback_data: 'daycare_menu_' + ctx.from.id }]);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: rows }
    });
  });

  bot.action(/^daycare_remove_pick_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const jobId = parts[3];
    const id = parts[4];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const data = await getUserData(ctx.from.id);
    const daycare = ensureDaycareState(data);
    const jobs = Array.isArray(daycare.jobs) ? daycare.jobs : [];
    const idx = jobs.findIndex((job) => String(job.id) === String(jobId));
    if (idx < 0) {
      await ctx.answerCbQuery('Job not found.');
      return;
    }

    const job = jobs[idx];
    const readyAt = Number(job.readyAt) || 0;
    if (readyAt > 0 && readyAt <= Date.now()) {
      const finalName = job.evolve
        ? (job.finalEvolutionName || getFinalEvolutionNameRandom(job.pokemon.name, chains, forms))
        : normalizeName(job.pokemon.name);

      const trained = JSON.parse(JSON.stringify(job.pokemon));
      trained.name = finalName;
      if (pokes && pokes[finalName] && Number.isFinite(Number(pokes[finalName].pokedex_number))) {
        trained.id = pokes[finalName].pokedex_number;
      }
      const growth = growth_rates[finalName];
      if (growth && chart[growth.growth_rate] && Number.isFinite(Number(chart[growth.growth_rate][100]))) {
        trained.exp = Number(chart[growth.growth_rate][100]);
      }
      trained.evs = job.evs || trained.evs;
      trained.moves = Array.isArray(job.moveIds) ? job.moveIds.slice(0, 4).map((id2) => Number(id2)) : trained.moves;

      const daycareInfo = ensureDaycareState(data);
      const beforeCount = Number(daycareInfo.claimedCount) || 0;
      const nickname = 'daycare' + (beforeCount + 1);
      trained.nickname = nickname;

      data.pokes.push(trained);
      jobs.splice(idx, 1);
      grantDaycareClaimCandy(data, 1);
      await saveUserData2(ctx.from.id, data);

      const msg = '*Daycare Complete!*' +
        '\n\n*Pokemon:* ' + c(trained.nickname || trained.name) +
        '\n*Added to your collection.*';

      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: [[{ text: 'Open Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] }
      });
      return;
    }

    let msg = '*Cancel Daycare?*';
    msg += '\n\nThis pokemon is not ready yet.';
    msg += '\nDo you want to remove it from daycare? (No refund)';

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Yes', callback_data: 'daycare_cancel_job_' + jobId + '_' + ctx.from.id },
          { text: 'No', callback_data: 'daycare_remove_' + ctx.from.id + '_1' }
        ]]
      }
    });
  });

  bot.action(/^daycare_cancel_job_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const jobId = parts[3];
    const id = parts[4];
    if (String(id) !== String(ctx.from.id)) {
      await ctx.answerCbQuery();
      return;
    }

    const data = await getUserData(ctx.from.id);
    const daycare = ensureDaycareState(data);
    const jobs = Array.isArray(daycare.jobs) ? daycare.jobs : [];
    const idx = jobs.findIndex((job) => String(job.id) === String(jobId));
    if (idx < 0) {
      await ctx.answerCbQuery('Job not found.');
      return;
    }

    const job = jobs[idx];
    if (job && job.pokemon) {
      data.pokes.push(job.pokemon);
    }
    jobs.splice(idx, 1);
    await saveUserData2(ctx.from.id, data);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Daycare job removed.', {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: [[{ text: 'Open Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] }
    });
  });
}

module.exports = registerDaycareMenuCallbacks;
