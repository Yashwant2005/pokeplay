const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const DEFAULT_DB_NAME = 'pokeplay2';

function getMongoUri() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!uri) {
    throw new Error('MONGODB_URI is not set in .env');
  }
  return uri;
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

function mergeUniquePrimitiveArrays(left, right) {
  const out = [];
  for (const list of [left, right]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!out.includes(item)) out.push(item);
    }
  }
  return out;
}

function mergePokemonLists(latestList, incomingList) {
  const latest = Array.isArray(latestList) ? latestList : [];
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  const merged = [];
  const indexByPass = new Map();
  for (const poke of latest) {
    const pass = String((poke && poke.pass) || '');
    if (!pass) continue;
    indexByPass.set(pass, merged.length);
    merged.push(poke);
  }
  for (const poke of incoming) {
    const pass = String((poke && poke.pass) || '');
    if (!pass) continue;
    if (indexByPass.has(pass)) {
      merged[indexByPass.get(pass)] = poke;
    } else {
      indexByPass.set(pass, merged.length);
      merged.push(poke);
    }
  }
  return merged;
}

function mergeTeams(latestTeams, incomingTeams, validPasses) {
  const latest = latestTeams && typeof latestTeams === 'object' ? latestTeams : {};
  const incoming = incomingTeams && typeof incomingTeams === 'object' ? incomingTeams : {};
  const mergedTeams = { ...latest };

  for (const key of Object.keys(incoming)) {
    const list = Array.isArray(incoming[key]) ? incoming[key] : [];
    mergedTeams[key] = [...new Set(list.map((pass) => String(pass)))]
      .filter((pass) => validPasses.has(String(pass)));
  }

  for (const key of Object.keys(mergedTeams)) {
    if (!Array.isArray(mergedTeams[key])) mergedTeams[key] = [];
    mergedTeams[key] = [...new Set(mergedTeams[key].map((pass) => String(pass)))]
      .filter((pass) => validPasses.has(String(pass)));
  }

  return mergedTeams;
}

function mergeUserDataForSave(latestData, incomingData) {
  const latest = latestData && typeof latestData === 'object' ? latestData : {};
  const incoming = incomingData && typeof incomingData === 'object' ? incomingData : {};
  const replacePokes = Boolean(incoming._replacePokes || incoming.__replacePokes);

  const merged = {
    ...latest,
    ...incoming,
    inv: { ...(latest.inv || {}), ...(incoming.inv || {}) },
    balls: { ...(latest.balls || {}), ...(incoming.balls || {}) },
    extra: { ...(latest.extra || {}), ...(incoming.extra || {}) },
    settings: { ...(latest.settings || {}), ...(incoming.settings || {}) },
    tms: { ...(latest.tms || {}), ...(incoming.tms || {}) }
  };

  merged.pokes = replacePokes
    ? (Array.isArray(incoming.pokes) ? incoming.pokes : [])
    : mergePokemonLists(latest.pokes, incoming.pokes);

  merged.pokecaught = mergeUniquePrimitiveArrays(latest.pokecaught, incoming.pokecaught);
  merged.pokeseen = mergeUniquePrimitiveArrays(latest.pokeseen, incoming.pokeseen);

  const validPasses = new Set((merged.pokes || [])
    .map((poke) => String((poke && poke.pass) || ''))
    .filter(Boolean));

  merged.teams = mergeTeams(latest.teams, incoming.teams, validPasses);

  delete merged._replacePokes;
  delete merged.__replacePokes;

  return merged;
}

function normalizeBackupPayload(raw) {
  if (!raw || typeof raw !== 'object') return { data: {}, reset: false };
  if (raw.data && typeof raw.data === 'object') {
    return {
      data: raw.data || {},
      reset: Boolean(raw.reset),
      user_id: raw.user_id || raw.userId || raw._id,
      userId: raw.userId || raw.user_id || raw._id
    };
  }
  return { data: raw, reset: false };
}

async function promptInput(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

function parseArgs(argv) {
  const args = { backup: '', uid: '', mode: '' };
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    const next = argv[i + 1];
    if (key === '--backup' && next) {
      args.backup = next;
      i++;
    } else if (key === '--uid' && next) {
      args.uid = next;
      i++;
    } else if (key === '--mode' && next) {
      args.mode = next;
      i++;
    }
  }
  return args;
}

function normalizePath(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (!trimmed) return '';
  return trimmed.replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '');
}

function resolveUserFile(backupPath, uid) {
  if (!backupPath) return '';
  const clean = normalizePath(backupPath);
  if (!clean) return '';
  const lower = clean.toLowerCase();

  if (lower.endsWith('.json')) return clean;
  if (lower.endsWith(`${path.sep}users`)) return path.join(clean, `${uid}.json`);
  return path.join(clean, 'users', `${uid}.json`);
}

async function main() {
  const args = parseArgs(process.argv);

  const envBackup = process.env.BACKUP_ROOT || process.env.BACKUP_DIR || process.env.BACKUP_PATH || '';
  const backupPath = normalizePath(args.backup || envBackup);
  const uidInput = normalizePath(args.uid);
  const modeInput = normalizePath(args.mode).toLowerCase();

  const backupRoot = backupPath || await promptInput('Backup folder path (the folder that contains \\users): ');
  if (!backupRoot) throw new Error('Backup folder path is required.');

  const uid = uidInput || await promptInput('User ID to restore: ');
  if (!uid) throw new Error('User ID is required.');

  const mode = modeInput || (await promptInput('Mode (merge/replace) [merge]: ')).toLowerCase() || 'merge';
  if (mode !== 'merge' && mode !== 'replace') {
    throw new Error('Mode must be merge or replace.');
  }

  const userFile = resolveUserFile(backupRoot, uid);
  if (!userFile || !fs.existsSync(userFile)) {
    throw new Error(`Backup file not found: ${userFile || '(empty path)'}`);
  }

  const raw = JSON.parse(fs.readFileSync(userFile, 'utf8'));
  const backup = normalizeBackupPayload(raw);

  const uri = getMongoUri();
  const dbName = process.env.MONGODB_DB || DEFAULT_DB_NAME;

  const client = new MongoClient(uri, {
    maxPoolSize: Math.max(1, Number(process.env.MONGO_POOL_MAX || process.env.MONGODB_POOL_MAX || 50)),
    minPoolSize: Math.max(0, Number(process.env.MONGO_POOL_MIN || process.env.MONGODB_POOL_MIN || 5)),
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true
  });

  await client.connect();
  const db = client.db(dbName);
  const users = db.collection('users');

  const key = String(uid);
  const existing = await users.findOne({ _id: key });
  const existingData = existing && existing.data ? existing.data : {};

  const mergedData = mode === 'replace'
    ? cloneJson(backup.data || {})
    : mergeUserDataForSave(existingData, backup.data || {});

  const update = {
    $set: {
      user_id: key,
      userId: key,
      data: mergedData,
      reset: Boolean(backup.reset),
      updatedAt: new Date()
    },
    $setOnInsert: { createdAt: new Date() }
  };

  await users.updateOne({ _id: key }, update, { upsert: true });

  await client.close();

  console.log(`Restored user ${key} with mode=${mode}. File: ${userFile}`);
}

main().catch((err) => {
  console.error('Restore failed:', err.message || err);
  process.exitCode = 1;
});
