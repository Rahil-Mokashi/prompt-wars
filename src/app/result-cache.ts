/** Bounded in-memory cache that evicts the least recently used entry. */
export class ResultCache<V> {
  private readonly entries = new Map<string, V>();

  /**
   * @param maxEntries - most entries kept before the least recently used is evicted
   */
  constructor(private readonly maxEntries: number) {}

  /** Number of entries currently stored. */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Reads an entry and marks it as most recently used.
   * @param key - cache key
   * @returns the value, or undefined when absent
   */
  get(key: string): V | undefined {
    const value = this.entries.get(key);
    if (value === undefined) return undefined;
    this.entries.delete(key);
    this.entries.set(key, value);
    return value;
  }

  /**
   * Stores an entry as most recently used, evicting the oldest when full.
   * @param key - cache key
   * @param value - value to store
   */
  set(key: string, value: V): void {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (!oldest.done) this.entries.delete(oldest.value);
    }
    this.entries.set(key, value);
  }
}
