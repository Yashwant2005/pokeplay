function register_021_travel(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/travel_/,check2q,async ctx => {
const region = ctx.callbackQuery.data.split('_')[1]
let place = false
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery()
return
}
const data = await getUserData(ctx.from.id)
const regionGroups = {
  kanto: ['kanto', 'letsgo-kanto'],
  johto: ['johto'],
  hoenn: ['hoenn'],
  sinnoh: ['sinnoh'],
  hisui: ['hisui'],
  unova: ['unova'],
  kalos: ['kalos-central', 'kalos-coastal', 'kalos-mountain'],
  alola: ['alola', 'melemele', 'akala', 'ulaula', 'poni'],
  galar: ['galar', 'isle-of-armor', 'crown-tundra'],
  paldea: ['paldea', 'kitakami', 'blueberry'],
  national: ['national'],
  conquest: ['conquest-gallery']
}
const getRegionGroup = (value) => {
const normalized = String(value || '').toLowerCase()
for(const [groupName, places] of Object.entries(regionGroups)){
if(places.includes(normalized)){
return groupName
}
}
return normalized
}
if(region=='back'){
place = true
var key = [
  [{ text: 'National',  callback_data: 'travel_national_'+ctx.from.id+'' },],
  [
    { text: 'Kanto', callback_data: 'travel_kanto2_'+ctx.from.id+'' },
    { text: 'Johto', callback_data: 'travel_johto_'+ctx.from.id+'' },
    { text: 'Hoenn', callback_data: 'travel_hoenn_'+ctx.from.id+'' }
  ],
  [
    { text: 'Sinnoh',  callback_data: 'travel_sinnoh_'+ctx.from.id+'' },
    { text: 'Hisui', callback_data: 'travel_hisui_'+ctx.from.id+'' },
    { text: 'Unova', callback_data: 'travel_unova_'+ctx.from.id+'' },
    { text: 'Kalos',  callback_data: 'travel_kalos_'+ctx.from.id+'' }
  ],
  [
    { text: 'Alola', callback_data: 'travel_alola2_'+ctx.from.id+'' },
    { text: 'Galar',  callback_data: 'travel_galar2_'+ctx.from.id+'' },
    { text: 'Paldea',  callback_data: 'travel_paldea2_'+ctx.from.id+'' }
  ],
  [
    { text: 'Conquest Gallery', callback_data: 'travel_conquest-gallery_'+ctx.from.id+'' }
  ]
];
var msg = '*Which Region You Wanna Travel?*\n\n*Travel cost:* _500 PokeCoins when changing major region. Same-region travel is free._'
}else if(region=='kanto2'){
place = true
var key = [
[{text:'Kanto',callback_data:'travel_kanto_'+ctx.from.id+''},{text:'LetsGo-Kanto',callback_data:'travel_letsgo-kanto_'+ctx.from.id+''}],
[{text:'⬅️ Back',callback_data:'travel_back_'+ctx.from.id+''}]
]
var msg = 'Which Place Wanna Go In *Kanto*?'
}else if(region=='kalos'){
place = true
var key = [
[{text:'Central',callback_data:'travel_kalos-central_'+ctx.from.id+''},{text:'Coastal',callback_data:'travel_kalos-coastal_'+ctx.from.id+''},{text:'Mountain',callback_data:'travel_kalos-mountain_'+ctx.from.id+''}],
[{text:'⬅️ Back',callback_data:'travel_back_'+ctx.from.id+''}]
]
var msg = 'Which Place In *Kalos* You Wanna Travel?'
}else if(region=='galar2'){
place = true
var key = [
[{text:'Galar',callback_data:'travel_galar_'+ctx.from.id+''},{text:'Isle Of Armour',callback_data:'travel_isle-of-armor_'+ctx.from.id+''}],
[{text:'Crown Tundra',callback_data:'travel_crown-tundra_'+ctx.from.id+''},{text:'⬅️ Back',callback_data:'travel_back_'+ctx.from.id+''}]
]
var msg = 'Which Place In *Galar* You Wanna Travel?'
}else if(region=='paldea2'){
place = true
var key = [
[{text:'Paldea',callback_data:'travel_paldea_'+ctx.from.id+''},{text:'KitaKami',callback_data:'travel_kitakami_'+ctx.from.id+''},{text:'Blueberry',callback_data:'travel_blueberry_'+ctx.from.id+''}],
[{text:'⬅️ Back',callback_data:'travel_back_'+ctx.from.id+''}]
] 
var msg = 'Which Place In *Paldea* You Wanna Travel?'
}else if(region=='alola2'){
place = true
var key = [
[{text:'Alola',callback_data:'travel_alola_'+ctx.from.id+''},{text:'Melemele',callback_data:'travel_melemele_'+ctx.from.id+''},{text:'Akala',callback_data:'travel_akala_'+ctx.from.id+''}],
[{text:'Ulaula',callback_data:'travel_ulaula_'+ctx.from.id+''},{text:'Poni',callback_data:'travel_poni_'+ctx.from.id+''}],
[{text:'⬅️ Back',callback_data:'travel_back_'+ctx.from.id+''}]
]
var msg = 'Which Place In *Aloka* You Wanna Travel?'
}

if(place){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:key}})
return
}

if(data.balls.safari && data.balls.safari > 0){
ctx.answerCbQuery('You Are In *'+c(data.extra.saf)+' Safari Zone*')
return
}
const selectedRegion = ctx.callbackQuery.data.split('_')[1]
const currentRegion = String(data.inv.region || '').toLowerCase()
const selectedRegionGroup = getRegionGroup(selectedRegion)
const currentRegionGroup = getRegionGroup(currentRegion)
const isPaidTravel = currentRegionGroup !== selectedRegionGroup
if(isPaidTravel){
if(!Number.isFinite(data.inv.pc)){
data.inv.pc = 0
}
if(data.inv.pc < 500){
ctx.answerCbQuery('Need 500 PokeCoins to change region.',{show_alert:true})
return
}
data.inv.pc -= 500
}
data.inv.region = selectedRegion
await saveUserData2(ctx.from.id,data)
let arrivalMessage = 'Successfully Arrived To *'+c(selectedRegion)+'*'
if(isPaidTravel){
arrivalMessage += '\n*Cost:* 500 PokeCoins 💷'
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,arrivalMessage,{parse_mode:'markdown'})
})
}

module.exports = register_021_travel;

