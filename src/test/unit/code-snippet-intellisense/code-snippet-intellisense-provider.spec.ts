import * as fs from 'fs';
import {CancellationToken, Hover, Location, Position, TextDocument, Uri} from 'vscode';
import {
  CodeSnippetIntellisenseProvider, ICodeSnippetInfoWithFilePath,
} from '../../../code-snippet-intellisense/code-snippet-intellisense-provider';
import {
  codeSnippetUtils, ICodeSnippetAttrInfo, ICodeSnippetRawInfo,
} from '../../../code-snippet-intellisense/code-snippet-utils';
import {DocregionExtractor, IDocregionInfo} from '../../../code-snippet-intellisense/docregion-extractor';
import {logger} from '../../../shared/logger';
import * as utils from '../../../shared/utils';
import {stripIndentation} from '../../helpers/string-utils';
import {reversePromise} from '../../helpers/test-utils';
import {MockLocation, MockRange, MockTextDocument} from '../../helpers/vscode.mock';


describe('CodeSnippetIntellisenseProvider', () => {
  let csip: TestCodeSnippetIntellisenseProvider;
  let logSpy: jasmine.Spy;

  beforeEach(() => {
    csip = new TestCodeSnippetIntellisenseProvider();
    logSpy = spyOn(logger, 'log');
  });

  describe('extractPathPrefixRe', () => {
    it('should make its `extractPathPrefixRe` publicly accessible', () => {
      const re = /./;
      csip = new TestCodeSnippetIntellisenseProvider(re);

      expect(csip.extractPathPrefixRe).toBe(re);
    });
  });

  describe('extractDocregionInfo()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFilePath;
    let mockCancellationToken: CancellationToken;
    let deExtractSpy: jasmine.Spy;
    let deForSpy: jasmine.Spy;
    let readFileSpy: jasmine.Spy;

    // Helpers
    const extractDocregionInfo = (csInfo = mockCodeSnippetInfo, token = mockCancellationToken) =>
      csip.extractDocregionInfo(csInfo, token);

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
      await extractDocregionInfo();
      expect(readFileSpy).toHaveBeenCalledWith('/examples/file/pat.h');
    });

    it('should get an appropriate `DocregionExtractor` for the example file', async () => {
      await extractDocregionInfo();
      expect(deForSpy).toHaveBeenCalledWith('h', 'example code');
    });

    it('should extract the docregions from the example file', async () => {
      await extractDocregionInfo();
      expect(deExtractSpy).toHaveBeenCalledWith('mock-region');
    });

    it('should extract the default docregion if none is specified', async () => {
      mockCodeSnippetInfo.attrs.region = null;
      await extractDocregionInfo();

      expect(deExtractSpy).toHaveBeenCalledWith('');
    });

    it('should return a promise', async () => {
      const promise = extractDocregionInfo();
      expect(promise).toEqual(jasmine.any(Promise));

      // Wait for all operations to be completed, before releasing spies, etc.
      await promise;
    });

    describe('returned promise', () => {
      it('should be resolved with the extracted docregion info', async () => {
        const mockDocregionInfo = {} as IDocregionInfo;
        deExtractSpy.and.returnValues(mockDocregionInfo, null);

        expect(await extractDocregionInfo()).toBe(mockDocregionInfo);
        expect(await extractDocregionInfo()).toBeNull();
      });

      it('should be rejected if retrieving the example file\'s contents fails', async () => {
        readFileSpy.and.callFake(() => Promise.reject('Test'));

        expect(await reversePromise(extractDocregionInfo())).toBe('Test');
        expect(deForSpy).not.toHaveBeenCalled();
        expect(deExtractSpy).not.toHaveBeenCalled();
      });

      it('should be rejected if the operation is cancelled by the user', async () => {
        readFileSpy.and.callFake(() => {
          mockCancellationToken.isCancellationRequested = true;
          return Promise.resolve('example code');
        });

        expect(await reversePromise(extractDocregionInfo())).toEqual(new Error('Cancelled.'));
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
        attrs: {path: 'file/pat.h'},
        raw: {contents: '<code-snippet></code-snippet>'},
      });
    });

    it('should delegate to `CodeSnippetUtils.getInfo()`', () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(0, 0);
      const result = csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');
      const getInfoResult = getInfoSpy.calls.mostRecent().returnValue;

      expect(getInfoSpy).toHaveBeenCalledWith(doc, pos);
      expect(result).toEqual(jasmine.objectContaining(getInfoResult));
    });

    it('should detect the example file path (based on its `extractPathPrefixRe`', () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(0, 0);
      const result = csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');
      const expectedPath = '/angular/aio/content/examples/file/pat.h';

      expect(existsSyncSpy).toHaveBeenCalledWith(expectedPath);
      expect(result!.file).toEqual({path: expectedPath});
    });

    it('should log its progress', () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(4, 2);
      csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/angular/aio/content/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
        ['  Located example file: /angular/aio/content/examples/file/pat.h'],
      ]);
    });

    it('should return `null` if `CodeSnippetUtils.getInfo()` returns `null`', () => {
      getInfoSpy.and.returnValue(null);

      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(4, 2);
      const result = csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/angular/aio/content/guide.md:4:2\'...'],
      ]);
    });

    it('should return `null` if the example file path is not inside `aio/content/`', () => {
      const doc: TextDocument = new MockTextDocument('some text', '/foo/not-aio/content/bar') as any;
      const pos = new Position(4, 2);
      const result = csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/foo/not-aio/content/bar:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
      ]);
    });

    it('should return `null` if the example file path does not exist', () => {
      existsSyncSpy.and.returnValue(false);

      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(4, 2);
      const result = csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(existsSyncSpy).toHaveBeenCalledWith('/angular/aio/content/examples/file/pat.h');
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/angular/aio/content/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
      ]);
    });
  });

  describe('provideDefinition()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFilePath;
    let getCodeSnippetInfoSpy: jasmine.Spy;
    let extractDocregionInfoSpy: jasmine.Spy;

    // Helpers
    const provideDefinition =
      (doc: TextDocument = null as any, pos: Position = null as any, token: CancellationToken = null as any) =>
        csip.provideDefinition(doc, pos, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFilePath;

      getCodeSnippetInfoSpy = spyOn(csip, 'getCodeSnippetInfo').and.returnValue(mockCodeSnippetInfo);
      extractDocregionInfoSpy = spyOn(csip, 'extractDocregionInfo').and.returnValue(Promise.resolve(null));
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideDefinition(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing definition');
    });

    it('should return `null` if no code snippet info', () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(provideDefinition()).toBeNull();
    });

    it('should extract docregions for code snippet', async () => {
      const mockToken = {} as CancellationToken;
      await provideDefinition(undefined, undefined, mockToken);

      expect(extractDocregionInfoSpy).toHaveBeenCalledWith(mockCodeSnippetInfo, mockToken);
    });

    it('should resolve to `null` if no docregion info extracted', async () => {
      extractDocregionInfoSpy.and.returnValue(Promise.resolve(null));
      expect(await provideDefinition()).toBeNull();
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
      extractDocregionInfoSpy.and.returnValue(Promise.resolve({ranges: mockRanges}));
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
    let extractDocregionInfoSpy: jasmine.Spy;

    // Helpers
    const provideHover =
      (doc: TextDocument = null as any, pos: Position = null as any, token: CancellationToken = null as any) =>
        csip.provideHover(doc, pos, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFilePath;

      getCodeSnippetInfoSpy = spyOn(csip, 'getCodeSnippetInfo').and.returnValue(mockCodeSnippetInfo);
      extractDocregionInfoSpy = spyOn(csip, 'extractDocregionInfo').and.returnValue(Promise.resolve(null));
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideHover(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing hover');
    });

    it('should return `null` if no code snippet info', () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(provideHover()).toBeNull();
    });

    it('should extract docregions for code snippet', async () => {
      const mockToken = {} as CancellationToken;
      await provideHover(undefined, undefined, mockToken);

      expect(extractDocregionInfoSpy).toHaveBeenCalledWith(mockCodeSnippetInfo, mockToken);
    });

    it('should resolve to `null` if no docregion info extracted', async () => {
      extractDocregionInfoSpy.and.returnValue(Promise.resolve(null));
      expect(await provideHover()).toBeNull();
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

        extractDocregionInfoSpy.and.returnValue(Promise.resolve(mockDocregionInfo));
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
            toBeGreaterThan(CodeSnippetIntellisenseProvider.AUTO_LINENUM_THRESHOLD);
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
            toBeLessThanOrEqual(CodeSnippetIntellisenseProvider.AUTO_LINENUM_THRESHOLD);
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
            toBeGreaterThan(CodeSnippetIntellisenseProvider.AUTO_LINENUM_THRESHOLD);
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
  class TestCodeSnippetIntellisenseProvider extends CodeSnippetIntellisenseProvider {
    constructor(extractPathPrefixRe = /([\\/])angular\1aio\1content\1/) {
      super(extractPathPrefixRe);
    }

    public extractDocregionInfo(
        csInfo: ICodeSnippetInfoWithFilePath,
        token: CancellationToken,
    ): Promise<IDocregionInfo | null> {
      return super.extractDocregionInfo(csInfo, token);
    }

    public getCodeSnippetInfo(doc: TextDocument, pos: Position, action: string): ICodeSnippetInfoWithFilePath | null {
      return super.getCodeSnippetInfo(doc, pos, action);
    }
  }
});
