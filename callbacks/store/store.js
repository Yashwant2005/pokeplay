function register_043_store(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const {
    getDaysUntilWeeklyReset,
    getTmLpPrice,
    getWeeklyTmShop,
    refreshWeeklyTmShop,
    hasPurchasedSlotThisWeek,
    markPurchasedSlotThisWeek,
  } = require('../../utils/weekly_tm_shop');
  const {
    getHeldItemCatalog,
    getHeldItemDescription,
    getHeldItemPrice,
    normalizeHeldItemShopName,
    titleCaseHeldItem
  } = require('../../utils/held_item_shop');

  const STORE_TABS = ['buy', 'heldlp', 'tms', 'sell'];

  function buildStoreNav(ctx, active) {
    const others = STORE_TABS.filter((item) => item !== active);
    const buttons = others.map((word) => ({
      text: c(word === 'heldlp' ? 'held' : word),
      callback_data: 'store_' + word + '_' + ctx.from.id
    }));
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    return rows;
  }

  function buildBuyMessage() {
    return `*Welcome To Poke Store (Buy Section)*

*PokeBalls*
• Regular Ball - 15 💷
• Great Ball - 25 💷
• Ultra Ball - 40 💷
• Repeat Ball - 50 💷
• Beast Ball - 100 💷
• Quick Ball - 65 💷
• Net Ball - 45 💷
• Nest Ball - 55 💷

*Items*
• Candy - 100 💷
• Berry - 75 💷
• Vitamin - 100 💷
• OmniRing - 5000 💷
• Zygarde Capsule - 10000 💷
• Ability Capsule - 25000 💷
• Ability Patch - 50000 💷

*Held Items*
• Open *Held* to buy held items with League Points

*Examples*
• /buy regular 1
• /buy nest 5
• /buy candy 3
• /buy key
• /buy zygardecapsule 1

_Use /pokeballs to get Pokeball details._
_Use /buy to buy from PokeStore._`;
  }

  function buildSellMessage() {
    return `*Welcome To Poke Store (Sell Section)*

*PokeBalls*
• Regular Ball - 7 💷
• Great Ball - 12 💷
• Ultra Ball - 20 💷
• Repeat Ball - 25 💷
• Beast Ball - 50 💷
• Quick Ball - 40 💷
• Net Ball - 25 💷
• Nest Ball - 30 💷
• Friend Ball - 25 💷
• Level Ball - 25 💷
• Moon Ball - 35 💷
• Sport Ball - 15 💷
• Luxury Ball - 10 💷
• Premier Ball - 8 💷
• Park Ball - 75 💷
• Master Ball - 3000 💷

*Items*
• Candy - 50 💷
• Berry - 40 💷
• Vitamin - 50 💷
• Item - 5000 💷

*Examples*
• /sell regular 1
• /sell candy 1
• /sell items
• /sell master 1`;
  }

  function buildWeeklyTmMessage(ctx, data, page) {
    const shop = getWeeklyTmShop(data, ctx.from.id, tms, tmprices);
    const total = shop.selection.length;
    const perPage = 5;
    const maxPage = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(maxPage, Math.max(1, Number(page || 1)));
    const start = (safePage - 1) * perPage;
    const view = shop.selection.slice(start, start + perPage);
    const boughtCount = shop.selection.filter((tm) => hasPurchasedSlotThisWeek(data, tm)).length;
    const daysLeft = getDaysUntilWeeklyReset(shop.weekKey);
    const lines = ['<b>【 TMS 】</b>', ''];

    for (const t of view) {
      const m = tms.tmnumber[String(t)];
      if (!m) continue;
      const lp = getTmLpPrice(t, tmprices);
      const bought = hasPurchasedSlotThisWeek(data, t);
      lines.push('<b>TM #' + String(t).padStart(3, '0') + '</b>');
      lines.push(c(dmoves[m].name));
      lines.push('────────────');
      lines.push('Type: ' + emojis[dmoves[m].type] + ' ' + c(dmoves[m].type));
      lines.push('Category: ' + c(dmoves[m].category));
      lines.push('Power: ' + dmoves[m].power);
      lines.push('Accuracy: ' + dmoves[m].accuracy);
      lines.push('Price: ' + lp + ' ⭐' + (bought ? ' [Bought]' : ''));
      lines.push('');
    }

    if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
    if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
    lines.push('Store expires in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's'));
    lines.push('Your PokeCoins: ' + data.inv.pc + ' 💷');
    lines.push('Your League Points: ' + data.inv.league_points + ' ⭐');
    lines.push('Page ' + safePage + '/' + maxPage + ' | Bought: ' + boughtCount + '/10');

    return {
      text: lines.join('\n'),
      shop,
      page: safePage,
      maxPage,
    };
  }

  function buildWeeklyTmKeyboard(ctx, data, shop, page, maxPage) {
    const perPage = 5;
    const start = (page - 1) * perPage;
    const view = shop.selection.slice(start, start + perPage);
    const rows = [];
    const tmRow = [];

    for (const t of view) {
      const bought = hasPurchasedSlotThisWeek(data, t);
      tmRow.push({
        text: bought ? 'TM' + t + '✓' : 'TM' + t,
        callback_data: bought ? 'crncl' : 'tmbuylp_' + t + '_' + ctx.from.id
      });
    }
    if (tmRow.length) rows.push(tmRow);

    rows.push([
      { text: '<', callback_data: 'store_tms_' + ctx.from.id + '_' + Math.max(1, page - 1) },
      { text: 'Page ' + page + '/' + maxPage, callback_data: 'crncl' },
      { text: '>', callback_data: 'store_tms_' + ctx.from.id + '_' + Math.min(maxPage, page + 1) }
    ]);
    rows.push([{ text: 'Refresh Weekly TMs (10000 PC)', callback_data: 'tmrefresh_' + ctx.from.id }]);
    rows.push(...buildStoreNav(ctx, 'tms'));
    return rows;
  }

  function getHeldShopEntries() {
    return getHeldItemCatalog().flatMap((tier) => tier.items.map((item) => ({
      item,
      lp: tier.lp
    })));
  }

  function buildHeldStoreMessage(data, page) {
    const entries = getHeldShopEntries();
    const perPage = 10;
    const maxPage = Math.max(1, Math.ceil(entries.length / perPage));
    const safePage = Math.min(maxPage, Math.max(1, Number(page || 1)));
    const start = (safePage - 1) * perPage;
    const view = entries.slice(start, start + perPage);
    const lines = ['*Held Item Store*', '', '*Currency:* League Points', ''];

    let idx = start + 1;
    for (const entry of view) {
      lines.push('*' + idx + '.* ' + c(titleCaseHeldItem(entry.item)));
      lines.push('Effect: ' + c(getHeldItemDescription(entry.item)));
      lines.push('Price: ' + entry.lp + ' ⭐');
      lines.push('');
      idx += 1;
    }

    if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
    lines.push('Your League Points: ' + data.inv.league_points + ' ⭐');
    lines.push('Page ' + safePage + '/' + maxPage);
    lines.push('');
    lines.push('_Flame Orb coming soon._');

    return {
      text: lines.join('\n'),
      page: safePage,
      maxPage,
      view
    };
  }

  function buildHeldStoreKeyboard(ctx, page, maxPage, view) {
    const rows = [];
    const buyButtons = view.map((entry, index) => ({
      text: 'Held ' + (index + 1),
      callback_data: 'heldbuylp_' + entry.item + '_' + ctx.from.id + '_' + page
    }));
    for (let i = 0; i < buyButtons.length; i += 2) {
      rows.push(buyButtons.slice(i, i + 2));
    }
    rows.push([
      { text: '<', callback_data: 'store_heldlp_' + ctx.from.id + '_' + Math.max(1, page - 1) },
      { text: 'Page ' + page + '/' + maxPage, callback_data: 'crncl' },
      { text: '>', callback_data: 'store_heldlp_' + ctx.from.id + '_' + Math.min(maxPage, page + 1) }
    ]);
    rows.push(...buildStoreNav(ctx, 'heldlp'));
    return rows;
  }

  bot.action(/store_/, async ctx => {
    const item = ctx.callbackQuery.data.split('_')[1];
    const id = ctx.callbackQuery.data.split('_')[2];
    if (ctx.from.id != id) return;

    if (item === 'buy') {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildBuyMessage(), {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: buildStoreNav(ctx, 'buy') }
      });
      return;
    }

    if (item === 'sell') {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, buildSellMessage(), {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: buildStoreNav(ctx, 'sell') }
      });
      return;
    }

    if (item === 'heldlp') {
      const data = await getUserData(ctx.from.id);
      const page = ctx.callbackQuery.data.split('_')[3] * 1 || 1;
      const built = buildHeldStoreMessage(data, page);
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, built.text, {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: buildHeldStoreKeyboard(ctx, built.page, built.maxPage, built.view) }
      });
      return;
    }

    if (item === 'tms') {
      const page = ctx.callbackQuery.data.split('_')[3] * 1 || 1;
      const data = await getUserData(ctx.from.id);
      if (!data.tms) data.tms = {};
      const built = buildWeeklyTmMessage(ctx, data, page);
      const key = buildWeeklyTmKeyboard(ctx, data, built.shop, built.page, built.maxPage);
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, built.text, {
        parse_mode: 'html',
        reply_markup: { inline_keyboard: key }
      });
    }
  });

  bot.action(/tmrefresh_/, async ctx => {
    const id = ctx.callbackQuery.data.split('_')[1];
    if (ctx.from.id != id) return;

    const data = await getUserData(ctx.from.id);
    if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
    if (data.inv.pc < 10000) {
      ctx.answerCbQuery('Need 10000 PokeCoins to refresh weekly TMs', { show_alert: true });
      return;
    }

    data.inv.pc -= 10000;
    if (!data.tms) data.tms = {};
    refreshWeeklyTmShop(data, ctx.from.id, tms, tmprices);
    await saveUserData2(ctx.from.id, data);

    const built = buildWeeklyTmMessage(ctx, data, 1);
    const key = buildWeeklyTmKeyboard(ctx, data, built.shop, built.page, built.maxPage);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, built.text, {
      parse_mode: 'html',
      reply_markup: { inline_keyboard: key }
    });
    ctx.answerCbQuery('Weekly TM list refreshed');
  });

  bot.action(/tmbuylp_/, async ctx => {
    const parts = ctx.callbackQuery.data.split('_');
    const tm = String(parts[1]);
    const id = parts[2];
    if (ctx.from.id != id) return;

    const data = await getUserData(ctx.from.id);
    if (!data.tms) data.tms = {};
    const shop = getWeeklyTmShop(data, ctx.from.id, tms, tmprices);
    if (!shop.selection.includes(tm)) {
      ctx.answerCbQuery('This TM is not in your weekly list', { show_alert: true });
      return;
    }
    if (hasPurchasedSlotThisWeek(data, tm)) {
      ctx.answerCbQuery('This weekly TM slot is already used', { show_alert: true });
      return;
    }
    if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
    const lp = getTmLpPrice(tm, tmprices);
    if (data.inv.league_points < lp) {
      ctx.answerCbQuery('Not enough League Points', { show_alert: true });
      return;
    }

    data.inv.league_points -= lp;
    data.tms[tm] = Number(data.tms[tm] || 0) + 1;
    markPurchasedSlotThisWeek(data, tm);
    await saveUserData2(ctx.from.id, data);

    const built = buildWeeklyTmMessage(ctx, data, 1);
    const key = buildWeeklyTmKeyboard(ctx, data, built.shop, built.page, built.maxPage);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, built.text, {
      parse_mode: 'html',
      reply_markup: { inline_keyboard: key }
    });
    ctx.answerCbQuery('Bought TM' + tm + ' for ' + lp + ' LP');
  });

  bot.action(/heldbuylp_/, async ctx => {
    const parts = ctx.callbackQuery.data.split('_');
    const itemName = normalizeHeldItemShopName(parts[1]);
    const id = parts[2];
    const page = parts[3] * 1 || 1;
    if (ctx.from.id != id) return;

    const price = getHeldItemPrice(itemName, 'lp');
    if (!price) {
      ctx.answerCbQuery('Invalid held item', { show_alert: true });
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {};
    if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
    if (data.inv.league_points < price) {
      ctx.answerCbQuery('Not enough League Points', { show_alert: true });
      return;
    }

    data.inv.league_points -= price;
    data.extra.itembox.heldItems[itemName] = Number(data.extra.itembox.heldItems[itemName] || 0) + 1;
    await saveUserData2(ctx.from.id, data);

    const built = buildHeldStoreMessage(data, page);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, built.text, {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: buildHeldStoreKeyboard(ctx, built.page, built.maxPage, built.view) }
    });
    ctx.answerCbQuery('Bought ' + c(titleCaseHeldItem(itemName)) + ' for ' + price + ' LP');
  });
}

module.exports = register_043_store;
