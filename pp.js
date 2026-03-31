require('dotenv').config();

const { Telegraf } = require('telegraf');
const he = require('he');
const { getRandomAbilityForPokemon } = require('./utils/pokemon_ability');
const {
  getUserData,
  saveUserData2,
  getRandomNature,
  generateRandomIVs,
  applyCaptureIvRules,
  word,
  c,
  initDataStores,
  getAllUserData,
  loadMessageData
} = require('./func');
const { getSessionStats } = require('./session_store');

const pokes = require('./data/pokemon_info55_modified2.json');
const pokemoves = require('./data/moveset_data_updated2.json');
const dmoves = require('./data/moves_info.json');
const growth_rates = require('./data/pokemon_data2.json');
const chart = require('./data/exp_chart.json');

const starters = {
  Kanto: ['Bulbasaur', 'Charmander', 'Squirtle'],
  Johto: ['Chikorita', 'Cyndaquil', 'Totodile'],
  Hoenn: ['Treecko', 'Torchic', 'Mudkip'],
  Sinnoh: ['Turtwig', 'Chimchar', 'Piplup'],
  Unova: ['Snivy', 'Tepig', 'Oshawott'],
  Kalos: ['Chespin', 'Fennekin', 'Froakie'],
  Alola: ['Rowlet', 'Litten', 'Popplio'],
  Galar: ['Grookey', 'Scorbunny', 'Sobble'],
  Paldea: ['Sprigatito', 'Fuecoco', 'Quaxly']
};

const STARTER_ABILITY_BY_TYPE = {
  fire: 'blaze',
  grass: 'overgrow',
  water: 'torrent'
};

const DEFAULT_STATUS_ADMINS = new Set([6265981509]);

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/ /g, '-');
}

function pickStarter() {
  const regions = Object.keys(starters);
  const region = regions[Math.floor(Math.random() * regions.length)];
  const list = starters[region];
  const starter = list[Math.floor(Math.random() * list.length)];
  return { region, name: normalizeName(starter) };
}

function buildStarterMoves(pokeName, level) {
  const entry = pokemoves[pokeName];
  if (!entry || !Array.isArray(entry.moves_info)) return [];

  const learned = entry.moves_info.filter((move) =>
    move.learn_method === 'level-up' &&
    move.level_learned_at > 0 &&
    move.level_learned_at <= level &&
    dmoves[String(move.id)]
  );

  const damaging = learned
    .filter((move) => dmoves[String(move.id)].power && dmoves[String(move.id)].accuracy)
    .map((move) => move.id);

  const fallback = learned.map((move) => move.id);
  return Array.from(new Set(damaging.length ? damaging : fallback)).slice(-4);
}

function getStarterAbility(pokeName) {
  const info = pokes[pokeName];
  if (!info || !Array.isArray(info.types)) {
    return getRandomAbilityForPokemon(pokeName, pokes);
  }
  const mapped = info.types
    .map((type) => STARTER_ABILITY_BY_TYPE[String(type || '').toLowerCase()])
    .find(Boolean);
  return mapped || getRandomAbilityForPokemon(pokeName, pokes);
}

async function reply(ctx, text, extra = {}) {
  return ctx.reply(text, extra);
}

function previewIds(idSet, max = 20) {
  const ids = Array.from(idSet);
  if (!ids.length) return 'None';
  const head = ids.slice(0, max).join(', ');
  if (ids.length <= max) return head;
  return `${head}, ... (+${ids.length - max} more)`;
}

function getStatusAdminIds() {
  const fromEnv = String(process.env.PP_STATUS_ADMINS || '')
    .split(',')
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value));
  return new Set([...DEFAULT_STATUS_ADMINS, ...fromEnv]);
}

async function registerNewUser(ctx) {
  const existing = await getUserData(ctx.from.id);
  if (existing && Array.isArray(existing.pokes) && existing.pokes.length > 0) {
    await reply(ctx, '*You are already registered.*', {
      parse_mode: 'Markdown'
    });
    return;
  }

  const starter = pickStarter();
  const poke = pokes[starter.name];
  if (!poke) {
    await reply(ctx, '*Starter data not found.*', { parse_mode: 'Markdown' });
    return;
  }

  const level = 5;
  const growth = growth_rates[starter.name];
  const exp = growth && chart[growth.growth_rate]
    ? chart[growth.growth_rate][String(level)] || chart[growth.growth_rate][level] || 0
    : 0;

  const userData = {
    inv: {
      name: he.encode(ctx.from.first_name),
      exp: 0,
      pc: 5000,
      pass: 0,
      region: 'kanto',
      avtar: '1',
      template: '1',
      id: 'grey',
      data: 'black',
      hometown: starter.region
    },
    balls: {
      regular: 10,
      great: 7,
      ultra: 3
    },
    pokes: [{
      name: starter.name,
      id: poke.pokedex_number,
      nature: getRandomNature(),
      ability: getStarterAbility(starter.name),
      held_item: 'none',
      exp,
      pass: word(8),
      ivs: applyCaptureIvRules(generateRandomIVs('common')),
      evs: {
        hp: 0,
        attack: 0,
        defense: 0,
        special_attack: 0,
        special_defense: 0,
        speed: 0
      },
      moves: buildStarterMoves(starter.name, level),
      symbol: ''
    }],
    extra: {
      date: new Date().toLocaleDateString('en-GB')
    }
  };

  await saveUserData2(ctx.from.id, userData);

  await reply(
    ctx,
    '*Registered!*\n\n' +
      '*Starter:* ' + c(starter.name) + '\n' +
      '*Level:* 5\n' +
      '*Region:* ' + c(starter.region),
    { parse_mode: 'Markdown' }
  );
}

async function startStandaloneBot() {
  const token = process.env.PP_BOT_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    throw new Error('Set PP_BOT_TOKEN or BOT_TOKEN in .env before running pp.js');
  }

  await initDataStores();

  const bot = new Telegraf(token);
  const botStartTime = Date.now();
  const adminIds = getStatusAdminIds();

  bot.catch((error) => {
    console.error('[pp bot error]', error);
  });

  bot.command('panel', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      await reply(ctx, 'Open me in private and press the button below.', {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Start Bot',
              url: 'https://t.me/' + bot.botInfo.username + '?start=start'
            }
          ]]
        }
      });
      return;
    }

    await reply(ctx, 'Press the button below to register your account.', {
      reply_markup: {
        inline_keyboard: [[
          {
            text: 'Start Journey',
            callback_data: 'pp_register'
          }
        ]]
      }
    });
  });

  bot.action('pp_register', async (ctx) => {
    await ctx.answerCbQuery();
    await registerNewUser(ctx);
  });

  bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private') {
      await reply(ctx, 'Use the button below in private chat to start.', {
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Start Bot',
              url: 'https://t.me/' + bot.botInfo.username + '?start=start'
            }
          ]]
        }
      });
      return;
    }

    await registerNewUser(ctx);
  });

  bot.command('status', async (ctx) => {
    if (!adminIds.has(Number(ctx.from.id))) {
      return;
    }

    try {
      const allUserData = await getAllUserData();
      const totalUsers = allUserData.length;
      const usersWithPokes = allUserData.filter((user) => user.data && Array.isArray(user.data.pokes) && user.data.pokes.length > 0).length;
      const totalPokemon = allUserData.reduce((sum, user) => sum + (user.data && Array.isArray(user.data.pokes) ? user.data.pokes.length : 0), 0);
      const dbUserIds = new Set(allUserData.map((user) => String(user.userId || user.user_id || user._id)).filter(Boolean));

      const messageData = await loadMessageData();
      const activeBattleUsers = new Set(Array.isArray(messageData.battle) ? messageData.battle.map((value) => String(value)) : []).size;
      const activeBattleRooms = Object.values(messageData).filter((value) => value && typeof value === 'object' && value.times && value.turn && value.oppo).length;
      const activeHunts = Object.values(messageData).filter((value) => value && typeof value === 'object' && value.timestamp && value.id).length;

      const { userSet: sessionUserIds, chatSet: sessionChatIds } = await getSessionStats();

      const uptimeMs = Date.now() - botStartTime;
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

      const statusMsg =
`*Bot Status*

*Users*
- Total DB Users: *${totalUsers}*
- Users With Pokemon: *${usersWithPokes}*
- Total Pokemon: *${totalPokemon}*
- DB User IDs: \`${previewIds(dbUserIds)}\`

*Chats / Sessions*
- Session Users: *${sessionUserIds.size}*
- Session Chats: *${sessionChatIds.size}*
- Session User IDs: \`${previewIds(sessionUserIds)}\`
- Session Chat IDs: \`${previewIds(sessionChatIds)}\`

*Live Activity*
- Active Battle Users: *${activeBattleUsers}*
- Active Battle Rooms: *${activeBattleRooms}*
- Active Hunts: *${activeHunts}*

*Uptime*
- *${hours}h ${minutes}m*`;

      await ctx.replyWithMarkdown(statusMsg);
    } catch (error) {
      console.error('Error in status command:', error);
      await ctx.replyWithMarkdown('*Error retrieving status*');
    }
  });

  await bot.launch();
  console.log('pp.js bot started');

  const shutdown = async (signal) => {
    console.log('Stopping pp.js bot on', signal);
    await bot.stop(signal);
    process.exit(0);
  };

  process.once('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      console.error(error);
      process.exit(1);
    });
  });

  process.once('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      console.error(error);
      process.exit(1);
    });
  });
}

if (require.main === module) {
  startStandaloneBot().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  startStandaloneBot,
  registerNewUser
};
