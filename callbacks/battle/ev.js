function register_019_ev(bot, deps) {
  const { pokes, stat, c } = deps;
  bot.action(/^ev_/,async ctx => {
const name = ctx.callbackQuery.data.split('_')[1]
const data = pokes[name]
let highestEV = { stat: "", value: 0 };

    const evYield = data.ev_yield;
    evYield.forEach(([stat, value]) => {
      if (value > highestEV.value) {
        highestEV = { stat, value };
      }
    });
ctx.answerCbQuery('For Defeating '+c(name)+' You Poke Will Gain :\n\n'+highestEV.value+' '+highestEV.stat+' EV',{show_alert:true})
})
}

module.exports = register_019_ev;

