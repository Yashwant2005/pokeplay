function registerBattleStatsCommand(bot, deps) {
  const { check, getUserData, sendMessage, loadMessageData, loadBattleData, pokes, c, chains, stringSimilarity, pokestats, plevel, Stats, getBattleStatus, getSpeedWithStatus } = deps;
  const { titleCaseAbility } = require('../../utils/pokemon_ability');
  const { getBattleBaseStats, getImpersonateTargetName } = require('../../utils/battle_impersonate');
  const {
    ensurePokemonStatStages,
    applyStageToStat,
    getBattleHeldItemName,
    getStageMultiplier,
    getHeldItemStatMultipliers,
    getAttackStatMultiplier,
    getSupremeOverlordInfo
  } = require('../../utils/battle_abilities');

  const MAIN_STATS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed'];

  function titleCaseHeldItem(value) {
    return String(value || 'none')
      .replace(/[_-]+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'None';
  }

  function findCurrentBattleKey(messageData, userId, chatId) {
    if (messageData && messageData[chatId] && Number(messageData[chatId].id) === Number(userId)) {
      return String(chatId);
    }
    for (const [key, value] of Object.entries(messageData || {})) {
      if (!value || typeof value !== 'object') continue;
      if (Number(value.id) === Number(userId)) return String(key);
      if (Number(value.turn) === Number(userId) || Number(value.oppo) === Number(userId)) return String(key);
    }
    return '';
  }

  function findBattlePokemon(data, battleData, userId, query) {
    const onTurnSide = Number(battleData.cid) === Number(userId);
    const sideMap = onTurnSide ? (battleData.tem || {}) : (battleData.tem2 || {});
    const activePass = onTurnSide ? battleData.c : battleData.o;
    const sidePasses = Object.keys(sideMap);
    const candidates = (data.pokes || []).filter((p) => sidePasses.includes(String(p.pass)));

    if (candidates.length < 1) {
      return { sideMap, activePass, pokemon: null };
    }

    if (!query) {
      return {
        sideMap,
        activePass,
        pokemon: candidates.find((p) => String(p.pass) === String(activePass)) || candidates[0]
      };
    }

    const normalizedQuery = String(query).trim().toLowerCase();
    const hyphenQuery = normalizedQuery.replace(/ /g, '-');
    const direct = candidates.find((p) => {
      return String(p.pass) === query
        || (p.nickname && p.nickname.toLowerCase() === normalizedQuery)
        || String(p.name || '').toLowerCase() === hyphenQuery;
    });
    if (direct) {
      return { sideMap, activePass, pokemon: direct };
    }

    const names = candidates.map((p) => p.nickname || p.name).filter(Boolean);
    if (names.length === 0) return { sideMap, activePass, pokemon: null };
    const best = stringSimilarity.findBestMatch(normalizedQuery, names).bestMatch;
    if (best && best.rating > 0.45) {
      const pokemon = candidates.find((p) => (p.nickname || p.name) === best.target) || null;
      return { sideMap, activePass, pokemon };
    }

    return { sideMap, activePass, pokemon: null };
  }

  function formatStage(stage) {
    const value = Number(stage) || 0;
    return value > 0 ? `+${value}` : String(value);
  }

  bot.command('battlestats', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    const messageData = await loadMessageData();

    if (!messageData.battle || !messageData.battle.some(id => String(id) === String(ctx.from.id))) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You are not in a *battle* right now.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const battleKey = findCurrentBattleKey(messageData, ctx.from.id, ctx.chat.id);
    if (!battleKey) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Could not find your current *battle data*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const battleData = loadBattleData(battleKey);
    if (!battleData || typeof battleData !== 'object') {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Could not load your current *battle data*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const query = String(ctx.message.text || '').split(' ').slice(1).join(' ').trim();
    const battleSide = findBattlePokemon(data, battleData, ctx.from.id, query);
    const p = battleSide.pokemon;
    if (!p) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'That pokemon is not on your current *battle side*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const base = getBattleBaseStats({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: p.ability,
      pokestats
    });
    if (!base) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Could not find base stats for *' + c(p.name) + '*.', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const level = plevel(p.name, p.exp);
    const stats = await Stats(base, p.ivs, p.evs, c(p.nature), level);
    const stages = ensurePokemonStatStages(battleData, p.pass);
    const heldItemInfo = getHeldItemStatMultipliers({
      pokemonName: p.name,
      heldItem: getBattleHeldItemName({ battleData, pass: p.pass, heldItem: p.held_item }),
      evolutionChains: chains
    });
    const liveHeldItem = getBattleHeldItemName({ battleData, pass: p.pass, heldItem: p.held_item });
    const impersonateTarget = getImpersonateTargetName({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: p.ability
    });
    const supremeOverlordInfo = getSupremeOverlordInfo({
      abilityName: p.ability,
      partyHpMap: battleSide.sideMap,
      activePass: p.pass
    });

    const currentHp = Number(battleSide.sideMap[p.pass]);
    const battleStatus = typeof getBattleStatus === 'function' ? getBattleStatus(battleData, p.pass) : null;
    const finalStats = {
      hp: Number.isFinite(currentHp) ? currentHp : stats.hp
    };

    for (const statKey of MAIN_STATS) {
      let battleValue = applyStageToStat(stats[statKey], stages[statKey] || 0);

      if (statKey === 'attack') {
        battleValue = Math.max(1, Math.floor(battleValue * heldItemInfo.attack));
        battleValue = Math.max(1, Math.floor(battleValue * getAttackStatMultiplier(p.ability, 'physical')));
        if (supremeOverlordInfo.active) {
          battleValue = Math.max(1, Math.floor(battleValue * supremeOverlordInfo.multiplier));
        }
      } else if (statKey === 'special_attack') {
        battleValue = Math.max(1, Math.floor(battleValue * heldItemInfo.special_attack));
        if (supremeOverlordInfo.active) {
          battleValue = Math.max(1, Math.floor(battleValue * supremeOverlordInfo.multiplier));
        }
      } else if (statKey === 'defense') {
        battleValue = Math.max(1, Math.floor(battleValue * heldItemInfo.defense));
      } else if (statKey === 'special_defense') {
        battleValue = Math.max(1, Math.floor(battleValue * heldItemInfo.special_defense));
      }

      if (statKey === 'speed' && typeof getSpeedWithStatus === 'function') {
        battleValue = getSpeedWithStatus(battleValue, battleData, p.pass);
        battleValue = Math.max(1, Math.floor(battleValue * (heldItemInfo.speed || 1)));
      }

      finalStats[statKey] = battleValue;
    }

    let msg = '➤ *' + c(p.nickname || p.name) + '*';
    if (String(p.pass) === String(battleSide.activePass)) {
      msg += ' *(Active)*';
    }
    msg += '\n*Species:* ' + c(p.name);
    msg += '\n*Level:* ' + level + ' | *Nature:* ' + c(p.nature);
    msg += '\n*Ability:* ' + c(titleCaseAbility(p.ability || 'none'));
    msg += '\n*Held Item:* ' + c(titleCaseHeldItem(liveHeldItem || 'none'));
    if (impersonateTarget) {
      msg += '\n*Impersonate:* ' + c(impersonateTarget);
    }
    msg += '\n*HP:* ' + finalStats.hp + '/' + stats.hp;
    if (battleStatus) {
      msg += '\n*Status:* ' + c(String(battleStatus).replace(/_/g, ' '));
    }

    msg += '\n\n*Battle Stats*';
    msg += '\n`Attack        ' + String(finalStats.attack).padStart(4) + ' | Stage ' + formatStage(stages.attack) + '`';
    msg += '\n`Defense       ' + String(finalStats.defense).padStart(4) + ' | Stage ' + formatStage(stages.defense) + '`';
    msg += '\n`Sp. Attack    ' + String(finalStats.special_attack).padStart(4) + ' | Stage ' + formatStage(stages.special_attack) + '`';
    msg += '\n`Sp. Defense   ' + String(finalStats.special_defense).padStart(4) + ' | Stage ' + formatStage(stages.special_defense) + '`';
    msg += '\n`Speed         ' + String(finalStats.speed).padStart(4) + ' | Stage ' + formatStage(stages.speed) + '`';
    msg += '\n`Accuracy      x' + getStageMultiplier(stages.accuracy || 0).toFixed(2) + ' | Stage ' + formatStage(stages.accuracy) + '`';
    msg += '\n`Evasion       x' + getStageMultiplier(stages.evasion || 0).toFixed(2) + ' | Stage ' + formatStage(stages.evasion) + '`';

    const notes = [];
    if (heldItemInfo.lightBallActive) notes.push('Light Ball is boosting Attack and Sp. Attack');
    if (heldItemInfo.evioliteActive) notes.push('Eviolite is boosting Defense and Sp. Defense');
    if (heldItemInfo.assaultVestActive) notes.push('Assault Vest is boosting Sp. Defense and blocking status move selection');
    if (heldItemInfo.choiceBandActive) notes.push('Choice Band is boosting Attack and locking move choice');
    if (heldItemInfo.choiceSpecsActive) notes.push('Choice Specs is boosting Sp. Attack and locking move choice');
    if (heldItemInfo.choiceScarfActive) notes.push('Choice Scarf is boosting Speed and locking move choice');
    if (heldItemInfo.lifeOrbActive) notes.push('Life Orb is boosting damaging moves and will deal recoil after attacks');
    if (getAttackStatMultiplier(p.ability, 'physical') > 1) notes.push(c(titleCaseAbility(p.ability || 'none')) + ' is boosting Attack');
    if (supremeOverlordInfo.active) notes.push('Supreme Overlord boost: x' + supremeOverlordInfo.multiplier.toFixed(1));
    if (battleStatus === 'paralyze') notes.push('Paralysis is reducing Speed');

    if (notes.length > 0) {
      msg += '\n\n*Applied Modifiers*';
      msg += '\n- ' + notes.join('\n- ');
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerBattleStatsCommand;
