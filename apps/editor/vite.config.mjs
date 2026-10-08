import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookHost, manualRoot } from '../../scripts/storybook-host.mjs';
const appRoot = fileURLToPath(new URL('.', import.meta.url));
const host = storybookHost(process.env.LDS_MANUAL_EDITOR_RUNTIME);
export default {
  root: appRoot, base: './', esbuild: { jsx: 'automatic' },
  resolve: { alias: [
    { find: '@lk-design-system/lds-core/components/buttons/Fab', replacement: host.publicCoreModule('buttons/Fab') },
    { find: '@lk-design-system/lds-core/components/icon/Icon', replacement: host.publicCoreModule('icon/Icon') },
    { find: '@lk-design-system/lds-core/components/overlay/DropdownMenu', replacement: host.publicCoreModule('overlay/DropdownMenu') },
    { find: '@lk-design-system/lds-core/components/buttons/Button', replacement: host.publicCoreModule('buttons/Button') },
    { find: '@lk-design-system/lds-core/components/status/Callout', replacement: host.publicCoreModule('status/Callout') },
    { find: '@lk-design-system/lds-core/components/content/Blockquote', replacement: host.publicCoreModule('content/Blockquote') },
    { find: '@lk-design-system/lds-core', replacement: host.core },
    { find: '@lk-design-system/lds-theme', replacement: host.theme },
    ...['react-dom','react'].map(name => ({ find: name, replacement: host.packageRoot(name) }))
  ], dedupe: ['react','react-dom'] },
  server: { host: '127.0.0.1', strictPort: true, port: 6012, fs: { allow: [manualRoot, host.directory] } },
  build: { outDir: 'dist', rollupOptions: { input: { editor: path.join(appRoot,'index.html'), preview: path.join(appRoot,'preview.html'), prototype: path.join(appRoot,'prototype.html'), manual: path.join(appRoot,'manual.html') } } },
};
