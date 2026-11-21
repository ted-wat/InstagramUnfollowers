const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchFriendshipsPage, isHardBlock, unfollowUser, isStillFollowing, createWhitelistMatcher } = require('../src/utils/utils.ts');
const { loadCachedScanResults, saveCachedScanResults, loadWhitelistForAction } = require('../src/utils/whitelist-manager.ts');
const { LAST_SCAN_RESULTS_STORAGE_KEY, LAST_SCAN_TIMESTAMP_STORAGE_KEY, WHITELISTED_RESULTS_STORAGE_KEY } = require('../src/constants/constants.ts');

const user = { id: '15', username: 'recent.name' };
function setup(t, reply) {
  const items = new Map();
  const storage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  };
  const requests = [];
  const env = {
    document: { cookie: 'ds_user_id=21', documentElement: { innerHTML: '' } },
    window: {}, sessionStorage: storage, localStorage: storage,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return reply();
    },
  };
  for (const [key, value] of Object.entries(env)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : Reflect.deleteProperty(globalThis, key));
  }
  return { requests, items };
}

test('list requests stay on-origin and an explicit 429 is a hard stop', async t => {
  const { requests } = setup(t, () => new Response('', { status: 429 }));
  await assert.rejects(fetchFriendshipsPage('followers', undefined, 20, '21'), isHardBlock);
  assert.equal(requests.length, 1);
  assert.equal(new URL(requests[0].url).origin, 'https://www.instagram.com');
  assert.equal(requests[0].options.mode, 'same-origin');
  assert.equal(requests[0].options.redirect, 'error');
});

test('verification surfaces feedback_required even in a 200 response', async t => {
  const { requests } = setup(t, () => Response.json({ status: 'fail', error_type: 'feedback_required' }));
  await assert.rejects(isStillFollowing(user), isHardBlock);
  assert.equal(requests.length, 1);
});

test('a blocked page fallback stops before any write', async t => {
  const { requests } = setup(t, () => new Response('', { status: 429 }));
  assert.equal((await unfollowUser(user, '')).outcome, 'blocked');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.method ?? 'GET', 'GET');
});

test('missing or contradictory pagination data cannot be a complete page', async t => {
  let payload;
  setup(t, () => Response.json(payload));
  for (payload of [
    { status: 'ok' },
    { users: [], has_more: true },
    { users: [], next_max_id: 'next' },
    { users: [{ pk: Number.MAX_SAFE_INTEGER + 1, username: 'match' }] },
  ]) {
    await assert.rejects(fetchFriendshipsPage('following', undefined, 20, '21'));
  }
  payload = { users: [], has_more: false };
  assert.deepEqual((await fetchFriendshipsPage('following', undefined, 20, '21')).users, []);
});

test('stored results without explicit scan completeness remain review-only', t => {
  const { items } = setup(t);
  const key = LAST_SCAN_RESULTS_STORAGE_KEY + '-21';
  const rows = [{ ...user, full_name: '', profile_pic_url: '', is_private: false, is_verified: false, follows_viewer: false, followed_by_viewer: true, requested_by_viewer: false }];
  items.set(key, JSON.stringify(rows));
  items.set(LAST_SCAN_TIMESTAMP_STORAGE_KEY + '-21', '10');
  assert.equal(loadCachedScanResults().complete, false);
  saveCachedScanResults(rows, '21', false);
  assert.equal(loadCachedScanResults().complete, false);
  saveCachedScanResults(rows, '21', true);
  assert.equal(loadCachedScanResults().complete, true);
  const crossAccount = { ...JSON.parse(items.get(key)), accountId: '22' };
  items.set(key, JSON.stringify(crossAccount));
  assert.equal(loadCachedScanResults(), null);
});

test('whitelists protect numeric IDs after rename and pending pasted handles by name only', t => {
  const { items } = setup(t);
  const matches = createWhitelistMatcher([{ id: '15', username: 'old' }, { id: 'pasted_pending_123_z', username: 'pending' }]);
  assert.equal(matches(user), true);
  assert.equal(matches({ id: '19', username: 'PENDING' }), true);
  assert.equal(matches({ id: '16', username: 'old' }), false);
  assert.deepEqual(loadWhitelistForAction(), []);
  items.set(WHITELISTED_RESULTS_STORAGE_KEY, 'INVALID');
  assert.throws(loadWhitelistForAction);
  items.set(WHITELISTED_RESULTS_STORAGE_KEY, '[{"id":"pasted_x","username":"y"}]');
  assert.throws(loadWhitelistForAction);
});

test('a missing or reassigned handle cannot verify that an immutable ID was unfollowed', async t => {
  let users = [];
  setup(t, () => Response.json({ users }));
  assert.equal(await isStillFollowing(user), null);
  users = [{ pk: '16', username: user.username }];
  assert.equal(await isStillFollowing(user), null);
  users = [{ pk: user.id, username: 'changed_again' }];
  assert.equal(await isStillFollowing(user), true);
});

test('an invalid whitelist or failed write keeps prior protections, and unavailable settings use defaults', t => {
  const { saveWhitelist, loadTimings } = require('../src/utils/whitelist-manager.ts');
  setup(t);
  saveWhitelist([user]);
  assert.throws(() => saveWhitelist([{ id: 'unresolved', username: 'broken' }]));
  assert.deepEqual(loadWhitelistForAction(), [user]);
  globalThis.localStorage.setItem = () => { throw new Error('quota exhausted'); };
  assert.throws(() => saveWhitelist([]));
  assert.deepEqual(loadWhitelistForAction(), [user]);
  globalThis.localStorage.getItem = () => { throw new Error('storage unavailable'); };
  assert.equal(loadTimings(), null);
  assert.throws(loadWhitelistForAction);
});
