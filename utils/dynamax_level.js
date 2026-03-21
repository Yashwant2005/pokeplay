function getDynamaxLevel(pokemon) {
  const level = Number(pokemon && pokemon.dynamax_level);
  if (!Number.isFinite(level) || level < 1) return 1;
  return Math.min(10, Math.floor(level));
}

function getDynamaxLevelBar(pokemon) {
  const level = getDynamaxLevel(pokemon);
  return '▰'.repeat(level) + '▱'.repeat(10 - level);
}

module.exports = {
  getDynamaxLevel,
  getDynamaxLevelBar
};
