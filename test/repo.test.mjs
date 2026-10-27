// The repository's promises: one version everywhere, every install line pinned to it, and plugins that are only
// configuration (an HTTPS MCP server and a skill, no hooks, the key kept secret).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { test } from 'node:test';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const json = (p) => JSON.parse(read(p));
const VERSION = json('package.json').version;

test('every manifest carries the same version', () => {
  assert.equal(json('.claude-plugin/plugin.json').version, VERSION);
  assert.equal(json('.codex-plugin/plugin.json').version, VERSION);
  assert.equal(/^version = "([^"]+)"/m.exec(read('python/pyproject.toml'))?.[1], VERSION);
  assert.equal(/^__version__ = "([^"]+)"/m.exec(read('python/clypmint_broll/__init__.py'))?.[1], VERSION);
  const cli = execFileSync(process.execPath, [new URL('../bin/clypmint-broll.mjs', import.meta.url).pathname, '--version'], { encoding: 'utf8' });
  assert.equal(cli.trim(), VERSION);
});

test('every pinned install line names this version', () => {
  const docs = ['README.md', 'USAGE.md', 'SECURITY.md', 'skills/broll/SKILL.md', 'python/README.md', 'examples/script-to-broll.mjs', 'examples/script_to_broll.py'];
  for (const doc of docs)
    for (const [pin] of read(doc).matchAll(/clypmint-broll(?:\.git)?[#@]v\d+\.\d+\.\d+/g)) assert.ok(pin.endsWith(`v${VERSION}`), `${doc}: ${pin}`);
});

test('the plugins are an HTTPS MCP server and a skill, with no hooks', () => {
  const claude = json('.claude-plugin/plugin.json');
  const codex = json('.codex-plugin/plugin.json');
  for (const manifest of [claude, codex]) assert.equal(manifest.hooks, undefined);
  assert.equal(fs.existsSync(new URL('../hooks', import.meta.url)), false);
  assert.equal(json('.claude-plugin/marketplace.json').plugins[0].source, './');
  assert.equal(codex.skills, './skills/');
  assert.ok(fs.existsSync(new URL('../skills/broll/SKILL.md', import.meta.url)));

  const claudeServer = json('.mcp.json').mcpServers['clypmint-broll'];
  assert.equal(claudeServer.url, 'https://clypmint.com/mcp/broll');
  assert.equal(claudeServer.headers.Authorization, 'Bearer ${user_config.api_key}');
  assert.equal(claude.userConfig.api_key.sensitive, true);

  const codexServer = json(codex.mcpServers).mcpServers['clypmint-broll'];
  assert.equal(codexServer.url, 'https://clypmint.com/mcp/broll');
  assert.equal(codexServer.bearer_token_env_var, 'CLYPMINT_API_KEY');
});

test('the package has no dependencies', () => {
  const pkg = json('package.json');
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) assert.equal(pkg[field], undefined);
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) assert.equal(pkg.scripts?.[hook], undefined);
  assert.equal(/^dependencies\s*=/m.test(read('python/pyproject.toml')), false);
});
