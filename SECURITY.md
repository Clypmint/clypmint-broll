# Security policy

## Reporting a vulnerability

Please report it privately, never in a public issue. Use the **Report a vulnerability** button on this repository's
[Security tab](https://github.com/Clypmint/clypmint-broll/security/advisories/new), or write to support@clypmint.com.

We reply within a few business days, agree on a fix and a disclosure date with you, and credit you if you want to be
named.

## What you install, and what it can do

- **The plugins are configuration and text.** The Claude Code and Codex plugins add one MCP server,
  `https://clypmint.com/mcp/broll` over HTTPS, and one skill, a Markdown file. They have no hooks and run no code on
  your machine.
- **Your key.** The Claude Code plugin keeps it in your system's secure store. The Codex plugin, the CLI and the
  clients read it from `CLYPMINT_API_KEY` and send it only to clypmint.com, or to the `CLYPMINT_API_URL` you set.
  Nothing here prints the key or writes it to disk.
- **The CLI works on your machine.** It runs ffmpeg, yt-dlp and a headless browser with argument lists, never through a
  shell, and puts `--` before every URL it hands to yt-dlp. The browser starts with a fresh, empty profile, so your
  logins and cookies are never used. Files are written only where you say (`--out`) or in the current folder.
- **No dependencies.** The JavaScript package has no npm dependencies. The Python client uses only the standard library.
- **The search runs on our servers.** This repository holds no server code and no secrets. Reading it does not help
  anyone reach your account or anyone else's.
- **Commands from the API.** A video shot comes with `cut_command` (one shell-quoted line) and `cut_args` (the same
  command as an argument list). Programs that run it should use `cut_args` and spawn without a shell.

## How releases are protected

- Install a pinned release, like `#v1.2.1`. Release tags here are locked: no one, us included, can move or delete
  them, and every new GitHub release is immutable.
- `main` changes only through pull requests. Every pull request runs the tests and a secret scan (gitleaks), and GitHub
  secret scanning blocks any push that contains a key.
- The CI's GitHub Actions are pinned to commits, read the repository only, and are kept current by Dependabot.

## If your key leaks

Revoke it in the [dashboard](https://clypmint.com/broll/dashboard) and make a new one. Searches are paid from your
prepaid balance, so a leaked key can spend only that balance, plus any auto top-ups you turned on. Revoking the key
stops it at once.

## Supported versions

The latest release gets fixes. To upgrade, change the pinned tag to the newest release.
