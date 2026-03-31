const { titleCaseAbility } = require('./pokemon_ability');
const { getDisplayPokemonName, getDisplayPokemonSymbol } = require('./gmax_utils');
const { getDynamaxLevel, getDynamaxLevelBar } = require('./dynamax_level');
const { isRayquazaLockedFromHeldItems } = require('./pokemon_item_rules');

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
      needToNextLevel: 0
    };
  }

  const matchingLevels = Object.keys(expChart).filter((level) => Number(pokemon.exp) >= Number(expChart[level]));
  const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1], 10) : 1;
  const nextLevelExp = Number(expChart[level + 1] || pokemon.exp || 0);
  return {
    level,
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
      { text: 'Stats', callback_data: 'ste_' + pokemon.pass + '_' + userId },
      { text: 'IVs/EVs', callback_data: 'pkisvs_' + pokemon.pass + '_' + userId },
      { text: 'Moveset', callback_data: 'moves_' + pokemon.pass + '_' + userId }
    ]
  ];

  const actionRow = [{ text: 'Evolve', callback_data: 'evolve_' + pokemon.pass + '_' + userId }];
  if (!isRayquazaLockedFromHeldItems(pokemon)) {
    actionRow.push({ text: 'Held Items', callback_data: 'heldpanel_' + pokemon.pass + '_' + userId });
  }
  actionRow.push({ text: 'Release', callback_data: 'release_' + pokemon.pass + '_' + userId });
  keyboard.push(actionRow);

  const abilityNorm = String(pokemon.ability || '').toLowerCase().replace(/[-_\s]/g, '');
  if (abilityNorm === 'aurabreak' && !pokemon.powerConstructChanged) {
    keyboard.push([{ text: 'Power Construct', callback_data: 'zygpc_' + pokemon.pass + '_' + userId }]);
  }

  return keyboard;
}

function buildPokemonCaption(deps, userData, pokemon) {
  const { c, forms, pokes, growth_rates, chart } = deps;
  const p = pokes[pokemon.name] || {};
  const { level, needToNextLevel } = getPokemonLevelInfo(pokemon, growth_rates, chart);
  let msg = '➤ *' + c(getDisplayPokemonName(pokemon, forms)) + ' ' + getDisplayPokemonSymbol(pokemon) + '*';
  msg += '\nLevel: ' + level + ' | Nature: ' + c(pokemon.nature);
  msg += '\nAbility: ' + c(titleCaseAbility(pokemon.ability || 'none'));
  msg += '\nHeld Item: ' + c(titleCaseHeldItem(pokemon.held_item || 'none'));
  msg += '\nDynamax Level: ' + getDynamaxLevel(pokemon);
  msg += '\n`' + getDynamaxLevelBar(pokemon) + '`';
  msg += '\nTypes: ' + c((p.types || []).join(' / '));
  msg += '\nEXP: ' + Number(pokemon.exp || 0).toLocaleString();
  msg += '\nNeed To Next Level: ' + needToNextLevel.toLocaleString();
  msg += '\n`          `';
  return msg;
}

async function sendPokemonCard(ctx, deps, userData, pokemon, replyToMessageId) {
  const image = getPokemonDisplayImage(pokemon, deps.pokes, deps.shiny, deps.events);
  return deps.sendMessage(
    ctx,
    ctx.chat.id,
    image,
    {
      caption: buildPokemonCaption(deps, userData, pokemon),
      parse_mode: 'markdown',
      reply_to_message_id: replyToMessageId,
      reply_markup: { inline_keyboard: buildPokemonCardKeyboard(pokemon, ctx.from.id) }
    }
  );
}

async function editPokemonCard(ctx, deps, userData, pokemon) {
  return deps.editMessage(
    'caption',
    ctx,
    ctx.chat.id,
    ctx.callbackQuery.message.message_id,
    buildPokemonCaption(deps, userData, pokemon),
    {
      parse_mode: 'markdown',
      reply_markup: { inline_keyboard: buildPokemonCardKeyboard(pokemon, ctx.from.id) }
    }
  );
}

module.exports = {
  buildPokemonCardKeyboard,
  buildPokemonCaption,
  editPokemonCard,
  getPokemonDisplayImage,
  getPokemonLevelInfo,
  sendPokemonCard,
  titleCaseHeldItem
};
