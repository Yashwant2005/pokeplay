function register_078_ryf(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/ryf_/,async ctx => {
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
let msg = '<b>'+c(py.identifier)+'</b> Found In :-'
var dt = []
for(const a in rdata){
if(rdata[a].includes(poke)){
dt.push(a)
}
}
let m2 = await formatDetails(dt)
const ui = Object.keys(safari).filter((o)=>safari[o].includes(poke))
if(ui.length>0){
let yr = []
for(const t of ui){
yr.push(c(t))
}
m2 += '\n<b>• Safari -</b> ['+yr+']'
}
const ye = ['mega','gmax','origin','primal','crowned','eternamax']
if(ye.includes(py.form_identifier)){
msg = '\n\nThis <b>Pokemon</b> has transformed from <b>'+c(poke)+'</b>'
}else{
msg += '\n\n'+m2+''
}
const key = [[{text:'About',callback_data:'pkydex_'+poke+'_'+ctx.from.id+'_'+form+''},
{text:'Base Stats',callback_data:'bst_'+poke+'_'+ctx.from.id+'_'+form+''}]]
if(forms[poke].length>1){
key.push([{text:'<',callback_data:'ryf_'+poke+'_'+ctx.from.id+'_'+(form-1)+''},{text:''+form+'/'+forms[poke].length+'',callback_data:'ntg'},
{text:'>',callback_data:'ryf_'+poke+'_'+ctx.from.id+'_'+(form+1)+''}])
}
await editMessage('media',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{type:'photo',media:pokes[py.identifier].front_default_image,caption:msg,parse_mode:'html'},{reply_markup:{inline_keyboard:key}})
})
}

module.exports = register_078_ryf;

