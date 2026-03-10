function register_059_viewteam(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/viewteam_/,async ctx => {
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(id!=ctx.from.id){
ctx.answerCbQuery()
return
}
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
const data = await getUserData(ctx.from.id)
const te = Object.keys(battleData.tem)
const a = await pokelist(te,ctx,0)
ctx.answerCbQuery(a.replace(/\*/g, ''),{show_alert:true})
})
}

module.exports = register_059_viewteam;

