import {Disposable, languages} from 'vscode';
import {CodeSnippetIntellisenseFeature} from '../../../code-snippet-intellisense';
import {CodeSnippetIntellisenseProvider} from '../../../code-snippet-intellisense/code-snippet-intellisense-provider';
import {BaseFeature} from '../../../shared/base-feature';
import {logger} from '../../../shared/logger';


describe('CodeSnippetIntellisenseFeature', () => {
  let csie: CodeSnippetIntellisenseFeature;
  let logSpy: jasmine.Spy;

  beforeEach(() => logSpy = spyOn(logger, 'log'));

  it('should extend `BaseFeature`', () => {
    csie = new CodeSnippetIntellisenseFeature();
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

      csie = new CodeSnippetIntellisenseFeature();
    });

    it('should register an intellisense provider for guides', () => {
      expect(registerDefinitionProviderSpy).toHaveBeenCalledTimes(1);
      expect(registerHoverProviderSpy).toHaveBeenCalledTimes(1);

      const [defSelector, defProvider] = registerDefinitionProviderSpy.calls.mostRecent().args;
      const [hovSelector, hovProvider] = registerHoverProviderSpy.calls.mostRecent().args;

      expect(hovSelector).toBe(defSelector);
      expect(hovProvider).toBe(defProvider);

      expect(defSelector).toEqual({
        language: 'markdown',
        pattern: '**/aio/content/**',
        scheme: 'file',
      });
      expect(defProvider).toEqual(jasmine.any(CodeSnippetIntellisenseProvider));

      const re = (defProvider as CodeSnippetIntellisenseProvider).extractPathPrefixRe;

      expect(re.exec('/foo/bar/aio/content/baz/qux')![0]).toBe('/foo/bar/aio/content/');
      expect(re.exec('/foo/bar/AIO/CONTENT/baz/qux')![0]).toBe('/foo/bar/AIO/CONTENT/');
      expect(re.exec('C:\\foo\\bar\\aio\\content\\baz\\qux')![0]).toBe('C:\\foo\\bar\\aio\\content\\');

      expect(re.exec('/foo/bar/not-aio/content/baz/qux')).toBeNull();
      expect(re.exec('/foo/bar\\aio\\content/baz/qux')).toBeNull();
    });

    it('should log a message for the registered intellisense providers', () => {
      expect(logSpy).toHaveBeenCalledWith(`Registered intellisense provider for: ${JSON.stringify({
        language: 'markdown',
        pattern: '**/aio/content/**',
        scheme: 'file',
      })}`);
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
});
