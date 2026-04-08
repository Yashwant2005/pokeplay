const {
  DAYCARE_CANDY_REDUCTION_MINUTES,
  DAYCARE_CANDY_STARTER,
  getDaycareSlots,
  grantDaycareStarterIfNeeded
} = require('../../utils/daycare');

function registerDaycareCommand(bot, deps) {
  const { commands, getUserData, saveUserData2, sendMessage, loadMessageData, trainerlevel } = deps;
  commands.set('daycare', async (ctx) => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    const nam3 = ctx.message.text.replace('/', '').replace(/ /g, '-');
    const nam2 = nam3.includes('@' + bot.botInfo.username) ? nam3.replace('@' + bot.botInfo.username, '') : nam3;

    if (ctx.chat.type !== 'private') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Use this command in *Private* to manage your *Daycare*.', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Daycare', url: 't.me/' + bot.botInfo.username + '?start=' + nam2 }]] }
      });
      return;
    }

    const mdata = await loadMessageData();
    if (Array.isArray(mdata.battle) && mdata.battle.some((id) => String(id) === String(ctx.from.id))) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are in a *battle*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const starter = grantDaycareStarterIfNeeded(data);
    if (starter.granted) {
      await saveUserData2(ctx.from.id, data);
    }

    const info = getDaycareSlots(data, trainerlevel);
    let msg = '*Pokemon Daycare*\n';
    msg += '\nTrain up to *3 pokemon at once* to *Lv. 100* while setting their final *EV build* and *moveset*.';
    msg += `\n\n*Trainer Level:* ${info.trainerLevel}`;
    msg += `\n*Daycare Slots:* ${info.slots}`;
    msg += `\n*Daycare Candy:* ${data.inv.daycare_candy}`;
    msg += '\n\n*Training Cost:*';
    msg += '\nâ€¢ Every *500 EXP required* costs *1 VP*';
    msg += '\nâ€¢ Every *1 EV* costs *5 VP*';
    msg += '\n\n*Training Time:*';
    msg += '\nâ€¢ Every *100 EXP* takes *1 second*';
    msg += '\nâ€¢ Every *1 EV* takes *10 seconds*';
    msg += `\n\n*Daycare Candy Effect:* 1 candy reduces *${DAYCARE_CANDY_REDUCTION_MINUTES} minutes* from one active daycare job`;

    if (starter.granted) {
      msg += `\n\n*First Visit Reward:* +${DAYCARE_CANDY_STARTER} Daycare Candy`;
    }

    msg += '\n\nTraining order: *EVs finish first, then EXP training starts.*';
    msg += '\n\nOpen the menu below to deposit, review, and claim your daycare pokemon.';

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: { inline_keyboard: [[{ text: 'Open Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] }
    });
  });
}

module.exports = registerDaycareCommand;
