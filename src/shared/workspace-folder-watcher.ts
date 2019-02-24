import {existsSync, readFileSync, statSync} from 'fs';
import {Disposable, workspace, WorkspaceFolder} from 'vscode';
import {logger} from './logger';


export class WorkspaceFolderWatcher implements Disposable {
  public get matches(): boolean { return this._matches; }
  private _matches = false;
  private readonly disposables: Disposable[] = [];

  constructor(private readonly id: string, private readonly isOfInterest: (folder: WorkspaceFolder) => boolean) {
    this.disposables.push(workspace.onDidChangeWorkspaceFolders(() => this.updateMatches()));
    this.updateMatches();
  }

  public dispose(): void {
    logger.log(`Disposing ${this}...`);
    this.disposables.forEach(d => d.dispose());
  }

  public toString(): string {
    return `${this.constructor.name}(${this.id})`;
  }

  protected updateMatches(): void {
    const matches = this._matches = !!workspace.workspaceFolders && workspace.workspaceFolders.some(this.isOfInterest);
    logger.log(`${this}: Workspace ${matches ? 'matches' : 'does not match'} criteria.`);
  }
}

export const isNgProjectWatcher = new WorkspaceFolderWatcher('isAngularProject', folder => {
  const landmarks = [
    folder.uri.with({path: `${folder.uri.path}/aio/content`}),
    folder.uri.with({path: `${folder.uri.path}/packages`}),
    folder.uri.with({path: `${folder.uri.path}/package.json`}),
  ].map(l => l.fsPath);
  const landmarkTypes = landmarks.every(p => existsSync(p)) && landmarks.map(p => statSync(p));

  return landmarkTypes && landmarkTypes[0].isDirectory() && landmarkTypes[1].isDirectory() &&
    landmarkTypes[2].isFile() && (JSON.parse(readFileSync(landmarks[2], 'utf8')).name === 'angular-srcs');
});
