import {OutputChannel, window} from 'vscode';
import {Logger, logger} from '../../../shared/logger';


describe('Logger', () => {
  const mockDate = new Date('2019-02-08T12:12:12.000Z');
  let instance: Logger;
  let channel: OutputChannel;

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(mockDate);

    const createOutputChannelSpy = spyOn(window, 'createOutputChannel').and.callThrough();

    instance = new Logger();
    channel = createOutputChannelSpy.calls.first().returnValue;
  });

  afterEach(() => jasmine.clock().uninstall());

  describe('constructor()', () => {
    it('should create a dedicated `OutputChannel`', () => {
      expect(channel.name).toBe('Angular.io Documentation Utilities');
    });
  });

  describe('dispose()', () => {
    let logSpy: jasmine.Spy;

    beforeEach(() => logSpy = spyOn(instance, 'log'));

    it('should log a message', () => {
      instance.dispose();
      expect(logSpy).toHaveBeenCalledWith('Disposing Logger...');
    });

    it('should dispose of the `OutputChannel` when being itself disposed of', () => {
      const disposeSpy = spyOn(channel, 'dispose');

      instance.dispose();
      expect(disposeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('error()', () => {
    let errorSpy: jasmine.Spy;
    let appendLineSpy: jasmine.Spy;

    beforeEach(() => {
      errorSpy = spyOn(console, 'error');
      appendLineSpy = spyOn(channel, 'appendLine');
    });

    it('should call `console.error()` (and prepend the timestamp and package name)', () => {
      instance.error('foo', {bar: 'baz'});
      expect(errorSpy).toHaveBeenCalledWith('[2019-02-08T12:12:12.000Z] aio-docs-utils:', 'foo', {bar: 'baz'});
    });

    it('should add a line to the `OutputChannel` (and prepend the timestamp)', () => {
      instance.error('foo', {bar: 'baz', toString() { return JSON.stringify(this); }});
      expect(appendLineSpy).toHaveBeenCalledWith('[2019-02-08T12:12:12.000Z] ERROR: foo {"bar":"baz"}');
    });
  });

  describe('log()', () => {
    let logSpy: jasmine.Spy;
    let appendLineSpy: jasmine.Spy;

    beforeEach(() => {
      logSpy = spyOn(console, 'log');
      appendLineSpy = spyOn(channel, 'appendLine');
    });

    it('should call `console.log()` (and prepend the timestamp and package name)', () => {
      instance.log('foo', {bar: 'baz'});
      expect(logSpy).toHaveBeenCalledWith('[2019-02-08T12:12:12.000Z] aio-docs-utils:', 'foo', {bar: 'baz'});
    });

    it('should add a line to the `OutputChannel` (and prepend the timestamp)', () => {
      instance.log('foo', {bar: 'baz', toString() { return JSON.stringify(this); }});
      expect(appendLineSpy).toHaveBeenCalledWith('[2019-02-08T12:12:12.000Z] foo {"bar":"baz"}');
    });
  });
});

describe('logger', () => {
  it('should be a `Logger` instance', () => {
    expect(logger).toEqual(jasmine.any(Logger));
  });
});
