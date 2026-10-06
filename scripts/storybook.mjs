import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { manualRoot, storybookHost } from './storybook-host.mjs';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { runtime: { type: 'string' }, out: { type: 'string' }, port: { type: 'string', default: '6010' } } });
const mode = positionals[0] || 'dev';
if (!['dev', 'build'].includes(mode)) throw new Error('Use dev or build');
const host = storybookHost(values.runtime);
const sbRoot = host.packageRoot('storybook');
const sbManifest = JSON.parse(fs.readFileSync(path.join(sbRoot, 'package.json'), 'utf8'));
if (sbManifest.version !== '10.4.6') throw new Error('Use the verified Storybook 10.4.6 toolchain.');
const bin = typeof sbManifest.bin === 'string' ? sbManifest.bin : sbManifest.bin.storybook;
const args = [path.join(sbRoot, bin), mode, '--config-dir', path.join(manualRoot, '.storybook'), '--disable-telemetry'];
if (mode === 'dev') {
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local port');
  await new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(port, '127.0.0.1', () => socket.close(resolve));
  });
  args.push('--port', String(port), '--host', '127.0.0.1', '--no-open', '--ci');
} else {
  args.push('--output-dir', path.resolve(values.out || path.join(manualRoot, 'output/storybook')));
}
const child = spawn(process.execPath, args, { cwd: manualRoot, stdio: 'inherit', env: { ...process.env, LDS_MANUAL_STORYBOOK_RUNTIME: host.directory, STORYBOOK_DISABLE_TELEMETRY: '1' } });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('error', error => { console.error(error.message); process.exitCode = 1; });
child.once('exit', code => { process.exitCode = code ?? 1; });
