function registerClaimSafariPassCommand(bot, deps) {
  const { event, check, getUserData, saveUserData2, sendMessage, fs, path, moment, events } = deps;
  const SAFARI_EVENT_PATH = path.join(process.cwd(), 'data', 'safari_event.json');

  const getDefaultSafariEventConfig = () => ({
    enabled: true,
    dailyPasses: 1,
    startAtUtc: '2026-03-15T07:00:00Z',
    endAtUtc: '2026-03-31T07:00:00Z'
  });

  const saveSafariEventConfig = (cfg) => {
    const out = {
      enabled: !!cfg.enabled,
      dailyPasses: Number.isFinite(cfg.dailyPasses) ? Math.max(1, Math.min(10, Math.floor(cfg.dailyPasses))) : 1,
      startAtUtc: cfg.startAtUtc || null,
      endAtUtc: cfg.endAtUtc || null
    };
    fs.writeFileSync(SAFARI_EVENT_PATH, JSON.stringify(out, null, 2), 'utf8');
    return out;
  };

  const loadSafariEventConfig = () => {
    try {
      if (!fs.existsSync(SAFARI_EVENT_PATH)) {
        return saveSafariEventConfig(getDefaultSafariEventConfig());
      }
      const parsed = JSON.parse(fs.readFileSync(SAFARI_EVENT_PATH, 'utf8'));
      return saveSafariEventConfig({
        enabled: !!parsed.enabled,
        dailyPasses: Number(parsed.dailyPasses || 1),
        startAtUtc: parsed.startAtUtc || null,
        endAtUtc: parsed.endAtUtc || null
      });
    } catch (_) {
      return saveSafariEventConfig(getDefaultSafariEventConfig());
    }
  };

  const parseUtcMillis = (value) => {
    if (!value) return null;
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? millis : null;
  };

  const getAvailability = (cfg) => {
    const now = Date.now();
    const start = parseUtcMillis(cfg.startAtUtc);
    const end = parseUtcMillis(cfg.endAtUtc);

    if (!cfg.enabled) return 'disabled';
    if (start !== null && now < start) return 'upcoming';
    if (end !== null && now >= end) return 'ended';
    return 'active';
  };

  const formatWindow = (cfg) => {
    const start = cfg.startAtUtc ? moment.utc(cfg.startAtUtc) : null;
    const end = cfg.endAtUtc ? moment.utc(cfg.endAtUtc) : null;
    if (!start || !end || !start.isValid() || !end.isValid()) {
      return 'Configured by admin.';
    }

    const formatPoint = (point) => {
      const utcText = point.clone().utc().format('D/M/YY H:mm [UTC]');
      const istText = point.clone().utcOffset(330).format('H:mm [IST]');
      return utcText + ' (' + istText + ')';
    };

    return formatPoint(start) + ' - ' + formatPoint(end);
  };

  const getUtcMidnightCountdown = () => {
    const next = moment.utc().add(1, 'day').startOf('day');
    const totalSec = Math.max(0, next.diff(moment.utc(), 'seconds'));
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return hours + ':' + mins + ':' + secs;
  };

  bot.command('claim_safari_pass', check, async (ctx) => {
    const data = await getUserData(ctx.from.id);
    const cfg = loadSafariEventConfig();
    const availability = getAvailability(cfg);

    if (!data.inv) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Start your journey now*', {
        reply_to_message_id: ctx.message.message_id,
        reply_markup: { inline_keyboard: [[{ text: 'Start My Journey', url: 't.me/' + bot.botInfo.username + '?start=start' }]] }
      });
      return;
    }

    if (!data.extra || typeof data.extra !== 'object') data.extra = {};
    if (!data.extra.events || typeof data.extra.events !== 'object') data.extra.events = {};
    if (!data.extra.events.safariCommemorative || typeof data.extra.events.safariCommemorative !== 'object') {
      data.extra.events.safariCommemorative = {};
    }

    if (availability !== 'active') {
      const statusText = availability === 'upcoming'
        ? '*Event is not active yet.*'
        : availability === 'ended'
        ? '*Event is not active anymore.*'
        : '*Event is not active right now.*';
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Safari Commemorative Event*\n\nDuring this event players can claim *Safari Pass* once per day.\n\n*Event duration:* ' + formatWindow(cfg) + '\n\n' + statusText + '\n\n_We hope you keep enjoying Pokeplay._',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const todayUtc = moment.utc().format('YYYY-MM-DD');
    const state = data.extra.events.safariCommemorative;
    if (state.lastClaimDate === todayUtc) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Safari Commemorative Event*\n\nYou already claimed your *Safari Pass* for today.\n\n*Event duration:* ' + formatWindow(cfg) + '\n*Daily claim:* ' + cfg.dailyPasses + ' Safari Pass\n*Time remaining to claim:* ' + getUtcMidnightCountdown() + ' (resets at 00:00 UTC)',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (!Number.isFinite(data.inv.pass)) data.inv.pass = 0;
    data.inv.pass += cfg.dailyPasses;
    state.lastClaimDate = todayUtc;
    state.lastClaimAtUtc = moment.utc().toISOString();

    await saveUserData2(ctx.from.id, data);

    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      '*Safari Commemorative Event*\n\nYou claimed *' + cfg.dailyPasses + ' Safari Pass* for today.\n\n*Event duration:* ' + formatWindow(cfg) + '\n*Safari Pass in bag:* ' + data.inv.pass + '\n\n_We hope you keep enjoying Pokeplay._',
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerClaimSafariPassCommand;