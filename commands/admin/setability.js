function registerSetAbilityCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const fs = require('fs');
  const path = require('path');
  const CACHE_PATH = path.join(process.cwd(), 'data', 'pokemon_abilities_cache.json');

  function normalizePokemonName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function normalizeAbilityName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function titleAbility(value) {
    return String(value || '')
      .split('-')
      .map((x) => x ? x.charAt(0).toUpperCase() + x.slice(1) : x)
      .join(' ');
  }

  function upsertAbilityCache(pokemonName, abilityName) {
    let cache = {};
    try {
      if (fs.existsSync(CACHE_PATH)) {
        cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      }
    } catch (_) {
      cache = {};
    }

    const key = normalizePokemonName(pokemonName);
    const val = normalizeAbilityName(abilityName);
    if (!Array.isArray(cache[key])) cache[key] = [];
    if (!cache[key].includes(val)) cache[key].push(val);

    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
  }

  bot.command('setability', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const reply = ctx.message.reply_to_message;
    const args = String(ctx.message.text || '').trim().split(/\s+/).slice(1);

    if (!reply || args.length < 2) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Usage:* Reply to user and send `/setability <pokemon> <ability>`\nExample: `/setability greninja battle-bond`',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const pokemonName = normalizePokemonName(args[0]);
    const abilityName = normalizeAbilityName(args.slice(1).join(' '));

    if (!pokemonName || !abilityName) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid pokemon or ability.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const data = await getUserData(reply.from.id);
    if (!data.pokes || !Array.isArray(data.pokes) || data.pokes.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Target user has no Pokemon.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const targetPokemon = data.pokes.find((p) => String(p.name || '').toLowerCase() === pokemonName);
    if (!targetPokemon) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Pokemon not found on target user by that name.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    targetPokemon.ability = abilityName;
    await saveUserData2(reply.from.id, data);

    // Keep assignment cache in sync for canonical assignment flows.
    upsertAbilityCache(pokemonName, abilityName);

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      'Updated *' + c(targetPokemon.name) + '* ability for *' + c(reply.from.first_name || reply.from.id) + '*\nNew ability: *' + titleAbility(abilityName) + '*',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerSetAbilityCommand;
