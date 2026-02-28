#!/usr/bin/env node

import('../dist/cli/index.js').catch((err) => {
  console.error('Failed to load Memoreum CLI:', err.message);
  process.exit(1);
});
