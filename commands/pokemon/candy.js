function registerCandyCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  commands.set('candy', async ctx => {  
  const data = await getUserData(ctx.from.id)  
  if(!data.inv){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,  
  reply_markup:{inline_keyboard:[[  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})  
  return  
  }  
  const nam3 = ctx.message.text.replace('/','').replace(/ /g,'-')  
  const nam2 = nam3.includes('@'+bot.botInfo.username) ? nam3.replace('@'+bot.botInfo.username,'') : nam3  
  if(ctx.chat.type!='private'){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Use this command in *Private* to give *Candy* to your *Pokemons.*', {reply_to_message_id:ctx.message.message_id, reply_markup:{inline_keyboard:[[{text:'Candy', url:'t.me/'+bot.botInfo.username+'?start='+nam2+''}]]}})   
  return  
  }  
  const mdata = await loadMessageData();  
  if(mdata.battle.includes(ctx.from.id)){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You are in a *battle*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  const name = ctx.message.text.split(' ').slice(1).join(' ')  
  if(!name){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Please tell which pokemon candy you want to give.*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  const name2 = name.replace(/ /g,'-')  
  const p5 = data.pokes.filter((pk) =>   
      pk.nickname ?   
      name.toLowerCase() === pk.nickname.toLowerCase() :   
      name2.toLowerCase() === pk.name  
  )[0];  
  if(!p5){  
  const matches = stringSimilarity.findBestMatch(name2, data.pokes.map(poke => poke.nickname || poke.name));  
          const bestMatch = matches.bestMatch.target;  
          const similarity = matches.bestMatch.rating;  
  if(similarity > 0.4 && name2.length > 3){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Did you mean : *'+c(bestMatch)+'*?',{reply_to_message_id:ctx.message.message_id,reply_markup:{  
  inline_keyboard:[[{text:'Yes',callback_data:'suger_'+ctx.from.id+'_'+bestMatch+'_candy_'+ctx.message.message_id+''},  
  {text:'No',callback_data:'delete_'+ctx.from.id+''}]]}})  
  }else{  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'No *Matching* found with this *Name.*',{reply_to_message_id:ctx.message.message_id})  
  }  
  return  
  }  
  const p = pokes[p5.name.toLowerCase()]  
  const p22 = data.pokes.filter((poke)=> poke.nickname ? poke.nickname.toLowerCase() == name.toLowerCase() : poke.name==name2.toLowerCase())  
  if(!p22 || p22.length < 1){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Does Not Have *'+name+'*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(p22.length == 1){  
  const p2 = p22[0]  
  const g = growth_rates[p2.name]  
  const exp = chart[g.growth_rate]  
  const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);  
      const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;  
  if(!data.inv.candy){  
  data.inv.candy = 0  
  }  
  if(data.inv.candy < 1){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You are out of *Candies 🍬*')  
  return  
  }  
  if(currentLevel > 99){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*'+c(name2)+'* has already reached *100* level',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  data.inv.candy -= 1  
  p2.exp = exp[currentLevel+1]  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You gave 1 candy 🍬 to *'+c(p2.name)+'*\n*Level:* '+currentLevel+' --> '+(currentLevel+1)+'',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'+1 Candy 🍬',callback_data:'candy_'+p2.pass+'_'+ctx.from.id+''}]]}})  
  const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==p2.name)[0]  
  if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= (currentLevel+1) && evo.evolution_level > currentLevel){  
  if(ctx.chat.type!='private'){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a> Your Pokemon <b>'+c(p2.name)+'</b> Is Ready To Evolve',{reply_markup:{inline_keyboard:[[{text:'Evolve',url:'t.me/'+bot.botInfo.username+''}]]}})  
  }  
  await sendMessage(ctx,ctx.from.id,'*'+c(p2.name)+'* Is Ready To Evolve',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+p2.name+'_'+p2.pass+''}]]}})  
  }  
  if(((currentLevel+1)-currentLevel)!= 0){  
  const moves = pokemoves[p2.name]  
  const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at > currentLevel && move.level_learned_at <= (currentLevel+1) && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')  
  if(moves2.length > 0){  
  for(const m of moves2){  
  if(p2.moves.length < 4){  
  p2.moves.push(m.id)  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.from.id,'<b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})  
  }else{  
  const options = {  
    timeZone: 'Asia/Kolkata',  
    month: 'numeric',  
    day: 'numeric',  
    hour: 'numeric',  
    minute: 'numeric',  
    hour12: true,  
  };  
    
  const d = new Date().toLocaleString('en-US', options)  
  if(ctx.chat.type!='private'){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a>, <b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})  
  }  
  const mdata = await loadMessageData();  
  const m77 = await sendMessage(ctx,ctx.from.id,'<b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(p2.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+p2.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})  
  if(!mdata.moves){  
  mdata.moves = {}  
  }  
  mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:p2.name,move:dmoves[m.id].name}  
  await saveMessageData(mdata)  
  }  
  }  
  }  
  }  
  await saveUserData2(ctx.from.id,data)  
  }else if(p22.length > 1){  
  const ore = []  
  let message = ''  
  const page = 1  
  const pageSize = 25  
  const startIdx = (page - 1) * pageSize;  
  let b = startIdx+1  
  const endIdx = startIdx + pageSize;  
  const pokemon2 = await sort(ctx.from.id,p22)  
  const pokemon = pokemon2.slice(startIdx,endIdx)  
  message += await pokelist(pokemon.map(item => item.pass),ctx,startIdx)  
  for(const p of pokemon){  
  ore.push({text:b,callback_data:'candy_'+p.pass+'_'+ctx.from.id+'_'+ctx.message.message_id+''})  
  b++;  
  }  
    const rows = [];  
    for (let i = 0; i < ore.length; i += 5) {  
      rows.push(ore.slice(i, i + 5));  
    }  
  const rows2 = []  
  if(page > 1){  
  rows2.push({text:'<',callback_data:'suger_'+ctx.from.id+'_'+name2+'_candy_'+ctx.message.message_id+'_'+(page-1)+''})  
  }  
  console.log(endIdx)  
  if((endIdx+1)<p22.length){  
  rows2.push({text:'>',callback_data:'suger_'+ctx.from.id+'_'+name2+'_candy_'+ctx.message.message_id+'_'+(page+1)+''})  
  }  
  rows.push(rows2)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},message+'\n\n_Give Candy To Which Pokemon?_',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})  
  }  
  })
}

module.exports = registerCandyCommand;

