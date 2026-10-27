# B-Roll Bench v1

The same 100 b-roll requests sent to six services, every result judged blind by two models from two companies. Clypmint's rows were run on Oct 26, 2026, with its engine as it is live; the other services on Oct 25, 2026. The write-up is at [clypmint.com/broll/benchmarks](https://clypmint.com/broll/benchmarks).

| File | What it is |
|---|---|
| [`queries.json`](queries.json) | The 100 requests: each has its category, the words sent, and what the right shot must show |
| [`queries-prompt.json`](queries-prompt.json) | How the requests were written (the model, the prompt, the categories), before any service was run |
| [`results.json`](results.json) | Every service's answers to every request, with both judges' verdict on each result |
| [`summary.json`](summary.json) | The scores: right shot first, right shot in the top 5, median time and empty answers, for all 100 and for each category |
| [`harness.mjs`](harness.mjs) | Runs the services and the first judge (Gemini 3.5 Flash) |
| [`judge2.mjs`](judge2.mjs) | The second judge (Claude Sonnet 5.5): the same contact sheets and the same instructions |
| [`summarize.mjs`](summarize.mjs) | Turns the runs and the verdicts into `summary.json` |

## The rules

- Every service gets the same words, written before the first run, so nobody can tune them to win.
- The judges see what each result shows (a photo, a video's thumbnail, or for a moment inside a video the frame at its middle, cut the way the CLI cuts it), never which service sent it.
- A result is right when both its subject is exactly what the request names and it is real media, not an illustration or a render.
- Scores are the mean of the two judges. They agreed on 87.2% of first results.
- Price is the list price per 1,000 searches. Time is the median from request to answer, from one machine in the US.

## Run it yourself

```bash
cd bench/v1
# Clypmint through its public API, with your own key (billed like any search), plus the other services' own keys
CLYPMINT_API_KEY=cm_live_... BRAVE_API_KEY=... PEXELS_API_KEY=... node harness.mjs run --api
CLYPMINT_API_KEY=cm_live_... node harness.mjs run clypmint --api --rights=any --tag=web
# judging needs a Gemini key (first judge), an Anthropic key (second judge), sharp, ffmpeg and yt-dlp
npm install --no-save sharp
GEMINI_API_KEY=... npx tsx harness.mjs judge
ANTHROPIC_API_KEY=... npx tsx judge2.mjs ''
```

Keys come from the environment and are never printed or written.
