import {workspace} from 'vscode';
import {logger} from '../../../shared/logger';
import {WorkspaceFolderWatcher} from '../../../shared/workspace-folder-watcher';
import {
  MockDisposable,
  MockWorkspaceFolder,
  workspaceOnDidChangeWorkspaceFoldersListeners,
} from '../../helpers/vscode.mock';


describe('WorkspaceFolderWatcher', () => {
  let watcher: TestWorkspaceFolderWatcher;
  let logSpy: jasmine.Spy;
  let isOfInterestSpy: jasmine.Spy;

  beforeEach(() => {
    workspace.workspaceFolders = [new MockWorkspaceFolder('/foo/bar') as any];
    workspaceOnDidChangeWorkspaceFoldersListeners.length = 0;

    logSpy = spyOn(logger, 'log');
    isOfInterestSpy = jasmine.createSpy('isOfInterest').and.returnValue(true);

    watcher = new TestWorkspaceFolderWatcher('testWatcher', isOfInterestSpy);
  });

  describe('constructor()', () => {
    it('should immediately call `updateMatches()`', () => {
      expect(watcher.updateMatchesSpy).toHaveBeenCalledTimes(1);
    });

    it('should call `updateMatches()` whenever the workspace folders change', () => {
      expect(workspaceOnDidChangeWorkspaceFoldersListeners).toEqual([jasmine.any(Function)]);

      const cb = workspaceOnDidChangeWorkspaceFoldersListeners[0];

      cb();
      expect(watcher.updateMatchesSpy).toHaveBeenCalledTimes(2);

      cb();
      expect(watcher.updateMatchesSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('dispose()', () => {
    it('should log a message', () => {
      watcher.dispose();
      expect(logSpy).toHaveBeenCalledWith(`Disposing ${watcher}...`);
    });

    it('should dispose of the `onDidChangeWorkspaceFolders` listener when being itself disposed of', () => {
      const disposeSpy = spyOn(MockDisposable.prototype, 'dispose');

      watcher.dispose();
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('toString()', () => {
    it('should return a string representation that includes the ID', () => {
      expect(watcher.toString()).toBe('TestWorkspaceFolderWatcher(testWatcher)');
    });
  });

  describe('updateMatches()', () => {
    it('should update `matches` (and log a message)', () => {
      logSpy.calls.reset();

      expect(watcher.matches).toBe(true);

      isOfInterestSpy.and.returnValue(false);
      watcher.updateMatches();
      expect(watcher.matches).toBe(false);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(`${watcher}: Workspace does not match criteria.`);

      isOfInterestSpy.and.returnValue(true);
      watcher.updateMatches();
      expect(watcher.matches).toBe(true);
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(`${watcher}: Workspace matches criteria.`);
    });

    it('should set `matches` to false if there are no workspace folders', () => {
      isOfInterestSpy.calls.reset();

      expect(watcher.matches).toBe(true);

      workspace.workspaceFolders = undefined;
      watcher.updateMatches();
      expect(watcher.matches).toBe(false);

      workspace.workspaceFolders = [];
      watcher.updateMatches();
      expect(watcher.matches).toBe(false);

      expect(isOfInterestSpy).not.toHaveBeenCalled();
    });
  });

  // Helpers
  class TestWorkspaceFolderWatcher extends WorkspaceFolderWatcher {
    public updateMatchesSpy: jasmine.Spy | undefined;

    public updateMatches(): void {
      if (!this.updateMatchesSpy) {
        this.updateMatchesSpy = jasmine.createSpy('updateMatches');
      }

      this.updateMatchesSpy();
      return super.updateMatches();
    }
  }
});
