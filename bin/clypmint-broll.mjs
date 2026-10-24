#!/usr/bin/env node
import { run } from '../src/cli.mjs';

await run(process.argv.slice(2));
