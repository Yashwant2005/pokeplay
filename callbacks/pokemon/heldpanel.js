function registerHeldPanelCallbacks(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { getHeldItemDescription } = require('../../utils/held_item_shop');

  function normalizeHeldItemName(value) {
    return normalizeHeldStone(value);
  }

  function titleCaseHeldItem(value) {
    return String(value || 'none')
      .replace(/[_-]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'None';
  }

  function ensureHeldItemBox(data) {
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {};
    return data.extra.itembox.heldItems;
  }

  function getStoneInventoryCount(data, itemName) {
    const canon = normalizeStoneKey(itemName, stones);
    if (!stones || !stones[canon]) return 0;
    if (!data.inv || !Array.isArray(data.inv.stones)) return 0;
    return data.inv.stones.filter((s) => normalizeStoneKey(s, stones) === canon).length;
  }

  function getOwnedHeldItemCount(data, itemName) {
    const heldItems = ensureHeldItemBox(data);
    const base = Number(heldItems[itemName]) || 0;
    const stoneCount = getStoneInventoryCount(data, itemName);
    return base + stoneCount;
  }

  function getEquippedHeldItemCount(data, itemName, ignorePass = '') {
    return (data.pokes || []).filter((poke) => String(poke.pass) !== String(ignorePass) && normalizeHeldItemName(poke.held_item) === itemName).length;
  }

  function buildNavKeyboard(pass, id) {
    const data = globalThis.__heldPanelNavPokemon;
    const poke = data && data.poke;
    const actionRow = [
      { text: 'Evolve', callback_data: 'evolve_' + pass + '_' + id }
    ];
    if (!isRayquazaLockedFromHeldItems(poke)) {
      actionRow.push({ text: 'Held Items', callback_data: 'heldpanel_' + pass + '_' + id });
    }
    actionRow.push({ text: 'Release', callback_data: 'release_' + pass + '_' + id });
    return [
      [
        { text: 'Stats', callback_data: 'ste_' + pass + '_' + id },
        { text: 'IVs/EVs', callback_data: 'pkisvs_' + pass + '_' + id },
        { text: 'Moveset', callback_data: 'moves_' + pass + '_' + id }
      ],
      actionRow
    ];
  }

  function buildHeldPanel(data, poke) {
    const currentItem = normalizeHeldItemName(poke.held_item);
    let msg = '*Held Item Manager*\n';
    msg += '*Pokemon:* ' + c(poke.nickname || poke.name) + '\n';
    msg += '*Current Held Item:* ' + c(titleCaseHeldItem(currentItem || 'none'));
    if (currentItem && currentItem !== 'none') {
      const currentDesc = getHeldItemDescription(currentItem);
      if (currentDesc && currentDesc !== 'Unknown held item.') {
        msg += '\n*Current Effect:* ' + c(currentDesc);
      } else if (stones && stones[currentItem]) {
        msg += '\n*Current Effect:* ' + c('Mega stone for ' + (stones[currentItem].pokemon || 'this pokemon'));
      }
    }

    const heldEntries = Object.entries(ensureHeldItemBox(data))
      .filter(([, amount]) => Number(amount) > 0);
    const stoneKeysRaw = (data.inv && Array.isArray(data.inv.stones)) ? data.inv.stones : [];
    const stoneKeys = stoneKeysRaw
      .map((s) => normalizeStoneKey(s, stones))
      .filter((key) => {
        if (!stones || !stones[key]) return false;
        const owner = normalizePokemonName(stones[key].pokemon);
        return owner === pokeNameNorm;
      });
    const stoneCounts = {};
    for (const key of stoneKeys) {
      stoneCounts[key] = (stoneCounts[key] || 0) + 1;
    }
    const stoneEntries = Object.entries(stoneCounts).filter(([key, amount]) => amount > 0);
    const combined = new Map();
    for (const [key, amount] of heldEntries) {
      combined.set(normalizeHeldItemName(key), Number(amount));
    }
    for (const [key, amount] of stoneEntries) {
      const norm = normalizeStoneKey(key, stones);
      combined.set(norm, (combined.get(norm) || 0) + Number(amount));
    }
    const entries = Array.from(combined.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (restricted) {
      msg += '\n\n*Held items are disabled for this Rayquaza because it knows Dragon Ascent.*';
    } else if (entries.length < 1) {
      msg += '\n\nYou do not have any *held items* in your bag.';
    } else {
      msg += '\n\n*Bag Held Items*';
      for (const [itemName, amount] of entries) {
        const equippedElsewhere = getEquippedHeldItemCount(data, itemName, poke.pass);
        const free = Math.max(0, Number(amount) - equippedElsewhere);
        msg += '\n- ' + c(titleCaseHeldItem(itemName)) + ': *' + amount + '*';
        msg += ' | Free: *' + free + '*';
        const desc = getHeldItemDescription(itemName);
        if (desc && desc !== 'Unknown held item.') {
          msg += '\n  ' + c(desc);
        } else if (stones && stones[itemName]) {
          msg += '\n  ' + c('Mega stone for ' + (stones[itemName].pokemon || 'this pokemon'));
        }
      }
    }

    const rows = [];
    const itemButtons = restricted ? [] : entries.map(([itemName, amount]) => {
      const equippedElsewhere = getEquippedHeldItemCount(data, itemName, poke.pass);
      const free = Math.max(0, Number(amount) - equippedElsewhere);
      return {
        text: c(titleCaseHeldItem(itemName)) + ' (' + free + ')',
        callback_data: 'heldpick_' + encodeURIComponent(itemName) + '_' + poke.pass + '_' + data.user_id
      };
    });

    for (let i = 0; i < itemButtons.length; i += 2) {
      rows.push(itemButtons.slice(i, i + 2));
    }

    if (!restricted && currentItem && currentItem !== 'none') {
      rows.push([{ text: 'Remove Held Item', callback_data: 'heldremove_' + poke.pass + '_' + data.user_id }]);
    }
    rows.push([{ text: 'Back', callback_data: 'info_' + poke.pass + '_' + data.user_id }]);

    return { msg, rows };
  }

  async function showHeldPanel(ctx, pass, userId) {
    const data = await getUserData(userId);
    data.user_id = userId;
    const poke = (data.pokes || []).find((p) => String(p.pass) === String(pass));
    if (!poke) {
      await ctx.answerCbQuery('Poke not found');
      return;
    }
    if (isRayquazaLockedFromHeldItems(poke) && normalizeHeldItemName(poke.held_item) !== 'none') {
      poke.held_item = getSanitizedHeldItemForPokemon(poke, poke.held_item);
      await saveUserData2(userId, data);
    }
    globalThis.__heldPanelNavPokemon = { poke };
    const panel = buildHeldPanel(data, poke);
    await editMessage('caption', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, panel.msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: panel.rows }
    });
    delete globalThis.__heldPanelNavPokemon;
  }

  async function equipHeldItem(ctx, userId, pass, heldItem) {
    const data = await getUserData(userId);
    data.user_id = userId;
    const poke = (data.pokes || []).find((p) => String(p.pass) === String(pass));
    if (!poke) {
      await ctx.answerCbQuery('Poke not found', { show_alert: true });
      return;
    }

    const heldStoneKey = normalizeStoneKey(heldItem, stones);
    if (stones && stones[heldStoneKey] && stones[heldStoneKey].pokemon && normalizePokemonName(stones[heldStoneKey].pokemon) !== normalizePokemonName(poke.name)) {
      await ctx.answerCbQuery('That Mega Stone does not match this Pokemon.', { show_alert: true });
      return;
    }

    const owned = getOwnedHeldItemCount(data, heldItem);
    if (owned < 1) {
      await ctx.answerCbQuery('That item is not in your bag!', { show_alert: true });
      return;
    }

    const currentItem = normalizeHeldItemName(poke.held_item);
    if (currentItem === heldItem) {
      await ctx.answerCbQuery('This pokemon already holds that item.', { show_alert: true });
      return;
    }

    const restrictionMessage = getPokemonHeldItemRestrictionMessage(poke);
    if (restrictionMessage) {
      poke.held_item = getSanitizedHeldItemForPokemon(poke, poke.held_item);
      await saveUserData2(userId, data);
      await showHeldPanel(ctx, pass, userId);
      await ctx.answerCbQuery(restrictionMessage, { show_alert: true });
      return;
    }

    const equippedElsewhere = getEquippedHeldItemCount(data, heldItem, pass);
    const availableToEquip = owned - equippedElsewhere;
    if (availableToEquip < 1) {
      await ctx.answerCbQuery('All copies of that item are already equipped.', { show_alert: true });
      return;
    }

    if (stones && stones[heldStoneKey]) {
      poke.held_item = heldStoneKey;
    } else {
      poke.held_item = heldItem;
    }
    await saveUserData2(userId, data);
    await showHeldPanel(ctx, pass, userId);
    await ctx.answerCbQuery('Held item updated!', { show_alert: false });
  }

  bot.action(/^heldpanel_([^_]+)_(\d+)$/, check2q, async (ctx) => {
    const pass = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }
    await showHeldPanel(ctx, pass, userId);
    await ctx.answerCbQuery();
  });

  bot.action(/^heldpick_(.+)_([^_]+)_(\d+)$/, check2q, async (ctx) => {
    const heldItem = normalizeHeldItemName(decodeURIComponent(ctx.match[1]));
    const pass = ctx.match[2];
    const userId = Number(ctx.match[3]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }

    const data = await getUserData(userId);
    const poke = (data.pokes || []).find((p) => String(p.pass) === String(pass));
    if (!poke) {
      await ctx.answerCbQuery('Poke not found', { show_alert: true });
      return;
    }

    const currentItem = normalizeHeldItemName(poke.held_item);
    if (currentItem && currentItem !== 'none' && currentItem !== heldItem) {
      await editMessage('caption', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id,
        '*' + c(poke.nickname || poke.name) + '* is already holding *' + c(titleCaseHeldItem(currentItem)) + '*.\nDo you want to replace it with *' + c(titleCaseHeldItem(heldItem)) + '*?',
        {
          parse_mode: 'markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Yes', callback_data: 'heldreplace_' + encodeURIComponent(heldItem) + '_' + pass + '_' + userId },
                { text: 'No', callback_data: 'heldpanel_' + pass + '_' + userId }
              ]
            ]
          }
        }
      );
      await ctx.answerCbQuery('Choose whether to replace it.');
      return;
    }

    await equipHeldItem(ctx, userId, pass, heldItem);
  });

  bot.action(/^heldreplace_(.+)_([^_]+)_(\d+)$/, check2q, async (ctx) => {
    const heldItem = normalizeHeldItemName(decodeURIComponent(ctx.match[1]));
    const pass = ctx.match[2];
    const userId = Number(ctx.match[3]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }
    await equipHeldItem(ctx, userId, pass, heldItem);
  });

  bot.action(/^heldremove_([^_]+)_(\d+)$/, check2q, async (ctx) => {
    const pass = ctx.match[1];
    const userId = Number(ctx.match[2]);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }

    const data = await getUserData(userId);
    data.user_id = userId;
    const poke = (data.pokes || []).find((p) => String(p.pass) === String(pass));
    if (!poke) {
      await ctx.answerCbQuery('Poke not found', { show_alert: true });
      return;
    }
    if (!poke.held_item || normalizeHeldItemName(poke.held_item) === 'none') {
      await ctx.answerCbQuery('This pokemon is not holding any item.', { show_alert: true });
      return;
    }

    poke.held_item = 'none';
    await saveUserData2(userId, data);
    await showHeldPanel(ctx, pass, userId);
    await ctx.answerCbQuery('Held item removed!', { show_alert: false });
  });
}

module.exports = registerHeldPanelCallbacks;
