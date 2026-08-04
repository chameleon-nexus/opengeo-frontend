#!/usr/bin/env node
import {
  copyEnvFile,
  projectRoot,
  restoreDotEnvLocal,
} from './env-utils.mjs';

const root = projectRoot(import.meta.url);
const mode = process.argv[2];
const label = 'saas';

if (mode === 'restore') {
  restoreDotEnvLocal(root);
  console.log(`[${label}] restored .env.local`);
  process.exit(0);
}

if (mode !== 'local' && mode !== 'server') {
  console.error(`Usage: node scripts/use-env.mjs <local|server|restore>`);
  process.exit(1);
}

restoreDotEnvLocal(root);
copyEnvFile(root, mode);
console.log(`[${label}] .env <- .env.${mode}`);
