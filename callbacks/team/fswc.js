function register_033_fswc(bot, deps) {
  const { check2q, getUserData, editMessage, pokes, c } = deps;
  bot.action(/fswc_/, check2q,async (ctx) => {
    const userData = await getUserData(ctx.from.id);


    const team = ctx.callbackQuery.data.split('_')[1];
    const selectedSlugPass = ctx.callbackQuery.data.split('_')[2];
let slugsInTeam = [];                                                                       
    if (userData && userData.teams && userData.teams[team]) {                                           
slugsInTeam = userData.teams[team];
    } else {                                                                                            
ctx.answerCbQuery('Team Is Invalid Or Empty.', { show_alert: true });
        return;                                                                                     }                                                                                                                                                                                               // Ensure that the user has the slugs with these passes                                         
const slugPasses = slugsInTeam.map((pass) => {
        const matchingSlug = userData.pokes.find((slug) => slug.pass === pass);                          
return matchingSlug ? matchingSlug.pass : '';
    });                                                                                                                                                                                             
// Filter out empty passes
    const validSlugPasses = slugPasses



    // Check if the user has a slug with the selected pass
    const selectedSlugIndex = validSlugPasses.findIndex((pass) => pass === selectedSlugPass);

    if (selectedSlugIndex === -1) {
        ctx.answerCbQuery('You not have the choosen pokemon anymore.', { show_alert: true });
        return;
    }
const p6 = userData.pokes.filter((p7) =>p7.pass==selectedSlugPass)[0]
    // Edit the message to ask for the second slug to swap
    let messageText = 'Which Pokemon You Wanna Replace With *'+c(p6.name)+'*';

    const inlineKeyboard = validSlugPasses.map((pass) => {
for(const slug of userData.pokes){
if (pass == slug.pass) {
            return {
                text: (pass==selectedSlugPass) ? ' ' : c(slug.name),
                callback_data: `swap_confirm_${team}_${selectedSlugPass}_${slug.pass}`,
            };
        }
}
        return null;
    }).filter((button) => button !== null);

    inlineKeyboard.push({ text: '🔙Back', callback_data: 'set_' + team });

    const buttonsPerRow = 2;
    const keyboardChunks = [];
    for (let i = 0; i < inlineKeyboard.length; i += buttonsPerRow) {
        keyboardChunks.push(inlineKeyboard.slice(i, i + buttonsPerRow));
    }

    const keyboard = {
        inline_keyboard: keyboardChunks,
    };

    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText, { parse_mode: 'markdown', reply_markup: keyboard });
});
}

module.exports = register_033_fswc;

