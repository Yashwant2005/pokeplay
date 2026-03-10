function register_002_suger(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/suger_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
if(ctx.from.id!=id){
ctx.answerCbQuery()
return
}
const name = ctx.callbackQuery.data.split('_')[2]
const query = ctx.callbackQuery.data.split('_')[3]
const msgid = ctx.callbackQuery.data.split('_')[4]
const data = await getUserData(ctx.from.id)
const page = ctx.callbackQuery.data.split('_')[5]*1 || 1
const matches = data.pokes.filter((poke)=> (poke.name==name.toLowerCase()) || (poke.nickname && poke.nickname.toLowerCase() == name.toLowerCase()))
if(matches.length < 1){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You don\'t have *'+c(name)+'*',{parse_mode:'markdown'})
return
}
let msg = ''
const ore = []
const passes = []
const pageSize = 25
const startIdx = (page - 1) * pageSize;
let b = startIdx+1
const endIdx = startIdx + pageSize;
const pokemon2 = await sort(ctx.from.id,matches)
const pokemon = pokemon2.slice(startIdx,endIdx)
msg += await pokelist(pokemon.map(item => item.pass),ctx,startIdx)
for(const p of pokemon){
ore.push({text:b,callback_data:''+query+'_'+p.pass+'_'+ctx.from.id+'_'+msgid+''})
b++;
}
  const rows = [];
  for (let i = 0; i < ore.length; i += 5) {
    rows.push(ore.slice(i, i + 5));
  }
const rows2 = []
if(page > 1){
rows2.push({text:'<',callback_data:'suger_'+id+'_'+name+'_'+query+'_'+msgid+'_'+(page-1)+''})
}
if(endIdx<matches.length){
rows2.push({text:'>',callback_data:'suger_'+id+'_'+name+'_'+query+'_'+msgid+'_'+(page+1)+''})
}
rows.push(rows2)
msg += '\n\nWhich Pokemon You Mean?'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:rows}})
})
}

module.exports = register_002_suger;

