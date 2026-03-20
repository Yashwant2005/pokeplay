function register_086_relst(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/relst_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const pk = data.pokes.filter(pk=>pk.pass==pass)[0]
if(!pk){
ctx.answerCbQuery('You dont have this poke', {show_alert:true})
return
}
const heldItem = String(pk.held_item || 'none').trim().toLowerCase().replace(/[_\s]+/g, '-').replace(/-+/g, '-')
let releaseMsg = 'Successfully Released *'+c(pk.name)+'*'
if(heldItem && heldItem != 'none'){
if(!data.extra || typeof data.extra !== 'object') data.extra = {}
if(!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
if(!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {}
if(Number(data.extra.itembox.heldItems[heldItem]) > 0){
data.extra.itembox.heldItems[heldItem] = Math.max(0, Number(data.extra.itembox.heldItems[heldItem]) - 1)
}
releaseMsg += '\nHeld item *'+c(heldItem.replace(/-/g,' '))+'* was lost as well.'
}
data.pokes = data.pokes.filter(pk=>pk.pass!=pass)
await saveUserData2(ctx.from.id,data)
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,releaseMsg,{parse_mode:'markdown'})
})
}

module.exports = register_086_relst;

