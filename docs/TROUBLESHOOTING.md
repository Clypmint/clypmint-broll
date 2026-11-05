# Troubleshooting Clypmint B-Roll

## Find the failing layer

1. Run `node --version` and `clypmint-broll --version`. The client requires Node 18 or newer; browser capture requires Node 22. Use a supported Node LTS release for new installs.
2. Confirm `CLYPMINT_API_KEY` is set without printing its value. `CLYPMINT_API_URL` overrides the destination for authenticated requests; only set it to a server you trust.
3. Run `clypmint-broll usage --json` to check account access, balance, and current prices. It does not perform a paid search.
4. For local cutting or capture, check that the relevant ffmpeg, yt-dlp, or Chrome installation is available. These tools run on your machine.

## API errors

| Status | Next step |
| --- | --- |
| 401 / 403 | Check or replace the key in the dashboard. Do not paste it into an issue. |
| 402 | Check usage and balance before retrying. |
| 429 | Follow the service’s retry guidance and reduce concurrency. |
| 5xx / network failure | Record the time and request ID when present. Do not assume a search was free. |

Successful answers include `request_id`, `took_ms`, `cached`, and `usage` where supplied by the service. The clients on the default branch also expose error request IDs as JavaScript `BrollError.requestId`, Python `BrollError.request_id`, and CLI JSON `error.request_id`. These source changes are not part of the older v1.2.1 release.

Reuse the original idempotency key when retrying the same search or plan. If `usage.charged_usd` is null or billing is pending, check usage before retrying. Never turn a transport error into an automatic loop of new paid requests.

Authenticated API requests on the default branch reject redirects. Check the configured API base URL if the service redirects; do not forward an authorization header to a redirect destination. Media downloads are separate from authenticated API calls.

## Share a useful report

Include the client version and commit, command name, HTTP status, error code, request ID if supplied, timestamp with timezone, and a minimal sanitized reproduction. Remove the key, authorization headers, private scripts, signed URLs, cookies, and personal or customer data. Security reports go through [SECURITY.md](../SECURITY.md).

## What checks prove

CI exercises clients and examples against local fake servers and scans for secrets. Weekly repository checks validate workflow syntax and scan current files; pull requests also scan new commits. GitHub’s Security tab holds available secret, dependency, and code-scanning alerts. These are repository checks, not a live service availability guarantee.
