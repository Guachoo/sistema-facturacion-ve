// FASE 9: Sistema de Cache Inteligente para Optimización de Rendimiento

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  hits: number;
  lastAccess: number;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
  lastCleanup: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableStats: boolean;
  compressionThreshold: number;
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats;
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 500,
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      cleanupInterval: 2 * 60 * 1000, // 2 minutos
      enableStats: true,
      compressionThreshold: 10000, // 10KB
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0,
      lastCleanup: Date.now()
    };

    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private updateStats() {
    if (!this.config.enableStats) return;

    this.stats.size = this.cache.size;
    this.stats.hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;

    // Estimar uso de memoria
    let memoryUsage = 0;
    this.cache.forEach(entry => {
      memoryUsage += JSON.stringify(entry.data).length;
    });
    this.stats.memoryUsage = memoryUsage;
  }

  private shouldCompress(data: any): boolean {
    const size = JSON.stringify(data).length;
    return size > this.config.compressionThreshold;
  }

  private compressData(data: any): string {
    // Simulación de compresión - en producción usar biblioteca como lz-string
    return JSON.stringify(data);
  }

  private decompressData(compressed: string): any {
    return JSON.parse(compressed);
  }

  private evictLeastUsed() {
    if (this.cache.size <= this.config.maxSize) return;

    // Ordenar por prioridad y uso
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        const priorityWeight = { low: 1, medium: 2, high: 3 };
        const aPriority = priorityWeight[a[1].priority];
        const bPriority = priorityWeight[b[1].priority];

        if (aPriority !== bPriority) {
          return aPriority - bPriority; // Prioridad baja primero
        }

        // Si misma prioridad, por último acceso
        return a[1].lastAccess - b[1].lastAccess;
      });

    // Eliminar 20% de las entradas menos usadas
    const toRemove = Math.ceil(this.cache.size * 0.2);
    for (let i = 0; i < toRemove && entries[i]; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
      tags?: string[];
    } = {}
  ): void {
    const now = Date.now();
    const ttl = options.ttl || this.config.defaultTTL;

    const entry: CacheEntry<T> = {
      data: this.shouldCompress(data) ? this.compressData(data) as any : data,
      timestamp: now,
      expiry: now + ttl,
      hits: 0,
      lastAccess: now,
      priority: options.priority || 'medium',
      tags: options.tags || []
    };

    this.cache.set(key, entry);
    this.evictLeastUsed();
    this.updateStats();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    const now = Date.now();

    // Verificar si expiró
    if (now > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return null;
    }

    // Actualizar estadísticas de acceso
    entry.hits++;
    entry.lastAccess = now;
    this.stats.hits++;
    this.updateStats();

    // Descomprimir si es necesario
    const data = typeof entry.data === 'string' && this.shouldCompress(entry.data)
      ? this.decompressData(entry.data)
      : entry.data;

    return data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.updateStats();
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.updateStats();
  }

  invalidateByTag(tag: string): number {
    let deleted = 0;
    this.cache.forEach((entry, key) => {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        deleted++;
      }
    });
    this.updateStats();
    return deleted;
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    });

    this.stats.lastCleanup = now;
    this.updateStats();

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  getMemoryUsage(): string {
    const bytes = this.stats.memoryUsage;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Método para obtener las entradas más populares
  getPopularEntries(limit: number = 10): Array<{ key: string; hits: number; priority: string }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits,
        priority: entry.priority
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}

// Cache global para diferentes tipos de datos
const cacheInstances = {
  // Cache para consultas de usuarios (alta prioridad, TTL largo)
  users: new SmartCache({
    maxSize: 100,
    defaultTTL: 10 * 60 * 1000, // 10 minutos
    enableStats: true
  }),

  // Cache para facturas (prioridad media, TTL medio)
  invoices: new SmartCache({
    maxSize: 300,
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    enableStats: true
  }),

  // Cache para clientes (prioridad media, TTL largo)
  customers: new SmartCache({
    maxSize: 200,
    defaultTTL: 15 * 60 * 1000, // 15 minutos
    enableStats: true
  }),

  // Cache para reportes (baja prioridad, TTL corto)
  reports: new SmartCache({
    maxSize: 50,
    defaultTTL: 2 * 60 * 1000, // 2 minutos
    enableStats: true
  }),

  // Cache para configuraciones (alta prioridad, TTL muy largo)
  config: new SmartCache({
    maxSize: 50,
    defaultTTL: 30 * 60 * 1000, // 30 minutos
    enableStats: true
  })
};

// Helper functions para usar con React Query
export const createCacheKey = (prefix: string, params: Record<string, any>): string => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);

  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

export const getCacheKeyTags = (key: string): string[] => {
  const [prefix] = key.split(':');
  return [prefix, 'all'];
};

// Hooks para usar el cache con React Query
export const useCacheOptimization = () => {
  return {
    setCache: <T>(type: keyof typeof cacheInstances, key: string, data: T, options?: any) => {
      cacheInstances[type].set(key, data, options);
    },

    getCache: <T>(type: keyof typeof cacheInstances, key: string): T | null => {
      return cacheInstances[type].get<T>(key);
    },

    invalidateCache: (type: keyof typeof cacheInstances, tag?: string) => {
      if (tag) {
        return cacheInstances[type].invalidateByTag(tag);
      } else {
        cacheInstances[type].clear();
      }
    },

    getCacheStats: (type?: keyof typeof cacheInstances) => {
      if (type) {
        return cacheInstances[type].getStats();
      }

      // Estadísticas combinadas
      const allStats = Object.entries(cacheInstances).map(([name, cache]) => ({
        name,
        ...cache.getStats()
      }));

      return {
        total: allStats.reduce((acc, stats) => ({
          hits: acc.hits + stats.hits,
          misses: acc.misses + stats.misses,
          size: acc.size + stats.size,
          memoryUsage: acc.memoryUsage + stats.memoryUsage
        }), { hits: 0, misses: 0, size: 0, memoryUsage: 0 }),
        byType: allStats
      };
    },

    getMemoryUsage: () => {
      return Object.entries(cacheInstances).map(([name, cache]) => ({
        name,
        usage: cache.getMemoryUsage(),
        stats: cache.getStats()
      }));
    }
  };
};

// Cache específico para consultas frecuentes
export const frequentQueryCache = new SmartCache({
  maxSize: 1000,
  defaultTTL: 3 * 60 * 1000, // 3 minutos
  enableStats: true,
  compressionThreshold: 5000
});

export { SmartCache, cacheInstances };
export type { CacheEntry, CacheStats, CacheConfig };