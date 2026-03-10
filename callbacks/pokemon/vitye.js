function register_068_vitye(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/vitye-/,check2q,async ctx => {
const stat = ctx.callbackQuery.data.split('-')[1]
const pass = ctx.callbackQuery.data.split('-')[2]
const id = ctx.callbackQuery.data.split('-')[3]
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
if(!data.inv.vitamin){
data.inv.vitamin = 0
}
if(data.inv.vitamin < 1){
ctx.answerCbQuery('You are out of *💉 Vitamins*')
return
}
data.inv.vitamin -= 1
if(p2.evs[stat] > 251){
ctx.answerCbQuery('This Stat Has Already Reached Max Limit')
return
}
const c7 = await calculateTotal(p2.evs)
if(c7 > 509){
ctx.answerCbQuery('This Poke Total Evs Maximum Limit Reached')
return
}
const a = Math.min(10,(252-p2.evs[stat]))
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
msg6 += '\nWhich EV Stat You Wanna Increase With *10*?'
const key = [
[{text:'HP',callback_data:'vitye-hp-'+p2.pass+'-'+ctx.from.id+''},
{text:'Attack',callback_data:'vitye-attack-'+p2.pass+'-'+ctx.from.id+''},
{text:'Defense',callback_data:'vitye-defense-'+p2.pass+'-'+ctx.from.id+''}],
[{text:'SpA',callback_data:'vitye-special_attack-'+p2.pass+'-'+ctx.from.id+''},
{text:'SpD',callback_data:'vitye-special_defense-'+p2.pass+'-'+ctx.from.id+''},
{text:'Speed',callback_data:'vitye-speed-'+p2.pass+'-'+ctx.from.id+''}]
]
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg6,{parse_mode:'markdown',reply_markup:{inline_keyboard:key}})
})
}

module.exports = register_068_vitye;

