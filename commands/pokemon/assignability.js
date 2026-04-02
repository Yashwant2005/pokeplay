function registerAssignAbilityCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, pokes, c, fetch, admins, getAllUserData } = deps;
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
  const { repairPokemonAbilityEntry } = require('../../utils/pokemon_legality');

  async function repairList(list, localDeps) {
    let checked = 0;
    let changed = 0;
    let assignedMissing = 0;
    let repairedInvalid = 0;

    for (const pokemon of list) {
      checked += 1;
      const result = await repairPokemonAbilityEntry(pokemon, localDeps);
      if (!result.changed) continue;
      changed += 1;
      if (result.reason === 'assigned-missing' || result.reason === 'assigned-fallback') {
        assignedMissing += 1;
      } else if (result.reason === 'repaired-invalid') {
        repairedInvalid += 1;
      }
    }

    return { checked, changed, assignedMissing, repairedInvalid };
  }

  bot.command('assignability', async (ctx) => {
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

    if (['all', 'allpokes', 'allpokemon'].includes(mode)) {
      const summary = await repairList(data.pokes, { pokes, fetch });
      if (summary.changed > 0) {
        await saveUserData2(ctx.from.id, data);
      }
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Checked *' + summary.checked + '* pokemon(s).\n'
          + 'Abilities fixed: *' + summary.changed + '*\n'
          + 'Missing abilities assigned: *' + summary.assignedMissing + '*\n'
          + 'Invalid abilities repaired: *' + summary.repairedInvalid + '*',
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
      let totalAssignedMissing = 0;
      let totalRepairedInvalid = 0;

      for (const row of allUsers) {
        if (!row || !row.data || !Array.isArray(row.data.pokes) || row.data.pokes.length < 1) continue;
        usersTouched += 1;
        const summary = await repairList(row.data.pokes, { pokes, fetch });
        totalChecked += summary.checked;
        totalChanged += summary.changed;
        totalAssignedMissing += summary.assignedMissing;
        totalRepairedInvalid += summary.repairedInvalid;
        if (summary.changed > 0) {
          usersChanged += 1;
          await saveUserData2(row.user_id, row.data);
        }
      }

      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Global ability repair completed.*\n'
          + 'Users scanned: *' + usersTouched + '*\n'
          + 'Users updated: *' + usersChanged + '*\n'
          + 'Pokemon checked: *' + totalChecked + '*\n'
          + 'Abilities fixed: *' + totalChanged + '*\n'
          + 'Missing abilities assigned: *' + totalAssignedMissing + '*\n'
          + 'Invalid abilities repaired: *' + totalRepairedInvalid + '*',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const target = data.pokes.find((p) => String(p.pass || '').toLowerCase() === mode)
      || data.pokes.find((p) => p.nickname && String(p.nickname).toLowerCase() === mode)
      || data.pokes.find((p) => String(p.name || '').toLowerCase() === mode);

    if (!target) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const result = await repairPokemonAbilityEntry(target, { pokes, fetch }, { forceReplace: true });
    if (result.changed) {
      await saveUserData2(ctx.from.id, data);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Pokemon:* ' + c(target.name) + '\n'
          + '*Old ability:* ' + titleCaseAbility(result.previousAbility) + '\n'
          + '*New ability:* ' + titleCaseAbility(result.nextAbility) + '\n'
          + '*Reason:* ' + c(result.reason),
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const currentAbility = target.ability ? titleCaseAbility(target.ability) : 'None';
    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*'+c(target.name)+'* already has a valid ability: *'+currentAbility+'*',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerAssignAbilityCommand;
