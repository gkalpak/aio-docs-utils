# Building and Testing Angular.io Documentation Utilities

## Overview

The project is mainly written in [TypeScript](https://www.typescriptlang.org/).
[Jasmine](https://jasmine.github.io/) is used for running the tests.
[Node.js](https://nodejs.org/)/[npm](https://www.npmjs.com/) are used for managing dependencies and running [scripts](#npm-scripts) (for building, testing, etc.).

Since this is a [VSCode](https://code.visualstudio.com/) extension, there are some VSCode [tasks](#vscode-tasks) and [launch configurations](#vscode-launch-configs), that can be used for running tests and debugging.

## <a name="npm-scripts"></a>Npm scripts

Here is a list of npm scripts, that can be used for building and testing the project locally:

- `npm run build`: Compile the source code (including tests), using the TypeScript compiler.
- `npm run build-watch`: Watch the source code (including tests) and re-build whenever something changes.

- `npm run lint`: Lint the source code (including tests), using [tslint](https://palantir.github.io/tslint/).
- `npm run test-unit`: Run unit tests.
- `npm run test-e2e`: Run e2e tests. ([Note about e2e testing](#e2e-limitation).)
- `npm test`: Lint the source code (including tests) and run unit and e2e tests.

- `npm run dev`: Watch the source code (including tests) and re-build and run unit tests whenever something changes. Useful during development.

For a full list of available npm scripts, see [package.json](package.json).

## <a name="vscode-tasks"></a>VSCode tasks

Here is a list of VSCode tasks (defined in [tasks.json](.vscode/tasks.json), that can be useful during local development:

- `npm: build`: Run `npm build`.
- `npm: build-watch`: Run `npm build-watch`.

## <a name="vscode-launch-configs"></a>VSCode launch configurations

Here is a list of VSCode launch configurations (defined in [launch.json](.vscode/launch.json), that can be useful during local development:

- `Extension`: Launch a new VSCode instance with the extension loaded.
- `Extension Tests (unit) - DEBUG`: Run the unit tests in "debug" mode. Useful for debugging unexpectedly failing tests.
- `Extension Tests (e2e)`: Launch a new VSCode instance with the extension loaded and run the e2e tests against that. ([Note about e2e testing](#e2e-limitation).)

---
<a name="e2e-limitation"></a>_**Note about e2e testing**_<br />
_Due to a VSCode limitation, it is currently not possible to run the extension e2e tests from the command line (via `npm run test-e2e`), if another instance of VSCode is already running. Either close all instances of VSCode first, or use the relevant [launch configuration](#vscode-launch-configs) from an already running VSCode instance.