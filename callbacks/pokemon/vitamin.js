function register_067_vitamin(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/vitamin_/,check2q,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
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

module.exports = register_067_vitamin;

