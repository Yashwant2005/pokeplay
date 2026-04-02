const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const DEFAULT_STADIUM = path.join(ASSETS_DIR, 'terrains', 'bg-meadow.jpg');
const DEFAULT_POKEMON_PLACEHOLDER = path.join(ASSETS_DIR, '1.png');
const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 450;
const WEATHER_ASSET_MAP = {
  sun: 'sunnyday.png',
  'extreme-sun': 'sunnyday.png',
  rain: 'rain.png',
  'heavy-rain': 'rain.png',
  sandstorm: 'sandstorm.png',
  snow: 'snowstrom.png',
};
const WEATHER_ALPHA_MAP = {
  sun: 0.42,
  'extreme-sun': 0.48,
  rain: 0.58,
  'heavy-rain': 0.66,
  sandstorm: 0.62,
  snow: 0.58,
};
const TERRAIN_MOVE_MAP = {
  'electric terrain': 'electric',
  'grassy terrain': 'grassy',
  'misty terrain': 'misty',
  'psychic terrain': 'psychic',
};
const ROOM_MOVE_MAP = {
  'trick room': 'trickroom',
  'wonder room': 'wonderroom',
};

const imageCache = new Map();
const renderedSceneCache = new Map();
let terrainBackgroundCache = null;

function fileExists(filePath) {
  try {
    return !!filePath && fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

async function loadLocalImage(imagePath) {
  if (!fileExists(imagePath)) {
    throw new Error(`Missing local image: ${imagePath}`);
  }
  if (imageCache.has(imagePath)) return imageCache.get(imagePath);
  const promise = loadImage(fs.readFileSync(imagePath)).catch((error) => {
    imageCache.delete(imagePath);
    throw error;
  });
  imageCache.set(imagePath, promise);
  return promise;
}

function normalizeMoveName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAssetName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function getCurrentTerrainVisualKey(battleData) {
  const terrainName = normalizeMoveName(
    (battleData && battleData.terrain)
    || (battleData && battleData.field && battleData.field.terrain)
  );
  return TERRAIN_MOVE_MAP[terrainName] || '';
}

function hashString(value) {
  const source = String(value || '');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTerrainBackgrounds() {
  if (terrainBackgroundCache) return terrainBackgroundCache;
  const terrainDir = path.join(ASSETS_DIR, 'terrains');
  try {
    terrainBackgroundCache = fs.readdirSync(terrainDir)
      .filter((entry) => /\.(png|jpe?g)$/i.test(entry))
      .map((entry) => path.join(terrainDir, entry));
    return terrainBackgroundCache;
  } catch (error) {
    terrainBackgroundCache = [];
    return terrainBackgroundCache;
  }
}

function ensureBattleSceneState(battleData) {
  if (!battleData.sceneState || typeof battleData.sceneState !== 'object') {
    battleData.sceneState = {};
  }
  const sceneState = battleData.sceneState;
  if (!sceneState.focusPass) {
    sceneState.focusPass = String(battleData.c || '');
  }
  if (!sceneState.stadium) {
    const options = getTerrainBackgrounds();
    sceneState.stadium = options.length > 0
      ? options[hashString(`${battleData.cid || ''}:${battleData.oid || ''}:${battleData.bword || battleData.name || ''}`) % options.length]
      : DEFAULT_STADIUM;
  }
  sceneState.terrain = getCurrentTerrainVisualKey(battleData) || '';
  return sceneState;
}

function setBattleSceneFocusPass(battleData, pass) {
  const sceneState = ensureBattleSceneState(battleData);
  sceneState.focusPass = String(pass || '');
  return sceneState;
}

function applyBattleSceneMoveVisual(battleData, { moveName, pass, isZMove } = {}) {
  const sceneState = ensureBattleSceneState(battleData);
  const normalizedMove = normalizeMoveName(moveName);
  if (pass) sceneState.focusPass = String(pass);
  if (TERRAIN_MOVE_MAP[normalizedMove]) sceneState.terrain = TERRAIN_MOVE_MAP[normalizedMove];
  if (ROOM_MOVE_MAP[normalizedMove]) sceneState.room = ROOM_MOVE_MAP[normalizedMove];
  sceneState.zMove = isZMove ? normalizedMove : '';
  sceneState.lastMove = normalizedMove;
  return sceneState;
}

function getWeatherAssetPath(battleData) {
  const weatherKey = String(battleData && battleData.weather || '').toLowerCase();
  const fileName = WEATHER_ASSET_MAP[weatherKey];
  if (!fileName) return '';
  const fullPath = path.join(ASSETS_DIR, 'weather_effects', fileName);
  return fileExists(fullPath) ? fullPath : '';
}

function findOverlayPath(folder, baseName, extensions) {
  if (!baseName) return '';
  for (const extension of extensions) {
    const candidate = path.join(ASSETS_DIR, folder, `${baseName}.${extension}`);
    if (fileExists(candidate)) return candidate;
  }
  return '';
}

function resolveSpritePath(name, side, isShiny) {
  const key = String(name || '').toLowerCase();
  const candidates = side === 'player'
    ? [
        isShiny ? path.join(ASSETS_DIR, 'sprites-gen5-back-shiny', `${key}.png`) : '',
        path.join(ASSETS_DIR, 'sprites-gen5-back', `${key}.png`),
        isShiny ? path.join(ASSETS_DIR, 'image-shiny', `${key}.png`) : '',
        path.join(ASSETS_DIR, 'image', `${key}.png`),
      ]
    : [
        isShiny ? path.join(ASSETS_DIR, 'sprites-gen5-shiny', `${key}.png`) : '',
        path.join(ASSETS_DIR, 'sprites-gen5', `${key}.png`),
        isShiny ? path.join(ASSETS_DIR, 'image-shiny', `${key}.png`) : '',
        path.join(ASSETS_DIR, 'image', `${key}.png`),
      ];
  return candidates.find((entry) => entry && fileExists(entry)) || (fileExists(DEFAULT_POKEMON_PLACEHOLDER) ? DEFAULT_POKEMON_PLACEHOLDER : '');
}

async function drawContained(ctx, imagePath, x, y, width, height, alpha) {
  if (!imagePath) return;
  const image = await loadLocalImage(imagePath);
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const drawX = x + ((width - drawWidth) / 2);
  const drawY = y + ((height - drawHeight) / 2);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  ctx.restore();
}

function getSpriteBoxes(sceneState, battleData, playerPokemon) {
  const playerFocused = String(sceneState.focusPass || '') === String((playerPokemon && playerPokemon.pass) || battleData.c || '');
  if (playerFocused) {
    return {
      player: { x: 28, y: 178, width: 300, height: 230, alpha: 1 },
      opponent: { x: 470, y: 68, width: 220, height: 180, alpha: 0.9 },
    };
  }
  return {
    player: { x: 55, y: 205, width: 245, height: 190, alpha: 0.9 },
    opponent: { x: 420, y: 52, width: 290, height: 220, alpha: 1 },
  };
}

async function renderSceneBuffer({ battleData, playerPokemon, opponentPokemon }) {
  const sceneState = ensureBattleSceneState(battleData);
  const sceneKey = JSON.stringify({
    stadium: sceneState.stadium || DEFAULT_STADIUM,
    terrain: sceneState.terrain || '',
    room: sceneState.room || '',
    weather: String(battleData && battleData.weather || ''),
    zMove: sceneState.zMove || '',
    focusPass: sceneState.focusPass || '',
    player: playerPokemon ? `${playerPokemon.name}:${playerPokemon.symbol || ''}:${playerPokemon.pass || ''}` : '',
    opponent: opponentPokemon ? `${opponentPokemon.name}:${opponentPokemon.symbol || ''}:${opponentPokemon.pass || ''}` : '',
  });

  if (renderedSceneCache.has(sceneKey)) {
    return renderedSceneCache.get(sceneKey);
  }

  const canvas = createCanvas(SCENE_WIDTH, SCENE_HEIGHT);
  const ctx = canvas.getContext('2d');
  const backgroundPath = fileExists(sceneState.stadium) ? sceneState.stadium : DEFAULT_STADIUM;

  if (fileExists(backgroundPath)) {
    try {
      const background = await loadLocalImage(backgroundPath);
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      ctx.fillStyle = '#6f8f5f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    ctx.fillStyle = '#6f8f5f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const shade = ctx.createLinearGradient(0, canvas.height * 0.45, 0, canvas.height);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const terrainOverlay = findOverlayPath('effect_terrains', sceneState.terrain, ['jpg', 'png', 'jpeg']);
  if (terrainOverlay) {
    try {
      const image = await loadLocalImage(terrainOverlay);
      ctx.save();
      ctx.globalAlpha = 0.68;
      ctx.drawImage(image, 0, Math.round(canvas.height * 0.42), canvas.width, Math.round(canvas.height * 0.58));
      ctx.restore();
    } catch (error) {}
  }

  const boxes = getSpriteBoxes(sceneState, battleData, playerPokemon);
  await drawContained(
    ctx,
    resolveSpritePath(opponentPokemon && opponentPokemon.name, 'opponent', opponentPokemon && opponentPokemon.symbol === '✨'),
    boxes.opponent.x,
    boxes.opponent.y,
    boxes.opponent.width,
    boxes.opponent.height,
    boxes.opponent.alpha
  );
  await drawContained(
    ctx,
    resolveSpritePath(playerPokemon && playerPokemon.name, 'player', playerPokemon && playerPokemon.symbol === '✨'),
    boxes.player.x,
    boxes.player.y,
    boxes.player.width,
    boxes.player.height,
    boxes.player.alpha
  );

  const roomOverlay = findOverlayPath('room_effects', sceneState.room, ['png']);
  if (roomOverlay) {
    try {
      const image = await loadLocalImage(roomOverlay);
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } catch (error) {}
  }

  const weatherOverlay = getWeatherAssetPath(battleData);
  if (weatherOverlay) {
    try {
      const image = await loadLocalImage(weatherOverlay);
      const weatherKey = String(battleData && battleData.weather || '').toLowerCase();
      const weatherAlpha = WEATHER_ALPHA_MAP[weatherKey] || 0.5;
      ctx.save();
      ctx.globalAlpha = weatherAlpha;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } catch (error) {}
  }

  const zMoveOverlay = findOverlayPath('zmoves', normalizeAssetName(sceneState.zMove), ['png']);
  if (zMoveOverlay) {
    try {
      const image = await loadLocalImage(zMoveOverlay);
      ctx.save();
      ctx.globalAlpha = 0.34;
      ctx.drawImage(image, canvas.width - 210, 18, 185, 92);
      ctx.restore();
    } catch (error) {}
  }

  const buffer = canvas.toBuffer('image/png');
  renderedSceneCache.set(sceneKey, buffer);
  if (renderedSceneCache.size > 150) {
    const firstKey = renderedSceneCache.keys().next().value;
    renderedSceneCache.delete(firstKey);
  }
  return buffer;
}

async function buildBattleSceneMedia({ battleData, playerPokemon, opponentPokemon, caption, parseMode }) {
  const buffer = await renderSceneBuffer({ battleData, playerPokemon, opponentPokemon });
  return {
    photo: { source: buffer },
    media: {
      type: 'photo',
      media: { source: buffer },
      caption,
      parse_mode: parseMode || 'HTML',
    },
  };
}

module.exports = {
  ensureBattleSceneState,
  setBattleSceneFocusPass,
  applyBattleSceneMoveVisual,
  buildBattleSceneMedia,
};
