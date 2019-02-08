import {Logger, logger} from '../../../shared/logger';


describe('Logger', () => {
  describe('error()', () => {
    let errorSpy: jasmine.Spy;

    beforeEach(() => errorSpy = spyOn(console, 'error'));

    it('should call `console.error()` (and prepend the package name)', () => {
      logger.error('foo', {bar: 'baz'});
      expect(errorSpy).toHaveBeenCalledWith('[aio-docs-utils]', 'foo', {bar: 'baz'});
    });
  });

  describe('log()', () => {
    let logSpy: jasmine.Spy;

    beforeEach(() => logSpy = spyOn(console, 'log'));

    it('should call `console.log()` (and prepend the package name)', () => {
      logger.log('foo', {bar: 'baz'});
      expect(logSpy).toHaveBeenCalledWith('[aio-docs-utils]', 'foo', {bar: 'baz'});
    });
  });
});

describe('logger', () => {
  it('should be a `Logger` instance', () => {
    expect(logger).toEqual(jasmine.any(Logger));
  });
});
