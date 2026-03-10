function registerRecordCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('record',async ctx => {  
  if(ctx.from.id=='1072659486' || ctx.from.id=='6663592560'){  
    const userFiles = fs.readdirSync('./data/db');  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},"Total *"+userFiles.length+"* Trainer Data Is Registered",{reply_to_message_id:ctx.message.message_id})  
  }  
  })
}

module.exports = registerRecordCommand;

