import * as fs from 'fs';
import {workspace, WorkspaceFolder} from 'vscode';
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

  beforeEach(() => {
    setMockWsFolders(['/foo/bar']);
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

      setMockWsFolders(undefined);
      watcher.updateMatches();
      expect(watcher.matches).toBe(false);

      setMockWsFolders([]);
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

describe('isNgProjectWatcher', () => {
  // Grab the registered listener, before other tests clean up the list (e.g. in a `beforeEach()` block).
  const onDidChangeWorkspaceFoldersListener = workspaceOnDidChangeWorkspaceFoldersListeners[0];
  let existsSyncSpy: jasmine.Spy;
  let readFileSyncSpy: jasmine.Spy;
  let statSyncSpy: jasmine.Spy;

  // Helpers
  const mockStat = (isDirectory = false, isFile = false) => ({isDirectory: () => isDirectory, isFile: () => isFile});
  const resetMatchingFolder = (baseDir: string) => {
    setUpMatchingFolder(baseDir);
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(true);

    existsSyncSpy.calls.reset();
    statSyncSpy.calls.reset();
    readFileSyncSpy.calls.reset();
  };
  const setUpMatchingFolder = (baseDir: string) => {
    existsSyncSpy.and.callFake((path: string) =>
      (path === `fs:${baseDir}/aio/content`) ||
      (path === `fs:${baseDir}/packages`) ||
      (path === `fs:${baseDir}/package.json`));

    statSyncSpy.and.callFake((path: string) => {
      switch (path) {
        case `fs:${baseDir}/aio/content`:
        case `fs:${baseDir}/packages`:
          return mockStat(true);
        case `fs:${baseDir}/package.json`:
          return mockStat(false, true);
        default:
          return mockStat();
      }
    });

    readFileSyncSpy.and.callFake((path: string, encoding?: string) =>
      ((path === `fs:${baseDir}/package.json`) && (encoding === 'utf8')) ? '{"name":"angular-srcs"}' : '');
  };

  beforeEach(() => {
    existsSyncSpy = spyOn(fs, 'existsSync');
    readFileSyncSpy = spyOn(fs, 'readFileSync');
    statSyncSpy = spyOn(fs, 'statSync');

    spyOn(logger, 'log');

    setMockWsFolders(['/foo/bar']);
    resetMatchingFolder('/foo/bar');
  });

  it('should be a `WorkspaceFolderWatcher` instance (with an appropriate ID)', () => {
    expect(isNgProjectWatcher).toEqual(jasmine.any(WorkspaceFolderWatcher));
    expect(isNgProjectWatcher.toString()).toBe('WorkspaceFolderWatcher(isAngularProject)');
  });

  it('should have `matches: true` if the workspace folder matches criteria', () => {
    expect(isNgProjectWatcher.matches).toBe(true);
  });

  it('should have `matches: false` if none of the workspace folders matches criteria', () => {
    setMockWsFolders(['/baz', '/qux']);
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
  });

  it('should have `matches: true` if any of the workspace folders matches criteria', () => {
    setMockWsFolders(['/bax/qux', '/foo/bar']);
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(true);
  });

  it('should have `matches: false` if any of the "landmark" files is missing', () => {
    // Missing `/foo/bar/aio/content`.
    existsSyncSpy.and.callFake((path: string) => path !== 'fs:/foo/bar/aio/content');
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(existsSyncSpy.calls.allArgs().map(args => args[0])).toEqual([
      'fs:/foo/bar/aio/content',
    ]);

    resetMatchingFolder('/foo/bar');

    // Missing `/foo/bar/packages`.
    existsSyncSpy.and.callFake((path: string) => path !== 'fs:/foo/bar/packages');
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(existsSyncSpy.calls.allArgs().map(args => args[0])).toEqual([
      'fs:/foo/bar/aio/content',
      'fs:/foo/bar/packages',
    ]);

    resetMatchingFolder('/foo/bar');

    // Missing `/foo/bar/package.json`.
    existsSyncSpy.and.callFake((path: string) => path !== 'fs:/foo/bar/package.json');
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(existsSyncSpy.calls.allArgs().map(args => args[0])).toEqual([
      'fs:/foo/bar/aio/content',
      'fs:/foo/bar/packages',
      'fs:/foo/bar/package.json',
    ]);
  });

  it('should have `matches: false` if any of the "landmark" files is of wrong type', () => {
    const defStat = mockStat(true, true);

    // `/foo/bar/aio/content` is not a directory.
    statSyncSpy.and.callFake((path: string) => (path === 'fs:/foo/bar/aio/content') ? mockStat(false, true) : defStat);
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSyncSpy).toHaveBeenCalledTimes(3);
    expect(readFileSyncSpy).not.toHaveBeenCalled();

    resetMatchingFolder('/foo/bar');

    // `/foo/bar/packages` is not a directory.
    statSyncSpy.and.callFake((path: string) => (path === 'fs:/foo/bar/packages') ? mockStat(false, true) : defStat);
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSyncSpy).toHaveBeenCalledTimes(3);
    expect(readFileSyncSpy).not.toHaveBeenCalled();

    resetMatchingFolder('/foo/bar');

    // `/foo/bar/package.json` is not a file.
    statSyncSpy.and.callFake((path: string) => (path === 'fs:/foo/bar/package.json') ? mockStat(true) : defStat);
    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(statSyncSpy).toHaveBeenCalledTimes(3);
    expect(readFileSyncSpy).not.toHaveBeenCalled();
  });

  it('should have `matches: false` if the project has the wrong name', () => {
    readFileSyncSpy.and.callFake((path: string) =>
      `{"name":"${(path === 'fs:/foo/bar/package.json') ? 'not-' : ''}angular-srcs"}`);

    onDidChangeWorkspaceFoldersListener();

    expect(isNgProjectWatcher.matches).toBe(false);
    expect(readFileSyncSpy).toHaveBeenCalledWith('fs:/foo/bar/package.json', 'utf8');
  });
});

// Helpers
function setMockWsFolders(paths: string[] | undefined): void {
  (workspace.workspaceFolders as any) = paths && paths.map(path =>
    new MockWorkspaceFolder(path) as unknown as WorkspaceFolder);
}
