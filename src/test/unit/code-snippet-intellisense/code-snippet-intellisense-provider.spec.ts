import {
  CancellationToken, CompletionContext, CompletionItem, Hover, Location, MarkdownString, Position, TextDocument, Uri,
} from 'vscode';
import {
  CodeSnippetIntellisenseProvider, ICodeSnippetInfoWithFileUri,
} from '../../../code-snippet-intellisense/code-snippet-intellisense-provider';
import {
  codeSnippetUtils, ICodeSnippetAttrInfo, ICodeSnippetRawInfo, ICodeSnippetInfo,
} from '../../../code-snippet-intellisense/code-snippet-utils';
import {DocregionExtractor, IDocregionInfo} from '../../../code-snippet-intellisense/docregion-extractor';
import {fileSystem as fs} from '../../../shared/file-system';
import {logger} from '../../../shared/logger';
import {isNgProjectWatcher} from '../../../shared/workspace-folder-watcher';
import {stripIndentation} from '../../helpers/string-utils';
import {reversePromise} from '../../helpers/test-utils';
import {MockLocation, MockRange, MockTextDocument, MockTextLine} from '../../helpers/vscode.mock';


describe('CodeSnippetIntellisenseProvider', () => {
  let csip: TestCodeSnippetIntellisenseProvider;
  let logSpy: jasmine.Spy;
  let matchesGetSpy: jasmine.Spy;

  beforeEach(() => {
    csip = new TestCodeSnippetIntellisenseProvider();
    logSpy = spyOn(logger, 'log');
    matchesGetSpy = spyOnProperty(isNgProjectWatcher, 'matches').and.returnValue(true);
  });

  describe('extractPathPrefixRe', () => {
    it('should make its `extractPathPrefixRe` publicly accessible', () => {
      const re = /./;
      csip = new TestCodeSnippetIntellisenseProvider(re);

      expect(csip.extractPathPrefixRe).toBe(re);
    });
  });

  describe('extractDocregionInfo()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFileUri;
    let mockCancellationToken: CancellationToken;
    let deExtractSpy: jasmine.Spy;
    let getDocregionExtractorSpy: jasmine.Spy;

    // Helpers
    const extractDocregionInfo = (csInfo = mockCodeSnippetInfo, token = mockCancellationToken) =>
      csip.extractDocregionInfo(csInfo, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {
        attrs: {region: 'mock-region'} as ICodeSnippetAttrInfo,
        file: {uri: Uri.file('/examples/file/pat.h')},
        raw: {} as ICodeSnippetRawInfo,
      };
      mockCancellationToken = {isCancellationRequested: false} as CancellationToken;

      deExtractSpy = jasmine.createSpy('extract').and.returnValue(null);
      getDocregionExtractorSpy = spyOn(csip, 'getDocregionExtractor').and.
        returnValue(Promise.resolve({extract: deExtractSpy} as unknown as DocregionExtractor));
    });

    it('should get an appropriate `DocregionExtractor` for the example file', async () => {
      await extractDocregionInfo();
      expect(getDocregionExtractorSpy).toHaveBeenCalledWith(mockCodeSnippetInfo.file.uri, mockCancellationToken);
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

      it('should be rejected if retrieving the `DocregionExtractor` fails or is cancelled', async () => {
        getDocregionExtractorSpy.and.callFake(() => Promise.reject('Test'));

        expect(await reversePromise(extractDocregionInfo())).toBe('Test');
        expect(deExtractSpy).not.toHaveBeenCalled();
      });

      it('should be rejected if extracting the docregion info fails', async () => {
        deExtractSpy.and.throwError('Test');
        expect(await reversePromise(extractDocregionInfo())).toEqual(new Error('Test'));
      });
    });
  });

  describe('extractDocregionNames()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFileUri;
    let mockCancellationToken: CancellationToken;
    let deGetAvailableNamesSpy: jasmine.Spy;
    let getDocregionExtractorSpy: jasmine.Spy;

    // Helpers
    const extractDocregionNames = (csInfo = mockCodeSnippetInfo, token = mockCancellationToken) =>
      csip.extractDocregionNames(csInfo, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {
        attrs: {region: 'mock-region'} as ICodeSnippetAttrInfo,
        file: {uri: Uri.file('/examples/file/pat.h')},
        raw: {} as ICodeSnippetRawInfo,
      };
      mockCancellationToken = {isCancellationRequested: false} as CancellationToken;

      deGetAvailableNamesSpy = jasmine.createSpy('getAvailableNames').and.returnValue([]);
      getDocregionExtractorSpy = spyOn(csip, 'getDocregionExtractor').and.
        returnValue(Promise.resolve({getAvailableNames: deGetAvailableNamesSpy} as unknown as DocregionExtractor));
    });

    it('should get an appropriate `DocregionExtractor` for the example file', async () => {
      await extractDocregionNames();
      expect(getDocregionExtractorSpy).toHaveBeenCalledWith(mockCodeSnippetInfo.file.uri, mockCancellationToken);
    });

    it('should extract the docregion names from the example file', async () => {
      await extractDocregionNames();
      expect(deGetAvailableNamesSpy).toHaveBeenCalledWith();
    });

    it('should return a promise', async () => {
      const promise = extractDocregionNames();
      expect(promise).toEqual(jasmine.any(Promise));

      // Wait for all operations to be completed, before releasing spies, etc.
      await promise;
    });

    describe('returned promise', () => {
      it('should be resolved with the extracted docregion names', async () => {
        const mockDocregionNames = ['foo', 'bar'];
        deGetAvailableNamesSpy.and.returnValues(mockDocregionNames, null);

        expect(await extractDocregionNames()).toBe(mockDocregionNames);
        expect(await extractDocregionNames()).toBeNull();
      });

      it('should be rejected if retrieving the `DocregionExtractor` fails or is cancelled', async () => {
        getDocregionExtractorSpy.and.callFake(() => Promise.reject('Test'));

        expect(await reversePromise(extractDocregionNames())).toBe('Test');
        expect(deGetAvailableNamesSpy).not.toHaveBeenCalled();
      });

      it('should be rejected if extracting the docregion names fails', async () => {
        deGetAvailableNamesSpy.and.throwError('Test');
        expect(await reversePromise(extractDocregionNames())).toEqual(new Error('Test'));
      });
    });
  });

  describe('getCodeSnippetInfo()', () => {
    let existsSpy: jasmine.Spy;
    let getInfoSpy: jasmine.Spy;

    beforeEach(() => {
      existsSpy = spyOn(fs, 'exists').and.returnValue(Promise.resolve(true));
      getInfoSpy = spyOn(codeSnippetUtils, 'getInfo').and.returnValue({
        attrs: {path: 'file/pat.h'},
        raw: {contents: '<code-snippet></code-snippet>'},
      } as unknown as ICodeSnippetInfo);
    });

    it('should delegate to `CodeSnippetUtils.getInfo()`', async () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(0, 0);
      const result = await csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');
      const getInfoResult = getInfoSpy.calls.mostRecent().returnValue;

      expect(getInfoSpy).toHaveBeenCalledWith(doc, pos);
      expect(result).toEqual(jasmine.objectContaining(getInfoResult));
    });

    it('should detect the example file path (based on its `extractPathPrefixRe`)', async () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(0, 0);
      const expectedUri = Uri.file('/angular/aio/content/examples/file/pat.h');

      const result = await csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(existsSpy).toHaveBeenCalledWith(expectedUri);
      expect(result!.file).toEqual({uri: expectedUri});
    });

    it('should log its progress', async () => {
      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(4, 2);
      await csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/angular/aio/content/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
        ['  Located example file: /angular/aio/content/examples/file/pat.h'],
      ]);
    });

    it('should return `null` if `CodeSnippetUtils.getInfo()` returns `null`', async () => {
      getInfoSpy.and.returnValue(null);

      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(4, 2);
      const result = await csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/angular/aio/content/guide.md:4:2\'...'],
      ]);
    });

    it('should return `null` if the example file path is not inside `aio/content/`', async () => {
      const doc: TextDocument = new MockTextDocument('some text', '/foo/not-aio/content/bar') as any;
      const pos = new Position(4, 2);
      const result = await csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/foo/not-aio/content/bar:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
      ]);
    });

    it('should return `null` if the example file path does not exist', async () => {
      existsSpy.and.returnValue(Promise.resolve(false));

      const doc: TextDocument = new MockTextDocument('some text') as any;
      const pos = new Position(4, 2);
      const result = await csip.getCodeSnippetInfo(doc, pos, 'Doing stuff');

      expect(result).toBeNull();
      expect(existsSpy).toHaveBeenCalledWith(Uri.file('/angular/aio/content/examples/file/pat.h'));
      expect(logSpy.calls.allArgs()).toEqual([
        ['Doing stuff for \'/angular/aio/content/guide.md:4:2\'...'],
        ['  Detected code snippet: <code-snippet></code-snippet>'],
      ]);
    });
  });

  describe('getDocregionExtractor()', () => {
    let mockFileUri: Uri;
    let mockCancellationToken: CancellationToken;
    let deForSpy: jasmine.Spy;
    let readFileSpy: jasmine.Spy;

    // Helpers
    const getDocregionExtractor = (fileUri = mockFileUri, token = mockCancellationToken) =>
      csip.getDocregionExtractor(fileUri, token);

    beforeEach(() => {
      mockFileUri = Uri.file('/examples/file/pat.h');
      mockCancellationToken = {isCancellationRequested: false} as CancellationToken;

      deForSpy = spyOn(DocregionExtractor, 'for');
      readFileSpy = spyOn(fs, 'readFile').and.returnValue(Promise.resolve('example code'));
    });

    it('should retrieve the example file\'s contents', async () => {
      await getDocregionExtractor();
      expect(readFileSpy).toHaveBeenCalledWith(Uri.file('/examples/file/pat.h'));
    });

    it('should get an appropriate `DocregionExtractor` for the example file', async () => {
      await getDocregionExtractor();
      expect(deForSpy).toHaveBeenCalledWith('h', 'example code');
    });

    it('should return a promise', async () => {
      const promise = getDocregionExtractor();
      expect(promise).toEqual(jasmine.any(Promise));

      // Wait for all operations to be completed, before releasing spies, etc.
      await promise;
    });

    describe('returned promise', () => {
      it('should be resolved with the retrieved `DocregionExtractor`', async () => {
        const mockDocregionExtractor = {} as DocregionExtractor;
        deForSpy.and.returnValues(mockDocregionExtractor, null);

        expect(await getDocregionExtractor()).toBe(mockDocregionExtractor);
        expect(await getDocregionExtractor()).toBeNull();
      });

      it('should be rejected if retrieving the example file\'s contents fails', async () => {
        readFileSpy.and.callFake(() => Promise.reject('Test'));

        expect(await reversePromise(getDocregionExtractor())).toBe('Test');
        expect(deForSpy).not.toHaveBeenCalled();
      });

      it('should be rejected if the operation is cancelled by the user', async () => {
        readFileSpy.and.callFake(() => {
          mockCancellationToken.isCancellationRequested = true;
          return Promise.resolve('example code');
        });

        expect(await reversePromise(getDocregionExtractor())).toEqual(new Error('Cancelled.'));
        expect(deForSpy).not.toHaveBeenCalled();
      });

      it('should be rejected if retrieving the `DocregionExtractor` fails', async () => {
        deForSpy.and.throwError('Test');
        expect(await reversePromise(getDocregionExtractor())).toEqual(new Error('Test'));
      });
    });
  });

  describe('isInRegionAttribute()', () => {
    let docLineAtSpy: jasmine.Spy;

    // Helpers
    const isInRegionAttribute = (lineText: string, pos: Position) => {
      docLineAtSpy.and.returnValue(new MockTextLine(lineText));
      const mockDoc: TextDocument = {lineAt: docLineAtSpy} as any;

      return csip.isInRegionAttribute(mockDoc, pos);
    };

    beforeEach(() => docLineAtSpy = jasmine.createSpy('lineAt'));

    it('should retrieve the line at the specified position', () => {
      isInRegionAttribute('foo\nbar\nbaz', new Position(0, 0));
      isInRegionAttribute('foo\nbar\nbaz', new Position(0, 2));
      isInRegionAttribute('foo\nbar\nbaz', new Position(1, 0));
      isInRegionAttribute('foo\nbar\nbaz', new Position(1, 2));
      isInRegionAttribute('foo\nbar\nbaz', new Position(2, 0));
      isInRegionAttribute('foo\nbar\nbaz', new Position(2, 2));

      expect(docLineAtSpy).toHaveBeenCalledTimes(6);
      expect(docLineAtSpy.calls.allArgs()).toEqual([[0], [0], [1], [1], [2], [2]]);
    });

    it('should return true if currently editing `region` attribute\'s value', () => {
      const editingPositionsPerLine: {[lineText: string]: number[]} = {
        'before <foo bar="bar" region="" baz="baz"> after': [29, 30],
        'before <foo bar="bar" region="qux" baz="baz"> after': [29, 30, 31, 32],
        'before region="" after': [14, 15],
        'before region="qux" after': [14, 15, 16, 17],
        ' region=""': [8, 9],
        'region=""': [7, 8],
        ' region="qux"': [8, 9, 10, 11],
        'region="qux"': [7, 8, 9, 10],
        // 23456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
        //         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      };

      Object.keys(editingPositionsPerLine).forEach(lineText => {
        const positions = editingPositionsPerLine[lineText].map(charIdx => new Position(42, charIdx));
        positions.forEach(pos => {
          const desc = `${lineText}:0:${pos.character}`;
          expect(isInRegionAttribute(lineText, pos)).toBe(true, desc);
        });
      });
    });

    it('should return false if not currently editing `region` attribute\'s value', () => {
      const editingPositionsPerLine: {[lineText: string]: number[]} = {
        'before <foo bar="bar" region="" baz="baz"> after': [0, 5, 18, 25, 28, 31, 33, 38, 45],
        'before <foo noregion="" no-region=""> after': [21, 22, 34, 35],
        'before region="" after': [0, 5, 10, 13, 16, 19],
        ' region=""': [0, 5, 10],
        'region=""': [0, 4, 9],
        ' region="qux"': [0, 5, 13],
        'region="qux"': [0, 4, 12],
        // 23456789111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
        //         012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
      };

      Object.keys(editingPositionsPerLine).forEach(lineText => {
        const positions = editingPositionsPerLine[lineText].map(charIdx => new Position(42, charIdx));
        positions.forEach(pos => {
          const desc = `${lineText}:0:${pos.character}`;
          expect(isInRegionAttribute(lineText, pos)).toBe(false, desc);
        });
      });
    });

    it('should not get confused by different quotemarks', () => {
      [8, 9, 10, 11, 12, 13].forEach(charIdx => {
        const pos = new Position(42, charIdx);
        expect(isInRegionAttribute(` region="q'u'x"`, pos)).toBe(true);  // eslint-disable-line quotes
        expect(isInRegionAttribute(` region='q"u"x'`, pos)).toBe(true);  // eslint-disable-line quotes
        //                          012345678911111
        //                                    01234
      });
    });
  });

  describe('provideCompletionItems()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFileUri;
    let getCodeSnippetInfoSpy: jasmine.Spy;
    let isInRegionAttributeSpy: jasmine.Spy;
    let extractDocregionNamesSpy: jasmine.Spy;

    // Helpers
    const provideCompletionItems = (
        doc: TextDocument = null as any,
        pos: Position = null as any,
        token: CancellationToken = null as any,
        ctx: CompletionContext = null as any,
    ) => csip.provideCompletionItems(doc, pos, token, ctx);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFileUri;

      getCodeSnippetInfoSpy = spyOn(csip, 'getCodeSnippetInfo').and.returnValue(Promise.resolve(mockCodeSnippetInfo));
      isInRegionAttributeSpy = spyOn(csip, 'isInRegionAttribute').and.returnValue(true);
      extractDocregionNamesSpy = spyOn(csip, 'extractDocregionNames').and.returnValue(Promise.resolve([]));
    });

    it('should return `null` if `isNgProjectWatcher.matches` is false', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;
      matchesGetSpy.and.returnValue(false);

      expect(await provideCompletionItems(mockDoc, mockPos)).toBeNull();
      expect(isInRegionAttributeSpy).not.toHaveBeenCalled();
    });

    it('should return `null` if not inside a docregion attribute', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;
      isInRegionAttributeSpy.and.returnValue(false);

      expect(await provideCompletionItems(mockDoc, mockPos)).toBeNull();
      expect(isInRegionAttributeSpy).toHaveBeenCalledWith(mockDoc, mockPos);
      expect(getCodeSnippetInfoSpy).not.toHaveBeenCalled();
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideCompletionItems(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing completion items');
    });

    it('should return `null` if no code snippet info', async () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(await provideCompletionItems()).toBeNull();
    });

    it('should extract docregion names for code snippet', async () => {
      const mockToken = {} as CancellationToken;
      await provideCompletionItems(undefined, undefined, mockToken);

      expect(extractDocregionNamesSpy).toHaveBeenCalledWith(mockCodeSnippetInfo, mockToken);
    });

    describe('(with extracted docregion info)', () => {
      beforeEach(() => extractDocregionNamesSpy.and.returnValue(Promise.resolve(['foo', 'bar'])));

      it('should resolve to a `CompletionItem` for each docregion name', async () => {
        const mockContext = {} as CompletionContext;
        const result = (await provideCompletionItems(undefined, undefined, undefined, mockContext))!;

        expect(result).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo'},
          {label: 'bar', filterText: 'bar', insertText: 'bar'},
        ]);
      });

      it('should use `<default>` as label for the empty docregion name', async () => {
        extractDocregionNamesSpy.and.returnValue(Promise.resolve(['', 'bar']));

        const mockContext = {} as CompletionContext;
        const result = (await provideCompletionItems(undefined, undefined, undefined, mockContext))!;

        expect(result).toEqual([
          {label: '<default>', filterText: '', insertText: ''},
          {label: 'bar', filterText: 'bar', insertText: 'bar'},
        ]);
      });

      it('should wrap `insertText` in double quotes if trigger character is `=`', async () => {
        const mockContext = {triggerCharacter: '='} as CompletionContext;
        const result = (await provideCompletionItems(undefined, undefined, undefined, mockContext))!;

        expect(result).toEqual([
          {label: 'foo', filterText: 'foo', insertText: '"foo"'},
          {label: 'bar', filterText: 'bar', insertText: '"bar"'},
        ]);
      });

      it('should add closing quote if trigger character is `"` (unless already present)', async () => {
        const mockDoc: TextDocument = new MockTextDocument(stripIndentation(`
          Line 1
          region="
          region="not quote
          region="too far"
          region="'
          region=""
          Line 7
        `)) as any;
        const mockContext = {triggerCharacter: '"'} as CompletionContext;
        const getResult = (mockPos: Position) => provideCompletionItems(mockDoc, mockPos, undefined, mockContext);

        expect(await getResult(new Position(1, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo"'},
          {label: 'bar', filterText: 'bar', insertText: 'bar"'},
        ]);

        expect(await getResult(new Position(2, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo"'},
          {label: 'bar', filterText: 'bar', insertText: 'bar"'},
        ]);

        expect(await getResult(new Position(3, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo"'},
          {label: 'bar', filterText: 'bar', insertText: 'bar"'},
        ]);

        expect(await getResult(new Position(4, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo"'},
          {label: 'bar', filterText: 'bar', insertText: 'bar"'},
        ]);

        expect(await getResult(new Position(5, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo'},
          {label: 'bar', filterText: 'bar', insertText: 'bar'},
        ]);
      });

      it('should add closing quote if trigger character is `\'` (unless already present)', async () => {
        const mockDoc: TextDocument = new MockTextDocument(stripIndentation(`
          Line 1
          region='
          region='not quote
          region='too far'
          region='"
          region=''
          Line 7
        `)) as any;
        const mockContext = {triggerCharacter: '\''} as CompletionContext;
        const getResult = (mockPos: Position) => provideCompletionItems(mockDoc, mockPos, undefined, mockContext);

        expect(await getResult(new Position(1, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo\''},
          {label: 'bar', filterText: 'bar', insertText: 'bar\''},
        ]);

        expect(await getResult(new Position(2, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo\''},
          {label: 'bar', filterText: 'bar', insertText: 'bar\''},
        ]);

        expect(await getResult(new Position(3, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo\''},
          {label: 'bar', filterText: 'bar', insertText: 'bar\''},
        ]);

        expect(await getResult(new Position(4, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo\''},
          {label: 'bar', filterText: 'bar', insertText: 'bar\''},
        ]);

        expect(await getResult(new Position(5, 8))).toEqual([
          {label: 'foo', filterText: 'foo', insertText: 'foo'},
          {label: 'bar', filterText: 'bar', insertText: 'bar'},
        ]);
      });
    });
  });

  describe('provideDefinition()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFileUri;
    let getCodeSnippetInfoSpy: jasmine.Spy;
    let extractDocregionInfoSpy: jasmine.Spy;

    // Helpers
    const provideDefinition =
      (doc: TextDocument = null as any, pos: Position = null as any, token: CancellationToken = null as any) =>
        csip.provideDefinition(doc, pos, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFileUri;

      getCodeSnippetInfoSpy = spyOn(csip, 'getCodeSnippetInfo').and.returnValue(Promise.resolve(mockCodeSnippetInfo));
      extractDocregionInfoSpy = spyOn(csip, 'extractDocregionInfo').and.returnValue(Promise.resolve(null));
    });

    it('should return `null` if `isNgProjectWatcher.matches` is false', async () => {
      matchesGetSpy.and.returnValue(false);

      expect(await provideDefinition()).toBeNull();
      expect(getCodeSnippetInfoSpy).not.toHaveBeenCalled();
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideDefinition(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing definition');
    });

    it('should return `null` if no code snippet info', async () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(await provideDefinition()).toBeNull();
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
      const mockExampleUri = Uri.file('/examples/file/pat.h');
      const mockRanges = [
        new MockRange(0, 1, 2, 3),
        new MockRange(1, 3, 3, 7),
        new MockRange(2, 4, 4, 2),
      ];

      mockCodeSnippetInfo.file = {uri: mockExampleUri};
      extractDocregionInfoSpy.and.returnValue(Promise.resolve({ranges: mockRanges}));

      const result = await provideDefinition();

      expect(result).toEqual([
        new MockLocation(mockExampleUri, mockRanges[0]),
        new MockLocation(mockExampleUri, mockRanges[1]),
        new MockLocation(mockExampleUri, mockRanges[2]),
      ] as Location[]);
    });
  });

  describe('provideHover()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFileUri;
    let getCodeSnippetInfoSpy: jasmine.Spy;
    let extractDocregionInfoSpy: jasmine.Spy;

    // Helpers
    const provideHover =
      (doc: TextDocument = null as any, pos: Position = null as any, token: CancellationToken = null as any) =>
        csip.provideHover(doc, pos, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {} as ICodeSnippetInfoWithFileUri;

      getCodeSnippetInfoSpy = spyOn(csip, 'getCodeSnippetInfo').and.returnValue(Promise.resolve(mockCodeSnippetInfo));
      extractDocregionInfoSpy = spyOn(csip, 'extractDocregionInfo').and.returnValue(Promise.resolve(null));
    });

    it('should return `null` if `isNgProjectWatcher.matches` is false', async () => {
      matchesGetSpy.and.returnValue(false);

      expect(await provideHover()).toBeNull();
      expect(getCodeSnippetInfoSpy).not.toHaveBeenCalled();
    });

    it('should get the code snippet info', async () => {
      const mockDoc = {} as TextDocument;
      const mockPos = {} as Position;

      await provideHover(mockDoc, mockPos);

      expect(getCodeSnippetInfoSpy).toHaveBeenCalledWith(mockDoc, mockPos, 'Providing hover');
    });

    it('should return `null` if no code snippet info', async () => {
      getCodeSnippetInfoSpy.and.returnValue(null);
      expect(await provideHover()).toBeNull();
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
            header: null,
            linenums: false,
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

      it('should include the header in the contents', async () => {
        mockCodeSnippetInfo.attrs.header = 'Mock Header';
        const result = (await provideHover())!;

        expect(result.contents).toBe(stripIndentation(`
          _Mock Header_

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

      it('should not include line numbers if `attrs.linenums === false`', async () => {
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
      });
    });
  });

  describe('resolveCompletionItem()', () => {
    let mockCodeSnippetInfo: ICodeSnippetInfoWithFileUri;
    let extractDocregionInfoSpy: jasmine.Spy;

    // Helpers
    const provideCompletionItems = () =>
      csip.provideCompletionItems(null as any, null as any, null as any, {} as any);
    const resolveCompletionItem = (item: CompletionItem, token: CancellationToken = null as any) =>
      csip.resolveCompletionItem(item, token);

    beforeEach(() => {
      mockCodeSnippetInfo = {
        attrs: {
          path: '/attrs/path',
          region: 'original-region',
        } as ICodeSnippetAttrInfo,
        file: {
          uri: Uri.file('/file/path'),
        },
        raw: {
          contents: 'Test contents.',
        } as ICodeSnippetRawInfo,
      };

      extractDocregionInfoSpy = spyOn(csip, 'extractDocregionInfo').and.returnValue(Promise.resolve(null));

      spyOn(csip, 'getCodeSnippetInfo').and.returnValue(Promise.resolve(mockCodeSnippetInfo));
      spyOn(csip, 'isInRegionAttribute').and.returnValue(true);
      spyOn(csip, 'extractDocregionNames').and.returnValue(Promise.resolve(['foo', 'bar']));
    });

    it('should return `null` if the item has not been created by `provideCompletionItems()`', async () => {
      const item = (await provideCompletionItems())![0];
      const itemClone = {...item};

      expect(resolveCompletionItem(itemClone)).toBeNull();
      expect(extractDocregionInfoSpy).not.toHaveBeenCalled();

      await resolveCompletionItem(item);
      expect(extractDocregionInfoSpy).toHaveBeenCalledTimes(1);
    });

    it('should return `null` if `filterText` is undefined', () => {
      expect(resolveCompletionItem({label: 'foo', insertText: 'bar'})).toBeNull();
      expect(extractDocregionInfoSpy).not.toHaveBeenCalled();
    });

    it('should extract docregions for code snippet', async () => {
      const item = (await provideCompletionItems())![0];
      const mockToken = {} as CancellationToken;

      await resolveCompletionItem(item, mockToken);

      expect(extractDocregionInfoSpy).toHaveBeenCalledWith(jasmine.any(Object), mockToken);
      expect(extractDocregionInfoSpy.calls.argsFor(0)[0]).toEqual({
        attrs: jasmine.objectContaining({path: '/attrs/path'}),
        file: {uri: Uri.file('/file/path')},
        raw: {contents: 'Test contents.'},
      });
    });

    it('should overwrite `attrs.region` with the actual docregion name in code snippet info', async () => {
      const item = Object.assign((await provideCompletionItems())![0], {filterText: 'test'});
      await resolveCompletionItem(item);

      expect(extractDocregionInfoSpy.calls.argsFor(0)[0]).toEqual(jasmine.objectContaining({
        attrs: {
          path: '/attrs/path',
          region: 'test',
        },
      }));
    });

    it('should resolve to `null` if no docregion info extracted', async () => {
      const item = (await provideCompletionItems())![0];
      expect(await resolveCompletionItem(item)).toBeNull();
    });

    it('should resolve to an enhanced item with documentation', async () => {
      extractDocregionInfoSpy.and.returnValue(Promise.resolve({
        contents: ['foo', '  bar', 'baz'],
        fileType: 'qux',
      }));

      const item = (await provideCompletionItems())![0];
      const resolvedItem = (await resolveCompletionItem(item))!;

      expect(resolvedItem).not.toBe(item);
      expect(resolvedItem).toEqual(jasmine.objectContaining<CompletionItem>(item));
      expect((resolvedItem.documentation as MarkdownString).value).toBe(stripIndentation(`
        \`\`\`qux
        foo
          bar
        baz
        \`\`\`
      `));
    });
  });

  // Helpers
  class TestCodeSnippetIntellisenseProvider extends CodeSnippetIntellisenseProvider {
    constructor(extractPathPrefixRe = /([\\/])angular\1aio\1content\1/) {
      super(extractPathPrefixRe);
    }

    public override extractDocregionInfo(
        csInfo: ICodeSnippetInfoWithFileUri,
        token: CancellationToken,
    ): Promise<IDocregionInfo | null> {
      return super.extractDocregionInfo(csInfo, token);
    }

    public override extractDocregionNames(
        csInfo: ICodeSnippetInfoWithFileUri, token: CancellationToken): Promise<string[]> {
      return super.extractDocregionNames(csInfo, token);
    }

    public override getCodeSnippetInfo(
        doc: TextDocument,
        pos: Position,
        action: string,
    ): Promise<ICodeSnippetInfoWithFileUri | null> {
      return super.getCodeSnippetInfo(doc, pos, action);
    }

    public override getDocregionExtractor(fileUri: Uri, token: CancellationToken): Promise<DocregionExtractor> {
      return super.getDocregionExtractor(fileUri, token);
    }

    public override isInRegionAttribute(doc: TextDocument, pos: Position): boolean {
      return super.isInRegionAttribute(doc, pos);
    }
  }
});
