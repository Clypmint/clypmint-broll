---
name: broll
description: Source real, verified b-roll (photos and footage) for a video script with the Clypmint B-Roll API, then cut and place each shot on the word. Use when a video needs cutaways, b-roll, pictures of the people/companies/products/places a script names, or real footage of a scene.
---

# Sourcing b-roll with Clypmint B-Roll

You have the `find_broll` and `plan_broll` tools (MCP server `https://clypmint.com/mcp/broll`), or the CLI `npx -y github:Clypmint/clypmint-broll#v1.1.0` with `CLYPMINT_API_KEY` set.

## 1. Read the whole script first
State its point in one sentence. B-roll illustrates the point of a line, not its nearest keyword.

## 2. Pick the moments
In this order:
1. Every specific person, company, product, app, website, place or event the speaker names. These have a correct shot.
2. Concrete actions or scenes a camera could film ("we drove to the coast").
Skip opinions, feelings and abstract lines. No b-roll beats wrong b-roll. Never cover the speaker's own face at the hook.

For a whole script, call `plan_broll` once. It returns each moment with the exact words it starts on (and its time, if you pass word timings).

## 3. Search each moment well
- `query` is the subject as people name it: "Sam Altman", "Notion", "Shibuya Crossing".
- Always pass `context`: the exact line. It decides which "Claude" or "Apple" is meant.
- `type`: `image` for a named person or a logo; `video` for an action, a place or an event; `any` when unsure.
- The real thing (a movie scene, a recent news photo): `rights: "any"` also searches the open web. Those shots have `license.cleared: false`; tell the user they are not licensed. Default is `licensed`.
- Vertical edit: `orientation: "portrait"` ranks vertical shots first.

## 4. Choose
- Prefer the highest `score`. 9-10 is usable as is. 7-8 is fine. Below 7, look again or drop the beat.
- `official: true` means it comes from the subject's own channel or site: best for products and companies.
- Read `shows` before using a shot. If it does not match the line, drop it.

## 5. Make the file
- `delivery: "direct"`: download `url`.
- `delivery: "local_cut"` or `"local_capture"`: run `cut_command` (edit `--start` and `--duration` to the moment you need). Needs ffmpeg; yt-dlp for YouTube/X/TikTok; Chrome/Edge/Brave/Chromium for captures.
- Keep framing as filmed. For 9:16, `cut --aspect 9:16` pads (contain) by default. Use `--fit cover` only if the user asks to crop.

## 6. Place it on the word
- Start the cutaway on (or just after) the first word of the moment, never before it.
- Hold 1.5-3 s. Cut faster in the hook, slower in the body.
- Silent b-roll by default (`--keep-audio` only when its sound matters).

## 7. Credit and rights
- When `license.attribution` is set, put it in the description or end card.
- `license.commercial_use: null` (official channels, live sites): the owner holds the rights. Fine for commentary and review in most places, your call for ads.
- Never present a picture of someone else as the named person.

## Pricing to tell the user
Pay per search from a prepaid balance (top up from $10): $0.02 per licensed search, $0.06 per web search (`rights: "any"`), half price through Nov 2, 2026, and only when the search finds verified shots. A search that finds nothing, or only near matches, costs nothing. Every answer carries `usage` (what it cost, the balance left, the prices now). On a 402 `balance_too_low`, tell the user to top up or turn on auto top-up at https://clypmint.com/broll/dashboard. `broll_usage` shows the balance and the prices.
