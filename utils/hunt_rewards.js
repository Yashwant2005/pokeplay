const HUNT_TM_CHANCE = 0.01;
const HUNT_MEGA_STONE_CHANCE = 0.0006;
const HUNT_SHINY_CHANCE = 0.0001;

function pickRandom(list, rng = Math.random) {
  if (!Array.isArray(list) || list.length < 1) return null;
  return list[Math.floor(rng() * list.length)] || null;
}

function getEligibleHuntMegaStones(stones) {
  return Object.keys(stones || {}).filter((stoneName) => {
    const megaName = String(stones?.[stoneName]?.mega || '').toLowerCase();
    return megaName.includes('-mega');
  });
}

function rollHuntReward({ tms, stones, rng = Math.random } = {}) {
  const roll = rng();

  if (roll < HUNT_TM_CHANCE) {
    const tmPool = Object.keys(tms?.tmnumber || {});
    const tmNo = pickRandom(tmPool, rng);
    if (tmNo) {
      return { type: 'tm', tmNo, shiny: false };
    }
  }

  if (roll < (HUNT_TM_CHANCE + HUNT_MEGA_STONE_CHANCE)) {
    const megaStonePool = getEligibleHuntMegaStones(stones);
    const stone = pickRandom(megaStonePool, rng);
    if (stone) {
      return { type: 'stone', stone, shiny: false };
    }
  }

  return {
    type: 'pokemon',
    shiny: rng() < HUNT_SHINY_CHANCE
  };
}

module.exports = {
  HUNT_TM_CHANCE,
  HUNT_MEGA_STONE_CHANCE,
  HUNT_SHINY_CHANCE,
  getEligibleHuntMegaStones,
  rollHuntReward
};
