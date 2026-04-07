function registerConvertCommand(bot, deps) {
  const { admins, sendMessage } = deps;
  const { getCollection } = require('../../mongo');

  bot.command('convert', async (ctx) => {
    if (!Array.isArray(admins) || !admins.includes(ctx.from.id)) {
      return;
    }

    try {
      const users = await getCollection('users');
      const docs = await users.find(
        { 'data.inv.pc': { $exists: true } },
        { projection: { _id: 1, 'data.inv.pc': 1, 'data.inv.vp': 1 } }
      ).toArray();

      if (!docs.length) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No legacy PC balances found to convert.*', {
          reply_to_message_id: ctx.message.message_id
        });
        return;
      }

      let convertedUsers = 0;
      let totalPcMoved = 0;
      const now = new Date();
      const operations = [];

      for (const doc of docs) {
        const currentVp = Number(doc && doc.data && doc.data.inv ? doc.data.inv.vp : 0);
        const legacyPc = Number(doc && doc.data && doc.data.inv ? doc.data.inv.pc : 0);
        const safeVp = Number.isFinite(currentVp) ? currentVp : 0;
        const safePc = Number.isFinite(legacyPc) ? legacyPc : 0;

        operations.push({
          updateOne: {
            filter: { _id: String(doc._id) },
            update: {
              $set: {
                'data.inv.vp': safeVp + safePc,
                updatedAt: now
              },
              $unset: {
                'data.inv.pc': ''
              }
            }
          }
        });

        convertedUsers += 1;
        totalPcMoved += safePc;
      }

      const chunkSize = 500;
      for (let i = 0; i < operations.length; i += chunkSize) {
        await users.bulkWrite(operations.slice(i, i + chunkSize), { ordered: false });
      }

      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Legacy PC conversion complete.*\n'
        + '\n*Users updated:* ' + convertedUsers
        + '\n*PC moved to VP:* ' + totalPcMoved,
        { reply_to_message_id: ctx.message.message_id }
      );
    } catch (error) {
      console.error('Legacy PC conversion failed:', error);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Conversion failed. Check logs for details.*', {
        reply_to_message_id: ctx.message.message_id
      });
    }
  });
}

module.exports = registerConvertCommand;
