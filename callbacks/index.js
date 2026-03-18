function registerCallbacks(bot, deps) {
  const fs = require("fs");
  const path = require("path");
  const dir = __dirname;
  if (!bot.__safeCallbackActionWrapped) {
    const originalAction = bot.action.bind(bot);
    const wrapHandler = (handler) => async (ctx, next) => {
      let snapshotMessageData = null;
      let snapshotBattleData = null;
      let snapshotBattleKey = null;
      if (deps && typeof deps.loadMessageData === "function") {
        try {
          const messageData = deps.loadMessageData();
          const userId = ctx && ctx.from ? ctx.from.id : null;
          const inBattle =
            userId &&
            messageData &&
            Array.isArray(messageData.battle) &&
            messageData.battle.includes(userId);
          if (inBattle) {
            const raw = String((ctx && ctx.callbackQuery && ctx.callbackQuery.data) || "");
            const parts = raw.split("_").filter(Boolean);
            for (const part of parts) {
              const entry = messageData[part];
              if (entry && typeof entry === "object" && ("turn" in entry || "oppo" in entry)) {
                snapshotBattleKey = part;
                break;
              }
            }
            snapshotMessageData = JSON.parse(JSON.stringify(messageData));
            if (snapshotBattleKey && typeof deps.loadBattleData === "function") {
              const battleData = deps.loadBattleData(snapshotBattleKey);
              snapshotBattleData = JSON.parse(JSON.stringify(battleData || {}));
            }
          }
        } catch (_) {
          snapshotMessageData = null;
          snapshotBattleData = null;
          snapshotBattleKey = null;
        }
      }
      try {
        return await handler(ctx, next);
      } catch (error) {
        console.error("[callback handler error]", error);
        try {
          if (
            snapshotBattleKey &&
            snapshotBattleData &&
            deps &&
            typeof deps.saveBattleData === "function"
          ) {
            deps.saveBattleData(snapshotBattleKey, snapshotBattleData);
          }
          if (snapshotMessageData && deps && typeof deps.saveMessageData === "function") {
            deps.saveMessageData(snapshotMessageData);
          }
        } catch (rollbackError) {
          console.error("[callback rollback error]", rollbackError);
        }
        try {
          if (ctx && typeof ctx.answerCbQuery === "function") {
            await ctx.answerCbQuery("Something went wrong. Please try again.");
          }
        } catch (_) {
          // Ignore answerCbQuery failures (e.g., timeout)
        }
      }
    };
    bot.action = (trigger, ...handlers) => {
      if (!handlers || handlers.length === 0) {
        return originalAction(trigger);
      }
      const wrapped = handlers.map((h) => (typeof h === "function" ? wrapHandler(h) : h));
      return originalAction(trigger, ...wrapped);
    };
    bot.__safeCallbackActionWrapped = true;
  }
  function loadFrom(folder) {
    const entries = fs.readdirSync(folder, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        loadFrom(full);
        continue;
      }
      if (entry.name.endsWith(".js") && entry.name !== "index.js") {
        const register = require(full);
        if (typeof register === "function") {
          register(bot, deps);
        }
      }
    }
  }
  loadFrom(dir);
}

module.exports = registerCallbacks;

