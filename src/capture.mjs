// Record a live website as b-roll on the caller's own machine: the real interface, scrolling smoothly, as an
// H.264 MP4. Uses the Chrome (or Edge, Brave, Chromium) already installed, driven over the DevTools protocol,
// and ffmpeg. No browser download, no dependencies.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { MediaError, probe, run } from './media.mjs';

const CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge'],
  win32: [
    `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
  ],
};

export function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  return (CANDIDATES[process.platform] || []).find((p) => p && fs.existsSync(p)) || null;
}

/** A minimal DevTools protocol connection over the browser's WebSocket (flattened target sessions). */
function connect(wsUrl) {
  if (typeof WebSocket === 'undefined') throw new MediaError('Node 22 or newer is needed for capture (built-in WebSocket).');
  const ws = new WebSocket(wsUrl);
  let next = 1;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new MediaError(`${msg.error.message}`)) : resolve(msg.result);
    } else for (const l of listeners) l(msg);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new MediaError('Could not connect to the browser.')), { once: true });
  });
  return {
    opened,
    send(method, params = {}, sessionId) {
      const id = next++;
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    close() {
      try {
        ws.close();
      } catch {}
    },
  };
}

function launch(chrome, { width, height, profile }) {
  const child = spawn(
    chrome,
    [
      '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
      '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
      '--force-device-scale-factor=1', 'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  return new Promise((resolve, reject) => {
    let err = '';
    const timer = setTimeout(() => reject(new MediaError('The browser did not start in 20 s.')), 20000);
    child.stderr.on('data', (d) => {
      err += d;
      const ws = /DevTools listening on (ws:\/\/\S+)/.exec(err)?.[1];
      if (ws) {
        clearTimeout(timer);
        resolve({ child, ws });
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new MediaError(`The browser exited (${code}): ${err.slice(-300)}`));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Open `url` at width x height, hold `hold` s, then scroll smoothly through `scroll` viewport heights for the rest
 * of `duration` (or hold still with scroll 0), and encode the screencast at `fps` to an MP4.
 */
export async function capture(url, { duration = 5, width = 1920, height = 1080, scroll = 1.5, hold = 0.8, fps = 30, out } = {}) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('scheme');
    url = parsed.href;
  } catch {
    throw new MediaError('capture needs a full http(s) URL, like https://www.notion.com');
  }
  if (!(duration > 0 && duration <= 60)) throw new MediaError('duration must be between 0 and 60 seconds.');
  const chrome = findChrome();
  if (!chrome) throw new MediaError('No Chrome, Edge, Brave or Chromium found. Install one, or set CHROME_PATH.');
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'clypmint-capture-'));
  const { child, ws } = await launch(chrome, { width, height, profile: path.join(work, 'profile') });
  const cdp = connect(ws);
  try {
    await cdp.opened;
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    await s('Page.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const loaded = new Promise((resolve) => {
      const off = cdp.on((m) => {
        if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') {
          off();
          resolve();
        }
      });
    });
    await s('Page.navigate', { url });
    await Promise.race([loaded, sleep(20000)]);
    await sleep(1500); // late fonts, hero animations, lazy images

    const frames = [];
    const off = cdp.on((m) => {
      if (m.sessionId !== sessionId || m.method !== 'Page.screencastFrame') return;
      frames.push({ t: m.params.metadata.timestamp, data: m.params.data });
      s('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
    });
    await s('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
    const scrollMs = Math.max(0, (duration - hold) * 1000 - 200);
    if (scroll > 0 && scrollMs > 0)
      await s('Runtime.evaluate', {
        expression: `(() => { const d = ${Math.round(scroll * height)}, ms = ${scrollMs}, wait = ${Math.round(hold * 1000)};
          const ease = (x) => x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x + 2, 3) / 2;
          setTimeout(() => { const t0 = performance.now(), y0 = scrollY;
            const step = (now) => { const k = Math.min(1, (now - t0) / ms); scrollTo(0, y0 + d * ease(k)); if (k < 1) requestAnimationFrame(step); };
            requestAnimationFrame(step); }, wait); })()`,
      });
    // the page also repaints on its own; a nudge keeps frames coming while it holds still
    const started = Date.now();
    while (Date.now() - started < duration * 1000 + 300) {
      await sleep(100);
      if (frames.length === 0 && Date.now() - started > 3000) await s('Runtime.evaluate', { expression: 'void 0' });
    }
    await s('Page.stopScreencast');
    off();
    if (frames.length < 2) {
      const shot = await s('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      frames.push({ t: 0, data: shot.data }, { t: duration, data: shot.data });
    }

    // variable frame times -> a concat list with each frame's real duration, encoded at a constant rate
    const t0 = frames[0].t;
    const list = [];
    frames.forEach((f, i) => {
      const file = path.join(work, `f${String(i).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
      const end = i + 1 < frames.length ? frames[i + 1].t : t0 + duration;
      list.push(`file '${file.replace(/'/g, "'\\''")}'`, `duration ${Math.max(0.001, end - f.t).toFixed(4)}`);
    });
    list.push(`file '${path.join(work, `f${String(frames.length - 1).padStart(5, '0')}.jpg`).replace(/'/g, "'\\''")}'`);
    fs.writeFileSync(path.join(work, 'frames.txt'), list.join('\n'));
    const host = new URL(url).host.replace(/^www\./, '');
    const target = path.resolve(out || `capture-${host.replace(/[^\w.-]+/g, '-')}.mp4`);
    await run('ffmpeg', [
      '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(work, 'frames.txt'),
      '-t', String(duration), '-r', String(fps), '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-movflags', '+faststart', '-an', target,
    ]);
    return { file: target, ...probe(target), source: url, frames: frames.length };
  } finally {
    cdp.close();
    child.kill('SIGKILL');
    fs.rmSync(work, { recursive: true, force: true });
  }
}
