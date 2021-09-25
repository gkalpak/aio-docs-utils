import {Range} from 'vscode';
import {
  DocregionExtractor, IDocregionInfo, IProvisionalDocregionInfo,
} from '../../../code-snippet-intellisense/docregion-extractor';
import * as matchers from '../../../code-snippet-intellisense/docregion-matchers';
import {stripIndentation} from '../../helpers/string-utils';
import {MockRange} from '../../helpers/vscode.mock';


describe('DocregionExtractor', () => {
  const mockMatcher: matchers.IDocregionMatcher = {
    plasterRe: /^\s*mock#docplaster\s*(.*)$/,
    regionEndRe: /^\s*mock#enddocregion\s*(.*)$/,
    regionStartRe: /^\s*mock#docregion\s*(.*)$/,
    createPlasterComment(plaster: string) { return `mock#${plaster}`; },
  };
  let getDocregionMatcherSpy: jasmine.Spy;

  // Helpers
  const createDocregionExtractor = (fileType: string, contents: string): TestDocregionExtractor =>
    new TestDocregionExtractor(fileType, contents);
  const createDocregionRange = (startLine: number, endLine: number): Range =>
    new MockRange(startLine, 0, endLine, 0) as Range;

  beforeEach(() => getDocregionMatcherSpy = spyOn(matchers, 'getDocregionMatcher').and.returnValue(mockMatcher));

  describe('DocregionExtractor.for()', () => {
    it('should return a `DocregionExtractor` instance', () => {
      expect(DocregionExtractor.for('foo', 'bar')).toEqual(jasmine.any(DocregionExtractor));
      expect(DocregionExtractor.for('baz', 'qux')).toEqual(jasmine.any(DocregionExtractor));
    });

    it('should return the same instance for the same file-type and content', () => {
      const instance1 = DocregionExtractor.for('foo', 'bar');
      const instance2 = DocregionExtractor.for('foo', 'bar');

      expect(instance2).toBe(instance1);
    });

    it('should return a new instance for different file-type/content', () => {
      const instance1 = DocregionExtractor.for('foo', 'bar');
      const instance2 = DocregionExtractor.for('foo', 'bar2');
      const instance3 = DocregionExtractor.for('foo2', 'bar');
      const instance4 = DocregionExtractor.for('foo2', 'bar2');

      expect(instance2).not.toBe(instance1);

      expect(instance3).not.toBe(instance2);
      expect(instance3).not.toBe(instance1);

      expect(instance4).not.toBe(instance3);
      expect(instance4).not.toBe(instance2);
      expect(instance4).not.toBe(instance1);
    });
  });

  describe('extract()', () => {
    it('should get the regions', () => {
      const extractor = createDocregionExtractor('foo', 'bar');
      const getRegionsSpy = spyOn(extractor, 'getRegions').and.callThrough();

      extractor.extract('baz');
      expect(getRegionsSpy).toHaveBeenCalledTimes(1);

      extractor.extract('qux');
      expect(getRegionsSpy).toHaveBeenCalledTimes(2);
    });

    it('should return `null` if the specified docregion does not exist', () => {
      const extractor = createDocregionExtractor('foo', 'bar');
      expect(extractor.extract('baz')).toBeNull();
    });

    it('should return an `IDocregionInfo` object', () => {
      const extractor = createDocregionExtractor('foo', `
        line 1
        mock#docregion bar
          line 2
            line 3
        mock#enddocregion bar
              line 4
      `);

      expect(extractor.extract('bar')).toEqual({
        contents: [
          'line 2',
          '  line 3',
        ],
        fileType: 'foo',
        ranges: [
          createDocregionRange(3, 5),
        ],
      });
    });

    it('should return the same `IDocregionInfo` object for the same docregion', () => {
      const extractor = createDocregionExtractor('foo', `
        line 1
        mock#docregion bar
          line 2
            line 3
        mock#enddocregion bar
              line 4
      `);
      const info1 = extractor.extract('bar');
      const info2 = extractor.extract('bar');

      expect(info1).toBe(info2);
    });

    it('should split lines by `\n` or `\r\n`', () => {
      const extractor = createDocregionExtractor('foo', 'bar\nbaz\r\nqux');
      expect(extractor.extract().contents).toEqual(['bar', 'baz', 'qux']);
    });

    it('should use a default docplaster', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        mock#docregion
        line 1
        mock#enddocregion
          line 2
        mock#docregion
            line 3
        mock#enddocregion
      `));

      expect(extractor.extract().contents).toEqual([
        'line 1',
        'mock#. . .',
        '    line 3',
      ]);
    });

    it('should preserve the indentation for the docplaster', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        mock#docregion
        line 1
        mock#enddocregion
          line 2
            mock#docregion
              line 3
            mock#enddocregion
          line 4
        mock#docregion
          line 5
        mock#enddocregion
      `));

      expect(extractor.extract().contents).toEqual([
        'line 1',
        '    mock#. . .',
        '      line 3',
        'mock#. . .',
        '  line 5',
      ]);
    });

    it('should use the specified docplaster (from that point onwards)', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        mock#docregion
        line 1
        mock#enddocregion
          line 2
        mock#docregion
            line 3
        mock#enddocregion
        mock#docplaster ---:---
          line 4
        mock#docregion
        line 5
        mock#enddocregion
      `));

      expect(extractor.extract().contents).toEqual([
        'line 1',
        'mock#. . .',
        '    line 3',
        'mock#---:---',
        'line 5',
      ]);
    });

    it('should use no docplaster if an empty string is used', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        mock#docregion
        line 1
        mock#enddocregion
          line 2
        mock#docregion
            line 3
        mock#enddocregion
        mock#docplaster
          line 4
        mock#docregion
        line 5
        mock#enddocregion
      `));

      expect(extractor.extract().contents).toEqual([
        'line 1',
        'mock#. . .',
        '    line 3',
        'line 5',
      ]);
    });

    it('should assign to the default docregion (`\'\'`) if none is specified', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        line 1
        mock#docregion
          line 2
        mock#enddocregion
        line 3
      `));

      expect(extractor.extract()).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: ['line 2'],
        ranges: [createDocregionRange(2, 3)],
      }));
    });

    it('should support assigning to multiple docregions (including the default one)', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        line 1
        mock#docregion bar, baz
          line 2
        mock#enddocregion bar, baz
            line 3
        mock#docregion baz, qux,
          line 4
        mock#enddocregion baz, qux,
        line 5
      `));

      expect(extractor.extract('bar')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: ['line 2'],
        ranges: [createDocregionRange(2, 3)],
      }));
      expect(extractor.extract('baz')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: [
          '  line 2',
          'mock#. . .',
          '  line 4',
        ],
        ranges: [
          createDocregionRange(2, 3),
          createDocregionRange(6, 7),
        ],
      }));
      expect(extractor.extract('qux')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: ['line 4'],
        ranges: [createDocregionRange(6, 7)],
      }));
      expect(extractor.extract('')).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: ['line 4'],
        ranges: [createDocregionRange(6, 7)],
      }));
    });

    it('should end the most recently opened docregion if none is specified', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        line 1
        mock#docregion bar, baz
          line 2
        mock#enddocregion
            line 3
        mock#enddocregion
          line 4
      `));

      expect(extractor.extract('bar')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: [
          'line 2',
          '  line 3',
        ],
        ranges: [
          createDocregionRange(2, 5),
        ],
      }));
      expect(extractor.extract('baz')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: ['line 2'],
        ranges: [createDocregionRange(2, 3)],
      }));
    });

    it('should support interwound docregions', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        mock#docregion bar
        line 1a
        line 1b
        mock#docregion baz
          line 2a
          line 2b
        mock#enddocregion bar
        line 3a
        line 3b
        mock#enddocregion baz
      `));

      expect(extractor.extract('bar')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: [
          'line 1a',
          'line 1b',
          '  line 2a',
          '  line 2b',
        ],
        ranges: [
          createDocregionRange(1, 6),
        ],
      }));
      expect(extractor.extract('baz')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: [
          '  line 2a',
          '  line 2b',
          'line 3a',
          'line 3b',
        ],
        ranges: [
          createDocregionRange(4, 9),
        ],
      }));
    });

    it('should implicitly close all docregions at EOF', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        line 1
        mock#docregion bar
          line 2
        mock#docregion baz
            line 3
      `));

      expect(extractor.extract('bar')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: [
          'line 2',
          '  line 3',
        ],
        ranges: [
          createDocregionRange(2, 5),
        ],
      }));
      expect(extractor.extract('baz')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: ['line 3'],
        ranges: [createDocregionRange(4, 5)],
      }));
    });

    it('should assign all lines to the default docregion (if not explicitly marked)', () => {
      const extractor = createDocregionExtractor('foo', stripIndentation(`
        line 1
        mock#docregion bar
          line 2
        mock#docregion baz
            line 3
        mock#enddocregion
          line 4
        mock#enddocregion
        line 5
      `));

      expect(extractor.extract('')!).toEqual(jasmine.objectContaining<IDocregionInfo>({
        contents: [
          'line 1',
          '  line 2',
          '    line 3',
          '  line 4',
          'line 5',
        ],
        ranges: [createDocregionRange(0, 0)],
      }));
    });
  });

  describe('getAvailableNames()', () => {
    it('should return the names of extracted regions', () => {
      const extractor = createDocregionExtractor('foo', 'bar');
      const mockRegions = new Map<string, any>([['baz', {}], ['qux', {}]]);
      spyOn(extractor, 'getRegions').and.returnValue(mockRegions);

      expect(extractor.getAvailableNames()).toEqual(['baz', 'qux']);
    });
  });

  describe('getRegions()', () => {
    it('should retrieve the appropriate `IDocregionMatcher` (on first call only)', () => {
      const extractor = createDocregionExtractor('foo', 'bar');
      expect(getDocregionMatcherSpy).not.toHaveBeenCalled();

      const regions1 = extractor.getRegions();
      expect(getDocregionMatcherSpy).toHaveBeenCalledWith('foo');

      getDocregionMatcherSpy.calls.reset();
      const regions2 = extractor.getRegions();
      expect(getDocregionMatcherSpy).not.toHaveBeenCalled();

      expect(regions2).toBe(regions1);
    });

    it('should pre-process the contents (on first call only)', () => {
      const spies: jasmine.Spy[] = [];
      const createPlasterCommentSpy = spies[0] = spyOn(mockMatcher, 'createPlasterComment').and.callThrough();
      const regionStartReExecSpy = spies[1] = spyOn(mockMatcher.regionStartRe, 'exec').and.callThrough();
      const regionEndReExecSpy = spies[2] = spyOn(mockMatcher.regionEndRe, 'exec').and.callThrough();
      const plasterReExecSpy = spies[3] = spyOn(mockMatcher.plasterRe, 'exec').and.callThrough();

      // Create `DocregionExtractor`.
      const extractor = createDocregionExtractor('foo', 'bar\nbaz\nqux');
      spies.forEach(spy => expect(spy).not.toHaveBeenCalled());

      // First call.
      extractor.getRegions();

      expect(createPlasterCommentSpy).toHaveBeenCalledWith('. . .');

      expect(regionStartReExecSpy).toHaveBeenCalledWith('bar');
      expect(regionStartReExecSpy).toHaveBeenCalledWith('baz');
      expect(regionStartReExecSpy).toHaveBeenCalledWith('qux');

      expect(regionEndReExecSpy).toHaveBeenCalledWith('bar');
      expect(regionEndReExecSpy).toHaveBeenCalledWith('baz');
      expect(regionEndReExecSpy).toHaveBeenCalledWith('qux');

      expect(plasterReExecSpy).toHaveBeenCalledWith('bar');
      expect(plasterReExecSpy).toHaveBeenCalledWith('baz');
      expect(plasterReExecSpy).toHaveBeenCalledWith('qux');

      spies.forEach(spy => spy.calls.reset());

      // Subsequent calls.
      extractor.getRegions();
      extractor.getRegions();
      spies.forEach(spy => expect(spy).not.toHaveBeenCalled());
    });
  });

  // Helpers
  class TestDocregionExtractor extends DocregionExtractor {
    public override getRegions(): Map<string, IProvisionalDocregionInfo | IDocregionInfo> {
      return super.getRegions();
    }
  }
});
