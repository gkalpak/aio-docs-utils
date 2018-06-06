type Jasmine = import('jasmine');

export interface IJasmineConfig {
  // Spec directory path relative to `projectBaseDir` (or the current working dir).
  spec_dir: string;

  // Array of filepaths (and globs) relative to `spec_dir` to include.
  spec_files: string[];

  // Array of filepaths (and globs) relative to `spec_dir` to include before specs.
  helpers: string[];

  // Stop execution of a spec after the first expectation failure.
  stopSpecOnExpectationFailure: boolean;

  // Run specs in semi-random order.
  random: boolean;
}

export interface IJasmineDefaultReporterConfig {
  // Whether or not the reporter should use ANSI color codes.
  showColors: boolean;

  // Determines the mechanism for seeing how long the suite takes to run.
  timer: IJasmineTimer;

  // Will be called to print the reporter results.
  print(input: string | Buffer): void;
}

export interface IJasmineRunner extends Jasmine {
  configureDefaultReporter(config: Partial<IJasmineDefaultReporterConfig>, ...args: any[]): void;
  loadConfig(config: Partial<IJasmineConfig>): void;
}

export interface IJasmineTimer {
  new(): IJasmineTimer;
}
