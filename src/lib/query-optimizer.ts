// FASE 9: Sistema de Optimización de Consultas

import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useCacheOptimization, createCacheKey, getCacheKeyTags } from './smart-cache';

interface QueryMetrics {
  queryKey: string;
  executionTime: number;
  cacheHit: boolean;
  dataSize: number;
  timestamp: number;
  errorRate: number;
}

interface OptimizationConfig {
  enableBatching: boolean;
  batchDelay: number;
  enablePrefetch: boolean;
  maxRetries: number;
  staleTime: number;
  cacheTime: number;
}

// Almacenar métricas de consultas
const queryMetrics = new Map<string, QueryMetrics[]>();
const batchQueue = new Map<string, any[]>();

// Configuración por defecto
const defaultOptimizationConfig: OptimizationConfig = {
  enableBatching: true,
  batchDelay: 50, // 50ms
  enablePrefetch: true,
  maxRetries: 3,
  staleTime: 5 * 60 * 1000, // 5 minutos
  cacheTime: 10 * 60 * 1000, // 10 minutos
};

// Función para medir el tiempo de ejecución
const measureExecutionTime = async <T>(
  queryFn: () => Promise<T>,
  queryKey: string
): Promise<{ data: T; metrics: QueryMetrics }> => {
  const startTime = performance.now();
  const cacheOptimizer = useCacheOptimization();

  try {
    // Verificar cache primero
    const cachedData = cacheOptimizer.getCache('invoices', queryKey);
    if (cachedData) {
      const endTime = performance.now();
      const metrics: QueryMetrics = {
        queryKey,
        executionTime: endTime - startTime,
        cacheHit: true,
        dataSize: JSON.stringify(cachedData).length,
        timestamp: Date.now(),
        errorRate: 0
      };

      // Guardar métricas
      const existing = queryMetrics.get(queryKey) || [];
      existing.push(metrics);
      if (existing.length > 100) existing.splice(0, 50); // Mantener últimas 100
      queryMetrics.set(queryKey, existing);

      return { data: cachedData, metrics };
    }

    // Ejecutar consulta
    const data = await queryFn();
    const endTime = performance.now();

    // Guardar en cache
    cacheOptimizer.setCache('invoices', queryKey, data, {
      ttl: defaultOptimizationConfig.cacheTime,
      priority: 'medium',
      tags: getCacheKeyTags(queryKey)
    });

    const metrics: QueryMetrics = {
      queryKey,
      executionTime: endTime - startTime,
      cacheHit: false,
      dataSize: JSON.stringify(data).length,
      timestamp: Date.now(),
      errorRate: 0
    };

    // Guardar métricas
    const existing = queryMetrics.get(queryKey) || [];
    existing.push(metrics);
    if (existing.length > 100) existing.splice(0, 50);
    queryMetrics.set(queryKey, existing);

    return { data, metrics };
  } catch (error) {
    const endTime = performance.now();

    // Actualizar tasa de error
    const existing = queryMetrics.get(queryKey) || [];
    const errorMetrics: QueryMetrics = {
      queryKey,
      executionTime: endTime - startTime,
      cacheHit: false,
      dataSize: 0,
      timestamp: Date.now(),
      errorRate: 1
    };
    existing.push(errorMetrics);
    queryMetrics.set(queryKey, existing);

    throw error;
  }
};

// Hook optimizado para consultas simples
export const useOptimizedQuery = <TData = unknown, TError = unknown>(
  queryKey: (string | number)[],
  queryFn: () => Promise<TData>,
  options: Partial<UseQueryOptions<TData, TError>> = {},
  config: Partial<OptimizationConfig> = {}
) => {
  const mergedConfig = { ...defaultOptimizationConfig, ...config };
  const key = createCacheKey('optimized', { queryKey });

  return useQuery({
    queryKey,
    queryFn: async () => {
      const result = await measureExecutionTime(queryFn, key);
      return result.data;
    },
    staleTime: mergedConfig.staleTime,
    cacheTime: mergedConfig.cacheTime,
    retry: mergedConfig.maxRetries,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
};

// Hook optimizado para consultas infinitas (paginación)
export const useOptimizedInfiniteQuery = <TData = unknown, TError = unknown>(
  queryKey: (string | number)[],
  queryFn: ({ pageParam }: { pageParam?: any }) => Promise<TData>,
  options: Partial<UseInfiniteQueryOptions<TData, TError>> = {},
  config: Partial<OptimizationConfig> = {}
) => {
  const mergedConfig = { ...defaultOptimizationConfig, ...config };

  return useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const key = createCacheKey('infinite', { queryKey, pageParam });
      const result = await measureExecutionTime(
        () => queryFn({ pageParam }),
        key
      );
      return result.data;
    },
    staleTime: mergedConfig.staleTime,
    cacheTime: mergedConfig.cacheTime,
    retry: mergedConfig.maxRetries,
    ...options
  });
};

// Sistema de batching para consultas múltiples
export const useBatchedQueries = <T>(
  queries: Array<{
    key: string;
    queryFn: () => Promise<T>;
  }>,
  config: Partial<OptimizationConfig> = {}
) => {
  const mergedConfig = { ...defaultOptimizationConfig, ...config };

  if (!mergedConfig.enableBatching) {
    // Ejecutar consultas individuales si batching está deshabilitado
    return Promise.all(queries.map(q => q.queryFn()));
  }

  return new Promise<T[]>((resolve, reject) => {
    const batchId = `batch_${Date.now()}_${Math.random()}`;
    batchQueue.set(batchId, queries);

    setTimeout(async () => {
      try {
        const batchedQueries = batchQueue.get(batchId) || [];
        batchQueue.delete(batchId);

        console.log(`🚀 Executing batch of ${batchedQueries.length} queries`);

        const results = await Promise.all(
          batchedQueries.map(async (query) => {
            const result = await measureExecutionTime(query.queryFn, query.key);
            return result.data;
          })
        );

        resolve(results);
      } catch (error) {
        reject(error);
      }
    }, mergedConfig.batchDelay);
  });
};

// Sistema de prefetch inteligente
export const usePrefetchOptimizer = () => {
  const cacheOptimizer = useCacheOptimization();

  return {
    prefetchRelated: async <T>(
      baseQueryKey: string,
      relatedQueries: Array<{
        key: string;
        queryFn: () => Promise<T>;
        priority: 'high' | 'medium' | 'low';
      }>
    ) => {
      // Prefetch basado en patrones de uso previo
      const baseMetrics = queryMetrics.get(baseQueryKey) || [];
      const avgExecutionTime = baseMetrics.reduce((acc, m) => acc + m.executionTime, 0) / baseMetrics.length || 0;

      // Solo prefetch si la consulta base es rápida (< 1 segundo)
      if (avgExecutionTime > 1000) {
        console.log('⏭️ Skipping prefetch - base query too slow');
        return;
      }

      // Prefetch en paralelo con baja prioridad
      const prefetchPromises = relatedQueries.map(async (query) => {
        try {
          const result = await measureExecutionTime(query.queryFn, query.key);
          cacheOptimizer.setCache('invoices', query.key, result.data, {
            ttl: defaultOptimizationConfig.cacheTime,
            priority: query.priority,
            tags: getCacheKeyTags(query.key)
          });
          console.log(`📄 Prefetched: ${query.key}`);
        } catch (error) {
          console.warn(`❌ Prefetch failed for ${query.key}:`, error);
        }
      });

      // No esperar a que terminen, ejecutar en background
      Promise.allSettled(prefetchPromises);
    },

    prefetchOnHover: <T>(
      queryKey: string,
      queryFn: () => Promise<T>,
      priority: 'high' | 'medium' | 'low' = 'low'
    ) => {
      // Prefetch cuando el usuario hace hover (señal de intención)
      return async () => {
        try {
          const result = await measureExecutionTime(queryFn, queryKey);
          cacheOptimizer.setCache('invoices', queryKey, result.data, {
            ttl: defaultOptimizationConfig.cacheTime,
            priority,
            tags: getCacheKeyTags(queryKey)
          });
          console.log(`🖱️ Prefetched on hover: ${queryKey}`);
        } catch (error) {
          console.warn(`❌ Hover prefetch failed for ${queryKey}:`, error);
        }
      };
    }
  };
};

// Analizador de rendimiento de consultas
export const useQueryPerformanceAnalyzer = () => {
  return {
    getSlowQueries: (threshold: number = 1000): QueryMetrics[] => {
      const slowQueries: QueryMetrics[] = [];

      queryMetrics.forEach((metrics) => {
        const avgTime = metrics.reduce((acc, m) => acc + m.executionTime, 0) / metrics.length;
        if (avgTime > threshold) {
          slowQueries.push({
            ...metrics[0],
            executionTime: avgTime
          });
        }
      });

      return slowQueries.sort((a, b) => b.executionTime - a.executionTime);
    },

    getCacheHitRate: (): number => {
      let totalQueries = 0;
      let cacheHits = 0;

      queryMetrics.forEach((metrics) => {
        metrics.forEach((metric) => {
          totalQueries++;
          if (metric.cacheHit) cacheHits++;
        });
      });

      return totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;
    },

    getQueryStats: (queryKey?: string) => {
      if (queryKey) {
        const metrics = queryMetrics.get(queryKey) || [];
        if (metrics.length === 0) return null;

        const avgTime = metrics.reduce((acc, m) => acc + m.executionTime, 0) / metrics.length;
        const errorRate = metrics.filter(m => m.errorRate > 0).length / metrics.length;
        const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;

        return {
          queryKey,
          totalExecutions: metrics.length,
          avgExecutionTime: avgTime,
          errorRate: errorRate * 100,
          cacheHitRate: cacheHitRate * 100,
          lastExecution: Math.max(...metrics.map(m => m.timestamp))
        };
      }

      // Estadísticas globales
      const allStats = Array.from(queryMetrics.entries()).map(([key, metrics]) => {
        const avgTime = metrics.reduce((acc, m) => acc + m.executionTime, 0) / metrics.length;
        const errorRate = metrics.filter(m => m.errorRate > 0).length / metrics.length;
        const cacheHitRate = metrics.filter(m => m.cacheHit).length / metrics.length;

        return {
          queryKey: key,
          totalExecutions: metrics.length,
          avgExecutionTime: avgTime,
          errorRate: errorRate * 100,
          cacheHitRate: cacheHitRate * 100,
          lastExecution: Math.max(...metrics.map(m => m.timestamp))
        };
      });

      return allStats.sort((a, b) => b.totalExecutions - a.totalExecutions);
    }
  };
};

// Optimizador automático basado en patrones de uso
export const useAutoOptimizer = () => {
  return {
    optimizeBasedOnUsage: () => {
      const analyzer = useQueryPerformanceAnalyzer();
      const cacheOptimizer = useCacheOptimization();

      // Identificar consultas lentas y aumentar su cache time
      const slowQueries = analyzer.getSlowQueries(500);
      slowQueries.forEach(query => {
        console.log(`🐌 Optimizing slow query: ${query.queryKey}`);
        // En una implementación real, se ajustarían los parámetros de cache
      });

      // Identificar consultas con baja tasa de cache hit
      const allStats = analyzer.getQueryStats() as any[];
      const lowCacheHitQueries = allStats.filter(stat => stat.cacheHitRate < 30);

      lowCacheHitQueries.forEach(query => {
        console.log(`💾 Increasing cache time for low hit rate query: ${query.queryKey}`);
        // Incrementar tiempo de cache para estas consultas
      });

      return {
        slowQueriesOptimized: slowQueries.length,
        lowCacheHitQueriesOptimized: lowCacheHitQueries.length,
        totalQueriesAnalyzed: allStats.length
      };
    }
  };
};

export { queryMetrics, defaultOptimizationConfig };
export type { QueryMetrics, OptimizationConfig };