function registerAssignMoveCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, forms, pokes, pokemoves, dmoves, growth_rates, chart, c, chains, admins, getAllUserData } = deps;
  const { sanitizePokemonMoves } = require('../../utils/pokemon_legality');

  function findTargetPokemon(data, key) {
    return data.pokes.find((p) => String(p.pass || '').toLowerCase() === key)
      || data.pokes.find((p) => p.nickname && String(p.nickname).toLowerCase() === key)
      || data.pokes.find((p) => String(p.name || '').toLowerCase() === key);
  }

  function summarizeList(list, localDeps) {
    let checked = 0;
    let changed = 0;
    let removedCount = 0;
    let addedCount = 0;

    for (const pokemon of list) {
      checked += 1;
      const result = sanitizePokemonMoves(pokemon, localDeps);
      if (!result.changed) continue;
      changed += 1;
      removedCount += result.removedCount;
      addedCount += result.addedCount;
    }

    return { checked, changed, removedCount, addedCount };
  }

  bot.command('assignmove', async (ctx) => {
    if (!admins.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'This is an *admin-only* command.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.inv || !Array.isArray(data.pokes)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const raw = ctx.message.text.split(' ').slice(1).join(' ').trim();
    const mode = (raw || 'allusers').toLowerCase().replace(/ /g, '-');
    const repairDeps = { pokemoves, dmoves, chains, forms, growth_rates, chart };

    if (['all', 'allpokes', 'allpokemon'].includes(mode)) {
      const summary = summarizeList(data.pokes, repairDeps);
      if (summary.changed > 0) {
        await saveUserData2(ctx.from.id, data);
      }
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Checked *' + summary.checked + '* pokemon(s).\n'
          + 'Movesets fixed: *' + summary.changed + '*\n'
          + 'Illegal moves removed: *' + summary.removedCount + '*\n'
          + 'Legal moves assigned: *' + summary.addedCount + '*',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (['allusers', 'alluser', 'global', 'everyone'].includes(mode)) {
      const allUsers = await getAllUserData();
      let usersTouched = 0;
      let usersChanged = 0;
      let totalChecked = 0;
      let totalChanged = 0;
      let totalRemoved = 0;
      let totalAdded = 0;

      for (const row of allUsers) {
        if (!row || !row.data || !Array.isArray(row.data.pokes) || row.data.pokes.length < 1) continue;
        usersTouched += 1;
        const summary = summarizeList(row.data.pokes, repairDeps);
        totalChecked += summary.checked;
        totalChanged += summary.changed;
        totalRemoved += summary.removedCount;
        totalAdded += summary.addedCount;
        if (summary.changed > 0) {
          usersChanged += 1;
          await saveUserData2(row.user_id, row.data);
        }
      }

      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Global move repair completed.*\n'
          + 'Users scanned: *' + usersTouched + '*\n'
          + 'Users updated: *' + usersChanged + '*\n'
          + 'Pokemon checked: *' + totalChecked + '*\n'
          + 'Movesets fixed: *' + totalChanged + '*\n'
          + 'Illegal moves removed: *' + totalRemoved + '*\n'
          + 'Legal moves assigned: *' + totalAdded + '*',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const target = findTargetPokemon(data, mode);
    if (!target) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const before = Array.isArray(target.moves) ? target.moves.slice() : [];
    const result = sanitizePokemonMoves(target, repairDeps, { forceReplace: true });
    if (result.changed) {
      await saveUserData2(ctx.from.id, data);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Pokemon:* ' + c(target.name) + '\n'
          + '*Old move count:* ' + before.length + '\n'
          + '*New move count:* ' + result.finalMoves.length + '\n'
          + '*Illegal moves removed:* ' + result.removedCount + '\n'
          + '*Legal moves assigned:* ' + result.addedCount,
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*'+c(target.name)+'* already has a legal moveset.',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerAssignMoveCommand;
