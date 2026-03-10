function register_062_trdfe(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/trdfe_/,async ctx => {
const id1 = ctx.callbackQuery.data.split('_')[1]
const pass = ctx.callbackQuery.data.split('_')[2]
const id2 = ctx.callbackQuery.data.split('_')[3]
const page3 = ctx.callbackQuery.data.split('_')[4] || false
if(ctx.from.id!=id1 && ctx.from.id!=id2){
ctx.answerCbQuery()
return
}
if(ctx.from.id==id2 && !page3){
ctx.answerCbQuery('Wait, the other person didn\'t choosed his poke')
return
}
if((ctx.from.id==id1 && !page3) || (ctx.from.id==id2 && page3)){
const userData = await getUserData(id2)
let pokes = await sort(id2,userData.pokes);
if(userData.inv.sort){
pokes = await sort(userData.pokes,userData.inv.sort)
}
  const buttonsPerRow = 5;
  let page = parseInt(ctx.callbackQuery.data.split('_')[4]) || 1
  const itemsPerPage = 20;
const totalPages = Math.ceil(userData.pokes.length / itemsPerPage);
if(page<1 || page > totalPages){
return
}
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, pokes.length);
  const inlineKeyboard = [];
  let row = [];

for (let i = startIndex; i < endIndex; i++) {
  const sortedIndex = userData.pokes.indexOf(pokes[i]);
  row.push({
    text: `${sortedIndex + 1}`,
    callback_data: `trfe_${id1}_${pass}_${id2}_${userData.pokes[i].pass}`,
  });

  if ((sortedIndex + 1) % buttonsPerRow === 0 || sortedIndex === endIndex - 1) {
    inlineKeyboard.push(row);
    row = [];
  }
}
if(page>1 || endIndex<pokes.length){
const row2 = []
row2.push({text:'<',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page-1)+''})
row2.push({text:'>',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page+1)+''})
inlineKeyboard.push(row2)
}
if(totalPages > 10){
const row = []
row.push({text:'(-5) <<',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page-5)+'_'+ctx.from.id+''})
row.push({text:'>> (+5)',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page+5)+'_'+ctx.from.id+''})
inlineKeyboard.push(row)
}
if(totalPages > 40){
const row = []
row.push({text:'(-10) <<<',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page-10)+'_'+ctx.from.id+''})
row.push({text:'>>> (+10)',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page+10)+'_'+ctx.from.id+''})
inlineKeyboard.push(row)
}
if(totalPages > 100){
const row = []
row.push({text:'(-25) <<<<',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page-25)+'_'+ctx.from.id+''})
row.push({text:'>>>> (+25)',callback_data:'trdfe_'+id1+'_'+pass+'_'+id2+'_'+(page+25)+'_'+ctx.from.id+''})
inlineKeyboard.push(row)
}
const data = await getUserData(id1)
const pk = pokes.slice(startIndex,endIndex)
  let messageText = '<a href = "tg://user?id='+id2+'"><b>'+userData.inv.name+'</b></a>\'s Pokemon List (Page: <b>'+page+'</b>)\n';
messageText += await pokelisthtml(pk.map(item => item.pass),id2,startIndex)
  messageText += '\n\n<b><u>❖ Select Which Poke Likes To Trade With</u></b> <a href = "tg://user?id='+id1+'"><b>'+data.inv.name+'</b></a>';

  const keyboard = {
    inline_keyboard: inlineKeyboard,
  };
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText, { parse_mode: 'html', reply_markup: keyboard });
}
});
}

module.exports = register_062_trdfe;

