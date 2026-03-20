function register_065_evolve(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/evolve_/,check2q,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((p)=>p.pass===pass)[0]
if(id!=ctx.from.id){
ctx.answerCbQuery()
return
}
if(!poke){
ctx.answerCbQuery('Poke not found', { show_alert: true })
return
}
const p2 = poke
const g = growth_rates[p2.name]
const exp = chart[g.growth_rate]
const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
    const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
let name2 = p2.name
const pokemonNames = Object.keys(forms);
  for (const name3 of pokemonNames) {
const forms2 = forms[name3];
    const matchingForm = forms2.filter(form => form.identifier === name2);
    if (matchingForm.length > 0) {
var name = name3;
    }
  }
const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==name)[0]
if(!evo){
await ctx.answerCbQuery(c(p2.name)+' does not evolve further.', { show_alert: true })
return
}
if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= currentLevel){
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Are You Sure To Evolve Your *'+c(p2.name)+'* (*Lv.* '+currentLevel+')',{reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+p2.name+'_'+p2.pass+'_'+ctx.from.id+''},{text:'Cancel',callback_data:'delete_'+ctx.from.id+''}]]},parse_mode:'markdown'})
}else{
await ctx.answerCbQuery(c(p2.name)+' does not meet the evolution requirements.', { show_alert: true })
}
})
}

module.exports = register_065_evolve;

