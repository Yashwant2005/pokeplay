function registerExitCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('exit',check,check2,async ctx => {
  
  const userData = await getUserData(ctx.from.id);

  if(!userData || !userData.inv){

  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,

  reply_markup:{inline_keyboard:[[

  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})

  return

  }

  if(!userData.extra){

  userData.extra = {}

  }

  if(!userData.balls){

  userData.balls = {}

  }
  
  if(userData.extra.evhunt && userData.extra.evhunt > 0){
  
  userData.extra.evhunt = 0
  
  ctx.session.name = ''
  
  await saveUserData2(ctx.from.id,userData)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},' Successfully exited *'+c(userData.extra.evh)+' EV* training.')
  
  return
  
  }
  
  
  
    if (!userData.balls.safari || userData.balls.safari == 0) {
  
      await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Have Not Entered *Safari Zone*',{reply_to_message_id:ctx.message.message_id});
  
      return;
  
    }
  
  userData.balls.safari = 0
  
  ctx.session.name = ''
  
  await saveUserData2(ctx.from.id,userData)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},' Successfully Exited *'+c(userData.extra.saf|| 'Kanto')+' Safari Zone*')
  
  })
}

module.exports = registerExitCommand;

