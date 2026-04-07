const regionLocations = require('../../data/region_locations.json');
const {
  REGION_CONFIG,
  buildMainTravelKeyboard,
  chunkOptions,
  getRegionConfigByRegionKey
} = require('../../utils/travel_regions');

function register_021_travel(bot, deps) {
  const { check2q, getUserData, saveUserData2, editMessage, c, safari, region } = deps;
  const locationPageSize = 12;

  const getRegionEntries = (config) => {
    if(!config || !config.locationDataKey || !Array.isArray(regionLocations[config.locationDataKey])){
      return [];
    }
    return regionLocations[config.locationDataKey];
  };

  const buildRegionMenu = (config, userId) => {
    const optionRows = chunkOptions(
      config.travelOptions.map((option) => ({
        text: option.label,
        callback_data: 'travel_go:'+option.regionKey+'_'+userId+''
      })),
      3
    );

    const entries = getRegionEntries(config);
    if(entries.length > 0){
      optionRows.push([{ text: config.label + ' Locations', callback_data: 'travel_locations:'+config.id+':0_'+userId+'' }]);
    }

    optionRows.push([{ text: 'Back', callback_data: 'travel_menu:main_'+userId+'' }]);

    return optionRows;
  };

  const buildLocationPage = (config, page, userId) => {
    const entries = getRegionEntries(config);
    const maxPage = Math.max(0, Math.ceil(entries.length / locationPageSize) - 1);
    const safePage = Math.min(Math.max(Number(page) || 0, 0), maxPage);
    const start = safePage * locationPageSize;
    const pageEntries = entries.slice(start, start + locationPageSize);
    const keyboard = [];

    for(let i = 0; i < pageEntries.length; i += 2){
      keyboard.push(
        pageEntries.slice(i, i + 2).map((entry, offset) => ({
          text: entry.name,
          callback_data: 'travel_pick:'+config.id+':'+(start + i + offset)+'_'+userId+''
        }))
      );
    }

    const navRow = [];
    if(safePage > 0){
      navRow.push({ text: 'Prev', callback_data: 'travel_locations:'+config.id+':'+(safePage - 1)+'_'+userId+'' });
    }
    if(safePage < maxPage){
      navRow.push({ text: 'Next', callback_data: 'travel_locations:'+config.id+':'+(safePage + 1)+'_'+userId+'' });
    }
    if(navRow.length > 0){
      keyboard.push(navRow);
    }

    keyboard.push([{ text: 'Back', callback_data: 'travel_menu:'+config.id+'_'+userId+'' }]);

    return {
      page: safePage,
      maxPage,
      keyboard
    };
  };

  bot.action(/travel_/, check2q, async (ctx) => {
    const raw = String(ctx.callbackQuery.data || '');
    const splitAt = raw.lastIndexOf('_');
    const action = splitAt >= 0 ? raw.slice('travel_'.length, splitAt) : '';
    const userId = splitAt >= 0 ? raw.slice(splitAt + 1) : '';

    if(ctx.from.id != userId){
      ctx.answerCbQuery();
      return;
    }

    const data = await getUserData(ctx.from.id);

    if(action === 'menu:main'){
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        '*Which Region You Wanna Travel?*\n\n*Travel cost:* _100 Victory Points when changing major region. Same-region travel is free._',
        { parse_mode: 'markdown', reply_markup: { inline_keyboard: buildMainTravelKeyboard(ctx.from.id) } }
      );
      return;
    }

    const actionParts = action.split(':');
    const type = actionParts[0];
    const regionId = actionParts[1];
    const indexText = actionParts[2];
    const config = REGION_CONFIG[regionId] || null;

    if(type === 'menu' && regionId === 'back'){
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        '*Which Region You Wanna Travel?*\n\n*Travel cost:* _100 Victory Points when changing major region. Same-region travel is free._',
        { parse_mode: 'markdown', reply_markup: { inline_keyboard: buildMainTravelKeyboard(ctx.from.id) } }
      );
      return;
    }

    if(type === 'menu' && config){
      const currentRegionConfig = getRegionConfigByRegionKey(data.inv.region);
      const currentLocation = currentRegionConfig && currentRegionConfig.id === config.id && data.extra && data.extra.location
        ? '\n*Current location:* _' + c(data.extra.location) + '_'
        : '';
      const entryCount = getRegionEntries(config).length;
      const countLine = entryCount > 0 ? '\n*Locations loaded:* ' + entryCount : '';

      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        'Which Place Wanna Go In *' + config.label + '*?' + currentLocation + countLine,
        { parse_mode: 'markdown', reply_markup: { inline_keyboard: buildRegionMenu(config, ctx.from.id) } }
      );
      return;
    }

    if(type === 'locations' && config){
      const pageData = buildLocationPage(config, indexText, ctx.from.id);
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        'Pick A *' + config.label + '* Location\n\n_Page ' + (pageData.page + 1) + ' of ' + (pageData.maxPage + 1) + '_',
        { parse_mode: 'markdown', reply_markup: { inline_keyboard: pageData.keyboard } }
      );
      return;
    }

    if(!config && type !== 'go'){
      await editMessage(
        'text',
        ctx,
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        '*Which Region You Wanna Travel?*\n\n*Travel cost:* _100 Victory Points when changing major region. Same-region travel is free._',
        { parse_mode: 'markdown', reply_markup: { inline_keyboard: buildMainTravelKeyboard(ctx.from.id) } }
      );
      return;
    }

    if(data.balls.safari && data.balls.safari > 0){
      ctx.answerCbQuery('You Are In *' + c(data.extra.saf) + ' Safari Zone*');
      return;
    }

    let targetRegionKey = null;
    let selectedLocation = null;
    let selectedMajorRegion = null;

    if(type === 'go'){
      targetRegionKey = regionId;
      selectedMajorRegion = getRegionConfigByRegionKey(regionId);
    }else if(type === 'pick' && config){
      const entries = getRegionEntries(config);
      selectedLocation = entries[Number(indexText)] || null;
      if(!selectedLocation){
        ctx.answerCbQuery('That location is not available right now.', { show_alert: true });
        return;
      }
      const currentRegionConfig = getRegionConfigByRegionKey(data.inv.region);
      selectedMajorRegion = config;
      targetRegionKey = currentRegionConfig && currentRegionConfig.id === config.id
        ? String(data.inv.region || '').toLowerCase()
        : config.defaultRegion;
    }

    if(!targetRegionKey || !selectedMajorRegion){
      ctx.answerCbQuery();
      return;
    }

    const currentRegionConfig = getRegionConfigByRegionKey(data.inv.region);
    const currentMajorId = currentRegionConfig ? currentRegionConfig.id : String(data.inv.region || '').toLowerCase();
    const selectedMajorId = selectedMajorRegion.id;
    const isPaidTravel = currentMajorId !== selectedMajorId;

    if(isPaidTravel){
      if(!Number.isFinite(data.inv.vp)){
        data.inv.vp = 0;
      }
      if(data.inv.vp < 100){
        ctx.answerCbQuery('Need 100 Victory Points to change region.', { show_alert: true });
        return;
      }
      data.inv.vp -= 100;
    }

    data.inv.region = targetRegionKey;
    if(!data.extra || typeof data.extra !== 'object'){
      data.extra = {};
    }

    if(selectedLocation){
      data.extra.location = selectedLocation.name;
    }else if(data.extra.location){
      delete data.extra.location;
    }

    await saveUserData2(ctx.from.id, data);

    let arrivalMessage = 'Successfully Arrived To *' + c(targetRegionKey) + '*';
    if(selectedLocation){
      arrivalMessage += '\n*Location:* _' + c(selectedLocation.name) + '_';
    }
    if(isPaidTravel){
      arrivalMessage += '\n*Cost:* 100 Victory Points';
    }

    await editMessage(
      'text',
      ctx,
      ctx.chat.id,
      ctx.callbackQuery.message.message_id,
      arrivalMessage,
      { parse_mode: 'markdown' }
    );
  });
}

module.exports = register_021_travel;
