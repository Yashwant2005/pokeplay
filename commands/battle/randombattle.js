function registerRandomBattleCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, editMessage, loadMessageData, loadBattleData, saveBattleData, spawn, forms, pokes, pokemoves, dmoves, growth_rates, chart, word, getRandomNature, generateRandomIVs, c, he, chains, region } = deps;
  const { isBaseIdentifier } = require('../../utils/base_form_pokemon');

  const REGION_RANGES = {
    kanto: { start: 1, end: 151 },
    johto: { start: 152, end: 251 },
    hoenn: { start: 252, end: 386 },
    sinnoh: { start: 387, end: 493 },
    unova: { start: 494, end: 649 },
    kalos: { start: 650, end: 721 },
    alola: { start: 722, end: 809 },
    galar: { start: 810, end: 898 },
    paldea: { start: 899, end: 1025 }
  };

  const evolvesFrom = new Set(
    (chains?.evolution_chains || []).map((e) => String(e.current_pokemon || '').toLowerCase())
  );

  function isFinalEvolution(name) {
    if (!name) return false;
    return !evolvesFrom.has(String(name).toLowerCase());
  }

  const LEGENDARY_SET = new Set(['legendry', 'legendary', 'mythical']);

  function isLegendary(name) {
    const tag = String(spawn?.[name] || '').toLowerCase();
    return LEGENDARY_SET.has(tag);
  }

  function pickRandom(list, count) {
    const copy = [...list];
    const out = [];
    while (out.length < count && copy.length > 0) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  function getLevelUpMoves(name, level) {
    const moveSet = pokemoves[name];
    if (!moveSet || !Array.isArray(moveSet.moves_info)) return [];
    const levelUp = moveSet.moves_info.filter((m) =>
      m.learn_method === 'level-up' &&
      Number(m.level_learned_at) <= Number(level)
    );
    if (levelUp.length > 0) {
      const count = Math.min(4, levelUp.length);
      return levelUp.slice(-count).map((m) => Number(m.id));
    }
    const any = moveSet.moves_info[0];
    return any ? [Number(any.id)] : [];
  }

  const FALLBACK_MOVES = Object.keys(dmoves || {})
    .map((k) => Number(k))
    .filter((id) => !!dmoves[id]);

  function ensureMoves(moves) {
    const out = Array.isArray(moves) ? moves.filter((id) => Number.isFinite(Number(id))) : [];
    const max = 4;
    if (out.length >= max) return out.slice(0, max);
    if (FALLBACK_MOVES.length < 1) return out;
    const pool = FALLBACK_MOVES.filter((id) => !out.includes(id));
    while (out.length < max) {
      const src = pool.length > 0 ? pool : FALLBACK_MOVES;
      const pick = src[Math.floor(Math.random() * src.length)];
      if (!out.includes(pick)) {
        out.push(pick);
        const idx = pool.indexOf(pick);
        if (idx >= 0) pool.splice(idx, 1);
      }
      if (src.length === 0) break;
    }
    return out;
  }

  function buildRandomPokemon(name, level) {
    const g = growth_rates[name];
    const exp = chart[g.growth_rate][String(level)] || chart[g.growth_rate][level];
    const ivs = generateRandomIVs((spawn[name] || '').toLowerCase());
    const nat = getRandomNature();
    return {
      name,
      id: pokes[name].pokedex_number,
      nature: nat,
      exp: exp || 0,
      pass: word(8),
      ivs,
      symbol: '',
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        special_attack: 0,
        special_defense: 0,
        speed: 0
      },
      moves: ensureMoves(getLevelUpMoves(name, level)),
      temp_battle: true
    };
  }

  function getEligibleNames(region, settings) {
    const allowRegions = settings.allow_regions || [];
    const allowLegendary = settings.allow_legendary !== false;
    const allowNonLegendary = settings.allow_non_legendary !== false;
    return Object.keys(pokes).filter((name) => {
      if (!isBaseIdentifier(name, forms)) return false;
      if (!isFinalEvolution(name)) return false;
      if (region) {
        const dex = pokes[name].pokedex_number;
        if (dex < REGION_RANGES[region].start || dex > REGION_RANGES[region].end) return false;
      }
      const leg = isLegendary(name);
      if (leg && !allowLegendary) return false;
      if (!leg && !allowNonLegendary) return false;
      if (allowRegions.length > 0) {
        const dex = pokes[name].pokedex_number;
        return allowRegions.some((rg) => dex >= REGION_RANGES[rg].start && dex <= REGION_RANGES[rg].end);
      }
      return true;
    });
  }

  async function applyTempTeams(bword, id1, id2, team1, team2) {
    const data1 = await getUserData(id1);
    const data2 = await getUserData(id2);

    if (!data1.extra) data1.extra = {};
    if (!data2.extra) data2.extra = {};
    if (!data1.pokes) data1.pokes = [];
    if (!data2.pokes) data2.pokes = [];
    if (!Array.isArray(data1.extra.randombattle_pokes)) data1.extra.randombattle_pokes = [];
    if (!Array.isArray(data2.extra.randombattle_pokes)) data2.extra.randombattle_pokes = [];

    const old1 = data1.extra.temp_battle?.[bword] || [];
    const old2 = data2.extra.temp_battle?.[bword] || [];
    if (old1.length > 0) {
      data1.pokes = data1.pokes.filter(p => !old1.includes(p.pass));
      data1.extra.randombattle_pokes = data1.extra.randombattle_pokes.filter((pass) => !old1.includes(pass));
    }
    if (old2.length > 0) {
      data2.pokes = data2.pokes.filter(p => !old2.includes(p.pass));
      data2.extra.randombattle_pokes = data2.extra.randombattle_pokes.filter((pass) => !old2.includes(pass));
    }

    data1.pokes.push(...team1);
    data2.pokes.push(...team2);

    data1.extra.temp_battle = data1.extra.temp_battle || {};
    data2.extra.temp_battle = data2.extra.temp_battle || {};
    data1.extra.temp_battle[bword] = team1.map(p => p.pass);
    data2.extra.temp_battle[bword] = team2.map(p => p.pass);
    data1.extra.randombattle_pokes.push(...team1.map(p => p.pass));
    data2.extra.randombattle_pokes.push(...team2.map(p => p.pass));

    await saveUserData2(id1, data1);
    await saveUserData2(id2, data2);
  }

  async function saveRandomSettings(id, settings) {
    const data = await getUserData(id);
    if (!data.extra) data.extra = {};
    data.extra.randombattle_settings = {
      max_poke: settings.max_poke,
      allow_regions: settings.allow_regions || [],
      allow_legendary: settings.allow_legendary !== false,
      allow_non_legendary: settings.allow_non_legendary !== false
    };
    await saveUserData2(id, data);
  }

  async function regenerateTeams(battleData, bword, id1, id2, region) {
    const settings = battleData.set || {};
    const size = Math.max(1, Math.min(6, Number(settings.max_poke) || 6));
    const names = getEligibleNames(region, settings);
    if (names.length < size) {
      return { ok: false, reason: 'Not enough pokemons for this filter.' };
    }
    const level = 100;
    const team1 = pickRandom(names, size).map((name) => buildRandomPokemon(name, level));
    const team2 = pickRandom(names, size).map((name) => buildRandomPokemon(name, level));
    await applyTempTeams(bword, id1, id2, team1, team2);
    battleData.tempTeams = battleData.tempTeams || {};
    battleData.tempTeams[id1] = team1.map(p => p.pass);
    battleData.tempTeams[id2] = team2.map(p => p.pass);
    return { ok: true };
  }

  function cleanupOldTemp(userData) {
    if (!userData.extra || !userData.extra.temp_battle) return;
    const allPasses = Object.values(userData.extra.temp_battle).flat();
    if (allPasses.length < 1) return;
    userData.pokes = (userData.pokes || []).filter(p => !allPasses.includes(p.pass));
    if (Array.isArray(userData.extra.randombattle_pokes)) {
      userData.extra.randombattle_pokes = userData.extra.randombattle_pokes.filter((pass) => !allPasses.includes(pass));
    }
    userData.extra.temp_battle = {};
  }

  bot.command('randombattle', async (ctx) => {
    const reply = ctx.message.reply_to_message;
    if (!reply || reply.from.id === ctx.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Reply to a *User* to start random battle.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const mdata = await loadMessageData();
    if (mdata.battle && mdata.battle.some(id => String(id) === String(ctx.from.id))) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You Are In A *Battle*', { reply_to_message_id: ctx.message.message_id });
      return;
    }
    if (mdata.battle && mdata.battle.some(id => String(id) === String(reply.from.id))) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Opponent Is In A *Battle*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const regionArg = ctx.message.text.split(' ')[1];
    const region = regionArg ? regionArg.toLowerCase() : null;
    if (region && !REGION_RANGES[region]) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Invalid region. Use: kanto, johto, hoenn, sinnoh, unova, kalos, alola, galar, paldea', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data = await getUserData(ctx.from.id);
    const data2 = await getUserData(reply.from.id);
    if (!data.inv || !data2.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Both users must /start the bot first.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (!data.pokes) data.pokes = [];
    if (!data2.pokes) data2.pokes = [];
    if (!data.extra) data.extra = {};
    if (!data2.extra) data2.extra = {};
    if (!Array.isArray(data.extra.randombattle_pokes)) data.extra.randombattle_pokes = [];
    if (!Array.isArray(data2.extra.randombattle_pokes)) data2.extra.randombattle_pokes = [];

    cleanupOldTemp(data);
    cleanupOldTemp(data2);

    const names = getEligibleNames(region, {
      allow_regions: region ? [region] : [],
      allow_legendary: true,
      allow_non_legendary: true
    });

    if (names.length < 6) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Not enough pokemons for this region.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const bword = word(7);
    const level = 100;

    const saved = data.extra.randombattle_settings || {};
    const initialSettings = {
      max_poke: Number(saved.max_poke) || 6,
      min_6l: 0,
      max_6l: 6,
      min_level: 1,
      max_level: 100,
      switch: true,
      key_item: true,
      sandbox: false,
      random: true,
      preview: 'no',
      pin: false,
      type_effects: true,
      dual_type: true,
      allow_regions: region ? [region] : (Array.isArray(saved.allow_regions) ? saved.allow_regions : []),
      ban_regions: [],
      allow_types: [],
      ban_types: [],
      allow_legendary: saved.allow_legendary !== false,
      allow_non_legendary: saved.allow_non_legendary !== false
    };

    const size = Math.max(1, Math.min(6, Number(initialSettings.max_poke) || 6));
    const team1 = pickRandom(names, size).map((name) => buildRandomPokemon(name, level));
    const team2 = pickRandom(names, size).map((name) => buildRandomPokemon(name, level));

    data.pokes.push(...team1);
    data2.pokes.push(...team2);

    data.extra.temp_battle = data.extra.temp_battle || {};
    data2.extra.temp_battle = data2.extra.temp_battle || {};
    data.extra.temp_battle[bword] = team1.map(p => p.pass);
    data2.extra.temp_battle[bword] = team2.map(p => p.pass);
    data.extra.randombattle_pokes.push(...team1.map(p => p.pass));
    data2.extra.randombattle_pokes.push(...team2.map(p => p.pass));

    await saveUserData2(ctx.from.id, data);
    await saveUserData2(reply.from.id, data2);

    const settings3 = {};
    settings3.set = { ...initialSettings };
    settings3.set.random = true;
    settings3.users = {};
    settings3.users[ctx.from.id] = true;
    settings3.users[reply.from.id] = false;
    settings3.tempTeams = {};
    settings3.tempTeams[ctx.from.id] = team1.map(p => p.pass);
    settings3.tempTeams[reply.from.id] = team2.map(p => p.pass);
    settings3.tempBattle = true;
    if (region) {
      settings3.set.allow_regions = [region];
    }

    settings3.bword = bword;
    await saveBattleData(bword, settings3);

    const msg = `⚔ <a href="tg://user?id=${ctx.from.id}"><b>${he.encode(ctx.from.first_name)}</b></a> has started a <b>Random Battle</b> with <a href="tg://user?id=${reply.from.id}"><b>${he.encode(reply.from.first_name)}</b></a>` +
      (region ? `\n<b>Region:</b> ${c(region)}` : '') +
      '\n\n-> ' +
      `<a href="tg://user?id=${ctx.from.id}"><b>${he.encode(ctx.from.first_name)}</b></a> : ✓` +
      '\n-> ' +
      `<a href="tg://user?id=${reply.from.id}"><b>${he.encode(reply.from.first_name)}</b></a> : ✗`;

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, msg, {
      reply_to_message_id: reply.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Agree ✓', callback_data: `battle_${ctx.from.id}_${reply.from.id}_${bword}` },
            { text: 'Reject ✗', callback_data: `reject_${ctx.from.id}_${reply.from.id}_${bword}` }
          ],
          [{ text: 'Settings ⚙', callback_data: `rbset_${ctx.from.id}_${reply.from.id}_${bword}` }]
        ]
      }
    });
  });

  function regionButtonText(settings, rg) {
    const selected = (settings.allow_regions || []).length === 0 || (settings.allow_regions || []).includes(rg);
    return selected ? `✅ ${c(rg)}` : `☑ ${c(rg)}`;
  }

  function legendButtonText(settings, key, label) {
    const val = key === 'legendary' ? settings.allow_legendary !== false : settings.allow_non_legendary !== false;
    return val ? `✅ ${label}` : `☑ ${label}`;
  }

  async function renderSettingsMenu(ctx, id1, id2, bword, battleData) {
    const settings = battleData.set || {};
    const rows = [
      [{ text: 'Max Pokemons', callback_data: `rbset_max_${id1}_${id2}_${bword}` }, { text: 'Regions', callback_data: `rbset_regions_${id1}_${id2}_${bword}` }],
      [{ text: legendButtonText(settings, 'non', 'Non Legendary'), callback_data: `rbset_nonleg_${id1}_${id2}_${bword}` }, { text: legendButtonText(settings, 'legendary', 'Legendary'), callback_data: `rbset_leg_${id1}_${id2}_${bword}` }],
      [{ text: 'Back', callback_data: `rbset_back_${id1}_${id2}_${bword}` }]
    ];
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Random Battle Settings', { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
  }

  async function renderMaxMenu(ctx, id1, id2, bword, battleData) {
    const settings = battleData.set || {};
    const rows = [];
    const buttons = [];
    for (let i = 1; i <= 6; i++) {
      const text = settings.max_poke === i ? `✅ ${i}` : `☑ ${i}`;
      buttons.push({ text, callback_data: `rbset_maxpick_${i}_${id1}_${id2}_${bword}` });
    }
    rows.push(buttons.slice(0, 3));
    rows.push(buttons.slice(3, 6));
    rows.push([{ text: 'Back', callback_data: `rbset_${id1}_${id2}_${bword}` }]);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Max Pokemons', { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
  }

  async function renderRegionsMenu(ctx, id1, id2, bword, battleData) {
    const settings = battleData.set || {};
    const rows = [
      [
        { text: regionButtonText(settings, 'kanto'), callback_data: `rbset_regionpick_kanto_${id1}_${id2}_${bword}` },
        { text: regionButtonText(settings, 'johto'), callback_data: `rbset_regionpick_johto_${id1}_${id2}_${bword}` },
        { text: regionButtonText(settings, 'hoenn'), callback_data: `rbset_regionpick_hoenn_${id1}_${id2}_${bword}` }
      ],
      [
        { text: regionButtonText(settings, 'sinnoh'), callback_data: `rbset_regionpick_sinnoh_${id1}_${id2}_${bword}` },
        { text: regionButtonText(settings, 'unova'), callback_data: `rbset_regionpick_unova_${id1}_${id2}_${bword}` },
        { text: regionButtonText(settings, 'alola'), callback_data: `rbset_regionpick_alola_${id1}_${id2}_${bword}` }
      ],
      [
        { text: regionButtonText(settings, 'galar'), callback_data: `rbset_regionpick_galar_${id1}_${id2}_${bword}` },
        { text: regionButtonText(settings, 'paldea'), callback_data: `rbset_regionpick_paldea_${id1}_${id2}_${bword}` }
      ],
      [{ text: 'Back', callback_data: `rbset_${id1}_${id2}_${bword}` }]
    ];
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Regions', { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } });
  }

  function safeName(raw) {
    const txt = String(raw || 'Trainer');
    return he.encode(he.decode(txt));
  }

  async function getDisplayName(ctx, id, fallbackData) {
    try {
      const chat = await ctx.telegram.getChat(id);
      if (chat) {
        return safeName(chat.first_name || chat.username || fallbackData?.inv?.name || 'Trainer');
      }
    } catch (e) {
      // ignore
    }
    return safeName(fallbackData?.inv?.name || fallbackData?.inv?.username || fallbackData?.inv?.id || 'Trainer');
  }

  async function renderChallenge(ctx, id1, id2, bword, battleData) {
    const d1 = await getUserData(id1);
    const d2 = await getUserData(id2);
    const region = (battleData?.set?.allow_regions || []).length === 1 ? battleData.set.allow_regions[0] : null;
    const n1 = await getDisplayName(ctx, id1, d1);
    const n2 = await getDisplayName(ctx, id2, d2);
    const msg = `⚔ <a href="tg://user?id=${id1}"><b>${n1}</b></a> has started a <b>Random Battle</b> with <a href="tg://user?id=${id2}"><b>${n2}</b></a>` +
      (region ? `\n<b>Region:</b> ${c(region)}` : '') +
      '\n\n-> ' +
      `<a href="tg://user?id=${id1}"><b>${n1}</b></a> : ✓` +
      '\n-> ' +
      `<a href="tg://user?id=${id2}"><b>${n2}</b></a> : ✗`;
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Agree ✓', callback_data: `battle_${id1}_${id2}_${bword}` },
            { text: 'Reject ✗', callback_data: `reject_${id1}_${id2}_${bword}` }
          ],
          [{ text: 'Settings ⚙', callback_data: `rbset_${id1}_${id2}_${bword}` }]
        ]
      }
    });
  }

  bot.action(/^rbset_\d+_\d+_[A-Za-z0-9]+$/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const id1 = parts[1];
    const id2 = parts[2];
    const bword = parts[3];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    await renderSettingsMenu(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_back_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const id1 = parts[2];
    const id2 = parts[3];
    const bword = parts[4];
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      battleData = {};
    }
    await renderChallenge(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_max_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const id1 = parts[2];
    const id2 = parts[3];
    const bword = parts[4];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    await renderMaxMenu(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_maxpick_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const value = Number(parts[2]);
    const id1 = parts[3];
    const id2 = parts[4];
    const bword = parts[5];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    battleData.set = battleData.set || {};
    battleData.set.max_poke = Math.max(1, Math.min(6, value));
    battleData.bword = bword;
    const region = (battleData.set.allow_regions && battleData.set.allow_regions.length === 1) ? battleData.set.allow_regions[0] : null;
    const regen = await regenerateTeams(battleData, bword, id1, id2, region);
    if (!regen.ok) {
      ctx.answerCbQuery(regen.reason);
      return;
    }
    await saveRandomSettings(id1, battleData.set);
    await saveBattleData(bword, battleData);
    ctx.answerCbQuery('Updated');
    await renderSettingsMenu(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_regions_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const id1 = parts[2];
    const id2 = parts[3];
    const bword = parts[4];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    await renderRegionsMenu(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_regionpick_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const rg = parts[2];
    const id1 = parts[3];
    const id2 = parts[4];
    const bword = parts[5];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    battleData.set = battleData.set || {};
    const allow = battleData.set.allow_regions || [];
    if (allow.includes(rg)) {
      battleData.set.allow_regions = allow.filter(r => r !== rg);
    } else {
    battleData.set.allow_regions = [...allow, rg];
    }
    if (battleData.set.allow_regions.length === Object.keys(REGION_RANGES).length) {
      battleData.set.allow_regions = [];
    }
    battleData.bword = bword;
    const region = (battleData.set.allow_regions && battleData.set.allow_regions.length === 1) ? battleData.set.allow_regions[0] : null;
    const regen = await regenerateTeams(battleData, bword, id1, id2, region);
    if (!regen.ok) {
      ctx.answerCbQuery(regen.reason);
      return;
    }
    await saveRandomSettings(id1, battleData.set);
    await saveBattleData(bword, battleData);
    ctx.answerCbQuery('Updated');
    await renderRegionsMenu(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_leg_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const id1 = parts[2];
    const id2 = parts[3];
    const bword = parts[4];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    battleData.set = battleData.set || {};
    const next = !(battleData.set.allow_legendary !== false);
    if (!next && battleData.set.allow_non_legendary === false) {
      ctx.answerCbQuery('At least one must be enabled.');
      return;
    }
    battleData.set.allow_legendary = next;
    battleData.bword = bword;
    const region = (battleData.set.allow_regions && battleData.set.allow_regions.length === 1) ? battleData.set.allow_regions[0] : null;
    const regen = await regenerateTeams(battleData, bword, id1, id2, region);
    if (!regen.ok) {
      ctx.answerCbQuery(regen.reason);
      return;
    }
    await saveRandomSettings(id1, battleData.set);
    await saveBattleData(bword, battleData);
    ctx.answerCbQuery('Updated');
    await renderSettingsMenu(ctx, id1, id2, bword, battleData);
  });

  bot.action(/rbset_nonleg_/, async (ctx) => {
    const parts = ctx.callbackQuery.data.split('_');
    const id1 = parts[2];
    const id2 = parts[3];
    const bword = parts[4];
    if (String(ctx.from.id) !== String(id1)) {
      ctx.answerCbQuery('Only challenger can change settings.');
      return;
    }
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (e) {
      return;
    }
    battleData.set = battleData.set || {};
    const next = !(battleData.set.allow_non_legendary !== false);
    if (!next && battleData.set.allow_legendary === false) {
      ctx.answerCbQuery('At least one must be enabled.');
      return;
    }
    battleData.set.allow_non_legendary = next;
    battleData.bword = bword;
    const region = (battleData.set.allow_regions && battleData.set.allow_regions.length === 1) ? battleData.set.allow_regions[0] : null;
    const regen = await regenerateTeams(battleData, bword, id1, id2, region);
    if (!regen.ok) {
      ctx.answerCbQuery(regen.reason);
      return;
    }
    await saveRandomSettings(id1, battleData.set);
    await saveBattleData(bword, battleData);
    ctx.answerCbQuery('Updated');
    await renderSettingsMenu(ctx, id1, id2, bword, battleData);
  });
}

module.exports = registerRandomBattleCommand;
