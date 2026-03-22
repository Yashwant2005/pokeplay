function register_047_evy(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { getReadyEvolutionRows, getEvolutionBaseName, getEvolutionRowsForPokemon, getPseudoRandomEvolutionLevel, isEvolutionRequirementMet } = require('../../utils/evolution_rules');
  const { getEvolutionStoneForTarget, removeEvolutionStone, titleCaseEvolutionStone } = require('../../utils/evolution_items');
  const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
  bot.action(/^(?:evy_|evytarget_|eeveeevy_)/,check2q,async ctx => {
const data = await getUserData(ctx.from.id)
const parts = ctx.callbackQuery.data.split('_')
const isTargetPick = ctx.callbackQuery.data.startsWith('evytarget_') || ctx.callbackQuery.data.startsWith('eeveeevy_')
const pass = isTargetPick ? parts[1] : parts[2]
const id = isTargetPick ? parts[2] : parts[3]
const requestedTarget = isTargetPick ? parts.slice(3).join('_') : ''
if(id && id!=ctx.from.id){
ctx.answerCbQuery()
return
}
const poke = data.pokes.filter((poke)=> poke.pass == pass)[0]
if(!poke){
await ctx.answerCbQuery('Poke not found', {show_alert:true})
return
}
let name2 = poke.name
const name = getEvolutionBaseName(name2, forms)
const currentLevel = plevel(poke.name,poke.exp)
const evo2 = getReadyEvolutionRows(name2, currentLevel, chains, forms, { data, now: new Date() })
const allEvolutionRows = getEvolutionRowsForPokemon(name2, chains, forms)
const selectedEvolution = requestedTarget
  ? allEvolutionRows.find((row) => String(row.evolved_pokemon || '').toLowerCase() === String(requestedTarget || '').toLowerCase())
  : null
const evo = selectedEvolution || evo2[Math.floor(Math.random()*evo2.length)]
if(!evo){
await ctx.answerCbQuery(c(name)+' does not evolve further or is not ready to evolve.', {show_alert:true})
return
}
if(selectedEvolution && !isEvolutionRequirementMet(name2, currentLevel, selectedEvolution, { data, now: new Date() })){
const levelNeeded = String(selectedEvolution.evolution_method || '').toLowerCase() === 'use-item'
  ? getPseudoRandomEvolutionLevel(name2, selectedEvolution)
  : Number(selectedEvolution.evolution_level) || 1
await ctx.answerCbQuery(c(selectedEvolution.evolved_pokemon)+' is not ready yet.\nNeed Lv. '+levelNeeded+'.', {show_alert:true})
return
}
if(poke.symbol == '🪅'){
await ctx.answerCbQuery('Event Pokemons cant be evolved.', {show_alert:true})
return
}

if(evo){
const fr = forms[evo.evolved_pokemon].filter((p)=> !p.identifier.includes('gmax') 
&& !p.identifier.includes('mega') && !p.identifier.includes('crowned') 
&& !p.identifier.includes('primal'))
const playerRegion = String((data.inv && data.inv.region) || '').toLowerCase()
const regionalGroups = {
alola: ['alola', 'melemele', 'akala', 'ulaula', 'poni'],
galar: ['galar', 'isle-of-armor', 'crown-tundra'],
hisui: ['hisui'],
paldea: ['paldea', 'kitakami', 'blueberry']
}
const regionTag = Object.keys(regionalGroups).find((tag) => regionalGroups[tag].includes(playerRegion)) || ''
const currentTag = ['galar', 'hisui', 'paldea', 'alola'].find((tag) => name2.includes(tag)) || ''
const preferredTag = currentTag || regionTag
if(preferredTag){
const n2 = fr.filter((p)=> p.identifier.includes(preferredTag))
if(n2.length > 0){
var rn = n2
}else{
var rn = fr
}
}else{
const fr2 = forms[evo.current_pokemon].filter((p)=> !p.identifier.includes('gmax') 
&& !p.identifier.includes('mega') && !p.identifier.includes('crowned') 
&& !p.identifier.includes('primal'))
const ye = fr2.filter((p)=> p.identifier.includes('galar') || 
p.identifier.includes('hisui') || p.identifier.includes('alola') || p.identifier.includes('paldea'))
if(ye.length > 0){
var rn = fr.filter((p)=> !p.identifier.includes('hisui') && 
!p.identifier.includes('galar') && !p.identifier.includes('alola') && !p.identifier.includes('paldea'))
}else{
var rn = fr
}
}


let nam = rn[Math.floor(Math.random()*rn.length)].identifier
const d = pokes[nam]
const requiredStone = evo.evolution_method == 'use-item' ? getEvolutionStoneForTarget(evo.evolved_pokemon) : ''
if(requiredStone && !removeEvolutionStone(data, requiredStone)){
await ctx.answerCbQuery('Missing ' + titleCaseEvolutionStone(requiredStone), {show_alert:true})
return
}
poke.name = nam
poke.id = d.pokedex_number
poke.ability = getRandomAbilityForPokemon(nam, pokes)
if(!d || !d.front_default_image){
ctx.answerCbQuery('This Evolution Cant Be Performed,Contact Admins',{show_alert:true})
return
}
if(!data.pokeseen){
data.pokeseen = []
}
if(!data.pokeseen.includes(nam)){
data.pokeseen.push(nam)
}
await saveUserData2(ctx.from.id,data)
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*'+c(name)+'* Is Evolving.......',{parse_mode:'markdown'})
setTimeout(async()=> {
ctx.deleteMessage(ctx.callbackQuery.message.message_id)
//ctx.deleteMessage(m.message.id)
let img = d.front_default_image
const im = shiny.filter((poke)=>poke.name==nam)[0]
if(events[poke.name] && poke.symbol == '🪅') {
img = events[poke.name]
}
if(poke.symbol=='✨' && im.shiny_url){
img=im.shiny_url
}
const moves = pokemoves[nam]
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'evolution' && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
if(moves2.length > 0){
for(const m of moves2){
if(poke.moves.length < 4){
poke.moves.push(m.id)
await saveUserData2(ctx.from.id,data)
await sendMessage(ctx,ctx.from.id,'<b>'+c(poke.name)+'</b> (<b>Lv.</b> '+(plevel(poke.name,poke.exp))+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})
}else{
const d = Date.now()
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a>, <b>'+c(poke.name)+'</b> (<b>Lv.</b> '+(plevel(poke.name,poke.exp))+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
}
const mdata = await loadMessageData();
const m77 = await sendMessage(ctx,ctx.from.id,'<b>'+c(poke.name)+'</b> (<b>Lv.</b> '+(plevel(poke.name,poke.exp))+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(poke.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+poke.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})
if(!mdata.moves){
mdata.moves = {}
}
mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:poke.name,move:dmoves[m.id].name}
await saveMessageData(mdata)
}
}
}
await saveUserData2(ctx.from.id,data)
let finalCaption = '*'+c(name)+'* Has Been Evolved Into *'+c(nam)+'*'
if(requiredStone){
finalCaption += '\nUsed *'+c(titleCaseEvolutionStone(requiredStone))+'*'
}
await sendMessage(ctx,ctx.chat.id,img,{caption:finalCaption,parse_mode:'markdown'})
},3500)
}else{
await ctx.answerCbQuery(c(name)+' does not meet the evolution requirements.', {show_alert:true})
}
})
}

module.exports = register_047_evy;

