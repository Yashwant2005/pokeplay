const {
  applyAbsorbMoveAbility: applyAbilityAbsorbMove,
  applyStageChanges,
  applyMultiscaleReduction,
  applyShadowShieldReduction,
  applyStaminaOnHit,
  applySturdySurvival,
  applyWeakArmorOnHit,
  applyEndTurnAbility: applyAbilityEndTurn,
  applyEntryAbility: applyAbilityEntry,
  getAttackStatMultiplier,
  getGoodAsGoldInfo,
  getInfiltratorInfo,
  getLevitateInfo,
  getPinchAbilityInfo,
  getPinchPowerMultiplier,
  getStabInfo,
  getSupremeOverlordInfo,
  getTechnicianPowerInfo,
  getUnawareBattleModifiers,
  normalizeAbilityName,
  applyKoAbility: applyAbilityKo,
  applyOnDamageTakenAbilities: applyAbilityOnDamageTaken
} = require('../../utils/battle_abilities');

function registerBattleCallbacks(bot, deps) {
  const {
    getUserData,
    editMessage,
    loadBattleData,
    saveBattleData,
    fs,
    c,
    pokes,
    pokestats,
    plevel,
    Stats,
    battlec,
    spawn,
    shiny,
    events,
    dmoves,
    emojis,
    loadMessageData,
    saveMessageData,
    saveUserData2,
    incexp,
    incexp2,
    stones,
    Bar,
    eff,
    calc,
    getStatusTag,
    ensureBattleStatus,
    getBattleStatus,
    canPokemonAct,
    getMoveStatusEffect,
    isStatusImmune,
    setBattleStatus,
    getStatusLabel,
    applyDefenderResidualDamage,
    getSpeedWithStatus,
    sendMessage,
    tutors,
    word,
    bot: botInstance,
    he
  } = deps;

  const botRef = botInstance || bot;
  const battleDebug = process.env.BATTLE_DEBUG === '1';
  function dbg(label, data) {
    if (!battleDebug) return;
    try {
      // Use stderr so it still prints when QUIET_LOGS disables console.log
      console.error('[BATTLE]', label, typeof data === 'string' ? data : JSON.stringify(data));
    } catch (e) {
      console.error('[BATTLE]', label);
    }
  }

  function hitBattleCooldown(ctx, ms = 2000) {
    const now = Date.now();
    const chatKey = ctx && ctx.chat ? ctx.chat.id : undefined;
    const userId = ctx && ctx.from ? ctx.from.id : undefined;
    const userKey = 'u_' + String(userId);
    const chatLimited = chatKey !== undefined && battlec[chatKey] && now - battlec[chatKey] < ms;
    const userLimited = userId !== undefined && battlec[userKey] && now - battlec[userKey] < ms;
    if (chatLimited || userLimited) return true;
    if (chatKey !== undefined) battlec[chatKey] = now;
    if (userId !== undefined) battlec[userKey] = now;
    return false;
  }

  const safeName = (raw) => {
    const txt = String(raw || "Trainer");
    if (he && typeof he.decode === "function" && typeof he.encode === "function") {
      return he.encode(he.decode(txt));
    }
    return txt;
  };

  const displayName = (data, fallbackId) => {
    if (!data || !data.inv) return safeName(fallbackId);
    return safeName(data.inv.name || data.inv.username || data.inv.id || fallbackId);
  };

  function normalizeMoveName(moveName) {
    return String(moveName || '')
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatAbilityLabel(abilityName) {
    return String(abilityName || 'none')
      .split('-')
      .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
      .join(' ');
  }

  function getAbilityActivationMessage(pokemonName, abilityLabel) {
    return '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + abilityLabel + '</b> activated!';
  }

  function isOpponentTargetingStatusMove(move, moveName) {
    const normalizedMove = normalizeMoveName(moveName || (move && move.name));
    if (normalizedMove === 'leech seed') return true;
    const statusEffect = getMoveStatusEffect(move);
    if (statusEffect) return true;
    const effects = MOVE_STAT_EFFECTS[normalizedMove] || [];
    return effects.some((effect) => effect && effect.target === 'target');
  }

  function getUnawareActivationMessages(options) {
    const { attackerName, defenderName, unawareModifiers } = options || {};
    if (!unawareModifiers) return '';
    let message = '';
    if (unawareModifiers.attackerActivated) {
      message += getAbilityActivationMessage(attackerName, 'Unaware');
    }
    if (unawareModifiers.defenderActivated) {
      message += getAbilityActivationMessage(defenderName, 'Unaware');
    }
    return message;
  }

  function getDisplayedMovePower(move, abilityName, currentHp, maxHp) {
    const rawPower = Number(move && move.power);
    if (!Number.isFinite(rawPower) || rawPower <= 0) return move && move.power;
    const technicianInfo = getTechnicianPowerInfo({
      abilityName,
      movePower: rawPower
    });
    const pinchInfo = getPinchAbilityInfo({
      abilityName,
      moveType: move && move.type,
      currentHp,
      maxHp
    });
    const totalMultiplier = technicianInfo.multiplier * pinchInfo.multiplier;
    if (totalMultiplier === 1) return rawPower;
    const labels = [];
    if (technicianInfo.active) labels.push('x' + technicianInfo.multiplier + ' ' + technicianInfo.abilityLabel);
    if (pinchInfo.active) labels.push('x' + pinchInfo.multiplier + ' ' + pinchInfo.abilityLabel);
    return Math.max(1, Math.floor(rawPower * totalMultiplier)) + ' (' + labels.join(', ') + ')';
  }

  function ensureTurnAbilityState(battleData) {
    if (!battleData.turnAbilityState || typeof battleData.turnAbilityState !== 'object') {
      battleData.turnAbilityState = {};
    }
    if (!battleData.turnAbilityState.skipSpeedBoost || typeof battleData.turnAbilityState.skipSpeedBoost !== 'object') {
      battleData.turnAbilityState.skipSpeedBoost = {};
    }
    if (!battleData.turnAbilityState.failedEscape || typeof battleData.turnAbilityState.failedEscape !== 'object') {
      battleData.turnAbilityState.failedEscape = {};
    }
    return battleData.turnAbilityState;
  }

  function applyDefenderDamageWithSturdy(options) {
    const {
      battleData,
      damage,
      defenderAbility,
      defenderName,
      defenderMaxHp,
      moveName
    } = options;
    const shieldResult = applyShadowShieldReduction({
      abilityName: defenderAbility,
      currentHp: battleData.ohp,
      maxHp: defenderMaxHp,
      incomingDamage: damage,
      moveName,
      pokemonName: defenderName,
      c
    });
    const multiscaleResult = applyMultiscaleReduction({
      abilityName: defenderAbility,
      currentHp: battleData.ohp,
      maxHp: defenderMaxHp,
      incomingDamage: shieldResult.damage,
      pokemonName: defenderName,
      c
    });
    const sturdyResult = applySturdySurvival({
      abilityName: defenderAbility,
      currentHp: battleData.ohp,
      maxHp: defenderMaxHp,
      incomingDamage: multiscaleResult.damage,
      pokemonName: defenderName,
      c
    });
    const actualDamage = Math.min(Math.max(0, sturdyResult.damage), battleData.ohp);
    battleData.ohp = Math.max(battleData.ohp - actualDamage, 0);
    battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o] || 0) - actualDamage, 0);
    return {
      damage: actualDamage,
      message: shieldResult.message + multiscaleResult.message + sturdyResult.message,
      activated: shieldResult.activated || multiscaleResult.activated || sturdyResult.activated
    };
  }

  const NO_CONSECUTIVE_USE_MOVES = new Set([
    'blast burn',
    'eternabeam',
    'frenzy plant',
    'giga impact',
    'hydro cannon',
    'hyper beam',
    'meteor assault',
    'prismatic laser',
    'roar of time',
    'rock wrecker',
    'shadow half',
    'blood moon',
    'gigaton hammer'
  ]);

  const PERFECT_CRIT_MOVES = new Set([
    'flower trick',
    'frost breath',
    'storm throw',
    'surging strikes',
    'wicked blow',
    'zippy zap'
  ]);

  const HIGH_CRIT_RATIO_MOVES = new Set([
    '10,000,000 volt thunderbolt',
    '10 000 000 volt thunderbolt',
    '10000000 volt thunderbolt',
    'aeroblast',
    'air cutter',
    'aqua cutter',
    'attack order',
    'blaze kick',
    'crabhammer',
    'cross chop',
    'cross poison',
    'dire claw',
    'drill run',
    'esper wing',
    'ivy cudgel',
    'karate chop',
    'leaf blade',
    'night slash',
    'plasma fists',
    'poison tail',
    'psycho cut',
    'razor leaf',
    'razor wind',
    'shadow blast',
    'shadow claw',
    'sky attack',
    'slash',
    'snipe shot',
    'spacial rend',
    'stone edge',
    'triple arrows'
  ]);

  const CRIT_DAMAGE_MULTIPLIER = 1.5;
  const HIGH_CRIT_RATIO_CHANCE = 0.125;
  const OHKO_MOVES = new Set([
    'fissure',
    'guillotine',
    'horn drill',
    'sheer cold'
  ]);
  const MINIMIZE_PUNISH_MOVES = new Set([
    'astonish',
    'body slam',
    'double iron bash',
    'dragon rush',
    'extrasensory',
    'flying press',
    'heat crash',
    'heavy slam',
    'malicious moonsault',
    'needle arm',
    'phantom force',
    'shadow force',
    'steamroller',
    'stomp'
  ]);
  const MINIMIZE_PUNISH_MULTIPLIER = 2;
  const CHARGING_TURN_MOVES = new Set([
    'bounce',
    'dig',
    'dive',
    'electro shot',
    'fly',
    'freeze shock',
    'geomancy',
    'ice burn',
    'meteor beam',
    'phantom force',
    'razor wind',
    'shadow force',
    'skull bash',
    'sky attack',
    'sky drop',
    'solar beam',
    'solar blade'
  ]);
  const CHARGE_START_STAT_MOVES = new Set(['electro shot', 'meteor beam', 'skull bash']);
  const SEMI_INVULNERABLE_CHARGE_MOVES = new Set([
    'bounce',
    'dig',
    'dive',
    'fly',
    'phantom force',
    'shadow force',
    'sky drop'
  ]);
  const CAN_HIT_SEMI_INVULNERABLE_MOVES = new Set([
    'bide',
    'earthquake',
    'fissure',
    'gust',
    'helping hand',
    'hurricane',
    'magnitude',
    'sky uppercut',
    'smack down',
    'surf',
    'swift',
    'thousand arrows',
    'thunder',
    'toxic',
    'twister',
    'whirlpool',
    'whirlwind'
  ]);

  const VARIABLE_MULTI_HIT_MOVES = new Set([
    'arm thrust',
    'barrage',
    'bone rush',
    'bullet seed',
    'comet punch',
    'double slap',
    'fury attack',
    'fury swipes',
    'icicle spear',
    'pin missile',
    'rock blast',
    'scale shot',
    'spike cannon',
    'tail slap',
    'water shuriken'
  ]);

  const FIXED_MULTI_HIT_MOVES = {
    'beat up': 2,
    'bonemerang': 2,
    'double hit': 2,
    'double iron bash': 2,
    'double kick': 2,
    'dragon darts': 2,
    'dual chop': 2,
    'dual wingbeat': 2,
    'gear grind': 2,
    'population bomb': 10,
    'surging strikes': 3,
    'tachyon cutter': 2,
    'triple axel': 3,
    'triple dive': 3,
    'triple kick': 3,
    'twin beam': 2,
    'twineedle': 2
  };

  function getMultiHitCount(moveName) {
    if (FIXED_MULTI_HIT_MOVES[moveName]) return FIXED_MULTI_HIT_MOVES[moveName];
    if (!VARIABLE_MULTI_HIT_MOVES.has(moveName)) return 1;

    // Gen V+ style weighted roll for 2-5 hit moves.
    const roll = Math.random();
    if (roll < 0.375) return 2;
    if (roll < 0.75) return 3;
    if (roll < 0.875) return 4;
    return 5;
  }

  function ensureBattleChargingState(battleData) {
    if (!battleData.chargingState || typeof battleData.chargingState !== 'object') {
      battleData.chargingState = {};
    }
    return battleData.chargingState;
  }

  function getChargingStateForPass(battleData, pass) {
    const all = ensureBattleChargingState(battleData);
    return all[String(pass)] || null;
  }

  function setChargingStateForPass(battleData, pass, moveId, moveName) {
    const all = ensureBattleChargingState(battleData);
    all[String(pass)] = { moveId: String(moveId), moveName: String(moveName || '') };
  }

  function clearChargingStateForPass(battleData, pass) {
    const all = ensureBattleChargingState(battleData);
    delete all[String(pass)];
  }

  function ensureSemiInvulnerableState(battleData) {
    if (!battleData.semiInvulnerableState || typeof battleData.semiInvulnerableState !== 'object') {
      battleData.semiInvulnerableState = {};
    }
    return battleData.semiInvulnerableState;
  }

  function getSemiInvulnerableStateForPass(battleData, pass) {
    const all = ensureSemiInvulnerableState(battleData);
    return all[String(pass)] || null;
  }

  function setSemiInvulnerableStateForPass(battleData, pass, moveName) {
    const all = ensureSemiInvulnerableState(battleData);
    all[String(pass)] = { moveName: String(moveName || '') };
  }

  function clearSemiInvulnerableStateForPass(battleData, pass) {
    const all = ensureSemiInvulnerableState(battleData);
    delete all[String(pass)];
  }

  function isSemiInvulnerableAvoidedMove(battleData, defenderPass, moveCategory, moveName) {
    const st = getSemiInvulnerableStateForPass(battleData, defenderPass);
    if (!st || !st.moveName) return false;
    if (CAN_HIT_SEMI_INVULNERABLE_MOVES.has(moveName)) return false;
    return String(moveCategory || '').toLowerCase() !== 'status';
  }

  function getChargingTurnMessage(pokemonName, moveName) {
    const byMove = {
      fly: 'flew up high!',
      bounce: 'sprang up high!',
      dig: 'dug underground!',
      dive: 'hid underwater!',
      'phantom force': 'vanished instantly!',
      'shadow force': 'vanished into the shadows!',
      'sky drop': 'took to the sky!'
    };
    const suffix = byMove[moveName] || 'began charging power!';
    return '\n-> <b>' + c(pokemonName) + '</b> ' + suffix;
  }

  function getSemiInvulnerableAvoidMessage(defenderName, moveName) {
    const byMove = {
      fly: 'is high in the sky',
      bounce: 'is high in the sky',
      dig: 'is underground',
      dive: 'is underwater',
      'phantom force': 'has vanished',
      'shadow force': 'has vanished',
      'sky drop': 'is airborne'
    };
    const where = byMove[moveName] || 'is semi-invulnerable';
    return '\n-> <b>' + c(defenderName) + '</b> avoided the attack because it ' + where + '!';
  }

  function getOhkoHitChance(attackerLevel, defenderLevel) {
    const chance = 30 + (Number(attackerLevel) - Number(defenderLevel));
    return Math.max(0, Math.min(100, chance));
  }

  function ensureBattleScreens(battleData) {
    if (!battleData.screens || typeof battleData.screens !== 'object') {
      battleData.screens = {};
    }
    return battleData.screens;
  }

  function ensureSideScreens(battleData, sideId) {
    const all = ensureBattleScreens(battleData);
    const key = String(sideId);
    if (!all[key] || typeof all[key] !== 'object') {
      all[key] = { reflect: 0, lightScreen: 0, auroraVeil: 0 };
    }
    const side = all[key];
    if (typeof side.reflect !== 'number') side.reflect = 0;
    if (typeof side.lightScreen !== 'number') side.lightScreen = 0;
    if (typeof side.auroraVeil !== 'number') side.auroraVeil = 0;
    return side;
  }

  function applyScreenSetupByMove(moveName, battleData, sideId, didHit) {
    const side = ensureSideScreens(battleData, sideId);
    if (moveName === 'reflect' || (moveName === 'baddy bad' && didHit)) {
      side.reflect = 5;
      return '\n-> Reflect went up on the user\'s side!';
    }
    if (moveName === 'light screen' || (moveName === 'glitzy glow' && didHit)) {
      side.lightScreen = 5;
      return '\n-> Light Screen went up on the user\'s side!';
    }
    if (moveName === 'aurora veil' || (moveName === 'g max resonance' && didHit)) {
      side.auroraVeil = 5;
      return '\n-> Aurora Veil went up on the user\'s side!';
    }
    return '';
  }

  function applyScreenRemovalByMove(moveName, battleData, defenderSideId, didHit) {
    const removers = new Set([
      'brick break',
      'defog',
      'g max wind rage',
      'psychic fangs',
      'raging bull',
      'shadow shed'
    ]);
    if (!didHit || !removers.has(moveName)) return '';
    const side = ensureSideScreens(battleData, defenderSideId);
    if (side.reflect <= 0 && side.lightScreen <= 0 && side.auroraVeil <= 0) return '';
    side.reflect = 0;
    side.lightScreen = 0;
    side.auroraVeil = 0;
    return '\n-> The opposing side\'s screens were shattered!';
  }

  function getScreenDamageMultiplier(battleData, defenderSideId, moveCategory, attackerAbility, moveName) {
    const side = ensureSideScreens(battleData, defenderSideId);
    const infiltratorInfo = getInfiltratorInfo({ abilityName: attackerAbility, moveName });
    if (infiltratorInfo.active && (side.auroraVeil > 0 || side.reflect > 0 || side.lightScreen > 0)) return 1;
    if (side.auroraVeil > 0) return 0.5;
    if (String(moveCategory || '').toLowerCase() === 'physical' && side.reflect > 0) return 0.5;
    if (String(moveCategory || '').toLowerCase() === 'special' && side.lightScreen > 0) return 0.5;
    return 1;
  }

  function getInfiltratorBypassMessage(battleData, defenderSideId, moveCategory, attackerAbility, attackerName, moveName) {
    const side = ensureSideScreens(battleData, defenderSideId);
    const infiltratorInfo = getInfiltratorInfo({ abilityName: attackerAbility, moveName });
    if (!infiltratorInfo.active) return '';
    const blockedByScreens =
      side.auroraVeil > 0 ||
      (String(moveCategory || '').toLowerCase() === 'physical' && side.reflect > 0) ||
      (String(moveCategory || '').toLowerCase() === 'special' && side.lightScreen > 0);
    if (!blockedByScreens) return '';
    return '\n-> <b>' + c(attackerName) + '</b>\'s <b>Infiltrator</b> activated!';
  }

  function tickScreensForTurn(battleData) {
    const all = ensureBattleScreens(battleData);
    for (const key of Object.keys(all)) {
      const side = ensureSideScreens(battleData, key);
      if (side.reflect > 0) side.reflect -= 1;
      if (side.lightScreen > 0) side.lightScreen -= 1;
      if (side.auroraVeil > 0) side.auroraVeil -= 1;
    }
  }

  function ensureBattleMinimizeState(battleData) {
    if (!battleData.minimized || typeof battleData.minimized !== 'object') {
      battleData.minimized = {};
    }
    return battleData.minimized;
  }

  function isPokemonMinimized(battleData, pass) {
    const all = ensureBattleMinimizeState(battleData);
    return all[String(pass)] === true;
  }

  function setPokemonMinimized(battleData, pass, value) {
    const all = ensureBattleMinimizeState(battleData);
    all[String(pass)] = !!value;
  }

  // Helper: build PvP battle message + keyboard with Showdown-style hidden moves
  const buildPvpMsg = (prefix, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroup) => {
    const pp = pokes[p1.name];
    const pp2 = pokes[p2.name];
    const hideTurn = battleData.switchLock && String(battleData.switchLock) === String(battleData.cid);
    const hideOpp = battleData.switchLock && String(battleData.switchLock) === String(battleData.oid);
    let msg = prefix || '';
    msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>';
    if (hideOpp) {
      msg += '\n<b>???</b> [???]';
      msg += '\n<b>Level :</b> ?? | <b>HP :</b> ??/??';
      msg += '\n<code>??????????</code>';
    } else {
      msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o);
      msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+'';
      msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>';
    }
    msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>';
    if (hideTurn) {
      msg += '\n<b>???</b> [???]';
      msg += '\n<b>Level :</b> ?? | <b>HP :</b> ??/??';
      msg += '\n<code>??????????</code>';
    } else {
      msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c);
      msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+'';
      msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>';
    }

    // Revealed moves (moves already used - visible to everyone)
    const usedMoves = battleData.usedMoves || {};
    const p1UsedMoves = usedMoves[battleData.c] || [];
    const showAllMovesInGroup = !isGroup || battleData.tempBattle === true;
    if (showAllMovesInGroup && !hideTurn) {
      msg += '\n\n<b>Moves :</b>';
      for (const move2 of p1.moves) {
        let move = dmoves[move2];
        const shownPower = getDisplayedMovePower(move, p1.ability, battleData.chp, stats2.hp);
        msg += '\n- <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+shownPower+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')';
      }
    } else if (isGroup && p1UsedMoves.length > 0 && !hideTurn) {
      msg += '\n\n<b>Revealed Moves :</b>';
      for (const mid of p1UsedMoves) {
        const mv = dmoves[mid];
        if (mv) {
          const shownPower = getDisplayedMovePower(mv, p1.ability, battleData.chp, stats2.hp);
          msg += '\n- <b>'+c(mv.name)+'</b> ['+c(mv.type)+' '+emojis[mv.type]+'] <b>Power:</b> '+shownPower+' <b>Acc:</b> '+mv.accuracy+' ('+c(mv.category.charAt(0))+')';
        }
      }
    }

    let img = pp.front_default_image;
    const imSh = shiny.filter((poke)=>poke.name==p1.name)[0];
    if (events[p1.name] && p1.symbol == '🪅') img = events[p1.name];
    if (imSh && p1.symbol=='✨') img = imSh.shiny_url;

    let ext = {};
    ext = { link_preview_options: { is_disabled: true } };

    const moves = p1.moves.map(m => ''+m+'');
    let rows = [];
    // Row 1: 4 move buttons in a single row
    let moveButtons = [];
    if (showAllMovesInGroup) {
      moveButtons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
    } else {
      // Showdown-style: 4 buttons where used moves show real name, unused show ???
      moveButtons = moves.map((word) => {
        const isRevealed = p1UsedMoves.includes(word);
        return { text: isRevealed ? c(dmoves[word].name) : '???', callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' };
      });
    }
    if (moveButtons.length < 1) {
      moveButtons.push({ text: 'No Moves', callback_data: 'empty' });
    }
    rows.push(moveButtons);

    // Row 2: 5 switch buttons (other alive pokes)
    const switchButtons = [];
    if (battleData.set.switch) {
      let idx = 1;
      for (const pass of Object.keys(battleData.tem || {})) {
        if (String(pass) === String(battleData.c)) continue;
        if ((battleData.tem[pass] || 0) > 0) {
          switchButtons.push({ text: String(idx), callback_data: 'multidne_' + pass + '_' + bword + '_' + battleData.cid + '_change' });
          idx++;
        }
        if (switchButtons.length >= 5) break;
      }
    }
    if (switchButtons.length > 0) {
      rows.push(switchButtons);
    }

    // Row 3: View Moves + Escape + View Team
    rows.push([
      { text: 'View Moves', callback_data: 'multivwmv_'+bword+'_'+battleData.cid+'' },
      { text: 'Escape', callback_data: 'multryn_'+bword+'_multi' },
      { text: 'View Team', callback_data: 'viewteam_'+bword+'_'+battleData.cid+'' }
    ]);

    if (!attacker.inv.stones) attacker.inv.stones = [];
    const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p1.name);
    if (battleData.set.key_item && isstone.length > 0 && attacker.extra && Object.keys(attacker.extra.megas||{}).length == 0 && (attacker.inv.omniring || attacker.inv.ring)) {
      const rows5 = isstone.map(i => ({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''}));
      rows.push(rows5);
    }

    // Bag/Pokemon buttons removed per new UI layout

    return { msg, keyboard: { inline_keyboard: rows }, ext };
  };

  // Helper to swap turns between cid and oid contexts
  function fullSwap(bd) {
    const cc = bd.c; const cc2 = bd.chp; const cc3 = bd.cid; const cc4 = bd.tem; const cc5 = bd.la;
    bd.c = bd.o; bd.chp = bd.ohp; bd.cid = bd.oid; bd.tem = bd.tem2; bd.la = bd.la2;
    bd.o = cc; bd.ohp = cc2; bd.oid = cc3; bd.tem2 = cc4; bd.la2 = cc5;
  }

  function getMovePriority(moveName, moveCategory, abilityName) {
    const name = String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const category = String(moveCategory || '').toLowerCase();
    const ability = normalizeAbilityName(abilityName);

    const PRIORITY_BY_MOVE = {
      // Increased priority moves
      'accelerock': 1,
      'ally switch': 2,
      'aqua jet': 1,
      'baby doll eyes': 1,
      'baneful bunker': 4,
      'bide': 1,
      'bullet punch': 1,
      'burning bulwark': 4,
      'crafty shield': 3,
      'detect': 4,
      'endure': 4,
      'extreme speed': 2,
      'fake out': 3,
      'feint': 2,
      'first impression': 2,
      'follow me': 2,
      'grassy glide': 1,
      'helping hand': 5,
      'ice shard': 1,
      'ion deluge': 1,
      'jet punch': 1,
      'king s shield': 4,
      'mach punch': 1,
      'magic coat': 4,
      'obstruct': 4,
      'powder': 1,
      'protect': 4,
      'quick attack': 1,
      'quick guard': 3,
      'rage powder': 2,
      'shadow sneak': 1,
      'silk trap': 4,
      'snatch': 4,
      'spiky shield': 4,
      'spotlight': 3,
      'sucker punch': 1,
      'thunderclap': 1,
      'upper hand': 3,
      'vacuum wave': 1,
      'water shuriken': 1,
      'wide guard': 3,
      'zippy zap': 2,

      // Decreased priority moves
      'avalanche': -4,
      'beak blast': -3,
      'circle throw': -6,
      'counter': -5,
      'dragon tail': -6,
      'focus punch': -3,
      'magic room': -7,
      'mirror coat': -5,
      'revenge': -4,
      'roar': -6,
      'shell trap': -3,
      'teleport': -6,
      'trick room': -7,
      'vital throw': -1,
      'whirlwind': -6,
      'wonder room': -7
    };

    const basePriority = PRIORITY_BY_MOVE[name] ?? 0;
    return basePriority + (ability === 'prankster' && category === 'status' ? 1 : 0);
  }

const DRAIN_MOVE_RATIOS = {
  'absorb': 0.5,
  'bitter blade': 0.5,
  'bouncy bubble': 0.5,
  'drain punch': 0.5,
  'giga drain': 0.5,
  'horn leech': 0.5,
  'leech life': 0.5,
  'matcha gotcha': 0.5,
  'mega drain': 0.5,
  'parabolic charge': 0.5,
  'draining kiss': 0.75,
  'dream eater': 0.5,
  'oblivion wing': 0.75
};

function getDrainRatio(moveName) {
  return DRAIN_MOVE_RATIOS[moveName] || 0;
}

const RECOIL_MOVE_RULES = {
  'brave bird': { ratio: 1 / 3 },
  'double edge': { ratio: 1 / 3 },
  'flare blitz': { ratio: 1 / 3 },
  'head charge': { ratio: 1 / 4 },
  'head smash': { ratio: 1 / 2 },
  'light of ruin': { ratio: 1 / 2 },
  'shadow end': { ratio: 1 / 2 },
  'shadow rush': { ratio: 1 / 4 },
  'struggle': { maxHpRatio: 1 / 4 },
  'submission': { ratio: 1 / 4 },
  'take down': { ratio: 1 / 4 },
  'volt tackle': { ratio: 1 / 3 },
  'wave crash': { ratio: 1 / 3 },
  'wild charge': { ratio: 1 / 4 },
  'wood hammer': { ratio: 1 / 3 }
};

function getRecoilDamage(moveName, damageDealt, attackerMaxHp) {
  const rule = RECOIL_MOVE_RULES[moveName];
  if (!rule) return 0;
  if (rule.maxHpRatio) return Math.max(1, Math.floor(attackerMaxHp * rule.maxHpRatio));
  if (damageDealt > 0 && rule.ratio) return Math.max(1, Math.floor(damageDealt * rule.ratio));
  return 0;
}

const CRASH_DAMAGE_MOVES = new Set([
  'axe kick',
  'high jump kick',
  'jump kick',
  'supercell slam'
]);

function getCrashDamage(moveName, attackerMaxHp) {
  if (!CRASH_DAMAGE_MOVES.has(moveName)) return 0;
  return Math.max(1, Math.floor(attackerMaxHp / 2));
}

const SELF_FAINT_MOVES = new Set([
  'explosion',
  'final gambit',
  'healing wish',
  'lunar dance',
  'memento',
  'misty explosion',
  'self destruct'
]);

function applySelfFaintAfterMove(moveName, moveLabel, battleData, attackerPass, attackerName) {
  if (!SELF_FAINT_MOVES.has(moveName)) return '';
  const selfBefore = Math.max(0, battleData.chp || 0);
  if (selfBefore <= 0) return '';
  battleData.chp = 0;
  if (!battleData.tem || typeof battleData.tem !== 'object') battleData.tem = {};
  battleData.tem[attackerPass] = 0;
  return '\n-> <b>'+c(attackerName)+'</b> fainted after using <b>'+c(moveLabel)+'</b>!';
}

function ensureEntryHazards(battleData) {
  if (!battleData.entryHazards || typeof battleData.entryHazards !== 'object') {
    battleData.entryHazards = {};
  }
  return battleData.entryHazards;
}

function ensureSideEntryHazards(battleData, sideId) {
  const all = ensureEntryHazards(battleData);
  const key = String(sideId);
  if (!all[key] || typeof all[key] !== 'object') {
    all[key] = { spikes: 0, toxicSpikes: 0, stealthRock: false, stickyWeb: false, steelSurge: false };
  }
  const side = all[key];
  if (typeof side.spikes !== 'number') side.spikes = 0;
  if (typeof side.toxicSpikes !== 'number') side.toxicSpikes = 0;
  if (typeof side.stealthRock !== 'boolean') side.stealthRock = false;
  if (typeof side.stickyWeb !== 'boolean') side.stickyWeb = false;
  if (typeof side.steelSurge !== 'boolean') side.steelSurge = false;
  return side;
}

function clearSideEntryHazards(battleData, sideId) {
  const side = ensureSideEntryHazards(battleData, sideId);
  const hadAny = side.spikes > 0 || side.toxicSpikes > 0 || side.stealthRock || side.stickyWeb || side.steelSurge;
  side.spikes = 0;
  side.toxicSpikes = 0;
  side.stealthRock = false;
  side.stickyWeb = false;
  side.steelSurge = false;
  return hadAny;
}

function applyEntryHazardSetupByMove(moveName, battleData, targetSideId, didHit) {
  if (!didHit) return '';
  const side = ensureSideEntryHazards(battleData, targetSideId);

  if (moveName === 'spikes' || moveName === 'ceaseless edge') {
    if (side.spikes >= 3) return '\n-> But Spikes cannot be stacked further!';
    side.spikes += 1;
    return '\n-> Spikes were scattered on the opposing side! (Layer ' + side.spikes + '/3)';
  }
  if (moveName === 'toxic spikes') {
    if (side.toxicSpikes >= 2) return '\n-> But Toxic Spikes cannot be stacked further!';
    side.toxicSpikes += 1;
    return '\n-> Toxic Spikes were scattered on the opposing side! (Layer ' + side.toxicSpikes + '/2)';
  }
  if (moveName === 'stealth rock' || moveName === 'stone axe' || moveName === 'g max stonesurge') {
    if (side.stealthRock) return '\n-> But pointed stones are already surrounding the opposing side!';
    side.stealthRock = true;
    return '\n-> Pointed stones float around the opposing side!';
  }
  if (moveName === 'g max steelsurge') {
    if (side.steelSurge) return '\n-> But metal spikes are already surrounding the opposing side!';
    side.steelSurge = true;
    return '\n-> Metal spikes now surround the opposing side!';
  }
  if (moveName === 'sticky web') {
    if (side.stickyWeb) return '\n-> But a Sticky Web is already on the opposing side!';
    side.stickyWeb = true;
    return '\n-> A Sticky Web was laid out on the opposing side!';
  }

  return '';
}

function applyEntryHazardRemovalByMove(moveName, battleData, selfSideId, opposingSideId, didHit) {
  if (moveName === 'defog') {
    const removedSelf = clearSideEntryHazards(battleData, selfSideId);
    const removedOpp = clearSideEntryHazards(battleData, opposingSideId);
    return (removedSelf || removedOpp) ? '\n-> Defog blew away all entry hazards from both sides!' : '';
  }

  if (!didHit) return '';

  if (moveName === 'g max wind rage') {
    const removedSelf = clearSideEntryHazards(battleData, selfSideId);
    const removedOpp = clearSideEntryHazards(battleData, opposingSideId);
    return (removedSelf || removedOpp) ? '\n-> G-Max Wind Rage removed all entry hazards from both sides!' : '';
  }
  if (moveName === 'rapid spin' || moveName === 'mortal spin' || moveName === 'tidy up') {
    const removedSelf = clearSideEntryHazards(battleData, selfSideId);
    return removedSelf ? '\n-> Entry hazards on your side were cleared!' : '';
  }

  return '';
}

  function isGroundedForEntryHazards(pokemonName, abilityName) {
    const types = (pokes[pokemonName]?.types || []).map((t) => String(t).toLowerCase());
    const levitateInfo = getLevitateInfo({ abilityName });
    return !types.includes('flying') && !levitateInfo.active;
  }

async function applyEntryHazardsOnSwitch({ battleData, sideId, pass, pokemonName, abilityName, maxHp }) {
  const side = ensureSideEntryHazards(battleData, sideId);
  let out = '';
  let currentHp = Math.max(0, battleData.chp);
  const types = pokes[pokemonName]?.types || [];
  const type1 = types[0] ? c(types[0]) : null;
  const type2 = types[1] ? c(types[1]) : null;
  const grounded = isGroundedForEntryHazards(pokemonName, abilityName);

  const applyLoss = (raw, label) => {
    if (!raw || raw <= 0 || currentHp <= 0) return;
    const taken = Math.min(raw, currentHp);
    currentHp = Math.max(0, currentHp - taken);
    out += '\n-> <b>' + c(pokemonName) + '</b> was hurt by ' + label + ' and lost <code>' + taken + '</code> HP!';
  };

  if (side.stealthRock && type1) {
    const effRock = await eff('Rock', type1, type2);
    if (effRock > 0) applyLoss(Math.max(1, Math.floor((maxHp / 8) * effRock)), 'Stealth Rock');
  }

  if (side.steelSurge && type1) {
    const effSteel = await eff('Steel', type1, type2);
    if (effSteel > 0) applyLoss(Math.max(1, Math.floor((maxHp / 8) * effSteel)), 'Steel Surge');
  }

  if (grounded && side.spikes > 0) {
    const spikeRatio = side.spikes >= 3 ? 1 / 4 : side.spikes === 2 ? 1 / 6 : 1 / 8;
    applyLoss(Math.max(1, Math.floor(maxHp * spikeRatio)), 'Spikes');
  }

  if (grounded && side.stickyWeb && currentHp > 0) {
    const stickyWebApplied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName,
      changes: [{ stat: 'speed', delta: -1 }],
      c,
      fromOpponent: true
    });
    if (stickyWebApplied.deltas.some((entry) => entry && entry.delta < 0)) {
      out += '\n-> <b>' + c(pokemonName) + '</b> got caught in Sticky Web and its <b>Speed</b> fell!';
    } else {
      out += stickyWebApplied.message;
    }
  }

  if (grounded && side.toxicSpikes > 0 && currentHp > 0) {
    const loweredTypes = types.map((t) => String(t).toLowerCase());
    if (loweredTypes.includes('poison')) {
      side.toxicSpikes = 0;
      out += '\n-> <b>' + c(pokemonName) + '</b> absorbed the Toxic Spikes!';
    } else {
      const existingStatus = getBattleStatus(battleData, pass);
      if (!existingStatus && !isStatusImmune('poison', types)) {
        const toxStatus = side.toxicSpikes >= 2 ? 'badly_poisoned' : 'poison';
        setBattleStatus(battleData, pass, toxStatus);
        out += '\n-> <b>' + c(pokemonName) + '</b> was ' + (toxStatus === 'badly_poisoned' ? 'badly poisoned' : 'poisoned') + ' by Toxic Spikes!';
      }
    }
  }

  battleData.chp = currentHp;
  if (!battleData.tem) battleData.tem = {};
  battleData.tem[pass] = currentHp;
  return out;
}

const STAT_KEYS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];

const MOVE_STAT_EFFECTS = {
  'growl': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'aurora beam': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'baby doll eyes': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'bitter malice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'breaking swipe': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'charm': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'chilling water': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'feather dance': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'lunge': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'max wyrmwind': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'memento': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'noble roar': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'parting shot': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'captivate': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'confide': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'eerie impulse': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'max flutterby': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'play nice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'play rough': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'springtide storm': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.3 }],
  'strength sap': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'mist ball': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.5 }],
  'tearful look': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'tickle': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'trop kick': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'venom drench': [
    { target: 'target', stat: 'attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'special_attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'speed', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] }
  ],
  'tail whip': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'leer': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'screech': [{ target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'crunch': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'crush claw': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'fire lash': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'grav apple': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'iron tail': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.3 }],
  'liquidation': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'max phantasm': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'octolock': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }, { target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'razor shell': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'rock smash': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'shadow bone': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'shadow down': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'spicy extract': [{ target: 'target', stat: 'attack', stages: 2, chance: 1 }, { target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'thunderous kick': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'triple arrows': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'metal sound': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'fake tears': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'acid spray': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'apple acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'psychic': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'shadow ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'bug buzz': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'earth power': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'energy ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'flash cannon': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'focus blast': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'lumina crash': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'luster purge': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.5 }],
  'max darkness': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'seed flare': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 0.4 }],
  'snarl': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'skitter smack': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'spirit break': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'struggle bug': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'mystical fire': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'moonblast': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.3 }],
  'string shot': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bleakwind storm': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.3 }],
  'scary face': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'constrict': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'cotton spore': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'drum beating': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'icy wind': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'glaciate': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'electroweb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'g max foam burst': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bulldoze': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'max strike': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'mud shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'pounce': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'rock tomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'low sweep': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'bubble': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'bubble beam': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'silk trap': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sticky web': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'syrup bomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'tar shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'toxic thread': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sand attack': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'smokescreen': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'kinesis': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'flash': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'mud slap': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'leaf tornado': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'mirror shot': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'mud bomb': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'muddy water': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'night daze': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.4 }],
  'octazooka': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'secret power': [{ target: 'target', randomFrom: ['attack', 'defense', 'special_attack', 'accuracy', 'speed'], stages: -1, chance: 0.3 }],
  'sweet scent': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'defog': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'g max tartness': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'shadow mist': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'swords dance': [{ target: 'self', stat: 'attack', stages: 2, chance: 1 }],
  'howl': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'meditate': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'sharpen': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'bulk up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'dragon dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'acupressure': [{ target: 'self', randomStat: true, stages: 2, chance: 1 }],
  'coil': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'gravity': [],
  'work up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'growth': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'shift gear': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'harden': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'withdraw': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'defense curl': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'iron defense': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'acid armor': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'cotton guard': [{ target: 'self', stat: 'defense', stages: 3, chance: 1 }],
  'cosmic power': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'nasty plot': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }],
  'calm mind': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'tail glow': [{ target: 'self', stat: 'special_attack', stages: 3, chance: 1 }],
  'charge beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.7 }],
  'fiery dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.5 }],
  'electro shot': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'geomancy': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 2, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'max ooze': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'meteor beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'mystical power': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'take heart': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'torch song': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'amnesia': [{ target: 'self', stat: 'special_defense', stages: 2, chance: 1 }],
  'aromatic mist': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'charge': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'max quake': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'quiver dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'agility': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'rock polish': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'autotomize': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'flame charge': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aqua step': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aura wheel': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'esper wing': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'max airstream': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'rapid spin': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'trailblaze': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'double team': [{ target: 'self', stat: 'evasion', stages: 1, chance: 1 }],
  'minimize': [{ target: 'self', stat: 'evasion', stages: 2, chance: 1 }],
  'hone claws': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'close combat': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'armor cannon': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'clanging scales': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'dragon ascent': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'headlong rush': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'hyperspace fury': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'scale shot': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'superpower': [{ target: 'self', stat: 'attack', stages: -1, chance: 1 }, { target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'tera blast': [{ target: 'self', statByMoveCategory: { physical: 'attack', special: 'special_attack' }, stages: -1, chance: 1 }],
  'hammer arm': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'ice hammer': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'spin out': [{ target: 'self', stat: 'speed', stages: -2, chance: 1 }],
  'curse': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'v create': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'overheat': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'make it rain': [{ target: 'self', stat: 'special_attack', stages: -1, chance: 1 }],
  'leaf storm': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'draco meteor': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'psycho boost': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'fleur cannon': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'shell smash': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: -1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }
  ],
  // All-or-nothing 10% all-stats boost
  'ancient power': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'silver wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'ominous wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  // Guaranteed all-stats boosts
  'clangorous soulblaze': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  'extreme evoboost': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 }
  ],
  'no retreat': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  // Single/partial attack boosts
  'max knuckle': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'metal claw': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.1 }],
  'meteor mash': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.2 }],
  'order up': [{ target: 'self', randomFrom: ['attack', 'defense', 'special_attack'], stages: 1, chance: 1 }],
  'power-up punch': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'rage': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'tidy up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'victory dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  // HP-cost boosts: handled specially in executeStandardMove
  'belly drum': [],
  'clangorous soul': [],
  'fillet away': [],
  // Post-KO boost: handled specially in executeStandardMove
  'fell stinger': [],
  // Raise user defense
  'barrier': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'defend order': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'diamond storm': [{ target: 'self', stat: 'defense', stages: 2, chance: 0.5 }],
  'flower shield': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'max steelspike': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'psyshield bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'shelter': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'skull bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'steel wing': [{ target: 'self', stat: 'defense', stages: 1, chance: 0.1 }],
  'stockpile': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'stuff cheeks': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }]
};


function ensureBattleStatStages(battleData) {
  if (!battleData.statStages || typeof battleData.statStages !== 'object') {
    battleData.statStages = {};
  }
  return battleData.statStages;
}

function ensurePokemonStatStages(battleData, pass) {
  const all = ensureBattleStatStages(battleData);
  if (!all[pass] || typeof all[pass] !== 'object') {
    all[pass] = { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0, accuracy: 0, evasion: 0 };
  }
  const keys = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
  for (const key of keys) {
    if (typeof all[pass][key] !== 'number') all[pass][key] = 0;
  }
  return all[pass];
}

function getStageMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function applyStageToStat(baseValue, stage) {
  return Math.max(1, Math.floor(baseValue * getStageMultiplier(stage)));
}

function getEffectiveSpeed(baseSpeed, battleData, pass) {
  const statusAdjusted = getSpeedWithStatus(baseSpeed, battleData, pass);
  const stages = ensurePokemonStatStages(battleData, pass);
  return applyStageToStat(statusAdjusted, stages.speed);
}

function getModifiedAccuracy(baseAccuracy, attackerAccuracyStage, defenderEvasionStage) {
  const netStage = (attackerAccuracyStage || 0) - (defenderEvasionStage || 0);
  const acc = Math.floor(baseAccuracy * getStageMultiplier(netStage));
  return Math.max(1, Math.min(100, acc));
}

function clampStage(stage) {
  return Math.max(-6, Math.min(6, stage));
}

function getStageVerb(delta) {
  const mag = Math.abs(delta);
  if (delta > 0) {
    if (mag >= 3) return 'rose drastically';
    if (mag === 2) return 'rose sharply';
    return 'rose';
  }
  if (mag >= 3) return 'fell drastically';
  if (mag === 2) return 'fell harshly';
  return 'fell';
}

function getStatLabel(stat) {
  if (stat === 'special_attack') return 'Special Attack';
  if (stat === 'special_defense') return 'Special Defense';
  return c(stat);
}

function expandEffectStats(effect) {
  if (effect.stat === 'special') return ['special_attack', 'special_defense'];
  return [effect.stat];
}

function applyMoveStatEffects({ battleData, moveName, moveCategory, attackerName, defenderName, attackerPass, defenderPass, attackerAbility, defenderAbility, targetAlive }) {
  const effects = MOVE_STAT_EFFECTS[moveName] || [];
  const resolvedMoveCategory = String(moveCategory || '').toLowerCase();
  if (!effects.length) return '';

  const resolvedChanceGroups = {};
  for (const effect of effects) {
    if (effect.chanceGroup !== undefined && !(effect.chanceGroup in resolvedChanceGroups)) {
      resolvedChanceGroups[effect.chanceGroup] = Math.random() <= (effect.chance ?? 1);
    }
  }

  let out = '';
  for (const effect of effects) {
    if (effect.chanceGroup !== undefined) {
      if (!resolvedChanceGroups[effect.chanceGroup]) continue;
    } else {
      if (Math.random() > (effect.chance ?? 1)) continue;
    }
    if (effect.target === 'target' && !targetAlive) continue;
    if (effect.target === 'target' && Array.isArray(effect.whenTargetStatusIn) && effect.whenTargetStatusIn.length > 0) {
      const tStatus = getBattleStatus(battleData, defenderPass);
      if (!tStatus || !effect.whenTargetStatusIn.includes(tStatus)) continue;
    }

    const targetPass = effect.target === 'self' ? attackerPass : defenderPass;
    const targetName = effect.target === 'self' ? attackerName : defenderName;
    const targetAbility = effect.target === 'self' ? attackerAbility : defenderAbility;
    const stages = ensurePokemonStatStages(battleData, targetPass);

    if (effect.randomStat) {
      const allStats = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
      const eligible = allStats.filter(s => (stages[s] || 0) < 6);
      if (eligible.length > 0) {
        const statKey = eligible[Math.floor(Math.random() * eligible.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    if (effect.randomFrom) {
      const increasing = (effect.stages || 0) >= 0;
      const pool = effect.randomFrom.filter(s => increasing ? (stages[s] || 0) < 6 : (stages[s] || 0) > -6);
      if (pool.length > 0) {
        const statKey = pool[Math.floor(Math.random() * pool.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    const effectStats = effect.statByMoveCategory ? [effect.statByMoveCategory[resolvedMoveCategory]].filter(Boolean) : expandEffectStats(effect);

    for (const statKey of effectStats) {
      out += applyStageChanges({
        battleData,
        pass: targetPass,
        pokemonName: targetName,
        abilityName: targetAbility,
        changes: [{ stat: statKey, delta: effect.stages }],
        c,
        fromOpponent: effect.target === 'target'
      }).message;
    }
  }
  return out;
}

  async function resolveQueuedActions(ctx, battleData, bword) {
    if (!battleData.queuedActions || battleData.queuedActions.length < 2) return false;

    const action1 = battleData.queuedActions[0];
    const action2 = battleData.queuedActions[1];
    battleData.bideCycle = (battleData.bideCycle || 0) + 1;
    dbg('resolve:start', { bword, a1: action1, a2: action2, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, qlen: battleData.queuedActions.length });
    battleData.queuedActions = []; // Clear queue for next turn
    if (battleData.switchLock) battleData.switchLock = null;
    if (battleData.switchPending) {
      delete battleData.switchPending[String(action1.cid)];
      if (action2) delete battleData.switchPending[String(action2.cid)];
      if (Object.keys(battleData.switchPending).length < 1) delete battleData.switchPending;
    }

    const actions = [action1, action2].filter(Boolean);
    const switchActions = actions.filter(a => a.type === 'switch');
    const moveActions = actions.filter(a => a.type !== 'switch');

    // Bide locks the move choice until it is released.
    if (!battleData.bideState || typeof battleData.bideState !== 'object') {
      battleData.bideState = {};
    }
    for (const act of moveActions) {
      if (battleData.bideState[act.c] && battleData.bideState[act.c].moveId) {
        act.id = battleData.bideState[act.c].moveId;
      }
      const chargingState = getChargingStateForPass(battleData, act.c);
      if (chargingState && chargingState.moveId) {
        act.id = chargingState.moveId;
      }
    }

    let speedA = 0;
    let speedB = 0;
    let pkA = null;
    let pkB = null;
    if (moveActions.length === 2) {
      const usrA = await getUserData(action1.cid);
      const usrB = await getUserData(action2.cid);
      pkA = usrA.pokes.filter(p => p.pass == action1.c)[0];
      pkB = usrB.pokes.filter(p => p.pass == action2.c)[0];
      if (!pkA || !pkB) {
        dbg('resolve:speed_missing_poke', { bword, pkA: !!pkA, pkB: !!pkB, a1: action1, a2: action2 });
        // Keep going; we'll fall back to priority/random ordering below.
        speedA = 0;
        speedB = 0;
      } else {
        const stA = await Stats(pokestats[pkA.name], pkA.ivs, pkA.evs, c(pkA.nature), plevel(pkA.name, pkA.exp));
        const stB = await Stats(pokestats[pkB.name], pkB.ivs, pkB.evs, c(pkB.nature), plevel(pkB.name, pkB.exp));

        speedA = getEffectiveSpeed(stA.speed, battleData, action1.c);
        speedB = getEffectiveSpeed(stB.speed, battleData, action2.c);
      }
    }

    let orderedActions = [];
    if (moveActions.length === 1) {
      orderedActions = [moveActions[0]];
    } else if (moveActions.length === 2) {
      const mv1 = dmoves[action1.id];
      const mv2 = dmoves[action2.id];
      const pri1 = mv1 ? getMovePriority(mv1.name, mv1.category, pkA && pkA.ability) : 0;
      const pri2 = mv2 ? getMovePriority(mv2.name, mv2.category, pkB && pkB.ability) : 0;
      if (!mv1 || !mv2) {
        dbg('resolve:missing_move_data', { bword, mv1: !!mv1, mv2: !!mv2, a1: action1, a2: action2 });
      }

      if (pri1 > pri2) { orderedActions = [action1, action2]; }
      else if (pri2 > pri1) { orderedActions = [action2, action1]; }
      else {
        if (speedA > speedB) { orderedActions = [action1, action2]; }
        else if (speedB > speedA) { orderedActions = [action2, action1]; }
        else { orderedActions = (Math.random() < 0.5) ? [action1, action2] : [action2, action1]; }
      }
    }
    const isSingleMoveTurn = moveActions.length < 2;

    if (!battleData.turnHits) battleData.turnHits = {};
    battleData.turnHits = {}; // Reset at start of turn
    battleData.turnAbilityState = { skipSpeedBoost: {}, failedEscape: {} };

    let turnLogs = "\n\n<b>Turn Summary:</b>";

    async function applySwitchAction(act) {
      if (!act || !act.pass) return;
      if (String(battleData.cid) !== String(act.cid)) {
        fullSwap(battleData);
      }
      const previousPass = battleData.c;
      const attacker = await getUserData(battleData.cid);
      const defender = await getUserData(battleData.oid);
      const p12 = attacker.pokes.filter((poke)=>poke.pass==act.pass)[0];
      const opposingPokemon = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
      battleData.c = act.pass;
      battleData.chp = battleData.tem[act.pass];
      ensureTurnAbilityState(battleData).skipSpeedBoost[String(act.pass)] = true;
      if (!battleData.lastMoveByPass || typeof battleData.lastMoveByPass !== 'object') {
        battleData.lastMoveByPass = {};
      }
      delete battleData.lastMoveByPass[String(previousPass)];
      // Switching out ends Bide for the Pokemon that left the field.
      if (battleData.bideState && battleData.bideState[previousPass]) {
        delete battleData.bideState[previousPass];
      }
      clearChargingStateForPass(battleData, previousPass);
      clearSemiInvulnerableStateForPass(battleData, previousPass);
      setPokemonMinimized(battleData, previousPass, false);
      if (p12) {
        turnLogs += '\n-> <b>' + c(p12.name) + '</b> came for battle.';
        const switchedStats = await Stats(pokestats[p12.name], p12.ivs, p12.evs, c(p12.nature), plevel(p12.name, p12.exp));
        turnLogs += await applyEntryHazardsOnSwitch({
          battleData,
          sideId: battleData.cid,
          pass: act.pass,
          pokemonName: p12.name,
          abilityName: p12.ability,
          maxHp: switchedStats.hp
        });
        if (opposingPokemon) {
          const opposingStats = await Stats(pokestats[opposingPokemon.name], opposingPokemon.ivs, opposingPokemon.evs, c(opposingPokemon.nature), plevel(opposingPokemon.name, opposingPokemon.exp));
          turnLogs += applyAbilityEntry({
            battleData,
            pass: p12.pass,
            pokemonName: p12.name,
            abilityName: p12.ability,
            selfStats: switchedStats,
            opponentStats: opposingStats,
            opponentPass: battleData.o,
            opponentName: opposingPokemon.name,
            opponentAbility: opposingPokemon.ability,
            partyHpMap: battleData.tem,
            c
          }).message;
        }
      }
    }

    // Function to execute one standard attack in current context (battleData.cid attacking battleData.oid)
    async function executeStandardMove(act) {
      if (battleData.chp <= 0 || battleData.ohp <= 0) return; // attacker or defender fainted

      const move = dmoves[act.id];
      const moveName = normalizeMoveName(move?.name);
      const hitsMinimizedBonus = MINIMIZE_PUNISH_MOVES.has(moveName) && isPokemonMinimized(battleData, battleData.o);
      const moveKey = move ? String(act.id) : null;
      let didAttemptMove = false;
      const isCounterMove = ['counter', 'mirror coat', 'metal burst', 'comeuppance'].includes(moveName);
      let attacker = await getUserData(battleData.cid);
      let defender = await getUserData(battleData.oid);
      let p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0];
      let op = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
      const attackerAbility = p && p.ability ? p.ability : 'none';
      const defenderAbility = op && op.ability ? op.ability : 'none';

      let base1 = pokestats[p.name];
      let base2 = pokestats[op.name];
      let level1 = plevel(p.name, p.exp);
      let level2 = plevel(op.name, op.exp);
      let stats1 = await Stats(base1, p.ivs, p.evs, c(p.nature), level1);
      let stats2 = await Stats(base2, op.ivs, op.evs, c(op.nature), level2);

      // Check type effectiveness
      const type3 = pokes[op.name].types[0];
      const type4 = pokes[op.name].types[1] ? c(pokes[op.name].types[1]) : null;
      let eff1 = 1;
      if (battleData.set.type_effects) { eff1 = await eff(c(move.type), c(type3), type4); }
      const defenderLevitateInfo = getLevitateInfo({ abilityName: defenderAbility });
      const levitateBlockedMove = defenderLevitateInfo.active && String(move.type || '').toLowerCase() === 'ground';
      if (levitateBlockedMove) eff1 = 0;

      const atkStages = ensurePokemonStatStages(battleData, battleData.c);
      const defStages = ensurePokemonStatStages(battleData, battleData.o);
      const unawareModifiers = getUnawareBattleModifiers({
        attackerAbility,
        defenderAbility,
        moveCategory: move.category,
        attackerStages: atkStages,
        defenderStages: defStages
      });
      const unawareMessage = getUnawareActivationMessages({
        attackerName: p.name,
        defenderName: op.name,
        unawareModifiers
      });
      const supremeOverlordInfo = getSupremeOverlordInfo({
        abilityName: attackerAbility,
        partyHpMap: battleData.tem,
        activePass: battleData.c
      });

      let atk = applyStageToStat(stats1.attack, unawareModifiers.attackStage);
      let def2 = applyStageToStat(stats2.defense, unawareModifiers.defenseStage);
      if (move.category == 'special') {
        atk = applyStageToStat(stats1.special_attack, unawareModifiers.attackStage);
        def2 = applyStageToStat(stats2.special_defense, unawareModifiers.defenseStage);
      } else {
        atk = Math.max(1, Math.floor(atk * getAttackStatMultiplier(attackerAbility, move.category)));
      }
      atk = Math.max(1, Math.floor(atk * supremeOverlordInfo.multiplier));
      if (move.category == 'physical' && getBattleStatus(battleData, battleData.c) === 'burn') {
        atk = Math.max(1, Math.floor(atk / 2));
      }

      let msgLocal = "";
      let blockedByGoodAsGold = false;

      // ActState (Frozen, Asleep, Paralyzed etc)
      ensureBattleStatus(battleData); // verify status conditions haven't cleared
      const actState = canPokemonAct(battleData, battleData.c, p.name);
      const chargingState = getChargingStateForPass(battleData, battleData.c);
      const isChargeReleaseTurn = !!(chargingState && String(chargingState.moveId) === String(act.id));
      if (!actState.canAct && isChargeReleaseTurn) {
        clearChargingStateForPass(battleData, battleData.c);
        clearSemiInvulnerableStateForPass(battleData, battleData.c);
      }

      if (!actState.canAct) {
        msgLocal += "\n" + actState.msg;
      } else {
        didAttemptMove = true;
        if (isChargeReleaseTurn) {
          clearChargingStateForPass(battleData, battleData.c);
          clearSemiInvulnerableStateForPass(battleData, battleData.c);
          msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed <b>'+c(move.name)+'</b>!';
        }
      }

      if (actState.canAct && moveName === 'bide') {
        // Bide bypasses accuracy/evasion checks
        if (!battleData.bideState) battleData.bideState = {};
        if (!battleData.bideState[battleData.c]) {
          // Bide stores for exactly 2 turns, then retaliates.
          battleData.bideState[battleData.c] = { turnsLeft: 1, damage: 0, moveId: act.id, lastAttacker: null, lastProcessedCycle: battleData.bideCycle };
          msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else {
          let bState = battleData.bideState[battleData.c];
          if (bState.lastProcessedCycle === battleData.bideCycle) {
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
          } else if (isSingleMoveTurn) {
            // Do not progress Bide countdown on single-action turns (e.g. switch/faint flows).
            bState.lastProcessedCycle = battleData.bideCycle;
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
          } else if (bState.turnsLeft > 1) {
            bState.turnsLeft -= 1;
            bState.lastProcessedCycle = battleData.bideCycle;
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
          } else {
            bState.lastProcessedCycle = battleData.bideCycle;
            if (bState.damage === 0) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy... but it failed!';
            } else {
              var damage = Math.min(bState.damage * 2, battleData.ohp);
              const sturdyDamage = applyDefenderDamageWithSturdy({
                battleData,
                damage,
                defenderAbility,
                defenderName: op.name,
                defenderMaxHp: stats2.hp,
                moveName
              });
              damage = sturdyDamage.damage;
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
              if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
              }
              msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy! It dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
              msgLocal += sturdyDamage.message;
            }
            delete battleData.bideState[battleData.c];
          }
        }
      } else if (actState.canAct && isCounterMove) {
        // Counterattack moves only succeed if this Pokemon was hit earlier this turn.
        const lastHit = battleData.turnHits[battleData.c];
        const wasHitByCurrentFoe = lastHit && String(lastHit.from) === String(battleData.o);
        if (!lastHit || lastHit.damage === 0 || !wasHitByCurrentFoe) {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
        } else if (moveName === 'counter' && lastHit.category !== 'physical') {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
        } else if (moveName === 'mirror coat' && lastHit.category !== 'special') {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
        } else {
          const multiplier = (moveName === 'metal burst' || moveName === 'comeuppance') ? 1.5 : 2;
          var damage = Math.min(Math.max(Math.floor(lastHit.damage * multiplier), 1), battleData.ohp);
          const sturdyDamage = applyDefenderDamageWithSturdy({
            battleData,
            damage,
            defenderAbility,
            defenderName: op.name,
            defenderMaxHp: stats2.hp,
            moveName
          });
          damage = sturdyDamage.damage;
          battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
          if (battleData.bideState && battleData.bideState[battleData.o]) {
            battleData.bideState[battleData.o].damage += damage;
            battleData.bideState[battleData.o].lastAttacker = battleData.c;
          }
          msgLocal += '\n-> <b>'+c(p.name)+'</b> retaliated with <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
          msgLocal += sturdyDamage.message;
        }
      } else if (actState.canAct && !isChargeReleaseTurn && CHARGING_TURN_MOVES.has(moveName)) {
        setChargingStateForPass(battleData, battleData.c, act.id, moveName);
        if (SEMI_INVULNERABLE_CHARGE_MOVES.has(moveName)) {
          setSemiInvulnerableStateForPass(battleData, battleData.c, moveName);
        }
        msgLocal += getChargingTurnMessage(p.name, moveName);
        if (CHARGE_START_STAT_MOVES.has(moveName)) {
          msgLocal += applyMoveStatEffects({
            battleData,
            moveName,
            moveCategory: move.category,
            attackerName: p.name,
            defenderName: op.name,
            attackerPass: battleData.c,
            defenderPass: battleData.o,
            attackerAbility,
            defenderAbility,
            targetAlive: battleData.ohp > 0
          });
        }
      } else if (actState.canAct) {
        if (isSemiInvulnerableAvoidedMove(battleData, battleData.o, move.category, moveName)) {
          const opSemi = getSemiInvulnerableStateForPass(battleData, battleData.o);
          msgLocal += getSemiInvulnerableAvoidMessage(op.name, opSemi ? opSemi.moveName : '');
        } else {
        const bypassAccuracyCheck = moveName === 'bind' || hitsMinimizedBonus;
        const hasAccuracyCheck = !bypassAccuracyCheck && move.accuracy !== null && move.accuracy !== undefined;
        const accValue = hasAccuracyCheck ? getModifiedAccuracy(Number(move.accuracy), unawareModifiers.accuracyStage, unawareModifiers.evasionStage) : 100;
        if (hasAccuracyCheck && Math.random() * 100 > accValue) {
          msgLocal += unawareMessage;
          msgLocal += '\n-> <b>'+c(p.name)+'</b> <b>'+c(move.name)+'</b> has missed.';
          const crash = getCrashDamage(moveName, stats1.hp);
          if (crash > 0) {
            const selfBefore = battleData.chp;
            const crashTaken = Math.min(crash, selfBefore);
            battleData.chp = Math.max(0, selfBefore - crashTaken);
            battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
            msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
          }
        } else if (hasAccuracyCheck && Math.random() < 0.05) {
          msgLocal += unawareMessage;
          msgLocal += '\n-> <b>'+c(op.name)+'</b> Dodged <b>'+c(p.name)+'</b>\'s <b>'+c(move.name)+'</b>';
          const crash = getCrashDamage(moveName, stats1.hp);
          if (crash > 0) {
            const selfBefore = battleData.chp;
            const crashTaken = Math.min(crash, selfBefore);
            battleData.chp = Math.max(0, selfBefore - crashTaken);
            battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
            msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
          }
        } else {
          if (moveName === 'leech seed') {
            if (!battleData.leechSeed || typeof battleData.leechSeed !== 'object') {
              battleData.leechSeed = {};
            }
            const defenderTypes = (pokes[op.name]?.types || []).map((t) => String(t).toLowerCase());
            if (defenderTypes.includes('grass')) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else if (battleData.leechSeed[battleData.o]) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else {
              battleData.leechSeed[battleData.o] = battleData.c;
              msgLocal += '\n-> <b>'+c(p.name)+'</b> planted a seed on <b>'+c(op.name)+'</b>!';
            }
          } else if ((move.category == 'status' || !move.power) && !OHKO_MOVES.has(moveName)) {
            const goodAsGoldInfo = getGoodAsGoldInfo({ abilityName: defenderAbility });
            if (goodAsGoldInfo.active && isOpponentTargetingStatusMove(move, moveName)) {
              blockedByGoodAsGold = true;
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
              msgLocal += getAbilityActivationMessage(op.name, 'Good As Gold');
              msgLocal += unawareMessage;
              msgLocal += '\n-> It had no effect on <b>'+c(op.name)+'</b>!';
            } else {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
              msgLocal += unawareMessage;
              msgLocal += applyMoveStatEffects({
                battleData,
                moveName,
                moveCategory: move.category,
                attackerName: p.name,
                defenderName: op.name,
                attackerPass: battleData.c,
                defenderPass: battleData.o,
                attackerAbility,
                defenderAbility,
                targetAlive: battleData.ohp > 0
              });
              msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, true);
              msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, true);

              if (moveName === 'strength sap') {
                const targetStages = ensurePokemonStatStages(battleData, battleData.o);
                const targetAtk = applyStageToStat(stats2.attack, targetStages.attack);
                const hpBefore = battleData.chp;
                battleData.chp = Math.min(stats1.hp, battleData.chp + targetAtk);
                const healed = Math.max(0, battleData.chp - hpBefore);
                battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                }
              }

              if (moveName === 'belly drum') {
              const bdHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > bdHalf) {
                battleData.chp -= bdHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - bdHalf);
                const bdStages = ensurePokemonStatStages(battleData, battleData.c);
                const bdTarget = attackerAbility === 'contrary' ? -6 : 6;
                const bdDelta = bdTarget - (bdStages.attack || 0);
                if (bdDelta !== 0) {
                  msgLocal += applyStageChanges({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    changes: [{ stat: 'attack', delta: bdDelta }],
                    c,
                    fromOpponent: false
                  }).message;
                }
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its own HP to maximize Attack!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
              }

              if (moveName === 'clangorous soul') {
              const csThird = Math.floor(stats1.hp / 3);
              if (battleData.chp > csThird) {
                battleData.chp = Math.max(1, battleData.chp - csThird);
                battleData.tem[battleData.c] = Math.max(1, (battleData.tem[battleData.c] || battleData.chp + csThird) - csThird);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: ['attack','defense','special_attack','special_defense','speed'].map((stat) => ({ stat, delta: 1 })),
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to power itself up!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
              }

              if (moveName === 'fillet away') {
              const faHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > faHalf) {
                battleData.chp -= faHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - faHalf);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: 2 }, { stat: 'special_attack', delta: 2 }, { stat: 'speed', delta: 2 }],
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to sharpen all its senses!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
              }

              if (moveName === 'minimize') {
                setPokemonMinimized(battleData, battleData.c, true);
              }

              msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, true);
              msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, true);

              msgLocal += applySelfFaintAfterMove(moveName, move.name, battleData, battleData.c, p.name);
            }
          } else {
            const absorbedByAbility = applyAbilityAbsorbMove({
              battleData,
              pass: battleData.o,
              pokemonName: op.name,
              abilityName: defenderAbility,
              moveType: move.type,
              moveName: move.name,
              c
            });
            if (absorbedByAbility.blocked) {
              msgLocal += '\n-> <b>'+c(op.name)+'</b> nullified <b>'+c(move.name)+'</b>.';
              msgLocal += absorbedByAbility.message;
            } else {
            if (moveName === 'dream eater' && getBattleStatus(battleData, battleData.o) !== 'sleep') {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else {
              const defenderHpBeforeHit = battleData.ohp;
              const pinchPowerMult = getPinchPowerMultiplier({
                abilityName: attackerAbility,
                moveType: move.type,
                currentHp: battleData.chp,
                maxHp: stats1.hp
              });
              const technicianInfo = getTechnicianPowerInfo({
                abilityName: attackerAbility,
                movePower: move.power
              });
              const boostedPower = Math.max(1, Math.floor(Number(move.power || 0) * pinchPowerMult * technicianInfo.multiplier));
              const stabInfo = getStabInfo({
                abilityName: attackerAbility,
                moveType: move.type,
                pokemonTypes: pokes[p.name]?.types || []
              });
              var damage = Math.min(Math.max(0, Math.floor(calc(atk, def2, level1, boostedPower, eff1) * stabInfo.multiplier)), battleData.ohp);
              let ohkoFailed = false;
              if (OHKO_MOVES.has(moveName)) {
                const attackerTypes = (pokes[p.name]?.types || []).map((t) => String(t).toLowerCase());
                const defenderTypes = (pokes[op.name]?.types || []).map((t) => String(t).toLowerCase());
                const sheerColdBlocked = moveName === 'sheer cold' && defenderTypes.includes('ice') && !attackerTypes.includes('ice');
                const ohkoChance = getOhkoHitChance(level1, level2);
                if (level1 < level2 || sheerColdBlocked || Math.random() * 100 >= ohkoChance) {
                  damage = 0;
                  ohkoFailed = true;
                } else {
                  damage = battleData.ohp;
                }
              }
              if (!ohkoFailed && hitsMinimizedBonus && damage > 0) {
                damage = Math.min(Math.max(1, Math.floor(damage * MINIMIZE_PUNISH_MULTIPLIER)), battleData.ohp);
              }
              const isPerfectCrit = PERFECT_CRIT_MOVES.has(moveName);
              const isHighCritMove = HIGH_CRIT_RATIO_MOVES.has(moveName);
              let hitCount = (!ohkoFailed && damage > 0) ? getMultiHitCount(moveName) : 1;
              let critHits = 0;
              let staminaMessage = '';
              let weakArmorMessage = '';
              let shieldMessage = '';
              let sturdyMessage = '';
              let multiscaleMessage = '';
              let levitateMessage = '';
              if (!ohkoFailed && damage > 0 && !OHKO_MOVES.has(moveName)) {
                let totalDamage = 0;
                let landedHits = 0;
                for (let h = 0; h < hitCount; h += 1) {
                  const remainingHp = battleData.ohp - totalDamage;
                  if (remainingHp <= 0) break;

                  let hitDamage = damage;
                  const didHitCrit = isPerfectCrit || (isHighCritMove && Math.random() < HIGH_CRIT_RATIO_CHANCE);
                  if (didHitCrit) {
                    critHits += 1;
                    hitDamage = Math.max(1, Math.floor(hitDamage * CRIT_DAMAGE_MULTIPLIER));
                  } else {
                    const screenMult = getScreenDamageMultiplier(battleData, battleData.oid, move.category, attackerAbility, moveName);
                    if (screenMult < 1) {
                      hitDamage = Math.max(1, Math.floor(hitDamage * screenMult));
                    }
                  }

                  const shieldResult = applyShadowShieldReduction({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    moveName,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = shieldResult.damage;
                  if (shieldResult.activated && !shieldMessage) {
                    shieldMessage = shieldResult.message;
                  }
                  const multiscaleResult = applyMultiscaleReduction({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = multiscaleResult.damage;
                  if (multiscaleResult.activated && !multiscaleMessage) {
                    multiscaleMessage = multiscaleResult.message;
                  }
                  const sturdyResult = applySturdySurvival({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = sturdyResult.damage;
                  if (sturdyResult.activated && !sturdyMessage) {
                    sturdyMessage = sturdyResult.message;
                  }
                  hitDamage = Math.min(hitDamage, remainingHp);
                  totalDamage += hitDamage;
                  landedHits += 1;
                  staminaMessage += applyStaminaOnHit({
                    battleData,
                    pass: battleData.o,
                    pokemonName: op.name,
                    abilityName: defenderAbility,
                    damageDealt: hitDamage,
                    c
                  }).message;
                  weakArmorMessage += applyWeakArmorOnHit({
                    battleData,
                    pass: battleData.o,
                    pokemonName: op.name,
                    abilityName: defenderAbility,
                    moveCategory: move.category,
                    damageDealt: hitDamage,
                    c
                  }).message;
                }
                hitCount = landedHits;
                damage = totalDamage;
              }
              if (OHKO_MOVES.has(moveName) && damage > 0) {
                const sturdyDamage = applyDefenderDamageWithSturdy({
                  battleData,
                  damage,
                  defenderAbility,
                  defenderName: op.name,
                  defenderMaxHp: stats2.hp,
                  moveName
                });
                damage = sturdyDamage.damage;
                staminaMessage += applyStaminaOnHit({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  abilityName: defenderAbility,
                  damageDealt: damage,
                  c
                }).message;
                sturdyMessage += sturdyDamage.message;
              } else {
                battleData.ohp = Math.max((battleData.ohp - damage), 0);
                battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o] - damage), 0);
              }
              if (ohkoFailed) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
                msgLocal += unawareMessage;
                if (levitateBlockedMove) {
                  levitateMessage = '\n-> <b>'+c(op.name)+'</b>\'s <b>Levitate</b> activated!';
                }
                msgLocal += getInfiltratorBypassMessage(battleData, battleData.oid, move.category, attackerAbility, p.name, moveName);
                if (pinchPowerMult > 1) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>'+c(formatAbilityLabel(attackerAbility))+'</b> boosted its '+c(move.type)+'-type move!';
                }
                msgLocal += staminaMessage;
                if (technicianInfo.active) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Technician</b> activated!';
                }
                if (stabInfo.adaptabilityActive && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Adaptability</b> activated!';
                }
                if (supremeOverlordInfo.active && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Supreme Overlord</b> activated!';
                }
                msgLocal += weakArmorMessage;
                msgLocal += shieldMessage;
                msgLocal += multiscaleMessage;
                msgLocal += sturdyMessage;
                msgLocal += levitateMessage;
                if (hitCount > 1) {
                  msgLocal += '\n-> It hit <b>'+hitCount+'</b> times!';
                }
              }
              if (!ohkoFailed && critHits > 0 && damage > 0) {
                msgLocal += '\n-> <b>A critical hit!</b>';
              }

              if (eff1 === 0) {
                const crash = getCrashDamage(moveName, stats1.hp);
                if (crash > 0) {
                  const selfBefore = battleData.chp;
                  const crashTaken = Math.min(crash, selfBefore);
                  battleData.chp = Math.max(0, selfBefore - crashTaken);
                  battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
                }
              }

              const drainRatio = getDrainRatio(moveName);
              if (drainRatio > 0 && damage > 0) {
                const healRaw = Math.max(1, Math.floor(damage * drainRatio));
                const prevHp = battleData.chp;
                battleData.chp = Math.min(stats1.hp, battleData.chp + healRaw);
                const healed = Math.max(0, battleData.chp - prevHp);
                battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || prevHp) + healed));
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> drained <code>'+healed+'</code> HP!';
                }
              }

              const recoil = getRecoilDamage(moveName, damage, stats1.hp);
              if (recoil > 0) {
                const selfBefore = battleData.chp;
                const recoilTaken = Math.min(recoil, selfBefore);
                battleData.chp = Math.max(0, selfBefore - recoilTaken);
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - recoilTaken);
                msgLocal += '\n-> <b>'+c(p.name)+'</b> was hurt by recoil and lost <code>'+recoilTaken+'</code> HP!';
              }
              msgLocal += applySelfFaintAfterMove(moveName, move.name, battleData, battleData.c, p.name);
              msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, damage > 0);
              msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, damage > 0);
              msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, damage > 0);
              msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, damage > 0);

              // Record hit for counter-attacks and accumulate bide damage
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category, from: battleData.c, move: moveName };
              if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
              }

              if (!ohkoFailed && eff1 == 0) msgLocal += '\n<b>* It\'s 0x effective!</b>';
              else if (!ohkoFailed && eff1 == 0.5) msgLocal += '\n<b>* It\'s not very effective...</b>';
              else if (!ohkoFailed && eff1 == 2) msgLocal += '\n<b>* It\'s super effective!</b>';
              else if (!ohkoFailed && eff1 == 4) msgLocal += '\n<b>* It\'s incredibly super effective!</b>';

              if (damage > 0) {
                msgLocal += applyMoveStatEffects({
                  battleData,
                  moveName,
                  moveCategory: move.category,
                  attackerName: p.name,
                  defenderName: op.name,
                  attackerPass: battleData.c,
                  defenderPass: battleData.o,
                  attackerAbility,
                  defenderAbility,
                  targetAlive: battleData.ohp > 0
                });
                if (moveName === 'fell stinger' && battleData.ohp <= 0) {
                  msgLocal += applyStageChanges({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    changes: [{ stat: 'attack', delta: 3 }],
                    c,
                    fromOpponent: false
                  }).message;
                }
              }
              msgLocal += applyAbilityOnDamageTaken({
                battleData,
                pass: battleData.o,
                pokemonName: op.name,
                abilityName: defenderAbility,
                moveType: move.type,
                moveCategory: move.category,
                hpBefore: defenderHpBeforeHit,
                hpAfter: battleData.ohp,
                maxHp: stats2.hp,
                damageDealt: damage,
                c
              }).message;
              if (battleData.ohp <= 0) {
                const remainingDefenderMons = Object.keys(battleData.tem2 || {}).filter((pass) => battleData.tem2[pass] > 0);
                if (remainingDefenderMons.length > 0 || normalizeAbilityName(attackerAbility) !== 'beast-boost') {
                  msgLocal += applyAbilityKo({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    stats: stats1,
                    c
                  }).message;
                }
              }
            }
            }
          }

          // Status condition inflictions
          const statusEffect = getMoveStatusEffect(move);
          if (statusEffect && battleData.ohp > 0 && !blockedByGoodAsGold) {
            const existingStatus = getBattleStatus(battleData, battleData.o);
            const defenderTypes = pokes[op.name]?.types || [];
            if (!existingStatus && !isStatusImmune(statusEffect.status, defenderTypes) && Math.random() < statusEffect.chance) {
              setBattleStatus(battleData, battleData.o, statusEffect.status);
              msgLocal += '\n-> <b>'+c(op.name)+'</b> is now <b>'+getStatusLabel(statusEffect.status)+'</b>.';
            }
          }
        }
        }
      }

      msgLocal += applyDefenderResidualDamage(battleData, battleData.o, op.name, stats2.hp);

      // Leech Seed: seeded target loses HP, and the source recovers HP (single-battle context).
      if (battleData.leechSeed && battleData.leechSeed[battleData.o] && String(battleData.leechSeed[battleData.o]) === String(battleData.c) && battleData.ohp > 0) {
        const leechDamage = Math.max(1, Math.floor(stats2.hp / 8));
        const drained = Math.min(leechDamage, battleData.ohp);
        battleData.ohp = Math.max(0, battleData.ohp - drained);
        battleData.tem2[battleData.o] = Math.max(0, battleData.tem2[battleData.o] - drained);

        const hpBefore = battleData.chp;
        battleData.chp = Math.min(stats1.hp, battleData.chp + drained);
        const healed = Math.max(0, battleData.chp - hpBefore);
        battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));

        msgLocal += '\n-> <b>'+c(op.name)+'</b> had its energy sapped by Leech Seed and lost <code>'+drained+'</code> HP.';
        if (healed > 0) {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP from Leech Seed.';
        }
      }

      if (didAttemptMove && moveKey) {
        if (!battleData.lastMoveByPass || typeof battleData.lastMoveByPass !== 'object') {
          battleData.lastMoveByPass = {};
        }
        battleData.lastMoveByPass[String(battleData.c)] = moveKey;
      }

      // Reveal Used Move
      if (!battleData.usedMoves) battleData.usedMoves = {};
      if (!battleData.usedMoves[battleData.c]) battleData.usedMoves[battleData.c] = [];
      if (!battleData.usedMoves[battleData.c].includes(act.id)) battleData.usedMoves[battleData.c].push(act.id);

      turnLogs += msgLocal;
    }

    if (switchActions.length > 0) {
      for (const act of actions) {
        if (act.type === 'switch') {
          await applySwitchAction(act);
        }
      }
      dbg('resolve:after_switches', { bword, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o });
      if (moveActions.length === 1) {
        if (String(battleData.cid) !== String(moveActions[0].cid)) {
          fullSwap(battleData);
        }
        await executeStandardMove(moveActions[0]);
      }
    } else {
      if (String(battleData.cid) !== String(orderedActions[0].cid)) {
        fullSwap(battleData);
      }
      await executeStandardMove(orderedActions[0]);

      if (battleData.ohp > 0 && battleData.chp > 0) { // both must be alive
        fullSwap(battleData); // Context swap so opponent becomes Attacker
        await executeStandardMove(orderedActions[1]);
      }
    }

    // What if someone fainted?
    if (battleData.chp <= 0 || battleData.ohp <= 0) {
      if (battleData.ohp <= 0 && battleData.chp > 0) {
        fullSwap(battleData); // ensure cid points to the fainted pokemon so UI logic works below
      }
    } else {
      // Nobody fainted, just pick the next selector.
      fullSwap(battleData);
    }

    if (battleData.chp > 0 && battleData.ohp > 0) {
      const endTurnAttacker = await getUserData(battleData.cid);
      const endTurnDefender = await getUserData(battleData.oid);
      const endTurnCurrent = endTurnAttacker.pokes.filter((poke)=>poke.pass==battleData.c)[0];
      const endTurnOther = endTurnDefender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
      if (endTurnCurrent) {
        turnLogs += applyAbilityEndTurn({
          battleData,
          pass: battleData.c,
          pokemonName: endTurnCurrent.name,
          abilityName: endTurnCurrent.ability,
          c
        }).message;
      }
      if (endTurnOther) {
        turnLogs += applyAbilityEndTurn({
          battleData,
          pass: battleData.o,
          pokemonName: endTurnOther.name,
          abilityName: endTurnOther.ability,
          c
        }).message;
      }
    }

    tickScreensForTurn(battleData);

    await saveBattleData(bword, battleData);
    dbg('resolve:done', { bword, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, chp: battleData.chp, ohp: battleData.ohp });

    const attacker = await getUserData(battleData.cid)
    const defender = await getUserData(battleData.oid)
    const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
    const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
    const pp = pokes[p1.name]
    const pp2 = pokes[p2.name]
    const base1 = pokestats[p2.name]
    const base2 = pokestats[p1.name]
    const level1 = plevel(p2.name,p2.exp)
    const level2 = plevel(p1.name,p1.exp)
    const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
    const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)

    let msg = turnLogs;

    const messageData = await loadMessageData();
    messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(),turn:battleData.cid,oppo:battleData.oid };
    await saveMessageData(messageData);

    if(battleData.chp < 1){
      msg += '\n\n<b>'+c(p1.name)+'</b> has fainted. Choose your next pokemon.'
      if(!battleData.set.sandbox){
        await incexp(defender,p2,attacker,p1,ctx,battleData,bot)
        await incexp2(attacker,p1,defender,p2,ctx,battleData,bot)
      }
      const av = []
      const al = []
      let b = 1
      for(const pok in battleData.tem){
        if(battleData.tem[pok] > 0){
          const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
          av.push({name:b,pass:pok})
          al.push(pok)
        }else{
          av.push({name:b+' (0 HP)',pass:pok})
        }
        b++;
      }
      if(al.length < 1){
        const gpc = Object.keys(battleData.tem).length*15
        defender.inv.pc += gpc
        if(!defender.inv.win){
          defender.inv.win = 0
        }
        defender.inv.win += 1
        if(!attacker.inv.lose){
          attacker.inv.lose = 0
        }
        attacker.inv.lose += 1
        if(battleData.tempBattle && battleData.tempTeams){
          const t1 = battleData.tempTeams[battleData.cid] || []
          const t2 = battleData.tempTeams[battleData.oid] || []
          attacker.pokes = (attacker.pokes || []).filter(p => !t1.includes(p.pass))
          defender.pokes = (defender.pokes || []).filter(p => !t2.includes(p.pass))
          if(attacker.extra && attacker.extra.temp_battle){
            delete attacker.extra.temp_battle[bword]
          }
          if(defender.extra && defender.extra.temp_battle){
            delete defender.extra.temp_battle[bword]
          }
        }
        await saveUserData2(battleData.cid,attacker)
        await saveUserData2(battleData.oid,defender)
        const messageData = await loadMessageData();
        messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
        delete messageData[bword];
        await saveMessageData(messageData);
        await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(p1.name)+' </b>has fainted.\n<a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a> lost against <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>.\n+'+gpc+' PokeCoins 💷',{parse_mode:'HTML'})
        if(Math.random()< 0.00005){
          const idr = (Math.random()<0.5) ? battleData.oid : battleData.cid
          const dr = await getUserData(idr)
          await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+idr+'"><b>'+displayName(dr,idr)+'</b></a>, A <b>Move Tutor</b> was watching your match. He wants to <b>Teach</b> one of your <b>Pokemon</b> a <b>Move.</b>',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
          const options = {
            timeZone: 'Asia/Kolkata',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
          };

          const d = new Date().toLocaleString('en-US', options)
          const my = String(tutors[Math.floor(Math.random()*tutors.length)])
          const m77 = await sendMessage(ctx,idr,'While you were <b>Battling</b> with a trainer, An expert <b>Move Tutor</b> saw your battle very interestingly. He Impressed with your <b>Battle</b> experience and strategy. He wants to <b>Teach</b> your any of <b>Pokemon</b> a move. It will be available only for next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
          const mdata = await loadMessageData();
          if(!mdata.tutor){
            mdata.tutor = {}
          }
          mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
          await saveMessageData(mdata)
        }
      }else{
        const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_fainted' }));
        while (buttons.length < 6) {
          buttons.push({ text: '  ', callback_data: 'empty' });
        }
        const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
        for (let i = 0; i < buttons.length; i += 2) {
          rows.push(buttons.slice(i, i + 2));
        }
        await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
        return true;
      }
      return true;
    }
    const isGroupMmo = ctx.chat.type !== 'private';
    const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpMmo.msg,{parse_mode:'HTML',reply_markup:pvpMmo.keyboard,...pvpMmo.ext})
    return true;
  }

bot.action(/sytbr_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
const rid = ctx.callbackQuery.data.split('_')[2]
const bword = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id==id){
const bt = ['max-poke','min-/-max-6l','min-/-max-level','switch','form-change','sandbox-mode','random-mode','preview-mode','types-lock','regions-lock','type-efficiency','dual-type','save-settings']
const buttons = bt.map((word) => ({ text: '• '+c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_back_'+id+'_'+rid+'_'+bword+''})
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
const d1 = await getUserData(id)
const d2 = await getUserData(rid)
await editMessage('markup',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{inline_keyboard:rows})
}
})
bot.action(/stbtlsyt_/,async ctx => {
const word = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const rid = ctx.callbackQuery.data.split('_')[3]
const bword = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id){
return
}
let settings3 = {};
    try {
      settings3 = loadBattleData(bword);
} catch (error) {
      settings3 = {};
    }
const settings = settings3.set
const d1 = await getUserData(id)
const d2 = await getUserData(rid)
const challanger = displayName(d1, id)
const challanged = displayName(d2, rid)
let msg = '⚔️ <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> Has Challenged <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a>\n'
let f = false
let msg2 = ''
if(word=='maxs'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_poke = parseInt(m*1)
if(settings.max_poke < settings.min_6l){
settings.min_6l = settings.max_poke
}
}
if(word=='min6l'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.min_6l = parseInt(m*1)
if(settings.min_6l > settings.max_6l){
settings.max_6l = 6
}
if(settings.max_poke < settings.min_6l){
settings.max_poke = settings.min_6l
}
}
if(word=='max6l'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_6l = parseInt(m*1)
if(settings.min_6l > settings.max_6l){
settings.min_6l = 0
}
}
if(word=='minlv'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.min_level = parseInt(m*1)
if(settings.max_level < settings.min_level){
settings.max_level = 100
}
}
if(word=='maxlv'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_level = parseInt(m*1)
if(settings.min_level > settings.max_level){
settings.min_level = 1
}
}
if(word=='switch'){
settings.switch = (settings.switch==true) ? false : true
}
if(word=='type-efficiency'){
settings.type_effects = (settings.type_effects==true) ? false : true
}
if(word=='form-change'){
settings.key_item = (settings.key_item==true) ? false : true
}
if(word=='sandbox-mode'){
settings.sandbox = (settings.sandbox==true) ? false : true
}
if(word=='preview-mode'){
if(settings.preview=='Upper'){
settings.preview = 'Down'
}else if(settings.preview=='Down'){
settings.preview = 'no'
}else if(settings.preview=='no'){
settings.preview = 'Upper'
}else{
settings.preview = 'Upper'
}
}
if(word=='random-mode'){
settings.random = (settings.random==true) ? false : true
}
if(word=='pin-mode'){
settings.pin = (settings.pin==true) ?false : true
}
if(word=='dual-type'){
settings.dual_type = (settings.dual_type==true) ?false : true
}
if(word=='allowty'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.allow_types.includes(ty)){
settings.allow_types = settings.allow_types.filter((ty2)=>ty2!=ty)
}else{
settings.allow_types.push(ty)
if(settings.allow_types.length > 4){
ctx.answerCbQuery('Max 4 Types can be only allowed.')
return
}
}
settings.ban_types = []
}
if(word=='banty'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.ban_types.includes(ty)){
settings.ban_types = settings.ban_types.filter((ty2)=>ty2!=ty)
}else{
settings.ban_types.push(ty)
if(settings.ban_types.length > 4){
ctx.answerCbQuery('Max 4 Types can be banned.')
return
}
}
settings.allow_types = []
}
if(word=='allowrg'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.allow_regions.includes(ty)){
settings.allow_regions = settings.allow_regions.filter((ty2)=>ty2!=ty)
}else{
settings.allow_regions.push(ty)
if(settings.allow_regions.length > 4){
ctx.answerCbQuery('Max 4 Regions can be only allowed.')
return
}
}
settings.ban_regions = []
}
if(word=='banrg'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.ban_regions.includes(ty)){
settings.ban_regions = settings.ban_regions.filter((ty2)=>ty2!=ty)
}else{
settings.ban_regions.push(ty)
if(settings.ban_regions.length > 4){
ctx.answerCbQuery('Max 4 regions can be banned.')
return
}
}
settings.allow_regions = []
}
for (let key in settings3.users) {
    settings3.users[key] = false;
  }
await saveBattleData(bword, settings3);
if(settings.max_poke < 6){
f = true
msg2 += '\n<b>• Max number of pokemon:</b> '+settings.max_poke+''
}
if(settings.min_6l > 0 || settings.max_6l < 6){
f = true
msg2 += '\n<b>• Number of legendaries:</b> '+settings.min_6l+'-'+settings.max_6l+''
}
if(settings.min_level > 1 || settings.max_level < 100){
f = true
msg2 += '\n<b>• Level gap of pokemon:</b> '+settings.min_level+'-'+settings.max_level+''
}
if(!settings.switch){
f = true
msg2 += '\n<b>• Switching pokemon:</b> Disabled'
}
if(!settings.key_item){
f = true
msg2 += '\n<b>• Form Changing:</b> Disabled'
}
if(settings.sandbox){
f = true
msg2 += '\n<b>• Sandbox mode:</b> Enabled'
}
if(settings.random){
f = true
msg2 += '\n<b>• Random mode:</b> Enabled'
}
if(settings.preview && settings.preview!= 'no'){
f = true
msg2 += '\n<b>• Preview mode:</b> '+settings.preview+''
}
if(settings.pin){
f = true
msg2 += '\n<b>• Pin mode:</b> Enabled'
}
if(!settings.type_effects){
f = true
msg2 += '\n<b>• Type efficiency:</b> Disabled'
}
if(!settings.dual_type){
f = true
msg2 += '\n<b>• Dual Types:</b> Disabled'
}
if(settings.allow_regions.length > 0){
f = true
msg2 += '\n<b>• Only regions:</b> ['+c(settings.allow_regions.join(' , '))+']'
}
if(settings.ban_regions.length > 0){
f = true
msg2 += '\n<b>• Banned regions:</b> ['+c(settings.ban_regions.join(' , '))+']'
}
if(settings.ban_types.length > 0){
f = true
msg2 += '\n<b>• Banned types:</b> ['+c(settings.ban_types.join(' , '))+']'
}
if(settings.allow_types.length > 0){
f = true
msg2 += '\n<b>• Types:</b> ['+c(settings.allow_types.join(' , '))+']'
}

if(settings3.users[id]){
var em1 = '✅'
}else{
var em1 = '❌'
}
if(settings3.users[rid]){
var em2 = '✅'
}else{
var em2 = '❌'
}

if(f){
msg += msg2
msg += '\n\n-> <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a> : '+em2+''
}else{
msg += '\n\n-> <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a> : '+em2+''
}
if(word=='ban-regions'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allow-regions'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: settings.allow_types.includes(word) ? c(word)+' ✅' : c(word), callback_data: 'stbtlsyt_allowrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}

if(word=='regions-lock'){
const bt = ['ban-regions','allow-regions']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allowrg'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='banrg'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allowty'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',  'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='banty'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-poke'){
const bt = ['1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_maxs_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Number</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-/-max-6l'){
const bt = ['min-6l','max-6l']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect <b>Min / Max Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='ban-types'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allow-types'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',  'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}



if(word=='types-lock'){
const bt = ['ban-types','allow-types']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='regions-lock'){
const bt = ['ban-regions','allow-regions']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Regionss</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-/-max-level'){
const bt = ['min-level','max-level']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect <b>Min / Max Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-level'){
const bt = ['1-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','81-90','91-100']
const buttons = bt.map((word) => ({ text: word, callback_data: 'stbtlsyt_minlevel_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Min Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='maxlevel'){
const yu = ctx.callbackQuery.data.split('_')[5]
const bt = Array.from({ length: (yu.split('-')[1]*1-yu.split('-')[0]*1+1)}, (_, i) => (i + yu.split('-')[0]*1).toString());
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_maxlv_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
}
msg += '\n\nSelect <b>Max Level</b> of each pokemon of teams can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='minlevel'){
const yu = ctx.callbackQuery.data.split('_')[5]
const bt = Array.from({ length: (yu.split('-')[1]*1-yu.split('-')[0]*1+1)}, (_, i) => (i + yu.split('-')[0]*1).toString());
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_minlv_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
}
msg += '\n\nSelect <b>Min Level</b> of each pokemon of teams can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-level'){
const bt = ['1-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','81-90','91-100']
const buttons = bt.map((word) => ({ text: word, callback_data: 'stbtlsyt_maxlevel_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}

if(word=='min-6l'){
const bt = ['0','1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_min6l_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-6l_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Min Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-6l'){
const bt = ['0','1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_max6l_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-6l_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='save-settings'){
const data = await getUserData(ctx.from.id)
data.settings = settings
await saveUserData2(ctx.from.id,data)
ctx.answerCbQuery('Settings Saved!')
return
}
if(word=='back'){
var rows = [[{text:'Agree ✅',callback_data:'battle_'+id+'_'+rid+'_'+bword+''},{text:'Reject ❌',callback_data:'reject_'+id+'_'+rid+'_'+bword+''}],[{text:'Battle Settings ⚔️',callback_data:'sytbr_'+id+'_'+rid+'_'+bword+''}]]
}else{
msg += '\n\nUse /settings to get more info about battle settings.'
const bt = ['max-poke','min-/-max-6l','min-/-max-level','switch','form-change','sandbox-mode','random-mode','preview-mode','types-lock','regions-lock','type-efficiency','dual-type','save-settings']
const buttons = bt.map((word) => ({ text: '• '+c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_back_'+id+'_'+rid+'_'+bword+''})
  var rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
})
bot.action(/battle_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const id1 = ctx.callbackQuery.data.split('_')[1]
const id2 = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id2 && ctx.from.id!=id1){
ctx.answerCbQuery();
return
}
const mdata = await loadMessageData();
if(mdata.battle.includes(parseInt(ctx.from.id))){
ctx.answerCbQuery('You Are In A Battle')
return
}
const bword = ctx.callbackQuery.data.split('_')[3]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
if(mdata.battle.includes(parseInt(Object.keys(battleData.users).filter((id)=>id!=ctx.from.id)[1]))){
ctx.answerCbQuery('Opponent Is In A Battle')
return
}
if(battleData.users[ctx.from.id]){
ctx.answerCbQuery('Wait For Opponent To Accept')
return
}
  const data = await getUserData(id1);
  const data2 = await getUserData(id2);
  let pokes1 = []
  let pokes2 = []
  const useTempTeams = battleData.tempTeams && battleData.tempTeams[id1] && battleData.tempTeams[id2];
  if(useTempTeams){
  pokes1 = battleData.tempTeams[id1]
  pokes2 = battleData.tempTeams[id2]
  }else if(battleData.set.random){
  pokes1 = data.pokes.map(p => p.pass)
  pokes2 = data2.pokes.map(p => p.pass)
  }else{
  pokes1 = data.teams[data.inv.team]
  pokes2 = data2.teams[data2.inv.team]
  }
  const skipTempFilters = useTempTeams && battleData.tempBattle;
  if(!skipTempFilters && (battleData.set.min_level > 1 || battleData.set.max_level < 100)){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && plevel(pk.name,pk.exp) >= battleData.set.min_level*1 && plevel(pk.name,pk.exp) <= battleData.set.max_level*1
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && plevel(pk.name,pk.exp) >= battleData.set.min_level*1 && plevel(pk.name,pk.exp) <= battleData.set.max_level*1
})
}
  if(!skipTempFilters && !battleData.set.dual_type){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && pokes[pk.name].types.length == 1
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.length == 1
})
}
  if(!skipTempFilters && battleData.set.allow_types.length > 0){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && pokes[pk.name].types.every(type => battleData.set.allow_types.includes(type))
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => battleData.set.allow_types.includes(type))
})
}
  if(!skipTempFilters && battleData.set.ban_types.length > 0){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && pokes[pk.name].types.every(type => !battleData.set.ban_types.includes(type))
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => !battleData.set.ban_types.includes(type))
})
}
const prg = {
  "kanto": {
    "start": 1,
    "end": 151
  },
  "johto": {
    "start": 152,
    "end": 251
  },
  "hoenn": {
    "start": 252,
    "end": 386
  },
  "sinnoh": {
    "start": 387,
    "end": 493
  },
  "unova": {
    "start": 494,
    "end": 649
  },
  "kalos": {
    "start": 650,
    "end": 721
  },
  "alola": {
    "start": 722,
    "end": 809
  },
  "galar": {
    "start": 810,
    "end": 898
  },
  "paldea": {
     "start":899,
     "end":1025
  }
}

 if(!skipTempFilters && battleData.set.allow_regions.length > 0){
 pokes1 = pokes1.filter(p => {
 const pk = data.pokes.find(pok=>pok.pass == p)
 return pk && battleData.set.allow_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
 })
 pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && battleData.set.allow_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
}
 if(!skipTempFilters && battleData.set.ban_regions.length > 0){
 pokes1 = pokes1.filter(p => {
 const pk = data.pokes.find(pok=>pok.pass == p)
 return pk && !battleData.set.ban_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
 })
 pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && !battleData.set.ban_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
}
 if(battleData.set.random && !useTempTeams){
const pk2 = []
const pk1 = []
const ls = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
const ls2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
var pk2b = []
var pk1b = []
for(let i = 0; i < battleData.set.max_6l; i++){
const ls22 = ls2.filter(p => !pk2b.includes(p))
const ls1 = ls.filter(p => !pk1b.includes(p))
pk2b.push(ls22[Math.floor(Math.random() * ls22.length)])
pk1b.push(ls1[Math.floor(Math.random()* ls1.length)])
}
for(let i = 0; i < battleData.set.min_6l; i++){
const pk2bb = pk2b.filter(p => !pk2.includes(p))
const pk1bb = pk1b.filter(p => !pk1.includes(p))
pk2.push(pk2bb[Math.floor(Math.random() * pk2bb.length)])
pk1.push(pk1bb[Math.floor(Math.random()* pk1bb.length)])
}
for(let i = pk1.length; i < 6; i++){
const ls5 = pk1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(ls5.length >= battleData.set.max_6l){
pokes1 = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && spawn[pk.name].toLowerCase() !== 'legendry' && spawn[pk.name].toLowerCase()!== 'legendary' && spawn[pk.name].toLowerCase() !== 'mythical'
})
}
const rns = pokes1.filter((p)=>!pk1.includes(p))
const rnd = rns[Math.floor(Math.random() * rns.length)]
if(rnd){
pk1.push(rnd)
}
}
for(let i = pk2.length; i < 6; i++){
const ls5 = pk2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(ls5.length >= battleData.set.max_6l){
pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && spawn[pk.name].toLowerCase() !== 'legendry' && spawn[pk.name].toLowerCase()!== 'legendary' && spawn[pk.name].toLowerCase() !== 'mythical'
})
}
const rns2 = pokes2.filter((p)=>!pk2.includes(p))
const rnd2 = rns2[Math.floor(Math.random()*rns2.length)]
if(rnd2){
pk2.push(rnd2)
}
}
pokes1 = pk1
pokes2 = pk2
}

pokes1 = pokes1.slice(0,battleData.set.max_poke*1)
pokes2 = pokes2.slice(0,battleData.set.max_poke*1)

battleData.users[ctx.from.id] = true
const leng = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
const leng2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(pokes1.length < 1 || leng.length < battleData.set.min_6l || leng.length > battleData.set.max_6l){
battleData.users[id1] = false
}
if(pokes2.length < 1 || leng2.length < battleData.set.min_6l || leng2.length > battleData.set.max_6l){
battleData.users[id2] = false
}
 if(!battleData.users[ctx.from.id]){
 ctx.answerCbQuery('A valid team for this battle could not be formed')
 return
 }
await saveBattleData(bword, battleData);
if(Object.values(battleData.users).every(value => value === true)){
const mdata = await loadMessageData();
if(mdata.battle.includes(parseInt(id2))){
ctx.answerCbQuery('You Are In A Battle')
return
}
if(mdata.battle.includes(parseInt(id1))){
ctx.answerCbQuery('Opponent Is In A Battle')
return
}
var la = {}
var tem = {}
let spe = {}
for(const p of pokes1){
const pk = data.pokes.filter((poke)=> poke.pass == p)
if(pk[0]){
const base = pokestats[pk[0].name]
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la[pk[0].pass] = clevel
tem[pk[0].pass] = stats.hp
spe[pk[0].pass] = stats.speed
}
}
var la2 = {}
var tem2 = {}
let spe2 = {}
for(const p of pokes2){
const pk = data2.pokes.filter((poke)=> poke.pass == p)
if(pk[0]){
const base = pokestats[pk[0].name]
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la2[pk[0].pass] = clevel
tem2[pk[0].pass] = stats.hp
spe2[pk[0].pass] = stats.speed
}
}
const user1poke = data.pokes.filter((poke)=>poke.pass==pokes1[0])[0]
const user2poke = data2.pokes.filter((poke)=>poke.pass==pokes2[0])[0]
if(!user1poke || !user2poke || !pokestats[user1poke?.name] || !pokestats[user2poke?.name]){
  try{
    const mdata = await loadMessageData();
    if(Array.isArray(mdata.battle)){
      mdata.battle = mdata.battle.filter((id)=> id !== parseInt(id1) && id !== parseInt(id2))
      await saveMessageData(mdata);
    }
  }catch(e){}
  ctx.answerCbQuery('Battle data invalid. Try again.');
  return
}
const base1 = pokestats[user1poke.name]
const base2 = pokestats[user2poke.name]
  ensureBattleStatus(battleData)
  const p1Lead = Object.keys(spe)[0]
  const p2Lead = Object.keys(spe2)[0]
  const speed1 = getSpeedWithStatus(spe[p1Lead], battleData, p1Lead)
  const speed2 = getSpeedWithStatus(spe2[p2Lead], battleData, p2Lead)
  const result = speed1 > speed2 ? p1Lead : p2Lead;
if(result in tem){
battleData.c = Object.keys(tem)[0]
battleData.chp = tem[battleData.c]
battleData.o = Object.keys(tem2)[0]
battleData.ohp = tem2[battleData.o]
battleData.cid = id1
battleData.oid = id2
battleData.tem = tem
battleData.la = la
battleData.tem2 = tem2
battleData.la2 = la2
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
}else if(result in tem2){
battleData.c = Object.keys(tem2)[0]
battleData.chp = tem2[battleData.c]
battleData.o = Object.keys(tem)[0]
battleData.ohp = tem[battleData.o]
battleData.cid = id2
battleData.oid = id1
battleData.tem = tem2
battleData.la = la2
battleData.tem2 = tem
battleData.la2 = la
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
}
await saveBattleData(bword, battleData);
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p.name]
const pp2 = pokes[p2.name]
if (!battleData.usedMoves) battleData.usedMoves = {};
// use saved full HP for stats
const initStats1 = { hp: battleData.tem2[battleData.o] };
const initStats2 = { hp: battleData.tem[battleData.c] };
const isGroupInit = ctx.chat.type !== 'private';
const pvpInit = buildPvpMsg('<b>* The Pokemon battle commences!</b>', battleData, attacker, defender, p, p2, initStats1, initStats2, bword, isGroupInit);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpInit.msg,{parse_mode:'HTML',reply_markup:pvpInit.keyboard,...pvpInit.ext})
const messageData = await loadMessageData();
messageData.battle.push(parseInt(battleData.cid))
messageData.battle.push(parseInt(battleData.oid))
    messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(), turn:battleData.cid, oppo:battleData.oid };
    await saveMessageData(messageData);
}else{
let msg = '⚔️ <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> Has Challenged <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a>\n'
let msg2 = ''
const settings = battleData.set
if(settings.max_poke < 6){
f = true
msg2 += '\n<b>• Max number of pokemon:</b> '+settings.max_poke+''
}
if(settings.min_6l > 0 || settings.max_6l < 6){
f = true
msg2 += '\n<b>• Number of legendaries:</b> '+settings.min_6l+'-'+settings.max_6l+''
}
if(settings.min_level > 1 || settings.max_level < 100){
f = true
msg2 += '\n<b>• Level gap of pokemon:</b> '+settings.min_level+'-'+settings.max_level+''
}
if(!settings.switch){
f = true
msg2 += '\n<b>• Switching pokemon:</b> Disabled'
}
if(!settings.key_item){
f = true
msg2 += '\n<b>• Form Changing:</b> Disabled'
}
if(settings.sandbox){
f = true
msg2 += '\n<b>• Sandbox mode:</b> Enabled'
}
if(settings.random){
f = true
msg2 += '\n<b>• Random mode:</b> Enabled'
}
if(settings.preview && settings.preview != 'no'){
f = true
msg2 += '\n<b>• Preview mode:</b> '+settings.preview+''
}
if(settings.pin){
f = true
msg2 += '\n<b>• Pin mode:</b> Enabled'
}
if(!settings.type_effects){
f = true
msg2 += '\n<b>• Type efficiency:</b> Disabled'
}
if(!settings.dual_type){
f = true
msg2 += '\n<b>• Dual Types:</b> Disabled'
}
if(settings.allow_regions.length > 0){
f = true
msg2 += '\n<b>• Only regions:</b> ['+c(settings.allow_regions.join(' , '))+']'
}
if(settings.ban_regions.length > 0){
f = true
msg2 += '\n<b>• Banned regions:</b> ['+c(settings.ban_regions.join(' , '))+']'
}
if(settings.ban_types.length > 0){
f = true
msg2 += '\n<b>• Banned types:</b> ['+c(settings.ban_types.join(' , '))+']'
}
if(settings.allow_types.length > 0){
f = true
msg2 += '\n<b>• Types:</b> ['+c(settings.allow_types.join(' , '))+']'
}
if(battleData.users[id1]){
var em1 = '✅'
}else{
var em1 = '❌'
}
if(battleData.users[id2]){
var em2 = '✅'
}else{
var em2 = '❌'
}
if(f){
msg += msg2
 msg += '\n\n-> <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a> : '+em2+''
}else{
 msg += '\n\n-> <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a> : '+em2+''
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Agree ✅',callback_data:'battle_'+id1+'_'+id2+'_'+bword+''},{text:'Reject ❌',callback_data:'reject_'+id1+'_'+id2+'_'+bword+''}],[{text:'Battle Settings ⚔️',callback_data:'sytbr_'+id1+'_'+id2+'_'+bword+''}]]}})
}
})

bot.action(/multimo_/, async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const moveid = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const id = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
  ctx.answerCbQuery('Not Your Turn')
  return
}
let battleData = {};
try {
  battleData = loadBattleData(bword);
} catch (error) {
  battleData = {};
}
dbg('multimo:click', { bword, from: ctx.from.id, turnId: id, moveid, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, qlen: battleData.queuedActions ? battleData.queuedActions.length : 0, switchLock: battleData.switchLock || null, switchPending: battleData.switchPending ? Object.keys(battleData.switchPending) : [] });
const selectedMove = dmoves[moveid];
const selectedMoveName = normalizeMoveName(selectedMove?.name);
if (NO_CONSECUTIVE_USE_MOVES.has(selectedMoveName)) {
  if (!battleData.lastMoveByPass || typeof battleData.lastMoveByPass !== 'object') {
    battleData.lastMoveByPass = {};
  }
  const previousMoveId = String(battleData.lastMoveByPass[String(battleData.c)] || '');
  if (previousMoveId && previousMoveId === String(moveid)) {
    ctx.answerCbQuery('You cannot use this move twice in a row!');
    return;
  }
}
// 1. Queue the Move Action
if (!battleData.queuedActions) battleData.queuedActions = [];
if (!battleData.queuedActions.some(act => String(act.cid) === String(ctx.from.id))) {
  battleData.queuedActions.push({
    cid: ctx.from.id,
    c: battleData.c,
    type: 'move',
    id: moveid
  });
  ctx.answerCbQuery('Action locked!');
} else {
  // Edge case: User clicked a second time
  ctx.answerCbQuery('You already selected your action!');
  return;
}

// Rehydrate any pending switch if it somehow dropped from queue
if (battleData.switchPending) {
  for (const [cid, info] of Object.entries(battleData.switchPending)) {
    if (!battleData.queuedActions.some(act => String(act.cid) === String(cid))) {
      const pass = (info && typeof info === 'object') ? info.pass : info;
      const cpass = (info && typeof info === 'object' && info.c) ? info.c : battleData.c;
      battleData.queuedActions.push({
        cid: cid,
        c: cpass,
        type: 'switch',
        pass: pass
      });
    }
  }
}
dbg('multimo:queued', { bword, q: battleData.queuedActions });

// 2. Wait for Opponent OR Resolve
const singleActionTurn = false;
if (!singleActionTurn && battleData.queuedActions.length < 2) {
    // Only we have chosen. Swap UI so opponent can choose.
    fullSwap(battleData);
    await saveBattleData(bword, battleData);

const attacker = await getUserData(battleData.cid);
const defender = await getUserData(battleData.oid);
const p1 = attacker.pokes.filter((poke) => poke.pass == battleData.c)[0]
const p2 = defender.pokes.filter((poke) => poke.pass == battleData.o)[0]
if (!p1 || !p2) {
  dbg('multimo:wait_missing_pokes', { bword, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o });
  return;
}
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
    const level1 = plevel(p2.name, p2.exp)
    const level2 = plevel(p1.name, p1.exp)
    const stats1 = await Stats(base1, p2.ivs, p2.evs, c(p2.nature), level1)
    const stats2 = await Stats(base2, p1.ivs, p1.evs, c(p1.nature), level2)

    let msg = `<b>* ${displayName(defender, battleData.oid)} has locked in an action!</b>\n`
    msg += `<b>Waiting for ${displayName(attacker, battleData.cid)} to select...</b>`

const isGroupMmo = ctx.chat.type !== 'private';
const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, pvpMmo.msg, { parse_mode: 'HTML', reply_markup: pvpMmo.keyboard, ...pvpMmo.ext })
 dbg('multimo:waiting', { bword, nextTurn: battleData.cid });
     return;
 }
 
 // 3. Both have chosen: resolve immediately using the queued actions.
 dbg('multimo:resolving', { bword, qlen: battleData.queuedActions.length });
 await resolveQueuedActions(ctx, battleData, bword);
 return;
 
 function getMovePriority(moveName, moveCategory, abilityName) {
   const name = String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const category = String(moveCategory || '').toLowerCase();
  const ability = normalizeAbilityName(abilityName);

  const PRIORITY_BY_MOVE = {
    // Increased priority moves
    'accelerock': 1,
    'ally switch': 2,
    'aqua jet': 1,
    'baby doll eyes': 1,
    'baneful bunker': 4,
    'bide': 1,
    'bullet punch': 1,
    'burning bulwark': 4,
    'crafty shield': 3,
    'detect': 4,
    'endure': 4,
    'extreme speed': 2,
    'fake out': 3,
    'feint': 2,
    'first impression': 2,
    'follow me': 2,
    'grassy glide': 1,
    'helping hand': 5,
    'ice shard': 1,
    'ion deluge': 1,
    'jet punch': 1,
    'king s shield': 4,
    'mach punch': 1,
    'magic coat': 4,
    'obstruct': 4,
    'powder': 1,
    'protect': 4,
    'quick attack': 1,
    'quick guard': 3,
    'rage powder': 2,
    'shadow sneak': 1,
    'silk trap': 4,
    'snatch': 4,
    'spiky shield': 4,
    'spotlight': 3,
    'sucker punch': 1,
    'thunderclap': 1,
    'upper hand': 3,
    'vacuum wave': 1,
    'water shuriken': 1,
    'wide guard': 3,
    'zippy zap': 2,

    // Decreased priority moves
    'avalanche': -4,
    'beak blast': -3,
    'circle throw': -6,
    'counter': -5,
    'dragon tail': -6,
    'focus punch': -3,
    'magic room': -7,
    'mirror coat': -5,
    'revenge': -4,
    'roar': -6,
    'shell trap': -3,
    'teleport': -6,
    'trick room': -7,
    'vital throw': -1,
    'whirlwind': -6,
    'wonder room': -7
  };

  const basePriority = PRIORITY_BY_MOVE[name] ?? 0;
  return basePriority + (ability === 'prankster' && category === 'status' ? 1 : 0);
}

const DRAIN_MOVE_RATIOS = {
  'absorb': 0.5,
  'bitter blade': 0.5,
  'bouncy bubble': 0.5,
  'drain punch': 0.5,
  'giga drain': 0.5,
  'horn leech': 0.5,
  'leech life': 0.5,
  'matcha gotcha': 0.5,
  'mega drain': 0.5,
  'parabolic charge': 0.5,
  'draining kiss': 0.75,
  'dream eater': 0.5,
  'oblivion wing': 0.75
};

function getDrainRatio(moveName) {
  return DRAIN_MOVE_RATIOS[moveName] || 0;
}

const RECOIL_MOVE_RULES = {
  'brave bird': { ratio: 1 / 3 },
  'double edge': { ratio: 1 / 3 },
  'flare blitz': { ratio: 1 / 3 },
  'head charge': { ratio: 1 / 4 },
  'head smash': { ratio: 1 / 2 },
  'light of ruin': { ratio: 1 / 2 },
  'shadow end': { ratio: 1 / 2 },
  'shadow rush': { ratio: 1 / 4 },
  'struggle': { maxHpRatio: 1 / 4 },
  'submission': { ratio: 1 / 4 },
  'take down': { ratio: 1 / 4 },
  'volt tackle': { ratio: 1 / 3 },
  'wave crash': { ratio: 1 / 3 },
  'wild charge': { ratio: 1 / 4 },
  'wood hammer': { ratio: 1 / 3 }
};

function getRecoilDamage(moveName, damageDealt, attackerMaxHp) {
  const rule = RECOIL_MOVE_RULES[moveName];
  if (!rule) return 0;
  if (rule.maxHpRatio) return Math.max(1, Math.floor(attackerMaxHp * rule.maxHpRatio));
  if (damageDealt > 0 && rule.ratio) return Math.max(1, Math.floor(damageDealt * rule.ratio));
  return 0;
}

const CRASH_DAMAGE_MOVES = new Set([
  'axe kick',
  'high jump kick',
  'jump kick',
  'supercell slam'
]);

function getCrashDamage(moveName, attackerMaxHp) {
  if (!CRASH_DAMAGE_MOVES.has(moveName)) return 0;
  return Math.max(1, Math.floor(attackerMaxHp / 2));
}

const SELF_FAINT_MOVES = new Set([
  'explosion',
  'final gambit',
  'healing wish',
  'lunar dance',
  'memento',
  'misty explosion',
  'self destruct'
]);

function applySelfFaintAfterMove(moveName, moveLabel, battleData, attackerPass, attackerName) {
  if (!SELF_FAINT_MOVES.has(moveName)) return '';
  const selfBefore = Math.max(0, battleData.chp || 0);
  if (selfBefore <= 0) return '';
  battleData.chp = 0;
  if (!battleData.tem || typeof battleData.tem !== 'object') battleData.tem = {};
  battleData.tem[attackerPass] = 0;
  return '\n-> <b>'+c(attackerName)+'</b> fainted after using <b>'+c(moveLabel)+'</b>!';
}

const STAT_KEYS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];

const MOVE_STAT_EFFECTS = {
  'growl': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'aurora beam': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'baby doll eyes': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'bitter malice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'breaking swipe': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'charm': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'chilling water': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'feather dance': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'lunge': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'max wyrmwind': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'memento': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'noble roar': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'parting shot': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'captivate': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'confide': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'eerie impulse': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'max flutterby': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'play nice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'play rough': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'springtide storm': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.3 }],
  'strength sap': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'mist ball': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.5 }],
  'tearful look': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'tickle': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'trop kick': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'venom drench': [
    { target: 'target', stat: 'attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'special_attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'speed', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] }
  ],
  'tail whip': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'leer': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'screech': [{ target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'crunch': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'crush claw': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'fire lash': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'grav apple': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'iron tail': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.3 }],
  'liquidation': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'max phantasm': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'octolock': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }, { target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'razor shell': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'rock smash': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'shadow bone': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'shadow down': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'spicy extract': [{ target: 'target', stat: 'attack', stages: 2, chance: 1 }, { target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'thunderous kick': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'triple arrows': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'metal sound': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'fake tears': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'acid spray': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'apple acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'psychic': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'shadow ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'bug buzz': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'earth power': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'energy ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'flash cannon': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'focus blast': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'lumina crash': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'luster purge': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.5 }],
  'max darkness': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'seed flare': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 0.4 }],
  'snarl': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'skitter smack': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'spirit break': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'struggle bug': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'mystical fire': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'moonblast': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.3 }],
  'string shot': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bleakwind storm': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.3 }],
  'scary face': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'constrict': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'cotton spore': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'drum beating': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'icy wind': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'glaciate': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'electroweb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'g max foam burst': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bulldoze': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'max strike': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'mud shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'pounce': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'rock tomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'low sweep': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'bubble': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'bubble beam': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'silk trap': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sticky web': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'syrup bomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'tar shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'toxic thread': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sand attack': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'smokescreen': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'kinesis': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'flash': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'mud slap': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'leaf tornado': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'mirror shot': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'mud bomb': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'muddy water': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'night daze': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.4 }],
  'octazooka': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'secret power': [{ target: 'target', randomFrom: ['attack', 'defense', 'special_attack', 'accuracy', 'speed'], stages: -1, chance: 0.3 }],
  'sweet scent': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'defog': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'g max tartness': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'shadow mist': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'swords dance': [{ target: 'self', stat: 'attack', stages: 2, chance: 1 }],
  'howl': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'meditate': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'sharpen': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'bulk up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'dragon dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'acupressure': [{ target: 'self', randomStat: true, stages: 2, chance: 1 }],
  'coil': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'gravity': [],
  'work up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'growth': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'shift gear': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'harden': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'withdraw': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'defense curl': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'iron defense': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'acid armor': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'cotton guard': [{ target: 'self', stat: 'defense', stages: 3, chance: 1 }],
  'cosmic power': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'nasty plot': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }],
  'calm mind': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'tail glow': [{ target: 'self', stat: 'special_attack', stages: 3, chance: 1 }],
  'charge beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.7 }],
  'fiery dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.5 }],
  'electro shot': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'geomancy': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 2, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'max ooze': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'meteor beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'mystical power': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'take heart': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'torch song': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'amnesia': [{ target: 'self', stat: 'special_defense', stages: 2, chance: 1 }],
  'aromatic mist': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'charge': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'max quake': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'quiver dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'agility': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'rock polish': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'autotomize': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'flame charge': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aqua step': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aura wheel': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'esper wing': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'max airstream': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'rapid spin': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'trailblaze': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'double team': [{ target: 'self', stat: 'evasion', stages: 1, chance: 1 }],
  'minimize': [{ target: 'self', stat: 'evasion', stages: 2, chance: 1 }],
  'hone claws': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'close combat': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'armor cannon': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'clanging scales': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'dragon ascent': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'headlong rush': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'hyperspace fury': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'scale shot': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'superpower': [{ target: 'self', stat: 'attack', stages: -1, chance: 1 }, { target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'tera blast': [{ target: 'self', statByMoveCategory: { physical: 'attack', special: 'special_attack' }, stages: -1, chance: 1 }],
  'hammer arm': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'ice hammer': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'spin out': [{ target: 'self', stat: 'speed', stages: -2, chance: 1 }],
  'curse': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'v create': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'overheat': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'make it rain': [{ target: 'self', stat: 'special_attack', stages: -1, chance: 1 }],
  'leaf storm': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'draco meteor': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'psycho boost': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'fleur cannon': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'shell smash': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: -1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }
  ],
  // All-or-nothing 10% all-stats boost
  'ancient power': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'silver wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'ominous wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  // Guaranteed all-stats boosts
  'clangorous soulblaze': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  'extreme evoboost': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 }
  ],
  'no retreat': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  // Single/partial attack boosts
  'max knuckle': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'metal claw': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.1 }],
  'meteor mash': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.2 }],
  'order up': [{ target: 'self', randomFrom: ['attack', 'defense', 'special_attack'], stages: 1, chance: 1 }],
  'power-up punch': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'rage': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'tidy up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'victory dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  // HP-cost boosts: handled specially in executeStandardMove
  'belly drum': [],
  'clangorous soul': [],
  'fillet away': [],
  // Post-KO boost: handled specially in executeStandardMove
  'fell stinger': [],
  // Raise user defense
  'barrier': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'defend order': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'diamond storm': [{ target: 'self', stat: 'defense', stages: 2, chance: 0.5 }],
  'flower shield': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'max steelspike': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'psyshield bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'shelter': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'skull bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'steel wing': [{ target: 'self', stat: 'defense', stages: 1, chance: 0.1 }],
  'stockpile': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'stuff cheeks': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }]
};

function normalizeMoveName(moveName) {
  return String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function ensureBattleStatStages(battleData) {
  if (!battleData.statStages || typeof battleData.statStages !== 'object') {
    battleData.statStages = {};
  }
  return battleData.statStages;
}

function ensurePokemonStatStages(battleData, pass) {
  const all = ensureBattleStatStages(battleData);
  if (!all[pass] || typeof all[pass] !== 'object') {
    all[pass] = { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0, accuracy: 0, evasion: 0 };
  }
  const keys = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
  for (const key of keys) {
    if (typeof all[pass][key] !== 'number') all[pass][key] = 0;
  }
  return all[pass];
}

function getStageMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function applyStageToStat(baseValue, stage) {
  return Math.max(1, Math.floor(baseValue * getStageMultiplier(stage)));
}

function getEffectiveSpeed(baseSpeed, battleData, pass) {
  const statusAdjusted = getSpeedWithStatus(baseSpeed, battleData, pass);
  const stages = ensurePokemonStatStages(battleData, pass);
  return applyStageToStat(statusAdjusted, stages.speed);
}

function getModifiedAccuracy(baseAccuracy, attackerAccuracyStage, defenderEvasionStage) {
  const netStage = (attackerAccuracyStage || 0) - (defenderEvasionStage || 0);
  const acc = Math.floor(baseAccuracy * getStageMultiplier(netStage));
  return Math.max(1, Math.min(100, acc));
}

function clampStage(stage) {
  return Math.max(-6, Math.min(6, stage));
}

function getStageVerb(delta) {
  const mag = Math.abs(delta);
  if (delta > 0) {
    if (mag >= 3) return 'rose drastically';
    if (mag === 2) return 'rose sharply';
    return 'rose';
  }
  if (mag >= 3) return 'fell drastically';
  if (mag === 2) return 'fell harshly';
  return 'fell';
}

function getStatLabel(stat) {
  if (stat === 'special_attack') return 'Special Attack';
  if (stat === 'special_defense') return 'Special Defense';
  return c(stat);
}

function expandEffectStats(effect) {
  if (effect.stat === 'special') return ['special_attack', 'special_defense'];
  return [effect.stat];
}

function applyMoveStatEffects({ battleData, moveName, moveCategory, attackerName, defenderName, attackerPass, defenderPass, attackerAbility, defenderAbility, targetAlive }) {
  const effects = MOVE_STAT_EFFECTS[moveName] || [];
  const resolvedMoveCategory = String(moveCategory || '').toLowerCase();
  if (!effects.length) return '';

  const resolvedChanceGroups = {};
  for (const effect of effects) {
    if (effect.chanceGroup !== undefined && !(effect.chanceGroup in resolvedChanceGroups)) {
      resolvedChanceGroups[effect.chanceGroup] = Math.random() <= (effect.chance ?? 1);
    }
  }

  let out = '';
  for (const effect of effects) {
    if (effect.chanceGroup !== undefined) {
      if (!resolvedChanceGroups[effect.chanceGroup]) continue;
    } else {
      if (Math.random() > (effect.chance ?? 1)) continue;
    }
    if (effect.target === 'target' && !targetAlive) continue;
    if (effect.target === 'target' && Array.isArray(effect.whenTargetStatusIn) && effect.whenTargetStatusIn.length > 0) {
      const tStatus = getBattleStatus(battleData, defenderPass);
      if (!tStatus || !effect.whenTargetStatusIn.includes(tStatus)) continue;
    }

    const targetPass = effect.target === 'self' ? attackerPass : defenderPass;
    const targetName = effect.target === 'self' ? attackerName : defenderName;
    const targetAbility = effect.target === 'self' ? attackerAbility : defenderAbility;
    const stages = ensurePokemonStatStages(battleData, targetPass);

    if (effect.randomStat) {
      const allStats = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
      const eligible = allStats.filter(s => (stages[s] || 0) < 6);
      if (eligible.length > 0) {
        const statKey = eligible[Math.floor(Math.random() * eligible.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    if (effect.randomFrom) {
      const increasing = (effect.stages || 0) >= 0;
      const pool = effect.randomFrom.filter(s => increasing ? (stages[s] || 0) < 6 : (stages[s] || 0) > -6);
      if (pool.length > 0) {
        const statKey = pool[Math.floor(Math.random() * pool.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    const effectStats = effect.statByMoveCategory ? [effect.statByMoveCategory[resolvedMoveCategory]].filter(Boolean) : expandEffectStats(effect);

    for (const statKey of effectStats) {
      out += applyStageChanges({
        battleData,
        pass: targetPass,
        pokemonName: targetName,
        abilityName: targetAbility,
        changes: [{ stat: statKey, delta: effect.stages }],
        c,
        fromOpponent: effect.target === 'target'
      }).message;
    }
  }
  return out;
}

if (!battleData.bideState) battleData.bideState = {};
if (battleData.bideState[action1.c]) { action1.id = battleData.bideState[action1.c].moveId; }
if (action2 && battleData.bideState[action2.c]) { action2.id = battleData.bideState[action2.c].moveId; }
const chargingState1 = getChargingStateForPass(battleData, action1.c);
if (chargingState1 && chargingState1.moveId) { action1.id = chargingState1.moveId; }
if (action2) {
  const chargingState2 = getChargingStateForPass(battleData, action2.c);
  if (chargingState2 && chargingState2.moveId) { action2.id = chargingState2.moveId; }
}
battleData.bideCycle = (battleData.bideCycle || 0) + 1;

// Use the unified resolver for standard two-action turns so ability hooks stay consistent.
if (!singleActionTurn) {
  await resolveQueuedActions(ctx, battleData, bword);
  return;
}

// If a switch is queued in this turn, delegate to unified resolver (handles switch-first flow)
if (!singleActionTurn && (action1.type === 'switch' || (action2 && action2.type === 'switch'))) {
  await resolveQueuedActions(ctx, battleData, bword);
  return;
}

let orderedActions = [];
if (singleActionTurn) {
  orderedActions = [action1];
} else {
  const mv1 = dmoves[action1.id];
  const mv2 = dmoves[action2.id];
  if (!mv1 || !mv2) {
    await resolveQueuedActions(ctx, battleData, bword);
    return;
  }
  const usrA = await getUserData(action1.cid);
  const usrB = await getUserData(action2.cid);
  const pkA = usrA.pokes.filter((p) => p.pass == action1.c)[0];
  const pkB = usrB.pokes.filter((p) => p.pass == action2.c)[0];
  const pri1 = getMovePriority(mv1.name, mv1.category, pkA && pkA.ability);
  const pri2 = getMovePriority(mv2.name, mv2.category, pkB && pkB.ability);

  if (pri1 > pri2) { orderedActions = [action1, action2]; }
  else if (pri2 > pri1) { orderedActions = [action2, action1]; }
  else {
      if (speedA > speedB) { orderedActions = [action1, action2]; }
      else if (speedB > speedA) { orderedActions = [action2, action1]; }
      else { orderedActions = (Math.random() < 0.5) ? [action1, action2] : [action2, action1]; }
  }
}

if (!battleData.turnHits) battleData.turnHits = {};
battleData.turnHits = {}; // Reset at start of turn
battleData.turnAbilityState = { skipSpeedBoost: {}, failedEscape: {} };
const isSingleMoveTurn = singleActionTurn || orderedActions.length < 2;

let turnLogs = "\n\n<b>Turn Summary:</b>";

// Ensure context points to who needs to act first
if (String(battleData.cid) !== String(orderedActions[0].cid)) {
    fullSwap(battleData);
}

// Function to execute one standard attack in current context (battleData.cid attacking battleData.oid)
async function executeStandardMove(act) {
    if (battleData.chp <= 0 || battleData.ohp <= 0) return; // attacker or defender fainted

    const move = dmoves[act.id];
    const moveName = normalizeMoveName(move?.name);
    const hitsMinimizedBonus = MINIMIZE_PUNISH_MOVES.has(moveName) && isPokemonMinimized(battleData, battleData.o);
    const isCounterMove = ['counter', 'mirror coat', 'metal burst', 'comeuppance'].includes(moveName);
    let attacker = await getUserData(battleData.cid);
    let defender = await getUserData(battleData.oid);
    let p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0];
    let op = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
    const attackerAbility = p && p.ability ? p.ability : 'none';
    const defenderAbility = op && op.ability ? op.ability : 'none';
    let base1 = pokestats[p.name];
    let base2 = pokestats[op.name];
    let level1 = plevel(p.name, p.exp);
    let level2 = plevel(op.name, op.exp);
    let stats1 = await Stats(base1, p.ivs, p.evs, c(p.nature), level1);
    let stats2 = await Stats(base2, op.ivs, op.evs, c(op.nature), level2);
    
    // Check type effectiveness
    const type3 = pokes[op.name].types[0];
    const type4 = pokes[op.name].types[1] ? c(pokes[op.name].types[1]) : null;
    let eff1 = 1;
    if (battleData.set.type_effects) { eff1 = await eff(c(move.type), c(type3), type4); }
    const defenderLevitateInfo = getLevitateInfo({ abilityName: defenderAbility });
    const levitateBlockedMove = defenderLevitateInfo.active && String(move.type || '').toLowerCase() === 'ground';
    if (levitateBlockedMove) eff1 = 0;
    
    const atkStages = ensurePokemonStatStages(battleData, battleData.c);
    const defStages = ensurePokemonStatStages(battleData, battleData.o);
    const unawareModifiers = getUnawareBattleModifiers({
      attackerAbility,
      defenderAbility,
      moveCategory: move.category,
      attackerStages: atkStages,
      defenderStages: defStages
    });
    const unawareMessage = getUnawareActivationMessages({
      attackerName: p.name,
      defenderName: op.name,
      unawareModifiers
    });
    const supremeOverlordInfo = getSupremeOverlordInfo({
      abilityName: attackerAbility,
      partyHpMap: battleData.tem,
      activePass: battleData.c
    });

    let atk = applyStageToStat(stats1.attack, unawareModifiers.attackStage);
    let def2 = applyStageToStat(stats2.defense, unawareModifiers.defenseStage);
    if (move.category == 'special') {
      atk = applyStageToStat(stats1.special_attack, unawareModifiers.attackStage);
      def2 = applyStageToStat(stats2.special_defense, unawareModifiers.defenseStage);
    } else {
      atk = Math.max(1, Math.floor(atk * getAttackStatMultiplier(attackerAbility, move.category)));
    }
    atk = Math.max(1, Math.floor(atk * supremeOverlordInfo.multiplier));
    if (move.category == 'physical' && getBattleStatus(battleData, battleData.c) === 'burn') {
        atk = Math.max(1, Math.floor(atk / 2));
    }
    
    let msgLocal = "";
    let blockedByGoodAsGold = false;
    
    // ActState (Frozen, Asleep, Paralyzed etc)
    ensureBattleStatus(battleData); // verify status conditions haven't cleared
    const actState = canPokemonAct(battleData, battleData.c, p.name);
    const chargingState = getChargingStateForPass(battleData, battleData.c);
    const isChargeReleaseTurn = !!(chargingState && String(chargingState.moveId) === String(act.id));
    if (!actState.canAct && isChargeReleaseTurn) {
      clearChargingStateForPass(battleData, battleData.c);
      clearSemiInvulnerableStateForPass(battleData, battleData.c);
    }
    
    if (!actState.canAct) {
        msgLocal += "\n" + actState.msg;
    } else if (isChargeReleaseTurn) {
      clearChargingStateForPass(battleData, battleData.c);
      clearSemiInvulnerableStateForPass(battleData, battleData.c);
      msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed <b>'+c(move.name)+'</b>!';
    } else if (moveName === 'bide') {
        // Bide bypasses accuracy/evasion checks
        if (!battleData.bideState) battleData.bideState = {};
        if (!battleData.bideState[battleData.c]) {
      // Bide stores for exactly 2 turns, then retaliates.
      battleData.bideState[battleData.c] = { turnsLeft: 2, damage: 0, moveId: act.id, lastAttacker: null, lastProcessedCycle: battleData.bideCycle };
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else {
            let bState = battleData.bideState[battleData.c];
        if (bState.lastProcessedCycle === battleData.bideCycle) {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else if (isSingleMoveTurn) {
          // Do not progress countdown on one-sided turns.
          bState.lastProcessedCycle = battleData.bideCycle;
          msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else if (bState.turnsLeft > 1) {
                bState.turnsLeft -= 1;
                bState.lastProcessedCycle = battleData.bideCycle;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
            } else {
                bState.lastProcessedCycle = battleData.bideCycle;
                if (bState.damage === 0) {
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy... but it failed!';
                } else {
                    var damage = Math.min(bState.damage * 2, battleData.ohp);
                    const sturdyDamage = applyDefenderDamageWithSturdy({
                      battleData,
                      damage,
                      defenderAbility,
                      defenderName: op.name,
                      defenderMaxHp: stats2.hp,
                      moveName
                    });
                    damage = sturdyDamage.damage;
                  battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
                  if (battleData.bideState && battleData.bideState[battleData.o]) {
                    battleData.bideState[battleData.o].damage += damage;
                    battleData.bideState[battleData.o].lastAttacker = battleData.c;
                  }
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy! It dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
                    msgLocal += sturdyDamage.message;
                }
                delete battleData.bideState[battleData.c];
            }
        }
          } else if (CHARGING_TURN_MOVES.has(moveName)) {
            setChargingStateForPass(battleData, battleData.c, act.id, moveName);
            if (SEMI_INVULNERABLE_CHARGE_MOVES.has(moveName)) {
              setSemiInvulnerableStateForPass(battleData, battleData.c, moveName);
            }
            msgLocal += getChargingTurnMessage(p.name, moveName);
            if (CHARGE_START_STAT_MOVES.has(moveName)) {
              msgLocal += applyMoveStatEffects({
                battleData,
                moveName,
                moveCategory: move.category,
                attackerName: p.name,
                defenderName: op.name,
                attackerPass: battleData.c,
                defenderPass: battleData.o,
                attackerAbility,
                defenderAbility,
                targetAlive: battleData.ohp > 0
              });
            }
          } else if (isCounterMove) {
            // Counterattack moves only succeed if this Pokemon was hit earlier this turn.
            const lastHit = battleData.turnHits[battleData.c];
            const wasHitByCurrentFoe = lastHit && String(lastHit.from) === String(battleData.o);
            if (!lastHit || lastHit.damage === 0 || !wasHitByCurrentFoe) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else if (moveName === 'counter' && lastHit.category !== 'physical') {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else if (moveName === 'mirror coat' && lastHit.category !== 'special') {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else {
              const multiplier = (moveName === 'metal burst' || moveName === 'comeuppance') ? 1.5 : 2;
              var damage = Math.min(Math.max(Math.floor(lastHit.damage * multiplier), 1), battleData.ohp);
              const sturdyDamage = applyDefenderDamageWithSturdy({
                battleData,
                damage,
                defenderAbility,
                defenderName: op.name,
                defenderMaxHp: stats2.hp,
                moveName
              });
              damage = sturdyDamage.damage;
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
              if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
              }
              msgLocal += '\n-> <b>'+c(p.name)+'</b> retaliated with <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
              msgLocal += sturdyDamage.message;
            }
          } else {
        if (isSemiInvulnerableAvoidedMove(battleData, battleData.o, move.category, moveName)) {
          const opSemi = getSemiInvulnerableStateForPass(battleData, battleData.o);
          msgLocal += getSemiInvulnerableAvoidMessage(op.name, opSemi ? opSemi.moveName : '');
        } else {
        const bypassAccuracyCheck = moveName === 'bind' || hitsMinimizedBonus;
        const hasAccuracyCheck = !bypassAccuracyCheck && move.accuracy !== null && move.accuracy !== undefined;
        const accValue = hasAccuracyCheck ? getModifiedAccuracy(Number(move.accuracy), unawareModifiers.accuracyStage, unawareModifiers.evasionStage) : 100;
        if (hasAccuracyCheck && Math.random() * 100 > accValue) {
        msgLocal += unawareMessage;
        msgLocal += '\n-> <b>'+c(p.name)+'</b> <b>'+c(move.name)+'</b> has missed.';
            const crash = getCrashDamage(moveName, stats1.hp);
            if (crash > 0) {
              const selfBefore = battleData.chp;
              const crashTaken = Math.min(crash, selfBefore);
              battleData.chp = Math.max(0, selfBefore - crashTaken);
              battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
              msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
            }
    } else if (hasAccuracyCheck && Math.random() < 0.05) {
        msgLocal += unawareMessage;
        msgLocal += '\n-> <b>'+c(op.name)+'</b> Dodged <b>'+c(p.name)+'</b>\'s <b>'+c(move.name)+'</b>';
            const crash = getCrashDamage(moveName, stats1.hp);
            if (crash > 0) {
              const selfBefore = battleData.chp;
              const crashTaken = Math.min(crash, selfBefore);
              battleData.chp = Math.max(0, selfBefore - crashTaken);
              battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
              msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
            }
    } else {
            if (moveName === 'leech seed') {
              if (!battleData.leechSeed || typeof battleData.leechSeed !== 'object') {
                battleData.leechSeed = {};
              }
              const defenderTypes = (pokes[op.name]?.types || []).map((t) => String(t).toLowerCase());
              if (defenderTypes.includes('grass')) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else if (battleData.leechSeed[battleData.o]) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else {
                battleData.leechSeed[battleData.o] = battleData.c;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> planted a seed on <b>'+c(op.name)+'</b>!';
              }
            } else if ((move.category == 'status' || !move.power) && !OHKO_MOVES.has(moveName)) {
            const goodAsGoldInfo = getGoodAsGoldInfo({ abilityName: defenderAbility });
            if (goodAsGoldInfo.active && isOpponentTargetingStatusMove(move, moveName)) {
              blockedByGoodAsGold = true;
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
              msgLocal += getAbilityActivationMessage(op.name, 'Good As Gold');
              msgLocal += unawareMessage;
              msgLocal += '\n-> It had no effect on <b>'+c(op.name)+'</b>!';
            } else {
            msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
            msgLocal += unawareMessage;
            msgLocal += applyMoveStatEffects({
              battleData,
              moveName,
              moveCategory: move.category,
              attackerName: p.name,
              defenderName: op.name,
              attackerPass: battleData.c,
              defenderPass: battleData.o,
              attackerAbility,
              defenderAbility,
              targetAlive: battleData.ohp > 0
            });
            msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, true);
            msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, true);

            if (moveName === 'strength sap') {
              const targetStages = ensurePokemonStatStages(battleData, battleData.o);
              const targetAtk = applyStageToStat(stats2.attack, targetStages.attack);
              const hpBefore = battleData.chp;
              battleData.chp = Math.min(stats1.hp, battleData.chp + targetAtk);
              const healed = Math.max(0, battleData.chp - hpBefore);
              battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));
              if (healed > 0) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
              }
            }

            if (moveName === 'belly drum') {
              const bdHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > bdHalf) {
                battleData.chp -= bdHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - bdHalf);
                const bdStages = ensurePokemonStatStages(battleData, battleData.c);
                const bdTarget = attackerAbility === 'contrary' ? -6 : 6;
                const bdDelta = bdTarget - (bdStages.attack || 0);
                if (bdDelta !== 0) {
                  msgLocal += applyStageChanges({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    changes: [{ stat: 'attack', delta: bdDelta }],
                    c,
                    fromOpponent: false
                  }).message;
                }
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its own HP to maximize Attack!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
            }

            if (moveName === 'clangorous soul') {
              const csThird = Math.floor(stats1.hp / 3);
              if (battleData.chp > csThird) {
                battleData.chp = Math.max(1, battleData.chp - csThird);
                battleData.tem[battleData.c] = Math.max(1, (battleData.tem[battleData.c] || battleData.chp + csThird) - csThird);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: ['attack','defense','special_attack','special_defense','speed'].map((stat) => ({ stat, delta: 1 })),
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to power itself up!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
            }

            if (moveName === 'fillet away') {
              const faHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > faHalf) {
                battleData.chp -= faHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - faHalf);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: 2 }, { stat: 'special_attack', delta: 2 }, { stat: 'speed', delta: 2 }],
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to sharpen all its senses!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
            }

            if (moveName === 'minimize') {
              setPokemonMinimized(battleData, battleData.c, true);
            }

            msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, true);
            msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, true);

            msgLocal += applySelfFaintAfterMove(moveName, move.name, battleData, battleData.c, p.name);
            }
        } else {
              if (moveName === 'dream eater' && getBattleStatus(battleData, battleData.o) !== 'sleep') {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else {
            const pinchPowerMult = getPinchPowerMultiplier({
              abilityName: attackerAbility,
              moveType: move.type,
              currentHp: battleData.chp,
              maxHp: stats1.hp
            });
            const technicianInfo = getTechnicianPowerInfo({
              abilityName: attackerAbility,
              movePower: move.power
            });
            const boostedPower = Math.max(1, Math.floor(Number(move.power || 0) * pinchPowerMult * technicianInfo.multiplier));
            const stabInfo = getStabInfo({
              abilityName: attackerAbility,
              moveType: move.type,
              pokemonTypes: pokes[p.name]?.types || []
            });
            var damage = Math.min(Math.max(0, Math.floor(calc(atk, def2, level1, boostedPower, eff1) * stabInfo.multiplier)), battleData.ohp);
            let ohkoFailed = false;
            if (OHKO_MOVES.has(moveName)) {
              const attackerTypes = (pokes[p.name]?.types || []).map((t) => String(t).toLowerCase());
              const defenderTypes = (pokes[op.name]?.types || []).map((t) => String(t).toLowerCase());
              const sheerColdBlocked = moveName === 'sheer cold' && defenderTypes.includes('ice') && !attackerTypes.includes('ice');
              const ohkoChance = getOhkoHitChance(level1, level2);
              if (level1 < level2 || sheerColdBlocked || Math.random() * 100 >= ohkoChance) {
                damage = 0;
                ohkoFailed = true;
              } else {
                damage = battleData.ohp;
              }
            }
            if (!ohkoFailed && hitsMinimizedBonus && damage > 0) {
              damage = Math.min(Math.max(1, Math.floor(damage * MINIMIZE_PUNISH_MULTIPLIER)), battleData.ohp);
            }
            const isPerfectCrit = PERFECT_CRIT_MOVES.has(moveName);
            const isHighCritMove = HIGH_CRIT_RATIO_MOVES.has(moveName);
              let hitCount = (!ohkoFailed && damage > 0) ? getMultiHitCount(moveName) : 1;
              let critHits = 0;
              let staminaMessage = '';
              let weakArmorMessage = '';
              let shieldMessage = '';
              let sturdyMessage = '';
              let multiscaleMessage = '';
              let levitateMessage = '';
              if (!ohkoFailed && damage > 0 && !OHKO_MOVES.has(moveName)) {
              let totalDamage = 0;
              let landedHits = 0;
              for (let h = 0; h < hitCount; h += 1) {
                const remainingHp = battleData.ohp - totalDamage;
                if (remainingHp <= 0) break;

                let hitDamage = damage;
                const didHitCrit = isPerfectCrit || (isHighCritMove && Math.random() < HIGH_CRIT_RATIO_CHANCE);
                if (didHitCrit) {
                  critHits += 1;
                  hitDamage = Math.max(1, Math.floor(hitDamage * CRIT_DAMAGE_MULTIPLIER));
                } else {
                  const screenMult = getScreenDamageMultiplier(battleData, battleData.oid, move.category, attackerAbility, moveName);
                  if (screenMult < 1) {
                    hitDamage = Math.max(1, Math.floor(hitDamage * screenMult));
                  }
                }

                  const shieldResult = applyShadowShieldReduction({
                    abilityName: defenderAbility,
                  currentHp: remainingHp,
                  maxHp: stats2.hp,
                  incomingDamage: hitDamage,
                  moveName,
                  pokemonName: op.name,
                  c
                });
                  hitDamage = shieldResult.damage;
                  if (shieldResult.activated && !shieldMessage) {
                    shieldMessage = shieldResult.message;
                  }
                  const multiscaleResult = applyMultiscaleReduction({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = multiscaleResult.damage;
                  if (multiscaleResult.activated && !multiscaleMessage) {
                    multiscaleMessage = multiscaleResult.message;
                  }
                const sturdyResult = applySturdySurvival({
                  abilityName: defenderAbility,
                  currentHp: remainingHp,
                  maxHp: stats2.hp,
                  incomingDamage: hitDamage,
                  pokemonName: op.name,
                  c
                });
                hitDamage = sturdyResult.damage;
                if (sturdyResult.activated && !sturdyMessage) {
                  sturdyMessage = sturdyResult.message;
                }
                hitDamage = Math.min(hitDamage, remainingHp);
                totalDamage += hitDamage;
                landedHits += 1;
                staminaMessage += applyStaminaOnHit({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  abilityName: defenderAbility,
                  damageDealt: hitDamage,
                  c
                }).message;
                weakArmorMessage += applyWeakArmorOnHit({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  abilityName: defenderAbility,
                  moveCategory: move.category,
                  damageDealt: hitDamage,
                  c
                }).message;
              }
              hitCount = landedHits;
              damage = totalDamage;
            }
            if (OHKO_MOVES.has(moveName) && damage > 0) {
              const sturdyDamage = applyDefenderDamageWithSturdy({
                battleData,
                damage,
                defenderAbility,
                defenderName: op.name,
                defenderMaxHp: stats2.hp,
                moveName
              });
              damage = sturdyDamage.damage;
              staminaMessage += applyStaminaOnHit({
                battleData,
                pass: battleData.o,
                pokemonName: op.name,
                abilityName: defenderAbility,
                damageDealt: damage,
                c
              }).message;
              sturdyMessage += sturdyDamage.message;
            } else {
              battleData.ohp = Math.max((battleData.ohp - damage), 0);
              battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o] - damage), 0);
            }
              if (ohkoFailed) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
                msgLocal += unawareMessage;
                if (levitateBlockedMove) {
                  levitateMessage = '\n-> <b>'+c(op.name)+'</b>\'s <b>Levitate</b> activated!';
                }
                msgLocal += getInfiltratorBypassMessage(battleData, battleData.oid, move.category, attackerAbility, p.name, moveName);
                if (pinchPowerMult > 1) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>'+c(formatAbilityLabel(attackerAbility))+'</b> boosted its '+c(move.type)+'-type move!';
                }
                msgLocal += staminaMessage;
                if (technicianInfo.active) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Technician</b> activated!';
                }
                if (stabInfo.adaptabilityActive && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Adaptability</b> activated!';
                }
                if (supremeOverlordInfo.active && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Supreme Overlord</b> activated!';
                }
                msgLocal += weakArmorMessage;
                msgLocal += shieldMessage;
                msgLocal += multiscaleMessage;
                msgLocal += sturdyMessage;
                msgLocal += levitateMessage;
                if (hitCount > 1) {
                  msgLocal += '\n-> It hit <b>'+hitCount+'</b> times!';
                }
            }
            if (!ohkoFailed && critHits > 0 && damage > 0) {
              msgLocal += '\n-> <b>A critical hit!</b>';
            }

              if (eff1 === 0) {
                const crash = getCrashDamage(moveName, stats1.hp);
                if (crash > 0) {
                  const selfBefore = battleData.chp;
                  const crashTaken = Math.min(crash, selfBefore);
                  battleData.chp = Math.max(0, selfBefore - crashTaken);
                  battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
                }
              }

              const drainRatio = getDrainRatio(moveName);
              if (drainRatio > 0 && damage > 0) {
                const healRaw = Math.max(1, Math.floor(damage * drainRatio));
                const prevHp = battleData.chp;
                battleData.chp = Math.min(stats1.hp, battleData.chp + healRaw);
                const healed = Math.max(0, battleData.chp - prevHp);
                battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || prevHp) + healed));
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> drained <code>'+healed+'</code> HP!';
                }
              }

              const recoil = getRecoilDamage(moveName, damage, stats1.hp);
              if (recoil > 0) {
                const selfBefore = battleData.chp;
                const recoilTaken = Math.min(recoil, selfBefore);
                battleData.chp = Math.max(0, selfBefore - recoilTaken);
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - recoilTaken);
                msgLocal += '\n-> <b>'+c(p.name)+'</b> was hurt by recoil and lost <code>'+recoilTaken+'</code> HP!';
              }
              msgLocal += applySelfFaintAfterMove(moveName, move.name, battleData, battleData.c, p.name);
              msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, damage > 0);
              msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, damage > 0);
              msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, damage > 0);
              msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, damage > 0);
            
            // Record hit for counter-attacks and accumulate bide damage
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category, from: battleData.c, move: moveName };
            if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
            }
            
            if (!ohkoFailed && eff1 == 0) msgLocal += '\n<b>* It\'s 0x effective!</b>';
            else if (!ohkoFailed && eff1 == 0.5) msgLocal += '\n<b>* It\'s not very effective...</b>';
            else if (!ohkoFailed && eff1 == 2) msgLocal += '\n<b>* It\'s super effective!</b>';
            else if (!ohkoFailed && eff1 == 4) msgLocal += '\n<b>* It\'s incredibly super effective!</b>';

            if (damage > 0) {
                msgLocal += applyMoveStatEffects({
                  battleData,
                  moveName,
                  moveCategory: move.category,
                  attackerName: p.name,
                  defenderName: op.name,
                  attackerPass: battleData.c,
                  defenderPass: battleData.o,
                  attackerAbility,
                  defenderAbility,
                  targetAlive: battleData.ohp > 0
                });
              if (moveName === 'fell stinger' && battleData.ohp <= 0) {
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: 3 }],
                  c,
                  fromOpponent: false
                }).message;
              }
            }
            msgLocal += applyAbilityOnDamageTaken({
              battleData,
              pass: battleData.o,
              pokemonName: op.name,
              abilityName: defenderAbility,
              moveType: move.type,
              moveCategory: move.category,
              hpBefore: defenderHpBeforeHit,
              hpAfter: battleData.ohp,
              maxHp: stats2.hp,
              damageDealt: damage,
              c
            }).message;
            if (battleData.ohp <= 0) {
              const remainingDefenderMons = Object.keys(battleData.tem2 || {}).filter((pass) => battleData.tem2[pass] > 0);
              if (remainingDefenderMons.length > 0 || normalizeAbilityName(attackerAbility) !== 'beast-boost') {
                msgLocal += applyAbilityKo({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  stats: stats1,
                  c
                }).message;
              }
            }
            }
        }
        
        // Status condition inflictions
        const statusEffect = getMoveStatusEffect(move);
        if (statusEffect && battleData.ohp > 0 && !blockedByGoodAsGold) {
            const existingStatus = getBattleStatus(battleData, battleData.o);
            const defenderTypes = pokes[op.name]?.types || [];
            if (!existingStatus && !isStatusImmune(statusEffect.status, defenderTypes) && Math.random() < statusEffect.chance) {
                setBattleStatus(battleData, battleData.o, statusEffect.status);
                msgLocal += '\n-> <b>'+c(op.name)+'</b> is now <b>'+getStatusLabel(statusEffect.status)+'</b>.';
            }
        }
        }
    }
      }
    
    msgLocal += applyDefenderResidualDamage(battleData, battleData.o, op.name, stats2.hp);

    // Leech Seed: seeded target loses HP, and the source recovers HP (single-battle context).
    if (battleData.leechSeed && battleData.leechSeed[battleData.o] && String(battleData.leechSeed[battleData.o]) === String(battleData.c) && battleData.ohp > 0) {
      const leechDamage = Math.max(1, Math.floor(stats2.hp / 8));
      const drained = Math.min(leechDamage, battleData.ohp);
      battleData.ohp = Math.max(0, battleData.ohp - drained);
      battleData.tem2[battleData.o] = Math.max(0, battleData.tem2[battleData.o] - drained);

      const hpBefore = battleData.chp;
      battleData.chp = Math.min(stats1.hp, battleData.chp + drained);
      const healed = Math.max(0, battleData.chp - hpBefore);
      battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));

      msgLocal += '\n-> <b>'+c(op.name)+'</b> had its energy sapped by Leech Seed and lost <code>'+drained+'</code> HP.';
      if (healed > 0) {
        msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP from Leech Seed.';
      }
    }
    
    // Reveal Used Move
    if (!battleData.usedMoves) battleData.usedMoves = {};
    if (!battleData.usedMoves[battleData.c]) battleData.usedMoves[battleData.c] = [];
    if (!battleData.usedMoves[battleData.c].includes(act.id)) battleData.usedMoves[battleData.c].push(act.id);
    
    turnLogs += msgLocal;
}

await executeStandardMove(orderedActions[0]);

// Ensure second action executes correctly
if (!singleActionTurn && battleData.ohp > 0 && battleData.chp > 0) { // both must be alive
    fullSwap(battleData); // Context swap so opponent becomes Attacker
    await executeStandardMove(orderedActions[1]);
} 

// What if someone fainted?
if (battleData.chp <= 0 || battleData.ohp <= 0) {
    if (battleData.ohp <= 0 && battleData.chp > 0) {
        fullSwap(battleData); // ensure cid points to the fainted pokemon so UI logic works below
    }
} else {
    // Nobody fainted, just pick the next selector. 
    fullSwap(battleData); 
}

tickScreensForTurn(battleData);
await saveBattleData(bword, battleData);

const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)

let msg = turnLogs;

const messageData = await loadMessageData();
messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(),turn:battleData.cid,oppo:battleData.oid };
await saveMessageData(messageData);

if(battleData.chp < 1){
msg += '\n\n<b>'+c(p1.name)+'</b> has fainted. Choose your next pokemon.'
if(!battleData.set.sandbox){
await incexp(defender,p2,attacker,p1,ctx,battleData,bot)
await incexp2(attacker,p1,defender,p2,ctx,battleData,bot)
}
const av = []
const al = []
let b = 1
for(const pok in battleData.tem){
if(battleData.tem[pok] > 0){
const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
av.push({name:b,pass:pok})
al.push(pok)
}else{
av.push({name:b+' (0 HP)',pass:pok})
}
b++;
}
 if(al.length < 1){
  const gpc = Object.keys(battleData.tem).length*15
  defender.inv.pc += gpc
  if(!defender.inv.win){
defender.inv.win = 0
}
defender.inv.win += 1
  if(!attacker.inv.lose){
  attacker.inv.lose = 0
  }
  attacker.inv.lose += 1
  if(battleData.tempBattle && battleData.tempTeams){
  const t1 = battleData.tempTeams[battleData.cid] || []
  const t2 = battleData.tempTeams[battleData.oid] || []
  attacker.pokes = (attacker.pokes || []).filter(p => !t1.includes(p.pass))
  defender.pokes = (defender.pokes || []).filter(p => !t2.includes(p.pass))
  if(attacker.extra && attacker.extra.temp_battle){
  delete attacker.extra.temp_battle[bword]
  }
  if(defender.extra && defender.extra.temp_battle){
  delete defender.extra.temp_battle[bword]
  }
  }
  await saveUserData2(battleData.cid,attacker)
  await saveUserData2(battleData.oid,defender)
const messageData = await loadMessageData();
messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
delete messageData[bword];
await saveMessageData(messageData);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(p1.name)+' </b>has fainted.\n<a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a> lost against <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>.\n+'+gpc+' PokeCoins 💷',{parse_mode:'HTML'})
if(Math.random()< 0.00005){
const idr = (Math.random()<0.5) ? battleData.oid : battleData.cid
const dr = await getUserData(idr)
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+idr+'"><b>'+displayName(dr,idr)+'</b></a>, A <b>Move Tutor</b> was watching your match. He wants to <b>Teach</b> one of your <b>Pokemon</b> a <b>Move.</b>',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
const my = String(tutors[Math.floor(Math.random()*tutors.length)])
const m77 = await sendMessage(ctx,idr,'While you were <b>Battling</b> with a trainer, An expert <b>Move Tutor</b> saw your battle very interestingly. He Impressed with your <b>Battle</b> experience and strategy. He wants to <b>Teach</b> your any of <b>Pokemon</b> a move. It will be available only for next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
const mdata = await loadMessageData();
if(!mdata.tutor){
mdata.tutor = {}
}
mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
await saveMessageData(mdata)
}
}else{
const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_fainted' }));
while (buttons.length < 6) {
  buttons.push({ text: '  ', callback_data: 'empty' });
}
const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
return
}
return
}
const isGroupMmo = ctx.chat.type !== 'private';
const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpMmo.msg,{parse_mode:'HTML',reply_markup:pvpMmo.keyboard,...pvpMmo.ext})
})
bot.action(/multichanpok_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
if(!battleData.set.switch){
ctx.answerCbQuery('Switch is diabled')
return
}
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
let msg = '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
msg += '\n\n<i>Choose another pokemon for battle.</i>'
const av = []
let b = 1
let al = []
for(const pok in battleData.tem){
if(battleData.tem[pok] > 0){
const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
av.push({name:b,pass:pok})
al.push(pok)
}else{
av.push({name:b+' (0 HP)',pass:pok})
}
b++;
}
const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_change' }));
while (buttons.length < 6) {
  buttons.push({ text: '  ', callback_data: 'empty' });
}
const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
rows.push([{text:'⬅️ Back',callback_data:'multibttle_'+bword+'_'+battleData.cid+''}])
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
})
bot.action(/multibttle_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupBtl = ctx.chat.type !== 'private';
const pvpBtl = buildPvpMsg('', battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupBtl);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpBtl.msg,{parse_mode:'HTML',reply_markup:pvpBtl.keyboard,...pvpBtl.ext})
})
bot.action(/megtst_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const stone5 = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
if(ctx.from.id!=battleData.cid){
ctx.answerCbQuery('Not Your Turn')
return
}
const stone = stones[stone5]
const d2b = await getUserData(battleData.cid)
const pke = d2b.pokes.filter((pk)=>pk.pass == battleData.c)[0]
const n = pke.name
if(stone.pokemon!=pke.name){
return
}
if(!d2b.extra.megas){
d2b.extra.megas = {}
}
if(!battleData.megas){
battleData.megas = {}
}
battleData.megas[pke.pass] = pke.name
d2b.extra.megas[pke.pass] = pke.name
pke.name = stone.mega
await saveUserData2(ctx.from.id,d2b)
const pass = battleData.c
const atta = await getUserData(battleData.cid)
const deffa = await getUserData(battleData.oid)
const p12 = atta.pokes.filter((poke)=>poke.pass==pass)[0]
let msg = '<b>'+c(p12.name)+'</b> has transformed into <b>'+c(stone.mega)+'</b>'
const p22 = deffa.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base12 = pokestats[p22.name]
const base22 = pokestats[p12.name]
const level12 = plevel(p22.name,p22.exp)
const level22 = plevel(p12.name,p12.exp)
const stats12 = await Stats(base12,p22.ivs,p22.evs,c(p22.nature),level12) 
const stats22 = await Stats(base22,p12.ivs,p12.evs,c(p12.nature),level22)
msg += await applyEntryHazardsOnSwitch({
  battleData,
  sideId: battleData.cid,
  pass: pass,
  pokemonName: p12.name,
  abilityName: p12.ability,
  maxHp: stats22.hp
})
const speed12 = getSpeedWithStatus(stats12.speed, battleData, p22.pass)
const speed22 = getSpeedWithStatus(stats22.speed, battleData, p12.pass)
const result = speed12 > speed22 ? p22.pass : p12.pass
if(result in battleData.tem2){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
const dl = await getUserData(battleData.cid)
const p169 = dl.pokes.filter((poke)=>poke.pass==battleData.c)[0]
msg += '\n<b>'+c(p169.name)+'</b> <i>speed advantage allows to move first</i>'
await saveBattleData(bword, battleData);
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupMeg = ctx.chat.type !== 'private';
const pvpMeg = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMeg);
const pk = pokes[stone.mega]
let img2 = pokes[p12.name].front_default_image
const im2 = shiny.filter((poke)=>poke.name==p12.name)[0]
if(im2 && p12.symbol=='✨'){
img2=im2.shiny_url
}
await sendMessage(ctx,ctx.chat.id,img2,{caption:'*'+c(n)+'* has transformed into *'+c(pke.name)+'*.',parse_mode:'markdown',reply_to_message_id:ctx.callbackQuery.message.message_id})
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpMeg.msg,{parse_mode:'HTML',reply_markup:pvpMeg.keyboard,...pvpMeg.ext})
})

bot.action(/multidne_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const pass = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const id = ctx.callbackQuery.data.split('_')[3]
const prop = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
dbg('multidne:click', { bword, from: ctx.from.id, turnId: id, pass, prop, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, qlen: battleData.queuedActions ? battleData.queuedActions.length : 0, switchPending: battleData.switchPending ? Object.keys(battleData.switchPending) : [] });
if(battleData.tem[pass] < 1){
ctx.answerCbQuery('This Poke Is Ded')
return
}
if(battleData.c==pass){
ctx.answerCbQuery('This Poke Is Already Batteling')
return
}

if(prop == 'change'){
  if (!battleData.queuedActions) battleData.queuedActions = [];
  if (!battleData.queuedActions.some(act => String(act.cid) === String(ctx.from.id))) {
    battleData.queuedActions.push({
      cid: ctx.from.id,
      c: battleData.c,
      type: 'switch',
      pass: pass
    });
    if (!battleData.switchPending) battleData.switchPending = {};
    battleData.switchPending[String(ctx.from.id)] = { pass, c: battleData.c };
    ctx.answerCbQuery('Action locked!');
  } else {
    ctx.answerCbQuery('You already selected your action!');
    return;
  }
  dbg('multidne:queued', { bword, q: battleData.queuedActions, switchPending: battleData.switchPending ? Object.keys(battleData.switchPending) : [] });

  if (battleData.queuedActions.length < 2) {
    fullSwap(battleData);
    await saveBattleData(bword, battleData);

    const attacker = await getUserData(battleData.cid);
    const defender = await getUserData(battleData.oid);
    const p1 = attacker.pokes.filter((poke) => poke.pass == battleData.c)[0]
    const p2 = defender.pokes.filter((poke) => poke.pass == battleData.o)[0]
    const base1 = pokestats[p2.name]
    const base2 = pokestats[p1.name]
    const level1 = plevel(p2.name, p2.exp)
    const level2 = plevel(p1.name, p1.exp)
    const stats1 = await Stats(base1, p2.ivs, p2.evs, c(p2.nature), level1)
    const stats2 = await Stats(base2, p1.ivs, p1.evs, c(p1.nature), level2)

    let msg = `<b>* ${displayName(defender, battleData.oid)} has locked in an action!</b>\n`
    msg += `<b>Waiting for ${displayName(attacker, battleData.cid)} to select...</b>`

    const isGroupMmo = ctx.chat.type !== 'private';
    const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, pvpMmo.msg, { parse_mode: 'HTML', reply_markup: pvpMmo.keyboard, ...pvpMmo.ext })
    return
  }

  dbg('multidne:resolving', { bword });
  await resolveQueuedActions(ctx, battleData, bword);
  return
}

battleData.c = pass
battleData.chp = battleData.tem[pass]
const atta = await getUserData(battleData.cid)
const deffa = await getUserData(battleData.oid)
const p12 = atta.pokes.filter((poke)=>poke.pass==pass)[0]
let msg = '<b>'+c(p12.name)+'</b> came for battle'
if (prop == 'change') {
  msg = '<b>A Pokemon was switched in.</b>'
}
const p22 = deffa.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base12 = pokestats[p22.name]
const base22 = pokestats[p12.name]
const level12 = plevel(p22.name,p22.exp)
const level22 = plevel(p12.name,p12.exp)
const stats12 = await Stats(base12,p22.ivs,p22.evs,c(p22.nature),level12) 
const stats22 = await Stats(base22,p12.ivs,p12.evs,c(p12.nature),level22)
const speed12 = getSpeedWithStatus(stats12.speed, battleData, p22.pass)
const speed22 = getSpeedWithStatus(stats22.speed, battleData, p12.pass)
const result = speed12 > speed22 ? p22.pass : p12.pass
if(prop == 'fainted'){
if(result in battleData.tem2){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
const dl = await getUserData(battleData.cid)
const p169 = dl.pokes.filter((poke)=>poke.pass==battleData.c)[0]
msg += '\n<b>'+c(p169.name)+'</b> <i>speed advantage allows to move first</i>'
}
if(prop == 'change'){
battleData.switchLock = battleData.cid
battleData.queuedActions = [];
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
await saveBattleData(bword, battleData);
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupDne = ctx.chat.type !== 'private';
const pvpDne = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupDne);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpDne.msg,{parse_mode:'HTML',reply_markup:pvpDne.keyboard,...pvpDne.ext})
})

// Handler: "View Moves" shows ALL moves as a popup alert to the current player only (Showdown-style)
bot.action(/multivwmv_/,async ctx => {
const bword2 = ctx.callbackQuery.data.split('_')[1]
const turnId2 = ctx.callbackQuery.data.split('_')[2]
if (String(ctx.from.id) !== String(turnId2)) {
  ctx.answerCbQuery('❌ Not your turn!')
  return
}
let battleData2 = {};
try {
  battleData2 = loadBattleData(bword2);
} catch(e) { battleData2 = {}; }
const attacker2 = await getUserData(battleData2.cid)
const p1v = attacker2.pokes.filter((poke)=>poke.pass==battleData2.c)[0]
if (!p1v) { ctx.answerCbQuery('Battle error'); return; }
// Build move list text for the popup
let popupText = '🗡️ Your Moves:'
for (const mid of p1v.moves) {
  const mv = dmoves[mid]
  if (mv) {
    const power = mv.power ?? '?'
    const acc = mv.accuracy ?? '?'
    popupText += '\n• ' + c(mv.name) + ' [' + c(mv.type) + '] P:' + power + ' A:' + acc
  }
}
if (popupText.length > 195) popupText = popupText.substring(0, 195) + '...';
await ctx.answerCbQuery(popupText, { show_alert: true })
})

/*
// Inline action menu: show moves + escape + pokemon
bot.action(/multiact_/, async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {
  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const bword2 = ctx.callbackQuery.data.split('_')[1]
const turnId2 = ctx.callbackQuery.data.split('_')[2]
if (String(ctx.from.id) !== String(turnId2)) {
  ctx.answerCbQuery('Not your turn!');
  return
}
let battleData2 = {};
try {
  battleData2 = loadBattleData(bword2);
} catch(e) { battleData2 = {}; }
const attacker2 = await getUserData(battleData2.cid)
const defender2 = await getUserData(battleData2.oid)
const p1v = attacker2.pokes.filter((poke)=>poke.pass==battleData2.c)[0]
const p2v = defender2.pokes.filter((poke)=>poke.pass==battleData2.o)[0]
if (!p1v || !p2v) { ctx.answerCbQuery('Battle error'); return; }
const base1v = pokestats[p2v.name]
const base2v = pokestats[p1v.name]
const level1v = plevel(p2v.name,p2v.exp)
const level2v = plevel(p1v.name,p1v.exp)
const stats1v = await Stats(base1v,p2v.ivs,p2v.evs,c(p2v.nature),level1v)
const stats2v = await Stats(base2v,p1v.ivs,p1v.evs,c(p1v.nature),level2v)
const isGroupAct = ctx.chat.type !== 'private';
const pvpAct = buildPvpMsg('', battleData2, attacker2, defender2, p1v, p2v, stats1v, stats2v, bword2, isGroupAct);

const usedMoves2 = battleData2.usedMoves || {};
const p1UsedMoves2 = usedMoves2[battleData2.c] || [];
const moveButtons = p1v.moves.map((word) => {
  const isRevealed = p1UsedMoves2.includes(String(word));
  const label = (isGroupAct && !isRevealed) ? '???' : c(dmoves[word].name);
  return { text: label, callback_data: 'multimo_'+word+'_'+bword2+'_'+battleData2.cid+'' };
});
while(moveButtons.length < 4) { moveButtons.push({text:'  ',callback_data:'empty'}); }
const rows = [];
for (let i = 0; i < moveButtons.length; i += 2) { rows.push(moveButtons.slice(i,i+2)); }
rows.push([{text:'Bag',callback_data:'multybg_'+bword2+''},{text:'Escape',callback_data:'multryn_'+bword2+'_multi'}]);
rows.push([{text:'Pokemon',callback_data:'multichanpok_'+bword2+'_'+battleData2.cid+''}]);
rows.push([{text:'⬅️ Back',callback_data:'multibttle_'+bword2+'_'+battleData2.cid+''}]);

await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpAct.msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows},...pvpAct.ext})
})
*/
}

module.exports = registerBattleCallbacks;










