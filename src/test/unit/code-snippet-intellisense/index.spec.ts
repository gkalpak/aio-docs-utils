import * as fs from 'fs';
import {CancellationToken, Disposable, Hover, languages, Location, Position, TextDocument, Uri} from 'vscode';
import {CodeSnippetIntellisenseFeature, ICodeSnippetInfoWithFilePath} from '../../../code-snippet-intellisense';
import {
  codeSnippetUtils,
  ICodeSnippetAttrInfo,
  ICodeSnippetRawInfo,
} from '../../../code-snippet-intellisense/code-snippet-utils';
import {DocregionExtractor, IDocregionInfo} from '../../../code-snippet-intellisense/docregion-extractor';
import {BaseFeature} from '../../../shared/base-feature';
import {logger} from '../../../shared/logger';
import * as utils from '../../../shared/utils';
import {stripIndentation} from '../../helpers/string-utils';
import {reversePromise} from '../../helpers/test-utils';
import {MockLocation, MockRange, MockTextDocument} from '../../helpers/vscode.mock';


describe('CodeSnippetIntellisenseFeature', () => {
  let csie: TestCodeSnippetIntellisenseFeature;
  let logSpy: jasmine.Spy;

  beforeEach(() => {
    csie = new TestCodeSnippetIntellisenseFeature();
    logSpy = spyOn(logger, 'log');
  });

  it('should extend `BaseFeature`', () => {
    expect(csie).toEqual(jasmine.any(CodeSnippetIntellisenseFeature));
    expect(csie).toEqual(jasmine.any(BaseFeature));
  });

  describe('constructor()', () => {
    let definitionProviderRegistration: Disposable;
    let hoverProviderRegistration: Disposable;
    let registerDefinitionProviderSpy: jasmine.Spy;
    let registerHoverProviderSpy: jasmine.Spy;

    beforeEach(() => {
      definitionProviderRegistration = {dispose: jasmine.createSpy('definitionProviderRegistration#dispose')};
      registerDefinitionProviderSpy = spyOn(languages, 'registerDefinitionProvider').and.
        returnValue(definitionProviderRegistration);

      hoverProviderRegistration = {dispose: jasmine.createSpy('hoverProviderRegistration#dispose')};
      registerHoverProviderSpy = spyOn(languages, 'registerHoverProvider').and.
        returnValue(hoverProviderRegistration);

      csie = new TestCodeSnippetIntellisenseFeature();
    });

    it('should register itself as a `DefinitionProvider` (for relevant files)', () => {
      expect(registerDefinitionProviderSpy).toHaveBeenCalledTimes(1);
      expect(registerDefinitionProviderSpy).toHaveBeenCalledWith(jasmine.any(Object), csie);
      expect(registerDefinitionProviderSpy.calls.mostRecent().args[0]).toEqual({
        language: 'markdown',
        pattern: '**/aio/content/**',
        scheme: 'file',
      });
    });

    it('should register itself as a `HoverProvider` (for relevant files)', () => {
      expect(registerHoverProviderSpy).toHaveBeenCalledTimes(1);
      expect(registerHoverProviderSpy).toHaveBeenCalledWith(jasmine.any(Object), csie);
      expect(registerHoverProviderSpy.calls.mostRecent().args[0]).toEqual({
        language: 'markdown',
        pattern: '**/aio/content/**',
        scheme: 'file',
      });
    });

    it('should dispose of the `DefinitionProvider` registrations when being itself disposed of', () => {
      expect(definitionProviderRegistration.dispose).not.toHaveBeenCalled();

      csie.dispose();
      expect(definitionProviderRegistration.dispose).toHaveBeenCalledTimes(1);
    });

    it('should dispose of the `HoverProvider` registrations when being itself disposed of', () => {
      expect(hoverProviderRegistration.dispose).not.toHaveBeenCalled();

      csie.dispose();
      expect(hoverProviderRegistration.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('extractDocregions()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFilePath;
    let mockCancellationToken: CancellationToken;
    let deExtractSpy: jasmine.Spy;
    let deForSpy: jasmine.Spy;
    let readFileSpy: jasmine.Spy;

    // Helpers
    const extractDocregions = (csInfo = mockCodeSnippetInfo, token = mockCancellationToken) =>
      csie.extractDocregions(csInfo, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {
        attrs: {region: 'mock-region'} as ICodeSnippetAttrInfo,
        file: {path: '/examples/file/pat.h'},
        raw: {} as ICodeSnippetRawInfo,
      };
      mockCancellationToken = {isCancellationRequested: false} as CancellationToken;

      deExtractSpy = jasmine.createSpy('extract').and.returnValue(null);
      deForSpy = spyOn(DocregionExtractor, 'for').and.returnValue({extract: deExtractSpy});
      readFileSpy = spyOn(utils, 'readFile').and.returnValue(Promise.resolve('example code'));
    });

    it('should retrieve the example file\'s contents', async () => {
      await extractDocregions();
      expect(readFileSpy).toHaveBeenCalledWith('/examples/file/pat.h');
    });

    it('should get an appropriate `DocregionExtractor` for the example file', async () => {
      await extractDocregions();
      expect(deForSpy).toHaveBeenCalledWith('h', 'example code');
    });

    it('should extract the docregions from the example file', async () => {
      await extractDocregions();
      expect(deExtractSpy).toHaveBeenCalledWith('mock-region');
    });

    it('should extract the default docregion if none is specified', async () => {
      mockCodeSnippetInfo.attrs.region = null;
      await extractDocregions();

      expect(deExtractSpy).toHaveBeenCalledWith('');
    });

    it('should return a promise', async () => {
      const promise = extractDocregions();
      expect(promise).toEqual(jasmine.any(Promise));

      // Wait for all operations to be completed, before releasing spies, etc.
      await promise;
    });

    describe('returned promise', () => {
      it('should be resolved with the extracted docregion info', async () => {
        const mockDocregionInfo = {} as IDocregionInfo;
        deExtractSpy.and.returnValues(mockDocregionInfo, null);

        expect(await extractDocregions()).toBe(mockDocregionInfo);
        expect(await extractDocregions()).toBeNull();
      });

      it('should be rejected if retrieving the example file\'s contents fails', async () => {
        readFileSpy.and.callFake(() => Promise.reject('Test'));

        expect(await reversePromise(extractDocregions())).toBe('Test');
        expect(deForSpy).not.toHaveBeenCalled();
        expect(deExtractSpy).not.toHaveBeenCalled();
      });

      it('should be rejected if the operation is cancelled by the user', async () => {
        readFileSpy.and.callFake(() => {
          mockCancellationToken.isCancellationRequested = true;
          return Promise.resolve('example code');
        });

        expect(await reversePromise(extractDocregions())).toEqual(new Error('Cancelled.'));
        expect(deForSpy).not.toHaveBeenCalled();
        expect(deExtractSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('getCodeSnippetInfo()', () => {
    let existsSyncSpy: jasmine.Spy;
    let getInfoSpy: jasmine.Spy;

    beforeEach(() => {
      existsSyncSpy = spyOn(fs, 'existsSync').and.returnValue(true);
      getInfoSpy = spyOn(codeSnippetUtils, 'getInfo').and.returnValue({
        file: {path: '/file/pat.h'},
        raw: {contents: '<code-snippet></code-snippet>'},
      });
    });

    it('should delegate to `CodeSnippetUtils.getInfo()` (and return the result)', () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(0, 0);
      const result = csie.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(getInfoSpy).toHaveBeenCalledWith(doc, pos);
      expect(result).toBe(getInfoSpy.calls.mostRecent().returnValue);
    });

    it('should log its progress', () => {
      const doc: TextDocument = new MockTextDocument('some text', '/foo/guide.md') as any;
      const pos = new Position(4, 2);
      csie.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/foo/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
        ['  Located example file: /file/pat.h'],
      ]);
    });

    it('should return `null` if `CodeSnippetUtils.getInfo()` returns `null`', () => {
      getInfoSpy.and.returnValue(null);

      const doc: TextDocument = new MockTextDocument('some text', '/foo/guide.md') as any;
      const pos = new Position(4, 2);
      const result = csie.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/foo/guide.md:4:2\'...'],
      ]);
    });

    it('should return `null` if the example file path could not be determined', () => {
      getInfoSpy.and.returnValue({
        file: {path: null},
        raw: {contents: '<code-snippet></code-snippet>'},
      });

      const doc: TextDocument = new MockTextDocument('some text', '/foo/guide.md') as any;
      const pos = new Position(4, 2);
      const result = csie.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/foo/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
      ]);
    });

    it('should return `null` if the example file path does not exist', () => {
      existsSyncSpy.and.returnValue(false);

      const doc: TextDocument = new MockTextDocument('some text', '/foo/guide.md') as any;
      const pos = new Position(4, 2);
      const result = csie.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(existsSyncSpy).toHaveBeenCalledWith('/file/pat.h');
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/foo/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
      ]);
    });
  });

  describe('provideDefinition()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFilePath;
    let getCodeSnippetInfoSpy: jasmine.Spy;
    let extractDocregionsSpy: jasmine.Spy;

    // Helpers
    const provideDefinition =
      (doc: TextDocument = null as any, pos: Position = null as any, token: CancellationToken = null as any) =>
        csie.provideDefinition(doc, pos, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFilePath;

      getCodeSnippetInfoSpy = spyOn(csie, 'getCodeSnippetInfo').and.returnValue(mockCodeSnippetInfo);
      extractDocregionsSpy = spyOn(csie, 'extractDocregions').and.returnValue(Promise.resolve(null));
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideDefinition(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing definition');
    });

    it('should resolve to `null` if no code snippet info', async () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(await provideDefinition()).toBeNull();
    });

    it('should extract docregions for code snippet', async () => {
      const mockToken = {} as CancellationToken;
      await provideDefinition(undefined, undefined, mockToken);

      expect(extractDocregionsSpy).toHaveBeenCalledWith(mockCodeSnippetInfo, mockToken);
    });

    it('should resolve to `null` if no docregion info extracted', async () => {
      extractDocregionsSpy.and.returnValue(Promise.resolve(null));
      expect(await provideDefinition()).toBe(null);
    });

    it('should resolve to a list of `Location`s, based on the docregion info ranges', async () => {
      const mockPath = '/examples/file/pat.h';
      const mockRanges = [
        new MockRange(0, 1, 2, 3),
        new MockRange(1, 3, 3, 7),
        new MockRange(2, 4, 4, 2),
      ];
      const mockUri = {} as Uri;

      mockCodeSnippetInfo.file = {path: mockPath};
      extractDocregionsSpy.and.returnValue(Promise.resolve({ranges: mockRanges}));
      const uriFileSpy = spyOn(Uri, 'file').and.returnValue(mockUri);

      const result = await provideDefinition();

      expect(uriFileSpy).toHaveBeenCalledTimes(1);
      expect(uriFileSpy).toHaveBeenCalledWith('/examples/file/pat.h');
      expect(result).toEqual([
        new MockLocation(mockUri, mockRanges[0]),
        new MockLocation(mockUri, mockRanges[1]),
        new MockLocation(mockUri, mockRanges[2]),
      ] as Location[]);
    });
  });

  describe('provideHover()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFilePath;
    let getCodeSnippetInfoSpy: jasmine.Spy;
    let extractDocregionsSpy: jasmine.Spy;

    // Helpers
    const provideHover =
      (doc: TextDocument = null as any, pos: Position = null as any, token: CancellationToken = null as any) =>
        csie.provideHover(doc, pos, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFilePath;

      getCodeSnippetInfoSpy = spyOn(csie, 'getCodeSnippetInfo').and.returnValue(mockCodeSnippetInfo);
      extractDocregionsSpy = spyOn(csie, 'extractDocregions').and.returnValue(Promise.resolve(null));
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideHover(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing hover');
    });

    it('should resolve to `null` if no code snippet info', async () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(await provideHover()).toBeNull();
    });

    it('should extract docregions for code snippet', async () => {
      const mockToken = {} as CancellationToken;
      await provideHover(undefined, undefined, mockToken);

      expect(extractDocregionsSpy).toHaveBeenCalledWith(mockCodeSnippetInfo, mockToken);
    });

    it('should resolve to `null` if no docregion info extracted', async () => {
      extractDocregionsSpy.and.returnValue(Promise.resolve(null));
      expect(await provideHover()).toBe(null);
    });

    describe('(with extracted docregion info)', () => {
      let mockDocregionInfo: IDocregionInfo;

      beforeEach(() => {
        Object.assign(mockCodeSnippetInfo, {
          attrs: {
            linenums: false,
            title: null,
          },
          raw: {
            endPos: new Position(3, 7),
            startPos: new Position(1, 3),
          },
        });
        mockDocregionInfo = {
          contents: ['foo', '  bar', 'baz'],
          fileType: 'qux',
        } as IDocregionInfo;

        extractDocregionsSpy.and.returnValue(Promise.resolve(mockDocregionInfo));
      });

      it('should resolve to a `Hover` with the appropriate contents and range', async () => {
        const result = (await provideHover())!;
        const r = result.range!;

        expect(result).toEqual(jasmine.any(Hover));
        expect(result.contents).toBe(stripIndentation(`
          \`\`\`qux
          foo
            bar
          baz
          \`\`\`
        `));
        expect([r.start.line, r.start.character, r.end.line, r.end.character]).toEqual([1, 3, 3, 7]);
      });

      it('should include the title in the contents', async () => {
        mockCodeSnippetInfo.attrs.title = 'Mock Title';
        const result = (await provideHover())!;

        expect(result.contents).toBe(stripIndentation(`
          _Mock Title_

          ---
          \`\`\`qux
          foo
            bar
          baz
          \`\`\`
        `));
      });

      it('should include line numbers if `attrs.linenums === true`', async () => {
        mockCodeSnippetInfo.attrs.linenums = true;
        const result = (await provideHover())!;

        expect(result.contents).toBe(stripIndentation(`
          \`\`\`qux
          1. foo
          2.   bar
          3. baz
          \`\`\`
        `));
      });

      it('should include line numbers starting at `n` if `attrs.linenums === n`', async () => {
        mockCodeSnippetInfo.attrs.linenums = 42;
        const result = (await provideHover())!;

        expect(result.contents).toBe(stripIndentation(`
          \`\`\`qux
          42. foo
          43.   bar
          44. baz
          \`\`\`
        `));
      });

      it('should include line numbers if `attrs.linenums === \'auto\'` and lines exceed `AUTO_LINENUM_THRESHOLD`',
        async () => {
          mockCodeSnippetInfo.attrs.linenums = 'auto';
          mockDocregionInfo.contents = [
            'line 1',
            'line 2',
            'line 3',
            'line 4',
            'line 5',
            'line 6',
            'line 7',
            'line 8',
            'line 9',
            'line 10',
            'line 11',
          ];

          expect(mockDocregionInfo.contents.length).
            toBeGreaterThan(CodeSnippetIntellisenseFeature.AUTO_LINENUM_THRESHOLD);
          expect((await provideHover())!.contents).toBe(stripIndentation(`
            \`\`\`qux
             1. line 1
             2. line 2
             3. line 3
             4. line 4
             5. line 5
             6. line 6
             7. line 7
             8. line 8
             9. line 9
            10. line 10
            11. line 11
            \`\`\`
          `));
        },
      );

      // tslint:disable-next-line: max-line-length
      it('should not include line numbers if `attrs.linenums === \'auto\'` and lines do not exceed `AUTO_LINENUM_THRESHOLD`',
        async () => {
          mockCodeSnippetInfo.attrs.linenums = 'auto';
          mockDocregionInfo.contents = [
            'line 1',
            'line 2',
            'line 3',
            'line 4',
            'line 5',
            'line 6',
            'line 7',
            'line 8',
            'line 9',
            'line 10',
          ];

          expect(mockDocregionInfo.contents.length).
            toBeLessThanOrEqual(CodeSnippetIntellisenseFeature.AUTO_LINENUM_THRESHOLD);
          expect((await provideHover())!.contents).toBe(stripIndentation(`
            \`\`\`qux
            line 1
            line 2
            line 3
            line 4
            line 5
            line 6
            line 7
            line 8
            line 9
            line 10
            \`\`\`
          `));
        },
      );

      // tslint:disable-next-line: max-line-length
      it('should not include line numbers if `attrs.linenums === false` (even if lines exceed `AUTO_LINENUM_THRESHOLD`)',
        async () => {
          mockCodeSnippetInfo.attrs.linenums = false;
          mockDocregionInfo.contents = [
            'line 1',
            'line 2',
            'line 3',
            'line 4',
            'line 5',
            'line 6',
            'line 7',
            'line 8',
            'line 9',
            'line 10',
            'line 11',
          ];

          expect(mockDocregionInfo.contents.length).
            toBeGreaterThan(CodeSnippetIntellisenseFeature.AUTO_LINENUM_THRESHOLD);
          expect((await provideHover())!.contents).toBe(stripIndentation(`
            \`\`\`qux
            line 1
            line 2
            line 3
            line 4
            line 5
            line 6
            line 7
            line 8
            line 9
            line 10
            line 11
            \`\`\`
          `));
        },
      );
    });
  });

  // Helpers
  class TestCodeSnippetIntellisenseFeature extends CodeSnippetIntellisenseFeature {
    public extractDocregions(
        csInfo: ICodeSnippetInfoWithFilePath,
        token: CancellationToken,
    ): Promise<IDocregionInfo | null> {
      return super.extractDocregions(csInfo, token);
    }

    public getCodeSnippetInfo(doc: TextDocument, pos: Position, action: string): ICodeSnippetInfoWithFilePath | null {
      return super.getCodeSnippetInfo(doc, pos, action);
    }
  }
});
