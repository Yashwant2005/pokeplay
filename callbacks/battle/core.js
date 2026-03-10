function registerBattleCallbacks(bot, deps) {
  const {
    getUserData,
    editMessage,
    fs,
    c,
    pokes,
    pokestats,
    plevel,
    Stats,
    battlec,
    spawn,
    shiny,
    events,
    dmoves,
    emojis,
    loadMessageData,
    saveMessageData,
    saveUserData2,
    incexp,
    incexp2,
    stones,
    Bar,
    eff,
    calc,
    getStatusTag,
    ensureBattleStatus,
    getBattleStatus,
    canPokemonAct,
    getMoveStatusEffect,
    isStatusImmune,
    setBattleStatus,
    getStatusLabel,
    applyDefenderResidualDamage,
    getSpeedWithStatus,
    sendMessage,
    tutors,
    word,
    bot: botInstance,
    he
  } = deps;

  const botRef = botInstance || bot;

  const safeName = (raw) => {
    const txt = String(raw || "Trainer");
    if (he && typeof he.decode === "function" && typeof he.encode === "function") {
      return he.encode(he.decode(txt));
    }
    return txt;
  };

  const displayName = (data, fallbackId) => {
    if (!data || !data.inv) return safeName(fallbackId);
    return safeName(data.inv.name || data.inv.username || data.inv.id || fallbackId);
  };

bot.action(/sytbr_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
const rid = ctx.callbackQuery.data.split('_')[2]
const bword = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id==id){
const bt = ['max-poke','min-/-max-6l','min-/-max-level','switch','form-change','sandbox-mode','random-mode','preview-mode','types-lock','regions-lock','type-efficiency','dual-type','save-settings']
const buttons = bt.map((word) => ({ text: '• '+c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_back_'+id+'_'+rid+'_'+bword+''})
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
const d1 = await getUserData(id)
const d2 = await getUserData(rid)
await editMessage('markup',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{inline_keyboard:rows})
}
})
bot.action(/stbtlsyt_/,async ctx => {
const word = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const rid = ctx.callbackQuery.data.split('_')[3]
const bword = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id){
return
}
let settings3 = {};
    try {
      settings3 = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      settings3 = {};
    }
const settings = settings3.set
const d1 = await getUserData(id)
const d2 = await getUserData(rid)
const challanger = displayName(d1, id)
const challanged = displayName(d2, rid)
let msg = '⚔ <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> Has Challenged <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a>\n'
let f = false
let msg2 = ''
if(word=='maxs'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_poke = parseInt(m*1)
if(settings.max_poke < settings.min_6l){
settings.min_6l = settings.max_poke
}
}
if(word=='min6l'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.min_6l = parseInt(m*1)
if(settings.min_6l > settings.max_6l){
settings.max_6l = 6
}
if(settings.max_poke < settings.min_6l){
settings.max_poke = settings.min_6l
}
}
if(word=='max6l'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_6l = parseInt(m*1)
if(settings.min_6l > settings.max_6l){
settings.min_6l = 0
}
}
if(word=='minlv'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.min_level = parseInt(m*1)
if(settings.max_level < settings.min_level){
settings.max_level = 100
}
}
if(word=='maxlv'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_level = parseInt(m*1)
if(settings.min_level > settings.max_level){
settings.min_level = 1
}
}
if(word=='switch'){
settings.switch = (settings.switch==true) ? false : true
}
if(word=='type-efficiency'){
settings.type_effects = (settings.type_effects==true) ? false : true
}
if(word=='form-change'){
settings.key_item = (settings.key_item==true) ? false : true
}
if(word=='sandbox-mode'){
settings.sandbox = (settings.sandbox==true) ? false : true
}
if(word=='preview-mode'){
if(settings.preview=='Upper'){
settings.preview = 'Down'
}else if(settings.preview=='Down'){
settings.preview = 'no'
}else if(settings.preview=='no'){
settings.preview = 'Upper'
}else{
settings.preview = 'Upper'
}
}
if(word=='random-mode'){
settings.random = (settings.random==true) ? false : true
}
if(word=='pin-mode'){
settings.pin = (settings.pin==true) ?false : true
}
if(word=='dual-type'){
settings.dual_type = (settings.dual_type==true) ?false : true
}
if(word=='allowty'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.allow_types.includes(ty)){
settings.allow_types = settings.allow_types.filter((ty2)=>ty2!=ty)
}else{
settings.allow_types.push(ty)
if(settings.allow_types.length > 4){
ctx.answerCbQuery('Max 4 Types can be only allowed.')
return
}
}
settings.ban_types = []
}
if(word=='banty'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.ban_types.includes(ty)){
settings.ban_types = settings.ban_types.filter((ty2)=>ty2!=ty)
}else{
settings.ban_types.push(ty)
if(settings.ban_types.length > 4){
ctx.answerCbQuery('Max 4 Types can be banned.')
return
}
}
settings.allow_types = []
}
if(word=='allowrg'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.allow_regions.includes(ty)){
settings.allow_regions = settings.allow_regions.filter((ty2)=>ty2!=ty)
}else{
settings.allow_regions.push(ty)
if(settings.allow_regions.length > 4){
ctx.answerCbQuery('Max 4 Regions can be only allowed.')
return
}
}
settings.ban_regions = []
}
if(word=='banrg'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.ban_regions.includes(ty)){
settings.ban_regions = settings.ban_regions.filter((ty2)=>ty2!=ty)
}else{
settings.ban_regions.push(ty)
if(settings.ban_regions.length > 4){
ctx.answerCbQuery('Max 4 regions can be banned.')
return
}
}
settings.allow_regions = []
}
for (let key in settings3.users) {
    settings3.users[key] = false;
  }
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(settings3, null, 2));
if(settings.max_poke < 6){
f = true
msg2 += '\n<b>• Max number of pokemon:</b> '+settings.max_poke+''
}
if(settings.min_6l > 0 || settings.max_6l < 6){
f = true
msg2 += '\n<b>• Number of legendaries:</b> '+settings.min_6l+'-'+settings.max_6l+''
}
if(settings.min_level > 1 || settings.max_level < 100){
f = true
msg2 += '\n<b>• Level gap of pokemon:</b> '+settings.min_level+'-'+settings.max_level+''
}
if(!settings.switch){
f = true
msg2 += '\n<b>• Switching pokemon:</b> Disabled'
}
if(!settings.key_item){
f = true
msg2 += '\n<b>• Form Changing:</b> Disabled'
}
if(settings.sandbox){
f = true
msg2 += '\n<b>• Sandbox mode:</b> Enabled'
}
if(settings.random){
f = true
msg2 += '\n<b>• Random mode:</b> Enabled'
}
if(settings.preview && settings.preview!= 'no'){
f = true
msg2 += '\n<b>• Preview mode:</b> '+settings.preview+''
}
if(settings.pin){
f = true
msg2 += '\n<b>• Pin mode:</b> Enabled'
}
if(!settings.type_effects){
f = true
msg2 += '\n<b>• Type efficiency:</b> Disabled'
}
if(!settings.dual_type){
f = true
msg2 += '\n<b>• Dual Types:</b> Disabled'
}
if(settings.allow_regions.length > 0){
f = true
msg2 += '\n<b>• Only regions:</b> ['+c(settings.allow_regions.join(' , '))+']'
}
if(settings.ban_regions.length > 0){
f = true
msg2 += '\n<b>• Banned regions:</b> ['+c(settings.ban_regions.join(' , '))+']'
}
if(settings.ban_types.length > 0){
f = true
msg2 += '\n<b>• Banned types:</b> ['+c(settings.ban_types.join(' , '))+']'
}
if(settings.allow_types.length > 0){
f = true
msg2 += '\n<b>• Types:</b> ['+c(settings.allow_types.join(' , '))+']'
}

if(settings3.users[id]){
var em1 = '✓'
}else{
var em1 = '✗'
}
if(settings3.users[rid]){
var em2 = '✓'
}else{
var em2 = '✗'
}

if(f){
msg += msg2
msg += '\n\n-> <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a> : '+em2+''
}else{
msg += '\n\n-> <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a> : '+em2+''
}
if(word=='ban-regions'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allow-regions'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: settings.allow_types.includes(word) ? c(word)+'✅' : c(word), callback_data: 'stbtlsyt_allowrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}

if(word=='regions-lock'){
const bt = ['ban-regions','allow-regions']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allowrg'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='banrg'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allowty'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',  'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='banty'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-poke'){
const bt = ['1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_maxs_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Number</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-/-max-6l'){
const bt = ['min-6l','max-6l']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect <b>Min / Max Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='ban-types'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allow-types'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',  'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}



if(word=='types-lock'){
const bt = ['ban-types','allow-types']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='regions-lock'){
const bt = ['ban-regions','allow-regions']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Regionss</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-/-max-level'){
const bt = ['min-level','max-level']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect <b>Min / Max Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-level'){
const bt = ['1-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','81-90','91-100']
const buttons = bt.map((word) => ({ text: word, callback_data: 'stbtlsyt_minlevel_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Min Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='maxlevel'){
const yu = ctx.callbackQuery.data.split('_')[5]
const bt = Array.from({ length: (yu.split('-')[1]*1-yu.split('-')[0]*1+1)}, (_, i) => (i + yu.split('-')[0]*1).toString());
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_maxlv_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
}
msg += '\n\nSelect <b>Max Level</b> of each pokemon of teams can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='minlevel'){
const yu = ctx.callbackQuery.data.split('_')[5]
const bt = Array.from({ length: (yu.split('-')[1]*1-yu.split('-')[0]*1+1)}, (_, i) => (i + yu.split('-')[0]*1).toString());
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_minlv_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
}
msg += '\n\nSelect <b>Min Level</b> of each pokemon of teams can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-level'){
const bt = ['1-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','81-90','91-100']
const buttons = bt.map((word) => ({ text: word, callback_data: 'stbtlsyt_maxlevel_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}

if(word=='min-6l'){
const bt = ['0','1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_min6l_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-6l_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Min Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-6l'){
const bt = ['0','1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_max6l_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-6l_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='save-settings'){
const data = await getUserData(ctx.from.id)
data.settings = settings
await saveUserData2(ctx.from.id,data)
ctx.answerCbQuery('Settings Saved!')
return
}
if(word=='back'){
var rows = [[{text:'Agree ✓',callback_data:'battle_'+id+'_'+rid+'_'+bword+''},{text:'Reject ✗',callback_data:'reject_'+id+'_'+rid+'_'+bword+''}],[{text:'Battle Settings ⚔',callback_data:'sytbr_'+id+'_'+rid+'_'+bword+''}]]
}else{
msg += '\n\nUse /settings to get more info about battle settings.'
const bt = ['max-poke','min-/-max-6l','min-/-max-level','switch','form-change','sandbox-mode','random-mode','preview-mode','types-lock','regions-lock','type-efficiency','dual-type','save-settings']
const buttons = bt.map((word) => ({ text: '• '+c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_back_'+id+'_'+rid+'_'+bword+''})
  var rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
})
bot.action(/battle_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const id1 = ctx.callbackQuery.data.split('_')[1]
const id2 = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id2 && ctx.from.id!=id1){
ctx.answerCbQuery();
return
}
const mdata = await loadMessageData();
if(mdata.battle.includes(parseInt(ctx.from.id))){
ctx.answerCbQuery('You Are In A Battle')
return
}
const bword = ctx.callbackQuery.data.split('_')[3]
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
if(mdata.battle.includes(parseInt(Object.keys(battleData.users).filter((id)=>id!=ctx.from.id)[1]))){
ctx.answerCbQuery('Opponent Is In A Battle')
return
}
if(battleData.users[ctx.from.id]){
ctx.answerCbQuery('Wait For Opponent To Accept')
return
}
  const data = await getUserData(id1);
  const data2 = await getUserData(id2);
  let pokes1 = []
  let pokes2 = []
  const useTempTeams = battleData.tempTeams && battleData.tempTeams[id1] && battleData.tempTeams[id2];
  if(useTempTeams){
  pokes1 = battleData.tempTeams[id1]
  pokes2 = battleData.tempTeams[id2]
  }else if(battleData.set.random){
  pokes1 = data.pokes.map(p => p.pass)
  pokes2 = data2.pokes.map(p => p.pass)
  }else{
  pokes1 = data.teams[data.inv.team]
  pokes2 = data2.teams[data2.inv.team]
  }
if(battleData.set.min_level > 1 || battleData.set.max_level < 100){
pokes1 = pokes1.filter(p=> {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && plevel(pk.name,pk.exp) >= battleData.set.min_level*1 && plevel(pk.name,pk.exp) <= battleData.set.max_level*1
})
pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && plevel(pk.name,pk.exp) >= battleData.set.min_level*1 && plevel(pk.name,pk.exp) <= battleData.set.max_level*1
})
}
if(!battleData.set.dual_type){
pokes1 = pokes1.filter(p=> {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.length == 1
})
pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.length == 1
})
}
if(battleData.set.allow_types.length > 0){
pokes1 = pokes1.filter(p=> {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => battleData.set.allow_types.includes(type))
})
pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => battleData.set.allow_types.includes(type))
})
}
if(battleData.set.ban_types.length > 0){
pokes1 = pokes1.filter(p=> {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => !battleData.set.ban_types.includes(type))
})
pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => !battleData.set.ban_types.includes(type))
})
}
const prg = {
  "kanto": {
    "start": 1,
    "end": 151
  },
  "johto": {
    "start": 152,
    "end": 251
  },
  "hoenn": {
    "start": 252,
    "end": 386
  },
  "sinnoh": {
    "start": 387,
    "end": 493
  },
  "unova": {
    "start": 494,
    "end": 649
  },
  "kalos": {
    "start": 650,
    "end": 721
  },
  "alola": {
    "start": 722,
    "end": 809
  },
  "galar": {
    "start": 810,
    "end": 898
  },
  "paldea": {
     "start":899,
     "end":1025
  }
}

if(battleData.set.allow_regions.length > 0){
pokes1 = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && battleData.set.allow_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && battleData.set.allow_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
}
if(battleData.set.ban_regions.length > 0){
pokes1 = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && !battleData.set.ban_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && !battleData.set.ban_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
}
 if(battleData.set.random && !useTempTeams){
const pk2 = []
const pk1 = []
const ls = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
const ls2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
var pk2b = []
var pk1b = []
for(let i = 0; i < battleData.set.max_6l; i++){
const ls22 = ls2.filter(p => !pk2b.includes(p))
const ls1 = ls.filter(p => !pk1b.includes(p))
pk2b.push(ls22[Math.floor(Math.random() * ls22.length)])
pk1b.push(ls1[Math.floor(Math.random()* ls1.length)])
}
for(let i = 0; i < battleData.set.min_6l; i++){
const pk2bb = pk2b.filter(p => !pk2.includes(p))
const pk1bb = pk1b.filter(p => !pk1.includes(p))
pk2.push(pk2bb[Math.floor(Math.random() * pk2bb.length)])
pk1.push(pk1bb[Math.floor(Math.random()* pk1bb.length)])
}
for(let i = pk1.length; i < 6; i++){
const ls5 = pk1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(ls5.length >= battleData.set.max_6l){
pokes1 = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && spawn[pk.name].toLowerCase() !== 'legendry' && spawn[pk.name].toLowerCase()!== 'legendary' && spawn[pk.name].toLowerCase() !== 'mythical'
})
}
const rns = pokes1.filter((p)=>!pk1.includes(p))
const rnd = rns[Math.floor(Math.random() * rns.length)]
if(rnd){
pk1.push(rnd)
}
}
for(let i = pk2.length; i < 6; i++){
const ls5 = pk2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(ls5.length >= battleData.set.max_6l){
pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && spawn[pk.name].toLowerCase() !== 'legendry' && spawn[pk.name].toLowerCase()!== 'legendary' && spawn[pk.name].toLowerCase() !== 'mythical'
})
}
const rns2 = pokes2.filter((p)=>!pk2.includes(p))
const rnd2 = rns2[Math.floor(Math.random()*rns2.length)]
if(rnd2){
pk2.push(rnd2)
}
}
pokes1 = pk1
pokes2 = pk2
}

pokes1 = pokes1.slice(0,battleData.set.max_poke*1)
pokes2 = pokes2.slice(0,battleData.set.max_poke*1)

battleData.users[ctx.from.id] = true
const leng = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
const leng2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
console.log(leng,leng2)
if(pokes1.length < 1 || leng.length < battleData.set.min_6l || leng.length > battleData.set.max_6l){
battleData.users[id1] = false
}
if(pokes2.length < 1 || leng2.length < battleData.set.min_6l || leng2.length > battleData.set.max_6l){
battleData.users[id2] = false
}
 if(!battleData.users[ctx.from.id]){
 ctx.answerCbQuery('A valid team for this battle could not be formed')
 return
 }
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
if(Object.values(battleData.users).every(value => value === true)){
const mdata = await loadMessageData();
if(mdata.battle.includes(parseInt(id2))){
ctx.answerCbQuery('You Are In A Battle')
return
}
if(mdata.battle.includes(parseInt(id1))){
ctx.answerCbQuery('Opponent Is In A Battle')
return
}
var la = {}
var tem = {}
let spe = {}
for(const p of pokes1){
const pk = data.pokes.filter((poke)=> poke.pass == p)
if(pk[0]){
const base = pokestats[pk[0].name]
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la[pk[0].pass] = clevel
tem[pk[0].pass] = stats.hp
spe[pk[0].pass] = stats.speed
}
}
var la2 = {}
var tem2 = {}
let spe2 = {}
for(const p of pokes2){
const pk = data2.pokes.filter((poke)=> poke.pass == p)
if(pk[0]){
const base = pokestats[pk[0].name]
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la2[pk[0].pass] = clevel
tem2[pk[0].pass] = stats.hp
spe2[pk[0].pass] = stats.speed
}
}
const user1poke = data.pokes.filter((poke)=>poke.pass==pokes1[0])[0]
const user2poke = data2.pokes.filter((poke)=>poke.pass==pokes2[0])[0]
const base1 = pokestats[user1poke.name]
const base2 = pokestats[user2poke.name]
  ensureBattleStatus(battleData)
  const p1Lead = Object.keys(spe)[0]
  const p2Lead = Object.keys(spe2)[0]
  const speed1 = getSpeedWithStatus(spe[p1Lead], battleData, p1Lead)
  const speed2 = getSpeedWithStatus(spe2[p2Lead], battleData, p2Lead)
  const result = speed1 > speed2 ? p1Lead : p2Lead;
console.log(result)
if(result in tem){
battleData.c = Object.keys(tem)[0]
battleData.chp = tem[battleData.c]
battleData.o = Object.keys(tem2)[0]
battleData.ohp = tem2[battleData.o]
battleData.cid = id1
battleData.oid = id2
battleData.tem = tem
battleData.la = la
battleData.tem2 = tem2
battleData.la2 = la2
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
}else if(result in tem2){
battleData.c = Object.keys(tem2)[0]
battleData.chp = tem2[battleData.c]
battleData.o = Object.keys(tem)[0]
battleData.ohp = tem[battleData.o]
battleData.cid = id2
battleData.oid = id1
battleData.tem = tem2
battleData.la = la2
battleData.tem2 = tem
battleData.la2 = la
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
}
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p.name]
const pp2 = pokes[p2.name]
let msg = '<b>✦ The Pokomon battle commences!</b>'
 msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
  msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+battleData.tem2[battleData.o]+''
msg += '\n<code>'+Bar(battleData.tem2[battleData.o],battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
  msg += '\n<b>'+c(p.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p.name,p.exp)+' | <b>HP :</b> '+battleData.chp+'/'+battleData.tem[battleData.c]+''
msg += '\n<code>'+Bar(battleData.tem[battleData.c],battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
let img = pp.front_default_image
const im = shiny.filter((poke)=>poke.name==p.name)[0]
if(events[p.name] && p.symbol == '🪅') {
img = events[p.name]
}
if(im && p.symbol=='✨'){
img=im.shiny_url
}
for(const move2 of p.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
let ext = {}
if(battleData.set.preview=='Upper'){
ext = {link_preview_options:{url:img,show_above_text:true}}
}else if(battleData.set.preview=='Down'){
ext = {link_preview_options:{url:img,show_above_text:false}}
}
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'multybg_'+bword+''},{text:'Escape',callback_data:'multryn_'+bword+'_multi'},{text:'Pokemon',callback_data:'multichanpok_'+bword+'_'+battleData.cid+''}]
const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p.name)
if(battleData.set.key_item && isstone.length > 0 && Object.keys(attacker.extra.megas).length == 0 && attacker.inv.ring){
const rows5 = []
for(const i of isstone){
rows5.push({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''})
}
rows.push(rows5)
}
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard,...ext})
const messageData = await loadMessageData();
messageData.battle.push(parseInt(battleData.cid))
messageData.battle.push(parseInt(battleData.oid))
    messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(), turn:battleData.cid, oppo:battleData.oid };
    await saveMessageData(messageData);
}else{
let msg = '⚔ <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> Has Challenged <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a>\n'
let msg2 = ''
const settings = battleData.set
if(settings.max_poke < 6){
f = true
msg2 += '\n<b>• Max number of pokemon:</b> '+settings.max_poke+''
}
if(settings.min_6l > 0 || settings.max_6l < 6){
f = true
msg2 += '\n<b>• Number of legendaries:</b> '+settings.min_6l+'-'+settings.max_6l+''
}
if(settings.min_level > 1 || settings.max_level < 100){
f = true
msg2 += '\n<b>• Level gap of pokemon:</b> '+settings.min_level+'-'+settings.max_level+''
}
if(!settings.switch){
f = true
msg2 += '\n<b>• Switching pokemon:</b> Disabled'
}
if(!settings.key_item){
f = true
msg2 += '\n<b>• Form Changing:</b> Disabled'
}
if(settings.sandbox){
f = true
msg2 += '\n<b>• Sandbox mode:</b> Enabled'
}
if(settings.random){
f = true
msg2 += '\n<b>• Random mode:</b> Enabled'
}
if(settings.preview && settings.preview != 'no'){
f = true
msg2 += '\n<b>• Preview mode:</b> '+settings.preview+''
}
if(settings.pin){
f = true
msg2 += '\n<b>• Pin mode:</b> Enabled'
}
if(!settings.type_effects){
f = true
msg2 += '\n<b>• Type efficiency:</b> Disabled'
}
if(!settings.dual_type){
f = true
msg2 += '\n<b>• Dual Types:</b> Disabled'
}
if(settings.allow_regions.length > 0){
f = true
msg2 += '\n<b>• Only regions:</b> ['+c(settings.allow_regions.join(' , '))+']'
}
if(settings.ban_regions.length > 0){
f = true
msg2 += '\n<b>• Banned regions:</b> ['+c(settings.ban_regions.join(' , '))+']'
}
if(settings.ban_types.length > 0){
f = true
msg2 += '\n<b>• Banned types:</b> ['+c(settings.ban_types.join(' , '))+']'
}
if(settings.allow_types.length > 0){
f = true
msg2 += '\n<b>• Types:</b> ['+c(settings.allow_types.join(' , '))+']'
}
if(battleData.users[id1]){
var em1 = '✓'
}else{
var em1 = '✗'
}
if(battleData.users[id2]){
var em2 = '✓'
}else{
var em2 = '✗'
}
if(f){
msg += msg2
 msg += '\n\n-> <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a> : '+em2+''
}else{
 msg += '\n\n-> <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a> : '+em2+''
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Agree ✓',callback_data:'battle_'+id1+'_'+id2+'_'+bword+''},{text:'Reject ✗',callback_data:'reject_'+id1+'_'+id2+'_'+bword+''}],[{text:'Battle Settings ⚔',callback_data:'sytbr_'+id1+'_'+id2+'_'+bword+''}]]}})
}
})

bot.action(/multimo_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const moveid = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const id = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
  const move = dmoves[moveid]
const data = await getUserData(battleData.cid)
const data2 = await getUserData(battleData.oid)
const p = data.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const op = data2.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base1 = pokestats[p.name]
const base2 = pokestats[op.name]
const level1 = plevel(p.name,p.exp)
const level2 = plevel(op.name,op.exp)
const stats1 = await Stats(base1,p.ivs,p.evs,c(p.nature),level1)
  const stats2 = await Stats(base2,op.ivs,op.evs,c(op.nature),level2)
  ensureBattleStatus(battleData)
let atk = stats1.attack
let def = stats1.defense
let atk2 = stats2.attack
let def2 = stats2.defense
const type1 = pokes[p.name].types[0]
const type2 = pokes[p.name].types[1] ? pokes[p.name].types[1] : null
const type3 = pokes[op.name].types[0]
const type4 = pokes[op.name].types[1] ? c(pokes[op.name].types[1]) : null
if(!battleData.set.type_effects){
var eff1 = 1
}else{
var eff1 = await eff(c(move.type),c(type3),type4)
}
  if(move.category=='special'){
  atk = stats1.special_attack
  def = stats1.special_defense
  atk2 = stats2.special_attack
  def2 = stats2.special_defense
  }
  if(move.category=='physical' && getBattleStatus(battleData, battleData.c) === 'burn'){
    atk = Math.max(1, Math.floor(atk / 2))
  }
  console.log(eff1,type3,type4)
  const actState = canPokemonAct(battleData, battleData.c, p.name)
  let msg2 = actState.msg || ''
  if(!actState.canAct){
    // Skip move execution when status prevents acting.
  }else if(Math.random()*100 > move.accuracy){
  msg2 = '➣ <b>'+c(p.name)+'</b> <b>'+c(move.name)+'</b> has missed.'
  }else if(Math.random() < 0.05){
  msg2 = '➣ <b>'+c(op.name)+'</b> Dodged <b>'+c(p.name)+'</b>\'s <b>'+c(move.name)+'</b>'
  }else{
  if(move.category == 'status' || !move.power){
  msg2 = '➣ <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.'
  }else{
  var damage = Math.min(calc(atk,def2,level1,move.power,eff1),battleData.ohp)
  battleData.ohp = Math.max((battleData.ohp-damage),0)
  battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o]-damage),0)
  msg2 = '➣ <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP of <b>'+c(op.name)+'</b>'
  }
  const statusEffect = getMoveStatusEffect(move)
  if(statusEffect && battleData.ohp > 0){
    const existingStatus = getBattleStatus(battleData, battleData.o)
    const defenderTypes = pokes[op.name]?.types || []
    if(!existingStatus && !isStatusImmune(statusEffect.status, defenderTypes) && Math.random() < statusEffect.chance){
      setBattleStatus(battleData, battleData.o, statusEffect.status)
      msg2 += '\n➣ <b>'+c(op.name)+'</b> is now <b>'+getStatusLabel(statusEffect.status)+'</b>.'
    }
  }
  msg2 += applyDefenderResidualDamage(battleData, battleData.o, op.name, stats2.hp)
  }
  let msg = msg2
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));

const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
if(eff1 == 0){
msg += '\n<b>✶ It\'s 0x effective!</b>'
}else if(eff1 == 0.5){
msg += '\n<b>✶ It\'s not very effective...</b>'
}else if(eff1 == 2){
msg += '\n<b>✶ It\'s super effective!</b>'
}else if(eff1 == 4){
msg += '\n<b>✶ It\'s incredibly super effective!</b>'
}
 msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
  msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
  msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
const messageData = await loadMessageData();
    messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(),turn:battleData.cid,oppo:battleData.oid };

    await saveMessageData(messageData);
if(battleData.chp < 1){
msg += '\n\n<b>'+c(p1.name)+'</b> has fainted. Choose your next pokemon.'
if(!battleData.set.sandbox){
await incexp(defender,p2,attacker,p1,ctx,battleData,bot)
await incexp2(attacker,p1,defender,p2,ctx,battleData,bot)
}
const av = []
const al = []
let b = 1
for(const pok in battleData.tem){
if(battleData.tem[pok] > 0){
const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
av.push({name:b,pass:pok})
al.push(pok)
}else{
av.push({name:b+' (0 HP)',pass:pok})
}
b++;
}
 if(al.length < 1){
  const gpc = Object.keys(battleData.tem).length*15
  defender.inv.pc += gpc
  if(!defender.inv.win){
defender.inv.win = 0
}
defender.inv.win += 1
  if(!attacker.inv.lose){
  attacker.inv.lose = 0
  }
  attacker.inv.lose += 1
  if(battleData.tempBattle && battleData.tempTeams){
  const t1 = battleData.tempTeams[battleData.cid] || []
  const t2 = battleData.tempTeams[battleData.oid] || []
  attacker.pokes = (attacker.pokes || []).filter(p => !t1.includes(p.pass))
  defender.pokes = (defender.pokes || []).filter(p => !t2.includes(p.pass))
  if(attacker.extra && attacker.extra.temp_battle){
  delete attacker.extra.temp_battle[bword]
  }
  if(defender.extra && defender.extra.temp_battle){
  delete defender.extra.temp_battle[bword]
  }
  }
  await saveUserData2(battleData.cid,attacker)
  await saveUserData2(battleData.oid,defender)
const messageData = await loadMessageData();
messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
delete messageData[bword];
await saveMessageData(messageData);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(p1.name)+' </b>has fainted.\n<a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a> lost against <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>.\n+'+gpc+' PokeCoins 💷',{parse_mode:'HTML'})
if(Math.random()< 0.00005){
const idr = (Math.random()<0.5) ? battleData.oid : battleData.cid
const dr = await getUserData(idr)
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+idr+'"><b>'+displayName(dr,idr)+'</b></a>, A <b>Move Tutor</b> was watching your match. He wants to <b>Teach</b> one of your <b>Pokemon</b> a <b>Move.</b>',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
const my = String(tutors[Math.floor(Math.random()*tutors.length)])
const m77 = await sendMessage(ctx,idr,'While you were <b>Battling</b> with a trainer, An expert <b>Move Tutor</b> saw your battle very interestingly. He Impressed with your <b>Battle</b> experience and strategy. He wants to <b>Teach</b> your any of <b>Pokemon</b> a move. It will be available only for next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
const mdata = await loadMessageData();
if(!mdata.tutor){
mdata.tutor = {}
}
mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
await saveMessageData(mdata)
}
}else{
const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_fainted' }));
while (buttons.length < 6) {
  buttons.push({ text: '  ', callback_data: 'empty' });
}
const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
return
}
return
}
msg += '\n\n<b>Moves :</b>'
const moves = []
let img = pp.front_default_image
const im = shiny.filter((poke)=>poke.name==p1.name)[0]
if(events[p1.name] && p1.symbol == '🪅'){
img = events[p1.name]
}
if(im && p1.symbol=='✨'){
img=im.shiny_url
}
for(const move2 of p1.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
let ext = {}
if(battleData.set.preview=='Upper'){
ext = {link_preview_options:{url:img,show_above_text:true}}
}else if(battleData.set.preview=='Down'){
ext = {link_preview_options:{url:img,show_above_text:false}}
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'multybg_'+bword+''},{text:'Escape',callback_data:'multryn_'+bword+'_multi'},{text:'Pokemon',callback_data:'multichanpok_'+bword+'_'+battleData.cid+''}]
if(!attacker.inv.stones){
attacker.inv.stones = []
}
const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p1.name)
if(battleData.set.key_item && isstone.length > 0 && Object.keys(attacker.extra.megas).length == 0 && attacker.inv.ring){
const rows5 = []
for(const i of isstone){
rows5.push({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''})
}
rows.push(rows5)
}

rows.push(key2)
  const keyboard = {
    inline_keyboard: rows
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard,...ext})
})
bot.action(/multichanpok_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
if(!battleData.set.switch){
ctx.answerCbQuery('Switch is diabled')
return
}
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
let msg = '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
msg += '\n\n<i>Choose another pokemon for battle.</i>'
const av = []
let b = 1
let al = []
for(const pok in battleData.tem){
if(battleData.tem[pok] > 0){
const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
av.push({name:b,pass:pok})
al.push(pok)
}else{
av.push({name:b+' (0 HP)',pass:pok})
}
b++;
}
const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_change' }));
while (buttons.length < 6) {
  buttons.push({ text: '  ', callback_data: 'empty' });
}
const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
rows.push([{text:'⬅️ Back',callback_data:'multibttle_'+bword+'_'+battleData.cid+''}])
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
})
bot.action(/multibttle_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
let msg = '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
let img = pp.front_default_image
const im = shiny.filter((poke)=>poke.name==p1.name)[0]
if(events[p1.name] && p1.symbol == '🪅'){
img = events[p1.name]
}
if(im && p1.symbol=='✨'){
img=im.shiny_url
}
for(const move2 of p1.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
let ext = {}
if(battleData.set.preview=='Upper'){
ext = {link_preview_options:{url:img,show_above_text:true}}
}else if(battleData.set.preview=='Down'){
ext = {link_preview_options:{url:img,show_above_text:false}}
}
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'multybg_'+bword+''},{text:'Escape',callback_data:'multryn_'+bword+'_multi'},{text:'Pokemon',callback_data:'multichanpok_'+bword+'_'+battleData.cid+''}]
const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p1.name)
if(battleData.set.key_item && isstone.length > 0 && Object.keys(attacker.extra.megas).length == 0 && attacker.inv.ring){
const rows5 = []
for(const i of isstone){
rows5.push({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''})
}
rows.push(rows5)
}
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard,...ext})
})
bot.action(/megtst_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const stone5 = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
if(ctx.from.id!=battleData.cid){
ctx.answerCbQuery('Not Your Turn')
return
}
const stone = stones[stone5]
const d2b = await getUserData(battleData.cid)
const pke = d2b.pokes.filter((pk)=>pk.pass == battleData.c)[0]
const n = pke.name
if(stone.pokemon!=pke.name){
console.log(pke.name)
return
}
if(!d2b.extra.megas){
d2b.extra.megas = {}
}
if(!battleData.megas){
battleData.megas = {}
}
battleData.megas[pke.pass] = pke.name
d2b.extra.megas[pke.pass] = pke.name
pke.name = stone.mega
await saveUserData2(ctx.from.id,d2b)
const pass = battleData.c
const atta = await getUserData(battleData.cid)
const deffa = await getUserData(battleData.oid)
const p12 = atta.pokes.filter((poke)=>poke.pass==pass)[0]
let msg = '<b>'+c(p12.name)+'</b> has transformed into <b>'+c(stone.mega)+'</b>'
const p22 = deffa.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base12 = pokestats[p22.name]
const base22 = pokestats[p12.name]
const level12 = plevel(p22.name,p22.exp)
const level22 = plevel(p12.name,p12.exp)
const stats12 = await Stats(base12,p22.ivs,p22.evs,c(p22.nature),level12) 
const stats22 = await Stats(base22,p12.ivs,p12.evs,c(p12.nature),level22)
const speed12 = getSpeedWithStatus(stats12.speed, battleData, p22.pass)
const speed22 = getSpeedWithStatus(stats22.speed, battleData, p12.pass)
const result = speed12 > speed22 ? p22.pass : p12.pass
if(result in battleData.tem2){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
const dl = await getUserData(battleData.cid)
const p169 = dl.pokes.filter((poke)=>poke.pass==battleData.c)[0]
msg += '\n<b>'+c(p169.name)+'</b> <i>speed advantage allows to move first</i>'
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
 msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
let img = pp.front_default_image
const im = shiny.filter((poke)=>poke.name==p1.name)[0]
if(events[p1.name] && p1.symbol == '🪅'){
img = events[p1.name]
}
if(im && p1.symbol=='✨'){
img=im.shiny_url
}
for(const move2 of p1.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
let ext = {}
if(battleData.set.preview=='Upper'){
ext = {link_preview_options:{url:img,show_above_text:true}}
}else if(battleData.set.preview=='Down'){
ext = {link_preview_options:{url:img,show_above_text:false}}
}
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'multybg_'+bword+''},{text:'Escape',callback_data:'multryn_'+bword+'_multi'},{text:'Pokemon',callback_data:'multichanpok_'+bword+'_'+battleData.cid+''}]
const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p1.name)
if(battleData.set.key_item && isstone.length > 0 && Object.keys(attacker.extra.megas).length == 0 && attacker.inv.ring){
const rows5 = []
for(const i of isstone){
rows5.push({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''})
}
rows.push(rows5)
}
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows
  };
const pk = pokes[stone.mega]
let img2 = pokes[p12.name].front_default_image
const im2 = shiny.filter((poke)=>poke.name==p12.name)[0]
if(im2 && p12.symbol=='✨'){
img2=im2.shiny_url
}
await sendMessage(ctx,ctx.chat.id,img2,{caption:'*'+c(n)+'* has transformed into *'+c(pke.name)+'*.',parse_mode:'markdown',reply_to_message_id:ctx.callbackQuery.message.message_id})
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard,...ext})
})

bot.action(/multidne_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const pass = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const id = ctx.callbackQuery.data.split('_')[3]
const prop = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
if(battleData.tem[pass] < 1){
ctx.answerCbQuery('This Poke Is Ded')
return
}
if(battleData.c==pass){
ctx.answerCbQuery('This Poke Is Already Batteling')
return
}

battleData.c = pass
battleData.chp = battleData.tem[pass]
const atta = await getUserData(battleData.cid)
const deffa = await getUserData(battleData.oid)
const p12 = atta.pokes.filter((poke)=>poke.pass==pass)[0]
let msg = '<b>'+c(p12.name)+'</b> came for battle'
const p22 = deffa.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base12 = pokestats[p22.name]
const base22 = pokestats[p12.name]
const level12 = plevel(p22.name,p22.exp)
const level22 = plevel(p12.name,p12.exp)
const stats12 = await Stats(base12,p22.ivs,p22.evs,c(p22.nature),level12) 
const stats22 = await Stats(base22,p12.ivs,p12.evs,c(p12.nature),level22)
const speed12 = getSpeedWithStatus(stats12.speed, battleData, p22.pass)
const speed22 = getSpeedWithStatus(stats22.speed, battleData, p12.pass)
const result = speed12 > speed22 ? p22.pass : p12.pass
if(prop == 'fainted'){
if(result in battleData.tem2){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
const dl = await getUserData(battleData.cid)
const p169 = dl.pokes.filter((poke)=>poke.pass==battleData.c)[0]
msg += '\n<b>'+c(p169.name)+'</b> <i>speed advantage allows to move first</i>'
}
if(prop == 'change'){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
 msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
let img = pp.front_default_image
const im = shiny.filter((poke)=>poke.name==p1.name)[0]
if(events[p1.name] && p1.symbol == '🪅'){
img = events[p1.name]
}
if(im && p1.symbol=='✨'){
img=im.shiny_url
}
for(const move2 of p1.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
let ext = {}
if(battleData.set.preview=='Upper'){
ext = {link_preview_options:{url:img,show_above_text:true}}
}else if(battleData.set.preview=='Down'){
ext = {link_preview_options:{url:img,show_above_text:false}}
}
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'multybg_'+bword+''},{text:'Escape',callback_data:'multryn_'+bword+'_multi'},{text:'Pokemon',callback_data:'multichanpok_'+bword+'_'+battleData.cid+''}]
const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p1.name)
if(battleData.set.key_item && isstone.length > 0 && Object.keys(attacker.extra.megas).length == 0 && attacker.inv.ring){
const rows5 = []
for(const i of isstone){
rows5.push({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''})
}
rows.push(rows5)
}
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard,...ext})
})
}

module.exports = registerBattleCallbacks;

