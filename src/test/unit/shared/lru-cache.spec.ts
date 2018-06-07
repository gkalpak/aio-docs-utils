import {LruCache} from '../../../shared/lru-cache';


describe('LruCache', () => {
  let cache: LruCache<any, any>;

  beforeEach(() => cache = new LruCache(3));

  describe('capacity', () => {
    it('should be set to the specified value', () => {
      expect(cache.capacity).toBe(3);
    });

    it('should default to 10', () => {
      cache = new LruCache();
      expect(cache.capacity).toBe(10);
    });
  });

  describe('size', () => {
    it('should return the current size', () => {
      expect(cache.size).toBe(0);

      cache.set('foo', 1);
      cache.set('bar', 2);
      expect(cache.size).toBe(2);

      cache.delete('foo');
      expect(cache.size).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      cache.set('foo', 1);
      cache.set('bar', 2);
      expect(cache.size).toBe(2);

      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('delete()', () => {
    it('should remove the associated entry (and return true)', () => {
      cache.set('foo', 1);
      expect(cache.has('foo')).toBe(true);

      expect(cache.delete('foo')).toBe(true);
      expect(cache.has('foo')).toBe(false);
    });

    it('should do nothing if no associated entry exists (and return false)', () => {
      cache.set('foo', 1);
      expect(cache.size).toBe(1);

      expect(cache.delete('bar')).toBe(false);
      expect(cache.size).toBe(1);
    });
  });

  describe('get()', () => {
    it('should return the associated value', () => {
      cache.set('foo', 1);
      cache.set(NaN, 'NaN');

      expect(cache.get('foo')).toBe(1);
      expect(cache.get(NaN)).toBe('NaN');
    });

    it('should return `undefined` if no associated entry exists', () => {
      expect(cache.get('foo')).toBeUndefined();
    });

    it('should update the associated entry\'s "used" timestamp', () => {
      let mockMillis = 0;
      spyOn(Date, 'now').and.callFake(() => ++mockMillis);

      cache.set('foo', 1);
      cache.set('bar', 2);
      cache.set('baz', 3);
      cache.get('foo');
      cache.set('qux', 4);

      expect(cache.has('foo')).toBe(true);
      expect(cache.has('bar')).toBe(false);
    });
  });

  describe('has()', () => {
    it('should return false if an entry does not exist', () => {
      expect(cache.has('foo')).toBe(false);
      expect(cache.has(NaN)).toBe(false);
    });

    it('should return true if an entry exists', () => {
      cache.set('foo', 1);
      cache.set(NaN, 'NaN');

      expect(cache.has('foo')).toBe(true);
      expect(cache.has(NaN)).toBe(true);
    });
  });

  describe('set()', () => {
    it('should store an entry', () => {
      expect(cache.has('foo')).toBe(false);

      cache.set('foo', null);
      expect(cache.has('foo')).toBe(true);
    });

    it('should keep previous values if size <= capacity', () => {
      cache.set('foo', 1);
      cache.set('bar', 2);
      cache.set('baz', 3);

      expect(cache.size).toBe(3);
      expect(cache.size).toBe(cache.capacity);
    });

    it('should remove the least recently used entry if size > capacity', () => {
      let mockMillis = 0;
      spyOn(Date, 'now').and.callFake(() => ++mockMillis);

      cache.set('foo', 1);
      cache.set('bar', 2);
      cache.set('baz', 3);
      expect(cache.has('foo')).toBe(true);

      cache.set('qux', 4);
      expect(cache.size).toBe(3);
      expect(cache.has('foo')).toBe(false);
      expect(cache.has('qux')).toBe(true);
    });
  });
});
