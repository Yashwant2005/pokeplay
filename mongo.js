const { MongoClient } = require('mongodb');

require('dotenv').config();

const DEFAULT_DB_NAME = 'pokeplay2';

let client = null;
let db = null;
let connectPromise = null;

function getMongoUri() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://snowie:SnowieSoul@cluster0.rfz9edx.mongodb.net/';
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  return uri;
}

async function getDb() {
  if (db) return db;
  if (!connectPromise) {
    const uri = getMongoUri();
    const dbName = process.env.MONGODB_DB || DEFAULT_DB_NAME;
    const maxPool = Math.max(1, Number(process.env.MONGO_POOL_MAX || process.env.MONGODB_POOL_MAX || 50));
    const minPool = Math.max(0, Number(process.env.MONGO_POOL_MIN || process.env.MONGODB_POOL_MIN || 5));
    client = new MongoClient(uri, {
      maxPoolSize: maxPool,
      minPoolSize: Math.min(minPool, maxPool),
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true
    });
    connectPromise = client.connect().then(() => {
      db = client.db(dbName);
      // Auto-reconnect: if the topology closes unexpectedly, reset so next
      // call to getDb() creates a fresh connection instead of hanging forever.
      client.on('topologyClosed', () => {
        console.warn('[mongo] topology closed — will reconnect on next request');
        db = null;
        connectPromise = null;
      });
      return db;
    });
  }
  return connectPromise;
}

async function getCollection(name) {
  const database = await getDb();
  return database.collection(name);
}

async function ensureIndexes() {
  const users = await getCollection('users');
  await users.createIndex({ updatedAt: 1 });

  const battles = await getCollection('battles');
  await battles.createIndex({ updatedAt: 1 });

  const kv = await getCollection('kv');
  await kv.createIndex({ updatedAt: 1 });

  const sessions = await getCollection('sessions');
  await sessions.createIndex({ userId: 1 });
  await sessions.createIndex({ chatId: 1 });

  const ttlDays = Number(process.env.SESSION_TTL_DAYS || 30);
  if (Number.isFinite(ttlDays) && ttlDays > 0) {
    await sessions.createIndex(
      { updatedAt: 1 },
      { expireAfterSeconds: Math.floor(ttlDays * 24 * 60 * 60) }
    );
  }
}

module.exports = {
  getDb,
  getCollection,
  ensureIndexes,
  closeMongo
};

async function closeMongo() {
  try {
    if (client) {
      await client.close();
    }
  } catch (error) {
    console.error('Failed closing Mongo client:', error.message || error);
  } finally {
    client = null;
    db = null;
    connectPromise = null;
  }
}
