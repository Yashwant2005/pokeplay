function register_001_pkege(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/pkege_/,async ctx => {
const data = await getUserData(ctx.from.id)
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('You Cant Use')
return
}
if(!data.inv){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
reply_markup:{inline_keyboard:[[
{text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
return
}
const pageSize = 25
const totalPages = Math.ceil(data.pokes.length / pageSize);
const page = ctx.callbackQuery.data.split('_')[1]*1
if(page < 1 || page > totalPages){
return
}
let msg = '*✦ Your Pokemon List*\n'
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
const pokemon2 = await sort(ctx.from.id,data.pokes)
const pokemon = pokemon2.slice(startIdx,endIdx)
msg += await pokelist(pokemon.map(item => item.pass),ctx,startIdx)
const key = []
const row = []
row.push({text:'<',callback_data:'pkege_'+(page-1)+'_'+ctx.from.id+''})
row.push({text:'>',callback_data:'pkege_'+(page+1)+'_'+ctx.from.id+''})
key.push(row)
if(totalPages > 10){
const row = []
row.push({text:'(-5) <<',callback_data:'pkege_'+(page-5)+'_'+ctx.from.id+''})
row.push({text:'>> (+5)',callback_data:'pkege_'+(page+5)+'_'+ctx.from.id+''})
key.push(row)
}
if(totalPages > 40){
const row = []
row.push({text:'(-10) <<<',callback_data:'pkege_'+(page-10)+'_'+ctx.from.id+''})
row.push({text:'>>> (+10)',callback_data:'pkege_'+(page+10)+'_'+ctx.from.id+''})
key.push(row)
}
if(totalPages > 100){
const row = []
row.push({text:'(-25) <<<<',callback_data:'pkege_'+(page-25)+'_'+ctx.from.id+''})
row.push({text:'>>>> (+25)',callback_data:'pkege_'+(page+25)+'_'+ctx.from.id+''})
key.push(row)
}
const srt = data.extra.sort ? data.extra.sort : 'None'
const dis = data.extra.display ? data.extra.display : 'None'
msg += '\n\n*• Total Pokemons :* '+data.pokes.length+''
msg += '\n*• Displaying :* '+(dis)+''
msg += '\n*• Sorting Method :* '+c(srt)+''

await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:key}})
})
}

module.exports = register_001_pkege;

