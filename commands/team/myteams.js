function registerMyteamsCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  commands.set('myteams',async ctx => {  
  const userData = await getUserData(ctx.from.id)
  if(!Array.isArray(userData.pokes)){
  userData.pokes = []
  }
  if(!userData.inv){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,  
  reply_markup:{inline_keyboard:[[  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})  
  return  
  }  
  if (!userData.teams) {  
          userData.teams = {};  
  userData.inv.team = "1"  
      }  
      for (let i = 1; i <= 6; i++) {  
          if (!userData.teams[i]) {  
              userData.teams[i] = [];  
          }  
      }  
    
      await saveUserData2(ctx.from.id, userData);  
  const team = userData.inv.team*1 || 1  
  const teampokes = Array.isArray(userData.teams[team]) ? userData.teams[team] : [];
  var matching = [];  
  let b = 1  
      for (const pass of teampokes) {  
          const matchings = userData.pokes.find((poke) => poke.pass === pass);  
          if (matchings) {  
              matching.push(pass);  
           b++;  
  }  
  }  
      const list = matching.join('\n');  
    
      if (!userData.inv || userData.inv.team !== team) {  
          var main = '❌';  
      } else {  
          var main = '✅';  
      }  
  const tea = userData.inv[team] ?userData.inv[team] : team  
      let messageText = '❖ *Main Team : '+tea+'*\n\n'  
   messageText += await pokelist(matching,ctx,0)  
  if(ctx.chat.type=='private'){  
  messageText+='\n\n_Which Team Want To Edit?_'  
  }else{  
  messageText+='\n\n_Which Team You Wanna Set As Main?_'  
  }  
  if(ctx.message.chat.type=='private'){  
  var key = [  
    [{text:userData.inv["1"] ? userData.inv["1"] : 'Team 1',callback_data:'set_1'},  
     {text:userData.inv["2"] ? userData.inv["2"] : 'Team 2',callback_data:'set_2'}],  
    [{text:userData.inv["3"] ? userData.inv["3"] : 'Team 3',callback_data:'set_3'},  
     {text:userData.inv["4"] ? userData.inv["4"] : 'Team 4',callback_data:'set_4'}],  
    [{text:userData.inv["5"] ? userData.inv["5"] : 'Team 5',callback_data:'set_5'},  
     {text:userData.inv["6"] ? userData.inv["6"] : 'Team 6',callback_data:'set_6'}]  
  ];  
  }else{  
  var key = [  
    [{text:userData.inv["1"] ? userData.inv["1"] : 'Team 1',callback_data:'main_1_'+ctx.from.id+''},  
     {text:userData.inv["2"] ? userData.inv["2"] : 'Team 2',callback_data:'main_2_'+ctx.from.id+''}],  
    [{text:userData.inv["3"] ? userData.inv["3"] : 'Team 3',callback_data:'main_3_'+ctx.from.id+''},  
     {text:userData.inv["4"] ? userData.inv["4"] : 'Team 4',callback_data:'main_4_'+ctx.from.id+''}],  
    [{text:userData.inv["5"] ? userData.inv["5"] : 'Team 5',callback_data:'main_5_'+ctx.from.id+''},  
     {text:userData.inv["6"] ? userData.inv["6"] : 'Team 6',callback_data:'main_6_'+ctx.from.id+''}],  
   [{text:'Edit Teams',url:'t.me/'+bot.botInfo.username+'?start=myteams'}]  
  ];  
  }  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},messageText,{reply_markup:{inline_keyboard:key}})  
  })
}

module.exports = registerMyteamsCommand;

