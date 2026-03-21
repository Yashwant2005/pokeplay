function registerMynicknamesCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { getDisplayPokemonSymbol } = require('../../utils/gmax_utils');
  bot.command('mynicknames',check,async ctx => {  
  const data = await getUserData(ctx.from.id)  
  const pokes = data.pokes.filter((pk)=>pk.nickname)  
  let msg = '*✦ Pokemon List That You Have Nicknamed\n*'  
  const page = 1  
  const pageSize = 25  
  const startIdx = (page - 1) * pageSize;  
  const endIdx = startIdx + pageSize;  
  const pokemon2 = await sort(ctx.from.id,pokes)  
  const pokemon = pokemon2.slice(startIdx,endIdx)  
  let b = startIdx  
  for(const a of pokemon){  
  msg += '\n*'+(b+1)+'. '+c(a.nickname)+'* '+getDisplayPokemonSymbol(a)+' ('+c(a.name)+')'
  b++;}  
  const key = []  
  const row = []  
  row.push({text:'<',callback_data:'nykne_'+(page-1)+'_'+ctx.from.id+''})  
  row.push({text:'>',callback_data:'nykne_'+(page+1)+'_'+ctx.from.id+''})  
  key.push(row)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg,{reply_markup:{inline_keyboard:key},reply_to_message_id:ctx.message.message_id})  
  })
}

module.exports = registerMynicknamesCommand;

