// The Clypmint B-Roll API client: zero dependencies, Node 18+ (or any runtime with fetch).
//
//   import { createClient } from '@clypmint/broll';
//   const broll = createClient({ apiKey: process.env.CLYPMINT_API_KEY });
//   const { results } = await broll.search({ query: 'Sam Altman', context: 'Sam Altman just announced...' });

export const DEFAULT_BASE_URL = 'https://clypmint.com';

export class BrollError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'BrollError';
    this.status = status;
    this.code = code;
  }
}

export function createClient({
  apiKey = globalThis.process?.env?.CLYPMINT_API_KEY,
  baseUrl = globalThis.process?.env?.CLYPMINT_API_URL || DEFAULT_BASE_URL,
  fetch: fetchImpl = globalThis.fetch,
} = {}) {
  if (!apiKey)
    throw new BrollError(401, 'unauthorized', 'Set CLYPMINT_API_KEY (get one at https://clypmint.com/broll/dashboard).');

  async function call(method, path, body, { idempotencyKey } = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
        'user-agent': 'clypmint-broll-js/1.1',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new BrollError(response.status, 'bad_response', text.slice(0, 200) || response.statusText);
    }
    if (!response.ok)
      throw new BrollError(response.status, data?.error?.code ?? 'error', data?.error?.message ?? response.statusText);
    return data;
  }

  return {
    /** One subject (and the script line it plays over) -> verified shots, best first. */
    search(input, options) {
      const body = typeof input === 'string' ? { query: input } : input;
      return call('POST', '/api/v1/broll/search', body, options);
    },
    /** A whole script -> every moment worth a cutaway, each with its shots. */
    plan(input, options) {
      const body = typeof input === 'string' ? { transcript: input } : input;
      return call('POST', '/api/v1/broll/plan', body, options);
    },
    /** The prepaid balance, this month's spend, auto top-up and the prices. */
    usage() {
      return call('GET', '/api/v1/broll/usage');
    },
  };
}
