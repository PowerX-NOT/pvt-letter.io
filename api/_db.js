const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "love_letter";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "secrets";

let client;

async function getCollection() {
  if (!MONGODB_URI) throw new Error("Missing MONGODB_URI");
  if (!client) client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client.db(MONGODB_DB).collection(MONGODB_COLLECTION);
}

module.exports = { getCollection };
