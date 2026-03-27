function register_065_evolve(bot, deps) {
  const { check2q, getUserData, editMessage, forms, pokes, growth_rates, chart, c, chains } = deps;
  const { getReadyEvolutionRows, getEvolutionRowsForPokemon, getPseudoRandomEvolutionLevel, isEvolutionRequirementMet } = require('../../utils/evolution_rules');
  const { getEvolutionStoneForTarget, titleCaseEvolutionStone } = require('../../utils/evolution_items');

  const buildEvolutionButtons = (rows, pass, userId, pokemonName, currentLevel, data) => {
    const buttons = rows.map((row) => ({
      text: (() => {
        if (isEvolutionRequirementMet(pokemonName, currentLevel, row, { data, now: new Date() })) {
          return c(row.evolved_pokemon);
        }
        if (String(row.evolution_method || '').toLowerCase() === 'use-item') {
          const stoneName = getEvolutionStoneForTarget(row.evolved_pokemon);
          const levelNeeded = getPseudoRandomEvolutionLevel(pokemonName, row);
          if (stoneName) return c(row.evolved_pokemon) + ' Lv' + levelNeeded + ' ' + c(titleCaseEvolutionStone(stoneName));
          return c(row.evolved_pokemon) + ' Lv' + levelNeeded;
        }
        return c(row.evolved_pokemon) + ' Lv' + (Number(row.evolution_level) || 1);
      })(),
      callback_data: 'evytarget_' + pass + '_' + userId + '_' + row.evolved_pokemon
    }));
    const keyboard = [];
    for (let i = 0; i < buttons.length; i += 2) {
      keyboard.push(buttons.slice(i, i + 2));
    }
    keyboard.push([{ text: 'Cancel', callback_data: 'delete_' + userId }]);
    return keyboard;
  };

  bot.action(/evolve_/, check2q, async ctx => {
    const pass = ctx.callbackQuery.data.split('_')[1];
    const id = ctx.callbackQuery.data.split('_')[2];
    const data = await getUserData(ctx.from.id);
    const poke = data.pokes.filter((p) => p.pass === pass)[0];

    if (id != ctx.from.id) {
      ctx.answerCbQuery();
      return;
    }
    if (!poke) {
      ctx.answerCbQuery('Poke not found', { show_alert: true });
      return;
    }

    const p2 = poke;
    const g = growth_rates[p2.name];
    const exp = chart[g.growth_rate];
    const matchingLevels = Object.keys(exp).filter((level) => p2.exp >= exp[level]);
    const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
    const readyEvolutions = getReadyEvolutionRows(p2.name, currentLevel, chains, forms, { data, now: new Date() });
    const allEvolutionRows = getEvolutionRowsForPokemon(p2.name, chains, forms);

    if (allEvolutionRows.length < 1) {
      await ctx.answerCbQuery(c(p2.name) + ' does not evolve further.', { show_alert: true });
      return;
    }

    if (allEvolutionRows.length > 1) {
      const label = String(p2.name).toLowerCase() == 'eevee' ? 'Eeveelution' : 'evolution';
      await editMessage('caption', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Choose which *' + label + '* you want for *' + c(p2.name) + '*', {
        reply_markup: { inline_keyboard: buildEvolutionButtons(allEvolutionRows, p2.pass, ctx.from.id, p2.name, currentLevel, data) },
        parse_mode: 'markdown'
      });
      return;
    }

    if (readyEvolutions.length < 1) {
      await ctx.answerCbQuery(c(p2.name) + ' does not meet the evolution requirements yet.', { show_alert: true });
      return;
    }

    await editMessage('caption', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'Are You Sure To Evolve Your *' + c(p2.name) + '* (*Lv.* ' + currentLevel + ')', {
      reply_markup: {
        inline_keyboard: [[
          { text: 'Evolve', callback_data: 'evy_' + p2.name + '_' + p2.pass + '_' + ctx.from.id },
          { text: 'Cancel', callback_data: 'delete_' + ctx.from.id }
        ]]
      },
      parse_mode: 'markdown'
    });
  });
}

module.exports = register_065_evolve;
