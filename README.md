# Clypmint B-Roll (b-roll of anything, for any agent)

[![GitHub stars](https://img.shields.io/github/stars/Clypmint/clypmint-broll?style=social)](https://github.com/Clypmint/clypmint-broll/stargazers) [![MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE) [![MCP registry](https://img.shields.io/badge/MCP-com.clypmint%2Fbroll-black)](https://registry.modelcontextprotocol.io)

![An agent asks for b-roll; the API finds real footage, scores every shot and checks every license](docs/assets/hero.gif)

**A b-roll library your agent searches in plain words.** Give it one API key and it gets the real shot: the person,
company, product, place or event your script names. One search covers Wikimedia Commons, NASA, the Internet Archive,
the Library of Congress, Openverse, and the subject's own site and YouTube channel. Web mode adds the open web, down to
the exact moment inside a YouTube video. A vision model checks every shot, and every shot comes with its rights.
**Priced per search, from 2 cents**, with no stock subscription.

**Ask for the shot, not the source.** You don't need to know which archive has the Apollo 11 launch, or which minute of
the keynote shows the first iPhone. Send the line from your script and get the shot.

Built by [Clypmint](https://clypmint.com) for its AI video editor, and open to every agent and every video app. Live at
[clypmint.com/broll](https://clypmint.com/broll).

> **Your first 100 searches are free.** Then $0.02 a licensed search, $0.06 a web search, half price through Nov 2.
> [Get a key](https://clypmint.com/broll/dashboard) · [Try it in the browser](https://clypmint.com/broll) (no key) ·
> [Docs](https://clypmint.com/broll/docs) · [Benchmark](https://clypmint.com/broll/benchmarks)

## Why it exists

Video agents are good at scripts and voices and bad at pictures. Stock shows *a* CEO; your script names *the* CEO.
Image search gives you links with no license. And an agent can't watch a video to find the four seconds it needs.

This does the part an editor does:

1. **Plan.** Your agent sends the subject, the line it plays over, and its own search words. The line decides which
   "Apple" you mean.
2. **Find.** We look up what the name means on Wikidata, then search every source at once.
3. **Check.** A vision model scores every shot against what it must show. Wrong person, watermark, collage: dropped. In
   web mode a model watches the top videos and returns the 2-6 second moment.
4. **Drop it in.** Each image has a `download_url`. Each video has one command that cuts just the seconds you need, on
   your machine.

| You ask for | You get |
|---|---|
| `Sam Altman` | Licensed portraits of Sam Altman, scored 9-10, with the credit line |
| `booster` + "SpaceX just landed the booster again" | Public-domain footage of a Falcon 9 booster landing |
| `Notion` + "I plan every video in Notion" | The live notion.com site, recorded on your machine |
| A scene from a film, in web mode | The moment in the video, with a start, an end and a command that cuts it, marked Not cleared |

## Two kinds of search, one key

- **Licensed** (the default, $0.02). Only sources whose terms allow reuse. Every shot has its license and credit line.
- **Web** (`"rights": "any"`, $0.06). Also the open web: the scene from the film, the photo from yesterday's news, the
  moment inside a YouTube video. These shots come back marked *Not cleared*, because the owner holds the rights.

A search is only charged when it finds checked shots.

---

# Part 1 · Using it

## Quickstart

```bash
# 1. sign up and make a key (your first 100 searches are free): https://clypmint.com/broll/dashboard
export CLYPMINT_API_KEY=cm_live_...

# 2. give it to your agent (Claude Code)
claude mcp add --transport http clypmint-broll https://clypmint.com/mcp/broll \
  --header "Authorization: Bearer $CLYPMINT_API_KEY"

# 3. try it
npx -y github:Clypmint/clypmint-broll#v1.2.1 search "Saturn V launch" --type video
```

Then ask your agent: *"find b-roll for every name in this script."* Every CLI command is in [USAGE.md](USAGE.md).

### Or install it as a Claude Code plugin

```text
/plugin marketplace add Clypmint/clypmint-broll
/plugin install clypmint-broll@clypmint-broll
```

The plugin asks for your key once and keeps it in your system's secure store. It brings the MCP tools and the skill
below.

### Codex

```bash
codex plugin marketplace add Clypmint/clypmint-broll
codex plugin add clypmint-broll@clypmint-broll
```

The Codex plugin reads your key from `CLYPMINT_API_KEY`.

### Cursor and other agents

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

<details><summary>Codex without the plugin (<code>~/.codex/config.toml</code>)</summary>

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

Or copy [`skills/broll/SKILL.md`](skills/broll/SKILL.md) into your agent's skills folder (Claude Code:
`~/.claude/skills/broll/SKILL.md`).
</details>

The MCP server is `https://clypmint.com/mcp/broll`, listed on the official MCP registry as `com.clypmint/broll`. Any MCP
client can list its tools before you add a key; a search needs one.

### What your agent gets

| Tool | What your agent can do |
|---|---|
| `find_broll` | Send one subject (a person, company, product, app, place, event or scene) and the line it plays over. Get checked shots, best first, each with its license. For a whole script, use `plan_broll`. Charged only when checked shots come back. |
| `plan_broll` | Send a whole script. Get every moment worth a cutaway, with the words it starts on and its shots. Each moment is charged like one `find_broll` search, only when it finds checked shots. |
| `broll_usage` | See the balance, this month's spend, whether auto top-up is on, and the prices. Free. |
| [`broll` skill](skills/broll/SKILL.md) | Source, cut, place and credit each shot. |

## Using Claude to edit videos?

Already pointing Claude at the Internet Archive for b-roll? This searches it too, together with Wikimedia Commons,
NASA, the Library of Congress, Openverse and official channels, in one call. It checks every shot and tells you what
you may do with it.

Install the plugin (above), then add this to your project's `CLAUDE.md` once:

```text
Whenever a line names a person, company, product, place or event, get b-roll for it with find_broll
(or plan_broll for the whole script). Send the line as context and 1-3 short keywords. Use the top shot,
cut only the seconds you need with its cut_command, and put its credit line in the credits.
```

It works with any setup that renders files: Remotion, HyperFrames, ffmpeg or an editor's timeline. The full version,
with where the files go, is [examples/claude-video](examples/claude-video).

## Building an AI video app?

Use it as your app's b-roll source. Two calls cover it:

- `POST /api/v1/broll/search`: send a subject and its line, get checked shots, best first.
- `POST /api/v1/broll/plan`: send a whole script, get the moments worth a cutaway, each with its shots and the words it
  starts on (and times, if you send word timings).

Every shot carries its source, license and credit line, so your users can publish it. You pay per search from one
prepaid balance: no seats and no monthly fee. Send an `Idempotency-Key` and a retry returns the first answer, never
billed twice. The [OpenAPI spec](https://clypmint.com/api/v1/broll/openapi.json) makes a client in any language. Need
more volume? Write to support@clypmint.com.

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

A whole script at once: each moment comes back with the exact words it starts on, and its time if you send word
timings.

```bash
curl https://clypmint.com/api/v1/broll/plan \
  -H "Authorization: Bearer $CLYPMINT_API_KEY" -H "Content-Type: application/json" \
  -d '{"transcript": "Last week I flew to Tokyo to meet the Figma team...", "max_beats": 8}'
```

The full reference is at [clypmint.com/broll/docs](https://clypmint.com/broll/docs), and the OpenAPI spec at
[`/api/v1/broll/openapi.json`](https://clypmint.com/api/v1/broll/openapi.json).

## Use it from code

**JavaScript**

```bash
npm install github:Clypmint/clypmint-broll#v1.2.1
```

```js
import { createClient } from '@clypmint/broll';

const broll = createClient(); // reads CLYPMINT_API_KEY
const { results, usage } = await broll.search({ query: 'Figma', context: 'we design everything in Figma' });
```

**Python**

```bash
pip install "git+https://github.com/Clypmint/clypmint-broll@v1.2.1#subdirectory=python"
```

```python
from clypmint_broll import Broll

broll = Broll()  # reads CLYPMINT_API_KEY
shots = broll.search("Eiffel Tower", type="video")["results"]
```

**CLI**: search, plan a script, cut a clip, record a live site. See [USAGE.md](USAGE.md). Runnable examples, from a
script to a folder of b-roll, are in [examples/](examples).

## Pricing

You pay per search from a prepaid balance, the way search APIs charge: one price per call, stated before you call, and
only a search that finds checked shots is charged.

| | Price | Per 1,000 | Launch week (through Nov 2) |
|---|---|---|---|
| Licensed search (default) | $0.02 | $20 | $0.01 |
| Web search (`"rights": "any"`) | $0.06 | $60 | $0.03 |

- A search that finds nothing, only near matches, or shots that could not be checked costs nothing.
- Every new account gets 100 free searches ($2 of credit), once.
- Top up from $10 (to $1,000 at a time). Your balance never expires. Turn on auto top-up and we add the amount you pick
  when it runs low.
- Any balance you have not used can be refunded within 14 days of adding it.
- Every answer carries `usage`: what it cost, the balance left and the prices now. `GET /api/v1/broll/usage` gives the
  same before you search. Out of balance, a search answers `402 balance_too_low` with the price, the balance and the
  top-up link.
- Try it free in the browser first, no key: [clypmint.com/broll](https://clypmint.com/broll).

## Benchmark

[B-Roll Bench v1](https://clypmint.com/broll/benchmarks): the same 100 requests (people, companies, places, events,
archival moments, generic scenes, film and TV scenes) sent to every service, the results judged blind by two models,
Gemini 3.5 Flash and Claude Sonnet 5.5 (they agreed on 87.2% of first results). Clypmint run Oct 26, 2026, with its
engine as it is live; the other services Oct 25, 2026.

| Service | Right shot first | Right shot in top 5 | Median time | Price per 1,000 | Rights |
|---|---|---|---|---|---|
| **Clypmint, web mode** | **56.5%** | **75%** | 6.7 s | $60 | Marked not cleared |
| **Clypmint, licensed** | 46% | 48% | 3.7 s | $20 | Licensed, with credit line |
| Brave image search | 45.5% | 74.5% | 0.7 s | $5 | No license data |
| Pexels | 19.5% | 28.5% | 0.4 s | Free | Stock license |
| Wikimedia Commons search | 8.5% | 10% | 0.4 s | Free | Licensed |
| Openverse | 6% | 7.5% | 1.8 s | Free | Licensed |

On the 85 people, companies, places, events, archival moments and generic scenes, licensed mode got the right shot
first 54.2% of the time, against 44.7% for Brave, with a license on every shot. Answers vary from run to run by up to 6
points, so read a smaller gap as a tie. Every request, every result and every judgement is in [`bench/v1`](bench/v1),
and you can run it yourself:

```bash
cd bench/v1
CLYPMINT_API_KEY=... GEMINI_API_KEY=... BRAVE_API_KEY=... PEXELS_API_KEY=... node harness.mjs run --api
```

## Where the footage comes from

Licensed mode, the default, uses only sources whose terms allow reuse, and every shot says which:

- **Wikidata** (CC0) tells us who or what a name is, its official photo, logo, website and YouTube channel.
- **Wikimedia Commons**: freely licensed photos and video, with the license and author on each file.
- **NASA** image and video library, **public-domain film** on the Internet Archive, **Openverse** and the **Library of
  Congress** photo collections marked free to use.
- **The subject's own website and official YouTube channel**: a link plus a command. The clip is cut, or the site
  recorded, on your machine. We never host it.

Web mode (`"rights": "any"`) adds the open web: the scene from the film, the photo from yesterday's news. Those shots
come back with `license.cleared: false` and the name `Not cleared`, because the owner holds the rights. Check before
commercial use.

`license.commercial_use` is `true` (free for commercial use under its terms), `false` (non-commercial only; ranked
last) or `null` (the owner holds the rights). Use the `attribution` line whenever one is given. You are responsible for
how you use what you publish.

## FAQ

**Is this a stock library?** No. Stock shows *a* CEO. This shows *the* CEO your script names. For generic scenes it
finds real, freely licensed photos and footage.

**What does "verified" mean?** A vision model saw every candidate and scored it against what the shot must show.
`verified: false` means the check could not run; those results are ranked by source alone and cost nothing.

**Does it work for vertical video?** Pass `"orientation": "portrait"` to rank vertical shots first, and
`cut --aspect 9:16` to fit any clip (contain by default, `--fit cover` to crop).

**How fast is it?** A licensed search answers in about 4 seconds and a web search in about 7 (bench medians). A
licensed search stops by 10 seconds and a web search by 20.

**Is it safe to install?** The plugin is an MCP address and a skill, with no hooks and nothing that runs on its own. The
CLI has no dependencies, and release tags here are locked. See [SECURITY.md](SECURITY.md).

---

# Part 2 · This repository

## What's here

| Path | What it is |
|---|---|
| [`src/`](src), [`bin/`](bin) | The JavaScript client and the `clypmint-broll` CLI |
| [`python/`](python) | The Python client |
| [`skills/broll/`](skills/broll) | The agent skill: how to source, place and credit b-roll |
| [`.claude-plugin/`](.claude-plugin), [`.mcp.json`](.mcp.json) | The Claude Code plugin and its marketplace |
| [`.codex-plugin/`](.codex-plugin), [`.codex-mcp.json`](.codex-mcp.json) | The Codex plugin |
| [`examples/`](examples) | Runnable examples: a script to a folder of b-roll (Node, Python), curl, and a Claude video setup |
| [`bench/v1/`](bench/v1) | B-Roll Bench v1: the 100 requests, the harness, the judge prompts and every result |
| [`test/`](test) | Tests for the CLI, the client, the examples and the plugin files |

The search engine itself runs as a hosted service at clypmint.com. It is not in this repository.

## Tests

```bash
npm test                                                          # Node 18 or newer, nothing to install
cd python && PYTHONPATH=. python3 -m unittest discover -s tests   # Python 3.8 or newer
```

The tests use a local fake server, so they need no key and make no searches.

## Contributing and security

- [CONTRIBUTING.md](CONTRIBUTING.md): set up, make a change, open a pull request.
- [SECURITY.md](SECURITY.md): what the plugin and CLI can do on your machine, and how to report a problem privately.
- [CHANGELOG.md](CHANGELOG.md): what changed in each release.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

The client, CLI, skill, plugins and benchmark in this repository are MIT. The API is a hosted service by
[Clypmint](https://clypmint.com).
