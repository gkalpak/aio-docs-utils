import {ExtensionContext, window} from 'vscode';
import {CodeSnippetIntellisenseFeature} from '../../code-snippet-intellisense';
import {activate, deactivate} from '../../extension';
import {BaseFeature} from '../../shared/base-feature';
import {logger} from '../../shared/logger';


describe('extension', () => {
  let logSpy: jasmine.Spy;

  beforeEach(() => logSpy = spyOn(logger, 'log'));

  describe('activate()', () => {
    const mockContext: ExtensionContext = {} as any;
    let activateSpy: jasmine.Spy;
    let showInformationMessageSpy: jasmine.Spy;

    beforeEach(() => {
      activateSpy = spyOn(BaseFeature, 'activate');
      showInformationMessageSpy = spyOn(window, 'showInformationMessage');
    });

    it('should activate `CodeSnippetIntellisenseFeature`', () => {
      activate(mockContext);
      expect(activateSpy).toHaveBeenCalledWith(mockContext);
      expect(activateSpy.calls.mostRecent().object).toBe(CodeSnippetIntellisenseFeature);
    });

    it('should show a message to the user', () => {
      activate(mockContext);
      expect(showInformationMessageSpy).toHaveBeenCalledWith('Angular.io Documentation Utilities activated.');
    });

    it('should lod a message', () => {
      activate(mockContext);
      expect(logSpy).toHaveBeenCalledWith('Activated.');
    });
  });

  describe('deactivate()', () => {
    it('should lod a message', () => {
      deactivate();
      expect(logSpy).toHaveBeenCalledWith('Deactivated.');
    });
  });
});
