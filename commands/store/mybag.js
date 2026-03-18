function registerMybagCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('mybag',async ctx => {
  
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  if(!data.inv.pc){
  
  data.inv.pc = 0
  
  }
  
  let msg = '*ðŸ’· PokeCoins:* '+data.inv.pc+'\n'
  
  let msgg = ''
  
  if(data.inv.candy && data.inv.candy > 0){
  
  msg += '\nâ€¢ *ðŸ¬ Candies:* '+data.inv.candy+''
  
  }

  if(data.inv.daycare_candy && data.inv.daycare_candy > 0){

  msg += '\nâ€¢ *Daycare Candy:* '+data.inv.daycare_candy+''

  }
  
  if(data.inv.vitamin && data.inv.vitamin > 0){
  
  msg += '\nâ€¢ *ðŸ’‰ Vitamins:* '+data.inv.vitamin+''
  
  }
  
  if(data.inv.berry && data.inv.berry > 0){
  
  msg += '\nâ€¢ *ðŸ’ Berries:* '+data.inv.berry+''
  
  }
  
  if(data.inv.omniring || data.inv.ring || data.inv.gmax_band){
  
  msgg += '\nâ€¢ *ðŸ§¬ OmniRing:* Equipped'
  
  }

  if(data.inv.shiny_charm){
  
  msgg += '\nâ€¢ *âœ¨ Shiny Charm:* Owned'
  
  }

  if(!Number.isFinite(data.inv.league_points)){
  data.inv.league_points = 0
  }

  if(!Number.isFinite(data.inv.holowear_tickets)){
  data.inv.holowear_tickets = 0
  }

  if(!Number.isFinite(data.inv.battle_boxes)){
  data.inv.battle_boxes = 0
  }

  msg += msgg

  msg += '\nâ€¢ *â­ League Points:* '+data.inv.league_points+''
  msg += '\nâ€¢ *ðŸŽŸï¸ Holowear Tickets:* '+data.inv.holowear_tickets+''
  msg += '\nâ€¢ *ðŸŽ Battle Box:* '+data.inv.battle_boxes+''
  
  if(data.inv.pass && data.inv.pass > 0){
  
  msg += '\nâ€¢ *ðŸ€„ Safari Pass:* '+data.inv.pass+''
  
  }
  
  const items = ['inventory','balls','tms','enhance','items']
  
  let item = 'inventory'
  
  const ind = items.indexOf(item)
  
  const t1 = items[ind-1] || 'hh'
  
  const t2 = items[ind+1] || 'hh'
  
  const rows = [{text:'<',callback_data:'poag_'+t1+'_'+ctx.from.id+''},{text:c(item),callback_data:'nouse'},
  
  {text:'>',callback_data:'poag_'+t2+'_'+ctx.from.id+''}]
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg,{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[rows]}})
  
  })
}

module.exports = registerMybagCommand;
