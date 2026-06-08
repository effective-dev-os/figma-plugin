#!/usr/bin/env node
// Bundle mcp-server + workspace deps + transitive deps into a single self-contained
// JS file ready for npm publish. Writes:
//   dist-pkg/
//   ├── cli.js          (bundled, shebang preserved)
//   ├── package.json    (clean — no workspace:* deps)
//   ├── README.md       (publish-facing)
//   └── LICENSE
//
// Usage: node scripts/bundle.mjs

import esbuild from 'esbuild';
import { readFile, writeFile, mkdir, copyFile, chmod, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const repoRoot = resolve(pkgRoot, '../..');
const outDir = resolve(pkgRoot, 'dist-pkg');

const PUBLISH_NAME = '@effective-dev-os/figma-mcp';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
  if (existsSync(outDir)) {
    await rm(outDir, { recursive: true, force: true });
  }
  await mkdir(outDir, { recursive: true });

  const sourcePkg = await readJson(resolve(pkgRoot, 'package.json'));

  console.error(`[bundle] esbuild → ${outDir}/cli.js`);
  await esbuild.build({
    entryPoints: [resolve(pkgRoot, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    outfile: resolve(outDir, 'cli.js'),
    // Bundle workspace + npm deps inline. Keep node: builtins external.
    external: [],
    packages: 'bundle',
    minify: false,
    sourcemap: false,
    legalComments: 'inline',
    logLevel: 'info',
    // ESM in node ignores require() — but @modelcontextprotocol/sdk has some CJS-only
    // bits that need interop. esbuild handles this if format=esm + platform=node.
  });

  await chmod(resolve(outDir, 'cli.js'), 0o755);

  const cleanPkg = {
    name: PUBLISH_NAME,
    version: sourcePkg.version,
    description:
      'Figma MCP server — read-only tools (get_reactions, get_code_mapping, get_node_info, …) bridging Claude Code / Cursor to a Figma plugin. Bundled WS relay, stdio + HTTP transports.',
    keywords: ['figma', 'mcp', 'claude', 'cursor', 'design-to-code', 'agent', 'reactions'],
    license: 'MIT',
    main: './cli.js',
    bin: { 'figma-mcp': './cli.js' },
    files: ['cli.js', 'README.md', 'LICENSE'],
    engines: { node: '>=22.0.0' },
    repository: {
      type: 'git',
      url: 'git+https://github.com/effective-dev-os/figma-plugin.git',
    },
    homepage: 'https://github.com/effective-dev-os/figma-plugin#readme',
    bugs: { url: 'https://github.com/effective-dev-os/figma-plugin/issues' },
    publishConfig: { access: 'public' },
  };

  await writeFile(
    resolve(outDir, 'package.json'),
    JSON.stringify(cleanPkg, null, 2) + '\n'
  );
  console.error(`[bundle] wrote ${outDir}/package.json`);

  await copyFile(
    resolve(pkgRoot, 'README.publish.md'),
    resolve(outDir, 'README.md')
  );
  console.error(`[bundle] copied README.md`);

  const licensePath = resolve(repoRoot, 'LICENSE');
  if (existsSync(licensePath)) {
    await copyFile(licensePath, resolve(outDir, 'LICENSE'));
    console.error(`[bundle] copied LICENSE`);
  } else {
    console.error('[bundle] WARN: no LICENSE at repo root; skipping');
  }

  console.error('[bundle] done');
}

main().catch((err) => {
  console.error('[bundle] FAILED:', err);
  process.exit(1);
});
