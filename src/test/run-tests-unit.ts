// Imports
import {runTests} from './helpers/jasmine-runner';


// Run
runTests('unit', __dirname).
  then(passed => passed || process.exit(1));
