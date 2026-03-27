function register_070_brth(bot, deps) {
  const { getUserData, saveUserData2, editMessage, pokes, stat, c, plevel } = deps;
  bot.action(/brth-/,async ctx => {
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
    {text:'1',callback_data:'brth-'+stat+'-'+pass+'-'+ctx.from.id+'-1'},
    {text:'5',callback_data:'brth-'+stat+'-'+pass+'-'+ctx.from.id+'-5'}
  ],
  [
    {text:'10',callback_data:'brth-'+stat+'-'+pass+'-'+ctx.from.id+'-10'},
    {text:'20',callback_data:'brth-'+stat+'-'+pass+'-'+ctx.from.id+'-20'}
  ],
  [
    {text:'Back',callback_data:'berry_'+pass+'_'+ctx.from.id}
  ]
]
if(!amount){
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Choose how many Berries to use for <b>'+c(stat.replace('_',' '))+'</b>:',{parse_mode:'HTML',reply_markup:{inline_keyboard:amountMenu}})
  return
}
if(!data.inv.berry){
data.inv.berry = 0
}
if(data.inv.berry < amount){
ctx.answerCbQuery('You are out of *🍒 Berries*')
return
}
data.inv.berry -= amount
if(p2.evs[stat] < 1){
ctx.answerCbQuery('This Stat Is Already 0')
return
}
p2.evs[stat] = Math.max(0,(p2.evs[stat]-(10 * amount)))
await saveUserData2(ctx.from.id,data)
let msg6 = '*Pokemon:* '+c(p2.name)+' (*Lv.* '+plevel(p2.name,p2.exp)+')\n\n'
msg6 += '*HP :* '+p2.evs.hp+'\n'
msg6 += '*Attack :* '+p2.evs.attack+'\n'
msg6 += '*Defense :* '+p2.evs.defense+'\n'
msg6 += '*Special Attack :* '+p2.evs.special_attack+'\n'
msg6 += '*Special Defense :* '+p2.evs.special_defense+'\n'
msg6 += '*Speed :* '+p2.evs.speed+'\n'
msg6 += '\nChoose how many Berries to use for *' + c(stat.replace('_',' ')) + '*:'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg6,{parse_mode:'markdown',reply_markup:{inline_keyboard:amountMenu}})
})
}

module.exports = register_070_brth;


