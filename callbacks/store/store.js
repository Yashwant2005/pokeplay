function register_043_store(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/store_/,async ctx => {
const item = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
if(item=='sell'){
const store2 = ['buy','tms','sell']
const store = store2.filter((storeitem)=>storeitem!=item)
const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,`*Welcome To Poke Store (Sell Section) 🏦 :-

★ PokeBalls :-
• Regular Ball -* 7 💷
*• Great Ball -* 12 💷
*• Ultra Ball -* 20 💷 
*• Repeat Ball -* 25 💷
*• Beast Ball -* 50 💷
*• Quick Ball -* 40 💷
*• Net Ball -* 25 💷
*• Nest Ball -* 30 💷
*• Friend Ball -* 25 💷
*• Level Ball -* 25 💷
*• Moon Ball -* 35 💷
*• Sport Ball -* 15 💷
*• Luxury Ball -* 10 💷
*• Premier Ball -* 8 💷
*• Park Ball -* 75 💷
*• Master Ball -* 3000 💷

*★ Items :-*
*• Candy -* 50 💷
*• Berry -* 40 💷
*• Vitamin -* 50 💷
*• Item -* 5000 💷

*Example :-*
• /sell regular 1
• /sell candy 1
• /sell items
• /sell master 1

_Use /pokeballs To Get Details About PokeBalls._
_Use /sell To Sell Item To PokeStore_`,{parse_mode:'markdown',
reply_markup:{inline_keyboard:rows}})
}

if(item=='buy'){
const store2 = ['buy','tms','sell']
const store = store2.filter((storeitem)=>storeitem!=item)
const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,`*Welcome To Poke Store (Buy Section) 🏦 :-

★ PokeBalls :-
• Regular Ball -* 15 💷
*• Great Ball -* 25 💷
*• Ultra Ball -* 40 💷
*• Repeat Ball -* 50 💷@
*• Beast Ball -* 100 💷
*• Quick Ball -* 65 💷
*• Net Ball -* 45 💷
*• Nest Ball -* 55 💷

*★ Items :-*
*• Candy -* 100 💷
*• Berry -* 75 💷
*• Vitamin -* 100 💷
*• Key Stone -* 5000 💷

*Example :-*
• /buy regular 1
• /buy nest 5
• /buy candy 3
• /buy key

_Use /pokeballs To Get Details About PokeBalls._
_Use /buy To Buy From PokeStore_`,{parse_mode:'markdown',
reply_markup:{inline_keyboard:rows}})
}
if(item=='tms'){
const page = ctx.callbackQuery.data.split('_')[3]*1 || 1
const startIdx = (page - 1) * 7;
const endIdx = startIdx + 6;
if(page<1 || startIdx > Object.keys(tms.tmnumber).length){
return
}
const userData = await getUserData(ctx.from.id)
const matchingLevels = Object.keys(trainerlevel).filter(level => userData.inv.exp >= trainerlevel[level]);
const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
if(level < 35){
ctx.answerCbQuery('Reach Level 35 To Unlock TMs Store')
return
}

let msg = '<b>Welcome To Poke Store (TMs Section) 🏦 :-</b>\n\n'
const tm = tms.tmnumber
let b = 1
for(const t in tm){
const m = tms.tmnumber[String(t)]
if(tmprices.buy[String(t)]){
if(startIdx <= b && b<= endIdx){
msg += '<b>'+b+'. TM'+t+'</b> - '+tmprices.buy[String(t)]+' 💷\n<b> '+c(dmoves[m].name)+'</b> ['+c(dmoves[m].type)+' '+emojis[dmoves[m].type]+']\n<b>Power :</b> '+dmoves[m].power+', <b>Accuracy :</b> '+dmoves[m].accuracy+' ('+c(dmoves[m].category)+')\n\n'
}
b++;
}
}
msg += '\n• <b>Example :-</b> /buy tm2'
const store2 = ['buy','tms','sell']
const store = store2.filter((storeitem)=>storeitem!=item)
const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
let key2 = [[{text:'<',callback_data:'store_tms_'+ctx.from.id+'_'+(page-1)+''},{text:'>',callback_data:'store_tms_'+ctx.from.id+'_'+(page+1)+''}]]
var key = key2.concat(rows)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:key}})
}
})
}

module.exports = register_043_store;

