function registerEvolveCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
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

  bot.command('evolve', check2, async ctx => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]]
        }
      });
      return;
    }

    const name = ctx.message.text.split(' ').slice(1).join(' ');
    if (!name) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Please tell which pokemon you wanna evolve.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const name2 = name.replace(/ /g, '-');
    const p5 = data.pokes.filter((pk) => (pk.nickname && name.toLowerCase() === pk.nickname.toLowerCase()) || name2.toLowerCase() === pk.name)[0];

    if (!p5) {
      const matches = stringSimilarity.findBestMatch(name2, data.pokes.map((poke) => poke.nickname || poke.name));
      const bestMatch = matches.bestMatch.target;
      const similarity = matches.bestMatch.rating;

      if (similarity > 0.4 && name2.length > 3) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Did you mean : *' + c(bestMatch) + '*?', {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Yes', callback_data: 'suger_' + ctx.from.id + '_' + bestMatch + '_evolve_' + ctx.message.message_id },
              { text: 'No', callback_data: 'delete_' + ctx.from.id }
            ]]
          }
        });
      } else {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *Matching* found with this *Name.*', {
          reply_to_message_id: ctx.message.message_id
        });
      }
      return;
    }

    const p22 = data.pokes.filter((poke)=> (poke.name==name2.toLowerCase()) || (poke.nickname && poke.nickname.toLowerCase() == name.toLowerCase()));

    if (!p22 || p22.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You Does Not Have *' + name + '*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (p22.length == 1) {
      const p2 = p22[0];
      const g = growth_rates[p2.name];
      const exp = chart[g.growth_rate];
      const matchingLevels = Object.keys(exp).filter((level) => p2.exp >= exp[level]);
      const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
      const readyEvolutions = getReadyEvolutionRows(p2.name, currentLevel, chains, forms, { data, now: new Date() });
      const allEvolutionRows = getEvolutionRowsForPokemon(p2.name, chains, forms);

      if (allEvolutionRows.length < 1) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(p2.name) + '* does not evolve further', {
          reply_to_message_id: ctx.message.message_id
        });
        return;
      }

      if (allEvolutionRows.length > 1) {
        const label = String(p2.name).toLowerCase() == 'eevee' ? 'Eeveelution' : 'evolution';
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Choose which *' + label + '* you want for *' + c(p2.name) + '*', {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: { inline_keyboard: buildEvolutionButtons(allEvolutionRows, p2.pass, ctx.from.id, p2.name, currentLevel, data) }
        });
        return;
      }

      if (readyEvolutions.length < 1) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(p2.name) + '* does not meet the evolution requirements yet', {
          reply_to_message_id: ctx.message.message_id
        });
        return;
      }

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Are You Sure To Evolve Your *' + c(p2.name) + '* (*Lv.* ' + currentLevel + ')', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Evolve', callback_data: 'evy_' + p2.name + '_' + p2.pass + '_' + ctx.from.id + '_' + ctx.message.message_id },
            { text: 'Cancel', callback_data: 'delete_' + ctx.from.id }
          ]]
        }
      });
      return;
    }

    const ore = [];
    let message = '';
    const page = 1;
    const pageSize = 25;
    const startIdx = (page - 1) * pageSize;
    let b = startIdx + 1;
    const endIdx = startIdx + pageSize;
    const pokemon2 = await sort(ctx.from.id, p22);
    const pokemon = pokemon2.slice(startIdx, endIdx);

    message += await pokelist(pokemon.map((item) => item.pass), ctx, startIdx);

    for (const p of pokemon) {
      ore.push({ text: b, callback_data: 'evolve_' + p.pass + '_' + ctx.from.id + '_' + ctx.message.message_id });
      b++;
    }

    const rows = [];
    for (let i = 0; i < ore.length; i += 5) {
      rows.push(ore.slice(i, i + 5));
    }

    const rows2 = [];
    if (page > 1) {
      rows2.push({ text: '<', callback_data: 'suger_' + ctx.from.id + '_' + name2 + '_evolve_' + ctx.message.message_id + '_' + (page - 1) });
    }
    if ((endIdx + 1) < p22.length) {
      rows2.push({ text: '>', callback_data: 'suger_' + ctx.from.id + '_' + name2 + '_evolve_' + ctx.message.message_id + '_' + (page + 1) });
    }
    rows.push(rows2);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, message + '\n\n_Wanna Evolve To Which Pokemon?_', {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: { inline_keyboard: rows }
    });
  });
}

module.exports = registerEvolveCommand;
