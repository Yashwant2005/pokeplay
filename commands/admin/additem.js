function toKey(value) {
  return String(value || '').trim().toLowerCase();
}

function parsePositiveInt(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function parseNameAndAmount(tokens) {
  const arr = (tokens || []).map((x) => String(x || '').trim()).filter(Boolean);
  if (!arr.length) return { name: '', amount: 1 };
  const last = arr[arr.length - 1];
  if (/^\d+$/.test(last)) {
    return {
      name: arr.slice(0, -1).join(' ').trim(),
      amount: parsePositiveInt(last, 1)
    };
  }
  return { name: arr.join(' ').trim(), amount: 1 };
}

function registerAddItemCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { HELD_ITEM_POOL, normalizeHeldItemShopName } = require('../../utils/held_item_shop');

  const MINT_POOL = [
    'adamant mint',
    'modest mint',
    'jolly mint',
    'timid mint',
    'bold mint',
    'calm mint',
    'careful mint',
    'impish mint',
    'brave mint',
    'quiet mint',
    'relaxed mint',
    'sassy mint'
  ];

  const POKEBALL_POOL = [
    'regular',
    'great',
    'ultra',
    'repeat',
    'safari',
    'premier',
    'net',
    'nest',
    'luxury',
    'quick',
    'park',
    'beast',
    'level',
    'moon',
    'sport',
    'origin',
    'master'
  ];

  bot.command('additem', async (ctx) => {
    if (!admins.includes(ctx.from.id)) return;

    const reply = ctx.message.reply_to_message;
    if (!reply || !reply.from || !reply.from.id) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Reply to a user and use:*\n/additem <item> <value...> [amount]');
      return;
    }

    const args = String(ctx.message.text || '').split(' ').slice(1);
    const item = toKey(args[0]);

    if (!item) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n/additem pc 1000\n/additem lp 500\n/additem ht 20\n/additem battlebox 5\n/additem daycarecandy 3\n/additem tm 44 2\n/additem tm any 3\n/additem stone charizardite-x 1\n/additem stone any 2\n/additem mint jolly mint 2\n/additem mint any 5\n/additem ball master 1\n/additem ball any 3\n/additem held light-ball 1\n/additem held eviolite 1\n/additem held power-herb 1\n/additem held big-root 1\n/additem held clear-amulet 1\n/additem held rocky-helmet 1\n/additem held tatsugiri-lunchbox 1\n/additem held air-balloon 1\n/additem held focus-sash 1\n/additem held life-orb 1\n/additem held leftovers 1\n/additem held heat-rock 1\n/additem held damp-rock 1\n/additem held weakness-policy 1\n/additem held blunder-policy 1\n/additem held assault-vest 1\n/additem held choice-band 1\n/additem held choice-specs 1\n/additem held choice-scarf 1\n/additem held booster-energy 1\n/additem abilitycapsule 1\n/additem abilitypatch 1\n/additem bottlecap 2\n/additem goldbottlecap 1');
      return;
    }

    const targetId = reply.from.id;
    const data = await getUserData(targetId);

    if (!data.inv || typeof data.inv !== 'object') data.inv = {};
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {};
    if (!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {};
    if (!Number.isFinite(data.extra.itembox.abilityCapsules)) data.extra.itembox.abilityCapsules = 0;
    if (!Number.isFinite(data.extra.itembox.abilityPatches)) data.extra.itembox.abilityPatches = 0;
    if (!Array.isArray(data.inv.stones)) data.inv.stones = [];
    if (!data.tms || typeof data.tms !== 'object') data.tms = {};

    let result = '';

    if (['pc', 'pokecoin', 'pokecoins', 'coin', 'coins'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
      data.inv.pc += amount;
      result = 'Added *' + amount + '* PokeCoins ðŸ’·';
    } else if (['lp', 'leaguepoint', 'leaguepoints', 'league_points'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
      data.inv.league_points += amount;
      result = 'Added *' + amount + '* League Points â­';
    } else if (['ht', 'holowear', 'holowear_ticket', 'holowear_tickets', 'ticket', 'tickets'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.holowear_tickets)) data.inv.holowear_tickets = 0;
      data.inv.holowear_tickets += amount;
      result = 'Added *' + amount + '* Holowear Tickets ðŸŽŸï¸';
    } else if (['battlebox', 'battleboxes', 'battle_box', 'battle_boxes', 'box', 'boxes'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.battle_boxes)) data.inv.battle_boxes = 0;
      data.inv.battle_boxes += amount;
      result = 'Added *' + amount + '* Battle Box ðŸŽ';
    } else if (['daycarecandy', 'daycare_candy', 'daycare-candy', 'dccandy', 'dcandy'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.daycare_candy)) data.inv.daycare_candy = 0;
      data.inv.daycare_candy += amount;
      result = 'Added *' + amount + '* Daycare Candy';
    } else if (['vp'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.vp)) data.inv.vp = 0;
      data.inv.vp += amount;
      result = 'Added *' + amount + '* VP â­';
    } else if (['tm', 'tms'].includes(item)) {
      const tmRaw = toKey(args[1]);
      const amount = parsePositiveInt(args[2], 1);
      const tmPool = Object.keys(tms.tmnumber || {});
      if (!tmRaw) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /additem tm <tm_no|any> [amount]');
        return;
      }
      for (let i = 0; i < amount; i += 1) {
        let tmNo = tmRaw;
        if (tmNo === 'any') tmNo = tmPool[Math.floor(Math.random() * tmPool.length)];
        if (!tms.tmnumber[String(tmNo)]) {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid TM:* ' + c(tmNo));
          return;
        }
        if (!Number.isFinite(data.tms[String(tmNo)])) data.tms[String(tmNo)] = 0;
        data.tms[String(tmNo)] += 1;
      }
      result = 'Added *' + amount + '* TM item(s).';
    } else if (['stone', 'stones', 'mega', 'megastone', 'mega-stone'].includes(item)) {
      const parsed = parseNameAndAmount(args.slice(1));
      const stoneRaw = toKey(parsed.name).replace(/\s+/g, '-');
      const amount = parsed.amount;
      const stonePool = Object.keys(stones || {});
      if (!stoneRaw) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /additem stone <stone_name|any> [amount]');
        return;
      }
      for (let i = 0; i < amount; i += 1) {
        let stoneName = stoneRaw;
        if (stoneName === 'any') stoneName = stonePool[Math.floor(Math.random() * stonePool.length)];
        if (!stones[stoneName]) {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid stone:* ' + c(stoneName));
          return;
        }
        data.inv.stones.push(stoneName);
      }
      result = 'Added *' + amount + '* Mega Stone item(s).';
    } else if (['mint', 'mints', 'naturemint', 'nature-mint', 'nature_mint'].includes(item)) {
      const parsed = parseNameAndAmount(args.slice(1));
      const mintRaw = toKey(parsed.name).replace(/\s+/g, ' ').trim();
      const amount = parsed.amount;
      if (!mintRaw) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /additem mint <mint_name|any> [amount]');
        return;
      }

      for (let i = 0; i < amount; i += 1) {
        let mintName = mintRaw;
        if (mintName === 'any') {
          mintName = MINT_POOL[Math.floor(Math.random() * MINT_POOL.length)];
        }
        if (!MINT_POOL.includes(mintName)) {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid mint:* ' + c(mintName));
          return;
        }
        if (!Number.isFinite(data.extra.itembox.mints[mintName])) data.extra.itembox.mints[mintName] = 0;
        data.extra.itembox.mints[mintName] += 1;
      }
      result = 'Added *' + amount + '* Nature Mint item(s).';
    } else if (['held', 'helditem', 'held-item', 'held_item', 'helditems', 'held-items', 'held_items'].includes(item)) {
      const parsed = parseNameAndAmount(args.slice(1));
      const heldRaw = normalizeHeldItemShopName(parsed.name);
      const amount = parsed.amount;
      if (!heldRaw) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /additem held <item_name|any> [amount]');
        return;
      }

      for (let i = 0; i < amount; i += 1) {
        let heldName = heldRaw;
        if (heldName === 'any') {
          heldName = HELD_ITEM_POOL[Math.floor(Math.random() * HELD_ITEM_POOL.length)];
        }
        if (!HELD_ITEM_POOL.includes(heldName)) {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid held item:* ' + c(heldName.replace(/-/g, ' ')));
          return;
        }
        if (!Number.isFinite(data.extra.itembox.heldItems[heldName])) data.extra.itembox.heldItems[heldName] = 0;
        data.extra.itembox.heldItems[heldName] += 1;
      }
      result = 'Added *' + amount + '* Held Item(s).';
    } else if (['bottlecap', 'bottle-cap', 'bcap'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.extra.itembox.bottleCaps)) data.extra.itembox.bottleCaps = 0;
      data.extra.itembox.bottleCaps += amount;
      result = 'Added *' + amount + '* Bottle Cap(s).';
    } else if (['abilitycapsule', 'ability-capsule', 'ability_capsule', 'capsule'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      data.extra.itembox.abilityCapsules += amount;
      result = 'Added *' + amount + '* Ability Capsule(s).';
    } else if (['abilitypatch', 'ability-patch', 'ability_patch', 'patch'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      data.extra.itembox.abilityPatches += amount;
      result = 'Added *' + amount + '* Ability Patch(es).';
    } else if (['goldbottlecap', 'gold-bottle-cap', 'gbcap'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.extra.itembox.goldBottleCaps)) data.extra.itembox.goldBottleCaps = 0;
      data.extra.itembox.goldBottleCaps += amount;
      result = 'Added *' + amount + '* Gold Bottle Cap(s).';
    } else if (['ball', 'balls', 'pokeball', 'pokeballs'].includes(item)) {
      const parsed = parseNameAndAmount(args.slice(1));
      const ballRaw = toKey(parsed.name);
      const amount = parsed.amount;
      if (!ballRaw) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /additem ball <ball_name|any> [amount]');
        return;
      }
      if (!Array.isArray(data.inv.balls)) data.inv.balls = [];

      for (let i = 0; i < amount; i += 1) {
        let ballName = ballRaw;
        if (ballName === 'any') {
          ballName = POKEBALL_POOL[Math.floor(Math.random() * POKEBALL_POOL.length)];
        }
        if (!POKEBALL_POOL.includes(ballName)) {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid ball:* ' + c(ballName));
          return;
        }
        data.inv.balls.push(ballName);
      }
      result = 'Added *' + amount + '* PokÃ©ball(s).';
    } else {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Unknown item type.*\nTry: pc, lp, ht, battlebox, daycarecandy, vp, tm, stone, mint, held, ball, abilitycapsule, abilitypatch, bottlecap, goldbottlecap');
      return;
    }

    await saveUserData2(targetId, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, result + '\nTarget: *' + c(reply.from.first_name || String(targetId)) + '*');
  });
}

module.exports = registerAddItemCommand;

