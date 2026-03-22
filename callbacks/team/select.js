function register_029_select(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/select_/,check2q, async (ctx) => {
    const pass = String(ctx.callbackQuery.data.split('_')[1]);
    const team = ctx.callbackQuery.data.split('_')[2];

    const userId = ctx.from.id;
    const userData = await getUserData(ctx.from.id);

    if (!userData.pokes) {
        userData.pokes = [];
    }

    if (!userData.teams) {
        userData.teams = {};
    }

    if (!userData.teams[team]) {
        userData.teams[team] = [];
    }
    const rawTeamPasses = userData.teams[team].map((p) => String(p));
    const allTeamPasses = [...new Set(rawTeamPasses)];
    const ownedPasses = new Set((userData.pokes || []).map((p) => String(p.pass)));
    const validTeamPasses = allTeamPasses.filter((p) => ownedPasses.has(p));
    userData.teams[team] = validTeamPasses;
    if (JSON.stringify(rawTeamPasses) !== JSON.stringify(validTeamPasses)) {
        await saveUserData2(userId, userData);
    }

    if (validTeamPasses.length >= 6) {
        ctx.answerCbQuery(userData.inv[team] ? userData.inv[team] : 'Team ' + team + ' already has 6 pokes.', { show_alert: true });
        return;
    }

    const pok = userData.pokes.find((poke) => String(poke.pass) === pass);

    if (!pok) {
        ctx.answerCbQuery('Poke not found.', { show_alert: true });
        return;
    }

    if (userData.teams[team].includes(pass)) {
        ctx.answerCbQuery('Poke is already in Team ' + team, { show_alert: true });
return
}
userData.teams[team].push(pass);
            await saveUserData2(userId, userData);
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
let messageText = '*Main :* `' + main + '`\n';
messageText += await pokelist(matchings,ctx,0)
messageText += '\n\n_Choose Any Option Below_'
ctx.answerCbQuery('Added Pokemon To Team')
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[[{text:'Add Poke',callback_data:'add_'+team+''},{text:'Remove Poke',callback_data:'remove_'+team+''}],[{text:'Change Order',callback_data:'change_order_'+team+''},{text:'Randomize',callback_data:'randomize_'+team+''}],[{text:'Reset Team',callback_data:'rest_'+team+''},{text:'Main',callback_data:'main_'+team+''}],[{text:'Rename',callback_data:'rename_'+team+''},{text:'🔙Back',callback_data:'teams'}]]}})
})
}

module.exports = register_029_select;

