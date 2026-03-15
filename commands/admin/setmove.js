function registerSetMoveCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });

  function normalizeMoveName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function resolveMoveId(input) {
    const raw = String(input || '').trim();
    if (!raw) return null;

    // Allow direct move ID usage if it exists.
    if (dmoves[raw]) return raw;

    const target = normalizeMoveName(raw);
    for (const [id, move] of Object.entries(dmoves)) {
      if (normalizeMoveName(move && move.name) === target) {
        return id;
      }
    }

    return null;
  }

  bot.command('setmove', async (ctx) => {
    if (!admins.includes(ctx.from.id)) {
      return;
    }

    const reply = ctx.message.reply_to_message;
    const args = String(ctx.message.text || '').trim().split(/\s+/).slice(1);

    if (!reply || args.length !== 5) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Usage:* Reply to user and send `/setmove <pkmnname> <move> <move> <move> <move>`\nUse `_` or `-` for multi-word move names (example: `ice_punch`).',
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    const pokemonName = args[0].toLowerCase().replace(/\s+/g, '-');
    const moveInputs = args.slice(1, 5);

    const data = await getUserData(reply.from.id);
    if (!data.pokes || !Array.isArray(data.pokes) || data.pokes.length < 1) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Target user has no Pokemon.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const targetPokemon = data.pokes.find((p) => String(p.name || '').toLowerCase() === pokemonName);
    if (!targetPokemon) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Pokemon not found on target user by that name.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    const moveIds = [];
    const invalidMoves = [];
    for (const moveInput of moveInputs) {
      const moveId = resolveMoveId(moveInput);
      if (!moveId) {
        invalidMoves.push(moveInput);
      } else {
        moveIds.push(moveId);
      }
    }

    if (invalidMoves.length > 0) {
      await sendMessage(
        ctx,
        ctx.chat.id,
        { parse_mode: 'markdown' },
        '*Invalid move name(s):* ' + invalidMoves.join(', '),
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }

    if (new Set(moveIds).size !== 4) {
      await sendMessage(ctx, ctx.chat.id, { parse_mode: 'markdown' }, '*Moves must be 4 unique moves.*', { reply_to_message_id: ctx.message.message_id });
      return;
    }

    targetPokemon.moves = moveIds;
    await saveUserData2(reply.from.id, data);

    const moveNames = moveIds.map((id) => c(dmoves[id].name)).join(', ');
    await sendMessage(
      ctx,
      ctx.chat.id,
      { parse_mode: 'markdown' },
      'Updated *' + c(targetPokemon.name) + '* moves for *' + c(reply.from.first_name || reply.from.id) + '*\nNew moves: ' + moveNames,
      { reply_to_message_id: ctx.message.message_id }
    );
  });
}

module.exports = registerSetMoveCommand;
