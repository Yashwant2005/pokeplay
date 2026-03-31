function register_008_pkisvs(bot, deps) {
  const { getUserData, editMessage, pokes, calculateTotal, Stats } = deps;
  const legacyStatsCard = require('../../utils/pokemon_stats_card_legacy');
  const privateStatsCard = require('../../utils/pokemon_stats_card_v2');
  const { getPokemonStatsCardMode, resolvePokemonCardOptions } = privateStatsCard;
  bot.action(/pkisvs_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(id!=ctx.from.id){
return
}
const data = await getUserData(ctx.from.id)
const p2 = data.pokes.filter((poke)=> poke.pass == pass)[0]
const buildPokemonCardKeyboard = getPokemonStatsCardMode(data) === 'legacy'
  ? legacyStatsCard.buildPokemonCardKeyboard
  : privateStatsCard.buildPokemonCardKeyboard
const ivs = p2.ivs
const evs = p2.evs
let ivsText = ''
    ivsText += '\nStats          IV |  EV\n';
    ivsText += '————————————————————————\n';
    ivsText += `HP              ${ivs.hp.toString().padStart(2)} |  ${evs.hp}\n`;
    ivsText += `Attack          ${ivs.attack.toString().padStart(2)} |  ${evs.attack}\n`;
    ivsText += `Defense         ${ivs.defense.toString().padStart(2)} |  ${evs.defense}\n`;
    ivsText += `Sp. Attack      ${ivs.special_attack.toString().padStart(2)} |  ${evs.special_attack}\n`;
    ivsText += `Sp. Defense     ${ivs.special_defense.toString().padStart(2)} |  ${evs.special_defense}\n`;
    ivsText += `Speed           ${ivs.speed.toString().padStart(2)} |  ${evs.speed}\n`;
    ivsText += '————————————————————————\n';
    ivsText += `Total           ${calculateTotal(ivs)} |  ${calculateTotal(evs)}\n`;
 const cardOptions = resolvePokemonCardOptions(data)
 await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'`'+ivsText+'`',{parse_mode:'markdownv2',reply_markup:{inline_keyboard: buildPokemonCardKeyboard(p2, id, cardOptions)}})
})
}

module.exports = register_008_pkisvs;
