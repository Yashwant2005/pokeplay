function register_027_main(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/^main_/,check2q,async ctx => {
const userData = await getUserData(ctx.from.id);
if(!userData.inv || typeof userData.inv !== 'object') userData.inv = {}
if(!Array.isArray(userData.pokes)) userData.pokes = []
if(!userData.teams || typeof userData.teams !== 'object') userData.teams = {}
 const team = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2] || false
if(id && ctx.from.id!=id){
ctx.answerCbQuery()
return
}
if(!userData.teams || typeof userData.teams !== 'object' || !Array.isArray(userData.teams[team])){
ctx.answerCbQuery('Team not found')
return
}
const count = userData.teams[team].length
if(userData.inv.team && userData.inv.team==team){
ctx.answerCbQuery('Already Main')
return
}
if(count<1){
ctx.answerCbQuery('Add Some Pokes First')
return
}
userData.inv.team = team
await saveUserData2(ctx.from.id, userData);;
if (!userData.teams || !userData.teams[team]) {
        ctx.answerCbQuery('Team not found or has no pokes.', { show_alert: true });
        return;
    }

    const pokes = userData.teams[team];
    const matchings = [];
let b = 1
    for (const pass of pokes) {
        const matching = userData.pokes.find((poke) => String(poke.pass) === String(pass));
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
const tea = userData.inv[team] ?userData.inv[team] : team
    let messageText = '❖ *Main Team : '+tea+'*\n'
 messageText += await pokelist(matchings,ctx,0)
if(ctx.chat.type=='private'){
messageText+='\n\n_Which Team Want To Edit?_'
}else{
messageText+='\n\n_Which Team You Wanna Set As Main?_'
}
if(ctx.chat.type=='private'){
var key = [
  [{text:userData.inv["1"] ? userData.inv["1"] : 'Team 1',callback_data:'set_1'},
   {text:userData.inv["2"] ? userData.inv["2"] : 'Team 2',callback_data:'set_2'}],
  [{text:userData.inv["3"] ? userData.inv["3"] : 'Team 3',callback_data:'set_3'},
   {text:userData.inv["4"] ? userData.inv["4"] : 'Team 4',callback_data:'set_4'}],
  [{text:userData.inv["5"] ? userData.inv["5"] : 'Team 5',callback_data:'set_5'},
   {text:userData.inv["6"] ? userData.inv["6"] : 'Team 6',callback_data:'set_6'}]
];
}else{
var key = [
  [{text:userData.inv["1"] ? userData.inv["1"] : 'Team 1',callback_data:'main_1_'+ctx.from.id+''},
   {text:userData.inv["2"] ? userData.inv["2"] : 'Team 2',callback_data:'main_2_'+ctx.from.id+''}],
  [{text:userData.inv["3"] ? userData.inv["3"] : 'Team 3',callback_data:'main_3_'+ctx.from.id+''},
   {text:userData.inv["4"] ? userData.inv["4"] : 'Team 4',callback_data:'main_4_'+ctx.from.id+''}],
  [{text:userData.inv["5"] ? userData.inv["5"] : 'Team 5',callback_data:'main_5_'+ctx.from.id+''},
   {text:userData.inv["6"] ? userData.inv["6"] : 'Team 6',callback_data:'main_6_'+ctx.from.id+''}]
];
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{reply_markup:{inline_keyboard:key},parse_mode:'markdown'})
})
}

module.exports = register_027_main;

