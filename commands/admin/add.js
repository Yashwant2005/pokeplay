function registerAddCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

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
    const level = args[1];
    const amount = isNaN(args[2]) ? 1 : parseFloat(args[2]);

    if (amount > 150) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Dont Keep Too High Amount');
      return;
    }

    const reply = ctx.message.reply_to_message;
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
    // /add <poke_name> <level> <nature> <hp_iv> <atk_iv> <def_iv> <spa_iv> <spd_iv> <spe_iv>
    if (args.length >= 9) {
      const pokeName = poke.toLowerCase();
      const poked = pokes[pokeName];
      const customNature = String(args[2] || '').toLowerCase();
      const ivInputs = args.slice(3, 9).map((value) => parseInt(value));
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

        const da = {
          name: pokeName,
          id: poked.pokedex_number,
          nature: customNature,
          exp: chart[growth.growth_rate][levelInt],
          pass: word(8),
          ivs: iv,
          symbol: args.slice(9).join(' ').toLowerCase().includes('shiny') ? '✨' : '',
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
          exp: chart[g.growth_rate][level],
          pass: word(8),
          ivs: iv,
          symbol: ctx.message.text.includes('shiny') ? '✨' : '',
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
