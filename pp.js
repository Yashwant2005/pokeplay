function registerPanelStart(bot, deps) {
  const { getRandomAbilityForPokemon } = require('./utils/pokemon_ability');
  const {
    getUserData,
    saveUserData2,
    sendMessage,
    starters,
    pokes,
    pokemoves,
    dmoves,
    growth_rates,
    chart,
    getRandomNature,
    generateRandomIVs,
    applyCaptureIvRules,
    word,
    c,
    he
  } = deps;

  function normalizeName(name) {
    return String(name || '').trim().toLowerCase().replace(/ /g, '-');
  }

  function pickStarter() {
    const regions = Object.keys(starters || {});
    if (!regions.length) return null;
    const region = regions[Math.floor(Math.random() * regions.length)];
    const list = starters[region] || [];
    if (!list.length) return null;
    const picked = list[Math.floor(Math.random() * list.length)];
    return { region, name: normalizeName(picked) };
  }

  function buildStarterMoves(pokeName, level) {
    const entry = pokemoves[pokeName];
    if (!entry || !Array.isArray(entry.moves_info)) return [];
    const learnable = entry.moves_info
      .filter((mv) => mv.learn_method === 'level-up' && mv.level_learned_at <= level)
      .map((mv) => mv.id)
      .filter((id) => dmoves[String(id)] && dmoves[String(id)].power && dmoves[String(id)].accuracy);
    const unique = Array.from(new Set(learnable));
    return unique.slice(-4);
  }

  bot.command('start', async (ctx) => {
    const data = await getUserData(ctx.from.id);
    if (data && Array.isArray(data.pokes) && data.pokes.length > 0) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You are already registered.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const starter = pickStarter();
    if (!starter || !pokes[starter.name]) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Starter data not found.*');
      return;
    }

    const level = 5;
    const growth = growth_rates[starter.name];
    const exp = growth && chart[growth.growth_rate] ? chart[growth.growth_rate][level] : 0;
    const ivs = await generateRandomIVs('common');
    const evs = { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 };
    const moves = buildStarterMoves(starter.name, level);
    const pass = word(8);
    const nature = getRandomNature();

    const pokemon = {
      name: starter.name,
      id: pokes[starter.name].pokedex_number,
      nature,
      ability: getRandomAbilityForPokemon(starter.name, pokes),
      held_item: 'none',
      exp,
      pass,
      ivs: applyCaptureIvRules(ivs),
      evs,
      moves,
      symbol: ''
    };

    const userData = {
      inv: {
        name: he.encode(ctx.from.first_name),
        exp: 0,
        pc: 0,
        pass: 0
      },
      balls: {},
      pokes: [pokemon],
      extra: {}
    };

    // Initialize all ball types to 0, give a few regular balls
    const ballTypes = ['regular', 'great', 'ultra', 'master', 'safari', 'level', 'friend', 'moon', 'sport', 'net', 'nest', 'premier', 'repeat', 'luxury', 'quick', 'park', 'origin', 'beast'];
    for (const bt of ballTypes) userData.balls[bt] = 0;
    userData.balls.regular = 10;

    await saveUserData2(ctx.from.id, userData);

    const msg = '*Registered!*\n\n' +
      '*Starter:* ' + c(starter.name) + '\n' +
      '*Region:* ' + c(starter.region);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerPanelStart;
