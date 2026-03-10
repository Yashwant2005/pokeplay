function register_030_remove(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/remove_/,check2q,async ctx => {
const userData = await getUserData(ctx.from.id);
const team = ctx.callbackQuery.data.split('_')[1]
let pokes = userData.pokes
const buttonsPerRow = 2;
let inlineKeyboard = [];
let row = [];
let buttonNumber = 1; // Initialize the button number
const pok = userData.teams[team]
for(const sl of pok){
for(const sl2 of pokes){
if(sl==sl2.pass){
row.push({
      text: `${buttonNumber}. ${sl2.name}`,
      callback_data: `rjem_${sl2.pass}_${team}`,
    });
    if (row.length === buttonsPerRow || buttonNumber === pokes.length - 1) {
      inlineKeyboard.push(row);
      row = [];
    }
    buttonNumber++; // Increment the button number
  }
}
}
if (row.length > 0 && row.length < buttonsPerRow) {
  while (row.length < buttonsPerRow) {
    row.push({ text: ' ', callback_data: 'empty' });
  }
  inlineKeyboard.push(row);
}
inlineKeyboard.push([{ text: '🔙Back', callback_data: 'set_'+team+'' }]);
let messageText = '';
messageText += '\n*Select Poke To Remove From Team ' + team + '*';
const keyboard = {
  inline_keyboard: inlineKeyboard,
};
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,messageText,{parse_mode:'markdown',reply_markup:keyboard})
})
}

module.exports = register_030_remove;

