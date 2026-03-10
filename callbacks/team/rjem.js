function register_031_rjem(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/rjem_/,check2q, async (ctx) => {
    const pass = ctx.callbackQuery.data.split('_')[1];
    const team = ctx.callbackQuery.data.split('_')[2];
    const userId = ctx.from.id;
    const userData = await getUserData(ctx.from.id);


    if (!userData.teams) {
        userData.teams = {};
    }

    if (!userData.teams[team]) {
        userData.teams[team] = [];
    }
        userData.teams[team] = userData.teams[team].filter(p => p !== pass);
        await saveUserData2(userId, userData);
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
ctx.answerCbQuery('Removed Pokemon From Team')
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{parse_mode:'Markdown',reply_markup:{inline_keyboard:
[[{text:'Add Poke',callback_data:'add_'+team+''},{text:'Remove Poke',callback_data:'remove_'+team+''}],
[{text:'Change Order',callback_data:'change_order_'+team+''},{text:'Randomize',callback_data:'randomize_'+team+''}],
[{text:'Reset Team',callback_data:'rest_'+team+''},{text:'Main',callback_data:'main_'+team+''}],
[{text:'Rename',callback_data:'rename_'+team+''},{text:'🔙Back',callback_data:'teams'}]]}})
})
}

module.exports = register_031_rjem;

