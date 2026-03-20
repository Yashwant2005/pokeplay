function registerIvEventCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  const fs = require('fs');
  const path = require('path');

  const IV_EVENT_CONFIG_PATH = path.join(process.cwd(), 'data', 'iv_boost_event.json');

  const getDefaultIvEventConfig = () => ({
    enabled: true,
    startAtUtc: '2026-03-20T00:00:00Z',
    endAtUtc: '2026-03-22T07:00:00Z',
    regularMinPerStat: 6,
    legendaryMinPerStat: 8,
    regularMinTotal: 100,
    legendaryMinTotal: 130,
    lockHunts: 40,
    lockMinValue: 14,
    lockSetsPerDay: 3
  });

  const saveIvEventConfig = (cfg) => {
    const defaults = getDefaultIvEventConfig();
    const out = {
      ...defaults,
      ...cfg,
      enabled: !!cfg.enabled
    };
    fs.writeFileSync(IV_EVENT_CONFIG_PATH, JSON.stringify(out, null, 2), 'utf8');
    return out;
  };

  const loadIvEventConfig = () => {
    try {
      if (!fs.existsSync(IV_EVENT_CONFIG_PATH)) {
        return saveIvEventConfig(getDefaultIvEventConfig());
      }
      const parsed = JSON.parse(fs.readFileSync(IV_EVENT_CONFIG_PATH, 'utf8'));
      return saveIvEventConfig(parsed);
    } catch (_) {
      return saveIvEventConfig(getDefaultIvEventConfig());
    }
  };

  const isAdmin = (id) => {
    if (Array.isArray(admins) && admins.includes(id)) return true;
    if (Array.isArray(admins35) && admins35.includes(id)) return true;
    if (Array.isArray(appr) && appr.includes(id)) return true;
    return false;
  };

  bot.command('ivevent', async (ctx) => {
    if (!isAdmin(ctx.from.id)) return;

    const args = String(ctx.message.text || '').trim().split(/\s+/).slice(1);
    const cmd = String(args[0] || 'status').toLowerCase();
    let cfg = loadIvEventConfig();

    if (cmd === 'on' || cmd === 'enable') {
      cfg.enabled = true;
      cfg = saveIvEventConfig(cfg);
      await sendMessage(ctx, ctx.chat.id, 'IV boost event enabled.');
      return;
    }

    if (cmd === 'off' || cmd === 'disable') {
      cfg.enabled = false;
      cfg = saveIvEventConfig(cfg);
      await sendMessage(ctx, ctx.chat.id, 'IV boost event disabled.');
      return;
    }

    if (cmd === 'resetlocks' || cmd === 'resetlock' || cmd === 'reserlocks') {
      const targetId = Number(args[1] || ctx.from.id);
      if (!Number.isFinite(targetId) || targetId < 1) {
        await sendMessage(ctx, ctx.chat.id, 'Usage: /ivevent resetlocks <userId>');
        return;
      }

      const data = await getUserData(targetId);
      if (!data || !data.inv) {
        await sendMessage(ctx, ctx.chat.id, 'User data not found for ' + targetId + '.');
        return;
      }

      if (!data.extra || typeof data.extra !== 'object') data.extra = {};
      delete data.extra.ivLock;
      delete data.extra.ivLockDaily;
      delete data.extra.ivEventLastEncounter;
      delete data.extra.ivEventLastCaught;
      await saveUserData2(targetId, data);

      await sendMessage(ctx, ctx.chat.id, 'IV event locks reset for user ' + targetId + '.');
      return;
    }

    await sendMessage(
      ctx,
      ctx.chat.id,
      'IV boost event status:\n' +
      '- Enabled: ' + (cfg.enabled ? 'Yes' : 'No') + '\n' +
      '- Start: ' + (cfg.startAtUtc || 'Not set') + '\n' +
      '- End: ' + (cfg.endAtUtc || 'Not set') + '\n' +
      '- Regular min per stat: ' + cfg.regularMinPerStat + '\n' +
      '- Legendary min per stat: ' + cfg.legendaryMinPerStat + '\n' +
      '- Regular min total: ' + cfg.regularMinTotal + '\n' +
      '- Legendary min total: ' + cfg.legendaryMinTotal + '\n' +
      '- Lock hunts: ' + cfg.lockHunts + '\n' +
      '- Lock min value: ' + cfg.lockMinValue + '\n' +
      '- Lock sets per day: ' + cfg.lockSetsPerDay + '\n\n' +
      'Commands:\n' +
      '/ivevent on\n' +
      '/ivevent off\n' +
      '/ivevent resetlocks <userId>'
    );
  });
}

module.exports = registerIvEventCommand;
