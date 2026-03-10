const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');
const archiver = require('archiver');

const BOT_TOKEN = '8536034020:AAEavQgVhnnx0ACTme5Kxst_Ytu4k35FiXk';
const CHAT_ID = '-1002245132909';
const BACKUP_INTERVAL_MS = 30 * 60 * 1000;
const DATA_FOLDER = path.join(__dirname, 'data', 'db');

const bot = new Telegraf(BOT_TOKEN);
let backupRunning = false;

async function getAllUserData() {
  try {
    if (!fs.existsSync(DATA_FOLDER)) {
      console.error('DB folder not found:', DATA_FOLDER);
      return [];
    }

    const fileNames = fs.readdirSync(DATA_FOLDER).filter((name) => name.endsWith('.json'));
    const userData = [];

    for (const fileName of fileNames) {
      const filePath = path.join(DATA_FOLDER, fileName);
      try {
        const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (Array.isArray(fileData)) {
          userData.push(...fileData);
        } else if (fileData && typeof fileData === 'object') {
          userData.push(fileData);
        }
      } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
      }
    }

    return userData;
  } catch (error) {
    console.error('Error retrieving user data:', error.message);
    return [];
  }
}

async function createZipFromUserData(userData, zipFilePath) {
  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);

    for (const entry of userData) {
      const fileName = `${entry.user_id || 'unknown_' + Math.random().toString(36).slice(2, 8)}.json`;
      archive.append(JSON.stringify(entry, null, 2), { name: fileName });
    }

    archive.finalize();
  });
}

async function sendBackup() {
  if (backupRunning) {
    console.log('Backup already running, skipping this cycle.');
    return;
  }

  backupRunning = true;
  const zipFileName = `user_data_${Date.now()}.zip`;
  const zipFilePath = path.join(__dirname, zipFileName);

  try {
    const userData = await getAllUserData();
    await createZipFromUserData(userData, zipFilePath);

    await bot.telegram.sendDocument(
      CHAT_ID,
      { source: zipFilePath },
      { caption: `Zip File Of Total ${userData.length} Users` }
    );

    console.log('User data backup sent successfully. Users:', userData.length);
  } catch (error) {
    console.error('Backup failed:', error.message || error);
  } finally {
    try {
      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
      }
    } catch (cleanupError) {
      console.error('Failed to remove temp zip:', cleanupError.message);
    }

    backupRunning = false;
  }
}

setInterval(sendBackup, BACKUP_INTERVAL_MS);

bot.launch().then(() => {
  console.log('db.js backup bot started. Interval:', BACKUP_INTERVAL_MS / 60000, 'minutes');
  sendBackup();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
