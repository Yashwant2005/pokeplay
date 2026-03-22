const { getCollection } = require('./mongo');

const KV_COLLECTION = 'kv';

async function getKv(key, fallback) {
  const kv = await getCollection(KV_COLLECTION);
  const doc = await kv.findOne({ _id: key });
  if (!doc || typeof doc.value === 'undefined') {
    return fallback;
  }
  return doc.value;
}

async function setKv(key, value) {
  const kv = await getCollection(KV_COLLECTION);
  await kv.updateOne(
    { _id: key },
    {
      $set: { value, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
}

module.exports = {
  getKv,
  setKv
};
