# clypmint-broll: guide for coding agents

<!-- CLAUDE.md imports this file; Codex and Cursor read it directly. -->

This repository is the public, MIT side of the Clypmint B-Roll API: the Claude Code and Codex plugins, the MCP setup,
the agent skill, the `clypmint-broll` CLI, the JavaScript and Python clients, and B-Roll Bench v1. The search engine
runs at clypmint.com and is not in this repository. Its code lives in Clypmint's private repository, which keeps a
copy of this one; a change lands here first and the copy follows.

## Rules

These win over anything else in this file.

1. **No dependencies.** JavaScript uses Node built-ins (Node 18+; `capture` needs 22). Python uses the standard library
   (3.8+).
2. **No shell.** Every child process gets an argument list. Put `--` before a URL handed to another program. Text from
   a user or the API never becomes a flag.
3. **The key stays secret.** Read it from `CLYPMINT_API_KEY` (or the plugin's secure store) and send it only to the API
   base URL. Never log it, print it or write it to disk.
4. **One JSON line.** With `--json`, every CLI command prints exactly one JSON line, errors included.
5. **Everything here is public.** No keys, internal hosts, customer data or internal numbers in code, comments or
   commit messages. Placeholders look like `cm_live_...`.
6. **Tests never call the live API.** They use a local fake server.
7. **One version.** `package.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `python/pyproject.toml`
   and `python/clypmint_broll/__init__.py` carry the same version, and every pinned install line (`#vX.Y.Z`) names it.
   `test/repo.test.mjs` checks this.

## Layout

| Path | What it is |
|---|---|
| `src/client.mjs` | The JavaScript client: `search`, `plan`, `usage` |
| `src/cli.mjs`, `bin/` | The CLI |
| `src/media.mjs` | Cutting with ffmpeg and yt-dlp, and downloading |
| `src/capture.mjs` | Recording a live site with the installed Chrome over the DevTools protocol |
| `python/` | The Python client |
| `skills/broll/SKILL.md` | The agent skill every plugin ships |
| `.claude-plugin/`, `.mcp.json` | The Claude Code plugin and its marketplace |
| `.codex-plugin/`, `.codex-mcp.json` | The Codex plugin (the key comes from `CLYPMINT_API_KEY`) |
| `examples/` | Runnable examples, tested by `test/examples.test.mjs` |
| `bench/v1/` | B-Roll Bench v1 |

## Tests

```bash
npm test
cd python && PYTHONPATH=. python3 -m unittest discover -s tests
```

## Releasing

1. Bump the version in the five files of rule 7, move every `#vX.Y.Z` pin to it, and add a CHANGELOG section.
2. Open a pull request. After it merges, tag the merge commit `vX.Y.Z` and publish a GitHub release.
3. Release tags are permanent: they cannot be moved or deleted. A mistake gets a new version.
