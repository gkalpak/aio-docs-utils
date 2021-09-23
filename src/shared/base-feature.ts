import {Disposable, ExtensionContext} from 'vscode';
import {logger} from './logger';


export class BaseFeature implements Disposable {
  public static activate(context: ExtensionContext): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const Feature = this;
    logger.log(`Activating ${Feature.name}...`);

    const featureInstance = new Feature();
    context.subscriptions.push(featureInstance);
  }

  protected readonly disposables: Disposable[] = [];

  public dispose(): void {
    logger.log(`Disposing ${this.constructor.name}...`);
    this.disposables.forEach(d => d.dispose());
  }
}
