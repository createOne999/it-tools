import { spawn } from 'node:child_process';
import os from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const memoryMb = Math.max(1024, Math.floor(os.totalmem() / 1024 / 1024) - 1024);
const nodeOptions = [`--max-old-space-size=${memoryMb}`, process.env.NODE_OPTIONS].filter(Boolean).join(' ');
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = resolve(projectRoot, 'node_modules/vite/bin/vite.js');

console.log(`NODE_OPTIONS=${nodeOptions}`);

const child = spawn(process.execPath, [viteBin, 'build'], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`vite build exited with signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
