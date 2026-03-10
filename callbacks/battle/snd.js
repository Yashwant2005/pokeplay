function register_018_snd(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/snd_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const bword = ctx.callbackQuery.data.split('_')[2]
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
    } catch (error) {
      battleData = {};
    }
const data = await getUserData(ctx.from.id)
const ps = ctx.callbackQuery.data.split('_')[1]
if(battleData.team[ps] < 1){
ctx.answerCbQuery('This Poke Has Died')
return
}
const p = data.pokes.filter((poke)=>poke.pass==ps)[0]
if(!p){
ctx.answerCbQuery('Poke Not Found In Database')
return
}

battleData.c = ps
battleData.chp = battleData.team[ps]
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
const uname = he.encode(ctx.from.first_name)
const clevel = plevel(p.name,p.exp)
const op = pokes[battleData.name]
const base2 = pokestats[p.name]
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
let msg = '<i> Sent '+p.name+' For Battle</i>'
msg += '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
const p2 = pokes[p.name]
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+stats.hp+''
msg += '\n<code>'+Bar(stats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
let move = dmoves[move2]
msg += '\n<b>'+c(move.name)+'</b>['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
msg += '\n\n<i>Choose Your Next Move:</i>'
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'atk_'+word+'_'+bword+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'bag_'+bword+''},{text:'Escape',callback_data:'run_'+bword+''},{text:'Pokemon',callback_data:'pokemon_'+bword+''}]
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows,key2
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard})
})
}

module.exports = register_018_snd;

