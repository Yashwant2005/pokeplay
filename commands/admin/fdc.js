const { ensureDaycareState } = require('../../utils/daycare');

function registerFinishDaycareCommand(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, c, admins } = deps;
  bot.command('fdc', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const reply = ctx.message.reply_to_message;
    const targetId = reply && reply.from && reply.from.id ? reply.from.id : ctx.from.id;
    const data = await getUserData(targetId);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Target user has not started yet.*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const daycare = ensureDaycareState(data);
    const jobs = Array.isArray(daycare.jobs) ? daycare.jobs : [];

    if (!jobs.length) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No daycare jobs found* for *' + c(String((data.inv && data.inv.name) || targetId)) + '*.', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const now = Date.now();
    for (const job of jobs) {
      job.readyAt = now;
    }

    await saveUserData2(targetId, data);

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Forced daycare completion.*\n'
      + '\n*Target:* ' + c(String((data.inv && data.inv.name) || targetId))
      + '\n*Jobs marked ready:* ' + jobs.length
      + '\n\nUse */daycare* to claim them.',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerFinishDaycareCommand;
