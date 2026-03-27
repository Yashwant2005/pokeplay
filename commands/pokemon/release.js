function registerReleaseCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('release',async ctx => {
  
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  const name = ctx.message.text.split(' ').slice(1).join(' ')
  
  if(!name){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Please tell which pokemon you wanna release*',{reply_to_message_id:ctx.message.message_id})
  
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
  
  inline_keyboard:[[{text:'Yes',callback_data:'suger_'+ctx.from.id+'_'+bestMatch+'_release_'+ctx.message.message_id+''},
  
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
  
  const message = await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Are you sure you wanna *Release* your *'+c(p2.name)+'* (*Lv.* '+plevel(p2.name,p2.exp)+')\n*Nature:* '+c(p2.nature)+' , *Total IVs:* '+calculateTotal(p2.ivs)+' , *Total EVs:* '+calculateTotal(p2.evs)+'',{reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'relst_'+p2.pass+'_'+ctx.from.id+''},{text:'No',callback_data:'dlt_'+ctx.from.id+''}]]},reply_to_message_id:ctx.message.message_id})
  
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
  
  ore.push({text:b,callback_data:'release_'+p.pass+'_'+ctx.from.id+'_'+ctx.message.message_id+''})
  
  b++;
  
  }
  
    const rows = [];
  
    for (let i = 0; i < ore.length; i += 5) {
  
      rows.push(ore.slice(i, i + 5));
  
    }
  
  const rows2 = []
  
  if(page > 1){
  
  rows2.push({text:'<',callback_data:'suger_'+ctx.from.id+'_'+name2+'_release_'+ctx.message.message_id+'_'+(page-1)+''})
  
  }
  
  console.log(endIdx)
  
  if((endIdx+1)<p22.length){
  
  rows2.push({text:'>',callback_data:'suger_'+ctx.from.id+'_'+name2+'_release_'+ctx.message.message_id+'_'+(page+1)+''})
  
  }
  
  rows.push(rows2)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},message+'\n\n_Release To Which Pokemon?_',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})
  
  }
  
  })
}

module.exports = registerReleaseCommand;
