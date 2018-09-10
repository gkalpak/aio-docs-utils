import {getCurrentVersion} from '../helpers/e2e-runner';
import {cyan} from '../helpers/string-utils';

// Log the current version for debugging purposes.
console.log(cyan(`(VSCode version: ${getCurrentVersion()})`));

describe('extension', () => {
  it('should have tests', () => {
    expect(true).toBe(true);
  });
});
