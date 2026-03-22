const { session } = require('telegraf');
const { getCollection } = require('./mongo');

const SESSION_COLLECTION = 'sessions';

function getSessionKey(ctx) {
  if (!ctx || !ctx.from) return null;
  const chat = ctx.chat || (ctx.callbackQuery && ctx.callbackQuery.message && ctx.callbackQuery.message.chat);
  if (!chat) return null;
  return `${chat.id}:${ctx.from.id}`;
}

function createMongoSession() {
  return session({
    getSessionKey,
    defaultSession: () => ({}),
    store: {
      async get(key) {
        if (!key) return undefined;
        try {
          const sessions = await getCollection(SESSION_COLLECTION);
          const doc = await sessions.findOne({ _id: key });
          return doc ? doc.data : undefined;
        } catch (error) {
          console.error('Session get failed:', error.message || error);
          return undefined;
        }
      },
      async set(key, value) {
        if (!key) return;
        try {
          const parts = String(key).split(':');
          const chatId = parts[0] || '';
          const userId = parts[1] || '';
          const sessions = await getCollection(SESSION_COLLECTION);
          await sessions.updateOne(
            { _id: key },
            {
              $set: {
                data: value || {},
                chatId: String(chatId),
                userId: String(userId),
                updatedAt: new Date()
              },
              $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
          );
        } catch (error) {
          console.error('Session set failed:', error.message || error);
        }
      },
      async delete(key) {
        if (!key) return;
        try {
          const sessions = await getCollection(SESSION_COLLECTION);
          await sessions.deleteOne({ _id: key });
        } catch (error) {
          console.error('Session delete failed:', error.message || error);
        }
      }
    }
  });
}

async function clearUserSessions(userId) {
  try {
    const sessions = await getCollection(SESSION_COLLECTION);
    const res = await sessions.deleteMany({ userId: String(userId) });
    return (res && res.deletedCount && res.deletedCount > 0) || false;
  } catch (error) {
    console.error('Failed clearing sessions for', userId, error.message || error);
    return false;
  }
}

async function getSessionStats() {
  const userSet = new Set();
  const chatSet = new Set();
  try {
    const sessions = await getCollection(SESSION_COLLECTION);
    const docs = await sessions.find({}, { projection: { userId: 1, chatId: 1 } }).toArray();
    for (const doc of docs) {
      if (doc.userId) userSet.add(String(doc.userId));
      if (doc.chatId) chatSet.add(String(doc.chatId));
    }
  } catch (error) {
    console.error('Failed reading session stats:', error.message || error);
  }
  return { userSet, chatSet };
}

module.exports = {
  createMongoSession,
  clearUserSessions,
  getSessionStats
};
