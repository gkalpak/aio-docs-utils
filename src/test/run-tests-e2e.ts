// Imports
import {runTests} from './helpers/jasmine-runner';


// Exports
export const run = (): Promise<unknown> =>
  runTests('e2e', __dirname).
    then(passed => passed || Promise.reject('Exit code: 1'));
