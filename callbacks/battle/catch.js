const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
const { applyEntryAbility, getAirBalloonInfo, getDisplayedWeatherState, getWeatherDisplayName, setBattleWeatherNegationState } = require('../../utils/battle_abilities');
const { syncBattleFormAndAbility } = require('../../utils/battle_forms');
const { activateImpersonateForPass, getBattleBaseStats } = require('../../utils/battle_impersonate');
const { ARCEUS_PLATES } = require('../../utils/held_item_shop');
const { getSanitizedHeldItemForPokemon } = require('../../utils/pokemon_item_rules');

function register_011_catch(bot, deps) {
  const { session, getUserData, saveUserData2, sendMessage, loadMessageData, loadMessageDataFresh, loadBattleData, saveBattleData, spawn, pokes, pokemoves, dmoves, word, getRandomNature, generateRandomIVs, c, he, safari, checkseen, pokestats, plevel, Stats, battlec, emojis, saveMessageData, Bar } = deps;
  const getWildHeldItem = (pokemonName) => {
    const key = String(pokemonName || '').toLowerCase();
    if (key === 'arceus' && Math.random() < 0.2) {
      const plate = ARCEUS_PLATES[Math.floor(Math.random() * ARCEUS_PLATES.length)];
      return plate ? plate.item : 'none';
    }
    if (key === 'pikachu' && Math.random() < 0.05) return 'light-ball';
    return 'none';
  };
  bot.action(/catch_/, async ctx => {
    const now = Date.now();
    const chatKey = ctx.chat && ctx.chat.id;
    const userId = ctx.from && ctx.from.id;
    const userKey = 'u_' + String(userId);
    const chatLimited = chatKey !== undefined && battlec[chatKey] && now - battlec[chatKey] < 2000;
    const userLimited = userId !== undefined && battlec[userKey] && now - battlec[userKey] < 2000;
    if (chatLimited || userLimited) {
      await ctx.answerCbQuery('On cooldown 2 sec');
      return;
    }
    if (chatKey !== undefined) battlec[chatKey] = now;
    if (userId !== undefined) battlec[userKey] = now;

    const name = ctx.callbackQuery.data.split('_')[1];
    const data56 = await getUserData(ctx.from.id);
    await checkseen(ctx, name);
    const currentMessageId = ctx.callbackQuery && ctx.callbackQuery.message ? ctx.callbackQuery.message.message_id : null;
    const chatId =
      (ctx.chat && ctx.chat.id)
      || (ctx.callbackQuery && ctx.callbackQuery.message && ctx.callbackQuery.message.chat && ctx.callbackQuery.message.chat.id)
      || null;
    const sessionName = ctx.session ? ctx.session.name : null;
    if (!sessionName || String(sessionName) !== String(currentMessageId)) {
      let mdataCheck = await loadMessageData();
      const entry = chatId !== null ? mdataCheck[chatId] : null;
      const match = entry && String(entry.id) === String(ctx.from.id) && String(entry.mid) === String(currentMessageId);
      if (!match && typeof loadMessageDataFresh === 'function') {
        mdataCheck = await loadMessageDataFresh();
        const freshEntry = chatId !== null ? mdataCheck[chatId] : null;
        if (freshEntry && String(freshEntry.id) === String(ctx.from.id) && String(freshEntry.mid) === String(currentMessageId)) {
          ctx.session.name = currentMessageId;
        } else {
          ctx.answerCbQuery('' + c(name) + ' Has been fled');
          return;
        }
      } else if (match) {
        ctx.session.name = currentMessageId;
      } else {
        ctx.answerCbQuery('' + c(name) + ' Has been fled');
        return;
      }
    }
    const mdata = await loadMessageDataFresh();
    if (Array.isArray(mdata.battle) && mdata.battle.some((id) => String(id) === String(ctx.from.id))) {
      ctx.answerCbQuery('You Are In A Battle');
      return;
    }

    const level = ctx.callbackQuery.data.split('_')[2] * 1;
    const f = ctx.callbackQuery.data.split('_')[3];
    const org = ctx.callbackQuery.data.split('_')[4];
    let msg = '<b>âœ¦ The Pokomon battle commences!</b>';
    const op = pokes[name];
    const data = await getUserData(ctx.from.id);
    if (!data || !Array.isArray(data.pokes)) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*');
      return;
    }
    if (!data.inv || typeof data.inv !== 'object') data.inv = {};
    if (!data.inv.team) data.inv.team = '1';
    if (!data.teams || typeof data.teams !== 'object') data.teams = {};
    if (!Array.isArray(data.teams[data.inv.team])) data.teams[data.inv.team] = [];
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.balls || typeof data.balls !== 'object') data.balls = {};
    if (!op || !spawn[name]) {
      ctx.answerCbQuery('This Pokemon data is missing. Try /hunt again.');
      return;
    }
    const ownedPasses = new Set((data.pokes || []).map((poke) => String(poke && poke.pass)));
    const cleanedTeam = [...new Set((data.teams[data.inv.team] || []).map((p) => String(p)))].filter((p) => ownedPasses.has(p));
    if (cleanedTeam.length !== data.teams[data.inv.team].length) {
      data.teams[data.inv.team] = cleanedTeam;
      await saveUserData2(ctx.from.id, data);
    }
    if (cleanedTeam.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, ' Add Some *Pokes* In Main Team.');
      return;
    }
    const ss = cleanedTeam[0];
    const p = data.pokes.find((poke) => String(poke.pass) === String(ss));
    if (!p) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, ' Add Some *Pokes* In Main Team.');
      return;
    }
    const p2 = pokes[p.name];
    if (!p2) {
      ctx.answerCbQuery('Your Pokemon data is missing. Use /reset_battle.');
      return;
    }
    k = 0;
    if (spawn[name].toLowerCase() == 'legendry' || spawn[name].toLowerCase() == 'legendary') {
      k = 15;
    }
    let iv = await generateRandomIVs(spawn[name].toLowerCase());

    const bword = word(10);
    let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
    const ev = {
      hp: 0,
      attack: 0,
      defense: 0,
      special_attack: 0,
      special_defense: 0,
      speed: 0
    };
    const nat = getRandomNature();
    const playerImpersonateTarget = activateImpersonateForPass({ battleData, pass: p.pass, pokemonName: p.name, abilityName: p.ability });
    const base = pokestats[name];
    const base2 = getBattleBaseStats({ battleData, pass: p.pass, pokemonName: p.name, abilityName: p.ability, pokestats });
    if (!base || !base2) {
      ctx.answerCbQuery('Pokemon stats are missing. Try /hunt again.');
      return;
    }
    const uname = he.encode(ctx.from.first_name);
    const stats2 = await Stats(base, iv, ev, c(nat), level);
    const hp2 = stats2.hp;
    const clevel = plevel(p.name, p.exp);
    const stats = await Stats(base2, p.ivs, p.evs, c(p.nature), clevel);
    const hp = stats.hp;
    const moves5 = pokemoves[name];
    let moves2 = [];
    if (moves5 && Array.isArray(moves5.moves_info)) {
      moves2 = moves5.moves_info.filter((move) => move.learn_method == 'level-up' && move.level_learned_at < level && dmoves[move.id] && dmoves[move.id].power && dmoves[move.id].accuracy);
    }
    if (moves2.length < 1) {
      const fallback = Object.keys(dmoves || {})
        .map((id) => Number(id))
        .filter((id) => {
          const mv = dmoves[id];
          return mv && mv.category !== 'status' && Number(mv.power) > 0 && Number(mv.accuracy) > 0;
        });
      const pick = [];
      while (pick.length < 4 && fallback.length > 0) {
        const idx = Math.floor(Math.random() * fallback.length);
        pick.push({ id: fallback.splice(idx, 1)[0] });
      }
      moves2 = pick;
    }
    const am = Math.min(Math.max(moves2.length, 1), 4);
    const omoves = moves2.slice(-am);

    msg += '\n\n<b>wild</b> ' + c(name) + ' [' + c(op.types.join(' / ')) + ']';
    msg += '\n<b>Level :</b> ' + level + ' | <b>HP :</b> ' + hp2 + '/' + hp2 + '';
    msg += '\n<code>' + Bar(hp2, hp2) + '</code>';
    msg += '\n\n<b>Turn :</b> <code>' + uname + '</code>';
    msg += '\n<b>' + c(p.name) + '</b> [' + c(p2.types.join(' / ')) + ']';
    msg += '\n<b>Level :</b> ' + clevel + ' | <b>HP :</b> ' + hp + '/' + hp + '';
    msg += '\n<code>' + Bar(hp, hp) + '</code>';
    msg += '\n\n<b>Moves :</b>';
    const moves = [];
    for (const move2 of p.moves) {
      const move = dmoves[move2];
      if (!move) continue;
      msg += '\n• <b>' + c(move.name) + '</b> [' + c(move.type) + ' ' + emojis[move.type] + ']\n<b>Power:</b> ' + move.power + '<b>, Accuracy:</b> ' + move.accuracy + ' (' + c(move.category.charAt(0)) + ')';
      moves.push('' + move2 + '');
    }
    if (moves.length < 1) {
      ctx.answerCbQuery('Your move data is missing. Use /reset_battle.');
      return;
    }
    const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'atk_' + word + '_' + bword + '' }));
    while (buttons.length < 4) {
      buttons.push({ text: '  ', callback_data: 'empty' });
    }
    const rows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }
    const key2 = [{ text: 'Bag', callback_data: 'bag_' + bword + '' }, { text: 'Escape', callback_data: 'run_' + bword + '' }, { text: 'Pokemon', callback_data: 'pokemon_' + bword + '' }];
    rows.push(key2);
    const keyboard = {
      inline_keyboard: rows, key2
    };
    syncBattleFormAndAbility({ battleData, pokemon: p, pass: p.pass, pokestats });
    const cp = word(8);
    battleData.opass = word(8);
    battleData.c = p.pass;
    battleData.org = org;
    battleData.chp = hp;
    battleData.ochp = hp2;
    battleData.ohp = hp2;
    battleData.ivs = iv;
    battleData.evs = ev;
    battleData.nat = nat;
    battleData.cpass = cp;
    battleData.level = level;
    battleData.name = name;
    battleData.oheld_item = getWildHeldItem(name);
    battleData.oability = getRandomAbilityForPokemon(name, pokes);
    battleData.omoves = omoves;
    battleData.ded = [];
    battleData.ot = {};
    battleData.ot[battleData.name] = battleData.ohp;
    battleData.symbol = '';
    if (omoves.length < 1) {
      ctx.answerCbQuery('Unable To Catch This Poke, Admins Trying To Fix It. Till Please Hunt Another Pokemon', { show_alert: true });
      return;
    }
    if (f && f == 'ðŸª…') {
      battleData.symbol = 'ðŸª…';
    }
    if (f && f == 'âœ¨') {
      battleData.symbol = 'âœ¨';
    }
    var la = {};
    var tem = {};
    const heldItems = {};
    for (const teamPass of data.teams[data.inv.team]) {
      const pk = data.pokes.filter((poke) => poke.pass == teamPass);
      if (pk && pk[0]) {
        const partyBase = getBattleBaseStats({ battleData, pass: pk[0].pass, pokemonName: pk[0].name, abilityName: pk[0].ability, pokestats });
        const partyLevel = plevel(pk[0].name, pk[0].exp);
        if(!partyBase){
          continue;
        }
        const partyStats = await Stats(partyBase, pk[0].ivs, pk[0].evs, c(pk[0].nature), partyLevel);
        la[pk[0].pass] = partyLevel;
        tem[pk[0].pass] = partyStats.hp;
        heldItems[pk[0].pass] = getSanitizedHeldItemForPokemon(pk[0], pk[0].held_item);
      }
    }
    battleData.team = tem;
    battleData.la = la;
    battleData.heldItems = heldItems;
    battleData.heldItems[battleData.opass] = battleData.oheld_item || 'none';
    const playerEntry = applyEntryAbility({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: p.ability,
      heldItem: p.held_item,
      selfStats: stats,
      opponentStats: stats2,
      opponentPass: battleData.opass,
      opponentName: name,
      opponentAbility: battleData.oability,
      partyHpMap: battleData.team,
      c
    });
    const wildEntry = applyEntryAbility({
      battleData,
      pass: battleData.opass,
      pokemonName: name,
      abilityName: battleData.oability,
      heldItem: battleData.oheld_item,
      selfStats: stats2,
      opponentStats: stats,
      opponentPass: p.pass,
      opponentName: p.name,
      opponentAbility: p.ability,
      partyHpMap: battleData.ot,
      c
    });
    if (getAirBalloonInfo({ battleData, pass: p.pass, heldItem: p.held_item }).active) {
      msg += '\n\n-> <b>' + c(p.name) + '</b>\'s <b>Air Balloon</b> is floating it above the ground!';
    }
    if (playerImpersonateTarget) {
      msg += '\n-> <b>' + c(p.name) + '</b>\'s <b>Impersonate</b> copied <b>' + c(playerImpersonateTarget) + '</b>!';
    }
    if (getAirBalloonInfo({ battleData, pass: battleData.opass, heldItem: battleData.oheld_item }).active) {
      msg += '\n-> <b>' + c(name) + '</b>\'s <b>Air Balloon</b> is floating it above the ground!';
    }
    msg += playerEntry.message + wildEntry.message;
    msg += setBattleWeatherNegationState({
      battleData,
      activeAbilities: [p.ability, battleData.oability]
    }).message;
    const weatherState = getDisplayedWeatherState(battleData);
    if (weatherState.weather) {
      msg += '\n-> <b>Weather:</b> ' + getWeatherDisplayName(weatherState.weather);
      if ((battleData.weatherTurns || 0) > 0) {
        msg += ' (' + battleData.weatherTurns + ' turns left)';
      }
      if (weatherState.negated) {
        msg += ' <i>(effects negated)</i>';
      }
    }
    await saveBattleData(bword, battleData);
    ctx.session.name = '';
    let mg;
    if (data.balls.safari && data.balls.safari > 0) {
      mg = await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, '<b>wild</b> ' + c(name) + ' [' + c(op.types.join(' / ')) + '] - <b>Level :</b> ' + level + '\n\n<b>Safari Balls:</b> ' + data.balls.safari + '', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Use Safari Ball', callback_data: 'ball_safari_' + bword + '' },
          { text: 'Escape', callback_data: 'run_' + bword + '' }]]
        }
      });
    } else {
      mg = await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, msg, { reply_markup: keyboard });
    }
    const messageData = await loadMessageDataFresh();
    data.extra.hunting = true;
    await saveUserData2(ctx.from.id, data);
    const _battleUserId = String(ctx.from.id);
    if (!messageData.battle.map(String).includes(_battleUserId)) {
      messageData.battle.push(_battleUserId);
    }
    if (!messageData._battleTimestamps) messageData._battleTimestamps = {};
    messageData._battleTimestamps[_battleUserId] = Date.now();
    messageData[ctx.chat.id] = { mid: mg, timestamp: Date.now(), id: ctx.from.id, kind: 'wild_battle' };
    await saveMessageData(messageData);
  });
}

module.exports = register_011_catch;
