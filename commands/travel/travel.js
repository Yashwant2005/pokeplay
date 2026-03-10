function registerTravelCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('travel',check,check2,async (ctx,next) => {  
  const data = await getUserData(ctx.from.id)  
  if(!data.inv){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,  
  reply_markup:{inline_keyboard:[[  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})  
  return  
  }  
  if(data.balls.safari && data.balls.safari > 0){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Are In *'+c(data.extra.saf)+' Safari Zone*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);  
  const userLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined  
  const key = [  
    [{ text: userLevel >= 75 ? 'National' : '  ',  callback_data: userLevel >= 75 ? 'travel_national_'+ctx.from.id+'' : 'locked' },],  
    [  
      { text: 'Kanto', callback_data: 'travel_kanto2_'+ctx.from.id+'' },  
      { text: userLevel >= 5 ? 'Johto' : '  ', callback_data: userLevel >= 5 ? 'travel_johto_'+ctx.from.id+'' : 'locked' },  
      { text: userLevel >= 10 ? 'Hoenn' : '  ', callback_data: userLevel >= 10 ? 'travel_hoenn_'+ctx.from.id+'' : 'locked' }  
    ],  
    [  
      { text: userLevel >= 15 ? 'Sinnoh' : '  ',  callback_data: userLevel >= 15 ? 'travel_sinnoh_'+ctx.from.id+'' : 'locked' },  
      { text: userLevel >= 40 ? 'Hisui' : '  ', callback_data: userLevel >= 40 ? 'travel_hisui_'+ctx.from.id+'' : 'locked' },  
      { text: userLevel >= 20 ? 'Unova' : '  ', callback_data: userLevel >= 20 ? 'travel_unova_'+ctx.from.id+'' : 'locked' },  
      { text: userLevel >= 25 ? 'Kalos' : '  ',  callback_data: userLevel >= 25 ? 'travel_kalos_'+ctx.from.id+'' : 'locked' }  
    ],  
    [  
      { text: userLevel >= 30 ? 'Alola' : '  ', callback_data: userLevel >= 30 ? 'travel_alola2_'+ctx.from.id+'' : 'locked' },  
      { text: userLevel >= 50 ? 'Galar' : '  ',  callback_data: userLevel >= 50 ? 'travel_galar2_'+ctx.from.id+'' : 'locked' },  
      { text: userLevel >= 60 ? 'Paldea' : '  ',  callback_data: userLevel >= 60 ? 'travel_paldea2_'+ctx.from.id+'' : 'locked' }  
    ],  
    [  
      { text: userLevel >= 65 ? 'Conquest Gallery' : '  ', callback_data: userLevel >= 65 ? 'travel_conquest-gallery_'+ctx.from.id+'' : 'locked' }  
    ]  
  ];  
    
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Which Region You Wanna Travel?*\n\n*Currently :* _'+c(data.inv.region || 'N/A')+'_',{reply_markup:{inline_keyboard:key}})  
  })
}

module.exports = registerTravelCommand;

