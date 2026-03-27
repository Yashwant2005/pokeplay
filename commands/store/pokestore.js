function registerPokestoreCommand(bot, deps) {
  const { sendMessage, tms, word, c } = deps;
  bot.command('pokestore', async ctx => {
    const store2 = ['buy', 'heldlp', 'tms', 'sell'];
    const store = store2.filter((storeitem) => storeitem !== 'buy');
    const buttons = store.map((word) => ({
      text: c(word === 'heldlp' ? 'held' : word),
      callback_data: 'store_' + word + '_' + ctx.from.id + ''
    }));

    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      `*Welcome To Poke Store (Buy Section)*

*PokeBalls*
- Regular Ball - 15 PC
- Great Ball - 25 PC
- Ultra Ball - 40 PC
- Repeat Ball - 50 PC
- Beast Ball - 100 PC
- Quick Ball - 65 PC
- Net Ball - 45 PC
- Nest Ball - 55 PC

*Items*
- Candy - 100 PC
- Berry - 75 PC
- Vitamin - 100 PC
- OmniRing - 5000 PC
- Zygarde Capsule - 10000 PC
- Ability Capsule - 25000 PC
- Ability Patch - 50000 PC
- Daycare Candy - 375 PC

*Held Items*
- Open *Held* to buy held items with League Points only

*Examples*
- /buy regular 1
- /buy nest 5
- /buy candy 3
- /buy omniring
- /buy zygardecapsule 1
- /buy abilitycapsule 1
- /buy abilitypatch 1
- /buy daycarecandy 1

_Use /pokeballs for Pokeball details._
_Use /buy for direct PokeCoins purchases._
_Use the Held button for held item shop._

*Weekly TM Shop*
- 10 random TMs per user each week
- Buy with League Points (minimum 1000 LP)
- Each weekly TM slot can be bought once
- Duplicate TM buy is not allowed
- Refresh weekly TM list: 10000 PokeCoins
Open it from the *Tms* button.`,
      { reply_to_message_id: ctx.message.message_id, reply_markup: { inline_keyboard: rows } }
    );
  });
}

module.exports = registerPokestoreCommand;
