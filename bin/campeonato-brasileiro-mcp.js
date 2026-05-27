#!/usr/bin/env node
'use strict';

const { runStdioServer } = require('../mcp/server.js');

runStdioServer().catch((error) => {
  const message = error && error.stack ? error.stack : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
