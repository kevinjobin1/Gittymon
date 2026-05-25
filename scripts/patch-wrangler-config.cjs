// Post-build script: remove `not_found_handling` from dist/wrangler.json
// so unmatched routes fall through to the worker instead of being
// handled by the asset system's SPA mode (which bypasses the worker).
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'dist', 'wrangler.json');

if (!fs.existsSync(configPath)) {
  console.log('No dist/wrangler.json found — skipping patch.');
  process.exit(0);
}

const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);

if (config.assets?.not_found_handling) {
  delete config.assets.not_found_handling;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Removed not_found_handling from dist/wrangler.json');
} else {
  console.log('not_found_handling not found — no change needed.');
}
