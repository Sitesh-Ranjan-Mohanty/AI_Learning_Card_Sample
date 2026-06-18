import { spawn } from 'node:child_process';

const processes = [
  spawn('npm', ['run', 'dev:server'], {
    stdio: 'inherit',
  }),
  spawn('npm', ['run', 'dev:client'], {
    stdio: 'inherit',
  }),
];

const stopAll = () => {
  for (const childProcess of processes) {
    if (!childProcess.killed) {
      childProcess.kill('SIGTERM');
    }
  }
};

for (const childProcess of processes) {
  childProcess.on('exit', (code) => {
    if (code && code !== 0) {
      stopAll();
      process.exit(code);
    }
  });
}

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});
