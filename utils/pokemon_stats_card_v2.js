const fs = require('fs');
const path = require('path');
const he = require('he');
const { titleCaseAbility } = require('./pokemon_ability');
const { getDisplayPokemonName, getDisplayPokemonSymbol } = require('./gmax_utils');
const { isRayquazaLockedFromHeldItems } = require('./pokemon_item_rules');

const STAT_ROWS = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'ATK' },
  { key: 'defense', label: 'DEF' },
  { key: 'special_attack', label: 'SpA' },
  { key: 'special_defense', label: 'SpD' },
  { key: 'speed', label: 'Spe' }
];

function titleCaseHeldItem(value) {
  return String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';
}

function getPokemonStatsCardMode(userData) {
  const mode = String(userData && userData.settings && userData.settings.stats_page_mode || '').toLowerCase();
  if (!mode) {
    return 'legacy';
  }
  return mode === 'classic' || mode === 'legacy' ? 'legacy' : 'private';
}

function resolvePokemonCardOptions(userData, options = {}) {
  const mode = options.mode || getPokemonStatsCardMode(userData);
  const showIvs = typeof options.showIvs === 'boolean' ? options.showIvs : mode === 'legacy';
  const showToggle = typeof options.showToggle === 'boolean' ? options.showToggle : mode !== 'legacy';
  return { mode, showIvs, showToggle };
}

function capitalizeFirstWord(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const parts = text.split(/\s+/);
  parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  return parts.join(' ');
}

function normalizeNatureName(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
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

function getLocalSpritePath(baseFolder, pokemonName) {
  const candidate = path.join(process.cwd(), baseFolder, String(pokemonName || '') + '.png');
  return fs.existsSync(candidate) ? candidate : null;
}

function isShinyPokemon(pokemon) {
  const symbol = String((pokemon && pokemon.symbol) || '').trim();
  return symbol === '✨' || symbol.includes('✨');
}

function loadImageSource(loadImage, source) {
  if (!source) return null;
  if (typeof source === 'string' && fs.existsSync(source)) {
    return loadImage(fs.readFileSync(source));
  }
  return loadImage(source);
}

function getPokemonDisplayImage(pokemon, pokes, shiny, events) {
  const shinyLocal = getLocalSpritePath(path.join('assets', 'image-shiny'), pokemon.name);
  const normalLocal = getLocalSpritePath(path.join('assets', 'image'), pokemon.name);
  if (isShinyPokemon(pokemon) && shinyLocal) {
    return shinyLocal;
  }
  if (normalLocal) {
    return normalLocal;
  }

  const base = pokes[pokemon.name] || {};
  let img = base.front_default_image || null;
  const shinyEntry = Array.isArray(shiny) ? shiny.find((poke) => poke.name === pokemon.name) : null;

  if (events && events[pokemon.name] && pokemon.symbol === '🪄') {
    img = events[pokemon.name];
  }
  if (shinyEntry && isShinyPokemon(pokemon)) {
    img = shinyEntry.shiny_url;
  }

  return img;
}

function buildPokemonCardKeyboard(pokemon, userId, options = {}) {
  const showIvs = options.showIvs === true;
  const showToggle = options.showToggle !== false;
  const mode = options.mode || '';
  const showNickname = mode !== 'private';
  const mainRow = [
    { text: 'Evolve', callback_data: 'evolve_' + pokemon.pass + '_' + userId }
  ];
  if (showNickname) {
    mainRow.push({ text: 'Nickname', callback_data: 'nickname_' + pokemon.pass + '_' + userId });
  }
  mainRow.push({ text: 'Release', callback_data: 'release_' + pokemon.pass + '_' + userId });
  const keyboard = [mainRow];

  const utilityRow = [];
  if (!isRayquazaLockedFromHeldItems(pokemon)) {
    utilityRow.push({ text: 'Held Items', callback_data: 'heldpanel_' + pokemon.pass + '_' + userId });
  }
  utilityRow.push({ text: 'Relearner', callback_data: 'relearnp_' + pokemon.pass + '_' + userId + '_stats' });
  if (showToggle) {
    utilityRow.push({
      text: showIvs ? 'Hide' : 'Show',
      callback_data: 'stativ_' + pokemon.pass + '_' + userId + '_' + (showIvs ? '0' : '1')
    });
  }
  keyboard.push(utilityRow);

  keyboard.push([{ text: 'Close', callback_data: 'dlt_' + userId }]);

  const abilityNorm = String(pokemon.ability || '').toLowerCase().replace(/[-_\s]/g, '');
  if (abilityNorm === 'aurabreak' && !pokemon.powerConstructChanged) {
    keyboard.push([{ text: 'Power Construct', callback_data: 'zygpc_' + pokemon.pass + '_' + userId }]);
  }

  return keyboard;
}

function roundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 4) {
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
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function fitText(ctx, text, maxWidth, startSize, weight = 'bold', family = 'Sans') {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 1;
  }
  return 12;
}

function drawLabelValue(ctx, label, value, x, y, labelWidth, valueWidth) {
  ctx.fillStyle = '#f2f5f8';
  ctx.font = 'bold 21px Sans';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#f4d995';
  const fitted = fitText(ctx, value, valueWidth, 21, 'normal', 'Sans');
  ctx.font = `normal ${fitted}px Sans`;
  ctx.fillText(value, x + labelWidth, y);
}

async function renderPokemonStatsCard(deps, userData, pokemon, options = {}) {
  const {
    createCanvas,
    loadImage,
    forms,
    pokes,
    growth_rates,
    chart,
    pokestats,
    Stats,
    shiny,
    events,
    dmoves
  } = deps;

  const canvas = createCanvas(920, 680);
  const ctx = canvas.getContext('2d');
  const resolvedOptions = resolvePokemonCardOptions(userData, options);
  const showIvs = resolvedOptions.showIvs;
  const profile = pokes[pokemon.name] || {};
  const displayName = he.decode(String(getDisplayPokemonName(pokemon, forms) || pokemon.name));
  const displaySymbol = String(getDisplayPokemonSymbol(pokemon) || '').trim();
  const trainerName = he.decode(String((userData && userData.inv && userData.inv.name) || 'Trainer')).replace(/\s+/g, ' ').trim();
  const spriteUrl = getPokemonDisplayImage(pokemon, pokes, shiny, events);
  const { level, needToNextLevel } = getPokemonLevelInfo(pokemon, growth_rates, chart);
  const stats = await Stats(pokestats[pokemon.name], pokemon.ivs, pokemon.evs, normalizeNatureName(pokemon.nature), level);
  const moves = Array.isArray(pokemon.moves)
    ? pokemon.moves.map((moveId) => dmoves && dmoves[moveId] ? capitalizeFirstWord(he.decode(String(dmoves[moveId].name))) : null).filter(Boolean).slice(0, 4)
    : [];

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#d7eff8');
  gradient.addColorStop(1, '#a6d1e5');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  roundedRect(ctx, 12, 12, 896, 656, 24, '#2e3040', '#171821', 6);
  roundedRect(ctx, 24, 24, 872, 632, 20, '#3a3c4f', '#6d7289', 3);

  roundedRect(ctx, 32, 32, 230, 88, 18, '#454958', '#171821', 3);
  ctx.fillStyle = '#f3f4f6';
  ctx.beginPath();
  ctx.arc(68, 76, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e5178';
  ctx.beginPath();
  ctx.arc(68, 76, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef8a2f';
  ctx.beginPath();
  ctx.arc(68, 69, 14, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#fbfbfb';
  ctx.beginPath();
  ctx.arc(68, 83, 14, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#171821';
  ctx.beginPath();
  ctx.arc(68, 76, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ce3a54';
  ctx.beginPath();
  ctx.arc(114, 63, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7c43b';
  ctx.beginPath();
  ctx.arc(136, 63, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5392df';
  ctx.beginPath();
  ctx.arc(158, 63, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#191b24';
  ctx.fillRect(106, 80, 58, 4);
  ctx.fillRect(106, 91, 58, 4);

  roundedRect(ctx, 32, 136, 230, 294, 16, '#232533', '#70758f', 3);
  roundedRect(ctx, 274, 32, 614, 398, 16, '#232533', '#70758f', 3);
  roundedRect(ctx, 286, 44, 590, 382, 14, '#1f7e79', '#5ea8b2', 3);
  roundedRect(ctx, 32, 444, 432, 196, 16, '#232533', '#70758f', 3);
  roundedRect(ctx, 478, 444, 410, 196, 16, '#232533', '#70758f', 3);

  ctx.fillStyle = '#f2f5f8';
  ctx.font = 'bold 24px Sans';
  ctx.fillText('OT ' + trainerName, 286, 70);
  ctx.font = 'bold 22px Sans';
  ctx.fillText('Lv. ' + level, 796, 70);

  ctx.font = 'bold 22px Sans';
  let statY = 184;
  for (const statRow of STAT_ROWS) {
    ctx.fillStyle = '#f2f5f8';
    ctx.fillText(statRow.label, 48, statY);
    if (showIvs) {
      ctx.fillStyle = '#f8e4a1';
      ctx.fillText(String(Number(stats[statRow.key] || 0)).padStart(3, ' '), 114, statY);
      ctx.fillStyle = '#73d4f3';
      ctx.fillText(String(Number(pokemon.ivs && pokemon.ivs[statRow.key] || 0)).padStart(2, '0'), 176, statY);
      ctx.fillStyle = '#9fe2a0';
      ctx.fillText(String(Number(pokemon.evs && pokemon.evs[statRow.key] || 0)).padStart(3, ' '), 214, statY);
    }
    statY += 39;
  }

  if (spriteUrl) {
    try {
      const sprite = await loadImageSource(loadImage, spriteUrl);
      const box = { x: 310, y: 58, w: 540, h: 310 };
      const scale = Math.min(box.w / sprite.width, box.h / sprite.height, 3.0);
      const drawW = sprite.width * scale;
      const drawH = sprite.height * scale;
      const drawX = box.x + ((box.w - drawW) / 2);
      const drawY = box.y + ((box.h - drawH) / 2) - 18;
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    } catch (_) {
      ctx.fillStyle = '#e6edf2';
      ctx.font = 'bold 60px Sans';
      ctx.fillText('?', 550, 170);
    }
  }

  const badgeText = Array.isArray(profile.types) && profile.types.length > 0
    ? profile.types.map((type) => String(type || '').toUpperCase()).filter(Boolean).join(' / ')
    : 'NORMAL';
  ctx.font = 'bold 14px Sans';
  const badgeWidth = Math.max(80, ctx.measureText(badgeText).width + 22);
  roundedRect(ctx, 764 - badgeWidth, 54, badgeWidth, 28, 10, '#b9b07a', '#d8d3b4', 2);
  ctx.fillStyle = '#f7f6ed';
  ctx.fillText(badgeText, 775 - badgeWidth, 73);

  const title = (displayName + (displaySymbol ? ' ' + displaySymbol : '')).trim();
  const titleSize = fitText(ctx, title, 500, 34, 'bold', 'Sans');
  ctx.fillStyle = '#f2d98e';
  ctx.font = `bold ${titleSize}px Sans`;
  const titleWidth = ctx.measureText(title).width;
  ctx.fillText(title, 286 + ((590 - titleWidth) / 2), 356);

  ctx.fillStyle = '#f2f5f8';
  ctx.font = 'bold 18px Sans';
  ctx.fillText('Moves', 48, 474);
  ctx.fillText('Details', 494, 474);
  if (showIvs) {
    ctx.font = 'bold 14px Sans';
    ctx.fillStyle = '#73d4f3';
    ctx.fillText('IV', 176, 152);
    ctx.fillStyle = '#9fe2a0';
    ctx.fillText('EV', 216, 152);
  }

  ctx.fillStyle = '#f2f5f8';
  const moveList = (moves.length ? moves : ['None']).slice(0, 4);
  let moveY = 488;
  for (const move of (showIvs ? moveList : ['Hidden', 'Hidden', 'Hidden', 'Hidden'])) {
    roundedRect(ctx, 42, moveY, 412, 24, 8, '#2c3041', '#4f556f', 1);
    const fitted = fitText(ctx, move, 384, 22, 'bold', 'Sans');
    ctx.font = `bold ${fitted}px Sans`;
    ctx.fillStyle = '#f2f5f8';
    ctx.fillText(move, 52, moveY + 18);
    moveY += 26;
  }

  ctx.fillStyle = '#12141b';
  ctx.fillRect(42, 592, 412, 38);
  ctx.fillStyle = '#f2f5f8';
  ctx.font = 'bold 16px Sans';
  ctx.fillText('Ability', 48, 617);
  const abilityText = showIvs ? he.decode(String(titleCaseAbility(pokemon.ability || 'none'))) : 'Hidden';
  const abilityFont = fitText(ctx, abilityText, 300, 16, 'normal', 'Sans');
  ctx.font = `normal ${abilityFont}px Sans`;
  ctx.fillText(abilityText, 124, 617);

  drawLabelValue(ctx, 'Nature', showIvs ? he.decode(String(pokemon.nature || 'None')) : 'Hidden', 494, 512, 104, 240);
  drawLabelValue(ctx, 'Item', showIvs ? he.decode(String(titleCaseHeldItem(pokemon.held_item || 'none'))) : 'Hidden', 494, 546, 104, 240);
  drawLabelValue(ctx, 'Next Level', showIvs ? (needToNextLevel.toLocaleString() + ' EXP') : 'Hidden', 494, 580, 146, 188);

  return canvas.toBuffer('image/png');
}

async function sendPokemonCard(ctx, deps, userData, pokemon, replyToMessageId, options = {}) {
  const resolvedOptions = resolvePokemonCardOptions(userData, options);
  const imageBuffer = await renderPokemonStatsCard(deps, userData, pokemon, resolvedOptions);
  return deps.sendMessage(
    ctx,
    ctx.chat.id,
    { source: imageBuffer },
    {
      reply_to_message_id: replyToMessageId,
      caption: ' ',
      reply_markup: { inline_keyboard: buildPokemonCardKeyboard(pokemon, ctx.from.id, resolvedOptions) }
    }
  );
}

async function editPokemonCard(ctx, deps, userData, pokemon, options = {}) {
  const resolvedOptions = resolvePokemonCardOptions(userData, options);
  const imageBuffer = await renderPokemonStatsCard(deps, userData, pokemon, resolvedOptions);
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
      reply_markup: { inline_keyboard: buildPokemonCardKeyboard(pokemon, ctx.from.id, resolvedOptions) }
    }
  );
}

module.exports = {
  getPokemonStatsCardMode,
  buildPokemonCardKeyboard,
  editPokemonCard,
  getPokemonDisplayImage,
  getPokemonLevelInfo,
  renderPokemonStatsCard,
  resolvePokemonCardOptions,
  sendPokemonCard,
  titleCaseHeldItem
};
