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
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:*\n/additem pc 1000\n/additem lp 500\n/additem ht 20\n/additem tm 44 2\n/additem tm any 3\n/additem stone charizardite-x 1\n/additem stone any 2\n/additem mint jolly mint 2\n/additem mint any 5');
      return;
    }

    const targetId = reply.from.id;
    const data = await getUserData(targetId);

    if (!data.inv || typeof data.inv !== 'object') data.inv = {};
    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {};
    if (!data.extra.itembox.mints || typeof data.extra.itembox.mints !== 'object') data.extra.itembox.mints = {};
    if (!Array.isArray(data.inv.stones)) data.inv.stones = [];
    if (!data.tms || typeof data.tms !== 'object') data.tms = {};

    let result = '';

    if (['pc', 'pokecoin', 'pokecoins', 'coin', 'coins'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.pc)) data.inv.pc = 0;
      data.inv.pc += amount;
      result = 'Added *' + amount + '* PokeCoins 💷';
    } else if (['lp', 'leaguepoint', 'leaguepoints', 'league_points'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0;
      data.inv.league_points += amount;
      result = 'Added *' + amount + '* League Points ⭐';
    } else if (['ht', 'holowear', 'holowear_ticket', 'holowear_tickets', 'ticket', 'tickets'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.holowear_tickets)) data.inv.holowear_tickets = 0;
      data.inv.holowear_tickets += amount;
      result = 'Added *' + amount + '* Holowear Tickets 🎟️';
    } else if (['vp'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.inv.vp)) data.inv.vp = 0;
      data.inv.vp += amount;
      result = 'Added *' + amount + '* VP ⭐';
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
    } else if (['bottlecap', 'bottle-cap', 'bcap'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.extra.itembox.bottleCaps)) data.extra.itembox.bottleCaps = 0;
      data.extra.itembox.bottleCaps += amount;
      result = 'Added *' + amount + '* Bottle Cap(s).';
    } else if (['goldbottlecap', 'gold-bottle-cap', 'gbcap'].includes(item)) {
      const amount = parsePositiveInt(args[1], 1);
      if (!Number.isFinite(data.extra.itembox.goldBottleCaps)) data.extra.itembox.goldBottleCaps = 0;
      data.extra.itembox.goldBottleCaps += amount;
      result = 'Added *' + amount + '* Gold Bottle Cap(s).';
    } else {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Unknown item type.*\nTry: pc, lp, ht, vp, tm, stone, mint, bottlecap, goldbottlecap');
      return;
    }

    await saveUserData2(targetId, data);
    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, result + '\nTarget: *' + c(reply.from.first_name || String(targetId)) + '*');
  });
}

module.exports = registerAddItemCommand;
