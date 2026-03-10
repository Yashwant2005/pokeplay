function registerCommands(bot, deps) {
  const fs = require("fs");
  const path = require("path");
  const dir = __dirname;
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

module.exports = registerCommands;

