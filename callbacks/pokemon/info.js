function register_006_info(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
  const { isRayquazaLockedFromHeldItems } = require('../../utils/pokemon_item_rules');
  const titleCaseHeldItem = (value) => String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';
  bot.action(/info_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(id!=ctx.from.id){
return
}
const data = await getUserData(ctx.from.id)
const p2 = data.pokes.filter((poke)=> poke.pass == pass)[0]
const p = pokes[p2.name]
const g = growth_rates[p2.name]
const exp = chart[g.growth_rate]
const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
const n = exp[currentLevel+1] || p2.exp
let n2 = n-p2.exp
let b7 = n2
if(n2==0){
b7 = p2.exp
}
let msg = '➤ *'+c(p2.name)+' '+p2.symbol+'*'
msg += '\n*Level:* '+currentLevel+' | *Nature:* '+c(p2.nature)+''
msg += '\n*Ability:* '+c(titleCaseAbility(p2.ability || 'none'))+''
msg += '\n*Held Item:* '+c(titleCaseHeldItem(p2.held_item || 'none'))+''
msg += '\n*Types:* '+c(p.types.join(' / '))+''
msg += '\n*EXP:* '+p2.exp.toLocaleString()+''
msg += '\n*Need To Next Level:* '+n2.toLocaleString()+''
msg += '\n`'+Bar(p2.exp,b7)+'`'
const ivs = p2.ivs
const evs = p2.evs
let ivsText = 'IVs/EVs'
    ivsText += '\nStats                IV |  EV\n';
    ivsText += '—————————————————————————————\n';
    ivsText += `HP                   ${ivs.hp.toString().padStart(2)} |  ${evs.hp}\n`;
    ivsText += `Attack               ${ivs.attack.toString().padStart(2)} |  ${evs.attack}\n`;
    ivsText += `Defense              ${ivs.defense.toString().padStart(2)} |  ${evs.defense}\n`;
    ivsText += `Sp. Attack           ${ivs.special_attack.toString().padStart(2)} |  ${evs.special_attack}\n`;
    ivsText += `Sp. Defense          ${ivs.special_defense.toString().padStart(2)} |  ${evs.special_defense}\n`;
    ivsText += `Speed                ${ivs.speed.toString().padStart(2)} |  ${evs.speed}\n`;
    ivsText += '—————————————————————————————\n';
    ivsText += `Total               ${calculateTotal(ivs)} |  ${calculateTotal(evs)}\n`;

const actionRow = [{text:'Evolve',callback_data:'evolve_'+p2.pass+'_'+ctx.from.id+''}]
if(!isRayquazaLockedFromHeldItems(p2)){
  actionRow.push({text:'Held Items',callback_data:'heldpanel_'+p2.pass+'_'+ctx.from.id+''})
}
actionRow.push({text:'Release',callback_data:'release_'+p2.pass+'_'+ctx.from.id+''})

const keyboardArray = [
[{text:'Stats',callback_data:'ste_'+p2.pass+'_'+ctx.from.id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+pass+'_'+id+''},{text:'Moveset',callback_data:'moves_'+p2.pass+'_'+ctx.from.id+''}],
actionRow
]

const abilityNorm = String(p2.ability || '').toLowerCase().replace(/[-_\s]/g, '')
const hasAuraBreak = abilityNorm === 'aurabreak'
const alreadyChanged = !!(p2.powerConstructChanged)
if(hasAuraBreak && !alreadyChanged){
  keyboardArray.push([{text:'Power Construct',callback_data:'zygpc_'+p2.pass+'_'+ctx.from.id+''}])
}

await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',
reply_markup:{inline_keyboard:keyboardArray}})
})
}

module.exports = register_006_info;

