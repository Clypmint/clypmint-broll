# Contributing to clypmint-broll

Thanks for helping. Issues and pull requests are welcome.

## Set up

```bash
git clone https://github.com/Clypmint/clypmint-broll
cd clypmint-broll
npm test                                                          # Node 18 or newer, nothing to install
cd python && PYTHONPATH=. python3 -m unittest discover -s tests   # Python 3.8 or newer
```

The tests run against a local fake server. They need no key and never call the live API.

## Layout

- `src/` and `bin/`: the JavaScript client (`client.mjs`), the CLI (`cli.mjs`), and the local work it does: cutting and
  downloading (`media.mjs`) and recording live sites (`capture.mjs`).
- `python/`: the Python client.
- `skills/broll/SKILL.md`: the agent skill every plugin ships.
- `.claude-plugin/`, `.mcp.json`: the Claude Code plugin. `.codex-plugin/`, `.codex-mcp.json`: the Codex plugin.
- `examples/`: runnable examples, each covered by `test/examples.test.mjs`.
- `bench/v1/`: B-Roll Bench v1, its harness, judges and every result.
- `test/`: the tests.

## Making a change

- **No dependencies.** Use Node built-ins and the Python standard library.
- **No shell.** Start every child process with an argument list. Put `--` before a URL handed to another program.
- **The key stays secret.** Read it from `CLYPMINT_API_KEY` and send it only to the API. Never log it.
- **One JSON line.** With `--json`, every CLI command prints exactly one JSON line, errors included.
- **New behavior needs a test.** Tests use a fake server, never the live API.
- **No secrets in the diff.** CI scans every pull request with gitleaks. Use placeholders like `cm_live_...`.
- **Note it in [CHANGELOG.md](CHANGELOG.md)** under Unreleased.

Open a pull request against `main` and fill in the template. `main` changes only through pull requests.

## Reporting

Bugs and ideas: [open an issue](https://github.com/Clypmint/clypmint-broll/issues/new/choose). Security problems: see
[SECURITY.md](SECURITY.md), never a public issue.
