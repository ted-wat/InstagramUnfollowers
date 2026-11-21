import { createWhitelistMatcher } from './utils';

export interface SnapshotUser {
  readonly id: string;
  readonly username: string;
  readonly full_name: string;
  readonly profile_pic_url: string;
  readonly is_verified: boolean;
  readonly is_private: boolean;
}

type Members = Readonly<Partial<Record<string, SnapshotUser>>>;

export interface Snapshot {
  readonly key: string;
  readonly ownerId: string;
  readonly capturedAt: number;
  readonly label: string;
  readonly source: 'live' | 'meta';
  readonly complete: true;
  readonly followers: Members;
  readonly following: Members;
}

export interface MetaFile {
  readonly name: string;
  readonly data: unknown;
}

const namespace = 'iu_snapshots_v1';
const numericId = /^[1-9]\d*$/;
const usernamePattern = /^[a-zA-Z0-9._]{1,30}$/;
const optionalMetadata = ['full_name', 'profile_pic_url', 'is_verified', 'is_private'] as const;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected a JSON object.');
  }
  return value as Record<string, unknown>;
}

function validateOwner(id: string): void {
  if (typeof id !== 'string' || !numericId.test(id)) {
    throw new Error('A numeric account ID is required.');
  }
}

function validateTime(time: unknown): number {
  if (typeof time !== 'number' || !Number.isSafeInteger(time) || time <= 0 || !Number.isFinite(new Date(time).getTime())) {
    throw new Error('A valid snapshot capture time is required.');
  }
  return time;
}

function labelFor(label: string, capturedAt: number): string {
  if (typeof label !== 'string' || label.length > 256) {
    throw new Error('Snapshot labels must be text of up to 256 characters.');
  }
  return label.trim() || new Date(capturedAt).toISOString();
}

function uniqueKey(): string {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join('-');
}

// A rounded numeric pk cannot recover its original digits. Prefer an exact string
// supplied alongside that number. Disagreeing exact identifiers are ambiguous.
function readId(row: Record<string, unknown>): string | undefined {
  let result: string | undefined;
  const rounded: number[] = [];
  for (const field of ['pk_id', 'pk', 'user_id', 'id']) {
    const value = row[field];
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'number' && Number.isInteger(value) && value > Number.MAX_SAFE_INTEGER) {
      rounded.push(value);
      continue;
    }
    const id = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
    if (typeof id !== 'string' || !numericId.test(id) || (result && id !== result)) {
      throw new Error('Invalid or conflicting numeric user ID.');
    }
    result = id;
  }
  if (rounded.length > 0) {
    if (!result) {
      throw new Error('Numeric user ID lost precision. An exact ID string is required.');
    }
    if (rounded.some(value => value !== Number(result))) {
      throw new Error('Invalid or conflicting numeric user ID.');
    }
  }
  return result;
}

export function snapshotUser(raw: unknown): SnapshotUser {
  const row = object(raw);
  const id = readId(row);
  if (!id) {
    throw new Error('An account is missing its numeric user ID.');
  }
  if (typeof row.username !== 'string' || !usernamePattern.test(row.username)) {
    throw new Error('An account has an invalid username.');
  }
  for (const field of optionalMetadata) {
    const value = row[field];
    const expected = field === 'is_verified' || field === 'is_private' ? 'boolean' : 'string';
    if (value != null && typeof value !== expected) {
      throw new Error('Invalid account field: ' + field);
    }
  }
  return Object.freeze({
    id,
    username: row.username,
    full_name: typeof row.full_name === 'string' ? row.full_name : '',
    profile_pic_url: typeof row.profile_pic_url === 'string' ? row.profile_pic_url : '',
    is_verified: row.is_verified === true,
    is_private: row.is_private === true,
  });
}

function indexMembers(users: readonly SnapshotUser[]): Members {
  const index: Record<string, SnapshotUser> = Object.create(null);
  for (const raw of users) {
    const user = snapshotUser(raw);
    index[user.id] = user;
  }
  return Object.freeze(index);
}

export function makeSnapshot(
  ownerId: string, label: string, capturedAt: number,
  followers: readonly SnapshotUser[], following: readonly SnapshotUser[],
  source: Snapshot['source'] = 'live',
): Snapshot {
  validateOwner(ownerId);
  validateTime(capturedAt);
  return Object.freeze({
    key: uniqueKey(), ownerId, capturedAt, label: labelFor(label, capturedAt), source, complete: true as const,
    followers: indexMembers(followers), following: indexMembers(following),
  });
}

// All records inside a native snapshot must have all six stored fields. Accept
// empty lists, but never manufacture an empty list from missing or malformed data.
function readMembers(data: unknown): Members {
  const members = object(data);
  const index: Record<string, SnapshotUser> = Object.create(null);
  for (const key of Object.keys(members)) {
    const row = object(members[key]);
    if (row.id !== key || optionalMetadata.some(field => row[field] == null)) {
      throw new Error('Snapshot member fields or ID key are invalid.');
    }
    index[key] = snapshotUser(row);
  }
  return Object.freeze(index);
}

function readSnapshot(ownerId: string, data: unknown): Snapshot {
  const row = object(data);
  if (row.ownerId !== ownerId) {
    throw new Error('Snapshot belongs to another account.');
  }
  if (row.complete !== true || (row.source !== 'live' && row.source !== 'meta')) {
    throw new Error('A complete snapshot with a recognised source is required.');
  }
  if (typeof row.key !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(row.key) || typeof row.label !== 'string') {
    throw new Error('Invalid snapshot key or label.');
  }
  const capturedAt = validateTime(row.capturedAt);
  return Object.freeze({
    key: row.key, ownerId, capturedAt, label: labelFor(row.label, capturedAt), source: row.source, complete: true as const,
    followers: readMembers(row.followers), following: readMembers(row.following),
  });
}

function readEnvelope(ownerId: string, text: string): Snapshot[] {
  const env = object(JSON.parse(text));
  if (env.format !== namespace || env.version !== 1 || !Array.isArray(env.snapshots)) {
    throw new Error('Unrecognised snapshot backup format or version.');
  }
  if (env.ownerId !== ownerId) {
    throw new Error('Snapshot backup belongs to another account.');
  }
  return env.snapshots.map(snapshot => readSnapshot(ownerId, snapshot));
}

function envelope(ownerId: string, snapshots: readonly Snapshot[]): string {
  return JSON.stringify({ format: namespace, version: 1, ownerId, snapshots });
}

function sameMembers(left: Members, right: Members): boolean {
  const ids = Object.keys(left);
  return ids.length === Object.keys(right).length && ids.every(id => JSON.stringify(left[id]) === JSON.stringify(right[id]));
}

function addIfNew(known: Map<string, Snapshot>, candidate: Snapshot): boolean {
  const previous = known.get(candidate.key);
  if (!previous) {
    known.set(candidate.key, candidate);
    return true;
  }
  if (previous.label !== candidate.label || previous.capturedAt !== candidate.capturedAt ||
      previous.source !== candidate.source || !sameMembers(previous.followers, candidate.followers) ||
      !sameMembers(previous.following, candidate.following)) {
    throw new Error('Conflicting records for the same snapshot. Existing history was retained.');
  }
  return false;
}

export function listSnapshots(ownerId: string, storage: Storage = localStorage): Snapshot[] {
  validateOwner(ownerId);
  const known = new Map<string, Snapshot>();
  const prefix = namespace + ':' + ownerId + ':';
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && key.startsWith(prefix)) {
      const text = storage.getItem(key);
      if (text !== null) {
        for (const item of readEnvelope(ownerId, text)) {
          addIfNew(known, item);
        }
      }
    }
  }
  return Array.from(known.values()).sort((a, b) => a.capturedAt - b.capturedAt || a.key.localeCompare(b.key));
}

function appendSnapshots(ownerId: string, snapshots: readonly Snapshot[], storage: Storage): number {
  const known = new Map<string, Snapshot>();
  for (const snapshot of listSnapshots(ownerId, storage)) {
    known.set(snapshot.key, snapshot);
  }
  const fresh = snapshots.filter(snapshot => addIfNew(known, snapshot));
  if (fresh.length > 0) {
    // One atomic write per import, and a distinct key per write so concurrent
    // tabs adding different captures cannot overwrite each other's histories.
    storage.setItem(namespace + ':' + ownerId + ':' + uniqueKey(), envelope(ownerId, fresh));
  }
  return fresh.length;
}

export function saveSnapshot(snapshot: Snapshot, storage: Storage = localStorage): void {
  validateOwner(snapshot.ownerId);
  appendSnapshots(snapshot.ownerId, [readSnapshot(snapshot.ownerId, snapshot)], storage);
}

export function exportSnapshots(ownerId: string, storage: Storage = localStorage): string {
  return envelope(ownerId, listSnapshots(ownerId, storage));
}

export function importSnapshots(ownerId: string, json: string, storage: Storage = localStorage): number {
  validateOwner(ownerId);
  return appendSnapshots(ownerId, readEnvelope(ownerId, json), storage);
}

export function pastUnfollowers(
  baseline: Snapshot, comparison: Snapshot, whitelist: ReadonlyArray<{ id: string; username: string }>,
): SnapshotUser[] {
  // Keep the operation fail-closed even for untyped callers.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!baseline.complete || !comparison.complete || baseline.ownerId !== comparison.ownerId ||
      baseline.key === comparison.key || baseline.capturedAt >= comparison.capturedAt) {
    throw new Error('Choose two complete snapshots of the same account, with T0 earlier than T1.');
  }
  const protectedAccount = createWhitelistMatcher(whitelist);
  const users: SnapshotUser[] = [];
  for (const id of Object.keys(comparison.following)) {
    const current = comparison.following[id];
    const previous = baseline.followers[id];
    const previousFollowing = baseline.following[id];
    if (current && previous && !comparison.followers[id] && !protectedAccount(current) && !protectedAccount(previous)
        && !(previousFollowing && protectedAccount(previousFollowing))) {
      users.push(current);
    }
  }
  return users;
}

type Relation = 'followers' | 'following';

function usernameFromMeta(row: Record<string, unknown>, entry: Record<string, unknown>): string {
  const direct = [entry.value, row.title, row.username].find(v => typeof v === 'string' && v.length > 0);
  if (typeof direct === 'string' && usernamePattern.test(direct)) {
    return direct;
  }
  if (typeof entry.href === 'string') {
    const url = new URL(entry.href);
    const path = /^\/(?:_u\/)?([a-zA-Z0-9._]{1,30})\/?$/.exec(url.pathname);
    if (url.protocol === 'https:' && /^(?:www\.)?instagram\.com$/.test(url.hostname) && path) {
      return path[1];
    }
  }
  throw new Error('Unrecognised Meta relationship entry.');
}

export function parseMetaExport(ownerId: string, label: string, capturedAt: number, files: readonly MetaFile[]) {
  validateOwner(ownerId);
  validateTime(capturedAt);
  labelFor(label, capturedAt);
  const resolved: Record<Relation, SnapshotUser[]> = { followers: [], following: [] };
  const unresolved: Record<Relation, string[]> = { followers: [], following: [] };
  const counts: Record<Relation, number> = { followers: 0, following: 0 };
  const parts = new Set<number>();
  let hasFollowing = false;
  for (const file of files) {
    let kind: Relation;
    let rows: unknown;
    const followerPart = /^followers_([1-9]\d*)\.json$/i.exec(file.name);
    if (followerPart) {
      const part = Number(followerPart[1]);
      if (!Number.isSafeInteger(part) || parts.has(part)) {
        throw new Error('Invalid or duplicate followers part.');
      }
      parts.add(part);
      kind = 'followers';
      rows = file.data;
    } else if (/^following\.json$/i.test(file.name) && !hasFollowing) {
      hasFollowing = true;
      kind = 'following';
      rows = object(file.data).relationships_following;
    } else {
      throw new Error('Choose one following.json and every numbered followers file from one export.');
    }
    if (!Array.isArray(rows)) {
      throw new Error('Invalid relationship list in ' + file.name);
    }
    for (const item of rows) {
      const row = object(item);
      const entries = row.string_list_data;
      if (!Array.isArray(entries) || entries.length !== 1) {
        throw new Error('Invalid Meta relationship row in ' + file.name);
      }
      const entry = object(entries[0]);
      const username = usernameFromMeta(row, entry);
      const rowId = readId(row);
      const entryId = readId(entry);
      if (rowId && entryId && rowId !== entryId) {
        throw new Error('Conflicting IDs in a Meta relationship row.');
      }
      const id = rowId || entryId;
      counts[kind]++;
      if (id) {
        resolved[kind].push(snapshotUser({ ...row, id, username }));
      } else {
        unresolved[kind].push(username);
      }
    }
  }
  if (!hasFollowing || !parts.size || !parts.has(1) || Array.from(parts).some(part => part > parts.size)) {
    throw new Error('Select following.json and every consecutive followers_N.json file starting with followers_1.json.');
  }
  // Typical Accounts Center files only contain mutable handles. Dropping even
  // one unresolved follower from T1 could make a continuing follower look lost.
  const snapshot = unresolved.followers.length || unresolved.following.length
    ? null : makeSnapshot(ownerId, label, capturedAt, resolved.followers, resolved.following, 'meta');
  return { snapshot, unresolved, counts };
}
