function registerMybagCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { titleCaseZCrystal } = require('../../utils/z_crystals');
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
  
  let msg = '*💷 PokeCoins:* '+data.inv.pc+'\n'
  
  let msgg = ''
  
  if(data.inv.candy && data.inv.candy > 0){
  
  msg += '\n• *🍬 Candies:* '+data.inv.candy+''
  
  }

  if(data.inv.daycare_candy && data.inv.daycare_candy > 0){

  msg += '\n• *🍬 Daycare Candy:* '+data.inv.daycare_candy+''

  }
  
  if(data.inv.vitamin && data.inv.vitamin > 0){
  
  msg += '\n• *💉 Vitamins:* '+data.inv.vitamin+''
  
  }
  
  if(data.inv.berry && data.inv.berry > 0){
  
  msg += '\n• *🍒 Berries:* '+data.inv.berry+''
  
  }
  
  if(!data.extra || typeof data.extra !== 'object') data.extra = {}
  if(!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
  if(!Number.isFinite(data.extra.itembox.dynamaxCandy)) data.extra.itembox.dynamaxCandy = 0
  if(!Number.isFinite(data.extra.itembox.maxSoup)) data.extra.itembox.maxSoup = 0
  if(!data.extra.itembox.zCrystals || typeof data.extra.itembox.zCrystals !== 'object') data.extra.itembox.zCrystals = {}
  if(data.extra.itembox.dynamaxCandy > 0){
  
  msg += '\n- *Dynamax Candy:* '+data.extra.itembox.dynamaxCandy+''
  
  }
  if(data.extra.itembox.maxSoup > 0){
  
  msg += '\nâ€¢ *🥣 Max Soup:* '+data.extra.itembox.maxSoup+''
  
  }

  const zCrystalKeys = Object.keys(data.extra.itembox.zCrystals).filter((key) => Number(data.extra.itembox.zCrystals[key]) > 0)
  if(zCrystalKeys.length > 0){
  for(const key of zCrystalKeys.sort()){
  msg += '\n- *'+titleCaseZCrystal(key)+':* '+data.extra.itembox.zCrystals[key]+''
  }
  }

  if(data.inv.omniring || data.inv.ring || data.inv.gmax_band){
  
  msgg += '\n• *🧬 OmniRing:* Equipped'
  
  }

  if(data.extra.equippedZCrystal){
  
  msgg += '\nâ€¢ *Z-Crystal:* '+titleCaseZCrystal(data.extra.equippedZCrystal)
  
  }

  if(data.inv.shiny_charm){
  
  msgg += '\n• *✨ Shiny Charm:* Owned'
  
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

  // Mega Stones section
  if(Array.isArray(data.inv.stones) && data.inv.stones.length > 0) {
    const stonesData = require('../../data/stones.json');
    const megaStones = data.inv.stones.filter(s => stonesData[s] && stonesData[s].mega);
    if(megaStones.length > 0) {
      msg += '\n\n*💎 Mega Stones:*';
      for(const stone of [...new Set(megaStones)]) {
        const info = stonesData[stone];
        msg += `\n• ${stone} (${info.pokemon} → ${info.mega}) x${data.inv.stones.filter(x=>x===stone).length}`;
      }
    }
  }

  msg += '\n• *⭐️ League Points:* '+data.inv.league_points+''
  msg += '\n• *🎟️ Holowear Tickets:* '+data.inv.holowear_tickets+''
  msg += '\n• *🎁 Battle Box:* '+data.inv.battle_boxes+''
  
  if(data.inv.pass && data.inv.pass > 0){
  
  msg += '\n• *🎫 Safari Pass:* '+data.inv.pass+''
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
