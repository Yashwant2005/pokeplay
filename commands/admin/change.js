function normalizePokemonName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function registerChangeCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  bot.command('change', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const args = String(ctx.message.text || '').split(' ').slice(1);
    const fromName = normalizePokemonName(args[0]);
    const toName = normalizePokemonName(args[1]);

    if (!fromName || !toName) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /change <pokemon> <pokemon>\nThis runs globally for all users.');
      return;
    }

    if (!pokes[fromName]) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid source pokemon:* ' + c(fromName));
      return;
    }

    if (!pokes[toName]) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid target pokemon:* ' + c(toName));
      return;
    }

    const allUsers = await getAllUserData();
    let usersScanned = 0;
    let usersUpdated = 0;
    let totalChanged = 0;

    for (const row of allUsers) {
      if (!row || !row.data || !Array.isArray(row.data.pokes) || row.data.pokes.length < 1) continue;
      usersScanned += 1;

      let changedForUser = 0;
      for (const pk of row.data.pokes) {
        if (!pk || typeof pk !== 'object') continue;
        if (String(pk.name || '').toLowerCase() !== fromName) continue;

        // Keep same pokemon instance data; only switch species identity/base-stat source.
        pk.name = toName;
        pk.id = pokes[toName].pokedex_number;
        changedForUser += 1;
      }

      if (changedForUser > 0) {
        usersUpdated += 1;
        totalChanged += changedForUser;
        await saveUserData2(row.user_id, row.data);
      }
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Global change completed.*\n'
      + 'From: *' + c(fromName) + '*\n'
      + 'To: *' + c(toName) + '*\n'
      + 'Users scanned: *' + usersScanned + '*\n'
      + 'Users updated: *' + usersUpdated + '*\n'
      + 'Pokemon changed: *' + totalChanged + '*'
    );
  });
}

module.exports = registerChangeCommand;
