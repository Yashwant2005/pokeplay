function register_057_reject(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/reject_/,async ctx => {
const parts = ctx.callbackQuery.data.split('_')
const id1 = parts[1]
const id2 = parts[2]
const bword = parts[3]
if(ctx.from.id!=id2 && ctx.from.id!=id1){
ctx.answerCbQuery();
return
}
if(bword){
  try {
    const battleData = loadBattleData(bword);
    if(battleData && battleData.tempBattle && battleData.tempTeams){
      const ids = [id1,id2];
      for(const uid of ids){
        const data = await getUserData(uid);
        if(!data || !data.pokes) continue;
        const passes = battleData.tempTeams[uid] || [];
        if(passes.length > 0){
          data.pokes = data.pokes.filter(p => !passes.includes(p.pass));
        }
        if(data.extra && data.extra.temp_battle && data.extra.temp_battle[bword]){
          delete data.extra.temp_battle[bword];
        }
        await saveUserData2(uid, data);
      }
    }
  } catch (e) {
    // ignore missing battle file
  }
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'This challenge has been rejected by <a href="tg://user?id='+ctx.from.id+'"><b>'+he.encode(ctx.from.first_name)+'</b></a>',{parse_mode:'HTML'})
})
}

module.exports = register_057_reject;

