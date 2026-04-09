import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: 'dist/tumxtui.js',
  banner: { js: '#!/usr/bin/env node\nimport{createRequire}from"module";const require=createRequire(import.meta.url);' },
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
