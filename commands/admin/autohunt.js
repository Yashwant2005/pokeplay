function registerAutohuntCommand(bot, deps) {
  const { sendMessage, admins, admins35, appr, tms, stones, c } = deps;
  const {
    HUNT_TM_CHANCE,
    HUNT_MEGA_STONE_CHANCE,
    HUNT_SHINY_CHANCE,
    rollHuntReward
  } = require('../../utils/hunt_rewards');

  const MAX_AUTOHUNT = 5000000;
  const adminIds = new Set([...(admins || []), ...(admins35 || []), ...(appr || [])].map((id) => Number(id)).filter((id) => Number.isFinite(id)));

  function formatBreakdown(title, counts, formatter = (value) => value, limit = 10) {
    const entries = Object.entries(counts || {})
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => {
        const countDiff = Number(b[1]) - Number(a[1]);
        if (countDiff !== 0) return countDiff;
        return String(a[0]).localeCompare(String(b[0]));
      });

    if (!entries.length) return '';

    let msg = `\n\n*${title}:*`;
    for (const [key, count] of entries.slice(0, limit)) {
      msg += `\n- ${formatter(key)}: ${count}`;
    }
    if (entries.length > limit) {
      msg += `\n- ...and ${entries.length - limit} more`;
    }
    return msg;
  }

  bot.command('autohunt', async (ctx) => {
    if (!adminIds.has(Number(ctx.from.id))) return;

    const amount = Math.floor(Number(String(ctx.message.text || '').split(/\s+/)[1]));
    if (!Number.isFinite(amount) || amount < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Usage:* /autohunt <number>\n*Example:* /autohunt 40000', {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    if (amount > MAX_AUTOHUNT) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, `*Maximum allowed:* ${MAX_AUTOHUNT}`, {
        reply_to_message_id: ctx.message.message_id
      });
      return;
    }

    let tmCount = 0;
    let megaStoneCount = 0;
    let pokemonCount = 0;
    let shinyCount = 0;
    const tmBreakdown = {};
    const stoneBreakdown = {};

    for (let i = 0; i < amount; i += 1) {
      const reward = rollHuntReward({ tms, stones });
      if (reward.type === 'tm') {
        tmCount += 1;
        tmBreakdown[reward.tmNo] = Number(tmBreakdown[reward.tmNo] || 0) + 1;
        continue;
      }

      if (reward.type === 'stone') {
        megaStoneCount += 1;
        stoneBreakdown[reward.stone] = Number(stoneBreakdown[reward.stone] || 0) + 1;
        continue;
      }

      pokemonCount += 1;
      if (reward.shiny) {
        shinyCount += 1;
      }
    }

    let msg = '*Auto Hunt Report*';
    msg += `\n\n*Simulated Hunts:* ${amount}`;
    msg += `\n*Pokemon:* ${pokemonCount}`;
    msg += `\n*Shiny Pokemon:* ${shinyCount}`;
    msg += `\n*TMs:* ${tmCount}`;
    msg += `\n*Mega Stones:* ${megaStoneCount}`;
    const pokemonChance = Math.max(0, 1 - HUNT_TM_CHANCE - HUNT_MEGA_STONE_CHANCE);
    msg += '\n\n*Odds Used:*';
    msg += `\n- TM: ${HUNT_TM_CHANCE} chance (${(HUNT_TM_CHANCE * 100).toFixed(4)}%)`;
    msg += `\n- Mega Stone: ${HUNT_MEGA_STONE_CHANCE} chance (${(HUNT_MEGA_STONE_CHANCE * 100).toFixed(4)}%)`;
    msg += `\n- Pokemon: ${pokemonChance.toFixed(4)} chance (${(pokemonChance * 100).toFixed(2)}%)`;
    msg += `\n- Shiny from Pokemon: ${HUNT_SHINY_CHANCE} chance (${(HUNT_SHINY_CHANCE * 100).toFixed(4)}%)`;
    msg += '\n\n_This is one random simulation, so very rare drops can still be 0 even at high hunt counts._';
    msg += formatBreakdown('TM Breakdown', tmBreakdown, (value) => 'TM' + value);
    msg += formatBreakdown('Mega Stone Breakdown', stoneBreakdown, (value) => c(value));

    await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, msg, {
      reply_to_message_id: ctx.message.message_id
    });
  });
}

module.exports = registerAutohuntCommand;

