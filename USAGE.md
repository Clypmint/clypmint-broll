# clypmint-broll: CLI usage

`clypmint-broll` finds b-roll with the Clypmint B-Roll API and makes the files on your machine. It is a thin client:
the search runs at clypmint.com, and cutting, downloading and recording run locally.

```bash
npx -y github:Clypmint/clypmint-broll#v1.2.1 <command> [flags]
```

Or install it once: `npm install -g github:Clypmint/clypmint-broll#v1.2.1`, then run `clypmint-broll <command>`.

## Before you start

| You need | For |
|---|---|
| Node 18 or newer | every command (`capture` needs Node 22) |
| `CLYPMINT_API_KEY` | `search`, `plan`, `get` and `usage`. Make one at [clypmint.com/broll/dashboard](https://clypmint.com/broll/dashboard) |
| ffmpeg | `cut`, `get` for videos, and `capture` |
| yt-dlp | cutting from a video page (YouTube, X, TikTok, Vimeo) |
| Chrome, Edge, Brave or Chromium | `capture`, and `get` for a live site |

Install ffmpeg and yt-dlp with `brew install ffmpeg yt-dlp` (macOS), `sudo apt install ffmpeg` and `pipx install yt-dlp`
(Debian or Ubuntu), or `winget install ffmpeg` (Windows).

## Commands

### search

Find shots for one subject, best first.

```bash
clypmint-broll search "Sam Altman" --context "Sam Altman just walked on stage" --type image --limit 3
clypmint-broll search "Nelson Mandela" --keywords "Mandela 1990, Mandela crowd" --names "Nelson Mandela"
clypmint-broll search "Wolf of Wall Street chest thump" --rights any --type video
```

| Flag | What it does |
|---|---|
| `--context "<line>"` | The script line the shot plays over. It decides which "Apple" you mean. |
| `--type image\|video\|any` | What kind of shot. Default `any`. |
| `--limit N` | How many shots to return, 1-10. Default 5. |
| `--orientation portrait\|landscape\|square` | Rank shots of that shape first. Default any. |
| `--min-score N` | Only shots the check scored N or higher, 0-10. Default 6. |
| `--rights any` | Also the open web: film scenes, news photos, YouTube moments. Those shots are marked NOT CLEARED. |
| `--keywords "a, b"` | Your own archive searches, 1-5 of 1-3 words each. The search skips its planning step. |
| `--names "x, y"` | The people, companies, places and events the line names. |
| `--look-for "..."` | What the right shot shows. |

### plan

Find b-roll for a whole script: every moment worth a cutaway, each with its shots.

```bash
clypmint-broll plan script.txt --max-beats 8
cat script.txt | clypmint-broll plan -
```

| Flag | What it does |
|---|---|
| `--max-beats N` | The most moments to fill, 1-20. Default 8. |
| `--per-beat N` | Shots per moment, 1-5. Default 3. |
| `--rights any` | Also the open web. |

### get

Search, then make the best shot's file: an image is downloaded, a video is cut, a live site is recorded.

```bash
clypmint-broll get "Saturn V launch" --type video --out saturn.mp4
clypmint-broll get "Notion" --type video --out notion.mp4
```

Takes every `search` flag, plus `--out`, and for videos `--start`, `--duration`, `--aspect` and `--fit`. In web mode
the clip starts on the moment the search found, unless you pass `--start`.

### cut

Cut a clip from a video page or file.

```bash
clypmint-broll cut "https://www.youtube.com/watch?v=..." --start 12 --duration 4 --aspect 9:16
clypmint-broll cut ./interview.mp4 --start 1:05 --end 1:09 --out quote.mp4
```

| Flag | What it does |
|---|---|
| `--start S` | Where the clip starts, in seconds or `m:ss`. Default 0. |
| `--duration D` or `--end E` | How long it runs, or where it ends. Default 4 seconds, at most 600. |
| `--aspect 9:16` | Fit the clip to a frame shape. |
| `--fit contain\|cover` | `contain` (default) keeps the whole picture; `cover` crops to fill. |
| `--height N` | The tallest the clip may be. Default 1080. |
| `--keep-audio` | Keep the sound. Clips are silent by default. |
| `--out file.mp4` | Where to save it. |

The clip is an H.264 MP4. Only the seconds you ask for are fetched.

### capture

Record a live website, scrolling smoothly.

```bash
clypmint-broll capture https://www.notion.com --duration 5 --scroll 1.5
```

| Flag | What it does |
|---|---|
| `--duration N` | Seconds, at most 60. Default 5. |
| `--scroll N` | How many screen heights to scroll. `0` holds still. Default 1.5. |
| `--width N`, `--height N` | The window size. Default 1920 by 1080. |
| `--out file.mp4` | Where to save it. |

The browser starts with a fresh, empty profile, so your logins and cookies are never used.

### download

Save a direct file (an image, or a whole video file) as it is.

```bash
clypmint-broll download "https://upload.wikimedia.org/wikipedia/commons/0/06/Sam_Altman_speaking_at_TED.jpg"
```

### usage

Your balance, this month's spend, auto top-up and the prices. It costs nothing.

```bash
clypmint-broll usage
```

## For agents: --json

Every command takes `--json` and prints exactly one JSON line, errors included:

```json
{"error":{"code":"balance_too_low","status":402,"message":"..."}}
```

On an error the exit code is 1. Without `--json`, results print as readable text and errors go to stderr.

## Settings

| Variable | What it does |
|---|---|
| `CLYPMINT_API_KEY` | Your key. Sent only to the API, never printed or saved. |
| `CLYPMINT_API_URL` | Another API address, for testing. Default `https://clypmint.com`. |
| `CHROME_PATH` | The browser `capture` uses, if it is not in the usual place. |

`clypmint-broll --help` lists every command; `clypmint-broll --version` prints the version.
