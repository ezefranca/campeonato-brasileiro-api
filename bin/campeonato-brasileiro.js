#!/usr/bin/env node
'use strict';

const { main } = require('../lib/cli.js');

main(process.argv.slice(2)).catch((error) => {
  const message = error && error.stack ? error.stack : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
