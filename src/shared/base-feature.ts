import {Disposable, ExtensionContext} from 'vscode';
import {logger} from './logger';


export class BaseFeature implements Disposable {
  protected readonly disposables: Disposable[] = [];

  public static activate(context: ExtensionContext): void {
    const Feature = this;
    logger.log(`Activating ${Feature.name}...`);

    const featureInstance = new Feature();
    context.subscriptions.push(featureInstance);
  }

  public dispose(): void {
    logger.log(`Disposing ${this.constructor.name}...`);
    this.disposables.forEach(d => d.dispose());
  }
}
