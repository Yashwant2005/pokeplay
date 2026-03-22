function registerHuntCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { toBaseIdentifier } = require('../../utils/base_form_pokemon');
  const { Z_CRYSTALS, titleCaseZCrystal } = require('../../utils/z_crystals');
  function isBlockedWildArceusForm(identifier) {
    return /^arceus-(bug|dark|dragon|electric|fighting|fire|flying|ghost|grass|ground|ice|poison|psychic|rock|steel|water|fairy)$/.test(String(identifier || '').toLowerCase());
  }
  function isBlockedStarterHuntPokemon(identifier) {
    const name = String(identifier || '').toLowerCase();
    return name === 'eevee-starter' || name === 'pikachu-starter';
  }
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
  
  if(Array.isArray(mdata.battle) && mdata.battle.includes(ctx.from.id)){
  
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

  if(!data.extra || typeof data.extra !== 'object'){
  data.extra = {}
  }
  if(!data.extra.itembox || typeof data.extra.itembox !== 'object'){
  data.extra.itembox = {}
  }
  if(!Number.isFinite(data.extra.itembox.maxSoup)){
  data.extra.itembox.maxSoup = 0
  }
  if(!data.extra.itembox.zCrystals || typeof data.extra.itembox.zCrystals !== 'object'){
  data.extra.itembox.zCrystals = {}
  }

  if(Math.random()<0.0000125){

  data.extra.itembox.maxSoup += 1

  await saveUserData2(ctx.from.id,data)

  await sendMessage(ctx,ctx.chat.id,gmax,{caption:'You found a *Max Soup*.',parse_mode:'markdown'})

  return}

  if(Math.random()<0.00005){

  const crystal = Z_CRYSTALS[Math.floor(Math.random()*Z_CRYSTALS.length)]

  if(!Number.isFinite(data.extra.itembox.zCrystals[crystal])){
  data.extra.itembox.zCrystals[crystal] = 0
  }
  data.extra.itembox.zCrystals[crystal] += 1

  await saveUserData2(ctx.from.id,data)

  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You found a *'+titleCaseZCrystal(crystal)+'*.')

  return}
  
  
  
  if(Math.random()<0.00005){
    // Only old stones (exclude new stones)
    const NEW_STONES = [
      'raichuite-x','raichuite-y','clefableite','victreebelite','starmieite','dragoniteite','meganiumite','feraligatrite','skarmoryite','chimechoite','absolite-z','staraptorite','garchompite-z','lucarioite-z','froslassite','emboarite','excadrillite','scolipedeite','scraftyite','eelektrossite','chandelureite','golurkite','chesnaughtite','delphoxite','greninjaite','pyroarite','meowsticite','malamarite','barbaracleite','dragalgeite','hawluchaite','crabominableite','golisopodite','drampaite','magearnaite','falinksite','scovillainite','glimmoraite','tatsugiriite','baxcaliburite'
    ];
    const st = Object.keys(stones).filter(s => !NEW_STONES.includes(s));
    if (!st.length) return;
    const stone = st[Math.floor(Math.random()*st.length)];
    await sendMessage(ctx,ctx.chat.id,stones[stone].image,{caption:'You found a *'+c(stone)+'*',parse_mode:'markdown'});
    if(!data.inv.stones){
      data.inv.stones = [];
    }
    data.inv.stones.push(stone);
    await saveUserData2(ctx.from.id,data);
    return;
  }
  
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
  
  let org = 'no'
  
  const list2 = rdata[region]
  const playerRegion = typeof data.inv.region === 'string' ? data.inv.region.toLowerCase() : ''
  const safariRegion = typeof data?.extra?.saf === 'string' ? data.extra.saf.toLowerCase() : ''
  const isActiveSafari = Boolean(data.balls.safari && data.balls.safari > 0 && safariRegion && safari[safariRegion])

  if(isActiveSafari){
  
  ar = ['legendry','legendary']
  
  if(Math.random()<0.4){
  
  ar.push('rare')
  
  }
  
  }
  
  let rg = data.inv.region
  
  if(
    ['alola', 'melmele', 'akala', 'ulaula', 'poni'].includes(playerRegion) ||
    (isActiveSafari && safariRegion == 'alola')
  ){
    rg = 'alola'
  }

  if(
    ['galar', 'isle-of-armor', 'crown-tundra'].includes(playerRegion) ||
    (isActiveSafari && safariRegion == 'galar')
  ){
    rg = 'galar'
  }

  if(
    (playerRegion == 'hisui') ||
    (isActiveSafari && safariRegion == 'hisui')
  ){
    rg = 'hisui'
  }

  if(['paldea', 'kitakami', 'blueberry'].includes(playerRegion)){
    rg = 'paldea'
  }
  
  const regionList = (rdata && rdata[region]) ? rdata[region] : null;
  if(data.extra.evhunt && data.extra.evhunt > 0){

  if(!regionList || !Array.isArray(regionList) || regionList.length < 1){
    return
  }
  var list = regionList.filter(pokemon => {
  
    const pokemonData = pokes[pokemon];
  
    return pokemonData && !isBlockedStarterHuntPokemon(pokemon) && pokemonData.ev_yield.some(([stat, value]) => stat ===  data.extra.evh && value > 1);
  
  });
  
  }else if(isActiveSafari){
  
  var list = (safari[safariRegion] || []).filter((pk) => !isBlockedStarterHuntPokemon(pk))
  
  }else{
  
  var list = Object.keys(spawn).filter(pk=>spawn[pk] && ar.includes(spawn[pk].toLowerCase()) && list2.includes(pk) && !isBlockedStarterHuntPokemon(pk))
  
  }
  
  if(!list || list.length < 1){
    return
  }
  const name5 = list[Math.floor(Math.random()*list.length)]
  
  const nut = ['gmax','mega','origin','primal','crowned','eternamax']
  
  if(!forms[name5] || !Array.isArray(forms[name5]) || forms[name5].length < 1){
    return
  }
  if(data.extra.evhunt && data.extra.evhunt > 0){
  
  var fr = forms[name5].filter(pokemon => {
  
    const pokemonData = pokes[pokemon.identifier];
  
    return pokemonData && !isBlockedStarterHuntPokemon(pokemon.identifier) && !isBlockedWildArceusForm(pokemon.identifier) && pokemonData.ev_yield.some(([stat, value]) => stat ===  data.extra.evh && value > 1 && !nut.some((pk2)=> pokemon.identifier.includes(pk2)));
  
  });
  
  }else if(isActiveSafari){
  
  var fr = forms[name5].filter(pk=> !isBlockedStarterHuntPokemon(pk.identifier) && !nut.some((pk2)=> pk.identifier.includes(pk2)) && !isBlockedWildArceusForm(pk.identifier))
  
  }else{
  
  var fr = forms[name5].filter(pk=> {
    const spawnClass = typeof spawn[pk.identifier] === 'string' ? spawn[pk.identifier].toLowerCase() : null
    return !isBlockedStarterHuntPokemon(pk.identifier) && !nut.some((pk2)=> pk.identifier.includes(pk2)) && spawnClass && ar.includes(spawnClass)
  })
  
  }
  
  const fr2 = fr.filter(pk=>pk.identifier.includes(rg))
  
  const fr3 = fr.filter(pk=> !pk.identifier.includes('alola') && !pk.identifier.includes('galar') && !pk.identifier.includes('hisui') && !pk.identifier.includes('paldea'))
  
  
  if (fr2.length < 1 && fr3.length < 1) {
    return
  }
  let name = fr2.length > 0 ? fr2[Math.floor(Math.random()*fr2.length)].identifier : fr3[Math.floor(Math.random()*fr3.length)].identifier
  name = toBaseIdentifier(name, forms)
  
  const im = shiny.filter((poke)=>poke.name==name)[0]
  
  const pdata = pokes[name]
  
  if(!pdata){
  
  return
  
  }
  
  let p = pdata.front_default_image
  
  let s = ''
  
  const l = Math.random()
  
  let chyi = 1 / 40960
  
  if(data.inv && data.inv.shiny_charm){
    const regionPokemon = rdata[region] || []
    const caughtSet = new Set(data.pokecaught || [])
    const allCaughtInRegion = regionPokemon.every(pkName => caughtSet.has(pkName))
    if(allCaughtInRegion){
      chyi = 1 / 27306
    }
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
  const messageData = await loadMessageData();
  messageData[ctx.chat.id] = { mid: m62, timestamp: Date.now(), id: ctx.from.id };
  await saveMessageData(messageData);
  
  });
}

module.exports = registerHuntCommand;

