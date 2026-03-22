function register_025_teams(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action('teams',check2q,async ctx => {
const userData = await getUserData(ctx.from.id);
const team = userData.inv.team*1 || 1
const pokes = userData.teams[team];
    const matchings = [];
let b = 1
    for (const pass of pokes) {
        const matching = userData.pokes.find((poke) => String(poke.pass) === String(pass));
        if (matching) {
            matchings.push(pass);
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
    let messageText = '❖ *Main Team : '+tea+'*\n\n'
 messageText += await pokelist(matchings,ctx,0)

messageText+='\n\n_Which Team Want To Edit?_'

await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{parse_mode:'markdown',reply_markup:{inline_keyboard: [
  [{text:userData.inv["1"] ? userData.inv["1"] : 'Team 1',callback_data:'set_1'},
   {text:userData.inv["2"] ? userData.inv["2"] : 'Team 2',callback_data:'set_2'}],
  [{text:userData.inv["3"] ? userData.inv["3"] : 'Team 3',callback_data:'set_3'},
   {text:userData.inv["4"] ? userData.inv["4"] : 'Team 4',callback_data:'set_4'}],
  [{text:userData.inv["5"] ? userData.inv["5"] : 'Team 5',callback_data:'set_5'},
   {text:userData.inv["6"] ? userData.inv["6"] : 'Team 6',callback_data:'set_6'}]
]}})
})
}

module.exports = register_025_teams;

