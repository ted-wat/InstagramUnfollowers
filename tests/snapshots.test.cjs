const assert = require("node:assert/strict");
const test = require("node:test");
if (!globalThis.crypto) globalThis.crypto = require("node:crypto").webcrypto;
const {
  snapshotUser, makeSnapshot, pastUnfollowers, parseMetaExport,
  listSnapshots, saveSnapshot, importSnapshots, exportSnapshots,
} = require("../src/utils/snapshots.ts");

const owner = "314159265358979323846";
const user = (id, username, extra = {}) => snapshotUser({ id, username, ...extra });
const snap = (time, followers, following, ownerId = owner) =>
  makeSnapshot(ownerId, "Scan " + time, time, followers, following);
const file = (name, data) => ({ name, data });
const entry = (value, extra = {}) => ({ title: "", string_list_data: [{ value, timestamp: 123 }], ...extra });
const followingFile = rows => file("following.json", { relationships_following: rows });
class TestStorage {
  values = new Map();
  get length() { return this.values.size; }
  key(index) { return Array.from(this.values.keys())[index] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}
test("exact four-set intersection uses current metadata and protects across renames", () => {
  const old = user("90071992547409931234", "former");
  const renamed = user(old.id, "current", { full_name: "Current Name", is_verified: true });
  const stayed = user("2", "mutual");
  const stayedRenamed = user(stayed.id, "mutual2");
  const never = user("3", "never");
  const stoppedFollowing = user("4", "gone");
  const protectedBefore = user("5", "safe");
  const protectedAfter = user("5", "safe_new");
  const sameNameNewId = user("6", "former");
  const baseline = snap(1, [old, stayed, stoppedFollowing, protectedBefore], []);
  const comparison = snap(2, [stayedRenamed], [never, renamed, sameNameNewId, protectedAfter, stayedRenamed, renamed]);
  assert.deepEqual(pastUnfollowers(baseline, comparison, [protectedBefore]), [renamed]);
  assert.deepEqual(pastUnfollowers(baseline, comparison, [
    protectedBefore, { id: "pasted_former_1", username: "FORMER" },
  ]), []);
});
test("numeric ids from pk, pk_id and id retain precision; names cannot be IDs", () => {
  const exact = "9223372036854775807";
  assert.equal(snapshotUser({ pk_id: exact, pk: Number(exact), username: "12345" }).id, exact);
  assert.equal(snapshotUser({ pk: 14, username: "abc" }).id, "14");
  assert.throws(() => snapshotUser({ pk: Number(exact), username: "name" }), /precision/);
  for (const id of ["", "00", "0", -5, "pasted_1", "2.7", "2e10", "__proto__"]) {
    assert.throws(() => user(id, "12345"));
  }
  assert.throws(() => snapshotUser({ username: "12345" }), /numeric user ID/);
  assert.throws(() => snapshotUser({ pk: 4, id: "5", username: "name" }), /conflicting/);
  assert.throws(() => snapshotUser({ pk: Number(exact), pk_id: "5", username: "name" }), /conflicting/);
});
test("snapshot copies complete records, deduplicates by ID, and isolates captures", () => {
  const live = { id: "1", username: "old" };
  const s = snap(1, [live, live], [live]);
  live.username = "alice";
  assert.deepEqual(Object.keys(s.followers), ["1"]);
  assert.equal(s.followers["1"].username, "old");
  assert.ok(Object.isFrozen(s.followers["1"]) && Object.isFrozen(s.followers));
  assert.equal(s.source, "live");
});
test("empty sets, reverse chronology, equal times, and foreign accounts", () => {
  const a = snap(1, [], []);
  const b = snap(2, [], []);
  assert.deepEqual(pastUnfollowers(a, b, []), []);
  for (const [t0, t1] of [[b,a], [a,a], [a,snap(1,[],[])], [a,snap(2,[],[],"15")]]) {
    assert.throws(() => pastUnfollowers(t0, t1, []));
  }
});
test("round-trip preserves ID-keyed snapshots including metadata and isolates owners", () => {
  const storage = new TestStorage();
  const u = user("12", "account", { profile_pic_url: "photo", full_name: "Account", is_private: true });
  const a = snap(2, [u], []);
  const b = snap(1, [], [u]);
  const other = snap(3, [], [], "9");
  for (const value of [a,b,other,a]) saveSnapshot(value, storage);
  assert.deepEqual(listSnapshots(owner, storage), [b,a]);
  assert.deepEqual(listSnapshots("9", storage), [other]);
  const json = exportSnapshots(owner, storage);
  const restored = new TestStorage();
  assert.equal(importSnapshots(owner, json, restored), 2);
  assert.equal(importSnapshots(owner, json, restored), 0);
  assert.equal(exportSnapshots(owner, restored), json);
  assert.throws(() => importSnapshots("9", json, restored), /another account/);
});
test("corrupt or conflicting backups and quota errors preserve existing state atomically", () => {
  const storage = new TestStorage();
  const existing = snap(1, [], []);
  saveSnapshot(existing, storage);
  const backup = exportSnapshots(owner, storage);
  for (const invalid of [
    { ...existing, complete: false }, { ...existing, ownerId: "77" },
    { ...existing, followers: null }, { ...existing, key: null },
    { ...existing, label: "overwrite" },
    { ...existing, followers: { "3": { ...user("2", "x") } } },
    { ...existing, followers: { "2": { id: "2", username: "x" } } },
  ]) {
    const env = JSON.parse(backup);
    env.snapshots = [snap(3, [], []), invalid];
    assert.throws(() => importSnapshots(owner, JSON.stringify(env), storage));
    assert.equal(exportSnapshots(owner, storage), backup);
  }
  storage.setItem = () => { throw new Error("quota exceeded"); };
  assert.throws(() => saveSnapshot(snap(2, [], []), storage), /quota/);
  assert.equal(exportSnapshots(owner, storage), backup);
});
test("standard split Meta exports are reviewable; handle, numeric name, URL, and time never establish an ID", () => {
  const report = parseMetaExport(owner, "Export", 999999, [
    file("followers_2.json", [entry("12345")]),
    followingFile([{ title: "ig.followed", string_list_data: [{ href: "https://www.instagram.com/_u/ig.followed", timestamp: 123 }] }]),
    file("followers_1.json", [entry("follower"), entry("known", { pk: "10" })]),
  ]);
  assert.equal(report.snapshot, null);
  assert.deepEqual(report.unresolved, { followers: ["12345", "follower"], following: ["ig.followed"] });
  assert.deepEqual(report.counts, { followers: 3, following: 1 });
  const hrefOnly = parseMetaExport(owner, "Export", 999999, [
    file("followers_1.json", [{ string_list_data: [{ href: "https://www.instagram.com/12345/" }] }]), followingFile([]),
  ]);
  assert.deepEqual(hrefOnly.unresolved.followers, ["12345"]);
});
test("Meta imports with explicit IDs support historical comparison with live snapshots", () => {
  const report = parseMetaExport(owner, "Export", 100, [
    followingFile([entry("abc", { user_id: "90071992547409930" })]),
    file("followers_1.json", [{ title: "old", string_list_data: [{ id: "90071992547409930" }] }]),
  ]);
  assert.equal(report.snapshot.source, "meta");
  assert.equal(report.snapshot.capturedAt, 100);
  assert.equal(report.snapshot.followers["90071992547409930"].username, "old");
  const current = user("90071992547409930", "new");
  assert.deepEqual(pastUnfollowers(report.snapshot, snap(200, [], [current]), []), [current]);
});
test("missing parts, duplicate parts, malformed relationship lists and conflicting IDs cannot create snapshots", () => {
  const followers = file("followers_1.json", []);
  const following = followingFile([]);
  const malformedRows = [entry("hi", { id: "1", string_list_data: [{ id: "2", value: "hi" }] })];
  for (const group of [
    [following], [followers], [following, followers, file("followers_3.json", [])],
    [following, followers, followers], [following, file("followers_1.json", {})],
    [file("following.json", {}), followers], [following, file("followers_1.json", malformedRows)],
    [following, file("followers_1.json", [{ string_list_data: [] }])],
  ]) assert.throws(() => parseMetaExport(owner, "Export", 999999, group));
});
