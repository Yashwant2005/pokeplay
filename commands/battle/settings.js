function registerSettingsCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('settings',check,async ctx => {  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},`<b><u>Available Battle Settings Info -</u></b>  
    
  <b>• Max Pokemon:</b> Max number of pokemon each trainer can have.  
  <b>• Min / Max Legendaries:</b> Min / Max number of legendary pokemon each trainer can have.  
  <b>• Min / Max Level:</b> Each trainer pokemon level must be between this min & max level. Default: 1-100  
  <b>• Switch Pokemon:</b> Allow / Disallow to switch pokemon between battle.  
  <b>• Form Changes:</b> Allow / Disallow to use <code>Key Items</code> between battle.  
  <b>• Sandbox Mode:</b> If enabled, pokemon will NOT gain <code>EXP / EVs</code>.  
  <b>• Random Mode:</b> Both trainers team will be randomly generated depending on the conditions.  
  <b>• Preview Mode:</b> Enable / Disable to show pokemon image below / above  of the battle text.  
  <b>• Types Lock:</b> Only selected types pokemon can be used in battle or banned types can't be used in battle.  
  <b>• Regions Lock:</b> Only selected regions pokemon can be used in battle or banned region can't be used in battle.  
  <b>• Type Efficiency:</b> If disabled, all types will do x1 effect on all types.  
  <b>• Dual Types:</b> If disabled, multi types pokemon can't be used only single type pokemon can be used.  
    
  • <b><u>What Are These? :-</u></b>  
  <i>These are available <b>'Battle Settings ⚔'</b> option when you challenge someone</i>  
  `,{reply_to_message_id:ctx.message.message_id})  
  })
}

module.exports = registerSettingsCommand;

