function register_064_agtr(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/agtr_/,async ctx => {
const id1 = ctx.callbackQuery.data.split('_')[1]
const pass1 = ctx.callbackQuery.data.split('_')[2]
const id2 = ctx.callbackQuery.data.split('_')[3]
const pass2 = ctx.callbackQuery.data.split('_')[4]
const callback = ctx.callbackQuery.data
if(ctx.from.id+'n'!=id1 && ctx.from.id+'y'!=id1 && ctx.from.id+'y'!=id2 && ctx.from.id+'n'!=id2){
ctx.answerCbQuery()
return
}
if(callback.includes(ctx.from.id+'n')){
await editMessage('markup',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{inline_keyboard:[[{text:'Agree',callback_data:callback.replace(ctx.from.id+'n',ctx.from.id+'y')},{text:'Decline',callback_data:'tradc_'+id1.replace(/[ny]/g,'')+'_'+id2.replace(/[ny]/g,'')+''}]]})
ctx.answerCbQuery('You Have Accepted The Trade')
}
await sleep(700)
const cl = callback.replace(ctx.from.id+'n',ctx.from.id+'y')
const id3 = cl.split('_')[1]
const id4 = cl.split('_')[3]
if(!id3.includes('n') && !id4.includes('n')){
const data1 = await getUserData(id1.replace(/[ny]/g,''))
const data2 = await getUserData(id2.replace(/[ny]/g,''))
const poke = data1.pokes.filter((p)=>p.pass==pass1)[0]
const poke2 = data2.pokes.filter((p)=>p.pass==pass2)[0]
if(!poke){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<a href="tg://user?id='+id1.replace(/[ny]/g,'')+'"><b>'+data1.inv.name+'</b></a> does not have the choosen poke any more.',{parse_mode:'html'})
return
}
if(!poke2){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<a href="tg://user?id='+id2.replace(/[ny]/g,'')+'"><b>'+data2.inv.name+'</b></a> does not have the choosen poke any more.',{parse_mode:'html'})
return
}
const mdata = await loadMessageData()
if(mdata.battle.includes(parseInt(id1)) || mdata.battle.includes(parseInt(id2))){
if(mdata.battle.includes(ctx.from.id)){
ctx.answerCbQuery('You Are In A Battle')
}else{
ctx.answerCbQuery('Another User Is In A Battle')
}
return
}


const ind1 = data1.pokes.findIndex((pk)=>pk.pass==pass1)
const ind2 = data2.pokes.findIndex((pk)=>pk.pass==pass2)
if(ind1!==-1){
data1.pokes[ind1] = poke2
}
if(ind2 !== -1){
data2.pokes[ind2] = poke
}
// Auto-add received pokemon to main team if there is space
const ensureTeamAutoAdd = (data, removedPass, addedPass) => {
  if(!data.inv) return
  if(!data.teams) data.teams = {}
  const teamId = data.inv.team ? data.inv.team : "1"
  if(!data.teams[teamId]) data.teams[teamId] = []
  if(removedPass){
    data.teams[teamId] = data.teams[teamId].filter(p => p !== removedPass)
  }
  const valid = new Set((data.pokes || []).map(p => p.pass))
  data.teams[teamId] = data.teams[teamId].filter(p => valid.has(p))
  if(addedPass && data.teams[teamId].length < 6 && !data.teams[teamId].includes(addedPass)){
    data.teams[teamId].push(addedPass)
  }
}
ensureTeamAutoAdd(data1, pass1, pass2)
ensureTeamAutoAdd(data2, pass2, pass1)
await saveUserData2(id2.replace(/[ny]/g,''),data2)
await saveUserData2(id1.replace(/[ny]/g,''),data1)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>Trade Has Been Completed</b>\n\n• <a href="tg://user?id='+id1.replace(/[ny]/g,'')+'"><b>'+data1.inv.name+'</b></a> Receives <b>'+c(poke2.name)+'</b>\n\n• <a href="tg://user?id='+id2.replace(/[ny]/g,'')+'"><b>'+data2.inv.name+'</b></a> Receives <b>'+c(poke.name)+'</b>',{parse_mode:'html'})
await sendMessage(ctx,-1003069884900,'#trade\n\n<b>'+he.encode(data1.inv.name)+'</b> (<code>'+id1+'</code>) has traded <b>'+c(poke.name)+'</b> with <b>'+data2.inv.name+'</b> (<code>'+id2+'</code>) <b>'+c(poke2.name)+' </b>',{parse_mode:'HTML'})
}
if(callback.includes(ctx.from.id+'y')){
ctx.answerCbQuery('You Have Already Accepted The Trade.')
return
}
})
}

module.exports = register_064_agtr;

