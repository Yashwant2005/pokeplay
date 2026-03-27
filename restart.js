const { exec } = require('child_process');

const INTERVAL_MS = 20 * 60 * 1000;
const CMD = 'pm2 restart all';

function runRestart() {
  const startedAt = new Date().toISOString();
  console.log(`[pm2-restart] Running "${CMD}" at ${startedAt}`);

  exec(CMD, (error, stdout, stderr) => {
    if (error) {
      console.error(`[pm2-restart] Command failed: ${error.message}`);
      return;
    }

    if (stdout && stdout.trim()) {
      console.log(`[pm2-restart] ${stdout.trim()}`);
    }

    if (stderr && stderr.trim()) {
      console.error(`[pm2-restart] ${stderr.trim()}`);
    }
  });
}

runRestart();
setInterval(runRestart, INTERVAL_MS);
