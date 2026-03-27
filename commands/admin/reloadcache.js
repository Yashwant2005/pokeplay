function registerReloadCacheCommand(bot, deps) {
  const { sendMessage, admins, reloadStaticData } = deps;
  bot.command('reloadcache', async (ctx) => {
    if (!admins.includes(ctx.from.id)) {
      return;
    }

    try {
      reloadStaticData();
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Cache reloaded successfully.*');
    } catch (error) {
      console.error('Manual cache reload failed:', error);
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Cache reload failed. Check logs.*');
    }
  });
}

module.exports = registerReloadCacheCommand;
