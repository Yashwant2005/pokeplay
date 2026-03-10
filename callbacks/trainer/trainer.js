function register_049_trainer(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/trainer_/,async ctx => {
const edit = ctx.callbackQuery.data.split('_')[1]
const userData = await getUserData(ctx.from.id)
if(edit=='colour'){
if(userData.inv.template*1 == 10){
var key = [[{text:'Trainer Data',callback_data:'trainer_data'},{text:'Back',callback_data:'trainer_back'}]]
}else{
var key = [[{text:'Joined / ID',callback_data:'trainer_id'},{text:'Trainer Data',callback_data:'trainer_data'}],[{text:'Back',callback_data:'trainer_back'}]]
}
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Which Text Colour You Wanna Channge?',{
reply_markup:{inline_keyboard:key}})
}
if(edit=='back'){
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'What You Want To Edi?',{reply_markup:{inline_keyboard:[[{text:'Templates',callback_data:'trainer_template'},{text:'Avtar',callback_data:'trainer_avtar'},{text:'Colour',callback_data:'trainer_colour'}]]}})
}
if(edit=='id' || edit=='data'){
const row = []
for(let i = 0; i < colors.length; i++){
row.push({text:c(colors[i]),callback_data:'stcrd_'+edit+'_'+colors[i]})
}
let buttons = []
for (let i = 0; i < row.length; i += 4) {
   buttons.push(row.slice(i, i + 4));
  }
const co = userData.inv[edit] || 'white'
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Choose New Colour For *'+c(edit)+'* Text\n\n*Current Colour:* '+co+'',{parse_mode:'markdown',
reply_markup:{inline_keyboard:buttons}})
}
if(edit=='template'){
const row = []
for(let i = 1; i <= 9; i++){
row.push({text:i,callback_data:'stcrd_tem_'+i})
}
let buttons = []
for (let i = 0; i < row.length; i += 3) {
    buttons.push(row.slice(i, i + 3));
  }
buttons.push([{text:'>',callback_data:'trainer_temp'}])
const tem = userData.inv.template || 1
await editMessage('media',ctx,ctx.chat.id, ctx.callbackQuery.message.message_id, {
        type: 'photo',
        media: "https://te.legra.ph/file/05b0d41d3b37e98e1f82f.jpg",
        caption:'Choose Your New Card New Template\n\n*Current Template:* '+tem+'',
parse_mode:'markdown'},{
reply_markup:{inline_keyboard:buttons}})
}
if(edit=='temp'){
if(userData.extra && userData.extra.unlocks && userData.extra.unlocks.includes('10')){
let buttons = [[{text:'10',callback_data:'stcrd_tem_10'}]]
buttons.push([{text:'<',callback_data:'trainer_template'}])
const tem = userData.inv.template || 1
await editMessage('media',ctx,ctx.chat.id, ctx.callbackQuery.message.message_id, {
        type: 'photo',
        media: "https://graph.org/file/5f0681dee62ffd3867a13.jpg",
        caption:'Choose Your New Card New Template\n\n*Current Template:* '+tem+'',
parse_mode:'markdown'},{
reply_markup:{inline_keyboard:buttons}})
}else{
ctx.answerCbQuery('Use "/buy card10" to buy template 10',{show_alert:true})
}
}


if(edit=='avtar'){
const row = []
for(let i = 1; i <= 12; i++){
const hasAvatarFile = fs.existsSync("./cimages/"+i+".png") || fs.existsSync("./cimages2/"+i+".png")
if(hasAvatarFile){
row.push({text:i,callback_data:'stcrd_avtar_'+i})
}
}
if(row.length === 0){
row.push({text:'1',callback_data:'stcrd_avtar_1'})
}
let buttons = []
for (let i = 0; i < row.length; i += 4) {
    buttons.push(row.slice(i, i + 4));
  }
if(userData.inv.template*1 == 10){
var m = "https://graph.org/file/d9553f8751c3f42174b71.jpg"
}else{
var m = "https://te.legra.ph/file/f2aa8d685d6a7fdc0d02f.jpg"
}
const avtar = userData.inv.avtar || 1
await editMessage('media',ctx,ctx.chat.id, ctx.callbackQuery.message.message_id, {
        type: 'photo',
        media: m,
caption:'Choose Your New Avtar\n\n*Current Avtar:* '+avtar+'',parse_mode:'markdown'},{
reply_markup:{inline_keyboard:buttons}})
}
})
}

module.exports = register_049_trainer;

