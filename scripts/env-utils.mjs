/**
 * Vite 在任意 mode 下都会加载 .env.local 并覆盖 .env。
 * 生产构建前临时隐藏 .env.local，构建结束后恢复。
 */
import { copyFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HIDDEN_LOCAL_NAME = '.env.local.__build_hidden__';

export function projectRoot(importMetaUrl) {
  return join(dirname(fileURLToPath(importMetaUrl)), '..');
}

export function copyEnvFile(root, mode) {
  const src = join(root, `.env.${mode}`);
  const dest = join(root, '.env');
  if (!existsSync(src)) {
    throw new Error(`Missing ${src}`);
  }
  copyFileSync(src, dest);
}

export function hideDotEnvLocal(root) {
  const local = join(root, '.env.local');
  const hidden = join(root, HIDDEN_LOCAL_NAME);
  if (!existsSync(local)) {
    return false;
  }
  if (existsSync(hidden)) {
    throw new Error(`Stale ${HIDDEN_LOCAL_NAME} exists; run: node scripts/use-env.mjs restore`);
  }
  renameSync(local, hidden);
  return true;
}

export function restoreDotEnvLocal(root) {
  const hidden = join(root, HIDDEN_LOCAL_NAME);
  const local = join(root, '.env.local');
  if (!existsSync(hidden)) {
    return false;
  }
  if (existsSync(local)) {
    throw new Error('Cannot restore .env.local: file already exists');
  }
  renameSync(hidden, local);
  return true;
}

export function withServerEnv(root, fn) {
  hideDotEnvLocal(root);
  try {
    copyEnvFile(root, 'server');
    return fn();
  } finally {
    restoreDotEnvLocal(root);
  }
}
