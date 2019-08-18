// Imports
import {runE2e} from './helpers/jasmine-runner';


// Exports
export const run = async (): Promise<void> => {
  const passed = await runE2e(__dirname);

  if (!passed) {
    throw new Error('E2E tests failed.');
  }
};
