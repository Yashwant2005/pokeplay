function register_069_berry(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function buildStatKeyboard(pass, id) {
    return [
      [
        { text: 'HP', callback_data: 'brth-hp-' + pass + '-' + id },
        { text: 'Attack', callback_data: 'brth-attack-' + pass + '-' + id },
        { text: 'Defense', callback_data: 'brth-defense-' + pass + '-' + id }
      ],
      [
        { text: 'SpA', callback_data: 'brth-special_attack-' + pass + '-' + id },
        { text: 'SpD', callback_data: 'brth-special_defense-' + pass + '-' + id },
        { text: 'Speed', callback_data: 'brth-speed-' + pass + '-' + id }
      ]
    ]
  }

  async function renderMenu(ctx, pass, id) {
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
    let msg6 = '*Pokemon:* ' + c(p2.name) + ' (*Lv.* ' + plevel(p2.name, p2.exp) + ')\n\n'
    msg6 += '*HP :* ' + p2.evs.hp + '\n'
    msg6 += '*Attack :* ' + p2.evs.attack + '\n'
    msg6 += '*Defense :* ' + p2.evs.defense + '\n'
    msg6 += '*Special Attack :* ' + p2.evs.special_attack + '\n'
    msg6 += '*Special Defense :* ' + p2.evs.special_defense + '\n'
    msg6 += '*Speed :* ' + p2.evs.speed + '\n'
    msg6 += '\nWhich EV Stat You Wanna Decrease With *10*?'
    const key = buildStatKeyboard(pass, id)
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, msg6, { parse_mode: 'markdown', reply_markup: { inline_keyboard: key } })
  }

  bot.action(/berry_/, async ctx => {
    const pass = ctx.callbackQuery.data.split('_')[1]
    const id = ctx.callbackQuery.data.split('_')[2]
    await renderMenu(ctx, pass, id)
  })
}

module.exports = register_069_berry;
