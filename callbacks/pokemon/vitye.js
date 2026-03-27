function register_068_vitye(bot, deps) {
  const { check2q, getUserData, saveUserData2, editMessage, pokes, stat, c, calculateTotal, plevel } = deps;
  bot.action(/vitye-/,check2q,async ctx => {
const stat = ctx.callbackQuery.data.split('-')[1]
const pass = ctx.callbackQuery.data.split('-')[2]
const id = ctx.callbackQuery.data.split('-')[3]
const amount = parseInt(ctx.callbackQuery.data.split('-')[4]) || 0
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((p)=>p.pass===pass)[0]
if(id!=ctx.from.id){
ctx.answerCbQuery()
return
}
if(!poke){
ctx.answerCbQuery('Poke not found')
return
}
const p2 = poke
const amountMenu = [
  [
    {text:'1',callback_data:'vitye-'+stat+'-'+pass+'-'+ctx.from.id+'-1'},
    {text:'5',callback_data:'vitye-'+stat+'-'+pass+'-'+ctx.from.id+'-5'}
  ],
  [
    {text:'10',callback_data:'vitye-'+stat+'-'+pass+'-'+ctx.from.id+'-10'},
    {text:'20',callback_data:'vitye-'+stat+'-'+pass+'-'+ctx.from.id+'-20'}
  ],
  [
    {text:'Back',callback_data:'vitamin_'+pass+'_'+ctx.from.id}
  ]
]
if(!amount){
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Choose how many Vitamins to use for <b>'+c(stat.replace('_',' '))+'</b>:',{parse_mode:'HTML',reply_markup:{inline_keyboard:amountMenu}})
  return
}
if(!data.inv.vitamin){
data.inv.vitamin = 0
}
if(data.inv.vitamin < amount){
ctx.answerCbQuery('You are out of *💉 Vitamins*')
return
}
data.inv.vitamin -= amount
if(p2.evs[stat] > 251){
ctx.answerCbQuery('This Stat Has Already Reached Max Limit')
return
}
const c7 = await calculateTotal(p2.evs)
if(c7 > 509){
ctx.answerCbQuery('This Poke Total Evs Maximum Limit Reached')
return
}
const desired = 10 * amount
const a = Math.min(desired,(252-p2.evs[stat]))
const a2 = Math.min(a,(510-calculateTotal(p2.evs)))
p2.evs[stat] += a2
await saveUserData2(ctx.from.id,data)
let msg6 = '*Pokemon:* '+c(p2.name)+' (*Lv.* '+plevel(p2.name,p2.exp)+')\n\n'
msg6 += '*HP :* '+p2.evs.hp+'\n'
msg6 += '*Attack :* '+p2.evs.attack+'\n'
msg6 += '*Defense :* '+p2.evs.defense+'\n'
msg6 += '*Special Attack :* '+p2.evs.special_attack+'\n'
msg6 += '*Special Defense :* '+p2.evs.special_defense+'\n'
msg6 += '*Speed :* '+p2.evs.speed+'\n'
msg6 += '\nChoose how many Vitamins to use for *' + c(stat.replace('_',' ')) + '*:'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg6,{parse_mode:'markdown',reply_markup:{inline_keyboard:amountMenu}})
})
}

module.exports = register_068_vitye;



