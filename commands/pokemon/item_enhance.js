function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function parseTargetAndValue(raw) {
  const parts = String(raw || '').split('|').map((x) => x.trim()).filter(Boolean);
  if (parts.length < 2) return { target: '', value: '' };
  return { target: parts[0], value: parts.slice(1).join(' | ') };
}

function findPokemon(data, targetRaw) {
  const key = normalizeName(targetRaw);
  const key2 = key.replace(/ /g, '-');
  return (data.pokes || []).find((p) => String(p.pass || '').toLowerCase() === key)
    || (data.pokes || []).find((p) => p.nickname && String(p.nickname).toLowerCase() === key)
    || (data.pokes || []).find((p) => String(p.name || '').toLowerCase() === key2);
}

function registerItemEnhanceCommands(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const STAT_MAP = {
    hp: 'hp',
    atk: 'attack',
    attack: 'attack',
    def: 'defense',
    defense: 'defense',
    spa: 'special_attack',
    spatk: 'special_attack',
    'special-attack': 'special_attack',
    special_attack: 'special_attack',
    spd: 'special_defense',
    spdef: 'special_defense',
    'special-defense': 'special_defense',
    special_defense: 'special_defense',
    spe: 'speed',
    speed: 'speed'
  };

  bot.command('mint', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {};

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /mint <pokemon name|nickname|pass>', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const p = findPokemon(data, targetRaw);
    if (!p) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const pokeIndex = (data.pokes || []).indexOf(p);
    const availableMints = Object.entries(data.extra.itembox.mints || {})
      .filter(([key, count]) => Number(count) > 0)
      .map(([key]) => key);

    if (availableMints.length === 0) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You do not have any *mints* in your item box.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const buttons = availableMints.map((mintKey) => [
      { text: mintKey.replace(/ mint$/i, ''), callback_data: `mint_sel_${pokeIndex}_${encodeURIComponent(mintKey)}_${ctx.from.id}` }
    ]);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown', reply_markup: { inline_keyboard: buttons } }, 'Select a *mint* for *' + c(p.nickname || p.name) + '*:', { reply_to_message_id: ctx.message.message_id });
  });

  bot.action(/^mint_sel_(\d+)_(.+)_(\d+)$/, async (ctx) => {
    const pokeIndex = parseInt(ctx.match[1]);
    const mintKey = decodeURIComponent(ctx.match[2]);
    const userId = parseInt(ctx.match[3]);

    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!', { show_alert: false });
      return;
    }

    const data = await getUserData(userId);
    if (!data.pokes || !data.pokes[pokeIndex]) {
      await ctx.answerCbQuery('Pokemon not found!', { show_alert: true });
      return;
    }

    const p = data.pokes[pokeIndex];
    const available = Number(data.extra.itembox.mints[mintKey]) || 0;
    if (available < 1) {
      await ctx.answerCbQuery('Mint unavailable!', { show_alert: true });
      return;
    }

    const newNature = mintKey.replace(/ mint$/i, '').trim().toLowerCase();
    p.nature = newNature;
    data.extra.itembox.mints[mintKey] = available - 1;

    await saveUserData2(userId, data);
    await ctx.editMessageText('Used *' + c(mintKey) + '* on *' + c(p.nickname || p.name) + '*\n*New Nature:* ' + c(newNature), { parse_mode: 'markdown' });
    await ctx.answerCbQuery('Mint applied!', { show_alert: false });
  });

  bot.command('bottlecap', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!Number.isFinite(data.extra.itembox.bottleCaps)) data.extra.itembox.bottleCaps = 0;

    if (data.extra.itembox.bottleCaps < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are out of *Bottle Caps*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /bottlecap <pokemon name|nickname|pass>', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const p = findPokemon(data, targetRaw);
    if (!p) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (!p.ivs || typeof p.ivs !== 'object') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Pokemon IV data not found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const pokeIndex = (data.pokes || []).indexOf(p);
    const statButtons = [
      [
        { text: 'HP', callback_data: `bcap_sel_${pokeIndex}_hp_${ctx.from.id}` },
        { text: 'ATK', callback_data: `bcap_sel_${pokeIndex}_attack_${ctx.from.id}` },
        { text: 'DEF', callback_data: `bcap_sel_${pokeIndex}_defense_${ctx.from.id}` }
      ],
      [
        { text: 'SPA', callback_data: `bcap_sel_${pokeIndex}_special_attack_${ctx.from.id}` },
        { text: 'SPD', callback_data: `bcap_sel_${pokeIndex}_special_defense_${ctx.from.id}` },
        { text: 'SPE', callback_data: `bcap_sel_${pokeIndex}_speed_${ctx.from.id}` }
      ]
    ];

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown', reply_markup: { inline_keyboard: statButtons } }, 'Select a *stat* for *' + c(p.nickname || p.name) + '*:', { reply_to_message_id: ctx.message.message_id });
  });

  bot.action(/^bcap_sel_(\d+)_(.+)_(\d+)$/, async (ctx) => {
    const pokeIndex = parseInt(ctx.match[1]);
    const stat = ctx.match[2];
    const userId = parseInt(ctx.match[3]);

    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!', { show_alert: false });
      return;
    }

    const data = await getUserData(userId);
    if (!data.pokes || !data.pokes[pokeIndex]) {
      await ctx.answerCbQuery('Pokemon not found!', { show_alert: true });
      return;
    }

    if (data.extra.itembox.bottleCaps < 1) {
      await ctx.answerCbQuery('Out of Bottle Caps!', { show_alert: true });
      return;
    }

    const p = data.pokes[pokeIndex];
    const before = Number(p.ivs[stat]) || 0;
    if (before >= 31) {
      await ctx.answerCbQuery('Already at 31 IV!', { show_alert: true });
      return;
    }

    p.ivs[stat] = 31;
    data.extra.itembox.bottleCaps -= 1;

    await saveUserData2(userId, data);
    await ctx.editMessageText('Used *Bottle Cap* on *' + c(p.nickname || p.name) + '*\n*' + c(stat.replace('_', ' ')) + ' IV:* ' + before + ' -> 31', { parse_mode: 'markdown' });
    await ctx.answerCbQuery('Cap applied!', { show_alert: false });
  });

  bot.command('goldbottlecap', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!Number.isFinite(data.extra.itembox.goldBottleCaps)) data.extra.itembox.goldBottleCaps = 0;

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /goldbottlecap <pokemon name|nickname|pass>', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (data.extra.itembox.goldBottleCaps < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are out of *Gold Bottle Caps*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const p = findPokemon(data, targetRaw);
    if (!p) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (!p.ivs || typeof p.ivs !== 'object') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Pokemon IV data not found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    p.ivs.hp = 31;
    p.ivs.attack = 31;
    p.ivs.defense = 31;
    p.ivs.special_attack = 31;
    p.ivs.special_defense = 31;
    p.ivs.speed = 31;
    data.extra.itembox.goldBottleCaps -= 1;

    await saveUserData2(ctx.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Used *Gold Bottle Cap* on *' + c(p.nickname || p.name) + '*\nAll IVs are now *31*.', { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerItemEnhanceCommands;
