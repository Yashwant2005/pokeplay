function registerSpinCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

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

  const getSpinAvailability = (config) => {
    const now = Date.now();
    const start = parseUtcMillis(config.startAtUtc);
    const end = parseUtcMillis(config.endAtUtc);
    if (!config.enabled) return 'disabled';
    if (start !== null && now < start) return 'upcoming';
    if (end !== null && now >= end) return 'ended';
    return 'active';
  };

  const formatWindow = (config) => {
    const start = config.startAtUtc ? moment.utc(config.startAtUtc) : null;
    const end = config.endAtUtc ? moment.utc(config.endAtUtc) : null;
    if (!start || !end || !start.isValid() || !end.isValid()) {
      return 'Configured event window.';
    }

    const formatPoint = (point) => {
      const utcText = point.clone().utc().format('D/M/YY H:mm [UTC]');
      const istText = point.clone().utcOffset(330).format('h:mm A [IST]');
      return utcText + ' (' + istText + ')';
    };

    return formatPoint(start) + ' - ' + formatPoint(end);
  };

  const formatInactiveMessage = (availability, config) => {
    const statusText = availability === 'upcoming'
      ? '*Event is not active yet.*'
      : availability === 'ended'
      ? '*Event is not active anymore.*'
      : '*Event is not active right now.*';

    return [
      '*Pokeplay Commemorative Spin*',
      '',
      'Choose a Pokemon name and receive a level 1 commemorative spin with random nature and IVs.',
      '',
      '*Daily spins:* ' + config.dailySpins,
      '*Event duration:* ' + formatWindow(config),
      '',
      statusText
    ].join('\n');
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
      data.extra.spinEvent = {
        date: today,
        remaining: config.dailySpins,
        candidate: null,
        selectedName: null,
        awaitingName: false
      };
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
    if (typeof data.extra.spinEvent.awaitingName !== 'boolean') data.extra.spinEvent.awaitingName = false;
  };

  const getEligiblePokemonNames = () => {
    const all = Object.keys(pokes || {});
    return all.filter((name) => {
      const p = pokes[name];
      return !!(
        p &&
        p.pokedex_number &&
        spawn[name] &&
        growth_rates[name] &&
        pokemoves[name] &&
        Array.isArray(pokemoves[name].moves_info)
      );
    });
  };

  const normalizeName = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

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

  const resolvePokemonName = (inputName) => {
    const raw = String(inputName || '').toLowerCase().trim();
    if (!raw) return null;

    if (pokes[raw] && spawn[raw] && growth_rates[raw] && pokemoves[raw]) {
      return raw;
    }

    const hyphen = raw.replace(/\s+/g, '-');
    if (pokes[hyphen] && spawn[hyphen] && growth_rates[hyphen] && pokemoves[hyphen]) {
      return hyphen;
    }

    const target = normalizeName(raw);
    const pool = getEligiblePokemonNames();
    const exact = pool.find((name) => normalizeName(name) === target);
    if (exact) return exact;

    return null;
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

  commands.set('spin', async (ctx) => {
    const data = await getUserData(ctx.from.id);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (ctx.chat.type !== 'private') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Use this command in *Private* to use *Magic Spin*.', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Spin', url: 't.me/' + bot.botInfo.username + '?start=spin' }]] }
      });
      return;
    }

    const config = loadSpinConfig();
    const availability = getSpinAvailability(config);
    if (availability !== 'active') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, formatInactiveMessage(availability, config), {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const mdata = await loadMessageData();
    if (mdata.battle.includes(ctx.from.id)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are in a *battle*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    ensureSpinState(data, config);

    if (data.extra.spinEvent.remaining <= 0) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No spins left for today.*\n*Time remaining to claim:* ' + getUtcMidnightCountdown() + ' (resets at 00:00 UTC)', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    data.extra.spinEvent.candidate = null;
    data.extra.spinEvent.selectedName = null;
    data.extra.spinEvent.awaitingName = true;

    await saveUserData2(ctx.from.id, data);

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' },
      '*Pokeplay Commemorative Spin*\n\nSend the *Pokemon name* you want to spin.\nLevel is fixed at *1*.\n\n*Spins left today:* ' + data.extra.spinEvent.remaining,
      {
        reply_to_message_id: ctx.message.message_id
      }
    );
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.message || !ctx.message.text) return next();
    if (ctx.chat.type !== 'private') return next();
    if (ctx.message.text.startsWith('/')) return next();

    const data = await getUserData(ctx.from.id);
    if (!data.inv || !data.extra || !data.extra.spinEvent || !data.extra.spinEvent.awaitingName) {
      return next();
    }

    const config = loadSpinConfig();
    ensureSpinState(data, config);
    const availability2 = getSpinAvailability(config);
    if (availability2 !== 'active') {
      data.extra.spinEvent.awaitingName = false;
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, formatInactiveMessage(availability2, config));
      return;
    }

    if (data.extra.spinEvent.remaining <= 0) {
      data.extra.spinEvent.awaitingName = false;
      await saveUserData2(ctx.from.id, data);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*No spins left for today.*\n*Time remaining to claim:* ' + getUtcMidnightCountdown() + ' (resets at 00:00 UTC)');
      return;
    }

    const resolvedName = resolvePokemonName(ctx.message.text);
    if (!resolvedName) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' },
        '*Pokemon not found.*\nPlease send a valid pokemon name (example: `pikachu`, `mewtwo`, `giratina-origin`).'
      );
      return;
    }

    if (isRestrictedSpinForm(resolvedName)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' },
        '*That form is not allowed in Spin.*\nBlocked keywords: mega, gigantamax, eternamax, terastal, stellar.'
      );
      return;
    }

    const candidate = await createSpinCandidate(resolvedName);
    data.extra.spinEvent.selectedName = resolvedName;
    data.extra.spinEvent.candidate = candidate;
    data.extra.spinEvent.awaitingName = false;
    data.extra.spinEvent.remaining -= 1;

    await saveUserData2(ctx.from.id, data);

    const msg = formatCandidateMessage(candidate, data.extra.spinEvent.remaining);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Respin', callback_data: 'spin_respin_' + ctx.from.id },
            { text: 'Confirm', callback_data: 'spin_confirm_' + ctx.from.id }
          ],
          [{ text: 'Cancel', callback_data: 'spin_cancel_' + ctx.from.id }]
        ]
      }
    });
  });
}

module.exports = registerSpinCommand;
