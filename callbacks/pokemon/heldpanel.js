function registerHeldPanelCallbacks(bot, deps) {
  const { check2q, getUserData, saveUserData2, editMessage, stones, pokes, c, sort, Stats } = deps;
  const { getHeldItemDescription } = require('../../utils/held_item_shop');
  const { normalizeHeldStone, normalizeStoneKey, normalizePokemonName } = require('../../utils/stone_alias');
  const {
    getPokemonHeldItemRestrictionMessage,
    getSanitizedHeldItemForPokemon,
    isRayquazaLockedFromHeldItems
  } = require('../../utils/pokemon_item_rules');

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

  function getOwnedHeldItemCount(data, itemName) {
    const name = normalizeHeldItemName(itemName);
    const heldItems = ensureHeldItemBox(data);
    const stoneKey = normalizeStoneKey(name, stones);
    if (stones && stones[stoneKey]) {
      const invStones = (data && data.inv && Array.isArray(data.inv.stones)) ? data.inv.stones : [];
      return invStones.filter((s) => normalizeStoneKey(s, stones) === stoneKey).length;
    }
    return Number(heldItems[name]) || 0;
  }

  function getEquippedHeldItemCount(data, itemName, ignorePass = '') {
    return (data.pokes || []).filter((poke) => String(poke.pass) !== String(ignorePass) && normalizeHeldItemName(poke.held_item) === itemName).length;
  }

  function buildHeldPanel(data, poke, page = 1) {
    const currentItem = normalizeHeldItemName(poke.held_item);
    const restricted = Boolean(getPokemonHeldItemRestrictionMessage(poke));
    let msg = '*Held Item Manager*\n';
    msg += '*Pokemon:* ' + c(poke.nickname || poke.name) + '\n';
    msg += '*Current Held Item:* ' + c(titleCaseHeldItem(currentItem || 'none'));
    if (currentItem && currentItem !== 'none') {
      msg += '\n*Current Effect:* ' + c(getHeldItemDescription(currentItem));
    }

    const heldEntries = Object.entries(ensureHeldItemBox(data))
      .filter(([, amount]) => Number(amount) > 0)
      .map(([itemName, amount]) => [normalizeHeldItemName(itemName), Number(amount)]);

    const stoneCounts = {};
    const invStones = (data && data.inv && Array.isArray(data.inv.stones)) ? data.inv.stones : [];
    for (const raw of invStones) {
      const stoneKey = normalizeStoneKey(raw, stones);
      if (stones && stones[stoneKey]) {
        stoneCounts[stoneKey] = Number(stoneCounts[stoneKey] || 0) + 1;
      }
    }
    const stoneEntries = Object.entries(stoneCounts).map(([itemName, amount]) => [itemName, Number(amount)]);

    const combined = {};
    for (const [itemName, amount] of [...heldEntries, ...stoneEntries]) {
      combined[itemName] = Number(combined[itemName] || 0) + Number(amount || 0);
    }
    const allEntries = Object.entries(combined)
      .filter(([, amount]) => Number(amount) > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    const entries = restricted
      ? []
      : allEntries.filter(([itemName]) => !getPokemonHeldItemRestrictionMessage(poke, itemName));
    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
    const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const pageEntries = entries.slice(startIndex, startIndex + pageSize);

    if (restricted) {
      msg += '\n\n*Held items are disabled for this Pokemon.*';
    } else if (entries.length < 1) {
      if (allEntries.length < 1) {
        msg += '\n\nYou do not have any *held items* in your bag.';
      } else {
        msg += '\n\nYou do not have any *compatible held items* for this Pokemon.';
      }
    } else {
      msg += '\n\n*Bag Held Items (Page ' + safePage + '/' + totalPages + ')*';
      for (const [itemName, amount] of pageEntries) {
        const equippedElsewhere = getEquippedHeldItemCount(data, itemName, poke.pass);
        const free = Math.max(0, Number(amount) - equippedElsewhere);
        msg += '\n- ' + c(titleCaseHeldItem(itemName)) + ': *' + amount + '*';
        msg += ' | Free: *' + free + '*';
      }
      msg += '\n\n_Tap an item button below to equip it._';
    }

    const rows = [];
    const itemButtons = restricted ? [] : pageEntries.map(([itemName, amount]) => {
      const equippedElsewhere = getEquippedHeldItemCount(data, itemName, poke.pass);
      const free = Math.max(0, Number(amount) - equippedElsewhere);
      return {
        text: c(titleCaseHeldItem(itemName)) + ' (' + free + ')',
        callback_data: 'heldpick_' + encodeURIComponent(itemName) + '_' + poke.pass + '_' + data.user_id + '_' + safePage
      };
    });

    for (let i = 0; i < itemButtons.length; i += 2) {
      rows.push(itemButtons.slice(i, i + 2));
    }

    if (!restricted && totalPages > 1) {
      const navRow = [];
      if (safePage > 1) {
        navRow.push({ text: '<', callback_data: 'heldpanel_' + poke.pass + '_' + data.user_id + '_' + (safePage - 1) });
      }
      if (safePage < totalPages) {
        navRow.push({ text: '>', callback_data: 'heldpanel_' + poke.pass + '_' + data.user_id + '_' + (safePage + 1) });
      }
      if (navRow.length > 0) {
        rows.push(navRow);
      }
    }

    if (!restricted && currentItem && currentItem !== 'none') {
      rows.push([{ text: 'Remove Held Item', callback_data: 'heldremove_' + poke.pass + '_' + data.user_id + '_' + safePage }]);
    }
    rows.push([{ text: 'Back', callback_data: 'info_' + poke.pass + '_' + data.user_id }]);

    return { msg, rows, page: safePage, totalPages };
  }

  async function showHeldPanel(ctx, pass, userId, page = 1) {
    const data = await getUserData(userId);
    data.user_id = userId;
    const poke = (data.pokes || []).find((p) => String(p.pass) === String(pass));
    if (!poke) {
      await ctx.answerCbQuery('Poke not found');
      return;
    }
    const sanitizedHeld = getSanitizedHeldItemForPokemon(poke, poke.held_item);
    if (normalizeHeldItemName(poke.held_item) !== normalizeHeldItemName(sanitizedHeld)) {
      poke.held_item = sanitizedHeld;
      await saveUserData2(userId, data);
    }
    const panel = buildHeldPanel(data, poke, page);
    await editMessage('caption', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, panel.msg, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: panel.rows }
    });
  }

  async function equipHeldItem(ctx, userId, pass, heldItem, page = 1) {
    const data = await getUserData(userId);
    data.user_id = userId;
    const poke = (data.pokes || []).find((p) => String(p.pass) === String(pass));
    if (!poke) {
      await ctx.answerCbQuery('Poke not found', { show_alert: true });
      return;
    }

    const heldStoneKey = normalizeStoneKey(heldItem, stones);
    if (stones && stones[heldStoneKey] && stones[heldStoneKey].pokemon && normalizePokemonName(stones[heldStoneKey].pokemon) !== normalizePokemonName(poke.name)) {
      await ctx.answerCbQuery('That item does not match this Pokemon.', { show_alert: true });
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

    const restrictionMessage = getPokemonHeldItemRestrictionMessage(poke, heldItem);
    if (restrictionMessage) {
      poke.held_item = getSanitizedHeldItemForPokemon(poke, poke.held_item);
      await saveUserData2(userId, data);
      await showHeldPanel(ctx, pass, userId, page);
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
    await showHeldPanel(ctx, pass, userId, page);
    await ctx.answerCbQuery('Held item updated!', { show_alert: false });
  }

  bot.action(/^heldpanel_([^_]+)_(\d+)(?:_(\d+))?$/, check2q, async (ctx) => {
    const pass = ctx.match[1];
    const userId = Number(ctx.match[2]);
    const page = Number(ctx.match[3] || 1);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }
    await showHeldPanel(ctx, pass, userId, page);
    await ctx.answerCbQuery();
  });

  bot.action(/^heldpick_(.+)_([^_]+)_(\d+)(?:_(\d+))?$/, check2q, async (ctx) => {
    const heldItem = normalizeHeldItemName(decodeURIComponent(ctx.match[1]));
    const pass = ctx.match[2];
    const userId = Number(ctx.match[3]);
    const page = Number(ctx.match[4] || 1);
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
                { text: 'Yes', callback_data: 'heldreplace_' + encodeURIComponent(heldItem) + '_' + pass + '_' + userId + '_' + page },
                { text: 'No', callback_data: 'heldpanel_' + pass + '_' + userId + '_' + page }
              ]
            ]
          }
        }
      );
      await ctx.answerCbQuery('Choose whether to replace it.');
      return;
    }

    await equipHeldItem(ctx, userId, pass, heldItem, page);
  });

  bot.action(/^heldreplace_(.+)_([^_]+)_(\d+)(?:_(\d+))?$/, check2q, async (ctx) => {
    const heldItem = normalizeHeldItemName(decodeURIComponent(ctx.match[1]));
    const pass = ctx.match[2];
    const userId = Number(ctx.match[3]);
    const page = Number(ctx.match[4] || 1);
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }
    await equipHeldItem(ctx, userId, pass, heldItem, page);
  });

  bot.action(/^heldremove_([^_]+)_(\d+)(?:_(\d+))?$/, check2q, async (ctx) => {
    const pass = ctx.match[1];
    const userId = Number(ctx.match[2]);
    const page = Number(ctx.match[3] || 1);
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
    await showHeldPanel(ctx, pass, userId, page);
    await ctx.answerCbQuery('Held item removed!', { show_alert: false });
  });
}

module.exports = registerHeldPanelCallbacks;
