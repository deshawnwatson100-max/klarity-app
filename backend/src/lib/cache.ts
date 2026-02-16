/**
 * Simple in-memory cache with TTL for preventing duplicate rapid requests
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TTLCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;

  constructor(defaultTTLMs: number = 60000) {
    this.defaultTTL = defaultTTLMs;
    // Cleanup expired entries every 30 seconds
    setInterval(() => this.cleanup(), 30000);
  }

  set(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  size(): number {
    return this.cache.size;
  }
}

// Response cache for preventing duplicate requests (TTL: 60s)
export const responseCache = new TTLCache<{
  response: string;
  parsedJson: unknown;
  timestamp: number;
}>(60000);

// In-flight request tracking to prevent duplicate concurrent requests
export const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Generate a cache key from request parameters
 */
export function generateCacheKey(
  userId: string,
  text: string,
  mode: string
): string {
  // Simple hash function for cache key
  const input = `${userId}:${text.substring(0, 200)}:${mode}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `cache_${hash.toString(36)}`;
}
