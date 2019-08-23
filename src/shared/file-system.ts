// Imports
import {FileStat as VscodeFileStat, FileType, Uri, workspace} from 'vscode';


// A wrapper around `FileStat` objects that exposes additional helper methods.
export class FileStat implements VscodeFileStat {
  public get type(): VscodeFileStat['type'] { return this.stats.type; }
  public get ctime(): VscodeFileStat['ctime'] { return this.stats.ctime; }
  public get mtime(): VscodeFileStat['mtime'] { return this.stats.mtime; }
  public get size(): VscodeFileStat['size'] { return this.stats.size; }

  constructor(private stats: VscodeFileStat) {
  }

  public isDirectory(): boolean {
    return this.type === FileType.Directory;
  }

  public isFile(): boolean {
    return this.type === FileType.File;
  }
}

// A facade to abstract file-system operations to be able to operate on both local and remote files.
export class FileSystem {
  public exists(pathOrUri: string | Uri): Promise<boolean> {
    return this.stat(pathOrUri).then(() => true, () => false);
  }

  public async readFile(pathOrUri: string | Uri): Promise<string> {
    const bytes = await workspace.fs.readFile(this.getUri(pathOrUri));
    return Buffer.from(bytes).toString('utf8');
  }

  public async stat(pathOrUri: string | Uri): Promise<FileStat> {
    const stats = await workspace.fs.stat(this.getUri(pathOrUri));
    return new FileStat(stats);
  }

  private getUri(pathOrUri: string | Uri): Uri {
    return (typeof pathOrUri === 'string') ? Uri.file(pathOrUri) : pathOrUri;
  }
}

export const fileSystem = new FileSystem();
