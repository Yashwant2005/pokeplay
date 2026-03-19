function register_004_stats(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
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
let msg = '➤ *'+c(p2.name)+' '+p2.symbol+'*'
msg += '\n*Level:* '+currentLevel+' | *Nature:* '+c(p2.nature)+''
msg += '\n*Ability:* '+c(titleCaseAbility(p2.ability || 'none'))+''
msg += '\n*Held Item:* '+c(titleCaseHeldItem(p2.held_item || 'none'))+''
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
await sendMessage(ctx,ctx.chat.id,img,{caption:msg,parse_mode:'markdown',reply_to_message_id:mid,
reply_markup:{inline_keyboard:[
[{text:'Stats',callback_data:'ste_'+p2.pass+'_'+ctx.from.id+''},{text:'IVs/EVs',callback_data:'pkisvs_'+pass+'_'+id+''},{text:'Moveset',callback_data:'moves_'+p2.pass+'_'+ctx.from.id+''}],
[{text:'Evolve',callback_data:'evolve_'+p2.pass+'_'+ctx.from.id+''},{text:'Held Items',callback_data:'heldpanel_'+p2.pass+'_'+ctx.from.id+''},{text:'Release',callback_data:'release_'+p2.pass+'_'+ctx.from.id+''}]
]}})
})
}

module.exports = register_004_stats;

