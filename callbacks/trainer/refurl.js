function register_074_refurl(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/refurl_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
if(id!=ctx.from.id){
return
}
if(ctx.chat.type!='private'){
ctx.answerCbQuery('Sent Your Refer Link Into Private Chat ✅')
}
const msg = `*Hey Pokemon Fans, Introducing Pokemon Bot In Which Kanto, Jhoto, Hoenn, Hisui, Unova, Kalos , Alola, Galar And Paldea Region There.*
*• You Can Catch Legendary Pokes Too And Battle With Your Friends.*
*• All Pokemon Data Are Related To Gen 7 & 8 & 9. You Can Enjoy This Bot Given Below.*
*• Click On My Link To Get Bonus Of 1000 Pokecoins.*

_• Start your Pokemon journey now and hunt for Pokemon and battle with your friends._
*https://t.me/${bot.botInfo.username}?start=ref_${ctx.from.id}*

*Updates Channel :-* @PokePlayGame
*Main Chat :-* @PokePlayChat

*Thank You ~ ( ╹▽╹ )*`;
await sendMessage(ctx,ctx.from.id,msg,{parse_mode:'markdown'})
})
}

module.exports = register_074_refurl;

