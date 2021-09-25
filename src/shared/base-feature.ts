import {Disposable, ExtensionContext} from 'vscode';
import {logger} from './logger';


export class BaseFeature implements Disposable {
  protected static readonly _displayName: string = '';

  public static activate(context: ExtensionContext): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const Feature = this;
    logger.log(`Activating ${this.getFeatureName(Feature)}...`);

    const featureInstance = new Feature();
    context.subscriptions.push(featureInstance);
  }

  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-this-alias
  private static getFeatureName(Feature: Function): string {
    return (Feature === BaseFeature) ?
      'BaseFeature' :
      ((Feature as typeof BaseFeature)._displayName || Feature.name || 'UnknownFeature');
  }

  protected readonly disposables: Disposable[] = [];

  public dispose(): void {
    logger.log(`Disposing ${BaseFeature.getFeatureName(this.constructor)}...`);
    this.disposables.forEach(d => d.dispose());
  }
}
