#!/usr/bin/env node
import {commandUtils} from '@gkalpak/cli-utils';
import {Stats} from 'fs';
import {join, resolve as resolvePath} from 'path';
import {cat, ls, mv, rm, set, test} from 'shelljs';
import {cyan} from './string-utils';

set('-e');

// #region Documentation
// tslint:disable: max-line-length
/**
 * ## Usage:
 * ```
 * node out/test/helpers/e2e-runner "<run-tests-cmd>" "<code-version>"
 * ```
 *
 *   Where:
 *   - `<run-tests-cmd>`:  The command to use for actually running the tests. E.g.: `npm run test-e2e`
 *   - `<code-version>`:   The version of VSCode to run the tests with. E.g.: `1.33.7`
 *     (default: any)      Special values:
 *                         - `earliest`: Infer the earliest supported version, based on the version pattern in
 *                                       `package.json > engines > vscode`. It supports many common formats (e.g.
 *                                       `1.2.3` `^1.2.3`/`~1.2.3`, `1.2.x`, `1.2`), but not everything (e.g. `>`, `<`,
 *                                       version ranges).
 *                         - `latest`:   Always fetch the latest VSCode version. The script first determines what the
 *                                       latest version is (for the current platform) and avoids downloading it if it is
 *                                       already available in `.vscode-test/`. If not, VSCode will handle fetching the
 *                                       latest version, before running the tests.
 *                         - `any`/`*`:  Use the current version (i.e. `.vscode-test/stable/`) if one exists, else treat
 *                                       it as `latest`.
 *
 *
 * ## What it does
 * - Determine the actual targeted version.
 *   Normally, this is the `<code-version>` argument, but there are some special values (see above).
 * - Does the specified version match the current one (i.e. the one in `.vscode-test/stable/` - if any)?
 *   - YES:
 *     - Run the tests command.
 *   - NO:
 *     - If `.vscode-test/stable/` exists, rename it to `stable-stashed`.
 *     - If `.vscode-test/stable-<version>/` exists, rename it to `stable`.
 *     - Run the tests command (setting the `CODE_VERSION` environment variable to `<version>`).
 *     - Is there a stashed version (i.e. does `.vscode-test/stable-stashed/` exist)?
 *       - YES:
 *         - Back the current version up for future use (i.e. rename `stable` to `stable-<version>`).
 *         - Restore the stashed version (i.e. rename `stable-stashed` to `stable`).
 * - Ensure there are no more than `MAX_BACKUPS` backed-up versions (i.e. `stable-<some-version>` directories) in
 *   `.vscode-test/` to avoid bloat (e.g. in case `.vscode-test/` is cached CI).
 *   (Uses `ctime` to determine the least recently used directories.)
 *
 *
 * ## Why
 * VScode does not respect the `CODE_DOWNLOAD_URL`/`CODE_VERSION` [environment variables][1], if there is already a
 * version available in `.vscode-test/`. Yet, sometimes it is desirable to run tests on specific (or multiple) versions,
 * e.g. on both the latest and the minimum supported one.
 *
 * See [this issue][2] for more details.
 *
 *
 * ## Limitations
 * - Currently, only stable versions are supported. Not `insiders`.
 *
 * [1]: https://github.com/Microsoft/vscode-docs/blob/dc1792fded1fba89f6914a79ffd974d35c3e2869/docs/extensions/testing-extensions.md#running-tests-automatically-on-travis-ci-build-machines
 * [2]: https://github.com/Microsoft/vscode-extension-vscode/issues/96
 */
// tslint:enable: max-line-length
// #endregion

// Constants
const CURRENT_APP_DIR_NAME = 'stable';
const STASHED_APP_DIR_NAME = `${CURRENT_APP_DIR_NAME}-stashed`;
const MAX_BACKUPS = 3;

const ROOT_DIR = resolvePath(__dirname, '../../..');
const VSCODE_DIR = join(ROOT_DIR, '.vscode-test');
const CURRENT_APP_DIR = join(VSCODE_DIR, CURRENT_APP_DIR_NAME);
const STASHED_APP_DIR = join(VSCODE_DIR, STASHED_APP_DIR_NAME);

// Classes / Interfaces
interface ILsLReturnType extends Stats {
  name: string;
}

interface ICleanUpable {
  cleanUp(): void;
}

class CleanUpBackups implements ICleanUpable {
  public cleanUp(): void {
    // Get all existing backups, sort them in descending `ctime` order, and ignore the `MAX_BACKUPS` first.
    const excessBackups = (ls('-l', VSCODE_DIR) as any as ILsLReturnType[]).
      filter(dir => dir.isDirectory() && !this.isIgnoredDir(dir.name)).
      sort((a, b) => b.ctimeMs - a.ctimeMs).
      slice(MAX_BACKUPS);

    // Delete old, unused backups.
    excessBackups.forEach(dir => rmRf(join(VSCODE_DIR, dir.name)));
  }

  private isIgnoredDir(dirName: string): boolean {
    return (dirName === CURRENT_APP_DIR_NAME) || (dirName === STASHED_APP_DIR_NAME);
  }
}

class CleanUpRename implements ICleanUpable {
  constructor(private from: string, private to: string = '') {
  }

  public cleanUp(): void {
    if (!this.to) {
      const version = getCurrentVersion() || '';
      this.to = version && getBackupDir(version);
    }

    if (this.to && test('-e', this.from)) {
      move(this.from, this.to);
    }
  }
}

// Run
if (require.main === module) {
  _main(process.argv.slice(2));
}

// Exports
export function getCurrentVersion(): string | null {
  return getVersion(CURRENT_APP_DIR);
}

export async function runTests(runTestsCmd: string, codeVersion = 'any'): Promise<void> {
  const cleanUpItems: ICleanUpable[] = [];

  try {
    // Register a clean-up task to remove old, unused backups from `.vscode-test/`.
    cleanUpItems.push(new CleanUpBackups());

    // If a current version does not exist, check if a previous run crashed and left a version stashed.
    if (!test('-d', CURRENT_APP_DIR) && test('-d', STASHED_APP_DIR)) {
      move(STASHED_APP_DIR, CURRENT_APP_DIR);
    }

    // Get the current version (if any).
    const originalCurrentVersion = getCurrentVersion();

    // Resolve special `codeVersion` values.
    codeVersion = await resolveCodeVersion(codeVersion, originalCurrentVersion);

    // If the current version is the specified one, just run the tests.
    if (originalCurrentVersion === codeVersion) {
      await runTestsWithVersion(runTestsCmd, codeVersion);
      return;
    }

    // If a current version exists, stack it away (and restore it later).
    if (originalCurrentVersion) {
      move(CURRENT_APP_DIR, STASHED_APP_DIR);
      cleanUpItems.push(new CleanUpRename(STASHED_APP_DIR, CURRENT_APP_DIR));
    }

    // Check if the specified version is already available.
    const codeVersionBackupDir = getBackupDir(codeVersion);
    const isVersionAvailable = !!codeVersion &&
      test('-d', codeVersionBackupDir) &&
      (getVersion(codeVersionBackupDir) === codeVersion);

    // Either way, if there was a current version originally, ensure the specified version
    // (pre-existing or downloaded) is eventually backed up for future use.
    if (originalCurrentVersion) {
      // If no version specified, read it later from the downloaded version.
      cleanUpItems.push(new CleanUpRename(CURRENT_APP_DIR, codeVersion && codeVersionBackupDir));
    }

    // If the specified version is available, make it the current version,
    // run the tests, and finally restore directories.
    if (isVersionAvailable) {
      move(codeVersionBackupDir, CURRENT_APP_DIR);
    }

    // Run the tests with the specified version (either pre-existing or downloaded).
    await runTestsWithVersion(runTestsCmd, codeVersion);
  } finally {
    // Restore any moved directories in reverse order.
    // (Wait for resources to be released by previous commands first.)
    await new Promise(res => setTimeout(res, 1000));
    cleanUpItems.reverse().forEach(item => item.cleanUp());
  }
}

// Helpers
function _main([runTestsCmd, codeVersion]: string[]): void {
  runTests(runTestsCmd, codeVersion).catch(err => {
    console.error(`Error: ${err}`);
    process.exit(1);
  });
}

function debugMessage(msg: string): void {
  console.debug(`${cyan('[e2e-runner]')} ${msg}`);
}

function getBackupDir(version: string): string {
  return `${CURRENT_APP_DIR}-${version}`;
}

function getEarliestVersion(): string {
  debugMessage('Getting earliest supported version...');
  let {engines: {vscode: version}} = require(`${ROOT_DIR}/package.json`);

  // Replace leading symbols (e.g. `^`, `~`, `>=`).
  version = version.replace(/^\D+/, '');

  // Replace `.x` with `.0`.
  version = version.replace(/\.x/gi, '.0');

  // Ensure enough `.D` parts are present (e.g. `1.2` --> `1.2.0`).
  version = version.replace(/^\d+$/, '$&.0.0').replace(/^\d+\.\d+$/, '$&.0');

  return version;
}

async function getLatestVersion(): Promise<string> {
  // URL taken from
  // https://github.com/Microsoft/vscode-extension-vscode/blob/47f02ad0618869686599ddec6f4239dbce487802/bin/test#L133.
  const platformId = (process.platform === 'darwin') ?
    'darwin' : (process.platform === 'win32') ?
    'win32-archive' :
    'linux-x64';
  const releasesUrl = `https://update.code.visualstudio.com/api/releases/stable/${platformId}`;

  const response = await httpsGet(releasesUrl);
  const releases = JSON.parse(response);

  return releases[0] || '';
}

function getVersion(appDir: string): string | null {
  try {
    const resourcesDir = (process.platform === 'darwin') ?
      'Visual Studio Code.app/Contents/Resources/' : (process.platform === 'win32') ?
      'resources/' :
      'VSCode-linux-x64/resources/';
    const pkgPath = join(appDir, resourcesDir, 'app/package.json');
    const pkgObj = JSON.parse(cat(pkgPath));

    return pkgObj.version || null;
  } catch (_ignored) {
    return null;
  }
}

async function httpsGet(url: string): Promise<string> {
  const https = await import('https');

  debugMessage(`Fetching '${url}'...`);

  return new Promise<string>((resolve, reject) => https.
    get(url, response => {
      const statusCode = response.statusCode || -1;
      const isSuccess = (200 <= statusCode) && (statusCode < 300);
      let responseText = '';

      response.
        on('error', reject).
        on('data', d => responseText += d).
        on('end', () => isSuccess ?
          resolve(responseText) :
          reject(`Request to '${url}' failed (status: ${statusCode}): ${responseText}`));
    }).
    on('error', reject));
}

function move(from: string, to: string): void {
  debugMessage(`Moving '${from}' to '${to}'...`);
  mv(from, to);
}

async function resolveCodeVersion(codeVersion: string, currentVersion: string | null): Promise<string> {
  switch (codeVersion) {
    case '*':
    case 'any':
      return currentVersion || await getLatestVersion();
    case 'earliest':
      return getEarliestVersion();
    case 'latest':
      return await getLatestVersion();
    default:
      return codeVersion;
  }
}

function rmRf(dir: string): void {
  debugMessage(`Deleting directory '${dir}'...`);
  rm('-rf', dir);
}

async function runTestsWithVersion(runTestsCmd: string, codeVersion: string): Promise<void> {
  const originalCodeVersion = process.env.CODE_VERSION;
  process.env.CODE_VERSION = codeVersion;

  try {
    debugMessage(`Running tests (specified version: ${codeVersion || '-'})...`);
    await commandUtils.spawnAsPromised(runTestsCmd);
  } finally {
    process.env.CODE_VERSION = originalCodeVersion;
  }
}
