// @ts-check
'use strict';

// Imports
const glob = require('glob');


// Types
/** @typedef {import('webpack').Configuration} Configuration */
/** @typedef {NonNullable<Configuration['context']>} CustomContext */
/** @typedef {{[index: string]: string}} CustomExternals */
/** @typedef {NonNullable<Configuration['resolve']>} CustomResolve */
/**
 * @typedef
 * {Configuration & {context: CustomContext, externals: CustomExternals, resolve: CustomResolve}}
 * BaseConfiguration
 */

// Variables
/** @type BaseConfiguration */
const baseConfig = {
  context: __dirname,
  devtool: 'nosources-source-map',
  externals: {
    '@vscode/test-electron': 'commonjs @vscode/test-electron',
    jasmine: 'commonjs jasmine',
    vscode: 'commonjs vscode',
  },
  mode: 'none',
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.ts$/,
        use: [{loader: 'ts-loader'}],
      },
    ],
  },
  output: {
    filename: '[name].js',
    libraryTarget: 'commonjs',
    path: `${__dirname}/dist`,
  },
  performance: {
    hints: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    mainFields: ['module', 'main'],
  },
  target: 'node',
};

/** @type Configuration */
const extensionConfig = {
  ...baseConfig,
  name: 'extension',
  entry: {
    extension: './src/extension.ts',
  },
};

/** @type Configuration */
const testsUnitConfig = {
  ...baseConfig,
  name: 'testsUnit',
  entry: {
    'test/run-tests-unit': './src/test/run-tests-unit.ts',
    'test/unit/index.spec': glob.sync(`${baseConfig.context}/src/test/unit/**/*.ts`),
  },
  externals: Object.
    fromEntries(Object.
      entries(baseConfig.externals).
      filter(([name]) => name !== 'vscode')),
  resolve: {
    ...baseConfig.resolve,
    alias: {
      ...baseConfig.resolve.alias,
      // `vscode` APIs are only provided when running tests through VSCode (i.e. e2e tests).
      // For "standalone" unit tests, we need to mock them.
      vscode$: `${__dirname}/src/test/helpers/vscode.mock.ts`,
    },
  },
};

/** @type Configuration */
const testsE2eConfig = {
  ...baseConfig,
  name: 'testsE2e',
  entry: {
    'test/e2e/index.spec': glob.sync(`${baseConfig.context}/src/test/e2e/**/*.ts`),
    'test/helpers/e2e-runner': './src/test/helpers/e2e-runner.ts',
    'test/run-tests-e2e': './src/test/run-tests-e2e.ts',
  },
};

// Exports
module.exports = [
  extensionConfig,
  testsUnitConfig,
  testsE2eConfig,
];
