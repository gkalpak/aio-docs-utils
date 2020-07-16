import {Disposable, workspace, WorkspaceFolder} from 'vscode';
import {FileStat, fileSystem as fs} from './file-system';
import {logger} from './logger';


export class WorkspaceFolderWatcher implements Disposable {
  public get matches(): boolean { return this._matches; }
  public ready: Promise<void>;
  private readonly disposables: Disposable[] = [];
  private _matches = false;

  constructor(
      private readonly id: string,
      private readonly isOfInterest: (folder: WorkspaceFolder) => boolean | Promise<boolean>,
  ) {
    this.disposables.push(workspace.onDidChangeWorkspaceFolders(() => this.updateMatches()));
    this.ready = this.updateMatches();
  }

  public dispose(): void {
    logger.log(`Disposing ${this}...`);
    this.disposables.forEach(d => d.dispose());
  }

  public toString(): string {
    return `${this.constructor.name}(${this.id})`;
  }

  protected async updateMatches(): Promise<void> {
    const matches = this._matches = (workspace.workspaceFolders !== undefined) &&
      (await Promise.all(workspace.workspaceFolders.map(f => this.isOfInterest(f)))).some(x => x);

    logger.log(`${this}: Workspace ${matches ? 'matches' : 'does not match'} criteria.`);
  }
}

export const isNgProjectWatcher = new WorkspaceFolderWatcher('isAngularProject', async folder => {
  const landmarkUris = [
    folder.uri.with({path: `${folder.uri.path}/aio/content`}),
    folder.uri.with({path: `${folder.uri.path}/packages`}),
    folder.uri.with({path: `${folder.uri.path}/package.json`}),
  ];
  const landmarkStats = await Promise.all(landmarkUris.map(u => fs.stat(u).catch(() => null)));

  return allExist(landmarkStats) && landmarkStats[0].isDirectory() && landmarkStats[1].isDirectory() &&
    landmarkStats[2].isFile() && JSON.parse(await fs.readFile(landmarkUris[2])).name === 'angular-srcs';
});

// Helpers
function allExist(stats: (FileStat | null)[]): stats is FileStat[] {
  return stats.every(s => s !== null);
}
