function registerSpinCallbacks(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');

  const SPIN_CONFIG_PATH = path.join(process.cwd(), 'data', 'spin_event.json');

  const getDefaultSpinConfig = () => ({
    enabled: false,
    dailySpins: 10,
    startAtUtc: null,
    endAtUtc: null
  });

  const loadSpinConfig = () => {
    try {
      if (!fs.existsSync(SPIN_CONFIG_PATH)) return getDefaultSpinConfig();
      const parsed = JSON.parse(fs.readFileSync(SPIN_CONFIG_PATH, 'utf8'));
      const defaults = getDefaultSpinConfig();
      return {
        enabled: !!parsed.enabled,
        dailySpins: Number.isFinite(parsed.dailySpins) ? Math.max(1, Math.min(100, Math.floor(parsed.dailySpins))) : defaults.dailySpins,
        startAtUtc: parsed.startAtUtc || defaults.startAtUtc,
        endAtUtc: parsed.endAtUtc || defaults.endAtUtc
      };
    } catch (_) {
      return getDefaultSpinConfig();
    }
  };

  const parseUtcMillis = (value) => {
    if (!value) return null;
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  };

  const isSpinEventActive = (config) => {
    if (!config.enabled) return false;
    const now = Date.now();
    const start = parseUtcMillis(config.startAtUtc);
    const end = parseUtcMillis(config.endAtUtc);
    if (start !== null && now < start) return false;
    if (end !== null && now >= end) return false;
    return true;
  };

  const getUtcMidnightCountdown = () => {
    const next = moment.utc().add(1, 'day').startOf('day');
    const totalSec = Math.max(0, next.diff(moment.utc(), 'seconds'));
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return hours + ':' + mins + ':' + secs;
  };

  const isRestrictedSpinForm = (name) => {
    const normalized = String(name || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return (
      normalized.includes('mega') ||
      normalized.includes('gigantamax') ||
      normalized.includes('eternamax') ||
      normalized.includes('terastal') ||
      normalized.includes('stellar')
    );
  };

  const ensureSpinState = (data, config) => {
    const today = moment.utc().format('YYYY-MM-DD');
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.spinEvent || typeof data.extra.spinEvent !== 'object') {
      data.extra.spinEvent = { date: today, remaining: config.dailySpins, candidate: null, selectedName: null, awaitingName: false };
      return;
    }
    if (data.extra.spinEvent.date !== today) {
      data.extra.spinEvent.date = today;
      data.extra.spinEvent.remaining = config.dailySpins;
      data.extra.spinEvent.candidate = null;
      data.extra.spinEvent.selectedName = null;
      data.extra.spinEvent.awaitingName = false;
    }
    if (!Number.isFinite(data.extra.spinEvent.remaining)) {
      data.extra.spinEvent.remaining = config.dailySpins;
    }
    if (data.extra.spinEvent.remaining < 0) data.extra.spinEvent.remaining = 0;
  };

  const resolveToBaseForm = (name) => {
    const seen = new Set();
    let current = String(name || '').toLowerCase();

    while (current && !seen.has(current)) {
      seen.add(current);
      const preEvolution = (chains?.evolution_chains || []).find((row) => row.evolved_pokemon === current);
      if (!preEvolution || !preEvolution.current_pokemon) {
        break;
      }
      current = String(preEvolution.current_pokemon).toLowerCase();
    }

    return current || String(name || '').toLowerCase();
  };

  const createSpinCandidate = async (name) => {
    const baseName = resolveToBaseForm(name);
    let ivs;
    try {
      ivs = await generateRandomIVs(String(spawn[baseName] || '').toLowerCase());
    } catch (_) {
      ivs = {
        hp: Math.floor(Math.random() * 32),
        attack: Math.floor(Math.random() * 32),
        defense: Math.floor(Math.random() * 32),
        special_attack: Math.floor(Math.random() * 32),
        special_defense: Math.floor(Math.random() * 32),
        speed: Math.floor(Math.random() * 32)
      };
    }

    return {
      name: baseName,
      level: 1,
      nature: getRandomNature(),
      ivs,
      createdAt: Date.now()
    };
  };

  const buildLevelUpMoves = (pokeName, level) => {
    const moves = pokemoves[pokeName];
    if (!moves || !Array.isArray(moves.moves_info)) return [];

    const levelUpMoves = moves.moves_info.filter((move) =>
      move.learn_method === 'level-up' &&
      move.level_learned_at <= level * 1 &&
      dmoves[move.id] &&
      dmoves[move.id].power &&
      dmoves[move.id].accuracy
    );

    const maxMoves = Math.min(Math.max(levelUpMoves.length, 1), 4);
    return levelUpMoves.slice(-maxMoves).map((m) => m.id);
  };

  const buildFallbackMoves = () => {
    const ids = Object.keys(dmoves || {})
      .map((id) => Number(id))
      .filter((id) => {
        const mv = dmoves[id];
        return mv && mv.category !== 'status' && Number(mv.power) > 0 && Number(mv.accuracy) > 0;
      });

    const out = [];
    while (out.length < 4 && ids.length > 0) {
      const idx = Math.floor(Math.random() * ids.length);
      out.push(ids.splice(idx, 1)[0]);
    }
    return out;
  };

  const buildPokemonFromCandidate = async (candidate) => {
    const pokeName = resolveToBaseForm(candidate.name);
    const pokeInfo = pokes[pokeName];
    if (!pokeInfo) return null;

    const growth = growth_rates[pokeName];
    const level = 1;
    if (!growth || !chart[growth.growth_rate]) return null;

    const expTable = chart[growth.growth_rate];
    const exp = expTable[level] !== undefined ? expTable[level] : (expTable[100] !== undefined ? expTable[100] : 0);

    let moves = buildLevelUpMoves(pokeName, level);
    if (!moves.length) moves = buildFallbackMoves();

    return {
      name: pokeName,
      id: pokeInfo.pokedex_number,
      nature: String(candidate.nature || getRandomNature()).toLowerCase(),
      ability: getRandomAbilityForPokemon(pokeName, pokes),
      exp,
      pass: word(8),
      ivs: {
        hp: Number(candidate.ivs?.hp || 0),
        attack: Number(candidate.ivs?.attack || 0),
        defense: Number(candidate.ivs?.defense || 0),
        special_attack: Number(candidate.ivs?.special_attack || 0),
        special_defense: Number(candidate.ivs?.special_defense || 0),
        speed: Number(candidate.ivs?.speed || 0)
      },
      symbol: '',
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        special_attack: 0,
        special_defense: 0,
        speed: 0
      },
      moves
    };
  };

  const formatCandidateMessage = (candidate, remaining) => {
    return [
      '*Pokeplay Commemorative Spin*',
      '',
      '*Pokemon:* ' + c(candidate.name),
      '*Level:* ' + candidate.level,
      '*Nature:* ' + c(candidate.nature),
      '*IVs:*',
      '- HP: ' + candidate.ivs.hp,
      '- Attack: ' + candidate.ivs.attack,
      '- Defense: ' + candidate.ivs.defense,
      '- Sp. Attack: ' + candidate.ivs.special_attack,
      '- Sp. Defense: ' + candidate.ivs.special_defense,
      '- Speed: ' + candidate.ivs.speed,
      '',
      '*Spins left today:* ' + remaining,
      '',
      '_Respin for new nature/IVs. Confirming will consume all remaining spins for today._'
    ].join('\n');
  };

  const formatFinalMessage = (pk) => {
    return [
      '*Spin Confirmed*',
      '',
      '*Pokemon:* ' + c(pk.name),
      '*Nature:* ' + c(pk.nature),
      '*Level:* 1',
      '*IVs:*',
      '- HP: ' + pk.ivs.hp,
      '- Attack: ' + pk.ivs.attack,
      '- Defense: ' + pk.ivs.defense,
      '- Sp. Attack: ' + pk.ivs.special_attack,
      '- Sp. Defense: ' + pk.ivs.special_defense,
      '- Speed: ' + pk.ivs.speed,
      '',
      '_All remaining spins for today are now consumed._'
    ].join('\n');
  };

  const activeKeyboard = (id) => ({
    inline_keyboard: [
      [
        { text: 'Respin', callback_data: 'spin_respin_' + id },
        { text: 'Confirm', callback_data: 'spin_confirm_' + id }
      ],
      [{ text: 'Cancel', callback_data: 'spin_cancel_' + id }]
    ]
  });

  bot.action(/spin_(respin|confirm|cancel)_/, check2q, async (ctx) => {
    const parts = String(ctx.callbackQuery.data || '').split('_');
    const action = parts[1];
    const id = Number(parts[2]);

    if (ctx.from.id !== id) {
      ctx.answerCbQuery('Not your spin session.');
      return;
    }

    const data = await getUserData(ctx.from.id);
    if (!data.inv) {
      ctx.answerCbQuery('Start your journey first.');
      return;
    }

    const config = loadSpinConfig();
    ensureSpinState(data, config);

    const state = data.extra.spinEvent;
    if (!state || !state.candidate) {
      ctx.answerCbQuery('Use /spin first.');
      return;
    }

    if (action === 'respin') {
      if (!isSpinEventActive(config)) {
        ctx.answerCbQuery('Spin event is currently unavailable.');
        return;
      }
      if (state.remaining <= 0) {
        ctx.answerCbQuery('No spins left. Reset in ' + getUtcMidnightCountdown() + ' (UTC).');
        return;
      }

      const selectedName = state.selectedName || state.candidate.name;
      if (!selectedName || !pokes[selectedName]) {
        ctx.answerCbQuery('Use /spin and send a pokemon name first.');
        return;
      }

      if (isRestrictedSpinForm(selectedName)) {
        ctx.answerCbQuery('That form is not allowed in Spin.');
        return;
      }

      const candidate = await createSpinCandidate(selectedName);
      if (!candidate) {
        ctx.answerCbQuery('Unable to respin now.');
        return;
      }

      state.selectedName = selectedName;
      state.candidate = candidate;
      state.remaining -= 1;
      await saveUserData2(ctx.from.id, data);

      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, formatCandidateMessage(candidate, state.remaining), {
        parse_mode: 'markdown',
        reply_markup: activeKeyboard(id)
      });
      return;
    }

    if (action === 'cancel') {
      const remaining = state.remaining;
      state.candidate = null;
      state.selectedName = null;
      state.awaitingName = false;
      await saveUserData2(ctx.from.id, data);

      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id,
        '*Spin canceled.*\nYou still have *' + remaining + '* spins left for today.\n*Time remaining to claim:* ' + getUtcMidnightCountdown() + ' (resets at 00:00 UTC)\nUse /spin when ready.',
        { parse_mode: 'markdown' }
      );
      return;
    }

    const pokemon = await buildPokemonFromCandidate(state.candidate);
    if (!pokemon) {
      ctx.answerCbQuery('Unable to confirm this spin now.');
      return;
    }

    if (!Array.isArray(data.pokes)) data.pokes = [];
    data.pokes.push(pokemon);

    state.remaining = 0;
    state.candidate = null;
    state.selectedName = null;
    state.awaitingName = false;

    await saveUserData2(ctx.from.id, data);

    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, formatFinalMessage(pokemon), {
      parse_mode: 'markdown'
    });
  });
}

module.exports = registerSpinCallbacks;
