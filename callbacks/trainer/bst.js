function register_077_bst(bot, deps) {
  const { editMessage, forms, pokes, c, pokestats, Stats } = deps;
  bot.action(/bst_/,async ctx => {
const poke = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const form = ctx.callbackQuery.data.split('_')[3]*1
if(ctx.from.id!=id){
return
}
const py = forms[poke][form-1]
if(!pokes[py.identifier] || !pokes[py.identifier].front_default_image){
ctx.answerCbQuery('*Something went wrong.*')
return
}
let msg = '<b>Base Stats</b> of <b>'+c(py.identifier)+'</b>'
for(const a in pokestats[py.identifier]){
msg += '\n• <b>'+c(a)+'</b> '+pokestats[py.identifier][a]+''
}
const key = [[{text:'About',callback_data:'pkydex_'+poke+'_'+ctx.from.id+'_'+form+''},
{text:'Spawn Locations',callback_data:'ryf_'+poke+'_'+ctx.from.id+'_'+form+''}]]
if(forms[poke].length>1){
key.push([{text:'<',callback_data:'bst_'+poke+'_'+ctx.from.id+'_'+(form-1)+''},{text:''+form+'/'+forms[poke].length+'',callback_data:'ntg'},
{text:'>',callback_data:'bst_'+poke+'_'+ctx.from.id+'_'+(form+1)+''}])
}
await editMessage('media',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{type:'photo',media:pokes[py.identifier].front_default_image,caption:msg,parse_mode:'html'},{reply_markup:{inline_keyboard:key}})
})
}

module.exports = register_077_bst;

