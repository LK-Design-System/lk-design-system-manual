import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const manualRoot = fileURLToPath(new URL('../', import.meta.url));
export function storybookHost(runtime = process.env.LDS_MANUAL_STORYBOOK_RUNTIME || manualRoot) {
  const directory = path.resolve(runtime);
  const require = createRequire(path.join(directory, 'package.json'));
  function packageRoot(name) {
    let dir;
    try { dir = path.dirname(require.resolve(`${name}/package.json`)); }
    catch { dir = path.dirname(require.resolve(name)); }
    while (dir !== path.dirname(dir)) {
      const manifest = path.join(dir, 'package.json');
      if (fs.existsSync(manifest) && JSON.parse(fs.readFileSync(manifest, 'utf8')).name === name) return dir;
      dir = path.dirname(dir);
    }
    throw new Error(`Cannot resolve ${name} from ${directory}`);
  }
  const core = packageRoot('@lk-design-system/lds-core');
  const theme = packageRoot('@lk-design-system/lds-theme');
  for (const owner of [core, theme]) {
    if (JSON.parse(fs.readFileSync(path.join(owner, 'package.json'), 'utf8')).version !== '0.4.3') throw new Error('Manual Storybook requires matching Core/Theme 0.4.3 peers.');
  }
  function publicCoreModule(subpath) {
    const pkg = JSON.parse(fs.readFileSync(path.join(core, 'package.json'), 'utf8'));
    const target = pkg.exports['./components/*'];
    const entry = typeof target === 'string' ? target : target.import;
    return path.join(core, entry.replace('*', subpath));
  }
  return { directory, require, packageRoot, core, theme, publicCoreModule };
}
