import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createClient, BrollError } from '../src/client.mjs';
import { seconds } from '../src/media.mjs';

test('seconds reads plain seconds and clock times', () => {
  assert.equal(seconds('12'), 12);
  assert.equal(seconds('1:05'), 65);
  assert.equal(seconds('01:02:03'), 3723);
  assert.equal(seconds(undefined), undefined);
  assert.throws(() => seconds('soon'), /seconds or mm:ss/);
});

test('the client needs a key', () => {
  assert.throws(() => createClient({ apiKey: '' }), BrollError);
});

test('the client sends the key and the body, and surfaces API errors', async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ error: { code: 'free_allowance_used', message: 'used' } }), { status: 402 });
  };
  const client = createClient({ apiKey: 'cm_live_x', baseUrl: 'https://example.test', fetch });
  await assert.rejects(client.search('Sam Altman'), (e) => e instanceof BrollError && e.status === 402 && e.code === 'free_allowance_used');
  assert.equal(calls[0].url, 'https://example.test/api/v1/broll/search');
  assert.equal(calls[0].init.headers.authorization, 'Bearer cm_live_x');
  assert.deepEqual(JSON.parse(calls[0].init.body), { query: 'Sam Altman' });
});
