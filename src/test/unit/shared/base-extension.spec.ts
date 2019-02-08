import {Disposable, ExtensionContext} from 'vscode';
import {BaseFeature} from '../../../shared/base-feature';
import {logger} from '../../../shared/logger';


describe('BaseFeature', () => {
  let constructorSpy: jasmine.Spy;
  let logSpy: jasmine.Spy;

  beforeEach(() => {
    constructorSpy = jasmine.createSpy('constructor');
    logSpy = spyOn(logger, 'log');
  });

  describe('activate()', () => {
    const mockContext: ExtensionContext = {subscriptions: []} as any;

    it('should log a message', () => {
      TestFeature.activate(mockContext);
      expect(logSpy).toHaveBeenCalledWith('Activating TestFeature...');
    });

    it('should instantiate the feature', () => {
      TestFeature.activate(mockContext);
      expect(constructorSpy).toHaveBeenCalledWith(jasmine.any(TestFeature));
    });

    it('should push the created instance to `context.subscriptions`', () => {
      TestFeature.activate(mockContext);
      const instance = constructorSpy.calls.mostRecent().args[0];

      expect(mockContext.subscriptions).toContain(instance);
    });
  });

  describe('dispose()', () => {
    let instance: TestFeature;

    beforeEach(() => instance = new TestFeature());

    it('should log a message', () => {
      instance.dispose();
      expect(logSpy).toHaveBeenCalledWith('Disposing TestFeature...');
    });

    it('should dispose of all disposables', () => {
      const disposables: Disposable[] = [
        jasmine.createSpyObj('disposable1', ['dispose']),
        jasmine.createSpyObj('disposable2', ['dispose']),
      ];
      instance.disposables.push(...disposables);
      instance.dispose();

      disposables.forEach(d => expect(d.dispose).toHaveBeenCalledTimes(1));
    });
  });

  // Helpers
  class TestFeature extends BaseFeature {
    public disposables: Disposable[] = [];

    constructor() {
      super();
      constructorSpy(this);
    }
  }
});
