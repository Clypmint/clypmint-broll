#!/usr/bin/env bash
# One search and your balance, with curl.
#
#   CLYPMINT_API_KEY=cm_live_... bash examples/search.sh
set -euo pipefail

API="${CLYPMINT_API_URL:-https://clypmint.com}"
: "${CLYPMINT_API_KEY:?Set CLYPMINT_API_KEY. Make one at https://clypmint.com/broll/dashboard}"

curl -sS "$API/api/v1/broll/search" \
  -H "Authorization: Bearer $CLYPMINT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "Saturn V launch", "context": "In 1969 a Saturn V carried three men to the Moon", "type": "video", "limit": 3}'
echo

curl -sS "$API/api/v1/broll/usage" -H "Authorization: Bearer $CLYPMINT_API_KEY"
echo
