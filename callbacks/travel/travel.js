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
const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);
const userLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
if(region=='back'){
place = true
var key = [
  [{ text: userLevel >= 75 ? 'National' : '  ',  callback_data: userLevel >= 75 ? 'travel_national_'+ctx.from.id+'' : 'locked' },],
  [
    { text: 'Kanto', callback_data: 'travel_kanto2_'+ctx.from.id+'' },
    { text: userLevel >= 5 ? 'Johto' : '  ', callback_data: userLevel >= 5 ? 'travel_johto_'+ctx.from.id+'' : 'locked' },
    { text: userLevel >= 10 ? 'Hoenn' : '  ', callback_data: userLevel >= 10 ? 'travel_hoenn_'+ctx.from.id+'' : 'locked' }
  ],
  [
    { text: userLevel >= 15 ? 'Sinnoh' : '  ',  callback_data: userLevel >= 15 ? 'travel_sinnoh_'+ctx.from.id+'' : 'locked' },
    { text: userLevel >= 40 ? 'Hisui' : '  ', callback_data: userLevel >= 40 ? 'travel_hisui_'+ctx.from.id+'' : 'locked' },
    { text: userLevel >= 20 ? 'Unova' : '  ', callback_data: userLevel >= 20 ? 'travel_unova_'+ctx.from.id+'' : 'locked' },
    { text: userLevel >= 25 ? 'Kalos' : '  ',  callback_data: userLevel >= 25 ? 'travel_kalos_'+ctx.from.id+'' : 'locked' }
  ],
  [
    { text: userLevel >= 30 ? 'Alola' : '  ', callback_data: userLevel >= 30 ? 'travel_alola2_'+ctx.from.id+'' : 'locked' },
    { text: userLevel >= 50 ? 'Galar' : '  ',  callback_data: userLevel >= 50 ? 'travel_galar2_'+ctx.from.id+'' : 'locked' },
    { text: userLevel >= 60 ? 'Paldea' : '  ',  callback_data: userLevel >= 60 ? 'travel_paldea2_'+ctx.from.id+'' : 'locked' }
  ],
  [
    { text: userLevel >= 65 ? 'Conquest Gallery' : '  ', callback_data: userLevel >= 65 ? 'travel_conquest-gallery_'+ctx.from.id+'' : 'locked' }
  ]
];
var msg = '*Which Region You Wanna Travel?*'
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
data.inv.region = ctx.callbackQuery.data.split('_')[1]
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully Arrived To *'+c(ctx.callbackQuery.data.split('_')[1])+'*',{parse_mode:'markdown'})
})
}

module.exports = register_021_travel;

