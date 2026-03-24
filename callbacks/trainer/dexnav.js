const {
  buildLocationSummary,
  getLocationDexnav,
  getPokemonDexnav,
  titleizeRegion
} = require('../../utils/dexnav');

function registerDexNavCallback(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const locationsPerPage = 12;

  const buildLocationKeyboard = (species, regionId, locations, page, userId) => {
    const maxPage = Math.max(0, Math.ceil(locations.length / locationsPerPage) - 1);
    const safePage = Math.min(Math.max(Number(page) || 0, 0), maxPage);
    const start = safePage * locationsPerPage;
    const pageItems = locations.slice(start, start + locationsPerPage);
    const keyboard = [];

    for (let i = 0; i < pageItems.length; i += 2) {
      keyboard.push(
        pageItems.slice(i, i + 2).map((location, offset) => ({
          text: location.name,
          callback_data: 'dexnav_pick:' + species + ':' + regionId + ':' + (start + i + offset) + '_' + userId + ''
        }))
      );
    }

    const navRow = [];
    if (safePage > 0) {
      navRow.push({ text: 'Prev', callback_data: 'dexnav_list:' + species + ':' + regionId + ':' + (safePage - 1) + '_' + userId + '' });
    }
    if (safePage < maxPage) {
      navRow.push({ text: 'Next', callback_data: 'dexnav_list:' + species + ':' + regionId + ':' + (safePage + 1) + '_' + userId + '' });
    }
    if (navRow.length > 0) {
      keyboard.push(navRow);
    }

    const backRow = [{ text: 'Regions', callback_data: 'dexnav_regions:' + species + '_' + userId + '' }];
    keyboard.push(backRow);

    return {
      page: safePage,
      maxPage,
      keyboard
    };
  };

  const buildRegionKeyboard = (species, regions, userId) => {
    const keyboard = [];
    for (let i = 0; i < regions.length; i += 2) {
      keyboard.push(
        regions.slice(i, i + 2).map((region) => ({
          text: region.label,
          callback_data: 'dexnav_list:' + species + ':' + region.id + ':0_' + userId + ''
        }))
      );
    }
    return keyboard;
  };

  const buildDetailKeyboard = (species, regionId, userId) => ([
    [
      { text: 'Back To Locations', callback_data: 'dexnav_list:' + species + ':' + regionId + ':0_' + userId + '' },
      { text: 'Regions', callback_data: 'dexnav_regions:' + species + '_' + userId + '' }
    ]
  ]);

  bot.action(/dexnav_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const payload = parts[1];
    const userId = parts[2];

    if (ctx.from.id != userId) {
      ctx.answerCbQuery();
      return;
    }

    const payloadParts = String(payload || '').split(':');
    const action = payloadParts[0];
    const species = payloadParts[1];
    const regionId = payloadParts[2];
    const pageOrIndex = payloadParts[3];

    let dexnav;
    try {
      dexnav = await getPokemonDexnav(species);
    } catch (error) {
      console.error('[dexnav callback error]', error);
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        'DexNav could not reach *PokemonDB* right now. Please try again in a bit.',
        { parse_mode: 'markdown' }
      );
      return;
    }

    if (action === 'regions') {
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        '*DexNav:* _' + c(species) + '_\n\nChoose a *region* to see where it appears.',
        {
          parse_mode: 'markdown',
          reply_markup: {
            inline_keyboard: buildRegionKeyboard(species, dexnav.regions || [], ctx.from.id)
          }
        }
      );
      return;
    }

    const region = (dexnav.regions || []).find((entry) => entry.id === regionId);
    if (!region) {
      ctx.answerCbQuery('That region is not available right now.', { show_alert: true });
      return;
    }

    if (action === 'list') {
      const pageData = buildLocationKeyboard(species, regionId, region.locations || [], pageOrIndex, ctx.from.id);
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        '*DexNav:* _' + c(species) + '_\n*Region:* _' + region.label + '_\n\nPick a *location*.\n_Page ' + (pageData.page + 1) + ' of ' + (pageData.maxPage + 1) + '_',
        {
          parse_mode: 'markdown',
          reply_markup: {
            inline_keyboard: pageData.keyboard
          }
        }
      );
      return;
    }

    if (action !== 'pick') {
      ctx.answerCbQuery();
      return;
    }

    const selectedLocation = (region.locations || [])[Number(pageOrIndex)] || null;
    if (!selectedLocation) {
      ctx.answerCbQuery('That location is not available right now.', { show_alert: true });
      return;
    }

    let locationData;
    try {
      locationData = await getLocationDexnav(selectedLocation.url);
    } catch (error) {
      console.error('[dexnav location error]', error);
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        'DexNav could not load *' + c(selectedLocation.name) + '* right now. Please try again.',
        {
          parse_mode: 'markdown',
          reply_markup: {
            inline_keyboard: buildDetailKeyboard(species, regionId, ctx.from.id)
          }
        }
      );
      return;
    }

    const summary = buildLocationSummary(locationData, species);
    const lines = [];
    lines.push('*DexNav:* _' + c(species) + '_');
    lines.push('*Region:* _' + titleizeRegion(regionId) + '_');
    lines.push('*Location:* _' + c(selectedLocation.name) + '_');
    lines.push('');

    if (summary.targetRows.length > 0) {
      lines.push('*Spawn info for ' + c(species) + '*');
      for (const row of summary.targetRows.slice(0, 8)) {
        const parts2 = [];
        if (row.generation) parts2.push(row.generation);
        if (row.method) parts2.push(row.method);
        if (row.games && row.games.length > 0) parts2.push(row.games.join('/'));
        parts2.push('Lv. ' + row.levels);
        if (row.rarity) parts2.push(row.rarity);
        lines.push('- ' + parts2.join(' | '));
      }
    } else {
      lines.push('*Spawn info for ' + c(species) + '*');
      lines.push('- No direct encounter row was found on this page.');
    }

    lines.push('');
    lines.push('*Other Pokemon here*');
    const otherRows = summary.others.slice(0, 25);
    if (otherRows.length < 1) {
      lines.push('- No other encounter data was found.');
    } else {
      for (const row of otherRows) {
        lines.push('- ' + c(row.pokemon) + ' | Lv. ' + row.levels);
      }
      if (summary.others.length > otherRows.length) {
        lines.push('- ...and ' + (summary.others.length - otherRows.length) + ' more');
      }
    }

    await editMessage(
      'text',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      lines.join('\n'),
      {
        parse_mode: 'markdown',
        reply_markup: {
          inline_keyboard: buildDetailKeyboard(species, regionId, ctx.from.id)
        }
      }
    );
  });
}

module.exports = registerDexNavCallback;
