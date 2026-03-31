function register_005_moves(bot, deps) {
  const { getUserData, editMessage, pokes, dmoves, c, Stats, emojis } = deps;
  const { buildPokemonCardKeyboard } = require('../../utils/pokemon_stats_card_v2');
  bot.action(/moves_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(id!=ctx.from.id){
return
}
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((poke)=> poke.pass == pass)[0]
let msg = ''
for(const move2 of poke.moves){
let move = dmoves[move2]
msg += '• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+', <b>Accuracy:</b> '+move.accuracy+'% <i>('+c(move.category.charAt(0))+')</i>\n'
}
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{
inline_keyboard: buildPokemonCardKeyboard(poke, id)}})
})
}

module.exports = register_005_moves;
