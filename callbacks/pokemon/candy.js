function register_066_candy(bot, deps) {
  const { check2q, getUserData, saveUserData2, sendMessage, editMessage, loadMessageData, forms, pokes, pokemoves, dmoves, growth_rates, chart, c, chains, emojis, saveMessageData } = deps;
  const { getReadyEvolutionRows } = require('../../utils/evolution_rules');
  bot.action(/^candy_/, check2q, async ctx => {
    const pass = ctx.callbackQuery.data.split('_')[1]
    const id = ctx.callbackQuery.data.split('_')[2]
    const amount = parseInt(ctx.callbackQuery.data.split('_')[3]) || 1
    const data = await getUserData(ctx.from.id)
    const poke = data.pokes.filter((p) => p.pass === pass)[0]

    if (id != ctx.from.id) {
      ctx.answerCbQuery()
      return
    }

    if (!poke) {
      ctx.answerCbQuery('Poke not found')
      return
    }

    const p2 = poke
    const g = growth_rates[p2.name]
    const exp = chart[g.growth_rate]
    const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
    let currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;

    if (!data.inv.candy) {
      data.inv.candy = 0
    }

    if (data.inv.candy < 1) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'You are out of *Candies 🍬*', { parse_mode: 'markdown' })
      return
    }

    if (currentLevel * 1 > 99) {
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, '*' + c(p2.name) + '* has already reached *100* level', { parse_mode: 'markdown' })
      return
    }

    let used = 0
    const startLevel = currentLevel
    let stoppedForMove = false

    while (used < amount) {
      if (data.inv.candy < 1) break
      if (currentLevel >= 100) break

      data.inv.candy -= 1
      const nextLevel = currentLevel + 1
      p2.exp = exp[nextLevel]
      used++

      const readyEvolutions = getReadyEvolutionRows(p2.name, nextLevel, chains, forms, { data, now: new Date() })
      if (readyEvolutions.length > 0) {
        if (ctx.chat.type != 'private') {
          await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, '<a href="tg://user?id=' + ctx.from.id + '"><b>' + data.inv.name + '</b></a> Your Pokemon <b>' + c(p2.name) + '</b> Is Ready To Evolve', { reply_markup: { inline_keyboard: [[{ text: 'Evolve', url: 't.me/' + bot.botInfo.username + '' }]] } })
        }
        await sendMessage(ctx, ctx.from.id, '*' + c(p2.name) + '* Is Ready To Evolve.\nUse */evolve ' + c(p2.name) + '* to choose the evolution.', { parse_mode: 'markdown' })
      }

      if (pokemoves[p2.name] && pokemoves[p2.name].moves_info) {
        const moves = pokemoves[p2.name]
        const moves2 = moves.moves_info.filter((move) =>
          move.learn_method == 'level-up' &&
          move.level_learned_at > currentLevel &&
          move.level_learned_at <= nextLevel &&
          dmoves[move.id] &&
          dmoves[move.id].power &&
          dmoves[move.id].accuracy &&
          dmoves[move.id].category != 'status'
        )

        if (moves2.length > 0) {
          for (const m of moves2) {
            if (p2.moves.length < 4) {
              p2.moves.push(m.id)
              await saveUserData2(ctx.from.id, data)
              await sendMessage(ctx, ctx.from.id, '<b>' + c(p2.name) + '</b> (<b>Lv.</b> ' + nextLevel + ') Has Learnt A New Move <b>' + c(dmoves[m.id].name) + '</b> [' + c(dmoves[m.id].type) + ' ' + emojis[dmoves[m.id].type] + '].', { parse_mode: 'HTML' })
            } else {
              const d = Date.now()
              if (ctx.chat.type != 'private') {
                await sendMessage(ctx, ctx.chat.id, { parse_mode: 'HTML' }, '<a href="tg://user?id=' + ctx.from.id + '"><b>' + data.inv.name + '</b></a>, <b>' + c(p2.name) + '</b> (<b>Lv.</b> ' + nextLevel + ') Wants To Learn A New Move', { reply_markup: { inline_keyboard: [[{ text: 'Go', url: 't.me/' + bot.botInfo.username + '' }]] } })
              }
              const mdata = await loadMessageData();
              const m77 = await sendMessage(ctx, ctx.from.id, '<b>' + c(p2.name) + '</b> (<b>Lv.</b> ' + nextLevel + ') Wants To Learn A New Move <b>' + c(dmoves[m.id].name) + '</b> [' + c(dmoves[m.id].type) + ' ' + emojis[dmoves[m.id].type] + '].\n\nBut <b>' + c(p2.name) + '</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>' + c(dmoves[m.id].name) + '</b>\n<i>You Have 15 Min To Choose.</i>', { reply_markup: { inline_keyboard: [[{ text: 'Go Next', callback_data: 'lrn_' + p2.pass + '_' + m.id + '_' + d + '' }]] }, parse_mode: 'HTML' })
              if (!mdata.moves) {
                mdata.moves = {}
              }
              mdata.moves[m77.message_id] = { chat: ctx.from.id, td: d, poke: p2.name, move: dmoves[m.id].name }
              await saveMessageData(mdata)
              stoppedForMove = true
              break
            }
          }
        }
      }

      currentLevel = nextLevel
      if (stoppedForMove) break
    }

    await saveUserData2(ctx.from.id, data)

    if (used > 0) {
      const rows = [
        [
          { text: '+1 Candy 🍬', callback_data: 'candy_' + p2.pass + '_' + ctx.from.id + '_1' },
          { text: '+5 Candy', callback_data: 'candy_' + p2.pass + '_' + ctx.from.id + '_5' }
        ],
        [
          { text: '+10 Candy', callback_data: 'candy_' + p2.pass + '_' + ctx.from.id + '_10' },
          { text: '+20 Candy', callback_data: 'candy_' + p2.pass + '_' + ctx.from.id + '_20' }
        ]
      ]
      await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, 'You gave ' + used + ' candy 🍬 to *' + c(p2.name) + '*\n*Level:* ' + startLevel + ' --> ' + currentLevel, { parse_mode: 'markdown', reply_markup: { inline_keyboard: rows } })
    }
  })
}

module.exports = register_066_candy;
