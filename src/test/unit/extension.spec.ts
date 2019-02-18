import {Disposable, ExtensionContext, window} from 'vscode';
import {CodeSnippetIntellisenseFeature} from '../../code-snippet-intellisense';
import {activate, deactivate} from '../../extension';
import {extendMarkdownIt} from '../../markdown-it-plugins';
import {BaseFeature} from '../../shared/base-feature';
import {logger} from '../../shared/logger';


describe('extension', () => {
  let logSpy: jasmine.Spy;

  beforeEach(() => logSpy = spyOn(logger, 'log'));

  describe('activate()', () => {
    const mockContext: ExtensionContext = {subscriptions: []} as any;
    let activateSpy: jasmine.Spy;

    beforeEach(() => activateSpy = spyOn(BaseFeature, 'activate'));

    it('should activate `CodeSnippetIntellisenseFeature`', () => {
      activate(mockContext);
      expect(activateSpy).toHaveBeenCalledWith(mockContext);
      expect(activateSpy.calls.mostRecent().object).toBe(CodeSnippetIntellisenseFeature);
    });

    it('should show an ephemeral message in the status bar', () => {
      const mockDisposable: Disposable = {} as any;
      const setStatusBarMessageSpy = spyOn(window, 'setStatusBarMessage').and.returnValue(mockDisposable);

      activate(mockContext);

      expect(setStatusBarMessageSpy).toHaveBeenCalledWith('Angular.io Documentation Utilities activated.', 5000);
      expect(mockContext.subscriptions).toContain(mockDisposable);
    });

    it('should register `logger` as disposable', () => {
      activate(mockContext);
      expect(mockContext.subscriptions).toContain(logger);
    });

    it('should log a message', () => {
      activate(mockContext);
      expect(logSpy).toHaveBeenCalledWith('Activated.');
    });

    it('should extend markdown-it', () => {
      expect(activate(mockContext)).toEqual({extendMarkdownIt});
    });
  });

  describe('deactivate()', () => {
    it('should log a message', () => {
      deactivate();
      expect(logSpy).toHaveBeenCalledWith('Deactivated.');
    });
  });
});
