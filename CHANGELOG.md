# Changelog

Notable changes to clypmint-broll. Dates are release dates. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [semantic versioning](https://semver.org).

## 1.2.1 (2026-10-27)

### Fixed

- **`get` in web mode cuts the moment the search found.** It cut the first 4 seconds of the video before. `--start`
  and `--duration` still win when you pass them.
- `clypmint-broll --version` and the Python client's `__version__` report the real version.

### Added

- **A Codex plugin.** `codex plugin marketplace add Clypmint/clypmint-broll`, then
  `codex plugin add clypmint-broll@clypmint-broll`. It reads your key from `CLYPMINT_API_KEY`.
- **Examples** in `examples/`: a whole script to a folder of b-roll (Node and Python), curl, and a setup for editing
  videos with Claude. Every example is tested.
- `USAGE.md` (every CLI command and flag), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `AGENTS.md`.
- CI on every pull request: the tests on Node 18, 20 and 22 and on Python 3.9 and 3.13, and a gitleaks secret scan.

### Changed

- The README follows a new order: what it is, why, then using it, then this repository.
- Images moved to `docs/assets/`.

## 1.2.0 (2026-10-27)

### Added

- **Your agent plans its own search.** `find_broll` and `POST /api/v1/broll/search` take `keywords` (1 to 5 archive
  searches of 1 to 3 words), `names` and `look_for`. With `keywords`, the search skips its planning step and answers
  sooner. The skill tells agents to send them, the Python client takes them, and the CLI has `--keywords`, `--names`
  and `--look-for`.

### Changed

- **Faster answers.** A licensed search takes about 4 seconds and a web search about 7; they stop by 10 and 20.
- B-Roll Bench runs in minutes instead of about an hour.

## 1.1.0 (2026-10-26)

### Added

- **Pay per search.** $0.02 licensed and $0.06 web, charged only when a search finds checked shots. The clients and the
  CLI report usage in dollars.
- **A Claude Code plugin**, with the MCP server and the agent skill. Your key is asked once and kept in the system's
  secure store.
- **B-Roll Bench v1** in `bench/v1`: the 100 requests, every result, both judges' verdicts and the harness.
- **Web mode** (`"rights": "any"`) in the clients and the CLI.
- The Python client, `download_url` on every image, and a link to the OpenAPI spec.

## 1.0.0 (2026-10-23)

### Added

- The JavaScript client, the `clypmint-broll` CLI (search, plan, get, cut, capture, download, usage) and the agent skill
  for the Clypmint B-Roll API.
