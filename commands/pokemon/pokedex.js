function registerPokedexCommand(bot, deps) {
  const { gmax, check, getUserData, sendMessage, spawn, forms, pokes, growth_rates, stat, c, re, expdata, chains, Stats } = deps;
  bot.command('pokedex',check,async ctx => {
  
  const data = await getUserData(ctx.from.id)
  
  const name = ctx.message.text.split(' ').slice(1).join(' ').replace(/ /g,'-').toLowerCase();
  
  if(!name){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Write a *Pokemon* name also *Next* to the *Command.*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const pks = Object.keys(forms)
  
  let poke = false
  
  if(forms[name]){
  
  poke=name
  
  }else{
  
  for(const y of pks){
  
  const pok = forms[y].filter((p)=>p.identifier==name)
  
  if(pok.length>0){
  
  poke = y
  
  }
  
  }
  
  }
  
  if(!poke){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'No *Matching* found with this *Name*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const poke2 = forms[poke].filter((p)=>data.pokeseen.includes(p.identifier))
  
  if(poke2.length<1 && !data.pokeseen.includes(poke)){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'There is no *Entry* of this *Pokemon* in your *Pokedex*.',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  if(!pokes[forms[poke][0].identifier] || !pokes[forms[poke][0].identifier].front_default_image){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Something went wrong.*')
  
  return
  
  }
  
  const key = [[{text:'Base Stats',callback_data:'bst_'+poke+'_'+ctx.from.id+'_1'},
  
  {text:'Spawn Locations',callback_data:'ryf_'+poke+'_'+ctx.from.id+'_1'}]]
  
  const form = 1
  
  if(forms[poke].length>1){
  
  key.push([{text:'<',callback_data:'pkydex_'+poke+'_'+ctx.from.id+'_'+(form-1)+''},{text:''+form+'/'+forms[poke].length+'',callback_data:'ntg'},
  
  {text:'>',callback_data:'pkydex_'+poke+'_'+ctx.from.id+'_'+(form+1)+''}])
  
  }
  
  let msg = ''
  
  var py = forms[poke][0]
  
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
  
  }
  
  msg += '\n• <b>Growth Rate:</b> '+c(growth_rates[py.identifier].growth_rate)+''
  
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
  
  msg += '\n• <b>Evolves Into:</b> '+m2.join(' / ')+''
  
  }
  
  await sendMessage(ctx,ctx.chat.id,pokes[forms[poke][0].identifier].front_default_image,{caption:msg,reply_to_message_id:ctx.message.message_id,reply_markup:{
  
  inline_keyboard:key},parse_mode:'html'})
  
  })
}

module.exports = registerPokedexCommand;

