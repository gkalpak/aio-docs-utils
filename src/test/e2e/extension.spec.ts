import {version} from 'vscode';
import {cyan} from '../helpers/string-utils';


// Log the current version for debugging purposes.
console.log(cyan(`(VSCode version: ${version})`));

describe('extension', () => {
  it('should have tests', () => {
    expect(true).toBe(true);
  });
});
