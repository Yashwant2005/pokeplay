function registerGcastCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('gcast', async (ctx) => {
    if(!admins.includes(ctx.from.id)){
      return;
    }

    const reply = ctx.message.reply_to_message;
    const text = ctx.message.text.split(' ').slice(1).join(' ').trim();

    if(!reply && !text){
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Use `/gcast your message` or reply to a message with `/gcast`.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const groupIds = (typeof getGroupIds === 'function') ? getGroupIds() : [];
    if(groupIds.length < 1){
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No groups found for broadcast.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `Starting gcast to *${groupIds.length}* groups...`, { reply_to_message_id: ctx.message.message_id });

    let success = 0;
    let failed = 0;
    const removeIds = [];

    for(const gid of groupIds){
      try{
        if(reply){
          await bot.telegram.copyMessage(gid, reply.chat.id, reply.message_id);
        }else{
          await bot.telegram.sendMessage(gid, text, { parse_mode: 'HTML' });
        }
        success++;
      }catch(error){
        failed++;
        const desc = (error && error.response && error.response.description) ? String(error.response.description).toLowerCase() : '';
        if(
          desc.includes('chat not found') ||
          desc.includes('bot was kicked') ||
          desc.includes('bot is not a member') ||
          desc.includes('need to be invited') ||
          desc.includes('have no rights')
        ){
          removeIds.push(gid);
        }
      }
      await sleep(400);
    }

    if(removeIds.length > 0 && typeof removeGroupIds === 'function'){
      removeGroupIds(removeIds);
      if(typeof saveGroupIdsToFile === 'function'){
        saveGroupIdsToFile();
      }
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `Gcast done. *${success}* sent, *${failed}* failed.`, { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerGcastCommand;
