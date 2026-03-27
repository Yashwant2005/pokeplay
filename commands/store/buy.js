function registerBuyCommand(bot, deps) {
  const { check, check2, getUserData, saveUserData2, sendMessage, loadMessageData, tms, c, he, tmprices, shiny } = deps;
  const {
    getTmLpPrice,
    getWeeklyTmShop,
    hasPurchasedSlotThisWeek,
    markPurchasedSlotThisWeek,
  } = require('../../utils/weekly_tm_shop');
  const {
    getHeldItemPrice,
    normalizeHeldItemShopName,
    titleCaseHeldItem
  } = require('../../utils/held_item_shop');
  const {
    EVOLUTION_STONES,
    normalizeStoneName,
    titleCaseEvolutionStone
  } = require('../../utils/evolution_items');
  bot.command('buy', check, check2, async ctx => {

    const messageData = await loadMessageData();

    const data = await getUserData(ctx.from.id);
    if (!data.inv || typeof data.inv !== 'object') {
      data.inv = {};
    }
    if (!Number.isFinite(data.inv.pc)) {
      data.inv.pc = 0;
    }

    if (messageData.battle.some(id => String(id) === String(ctx.from.id))) {

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You Are In A *Battle*', { reply_to_message_id: ctx.message.message_id })

      return

    }



    const buyTokens = String(ctx.message.text || '').trim().split(/\s+/).slice(1)
    const item2 = buyTokens[0]
    const amountToken = buyTokens[buyTokens.length - 1]
    const trailingAmount = /^\d+$/.test(amountToken) ? Math.max(Math.floor(Number(amountToken)), 1) : null
    const normalizedTailName = normalizeHeldItemShopName((trailingAmount ? buyTokens.slice(0, -1) : buyTokens).join(' '))

    if (!item2) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy <item>', { reply_to_message_id: ctx.message.message_id })
      return;
    }

    if (['omniring', 'omni-ring', 'omni_ring', 'ring', 'key'].includes(item2.toLowerCase()) || normalizedTailName === 'omni-ring') {

      if (data.inv.omniring || data.inv.ring || data.inv.gmax_band) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You already have *OmniRing*', { reply_to_message_id: ctx.message.message_id })

        return

      }

      const pay = 5000

      if (data.inv.pc < pay) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoins💷*', { reply_to_message_id: ctx.message.message_id })

        return

      }

      data.inv.omniring = true
      data.inv.ring = true
      data.inv.gmax_band = true
      data.inv.pc -= pay

      await saveUserData2(ctx.from.id, data)

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *OmniRing* For *5000* PokeCoins 💷', { reply_to_message_id: ctx.message.message_id })

      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>OmniRing</code>',

        { parse_mode: 'HTML' })

      return

    }

    if (item2.toLowerCase() == 'shinycharm' || item2.toLowerCase() == 'shiny_charm' || ctx.message.text.split(' ').slice(1).join(' ').toLowerCase() == 'shiny charm') {

      if (data.inv.pc < 15000) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoins💷*', { reply_to_message_id: ctx.message.message_id })

        return

      }

      if (data.inv.shiny_charm) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You already have bought *Shiny Charm*', { reply_to_message_id: ctx.message.message_id })

        return

      }

      data.inv.shiny_charm = true

      data.inv.pc -= 15000

      await saveUserData2(ctx.from.id, data)

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *Shiny Charm* For *15000* PokeCoins 💷', { reply_to_message_id: ctx.message.message_id })

      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>Shiny Charm</code>',

        { parse_mode: 'HTML' })

      return

    }

    if (item2.toLowerCase().includes('tm')) {

      const num = item2.toLowerCase().replace('tm', '')

      if (!tms.tmnumber[String(num)] || !tmprices.buy[String(num)]) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid TM*', { reply_to_message_id: ctx.message.message_id })

        return

      }

      if (!data.tms) {

        data.tms = {}

      }

      if (!data.tms[String(num)]) {

        data.tms[String(num)] = 0

      }

      const shop = getWeeklyTmShop(data, ctx.from.id, tms, tmprices)

      if (!shop.selection.includes(String(num))) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*TM' + num + '* is not in your weekly TM shop. Open */pokestore* and go to *TMs* section.', { reply_to_message_id: ctx.message.message_id })

        return

      }

      if (hasPurchasedSlotThisWeek(data, num)) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You already bought *TM' + num + '* from this week list. Each weekly TM slot can be bought only once.', { reply_to_message_id: ctx.message.message_id })

        return

      }

      const lpPrice = getTmLpPrice(num, tmprices)

      if (!Number.isFinite(data.inv.league_points)) {
        data.inv.league_points = 0
      }

      if (data.inv.league_points < lpPrice) {

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough League Points*', { reply_to_message_id: ctx.message.message_id })

        return

      }

      data.tms[String(num)] += 1

      data.inv.league_points -= lpPrice
      markPurchasedSlotThisWeek(data, num)

      await saveUserData2(ctx.from.id, data)

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *TM' + num + '* For *' + lpPrice + ' League Points*', { reply_to_message_id: ctx.message.message_id })

      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>TM' + num + '</code>', { parse_mode: 'HTML' })

      return

    }

    if (['zygardecapsule', 'zygarde-capsule', 'zygarde_capsule', 'zgcapsule'].includes(item2.toLowerCase())) {
      const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2]), 0)
      if (!amount) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy zygardecapsule <amount>', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (isNaN(amount)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      const pay = amount * 10000
      if (pay > data.inv.pc) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoinsðŸ’·*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (!data.extra || typeof data.extra !== 'object') data.extra = {}
      if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
      if (!Number.isFinite(data.extra.itembox.zygardeCapsules)) data.extra.itembox.zygardeCapsules = 0
      data.inv.pc -= pay
      data.extra.itembox.zygardeCapsules += amount
      await saveUserData2(ctx.from.id, data)
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* Zygarde Capsule for *' + pay + '* PokeCoins ðŸ’·', { reply_to_message_id: ctx.message.message_id })
      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' Zygarde Capsule</code>', { parse_mode: 'HTML' })
      return
    }

    if (['abilitycapsule', 'ability-capsule', 'ability_capsule', 'capsule'].includes(item2.toLowerCase())) {
      const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2]), 0)
      if (!amount) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy abilitycapsule <amount>', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (isNaN(amount)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      const pay = amount * 25000
      if (pay > data.inv.pc) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoinsðŸ’·*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (!data.extra || typeof data.extra !== 'object') data.extra = {}
      if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
      if (!Number.isFinite(data.extra.itembox.abilityCapsules)) data.extra.itembox.abilityCapsules = 0
      data.inv.pc -= pay
      data.extra.itembox.abilityCapsules += amount
      await saveUserData2(ctx.from.id, data)
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* Ability Capsule for *' + pay + '* PokeCoins ðŸ’·', { reply_to_message_id: ctx.message.message_id })
      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' Ability Capsule</code>', { parse_mode: 'HTML' })
      return
    }

    if (['abilitypatch', 'ability-patch', 'ability_patch', 'patch'].includes(item2.toLowerCase())) {
      const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2]), 0)
      if (!amount) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy abilitypatch <amount>', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (isNaN(amount)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      const pay = amount * 50000
      if (pay > data.inv.pc) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoinsðŸ’·*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (!data.extra || typeof data.extra !== 'object') data.extra = {}
      if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
      if (!Number.isFinite(data.extra.itembox.abilityPatches)) data.extra.itembox.abilityPatches = 0
      data.inv.pc -= pay
      data.extra.itembox.abilityPatches += amount
      await saveUserData2(ctx.from.id, data)
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* Ability Patch for *' + pay + '* PokeCoins ðŸ’·', { reply_to_message_id: ctx.message.message_id })
      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' Ability Patch</code>', { parse_mode: 'HTML' })
      return
    }

    if (['dynamaxcandy', 'dynamax-candy', 'dynamax_candy', 'dmaxcandy'].includes(item2.toLowerCase())) {
      const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2]), 0)
      if (!amount) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy dynamaxcandy <amount>', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (isNaN(amount)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      const pay = amount * 5000
      if (pay > data.inv.pc) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoinsðŸ’·*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (!data.extra || typeof data.extra !== 'object') data.extra = {}
      if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
      if (!Number.isFinite(data.extra.itembox.dynamaxCandy)) data.extra.itembox.dynamaxCandy = 0
      data.inv.pc -= pay
      data.extra.itembox.dynamaxCandy += amount
      await saveUserData2(ctx.from.id, data)
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* Dynamax Candy for *' + pay + '* PokeCoins ðŸ’·', { reply_to_message_id: ctx.message.message_id })
      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' Dynamax Candy</code>', { parse_mode: 'HTML' })
      return
    }

    if (['daycarecandy', 'daycare-candy', 'daycare_candy', 'dccandy', 'dcandy'].includes(item2.toLowerCase()) || normalizedTailName === 'daycare-candy') {
      const amount = trailingAmount || Math.max(Math.floor(ctx.message.text.split(' ')[2]), 0)
      if (!amount) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy daycarecandy <amount>', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (isNaN(amount)) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      const pay = amount * 375
      if (pay > data.inv.pc) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoinsÃ°Å¸â€™Â·*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (!Number.isFinite(data.inv.daycare_candy)) data.inv.daycare_candy = 0
      data.inv.pc -= pay
      data.inv.daycare_candy += amount
      await saveUserData2(ctx.from.id, data)
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* Daycare Candy for *' + pay + '* PokeCoins Ã°Å¸â€™Â·', { reply_to_message_id: ctx.message.message_id })
      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' Daycare Candy</code>', { parse_mode: 'HTML' })
      return
    }

    const heldLpPrice = getHeldItemPrice(normalizedTailName, 'lp')
    if (heldLpPrice) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Held items are LP only.*\nOpen */pokestore* and go to the *Held* section to buy *' + c(titleCaseHeldItem(normalizedTailName)) + '* for *' + heldLpPrice + ' League Points*.', { reply_to_message_id: ctx.message.message_id })
      return
    }

    const heldPcPrice = getHeldItemPrice(normalizedTailName, 'pc')
    if (heldPcPrice) {
      const amount = trailingAmount || 1
      const pay = amount * heldPcPrice
      if (pay > data.inv.pc) {
        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoinsðŸ’·*', { reply_to_message_id: ctx.message.message_id })
        return
      }
      if (!data.extra || typeof data.extra !== 'object') data.extra = {}
      if (!data.extra.itembox || typeof data.extra.itembox !== 'object') data.extra.itembox = {}
      if (!data.extra.itembox.heldItems || typeof data.extra.itembox.heldItems !== 'object') data.extra.itembox.heldItems = {}
      data.inv.pc -= pay
      data.extra.itembox.heldItems[normalizedTailName] = Number(data.extra.itembox.heldItems[normalizedTailName] || 0) + amount
      await saveUserData2(ctx.from.id, data)
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* ' + c(titleCaseHeldItem(normalizedTailName)) + ' for *' + pay + '* PokeCoins ðŸ’·', { reply_to_message_id: ctx.message.message_id })
      await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' ' + c(titleCaseHeldItem(normalizedTailName)) + '</code>', { parse_mode: 'HTML' })
      return
    }

    const Store2 = {

      "vitamin": 100,

      "candy": 100,

      "berry": 75

    }

    const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2]), 0)

    if (!amount) {

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /buy <item> <amount>', { reply_to_message_id: ctx.message.message_id })

      return

    }

    if (isNaN(amount)) {

      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid amount*', { reply_to_message_id: ctx.message.message_id })

      return

    }

    for (const item in Store2) {

      if (item2.toLowerCase() == item) {

        const price = Store2[item]

        const pay = amount * price

        if (pay > data.inv.pc) {

          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoins💷*', { reply_to_message_id: ctx.message.message_id })

          return

        }

        data.inv.pc -= pay

        if (!data.inv[item]) {

          data.inv[item] = 0

        }

        data.inv[item] += amount

        await saveUserData2(ctx.from.id, data)

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* ' + c(item) + ' for *' + pay + '* PokeCoins 💷', { reply_to_message_id: ctx.message.message_id })

        await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' ' + c(item) + '</code>', { parse_mode: 'HTML' })

        return

      }

    }

    let Store = {

      "regular": 15,

      "great": 25,

      "ultra": 40,

      "repeat": 50,

      "beast": 100,

      "quick": 65,

      "net": 45,

      "nest": 55

    }

    if (ctx.from.id == 6663592560) {

      Store["master"] = 1

    }

    for (const item in Store) {

      if (item2.toLowerCase() == item) {

        const price = Store[item]

        const pay = amount * price

        if (pay > data.inv.pc) {

          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*You not have enough PokeCoins💷*', { reply_to_message_id: ctx.message.message_id })

          return

        }

        data.inv.pc -= pay

        if (!data.balls) {

          data.balls = {}

        }

        if (!data.balls[item]) {

          data.balls[item] = 0

        }

        data.balls[item] += amount

        await saveUserData2(ctx.from.id, data)

        await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'Bought *' + amount + '* ' + c(item) + ' Balls for *' + pay + '* PokeCoins 💷', { reply_to_message_id: ctx.message.message_id })

        await sendMessage(ctx, -1003069884900, '#buy\n\n<b>' + he.encode(ctx.from.first_name) + '</b> (<code>' + ctx.from.id + '</code>) bought <code>' + amount + ' ' + c(item) + '</code>', { parse_mode: 'HTML' })

        return

      }

    }

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Invalid item*', { reply_to_message_id: ctx.message.message_id })

  })
}

module.exports = registerBuyCommand;

