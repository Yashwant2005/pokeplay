function registerStartFlowCallbacks(bot, deps) {
  const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
  const {
    getUserData,
    regions,
    starters,
    editMessage,
    pokes,
    pokemoves,
    dmoves,
    stat,
    word,
    getRandomNature,
    growth_rates,
    chart,
    sendMessage,
    he,
    saveUserData22,
    c
  } = deps;

const STARTER_ABILITY_BY_TYPE = {
  fire: 'blaze',
  grass: 'overgrow',
  water: 'torrent'
};

bot.action(/staut_/,async ctx => {
const data = await getUserData(ctx.from.id)
if(data.pokes){
ctx.deleteMessage();
return
}
const ref = ctx.callbackQuery.data.split('_')[2]
if(ctx.callbackQuery.data.split('_')[1]=='back'){

const key = [[]];
    for (let i = 0; i < regions.length; i++) {
        if (i % 4 === 0) {
            key.push([]);
        }
        key[key.length - 1].push({ text: regions[i], callback_data: 'staut_' + regions[i] + '_'+ref+'' });
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*From Which Region You Wanna Start Your Journey?*',{reply_markup:{inline_keyboard:key},parse_mode:'markdown'})
return
}
const pokes = starters[ctx.callbackQuery.data.split('_')[1]]
const key = [[]]
for(let i = 0; i < pokes.length; i++){
key[0].push({text:pokes[i],callback_data:'choose_'+pokes[i]+'_'+ctx.callbackQuery.data.split('_')[1]+'_'+ref+''})
}
key.push([{text:'Back ⬅️',callback_data:'staut_back_'+ref+''}])
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*Which Poke You Wanna Choose As Your Starter*',{parse_mode:'markdown',reply_markup:{inline_keyboard:key}})
})
bot.action(/choose_/, async (ctx) => {
  const poke = ctx.callbackQuery.data.split('_')[1];
  const pokeName = poke.toLowerCase()
  const poked = pokes[pokeName]
const region = ctx.callbackQuery.data.split('_')[2];
const ref = ctx.callbackQuery.data.split('_')[3]
const data = await getUserData(ctx.from.id)
if(data.pokes){
ctx.deleteMessage();
return
}
  if (!poked) {
    ctx.answerCbQuery('n/a');
    return;
  }

const moves = pokemoves[pokeName]
if(!moves){
ctx.answerCbQuery('*This Poke Not Available*')
return
}
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at < 6 && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
const amoves = Math.floor(Math.random() * moves2.length)
  const randomMove = moves2[amoves];

  const iv = {
"hp":stat(pokeName),
"attack":stat(pokeName),
"defense":stat(pokeName),
"special_attack":stat(pokeName),
"special_defense":stat(pokeName),
"speed":stat(pokeName)
}

  const ev = {
"hp":0,
"attack":0,
"defense":0,
"special_attack":0,
"special_defense":0,
"speed":0
};
const pass2 = word(8)
const nat = getRandomNature()
const g = growth_rates[pokeName]
const exp = chart[g.growth_rate]["5"]
  const starterAbility = Array.isArray(poked.types)
    ? poked.types.map((type) => STARTER_ABILITY_BY_TYPE[String(type || '').toLowerCase()]).find(Boolean)
    : null;
  const da = {
    name:pokeName,
    id: poked.pokedex_number,
    nature:nat,
    ability:starterAbility || getRandomAbilityForPokemon(pokeName, pokes),
    held_item:'none',
    exp:exp,
    pass:pass2,
    ivs: iv,
    symbol: '',
    evs: ev,
    moves: [randomMove.id], // Push the randomly selected move ID
  };
if(!data.pokes){
data.pokes = []
}
data.inv = {
"pc":5000,
"region":"kanto",
"exp":0,
"avtar":"1",
"template":"1",
"id":"grey",
"data":"black"
}
data.balls = {
"regular":10,
"great":7,
"ultra":3
}
data.pokes.push(da)
const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
data.extra = {}
if(ref && ref.length > 0){
const data2 = await getUserData(ref)
await sendMessage(ctx,-1003069884900,'#refer\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) has used<b>'+data2.inv.name+'</b> (<code>'+ref+'</code>) refer link.',{parse_mode:'html'})
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'You Have Been Successfully Referred By <b>'+data2.inv.name+'</b>\nReach Level <b>20</b> To Complete Your Refer')
await sendMessage(ctx,ref,'<b>'+he.encode(ctx.from.first_name)+'</b> has used your refer link.\nYou will get reward when user reaches <b>Level 20</b>',{parse_mode:'HTML'})

data.extra.pending = ref
}
data.extra.date = `${day}/${month}/${year}`;
data.inv.hometown = region
await saveUserData22(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You Have Successfully Started Your Journey With *'+c(pokeName)+'*',{parse_mode:'markdown'})

});
bot.command('mypokemons',async ctx => {
const data = await getUserData(ctx.from.id)
if(!data.inv){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
reply_markup:{inline_keyboard:[[
{text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
return
}
let msg = '*✦ Your Pokemon List*\n'
const page = 1
const pageSize = 25
const startIdx = (page - 1) * pageSize;
const endIdx = startIdx + pageSize;
const pokemon2 = await sort(ctx.from.id,data.pokes)
const pokemon = pokemon2.slice(startIdx,endIdx)
msg += await pokelist(pokemon.map(item => item.pass),ctx,startIdx)
const key = []
const row = []
row.push({text:'<',callback_data:'pkege_'+(page-1)+'_'+ctx.from.id+''})
row.push({text:'>',callback_data:'pkege_'+(page+1)+'_'+ctx.from.id+''})
key.push(row)
const totalPages = Math.ceil(data.pokes.length / pageSize);
if(totalPages > 10){
const row = []
row.push({text:'(-5) <<',callback_data:'pkege_'+(page-5)+'_'+ctx.from.id+''})
row.push({text:'>> (+5)',callback_data:'pkege_'+(page+5)+'_'+ctx.from.id+''})
key.push(row)
}
if(totalPages > 40){
const row = []
row.push({text:'(-10) <<<',callback_data:'pkege_'+(page-10)+'_'+ctx.from.id+''})
row.push({text:'>>> (+10)',callback_data:'pkege_'+(page+10)+'_'+ctx.from.id+''})
key.push(row)
}
if(totalPages > 100){
const row = []
row.push({text:'(-25) <<<<',callback_data:'pkege_'+(page-25)+'_'+ctx.from.id+''})
row.push({text:'>>>> (+25)',callback_data:'pkege_'+(page+25)+'_'+ctx.from.id+''})
key.push(row)
}
const srt = data.extra.sort ? data.extra.sort : 'None'
const dis = data.extra.display ? data.extra.display : 'None'
msg += '\n\n*• Total Pokemons :* '+data.pokes.length+''
msg += '\n*• Displaying :* '+(dis)+''
msg += '\n*• Sorting Method :* '+c(srt)+''
await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg,{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:key}})
})
}

module.exports = registerStartFlowCallbacks;

