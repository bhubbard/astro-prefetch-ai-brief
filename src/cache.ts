/**
 * Generic Least Recently Used (LRU) Cache backed by a JavaScript Map.
 * Provides O(1) time complexity for get and set operations while maintaining
 * access order for automatic eviction when maxSize is reached.
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private _maxSize: number;

  constructor(maxSize: number = 50) {
    this._maxSize = Math.max(1, maxSize);
    this.cache = new Map<K, V>();
  }

  get maxSize(): number {
    return this._maxSize;
  }

  set maxSize(value: number) {
    this._maxSize = Math.max(1, value);
    this.evictToSize();
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * Retrieves a value from the cache and marks it as most recently used.
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    const value = this.cache.get(key)!;
    // Re-insert to refresh recency order
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Sets or updates a value in the cache, marking it as most recently used.
   * Evicts the oldest item if cache size exceeds maxSize.
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    this.evictToSize();
  }

  /**
   * Checks whether an entry exists in the cache without altering its recency.
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Deletes a specific entry by key.
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns all keys in least-to-most recently used order.
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Returns all values in least-to-most recently used order.
   */
  values(): IterableIterator<V> {
    return this.cache.values();
  }

  /**
   * Returns all key-value entries in least-to-most recently used order.
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  private evictToSize(): void {
    while (this.cache.size > this._maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }
}
