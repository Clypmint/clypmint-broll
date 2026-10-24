// Making the file on the caller's own machine: cut a clip from a video page or file, or download a still.
// Needs ffmpeg (and yt-dlp for video pages such as YouTube). Nothing here talks to Clypmint.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const UA = 'clypmint-broll-cli/1.0 (+https://github.com/nuttallp/clypmint-broll)';

export class MediaError extends Error {}

export function has(bin) {
  return spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0 || spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0;
}

function need(bin, hint) {
  if (!has(bin)) throw new MediaError(`${bin} is not installed. ${hint}`);
}

const INSTALL = {
  ffmpeg: 'Install it: brew install ffmpeg (macOS), sudo apt install ffmpeg (Debian/Ubuntu), winget install ffmpeg (Windows).',
  ytdlp: 'Install it: brew install yt-dlp, or pipx install yt-dlp.',
};

export function run(bin, args, { quiet = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err = (err + d).slice(-4000);
      if (!quiet) process.stderr.write(d);
    });
    child.stdout.on('data', () => {});
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new MediaError(`${bin} failed (${code}): ${err.trim().split('\n').slice(-3).join(' ')}`))));
  });
}

/** "12", "12.5", "1:05", "01:02:03" -> seconds. */
export function seconds(value, name = 'time') {
  if (value === undefined || value === null || value === '') return undefined;
  const parts = String(value).split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) throw new MediaError(`${name} must be seconds or mm:ss.`);
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], { encoding: 'utf8' });
  if (r.status !== 0) return {};
  try {
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find((s) => s.codec_type === 'video');
    return { width: v?.width ?? null, height: v?.height ?? null, duration: Number(j.format?.duration) || null };
  } catch {
    return {};
  }
}

const DIRECT = /\.(mp4|m4v|mov|webm|mkv|ogv|mpg|mpeg)(\?|$)/i;
const IMAGE = /\.(jpe?g|png|webp|gif|avif|svg|tiff?)(\?|$)/i;

/** An Internet Archive item page -> its best MP4 file. */
async function archiveFile(url) {
  const id = /archive\.org\/details\/([^/?#]+)/.exec(url)?.[1];
  if (!id) return null;
  const r = await fetch(`https://archive.org/metadata/${id}`, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new MediaError(`The Internet Archive did not answer for ${id}.`);
  const j = await r.json();
  const files = (j.files || []).filter((f) => /\.mp4$/i.test(f.name));
  if (!files.length) throw new MediaError(`No MP4 in archive item ${id}.`);
  files.sort((a, b) => (/512kb|ia\.mp4/i.test(a.name) ? 1 : 0) - (/512kb|ia\.mp4/i.test(b.name) ? 1 : 0) || Number(b.size || 0) - Number(a.size || 0));
  return `https://archive.org/download/${id}/${encodeURIComponent(files[0].name)}`;
}

function outPath(out, base, ext) {
  if (out) return path.resolve(out);
  const safe = String(base).replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'broll';
  return path.resolve(`${safe}.${ext}`);
}

/**
 * Cut [start, start + duration) of a video page or file to an H.264 MP4 (silent unless keepAudio), at most
 * `height` tall. Framing is kept as filmed unless `aspect` is given: then `fit` picks contain (pad) or cover (crop).
 */
export async function cut(url, { start = 0, duration = 4, out, keepAudio = false, height = 1080, aspect, fit = 'contain' } = {}) {
  need('ffmpeg', INSTALL.ffmpeg);
  if (!(duration > 0 && duration <= 600)) throw new MediaError('duration must be between 0 and 600 seconds.');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'clypmint-broll-'));
  try {
    let input = url;
    let seekInInput = true;
    if (/archive\.org\/details\//.test(url)) input = await archiveFile(url);
    else if (!DIRECT.test(url) && !/^file:|^\//.test(url)) {
      // a video page (YouTube, Vimeo, X, TikTok...): yt-dlp fetches only the section asked for
      need('yt-dlp', INSTALL.ytdlp);
      const tmpl = path.join(work, 'section.%(ext)s');
      await run('yt-dlp', [
        '--no-playlist', '--quiet', '--no-warnings',
        '-f', `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/b[height<=${height}][ext=mp4]/bv*[height<=${height}]+ba/b[height<=${height}]/b`,
        '--download-sections', `*${start}-${start + duration}`, '--force-keyframes-at-cuts',
        '-o', tmpl, '--', url,
      ]);
      const got = fs.readdirSync(work).find((f) => f.startsWith('section.'));
      if (!got) throw new MediaError('yt-dlp returned no file.');
      input = path.join(work, got);
      seekInInput = false;
    }
    const target = outPath(out, `broll-${new URL(url, 'file:///').pathname.split('/').pop() || 'clip'}-${Math.round(start)}s`, 'mp4');
    const filters = [`scale=-2:'min(${height},ih)'`];
    if (aspect) {
      const [aw, ah] = String(aspect).split(':').map(Number);
      if (!(aw > 0 && ah > 0)) throw new MediaError('aspect is like 9:16 or 16:9.');
      const H = height - (height % 2);
      const W = Math.round((H * aw) / ah / 2) * 2;
      filters.splice(
        0,
        1,
        fit === 'cover'
          ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`
          : `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`,
      );
    }
    filters.push('format=yuv420p');
    await run('ffmpeg', [
      '-y', '-loglevel', 'error',
      ...(seekInInput && start ? ['-ss', String(start)] : []),
      // (Wikimedia and others refuse ffmpeg's default agent; the same polite one the downloads send)
      ...(/^https?:/.test(input) ? ['-user_agent', UA] : []),
      '-i', input,
      '-t', String(duration),
      '-vf', filters.join(','),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart',
      ...(keepAudio ? ['-c:a', 'aac', '-b:a', '160k'] : ['-an']),
      target,
    ]);
    return { file: target, ...probe(target), source: url, start, duration };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

/** Save a direct file (an image, or a whole video file) as it is. */
export async function download(url, { out } = {}) {
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new MediaError(`Download failed: HTTP ${r.status}.`);
  const type = (r.headers.get('content-type') || '').split(';')[0];
  const guessed = (IMAGE.exec(url) || DIRECT.exec(url))?.[1]?.toLowerCase() || type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'bin';
  const ext = /^[a-z0-9]{1,5}$/.test(guessed) ? guessed : 'bin';
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'broll').replace(/\.[a-z0-9]+$/i, '');
  const target = outPath(out, name, ext);
  fs.writeFileSync(target, Buffer.from(await r.arrayBuffer()));
  return { file: target, bytes: fs.statSync(target).size, type };
}
