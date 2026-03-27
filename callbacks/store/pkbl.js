const _balls_pkbl = JSON.parse(require('fs').readFileSync('data/balls.json', 'utf8'));
function register_088_pkbl(bot, deps) {
  const { editMessage, word, c, fs } = deps;
  bot.action(/pkbl:/,async ctx => {
const balls = _balls_pkbl;
const ball = ctx.callbackQuery.data.split(':')[1]
const id = ctx.callbackQuery.data.split(':')[2]
if(ctx.from.id==id){
if(ball=='back'){
const bt = Object.keys(balls)
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'pkbl:'+word+':'+ctx.from.id+'' }))
  const rows = [];
for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Here is the list of following *PokeBalls* available in *PokePlay.*',{parse_mode:'markdown',reply_markup:{inline_keyboard:rows}})
}else{
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*★ PokeBall Name:* '+c(balls[ball].name)+'.\n\n• * Description:* '+balls[ball].description+'',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Back',callback_data:'pkbl:back:'+ctx.from.id+''}]]},link_preview_options:{url: balls[ball].image,show_above_text:true}})
}
}
})
}

module.exports = register_088_pkbl;

