function register_051_tmuse(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/tmuse_/,check2q,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const tm = ctx.callbackQuery.data.split('_')[1]
const m = tms.tmnumber[tm]
const move = dmoves[m]
const poks = Object.keys(pokemoves)
    .filter(pokemonName =>
      (pokemoves[pokemonName].moves_info || []).some(move => move.id === m)
    );
const data = await getUserData(ctx.from.id)
const pks2 = await sort(ctx.from.id,data.pokes)
const pks = pks2.filter((poke)=>poks.includes(poke.name))
if(pks.length < 1){
ctx.answerCbQuery('You Don\'t Have Any Pokemon Learn This')
return
}
const buttonsPerRow = 5;
  let page = parseInt(ctx.callbackQuery.data.split('_')[3]) || 1
  const itemsPerPage = 20;
const totalPages = Math.ceil(pks.length / itemsPerPage);
if(page<1 || page > totalPages){
ctx.answerCbQuery('You Not Have Enough Pokes To Use This TM')
return
}
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, pks.length);
const pks22 = pks.slice(startIndex,endIndex)
  const inlineKeyboard = [];
  let row = [];

for (let i = startIndex; i < endIndex; i++) {
  const sortedIndex = pks.indexOf(pks[i]);
  row.push({
    text: `${sortedIndex + 1}`,
    callback_data: `tundse_${tm}_${id}_${pks[i].pass}`,
  });

  if ((sortedIndex + 1) % buttonsPerRow === 0 || sortedIndex === endIndex - 1) {
    inlineKeyboard.push(row);
    row = [];
  }
}
if(page>1 || endIndex<pks.length){
const row2 = []
row2.push({text:'<',callback_data:'tmuse_'+tm+'_'+id+'_'+(page-1)+''})
row2.push({text:'>',callback_data:'tmuse_'+tm+'_'+id+'_'+(page+1)+''})
inlineKeyboard.push(row2)
}
  if(totalPages > 10){
  const row = []
  row.push({text:'(-5) <<',callback_data:'tmuse_'+tm+'_'+id+'_'+(page-5)+'_'+ctx.from.id+''})
  row.push({text:'>> (+5)',callback_data:'tmuse_'+tm+'_'+id+'_'+(page+5)+'_'+ctx.from.id+''})
  inlineKeyboard.push(row)
  }
  if(totalPages > 20){
  const row = []
  row.push({text:'(-10) <<<',callback_data:'tmuse_'+tm+'_'+id+'_'+(page-10)+'_'+ctx.from.id+''})
  row.push({text:'>>> (+10)',callback_data:'tmuse_'+tm+'_'+id+'_'+(page+10)+'_'+ctx.from.id+''})
  inlineKeyboard.push(row)
  }
  if(totalPages > 40){
  const row = []
  row.push({text:'(-20) <<<<',callback_data:'tmuse_'+tm+'_'+id+'_'+(page-20)+'_'+ctx.from.id+''})
  row.push({text:'>>>> (+20)',callback_data:'tmuse_'+tm+'_'+id+'_'+(page+20)+'_'+ctx.from.id+''})
  inlineKeyboard.push(row)
  }
  let messageText = `List Of Your Pokes (*Page ${page}*):\n\n`;
messageText += await pokelist(pks22.map(item => item.pass),ctx,startIndex)
  messageText += '\n_Select Poke To Use_ *TM' + tm + '*';

  const keyboard = {
    inline_keyboard: inlineKeyboard,
  };
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText, { parse_mode: 'markdown', reply_markup: keyboard });
})
}

module.exports = register_051_tmuse;

