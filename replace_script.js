const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let list = [];
  fs.readdirSync(dir).forEach(file => {
    let fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git')) {
      list = list.concat(walk(fullPath));
    } else {
      if (fullPath.endsWith('.js')) {
        list.push(fullPath);
      }
    }
  });
  return list;
};

const skips = ['convert.js', 'replace_script.js', 'trainer_rank_rewards.js', 'additem.js'];

const files = walk(__dirname);

for (const file of files) {
  if (skips.some(s => file.endsWith(s))) continue;

  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Code variables
  content = content.replace(/\.pc\b/g, '.vp');
  
  // Display labels
  content = content.replace(/PokeCoins/g, 'Victory Points');
  content = content.replace(/Pokecoins/g, 'Victory Points');
  content = content.replace(/PokeCoin/g, 'Victory Point');
  content = content.replace(/pokecoins/g, 'victory points');
  content = content.replace(/pokecoin/g, 'victory point');
  
  // Emoji (Pound note 💷 -> Lightning ⚡)
  content = content.replace(/💷/g, '⚡');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
}
