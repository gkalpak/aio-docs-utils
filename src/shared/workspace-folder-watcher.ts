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
