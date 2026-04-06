function register_061_trade(bot, deps) {
  const { getUserData, editMessage, pokes, sort, pokelisthtml } = deps;
  bot.action(/trade_/,async ctx => {
const id1 = ctx.callbackQuery.data.split('_')[1]
const id2 = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id1 && ctx.from.id!=id2){
ctx.answerCbQuery()
return
}
if(ctx.from.id==id1){
ctx.answerCbQuery('You have already accepted')
return
}
  if(ctx.from.id==id2){
  const hasHeldItem = (poke) => {
    const item = poke && poke.held_item ? String(poke.held_item).trim().toLowerCase() : 'none';
    return item && item !== 'none';
  };
  const userData = await getUserData(id2)
  let pokes = await sort(id2,userData.pokes);
  const rbList = userData.extra && Array.isArray(userData.extra.randombattle_pokes) ? userData.extra.randombattle_pokes : [];
  pokes = pokes.filter((p) => !hasHeldItem(p) && !p?.temp_battle && !rbList.includes(p.pass));
  if(pokes.length < 1){
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You do not have any tradable pokemon. Remove held items first.',{parse_mode:'html'});
    return;
  }
  const buttonsPerRow = 5;
  let page = parseInt(ctx.callbackQuery.data.split('_')[3], 10);
  if (!Number.isFinite(page)) page = 1;
  const itemsPerPage = 20;
  const totalPages = Math.max(1, Math.ceil(pokes.length / itemsPerPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, pokes.length);
  const inlineKeyboard = [];
  let row = [];

for (let i = startIndex; i < endIndex; i++) {
  const displayIndex = i + 1;
  row.push({
    text: `${displayIndex}`,
    callback_data: `trdfe_${id2}_${pokes[i].pass}_${id1}`,
  });

  if (row.length === buttonsPerRow || i === endIndex - 1) {
    inlineKeyboard.push(row);
    row = [];
  }
}
if(safePage>1 || endIndex<pokes.length){
const row2 = []
row2.push({text:'<',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage-1)+''})
row2.push({text:'>',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage+1)+''})
inlineKeyboard.push(row2)
}
 if(totalPages > 10){
 const row = []
 row.push({text:'(-5) <<',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage-5)+'_'+ctx.from.id+''})
 row.push({text:'>> (+5)',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage+5)+'_'+ctx.from.id+''})
 inlineKeyboard.push(row)
 }
 if(totalPages > 20){
 const row = []
 row.push({text:'(-10) <<<',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage-10)+'_'+ctx.from.id+''})
 row.push({text:'>>> (+10)',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage+10)+'_'+ctx.from.id+''})
 inlineKeyboard.push(row)
 }
 if(totalPages > 40){
 const row = []
 row.push({text:'(-20) <<<<',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage-20)+'_'+ctx.from.id+''})
 row.push({text:'>>>> (+20)',callback_data:'trade_'+id1+'_'+id2+'_'+(safePage+20)+'_'+ctx.from.id+''})
 inlineKeyboard.push(row)
 }
const data = await getUserData(id1)
const pk = pokes.slice(startIndex,endIndex)
  let messageText = '<a href = "tg://user?id='+id2+'"><b>'+userData.inv.name+'</b></a>\'s Pokemon List (Page: <b>'+safePage+'</b>)\n';
messageText += await pokelisthtml(pk.map(item => item.pass),id2,startIndex)
  messageText += '\n\n<b><u>❖ Select Which Poke Likes To Trade With</u></b> <a href = "tg://user?id='+id1+'"><b>'+data.inv.name+'</b></a>';

  const keyboard = {
    inline_keyboard: inlineKeyboard,
  };
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText, { parse_mode: 'html', reply_markup: keyboard });
}
});
}

module.exports = register_061_trade;
