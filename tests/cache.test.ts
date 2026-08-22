import { describe, it, expect } from 'bun:test';
import { LRUCache } from '../src/cache';
import type { CachedBrief } from '../src/types';

describe('LRU Cache', () => {
  it('stores and retrieves items correctly', () => {
    const cache = new LRUCache<string, string>(3);
    cache.set('/page-1', 'Brief 1');
    cache.set('/page-2', 'Brief 2');

    expect(cache.get('/page-1')).toBe('Brief 1');
    expect(cache.get('/page-2')).toBe('Brief 2');
    expect(cache.get('/page-3')).toBeUndefined();
    expect(cache.has('/page-1')).toBe(true);
    expect(cache.has('/page-3')).toBe(false);
    expect(cache.size).toBe(2);
  });

  it('evicts the least recently used item when capacity is exceeded', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Evicts 'a' when 'd' is inserted
    cache.set('d', 4);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
    expect(cache.size).toBe(3);
  });

  it('updates recency when an existing item is accessed via get', () => {
    const cache = new LRUCache<string, string>(3);
    cache.set('a', 'valA');
    cache.set('b', 'valB');
    cache.set('c', 'valC');

    // Access 'a' to make it most recently used
    expect(cache.get('a')).toBe('valA');

    // Insert 'd', which should now evict 'b' (least recently used)
    cache.set('d', 'valD');

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false); // Evicted!
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('updates recency and value when an existing key is set again', () => {
    const cache = new LRUCache<string, string>(3);
    cache.set('a', 'first');
    cache.set('b', 'second');
    cache.set('c', 'third');

    // Re-set 'a' with new value
    cache.set('a', 'updated');

    // Insert 'd', should evict 'b'
    cache.set('d', 'fourth');

    expect(cache.get('a')).toBe('updated');
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);
    expect(cache.has('d')).toBe(true);
  });

  it('handles item deletion and clearing', () => {
    const cache = new LRUCache<string, string>(5);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');

    expect(cache.delete('k1')).toBe(true);
    expect(cache.delete('non-existent')).toBe(false);
    expect(cache.size).toBe(1);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('k2')).toBeUndefined();
  });

  it('handles dynamic resizing of maxSize', () => {
    const cache = new LRUCache<string, number>(4);
    cache.set('1', 1);
    cache.set('2', 2);
    cache.set('3', 3);
    cache.set('4', 4);

    expect(cache.size).toBe(4);

    // Reduce capacity to 2
    cache.maxSize = 2;
    expect(cache.size).toBe(2);
    // '1' and '2' should be evicted
    expect(cache.has('1')).toBe(false);
    expect(cache.has('2')).toBe(false);
    expect(cache.has('3')).toBe(true);
    expect(cache.has('4')).toBe(true);
  });

  it('caches structured CachedBrief objects without corruption', () => {
    const cache = new LRUCache<string, CachedBrief>(10);
    const brief: CachedBrief = {
      title: 'Documentation',
      summary: 'Comprehensive guide to building edge applications.',
      url: 'https://mysite.com/docs',
      isAiGenerated: true,
      timestamp: Date.now(),
    };

    cache.set(brief.url, brief);
    const retrieved = cache.get(brief.url);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Documentation');
    expect(retrieved?.isAiGenerated).toBe(true);
  });
});
