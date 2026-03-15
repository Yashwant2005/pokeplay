function registerSpinEventCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const SPIN_CONFIG_PATH = path.join(process.cwd(), 'data', 'spin_event.json');

  const getDefaultSpinConfig = () => ({
    enabled: false,
    dailySpins: 10,
    startAtUtc: null,
    endAtUtc: null
  });

  const saveSpinConfig = (cfg) => {
    const out = {
      enabled: !!cfg.enabled,
      dailySpins: Math.max(1, Math.min(100, Math.floor(cfg.dailySpins))),
      startAtUtc: cfg.startAtUtc || null,
      endAtUtc: cfg.endAtUtc || null
    };
    fs.writeFileSync(SPIN_CONFIG_PATH, JSON.stringify(out, null, 2), 'utf8');
    return out;
  };

  const loadSpinConfig = () => {
    try {
      if (!fs.existsSync(SPIN_CONFIG_PATH)) {
        return saveSpinConfig(getDefaultSpinConfig());
      }
      const parsed = JSON.parse(fs.readFileSync(SPIN_CONFIG_PATH, 'utf8'));
      return saveSpinConfig({
        enabled: !!parsed.enabled,
        dailySpins: Number(parsed.dailySpins || 10),
        startAtUtc: parsed.startAtUtc || null,
        endAtUtc: parsed.endAtUtc || null
      });
    } catch (_) {
      return saveSpinConfig(getDefaultSpinConfig());
    }
  };

  const isAdmin = (id) => {
    if (Array.isArray(admins) && admins.includes(id)) return true;
    if (Array.isArray(admins35) && admins35.includes(id)) return true;
    if (Array.isArray(appr) && appr.includes(id)) return true;
    return false;
  };

  bot.command('spin_event', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    const args = String(ctx.message.text || '').trim().split(/\s+/).slice(1);
    let cfg = loadSpinConfig();

    const cmd = String(args[0] || 'status').toLowerCase();

    if (cmd === 'on' || cmd === 'enable') {
      cfg.enabled = true;
      cfg = saveSpinConfig(cfg);
      await sendMessage(ctx, ctx.chat.id, 'Spin event enabled.\nDaily spins: ' + cfg.dailySpins + '\nGenerated level: 1');
      return;
    }

    if (cmd === 'off' || cmd === 'disable') {
      cfg.enabled = false;
      cfg = saveSpinConfig(cfg);
      await sendMessage(ctx, ctx.chat.id, 'Spin event disabled.');
      return;
    }

    if (cmd === 'spins') {
      const value = Number(args[1]);
      if (!Number.isFinite(value) || value < 1 || value > 100) {
        await sendMessage(ctx, ctx.chat.id, 'Usage: /spin_event spins <1-100>');
        return;
      }
      cfg.dailySpins = Math.floor(value);
      cfg = saveSpinConfig(cfg);
      await sendMessage(ctx, ctx.chat.id, 'Spin event daily spins set to ' + cfg.dailySpins + '.');
      return;
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      'Spin event status:\n' +
      '- Enabled: ' + (cfg.enabled ? 'Yes' : 'No') + '\n' +
      '- Daily spins: ' + cfg.dailySpins + '\n' +
      '- Start: ' + (cfg.startAtUtc || 'Not set') + '\n' +
      '- End: ' + (cfg.endAtUtc || 'Not set') + '\n' +
      '- Generated level: 1\n\n' +
      'Commands:\n' +
      '/spin_event on\n' +
      '/spin_event off\n' +
      '/spin_event spins <1-100>'
    );
  });
}

module.exports = registerSpinEventCommand;
