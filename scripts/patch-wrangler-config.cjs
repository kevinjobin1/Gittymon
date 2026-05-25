// Post-build script:
// 1. Remove `not_found_handling` from the generated wrangler.json
// 2. Fix `assets.directory` to point to `dist` instead of `dist/client`
//    (the build script promotes dist/client/* up to dist/ and deletes dist/client)
const fs = require('fs');
const path = require('path');

const possiblePaths = [
  path.join(__dirname, '..', 'dist', 'wrangler.json'),
];

// Scan subdirectories for @cloudflare/vite-plugin generated config (e.g. dist/gittymon/wrangler.json)
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      possiblePaths.push(path.join(distDir, entry.name, 'wrangler.json'));
    }
  }
}

let configPath = possiblePaths.find(p => fs.existsSync(p));

if (!configPath) {
  console.log('No generated wrangler.json found — skipping patch.');
  process.exit(0);
}

const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);

let changed = false;

if (config.assets?.not_found_handling) {
  delete config.assets.not_found_handling;
  changed = true;
  console.log('Removed not_found_handling from', configPath);
}

// Fix assets.directory: build script promotes dist/client/* to dist/ then deletes dist/client.
// Wrangler resolves assets.directory relative to the project root (CWD), not the config file.
if (config.assets?.directory === 'dist/client') {
  config.assets.directory = 'dist';
  changed = true;
  console.log('Updated assets.directory from "dist/client" to "dist" in', configPath);
}

if (changed) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Patched', configPath);
} else {
  console.log('No patches needed in', configPath);
}
