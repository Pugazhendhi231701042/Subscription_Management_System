import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const databasePath = resolve(process.env.DATABASE_PATH || "./data/brightloop.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (collection, id)); CREATE INDEX IF NOT EXISTS records_collection ON records(collection); CREATE UNIQUE INDEX IF NOT EXISTS unique_user_email ON records(json_extract(data, '$.email')) WHERE collection='users'; CREATE UNIQUE INDEX IF NOT EXISTS unique_google_sub ON records(json_extract(data, '$.googleSub')) WHERE collection='users' AND json_extract(data, '$.googleSub') IS NOT NULL; CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);");
const readAll = db.prepare("SELECT data FROM records WHERE collection = ?");
const writeRow = db.prepare("INSERT INTO records(collection,id,data) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data");
const deleteRow = db.prepare("DELETE FROM records WHERE collection=? AND id=?");
const stamp = () => new Date().toISOString();
const jsonCopy = (value) => JSON.parse(JSON.stringify(value));
const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const asComparable = (value) => value instanceof Date ? value.getTime() : typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) ? Date.parse(value) : value;
function matchesValue(actual, expected) {
  if (expected && typeof expected === "object" && !(expected instanceof Date) && !Array.isArray(expected)) {
    return Object.entries(expected).every(([operator, value]) => {
      const a = asComparable(actual), b = asComparable(value);
      if (operator === "$exists") return value ? actual !== undefined : actual === undefined;
      if (operator === "$regex") { const regex = new RegExp(value, expected.$options || ""); return regex.test(String(actual ?? "")); }
      if (operator === "$in") return value.some((item) => String(item) === String(actual));
      if (operator === "$nin") return !value.some((item) => String(item) === String(actual));
      if (operator === "$gt") return a > b;
      if (operator === "$gte") return a >= b;
      if (operator === "$lt") return a < b;
      if (operator === "$lte") return a <= b;
      if (operator === "$ne") return String(actual) !== String(value);
      if (operator === "$type") return value === "date" ? !Number.isNaN(Date.parse(actual)) : typeof actual === value;
      if (operator === "$regex") return new RegExp(value, expected.$options || "").test(String(actual ?? ""));
      if (operator === "$options") return true;
      return false;
    });
  }
  if (Array.isArray(actual)) return actual.some((item) => matchesValue(item, expected));
  const a = asComparable(actual), b = asComparable(expected);
  return typeof a === "number" && typeof b === "number" ? a === b : String(a) === String(b);
}
function matches(record, filter = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === "$or") return expected.some((part) => matches(record, part));
    if (key === "$and") return expected.every((part) => matches(record, part));
    return matchesValue(getPath(record, key), expected);
  });
}
function save(collection, record) {
  const value = jsonCopy(record);
  value._id = String(value._id || randomUUID());
  value.createdAt ||= stamp();
  value.updatedAt = stamp();
  writeRow.run(collection, value._id, JSON.stringify(value));
  return value;
}
function document(collection, record) {
  if (!record) return null;
  const value = jsonCopy(record);
  Object.defineProperty(value, "save", { enumerable: false, value: async function () { Object.assign(this, save(collection, this)); return this; } });
  Object.defineProperty(value, "toObject", { enumerable: false, value: function () { return jsonCopy(this); } });
  return value;
}
class Query {
  constructor(collection, filter, mode = "many", id = null) { this.collection = collection; this.filter = filter || {}; this.mode = mode; this.id = id; this.sortBy = null; this.offset = 0; this.max = Infinity; this.plain = false; }
  sort(spec) { this.sortBy = spec; return this; }
  skip(value) { this.offset = Number(value) || 0; return this; }
  limit(value) { this.max = Number(value) || Infinity; return this; }
  select() { return this; }
  lean() { this.plain = true; return this; }
  async exec() {
    let rows = readAll.all(this.collection).map((row) => JSON.parse(row.data));
    rows = rows.filter((row) => this.id !== null ? String(row._id) === String(this.id) : matches(row, this.filter));
    if (this.sortBy) rows.sort((a, b) => { for (const [key, direction] of Object.entries(this.sortBy)) { const av = asComparable(getPath(a, key)) ?? "", bv = asComparable(getPath(b, key)) ?? ""; if (av < bv) return -direction; if (av > bv) return direction; } return 0; });
    rows = rows.slice(this.offset, this.offset + this.max);
    let result = this.mode === "one" ? rows[0] || null : rows;
    if (this.mode === "one") return result ? this.plain ? result : document(this.collection, result) : null;
    return this.plain ? result : result.map((row) => document(this.collection, row));
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
}
function makeModel(collection) {
  return {
    find: (filter = {}) => new Query(collection, filter), findOne: (filter = {}) => new Query(collection, filter, "one"),
    findById: (id) => new Query(collection, {}, "one", id),
    countDocuments: async (filter = {}) => readAll.all(collection).map((row) => JSON.parse(row.data)).filter((row) => matches(row, filter)).length,
    exists: async (filter = {}) => (await new Query(collection, filter, "one").exec()) ? { _id: (await new Query(collection, filter, "one").exec())._id } : null,
    create: async (record) => document(collection, save(collection, record)),
    insertMany: async (records) => records.map((record) => document(collection, save(collection, record))),
    findByIdAndUpdate: async (id, update) => { const old = JSON.parse(readAll.all(collection).map((r) => r.data).find((data) => String(JSON.parse(data)._id) === String(id)) || "null"); if (!old) return null; Object.assign(old, update.$set || update); return document(collection, save(collection, old)); },
    findByIdAndDelete: async (id) => { const row = readAll.all(collection).map((r) => JSON.parse(r.data)).find((x) => String(x._id) === String(id)); if (row) deleteRow.run(collection, String(id)); return row ? document(collection, row) : null; },
    deleteMany: async (filter = {}) => { const toDelete = readAll.all(collection).map((r) => JSON.parse(r.data)).filter((x) => matches(x, filter)); for (const item of toDelete) deleteRow.run(collection, String(item._id)); return { deletedCount: toDelete.length }; },
    updateOne: async (filter, update, options = {}) => { let row = readAll.all(collection).map((r) => JSON.parse(r.data)).find((x) => matches(x, filter)); if (!row && options.upsert) row = { ...filter, ...(update.$setOnInsert || {}) }; if (!row) return { matchedCount: 0, modifiedCount: 0 }; Object.assign(row, update.$set || {}); for (const [key, value] of Object.entries(update.$inc || {})) row[key] = Number(row[key] || 0) + Number(value); save(collection, row); return { matchedCount: 1, modifiedCount: 1 }; },
    updateMany: async (filter, update) => { let count = 0; for (const raw of readAll.all(collection)) { const row = JSON.parse(raw.data); if (!matches(row, filter)) continue; Object.assign(row, update.$set || {}); for (const [key, value] of Object.entries(update.$inc || {})) row[key] = Number(row[key] || 0) + Number(value); save(collection, row); count++; } return { matchedCount: count, modifiedCount: count }; }
  };
}
export const models = {};
export async function initializeDatabase(names, fixtures, bootstrapAdmin, allowBootstrap = true) {
  for (const name of names) models[name] ||= makeModel(name);
  const migration = db.prepare("SELECT value FROM app_meta WHERE key=?").get("single-master-admin-v1");
  let createdAdmin = false;
  const admins = readAll.all("users").map((row) => JSON.parse(row.data)).filter((user) => user.role === "admin");
  if (!admins.length) {
    if (!allowBootstrap) throw new Error("Set MASTER_ADMIN_PASSWORD before initializing a database without an admin account.");
    save("users", bootstrapAdmin); createdAdmin = true;
  }
  if (!migration) db.prepare("INSERT INTO app_meta(key,value) VALUES(?,?)").run("single-master-admin-v1", "complete");
  console.log(`SQLite database ready: ${databasePath}`);
  return { createdAdmin };
}