function register_048_safari(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const getUtcMidnightCountdown = () => {
    const next = moment.utc().add(1, 'day').startOf('day');
    const totalSec = Math.max(0, next.diff(moment.utc(), 'seconds'));
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return hours + ':' + mins + ':' + secs;
  };

  bot.action(/^safari_/,check2q,async ctx => {
const reg = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const ext = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
ctx.answerCbQuery()
return
}
const currentDate = moment.utc().format('YYYY-MM-DD');
const userData = await getUserData(ctx.from.id);
if(!userData.balls.safari){
userData.balls.safari = 0
}
if(userData.balls.safari && userData.balls.safari > 0){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You Are Already In *'+c(userData.extra.saf)+' Safari Zone*',{parse_mode:'markdown'})
return
}
if(userData.extra.evhunt && userData.extra.evhunt > 0){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You are doing *'+c(userData.extra.evh)+' EV* training.',{parse_mode:'markdown'})
return
}
if(!userData.extra){
userData.extra = {}
}
if(ext && ext=='pass'){
if(!userData.inv.pass || userData.inv.pass < 1){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You does not have *🀄 Safari Pass*',{parse_mode:'markdown'})
return
}
}
if((!ext || ext!='pass') && userData.extra.lastsafari && userData.extra.lastsafari == currentDate){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You Have Already Played *Safari* Today\n*Time remaining:* '+getUtcMidnightCountdown()+' (resets at 00:00 UTC)',{parse_mode:'markdown'})
return
}
if ((!ext || ext!='pass') && userData.inv.pc < 200) {
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Entry Fees Is *200 PokeCoins 💷*',{parse_mode:'markdown'});
    return;
  }
const regions = {
  'Kanto': ['kanto', 'letsgo-kanto'],
  'johto':['johto'],
  'hoenn':['hoenn'],
'hisui': ['hisui'],
  'sinnoh':['sinnoh'],
  'unova':['unova'],
   'kalos':['kalos-central','kalos-mountain','kalos-coastal'],
  'alola':['alola','poni','melemele','akala','ulaula'],
  'Galar': ['galar','isle-of-armor', 'crown-tundra'],
  'paldea':['paldea','kitakami','blueberry'],
};

const ry = Object.keys(regions).filter((r)=>regions[r].includes(userData.inv.region.toLowerCase()))[0]
if(!ry){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*Travel* to any other *Region*. Current *Region* safari isn\'t *Available*',{parse_mode:'markdown'})
return
}
if(ext && ext=='pass'){
userData.inv.pass -= 1
userData.balls.safari = 30
userData.extra.saf = ry
}else{
userData.inv.pc -= 200
userData.balls.safari = 30
userData.extra.saf = ry
userData.extra.lastsafari = currentDate
}
await saveUserData2(ctx.from.id, userData);

  if(ext && ext=='pass'){
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully Entered *'+c(ry)+' Safari Zone* using *Safari Pass*\n\n_This did not consume your normal safari quota for today._',{parse_mode:'markdown'});
  return
  }

    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully Entered *'+c(ry)+' Safari Zone*',{parse_mode:'markdown'});
});
}

module.exports = register_048_safari;

