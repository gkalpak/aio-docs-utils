import {Uri, workspace, WorkspaceFolder} from 'vscode';
import {fileSystem as fs} from '../../../shared/file-system';
import {logger} from '../../../shared/logger';
import {isNgProjectWatcher, WorkspaceFolderWatcher} from '../../../shared/workspace-folder-watcher';
import {
  MockDisposable,
  MockWorkspaceFolder,
  workspaceOnDidChangeWorkspaceFoldersListeners,
} from '../../helpers/vscode.mock';


describe('WorkspaceFolderWatcher', () => {
  let watcher: TestWorkspaceFolderWatcher;
  let logSpy: jasmine.Spy;
  let isOfInterestSpy: jasmine.Spy;

  beforeEach(async () => {
    setMockWsFolders(['/foo/bar']);
    workspaceOnDidChangeWorkspaceFoldersListeners.length = 0;

    logSpy = spyOn(logger, 'log');
    isOfInterestSpy = jasmine.createSpy('isOfInterest').and.returnValue(true);

    watcher = new TestWorkspaceFolderWatcher('testWatcher', isOfInterestSpy);

    await watcher.ready;
  });

  describe('constructor()', () => {
    it('should immediately call `updateMatches()`', () => {
      expect(watcher.updateMatchesSpy).toHaveBeenCalledTimes(1);
    });

    it('should call `updateMatches()` whenever the workspace folders change', async () => {
      expect(workspaceOnDidChangeWorkspaceFoldersListeners).toEqual([jasmine.any(Function)]);

      const cb = workspaceOnDidChangeWorkspaceFoldersListeners[0];

      await cb();
      expect(watcher.updateMatchesSpy).toHaveBeenCalledTimes(2);

      await cb();
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
      expect(watcher.toString()).toBe('WorkspaceFolderWatcher(testWatcher)');
    });
  });

  describe('updateMatches()', () => {
    it('should update `matches` (and log a message)', async () => {
      logSpy.calls.reset();

      expect(watcher.matches).toBe(true);

      isOfInterestSpy.and.returnValue(false);
      await watcher.updateMatches();
      expect(watcher.matches).toBe(false);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledWith(`${watcher}: Workspace does not match criteria.`);

      isOfInterestSpy.and.returnValue(Promise.resolve(true));
      await watcher.updateMatches();
      expect(watcher.matches).toBe(true);
      expect(logSpy).toHaveBeenCalledTimes(2);
      expect(logSpy).toHaveBeenCalledWith(`${watcher}: Workspace matches criteria.`);
    });

    it('should set `matches` to false if there are no workspace folders', async () => {
      isOfInterestSpy.calls.reset();

      expect(watcher.matches).toBe(true);

      setMockWsFolders(undefined);
      await watcher.updateMatches();
      expect(watcher.matches).toBe(false);

      setMockWsFolders([]);
      await watcher.updateMatches();
      expect(watcher.matches).toBe(false);

      expect(isOfInterestSpy).not.toHaveBeenCalled();
    });
  });

  // Helpers
  class TestWorkspaceFolderWatcher extends WorkspaceFolderWatcher {
    public updateMatchesSpy: jasmine.Spy | undefined;

    public updateMatches(): ReturnType<WorkspaceFolderWatcher['updateMatches']> {
      if (!this.updateMatchesSpy) {
        this.updateMatchesSpy = jasmine.createSpy('updateMatches');
      }

      this.updateMatchesSpy();
      return super.updateMatches();
    }
  }
});

describe('isNgProjectWatcher', () => {
  // Grab the registered listener, before other tests clean up the list (e.g. in a `beforeEach()` block).
  const onDidChangeWorkspaceFoldersListener = workspaceOnDidChangeWorkspaceFoldersListeners[0];
  let readFileSpy: jasmine.Spy;
  let statSpy: jasmine.Spy;

  // Helpers
  const mockStat = (isDirectory = false, isFile = false) => ({isDirectory: () => isDirectory, isFile: () => isFile});
  const resetMatchingFolder = async (baseDir: string) => {
    setUpMatchingFolder(baseDir);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(true);

    readFileSpy.calls.reset();
    statSpy.calls.reset();
  };
  const setUpMatchingFolder = (baseDir: string) => {
    readFileSpy.and.callFake(async (uri: Uri) =>
      (uri.path === `${baseDir}/package.json`) ? '{\n  "name": "angular-srcs"\n}' : '');

    statSpy.and.callFake(async (uri: Uri) => {
      switch (uri.path) {
        case `${baseDir}/aio/content`:
        case `${baseDir}/packages`:
          return mockStat(true);
        case `${baseDir}/package.json`:
          return mockStat(false, true);
        default:
          throw new Error('Does not exist.');
      }
    });
  };

  beforeEach(async () => {
    readFileSpy = spyOn(fs, 'readFile');
    statSpy = spyOn(fs, 'stat');

    spyOn(logger, 'log');

    setMockWsFolders(['/foo/bar']);
    await resetMatchingFolder('/foo/bar');
    await isNgProjectWatcher.ready;
  });

  it('should be a `WorkspaceFolderWatcher` instance (with an appropriate ID)', () => {
    expect(isNgProjectWatcher).toEqual(jasmine.any(WorkspaceFolderWatcher));
    expect(isNgProjectWatcher.toString()).toBe('WorkspaceFolderWatcher(isAngularProject)');
  });

  it('should have `matches: true` if the workspace folder matches criteria', () => {
    expect(isNgProjectWatcher.matches).toBe(true);
  });

  it('should have `matches: false` if none of the workspace folders matches criteria', async () => {
    setMockWsFolders(['/baz', '/qux']);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
  });

  it('should have `matches: true` if any of the workspace folders matches criteria', async () => {
    setMockWsFolders(['/bax/qux', '/foo/bar']);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(true);
  });

  it('should have `matches: false` if any of the "landmark" files is missing', async () => {
    const defStat = mockStat(true, true);
    const missingStat = Promise.reject('Does not exist.');

    // Missing `/foo/bar/aio/content`.
    statSpy.and.callFake(async (uri: Uri) => (uri.path === '/foo/bar/aio/content') ? missingStat : defStat);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSpy).toHaveBeenCalledTimes(3);

    await resetMatchingFolder('/foo/bar');

    // Missing `/foo/bar/packages`.
    statSpy.and.callFake(async (uri: Uri) => (uri.path === '/foo/bar/packages') ? missingStat : defStat);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSpy).toHaveBeenCalledTimes(3);

    await resetMatchingFolder('/foo/bar');

    // Missing `/foo/bar/package.json`.
    statSpy.and.callFake(async (uri: Uri) => (uri.path === '/foo/bar/package.json') ? missingStat : defStat);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSpy).toHaveBeenCalledTimes(3);
  });

  it('should have `matches: false` if any of the "landmark" files is of wrong type', async () => {
    const defStat = mockStat(true, true);

    // `/foo/bar/aio/content` is not a directory.
    statSpy.and.callFake(async (uri: Uri) => (uri.path === '/foo/bar/aio/content') ? mockStat(false, true) : defStat);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).not.toHaveBeenCalled();

    await resetMatchingFolder('/foo/bar');

    // `/foo/bar/packages` is not a directory.
    statSpy.and.callFake(async (uri: Uri) => (uri.path === '/foo/bar/packages') ? mockStat(false, true) : defStat);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).not.toHaveBeenCalled();

    await  resetMatchingFolder('/foo/bar');

    // `/foo/bar/package.json` is not a file.
    statSpy.and.callFake(async (uri: Uri) => (uri.path === '/foo/bar/package.json') ? mockStat(true) : defStat);
    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSpy).toHaveBeenCalledTimes(3);
    expect(readFileSpy).not.toHaveBeenCalled();
  });

  it('should have `matches: false` if the project has the wrong name', async () => {
    readFileSpy.and.callFake(async (uri: Uri) =>
      `{\n  "name": "${(uri.path === '/foo/bar/package.json') ? 'not-' : ''}angular-srcs"\n}`);

    await onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(readFileSpy).toHaveBeenCalledWith(Uri.file('/foo/bar/package.json'));
  });
});

// Helpers
function setMockWsFolders(paths: string[] | undefined): void {
  (workspace.workspaceFolders as any) = paths && paths.map(path =>
    new MockWorkspaceFolder(path) as unknown as WorkspaceFolder);
}
