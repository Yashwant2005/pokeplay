function register_034_swap_confirm(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/swap_confirm_/, check2q,async (ctx) => {
    const userData = await getUserData(ctx.from.id);

    const team = ctx.callbackQuery.data.split('_')[2];
    const pass1 = ctx.callbackQuery.data.split('_')[3];
    const pass2 = ctx.callbackQuery.data.split('_')[4];
    const slugsInTeam = userData.teams[team];

    // Find the indices of the slugs with pass1 and pass2
    const index1 = slugsInTeam.findIndex((pass) => pass === pass1);
    const index2 = slugsInTeam.findIndex((pass) => pass === pass2);

    // Swap the passes
    if (index1 !== -1 && index2 !== -1) {
        slugsInTeam[index1] = pass2;
        slugsInTeam[index2] = pass1;
    }

    // Save the updated data
    await saveUserData2(ctx.from.id, userData);

    // Edit the message to show the updated order
    const matchings = [];
    let b = 1;

    for (const pass of slugsInTeam) {
        const matchingSlug = userData.pokes.find((slug) => slug.pass === pass);
        if (matchingSlug) {
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
let messageText = '*Main :* `' + main + '`\n';
messageText += await pokelist(matchings,ctx,0)
messageText += '\n\n_Choose Any Option Below_'
ctx.answerCbQuery('Swapped Both Pokemons')

await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{parse_mode:'Markdown',reply_markup:{inline_keyboard:
[[{text:'Add Poke',callback_data:'add_'+team+''},{text:'Remove Poke',callback_data:'remove_'+team+''}],
[{text:'Change Order',callback_data:'change_order_'+team+''},{text:'Randomize',callback_data:'randomize_'+team+''}],
[{text:'Reset Team',callback_data:'rest_'+team+''},{text:'Main',callback_data:'main_'+team+''}],
[{text:'Rename',callback_data:'rename_'+team+''},{text:'🔙Back',callback_data:'teams'}]]}})
})
}

module.exports = register_034_swap_confirm;

