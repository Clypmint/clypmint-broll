// The second judge: Claude (Anthropic), a different company's model from the first judge (Gemini) and from the vision
// model inside Clypmint's engine (also Gemini). It scores the SAME contact sheets the first judge saw, with the SAME
// instructions, blind to the provider.   tsx judge2.mjs <tag> [<tag> ...]
// BENCH_CONCURRENCY=N judges N sheets at once (default 8): the calls are independent and wait on the network.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
export const JUDGE2_MODEL = 'claude-sonnet-5-5';
const key = process.env.ANTHROPIC_API_KEY ?? '';
const queries = JSON.parse(readFileSync(path.join(HERE, 'queries.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pool = async (items, n, work) => { let i = 0; await Promise.all(Array.from({ length: Math.max(1, n) }, async () => { while (i < items.length) await work(items[i++]); })); };
// (word for word the first judge's instructions: harness.mjs judgePrompt)
const judgePrompt = (q, titles) => `You are a strict fact-checker for a video editor sourcing b-roll. The editor asked for: "${q.query}".
That means: ${q.subject}.
The sheet shows ${titles.length} numbered candidate pictures (yellow tag, top-left of each tile). Each is a thumbnail of a photo or a video frame. Captions as supplied with them:
${titles.map((t, i) => `${i + 1}: ${t ? t.slice(0, 90) : '(no caption)'}`).join('\n')}
Judge mainly what you SEE; a caption alone does not prove the picture shows the subject. For each number answer:
- exact_subject: true only if the picture clearly shows exactly that named subject (the right person, the right event, the right place, the right object or film). A different but similar thing, a generic stand-in, a different person, a related-but-other object, or a book cover/collage/chart is false. For a generic scene request (no name), true if it plainly shows that scene.
- real_media: true only if it is a real photograph or real film/video frame of the actual thing. False for illustrations, paintings, drawings, 3D renders, AI-generated images, diagrams, logos, posters of fictional art, and staged stock imagery presented as the named subject.
- visible: false if the tile is blank or unreadable.
Reply JSON only: {"items":[{"n":1,"exact_subject":false,"real_media":true,"visible":true,"note":"under 10 words"}]}`;

for (const tag of process.argv.slice(2)) {
  const raw = JSON.parse(readFileSync(path.join(HERE, 'raw', `results-${tag}.json`), 'utf8'));
  const first = JSON.parse(readFileSync(path.join(HERE, 'judge', `judgements-${tag}.json`), 'utf8'));
  const outFile = path.join(HERE, 'judge', `judgements2-${tag}.json`);
  const out = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
  const todo = Object.entries(raw).filter(([k, r]) => !out[k] && r.results.length);
  await pool(todo, Number(process.env.BENCH_CONCURRENCY || 8), async ([k, r]) => {
    const sheet = path.join(HERE, 'judge/sheets', `${k.replace('|', '_')}-${tag}.jpg`);
    if (!existsSync(sheet)) return;
    const q = queries.find((x) => x.id === r.qid);
    let items = null, usage = null;
    for (let a = 0; a < 4 && !items; a++) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: JUDGE2_MODEL, max_tokens: 1500, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: readFileSync(sheet).toString('base64') } }, { type: 'text', text: judgePrompt(q, r.results.map((x) => x.title)) }] }] }),
          signal: AbortSignal.timeout(90000),
        });
        if (!resp.ok) { await sleep(3000 * (a + 1)); continue; }
        const j = await resp.json(); usage = j.usage;
        const text = (j.content || []).map((c) => c.text || '').join('');
        items = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).items;
      } catch { await sleep(2000); }
    }
    // a tile the first judge could not load stays unloaded here too (same sheet)
    const loaded = (first[k]?.items ?? []).map((i) => i.thumb_loaded);
    out[k] = { items: r.results.map((_, i) => { const it = (items || []).find((x) => Number(x.n) === i + 1) || {}; return { exact_subject: !!it.exact_subject && it.visible !== false && loaded[i] !== false, real_media: !!it.real_media && it.visible !== false && loaded[i] !== false, note: it.note || '' }; }), judge_failed: !items, tokens: usage };
    writeFileSync(outFile, JSON.stringify(out, null, 1));
    console.log(tag, k, out[k].judge_failed ? 'FAILED' : out[k].items.map((i) => (i.exact_subject ? 'Y' : 'n') + (i.real_media ? 'r' : '-')).join(' '));
  });
}
