function registerEvTrainCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  commands.set('ev_train',async ctx => {  
  if(ctx.chat.type!='private'){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Use this command in *Private* to use *EV Train*.',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Train',url:'t.me/'+bot.botInfo.username+'?start=ev_train'}]]}})  
  return  
  }  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},`Welcome to *EV Train Zone*, You can hunt *75 Pokemon* of a specific *EV Yield* here.  
    
  *Info About Safari Zone :-*  
  • You Can Hunt 75 Times.  
  • You Can't Catch Any Pokemon  
  • You Will Automatically Ran Out After You Turns Over  
  • Using /exit Won't Refund Anything  
    
  *Entry Fees:* 50 💷`,{reply_markup:{inline_keyboard:[[{text:'EV Train',callback_data:'evtrain'}]]}})  
  })
}

module.exports = registerEvTrainCommand;

