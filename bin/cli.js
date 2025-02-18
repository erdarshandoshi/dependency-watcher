#!/usr/bin/env node

const { runChecks } = require("../lib/index");

(async () => {
    await runChecks();
})();
