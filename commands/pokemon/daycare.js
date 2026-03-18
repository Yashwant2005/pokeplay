const {
  DAYCARE_CANDY_REDUCTION_MINUTES,
  DAYCARE_CANDY_STARTER,
  getDaycareSlots,
  grantDaycareStarterIfNeeded
} = require('../../utils/daycare');

function registerDaycareCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

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
    if (mdata.battle.includes(ctx.from.id)) {
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
    msg += '\nTrain a pokemon all the way to *Lv. 100* while setting its final *EV build* and *moveset*.';
    msg += `\n\n*Trainer Level:* ${info.trainerLevel}`;
    msg += `\n*Unlocked Slots:* ${info.slots}`;
    msg += `\n*Daycare Candy:* ${data.inv.daycare_candy}`;
    msg += '\n\n*Slot Unlocks:*';
    msg += '\nLevel *5* -> 1 slot';
    msg += '\nLevel *10* -> 2 slots';
    msg += '\nLevel *15* -> 3 slots';
    msg += '\nLevel *20* -> 4 slots';
    msg += '\nLevel *25* -> 5 slots';
    msg += '\nLevel *30* -> 6 slots';
    msg += `\n\n*Daycare Candy Effect:* 1 candy reduces *${Math.floor(DAYCARE_CANDY_REDUCTION_MINUTES / 60)} hours* from one active daycare job`;

    if (starter.granted) {
      msg += `\n\n*First Visit Reward:* +${DAYCARE_CANDY_STARTER} Daycare Candy`;
    }

    if (info.slots < 1) {
      msg += '\n\nReach *Trainer Level 5* to unlock daycare.';
    } else {
      msg += '\n\nOpen the menu below to deposit, review, and claim your daycare pokemon.';
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message.message_id,
      reply_markup: { inline_keyboard: [[{ text: 'Open Daycare', callback_data: 'daycare_menu_' + ctx.from.id }]] }
    });
  });
}

module.exports = registerDaycareCommand;
