import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clipOf } from '../src/cli.mjs';
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

test('search passes --rights through to the API body', async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  };
  const client = createClient({ apiKey: 'cm_live_x', baseUrl: 'https://example.test', fetch });
  await client.search({ query: 'Wolf of Wall Street', rights: 'any' });
  assert.equal(calls[0].rights, 'any');
});

test('get cuts the moment the search found, unless --start or --duration say otherwise', () => {
  const moment = { type: 'video', url: 'https://www.youtube.com/watch?v=x', cut_args: ['cut', 'https://www.youtube.com/watch?v=x', '--start', '83', '--duration', '3.5'] };
  assert.deepEqual(clipOf(moment), { start: 83, duration: 3.5 });
  assert.deepEqual(clipOf(moment, { start: '1:05' }), { start: 65, duration: 3.5 });
  assert.deepEqual(clipOf(moment, { duration: '6' }), { start: 83, duration: 6 });
  assert.deepEqual(clipOf({ type: 'video', url: 'https://example.test/a.mp4' }), { start: 0, duration: 4 });
});
