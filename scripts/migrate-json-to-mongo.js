const fs = require('fs');
const path = require('path');
const { getCollection, ensureIndexes, closeMongo } = require('../mongo');
const { setKv } = require('../mongo_kv');

function parseJsonFileNoBom(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const normalized = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

function safeReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return parseJsonFileNoBom(filePath);
  } catch (error) {
    console.error('Failed reading', filePath, error.message || error);
    return fallback;
  }
}

async function migrateUsers() {
  const usersPath = path.join(process.cwd(), 'data', 'db');
  if (!fs.existsSync(usersPath)) {
    return { files: 0, records: 0 };
  }

  const users = await getCollection('users');
  const files = fs.readdirSync(usersPath).filter((name) => name.endsWith('.json'));
  let recordCount = 0;

  for (const fileName of files) {
    const filePath = path.join(usersPath, fileName);
    let payload;
    try {
      payload = parseJsonFileNoBom(filePath);
    } catch (error) {
      console.error('Skip user file', fileName, error.message || error);
      continue;
    }

    const entries = Array.isArray(payload) ? payload : [payload];
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const key = String(entry.user_id || entry.userId || entry.id || path.parse(fileName).name);
      const data = entry.data && typeof entry.data === 'object' ? entry.data : {};
      const reset = Boolean(entry.reset);
      await users.updateOne(
        { _id: key },
        {
          $set: {
            user_id: key,
            userId: key,
            data,
            reset,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      recordCount += 1;
    }
  }

  return { files: files.length, records: recordCount };
}

async function migrateBattles() {
  const battlePath = path.join(process.cwd(), 'data', 'battle');
  if (!fs.existsSync(battlePath)) {
    return { files: 0, records: 0 };
  }

  const battles = await getCollection('battles');
  const files = fs.readdirSync(battlePath).filter((name) => name.endsWith('.json'));
  let recordCount = 0;

  for (const fileName of files) {
    const filePath = path.join(battlePath, fileName);
    let data;
    try {
      data = parseJsonFileNoBom(filePath);
    } catch (error) {
      console.error('Skip battle file', fileName, error.message || error);
      continue;
    }
    const key = path.parse(fileName).name;
    await battles.updateOne(
      { _id: key },
      {
        $set: {
          data: data || {},
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    recordCount += 1;
  }

  return { files: files.length, records: recordCount };
}

async function migrateKvData() {
  const msgData = safeReadJson(path.join(process.cwd(), 'data', 'msg_data.json'), null);
  if (msgData) {
    await setKv('msg_data', msgData);
  }

  const groups = safeReadJson(path.join(process.cwd(), 'data', 'groups.json'), []);
  if (groups) {
    await setKv('group_ids', groups);
  }

  const banList = safeReadJson(path.join(process.cwd(), 'data', 'ban_list.json'), []);
  if (banList) {
    await setKv('ban_list', banList);
  }

  const transfers = safeReadJson(path.join(process.cwd(), 'data', 'transfer_requests.json'), {});
  if (transfers) {
    await setKv('transfer_requests', transfers);
  }

  const factions = safeReadJson(path.join(process.cwd(), 'factions.json'), null);
  if (factions) {
    await setKv('factions', factions);
  }
}

async function migrateSessions() {
  const sessionPath = path.join(process.cwd(), 'data', 'hexa_session.json');
  if (!fs.existsSync(sessionPath)) return 0;
  const data = safeReadJson(sessionPath, null);
  if (!data || !Array.isArray(data.sessions)) return 0;

  const sessions = await getCollection('sessions');
  let count = 0;
  for (const entry of data.sessions) {
    if (!entry || !entry.id) continue;
    const key = String(entry.id);
    const parts = key.split(':');
    const chatId = parts[0] || '';
    const userId = parts[1] || '';
    await sessions.updateOne(
      { _id: key },
      {
        $set: {
          data: entry.data || {},
          chatId: String(chatId),
          userId: String(userId),
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    count += 1;
  }
  return count;
}

async function main() {
  await ensureIndexes();

  const userResult = await migrateUsers();
  const battleResult = await migrateBattles();
  await migrateKvData();
  const sessionCount = await migrateSessions();

  console.log('Migration complete.');
  console.log('User files:', userResult.files, 'User records:', userResult.records);
  console.log('Battle files:', battleResult.files, 'Battle records:', battleResult.records);
  console.log('Session records:', sessionCount);
}

main()
  .then(async () => {
    await closeMongo();
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
    await closeMongo();
  });
