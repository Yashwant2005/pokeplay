function register_063_trfe(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/trfe_/,async ctx => {
const id1 = ctx.callbackQuery.data.split('_')[1]
const pass1 = ctx.callbackQuery.data.split('_')[2]
const id2 = ctx.callbackQuery.data.split('_')[3]
const pass2 = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id1 && ctx.from.id!=id2){
ctx.answerCbQuery()
return
}
if(ctx.from.id==id1){
ctx.answerCbQuery('Wait, other player is choosing poke to trade')
return
}
if(ctx.from.id==id2){
const data1 = await getUserData(id1)
const data2 = await getUserData(id2)
const poke = data1.pokes.filter((p)=>p.pass==pass1)[0]
const poke2 = data2.pokes.filter((p)=>p.pass==pass2)[0]
if(!poke2){
ctx.answerCbQuery('You does not have this poke anymore')
return
}
if(!poke){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<a href="tg://user?id='+id1+'"><b>'+data1.inv.name+'</b></a> does not have that poke anymore',{parse_mode:'html'})
return
}
let msg = '<a href="tg://user?id='+id1+'"><b>'+data1.inv.name+'</b></a> wants to trade:\n'
msg += '<b>'+c(poke.name)+'</b> - '+c(poke.nature)+' | <b>Lv.</b> '+plevel(poke.name,poke.exp)+'\n'
const ivs = poke.ivs
const evs = poke.evs
let ivsText = ''
    ivsText += '\nStats          IV |  EV\n';
    ivsText += '————————————————————————\n';
    ivsText += `HP              ${ivs.hp.toString().padStart(2)} |  ${evs.hp}\n`;
    ivsText += `Attack          ${ivs.attack.toString().padStart(2)} |  ${evs.attack}\n`;
    ivsText += `Defense         ${ivs.defense.toString().padStart(2)} |  ${evs.defense}\n`;
    ivsText += `Sp. Attack      ${ivs.special_attack.toString().padStart(2)} |  ${evs.special_attack}\n`;
    ivsText += `Sp. Defense     ${ivs.special_defense.toString().padStart(2)} |  ${evs.special_defense}\n`;
    ivsText += `Speed           ${ivs.speed.toString().padStart(2)} |  ${evs.speed}\n`;
    ivsText += '————————————————————————\n';
    ivsText += `Total           ${calculateTotal(ivs)} |  ${calculateTotal(evs)}\n\n`;
msg += '<code>'+ivsText+'</code>'

msg += '<a href="tg://user?id='+id2+'"><b>'+data2.inv.name+'</b></a> wants to trade:\n'
msg += '<b>'+c(poke2.name)+'</b> - '+c(poke2.nature)+' | <b>Lv.</b> '+plevel(poke2.name,poke2.exp)+'\n'
const ivs2 = poke2.ivs
const evs2 = poke2.evs
let ivsText2 = ''
    ivsText2 += '\nStats          IV |  EV\n';
    ivsText2 += '————————————————————————\n';
    ivsText2 += `HP              ${ivs2.hp.toString().padStart(2)} |  ${evs2.hp}\n`;
    ivsText2 += `Attack          ${ivs2.attack.toString().padStart(2)} |  ${evs2.attack}\n`;
    ivsText2 += `Defense         ${ivs2.defense.toString().padStart(2)} |  ${evs2.defense}\n`;
    ivsText2 += `Sp. Attack      ${ivs2.special_attack.toString().padStart(2)} |  ${evs2.special_attack}\n`;
    ivsText2 += `Sp. Defense     ${ivs2.special_defense.toString().padStart(2)} |  ${evs2.special_defense}\n`;
    ivsText2 += `Speed           ${ivs2.speed.toString().padStart(2)} |  ${evs2.speed}\n`;
    ivsText2 += '————————————————————————\n';
    ivsText2 += `Total           ${calculateTotal(ivs2)} |  ${calculateTotal(evs2)}\n\n`;
msg += '<code>'+ivsText2+'</code>'
msg += '<b>Both players have to accept the trade</b>'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Agree',callback_data:'agtr_'+id1+'n_'+pass1+'_'+id2+'n_'+pass2+''},{text:'Decline',callback_data:'tradc_'+id1+'_'+id2+''}]]}})
}
})
}

module.exports = register_063_trfe;

