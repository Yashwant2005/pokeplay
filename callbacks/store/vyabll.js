function register_038_vyabll(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/vyabll:/,async ctx => {
const balls = JSON.parse(fs.readFileSync('data/balls.json', 'utf8'));
const ball = ctx.callbackQuery.data.split(':')[1]
const id = ctx.callbackQuery.data.split(':')[2]
if(ctx.from.id==id){
const data = await getUserData(ctx.from.id)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*★ PokeBall Name:* '+c(balls[ball].name)+'.\n• *Description:* '+balls[ball].description+'\n\n*Total Owned :* '+data.balls[ball]+'',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Back',callback_data:'poag_balls_'+ctx.from.id+''}]]}, link_preview_options:{show_above_text:true, url: balls[ball].image}})
}
})
}

module.exports = register_038_vyabll;

