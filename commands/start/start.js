function registerStartCommand(bot, deps) {
  const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
  const {
    getUserData,
    commands,
    sendMessage,
    regions,
    trainerlevel,
    saveUserData2,
    tms,
    stones,
    spawn,
    forms,
    lvls,
    pokes,
    pokemoves,
    dmoves,
    growth_rates,
    chart,
    stat,
    word,
    getRandomNature,
    saveUserData22,
    generateRandomIVs,
    c,
    he
  } = deps;

  bot.command("start", async (ctx) => {
    const data = await getUserData(ctx.from.id);
    const value = ctx.message.text.split(" ")[1];
    const [name] = ctx.payload ? [ctx.payload.split("-")[0]] : "b";
    const command = commands.get(name);
    if (command) {
      ctx.message.text = ctx.message.text.replace("/start ", "").replace(/-/g, " ");
      command(ctx);
      return;
    }

    const ref = value && value.startsWith("ref") ? value.split("_")[1] : "";

    if (!data.pokes) {
      const key = [[]];
      for (let i = 0; i < regions.length; i++) {
        if (i % 4 === 0) key.push([]);
        key[key.length - 1].push({ text: regions[i], callback_data: "staut_" + regions[i] + "_" + ref });
      }
      if (ctx.chat.type != "private") {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "*Message me in private *", {
          reply_to_message_id: ctx.message.message_id,
          reply_markup: { inline_keyboard: [[{ text: "Go", url: "t.me/" + bot.botInfo.username + "?start=start" }]] }
        });
        return;
      }
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "*From Which Region You Wanna Start Your Journey?*", {
        reply_markup: { inline_keyboard: key }
      });
      return;
      const { toBaseIdentifier } = require('../../utils/base_form_pokemon');
    }

    if (value && value.startsWith("ref")) {
      const matchingLevels = Object.keys(trainerlevel).filter((level) => data.inv.exp >= trainerlevel[level]);
      const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
      const id = parseInt(value.split("_")[1]);
      if (id == ctx.from.id) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "You cant refer *Yourself*");
        return;
      }
      if (data.extra && (data.extra.pending || data.extra.referred) && ctx.from.id != 1072659486) {
        const ids = data.extra.pending || data.extra.referred;
        const data5 = await getUserData(ids);
        await sendMessage(ctx, ctx.chat.id, { parse_mode: "HTML" }, "You have been already <b>Referred</b> by <b>" + data5.inv.name + "</b>");
        return;
      }
      if (level * 1 < 20) {
        const data2 = await getUserData(id);
        if (!data2.extra.refer) data2.extra.refer = [];
        data2.extra.refer.push(ctx.from.id);
        data.extra.pending = id;
        await saveUserData2(ctx.from.id, data);
        await saveUserData2(id, data2);
        await sendMessage(ctx, -1003069884900, "#refer\n\n<b>" + he.encode(ctx.from.first_name) + "</b> (<code>" + ctx.from.id + "</code>) has used <b>" + data2.inv.name + "</b> (<code>" + id + "</code>) refer link.", { parse_mode: "html" });
        await sendMessage(ctx, ctx.chat.id, { parse_mode: "HTML" }, "You Have Been Successfully Referred By <b>" + data2.inv.name + "</b>\nReach Level <b>20</b> To Complete Your Refer");
        await sendMessage(ctx, id, "<b>" + he.encode(ctx.from.first_name) + "</b> has used your refer link.\nYou will get reward when user reaches <b>Level 20</b>", { parse_mode: "HTML" });
        return;
      }

      const userData2 = await getUserData(id);
      if (!userData2.extra.refer) userData2.extra.refer = [];
      if (!userData2.refers) userData2.refers = 0;
      userData2.refers += 1;
      userData2.extra.refer.push(ctx.from.id);
      data.inv.pc += 1000;
      data.extra.referred = id;
      await sendMessage(ctx, ctx.chat.id, { parse_mode: "HTML" }, "You have successfully referred by <b>" + userData2.inv.name + "\n+ 1k PC 💷</b>");

      let msg = "<b>" + ctx.from.first_name + "</b> has used your refer link.";
      userData2.inv.pc += 500;
      msg += "\n<b>+500</b> PokeCoins 💷";

      if (userData2.refers % 3 === 0) {
        const ballTypes = ["level", "friend", "moon", "sport", "net", "nest", "luxury", "premier", "quick", "park", "beast"];
        for (let i = ballTypes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ballTypes[i], ballTypes[j]] = [ballTypes[j], ballTypes[i]];
        }
        const numTypesToAdd = Math.floor(Math.random() * 2) + 2;
        const selectedTypes = ballTypes.slice(0, numTypesToAdd);
        selectedTypes.forEach((type) => {
          const randomAmount = Math.floor(Math.random() * 5) + 1;
          userData2.balls[type] = (userData2.balls[type] || 0) + randomAmount;
          msg += `\n<b>+${randomAmount}</b> ${c(type)} Balls`;
        });
      }
      if (userData2.refers % 8 === 0) {
        const n5 = Object.keys(tms.tmnumber);
        const num = n5[Math.floor(Math.random() * n5.length)];
        if (!userData2.tms) userData2.tms = {};
        if (!userData2.tms[String(num)]) userData2.tms[String(num)] = 0;
        userData2.tms[String(num)] += 1;
        userData2.inv.pc += 1000;
        if (!userData2.inv.pass) userData2.inv.pass = 0;
        userData2.inv.pass += 1;
        msg += "\n<b>+1</b> TM" + num + " ⚙\n<b>+1</b> Safari Pass\n<b>+1000</b> PokeCoins 💷";
      }
      if (userData2.refers % 13 === 0) {
        const n5 = Object.keys(tms.tmnumber);
        const nums = [n5[Math.floor(Math.random() * n5.length)], n5[Math.floor(Math.random() * n5.length)], n5[Math.floor(Math.random() * n5.length)]];
        if (!userData2.tms) userData2.tms = {};
        for (const num of nums) {
          if (!userData2.tms[String(num)]) userData2.tms[String(num)] = 0;
          userData2.tms[String(num)] += 1;
        }
        userData2.inv.pc += 3000;
        if (!userData2.inv.pass) userData2.inv.pass = 0;
        userData2.inv.pass += 1;
        msg += "\n<b>+1</b> TM" + nums[0] + " ⚙\n<b>+1</b> TM" + nums[1] + " ⚙\n<b>+1</b> TM" + nums[2] + " ⚙\n<b>+1</b> Safari Pass\n<b>+3000</b> PokeCoins 💷";
      }

      if (userData2.refers % 22 === 0) {
        if (!userData2.balls.master) userData2.balls.master = 0;
        userData2.balls.master += 1;
        const st = Object.keys(stones);
        const stone = st[Math.floor(Math.random() * st.length)];
        if (!userData2.inv.stones) userData2.inv.stones = [];
        userData2.inv.stones.push(stone);
        const ar = ["legendary", "legendry"];
        const list = Object.keys(spawn).filter((pk) => ar.includes(spawn[pk].toLowerCase()) && forms[pk]);
        const name5 = list[Math.floor(Math.random() * list.length)];
        const nut = ["gmax", "mega", "origin", "primal"];
        const fr = forms[name5].filter((pk) => !nut.some((pk2) => pk.identifier.includes(pk2)) && ar.includes(spawn[pk.identifier].toLowerCase()));
        const nam = fr[Math.floor(Math.random() * fr.length)].identifier;
        const ul = lvls[nam];
        const m = Math.max(ul.split("-")[0] * 1, 5);
        const m2 = ul.split("-")[1] * 1;
        const level2 = Math.floor(Math.random() * (m2 - m)) + m;
        const pokeName = nam.toLowerCase();
        const poked = pokes[pokeName];
        if (poked) {
          const moves = pokemoves[pokeName];
          if (moves) {
            const moves2 = moves.moves_info.filter((move) => move.learn_method == "level-up" && move.level_learned_at > 0 && move.level_learned_at <= level2 && dmoves[move.id].power && dmoves[move.id].accuracy);
            const am = Math.min(Math.max(moves2.length, 1), 4);
            const omoves = moves2.slice(-am);
            const ms = omoves.map((mv) => mv.id);
            const iv = await generateRandomIVs(spawn[pokeName].toLowerCase());
            const ev = { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 };
            const pass2 = word(8);
            const nat = getRandomNature();
            const g = growth_rates[pokeName];
            const exp = chart[g.growth_rate][level2];
            const da = { name: pokeName, id: poked.pokedex_number, nature: nat, ability: getRandomAbilityForPokemon(pokeName, pokes), exp: exp, pass: pass2, ivs: iv, symbol: "", evs: ev, moves: ms };
            if (!userData2.pokes) userData2.pokes = [];
            userData2.pokes.push(da);
          }
        }
        msg += "\n<b>+1</b> Master Ball\n<b>+1</b> " + c(stone) + "\n<b>+1</b> " + c(nam);
      }

      await sendMessage(ctx, -1003069884900, "#refer\n\n<b>" + he.encode(ctx.from.first_name) + "</b> (<code>" + ctx.from.id + "</code>) has reached level 20 and <b>" + userData2.inv.name + "</b> (<code>" + id + "</code>) received :-.\n\n" + msg, { parse_mode: "html" });
      await sendMessage(ctx, id, msg, { parse_mode: "HTML" });
      await saveUserData2(id, userData2);
            let nam = fr[Math.floor(Math.random() * fr.length)].identifier;
            nam = toBaseIdentifier(nam, forms);
      return;
    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: "markdown" }, "*You Have Already Started Your Journey*", { reply_to_message_id: ctx.message.message_id });
  });
}

module.exports = registerStartCommand;

