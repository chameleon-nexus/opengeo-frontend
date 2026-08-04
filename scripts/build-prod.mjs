#!/usr/bin/env node
/**
 * 生产构建：临时隐藏 .env.local，使用 .env.server，避免 Vite 用 localhost 覆盖生产 API。
 */
import { spawnSync } from 'node:child_process';
import { projectRoot, withServerEnv } from './env-utils.mjs';

const root = projectRoot(import.meta.url);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

withServerEnv(root, () => {
  console.log('[saas] production build (.env.server, .env.local hidden)');
  run('npm', ['run', 'build:subsite']);
  run('npx', ['vite', 'build', '--mode', 'server']);
});
