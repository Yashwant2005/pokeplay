const EVENT_ID = 'acknowledge';
const he = require('he');
const EVENT_STATE_KEY = 'communityAcknowledge';
const EVENT_TITLE = 'PokeTales Community Acknowledge Event';
const EVENT_SHORT_LABEL = 'Acknowledge';
const EVENT_STATUS = 'active';
const EVENT_DURATION = 'Live now';
const REWARD_THRESHOLDS = [3, 7];
const MAX_REWARDS = 2;

const ZA_MEGA_STONE_POOL = [
  'dragoniteite',
  'clefableite',
  'victreebelite',
  'starmieite',
  'meganiumite',
  'feraligatrite',
  'chesnaughtite',
  'delphoxite',
  'greninjaite',
  'emboarite',
  'excadrillite',
  'scovillainite',
  'scraftyite',
  'eelektrossite',
  'skarmoryite',
  'froslassite',
  'hawluchaite',
  'malamarite',
  'raichuite-x',
  'raichuite-y',
  'garchompite-z',
  'absolite-z',
  'staraptorite',
  'chimechoite',
  'golurkite',
  'crabominableite',
  'baxcaliburite',
  'golisopodite',
  'scolipedeite',
  'dragalgeite',
  'pyroarite',
  'drampaite',
  'glimmoraite',
  'falinksite',
  'chandelureite',
  'meowsticite',
  'tatsugiriite',
  'barbaracleite'
];

const FEATURED_ZA_MEGAS = [
  'Mega Dragonite',
  'Mega Clefable',
  'Mega Victreebel',
  'Mega Starmie',
  'Mega Meganium',
  'Mega Feraligatr',
  'Mega Chesnaught',
  'Mega Delphox',
  'Mega Greninja',
  'Mega Emboar',
  'Mega Excadrill',
  'Mega Scovillain',
  'Mega Scrafty',
  'Mega Eelektross',
  'Mega Skarmory',
  'Mega Froslass',
  'Mega Hawlucha',
  'Mega Malamar',
  'Mega Raichu X',
  'Mega Raichu Y',
  'Mega Lucario Z',
  'Mega Absol Z',
  'Mega Staraptor',
  'Mega Chimecho',
  'Mega Golurk',
  'Mega Crabominable',
  'Mega Baxcalibur',
  'Mega Golisopod',
  'Mega Garchomp Z',
  'Mega Scolipede',
  'Mega Dragalge',
  'Mega Pyroar',
  'Mega Drampa',
  'Mega Glimmora',
  'Mega Falinks',
  'Mega Chandelure',
  'Mega Meowstic',
  'Mega Tatsugiri',
  'Mega Floette',
  'Mega Barbaracle'
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeName(value) {
  let out = String(value ?? '');
  try {
    out = he.decode(out);
  } catch (_) {}
  return out;
}

function ensureAcknowledgeEventState(userData) {
  if (!userData.extra || typeof userData.extra !== 'object') userData.extra = {};
  if (!userData.extra.events || typeof userData.extra.events !== 'object') userData.extra.events = {};
  if (!userData.extra.events[EVENT_STATE_KEY] || typeof userData.extra.events[EVENT_STATE_KEY] !== 'object') {
    userData.extra.events[EVENT_STATE_KEY] = {};
  }

  const state = userData.extra.events[EVENT_STATE_KEY];
  if (!state.acknowledgers || typeof state.acknowledgers !== 'object' || Array.isArray(state.acknowledgers)) {
    const migrated = {};
    if (Array.isArray(state.acknowledgers)) {
      for (const entry of state.acknowledgers) {
        const userId = String(entry && (entry.userId || entry.id || ''));
        if (!userId) continue;
        migrated[userId] = {
          name: String(entry.name || entry.username || userId),
          atUtc: entry.atUtc || null
        };
      }
    }
    state.acknowledgers = migrated;
  }
  if (!state.rewardClaims || typeof state.rewardClaims !== 'object' || Array.isArray(state.rewardClaims)) {
    const migratedClaims = {};
    if (Array.isArray(state.claimedRewardTiers)) {
      for (const tier of state.claimedRewardTiers) {
        migratedClaims[String(tier)] = { atUtc: null };
      }
    }
    state.rewardClaims = migratedClaims;
  }
  delete state.claimedRewardTiers;
  return state;
}

function getAcknowledgersList(state) {
  const acknowledgers = state && state.acknowledgers && typeof state.acknowledgers === 'object'
    ? state.acknowledgers
    : {};
  return Object.entries(acknowledgers)
    .map(([userId, entry]) => ({
      userId: String(userId),
      name: decodeName(entry && entry.name || userId),
      atUtc: entry && entry.atUtc ? String(entry.atUtc) : ''
    }))
    .sort((a, b) => {
      const atA = Date.parse(a.atUtc || '') || 0;
      const atB = Date.parse(b.atUtc || '') || 0;
      return atA - atB;
    });
}

function getAvailableRewardStonePool(stones) {
  const bag = stones && typeof stones === 'object' ? stones : {};
  return ZA_MEGA_STONE_POOL.filter((stoneKey) => bag[stoneKey]);
}

function getPendingRewardTiers(state) {
  const count = getAcknowledgersList(state).length;
  const rewardClaims = state && state.rewardClaims && typeof state.rewardClaims === 'object'
    ? state.rewardClaims
    : {};
  return REWARD_THRESHOLDS.filter((tier) => count >= tier && !rewardClaims[String(tier)]);
}

function claimRewardTier(state, tier, stoneKey) {
  if (!state.rewardClaims || typeof state.rewardClaims !== 'object') state.rewardClaims = {};
  state.rewardClaims[String(tier)] = {
    stone: stoneKey || null,
    atUtc: new Date().toISOString()
  };
}

function pickRandomRewardStone(stones) {
  const pool = getAvailableRewardStonePool(stones);
  if (!pool.length) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

function buildAcknowledgeEventDetails() {
  return [
    'Use /acknowledge in reply to the player you want to appreciate.',
    '3 unique acknowledgements: earn 1 Legends ZA Mega Stone.',
    '7 unique acknowledgements: earn 1 more Legends ZA Mega Stone.',
    'Each player can acknowledge you only once.',
    'You cannot acknowledge yourself.',
    'Maximum reward: 2 Mega Stones.'
  ];
}

function buildAcknowledgeEventCard(userData) {
  const data = userData && typeof userData === 'object' ? userData : {};
  const state = ensureAcknowledgeEventState(data);
  const acknowledgers = getAcknowledgersList(state);
  const claimedCount = Object.keys(state.rewardClaims || {}).length;
  const nextTier = REWARD_THRESHOLDS.find((tier) => acknowledgers.length < tier);
  const lines = [
    '<b>' + escapeHtml(EVENT_TITLE) + '</b>',
    '',
    '<b>Status:</b> Active',
    '<b>Your acknowledgements:</b> ' + acknowledgers.length,
    '<b>Rewards claimed:</b> ' + claimedCount + '/' + MAX_REWARDS
  ];

  if (nextTier) {
    lines.push('<b>Next reward:</b> ' + nextTier + ' acknowledgements');
  } else {
    lines.push('<b>Next reward:</b> Maximum rewards reached');
  }

  lines.push('');
  lines.push('<b>Acknowledged by:</b>');
  if (!acknowledgers.length) {
    lines.push('- No acknowledgements yet.');
  } else {
    for (const entry of acknowledgers) {
      lines.push('- <a href="tg://user?id=' + escapeHtml(entry.userId) + '">' + escapeHtml(entry.name) + '</a>');
    }
  }

  lines.push('');
  for (const detail of buildAcknowledgeEventDetails()) {
    lines.push('- ' + escapeHtml(detail));
  }
  return lines.join('\n');
}

module.exports = {
  EVENT_ID,
  EVENT_STATE_KEY,
  EVENT_TITLE,
  EVENT_SHORT_LABEL,
  EVENT_STATUS,
  EVENT_DURATION,
  REWARD_THRESHOLDS,
  MAX_REWARDS,
  FEATURED_ZA_MEGAS,
  ensureAcknowledgeEventState,
  getAcknowledgersList,
  getAvailableRewardStonePool,
  getPendingRewardTiers,
  claimRewardTier,
  pickRandomRewardStone,
  buildAcknowledgeEventDetails,
  buildAcknowledgeEventCard
};
