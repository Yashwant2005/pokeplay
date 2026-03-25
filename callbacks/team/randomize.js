function register_024_randomize(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/randomize_/,check2q,async ctx => {
const data = await getUserData(ctx.from.id)
const team = ctx.callbackQuery.data.split('_')[1]
if(!Array.isArray(data.pokes)) data.pokes = []
if(!data.teams || typeof data.teams !== 'object') data.teams = {}
const pk5 = []
for(let i = 1; i <=6; i++){
const pk = data.pokes.filter((pk2)=> !pk2.temp_battle && !pk5.includes(pk2.pass))
if(pk.length > 0){
const ran = pk[Math.floor(Math.random()*pk.length)]
pk5.push(ran.pass)
}
}
if(data.teams[team] == pk5){
return
}
data.teams[team] = pk5
await saveUserData2(ctx.from.id, data);
const userData = data
const pokes = userData.teams[team];
    const matchings = [];
let b = 1
    for (const pass of pokes) {
        const matching = userData.pokes.find((poke) => poke.pass === pass);
        if (matching) {
            matchings.push(pass)
         b++;
}
    }

    const list = matchings.join('\n');

    if (!userData.inv || userData.inv.team !== team) {
        var main = '❌';
    } else {
        var main = '✅';
    }
let messageText = '*Main :* `' + main + '`\n';
messageText += await pokelist(matchings,ctx,0)
messageText += '\n\n_Choose Any Option Below_'
ctx.answerCbQuery('Created Random Team')
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{parse_mode:'Markdown',reply_markup:{inline_keyboard:
[[{text:'Add Poke',callback_data:'add_'+team+''},{text:'Remove Poke',callback_data:'remove_'+team+''}],
[{text:'Change Order',callback_data:'change_order_'+team+''},{text:'Randomize',callback_data:'randomize_'+team+''}],
[{text:'Reset Team',callback_data:'rest_'+team+''},{text:'Main',callback_data:'main_'+team+''}],
[{text:'Rename',callback_data:'rename_'+team+''},{text:'🔙Back',callback_data:'teams'}]]}})
})
}

module.exports = register_024_randomize;

