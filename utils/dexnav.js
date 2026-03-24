const fs = require('fs');
const path = require('path');
const he = require('he');
const fetch = require('node-fetch');
const { REGION_CONFIG } = require('./travel_regions');

const CACHE_PATH = path.join(process.cwd(), 'data', 'dexnav_cache.json');
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const LOCATION_PAGE_TTL_MS = 1000 * 60 * 60 * 12;
const TARGET_REGIONS = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'hisui', 'galar', 'paldea'];

let memoryCache = null;

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/pok(?:e|\u00e9)mon/g, 'pokemon')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleizeRegion(regionId) {
  const config = Object.values(REGION_CONFIG).find((entry) => entry.id === regionId);
  return config ? config.label : regionId;
}

function loadCache() {
  if (memoryCache) return memoryCache;
  try {
    if (fs.existsSync(CACHE_PATH)) {
      memoryCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      return memoryCache;
    }
  } catch (_) {
    // Ignore corrupt cache and rebuild.
  }
  memoryCache = {};
  return memoryCache;
}

function saveCache(cache) {
  memoryCache = cache;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n');
}

function getCached(key, ttlMs) {
  const cache = loadCache();
  const entry = cache[key];
  if (!entry || !entry.savedAt || !entry.value) return null;
  if (Date.now() - entry.savedAt > ttlMs) return null;
  return entry.value;
}

function setCached(key, value) {
  const cache = loadCache();
  cache[key] = {
    savedAt: Date.now(),
    value
  };
  saveCache(cache);
  return value;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'pokeplay-dexnav/1.0 (+https://pokemondb.net/location)'
    }
  });
  if (!res.ok) {
    throw new Error('PokemonDB returned ' + res.status + ' for ' + url);
  }
  return await res.text();
}

function stripTags(html) {
  return he.decode(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractTableRows(html) {
  const rows = [];
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html))) {
    rows.push(match[1]);
  }
  return rows;
}

function resolvePokemonSpecies(query, forms, pokes) {
  const direct = normalizeKey(query);
  if (!direct) return null;

  if (forms[direct]) return direct;
  if (pokes[direct]) {
    for (const species of Object.keys(forms)) {
      if ((forms[species] || []).some((entry) => normalizeKey(entry.identifier) === direct)) {
        return species;
      }
    }
    return direct;
  }

  const aliasMap = new Map();
  for (const species of Object.keys(forms)) {
    aliasMap.set(normalizeKey(species), species);
    for (const entry of forms[species] || []) {
      aliasMap.set(normalizeKey(entry.identifier), species);
      if (entry.form_identifier) {
        aliasMap.set(normalizeKey(species + ' ' + entry.form_identifier), species);
      }
    }
  }

  return aliasMap.get(direct) || null;
}

function parsePokemonLocationPage(html, species) {
  const sectionMatch = html.match(/<div id="dex-locations"><\/div>[\s\S]*?<table class="vitals-table">([\s\S]*?)<\/table>/i);
  if (!sectionMatch) {
    return {
      species,
      regions: []
    };
  }

  const regionMap = new Map();
  const rows = extractTableRows(sectionMatch[1]);
  for (const row of rows) {
    const gameHtmlMatch = row.match(/<th[^>]*>([\s\S]*?)<\/th>/i);
    const locationHtmlMatch = row.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    if (!gameHtmlMatch || !locationHtmlMatch) continue;

    const games = Array.from(gameHtmlMatch[1].matchAll(/<span[^>]*class="igame[^"]*"[^>]*>([\s\S]*?)<\/span>/gi))
      .map((m) => stripTags(m[1]))
      .filter(Boolean);

    const links = Array.from(locationHtmlMatch[1].matchAll(/<a href="([^"]*\/location\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi))
      .map((m) => ({
        url: m[1].startsWith('http') ? m[1] : 'https://pokemondb.net' + m[1],
        name: stripTags(m[2])
      }));

    for (const link of links) {
      const slugMatch = link.url.match(/\/location\/([a-z0-9-]+)/i);
      if (!slugMatch) continue;
      const locationSlug = slugMatch[1];
      const regionId = locationSlug.split('-')[0];
      if (!TARGET_REGIONS.includes(regionId)) continue;

      if (!regionMap.has(regionId)) {
        regionMap.set(regionId, new Map());
      }
      const byLocation = regionMap.get(regionId);
      const locationKey = normalizeKey(link.name);
      if (!byLocation.has(locationKey)) {
        byLocation.set(locationKey, {
          name: link.name,
          url: link.url,
          games: []
        });
      }
      const existing = byLocation.get(locationKey);
      for (const game of games) {
        if (!existing.games.includes(game)) {
          existing.games.push(game);
        }
      }
    }
  }

  const regions = TARGET_REGIONS
    .filter((regionId) => regionMap.has(regionId))
    .map((regionId) => ({
      id: regionId,
      label: titleizeRegion(regionId),
      locations: Array.from(regionMap.get(regionId).values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      )
    }));

  return {
    species,
    regions
  };
}

function parseLocationPage(html) {
  const titleMatch = html.match(/<h1>([\s\S]*?)<span class="text-muted">/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : 'Location';
  const encounters = [];

  let currentGeneration = '';
  let currentMethod = '';
  const markerRegex = /<h2 id="gen\d+">([\s\S]*?)<\/h2>|<h3>([\s\S]*?)<\/h3>|<table class="data-table">([\s\S]*?)<\/table>/gi;
  let match;

  while ((match = markerRegex.exec(html))) {
    if (match[1]) {
      currentGeneration = stripTags(match[1]);
      continue;
    }
    if (match[2]) {
      currentMethod = stripTags(match[2]);
      continue;
    }
    if (!match[3]) continue;

    const rows = extractTableRows(match[3]);
    for (const row of rows) {
      if (!row.includes('ent-name')) continue;
      const nameMatch = row.match(/<a class="ent-name"[^>]*>([\s\S]*?)<\/a>/i);
      if (!nameMatch) continue;

      const cellNumMatches = Array.from(row.matchAll(/<td[^>]*class="cell-num[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)).map((m) => stripTags(m[1]));
      const rarityMatch = row.match(/<span class="icon-rarity[^"]*">([\s\S]*?)<\/span>/i);
      const gameMatches = Array.from(row.matchAll(/<td[^>]*class="cell-loc-game[^"]*"[^>]*>([\s\S]*?)<\/td>/gi))
        .map((m) => stripTags(m[1]))
        .filter((value) => value && value !== '-' && value !== '\u2014');

      const levels = cellNumMatches.length > 0 ? cellNumMatches[cellNumMatches.length - 1] : 'Unknown';
      const detailsCellMatches = Array.from(row.matchAll(/<td(?![^>]*class="cell-(?:fixed|loc-game|num))[^>]*>([\s\S]*?)<\/td>/gi))
        .map((m) => stripTags(m[1]))
        .filter(Boolean);

      encounters.push({
        pokemon: stripTags(nameMatch[1]),
        games: gameMatches,
        rarity: rarityMatch ? stripTags(rarityMatch[1]) : '',
        levels,
        details: detailsCellMatches.join(' | '),
        generation: currentGeneration,
        method: currentMethod
      });
    }
  }

  return {
    title,
    encounters
  };
}

function summarizeLevels(values) {
  const numbers = [];
  for (const value of values) {
    const matches = String(value || '').match(/\d+/g) || [];
    for (const match of matches) {
      numbers.push(Number(match));
    }
  }
  if (!numbers.length) {
    return values.filter(Boolean).join(', ') || 'Unknown';
  }
  return Math.min(...numbers) === Math.max(...numbers)
    ? String(Math.min(...numbers))
    : Math.min(...numbers) + '-' + Math.max(...numbers);
}

async function getPokemonDexnav(species) {
  const cacheKey = 'pokemon:' + species;
  const cached = getCached(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const html = await fetchHtml('https://pokemondb.net/pokedex/' + encodeURIComponent(species));
  return setCached(cacheKey, parsePokemonLocationPage(html, species));
}

async function getLocationDexnav(url) {
  const cacheKey = 'location:' + url;
  const cached = getCached(cacheKey, LOCATION_PAGE_TTL_MS);
  if (cached) return cached;

  const html = await fetchHtml(url);
  return setCached(cacheKey, parseLocationPage(html));
}

function buildLocationSummary(locationData, targetSpecies) {
  const targetKey = normalizeKey(targetSpecies);
  const targetRows = locationData.encounters.filter((entry) => normalizeKey(entry.pokemon) === targetKey);
  const otherMap = new Map();

  for (const entry of locationData.encounters) {
    if (normalizeKey(entry.pokemon) === targetKey) continue;
    const key = normalizeKey(entry.pokemon);
    if (!otherMap.has(key)) {
      otherMap.set(key, {
        pokemon: entry.pokemon,
        levels: []
      });
    }
    otherMap.get(key).levels.push(entry.levels);
  }

  const others = Array.from(otherMap.values())
    .sort((a, b) => a.pokemon.localeCompare(b.pokemon, undefined, { sensitivity: 'base' }))
    .map((entry) => ({
      pokemon: entry.pokemon,
      levels: summarizeLevels(entry.levels)
    }));

  return {
    title: locationData.title,
    targetRows,
    others
  };
}

module.exports = {
  resolvePokemonSpecies,
  getPokemonDexnav,
  getLocationDexnav,
  buildLocationSummary,
  normalizeKey,
  titleizeRegion
};
