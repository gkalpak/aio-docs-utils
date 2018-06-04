'use strict';
import * as vsc from 'vscode';
import {logger} from './logger';


export const activate = (context: vsc.ExtensionContext) => {
  logger.log('Activated.');
};

export const deactivate = () => {
  logger.log('Deactivated.');
};
