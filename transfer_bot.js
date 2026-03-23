const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const {
  getUserData,
  saveUserData2,
  word,
  generateRandomIVs,
  applyCaptureIvRules,
  c,
  initDataStores
} = require('./func');
const { getKv, setKv } = require('./mongo_kv');

const pokes = JSON.parse(fs.readFileSync('data/pokemon_info55_modified2.json', 'utf8'));
const pokemoves = JSON.parse(fs.readFileSync('data/moveset_data_updated2.json', 'utf8'));
const dmoves = JSON.parse(fs.readFileSync('data/moves_info.json', 'utf8'));
const growthRates = JSON.parse(fs.readFileSync('data/pokemon_data2.json', 'utf8'));
const chart = JSON.parse(fs.readFileSync('data/exp_chart.json', 'utf8'));
const chains = JSON.parse(fs.readFileSync('data/evolution_chains2.json', 'utf8'));
const spawn = JSON.parse(fs.readFileSync('data/pokemon_status_info.json', 'utf8'));
const stones = JSON.parse(fs.readFileSync('data/stones.json', 'utf8'));

const BOT_TOKEN = '8616181555:AAHFesYbqllv11TGDDR4kNAU2rznGR_OLG8';
const ADMIN_GROUP_ID = -1003736053869;
const SOURCE_BOT_IDS = [572621020, 7955369039];
const STONES_SOURCE_BOT_IDS = [572621020, 7955369039];
const ADMINS = [6265981509, 1411248872, 8493023103, 8551864967];

const bot = new Telegraf(BOT_TOKEN);
const userState = new Map();

async function loadRequests() {
  try {
    const data = await getKv('transfer_requests', {});
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

async function saveRequests(requests) {
  await setKv('transfer_requests', requests || {});
}

function isAdmin(id) {
  return ADMINS.includes(Number(id));
}

async function isGroupAdmin(ctx, userId) {
  try {
    const member = await ctx.telegram.getChatMember(ADMIN_GROUP_ID, userId);
    const status = member && member.status;
    return status === 'administrator' || status === 'creator';
  } catch (err) {
    return false;
  }
}

function normalizePokemonName(input) {
  return String(input || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function getPreEvolutionName(name) {
  const record = (chains.evolution_chains || []).find((row) => row.evolved_pokemon === name);
  return record ? record.current_pokemon : null;
}

function getStarterMovesAtLevel(name, level) {
  const moveSet = pokemoves[name];
  if (!moveSet || !Array.isArray(moveSet.moves_info)) return [];
  const isDamaging = (id) => {
    const mv = dmoves[id];
    if (!mv) return false;
    const power = Number(mv.power);
    const accuracy = Number(mv.accuracy);
    return mv.category !== 'status' && Number.isFinite(power) && power > 0 && Number.isFinite(accuracy) && accuracy > 0;
  };
  const levelUp = moveSet.moves_info.filter((m) =>
    m.learn_method === 'level-up' &&
    Number(m.level_learned_at) < Number(level) &&
    isDamaging(m.id)
  );
  if (levelUp.length > 0) {
    const count = Math.min(Math.max(levelUp.length, 1), 4);
    return levelUp.slice(-count).map((m) => Number(m.id));
  }

  // Fallback: ensure at least one real damaging move for level 1 transfers.
  const levelUpAny = moveSet.moves_info
    .filter((m) => m.learn_method === 'level-up' && isDamaging(m.id))
    .sort((a, b) => Number(a.level_learned_at) - Number(b.level_learned_at));
  if (levelUpAny.length > 0) {
    return [Number(levelUpAny[0].id)];
  }

  const anyKnown = moveSet.moves_info.find((m) => isDamaging(m.id));
  if (anyKnown) {
    return [Number(anyKnown.id)];
  }

  return [];
}

function getMessageText(message) {
  if (!message) return '';
  return String(message.caption || message.text || '');
}

function parseNature(text) {
  const match = String(text || '').match(/Nature\s*:\s*([A-Za-z-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function normalizeLabel(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIvFromText(text) {
  const rows = String(text || '').split('\n');
  const out = {};

  const mapLabel = (label) => {
    const l = normalizeLabel(label);
    if (l === 'hp') return 'hp';
    if (l === 'attack' || l === 'atk') return 'attack';
    if (l === 'defense' || l === 'def') return 'defense';
    if (l === 'sp attack' || l === 'special attack' || l === 'spa') return 'special_attack';
    if (l === 'sp defense' || l === 'special defense' || l === 'spd') return 'special_defense';
    if (l === 'speed' || l === 'spe') return 'speed';
    return null;
  };

  for (const row of rows) {
    const m = row.match(/^\s*([A-Za-z.\s]+?)\s+(\d+)\s*\|\s*(\d+)/i);
    if (!m) continue;
    const key = mapLabel(m[1]);
    if (!key) continue;
    out[key] = Math.max(0, Math.min(31, Number(m[2])));
  }

  const needed = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'];
  for (const key of needed) {
    if (typeof out[key] !== 'number' || isNaN(out[key])) {
      return null;
    }
  }
  return out;
}

function normalizeStoneName(input) {
  const normalized = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[–—−‑‒]/g, '-')
    .replace(/[_.\s]+/g, '-');
  const aliases = {
    dragoninite: 'dragoniteite',
    excadrite: 'excadrillite',
    excadrilite: 'excadrillite'
  };
  return aliases[normalized] || normalized;
}

function parseStonesFromText(text) {
  const out = [];
  const lines = String(text || '').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const slashMatch = trimmed.match(/^\/([A-Za-z0-9_-]+)/);
    if (slashMatch) {
      const key = normalizeStoneName(slashMatch[1]);
      if (stones[key]) out.push(key);
      continue;
    }
    const numberedMatch = trimmed.match(/^\d+\.\s*([A-Za-z0-9' -]+)\s*:\s*(\d+)/);
    if (numberedMatch) {
      const key = normalizeStoneName(numberedMatch[1]);
      const count = Math.max(0, Number(numberedMatch[2]));
      if (stones[key] && Number.isFinite(count)) {
        for (let i = 0; i < count; i++) out.push(key);
      }
      continue;
    }
    const plainMatch = trimmed.match(/^([A-Za-z0-9' -]+)\s*:\s*(\d+)/);
    if (plainMatch) {
      const key = normalizeStoneName(plainMatch[1]);
      const count = Math.max(0, Number(plainMatch[2]));
      if (stones[key] && Number.isFinite(count)) {
        for (let i = 0; i < count; i++) out.push(key);
      }
    }
  }
  return out;
}

function parseKeyStoneStatus(text) {
  const m = String(text || '').match(/Key\s*Stone[^:]*:\s*([^\n]+)/i);
  return m ? m[1].trim() : null;
}

function formatStoneCounts(stoneList) {
  const counts = {};
  for (const key of stoneList) {
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.keys(counts)
    .map((key) => `${c(key)}${counts[key] > 1 ? ' x' + counts[key] : ''}`)
    .join(', ');
}

function requestFingerprint(pokemonName, nature, ivs) {
  return [
    String(pokemonName || '').toLowerCase(),
    String(nature || '').toLowerCase(),
    `hp:${ivs.hp}`,
    `atk:${ivs.attack}`,
    `def:${ivs.defense}`,
    `spa:${ivs.special_attack}`,
    `spd:${ivs.special_defense}`,
    `spe:${ivs.speed}`
  ].join('|');
}

function buildPokemonEntry(name, nature, ivs, shiny) {
  const growth = growthRates[name];
  const level = 1;
  if (!growth || !chart[growth.growth_rate] || chart[growth.growth_rate][level] === undefined) {
    throw new Error(`Missing exp chart for ${name}`);
  }

  return {
    name,
    id: pokes[name].pokedex_number,
    nature,
    exp: chart[growth.growth_rate][level],
    pass: word(8),
    ivs,
    symbol: shiny ? '?' : '',
    evs: {
      hp: 0,
      attack: 0,
      defense: 0,
      special_attack: 0,
      special_defense: 0,
      speed: 0
    },
    moves: getStarterMovesAtLevel(name, level)
  };
}

async function addApprovedPokemonToUser(userId, pokemonName, nature, providedIvs, shiny) {
  const data = await getUserData(userId);
  if (!data.inv) {
    throw new Error('User has no main-bot profile yet. Ask user to /start in main bot first.');
  }

  if (!Array.isArray(data.pokes)) {
    data.pokes = [];
  }
  if (!Array.isArray(data.pokecaught)) {
    data.pokecaught = [];
  }
  if (!Array.isArray(data.pokeseen)) {
    data.pokeseen = [];
  }

  const baseIvs = applyCaptureIvRules(
    providedIvs || generateRandomIVs((spawn[pokemonName] || '').toLowerCase()),
    { isShiny: shiny }
  );
  const safeNature = nature || 'hardy';

  const addedNames = [];

  const mainEntry = buildPokemonEntry(pokemonName, safeNature, baseIvs, shiny);
  data.pokes.push(mainEntry);
  addedNames.push(pokemonName);

  for (const nm of addedNames) {
    if (!data.pokecaught.includes(nm)) data.pokecaught.push(nm);
    if (!data.pokeseen.includes(nm)) data.pokeseen.push(nm);
  }

  await saveUserData2(userId, data);
  return addedNames;
}

async function addApprovedStonesToUser(userId, stoneKeys, hasKeyStone) {
  const data = await getUserData(userId);
  if (!data.inv) {
    throw new Error('User has no main-bot profile yet. Ask user to /start in main bot first.');
  }

  if (!Array.isArray(data.inv.stones)) {
    data.inv.stones = [];
  }

  const added = [];
  for (const key of stoneKeys) {
    data.inv.stones.push(key);
    added.push(key);
  }

  if (hasKeyStone) {
    data.inv.ring = true;
  }

  await saveUserData2(userId, data);
  return added;
}

function isForwardedFromSource(message) {
  const forwardFrom = message && message.forward_from;
  return Boolean(forwardFrom && SOURCE_BOT_IDS.includes(Number(forwardFrom.id)));
}

function userLink(user) {
  if (user.username) return '@' + user.username;
  return `<a href="tg://user?id=${user.id}">${user.first_name || 'User'}</a>`;
}

function formatSourceBot(sourceId) {
  if (Number(sourceId) === 572621020) return 'Source Bot: 572621020 (hexamonbot)';
  if (Number(sourceId) === 7955369039) return 'Source Bot: 7955369039 (poketalesxbot)';
  return `Source Bot: ${sourceId || 'unknown'}`;
}

bot.start(async (ctx) => {
  await ctx.reply(
    'Transfer bot is active.\n\nUse /add to submit a Pokemon transfer request.\nFlow: Pokemon name -> nature page -> IV/EV page -> admin approval.\n\nUse /stones to submit a stones transfer request from hexamonbot or poketalesxbot.'
  );
});

bot.command('cancel', async (ctx) => {
  if (ctx.chat.type !== 'private') {
    return;
  }
  userState.delete(ctx.from.id);
  await ctx.reply('Current transfer request canceled.');
});

bot.command('add', async (ctx) => {
  if (ctx.chat.type !== 'private') {
    await ctx.reply('Use /add in private chat with this bot.');
    return;
  }

  const argName = normalizePokemonName(ctx.message.text.split(' ').slice(1).join(' '));
  if (argName) {
    if (!pokes[argName]) {
      await ctx.reply('Invalid pokemon name. Try again with correct spelling.');
      return;
    }
    userState.set(ctx.from.id, {
      step: 'await_nature',
      pokemonName: argName
    });
    await ctx.reply(`Pokemon selected: ${c(argName)}\nNow forward the Nature page from source bot.`);
    return;
  }

  userState.set(ctx.from.id, { step: 'await_name' });
  await ctx.reply('Send pokemon name. Example: /add pikachu or just send: pikachu');
});

bot.command('stones', async (ctx) => {
  if (ctx.chat.type !== 'private') {
    await ctx.reply('Use /stones in private chat with this bot.');
    return;
  }

  userState.set(ctx.from.id, { step: 'stones_await_forward' });
  await ctx.reply(
    'Forward your stones page from hexamonbot or poketalesxbot only.\n\n' +
    'Format 1 (hexamonbot):\n' +
    'Key Stone 🧿: Not Equipped\n' +
    '/Banettite\n/Sablenite\n/Lopunnite\n/Medichamite\n\n' +
    'Format 2 (poketalesxbot):\n' +
    'Your Mega Stones:\n' +
    '1. Delphoxite: 1\n' +
    '2. Manectite: 1\n' +
    '3. Dragoninite: 1\n' +
    '4. Mawilite: 2\n' +
    '5. Excadrite: 1\n\n' +
    'After that, I will ask you for a screenshot proof with your name visible.'
  );
});

bot.on('message', async (ctx, next) => {
  if (ctx.chat.type !== 'private') {
    return next();
  }

  const state = userState.get(ctx.from.id);
  if (!state) return next();

  if (state.step === 'stones_await_forward') {
    if (!ctx.message.forward_date || !ctx.message.forward_from || !STONES_SOURCE_BOT_IDS.includes(Number(ctx.message.forward_from.id))) {
      await ctx.reply('Forward the stones page from hexamonbot or poketalesxbot only.');
      return;
    }

    const text = getMessageText(ctx.message);
    const stoneKeys = parseStonesFromText(text);
    if (stoneKeys.length < 1) {
      await ctx.reply('No valid stones found. Please forward the stones page again from hexamonbot or poketalesxbot.');
      return;
    }

    const keyStoneStatus = parseKeyStoneStatus(text);
    state.stones = stoneKeys;
    state.keyStoneStatus = keyStoneStatus;
    state.sourceBotId = ctx.message.forward_from.id;
    state.forwardChatId = ctx.chat.id;
    state.forwardMessageId = ctx.message.message_id;
    state.step = 'stones_await_proof';
    userState.set(ctx.from.id, state);
    await ctx.reply('Now send a screenshot proof with your name visible. Do not forward it.');
    return;
  }

  if (state.step === 'stones_await_proof') {
    if (ctx.message.forward_date) {
      await ctx.reply('Send a normal screenshot, not a forwarded message.');
      return;
    }
    if (!ctx.message.photo || ctx.message.photo.length < 1) {
      await ctx.reply('Screenshot proof must be a photo.');
      return;
    }

    const proofPhotoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const requests = await loadRequests();
    const reqId = word(12);

    requests[reqId] = {
      id: reqId,
      type: 'stones',
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: ctx.from.id,
      userTag: ctx.from.username ? '@' + ctx.from.username : null,
      sourceBotId: state.sourceBotId,
      stones: state.stones || [],
      keyStoneStatus: state.keyStoneStatus || null,
      forwardChatId: state.forwardChatId,
      forwardMessageId: state.forwardMessageId,
      proofPhotoId
    };
    await saveRequests(requests);

    try {
      await bot.telegram.forwardMessage(ADMIN_GROUP_ID, state.forwardChatId, state.forwardMessageId);
    } catch (err) {
      await ctx.reply('Failed to forward the stones page to admins. Please try again.');
      userState.delete(ctx.from.id);
      return;
    }

    const summary = [
      '<b>New Stones Transfer Request</b>',
      '',
      `<b>Req ID:</b> <code>${reqId}</code>`,
      `<b>User:</b> ${userLink(ctx.from)} (<code>${ctx.from.id}</code>)`,
      `<b>Source:</b> ${formatSourceBot(state.sourceBotId)}`,
      `<b>Key Stone:</b> ${state.keyStoneStatus ? state.keyStoneStatus : 'Unknown'}`,
      `<b>Stones:</b> ${formatStoneCounts(state.stones)}`
    ].join('\n');

    const adminMarkup = {
      inline_keyboard: [[
        { text: 'Approve', callback_data: 'sapprove_' + reqId },
        { text: 'Reject', callback_data: 'sreject_' + reqId }
      ]]
    };

    await bot.telegram.sendPhoto(ADMIN_GROUP_ID, proofPhotoId, {
      caption: summary,
      parse_mode: 'HTML',
      reply_markup: adminMarkup
    });

    userState.delete(ctx.from.id);
    await ctx.reply('Stones request submitted to admins. You will be notified after approval.');
    return;
  }

  if (state.step === 'await_name') {
    const name = normalizePokemonName(ctx.message.text || '');
    if (!name || !pokes[name]) {
      await ctx.reply('Invalid pokemon name. Send valid name like: charizard');
      return;
    }
    state.pokemonName = name;
    state.step = 'await_nature';
    userState.set(ctx.from.id, state);
    await ctx.reply(`Pokemon selected: ${c(name)}\nForward Nature page from source bot.`);
    return;
  }

  if (state.step === 'await_nature') {
    if (!ctx.message.forward_date || !isForwardedFromSource(ctx.message)) {
      await ctx.reply('Forward the Nature page from the source bot only.');
      return;
    }
    if (!ctx.message.photo || ctx.message.photo.length < 1) {
      await ctx.reply('Nature step requires forwarded image from source bot.');
      return;
    }
    const natureText = getMessageText(ctx.message);

    state.nature = parseNature(natureText);
    if (!state.nature) {
      await ctx.reply('Could not detect nature. Nature page should contain "Nature: ..."');
      return;
    }

    state.naturePhotoId = ctx.message.photo && ctx.message.photo.length ? ctx.message.photo[ctx.message.photo.length - 1].file_id : null;
    state.sourceBotId = ctx.message.forward_from ? ctx.message.forward_from.id : null;
    state.step = 'await_ivs';
    userState.set(ctx.from.id, state);
    await ctx.reply('Nature received. Now forward IV/EV page from source bot.\nMoveset page is not required.');
    return;
  }

  if (state.step === 'await_ivs') {
    if (!ctx.message.forward_date || !isForwardedFromSource(ctx.message)) {
      await ctx.reply('Forward the IV/EV page from the source bot only.');
      return;
    }
    if (!ctx.message.photo || ctx.message.photo.length < 1) {
      await ctx.reply('IV/EV step requires forwarded image from source bot.');
      return;
    }
    const ivPhotoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    if (!state.naturePhotoId || ivPhotoId !== state.naturePhotoId) {
      await ctx.reply('Nature and IV/EV must be from the same forwarded image. Please restart with /add.');
      return;
    }
    const ivText = getMessageText(ctx.message);

    const parsedIvs = parseIvFromText(ivText);
    if (!parsedIvs) {
      await ctx.reply('Could not parse IV table. Please forward a proper IV/EV page with stat rows.');
      return;
    }

    const requests = await loadRequests();
    const reqId = word(12);
    const shiny = /\bshiny\b/i.test(ivText) || /\bshiny\b/i.test(state.pokemonName);
    const fingerprint = requestFingerprint(state.pokemonName, state.nature, parsedIvs);
    const duplicates = Object.values(requests).filter((r) =>
      r &&
      r.fingerprint === fingerprint &&
      r.id !== reqId &&
      ['pending', 'approved', 'rejected', 'failed'].includes(r.status)
    );

    requests[reqId] = {
      id: reqId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: ctx.from.id,
      userTag: ctx.from.username ? '@' + ctx.from.username : null,
      pokemonName: state.pokemonName,
      nature: state.nature,
      ivs: parsedIvs,
      shiny,
      fingerprint,
      duplicateOf: duplicates.map((d) => d.id)
    };
    await saveRequests(requests);

    const summary = [
      '<b>New Transfer Request</b>',
      '',
      `<b>Req ID:</b> <code>${reqId}</code>`,
      `<b>User:</b> ${userLink(ctx.from)} (<code>${ctx.from.id}</code>)`,
      `<b>${formatSourceBot(state.sourceBotId)}</b>`,
      `<b>Pokemon:</b> ${c(state.pokemonName)}`,
      `<b>Nature:</b> ${c(state.nature)}`,
      `<b>IVs:</b> HP ${parsedIvs.hp}, Atk ${parsedIvs.attack}, Def ${parsedIvs.defense}, SpA ${parsedIvs.special_attack}, SpD ${parsedIvs.special_defense}, Spe ${parsedIvs.speed}`,
      `<b>Shiny:</b> ${shiny ? 'Yes' : 'No'}`,
      `<b>Duplicate Check:</b> ${duplicates.length > 0 ? 'Duplicate Found' : 'No Duplicate'}`,
      '',
      'Approve to add this pokemon to main bot at level 1.'
    ].join('\n');

    const duplicateLines = duplicates.slice(0, 10).map((d) =>
      `• <code>${d.id}</code> | user <code>${d.userId}</code> | status <b>${d.status}</b>`
    );
    const duplicateNote = duplicates.length > 0
      ? `\n\n⚠️ <b>Duplicate Submission Alert</b>\nSame pokemon+nature+IV already exists:\n${duplicateLines.join('\n')}`
      : '';

    const adminMarkup = {
      inline_keyboard: [[
        { text: 'Approve', callback_data: 'tapprove_' + reqId },
        { text: 'Reject', callback_data: 'treject_' + reqId }
      ]]
    };

    if (state.naturePhotoId) {
      await bot.telegram.sendPhoto(ADMIN_GROUP_ID, state.naturePhotoId, {
        caption: summary + duplicateNote,
        parse_mode: 'HTML',
        reply_markup: adminMarkup
      });
    } else {
      await bot.telegram.sendMessage(ADMIN_GROUP_ID, summary + duplicateNote, {
        parse_mode: 'HTML',
        reply_markup: adminMarkup
      });
    }

    userState.delete(ctx.from.id);
    await ctx.reply('Request submitted to admins. You will be notified after approve/reject.');
    return;
  }

  return next();
});

bot.action(/tapprove_/, async (ctx) => {
  if (ctx.chat && ctx.chat.id !== ADMIN_GROUP_ID) {
    await ctx.answerCbQuery('Not allowed here.');
    return;
  }
  const allowed = isAdmin(ctx.from.id) || await isGroupAdmin(ctx, ctx.from.id);
  if (!allowed) {
    await ctx.answerCbQuery('Not allowed.');
    return;
  }

  const reqId = ctx.callbackQuery.data.split('_')[1];
  const requests = await loadRequests();
  const req = requests[reqId];

  if (!req) {
    await ctx.answerCbQuery('Request not found.');
    return;
  }
  if (req.status !== 'pending') {
    await ctx.answerCbQuery('Already processed.');
    return;
  }

  try {
    const addedNames = await addApprovedPokemonToUser(req.userId, req.pokemonName, req.nature, req.ivs, req.shiny);
    req.status = 'approved';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = ctx.from.id;
    req.added = addedNames;
    requests[reqId] = req;
    await saveRequests(requests);

    const done = [
      '<b>Approved</b>',
      `<b>Req ID:</b> <code>${reqId}</code>`,
      `<b>By:</b> ${userLink(ctx.from)} (<code>${ctx.from.id}</code>)`,
      `<b>Added:</b> ${addedNames.map((n) => c(n)).join(', ')}`
    ].join('\n');

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(done);

    await bot.telegram.sendMessage(
      req.userId,
      `Transfer approved. Added to main bot: ${addedNames.map((n) => c(n)).join(', ')}`
    );

    await ctx.answerCbQuery('Approved.');
  } catch (err) {
    req.status = 'failed';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = ctx.from.id;
    req.error = String(err.message || err);
    requests[reqId] = req;
    await saveRequests(requests);

    await ctx.answerCbQuery('Approve failed.');
    await ctx.replyWithHTML(`<b>Approve failed</b>\nReq: <code>${reqId}</code>\nError: <code>${String(err.message || err)}</code>`);
  }
});

bot.action(/sapprove_/, async (ctx) => {
  if (ctx.chat && ctx.chat.id !== ADMIN_GROUP_ID) {
    await ctx.answerCbQuery('Not allowed here.');
    return;
  }
  const allowed = isAdmin(ctx.from.id) || await isGroupAdmin(ctx, ctx.from.id);
  if (!allowed) {
    await ctx.answerCbQuery('Not allowed.');
    return;
  }

  const reqId = ctx.callbackQuery.data.split('_')[1];
  const requests = await loadRequests();
  const req = requests[reqId];

  if (!req || req.type !== 'stones') {
    await ctx.answerCbQuery('Request not found.');
    return;
  }
  if (req.status !== 'pending') {
    await ctx.answerCbQuery('Already processed.');
    return;
  }

  try {
    const hasKeyStone = Boolean(req.keyStoneStatus);
    const added = await addApprovedStonesToUser(req.userId, req.stones || [], hasKeyStone);
    req.status = 'approved';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = ctx.from.id;
    req.added = added;
    requests[reqId] = req;
    await saveRequests(requests);

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.replyWithHTML(
      `<b>Approved</b>\n<b>Req ID:</b> <code>${reqId}</code>\n<b>By:</b> ${userLink(ctx.from)}\n<b>Added:</b> ${added.length ? formatStoneCounts(added) : 'None'}`
    );

    await bot.telegram.sendMessage(
      req.userId,
      `Stones transfer approved. Added: ${added.length ? formatStoneCounts(added) : 'None'}`
    );

    await ctx.answerCbQuery('Approved.');
  } catch (err) {
    req.status = 'failed';
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = ctx.from.id;
    req.error = String(err.message || err);
    requests[reqId] = req;
    await saveRequests(requests);

    await ctx.answerCbQuery('Approve failed.');
    await ctx.replyWithHTML(`<b>Approve failed</b>\nReq: <code>${reqId}</code>\nError: <code>${String(err.message || err)}</code>`);
  }
});

bot.action(/sreject_/, async (ctx) => {
  if (ctx.chat && ctx.chat.id !== ADMIN_GROUP_ID) {
    await ctx.answerCbQuery('Not allowed here.');
    return;
  }
  const allowed = isAdmin(ctx.from.id) || await isGroupAdmin(ctx, ctx.from.id);
  if (!allowed) {
    await ctx.answerCbQuery('Not allowed.');
    return;
  }

  const reqId = ctx.callbackQuery.data.split('_')[1];
  const requests = await loadRequests();
  const req = requests[reqId];

  if (!req || req.type !== 'stones') {
    await ctx.answerCbQuery('Request not found.');
    return;
  }
  if (req.status !== 'pending') {
    await ctx.answerCbQuery('Already processed.');
    return;
  }

  req.status = 'rejected';
  req.reviewedAt = new Date().toISOString();
  req.reviewedBy = ctx.from.id;
  requests[reqId] = req;
  await saveRequests(requests);

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.replyWithHTML(`<b>Rejected</b>\nReq: <code>${reqId}</code>\nBy: ${userLink(ctx.from)}`);

  await bot.telegram.sendMessage(req.userId, `Stones transfer request rejected. Req ID: ${reqId}`);
  await ctx.answerCbQuery('Rejected.');
});

bot.action(/treject_/, async (ctx) => {
  if (ctx.chat && ctx.chat.id !== ADMIN_GROUP_ID) {
    await ctx.answerCbQuery('Not allowed here.');
    return;
  }
  const allowed = isAdmin(ctx.from.id) || await isGroupAdmin(ctx, ctx.from.id);
  if (!allowed) {
    await ctx.answerCbQuery('Not allowed.');
    return;
  }

  const reqId = ctx.callbackQuery.data.split('_')[1];
  const requests = await loadRequests();
  const req = requests[reqId];

  if (!req) {
    await ctx.answerCbQuery('Request not found.');
    return;
  }
  if (req.status !== 'pending') {
    await ctx.answerCbQuery('Already processed.');
    return;
  }

  req.status = 'rejected';
  req.reviewedAt = new Date().toISOString();
  req.reviewedBy = ctx.from.id;
  requests[reqId] = req;
  await saveRequests(requests);

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.replyWithHTML(`<b>Rejected</b>\nReq: <code>${reqId}</code>\nBy: ${userLink(ctx.from)}`);

  await bot.telegram.sendMessage(req.userId, `Transfer request rejected. Req ID: ${reqId}`);
  await ctx.answerCbQuery('Rejected.');
});

bot.catch((err) => {
  console.error('Transfer bot error:', err);
});

async function initTransferBot() {
  await initDataStores({ loadCaches: false });
}

initTransferBot()
  .then(() => bot.launch())
  .then(() => {
    console.log('transfer_bot.js running');
    console.log('Admin group:', ADMIN_GROUP_ID);
    console.log('Admins:', ADMINS.join(', '));
  })
  .catch((error) => {
    console.error('Failed to start transfer bot:', error);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));


