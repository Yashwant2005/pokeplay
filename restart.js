const { exec } = require('child_process');

const INTERVAL_MS = 4 * 60 * 1000;
const CMD = 'pm2 start pokeplay2';

function runRestart() {
  exec(CMD, (err, stdout, stderr) => {
    if (err) {
      console.error(`[pm2-restart] error: ${err.message}`);
      return;
    }
    if (stdout) console.log(`[pm2-restart] ${stdout.trim()}`);
    if (stderr) console.error(`[pm2-restart] ${stderr.trim()}`);
  });
}

runRestart();
setInterval(runRestart, INTERVAL_MS);
