function registerStatsSettingsCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage, editMessage } = deps;
  const { getPokemonStatsCardMode } = require('../../utils/pokemon_stats_card_v2');

  function buildStatsSettingsText(data) {
    const mode = getPokemonStatsCardMode(data);
    return (
      '*Stats Page Settings*\n\n' +
      '*Current Mode:* ' + (mode === 'legacy' ? 'OLD STYLE' : 'MODERN') + '\n\n' +
      '*OLD STYLE:* the old image + caption stats page like before.\n' +
      '*MODERN:* starts hidden and uses the Show / Hide toggle.'
    );
  }

  function buildStatsSettingsKeyboard(userId, currentMode) {
    const keyboard = [[
      {
        text: currentMode === 'legacy' ? '✅ Previous' : 'Previous',
        callback_data: 'stpgmode_' + userId + '_legacy'
      },
      {
        text: currentMode === 'private' ? '✅ Private' : 'Private',
        callback_data: 'stpgmode_' + userId + '_private'
      }
    ]];
    keyboard[0][0].text = currentMode === 'legacy' ? '✅ OLD STYLE' : 'OLD STYLE';
    keyboard[0][1].text = currentMode === 'private' ? '✅ MODERN' : 'MODERN';
    return keyboard;
  }

  bot.command('stats_settings', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    const currentMode = getPokemonStatsCardMode(data);
    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      buildStatsSettingsText(data),
      {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: buildStatsSettingsKeyboard(ctx.from.id, currentMode) }
      }
    );
  });

  bot.action(/^stpgmode_(\d+)_(legacy|private)$/, async (ctx) => {
    const userId = Number(ctx.match[1]);
    const nextMode = String(ctx.match[2] || 'private');
    if (ctx.from.id !== userId) {
      await ctx.answerCbQuery('Not your button!');
      return;
    }

    const data = await getUserData(userId);
    if (!data.settings || typeof data.settings !== 'object') {
      data.settings = {};
    }
    data.settings.stats_page_mode = nextMode;
    await saveUserData2(userId, data);

    await editMessage(
      'text',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      buildStatsSettingsText(data),
      {
        parse_mode: 'markdown',
        reply_markup: { inline_keyboard: buildStatsSettingsKeyboard(userId, nextMode) }
      }
    );
    await ctx.answerCbQuery('Stats page mode set to ' + (nextMode === 'legacy' ? 'OLD STYLE' : 'MODERN'));
  });
}

module.exports = registerStatsSettingsCommand;
