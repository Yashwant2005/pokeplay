const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const {
  getUserData,
  saveUserData2,
  word,
  generateRandomIVs,
  c
} = require('./func');

const pokes = JSON.parse(fs.readFileSync('data/pokemon_info55_modified2.json', 'utf8'));
const pokemoves = JSON.parse(fs.readFileSync('data/moveset_data_updated2.json', 'utf8'));
const dmoves = JSON.parse(fs.readFileSync('data/moves_info.json', 'utf8'));
const growthRates = JSON.parse(fs.readFileSync('data/pokemon_data2.json', 'utf8'));
const chart = JSON.parse(fs.readFileSync('data/exp_chart.json', 'utf8'));
const chains = JSON.parse(fs.readFileSync('data/evolution_chains2.json', 'utf8'));
const spawn = JSON.parse(fs.readFileSync('data/pokemon_status_info.json', 'utf8'));

const BOT_TOKEN = '8616181555:AAHFesYbqllv11TGDDR4kNAU2rznGR_OLG8';
const ADMIN_GROUP_ID = -1003736053869;
const SOURCE_BOT_ID = 572621020;
const ADMINS = [6265981509, 1411248872];

const REQUESTS_FILE = path.join('data', 'transfer_requests.json');
const bot = new Telegraf(BOT_TOKEN);
const userState = new Map();

function loadRequests() {
  try {
    if (!fs.existsSync(REQUESTS_FILE)) return {};
    return JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function saveRequests(requests) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(requests, null, 2), 'utf8');
}

function isAdmin(id) {
  return ADMINS.includes(Number(id));
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

  const baseIvs = providedIvs || generateRandomIVs((spawn[pokemonName] || '').toLowerCase());
  const safeNature = nature || 'hardy';

  const preEvo = getPreEvolutionName(pokemonName);
  const addedNames = [];

  if (preEvo && pokes[preEvo]) {
    const preEntry = buildPokemonEntry(preEvo, safeNature, baseIvs, shiny);
    data.pokes.push(preEntry);
    addedNames.push(preEvo);
  }

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

function isForwardedFromSource(message) {
  const forwardFrom = message && message.forward_from;
  return Boolean(forwardFrom && Number(forwardFrom.id) === SOURCE_BOT_ID);
}

function userLink(user) {
  if (user.username) return '@' + user.username;
  return `<a href="tg://user?id=${user.id}">${user.first_name || 'User'}</a>`;
}

bot.start(async (ctx) => {
  await ctx.reply(
    'Transfer bot is active.\n\nUse /add to submit a Pokemon transfer request.\nFlow: Pokemon name -> nature page -> IV/EV page -> admin approval.'
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

bot.on('message', async (ctx, next) => {
  if (ctx.chat.type !== 'private') {
    return next();
  }

  const state = userState.get(ctx.from.id);
  if (!state) return next();

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

    const requests = loadRequests();
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
    saveRequests(requests);

    const summary = [
      '<b>New Transfer Request</b>',
      '',
      `<b>Req ID:</b> <code>${reqId}</code>`,
      `<b>User:</b> ${userLink(ctx.from)} (<code>${ctx.from.id}</code>)`,
      `<b>Pokemon:</b> ${c(state.pokemonName)}`,
      `<b>Nature:</b> ${c(state.nature)}`,
      `<b>IVs:</b> HP ${parsedIvs.hp}, Atk ${parsedIvs.attack}, Def ${parsedIvs.defense}, SpA ${parsedIvs.special_attack}, SpD ${parsedIvs.special_defense}, Spe ${parsedIvs.speed}`,
      `<b>Shiny:</b> ${shiny ? 'Yes' : 'No'}`,
      `<b>Duplicate Check:</b> ${duplicates.length > 0 ? 'Duplicate Found' : 'No Duplicate'}`,
      '',
      'Approve to add this pokemon to main bot at level 1. If pre-evolution exists, pre-evolution will be added too.'
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
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery('Not allowed.');
    return;
  }

  const reqId = ctx.callbackQuery.data.split('_')[1];
  const requests = loadRequests();
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
    saveRequests(requests);

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
    saveRequests(requests);

    await ctx.answerCbQuery('Approve failed.');
    await ctx.replyWithHTML(`<b>Approve failed</b>\nReq: <code>${reqId}</code>\nError: <code>${String(err.message || err)}</code>`);
  }
});

bot.action(/treject_/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery('Not allowed.');
    return;
  }

  const reqId = ctx.callbackQuery.data.split('_')[1];
  const requests = loadRequests();
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
  saveRequests(requests);

  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.replyWithHTML(`<b>Rejected</b>\nReq: <code>${reqId}</code>\nBy: ${userLink(ctx.from)}`);

  await bot.telegram.sendMessage(req.userId, `Transfer request rejected. Req ID: ${reqId}`);
  await ctx.answerCbQuery('Rejected.');
});

bot.catch((err) => {
  console.error('Transfer bot error:', err);
});

bot.launch().then(() => {
  console.log('transfer_bot.js running');
  console.log('Admin group:', ADMIN_GROUP_ID);
  console.log('Admins:', ADMINS.join(', '));
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
