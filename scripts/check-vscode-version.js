'use strict';

// Imports
const semver = require('semver');
/** @type IPackageJson */
const pkg = require('../package.json');


// Types
/**
 * @typedef IPackageJson
 * @property {Record<string, string | undefined>} devDependencies
 * @property {Record<string, string | undefined>} engines
 */

// Run
const expectedSemverVersion = pkg.engines.vscode && semver.minVersion(pkg.engines.vscode);
const expectedVersion = expectedSemverVersion && expectedSemverVersion.version;
const actualVersion = pkg.devDependencies['@types/vscode'];

if (actualVersion !== expectedVersion) {
  console.error(
      `Expected the version of \`@types/vscode\` to be '${expectedVersion}' (the minimum supported one), but it is ` +
      `'${actualVersion}'.\n`);
  process.exit(1);
}
