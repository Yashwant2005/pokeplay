function registerNicknameCommand(bot, deps) {
  const { commands, userState2, getUserData, saveUserData2, sendMessage, pokes, growth_rates, chart, c, stringSimilarity, sort, pokelist } = deps;
  commands.set('nickname',async ctx => {
  
  if (ctx.message.chat.type != 'private') {
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Use this command in *Private* to nickname a pokemon\n\nTo view all *Nickname* use /mynicknames',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Nickname',url:'t.me/'+bot.botInfo.username+'?start=nickname'}]]}})
  
      return;
  
    }
  
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  const rawArgs = ctx.message.text.split(' ').slice(1);
  const name = rawArgs.join(' ');
  
  if(!name){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Please tell which pokemon nickname you want to set or use /mynicknames to see your nicknames.*\n\n_Tip: Use /nickname 26 NewName to nickname by list number_',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }

  // Support /nickname <number> <newname> - targets poke by 1-based sorted list position
  const _numArg = parseInt(rawArgs[0], 10);
  if (!isNaN(_numArg) && _numArg >= 1 && rawArgs.length >= 2) {
    const _newNick = rawArgs.slice(1).join(' ');
    const _sortedPokes = await sort(ctx.from.id, (data.pokes || []).filter(p => !p.temp_battle));
    const _targetPoke = _sortedPokes[_numArg - 1];
    if (!_targetPoke) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No pokemon at position ' + _numArg + '.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }
    if (_newNick === '.') {
      _targetPoke.nickname = '';
      delete _targetPoke.nickname;
    } else {
      _targetPoke.nickname = _newNick.slice(0, 20);
    }
    await saveUserData2(ctx.from.id, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*' + c(_targetPoke.name) + '* (#' + _numArg + ') has been nicknamed *' + (_targetPoke.nickname || '(removed)') + '*', { reply_to_message_id: ctx.message.message_id });
    return;
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
  
  inline_keyboard:[[{text:'Yes',callback_data:'suger_'+ctx.from.id+'_'+bestMatch+'_nickname_'+ctx.message.message_id+''},
  
  {text:'No',callback_data:'delete_'+ctx.from.id+''}]]}})
  
  }else{
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'No *Matching* found with this *Name.*',{reply_to_message_id:ctx.message.message_id})
  
  }
  
  return
  
  }
  
  const p = pokes[p5.name.toLowerCase()]
  
  const rbList = data.extra && Array.isArray(data.extra.randombattle_pokes) ? data.extra.randombattle_pokes : []
  const p22 = data.pokes.filter((poke)=> !poke.temp_battle && !rbList.includes(poke.pass) && ((poke.name==name2.toLowerCase()) || (poke.nickname && poke.nickname.toLowerCase() == name.toLowerCase())))
  
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
  
  let uu = ''
  
  if(p2.nickname){
  
  uu = "Use '.' to remove current nickname."
  
  }
  
  const message = await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Tell a new name for *'+c(p2.nickname || p2.name)+'*\n\n'+uu+'',{reply_markup:{force_reply:true}})
  
  const userData = {
  
        messageId: message,
  
        pass: p2.pass // You can set the name to whatever you like
  
      };
  
      userState2.set(ctx.from.id,userData)
  
  }else if(p22.length > 1){
  
  const ore = []
  
  let message = ''
  
  const page = 1
  
  const pageSize = 20
  
  const startIdx = (page - 1) * pageSize;
  
  let b = startIdx+1
  
  const endIdx = startIdx + pageSize;
  
  const pokemon2 = await sort(ctx.from.id,p22)
  
  const pokemon = pokemon2.slice(startIdx,endIdx)
  
  message += await pokelist(pokemon.map(item => item.pass),ctx,startIdx)
  
  for(const p of pokemon){
  
  ore.push({text:b,callback_data:'nickname_'+p.pass+'_'+ctx.from.id+'_'+ctx.message.message_id+''})
  
  b++;
  
  }
  
    const rows = [];
  
    for (let i = 0; i < ore.length; i += 5) {
  
      rows.push(ore.slice(i, i + 5));
  
    }
  
  const rows2 = []
  
  if(page > 1){
  
  rows2.push({text:'<',callback_data:'suger_'+ctx.from.id+'_'+name2+'_nickname_'+ctx.message.message_id+'_'+(page-1)+''})
  
  }
  
  console.log(endIdx)
  
  if(endIdx<p22.length){
  
  rows2.push({text:'>',callback_data:'suger_'+ctx.from.id+'_'+name2+'_nickname_'+ctx.message.message_id+'_'+(page+1)+''})
  
  }
  
  rows.push(rows2)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},message+'\n\n_Nickname To Which Pokemon?_',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})
  
  }
  
  })
}

module.exports = registerNicknameCommand;
