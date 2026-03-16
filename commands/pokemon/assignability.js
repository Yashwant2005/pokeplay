function registerAssignAbilityCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const {
    ensureCanonicalAbilityOnPokemonEntry,
    titleCaseAbility,
  } = require('../../utils/pokemon_ability');

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
    const key = (raw || 'allusers').toLowerCase();
    const key2 = key.replace(/ /g, '-');

    if (['all', 'allpokes', 'allpokemon'].includes(key2)) {
      let assigned = 0;
      for (const p of data.pokes) {
        if (await ensureCanonicalAbilityOnPokemonEntry(p, pokes, fetch)) assigned += 1;
      }
      if (assigned > 0) {
        await saveUserData2(ctx.from.id, data);
      }
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Checked *' + data.pokes.length + '* pokemon(s).\nAssigned ability to *' + assigned + '* pokemon(s).',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (['allusers', 'alluser', 'global', 'everyone'].includes(key2)) {
      if (!admins.includes(ctx.from.id)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Only *admins* can run global assignment.', { reply_to_message_id: ctx.message.message_id });
        return;
      }

      const allUsers = await getAllUserData();
      let usersTouched = 0;
      let usersChanged = 0;
      let totalChecked = 0;
      let totalAssigned = 0;

      for (const row of allUsers) {
        if (!row || !row.data || !Array.isArray(row.data.pokes) || row.data.pokes.length < 1) {
          continue;
        }
        usersTouched += 1;
        let changed = 0;
        for (const p of row.data.pokes) {
          totalChecked += 1;
          if (await ensureCanonicalAbilityOnPokemonEntry(p, pokes, fetch)) {
            changed += 1;
            totalAssigned += 1;
          }
        }
        if (changed > 0) {
          usersChanged += 1;
          await saveUserData2(row.user_id, row.data);
        }
      }

      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Global ability assignment completed.*\n'
          + 'Users scanned: *' + usersTouched + '*\n'
          + 'Users updated: *' + usersChanged + '*\n'
          + 'Pokemon checked: *' + totalChecked + '*\n'
          + 'Abilities assigned: *' + totalAssigned + '*',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    let target = data.pokes.find((p) => String(p.pass || '').toLowerCase() === key)
      || data.pokes.find((p) => p.nickname && String(p.nickname).toLowerCase() === key)
      || data.pokes.find((p) => String(p.name || '').toLowerCase() === key2);

    if (!target) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *matching pokemon* found.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (target.ability && String(target.ability).trim().length > 0) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*'+c(target.name)+'* already has ability: *'+titleCaseAbility(target.ability)+'*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    await ensureCanonicalAbilityOnPokemonEntry(target, pokes, fetch);
    await saveUserData2(ctx.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Assigned Ability:* '+titleCaseAbility(target.ability)+'\n*Pokemon:* '+c(target.name), { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerAssignAbilityCommand;
