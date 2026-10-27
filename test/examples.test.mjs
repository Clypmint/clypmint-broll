// Every example in examples/ runs against a local fake API: no key, no search, no network.

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = new URL('..', import.meta.url).pathname;
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d5a2a70000000049454e44ae426082', 'hex');

let server;
let base;
const seen = [];

before(async () => {
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      seen.push({ method: req.method, path: req.url, auth: req.headers.authorization, body });
      if (req.url === '/img.png') return res.writeHead(200, { 'content-type': 'image/png' }).end(PNG);
      if (req.headers.authorization !== 'Bearer cm_live_x') return res.writeHead(401).end('{"error":{"code":"unauthorized"}}');
      const send = (value) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(value));
      const shot = {
        id: 'a', type: 'image', title: 'Saturn V', shows: 'A Saturn V lifting off', score: 9,
        url: `${base}/img.png`, download_url: `${base}/img.png`, source: { name: 'NASA' }, delivery: 'direct',
        license: { name: 'Public domain', cleared: true, commercial_use: true, attribution: 'NASA / Public domain' },
      };
      const usage = { charged_usd: 0.02, balance_usd: 9.98 };
      if (req.url === '/api/v1/broll/plan')
        return send({
          beats: [
            { quote: 'In 1969 a Saturn V carried three men to the Moon', query: 'Saturn V launch', results: [shot] },
            { quote: 'and nobody filmed the rest', query: 'nothing', results: [] },
          ],
          usage,
        });
      if (req.url === '/api/v1/broll/search') return send({ query: JSON.parse(body).query, results: [shot], usage });
      if (req.url === '/api/v1/broll/usage') return send({ balance_usd: 9.98 });
      res.writeHead(404).end();
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function workdir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'broll-example-'));
  fs.writeFileSync(path.join(dir, 'script.txt'), 'In 1969 a Saturn V carried three men to the Moon, and nobody filmed the rest.');
  return dir;
}

const env = () => ({ ...process.env, CLYPMINT_API_KEY: 'cm_live_x', CLYPMINT_API_URL: base });
const onPath = (bin) => (process.env.PATH || '').split(path.delimiter).some((dir) => fs.existsSync(path.join(dir, bin)));

test('script-to-broll.mjs prints each moment, its best shot and the credits', async () => {
  const cwd = workdir();
  const { stdout } = await run(process.execPath, [path.join(ROOT, 'examples/script-to-broll.mjs'), 'script.txt'], { cwd, env: env() });
  assert.match(stdout, /1\. "In 1969 a Saturn V carried three men to the Moon"\n {3}\[9\/10\] A Saturn V lifting off/);
  assert.match(stdout, /2\. "and nobody filmed the rest"\n {3}no shot passed the check/);
  assert.match(stdout, /Credits:\nNASA \/ Public domain/);
  assert.match(stdout, /Charged \$0\.02, \$9\.98 left\./);
  assert.equal(JSON.parse(seen.findLast((s) => s.path === '/api/v1/broll/plan').body).transcript.startsWith('In 1969'), true);
  assert.equal(fs.existsSync(path.join(cwd, 'broll')), false);
});

test('script-to-broll.mjs --make saves each image in ./broll', async () => {
  const cwd = workdir();
  await run(process.execPath, [path.join(ROOT, 'examples/script-to-broll.mjs'), 'script.txt', '--make'], { cwd, env: env() });
  assert.deepEqual(fs.readFileSync(path.join(cwd, 'broll/01.png')), PNG);
});

test('script_to_broll.py prints each moment and where to get its shot', async (t) => {
  const python = ['python3', 'python'].find(onPath);
  if (!python) return t.skip('no Python on this machine');
  const { stdout } = await run(python, [path.join(ROOT, 'examples/script_to_broll.py'), 'script.txt'], { cwd: workdir(), env: env() });
  assert.match(stdout, /1\. "In 1969 a Saturn V carried three men to the Moon"\n {3}\[9\/10\] A Saturn V lifting off\n {3}http:\/\/127\.0\.0\.1:\d+\/img\.png/);
  assert.match(stdout, /Credits:\nNASA \/ Public domain/);
});

test('search.sh makes one search and reads the balance', async (t) => {
  if (process.platform === 'win32') return t.skip('needs bash and curl');
  const { stdout } = await run('bash', [path.join(ROOT, 'examples/search.sh')], { env: env() });
  const [search, usage] = stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(search.query, 'Saturn V launch');
  assert.equal(usage.balance_usd, 9.98);
});
