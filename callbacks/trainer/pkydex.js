function register_076_pkydex(bot, deps) {
  const { gmax, getUserData, editMessage, spawn, forms, pokes, growth_rates, stat, c, re, expdata, chains, Stats } = deps;
  const pkydexLast = new Map();
  bot.action(/pkydex_/,async ctx => {
  const now = Date.now();
  const last = pkydexLast.get(ctx.from.id) || 0;
  if(now - last < 1200){
    ctx.answerCbQuery('Try again');
    return;
  }
  pkydexLast.set(ctx.from.id, now);
console.log('a')
const poke = ctx.callbackQuery.data.split('_')[1]
const form = ctx.callbackQuery.data.split('_')[3]*1
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
var py = forms[poke][form-1]
if(form > forms[poke].length || form<1){
return
}
console.log(py.identifier)
if(!pokes[py.identifier] || !pokes[py.identifier].front_default_image){
ctx.answerCbQuery('*Something went wrong.*')
return
}
const key = [[{text:'Base Stats',callback_data:'bst_'+poke+'_'+ctx.from.id+'_'+form+''},
{text:'Spawn Locations',callback_data:'ryf_'+poke+'_'+ctx.from.id+'_'+form+''}]]
if(forms[poke].length>1){
key.push([{text:'<',callback_data:'pkydex_'+poke+'_'+ctx.from.id+'_'+(form-1)+''},{text:''+form+'/'+forms[poke].length+'',callback_data:'ntg'},
{text:'>',callback_data:'pkydex_'+poke+'_'+ctx.from.id+'_'+(form+1)+''}])
}
let msg = ''
if(data.pokecaught.includes(py.identifier)){
var re = '✧ '
}else{
var re = ''
}
if(py.form_identifier && py.form_identifier.length > 0){
msg += '★ <b>'+c(poke)+'</b> ('+c(py.form_identifier)+' Form) '+re+''
}else{
msg += '★ <b>'+c(py.identifier)+'</b> '+re+''
}
const cat = (spawn[py.identifier]=='legendry') ? 'legendary' : spawn[py.identifier]
msg += '\n• <b>Pokedex Id:</b> '+pokes[py.identifier].pokedex_number.toString().padStart(3,'0')+''
msg += '\n• <b>Types:</b> '+c(pokes[py.identifier].types.join(' / '))+''
const ay = expdata.filter((p)=>p.name==py.identifier)[0]
const data99 = pokes[py.identifier]
let highestEv = { stat: "", value: 0 };

    const evYield = data99.ev_yield;
    evYield.forEach(([stat, value]) => {
      if (value > highestEv.value) {
        highestEv = { stat, value };
      }
    });
msg += '\n• <b>EV Yield:</b> '+highestEv.value+' '+c(highestEv.stat)+''
msg += '\n• <b>Rarity:</b> '+c(cat)+''
if(ay && ay.baseExp){
msg += '\n• <b>Base EXP:</b> '+ay.baseExp+''
}msg += '\n• <b>Growth Rate:</b> '+c(growth_rates[py.identifier].growth_rate)+''
let m2 = []
const evo2 = chains.evolution_chains.filter((chain)=>chain.current_pokemon==poke)
if(evo2.length > 0){
for(const evo of evo2){
const fr = forms[evo.evolved_pokemon].filter((p)=> !p.identifier.includes('gmax')
&& !p.identifier.includes('mega') && !p.identifier.includes('crowned')
&& !p.identifier.includes('primal'))
if(py.identifier.includes('galar')){
const n2 = fr.filter((p)=> p.identifier.includes('galar'))
if(n2.length > 0){
var rn = n2
}else{
var rn = fr
}
}else if(py.identifier.includes('hisui')){
const n2 = fr.filter((p)=> p.identifier.includes('hisui'))
if(n2.length > 0){
var rn = n2
}else{
var rn = fr
}
}else if(py.identifier.includes('paldea')){
const n2 = fr.filter((p)=> p.identifier.includes('paldea'))
if(n2.length > 0){
var rn = n2
}else{
var rn = fr
}
}else if(py.identifier.includes('alola')){
const n2 = fr.filter((p)=> p.identifier.includes('alola'))
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
for(const a of rn){
m2.push('<b>'+c(a.identifier)+'</b> ('+c(evo.evolution_method)+')')
}
}
msg += '\n• <b>Evolves Into:</b> '+m2.join(' <b>/</b> ')+''
}
await editMessage('media',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{
type:'photo',
media:pokes[py.identifier].front_default_image,
caption:msg,
parse_mode:'html'
},{
reply_markup:{
inline_keyboard:key},parse_mode:'html'})
})
}

module.exports = register_076_pkydex;

