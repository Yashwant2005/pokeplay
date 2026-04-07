function registerFactionBankCommand(bot, deps) {
  const { sendMessage, getUserData, saveUserData2 } = deps;
  const { withdrawFactionPc, addFactionPcByUser, getFactionBank } = require('../../utils/faction_store');

  bot.command('facdeposit', async (ctx) => {
    const amount = Math.floor(Number(ctx.message.text.split(' ')[1]) || 0);
    if (!amount || amount <= 0) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /facdeposit <amount>', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data || !data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey first.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const factionInfo = getFactionBank(ctx.from.id);
    if (!factionInfo.ok) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You are not in any faction.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    if (!Number.isFinite(data.inv.vp)) data.inv.vp = 0;
    if (data.inv.vp < amount) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `*You do not have enough Victory Points.*\nBalance: *${data.inv.vp}*`, { reply_to_message_id: ctx.message.message_id });
      return;
    }

    data.inv.vp -= amount;
    await saveUserData2(ctx.from.id, data);

    const result = addFactionPcByUser(ctx.from.id, amount);
    if (!result.ok) {
      data.inv.vp += amount;
      await saveUserData2(ctx.from.id, data);

      if (result.reason === 'nofaction') {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You are not in any faction.*', { reply_to_message_id: ctx.message.message_id });
        return;
      }

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Deposit failed.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const name = (result.faction && result.faction.name) ? result.faction.name : 'Faction';
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `*Deposited ${amount} Victory Points* into *${name}* bank.`, { reply_to_message_id: ctx.message.message_id });
  });

  bot.command('facwithdraw', async (ctx) => {
    const amount = Math.floor(Number(ctx.message.text.split(' ')[1]) || 0);
    if (!amount || amount <= 0) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /facwithdraw <amount>', { reply_to_message_id: ctx.message.message_id });
      return;
    }
    const result = withdrawFactionPc(ctx.from.id, amount);
    if (!result.ok) {
      if (result.reason === 'nofaction') {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You are not in any faction.*', { reply_to_message_id: ctx.message.message_id });
        return;
      }
      if (result.reason === 'noaccess') {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Only faction admins/captain can withdraw.*', { reply_to_message_id: ctx.message.message_id });
        return;
      }
      if (result.reason === 'insufficient') {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `*Not enough in faction bank.*\nBalance: *${result.balance || 0}*`, { reply_to_message_id: ctx.message.message_id });
        return;
      }
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Withdraw failed.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.inv || typeof data.inv !== 'object') data.inv = {};
    if (!Number.isFinite(data.inv.vp)) data.inv.vp = 0;
    data.inv.vp += amount;
    await saveUserData2(ctx.from.id, data);

    const name = (result.faction && result.faction.name) ? result.faction.name : 'Faction';
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `*Withdrawn ${amount} Victory Points* from *${name}* bank.`, { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerFactionBankCommand;
