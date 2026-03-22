function registerPokestoreCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
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
• Regular Ball - 15 💷
• Great Ball - 25 💷
• Ultra Ball - 40 💷
• Repeat Ball - 50 💷
• Beast Ball - 100 💷
• Quick Ball - 65 💷
• Net Ball - 45 💷
• Nest Ball - 55 💷

*Items*
• Candy - 100 💷
• Berry - 75 💷
• Vitamin - 100 💷
• Zygarde Capsule - 10000 💷
• Ability Capsule - 25000 💷
• Ability Patch - 50000 💷

*Held Items*
• Open *Held* to buy held items with League Points only

*Examples*
• /buy regular 1
• /buy nest 5
• /buy candy 3
• /buy zygardecapsule 1
• /buy abilitycapsule 1
• /buy abilitypatch 1

_Use /pokeballs for Pokeball details._
_Use /buy for direct PokeCoins purchases._
_Use the Held button for held item shop._

*Weekly TM Shop*
• 10 random TMs per user each week
• Buy with League Points (minimum 1000 LP)
• Each weekly TM slot can be bought once
• Duplicate TM buy is not allowed
• Refresh weekly TM list: 10000 PokeCoins
Open it from the *Tms* button.`,
      { reply_to_message_id: ctx.message.message_id, reply_markup: { inline_keyboard: rows } }
    );
  });
}

module.exports = registerPokestoreCommand;

