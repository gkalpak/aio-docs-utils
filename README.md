# Angular.io Documentation Utilities

> A [VSCode](https://code.visualstudio.com/) extension providing a set of simple utilities to aid in authoring/viewing documentation for angular.io.

[![Project license](https://badgen.net/github/license/gkalpak/aio-docs-utils?emoji=1&label=📄+Project+license)](https://github.com/gkalpak/aio-docs-utils/tree/master/LICENSE.txt)

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Releases

See [here](https://github.com/gkalpak/aio-docs-utils/releases) for a list of releases.<br />
See [here](https://github.com/gkalpak/aio-docs-utils/commits) a list of changes.

---
## TODO

Things I want to (but won't necessarily) do:

- Set up CI.
- Add e2e tests.
- Update "Features" section in `README.md`.
- Add `CONTRIBUTING.md` or "Contributing/Developing" section in `README.md`.
  - Available npm scripts (with short descriptions/purpose).
  - Available VSCode tasks and launch configurations (with short descriptions/purpose).
  - Commit message guidelines.
- Publish.
  - Ensure `test` is run before publishing.
  - Ensure `version` field is incremented in `package.json` and a corresponding tag is created and pushed to GitHub (probably via `npm version`). E.g.:
    ```
    "scripts": {
      ...
      "preversion": "npm test",
      "version": "/* Update static files with new version in `package.json` (and `git add ...`) */",
      "postversion": "git push && git push --tags"
    }
    ```
  - Post-publish:
    - Add marketplace link in repo description/`README.md`.
    - Add latest (published) version badge in `README.md`, e.g.:
      [![Latest version](https://vsmarketplacebadge.apphb.com/version-short/gkalpak.aio-docs-utils.svg?color=blue&label=Latest+version&logo=visual-studio-code&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=gkalpak.aio-docs-utils)
