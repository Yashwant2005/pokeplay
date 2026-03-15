const fs = require('fs');
const path = require('path');
const moment = require('moment');

const SPIN_CONFIG_PATH = path.join(process.cwd(), 'data', 'spin_event.json');
const SAFARI_CONFIG_PATH = path.join(process.cwd(), 'data', 'safari_event.json');

function getDefaultSpinConfig() {
  return {
    enabled: true,
    dailySpins: 10,
    startAtUtc: '2026-03-15T07:00:00Z',
    endAtUtc: '2026-03-31T07:00:00Z'
  };
}

function getDefaultSafariConfig() {
  return {
    enabled: true,
    dailyPasses: 1,
    startAtUtc: '2026-03-15T07:00:00Z',
    endAtUtc: '2026-03-31T07:00:00Z'
  };
}

function loadJsonConfig(filePath, defaults) {
  try {
    if (!fs.existsSync(filePath)) return { ...defaults };
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      ...defaults,
      ...parsed
    };
  } catch (_) {
    return { ...defaults };
  }
}

function parseUtcMillis(value) {
  if (!value) return null;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : null;
}

function getAvailability(cfg) {
  const now = Date.now();
  const start = parseUtcMillis(cfg.startAtUtc);
  const end = parseUtcMillis(cfg.endAtUtc);

  if (!cfg.enabled) return 'disabled';
  if (start !== null && now < start) return 'upcoming';
  if (end !== null && now >= end) return 'ended';
  return 'active';
}

function formatAvailability(status) {
  if (status === 'active') return 'Active';
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'ended') return 'Ended';
  return 'Inactive';
}

function formatWindow(cfg) {
  const start = cfg.startAtUtc ? moment.utc(cfg.startAtUtc) : null;
  const end = cfg.endAtUtc ? moment.utc(cfg.endAtUtc) : null;
  if (!start || !end || !start.isValid() || !end.isValid()) {
    return 'Configured event window.';
  }

  const formatPoint = (point) => {
    const utcText = point.clone().utc().format('D/M/YY H:mm [UTC]');
    const istText = point.clone().utcOffset(330).format('h:mm A [IST]');
    return utcText + ' (' + istText + ')';
  };

  return formatPoint(start) + ' - ' + formatPoint(end);
}

function getEventsCatalog() {
  const spinConfig = loadJsonConfig(SPIN_CONFIG_PATH, getDefaultSpinConfig());
  const safariConfig = loadJsonConfig(SAFARI_CONFIG_PATH, getDefaultSafariConfig());

  const spinStatus = getAvailability(spinConfig);
  const safariStatus = getAvailability(safariConfig);

  return [
    {
      id: 'spin',
      title: 'Pokeplay Commemorative Spin',
      shortLabel: 'Spin',
      status: spinStatus,
      duration: formatWindow(spinConfig),
      details: [
        'Choose a Pokemon name to receive a level 1 commemorative Pokemon.',
        'Preview includes nature and IVs before confirm.',
        'Daily spins: ' + spinConfig.dailySpins,
        'Command: /spin'
      ]
    },
    {
      id: 'safari',
      title: 'Safari Commemorative Event',
      shortLabel: 'Safari Pass',
      status: safariStatus,
      duration: formatWindow(safariConfig),
      details: [
        'Claim one Safari Pass per day during the event.',
        'Daily passes: ' + safariConfig.dailyPasses,
        'Safari Pass entry does not consume normal safari quota.',
        'Command: /claim_safari_pass'
      ]
    }
  ];
}

function getVisibleEvents() {
  return getEventsCatalog().filter((event) => event.status === 'active' || event.status === 'upcoming');
}

function buildEventsListMessage() {
  const events = getVisibleEvents();
  if (!events.length) {
    return '*Pokeplay Events*\n\nNo active or upcoming events are scheduled right now.';
  }

  const lines = ['*Pokeplay Events*', '', 'Tap an event below to view details.'];
  for (const event of events) {
    lines.push('');
    lines.push('*' + event.title + '*');
    lines.push('- Status: ' + formatAvailability(event.status));
    lines.push('- Duration: ' + event.duration);
  }
  return lines.join('\n');
}

function buildEventsListKeyboard(userId) {
  const events = getVisibleEvents();
  const rows = events.map((event) => ([{ text: event.shortLabel + ' [' + formatAvailability(event.status) + ']', callback_data: 'evtbr_detail_' + event.id + '_' + userId }]));
  if (!rows.length) {
    rows.push([{ text: 'Close', callback_data: 'dlt_' + userId }]);
    return { inline_keyboard: rows };
  }
  rows.push([{ text: 'Close', callback_data: 'dlt_' + userId }]);
  return { inline_keyboard: rows };
}

function buildEventDetailMessage(eventId) {
  const event = getEventsCatalog().find((item) => item.id === eventId);
  if (!event) {
    return '*Pokeplay Events*\n\nEvent details are unavailable.';
  }

  return [
    '*' + event.title + '*',
    '',
    '*Status:* ' + formatAvailability(event.status),
    '*Duration:* ' + event.duration,
    '',
    ...event.details.map((line) => '- ' + line)
  ].join('\n');
}

function buildEventDetailKeyboard(userId) {
  return {
    inline_keyboard: [
      [{ text: 'Back', callback_data: 'evtbr_back_' + userId }],
      [{ text: 'Close', callback_data: 'dlt_' + userId }]
    ]
  };
}

module.exports = {
  buildEventsListMessage,
  buildEventsListKeyboard,
  buildEventDetailMessage,
  buildEventDetailKeyboard
};