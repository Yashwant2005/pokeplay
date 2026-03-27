function register_005_moves(bot, deps) {
  const { getUserData, editMessage, pokes, dmoves, c, Stats, emojis } = deps;
  const { isRayquazaLockedFromHeldItems } = require('../../utils/pokemon_item_rules');
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
const actionRow = [{text:'Evolve',callback_data:'evolve_'+pass+'_'+id+''}]
if(!isRayquazaLockedFromHeldItems(poke)){
actionRow.push({text:'Held Items',callback_data:'heldpanel_'+pass+'_'+id+''})
}
actionRow.push({text:'Release',callback_data:'release_'+pass+'_'+id+''})
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{
inline_keyboard:[
[{text:'Info',callback_data:'info_'+pass+'_'+id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+pass+'_'+id+''},
{text:'Stats',callback_data:'ste_'+pass+'_'+id+''}],
actionRow
]}})
})
}

module.exports = register_005_moves;

