function register_037_poag(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { getHeldItemDescription } = require('../../utils/held_item_shop');
  bot.action(/poag_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const item = ctx.callbackQuery.data.split('_')[1]
const items = ['inventory','balls','tms','enhance','items']
const data = await getUserData(ctx.from.id)
const store = items.filter((storeitem)=>storeitem!=item)
const ind = items.indexOf(item)
const t1 = items[ind-1] || 'hh'
const t2 = items[ind+1] || 'hh'
const rows = [{text:'<',callback_data:'poag_'+t1+'_'+ctx.from.id+''},{text:c(item),callback_data:'nouse'},
{text:'>',callback_data:'poag_'+t2+'_'+ctx.from.id+''}]
if(item=='potions'){
let msg = '*Coming Soon*'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:[rows]}})
return
}
if(item=='tms'){
  let msg = '*TMs ⚙*\n\n'
  if(!data.tms){
    data.tms = {}
  }
  // Pagination logic
  const tmList = Object.keys(data.tms).filter(tm => data.tms[tm] > 0);
  const page = ctx.callbackQuery.data.split('_')[3]*1 || 1;
  const pageSize = 30;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  if(page < 1 || startIdx > tmList.length) return;
  const pageTMs = tmList.slice(startIdx, endIdx);
  for(const tm of pageTMs){
    let h = '';
    if(data.tms[tm] > 1){
      h = '('+data.tms[tm]+')';
    }
    const t = tms.tmnumber[String(tm)];
    if(!t || !dmoves[t]){
      continue;
    }
    msg += '• */TM'+tm+' -* '+c(dmoves[t].name)+' '+h+'\n';
  }
  // Navigation buttons
  const nav = [];
  if(page > 1) nav.push({text:'<',callback_data:'poag_tms_'+ctx.from.id+'_'+(page-1)});
  nav.push({text:'Page '+page,callback_data:'nouse'});
  if(endIdx < tmList.length) nav.push({text:'>',callback_data:'poag_tms_'+ctx.from.id+'_'+(page+1)});
  const allRows = [nav];
  allRows.push(rows);
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:allRows}});
  return;
}
if(item=='special'){
const its = []
if(data.inv.omniring || data.inv.ring || data.inv.gmax_band){
its.push('omniring')
}
const bt = [{text:'Back',callback_data:'poag_items_'+ctx.from.id+''}]
if(its.length < 1){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You does not have any *Special Item*',{parse_mode:'markdown',reply_markup:{inline_keyboard:[bt]}})
return
}
const ore = []
let message = 'You Have Following *Special Items* :-'
const page = ctx.callbackQuery.data.split('_')[3]*1 || 1
const pageSize = 15
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
if(ctx.callbackQuery.data.split('_')[3]*1 < 1 || startIdx > its.length){
return
}
const stn = its.slice(startIdx,endIdx)
let b = startIdx
for(const p of stn){
ore.push({text:c(p),callback_data:'sysu:'+p+':'+ctx.from.id+''})
b++;
}
  const rows = [];
  for (let i = 0; i < ore.length; i += 3) {
    rows.push(ore.slice(i, i + 3));
}
rows.push(bt)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,message,{reply_markup:{inline_keyboard:rows},parse_mode:'markdown'})
return
}
if(item=='transformational'){
  const sts = [...new Set(data.inv.stones)].filter((stoneKey) => {
    const stoneInfo = stones && stones[stoneKey];
    const megaTarget = String(stoneInfo && stoneInfo.mega || '').toLowerCase();
    return megaTarget.includes('-mega');
  })
  const bt = [{text:'Back',callback_data:'poag_items_'+ctx.from.id+''}]
  if(sts.length < 1){
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You does not have any *Transformational Item*',{parse_mode:'markdown',reply_markup:{inline_keyboard:[bt]}})
    return
  }
  const ore = []
  let message = 'You Have Following *Mega Stones* (Transformational Items):\n\n'
  const page = ctx.callbackQuery.data.split('_')[3]*1 || 1
  const pageSize = 15
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  if(ctx.callbackQuery.data.split('_')[3]*1 < 1 || startIdx > sts.length){
    return
  }
  const stn = sts.slice(startIdx,endIdx)
  for(const p of stn){
    let info = '';
    if(stones && stones[p]){
      info = ' (for '+c(stones[p].pokemon)+' → '+c(stones[p].mega)+')';
    }
    message += '• *'+c(p)+'*'+info+'\n';
    ore.push({text:c(p),callback_data:'vyast:'+p+':'+ctx.from.id+''})
  }
  const rows = [];
  for (let i = 0; i < ore.length; i += 3) {
    rows.push(ore.slice(i, i + 3));
  }
  if(sts.length > 15){
    rows.push([{text:'<',callback_data:'poag_transformational_'+ctx.from.id+'_'+(page-1)+''},{text:'>',callback_data:'poag_transformational_'+ctx.from.id+'_'+(page+1)+''}])
  }
  rows.push(bt)
  await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,message,{reply_markup:{inline_keyboard:rows},parse_mode:'markdown'})
  return
}
if(item=='evolution'){
const sts = [...new Set(data.inv.evostones)]
const bt = [{text:'Back',callback_data:'poag_items_'+ctx.from.id+''}]
if(sts.length < 1){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You does not have any *Evolution Item*',{parse_mode:'markdown',reply_markup:{inline_keyboard:[bt]}})
return
}
const ore = []
let message = 'You Have Following *Evolution Items* :-'
const page = ctx.callbackQuery.data.split('_')[3]*1 || 1
const pageSize = 15
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
if(ctx.callbackQuery.data.split('_')[3]*1 < 1 || startIdx > sts.length){
return
}
const stn = sts.slice(startIdx,endIdx)
let b = startIdx
for(const p of stn){
ore.push({text:c(p),callback_data:'evsty:'+b+':'+ctx.from.id+''})
b++;
}
  const rows = [];
  for (let i = 0; i < ore.length; i += 3) {
    rows.push(ore.slice(i, i + 3));
}
if(sts.length > 15){
rows.push([{text:'<',callback_data:'poag_evolution_'+ctx.from.id+'_'+(page-1)+''},{text:'>',callback_data:'poag_evolution_'+ctx.from.id+'_'+(page+1)+''}])
}
rows.push(bt)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,message,{reply_markup:{inline_keyboard:rows},parse_mode:'markdown'})
return
}
if(item=='items'){
const key = [[{text:'Key Items',callback_data:'poag_transformational_'+ctx.from.id+''},{text:'Evo Items',callback_data:'poag_evolution_'+ctx.from.id+''}],[{text:'Special Items',callback_data:'poag_special_'+ctx.from.id+''},{text:'Enhance Items',callback_data:'poag_enhance_'+ctx.from.id+''}],[{text:'Held Items',callback_data:'poag_held_'+ctx.from.id+''}]]
key.push(rows)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Which category of *Items* you wanna check?',{parse_mode:'markdown',reply_markup:{inline_keyboard:key}})
return
}
if(item=='held'){
if(!data.extra || typeof data.extra !== 'object') data.extra = {}
if(!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
if(!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {}
const heldItems = data.extra.itembox.heldItems
const heldKeys = Object.keys(heldItems).filter((key) => Number(heldItems[key]) > 0)
const bt = [{text:'Back',callback_data:'poag_items_'+ctx.from.id+''}]
if(heldKeys.length < 1){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You do not have any *Held Items* in your bag yet.',{parse_mode:'markdown',reply_markup:{inline_keyboard:[bt]}})
return
}
let msg = '*Held Items*\n\n'
for(const key of heldKeys.sort()){
msg += '• *'+c(key.replace(/-/g,' '))+'* x'+heldItems[key]+'\n'
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:[bt]}})
return
}
if(item=='enhance'){
if(!data.extra || typeof data.extra !== 'object') data.extra = {}
if(!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
if(!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {}
if(!Number.isFinite(data.extra.itembox.bottleCaps)) data.extra.itembox.bottleCaps = 0
if(!Number.isFinite(data.extra.itembox.goldBottleCaps)) data.extra.itembox.goldBottleCaps = 0

const mintKeys = Object.keys(data.extra.itembox.mints).filter((k) => Number(data.extra.itembox.mints[k]) > 0)
const totalMints = mintKeys.reduce((sum, key) => sum + Number(data.extra.itembox.mints[key] || 0), 0)
if(!Number.isFinite(data.extra.itembox.abilityCapsules)) data.extra.itembox.abilityCapsules = 0
if(!Number.isFinite(data.extra.itembox.abilityPatches)) data.extra.itembox.abilityPatches = 0

let msg = '*Enhancement Items*\n\n'
msg += '• *Nature Mints:* '+totalMints+'\n'
msg += '• *Bottle Caps:* '+data.extra.itembox.bottleCaps+'\n'
msg += '• *Gold Bottle Caps:* '+data.extra.itembox.goldBottleCaps+'\n'

if(!Number.isFinite(data.extra.itembox.dynamaxCandy)) data.extra.itembox.dynamaxCandy = 0
msg += 'â€¢ *Dynamax Candy:* '+data.extra.itembox.dynamaxCandy+'\n'
if(!Number.isFinite(data.extra.itembox.maxSoup)) data.extra.itembox.maxSoup = 0
msg += '• *Max Soup:* '+data.extra.itembox.maxSoup+'\n'
if(mintKeys.length > 0){
msg += '\n*Mint Breakdown:*\n'
for(const key of mintKeys){
msg += '- '+c(key)+' x'+data.extra.itembox.mints[key]+'\n'
}
}

await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:[rows]}})
return
}
if(item=='balls'){
const sts = Object.keys(data.balls).filter(ball => data.balls[ball] > 0)
const bt = {text:'Back',callback_data:'poag_inventory_'+ctx.from.id+''}
const ore = []
let message = 'You Have Following *PokeBalls* :-'
const page = ctx.callbackQuery.data.split('_')[3]*1 || 1
const pageSize = 20
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
if(ctx.callbackQuery.data.split('_')[3]*1 < 1 || startIdx > sts.length){
return
}
const stn = sts.slice(startIdx,endIdx)
let b = 0
for(const p of stn){
ore.push({text:c(p)+' : '+data.balls[p]+'',callback_data:'vyabll:'+p+':'+ctx.from.id+''})
b++;
}
  const rows5 = [];
  for (let i = 0; i < ore.length; i += 3) {
    rows5.push(ore.slice(i, i + 3));
}
rows5.push(rows)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,message,{parse_mode:'markdown',reply_markup:{inline_keyboard:rows5}})
return
}
if(item=='inventory'){
if(!data.inv.pc){
data.inv.pc = 0
}
if(!Number.isFinite(data.inv.league_points)){
data.inv.league_points = 0
}
if(!Number.isFinite(data.inv.holowear_tickets)){
data.inv.holowear_tickets = 0
}
if(!Number.isFinite(data.inv.battle_boxes)){
data.inv.battle_boxes = 0
}
let msg = '*💷 PokeCoins:* '+data.inv.pc+'\n'
msg += '\n• *⭐ LP:* '+data.inv.league_points+''
msg += '\n• *🎟️ HT:* '+data.inv.holowear_tickets+''
msg += '\n• *🎁 Battle Box:* '+data.inv.battle_boxes+''
if(data.inv.candy && data.inv.candy > 0){
msg += '\n• *🍬 Candies:* '+data.inv.candy+''
}
if(data.inv.daycare_candy && data.inv.daycare_candy > 0){
msg += '\n• *Daycare Candy:* '+data.inv.daycare_candy+''
}
if(data.inv.vitamin && data.inv.vitamin > 0){
msg += '\n• *💉 Vitamins:* '+data.inv.vitamin+''
}
if(data.inv.berry && data.inv.berry > 0){
msg += '\n• *🍒 Berries:* '+data.inv.berry+''
}
if(data.inv.pass && data.inv.pass > 0){
msg += '\n• *🀄 Safari Pass:* '+data.inv.pass+''
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:[rows]}})
return
}
})
}

module.exports = register_037_poag;
