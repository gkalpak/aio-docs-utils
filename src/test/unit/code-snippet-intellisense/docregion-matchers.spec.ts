import {docregionMatchers, getDocregionMatcher} from '../../../code-snippet-intellisense/docregion-matchers';


describe('docregionMatchers', () => {
  // Helpers
  const expectNotToMatch = (re: RegExp, line: string): void => {
    expect(re.exec(line)).toBeNull();
  };
  const expectToMatch = (re: RegExp, line: string, regionNames: string): void => {
    expect(re.exec(line)).toEqual(jasmine.objectContaining({1: regionNames}) as any);
  };

  it('should be an object', () => {
    expect(docregionMatchers).toEqual(jasmine.any(Object));
  });

  describe('blockComment', () => {
    const matcher = docregionMatchers.blockComment;

    describe('regionStartRe', () => {
      const re = matcher.regionStartRe;

      it('should match docregion start block comments (and extract docregion names)', () => {
        expectToMatch(re, '/* #docregion */', '');
        expectToMatch(re, '/* #docregion foo_bar, baz-qux */', 'foo_bar, baz-qux');
        expectToMatch(re, '  /*   #docregion   foo_bar,   baz-qux   */  ', 'foo_bar,   baz-qux');
      });

      it('should not match lines that are not docregion start block comments', () => {
        expectNotToMatch(re, '# #docregion foo');
        expectNotToMatch(re, '## #docregion bar');
        expectNotToMatch(re, '<!-- #docregion baz -->');
        expectNotToMatch(re, '// #docregion qux');

        expectNotToMatch(re, 'foo /* #docregion */');
        expectNotToMatch(re, '/* #docregion */ bar');

        expectNotToMatch(re, '/* #doc-region */');
        expectNotToMatch(re, '/* #enddocregion */');
        expectNotToMatch(re, '/* #docplaster */');
      });
    });

    describe('regionEndRe', () => {
      const re = matcher.regionEndRe;

      it('should match docregion end block comments (and extract docregion names)', () => {
        expectToMatch(re, '/* #enddocregion */', '');
        expectToMatch(re, '/* #enddocregion foo_bar, baz-qux */', 'foo_bar, baz-qux');
        expectToMatch(re, '  /*   #enddocregion   foo_bar,   baz-qux   */  ', 'foo_bar,   baz-qux');
      });

      it('should not match lines that are not docregion end block comments', () => {
        expectNotToMatch(re, '# #enddocregion foo');
        expectNotToMatch(re, '## #enddocregion bar');
        expectNotToMatch(re, '<!-- #enddocregion baz -->');
        expectNotToMatch(re, '// #enddocregion qux');

        expectNotToMatch(re, 'foo /* #enddocregion */');
        expectNotToMatch(re, '/* #enddocregion */ bar');

        expectNotToMatch(re, '/* #enddoc-region */');
        expectNotToMatch(re, '/* #docregion */');
        expectNotToMatch(re, '/* #docplaster */');
      });
    });

    describe('plasterRe', () => {
      const re = matcher.plasterRe;

      it('should match docplaster block comments (and extract the plaster)', () => {
        expectToMatch(re, '/* #docplaster */', '');
        expectToMatch(re, '/* #docplaster foo_bar, baz-qux */', 'foo_bar, baz-qux');
        expectToMatch(re, '  /*   #docplaster   foo_bar,   baz-qux   */  ', 'foo_bar,   baz-qux');
      });

      it('should not match lines that are not docplaster block comments', () => {
        expectNotToMatch(re, '# #docplaster foo');
        expectNotToMatch(re, '## #docplaster bar');
        expectNotToMatch(re, '<!-- #docplaster baz -->');
        expectNotToMatch(re, '// #docplaster qux');

        expectNotToMatch(re, 'foo /* #docplaster */');
        expectNotToMatch(re, '/* #docplaster */ bar');

        expectNotToMatch(re, '/* #doc-plaster */');
        expectNotToMatch(re, '/* #docregion */');
        expectNotToMatch(re, '/* #enddocregion */');
      });
    });

    describe('createPlasterComment()', () => {
      it('should create a docplaster block comment', () => {
        expect(matcher.createPlasterComment('foo bar')).toBe('/* foo bar */');
      });
    });
  });

  describe('hashComment', () => {
    const matcher = docregionMatchers.hashComment;

    describe('regionStartRe', () => {
      const re = matcher.regionStartRe;

      it('should match docregion start hash comments (and extract docregion names)', () => {
        expectToMatch(re, '# #docregion', '');
        expectToMatch(re, '## #docregion', '');
        expectToMatch(re, '# #docregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '## #docregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  #   #docregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
        expectToMatch(re, '  ##   #docregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docregion start hash comments', () => {
        expectNotToMatch(re, '/* #docregion foo */');
        expectNotToMatch(re, '<!-- #docregion bar -->');
        expectNotToMatch(re, '// #docregion baz');

        expectNotToMatch(re, 'foo # #docregion');
        expectNotToMatch(re, 'foo ## #docregion');
        expectNotToMatch(re, '# bar #docregion');
        expectNotToMatch(re, '## bar #docregion');

        expectNotToMatch(re, '# #doc-region');
        expectNotToMatch(re, '## #doc-region');
        expectNotToMatch(re, '# #enddocregion');
        expectNotToMatch(re, '## #enddocregion');
        expectNotToMatch(re, '# #docplaster');
        expectNotToMatch(re, '## #docplaster');
      });
    });

    describe('regionEndRe', () => {
      const re = matcher.regionEndRe;

      it('should match docregion end hash comments (and extract docregion names)', () => {
        expectToMatch(re, '# #enddocregion', '');
        expectToMatch(re, '## #enddocregion', '');
        expectToMatch(re, '# #enddocregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '## #enddocregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  #   #enddocregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
        expectToMatch(re, '  ##   #enddocregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docregion end hash comments', () => {
        expectNotToMatch(re, '/* #enddocregion foo */');
        expectNotToMatch(re, '<!-- #enddocregion bar -->');
        expectNotToMatch(re, '// #enddocregion baz');

        expectNotToMatch(re, 'foo # #enddocregion');
        expectNotToMatch(re, 'foo ## #enddocregion');
        expectNotToMatch(re, '# bar #enddocregion');
        expectNotToMatch(re, '## bar #enddocregion');

        expectNotToMatch(re, '# #enddoc-region');
        expectNotToMatch(re, '## #enddoc-region');
        expectNotToMatch(re, '# #docregion');
        expectNotToMatch(re, '## #docregion');
        expectNotToMatch(re, '# #docplaster');
        expectNotToMatch(re, '## #docplaster');
      });
    });

    describe('plasterRe', () => {
      const re = matcher.plasterRe;

      it('should match docplaster hash comments (and extract the plaster)', () => {
        expectToMatch(re, '# #docplaster', '');
        expectToMatch(re, '## #docplaster', '');
        expectToMatch(re, '# #docplaster foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '## #docplaster foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  #   #docplaster   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
        expectToMatch(re, '  ##   #docplaster   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docplaster hash comments', () => {
        expectNotToMatch(re, '/* #docplaster foo */');
        expectNotToMatch(re, '<!-- #docplaster bar -->');
        expectNotToMatch(re, '// #docplaster baz');

        expectNotToMatch(re, 'foo # #docplaster');
        expectNotToMatch(re, 'foo ## #docplaster');
        expectNotToMatch(re, '# bar #docplaster');
        expectNotToMatch(re, '## bar #docplaster');

        expectNotToMatch(re, '# #doc-plaster');
        expectNotToMatch(re, '## #doc-plaster');
        expectNotToMatch(re, '# #docregion');
        expectNotToMatch(re, '## #docregion');
        expectNotToMatch(re, '# #enddocregion');
        expectNotToMatch(re, '## #enddocregion');
      });
    });

    describe('createPlasterComment()', () => {
      it('should create a docplaster hash comment', () => {
        expect(matcher.createPlasterComment('foo bar')).toBe('# foo bar');
      });
    });
  });

  describe('htmlComment', () => {
    const matcher = docregionMatchers.htmlComment;

    describe('regionStartRe', () => {
      const re = matcher.regionStartRe;

      it('should match docregion start HTML comments (and extract docregion names)', () => {
        expectToMatch(re, '<!-- #docregion -->', '');
        expectToMatch(re, '<!-- #docregion', '');
        expectToMatch(re, '<!-- #docregion foo_bar, baz-qux -->', 'foo_bar, baz-qux');
        expectToMatch(re, '<!-- #docregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  <!--   #docregion   foo_bar,   baz-qux   -->  ', 'foo_bar,   baz-qux');
        expectToMatch(re, '  <!--   #docregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux');
      });

      it('should not match lines that are not docregion start HTML comments', () => {
        expectNotToMatch(re, '/* #docregion foo */');
        expectNotToMatch(re, '# #docregion bar');
        expectNotToMatch(re, '## #docregion bax');
        expectNotToMatch(re, '// #docregion qux');

        expectNotToMatch(re, 'foo <!-- #docregion -->');
        expectNotToMatch(re, 'foo <!-- #docregion');
        expectNotToMatch(re, '<!-- #docregion --> bar');

        expectNotToMatch(re, '<!-- #doc-region -->');
        expectNotToMatch(re, '<!-- #doc-region');
        expectNotToMatch(re, '<!-- #enddocregion -->');
        expectNotToMatch(re, '<!-- #enddocregion');
        expectNotToMatch(re, '<!-- #docplaster -->');
        expectNotToMatch(re, '<!-- #docplaster');
      });
    });

    describe('regionEndRe', () => {
      const re = matcher.regionEndRe;

      it('should match docregion end HTML comments (and extract docregion names)', () => {
        expectToMatch(re, '<!-- #enddocregion -->', '');
        expectToMatch(re, '<!-- #enddocregion foo_bar, baz-qux -->', 'foo_bar, baz-qux');
        expectToMatch(re, '  <!--   #enddocregion   foo_bar,   baz-qux   -->  ', 'foo_bar,   baz-qux');
      });

      it('should not match lines that are not docregion end HTML comments', () => {
        expectNotToMatch(re, '/* #enddocregion foo */');
        expectNotToMatch(re, '# #enddocregion bar');
        expectNotToMatch(re, '## #enddocregion baz');
        expectNotToMatch(re, '// #enddocregion qux');

        expectNotToMatch(re, 'foo <!-- #enddocregion -->');
        expectNotToMatch(re, '<!-- #enddocregion --> bar');
        expectNotToMatch(re, '<!-- #enddocregion baz');

        expectNotToMatch(re, '<!-- #enddoc-region -->');
        expectNotToMatch(re, '<!-- #docregion -->');
        expectNotToMatch(re, '<!-- #docplaster -->');
      });
    });

    describe('plasterRe', () => {
      const re = matcher.plasterRe;

      it('should match docplaster HTML comments (and extract the plaster)', () => {
        expectToMatch(re, '<!-- #docplaster -->', '');
        expectToMatch(re, '<!-- #docplaster foo_bar, baz-qux -->', 'foo_bar, baz-qux');
        expectToMatch(re, '  <!--   #docplaster   foo_bar,   baz-qux   -->  ', 'foo_bar,   baz-qux');
      });

      it('should not match lines that are not docplaster HTML comments', () => {
        expectNotToMatch(re, '/* #docplaster foo */');
        expectNotToMatch(re, '# #docplaster bar');
        expectNotToMatch(re, '## #docplaster baz');
        expectNotToMatch(re, '// #docplaster qux');

        expectNotToMatch(re, 'foo <!-- #docplaster -->');
        expectNotToMatch(re, '<!-- #docplaster --> bar');
        expectNotToMatch(re, '<!-- #docplaster baz');

        expectNotToMatch(re, '<!-- #doc-plaster -->');
        expectNotToMatch(re, '<!-- #docregion -->');
        expectNotToMatch(re, '<!-- #enddocregion -->');
      });
    });

    describe('createPlasterComment()', () => {
      it('should create a docplaster HTML comment', () => {
        expect(matcher.createPlasterComment('foo bar')).toBe('<!-- foo bar -->');
      });
    });
  });

  describe('inlineComment', () => {
    const matcher = docregionMatchers.inlineComment;

    describe('regionStartRe', () => {
      const re = matcher.regionStartRe;

      it('should match docregion start inline comments (and extract docregion names)', () => {
        expectToMatch(re, '// #docregion', '');
        expectToMatch(re, '// #docregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  //   #docregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docregion start inline comments', () => {
        expectNotToMatch(re, '/* #docregion foo */');
        expectNotToMatch(re, '# #docregion bar');
        expectNotToMatch(re, '## #docregion baz');
        expectNotToMatch(re, '<!-- #docregion qux -->');

        expectNotToMatch(re, 'foo // #docregion');
        expectNotToMatch(re, '// bar #docregion');

        expectNotToMatch(re, '// #doc-region');
        expectNotToMatch(re, '// #enddocregion');
        expectNotToMatch(re, '// #docplaster');
      });
    });

    describe('regionEndRe', () => {
      const re = matcher.regionEndRe;

      it('should match docregion end inline comments (and extract docregion names)', () => {
        expectToMatch(re, '// #enddocregion', '');
        expectToMatch(re, '// #enddocregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  //   #enddocregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docregion end inline comments', () => {
        expectNotToMatch(re, '/* #enddocregion foo */');
        expectNotToMatch(re, '# #enddocregion bar');
        expectNotToMatch(re, '## #enddocregion baz');
        expectNotToMatch(re, '<!-- #enddocregion qux -->');

        expectNotToMatch(re, 'foo // #enddocregion');
        expectNotToMatch(re, '// bar #enddocregion');

        expectNotToMatch(re, '// #enddoc-region');
        expectNotToMatch(re, '// #docregion');
        expectNotToMatch(re, '// #docplaster');
      });
    });

    describe('plasterRe', () => {
      const re = matcher.plasterRe;

      it('should match docplaster inline comments (and extract the plaster)', () => {
        expectToMatch(re, '// #docplaster', '');
        expectToMatch(re, '// #docplaster foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  //   #docplaster   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docplaster inline comments', () => {
        expectNotToMatch(re, '/* #docplaster foo */');
        expectNotToMatch(re, '# #docplaster bar');
        expectNotToMatch(re, '## #docplaster baz');
        expectNotToMatch(re, '<!-- #docplaster qux -->');

        expectNotToMatch(re, 'foo // #docplaster');
        expectNotToMatch(re, '// bar #docplaster');

        expectNotToMatch(re, '// #doc-plaster');
        expectNotToMatch(re, '// #docregion');
        expectNotToMatch(re, '// #enddocregion');
      });
    });

    describe('createPlasterComment()', () => {
      it('should create a docplaster inline comment', () => {
        expect(matcher.createPlasterComment('foo bar')).toBe('// foo bar');
      });
    });
  });

  describe('mixedComment', () => {
    const matcher = docregionMatchers.mixedComment;

    describe('regionStartRe', () => {
      const re = matcher.regionStartRe;

      it('should match docregion start inline comments (and extract docregion names)', () => {
        expectToMatch(re, '// #docregion', '');
        expectToMatch(re, '// #docregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  //   #docregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docregion start inline comments', () => {
        expectNotToMatch(re, '/* #docregion foo */');
        expectNotToMatch(re, '# #docregion bar');
        expectNotToMatch(re, '## #docregion baz');
        expectNotToMatch(re, '<!-- #docregion qux -->');

        expectNotToMatch(re, 'foo // #docregion');
        expectNotToMatch(re, '// bar #docregion');

        expectNotToMatch(re, '// #doc-region');
        expectNotToMatch(re, '// #enddocregion');
        expectNotToMatch(re, '// #docplaster');
      });
    });

    describe('regionEndRe', () => {
      const re = matcher.regionEndRe;

      it('should match docregion end inline comments (and extract docregion names)', () => {
        expectToMatch(re, '// #enddocregion', '');
        expectToMatch(re, '// #enddocregion foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  //   #enddocregion   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docregion end inline comments', () => {
        expectNotToMatch(re, '/* #enddocregion foo */');
        expectNotToMatch(re, '# #enddocregion bar');
        expectNotToMatch(re, '## #enddocregion baz');
        expectNotToMatch(re, '<!-- #enddocregion qux -->');

        expectNotToMatch(re, 'foo // #enddocregion');
        expectNotToMatch(re, '// bar #enddocregion');

        expectNotToMatch(re, '// #enddoc-region');
        expectNotToMatch(re, '// #docregion');
        expectNotToMatch(re, '// #docplaster');
      });
    });

    describe('plasterRe', () => {
      const re = matcher.plasterRe;

      it('should match docplaster inline comments (and extract the plaster)', () => {
        expectToMatch(re, '// #docplaster', '');
        expectToMatch(re, '// #docplaster foo_bar, baz-qux', 'foo_bar, baz-qux');
        expectToMatch(re, '  //   #docplaster   foo_bar,   baz-qux  ', 'foo_bar,   baz-qux  ');
      });

      it('should not match lines that are not docplaster inline comments', () => {
        expectNotToMatch(re, '/* #docplaster foo */');
        expectNotToMatch(re, '# #docplaster bar');
        expectNotToMatch(re, '## #docplaster baz');
        expectNotToMatch(re, '<!-- #docplaster qux -->');

        expectNotToMatch(re, 'foo // #docplaster');
        expectNotToMatch(re, '// bar #docplaster');

        expectNotToMatch(re, '// #doc-plaster');
        expectNotToMatch(re, '// #docregion');
        expectNotToMatch(re, '// #enddocregion');
      });
    });

    describe('createPlasterComment()', () => {
      it('should create a docplaster block comment', () => {
        expect(matcher.createPlasterComment('foo bar')).toBe('/* foo bar */');
      });
    });
  });
});

describe('getDocregionMatchers()', () => {
  it('should return `blockComment` matcher for CSS files', () => {
    expect(getDocregionMatcher('css')).toBe(docregionMatchers.blockComment);
    expect(getDocregionMatcher('CSS')).toBe(docregionMatchers.blockComment);
  });

  it('should return `htmlComment` matcher for HTML files', () => {
    expect(getDocregionMatcher('html')).toBe(docregionMatchers.htmlComment);
    expect(getDocregionMatcher('HTML')).toBe(docregionMatchers.htmlComment);
  });

  it('should return `hashComment` matcher for SH files', () => {
    expect(getDocregionMatcher('sh')).toBe(docregionMatchers.hashComment);
    expect(getDocregionMatcher('SH')).toBe(docregionMatchers.hashComment);
  });

  it('should return `hashComment` matcher for YAML files', () => {
    expect(getDocregionMatcher('yaml')).toBe(docregionMatchers.hashComment);
    expect(getDocregionMatcher('YAML')).toBe(docregionMatchers.hashComment);

    expect(getDocregionMatcher('yml')).toBe(docregionMatchers.hashComment);
    expect(getDocregionMatcher('YML')).toBe(docregionMatchers.hashComment);
  });

  it('should return `inlineComment` matcher for JADE files', () => {
    expect(getDocregionMatcher('jade')).toBe(docregionMatchers.inlineComment);
    expect(getDocregionMatcher('JADE')).toBe(docregionMatchers.inlineComment);
  });

  it('should return `inlineComment` matcher for PUG files', () => {
    expect(getDocregionMatcher('pug')).toBe(docregionMatchers.inlineComment);
    expect(getDocregionMatcher('PUG')).toBe(docregionMatchers.inlineComment);
  });

  it('should return `mixedComment` matcher for any other file-type', () => {
    expect(getDocregionMatcher('js')).toBe(docregionMatchers.mixedComment);
    expect(getDocregionMatcher('JS')).toBe(docregionMatchers.mixedComment);

    expect(getDocregionMatcher('ts')).toBe(docregionMatchers.mixedComment);
    expect(getDocregionMatcher('TS')).toBe(docregionMatchers.mixedComment);

    expect(getDocregionMatcher('foo')).toBe(docregionMatchers.mixedComment);
    expect(getDocregionMatcher('BAR')).toBe(docregionMatchers.mixedComment);
  });
});
