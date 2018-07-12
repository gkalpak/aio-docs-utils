import {Disposable, DocumentSelector, languages} from 'vscode';
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
    let completionItemProviderRegistrations: Disposable[];
    let definitionProviderRegistrations: Disposable[];
    let hoverProviderRegistrations: Disposable[];
    let registerCompletionItemProviderSpy: jasmine.Spy;
    let registerDefinitionProviderSpy: jasmine.Spy;
    let registerHoverProviderSpy: jasmine.Spy;

    // Helpers
    const addDisposable = (disposables: Disposable[]): Disposable => {
      const disposable = {dispose: jasmine.createSpy('dispose')};
      disposables.push(disposable);
      return disposable;
    };

    beforeEach(() => {
      completionItemProviderRegistrations = [];
      registerCompletionItemProviderSpy = spyOn(languages, 'registerCompletionItemProvider').and.
        callFake(() => addDisposable(completionItemProviderRegistrations));

      definitionProviderRegistrations = [];
      registerDefinitionProviderSpy = spyOn(languages, 'registerDefinitionProvider').and.
        callFake(() => addDisposable(definitionProviderRegistrations));

      hoverProviderRegistrations = [];
      registerHoverProviderSpy = spyOn(languages, 'registerHoverProvider').and.
        callFake(() => addDisposable(hoverProviderRegistrations));

      csie = new CodeSnippetIntellisenseFeature();
    });

    it('should register an intellisense provider for guides', () => {
      const [cplSelector, cplProvider, ...cplTriggerChars] = registerCompletionItemProviderSpy.calls.argsFor(0);
      const [defSelector, defProvider] = registerDefinitionProviderSpy.calls.argsFor(0);
      const [hovSelector, hovProvider] = registerHoverProviderSpy.calls.argsFor(0);

      expect(hovSelector).toBe(defSelector);
      expect(hovProvider).toBe(defProvider);
      expect(defSelector).toBe(cplSelector);
      expect(defProvider).toBe(cplProvider);

      expect(cplSelector).toEqual({
        language: 'markdown',
        pattern: '**/aio/content/**',
        scheme: 'file',
      });
      expect(cplProvider).toEqual(jasmine.any(CodeSnippetIntellisenseProvider));
      expect(cplTriggerChars).toEqual(CodeSnippetIntellisenseProvider.COMPLETION_TRIGGER_CHARACTERS);

      const re = (cplProvider as CodeSnippetIntellisenseProvider).extractPathPrefixRe;

      expect(re.exec('/foo/bar/aio/content/baz/qux')![0]).toBe('/foo/bar/aio/content/');
      expect(re.exec('/foo/bar/AIO/CONTENT/baz/qux')![0]).toBe('/foo/bar/AIO/CONTENT/');
      expect(re.exec('C:\\foo\\bar\\aio\\content\\baz\\qux')![0]).toBe('C:\\foo\\bar\\aio\\content\\');

      expect(re.exec('/foo/bar/not-aio/content/baz/qux')).toBeNull();
      expect(re.exec('/foo/bar\\aio\\content/baz/qux')).toBeNull();
    });

    it('should register an intellisense provider for API docs', () => {
      const [cplSelector, cplProvider, ...cplTriggerChars] = registerCompletionItemProviderSpy.calls.argsFor(1);
      const [defSelector, defProvider] = registerDefinitionProviderSpy.calls.argsFor(1);
      const [hovSelector, hovProvider] = registerHoverProviderSpy.calls.argsFor(1);

      expect(hovSelector).toBe(defSelector);
      expect(hovProvider).toBe(defProvider);
      expect(defSelector).toBe(cplSelector);
      expect(defProvider).toBe(cplProvider);

      expect(cplSelector).toEqual({
        language: 'typescript',
        pattern: '**/packages/**',
        scheme: 'file',
      });
      expect(cplProvider).toEqual(jasmine.any(CodeSnippetIntellisenseProvider));
      expect(cplTriggerChars).toEqual(CodeSnippetIntellisenseProvider.COMPLETION_TRIGGER_CHARACTERS);

      const re = (cplProvider as CodeSnippetIntellisenseProvider).extractPathPrefixRe;

      expect(re.exec('/foo/bar/packages/baz/qux')![0]).toBe('/foo/bar/packages/');
      expect(re.exec('/foo/bar/PACKAGES/baz/qux')![0]).toBe('/foo/bar/PACKAGES/');
      expect(re.exec('C:\\foo\\bar\\packages\\baz\\qux')![0]).toBe('C:\\foo\\bar\\packages\\');

      expect(re.exec('/foo/bar/not-packages/baz/qux')).toBeNull();
      expect(re.exec('/foo/bar\\packages/baz/qux')).toBeNull();
    });

    it('should log a message for the registered intellisense providers', () => {
      const docSelectors: DocumentSelector[] = [
        {language: 'markdown', pattern: '**/aio/content/**', scheme: 'file'},
        {language: 'typescript', pattern: '**/packages/**', scheme: 'file'},
      ];
      const logMessages = docSelectors.
        map(selector => `Registered intellisense provider for: ${JSON.stringify(selector)}`);

      expect(logSpy).toHaveBeenCalledTimes(logMessages.length);
      logMessages.forEach(message => expect(logSpy).toHaveBeenCalledWith(message));
    });

    it('should dispose of the `CompletionItemProvider` registrations when being itself disposed of', () => {
      expect(completionItemProviderRegistrations.length).toBe(2);
      completionItemProviderRegistrations.forEach(reg => expect(reg.dispose).not.toHaveBeenCalled());

      csie.dispose();
      completionItemProviderRegistrations.forEach(reg => expect(reg.dispose).toHaveBeenCalledTimes(1));
    });

    it('should dispose of the `DefinitionProvider` registrations when being itself disposed of', () => {
      expect(definitionProviderRegistrations.length).toBe(2);
      definitionProviderRegistrations.forEach(reg => expect(reg.dispose).not.toHaveBeenCalled());

      csie.dispose();
      definitionProviderRegistrations.forEach(reg => expect(reg.dispose).toHaveBeenCalledTimes(1));
    });

    it('should dispose of the `HoverProvider` registrations when being itself disposed of', () => {
      expect(hoverProviderRegistrations.length).toBe(2);
      hoverProviderRegistrations.forEach(reg => expect(reg.dispose).not.toHaveBeenCalled());

      csie.dispose();
      hoverProviderRegistrations.forEach(reg => expect(reg.dispose).toHaveBeenCalledTimes(1));
    });
  });
});
