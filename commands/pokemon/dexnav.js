const { getPokemonDexnav, resolvePokemonSpecies } = require('../../utils/dexnav');

function registerDexNavCommand(bot, deps) {
  const { check, sendMessage, regions, forms, pokes, c, region } = deps;
  bot.command('dexnav', check, async (ctx) => {
    const rawName = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!rawName) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'Write a *Pokemon* name next to the command.\nExample: `/dexnav pikachu`',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const species = resolvePokemonSpecies(rawName, forms, pokes);
    if (!species) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'No *matching Pokemon* found for that name.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    let dexnav;
    try {
      dexnav = await getPokemonDexnav(species);
    } catch (error) {
      console.error('[dexnav command error]', error);
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'DexNav could not reach *PokemonDB* right now. Please try again in a bit.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (!dexnav.regions || dexnav.regions.length < 1) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        'No region location data was found for *' + c(species) + '* on PokemonDB.',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const keyboard = [];
    for (let i = 0; i < dexnav.regions.length; i += 2) {
      keyboard.push(
        dexnav.regions.slice(i, i + 2).map((region) => ({
          text: region.label,
          callback_data: 'dexnav_list:' + species + ':' + region.id + ':0_' + ctx.from.id + ''
        }))
      );
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*DexNav:* _' + c(species) + '_\n\nChoose a *region* to see where it appears.',
      {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );
  });
}

module.exports = registerDexNavCommand;
