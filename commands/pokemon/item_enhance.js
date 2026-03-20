function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

const { fetchCanonicalAbilities, titleCaseAbility } = require('../../utils/pokemon_ability');

const ABILITY_ITEM_FLOW = new Map();
const ABILITY_ITEM_TTL_MS = 10 * 60 * 1000;

function createFlowToken() {
  return Math.random().toString(36).slice(2, 10);
}

function pruneAbilityItemFlow() {
  const now = Date.now();
  for (const [token, entry] of ABILITY_ITEM_FLOW.entries()) {
    if (!entry || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
      ABILITY_ITEM_FLOW.delete(token);
    }
  }
}

function getItemConfig(kind) {
  if (kind === 'patch') {
    return { key: 'abilityPatches', label: 'Ability Patch' };
  }
  return { key: 'abilityCapsules', label: 'Ability Capsule' };
}

function findPokemonMatches(data, targetRaw) {
  const key = normalizeName(targetRaw);
  const keyByName = key.replace(/ /g, '-');
  const list = Array.isArray(data && data.pokes) ? data.pokes : [];

  const byPass = list
    .map((p, idx) => ({ p, idx }))
    .filter((entry) => String(entry.p.pass || '').toLowerCase() === key);
  if (byPass.length > 0) return byPass;

  const byNickname = list
    .map((p, idx) => ({ p, idx }))
    .filter((entry) => entry.p.nickname && String(entry.p.nickname).toLowerCase() === key);
  if (byNickname.length > 0) return byNickname;

  const byName = list
    .map((p, idx) => ({ p, idx }))
    .filter((entry) => String(entry.p.name || '').toLowerCase() === keyByName);
  return byName;
}

async function getAbilityChoicesForItem(pokemonName, kind) {
  const normalized = normalizeName(pokemonName);
  const tries = [normalized];
  if (normalized.includes('-')) {
    tries.push(normalized.split('-')[0]);
  }

  const includeHidden = kind === 'patch';

  for (const key of tries) {
    try {
      const res = await fetch('https://pokeapi.co/api/v2/pokemon/' + encodeURIComponent(key));
      if (!res || !res.ok) continue;
      const body = await res.json();
      const list = Array.isArray(body.abilities) ? body.abilities : [];
      const filtered = list
        .filter((row) => includeHidden ? !!row.is_hidden : !row.is_hidden)
        .map((row) => String(row && row.ability && row.ability.name || '').toLowerCase().trim())
        .filter(Boolean);

      if (filtered.length > 0) {
        return Array.from(new Set(filtered));
      }

      const fallbackAll = list
        .map((row) => String(row && row.ability && row.ability.name || '').toLowerCase().trim())
        .filter(Boolean);
      if (fallbackAll.length > 0) {
        return Array.from(new Set(fallbackAll));
      }
    } catch (_) {
      // try fallback below
    }
  }

  const canonical = await fetchCanonicalAbilities(normalized, fetch);
  return Array.from(new Set((canonical || []).map((x) => normalizeName(x)).filter(Boolean)));
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

  async function sendAbilityChoicePanel(ctx, userId, kind, pokeIndex, useEdit) {
    pruneAbilityItemFlow();
    const data = await getUserData(userId);
    const itemCfg = getItemConfig(kind);

    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!Number.isFinite(data.extra.itembox[itemCfg.key])) data.extra.itembox[itemCfg.key] = 0;

    if (data.extra.itembox[itemCfg.key] < 1) {
      const out = 'You are out of <b>' + itemCfg.label + '</b>.';
      if (useEdit) {
        await ctx.editMessageText(out, { parse_mode: 'HTML' });
      } else {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, out, { reply_to_message_id: ctx.message.message_id });
      }
      return;
    }

    const poke = data.pokes && data.pokes[pokeIndex];
    if (!poke) {
      const out = 'Pokemon not found.';
      if (useEdit) {
        await ctx.editMessageText(out, { parse_mode: 'HTML' });
      } else {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, out, { reply_to_message_id: ctx.message.message_id });
      }
      return;
    }

    const currentAbility = normalizeName(poke.ability || '');
    const rawChoices = await getAbilityChoicesForItem(poke.name, kind);
    const choices = rawChoices.filter((ab) => ab && ab !== currentAbility);

    if (choices.length < 1) {
      const out = '<b>' + c(poke.nickname || poke.name) + '</b> has no alternate ability available for <b>' + itemCfg.label + '</b>.';
      if (useEdit) {
        await ctx.editMessageText(out, { parse_mode: 'HTML' });
      } else {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, out, { reply_to_message_id: ctx.message.message_id });
      }
      return;
    }

    const token = createFlowToken();
    ABILITY_ITEM_FLOW.set(token, {
      type: 'ability_apply',
      userId,
      kind,
      pokeIndex,
      choices,
      expiresAt: Date.now() + ABILITY_ITEM_TTL_MS
    });

    const buttons = choices.map((ab, idx) => ([{ text: titleCaseAbility(ab), callback_data: 'abiab_' + token + '_' + idx + '_' + userId }]));
    const text =
      'Select new ability for <b>' + c(poke.nickname || poke.name) + '</b>\n'
      + '<b>Current:</b> ' + c(titleCaseAbility(poke.ability || 'none')) + '\n\n'
      + '<b>Item:</b> ' + itemCfg.label;

    if (useEdit) {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } });
    } else {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } }, text, { reply_to_message_id: ctx.message.message_id });
    }
  }

  async function handleAbilityItemCommand(ctx, kind) {
    pruneAbilityItemFlow();
    const data = await getUserData(ctx.from.id);
    const itemCfg = getItemConfig(kind);

    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!Number.isFinite(data.extra.itembox[itemCfg.key])) data.extra.itembox[itemCfg.key] = 0;

    if (data.extra.itembox[itemCfg.key] < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, 'You are out of <b>' + itemCfg.label + '</b>.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, '<b>Usage:</b> /' + (kind === 'patch' ? 'abilitypatch' : 'abilitycapsule') + ' &lt;pokemon name|nickname|pass&gt;', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const matches = findPokemonMatches(data, targetRaw);
    if (matches.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, 'No matching pokemon found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (matches.length === 1) {
      await sendAbilityChoicePanel(ctx, ctx.from.id, kind, matches[0].idx, false);
      return;
    }

    const token = createFlowToken();
    ABILITY_ITEM_FLOW.set(token, {
      type: 'pokemon_pick',
      userId: ctx.from.id,
      kind,
      expiresAt: Date.now() + ABILITY_ITEM_TTL_MS
    });

    const rows = matches.map((entry) => ([{
      text: c((entry.p.nickname || entry.p.name)) + ' [' + entry.p.pass + ']',
      callback_data: 'abipk_' + token + '_' + entry.idx + '_' + ctx.from.id
    }]));

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } },
      'Multiple matches found.\nSelect a pokemon for <b>' + itemCfg.label + '</b>:',
      { reply_to_message_id: ctx.message.message_id }
    );
  }

  bot.command('abilitycapsule', check, async (ctx) => {
    await handleAbilityItemCommand(ctx, 'capsule');
  });

  bot.command('abilitypatch', check, async (ctx) => {
    await handleAbilityItemCommand(ctx, 'patch');
  });

  bot.command('zygardecapsule', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!Number.isFinite(data.extra.itembox.zygardeCapsules)) data.extra.itembox.zygardeCapsules = 0;

    if (data.extra.itembox.zygardeCapsules < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, 'You are out of <b>Zygarde Capsule</b>.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const targetRaw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!targetRaw) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, '<b>Usage:</b> /zygardecapsule &lt;pokemon name|nickname|pass&gt;', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const p = findPokemon(data, targetRaw);
    if (!p) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, 'No matching pokemon found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const abilityNorm = normalizeName(p.ability).replace(/[-_\s]/g, '');
    let nextAbility = '';
    if (abilityNorm === 'aurabreak') {
      nextAbility = 'power-construct';
    } else if (abilityNorm === 'powerconstruct') {
      nextAbility = 'aura-break';
    } else {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'HTML' },
        '<b>' + c(p.nickname || p.name) + '</b> must have <b>Aura Break</b> or <b>Power Construct</b> to use <b>Zygarde Capsule</b>.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    p.ability = nextAbility;
    data.extra.itembox.zygardeCapsules -= 1;
    await saveUserData2(ctx.from.id, data);

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'HTML' },
      'Used <b>Zygarde Capsule</b> on <b>' + c(p.nickname || p.name) + '</b>\n'
      + '<b>New Ability:</b> ' + c(titleCaseAbility(nextAbility)) + '\n'
      + '<b>Remaining:</b> ' + data.extra.itembox.zygardeCapsules,
      { reply_to_message_id: ctx.message.message_id }
    );
  });

  bot.action(/^abipk_([a-z0-9]+)_(\d+)_(\d+)$/, async (ctx) => {
    pruneAbilityItemFlow();
    const token = String(ctx.match[1]);
    const pokeIndex = parseInt(ctx.match[2], 10);
    const userId = parseInt(ctx.match[3], 10);

    const flow = ABILITY_ITEM_FLOW.get(token);
    if (!flow || flow.type !== 'pokemon_pick' || flow.userId !== userId || flow.expiresAt < Date.now()) {
      await ctx.answerCbQuery('This selection expired. Run command again.', { show_alert: true });
      return;
    }
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!', { show_alert: false });
      return;
    }

    ABILITY_ITEM_FLOW.delete(token);
    await sendAbilityChoicePanel(ctx, userId, flow.kind, pokeIndex, true);
    await ctx.answerCbQuery('Pokemon selected', { show_alert: false });
  });

  bot.action(/^abiab_([a-z0-9]+)_(\d+)_(\d+)$/, async (ctx) => {
    pruneAbilityItemFlow();
    const token = String(ctx.match[1]);
    const abilityIndex = parseInt(ctx.match[2], 10);
    const userId = parseInt(ctx.match[3], 10);

    const flow = ABILITY_ITEM_FLOW.get(token);
    if (!flow || flow.type !== 'ability_apply' || flow.userId !== userId || flow.expiresAt < Date.now()) {
      await ctx.answerCbQuery('This selection expired. Run command again.', { show_alert: true });
      return;
    }
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!', { show_alert: false });
      return;
    }

    const chosenAbility = flow.choices[abilityIndex];
    if (!chosenAbility) {
      await ctx.answerCbQuery('Invalid ability selection.', { show_alert: true });
      return;
    }

    const data = await getUserData(userId);
    const itemCfg = getItemConfig(flow.kind);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!Number.isFinite(data.extra.itembox[itemCfg.key])) data.extra.itembox[itemCfg.key] = 0;

    if (data.extra.itembox[itemCfg.key] < 1) {
      ABILITY_ITEM_FLOW.delete(token);
      await ctx.editMessageText('You are out of <b>' + itemCfg.label + '</b>.', { parse_mode: 'HTML' });
      await ctx.answerCbQuery('Out of item', { show_alert: true });
      return;
    }

    const poke = data.pokes && data.pokes[flow.pokeIndex];
    if (!poke) {
      ABILITY_ITEM_FLOW.delete(token);
      await ctx.editMessageText('Pokemon not found.', { parse_mode: 'HTML' });
      await ctx.answerCbQuery('Pokemon not found', { show_alert: true });
      return;
    }

    const currentAbility = normalizeName(poke.ability || '');
    if (currentAbility === chosenAbility) {
      await ctx.answerCbQuery('Already has this ability.', { show_alert: true });
      return;
    }

    poke.ability = chosenAbility;
    data.extra.itembox[itemCfg.key] -= 1;
    ABILITY_ITEM_FLOW.delete(token);

    await saveUserData2(userId, data);
    await ctx.editMessageText(
      'Used <b>' + itemCfg.label + '</b> on <b>' + c(poke.nickname || poke.name) + '</b>\n'
      + '<b>New Ability:</b> ' + c(titleCaseAbility(chosenAbility)) + '\n'
      + '<b>Remaining:</b> ' + data.extra.itembox[itemCfg.key],
      { parse_mode: 'HTML' }
    );
    await ctx.answerCbQuery('Ability changed!', { show_alert: false });
  });

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
