const EVOLUTION_STONES = {
  'fire-stone': { label: 'Fire Stone', price: 3000 },
  'water-stone': { label: 'Water Stone', price: 3000 },
  'thunder-stone': { label: 'Thunder Stone', price: 3000 },
  'leaf-stone': { label: 'Leaf Stone', price: 3000 },
  'moon-stone': { label: 'Moon Stone', price: 3000 },
  'sun-stone': { label: 'Sun Stone', price: 3000 },
  'shiny-stone': { label: 'Shiny Stone', price: 3000 },
  'dusk-stone': { label: 'Dusk Stone', price: 3000 },
  'dawn-stone': { label: 'Dawn Stone', price: 3000 },
  'ice-stone': { label: 'Ice Stone', price: 3000 }
};

const EVOLUTION_ITEM_BY_TARGET = {
  vileplume: 'leaf-stone',
  bellossom: 'sun-stone',
  ninetales: 'fire-stone',
  arcanine: 'fire-stone',
  poliwrath: 'water-stone',
  cloyster: 'water-stone',
  starmie: 'water-stone',
  victreebel: 'leaf-stone',
  raichu: 'thunder-stone',
  exeggutor: 'leaf-stone',
  marowak: 'thunder-stone',
  weepinbell: '',
  vaporeon: 'water-stone',
  jolteon: 'thunder-stone',
  flareon: 'fire-stone',
  leafeon: 'leaf-stone',
  glaceon: 'ice-stone',
  nidoqueen: 'moon-stone',
  nidoking: 'moon-stone',
  clefable: 'moon-stone',
  wigglytuff: 'moon-stone',
  skuntank: 'moon-stone',
  musharna: 'moon-stone',
  delcatty: 'moon-stone',
  roserade: 'shiny-stone',
  togetic: 'shiny-stone',
  togekiss: 'shiny-stone',
  cinccino: 'shiny-stone',
  minccino: '',
  misdreavus: '',
  mismagius: 'dusk-stone',
  murkrow: '',
  honchkrow: 'dusk-stone',
  lampent: '',
  chandelure: 'dusk-stone',
  doublade: '',
  aegislash: 'dusk-stone',
  kirlia: '',
  gallade: 'dawn-stone',
  snorunt: '',
  froslass: 'dawn-stone',
  togetic: 'shiny-stone',
  floette: '',
  florges: 'shiny-stone',
  heliolisk: 'sun-stone',
  cottonee: '',
  whimsicott: 'sun-stone',
  petilil: '',
  lilligant: 'sun-stone',
  gloom: '',
  oddish: '',
  panpour: '',
  simipour: 'water-stone',
  pansage: '',
  simisage: 'leaf-stone',
  pansear: '',
  simisear: 'fire-stone',
  pikachu: '',
  eelektrik: '',
  eelektross: 'thunder-stone',
  charjabug: '',
  vikavolt: 'thunder-stone',
  crabrawler: '',
  crabominable: 'ice-stone',
  'sandshrew-alola': '',
  'sandslash-alola': 'ice-stone',
  'vulpix-alola': '',
  'ninetales-alola': 'ice-stone'
};

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeStoneName(value) {
  return normalizeName(value).replace(/[_\s]+/g, '-');
}

function titleCaseEvolutionStone(value) {
  const key = normalizeStoneName(value);
  if (EVOLUTION_STONES[key] && EVOLUTION_STONES[key].label) return EVOLUTION_STONES[key].label;
  return key.split('-').map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part).join(' ');
}

function getEvolutionStoneForTarget(targetName) {
  return normalizeStoneName(EVOLUTION_ITEM_BY_TARGET[normalizeName(targetName)] || '');
}

function getEvolutionStoneCount(data, stoneName) {
  const key = normalizeStoneName(stoneName);
  if (!key) return 0;
  const list = Array.isArray(data && data.inv && data.inv.evostones) ? data.inv.evostones : [];
  return list.reduce((count, item) => count + (normalizeStoneName(item) === key ? 1 : 0), 0);
}

function removeEvolutionStone(data, stoneName) {
  const key = normalizeStoneName(stoneName);
  if (!key || !data || !data.inv || !Array.isArray(data.inv.evostones)) return false;
  const index = data.inv.evostones.findIndex((item) => normalizeStoneName(item) === key);
  if (index < 0) return false;
  data.inv.evostones.splice(index, 1);
  return true;
}

function getLocalEvolutionTimeInfo(now) {
  const date = now instanceof Date ? now : new Date();
  const hour = Number(date.getHours());
  if (hour >= 16 && hour < 18) return { bucket: 'evening', hour };
  if (hour >= 18 || hour < 6) return { bucket: 'night', hour };
  return { bucket: 'day', hour };
}

module.exports = {
  EVOLUTION_STONES,
  normalizeStoneName,
  titleCaseEvolutionStone,
  getEvolutionStoneForTarget,
  getEvolutionStoneCount,
  removeEvolutionStone,
  getLocalEvolutionTimeInfo
};
