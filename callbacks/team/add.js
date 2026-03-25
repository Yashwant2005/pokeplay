function register_028_add(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/add_/, check2q,async ctx => {
const userData = await getUserData(ctx.from.id);
  const team = ctx.callbackQuery.data.split('_')[1];
if(!Array.isArray(userData.pokes)) userData.pokes = [];
const visiblePokes = userData.pokes.filter((poke) => !poke.temp_battle);
let pokes = await sort(ctx.from.id,visiblePokes);
  const buttonsPerRow = 5;
  let page = parseInt(ctx.callbackQuery.data.split('_')[2]) || 1
  const itemsPerPage = 20;
const totalPages = Math.ceil(Math.max(pokes.length, 1) / itemsPerPage);
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
    callback_data: `select_${pokes[i].pass}_${team}`,
  });

  if (row.length === buttonsPerRow || i === endIndex - 1) {
    inlineKeyboard.push(row);
    row = [];
  }
}
if(page>1 || endIndex<pokes.length){
const row2 = []
row2.push({text:'<',callback_data:'add_'+team+'_'+(page-1)+''})
row2.push({text:'>',callback_data:'add_'+team+'_'+(page+1)+''})
inlineKeyboard.push(row2)
}
  if(totalPages > 10){
  const row = []
  row.push({text:'(-5) <<',callback_data:'add_'+team+'_'+(page-5)+'_'+ctx.from.id+''})
  row.push({text:'>> (+5)',callback_data:'add_'+team+'_'+(page+5)+'_'+ctx.from.id+''})
  inlineKeyboard.push(row)
  }
  if(totalPages > 20){
  const row = []
  row.push({text:'(-10) <<<',callback_data:'add_'+team+'_'+(page-10)+'_'+ctx.from.id+''})
  row.push({text:'>>> (+10)',callback_data:'add_'+team+'_'+(page+10)+'_'+ctx.from.id+''})
  inlineKeyboard.push(row)
  }
  if(totalPages > 40){
  const row = []
  row.push({text:'(-20) <<<<',callback_data:'add_'+team+'_'+(page-20)+'_'+ctx.from.id+''})
  row.push({text:'>>>> (+20)',callback_data:'add_'+team+'_'+(page+20)+'_'+ctx.from.id+''})
  inlineKeyboard.push(row)
  }


inlineKeyboard.push([{text:'⬅️ Back',callback_data:'set_'+team+''}])
const pk = pokes.slice(startIndex,endIndex)
  let messageText = `*List Of Your Pokes (Page ${page}):*\n`;
messageText += await pokelist(pk.map(item => item.pass),ctx,startIndex)
  messageText += '\n\n_Select Poke To Add In Team ' + team + '_';

  const keyboard = {
    inline_keyboard: inlineKeyboard,
  };
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText, { parse_mode: 'markdown', reply_markup: keyboard });
});
}

module.exports = register_028_add;

