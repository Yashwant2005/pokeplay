const REGION_CONFIG = {
  national: {
    id: 'national',
    label: 'National',
    defaultRegion: 'national',
    regionKeys: ['national'],
    travelOptions: [{ label: 'National', regionKey: 'national' }]
  },
  kanto: {
    id: 'kanto',
    label: 'Kanto',
    defaultRegion: 'kanto',
    regionKeys: ['kanto', 'letsgo-kanto'],
    locationDataKey: 'Kanto',
    travelOptions: [
      { label: 'Kanto', regionKey: 'kanto' },
      { label: 'LetsGo-Kanto', regionKey: 'letsgo-kanto' }
    ]
  },
  johto: {
    id: 'johto',
    label: 'Johto',
    defaultRegion: 'johto',
    regionKeys: ['johto'],
    locationDataKey: 'Johto',
    travelOptions: [{ label: 'Johto', regionKey: 'johto' }]
  },
  hoenn: {
    id: 'hoenn',
    label: 'Hoenn',
    defaultRegion: 'hoenn',
    regionKeys: ['hoenn'],
    locationDataKey: 'Hoenn',
    travelOptions: [{ label: 'Hoenn', regionKey: 'hoenn' }]
  },
  sinnoh: {
    id: 'sinnoh',
    label: 'Sinnoh',
    defaultRegion: 'sinnoh',
    regionKeys: ['sinnoh'],
    locationDataKey: 'Sinnoh',
    travelOptions: [{ label: 'Sinnoh', regionKey: 'sinnoh' }]
  },
  hisui: {
    id: 'hisui',
    label: 'Hisui',
    defaultRegion: 'hisui',
    regionKeys: ['hisui'],
    locationDataKey: 'Hisui',
    travelOptions: [{ label: 'Hisui', regionKey: 'hisui' }]
  },
  unova: {
    id: 'unova',
    label: 'Unova',
    defaultRegion: 'unova',
    regionKeys: ['unova'],
    locationDataKey: 'Unova',
    travelOptions: [{ label: 'Unova', regionKey: 'unova' }]
  },
  kalos: {
    id: 'kalos',
    label: 'Kalos',
    defaultRegion: 'kalos-central',
    regionKeys: ['kalos-central', 'kalos-coastal', 'kalos-mountain'],
    locationDataKey: 'Kalos',
    travelOptions: [
      { label: 'Central', regionKey: 'kalos-central' },
      { label: 'Coastal', regionKey: 'kalos-coastal' },
      { label: 'Mountain', regionKey: 'kalos-mountain' }
    ]
  },
  alola: {
    id: 'alola',
    label: 'Alola',
    defaultRegion: 'alola',
    regionKeys: ['alola', 'melemele', 'akala', 'ulaula', 'poni'],
    locationDataKey: 'Alola',
    travelOptions: [
      { label: 'Alola', regionKey: 'alola' },
      { label: 'Melemele', regionKey: 'melemele' },
      { label: 'Akala', regionKey: 'akala' },
      { label: 'Ulaula', regionKey: 'ulaula' },
      { label: 'Poni', regionKey: 'poni' }
    ]
  },
  galar: {
    id: 'galar',
    label: 'Galar',
    defaultRegion: 'galar',
    regionKeys: ['galar', 'isle-of-armor', 'crown-tundra'],
    locationDataKey: 'Galar',
    travelOptions: [
      { label: 'Galar', regionKey: 'galar' },
      { label: 'Isle Of Armor', regionKey: 'isle-of-armor' },
      { label: 'Crown Tundra', regionKey: 'crown-tundra' }
    ]
  },
  paldea: {
    id: 'paldea',
    label: 'Paldea',
    defaultRegion: 'paldea',
    regionKeys: ['paldea', 'kitakami', 'blueberry'],
    locationDataKey: 'Paldea',
    travelOptions: [
      { label: 'Paldea', regionKey: 'paldea' },
      { label: 'Kitakami', regionKey: 'kitakami' },
      { label: 'Blueberry', regionKey: 'blueberry' }
    ]
  },
  conquest: {
    id: 'conquest',
    label: 'Conquest Gallery',
    defaultRegion: 'conquest-gallery',
    regionKeys: ['conquest-gallery'],
    travelOptions: [{ label: 'Conquest Gallery', regionKey: 'conquest-gallery' }]
  }
};

const MAIN_MENU_LAYOUT = [
  ['national'],
  ['kanto', 'johto', 'hoenn'],
  ['sinnoh', 'hisui', 'unova', 'kalos'],
  ['alola', 'galar', 'paldea'],
  ['conquest']
];

function getRegionConfigByRegionKey(regionKey) {
  const normalized = String(regionKey || '').toLowerCase();
  return Object.values(REGION_CONFIG).find((config) => config.regionKeys.includes(normalized)) || null;
}

function buildMainTravelKeyboard(userId) {
  return MAIN_MENU_LAYOUT.map((row) =>
    row.map((id) => ({
      text: REGION_CONFIG[id].label,
      callback_data: 'travel_menu:'+id+'_'+userId+''
    }))
  );
}

function chunkOptions(options, size) {
  const rows = [];
  for(let i = 0; i < options.length; i += size){
    rows.push(options.slice(i, i + size));
  }
  return rows;
}

module.exports = {
  REGION_CONFIG,
  MAIN_MENU_LAYOUT,
  getRegionConfigByRegionKey,
  buildMainTravelKeyboard,
  chunkOptions
};
