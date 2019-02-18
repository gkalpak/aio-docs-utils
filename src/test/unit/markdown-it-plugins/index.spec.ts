import * as MarkdownIt from 'markdown-it';
import {extendMarkdownIt} from '../../../markdown-it-plugins';
import {fixGuideImagesPlugin} from '../../../markdown-it-plugins/fix-guide-images';


type IMarkdownItUseParams = Parameters<MarkdownIt['use']>;
type IMarkdownItPlugin = IMarkdownItUseParams[0];

describe('markdown-it-plugins', () => {
  describe('extendMarkdownIt()', () => {
    let mockMarkdownIt: MockMarkdownIt;
    let useSpy: jasmine.Spy;

    beforeEach(() => {
      mockMarkdownIt = new MockMarkdownIt();
      useSpy = spyOn(MockMarkdownIt.prototype, 'use').and.callThrough();
    });

    it('should register all plugins', () => {
      extendMarkdownIt(mockMarkdownIt);

      expect(useSpy).toHaveBeenCalledTimes(1);
      expect(useSpy).toHaveBeenCalledWith(fixGuideImagesPlugin);
    });

    it('should return the final `MarkdownIt` instance', () => {
      const finalInstance = extendMarkdownIt(mockMarkdownIt) as MockMarkdownIt;

      expect(finalInstance.generation).toBe(2);
      expect(finalInstance).toBe(useSpy.calls.mostRecent().returnValue);
    });
  });
});

// Helpers
class MockMarkdownIt extends MarkdownIt {
  constructor(public generation = 1, private plugins: IMarkdownItPlugin[] = []) {
    super();
  }

  public use(...args: IMarkdownItUseParams): MockMarkdownIt {
    return new MockMarkdownIt(this.generation + 1, [...this.plugins, args[0]]);
  }
}
