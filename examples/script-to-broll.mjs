// A whole script in, b-roll out. One plan call finds every moment worth a cutaway; this prints each moment's best
// shot and collects the credit lines. With --make it saves every shot in ./broll: images downloaded, videos cut on this
// machine (in web mode, the moment the search found), live sites recorded.
//
//   CLYPMINT_API_KEY=cm_live_... node examples/script-to-broll.mjs script.txt [--make] [--web]
//
// In your own project, install github:Clypmint/clypmint-broll#v1.2.1 and import from '@clypmint/broll' instead.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '../src/client.mjs';
import { download } from '../src/media.mjs';

const CLI = fileURLToPath(new URL('../bin/clypmint-broll.mjs', import.meta.url));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith('--')));
const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: node examples/script-to-broll.mjs script.txt [--make] [--web]');
  process.exit(1);
}

const { beats, usage } = await createClient().plan({
  transcript: fs.readFileSync(file, 'utf8'),
  max_beats: 8,
  ...(flags.has('--web') ? { rights: 'any' } : {}),
});

const credits = [];
for (const [i, beat] of beats.entries()) {
  const shot = beat.results[0];
  console.log(`${i + 1}. "${beat.quote}"`);
  if (!shot) {
    console.log(`   no shot passed the check${beat.withheld ? `: ${beat.withheld}` : ''}`);
    continue;
  }
  console.log(`   [${shot.score}/10] ${shot.shows || shot.title}${shot.license.cleared === false ? ' (NOT CLEARED)' : ''}`);
  if (shot.license.attribution) credits.push(shot.license.attribution);
  if (!flags.has('--make')) continue;

  fs.mkdirSync('broll', { recursive: true });
  const name = path.join('broll', String(i + 1).padStart(2, '0'));
  if (shot.delivery === 'direct' && shot.type === 'image') {
    const url = shot.download_url ?? shot.url;
    const ext = path.extname(new URL(url).pathname).toLowerCase() || '.jpg';
    console.log(`   saved ${(await download(url, { out: name + ext })).file}`);
  } else {
    // cut_args is the clip (or the site recording) as CLI arguments: run it with no shell in between
    const cutArgs = shot.cut_args ?? ['cut', shot.url];
    execFileSync(process.execPath, [CLI, ...cutArgs, '--out', `${name}.mp4`], { stdio: ['ignore', 'ignore', 'inherit'] });
    console.log(`   saved ${path.resolve(`${name}.mp4`)}`);
  }
}

if (credits.length) console.log(`\nCredits:\n${credits.join('\n')}`);
console.log(`\nCharged $${usage.charged_usd}, $${usage.balance_usd} left.`);
