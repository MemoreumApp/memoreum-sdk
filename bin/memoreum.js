#!/usr/bin/env node

import('../dist/cli.mjs').catch((err) => {
  console.error('Failed to load Memoreum CLI:', err.message);
  process.exit(1);
});
