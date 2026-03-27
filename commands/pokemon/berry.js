function registerBerryCommand(bot, deps) {
  const { commands, getUserData, sendMessage, pokes, growth_rates, chart, c, stringSimilarity, sort, pokelist, plevel } = deps;
  commands.set('berry',async ctx => {
  
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
  
  const name = ctx.message.text.split(' ').slice(1).join(' ')
  
  if(!name){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Please tell which pokemon berry you want to give.*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const name2 = name.replace(/ /g,'-')
  
  const p5 = data.pokes.filter((pk) => (pk.nickname && name.toLowerCase() === pk.nickname.toLowerCase()) || name2.toLowerCase() === pk.name)[0];
  
  
  
  if(!p5){
  
  const _pokeNames = (data.pokes || []).map(poke => poke.nickname || poke.name).filter(Boolean);
  if (_pokeNames.length === 0) {
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You have no Pokemon.*', { reply_to_message_id: ctx.message.message_id });
    return;
  }
  const matches = stringSimilarity.findBestMatch(name2, _pokeNames);
  
          const bestMatch = matches.bestMatch.target;
  
          const similarity = matches.bestMatch.rating;
  
  if(similarity > 0.4 && name2.length > 3){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Did you mean : *'+c(bestMatch)+'*?',{reply_to_message_id:ctx.message.message_id,reply_markup:{
  
  inline_keyboard:[[{text:'Yes',callback_data:'suger_'+ctx.from.id+'_'+bestMatch+'_berry_'+ctx.message.message_id+''},
  
  {text:'No',callback_data:'delete_'+ctx.from.id+''}]]}})
  
  }else{
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'No *Matching* found with this *Name.*',{reply_to_message_id:ctx.message.message_id})
  
  }
  
  return
  
  }
  
  const p = pokes[p5.name.toLowerCase()]
  
  const p22 = data.pokes.filter((poke)=> (poke.name==name2.toLowerCase()) || (poke.nickname && poke.nickname.toLowerCase() == name.toLowerCase()))
  
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
  
  if(!data.inv.berry){
  
  data.inv.berry = 0
  
  }
  
  if(data.inv.berry < 1){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You are out of *🍒 Berries*')
  
  return
  
  }
  
  let msg6 = '*Pokemon:* '+c(p2.name)+' (*Lv.* '+plevel(p2.name,p2.exp)+')\n\n'
  
  msg6 += '*HP :* '+p2.evs.hp+'\n'
  
  msg6 += '*Attack :* '+p2.evs.attack+'\n'
  
  msg6 += '*Defense :* '+p2.evs.defense+'\n'
  
  msg6 += '*Special Attack :* '+p2.evs.special_attack+'\n'
  
  msg6 += '*Special Defense :* '+p2.evs.special_defense+'\n'
  
  msg6 += '*Speed :* '+p2.evs.speed+'\n'
  
  msg6 += '\nWhich EV Stat You Wanna Decrease With *10*?'
  
  const key = [
  
  [{text:'HP',callback_data:'brth-hp-'+p2.pass+'-'+ctx.from.id+''},
  
  {text:'Attack',callback_data:'brth-attack-'+p2.pass+'-'+ctx.from.id+''},
  
  {text:'Defense',callback_data:'brth-defense-'+p2.pass+'-'+ctx.from.id+''}],
  
  [{text:'SpA',callback_data:'brth-special_attack-'+p2.pass+'-'+ctx.from.id+''},
  
  {text:'SpD',callback_data:'brth-special_defense-'+p2.pass+'-'+ctx.from.id+''},
  
  {text:'Speed',callback_data:'brth-speed-'+p2.pass+'-'+ctx.from.id+''}]
  
  ]
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg6,{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:key}})
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
  
  ore.push({text:b,callback_data:'berry_'+p.pass+'_'+ctx.from.id+'_'+ctx.message.message_id+''})
  
  b++;
  
  }
  
    const rows = [];
  
    for (let i = 0; i < ore.length; i += 5) {
  
      rows.push(ore.slice(i, i + 5));
  
    }
  
  const rows2 = []
  
  if(page > 1){
  
  rows2.push({text:'<',callback_data:'suger_'+ctx.from.id+'_'+name2+'_berry_'+ctx.message.message_id+'_'+(page-1)+''})
  
  }
  
  console.log(endIdx)
  
  if((endIdx+1)<p22.length){
  
  rows2.push({text:'>',callback_data:'suger_'+ctx.from.id+'_'+name2+'_berry_'+ctx.message.message_id+'_'+(page+1)+''})
  
  }
  
  rows.push(rows2)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},message+'\n\n_Give Berry To Which Pokemon?_',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})
  
  }
  
  })
}

module.exports = registerBerryCommand;

