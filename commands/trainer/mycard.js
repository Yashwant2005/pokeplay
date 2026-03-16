const { getTrainerLevel, getUnclaimedLevels } = require('../../utils/trainer_rank_rewards');

function registerMycardCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('mycard', check, async (ctx) => {
  
    try {
      const loadAvatarWithFallback = async (paths) => {
        for (const pth of paths) {
          if (fs.existsSync(pth)) {
            return await loadImage(pth);
          }
        }
        return null;
      };
      const userId = ctx.from.id.toString();
  
      const userData = await getUserData(ctx.from.id)
  
      const background = await loadImage(bags[userData.inv.template || "1"]);
  
      const canvas = createCanvas(background.width, background.height);
  
      const ctxCanvas = canvas.getContext('2d');
  
      const fontSize = 45;
  
      const font = `${fontSize}px Cool`;

      const font2 = `55px Cool`;
  
      ctxCanvas.font = font;
  
      ctxCanvas.fillStyle = userData.inv.id || 'white';
  
  if(!userData.extra){
  
  userData.extra = {}
  
  }
  
  if(!userData.extra.date){
  
  const now = new Date();
  
    const year = now.getFullYear();
  
    const month = String(now.getMonth() + 1).padStart(2, '0');
  
    const day = String(now.getDate()).padStart(2, '0');
  
  userData.extra.date = `${day}/${month}/${year}`;
  
  await saveUserData2(ctx.from.id,userData)
  
  }
  
  if(!userData.inv.exp){
  
  userData.inv.exp =0
  
  }
  
  const level = getTrainerLevel(userData, trainerlevel, 100);
  
  if(!userData.inv.battle){
  
  userData.inv.battle = 0
  
  }
  
  if(!userData.inv.win){
  
  userData.inv.win = 0
  
  }
  
  if(!userData.inv.lose){
  
  userData.inv.lose = 0
  
  }
  
  const ht = userData.inv.hometown || 'Kanto'
  
  const caught = userData.pokecaught ? userData.pokecaught.length : 0
  
  const seen = userData.pokeseen ?userData.pokeseen.length : 0
  
  if(userData.inv.template*1 == 10){
  
  ctxCanvas.font = '45px Cool'
  
  ctxCanvas.drawImage(background,0,0)
  
  var date = new Date(userData.extra.date);
  
  var month = date.getMonth() + 1; // Add 1 because getMonth() returns zero-based month (0 for January)
  
  var day = date.getDate();
  
  var year = date.getFullYear() % 100; // Get the last two digits of the year
  
  var formattedDate = userData.extra.date
  
  const img = String(userData.inv.avtar || '1')

  let p = await loadAvatarWithFallback([
    "./cimages2/"+img+".png",
    "./cimages2/1.png",
    "./cimages/"+img+".png",
    "./cimages/1.png"
  ]);
  
  ctxCanvas.font = '50px Cool';
  
  ctxCanvas.fillStyle = userData.inv.data || 'black';
  
  ctxCanvas.fillText('ID : '+ctx.from.id+'',140,355)
  
  ctxCanvas.fillText('EXP. Points : '+userData.inv.exp.toLocaleString()+'',140,430)
  
  ctxCanvas.fillText('Trainer Level : '+level+'',140,505)
  
  //ctxCanvas.fillText('Total Wins : '+userData.inv.win+'',140,515)
  
  //ctxCanvas.fillText('Total Lose : '+userData.inv.lose+'',140,570)
  
  ctxCanvas.fillText('Poke Caught : '+caught+'/1025',140,580)
  
  ctxCanvas.fillText('Dex Entries : '+seen+'/1025',140,655)
  
  ctxCanvas.fillText('Joined : '+formattedDate+'',140,730)
  
  if (p) {
  ctxCanvas.drawImage(p, 825, 260, 375, 375);
} else {
  ctxCanvas.fillStyle = "#2b2f36";
  ctxCanvas.fillRect(825, 260, 375, 375);
  ctxCanvas.fillStyle = "#ffffff";
  ctxCanvas.font = "84px Cool";
  ctxCanvas.fillText("?", 995, 470);
}
  
  }else{
  
  const img = String(userData.inv.avtar || '1')

  let p = await loadAvatarWithFallback([
    "./cimages/"+img+".png",
    "./cimages/1.png",
    "./cimages2/"+img+".png",
    "./cimages2/1.png"
  ]);
  
  ctxCanvas.drawImage(background,0,0)
  
  ctxCanvas.fillText('Joined : '+userData.extra.date+'',90,280)
  
  ctxCanvas.fillText('User ID : '+ctx.from.id+'',730,280)
  
  ctxCanvas.font = font2;
  
  ctxCanvas.fillStyle = userData.inv.data || 'black';
  
  ctxCanvas.fillText('EXP. Points : '+userData.inv.exp.toLocaleString()+'',550,440)
  
  ctxCanvas.fillText('Trainer Level : '+level+'',550,510)
  
  ctxCanvas.fillText('Total Wins : '+userData.inv.win+'',550,580)
  
  ctxCanvas.fillText('Total Lose : '+userData.inv.lose+'',550,650)
  
  ctxCanvas.fillText('Poke Caught : '+caught+'/1025',550,720)
  
  ctxCanvas.fillText('Dex Entries : '+seen+'/1025',550,790)
  
  if (p) {
  ctxCanvas.drawImage(p, 37, 400, 400, 400);
} else {
  ctxCanvas.fillStyle = "#2b2f36";
  ctxCanvas.fillRect(37, 400, 400, 400);
  ctxCanvas.fillStyle = "#ffffff";
  ctxCanvas.font = "84px Cool";
  ctxCanvas.fillText("?", 215, 620);
}
  
  }
  
      if(!fs.existsSync('./images')){
      fs.mkdirSync('./images', { recursive: true });
    }
      const modifiedPhotoPath = `./images/modified_photo_${ctx.from.id}.jpg`;
  
      const writableStream = fs.createWriteStream(modifiedPhotoPath);
  
      canvas.createJPEGStream({ quality: 95 }).pipe(writableStream);
  
      writableStream.on('finish', async () => {

        const unclaimedRewards = getUnclaimedLevels(userData, trainerlevel);
        const buttons = [[{ text: 'More Info', callback_data: 'cardmore' }]];
        if (unclaimedRewards > 0) {
          buttons.push([{ text: 'Claim Rank Rewards (' + unclaimedRewards + ')', callback_data: 'trrank_claim_' + ctx.from.id }]);
        }
  
        // Send the modified photo back
  
        await sendMessage(ctx,ctx.chat.id,{ source: fs.readFileSync(modifiedPhotoPath) },{parse_mode:'markdown',reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:buttons}})
  
      });
  
    } catch (error) {
  
      console.log(error);
  
    }
  
  })
}

module.exports = registerMycardCommand;













