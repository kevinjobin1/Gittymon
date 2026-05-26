import { SummonCacheEntry, RoastMon } from './types';

const CACHE_KEY = 'summon_cache';

export async function loadSummonCache(kv: KVNamespace): Promise<SummonCacheEntry[]> {
  try {
    const content = await kv.get(CACHE_KEY);
    if (content) return JSON.parse(content);
  } catch (e) {
    console.warn('Failed to read summon cache:', e);
  }
  return [];
}

export async function saveSummonCache(kv: KVNamespace, cache: SummonCacheEntry[]): Promise<void> {
  try {
    await kv.put(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to write summon cache:', e);
  }
}

/** Build a composite key for provider-scoped cache entries. */
function cacheKey(provider: string, username: string): string {
  return `${provider}:${username}`.toLowerCase();
}

export async function addToSummonCache(kv: KVNamespace, provider: string, username: string, resultMon: RoastMon): Promise<void> {
  const cache = await loadSummonCache(kv);
  const key = cacheKey(provider, username);
  const existingIdx = cache.findIndex(e => cacheKey(e.resultMon.provider, e.username) === key);
  if (existingIdx !== -1) cache.splice(existingIdx, 1);
  if (cache.length >= 500) cache.shift();
  cache.push({ username, resultMon, generatedAt: new Date().toISOString() });
  await saveSummonCache(kv, cache);
}

export async function lookupSummonCache(kv: KVNamespace, provider: string, username: string): Promise<RoastMon | null> {
  const cache = await loadSummonCache(kv);
  const key = cacheKey(provider, username);
  const cached = cache.find(e => cacheKey(e.resultMon.provider, e.username) === key);
  return cached ? cached.resultMon : null;
}
