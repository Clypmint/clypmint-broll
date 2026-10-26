// Clypmint B-Roll Bench v1 harness (public). Usage, from this dir:
//   node harness.mjs run [providers] --api [--rights=any] --tag=<tag>   Clypmint through its public API (CLYPMINT_API_KEY)
//   tsx harness.mjs run [providers] --engine=<checkout>/apps/web/src/lib/broll [--rights=any] --tag=<tag>   (the engine in-process)
//   tsx harness.mjs judge --tag=<tag>   (needs sharp, ffmpeg and yt-dlp; the CLI is this repository's own, or CLYPMINT_WT's)
// A Clypmint search through the API is billed like any other ($0.02 licensed, $0.06 web; see clypmint.com/broll).
// Every provider answers the same 100 requests (queries.json). One judge model, blind to the provider, looks at what each
// result shows: a photo's own thumbnail, a video's thumbnail, and for a moment inside a video (Clypmint web mode) the frame
// at the middle of that moment, cut the way the customer's CLI cuts it (yt-dlp + ffmpeg); for a live site, a frame of
// the CLI's own recording of it (local Chrome).
// Keys come from the environment and are never printed or written.
// Keys come from the environment and are never printed or written.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const WT = process.env.CLYPMINT_WT; // a checkout of the Clypmint web app (its B-Roll engine, its sharp, its CLI)
const queries = JSON.parse(readFileSync(path.join(HERE, 'queries.json'), 'utf8'));
const [, , phase = 'run', ...rest] = process.argv;
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const args = rest.filter((a) => !a.startsWith('--'));
const TAG = flags.tag || '';           // '' = baseline; e.g. 'after' for a prototype run
// keys from the environment: GEMINI_API_KEY (engine + judge), PEXELS_API_KEY, BRAVE_API_KEY
const secret = (name) => process.env[name] ?? '';
const UA = 'ClypmintBenchmark/1.0 (https://clypmint.com; support@clypmint.com) research';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTD = flags.out ? path.join(HERE, flags.out) : null;   // --out=results-rights keeps raw/judge/sheets in that folder
if (OUTD) for (const d of ['', 'raw', 'judge', 'judge/sheets']) mkdirSync(path.join(OUTD, d), { recursive: true });
const rawFile = OUTD ? path.join(OUTD, 'raw', `results${TAG ? '-' + TAG : ''}.json`) : path.join(HERE, 'raw', `results${TAG ? '-' + TAG : ''}.json`);
const judgeFile = OUTD ? path.join(OUTD, 'judge', `judgements${TAG ? '-' + TAG : ''}.json`) : path.join(HERE, 'judge', `judgements${TAG ? '-' + TAG : ''}.json`);
const load = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {});
const save = (f, o) => writeFileSync(f, JSON.stringify(o, null, 1));

async function getJson(url, headers = {}, ms = 25000) {
  const r = await fetch(url, { headers: { 'user-agent': UA, ...headers }, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url.split('?')[0]}`);
  return r.json();
}
const reusableCC = (s) => {
  s = String(s || '').toLowerCase();
  if (!s) return false;
  if (/\b(nc|nd)\b|non-?commercial|no-?deriv/.test(s)) return false;
  return /^(cc0|cc[- ]by|cc[- ]sa|pd|public domain|pdm|no restrictions|attribution|by(-sa)?\b|gfdl|copyrighted free use|free art)/.test(s);
};

// ---------- providers ----------
const P = {};
P.clypmint = {
  // the list price of a search that finds verified shots: $0.02 licensed, $0.06 web (rights "any"); nothing found costs nothing
  cost: (r) => (r.results.length ? (flags.rights === 'any' ? 0.06 : 0.02) : 0),
  async run(q, ctx) {
    const { searchBroll } = ctx.engine;
    const t = Date.now();
    const res = await searchBroll({ query: q.query, type: 'any', limit: 5, ...(flags.rights ? { rights: flags.rights } : {}) }, { env: { GEMINI_API_KEY: ctx.keys.gemini } });
    return {
      latency_ms: Date.now() - t, engine_took_ms: res.took_ms, engine_cost_usd: res.cost_usd, web_searches: res.web_searches ?? null, verified: res.verified,
      sources_used: res.sources_used, considered: res.considered, entity: res.interpreted.entity?.label ?? null,
      video_available: res.results.some((s) => s.type === 'video'),
      results: res.results.map((s) => ({ url: s.url, thumb: s.thumbnail_url, title: s.title, type: s.type, license: s.license.name, engine_commercial_use: s.license.commercial_use, reusable: reusableCC(s.license.name) , score: s.score, source: s.source.name, cleared: s.license.cleared, cut: s.cut_args ?? null })),
    };
  },
};
P.pexels = {
  cost: () => 0,
  async run(q, ctx) {
    const h = { Authorization: ctx.keys.pexels }, e = encodeURIComponent(q.query), t = Date.now();
    const [ph, vi] = await Promise.all([
      getJson(`https://api.pexels.com/v1/search?query=${e}&per_page=3`, h),
      getJson(`https://api.pexels.com/videos/search?query=${e}&per_page=3`, h),
    ]);
    const latency_ms = Date.now() - t;
    const P_ = (ph.photos || []).map((x) => ({ url: x.url, thumb: x.src?.medium, title: x.alt || '', type: 'image', license: 'Pexels License', reusable: true, source: 'Pexels' }));
    const V_ = (vi.videos || []).map((x) => ({ url: x.url, thumb: x.image, title: (x.url || '').split('/').filter(Boolean).pop() || '', type: 'video', license: 'Pexels License', reusable: true, source: 'Pexels' }));
    // interleave photo, video, photo, video, photo (documented rule: Pexels has two endpoints)
    const out = [];
    for (let i = 0; out.length < 5 && (i < P_.length || i < V_.length); i++) { if (P_[i]) out.push(P_[i]); if (V_[i] && out.length < 5) out.push(V_[i]); }
    return { latency_ms, video_available: V_.length > 0, results: out.slice(0, 5) };
  },
};
P.openverse = {
  cost: () => 0,
  async run(q) {
    const t = Date.now();
    await sleep(1500);
    const j = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q.query)}&page_size=5`);
    return { latency_ms: Date.now() - t - 1500, video_available: false, results: (j.results || []).slice(0, 5).map((x) => ({ url: x.foreign_landing_url || x.url, thumb: x.thumbnail || x.url, thumb2: x.url, title: x.title || '', type: 'image', license: x.license ? `${x.license}${x.license_version ? ' ' + x.license_version : ''}` : null, reusable: reusableCC(x.license), source: x.source || x.provider })) };
  },
};
P.commons = {
  cost: () => 0,
  async run(q) {
    const base = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&prop=imageinfo&iiprop=url|mediatype|extmetadata&iiurlwidth=400&gsrlimit=20&gsrsearch=';
    const t = Date.now();
    const j = await getJson(base + encodeURIComponent(q.query));
    const latency_ms = Date.now() - t;
    const pages = Object.values(j.query?.pages || {}).sort((a, b) => a.index - b.index);
    const keep = pages.filter((p) => ['BITMAP', 'VIDEO'].includes(p.imageinfo?.[0]?.mediatype));
    const v = await getJson(base + encodeURIComponent(q.query + ' filetype:video')).catch(() => ({}));
    const videoAvail = Object.values(v.query?.pages || {}).some((p) => p.imageinfo?.[0]?.mediatype === 'VIDEO');
    return { latency_ms, video_available: videoAvail || keep.some((p) => p.imageinfo[0].mediatype === 'VIDEO'), results: keep.slice(0, 5).map((p) => { const i = p.imageinfo[0], m = i.extmetadata || {}; const lic = m.LicenseShortName?.value || null; return { url: i.descriptionshorturl || i.descriptionurl, thumb: i.thumburl, title: p.title.replace(/^File:/, ''), type: i.mediatype === 'VIDEO' ? 'video' : 'image', license: lic, reusable: reusableCC(lic), source: 'Wikimedia Commons' }; }) };
  },
};
P.brave = {
  cost: () => 0.005,   // Brave Search API list price used: $5 per 1,000 requests (image endpoint); video-availability call not charged here
  async run(q, ctx) {
    const h = { 'X-Subscription-Token': ctx.keys.brave, accept: 'application/json' }, e = encodeURIComponent(q.query), t = Date.now();
    await sleep(1100);
    const j = await getJson(`https://api.search.brave.com/res/v1/images/search?q=${e}&count=5&safesearch=off`, h);
    const latency_ms = Date.now() - t - 1100;
    await sleep(1100);
    const v = await getJson(`https://api.search.brave.com/res/v1/videos/search?q=${e}&count=5`, h).catch(() => ({}));
    return { latency_ms, video_available: (v.results || []).length > 0, results: (j.results || []).slice(0, 5).map((x) => ({ url: x.url || x.source, thumb: x.thumbnail?.src, title: x.title || '', type: 'image', license: null, reusable: false, source: x.source || 'web' })) };
  },
};

// the engine's answer, through POST /api/v1/broll/search (the same fields; the API keeps cost_usd to itself)
async function apiSearch(input) {
  const key = secret('CLYPMINT_API_KEY');
  if (!key) throw new Error('--api needs CLYPMINT_API_KEY (make one at https://clypmint.com/broll/dashboard)');
  const r = await fetch('https://clypmint.com/api/v1/broll/search', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(60000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${r.status} ${j?.error?.code ?? ''}: ${j?.error?.message ?? ''}`);
  return { ...j, cost_usd: null, interpreted: j.interpreted ?? {} };
}

// ---------- run ----------
async function runPhase() {
  const keys = { gemini: secret('GEMINI_API_KEY'), pexels: secret('PEXELS_API_KEY'), brave: secret('BRAVE_API_KEY') };
  // --api: Clypmint's lanes through the public REST API with your own key (anyone can run this); otherwise the engine in-process
  const engine = 'api' in flags ? { searchBroll: apiSearch } : await import(path.join(flags.engine || path.join(WT, 'apps/web/src/lib/broll'), 'search.ts'));
  const ctx = { keys, engine };
  const names = args.length ? args : Object.keys(P);
  const raw = load(rawFile);
  for (const q of queries) for (const name of names) {
    const k = `${name}|${q.id}`;
    if (raw[k] && !raw[k].error) continue;
    try { raw[k] = { provider: name, qid: q.id, ...(await P[name].run(q, ctx)) }; }
    catch (err) { raw[k] = { provider: name, qid: q.id, error: String(err.message || err), results: [], latency_ms: null, video_available: false }; }
    raw[k].cost_usd = P[name].cost(raw[k]);
    save(rawFile, raw);
    console.log(k, raw[k].error ? 'ERR ' + raw[k].error : `${raw[k].results.length} results ${raw[k].latency_ms}ms`);
  }
}

// ---------- judge ----------
const JUDGE_MODEL = 'gemini-3.5-flash';
async function thumbBytes(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/*' }, signal: AbortSignal.timeout(20000) });
      if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 200) return b; }
      if (r.status === 429) await sleep(3000 * (a + 1));
    } catch {}
    await sleep(800);
  }
  return null;
}
async function sheetOf(items, sharp) {
  const T = 360, C = 3, rows = Math.ceil(items.length / C), W = C * T, H = rows * T;
  const tiles = await Promise.all(items.map(async (b, n) => b ? { input: await sharp(b, { failOn: 'none' }).resize(T, T, { fit: 'contain', background: '#111' }).png().toBuffer().catch(() => null), n } : { input: null, n }));
  const labels = items.map((_, n) => { const x = (n % C) * T, y = Math.floor(n / C) * T; return `<rect x="${x + 4}" y="${y + 4}" width="40" height="34" rx="6" fill="#ffd400"/><text x="${x + 24}" y="${y + 30}" font-family="Arial" font-size="24" font-weight="700" text-anchor="middle">${n + 1}</text><rect x="${x}" y="${y}" width="${T}" height="${T}" fill="none" stroke="#000" stroke-width="2"/>`; }).join('');
  return sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
    .composite([...tiles.filter((t) => t.input).map((t) => ({ input: t.input, left: (t.n % C) * T, top: Math.floor(t.n / C) * T })), { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${labels}</svg>`), left: 0, top: 0 }])
    .jpeg({ quality: 85 }).toBuffer();
}
const judgePrompt = (q, titles) => `You are a strict fact-checker for a video editor sourcing b-roll. The editor asked for: "${q.query}".
That means: ${q.subject}.
The sheet shows ${titles.length} numbered candidate pictures (yellow tag, top-left of each tile). Each is a thumbnail of a photo or a video frame. Captions as supplied with them:
${titles.map((t, i) => `${i + 1}: ${t ? t.slice(0, 90) : '(no caption)'}`).join('\n')}
Judge mainly what you SEE; a caption alone does not prove the picture shows the subject. For each number answer:
- exact_subject: true only if the picture clearly shows exactly that named subject (the right person, the right event, the right place, the right object or film). A different but similar thing, a generic stand-in, a different person, a related-but-other object, or a book cover/collage/chart is false. For a generic scene request (no name), true if it plainly shows that scene.
- real_media: true only if it is a real photograph or real film/video frame of the actual thing. False for illustrations, paintings, drawings, 3D renders, AI-generated images, diagrams, logos, posters of fictional art, and staged stock imagery presented as the named subject.
- visible: false if the tile is blank or unreadable.
Reply JSON only: {"items":[{"n":1,"exact_subject":false,"real_media":true,"visible":true,"note":"under 10 words"}]}`;
/** A moment inside a YouTube video: the frame at its middle, as the customer's cut command would produce it. */
function momentFrame(x) {
  if (!x.cut || x.cut[0] !== 'cut' || !/youtube\.com|youtu\.be/.test(x.url)) return null;
  const start = Number(x.cut[x.cut.indexOf('--start') + 1]), dur = Number(x.cut[x.cut.indexOf('--duration') + 1]);
  const file = path.join(OUTD || HERE, 'judge/frames', `${x.url.split('v=')[1]?.slice(0, 11)}-${start}.jpg`);
  if (existsSync(file)) return readFileSync(file);
  mkdirSync(path.dirname(file), { recursive: true });
  for (let a = 0; a < 2; a++) {
    const g = spawnSync('yt-dlp', ['-q', '--no-warnings', '-f', 'bv*[height<=720]/b', '-g', x.url], { encoding: 'utf8', timeout: 60000 });
    const src = (g.stdout || '').trim().split('\n')[0];
    if (src) spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(start + dur / 2), '-i', src, '-frames:v', '1', '-vf', 'scale=-2:540,format=yuvj420p', '-q:v', '3', file], { timeout: 90000 });
    if (existsSync(file)) return readFileSync(file);
  }
  return null;
}
/** A live site the customer records with the CLI's capture command: a frame of that recording (local Chrome + ffmpeg). */
function captureFrame(x) {
  if (!x.cut || x.cut[0] !== 'capture') return null;
  const id = x.url.replace(/[^a-z0-9]+/gi, '-').slice(0, 60);
  const file = path.join(OUTD || HERE, 'judge/frames', `capture-${id}.jpg`);
  if (existsSync(file)) return readFileSync(file);
  mkdirSync(path.dirname(file), { recursive: true });
  const mp4 = file.replace(/\.jpg$/, '.mp4');
  // the CLI that cuts a moment the way a customer's does: the public repository's own (../../bin), or a Clypmint checkout's
  const cli = WT ? path.join(WT, 'integrations/broll/bin/clypmint-broll.mjs') : path.join(HERE, '../../bin/clypmint-broll.mjs');
  spawnSync(process.execPath, [cli, 'capture', x.url, '--duration', '2', '--out', mp4], { timeout: 90000 });
  if (existsSync(mp4)) spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', mp4, '-frames:v', '1', '-vf', 'scale=-2:540,format=yuvj420p', '-q:v', '3', file], { timeout: 60000 });
  return existsSync(file) ? readFileSync(file) : null;
}
async function judgePhase() {
  const key = secret('GEMINI_API_KEY');
  const sharp = createRequire(WT ? path.join(WT, 'apps/web/package.json') : path.join(HERE, 'package.json'))('sharp');
  const raw = load(rawFile), out = load(judgeFile);
  for (const [k, r] of Object.entries(raw)) {
    if (out[k] || !r.results.length) continue;
    const q = queries.find((x) => x.id === r.qid);
    const bytes = [];
    for (const x of r.results) bytes.push(momentFrame(x) || captureFrame(x) || (x.thumb && (await thumbBytes(x.thumb))) || (x.thumb2 && (await thumbBytes(x.thumb2))) || null);
    const sheet = await sheetOf(bytes, sharp);
    writeFileSync(path.join(OUTD || HERE, 'judge/sheets', `${k.replace('|', '_')}${TAG ? '-' + TAG : ''}.jpg`), sheet);
    const body = { contents: [{ role: 'user', parts: [{ text: judgePrompt(q, r.results.map((x) => x.title)) }, { inline_data: { mime_type: 'image/jpeg', data: sheet.toString('base64') } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 1024 } } };
    let items = null, usage = null;
    for (let a = 0; a < 3 && !items; a++) {
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${JUDGE_MODEL}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
        if (!resp.ok) { await sleep(2000); continue; }
        const j = await resp.json(); usage = j.usageMetadata;
        items = JSON.parse((j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').replace(/^```(?:json)?\s*|\s*```$/g, '')).items;
      } catch { await sleep(2000); }
    }
    out[k] = { items: r.results.map((_, i) => { const it = (items || []).find((x) => Number(x.n) === i + 1) || {}; return { exact_subject: !!it.exact_subject && it.visible !== false && !!bytes[i], real_media: !!it.real_media && it.visible !== false && !!bytes[i], thumb_loaded: !!bytes[i], note: it.note || '' }; }), judge_failed: !items, tokens: usage ? { in: usage.promptTokenCount, out: (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0) } : null };
    save(judgeFile, out);
    console.log('judged', k, out[k].judge_failed ? 'FAILED' : out[k].items.map((i) => (i.exact_subject ? 'Y' : 'n') + (i.real_media ? 'r' : '-')).join(' '));
  }
}
if (phase === 'run') await runPhase(); else if (phase === 'judge') await judgePhase();
