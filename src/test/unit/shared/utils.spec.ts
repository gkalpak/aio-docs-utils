import {CancellationToken} from 'vscode';
import {asPromised, hash, kebabToCamelCase, padStart, unlessCancelledFactory} from '../../../shared/utils';
import {reversePromise} from '../../helpers/test-utils';


describe('utils', () => {
  describe('asPromised()', () => {
    it('should return a new function', () => {
      const fn = () => undefined;
      const newFn = asPromised(fn);

      expect(newFn).toEqual(jasmine.any(Function));
      expect(newFn).not.toBe(fn);
    });

    describe('returned function', () => {
      let originalFnSpy: jasmine.Spy;

      beforeEach(() => originalFnSpy = jasmine.createSpy('originalFn'));

      it('should delegate to the original function (and also pass a callback)', () => {
        const newFn = asPromised(originalFnSpy);
        newFn('foo', 'bar');

        expect(originalFnSpy).toHaveBeenCalledWith('foo', 'bar', jasmine.any(Function));
      });

      it('should allow specifying a context', () => {
        const ctx = {};
        const newFn = asPromised(originalFnSpy, ctx);
        newFn();

        expect(originalFnSpy.calls.mostRecent().object).toBe(ctx);
      });

      it('should return a promise', () => {
        const newFn = asPromised(originalFnSpy);
        const promise = newFn();

        expect(promise).toEqual(jasmine.any(Promise));
      });

      it('should resolve the promise if original function completes successfully', async () => {
        originalFnSpy.and.callFake((cb: (err: any, value?: any) => void) => cb(null, 'foo'));
        const newFn = asPromised(originalFnSpy);

        expect(await newFn()).toBe('foo');
      });

      it('should reject the promise if original function completes with error', async () => {
        originalFnSpy.and.callFake((cb: (err: any, value?: any) => void) => cb('foo'));
        const newFn = asPromised(originalFnSpy);

        expect(await reversePromise(newFn())).toBe('foo');
      });
    });
  });

  describe('kebabToCamelCase()', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamelCase('foo-bar')).toBe('fooBar');
      expect(kebabToCamelCase('-foo-bar')).toBe('FooBar');
    });

    it('should leave non-kebab-cased parts unchanged', () => {
      expect(kebabToCamelCase('FOO_BAR')).toBe('FOO_BAR');
      expect(kebabToCamelCase('foo-barBaz_qux')).toBe('fooBarBaz_qux');
    });
  });

  describe('hash()', () => {
    const FOO_HASHES = {
      md5: 'acbd18db4cc2f85cedef654fccc4a4d8',
      sha1: '0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33',
      sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    };

    it('should hash the input using the specified algorithm', () => {
      expect(hash('foo', 'md5')).toBe(FOO_HASHES.md5);
      expect(hash('foo', 'sha1')).toBe(FOO_HASHES.sha1);
    });

    it('should hash use the `sha256` algorithm by default', () => {
      expect(hash('foo', 'sha256')).toBe(FOO_HASHES.sha256);
    });
  });

  describe('padStart()', () => {
    it('should left-pad the input string', () => {
      expect(padStart('123', 5, '0')).toBe('00123');
    });

    it('should use ` ` as padding by default', () => {
      expect(padStart('abc', 5)).toBe('  abc');
    });

    it('should return the input string as is if it exceeds the specified length', () => {
      expect(padStart('foo & bar', 4)).toBe('foo & bar');
    });
  });

  describe('unlessCancelledFactory()', () => {
    let mockToken: CancellationToken;

    beforeEach(() => mockToken = {isCancellationRequested: false} as any);

    it('should return a function', () => {
      const newFn = unlessCancelledFactory(mockToken);
      expect(newFn).toEqual(jasmine.any(Function));
    });

    describe('returned function', () => {
      let unlessCancelled: (...args: any[]) => any;

      beforeEach(() => unlessCancelled = unlessCancelledFactory(mockToken));

      it('should return a yet another function', () => {
        const originalFn = () => undefined;
        const newFn = unlessCancelled(originalFn);

        expect(newFn).toEqual(jasmine.any(Function));
        expect(newFn).not.toBe(originalFn);
      });

      describe('of returned function', () => {
        let originalFnSpy: jasmine.Spy;
        let newFn: (...args: any[]) => any;

        beforeEach(() => {
          originalFnSpy = jasmine.createSpy('originalFn');
          newFn = unlessCancelled(originalFnSpy);
        });

        it('should delegate to the original function', () => {
          originalFnSpy.and.returnValue('foo');
          const result = newFn('bar');

          expect(originalFnSpy).toHaveBeenCalledWith('bar');
          expect(result).toBe('foo');
        });

        it('should throw if cancellation has been requested for token', () => {
          mockToken.isCancellationRequested = true;
          expect(newFn).toThrowError('Cancelled.');
        });
      });
    });
  });
});
