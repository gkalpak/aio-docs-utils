// Imports
import Jasmine = require('jasmine');
import 'source-map-support/register';
import {IJasmineRunner} from './jasmine-typings';
import {bold, cyan, green, red, symbols} from './string-utils';


// Types
export type TestType = 'e2e' | 'unit';

// Exports
export const runTests = (testType: TestType, testDir: string): Promise<boolean> => {
  // `vscode` APIs are only provided when running tests through VSCode (i.e. e2e tests).
  // For "standalone" unit tests, we need to mock them.
  if (testType === 'unit') {
    const mock = require('mock-require');
    const {mockVscode} = require('./vscode.mock');

    mock('vscode', mockVscode);
  }

  return new Promise(resolve => {
    const runner = new Jasmine({projectBaseDir: testDir});

    loadConfig(testType, runner);
    setUpReporting(testType, runner, resolve);

    console.log(cyan(bold(`Running ${testType} tests...`)));
    runner.execute();
  });
};

// Helpers
function loadConfig(specDir: string, runner: IJasmineRunner): void {
  runner.loadConfig({
    random: true,
    spec_dir: specDir,
    spec_files: [
      '**/*.spec.js',
    ],
  });
}

function setUpReporting(testType: TestType, runner: IJasmineRunner, cb: (passed: boolean) => void): void {
  let pending = '';

  if (testType === 'e2e') {
    // VSCode monkey-patches the environment that tests are run in, so that `process.stdout.write`
    // is a no-op. Test runners are expected to use `console.log/info/warn/error` instead :(
    runner.configureDefaultReporter({
      print: (input: string | Buffer) => {
        const inputStr = (typeof input === 'string') ? input : input.toString();
        const newLineIdx = inputStr.lastIndexOf('\n');

        if (newLineIdx === -1) {
          pending += inputStr;
        } else {
          console.log(pending + inputStr.slice(0, newLineIdx));
          pending = inputStr.slice(newLineIdx + 1);
        }
      },
    });
  }

  runner.onComplete(passed => {
    if (pending) {
      console.log(pending);
      pending = '';
    }

    const capitalizedTestType = testType[0].toUpperCase() + testType.slice(1);
    console.log(passed ?
      green(bold(`${symbols.CHECK_MARK} ${capitalizedTestType} tests passed.`)) :
      red(bold(`${symbols.X_MARK} ${capitalizedTestType} tests failed.`)));

    cb(passed);
  });
}
