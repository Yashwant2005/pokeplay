const { titleCaseAbility } = require('./pokemon_ability');
const { getDisplayPokemonName, getDisplayPokemonSymbol } = require('./gmax_utils');
const { getDynamaxLevel, getDynamaxLevelBar } = require('./dynamax_level');
const { isRayquazaLockedFromHeldItems } = require('./pokemon_item_rules');

const TYPE_COLORS = {
  normal: '#a8a77a',
  fire: '#ee8130',
  water: '#6390f0',
  electric: '#f7d02c',
  grass: '#7ac74c',
  ice: '#96d9d6',
  fighting: '#c22e28',
  poison: '#a33ea1',
  ground: '#e2bf65',
  flying: '#a98ff3',
  psychic: '#f95587',
  bug: '#a6b91a',
  rock: '#b6a136',
  ghost: '#735797',
  dragon: '#6f35fc',
  dark: '#705746',
  steel: '#b7b7ce',
  fairy: '#d685ad'
};

const STAT_ROWS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'ATK' },
  { key: 'defense', label: 'DEF' },
  { key: 'special_attack', label: 'SpA' },
  { key: 'special_defense', label: 'SpD' },
  { key: 'speed', label: 'Spe' }
];

const NATURE_EFFECTS = {
  Adamant: { increased: 'attack', decreased: 'special_attack' },
  Bold: { increased: 'defense', decreased: 'attack' },
  Brave: { increased: 'attack', decreased: 'speed' },
  Calm: { increased: 'special_defense', decreased: 'attack' },
  Careful: { increased: 'special_defense', decreased: 'special_attack' },
  Gentle: { increased: 'special_defense', decreased: 'defense' },
  Hasty: { increased: 'speed', decreased: 'defense' },
  Impish: { increased: 'defense', decreased: 'special_attack' },
  Jolly: { increased: 'speed', decreased: 'special_attack' },
  Lax: { increased: 'defense', decreased: 'special_defense' },
  Lonely: { increased: 'attack', decreased: 'defense' },
  Mild: { increased: 'special_attack', decreased: 'defense' },
  Modest: { increased: 'special_attack', decreased: 'attack' },
  Naive: { increased: 'speed', decreased: 'special_defense' },
  Naughty: { increased: 'attack', decreased: 'special_defense' },
  Quiet: { increased: 'special_attack', decreased: 'speed' },
  Rash: { increased: 'special_attack', decreased: 'special_defense' },
  Relaxed: { increased: 'defense', decreased: 'speed' },
  Sassy: { increased: 'special_defense', decreased: 'speed' },
  Timid: { increased: 'speed', decreased: 'attack' }
};

function titleCaseHeldItem(value) {
  return String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';
}

function getPokemonLevelInfo(pokemon, growthRates, chart) {
  const growth = growthRates[pokemon.name];
  const expChart = growth && chart[growth.growth_rate] ? chart[growth.growth_rate] : null;
  if (!expChart) {
    return {
      level: 1,
      nextLevelExp: Number(pokemon.exp) || 0,
      needToNextLevel: 0
    };
  }

  const matchingLevels = Object.keys(expChart).filter((level) => Number(pokemon.exp) >= Number(expChart[level]));
  const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1], 10) : 1;
  const nextLevelExp = Number(expChart[level + 1] || pokemon.exp || 0);
  return {
    level,
    nextLevelExp,
    needToNextLevel: Math.max(0, nextLevelExp - Number(pokemon.exp || 0))
  };
}

function getPokemonDisplayImage(pokemon, pokes, shiny, events) {
  const base = pokes[pokemon.name] || {};
  let img = base.front_default_image || null;
  const shinyEntry = Array.isArray(shiny) ? shiny.find((poke) => poke.name === pokemon.name) : null;

  if (events && events[pokemon.name] && pokemon.symbol === '🪄') {
    img = events[pokemon.name];
  }

  if (shinyEntry && pokemon.symbol === '✨') {
    img = shinyEntry.shiny_url;
  }

  return img;
}

function buildPokemonCardKeyboard(pokemon, userId) {
  const keyboard = [
    [
      { text: 'Overview', callback_data: 'info_' + pokemon.pass + '_' + userId },
      { text: 'IVs/EVs', callback_data: 'pkisvs_' + pokemon.pass + '_' + userId },
      { text: 'Moveset', callback_data: 'moves_' + pokemon.pass + '_' + userId }
    ],
    [
      { text: 'Evolve', callback_data: 'evolve_' + pokemon.pass + '_' + userId },
      { text: 'Nickname', callback_data: 'nickname_' + pokemon.pass + '_' + userId },
      { text: 'Release', callback_data: 'release_' + pokemon.pass + '_' + userId }
    ]
  ];

  const utilityRow = [];
  if (!isRayquazaLockedFromHeldItems(pokemon)) {
    utilityRow.push({ text: 'Held Items', callback_data: 'heldpanel_' + pokemon.pass + '_' + userId });
  }
  utilityRow.push({ text: 'Relearner', callback_data: 'relearnp_' + pokemon.pass + '_' + userId });
  keyboard.push(utilityRow);

  const abilityNorm = String(pokemon.ability || '').toLowerCase().replace(/[-_\s]/g, '');
  if (abilityNorm === 'aurabreak' && !pokemon.powerConstructChanged) {
    keyboard.push([{ text: 'Power Construct', callback_data: 'zygpc_' + pokemon.pass + '_' + userId }]);
  }

  return keyboard;
}

function roundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? current + ' ' + word : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word);
      current = '';
    }
    if (lines.length >= maxLines) {
      break;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (words.length && lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last && last !== words.slice(-1)[0]) {
      lines[maxLines - 1] = last.replace(/\s+\S*$/, '') + '...';
    }
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + (index * lineHeight));
  });
}

function drawTypeBadge(ctx, type, x, y) {
  const label = String(type || 'unknown').toUpperCase();
  const width = Math.max(84, ctx.measureText(label).width + 28);
  roundedRect(ctx, x, y, width, 32, 12, TYPE_COLORS[String(type || '').toLowerCase()] || '#5a6172', '#ffffff33');
  ctx.fillStyle = '#f8fbff';
  ctx.font = '18px Cabal';
  ctx.fillText(label, x + 14, y + 22);
  return width;
}

async function renderPokemonStatsCard(deps, userData, pokemon) {
  const {
    createCanvas,
    loadImage,
    c,
    forms,
    pokes,
    growth_rates,
    chart,
    pokestats,
    Stats,
    shiny,
    events
  } = deps;

  const canvas = createCanvas(1000, 760);
  const ctx = canvas.getContext('2d');
  const profile = pokes[pokemon.name] || {};
  const displayName = c(getDisplayPokemonName(pokemon, forms));
  const displaySymbol = getDisplayPokemonSymbol(pokemon);
  const spriteUrl = getPokemonDisplayImage(pokemon, pokes, shiny, events);
  const { level, needToNextLevel } = getPokemonLevelInfo(pokemon, growth_rates, chart);
  const stats = await Stats(pokestats[pokemon.name], pokemon.ivs, pokemon.evs, c(pokemon.nature), level);
  const friendship = Number(pokemon.friendship ?? pokemon.happiness ?? 0);
  const trainerName = c((userData && userData.inv && userData.inv.name) || 'Trainer');
  const moves = Array.isArray(pokemon.moves)
    ? pokemon.moves.map((moveId) => deps.dmoves && deps.dmoves[moveId] ? c(deps.dmoves[moveId].name) : null).filter(Boolean).slice(0, 4)
    : [];
  const types = Array.isArray(profile.types) ? profile.types : [];
  const natureEffect = NATURE_EFFECTS[c(pokemon.nature)] || null;

  const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  background.addColorStop(0, '#d6eef8');
  background.addColorStop(0.55, '#b6dff1');
  background.addColorStop(1, '#8fc2df');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(820, 120, 10, 820, 120, 240);
  glow.addColorStop(0, '#ffffff99');
  glow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = glow;
  ctx.fillRect(560, 0, 440, 260);

  roundedRect(ctx, 16, 16, 968, 728, 28, '#2c2b39', '#151620');
  roundedRect(ctx, 26, 26, 948, 708, 24, '#323345', '#55576a');

  roundedRect(ctx, 32, 32, 255, 108, 20, '#3b3d46', '#111216');
  ctx.fillStyle = '#f7f7f7';
  ctx.beginPath();
  ctx.arc(76, 84, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a4a69';
  ctx.beginPath();
  ctx.arc(76, 84, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f18b33';
  ctx.beginPath();
  ctx.arc(76, 74, 21, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#f6f6f6';
  ctx.beginPath();
  ctx.arc(76, 94, 21, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#121318';
  ctx.beginPath();
  ctx.arc(76, 84, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#bb3149';
  ctx.beginPath();
  ctx.arc(170, 58, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7ca38';
  ctx.beginPath();
  ctx.arc(208, 58, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f83d6';
  ctx.beginPath();
  ctx.arc(246, 58, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111216';
  ctx.fillRect(146, 88, 104, 6);
  ctx.fillRect(146, 102, 104, 6);

  ctx.fillStyle = '#f2f5f8';
  ctx.font = '24px Cabal';
  ctx.fillText('OT ' + trainerName, 312, 64);
  ctx.fillText('Lv. ' + level, 842, 64);

  roundedRect(ctx, 32, 154, 255, 254, 18, '#1c1f2a', '#5e6075');
  roundedRect(ctx, 306, 86, 636, 322, 18, '#214f57', '#6a7086');
  const panelGradient = ctx.createLinearGradient(306, 86, 942, 408);
  panelGradient.addColorStop(0, '#2f8d79');
  panelGradient.addColorStop(1, '#2d5d7e');
  roundedRect(ctx, 314, 94, 620, 306, 16, panelGradient, '#ffffff14');

  roundedRect(ctx, 32, 430, 474, 282, 18, '#1c1f2a', '#5e6075');
  roundedRect(ctx, 526, 430, 416, 282, 18, '#1c1f2a', '#5e6075');

  ctx.fillStyle = '#f3f6f8';
  ctx.font = '24px Cool';
  let statY = 202;
  for (const statRow of STAT_ROWS) {
    const statValue = Number(stats[statRow.key] || 0);
    const ivValue = Number(pokemon.ivs && pokemon.ivs[statRow.key] || 0);
    ctx.fillStyle = '#f3f6f8';
    ctx.fillText(statRow.label, 52, statY);

    const modifierColor = natureEffect && natureEffect.increased === statRow.key
      ? '#9ee07e'
      : natureEffect && natureEffect.decreased === statRow.key
        ? '#ff9b7e'
        : '#f0f0f0';
    ctx.fillStyle = modifierColor;
    ctx.fillText(String(statValue).padStart(3, ' '), 138, statY);

    ctx.fillStyle = '#7bd7f0';
    ctx.fillText(String(ivValue).padStart(2, '0'), 196, statY);
    statY += 34;
  }

  let badgeX = 830;
  ctx.font = '18px Cabal';
  for (let index = types.length - 1; index >= 0; index -= 1) {
    const badgeWidth = drawTypeBadge(ctx, types[index], badgeX - 92, 102);
    badgeX -= badgeWidth + 10;
  }

  if (spriteUrl) {
    try {
      const sprite = await loadImage(spriteUrl);
      const box = { x: 370, y: 132, w: 500, h: 178 };
      const scale = Math.min(box.w / sprite.width, box.h / sprite.height, 1.9);
      const drawW = sprite.width * scale;
      const drawH = sprite.height * scale;
      const drawX = box.x + ((box.w - drawW) / 2);
      const drawY = box.y + ((box.h - drawH) / 2);
      ctx.shadowColor = '#00000066';
      ctx.shadowBlur = 16;
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
      ctx.shadowBlur = 0;
    } catch (_) {
      ctx.fillStyle = '#ffffff66';
      ctx.font = '68px Cool';
      ctx.fillText('?', 610, 228);
    }
  } else {
    ctx.fillStyle = '#ffffff66';
    ctx.font = '68px Cool';
    ctx.fillText('?', 610, 228);
  }

  ctx.fillStyle = '#f9e6a7';
  ctx.font = '44px Cool';
  const title = (displayName + ' ' + displaySymbol).trim();
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, 314 + ((620 - titleWidth) / 2), 362);

  ctx.fillStyle = '#f3f6f8';
  ctx.font = '18px Cabal';
  ctx.fillText('Stats', 50, 460);
  ctx.fillText('Moves', 50, 464 + 6);
  ctx.fillText('Details', 544, 464 + 6);

  ctx.font = '26px Cool';
  ctx.fillStyle = '#f2f5f8';
  let moveY = 500;
  const moveList = moves.length ? moves : ['None'];
  for (const move of moveList.slice(0, 4)) {
    drawWrappedText(ctx, move, 52, moveY, 420, 28, 1);
    moveY += 38;
  }

  ctx.fillStyle = '#0f1015';
  ctx.fillRect(46, 640, 446, 52);
  ctx.fillStyle = '#f3f6f8';
  ctx.font = '24px Cool';
  drawWrappedText(ctx, 'Ability  ' + c(titleCaseAbility(pokemon.ability || 'none')), 56, 672, 420, 26, 1);

  const detailRows = [
    ['Nature', c(pokemon.nature)],
    ['Item', c(titleCaseHeldItem(pokemon.held_item || 'none'))],
    ['Friendship', String(friendship) + '%'],
    ['Dynamax', String(getDynamaxLevel(pokemon)) + ' / 10'],
    ['Next Level', needToNextLevel.toLocaleString() + ' EXP'],
    ['Species', c(displayName)]
  ];

  ctx.font = '23px Cool';
  let detailY = 500;
  for (const [label, value] of detailRows) {
    ctx.fillStyle = '#f3f6f8';
    ctx.fillText(label, 548, detailY);
    ctx.fillStyle = '#f7e5a2';
    drawWrappedText(ctx, value, 724, detailY, 190, 24, 1);
    detailY += 38;
  }

  ctx.fillStyle = '#f3f6f8';
  ctx.font = '20px Cabal';
  ctx.fillText('Dynamax', 548, 700);
  ctx.fillStyle = '#7fd8ee';
  ctx.fillText(getDynamaxLevelBar(pokemon), 642, 700);

  return canvas.toBuffer('image/png');
}

async function sendPokemonCard(ctx, deps, userData, pokemon, replyToMessageId) {
  const imageBuffer = await renderPokemonStatsCard(deps, userData, pokemon);
  return deps.sendMessage(
    ctx,
    ctx.chat.id,
    { source: imageBuffer },
    {
      reply_to_message_id: replyToMessageId,
      caption: ' ',
      reply_markup: { inline_keyboard: buildPokemonCardKeyboard(pokemon, ctx.from.id) }
    }
  );
}

async function editPokemonCard(ctx, deps, userData, pokemon) {
  const imageBuffer = await renderPokemonStatsCard(deps, userData, pokemon);
  return deps.editMessage(
    'media',
    ctx,
    ctx.chat.id,
    ctx.callbackQuery.message.message_id,
    {
      type: 'photo',
      media: { source: imageBuffer },
      caption: ' '
    },
    {
      reply_markup: { inline_keyboard: buildPokemonCardKeyboard(pokemon, ctx.from.id) }
    }
  );
}

module.exports = {
  buildPokemonCardKeyboard,
  editPokemonCard,
  getPokemonDisplayImage,
  getPokemonLevelInfo,
  renderPokemonStatsCard,
  sendPokemonCard,
  titleCaseHeldItem
};
