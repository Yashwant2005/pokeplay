function registerSafariZoneCommand(bot, deps) {
  const { getUserData, sendMessage, safari } = deps;
  bot.command('safari_zone',async ctx => {
  
  const userData = await getUserData(ctx.from.id)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},`Welcome To *Safari Zone*, You can hunt rare, legendry, mythical types pokemons here. 
  
  
  
  *Info About Safari Zone :-*
  
  _• You Will Get 30 Safari Balls (3x catch rate) 
  
  • You Can't Battle With Pokemon
  
  • You Can't Use Any Other PokeBall
  
  • You Will Automatically Ran Out After You Balls Over
  
  • Using /exit Won't Refund Anything
  
  • Max One Time In A Day Can Play Safari

  • Using Safari Pass does not consume your normal daily safari quota
  
  • Entering Safari Will Reset The Next Day
  
  • You Are Not Guaranteed To Catch A Pokemon_
  
  
  
  *Entry Fees:* 100 💷
  
  */enter -* _To Enter Safari Zone_
  
  */exit -* _To Exit Safari Zone_`,{reply_to_message_id:ctx.message.message_id})
  
  })
}

module.exports = registerSafariZoneCommand;

