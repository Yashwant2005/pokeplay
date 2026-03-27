function register_075_nykne(bot, deps) {
  const { getUserData, editMessage, pokes, c, sort } = deps;
  const { getDisplayPokemonSymbol } = require('../../utils/gmax_utils');
  bot.action(/nykne_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const pokes = data.pokes.filter((pk)=>pk.nickname)
const page = ctx.callbackQuery.data.split('_')[1]*1
const pageSize = 25
const totalPages = Math.ceil(pokes.length / pageSize);
if(page < 1 || page > totalPages){
return
}
let msg = '*✦ Pokemon List That You Have Nicknamed\n*'
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
const pokemon2 = await sort(ctx.from.id,pokes)
const pokemon = pokemon2.slice(startIdx,endIdx)
let b = startIdx
for(const a of pokemon){
msg += '\n*'+(b+1)+'. '+c(a.nickname)+'* '+getDisplayPokemonSymbol(a)+' ('+c(a.name)+')'
b++;
}
const key = []
const row = []
row.push({text:'<',callback_data:'nykne_'+(page-1)+'_'+ctx.from.id+''})
row.push({text:'>',callback_data:'nykne_'+(page+1)+'_'+ctx.from.id+''})
key.push(row)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:key}})
})
}

module.exports = register_075_nykne;

