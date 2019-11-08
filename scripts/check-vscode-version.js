'use strict';

// Imports
const semver = require('semver');
const pkg = require('../package.json');

// Run
const expectedVersion = semver.minVersion(pkg.engines.vscode).version;
const actualVersion = pkg.devDependencies['@types/vscode'];

if (actualVersion !== expectedVersion) {
  console.error(
    `Expected the version of \`@types/vscode\` to be '${expectedVersion}' (the minimum supported one), but it is ` +
    `'${actualVersion}'.\n`);
  process.exit(1);
}
