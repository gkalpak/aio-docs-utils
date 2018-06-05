export class LruCache<TKey, TValue> {
  public get size(): number { return this.values.size; }
  private readonly values = new Map<TKey, Timestamped<TValue>>();

  constructor(public readonly capacity = 10) {
  }

  public clear(): void {
    for (const key of this.values.keys()) {
      this.delete(key);
    }
  }

  public delete(key: TKey): boolean {
    return this.values.delete(key);
  }

  public get(key: TKey): TValue | undefined {
    const tValue = this.values.get(key);
    return tValue && tValue.data;
  }

  public has(key: TKey): boolean {
    return this.values.has(key);
  }

  public set(key: TKey, value: TValue): void {
    this.values.set(key, new Timestamped(value));

    if (this.size > this.capacity) {
      this.removeLeastRecentlyUsed();
    }
  }

  private removeLeastRecentlyUsed(): boolean {
    if (!this.size) {
      return false;
    }

    let lruTs = Date.now();
    let lruKey!: TKey;

    for (const [key, tValue] of this.values) {
      if (tValue.timestamp < lruTs) {
        lruTs = tValue.timestamp;
        lruKey = key;
      }
    }

    return this.delete(lruKey);
  }
}

class Timestamped<T> {
  public timestamp!: number;
  public get data(): T {
    this.touch();
    return this._data;
  }

  constructor(private readonly _data: T) {
    this.touch();
  }

  private touch(): void {
    this.timestamp = Date.now();
  }
}
