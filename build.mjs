import { build } from 'esbuild';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/tmuxtui.js',
  banner: { js: '#!/usr/bin/env node\nimport{createRequire}from"module";const require=createRequire(import.meta.url);' },
  define: {
    '__APP_VERSION__': JSON.stringify(version),
  },
  minify: true,
  format: 'esm',
  packages: 'bundle',
  plugins: [{
    name: 'ignore-react-devtools-core',
    setup(build) {
      build.onResolve({ filter: /^react-devtools-core$/ }, args => ({
        path: args.path,
        namespace: 'ignore',
      }));
      build.onLoad({ filter: /.*/, namespace: 'ignore' }, () => ({
        contents: 'export default {}',
        loader: 'js',
      }));
    },
  }],
});
