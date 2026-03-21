function registerItemResetCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function normalizeName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-');
  }

  function resetPokemonItemFields(pokemon) {
    if (!pokemon || typeof pokemon !== 'object') return false;
    let changed = false;
    const itemFields = ['held_item', 'heldItem', 'item'];
    for (const field of itemFields) {
      if (Object.prototype.hasOwnProperty.call(pokemon, field) && String(pokemon[field] || '').toLowerCase() !== 'none') {
        pokemon[field] = 'none';
        changed = true;
      }
    }
    if (!Object.prototype.hasOwnProperty.call(pokemon, 'held_item')) {
      pokemon.held_item = 'none';
      changed = true;
    }
    return changed;
  }

  bot.command('itemreset', async ctx => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (!Array.isArray(data.pokes) || data.pokes.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You do not have any pokemon yet.', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const rawName = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    if (!rawName) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Usage: */itemreset <pokemon>*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const target = normalizeName(rawName);
    const matched = data.pokes.filter((pk) => {
      const byNick = normalizeName(pk.nickname || '') === normalizeName(rawName);
      const bySpecies = normalizeName(pk.name || '') === target;
      return byNick || bySpecies;
    });

    if (matched.length < 1) {
      const names = data.pokes.map((poke) => poke.nickname || poke.name);
      const matches = stringSimilarity.findBestMatch(target, names);
      const bestMatch = matches.bestMatch && matches.bestMatch.target;
      const similarity = matches.bestMatch ? matches.bestMatch.rating : 0;

      if (bestMatch && similarity > 0.4 && target.length > 3) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No exact match. Did you mean *' + c(bestMatch) + '*?', {
          reply_to_message_id: ctx.message.message_id
        });
      } else {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'No *Matching* found with this *Name.*', {
          reply_to_message_id: ctx.message.message_id
        });
      }
      return;
    }

    let changed = 0;
    for (const pk of matched) {
      if (resetPokemonItemFields(pk)) changed += 1;
    }

    await saveUserData2(ctx.from.id, data);

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Item reset complete.*\n'
        + 'Matched pokemon: *' + matched.length + '*\n'
        + 'Updated pokemon: *' + changed + '*\n'
        + 'All item fields are now set to *none* for matched pokemon.',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerItemResetCommand;
