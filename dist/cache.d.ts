/**
 * Generic Least Recently Used (LRU) Cache backed by a JavaScript Map.
 * Provides O(1) time complexity for get and set operations while maintaining
 * access order for automatic eviction when maxSize is reached.
 */
export declare class LRUCache<K, V> {
    private cache;
    private _maxSize;
    constructor(maxSize?: number);
    get maxSize(): number;
    set maxSize(value: number);
    get size(): number;
    /**
     * Retrieves a value from the cache and marks it as most recently used.
     */
    get(key: K): V | undefined;
    /**
     * Sets or updates a value in the cache, marking it as most recently used.
     * Evicts the oldest item if cache size exceeds maxSize.
     */
    set(key: K, value: V): void;
    /**
     * Checks whether an entry exists in the cache without altering its recency.
     */
    has(key: K): boolean;
    /**
     * Deletes a specific entry by key.
     */
    delete(key: K): boolean;
    /**
     * Clears all entries from the cache.
     */
    clear(): void;
    /**
     * Returns all keys in least-to-most recently used order.
     */
    keys(): IterableIterator<K>;
    /**
     * Returns all values in least-to-most recently used order.
     */
    values(): IterableIterator<V>;
    /**
     * Returns all key-value entries in least-to-most recently used order.
     */
    entries(): IterableIterator<[K, V]>;
    private evictToSize;
}
//# sourceMappingURL=cache.d.ts.map