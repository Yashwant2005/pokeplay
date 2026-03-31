function registerIdTransferCommand(bot, deps) {
  const { admins, getUserData, overwriteUserData, sendMessage, clearUserSessions, c } = deps;

  bot.command('id_transfer', async (ctx) => {
    if (!Array.isArray(admins) || !admins.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Only admins can use /id_transfer.*', {
        reply_to_message_id: ctx.message && ctx.message.message_id
      });
      return;
    }

    const parts = String((ctx.message && ctx.message.text) || '').trim().split(/\s+/);
    const oldId = Number(parts[1]);
    const newId = Number(parts[2]);

    if (!Number.isFinite(oldId) || !Number.isFinite(newId)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n`/id_transfer olduid newuid`', {
        reply_to_message_id: ctx.message && ctx.message.message_id
      });
      return;
    }

    if (String(oldId) === String(newId)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Both IDs are the same. Nothing to transfer.*', {
        reply_to_message_id: ctx.message && ctx.message.message_id
      });
      return;
    }

    const oldData = await getUserData(oldId);
    const newData = await getUserData(newId);

    await overwriteUserData(oldId, newData);
    await overwriteUserData(newId, oldData);

    if (typeof clearUserSessions === 'function') {
      await clearUserSessions(oldId);
      await clearUserSessions(newId);
    }

    const oldNameBefore = oldData && oldData.inv && oldData.inv.name ? c(oldData.inv.name) : 'Empty';
    const newNameBefore = newData && newData.inv && newData.inv.name ? c(newData.inv.name) : 'Empty';

    const msg =
      '*ID transfer completed.*\n' +
      '`' + oldId + '` <= ' + newNameBefore + '\n' +
      '`' + newId + '` <= ' + oldNameBefore + '\n\n' +
      '_Saved account data for both IDs has been interchanged._';

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message && ctx.message.message_id
    });
  });
}

module.exports = registerIdTransferCommand;
