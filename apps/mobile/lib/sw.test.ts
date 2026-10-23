// The web service worker (public/sw.js): pages network first so a release's new
// page is never shadowed by a cached one, hashed build files cache first, and
// everything else stale-while-revalidate. Runs the worker against a fake cache
// and fetch.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

interface Res {
  ok: boolean;
  body?: string;
  status?: number;
  type?: string;
  clone?: () => Res;
}

function load() {
  const store = new Map<string, Res>();
  const fetched: string[] = [];
  const net = { online: true };
  let onFetch: (e: unknown) => void = () => {};
  const self = {
    addEventListener: (type: string, f: (e: unknown) => void) => {
      if (type === 'fetch') {
        onFetch = f;
      }
    },
    location: { origin: 'https://t' },
    registration: { scope: 'https://t/' },
  };
  const cache = {
    match: async (r: string | { url: string }) => store.get(typeof r === 'string' ? r : r.url),
    put: async (r: { url: string }, res: Res) => store.set(r.url, res),
  };
  const fetchFake = async (r: { url: string }): Promise<Res> => {
    fetched.push(r.url);
    if (!net.online) {
      throw new Error('offline');
    }
    const res: Res = { ok: true, type: 'basic', body: `new ${r.url}` };
    res.clone = () => res;
    return res;
  };
  const src = readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  new Function('self', 'caches', 'fetch', 'Response', src)(
    self,
    { open: async () => cache },
    fetchFake,
    class {
      ok = false;
      constructor(
        public body: string,
        init: { status: number },
      ) {
        Object.assign(this, init);
      }
    },
  );

  const get = async (url: string, mode = 'no-cors'): Promise<Res> => {
    let res: Promise<Res> | undefined;
    const waits: Promise<unknown>[] = [];
    onFetch({
      request: { method: 'GET', url, mode },
      respondWith: (p: Promise<Res>) => {
        res = p;
      },
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    assert.ok(res, 'the worker should respond');
    const r = await res;
    await Promise.all(waits);
    return r;
  };
  return { store, fetched, net, get };
}

test('pages come from the network when online, the cache when not', async () => {
  const { store, net, get } = load();
  store.set('https://t/map', { ok: true, body: 'old page' });
  assert.equal((await get('https://t/map', 'navigate')).body, 'new https://t/map');

  net.online = false;
  assert.equal((await get('https://t/map', 'navigate')).body, 'new https://t/map');
  store.set('https://t/', { ok: true, body: 'start' });
  assert.equal((await get('https://t/about', 'navigate')).body, 'start');
});

test('hashed build files are served from the cache without a fetch', async () => {
  const { store, fetched, get } = load();
  const url = 'https://t/_expo/static/js/web/map-0123.js';
  store.set(url, { ok: true, body: 'hashed' });
  assert.equal((await get(url)).body, 'hashed');
  assert.deepEqual(fetched, []);
});

test('other files are served cached, then refreshed', async () => {
  const { store, net, get } = load();
  store.set('https://t/manifest.json', { ok: true, body: 'old' });
  assert.equal((await get('https://t/manifest.json')).body, 'old');
  assert.equal(store.get('https://t/manifest.json')?.body, 'new https://t/manifest.json');

  net.online = false;
  assert.equal((await get('https://t/icon.png')).status, 503);
});
