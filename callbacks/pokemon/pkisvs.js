function register_008_pkisvs(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { isRayquazaLockedFromHeldItems } = require('../../utils/pokemon_item_rules');
  bot.action(/pkisvs_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(id!=ctx.from.id){
return
}
const data = await getUserData(ctx.from.id)
const p2 = data.pokes.filter((poke)=> poke.pass == pass)[0]
const ivs = p2.ivs
const evs = p2.evs
let ivsText = ''
    ivsText += '\nStats          IV |  EV\n';
    ivsText += '————————————————————————\n';
    ivsText += `HP              ${ivs.hp.toString().padStart(2)} |  ${evs.hp}\n`;
    ivsText += `Attack          ${ivs.attack.toString().padStart(2)} |  ${evs.attack}\n`;
    ivsText += `Defense         ${ivs.defense.toString().padStart(2)} |  ${evs.defense}\n`;
    ivsText += `Sp. Attack      ${ivs.special_attack.toString().padStart(2)} |  ${evs.special_attack}\n`;
    ivsText += `Sp. Defense     ${ivs.special_defense.toString().padStart(2)} |  ${evs.special_defense}\n`;
    ivsText += `Speed           ${ivs.speed.toString().padStart(2)} |  ${evs.speed}\n`;
    ivsText += '————————————————————————\n';
    ivsText += `Total           ${calculateTotal(ivs)} |  ${calculateTotal(evs)}\n`;
const actionRow = [{text:'Evolve',callback_data:'evolve_'+pass+'_'+id+''}]
if(!isRayquazaLockedFromHeldItems(p2)){
actionRow.push({text:'Held Items',callback_data:'heldpanel_'+pass+'_'+id+''})
}
actionRow.push({text:'Release',callback_data:'release_'+pass+'_'+id+''})
 await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'`'+ivsText+'`',{parse_mode:'markdownv2',reply_markup:{inline_keyboard:[
[{text:'Info',callback_data:'info_'+pass+'_'+id+''},{text:'Moveset',callback_data:'moves_'+pass+'_'+id+''},{text:'Stats',callback_data:'ste_'+pass+'_'+id+''}],
actionRow
]}})
})
}

module.exports = register_008_pkisvs;

