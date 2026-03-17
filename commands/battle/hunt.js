function registerHuntCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  commands.set('hunt', async (ctx) => {
  
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  if(ctx.chat.type!='private'){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Use this command in *Private* to *Hunt* pokemons.',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Hunt',url:'t.me/'+bot.botInfo.username+'?start=hunt'}]]}})
  
  return
  
  }
  
  if(!ctx.session.key){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Opening Keyboard.....*',{reply_markup:{keyboard:[['/hunt','/close']],resize_keyboard:true}})
  
  ctx.session.key = true
  
  }
  
    const region = data.inv.region
  
  if(!region || !rdata[region]){
  
   await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Use /travel and go any region*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  if(!data.inv.team){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Use /myteams and set-up your team*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const currentDate = moment().format('YYYY-MM-DD');
  
  if(!data.extra.huntd || data.extra.huntd != currentDate){
  
  data.extra.huntd = currentDate
  
  data.extra.hunts = 0
  
  }
  
  data.extra.hunts += 1
  
  await saveUserData2(ctx.from.id,data)
  
  const mdata = await loadMessageData();
  
  if(mdata.battle.includes(ctx.from.id)){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You are in a *battle*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  if(Math.random() < 0.0003){
  
  const n5 = Object.keys(tms.tmnumber)
  
  const num = n5[Math.floor(Math.random()*n5.length)]
  
  if(!data.tms){
  
  data.tms = {}
  
  }
  
  if(!data.tms[String(num)]){
  
  data.tms[String(num)] = 0
  
  }
  
  data.tms[String(num)] += 1
  
  await saveUserData2(ctx.from.id,data)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Found A *TM'+num+'* ⚙')
  
  return
  
  }
  
  if(!data.inv.omniring && !data.inv.gmax_band && !data.inv.ring && (Math.random()< 0.00005 || (gma > 0 && Math.random() < rar))){
  
  gma -= 1
  
  data.inv.omniring = true
  data.inv.gmax_band = true
  data.inv.ring = true
  
  await saveUserData2(ctx.from.id,data)
  
  await sendMessage(ctx,ctx.chat.id,gmax,{caption:'You found an *OmniRing*.',parse_mode:'markdown'})
  
  await sendMessage(ctx,-1003069884900,'#hunt\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) found<code>OmniRing</code>',{parse_mode:'HTML'})
  
  return
  
  }
  
  
  
  if(Math.random()<0.00005){
  
  const st = Object.keys(stones)
  
  const stone = st[Math.floor(Math.random()*st.length)]
  
  await sendMessage(ctx,ctx.chat.id,stones[stone].image,{caption:'You found a *'+c(stone)+'*',parse_mode:'markdown'})
  
  if(!data.inv.stones){
  
  data.inv.stones = []
  
  }
  
  data.inv.stones.push(stone)
  
  await saveUserData2(ctx.from.id,data)
  
  return}
  
  if(Math.random() < 0){
  
  const ry = Object.keys(trainers)[Math.floor(Math.random()*Object.keys(trainers).length)]
  
  const ii = trainers[ry]
  
  const me = await sendMessage(ctx,ctx.chat.id,ii,{caption:'*'+c(ry)+'* has *Challenged* you for a *Battle.*',reply_to_message_id:ctx.message.message_id,reply_markup:{
  
  inline_keyboard:[[{text:'Accept',callback_data:'exrtbt_'+ry+''}]]},parse_mode:'markdown'})
  
  ctx.session.name = me.message_id
  
  return
  
  }
  
  
  
  let ar = ['common','medium']
  
  const rt = Math.random()
  
  if(rt<0.5){
  
  a = ['rare']
  
  }
  
  if(rt<0.0005){
  
  ar = ['legendry','legendary']
  
  }
  
  if(rt<0.00005){
  
  a = ['mythical']
  
  }
  
  if(data.balls.safari && data.balls.safari > 0){
  
  ar = ['legendry','legendary']
  
  if(Math.random()<0.4){
  
  ar.push('rare')
  
  }
  
  }
  
  let org = 'no'
  
  const list2 = rdata[region]
  
  let rg = data.inv.region
  
  if(['alola', 'melmele', 'akala', 'ulaula', 'poni'].includes(data.inv.region.toLowerCase()) || (data.balls.safari && data.balls.safari > 0 && data.extra.saf.toLowerCase() == 'alola') ){
  
  rg = 'alola'
  
  }
  
  if(['galar', 'isle-of-armor', 'crown-tundra'].includes(data.inv.region.toLowerCase()) || (data.balls.safari && data.balls.safari > 0 && data.extra.saf.toLowerCase() == 'galar') ){
  
  rg = 'galar'
  
  }
  
  if(data.inv.region.toLowerCase()=='hisui' || (data.balls.safari && data.balls.safari > 0 && data.extra.saf.toLowerCase() == 'hisui') ){
  
  rg = 'hisui'
  
  }
  
  if(['paldea', 'kitakami', 'blueberry'].includes(data.inv.region.toLowerCase())){
  
  rg = 'paldea'
  
  }
  
  if(data.extra.evhunt && data.extra.evhunt > 0){
  
  var list = rdata[region].filter(pokemon => {
  
    const pokemonData = pokes[pokemon];
  
    return pokemonData && pokemonData.ev_yield.some(([stat, value]) => stat ===  data.extra.evh && value > 1);
  
  });
  
  }else if(data.balls.safari && data.balls.safari > 0){
  
  var list = safari[data.extra.saf.toLowerCase()]
  
  }else{
  
  var list = Object.keys(spawn).filter(pk=>ar.includes(spawn[pk].toLowerCase()) && list2.includes(pk))
  
  }
  
  const name5 = list[Math.floor(Math.random()*list.length)]
  
  const nut = ['gmax','mega','origin','primal','crowned','eternamax']
  
  if(data.extra.evhunt && data.extra.evhunt > 0){
  
  var fr = forms[name5].filter(pokemon => {
  
    const pokemonData = pokes[pokemon.identifier];
  
    return pokemonData && pokemonData.ev_yield.some(([stat, value]) => stat ===  data.extra.evh && value > 1 && !nut.some((pk2)=> pokemon.identifier.includes(pk2)));
  
  });
  
  }else if(data.balls.safari && data.balls.safari > 0){
  
  var fr = forms[name5].filter(pk=> !nut.some((pk2)=> pk.identifier.includes(pk2)))
  
  }else{
  
  var fr = forms[name5].filter(pk=> !nut.some((pk2)=> pk.identifier.includes(pk2)) && ar.includes(spawn[pk.identifier].toLowerCase()))
  
  }
  
  const fr2 = fr.filter(pk=>pk.identifier.includes(rg))
  
  const fr3 = fr.filter(pk=> !pk.identifier.includes('alola') && !pk.identifier.includes('galar') && !pk.identifier.includes('hisui') && !pk.identifier.includes('paldea'))
  
  
  if (fr2.length < 1 && fr3.length < 1) {
    return
  }
  let name = fr2.length > 0 ? fr2[Math.floor(Math.random()*fr2.length)].identifier : fr3[Math.floor(Math.random()*fr3.length)].identifier
  
  const im = shiny.filter((poke)=>poke.name==name)[0]
  
  const pdata = pokes[name]
  
  if(!pdata){
  
  return
  
  }
  
  let p = pdata.front_default_image
  
  let s = ''
  
  const l = Math.random()
  
  let chyi = 0.0001
  
  if(org=='yes'){
  
  chyi = 0.05
  
  }
  
  if(im && l<chyi){
  
  p=im.shiny_url
  
  s='✨'
  
  }
  
  if(!p){
  
  await sendMessage(ctx,1072659486,'No image for '+name+'')
  
  
  
  return}
  
  const ul = lvls[name]
  
  let m = Math.max(ul.split('-')[0]*1,5)
  
  let m2 = ul.split('-')[1]*1
  
  const evo2 = chains.evolution_chains.filter((chain)=>chain.evolved_pokemon==name.toLowerCase() && chain.evolution_level && chain.evolution_method == 'level-up')[0]
  
  const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==name.toLowerCase() && chain.evolution_level && chain.evolution_method == 'level-up')[0]
  
  
  
  if(evo){
  
  m2 = evo.evolution_level
  
  }
  
  if(evo2){
  
  m=evo2.evolution_level
  
  }
  
  if(!m){
  
  m=20
  
  }
  
  if(!m2){
  
  m2 = Math.min((m+30),60)
  
  }
  
  
  
  const level = Math.floor(Math.random()*(m2-m))+m
  
  if(s=='🪅'){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Found A *Event* 🪅 Pokemon',{reply_markup:{remove_keyboard:true}})
  
  ctx.session.key = false
  
  }
  
  
  
  
  
  if(s=='✨'){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Found A *Shiny* ✨ Pokemon',{reply_markup:{remove_keyboard:true}})
  
  ctx.session.key = false
  
  }
  
  if(!data.pokecaught){
  
  data.pokecaught = []
  
  }
  
  if(data.pokecaught.includes(name)){
  
  var re = '✧ '
  
  }else{
  
  var re = ''
  
  }
  
  let msg = 'A wild *'+c(name)+'* (*Lv.* '+level+') '+s+' has appeared '+re+''
  
  if(data.extra.evhunt && data.extra.evhunt > 0){
  
  const data699 = pokes[name]
  
  let highestEV = { stat: "", value: 0 };
  
  
  
      const evYield = data699.ev_yield;
  
      evYield.forEach(([stat, value]) => {
  
        if (value > highestEV.value) {
  
          highestEV = { stat, value };
  
        }
  
      });
  
  msg += '\n+'+highestEV.value+' *'+c(data.extra.evh)+' EV*'
  
  if(data.extra.evhunt == 1){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You *EV Training* Has Completed')
  
  }
  
  data.extra.evhunt -= 1
  
  await saveUserData2(ctx.from.id,data)
  
  }
  
  const m62 = await sendMessage(ctx,ctx.chat.id,p,{caption:msg,parse_mode:'markdown',reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Capture',callback_data:'catch_'+name+'_'+level+'_'+s+'_'+org+''},{text:'EV yield',callback_data:'ev_'+name+''}]]}})
  
  ctx.session.name = m62
  
  });
}

module.exports = registerHuntCommand;

