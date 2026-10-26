# Clypmint B-Roll (real footage for any agent)

![An agent asks for b-roll; the API finds real footage, scores every shot and checks every license](docs/hero.gif)

**Ask for any shot in plain words. Get the real footage, scored, with its rights.**

One API key gives your agent b-roll an editor would pick: the person, the company, the app, the place, the moment your script names. Every candidate is checked by a vision model and scored 0-10. Every shot says where it came from and what you may do with it. It plugs into Claude Code, Cursor, Codex and any MCP client, and there is a REST API, a CLI and clients for JavaScript and Python. Built by [Clypmint](https://clypmint.com).

> **Launch week: 50% off every search through Nov 2.** $0.01 a licensed search, $0.03 a web search. [Get a key](https://clypmint.com/broll/dashboard) · [Try it in the browser](https://clypmint.com/broll) (no key) · [Docs](https://clypmint.com/broll/docs) · [Benchmark](https://clypmint.com/broll/benchmarks)

## Why it exists

Video agents are good at scripts and voices and bad at pictures. Stock shows *a* CEO; your script names *the* CEO. Image search returns links with no license, and an agent cannot watch a video to find the four seconds it needs.

This does the part an editor does:

1. **Plan.** Send the subject and, ideally, the line it plays over. The line decides which "Claude" or "Apple" you mean.
2. **Find.** We look up what the name means (Wikidata), then search sources that publish for reuse: Wikimedia Commons, NASA, public-domain film on the Internet Archive, Openverse, the Library of Congress, and the subject's own site and official YouTube channel. Web mode (`"rights": "any"`) also searches the open web.
3. **Check.** One vision call scores every candidate against what the shot must show. Wrong person, watermark, collage: dropped. In web mode a model watches the top videos and returns the 2-6 second moment.
4. **Drop it in.** Each image has a `download_url` at a working size. Each video has one command that cuts just the seconds you need on your machine.

| You ask for | You get |
|---|---|
| `Sam Altman` | Licensed portraits of Sam Altman, scored 9-10, with the credit line |
| `booster` + "SpaceX just landed the booster again" | Public-domain footage of a Falcon 9 booster touchdown |
| `Notion` + "I plan every video in Notion" | The live notion.com interface, recorded on your machine |
| A scene from a film, web mode (`"rights": "any"`) | The moment in the video, as a start and end and a command that cuts it, marked Not cleared |

## Quickstart

```bash
# 1. Make a key and top up (from $10): https://clypmint.com/broll/dashboard
export CLYPMINT_API_KEY=cm_live_...

# 2. Give it to your agent (Claude Code)
claude mcp add --transport http clypmint-broll https://clypmint.com/mcp/broll \
  --header "Authorization: Bearer $CLYPMINT_API_KEY"

# 3. Try it
npx -y github:Clypmint/clypmint-broll#v1.1.0 search "Saturn V launch" --type video
```

Then ask your agent: *"find b-roll for every name in this script."*

### Or install it as a Claude Code plugin

```text
/plugin marketplace add Clypmint/clypmint-broll
/plugin install clypmint-broll@clypmint-broll
```

The plugin asks for your key once and keeps it in your system's secure store. It brings the MCP server (`find_broll`, `plan_broll`, `broll_usage`) and the agent skill that teaches sourcing, placing and crediting a shot.

### Other agents

<details><summary>Cursor (<code>~/.cursor/mcp.json</code>)</summary>

```json
{
  "mcpServers": {
    "clypmint-broll": {
      "url": "https://clypmint.com/mcp/broll",
      "headers": { "Authorization": "Bearer cm_live_YOUR_KEY" }
    }
  }
}
```
</details>

<details><summary>Codex (<code>~/.codex/config.toml</code>)</summary>

```toml
[mcp_servers.clypmint-broll]
url = "https://clypmint.com/mcp/broll"
bearer_token_env_var = "CLYPMINT_API_KEY"
```
</details>

<details><summary>Any agent that reads skills</summary>

```bash
npx skills add Clypmint/clypmint-broll
```

Or copy [`skills/broll/SKILL.md`](skills/broll/SKILL.md) into your agent's skills folder (Claude Code: `~/.claude/skills/broll/SKILL.md`).
</details>

The MCP server is `https://clypmint.com/mcp/broll`, listed on the official MCP registry as `com.clypmint/broll`.

## Pricing

You pay per search from a prepaid balance, the way search APIs charge: one price per call, stated before you call, and only a search that finds verified shots is charged.

| | Price | Per 1,000 | Launch week (through Nov 2) |
|---|---|---|---|
| Licensed search (default) | $0.02 | $20 | $0.01 |
| Web search (`"rights": "any"`) | $0.06 | $60 | $0.03 |

- A search that finds nothing, only near matches, or shots that could not be checked costs nothing.
- Top up from $10 (to $1,000 at a time). Your balance never expires. Turn on auto top-up and we add the amount you pick when it runs low.
- Any balance you have not used can be refunded within 14 days of adding it.
- Every answer carries `usage`: what it cost, the balance left and the prices now. `GET /api/v1/broll/usage` gives the same before you search. Out of balance, a search answers `402 balance_too_low` with the price, the balance and the top-up link.
- Try it free in the browser first, no key: [clypmint.com/broll](https://clypmint.com/broll).

## Benchmark

[B-Roll Bench v1](https://clypmint.com/broll/benchmarks): the same 100 requests (people, companies, places, events, archival moments, generic scenes, film and TV scenes) sent to every service, the results judged blind by two models, Gemini 3.5 Flash and Claude Sonnet 5.5 (they agreed on 88.2% of first results). Run Oct 25, 2026.

| Service | Right shot first | Right shot in top 5 | Median time | Price per 1,000 | Rights |
|---|---|---|---|---|---|
| **Clypmint, web mode** | **62.5%** | **76.5%** | 7 s | $60 | Marked not cleared |
| Brave image search | 45.5% | 74.5% | 0.7 s | $5 | No license data |
| **Clypmint, licensed** | 37.5% | 42% | 4.9 s | $20 | Licensed, with credit line |
| Pexels | 19.5% | 28.5% | 0.4 s | Free | Stock license |
| Wikimedia Commons search | 8.5% | 10% | 0.4 s | Free | Licensed |
| Openverse | 6% | 7.5% | 1.8 s | Free | Licensed |

On the 15 film and TV scenes, web mode got the right shot first 56.7% of the time, against 50% for Brave and 0% for every licensed source. Every request, every result and every judgement is in [`bench/v1`](bench/v1), and you can run it yourself:

```bash
cd bench/v1
CLYPMINT_API_KEY=... GEMINI_API_KEY=... BRAVE_API_KEY=... PEXELS_API_KEY=... node harness.mjs run --api
```

## What you get back

```bash
curl https://clypmint.com/api/v1/broll/search \
  -H "Authorization: Bearer $CLYPMINT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "Sam Altman", "context": "Sam Altman just walked on stage", "type": "image", "limit": 1}'
```

```json
{
  "request_id": "2b9d7f0e-6c1a-4f53-9d0e-6a1f3c8e2b41",
  "query": "Sam Altman",
  "interpreted": {
    "subject": "Sam Altman",
    "kind": "person",
    "entity": { "id": "Q7407093", "label": "Sam Altman", "url": "https://www.wikidata.org/wiki/Q7407093" },
    "look_for": "Sam Altman walking onto a stage at a conference or event"
  },
  "verified": true,
  "results": [
    {
      "type": "image",
      "title": "Sam Altman speaking at TED",
      "shows": "Full shot of Sam Altman seated on stage at TED",
      "score": 9,
      "url": "https://upload.wikimedia.org/wikipedia/commons/0/06/Sam_Altman_speaking_at_TED.jpg",
      "download_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Sam_Altman_speaking_at_TED.jpg/1920px-Sam_Altman_speaking_at_TED.jpg",
      "orientation": "portrait",
      "source": { "name": "Wikimedia Commons", "page_url": "https://commons.wikimedia.org/wiki/File:Sam_Altman_speaking_at_TED.jpg" },
      "license": {
        "name": "CC BY 2.0",
        "url": "https://creativecommons.org/licenses/by/2.0",
        "commercial_use": true,
        "cleared": true,
        "attribution": "Steve Jurvetson / CC BY 2.0 / https://commons.wikimedia.org/wiki/File:Sam_Altman_speaking_at_TED.jpg"
      },
      "delivery": "direct"
    }
  ],
  "took_ms": 4810,
  "cached": false,
  "usage": {
    "charged_usd": 0.01,
    "balance_usd": 9.99,
    "price_usd": { "licensed": 0.01, "web": 0.03 },
    "list_price_usd": { "licensed": 0.02, "web": 0.06 },
    "offer": { "label": "Launch week: 50% off every search through Nov 2", "percent_off": 50, "ends_at": "2026-11-03T07:59:59Z" }
  }
}
```

A whole script at once: each moment comes back with the exact words it starts on, and its time if you send word timings.

```bash
curl https://clypmint.com/api/v1/broll/plan \
  -H "Authorization: Bearer $CLYPMINT_API_KEY" -H "Content-Type: application/json" \
  -d '{"transcript": "Last week I flew to Tokyo to meet the Figma team...", "max_beats": 8}'
```

The full reference is at [clypmint.com/broll/docs](https://clypmint.com/broll/docs), and the OpenAPI spec at [`/api/v1/broll/openapi.json`](https://clypmint.com/api/v1/broll/openapi.json) (Postman, Insomnia, or a generated client in any language).

## Use it from code

**JavaScript**

```bash
npm install github:Clypmint/clypmint-broll#v1.1.0
```

```js
import { createClient } from '@clypmint/broll';

const broll = createClient(); // reads CLYPMINT_API_KEY
const { results, usage } = await broll.search({ query: 'Figma', context: 'we design everything in Figma' });
```

**Python**

```bash
pip install "git+https://github.com/Clypmint/clypmint-broll@v1.1.0#subdirectory=python"
```

```python
from clypmint_broll import Broll

broll = Broll()  # reads CLYPMINT_API_KEY
shots = broll.search("Eiffel Tower", type="video")["results"]
```

**CLI**

```bash
npx -y github:Clypmint/clypmint-broll#v1.1.0 search "Eiffel Tower" --type video
npx -y github:Clypmint/clypmint-broll#v1.1.0 get "Notion" --type video --out notion.mp4   # records the live site
npx -y github:Clypmint/clypmint-broll#v1.1.0 cut "https://www.youtube.com/watch?v=..." --start 12 --duration 4 --aspect 9:16
npx -y github:Clypmint/clypmint-broll#v1.1.0 usage
```

`cut` needs ffmpeg (and yt-dlp for YouTube, X or TikTok pages). `capture` and `get` for a live site use the Chrome, Edge, Brave or Chromium you already have. Every command takes `--json` for agents.

## Where the footage comes from

Licensed mode, the default, uses only sources whose terms allow reuse, and every shot says which:

- **Wikidata** (CC0) tells us who or what a name is, its official photo, logo, website and YouTube channel.
- **Wikimedia Commons**: freely licensed photos and video, with the license and author on each file.
- **NASA** image and video library, **public-domain film** on the Internet Archive, **Openverse** and the **Library of Congress** photo collections marked free to use.
- **The subject's own website and official YouTube channel**: a link plus a command. The clip is cut, or the site recorded, on your machine. We never host it.

Web mode (`"rights": "any"`) adds the open web: the scene from the film, the photo from yesterday's news. Those shots come back with `license.cleared: false` and the name `Not cleared`, because the owner holds the rights. Check before commercial use.

`license.commercial_use` is `true` (free for commercial use under its terms), `false` (non-commercial only; ranked last) or `null` (the owner holds the rights). Use the `attribution` line whenever one is given. You are responsible for how you use what you publish.

## FAQ

**Is this a stock library?** No. Stock shows *a* CEO. This shows *the* CEO your script names. For generic scenes it finds real, freely licensed photos and footage.

**What does "verified" mean?** A vision model saw every candidate and scored it against what the shot must show. `verified: false` means the check could not run; those results are ranked by source alone and cost nothing.

**Does it work for vertical video?** Pass `"orientation": "portrait"` to rank vertical shots first, and `cut --aspect 9:16` to fit any clip (contain by default, `--fit cover` to crop).

**How fast is it?** A licensed search answers in about 5 seconds and a web search in about 7 (bench medians).

## What's in this repository

| Path | What it is |
|---|---|
| [`src/`](src), [`bin/`](bin) | The JavaScript client and the `clypmint-broll` CLI (search, plan, get, cut, capture, usage) |
| [`python/`](python) | The Python client |
| [`skills/broll/`](skills/broll) | The agent skill: how to source, place and credit b-roll |
| [`.claude-plugin/`](.claude-plugin), [`.mcp.json`](.mcp.json) | The Claude Code plugin and its marketplace |
| [`bench/v1/`](bench/v1) | B-Roll Bench v1: the 100 requests, the harness, the judge prompts and every result |
| [`test/`](test) | Tests for the CLI and the client |

The search engine itself runs as a hosted service at clypmint.com.

## License

The client, CLI, skill, plugin and benchmark in this repository are MIT. The API is a hosted service by [Clypmint](https://clypmint.com).
