import path from 'node:path';
import { manualRoot, storybookHost } from '../scripts/storybook-host.mjs';

const host = storybookHost();
const pkg = name => host.packageRoot(name);
function packageAliases(name) {
  const dir = pkg(name);
  const manifest = host.require(`${name}/package.json`);
  const entry = target => typeof target === 'string' ? target : target?.browser || target?.import || target?.default;
  return Object.entries(manifest.exports).filter(([key]) => !key.includes('*')).map(([key, target]) => ({ find: new RegExp(`^${(name + (key === '.' ? '' : key.slice(1))).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), replacement: path.join(dir, entry(target)) }));
}
export default {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.jsx'],
  framework: { name: pkg('@storybook/react-vite'), options: {} },
  addons: [pkg('@storybook/addon-docs'), pkg('@storybook/addon-a11y')],
  staticDirs: [
    { from: '../examples/assets', to: '/examples/assets' },
    { from: '../examples/authoring-guide/assets', to: '/authoring-guide/assets' },
    { from: path.join(host.theme, 'assets/brand'), to: '/lds/brand' },
  ],
  core: { disableTelemetry: true },
  docs: { defaultName: '사용법' },
  async viteFinal(config) {
    const aliases = [
      { find: '@lk-design-system/lds-core/components/status/Callout', replacement: host.publicCoreModule('status/Callout') },
      { find: '@lk-design-system/lds-core/components/content/Blockquote', replacement: host.publicCoreModule('content/Blockquote') },
      { find: '@lk-design-system/lds-core', replacement: host.core },
      { find: '@lk-design-system/lds-theme', replacement: host.theme },
      ...['react', 'react-dom'].map(name => ({ find: name, replacement: pkg(name) })),
      ...packageAliases('storybook'), ...packageAliases('@storybook/addon-docs'),
    ];
    return { ...config, base: './', resolve: { ...config.resolve, alias: [...aliases, ...(Array.isArray(config.resolve?.alias) ? config.resolve.alias : [])], dedupe: ['react', 'react-dom'] }, server: { ...config.server, fs: { ...config.server?.fs, allow: [manualRoot, host.directory] } } };
  },
};
