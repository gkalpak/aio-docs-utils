# Angular.io Documentation Utilities

> A [VSCode](https://code.visualstudio.com/) extension providing a set of simple utilities to aid in authoring/viewing documentation for angular.io.

[![Build status (Linux, macOS)](https://badgen.net/travis/gkalpak/aio-docs-utils/master?icon=travis&label=Build+status+(Linux,+macOS))](https://travis-ci.org/gkalpak/aio-docs-utils/branches)
&emsp;
[![Build status (Windows)](https://badgen.net/appveyor/ci/gkalpak/aio-docs-utils/master?icon=appveyor&label=Build+status+(Windows))](https://ci.appveyor.com/project/gkalpak/aio-docs-utils/branch/master)
&emsp;
[![Project license](https://badgen.net/github/license/gkalpak/aio-docs-utils?emoji=1&label=📄+Project+license)](https://github.com/gkalpak/aio-docs-utils/tree/master/LICENSE.txt)

## Features

### Code snippet utilities

The extension provides features that are useful for viewing and authoring code snippets (with source code extracted from standalone apps) in [Angular](https://github.com/angular/angular) API docs and guides.

#### Show code snippets on hover

Hovering over `<code-example>` or `{@example}` tags, shows the extracted code snippets, including their title and line numbering.

<p align="center">
  <img alt="Code snippet on hover" height="400" src="img/on-hover.gif" />
</p>

#### Peek/Go to code snippet definition

Right-clicking on `<code-example>` or `{@example}` tags, shows context menu options for peeking the definition (source code regions) and navigating to the definition (source code file) of the code snippet.

<p align="center">
  <img alt="Code snippet definition" height="400" src="img/definition.gif" />
</p>

If the code snippet consists of multiple docregions, all regions are highlighted.

<p align="center">
  <img alt="Multi-region code snippet definition" height="400" src="img/definition-multiregion.gif" />
</p>

#### Autocomplete suggestions for docregions

When creating `<code-example>` or `{@example}` tags, autocomplete suggestions are shown for the `region` attribute.

<p align="center">
  <img alt="Docregion autocomplete suggestions" height="400" src="img/autocomplete.gif" />
</p>

_**Note**: Autocomplete suggestions are triggered by the characters `=` (after `region`) and `'`/`"` (after `region=`)._

## Releases

See [here](https://github.com/gkalpak/aio-docs-utils/releases) for a list of releases.<br />
See [here](https://github.com/gkalpak/aio-docs-utils/commits) a list of changes.

## Known issues

#### Possible inconsistency with the actual implementation

The examples in the actual docs are processed via [dgeni](https://github.com/angular/dgeni) and more specifically using utilities in the [examples-package](https://github.com/angular/angular/tree/master/aio/tools/transforms/examples-package).<br />
This extension re-implements the relevant logic, but might have slight inconsistencies compared to the actual `dgeni` implementation.

#### Multi-line `{@example ...}` tags not fully supported

`{@example ...}` tags spreading across multi lines, will not be recognized if there are lines that contain only unnamed attributes (such as the path or title). For example:

```
// Not recognized.
{@example
  path/to/examp.le
  region="foo"
}

{@example path/to/examp.le region="foo"
  This is the title
}

// Recognized.
{@example
  path/to/examp.le region="foo"
}

{@example path/to/examp.le region="foo"
  title="This is the title"
}

{@example path/to/examp.le
  region="foo" This is the title
}
```

---
## TODO

Things I want to (but won't necessarily) do:

- Add e2e tests.
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
- Refactor `CodeSnippetUtils` into separate (independently unit-testable) "parsers" for different types of tags (`HtmlTag`, `NgdocTag`, etc.), that would return `ICodeSnippetRawInfo` and `ICodeSnippetAttrInfo`.
