async function cleanupTempBattleForUsers({ battleData, bword, userIds, getUserData, saveUserData2 }) {
  if (!battleData || !battleData.tempBattle || !battleData.tempTeams) return;

  const ids = Array.isArray(userIds) && userIds.length > 0
    ? userIds.map((id) => String(id))
    : [String(battleData.cid), String(battleData.oid)];

  for (const uid of ids) {
    const data = await getUserData(uid);
    if (!data || typeof data !== 'object') continue;

    const passes = Array.isArray(battleData.tempTeams[uid]) ? battleData.tempTeams[uid].map(String) : [];

    if (Array.isArray(data.pokes)) {
      data.pokes = data.pokes.filter((poke) => {
        const pass = poke && poke.pass !== undefined ? String(poke.pass) : '';
        return !poke?.temp_battle && !passes.includes(pass);
      });
    }

    if (data.extra && typeof data.extra === 'object' && data.extra.temp_battle) {
      delete data.extra.temp_battle[bword];
    }

    await saveUserData2(uid, data);
  }
}

async function clearBattleMessageState({ bword, loadMessageData, saveMessageData }) {
  const messageData = await loadMessageData();
  if (!messageData || typeof messageData !== 'object' || !messageData[bword]) {
    return;
  }

  const turnId = parseInt(messageData[bword].turn);
  const oppoId = parseInt(messageData[bword].oppo);
  if (Array.isArray(messageData.battle)) {
    messageData.battle = messageData.battle.filter((chat) => chat !== turnId && chat !== oppoId);
  }
  delete messageData[bword];
  await saveMessageData(messageData);
}

module.exports = {
  cleanupTempBattleForUsers,
  clearBattleMessageState,
};
