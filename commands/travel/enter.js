function registerEnterCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const getUtcMidnightCountdown = () => {
    const next = moment.utc().add(1, 'day').startOf('day');
    const totalSec = Math.max(0, next.diff(moment.utc(), 'seconds'));
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return hours + ':' + mins + ':' + secs;
  };

  bot.command('enter',check,check2,async ctx => {
  
  const userData = await getUserData(ctx.from.id);
  
  const currentDate = moment.utc().format('YYYY-MM-DD');
  
  if(userData.balls.safari && userData.balls.safari > 0){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Are Already In *'+c(userData.extra.saf)+' Safari Zone*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  if(!userData.extra){
  
  userData.extra = {}
  
  }
  
  if(userData.extra.evhunt && userData.extra.evhunt > 0){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You are doing *'+c(userData.extra.evh)+' EV* training.')
  
  return
  
  }
  
  const regions = {
  
    'Kanto': ['kanto', 'letsgo-kanto'],
  
    'johto':['johto'],
  
    'hoenn':['hoenn'],
  
    'sinnoh':['sinnoh'],
  
  'hisui': ['hisui'],
  
    'unova':['unova'],
  
     'kalos':['kalos-central','kalos-mountain','kalos-coastal'],
  
    'alola':['alola','poni','melemele','akala','ulaula'],
  
    'Galar': ['galar','isle-of-armor', 'crown-tundra'],
  
    'paldea':['paldea','kitakami','blueberry'],
  
  };
  
  const ry = Object.keys(regions).filter((r)=>regions[r].includes(userData.inv.region.toLowerCase()))[0]

  if(!ry){

  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Travel* to any other *Region*. Current *Region* safari isn\'t *Available*',{reply_to_message_id:ctx.message.message_id})

  return

  }
  
  if(userData.extra.lastsafari && userData.extra.lastsafari == currentDate){
  
  let key5 = []
  
  if(userData.inv.pass && userData.inv.pass > 0){
  
  key5 = [{text:'Use Safari Pass 🀄',callback_data:'safari_'+ry+'_'+ctx.from.id+'_pass'}]
  
  }
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Have Already Played *Safari* Today\n*Time remaining:* '+getUtcMidnightCountdown()+' (resets at 00:00 UTC)',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[key5]}})
  
  return
  
  }
  
  if (userData.inv.pc < 200) {
  
      await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Entry Fees Is *200 PokeCoins 💷*',{reply_to_message_id:ctx.message.message_id});
  
      return;
  
    }
  
  const matchingLevels = Object.keys(trainerlevel).filter(level => userData.inv.exp >= trainerlevel[level]);
  
  const userLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined
  
  const firstRow = [{text:'Yes',callback_data:'safari_'+ry+'_'+ctx.from.id+''}]
  
  if(userData.inv.pass && userData.inv.pass > 0){
  firstRow.push({text:'Use Safari Pass 🀄',callback_data:'safari_'+ry+'_'+ctx.from.id+'_pass'})
  }
  
  const key = [firstRow,[{text:'No',callback_data:'dlt_'+ctx.from.id+''}]];
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Are you *Sure* to enter *'+c(ry)+'* region *Safari Zone*\n\n_Using Safari Pass does not consume your normal safari quota for today._',{reply_markup:{inline_keyboard:key}})
  
  })
}

module.exports = registerEnterCommand;

