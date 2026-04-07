const { getPokemonDexnav } = require('../../utils/dexnav');

function register_078_ryf(bot, deps) {
  const { editMessage, forms, pokes, c, safari, rdata } = deps;

  const buildFallbackLines = (poke) => {
    const lines = [];
    const regionPool = [];

    for (const regionId in rdata) {
      if (rdata[regionId].includes(poke)) {
        regionPool.push(c(regionId));
      }
    }

    if (regionPool.length > 0) {
      lines.push('<b>&bull; Region pool -</b> [' + regionPool.join(', ') + ']');
    }

    const safariPool = Object.keys(safari).filter((regionId) => safari[regionId].includes(poke));
    if (safariPool.length > 0) {
      lines.push('<b>&bull; Safari -</b> [' + safariPool.map((regionId) => c(regionId)).join(', ') + ']');
    }

    return lines;
  };

  const buildDexnavLines = (dexnav) => {
    if (!dexnav || !Array.isArray(dexnav.regions) || dexnav.regions.length < 1) {
      return [];
    }

    return dexnav.regions.map((region) => {
      const locations = Array.isArray(region.locations) ? region.locations : [];
      const shown = locations.slice(0, 8).map((location) => c(location.name));
      let line = '<b>&bull; ' + c(region.label) + ' -</b> [' + shown.join(', ') + ']';
      if (locations.length > shown.length) {
        line += ' +' + (locations.length - shown.length) + ' more';
      }
      return line;
    });
  };

  bot.action(/ryf_/, async (ctx) => {
    const poke = ctx.callbackQuery.data.split('_')[1];
    const id = ctx.callbackQuery.data.split('_')[2];
    const form = ctx.callbackQuery.data.split('_')[3] * 1;
    if (ctx.from.id != id) {
      return;
    }

    const py = forms[poke][form - 1];
    if (!pokes[py.identifier] || !pokes[py.identifier].front_default_image) {
      ctx.answerCbQuery('*Something went wrong.*');
      return;
    }

    let msg = '<b>' + c(py.identifier) + '</b> Spawn Locations';
    const transformedForms = ['mega', 'gmax', 'origin', 'primal', 'crowned', 'eternamax'];

    if (transformedForms.includes(py.form_identifier)) {
      msg = '\n\nThis <b>Pokemon</b> has transformed from <b>' + c(poke) + '</b>';
    } else {
      let lines = [];
      try {
        const dexnav = await getPokemonDexnav(poke);
        lines = buildDexnavLines(dexnav);
      } catch (error) {
        console.error('[pokedex spawn locations error]', error);
      }

      if (lines.length < 1) {
        lines = buildFallbackLines(poke);
      }

      if (lines.length > 0) {
        msg += '\n\n' + lines.join('\n');
        msg += '\n\n<i>Gift and special-method locations are included when PokemonDB lists them.</i>';
      } else {
        msg += '\n\n<i>No spawn location data was found.</i>';
      }
    }

    const key = [[
      { text: 'About', callback_data: 'pkydex_' + poke + '_' + ctx.from.id + '_' + form + '' },
      { text: 'Base Stats', callback_data: 'bst_' + poke + '_' + ctx.from.id + '_' + form + '' }
    ]];
    if (forms[poke].length > 1) {
      key.push([
        { text: '<', callback_data: 'ryf_' + poke + '_' + ctx.from.id + '_' + (form - 1) + '' },
        { text: '' + form + '/' + forms[poke].length + '', callback_data: 'ntg' },
        { text: '>', callback_data: 'ryf_' + poke + '_' + ctx.from.id + '_' + (form + 1) + '' }
      ]);
    }

    await editMessage(
      'media',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      {
        type: 'photo',
        media: pokes[py.identifier].front_default_image,
        caption: msg,
        parse_mode: 'html'
      },
      { reply_markup: { inline_keyboard: key } }
    );
  });
}

module.exports = register_078_ryf;
