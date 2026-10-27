// Turns the raw runs and both judges' verdicts into the page's data (apps/web/src/content/broll-benchmark.json) and the
// public downloads (apps/web/public/broll/benchmarks/v1/).   node summarize.mjs <clypmint web checkout root>
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.argv[2];
const read = (f) => JSON.parse(readFileSync(path.join(HERE, f), 'utf8'));
const queries = read('queries.json');
const DATE = '2026-10-25';
// Clypmint's own rows were run again on this date with its engine as it is live (#1642-#1645); the other services stay as run on DATE
const CLYPMINT_DATE = '2026-10-26';

const PROVIDERS = [
  { id: 'clypmint-web', tag: 'web5', key: 'clypmint', name: 'Clypmint, web mode', price: '$60', rights: 'Marked not cleared', ours: true },
  { id: 'clypmint-licensed', tag: 'licensed5', key: 'clypmint', name: 'Clypmint, licensed', price: '$20', rights: 'Licensed, with credit line', ours: true },
  { id: 'commons', tag: 'others', key: 'commons', name: 'Wikimedia Commons search', price: 'Free', rights: 'Licensed' },
  { id: 'brave', tag: 'others', key: 'brave', name: 'Brave image search', price: '$5', rights: 'No license data' },
  { id: 'openverse', tag: 'others', key: 'openverse', name: 'Openverse', price: 'Free', rights: 'Licensed' },
  { id: 'pexels', tag: 'others', key: 'pexels', name: 'Pexels', price: 'Free', rights: 'Stock license' },
];
const CATEGORY = {
  person: 'People',
  company_product: 'Companies and products',
  place: 'Places',
  event: 'Events',
  archival: 'Archival footage',
  generic_scene: 'Generic scenes',
  movie_tv_scene: 'Movie and TV scenes',
};
const JUDGES = [
  { id: 'gemini', label: 'Gemini 3.5 Flash (Google)', file: (tag) => `judge/judgements-${tag}.json` },
  { id: 'claude', label: 'Claude Sonnet 5.5 (Anthropic)', file: (tag) => `judge/judgements2-${tag}.json` },
];

const raw = Object.fromEntries([...new Set(PROVIDERS.map((p) => p.tag))].map((t) => [t, read(`raw/results-${t}.json`)]));
const verdicts = Object.fromEntries(JUDGES.map((j) => [j.id, Object.fromEntries([...new Set(PROVIDERS.map((p) => p.tag))].map((t) => [t, read(j.file(t))]))]));
const hit = (it) => !!it && it.exact_subject && it.real_media;
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
const median = (a) => {
  const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null;
};

function row(p, ids) {
  const out = { first: {}, top5: {} };
  for (const j of JUDGES) {
    let first = 0, top5 = 0;
    for (const id of ids) {
      const items = verdicts[j.id][p.tag][`${p.key}|${id}`]?.items ?? [];
      if (hit(items[0])) first++;
      if (items.some(hit)) top5++;
    }
    out.first[j.id] = pct(first, ids.length);
    out.top5[j.id] = pct(top5, ids.length);
  }
  out.first.mean = Math.round(((out.first.gemini + out.first.claude) / 2) * 10) / 10;
  out.top5.mean = Math.round(((out.top5.gemini + out.top5.claude) / 2) * 10) / 10;
  const runs = ids.map((id) => raw[p.tag][`${p.key}|${id}`]).filter(Boolean);
  out.median_s = Math.round((median(runs.map((r) => r.latency_ms)) ?? 0) / 100) / 10;
  out.empty = pct(runs.filter((r) => !r.results?.length).length, ids.length);
  return out;
}

const ids = (pred) => queries.filter(pred).map((q) => q.id);
const subjects = ids((q) => q.type !== 'movie_tv_scene');
const scenes = ids((q) => q.type === 'movie_tv_scene');
// (judge agreement on the first result, over every provider and request: how far one judge's call can be trusted)
let agree = 0, both = 0;
for (const p of PROVIDERS) for (const q of queries) {
  const a = verdicts.gemini[p.tag][`${p.key}|${q.id}`]?.items?.[0], b = verdicts.claude[p.tag][`${p.key}|${q.id}`]?.items?.[0];
  if (!a || !b) continue;
  both++;
  if (hit(a) === hit(b)) agree++;
}

const summary = {
  name: 'B-Roll Bench v1',
  date: DATE,
  clypmint_date: CLYPMINT_DATE,
  requests: queries.length,
  judges: JUDGES.map(({ id, label }) => ({ id, label })),
  judge_agreement: pct(agree, both),
  providers: PROVIDERS.map(({ id, name, price, rights, ours }) => ({ id, name, price, rights, ours: !!ours })),
  sets: [
    { id: 'subjects', title: 'Named subjects', n: subjects.length, rows: Object.fromEntries(PROVIDERS.map((p) => [p.id, row(p, subjects)])) },
    { id: 'scenes', title: 'Movie and TV scenes', n: scenes.length, rows: Object.fromEntries(PROVIDERS.map((p) => [p.id, row(p, scenes)])) },
    { id: 'all', title: 'All 100 requests', n: queries.length, rows: Object.fromEntries(PROVIDERS.map((p) => [p.id, row(p, queries.map((q) => q.id))])) },
  ],
  categories: Object.entries(CATEGORY).map(([id, label]) => {
    const c = ids((q) => q.type === id);
    return { id, label, n: c.length, first: Object.fromEntries(PROVIDERS.map((p) => [p.id, row(p, c).first.mean])) };
  }),
};
writeFileSync(path.join(ROOT, 'apps/web/src/content/broll-benchmark.json'), JSON.stringify(summary, null, 1) + '\n');

// the public downloads: everything needed to check or rerun it
const PUB = path.join(ROOT, 'apps/web/public/broll/benchmarks/v1');
mkdirSync(PUB, { recursive: true });
for (const f of ['queries.json', 'queries-prompt.json', 'harness.mjs', 'judge2.mjs', 'summarize.mjs']) copyFileSync(path.join(HERE, f), path.join(PUB, f));
const results = {};
for (const p of PROVIDERS)
  results[p.id] = Object.fromEntries(queries.map((q) => {
    const r = raw[p.tag][`${p.key}|${q.id}`];
    return [q.id, {
      latency_ms: r?.latency_ms ?? null,
      results: (r?.results ?? []).map((x, i) => ({
        title: x.title, url: x.url, thumbnail: x.thumb, type: x.type, license: x.license, source: x.source,
        ...(x.cut ? { cut: x.cut } : {}),
        judges: Object.fromEntries(JUDGES.map((j) => {
          const it = verdicts[j.id][p.tag][`${p.key}|${q.id}`]?.items?.[i];
          return [j.id, it ? { exact_subject: it.exact_subject, real_media: it.real_media, note: it.note } : null];
        })),
      })),
    }];
  }));
writeFileSync(path.join(PUB, 'results.json'), JSON.stringify({ name: summary.name, date: DATE, clypmint_date: CLYPMINT_DATE, providers: summary.providers, judges: summary.judges, results }) + '\n');
writeFileSync(path.join(PUB, 'summary.json'), JSON.stringify(summary, null, 1) + '\n');
console.log(JSON.stringify(summary.sets.map((s) => [s.id, Object.fromEntries(Object.entries(s.rows).map(([k, v]) => [k, [v.first.gemini, v.first.claude, v.top5.mean, v.median_s]]))]), null, 1), 'agreement', summary.judge_agreement);
