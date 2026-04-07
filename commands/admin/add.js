function registerAddCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, stones, spawn, pokes, pokemoves, dmoves, growth_rates, chart, word, getRandomNature, generateRandomIVs, applyCaptureIvRules, c, admins, shiny } = deps;
  const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');

  const buildLevelUpMoves = (pokeName, level) => {
    const moves = pokemoves[pokeName];
    if (!moves || !Array.isArray(moves.moves_info)) {
      return [];
    }
    const levelUpMoves = moves.moves_info.filter((move) =>
      move.learn_method === 'level-up' &&
      move.level_learned_at < level * 1 &&
      dmoves[move.id] &&
      dmoves[move.id].power &&
      dmoves[move.id].accuracy
    );
    const maxMoves = Math.min(Math.max(levelUpMoves.length, 1), 4);
    return levelUpMoves.slice(-maxMoves).map((m) => m.id);
  };

  bot.command('add', async ctx => {
    if (!admins.includes(ctx.from.id)) {
      return;
    }

    const args = ctx.message.text.split(' ').slice(1);
    const poke = args[0];
    const shinyToken = String(args[1] || '').trim();
    const hasShinyFlag = shinyToken === '-1' || shinyToken === '0' || shinyToken === '1';
    const forcedShiny = hasShinyFlag && (shinyToken === '-1' || shinyToken === '1');
    const levelIndex = hasShinyFlag ? 2 : 1;
    const amountIndex = hasShinyFlag ? 3 : 2;
    const levelArg = args[levelIndex];
    const amount = isNaN(args[amountIndex]) ? 1 : parseFloat(args[amountIndex]);

    // Support: /add lucario n100  → adds 100 Lucario with random levels 1-60
    const nBulkMatch = levelArg && /^n(\d+)$/i.exec(levelArg);
    if (nBulkMatch) {
      const bulkCount = Math.min(150, parseInt(nBulkMatch[1], 10) || 1);
      if (!poke || !reply) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Wrong Format*');
        return;
      }
      const pokeName = poke.toLowerCase();
      const poked = pokes[pokeName];
      if (!poked) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Unknown Pokemon: ' + c(poke) + '*');
        return;
      }
      const g = growth_rates[pokeName];
      if (!g || !chart[g.growth_rate]) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No growth rate data for ' + c(poke) + '*');
        return;
      }
      let added = 0;
      for (let i = 0; i < bulkCount; i++) {
        const randLevel = Math.floor(Math.random() * 60) + 1; // random 1–60
        if (chart[g.growth_rate][randLevel] === undefined) continue;
        const iv = await generateRandomIVs(spawn[pokeName] ? spawn[pokeName].toLowerCase() : 'common');
        const ev = { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 };
        const da = {
          name: pokeName,
          id: poked.pokedex_number,
          nature: getRandomNature(),
          ability: getRandomAbilityForPokemon(pokeName, pokes),
          held_item: 'none',
          exp: chart[g.growth_rate][randLevel],
          pass: word(8),
          ivs: applyCaptureIvRules(iv, { symbol: hasShinyFlag ? (forcedShiny ? '✨' : '') : '' }),
          symbol: hasShinyFlag ? (forcedShiny ? '✨' : '') : '',
          evs: ev,
          moves: buildLevelUpMoves(pokeName, randLevel)
        };
        if (!data.pokes) data.pokes = [];
        data.pokes.push(da);
        added++;
      }
      await saveUserData2(reply.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Successfully Added *' + added + ' ' + c(poke) + '* with random levels (1–60)');
      return;
    }

    if (amount > 150) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Dont Keep Too High Amount');
      return;
    }

    const reply = ctx.message.reply_to_message;
    const level = levelArg;
    if (!poke || !level || !reply) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Wrong Format*');
      return;
    }

    const data = await getUserData(reply.from.id);

    if (poke === 'stone') {
      const st = stones[level];
      if (!st) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*n/a*');
        return;
      }

      if (!data.inv.stones) {
        data.inv.stones = [];
      }

      data.inv.stones.push(level);
      await saveUserData2(reply.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Successfully Added *' + c(level) + '*');
      return;
    }

    // Custom admin format:
    // /add <poke_name> [<shiny_flag:-1|0|1>] <level> <nature> <hp_iv> <atk_iv> <def_iv> <spa_iv> <spd_iv> <spe_iv> [ability] [shiny]
    if (args.length >= (hasShinyFlag ? 10 : 9)) {
      const pokeName = poke.toLowerCase();
      const poked = pokes[pokeName];
      const natureIndex = hasShinyFlag ? 3 : 2;
      const ivStart = hasShinyFlag ? 4 : 3;
      const customNature = String(args[natureIndex] || '').toLowerCase();
      const ivInputs = args.slice(ivStart, ivStart + 6).map((value) => parseInt(value));
      const tailArgs = args.slice(ivStart + 6).map((x) => String(x || '').toLowerCase());
      const abilityArg = tailArgs.find((x) => x && x !== 'shiny') || '';
      const customAbility = abilityArg ? abilityArg.replace(/\s+/g, '-').trim() : '';
      const shinyRequested = tailArgs.includes('shiny');
      const levelInt = parseInt(level);
      const validIvs = ivInputs.length === 6 && ivInputs.every((v) => !isNaN(v) && v >= 0 && v <= 31);

      if (poked && customNature && validIvs && !isNaN(levelInt) && levelInt >= 1 && levelInt <= 100) {
        const growth = growth_rates[pokeName];
        if (!growth || !chart[growth.growth_rate] || chart[growth.growth_rate][levelInt] === undefined) {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid level/exp chart for this Pokemon*');
          return;
        }

        const ev = {
          hp: 0,
          attack: 0,
          defense: 0,
          special_attack: 0,
          special_defense: 0,
          speed: 0
        };
        const iv = {
          hp: ivInputs[0],
          attack: ivInputs[1],
          defense: ivInputs[2],
          special_attack: ivInputs[3],
          special_defense: ivInputs[4],
          speed: ivInputs[5]
        };
        const symbol = hasShinyFlag ? (forcedShiny ? '✨' : '') : (shinyRequested ? '✨' : '');
        const finalIvs = applyCaptureIvRules(iv, { symbol });

        const da = {
          name: pokeName,
          id: poked.pokedex_number,
          nature: customNature,
          ability: customAbility || getRandomAbilityForPokemon(pokeName, pokes),
          held_item: 'none',
          exp: chart[growth.growth_rate][levelInt],
          pass: word(8),
          ivs: finalIvs,
          symbol,
          evs: ev,
          moves: buildLevelUpMoves(pokeName, levelInt)
        };

        if (!data.pokes) {
          data.pokes = [];
        }

        data.pokes.push(da);
        await saveUserData2(reply.from.id, data);
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Successfully Added Custom *' + c(poke) + '*');
        return;
      }
    }

    for (let i = 0; i < amount; i++) {
      const pokeName = poke.toLowerCase();
      const poked = pokes[pokeName];

      if (poked) {
        const iv = await generateRandomIVs(spawn[pokeName].toLowerCase());
        const ev = {
          hp: 0,
          attack: 0,
          defense: 0,
          special_attack: 0,
          special_defense: 0,
          speed: 0
        };

        const g = growth_rates[pokeName];
        if (!g || !chart[g.growth_rate] || chart[g.growth_rate][level] === undefined) {
          continue;
        }

        const da = {
          name: pokeName,
          id: poked.pokedex_number,
          nature: getRandomNature(),
          ability: getRandomAbilityForPokemon(pokeName, pokes),
          held_item: 'none',
          exp: chart[g.growth_rate][level],
          pass: word(8),
          ivs: applyCaptureIvRules(iv, {
            symbol: hasShinyFlag ? (forcedShiny ? '✨' : '') : (ctx.message.text.includes('shiny') ? '✨' : '')
          }),
          symbol: hasShinyFlag ? (forcedShiny ? '✨' : '') : (ctx.message.text.includes('shiny') ? '✨' : ''),
          evs: ev,
          moves: buildLevelUpMoves(pokeName, level)
        };

        if (!data.pokes) {
          data.pokes = [];
        }

        data.pokes.push(da);
      }
    }

    await saveUserData2(reply.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Successfully Added *' + amount + ' ' + c(poke) + '*');
  });
}

module.exports = registerAddCommand;
