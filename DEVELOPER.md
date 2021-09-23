# Building, Testing, and Publishing Angular.io Documentation Utilities

## Overview

The project is mainly written in [TypeScript](https://www.typescriptlang.org/).
[Jasmine](https://jasmine.github.io/) is used for running the tests.
[Node.js](https://nodejs.org/)/[npm](https://www.npmjs.com/) are used for managing dependencies and running [scripts](#npm-scripts) (for building, testing, publishing, etc.).

Since this is a [VSCode](https://code.visualstudio.com/) extension, there are some VSCode [tasks](#vscode-tasks) and [launch configurations](#vscode-launch-configs), that can be used for running tests and debugging.

## <a name="npm-scripts"></a>Npm scripts

Here is a list of npm scripts, that can be used for building and testing the project locally:

- `npm run build`: Compile the source code (including tests), using the TypeScript compiler.
- `npm run build-watch`: Watch the source code (including tests) and re-build whenever something changes.

- `npm run lint`: Lint the source code (including tests, infrastructure, configs, etc.), using tools such as [ESLint](https://eslint.org/), [TypeScript compiler](https://www.typescriptlang.org/) and custom [Node.js](https://nodejs.org/) scripts.
- `npm run test-unit`: Run unit tests.
- `npm run test-e2e [-- <version>]`: Run e2e tests against the specified VSCode version (or the minimum supported version, if `<version>` is not specified). Possible values for `<version>` are: `insiders`, `min-supported`, `stable` or `<X>.<Y>.<Z>`<br />
  ([Note about e2e testing](#e2e-limitation).)
- `npm run test`/`npm test`: Lint the source code and run unit and e2e tests.
- `npm run test-all-versions`: Same as `npm test`, but runs e2e tests against both the minimum supported and the latest available version.

- `npm run dev`: Watch the source code (including tests) and re-build and run unit tests whenever something changes. Useful during development.

The following npm scripts can be used for packaging and publishing a new version of the extension to the [VSCode marketplace](https://marketplace.visualstudio.com/vscode). Publishing can only be performed by project maintainers (with publish rights).

- `npm run release [-- <patch|minor|major>]`: Run all tests, increment version to the next patch/minor/major version (defaults to `patch`), create and tag a commit, and push the changes to GitHub. (Beware of this [e2e testing limitation](#e2e-limitation).)
- `npm run vsce-package`: Package the current code into a `.vsix` file. These files can be used for offline installation, privately sharing the extension, or [manually publishing](https://marketplace.visualstudio.com/manage/publishers) a new version.
- `npm run vsce-publish [-- --pat <PAT>]`: Publish the current code of the extension as a new version. Publishing requires authentication, e.g. by passing a [VSTS](https://visualstudio.microsoft.com/team-services) **Personal Access Token (PAT)**. See [here](https://code.visualstudio.com/docs/extensions/publish-extension) for more details.

_Normally, the tasks of packaging, creating GitHub releases, and publishing to the marketplace are handled automatically on CI (see the `Deploy` stage in [.azure-pipelines/config.yml](.azure-pipelines/config.yml) for more info). Project maintainers only have to create and push a tagged commit, e.g. using the `release` npm script._

_This extension is published under the [gkalpak](https://dev.azure.com/gkalpak) Azure DevOps organization as publisher [gkalpak](https://marketplace.visualstudio.com/manage/publishers/gkalpak)._

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
_Due to a [VSCode limitation](https://code.visualstudio.com/api/working-with-extensions/testing-extension#using-insiders-version-for-extension-development), depending on your VSCode version and/or installation mode (global vs per user), it might not be possible to run the extension e2e tests from the command line (via `npm run test-e2e`), if another instance of VSCode is already running. If that is the case, either close all instances of VSCode first, use the relevant [launch configuration](#vscode-launch-configs) from an already running VSCode instance, or run the tests on a different VSCode version (via `npm run test-e2e -- <some-version>`)._
