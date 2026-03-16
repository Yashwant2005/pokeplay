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
  
  const key = [

    [{ text: 'National',  callback_data: 'travel_national_'+ctx.from.id+'' },],

    [

      { text: 'Kanto', callback_data: 'travel_kanto2_'+ctx.from.id+'' },

      { text: 'Johto', callback_data: 'travel_johto_'+ctx.from.id+'' },

      { text: 'Hoenn', callback_data: 'travel_hoenn_'+ctx.from.id+'' }

    ],

    [

      { text: 'Sinnoh',  callback_data: 'travel_sinnoh_'+ctx.from.id+'' },

      { text: 'Hisui', callback_data: 'travel_hisui_'+ctx.from.id+'' },

      { text: 'Unova', callback_data: 'travel_unova_'+ctx.from.id+'' },

      { text: 'Kalos',  callback_data: 'travel_kalos_'+ctx.from.id+'' }

    ],

    [

      { text: 'Alola', callback_data: 'travel_alola2_'+ctx.from.id+'' },

      { text: 'Galar',  callback_data: 'travel_galar2_'+ctx.from.id+'' },

      { text: 'Paldea',  callback_data: 'travel_paldea2_'+ctx.from.id+'' }

    ],

    [

      { text: 'Conquest Gallery', callback_data: 'travel_conquest-gallery_'+ctx.from.id+'' }

    ]

  ];
  
  
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Which Region You Wanna Travel?*\n\n*Currently :* _'+c(data.inv.region || 'N/A')+'_\n*Travel cost:* _100 PokeCoins when changing major region. Same-region travel is free._',{reply_markup:{inline_keyboard:key}})
  
  })
}

module.exports = registerTravelCommand;

