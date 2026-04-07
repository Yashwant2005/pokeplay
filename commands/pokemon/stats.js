function registerStatsCommand(bot, deps) {
  const { getUserData, sendMessage, editMessage, forms, pokes, growth_rates, chart, c, stringSimilarity, calculateTotal, sort, pokelist, Stats, shiny, events, Bar } = deps;
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
const { getDisplayPokemonName, getDisplayPokemonSymbol } = require('../../utils/gmax_utils');
const { getDynamaxLevel, getDynamaxLevelBar } = require('../../utils/dynamax_level');
const { isRayquazaLockedFromHeldItems } = require('../../utils/pokemon_item_rules');
const legacyStatsCard = require('../../utils/pokemon_stats_card_legacy');
const privateStatsCard = require('../../utils/pokemon_stats_card_v2');
const { getPokemonStatsCardMode } = privateStatsCard;
const titleCaseHeldItem = (value) => String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';

async function sendStatsGeneratingMessage(ctx, sendMessage, replyToMessageId) {
  try {
    return await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Generating Pokemon page...*',
      { reply_to_message_id: replyToMessageId }
    );
  } catch (_) {
    return null;
  }
}

function getStatsCardApi(userData) {
  return getPokemonStatsCardMode(userData) === 'legacy' ? legacyStatsCard : privateStatsCard;
}
bot.command('stats',async ctx => {
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  const name = ctx.message.text.split(' ').slice(1).join(' ')
  
  if(!name){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Please tell whose poke stats you want.*',{reply_to_message_id:ctx.message.message_id})
  
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
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Did you mean : *'+c(bestMatch)+'*?',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'suger_'+ctx.from.id+'_'+bestMatch+'_stats_'+ctx.message.message_id+''},{text:'No',callback_data:'delete_'+ctx.from.id+''}]]}})
  
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
  const statsCardApi = getStatsCardApi(data)
  const loadingMessage = await sendStatsGeneratingMessage(ctx, sendMessage, ctx.message.message_id)
  try {
    await statsCardApi.sendPokemonCard(ctx, deps, data, p2, ctx.message.message_id)
  } finally {
    if (loadingMessage) {
      try {
        await bot.telegram.deleteMessage(ctx.chat.id, loadingMessage)
      } catch (_) {}
    }
  }
  return
  
  const g = growth_rates[p2.name]
  
  const exp = chart[g.growth_rate]
  
  const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
  
      const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
  
  const n = exp[currentLevel+1] || p2.exp
  
  let n2 = n-p2.exp
  
  let b7 = n2
  
  if(n2==0){
  
  b7 = p2.exp
  
  }
  
  let msg = '➤ *'+c(getDisplayPokemonName(p2, forms))+' '+getDisplayPokemonSymbol(p2)+'*'
  
  msg += '\n*Level:* '+currentLevel+' | *Nature:* '+c(p2.nature)+''

  msg += '\n*Ability:* '+c(titleCaseAbility(p2.ability || 'none'))+''
  msg += '\n*Held Item:* '+c(titleCaseHeldItem(p2.held_item || 'none'))+''
  msg += '\n*Dynamax Level:* '+getDynamaxLevel(p2)+''
  msg += '\n`'+getDynamaxLevelBar(p2)+'`'
  
  msg += '\n*Types:* '+c(p.types.join(' / '))+''
  
  msg += '\n*EXP:* '+p2.exp.toLocaleString()+''
  
  msg += '\n*Need To Next Level:* '+n2.toLocaleString()+''
  
  msg += '\n`'+Bar(p2.exp,b7)+'`'
  
  const ivs = p2.ivs
  
  const evs = p2.evs
  
  let ivsText = 'IVs/EVs'
  
      ivsText += '\nStats                IV |  EV\n';
  
      ivsText += '—————————————————————————————\n';
  
      ivsText += `HP                   ${ivs.hp.toString().padStart(2)} |  ${evs.hp}\n`;
  
      ivsText += `Attack               ${ivs.attack.toString().padStart(2)} |  ${evs.attack}\n`;
  
      ivsText += `Defense              ${ivs.defense.toString().padStart(2)} |  ${evs.defense}\n`;
  
      ivsText += `Sp. Attack           ${ivs.special_attack.toString().padStart(2)} |  ${evs.special_attack}\n`;
  
      ivsText += `Sp. Defense          ${ivs.special_defense.toString().padStart(2)} |  ${evs.special_defense}\n`;
  
      ivsText += `Speed                ${ivs.speed.toString().padStart(2)} |  ${evs.speed}\n`;
  
      ivsText += '—————————————————————————————\n';
  
      ivsText += `Total               ${calculateTotal(ivs)} |  ${calculateTotal(evs)}\n`;
  
  let img = p.front_default_image
  
  const im = shiny.filter((poke)=>poke.name==p2.name)[0]
  
  if(events[p2.name] && p2.symbol == '🪅'){
  
  img = events[p2.name]
  
  }
  
  if(im && p2.symbol=='✨'){
  
  img=im.shiny_url
  
  }
  
  if(!img){
  
  await sendMessage(ctx,1072659486,'No image for '+name+'')
  
  
  
  return}
  
  const actionRow = [{text:'Evolve',callback_data:'evolve_'+p2.pass+'_'+ctx.from.id+''}]
  if(!isRayquazaLockedFromHeldItems(p2)){
    actionRow.push({text:'Held Items',callback_data:'heldpanel_'+p2.pass+'_'+ctx.from.id+''})
  }
  actionRow.push({text:'Release',callback_data:'release_'+p2.pass+'_'+ctx.from.id+''})
  const keyboardArray = [
  [
  {text:'Stats',callback_data:'ste_'+p2.pass+'_'+ctx.from.id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+p2.pass+'_'+ctx.from.id+''},{text:'Moveset',callback_data:'moves_'+p2.pass+'_'+ctx.from.id+''}],
  actionRow
  ]
  
  // Check if Zygarde with Aura Break and not yet changed
  const isZygarde = String(p2.name || '').toLowerCase().replace(/[-_]/g, '').includes('zygarde')
  const abilityNorm = String(p2.ability || '').toLowerCase().replace(/[-_\s]/g, '')
  const hasAuraBreak = abilityNorm === 'aurabreak'
  const alreadyChanged = !!(p2.powerConstructChanged)
  
  if(isZygarde && hasAuraBreak && !alreadyChanged) {
    keyboardArray.push([{text:'🔧 Power Construct',callback_data:'zygpc_'+p2.pass+'_'+ctx.from.id+''}])
  }
  
  await sendMessage(ctx,ctx.chat.id,img,{caption:msg,parse_mode:'markdown',reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:keyboardArray}})
  
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
  
  ore.push({text:b,callback_data:'stats_'+p.pass+'_'+ctx.from.id+'_'+ctx.message.message_id+''})
  
  b++;
  
  }
  
    const rows = [];
  
    for (let i = 0; i < ore.length; i += 5) {
  
      rows.push(ore.slice(i, i + 5));
  
    }
  
  const rows2 = []
  
  if(page > 1){
  
  rows2.push({text:'<',callback_data:'suger_'+ctx.from.id+'_'+name2+'_stats_'+ctx.message.message_id+'_'+(page-1)+''})
  
  }
  
  if(endIdx < p22.length){
  
  rows2.push({text:'>',callback_data:'suger_'+ctx.from.id+'_'+name2+'_stats_'+ctx.message.message_id+'_'+(page+1)+''})
  
  }
  
  if(rows2.length){
  rows.push(rows2)
  }
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},message+'\n\n_Check Stats Of Which Pokemon?_',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})
  
  }
  
})

bot.action(/suger_/, async (ctx, next) => {
  const parts = String(ctx.callbackQuery.data || '').split('_');
  const userId = parts[1];
  const statsIndex = parts.indexOf('stats');
  if (statsIndex === -1) {
    if (typeof next === 'function') {
      return next();
    }
    return;
  }
  const name = statsIndex > 2 ? parts.slice(2, statsIndex).join('_') : parts[2];
  const replyTo = parts[statsIndex + 1] || ctx.callbackQuery.message.message_id;

  if (String(ctx.from.id) !== String(userId)) {
    await ctx.answerCbQuery('Not your action.');
    return;
  }

  await ctx.answerCbQuery();
  const data = await getUserData(ctx.from.id);
  const name2 = name.replace(/ /g,'-');
  const p22 = data.pokes.filter((poke)=> (poke.name==name2.toLowerCase()) || (poke.nickname && poke.nickname.toLowerCase() == name.toLowerCase()))
  if(!p22 || p22.length < 1){
    await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Does Not Have *'+name+'*',{reply_to_message_id:replyTo});
    return;
  }

  if(p22.length == 1){
    const p2 = p22[0];
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    const statsCardApi = getStatsCardApi(data);
    const loadingMessage = await sendStatsGeneratingMessage(ctx, sendMessage, replyTo);
    try {
      await statsCardApi.sendPokemonCard(ctx, deps, data, p2, replyTo);
    } finally {
      if (loadingMessage) {
        try {
          await bot.telegram.deleteMessage(ctx.chat.id, loadingMessage);
        } catch (_) {}
      }
    }
    return;
    const p = pokes[p2.name.toLowerCase()];
    const g = growth_rates[p2.name];
    const exp = chart[g.growth_rate];
    const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
    const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
    const n = exp[currentLevel+1] || p2.exp;
    let n2 = n-p2.exp;
    let b7 = n2;
    if(n2==0){
      b7 = p2.exp;
    }
    let msg = '➤ *'+c(getDisplayPokemonName(p2, forms))+' '+getDisplayPokemonSymbol(p2)+'*';
    msg += '\n*Level:* '+currentLevel+' | *Nature:* '+c(p2.nature)+'';
    msg += '\n*Ability:* '+c(titleCaseAbility(p2.ability || 'none'))+'';
    msg += '\n*Held Item:* '+c(titleCaseHeldItem(p2.held_item || 'none'))+'';
    msg += '\n*Dynamax Level:* '+getDynamaxLevel(p2)+'';
    msg += '\n`'+getDynamaxLevelBar(p2)+'`';
    msg += '\n*Types:* '+c(p.types.join(' / '))+'';
    msg += '\n*EXP:* '+p2.exp.toLocaleString()+'';
    msg += '\n*Need To Next Level:* '+n2.toLocaleString()+'';
    msg += '\n`'+Bar(p2.exp,b7)+'`';
    const ivs = p2.ivs;
    const evs = p2.evs;
    let ivsText = 'IVs/EVs';
    ivsText += '\nStats                IV |  EV\n';
    ivsText += '——————————————————————————————\n';
    ivsText += `HP                   ${ivs.hp.toString().padStart(2)} |  ${evs.hp}\n`;
    ivsText += `Attack               ${ivs.attack.toString().padStart(2)} |  ${evs.attack}\n`;
    ivsText += `Defense              ${ivs.defense.toString().padStart(2)} |  ${evs.defense}\n`;
    ivsText += `Sp. Attack           ${ivs.special_attack.toString().padStart(2)} |  ${evs.special_attack}\n`;
    ivsText += `Sp. Defense          ${ivs.special_defense.toString().padStart(2)} |  ${evs.special_defense}\n`;
    ivsText += `Speed                ${ivs.speed.toString().padStart(2)} |  ${evs.speed}\n`;
    ivsText += '——————————————————————————————\n';
    ivsText += `Total               ${calculateTotal(ivs)} |  ${calculateTotal(evs)}\n`;
    let img = p.front_default_image;
    const im = shiny.filter((poke)=>poke.name==p2.name)[0];
    if(events[p2.name] && p2.symbol == '🪄'){
      img = events[p2.name];
    }
    if(im && p2.symbol=='✨'){
      img=im.shiny_url;
    }
    if(!img){
      await sendMessage(ctx,1072659486,'No image for '+name+'');
      return;
    }
    const actionRow = [{text:'Evolve',callback_data:'evolve_'+p2.pass+'_'+ctx.from.id+''}]
    if(!isRayquazaLockedFromHeldItems(p2)){
      actionRow.push({text:'Held Items',callback_data:'heldpanel_'+p2.pass+'_'+ctx.from.id+''})
    }
    actionRow.push({text:'Release',callback_data:'release_'+p2.pass+'_'+ctx.from.id+''})
    await sendMessage(ctx,ctx.chat.id,img,{caption:msg,parse_mode:'markdown',reply_to_message_id:replyTo,
    reply_markup:{inline_keyboard:[
    [{text:'Stats',callback_data:'ste_'+p2.pass+'_'+ctx.from.id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+p2.pass+'_'+ctx.from.id+''},{text:'Moveset',callback_data:'moves_'+p2.pass+'_'+ctx.from.id+''}],
    actionRow
    ]}});
    return;
  }

  const ore = [];
  let message = '';
  let page = parseInt(parts[statsIndex + 2]) || 1;
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(p22.length / pageSize));
  if (page < 1) {
    page = 1;
  } else if (page > totalPages) {
    page = totalPages;
  }
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pokemon2 = await sort(ctx.from.id,p22)
  const pokemon = pokemon2.slice(startIdx,endIdx)
  message += await pokelist(pokemon.map(item => item.pass),ctx,startIdx)
  let b = startIdx + 1
  for(const p of pokemon){
    ore.push({text:b,callback_data:'stats_'+p.pass+'_'+ctx.from.id+'_'+replyTo+''})
    b++
  }
  const rows = [];
  for (let i = 0; i < ore.length; i += 5) {
    rows.push(ore.slice(i, i + 5));
  }
  const rows2 = []
  if(page > 1){
    rows2.push({text:'<',callback_data:'suger_'+ctx.from.id+'_'+name2+'_stats_'+replyTo+'_'+(page-1)+''})
  }
  if(endIdx < p22.length){
    rows2.push({text:'>',callback_data:'suger_'+ctx.from.id+'_'+name2+'_stats_'+replyTo+'_'+(page+1)+''})
  }
  if(rows2.length){
    rows.push(rows2)
  }
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,message+'\n\n_Check Stats Of Which Pokemon?_',{parse_mode:'markdown',reply_markup:{inline_keyboard:rows}});
});
}

module.exports = registerStatsCommand;
