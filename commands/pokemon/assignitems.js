function registerAssignItemsCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, pokes, admins, getAllUserData } = deps;
  function ensureHeldItemField(pokemon) {
    if (!pokemon || typeof pokemon !== 'object') return false;
    if (typeof pokemon.held_item === 'string' && pokemon.held_item.trim().length > 0) {
      return false;
    }
    pokemon.held_item = 'none';
    return true;
  }

  bot.command('assignitems', async (ctx) => {
    if (!admins.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'This is an *admin-only* command.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const raw = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim().toLowerCase();
    const mode = (raw || 'allusers').replace(/ /g, '-');

    if (['all', 'allpokes', 'allpokemon'].includes(mode)) {
      const data = await getUserData(ctx.from.id);
      if (!data.inv || !Array.isArray(data.pokes)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', { reply_to_message_id: ctx.message.message_id });
        return;
      }

      let assigned = 0;
      for (const p of data.pokes) {
        if (ensureHeldItemField(p)) assigned += 1;
      }
      if (assigned > 0) {
        await saveUserData2(ctx.from.id, data);
      }
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Checked *' + data.pokes.length + '* pokemon(s).\nAssigned held item field to *' + assigned + '* pokemon(s).',
        { reply_to_message_id: ctx.message.message_id }
      );
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
        if (ensureHeldItemField(p)) {
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
      '*Global held item assignment completed.*\n'
        + 'Users scanned: *' + usersTouched + '*\n'
        + 'Users updated: *' + usersChanged + '*\n'
        + 'Pokemon checked: *' + totalChecked + '*\n'
        + 'Held item fields assigned: *' + totalAssigned + '*',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerAssignItemsCommand;
