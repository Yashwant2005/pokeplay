function register_004_stats(bot, deps) {
  const { getUserData, saveUserData2, sendMessage, forms, pokes, growth_rates, chart, c, Stats, shiny, events, Bar } = deps;
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
  const { getDisplayPokemonName, getDisplayPokemonSymbol } = require('../../utils/gmax_utils');
  const { getDynamaxLevel, getDynamaxLevelBar } = require('../../utils/dynamax_level');
  const { isRayquazaLockedFromHeldItems } = require('../../utils/pokemon_item_rules');
  const titleCaseHeldItem = (value) => String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';
  bot.action(/stats_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const mid = ctx.callbackQuery.data.split('_')[3]
if(id!=ctx.from.id){
return
}
const data = await getUserData(ctx.from.id)
const p2 = data.pokes.filter((poke)=> poke.pass == pass)[0]
if(!p2){
ctx.answerCbQuery('Poke Not Found')
return
}
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
let msg = '➤ *'+c(getDisplayPokemonName(p2, forms))+' '+getDisplayPokemonSymbol(p2)+'*'
msg += '\n*Level:* '+currentLevel+' | *Nature:* '+c(p2.nature)+''
msg += '\n*Ability:* '+c(titleCaseAbility(p2.ability || 'none'))+''
msg += '\n*Held Item:* '+c(titleCaseHeldItem(p2.held_item || 'none'))+''
msg += '\n*Dynamax Level:* '+getDynamaxLevel(p2)+''
msg += '\n`'+getDynamaxLevelBar(p2)+'`'
msg += '\n*Types:* '+c(p.types.join(' / '))+''
msg += '\n*EXP:* '+p2.exp.toLocaleString()+''
msg += '\n*Need To Next Level:* '+n2.toLocaleString()+''
msg += '\n`'+Bar(p2.exp,b7)+'`'
let img = p.front_default_image
const im = shiny.filter((poke)=>poke.name==p2.name)[0]
if(events[p2.name] && p2.symbol == '🪅'){
img = events[p2.name]
}

if(p2.symbol=='✨'){
img=im.shiny_url
}
if(!img){
await sendMessage(ctx,1072659486,'No image for '+p2.name+'')

return}
try{
await ctx.deleteMessage()
}catch(error){
}

const actionRow = [{text:'Evolve',callback_data:'evolve_'+p2.pass+'_'+ctx.from.id+''}]
if(!isRayquazaLockedFromHeldItems(p2)){
  actionRow.push({text:'Held Items',callback_data:'heldpanel_'+p2.pass+'_'+ctx.from.id+''})
}
actionRow.push({text:'Release',callback_data:'release_'+p2.pass+'_'+ctx.from.id+''})

const keyboardArray = [
[{text:'Stats',callback_data:'ste_'+p2.pass+'_'+ctx.from.id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+pass+'_'+id+''},{text:'Moveset',callback_data:'moves_'+p2.pass+'_'+ctx.from.id+''}],
actionRow
]

// Check if Zygarde with Aura Break
const abilityNorm = String(p2.ability || '').toLowerCase().replace(/[-_\s]/g, '')
const hasAuraBreak = abilityNorm === 'aurabreak'
const alreadyChanged = !!(p2.powerConstructChanged)

if(hasAuraBreak && !alreadyChanged) {
  keyboardArray.push([{text:'🔧 Power Construct',callback_data:'zygpc_'+p2.pass+'_'+ctx.from.id+''}])
}

await sendMessage(ctx,ctx.chat.id,img,{caption:msg,parse_mode:'markdown',reply_to_message_id:mid,
reply_markup:{inline_keyboard:keyboardArray}})
})
}

  // Zygarde Power Construct ability change
  bot.action(/zygpc_/,async ctx => {
    const pass = ctx.callbackQuery.data.split('_')[1]
    const id = ctx.callbackQuery.data.split('_')[2]
    if(id!=ctx.from.id){
      return
    }
    const data = await getUserData(ctx.from.id)
    const p2 = data.pokes.filter((poke)=> poke.pass == pass)[0]
    if(!p2){
      ctx.answerCbQuery('Poke Not Found')
      return
    }
    
    const abilityNorm = String(p2.ability || '').toLowerCase().replace(/[-_\s]/g, '')
    const hasAuraBreak = abilityNorm === 'aurabreak'
    const alreadyChanged = !!(p2.powerConstructChanged)
    
    if(!hasAuraBreak) {
      ctx.answerCbQuery('This Pokemon cannot use Power Construct')
      return
    }
    
    if(alreadyChanged) {
      ctx.answerCbQuery('Ability already changed! Can only be done once.')
      return
    }
    
    // Change ability to Power Construct
    p2.ability = 'power-construct'
    p2.powerConstructChanged = true
    
    await saveUserData2(ctx.from.id, data)
    ctx.answerCbQuery('✨ Ability changed to Power Construct!')
    
    try {
      await ctx.deleteMessage()
    } catch(error) {}
    
    await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'✨ *'+c(p2.name)+'* ability changed to *Power Construct*!\n\nThis can only be done once.',{reply_markup:{inline_keyboard:[[{text:'Back',callback_data:'stats_'+p2.pass+'_'+ctx.from.id+''}]]}})
  })

module.exports = register_004_stats;

