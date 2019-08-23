import {FileStat as VscodeFileStat, FileType, Uri, workspace} from 'vscode';
import {FileStat, FileSystem, fileSystem} from '../../../shared/file-system';
import {reversePromise} from '../../helpers/test-utils';


describe('FileStat', () => {
  // Helpers
  const vscodeStat = (type: FileType, ctime = 1, mtime = 2, size = 3): VscodeFileStat => ({type, ctime, mtime, size});
  const fileStat = (...args: Parameters<typeof vscodeStat>): FileStat => new FileStat(vscodeStat(...args));

  it('should implement `vscode.FileStat`', () => {
    const vStat = vscodeStat(FileType.SymbolicLink, 1000, 2000, 3000);
    const fStat = new FileStat(vStat);

    expect(fStat.type).toBe(vStat.type);
    expect(fStat.ctime).toBe(vStat.ctime);
    expect(fStat.mtime).toBe(vStat.mtime);
    expect(fStat.size).toBe(vStat.size);
  });

  describe('isDirectory()', () => {
    it('should return `true` for directories', () => {
      expect(fileStat(FileType.Directory).isDirectory()).toBe(true);
    });

    it('should return `false` for non-directories', () => {
      expect(fileStat(FileType.Unknown).isDirectory()).toBe(false);
      expect(fileStat(FileType.File).isDirectory()).toBe(false);
      expect(fileStat(FileType.SymbolicLink).isDirectory()).toBe(false);
    });
  });

  describe('isFile()', () => {
    it('should return `true` for files', () => {
      expect(fileStat(FileType.File).isFile()).toBe(true);
    });

    it('should return `false` for non-files', () => {
      expect(fileStat(FileType.Unknown).isFile()).toBe(false);
      expect(fileStat(FileType.Directory).isFile()).toBe(false);
      expect(fileStat(FileType.SymbolicLink).isFile()).toBe(false);
    });
  });
});

describe('FileSystem', () => {
  const wfs = workspace.fs;
  let fs: FileSystem;

  beforeEach(() => fs = new FileSystem());

  describe('exists()', () => {
    const mockStat = new FileStat({type: FileType.Unknown, ctime: 0, mtime: 0, size: 0});
    let statSpy: jasmine.Spy;

    beforeEach(() => statSpy = spyOn(wfs, 'stat').and.returnValue(Promise.resolve(mockStat)));

    it('should call `workspace.fs.stat()` under the hood', async () => {
      await fs.exists('foo.txt');
      expect(statSpy).toHaveBeenCalledWith(Uri.file('foo.txt'));
    });

    it('should return a promise', async () => {
      const promise = fs.exists('foo.txt');

      expect(promise).toEqual(jasmine.any(Promise));
      await promise;
    });

    it('should resolve the promise with `true` if `workspace.fs.stat()` completes successfully', async () => {
      expect(await fs.exists('foo.txt')).toBe(true);
      expect(await fs.exists(Uri.file('bar.txt'))).toBe(true);
    });

    it('should resolve the promise with `false` if `workspace.fs.stat()` completes with error', async () => {
      statSpy.and.returnValue(Promise.reject('Does not exist.'));

      expect(await fs.exists('foo.txt')).toBe(false);
      expect(await fs.exists(Uri.file('bar.txt'))).toBe(false);
    });
  });

  describe('readFile()', () => {
    let readFileSpy: jasmine.Spy;

    beforeEach(() => {
      const mockBytes = Buffer.from('Test content.', 'utf8');
      readFileSpy = spyOn(wfs, 'readFile').and.returnValue(Promise.resolve(mockBytes));
    });

    it('should delegate to `workspace.fs.readFile()`', async () => {
      await fs.readFile('foo.txt');
      expect(readFileSpy).toHaveBeenCalledWith(Uri.file('foo.txt'));
    });

    it('should return a promise', async () => {
      const promise = fs.readFile('foo.txt');

      expect(promise).toEqual(jasmine.any(Promise));
      await promise;
    });

    it('should resolve the promise if `workspace.fs.readFile()` completes successfully', async () => {
      expect(await fs.readFile('foo.txt')).toBe('Test content.');
      expect(await fs.readFile(Uri.file('bar.txt'))).toBe('Test content.');
    });

    it('should reject the promise if `workspace.fs.readFile()` completes with error', async () => {
      readFileSpy.and.returnValue(Promise.reject('Test error.'));

      expect(await reversePromise(fs.readFile('foo.txt'))).toBe('Test error.');
      expect(await reversePromise(fs.readFile(Uri.file('bar.txt')))).toBe('Test error.');
    });
  });

  describe('stat()', () => {
    const mockStat = {type: FileType.Unknown, ctime: 0, mtime: 0, size: 0};
    let statSpy: jasmine.Spy;

    beforeEach(() => statSpy = spyOn(wfs, 'stat').and.returnValue(Promise.resolve(mockStat)));

    it('should delegate to `workspace.fs.stat()`', async () => {
      await fs.stat('foo.txt');
      expect(statSpy).toHaveBeenCalledWith(Uri.file('foo.txt'));
    });

    it('should return a promise', async () => {
      const promise = fs.stat('foo.txt');

      expect(promise).toEqual(jasmine.any(Promise));
      await promise;
    });

    it('should resolve the promise if `workspace.fs.stat()` completes successfully', async () => {
      expect(await fs.stat('foo.txt')).toEqual(new FileStat(mockStat));
      expect(await fs.stat(Uri.file('bar.txt'))).toEqual(new FileStat(mockStat));
    });

    it('should reject the promise if `workspace.fs.stat()` completes with error', async () => {
      statSpy.and.returnValue(Promise.reject('Test error.'));

      expect(await reversePromise(fs.stat('foo.txt'))).toBe('Test error.');
      expect(await reversePromise(fs.stat(Uri.file('bar.txt')))).toBe('Test error.');
    });
  });
});

describe('fileSystem', () => {
  it('should be a `FileSystem` instance', () => {
    expect(fileSystem).toEqual(jasmine.any(FileSystem));
  });
});
