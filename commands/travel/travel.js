const regionLocations = require('../../data/region_locations.json');
const { buildMainTravelKeyboard, getRegionConfigByRegionKey } = require('../../utils/travel_regions');

function registerTravelCommand(bot, deps) {
  const { check, check2, getUserData, sendMessage, c, safari, region } = deps;
  bot.command('travel', check, check2, async (ctx) => {
    const data = await getUserData(ctx.from.id);

    if(!data.inv){
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }
          ]]
        }
      });
      return;
    }

    if(data.balls.safari && data.balls.safari > 0 && data.extra && data.extra.saf){
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, 'You Are In *' + c(data.extra.saf) + ' Safari Zone*', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    const currentRegion = c(data.inv.region || 'N/A');
    const currentRegionConfig = getRegionConfigByRegionKey(data.inv.region);
    const currentLocation = data.extra && data.extra.location ? c(data.extra.location) : null;
    const currentLocationLine = currentRegionConfig && currentLocation ? '\n*Location :* _' + currentLocation + '_' : '';
    const loadedRegions = Object.keys(regionLocations).filter((key) => key !== 'source').length;

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Which Region You Wanna Travel?*\n\n*Currently :* _' + currentRegion + '_' + currentLocationLine + '\n*Travel cost:* _100 PokeCoins when changing major region. Same-region travel is free._\n*Region guides loaded:* ' + loadedRegions,
      { reply_markup: { inline_keyboard: buildMainTravelKeyboard(ctx.from.id) } }
    );
  });
}

module.exports = registerTravelCommand;
