function register_044_keyitem(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/keyitem_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const item = ctx.callbackQuery.data.split('_')[1]
if(item=='page'){
const ore = []
let message = '*You Have Following Key Items :-*'
const page = ctx.callbackQuery.data.split('_')[3]*1
const pageSize = 15
const startIdx = (page - 1) * pageSize;
let b = startIdx
if(page < 1 || startIdx > data.inv.stones.length){
return
}

const endIdx = startIdx + pageSize;
const stn = data.inv.stones.slice(startIdx,endIdx)
for(const p of stn){
ore.push({text:c(p),callback_data:'keyitem_'+b+'_'+ctx.from.id+''})
b++;
}
  const rows = [];
  for (let i = 0; i < ore.length; i += 3) {
    rows.push(ore.slice(i, i + 3));
}
if(data.inv.stones.length > 15){
rows.push([{text:'<',callback_data:'keyitem_page_'+ctx.from.id+'_'+(page-1)+''},{text:'>',callback_data:'keyitem_page_'+ctx.from.id+'_'+(page+1)+''}])
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,message,{parse_mode:'markdown',reply_markup:{inline_keyboard:rows}})
return
}
if(!data.inv.stones[item*1]){
ctx.answerCbQuery('Something Went Wrong With This Stone')
return
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'★ This *Key Item* known as *'+c(data.inv.stones[item*1])+'*\n• Which helps *'+c(stones[data.inv.stones[item*1]].pokemon)+'* to transform into *'+c(stones[data.inv.stones[item*1]].mega)+'* in a battle.\n\n_Do you wanna sell your_ *'+c(data.inv.stones[item*1])+'*',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'syllity_'+item+'_'+ctx.from.id+''},{text:'No',callback_data:'keyitem_page_'+ctx.from.id+'_1'}]]}, link_preview_options:{show_above_text:true, url: stones[data.inv.stones[item*1]].image}})
})
}

module.exports = register_044_keyitem;

