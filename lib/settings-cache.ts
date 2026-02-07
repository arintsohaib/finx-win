/**
 * In-memory cache for global admin settings
 * Prevents redundant database queries during trade settlement
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class SettingsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 30000; // 30 seconds cache TTL

  /**
   * Get a cached value or fetch it using the provided function
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // Return cached value if still valid
    if (cached && now - cached.timestamp < ttl) {
      console.log(`[Settings Cache] HIT for key: ${key}`);
      return cached.value as T;
    }

    // Fetch fresh value
    console.log(`[Settings Cache] MISS for key: ${key}, fetching fresh data`);
    const value = await fetchFn();
    
    this.cache.set(key, {
      value,
      timestamp: now
    });

    return value;
  }

  /**
   * Invalidate a specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[Settings Cache] Invalidated key: ${key}`);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
    console.log('[Settings Cache] Cleared all cache entries');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const settingsCache = new SettingsCache();
