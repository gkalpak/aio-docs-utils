# Contributing to Angular.io Documentation Utilities

All types of contributions are welcome! As a contributor, here are the guidelines we would like you to follow:

- [Code of conduct](#coc)
- [Bug reports](#bugs)
- [Feature requests](#features)
- [Pull requests](#prs)
- [Commit message guidelines](#commit-messages)

## <a name="coc"></a>Code of conduct

Please read and follow our [code of conduct](CODE_OF_CONDUCT.md).

## <a name="bugs"></a>Bug reports

If you find a bug, you can help by [submitting an issue](https://github.com/gkalpak/aio-docs-utils/issues/new) to our repository.
Even better, you can [submit a pull request](#prs) with the fix.

Before submitting an issue, please search the issue tracker to make sure the same bug has not been reported already.

When submitting an issue, make sure you include all relevant details, inclusing the exact versions used and (if possible) a minimal reproduction (either exact steps to follow or a standalone git repository demonstrating the problem).

## <a name="features"></a>Feature requests

You can suggest new features by [submitting an issue](https://github.com/gkalpak/aio-docs-utils/issues/new) to our repository.
If you would like to implement a suggested feature, express your intent on the corresponding issue, so that we can better coordinate our efforts and avoid duplication of work.

## <a name="prs"></a>Pull requests

When submitting a pull request, consider the following guidelines:

1. Make your changes in a new git branch.
2. Submit your pull request against the `master` branch.
2. Add new test-cases that cover the new feature or fix.
3. Ensure all tests (existing and new) pass.
4. Try to follow the coding style of the rest of the project.
5. Follow our [commit message guidelines](#commit-messages).
6. If we suggest changes to a submitted pull request, make the changes as new, [fixup](https://git-scm.com/docs/git-commit#git-commit---fixupltcommitgt) commits (do NOT amend the previous commits, unless necessary).

For more info on how to build and test the project locally check out [DEVELOPER.md](DEVELOPER.md).

## <a name="commit-messages"></a>Commit message guidelines

We have rules over how our git commit messages must be formatted. This leads to more readable messages, that are easy to follow when looking through the [project history](https://github.com/gkalpak/aio-docs-utils/commits/master).

### Commit message format

A commit message consists of one to three sections: a _header_ (mandatory), a _body_ (optional), a _footer_ (optional). Sections are separated with an blank line.

```
<header>

<body>

<footer>
```

You should strive to keep all lines of the commit message below 72 characters. This allows the message to be easier to read on GitHub and various git tools. The _header_ may be up to 120 characters long.

#### _Header_ section

The _header_ section spans one line and consists of three (mandatory) sub-sections: a _type_, a _scope_, and a _subject_.

```
<type>(<scope>): <subject>
```

##### _Type_ sub-section

The _type_ sub-section must be one of the following:

- `cfg`: Changing project configuration (e.g. linting rules, build scripts, dependencies, etc.).
- `ci`: Changing CI-related configuration files and scripts.
- `docs`: Adding/Improving/Fixing documentation.
- `feat`: Implementing a new feature.
- `fix`: Fixing a bug or issue.
- `perf`: Improving performance.
- `refct`: Refactoring source code in a way that does not change the observed behavior for the user.
- `test`: Adding/Improving/Fixing tests and test infrastructure.

##### _Scope_ sub-section

The _scope_ sub-section should be the name of the class, feature, file, or tool/service that was affected by the change (in that order of preference). There are no hard rules; use your better judgement and try to match "prior art".

If a change affects more than one area of the project (or the whole project), use `*` as _scope_.

##### _Subject_ sub-section

The _subject_ sub-section contains a succinct description of the change, additionally subject to the following rules:

- Use the imperative, present tense; e.g. "change", not "changed" nor "changes".
- Do not capitalize the first letter.
- Do not put a dot (`.`) at the end.

##### Examples

_Header_ examples:

- `cfg(package): clean up output directory before building`
- `ci(travis): run tests on latest Node.js`
- `docs(contributing): add commit message guidelines`
- `feat(CodeSnipperIntellisense): improve code highlighting on hover`
- `fix(code-snippet-intellisense): support single-quoted attributes`
- `perf(DocregionExtractor): delay extracting docregions until needed`
- `` refct(DocregionExtractor): remove unused property from `IProvisionalDocregionInfo` ``
- `test(shared): add unit tests`

#### Body

Describe the change in more detail (if necessary), explain the motivation behind the change, and contrast with previous behavior.

Use the imperative, present tense; e.g. "change", not "changed" nor "changes".

```
On activation, show a more subtle message in the status bar.
The previous message was unnecessarily prominent and required user interaction.
```

#### _Footer_ section

The _footer_ section can contain a [closing reference to an issue](https://help.github.com/articles/closing-issues-via-commit-messages) (if any).

If the commit introduces a breaking change, it should also be mentioned in the _footer_ section. The breaking change sub-section should start with the line `BREAKING CHANGE:`, followed by a blank line. The rest of the commit message constitutes the breaking change description, which should explain the difference in the _before_ and _after_ behaviors.

##### Examples

_Footer_ examples:

```
Fixes #12345
```

```
Fixes #67890

BREAKING CHANGE:

The way that thing behaved has changed.
Before, it did this.
Now, it will do that.
```
