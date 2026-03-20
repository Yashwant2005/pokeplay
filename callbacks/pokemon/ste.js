function register_007_ste(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
  const titleCaseHeldItem = (value) => String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';
  bot.action(/ste_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(id!=ctx.from.id){
return
}
const data = await getUserData(ctx.from.id)
const p2 = data.pokes.filter((poke)=> poke.pass == pass)[0]
const g = growth_rates[p2.name]
const exp = chart[g.growth_rate]
const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
const base = pokestats[p2.name]
const stats = await Stats(base,p2.ivs,p2.evs,c(p2.nature),level)
const natureEffects = {
    Adamant: { increased: 'attack', decreased: 'special_attack' },
    Bold: { increased: 'defense', decreased: 'attack' },
    Brave: { increased: 'attack', decreased: 'speed' },
    Calm: { increased: 'special_defense', decreased: 'attack' },
    Careful: { increased: 'special_defense', decreased: 'special_attack' },
    Gentle: { increased: 'special_defense', decreased: 'defense' },
    Hasty: { increased: 'speed', decreased: 'defense' },
    Impish: { increased: 'defense', decreased: 'special_attack' },
    Jolly: { increased: 'speed', decreased: 'special_attack' },
    Lax: { increased: 'defense', decreased: 'special_defense' },
    Lonely: { increased: 'attack', decreased: 'defense' },
    Mild: { increased: 'special_attack', decreased: 'defense' },
    Modest: { increased: 'special_attack', decreased: 'attack' },
    Naive: { increased: 'speed', decreased: 'special_defense' },
    Naughty: { increased: 'attack', decreased: 'special_defense' },
    Quiet: { increased: 'special_attack', decreased: 'speed' },
    Rash: { increased: 'special_attack', decreased: 'special_defense' },
    Relaxed: { increased: 'defense', decreased: 'speed' },
    Sassy: { increased: 'special_defense', decreased: 'speed' },
    Timid: { increased: 'speed', decreased: 'attack' }
  };
let statsText = '';
statsText += '*Ability:* '+c(titleCaseAbility(p2.ability || 'none'))+'\n\n';
statsText += '*Held Item:* '+c(titleCaseHeldItem(p2.held_item || 'none'))+'\n\n';
statsText += '\n`Stats          Points`\n';
statsText += '`———————————————————————`\n';
statsText += `\`HP               ${stats.hp.toString().padStart(2)}\`\n`;
statsText += `\`Attack           ${stats.attack.toString().padStart(2)}\` *${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].increased === 'attack' ? '(+)' : ''}${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].decreased === 'attack' ? '(-)' : ''}*\n`;
statsText += `\`Defense          ${stats.defense.toString().padStart(2)}\` *${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].increased === 'defense' ? '(+)' : ''}${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].decreased === 'defense' ? '(-)' : ''}*\n`;
statsText += `\`Sp. Attack       ${stats.special_attack.toString().padStart(2)}\` *${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].increased === 'special_attack' ? '(+)' : ''}${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].decreased === 'special_attack' ? '(-)' : ''}*\n`;
statsText += `\`Sp. Defense      ${stats.special_defense.toString().padStart(2)}\` *${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].increased === 'special_defense' ? '(+)' : ''}${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].decreased === 'special_defense' ? '(-)' : ''}*\n`;
statsText += `\`Speed            ${stats.speed.toString().padStart(2)}\` *${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].increased === 'speed' ? '(+)' : ''}${natureEffects[c(p2.nature)] && natureEffects[c(p2.nature)].decreased === 'speed' ? '(-)' : ''}*\n`;

 await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,''+statsText+'',{parse_mode:'markdown',reply_markup:{inline_keyboard:[
[{text:'Info',callback_data:'info_'+pass+'_'+id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+pass+'_'+id+''},{text:'Moveset',callback_data:'moves_'+pass+'_'+id+''}],
[{text:'Evolve',callback_data:'evolve_'+pass+'_'+id+''},{text:'Held Items',callback_data:'heldpanel_'+pass+'_'+id+''},{text:'Release',callback_data:'release_'+pass+'_'+id+''}]
]}})
})
}

module.exports = register_007_ste;

