// Imports
import {Stats, utimesSync} from 'fs';
import {dirname, join, resolve} from 'path';
import {ls, rm, set} from 'shelljs';
import {downloadAndUnzipVSCode, runTests} from 'vscode-test';
import {cyan, yellow} from './string-utils';

set('-e');


/**
 * ## Usage:
 * ```
 * node out/test/helpers/e2e-runner <code-version>
 * ```
 *
 *   Where:
 *   - `<code-version>`:   The version of VSCode to run the tests with. E.g.: `1.33.7`
 *     (default: stable)   Special values:
 *                         - `min-supported`: Infer the minimum supported version, based on the version pattern in
 *                                            `package.json > engines > vscode`. It supports many common formats (e.g.
 *                                            `1.2.3`, `^1.2.3`, `~1.2.3`, `>=1.2.3`, `1.2.x`, `1.2`), but not \
 *                                            everything (e.g. version ranges `>=1.2.0 <1.2.4`).
 *                         - `stable`:        Fetch (if necessary) and use the latest stable VSCode version (for the
 *                                            current platform).
 *                         - `insiders`:      Fetch (if necessary) and use the latest insiders VSCode version (for the
 *                                            current platform).
 *
 *
 * ## What it does
 * - Determine the actual targeted version.
 *   Normally, this is the `<code-version>` argument, but there are some special values (see above).
 * - Download the targeted VSCode version (if necessary, i.e. if not already available in `.vscode-test/`).
 *   If the targeted version was already available, update its `atime` to mark is as recently used (see below).
 * - Run the tests on the targeted VSCode version.
 * - Ensure there are no more than `MAX_STORED_VERSIONS` versions stored in `.vscode-test/` to avoid bloat (e.g. in case
 *   `.vscode-test/` is cached on [CI][1]).
 *   (Uses `atime` (access time) to determine the least recently used directories.)
 *
 *
 * ## Why
 * It enables easily running tests on multiple VSCode versions. This is desirable, when one wants to ensure the
 * extension is compatible with a range of VSCode versions (i.e. the APIs used by the extension are available and work
 * consistently on all supported versions).
 * For example, one might want to test on both the latest VSCode version and the minimum supported one.
 *
 *
 * [1]: https://github.com/microsoft/vscode-docs/blob/c9d75a21d6/api/working-with-extensions/continuous-integration.md
 */

// Types
interface ILsLReturnType extends Stats {
  name: string;
}

// Constants
const MAX_STORED_VERSIONS = 5;
const ROOT_DIR = resolve(`${__dirname}/../../..`);
const TEST_DIR = join(ROOT_DIR, 'out/test');
const VSCODE_TEST_DIR = join(ROOT_DIR, '.vscode-test');

// Run
_main(process.argv.slice(2));

// Helpers
async function _main([versionSpec]: string[]): Promise<void> {
  try {
    const version = resolveVersion(versionSpec);
    const vscodeExecutablePath = await downloadAndUnzipVSCode(version);

    const extensionDevelopmentPath = ROOT_DIR;
    const extensionTestsPath = TEST_DIR;

    markVersionUsed(vscodeExecutablePath);
    await runTests({extensionDevelopmentPath, extensionTestsPath, vscodeExecutablePath});
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    try {
      cleanUpVersionDirectories();
    } catch (err) {
      warnMessage('Failed to clean up unused versions.');
      console.error(err);
    }
  }
}

function cleanUpVersionDirectories(): void {
  // 1. Get all existing directories in `.vscode-test`.
  (ls('-l', VSCODE_TEST_DIR) as any as ILsLReturnType[]).
    // 2. Get the ones corresponding to a VSCode version.
    filter(dir => dir.isDirectory() && /^vscode-/.test(dir.name)).
    // 3. Sort them in descending `atime` order.
    sort((a, b) => b.atimeMs - a.atimeMs).
    // 4. Ignore the first `MAX_STORED_VERSIONS`.
    slice(MAX_STORED_VERSIONS).
    // 5. Delete the rest (least recently used ones).
    forEach(dir => rmRf(join(VSCODE_TEST_DIR, dir.name)));
}

function debugMessage(msg: string): void {
  console.debug(`${cyan('[e2e-runner]')} ${msg}`);
}

function getMinSupportedVersion(): string {
  debugMessage('Getting minimum supported version...');
  let {engines: {vscode: version}} = require(`${ROOT_DIR}/package.json`);

  // Replace leading symbols (e.g. `^`, `~`, `>=`).
  version = version.replace(/^\D+/, '');

  // Replace `.x` with `.0`.
  version = version.replace(/\.x/gi, '.0');

  // Ensure enough `.D` parts are present (e.g. `1.2` --> `1.2.0`).
  version = version.replace(/^\d+$/, '$&.0.0').replace(/^\d+\.\d+$/, '$&.0');

  return version;
}

function getVersionDirectory(vscodeExecutablePath: string): string {
  let versionDir = vscodeExecutablePath;
  let parentDir = dirname(versionDir);

  while (parentDir !== VSCODE_TEST_DIR) {
    versionDir = parentDir;
    parentDir = dirname(versionDir);

    if (versionDir === parentDir) {
      // We reached the system root directory. (This should never happen.)
      throw new Error(`Unable to find version directory for '${vscodeExecutablePath}'.`);
    }
  }

  return versionDir;
}

function markVersionUsed(vscodeExecutablePath: string): void {
  const versionDir = getVersionDirectory(vscodeExecutablePath);
  utimesSync(versionDir, new Date(), new Date());
}

function resolveVersion(versionSpec = 'stable'): string {
  switch (versionSpec) {
    default:
      if (!/^\d+\.\d+\.\d+$/.test(versionSpec)) {
        throw new Error(`Unsupported version format (${versionSpec}). ` +
                        'Expected one of: insiders, min-supported, stable or <X>.<Y>.<Z>');
      }
    case 'stable':
    case 'insiders':
      return versionSpec;
    case 'min-supported':
      return getMinSupportedVersion();
  }
}

function rmRf(dir: string): void {
  debugMessage(`Deleting directory '${dir}'...`);
  rm('-rf', dir);
}

function warnMessage(msg: string): void {
  console.warn(`${cyan('[e2e-runner]')} ${yellow(`[WARN] ${msg}`)}`);
}
