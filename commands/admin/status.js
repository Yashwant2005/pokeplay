const path = require("path");

function readSessionIds(fs, sessionPath) {
  const userSet = new Set();
  const chatSet = new Set();

  if (!fs.existsSync(sessionPath)) return { userSet, chatSet };

  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
  } catch {
    return { userSet, chatSet };
  }

  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  for (const session of sessions) {
    if (!session || !session.id) continue;
    const parts = String(session.id).split(":");
    if (parts[0]) chatSet.add(parts[0]);
    if (parts[1]) userSet.add(parts[1]);
  }

  return { userSet, chatSet };
}

function previewIds(idSet, max = 20) {
  const ids = Array.from(idSet);
  if (!ids.length) return "None";
  const head = ids.slice(0, max).join(", ");
  if (ids.length <= max) return head;
  return `${head}, ... (+${ids.length - max} more)`;
}

function registerStatusCommand(bot, deps) {
  const { fs, getAllUserData, loadMessageData, botStartTime, admins, admins35, appr } = deps;
  const adminIds = new Set([...(admins || []), ...(admins35 || []), ...(appr || []), 6265981509].map((x) => Number(x)));

  bot.command("status", async (ctx) => {
    if (!adminIds.has(Number(ctx.from.id))) return;

    try {
      const allUserData = await getAllUserData();
      const totalUsers = allUserData.length;
      const usersWithPokes = allUserData.filter((u) => u.data && Array.isArray(u.data.pokes) && u.data.pokes.length > 0).length;
      const totalPokemon = allUserData.reduce((sum, u) => sum + (u.data && Array.isArray(u.data.pokes) ? u.data.pokes.length : 0), 0);
      const dbUserIds = new Set(allUserData.map((u) => String(u.userId)).filter(Boolean));

      const messageData = await loadMessageData();
      const activeBattleUsers = new Set(Array.isArray(messageData.battle) ? messageData.battle.map((x) => String(x)) : []).size;
      const activeBattleRooms = Object.values(messageData).filter((v) => v && typeof v === "object" && v.times && v.turn && v.oppo).length;
      const activeHunts = Object.values(messageData).filter((v) => v && typeof v === "object" && v.timestamp && v.id).length;

      const sessionPath = path.join(process.cwd(), "data/hexa_session.json");
      const { userSet: sessionUserIds, chatSet: sessionChatIds } = readSessionIds(fs, sessionPath);

      const uptimeMs = Date.now() - Number(botStartTime || Date.now());
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

      const statusMsg =
`*Bot Status*

*Users*
- Total DB Users: *${totalUsers}*
- Users With Pokemon: *${usersWithPokes}*
- Total Pokemon: *${totalPokemon}*
- DB User IDs: \`${previewIds(dbUserIds)}\`

*Chats / Sessions*
- Session Users: *${sessionUserIds.size}*
- Session Chats: *${sessionChatIds.size}*
- Session User IDs: \`${previewIds(sessionUserIds)}\`
- Session Chat IDs: \`${previewIds(sessionChatIds)}\`

*Live Activity*
- Active Battle Users: *${activeBattleUsers}*
- Active Battle Rooms: *${activeBattleRooms}*
- Active Hunts: *${activeHunts}*

*Uptime*
- *${hours}h ${minutes}m*`;

      await ctx.replyWithMarkdown(statusMsg);
    } catch (error) {
      console.error("Error in status command:", error);
      await ctx.replyWithMarkdown("*Error retrieving status*");
    }
  });
}

module.exports = registerStatusCommand;
