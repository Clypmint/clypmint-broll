// clypmint-broll: find b-roll with the Clypmint B-Roll API, and make the files on your machine.
//
//   clypmint-broll search "Sam Altman" [--context "..."] [--type image|video|any] [--limit 5] [--json]
//   clypmint-broll plan script.txt [--max-beats 8] [--json]          (or pipe the script on stdin: plan -)
//   clypmint-broll get "Sam Altman" [--type video] [--out sam.mp4]  (search, then download/cut/capture the best shot)
//   clypmint-broll cut <video page or file> --start 12 --duration 4 [--out clip.mp4] [--aspect 9:16 --fit contain]
//   clypmint-broll capture <https://site> [--duration 5] [--scroll 1.5] [--out site.mp4]
//   clypmint-broll download <file url> [--out name]
//   clypmint-broll usage
//
// Every command prints one JSON line with --json (agents), or a readable summary (people).

import fs from 'node:fs';

import { capture } from './capture.mjs';
import { BrollError, createClient } from './client.mjs';
import { cut, download, MediaError, seconds } from './media.mjs';

const VERSION = '1.0.0';

function parse(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, inline] = a.slice(2).split('=', 2);
      const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) flags[key] = argv[++i];
      else flags[key] = true;
    } else args.push(a);
  }
  return { args, flags };
}

const HELP = `clypmint-broll ${VERSION}: real, verified b-roll for video agents (https://clypmint.com/broll)

  search <subject>        find shots   --context "<script line>" --type image|video|any --limit N --orientation portrait
  plan <file|->           b-roll for a whole script  --max-beats N --per-beat N
  get <subject>           search, then make the best shot's file  --type video --out file
  cut <url|file>          cut a clip   --start S --duration D [--end E] --aspect 9:16 --fit contain|cover --keep-audio
  capture <https://site>  record a live website  --duration 5 --scroll 1.5 --width 1920 --height 1080
  download <url>          save a direct file
  usage                   this month's searches and billing

  --json prints one JSON line. search/plan/get/usage need CLYPMINT_API_KEY (https://clypmint.com/broll/dashboard).
  cut needs ffmpeg (and yt-dlp for YouTube/X/TikTok pages); capture needs Chrome/Edge/Brave/Chromium and ffmpeg.`;

function print(flags, value, human) {
  if (flags.json) process.stdout.write(`${JSON.stringify(value)}\n`);
  else process.stdout.write(`${human(value)}\n`);
}

const shotLine = (s, i) =>
  `${String(i + 1).padStart(2)}. [${s.score ?? '?'}/10] ${s.type.padEnd(5)} ${s.shows || s.title}\n     ${s.delivery === 'direct' ? s.url : `${s.cut_command}`}\n     ${s.license.name}${s.license.attribution ? ` | credit: ${s.license.attribution}` : ''}`;

async function makeFile(shot, flags) {
  if (shot.delivery === 'local_capture') return capture(shot.url, { duration: Number(flags.duration ?? 5), out: flags.out });
  if (shot.type === 'video')
    return cut(shot.url, { start: seconds(flags.start ?? 0), duration: Number(flags.duration ?? 4), out: flags.out, aspect: flags.aspect, fit: flags.fit });
  return download(shot.url, { out: flags.out });
}

async function readScript(arg) {
  if (!arg || arg === '-') {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    return Buffer.concat(chunks).toString('utf8');
  }
  return fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg;
}

export async function main(argv) {
  const { args, flags } = parse(argv);
  const [command, ...rest] = args;
  if (!command || flags.help || command === 'help') return void process.stdout.write(`${HELP}\n`);
  if (flags.version || command === 'version') return void process.stdout.write(`${VERSION}\n`);
  const num = (v) => (v === undefined ? undefined : Number(v));

  if (command === 'search' || command === 'get') {
    const query = rest.join(' ').trim();
    if (!query) throw new MediaError(`${command} needs a subject, like: clypmint-broll ${command} "Sam Altman"`);
    const result = await createClient().search({
      query,
      ...(flags.context ? { context: String(flags.context) } : {}),
      ...(flags.type ? { type: String(flags.type) } : {}),
      ...(flags.orientation ? { orientation: String(flags.orientation) } : {}),
      ...(flags.limit ? { limit: num(flags.limit) } : {}),
      ...(flags.minScore ? { min_score: num(flags.minScore) } : {}),
    });
    if (command === 'search')
      return print(flags, result, (r) =>
        r.results.length
          ? `${r.interpreted.subject}${r.interpreted.entity ? ` (${r.interpreted.entity.description})` : ''}, ${r.took_ms} ms\n${r.results.map(shotLine).join('\n')}`
          : `No shot passed the check for "${r.query}" (not billed).`,
      );
    const best = result.results[0];
    if (!best) throw new MediaError(`No shot passed the check for "${query}" (not billed).`);
    const made = await makeFile(best, flags);
    return print(flags, { ...made, shot: best }, (m) => `${m.file}\n${best.shows || best.title}\n${best.license.name}${best.license.attribution ? ` | credit: ${best.license.attribution}` : ''}`);
  }

  if (command === 'plan') {
    const transcript = await readScript(rest[0]);
    const result = await createClient().plan({
      transcript,
      ...(flags.maxBeats ? { max_beats: num(flags.maxBeats) } : {}),
      ...(flags.perBeat ? { results_per_beat: num(flags.perBeat) } : {}),
    });
    return print(flags, result, (r) =>
      r.beats
        .map((b, i) => `## ${i + 1}. "${b.quote}" -> ${b.query}\n${b.results.length ? b.results.map(shotLine).join('\n') : '   (no shot passed the check)'}`)
        .join('\n\n'),
    );
  }

  if (command === 'cut') {
    const url = rest[0];
    if (!url) throw new MediaError('cut needs a video page or file: clypmint-broll cut <url> --start 12 --duration 4');
    const start = seconds(flags.start ?? 0, 'start');
    const end = seconds(flags.end, 'end');
    const duration = end !== undefined ? end - start : Number(flags.duration ?? 4);
    const made = await cut(url, { start, duration, out: flags.out, keepAudio: !!flags.keepAudio, height: num(flags.height) ?? 1080, aspect: flags.aspect, fit: flags.fit ?? 'contain' });
    return print(flags, made, (m) => `${m.file}  ${m.width}x${m.height}  ${m.duration?.toFixed(2)} s`);
  }

  if (command === 'capture') {
    const url = rest[0];
    if (!url) throw new MediaError('capture needs a site: clypmint-broll capture https://www.notion.com');
    const made = await capture(url, {
      duration: num(flags.duration) ?? 5,
      width: num(flags.width) ?? 1920,
      height: num(flags.height) ?? 1080,
      scroll: num(flags.scroll) ?? 1.5,
      out: flags.out,
    });
    return print(flags, made, (m) => `${m.file}  ${m.width}x${m.height}  ${m.duration?.toFixed(2)} s`);
  }

  if (command === 'download') {
    if (!rest[0]) throw new MediaError('download needs a file URL.');
    return print(flags, await download(rest[0], { out: flags.out }), (m) => `${m.file}  ${m.bytes} bytes`);
  }

  if (command === 'usage') return print(flags, await createClient().usage(), (u) => `${u.searches} searches this month, ${u.free_searches_left} free left, ${u.billed_searches} billed ($${u.billed_usd})`);

  throw new MediaError(`Unknown command "${command}". Run clypmint-broll --help.`);
}

export async function run(argv) {
  try {
    await main(argv);
  } catch (error) {
    const known = error instanceof BrollError || error instanceof MediaError;
    const json = argv.includes('--json');
    const message = known ? error.message : String(error?.stack || error);
    if (json) process.stdout.write(`${JSON.stringify({ error: { code: error.code ?? 'error', status: error.status ?? null, message } })}\n`);
    else process.stderr.write(`clypmint-broll: ${message}\n`);
    process.exitCode = 1;
  }
}
