import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InventoryMovement } from '@/types';

// Supabase configuration
const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

export const useInventoryMovements = (itemId?: string) => {
  return useQuery({
    queryKey: ['inventoryMovements', itemId],
    queryFn: async (): Promise<InventoryMovement[]> => {
      console.log('Fetching inventory movements from Supabase', itemId ? `for item ${itemId}` : 'for all items');

      const url = itemId
        ? `${SUPABASE_URL}/rest/v1/inventory_movements?item_id=eq.${itemId}&order=fecha.desc`
        : `${SUPABASE_URL}/rest/v1/inventory_movements?order=fecha.desc`;

      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching inventory movements:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format from server');
      }

      return data.map(row => ({
        id: row.id,
        itemId: row.item_id,
        tipo: row.tipo,
        cantidad: row.cantidad,
        costoUnitario: row.costo_unitario,
        motivo: row.motivo,
        referencia: row.referencia,
        usuarioId: row.usuario_id,
        fecha: row.fecha,
        stockAnterior: row.stock_anterior,
        stockNuevo: row.stock_nuevo,
        createdAt: row.created_at,
      }));
    },
  });
};

export const useCreateInventoryMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> => {
      console.log('Creating inventory movement in Supabase:', movement);

      const insertData = {
        item_id: movement.itemId,
        tipo: movement.tipo,
        cantidad: movement.cantidad,
        costo_unitario: movement.costoUnitario,
        motivo: movement.motivo,
        referencia: movement.referencia,
        usuario_id: movement.usuarioId,
        fecha: movement.fecha,
        stock_anterior: movement.stockAnterior,
        stock_nuevo: movement.stockNuevo,
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/inventory_movements`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error creating inventory movement:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const created = Array.isArray(data) ? data[0] : data;

      return {
        id: created.id,
        itemId: created.item_id,
        tipo: created.tipo,
        cantidad: created.cantidad,
        costoUnitario: created.costo_unitario,
        motivo: created.motivo,
        referencia: created.referencia,
        usuarioId: created.usuario_id,
        fecha: created.fecha,
        stockAnterior: created.stock_anterior,
        stockNuevo: created.stock_nuevo,
        createdAt: created.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useInventoryStats = () => {
  return useQuery({
    queryKey: ['inventoryStats'],
    queryFn: async () => {
      console.log('Fetching inventory statistics from Supabase');

      // Fetch items with stock information
      const response = await fetch(`${SUPABASE_URL}/rest/v1/items?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error fetching inventory stats');
      }

      const items = await response.json();

      if (!Array.isArray(items)) {
        throw new Error('Invalid response format from server');
      }

      const totalItems = items.length;
      const totalValue = items.reduce((sum, item) => {
        const stock = item.stock_actual || 0;
        const cost = parseFloat(item.costo_promedio) || 0;
        return sum + (stock * cost);
      }, 0);

      const lowStockItems = items.filter(item => {
        const current = item.stock_actual || 0;
        const minimum = item.stock_minimo || 0;
        return current > 0 && current <= minimum;
      }).length;

      const outOfStockItems = items.filter(item => {
        const current = item.stock_actual || 0;
        return current === 0;
      }).length;

      return {
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        averageValue: totalItems > 0 ? totalValue / totalItems : 0
      };
    },
  });
};

export const useInventoryAlerts = () => {
  return useQuery({
    queryKey: ['inventoryAlerts'],
    queryFn: async () => {
      console.log('Fetching inventory alerts from Supabase');

      // Fetch items with stock information
      const response = await fetch(`${SUPABASE_URL}/rest/v1/items?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error fetching inventory alerts');
      }

      const items = await response.json();

      if (!Array.isArray(items)) {
        throw new Error('Invalid response format from server');
      }

      const alerts = [];

      for (const item of items) {
        const stockActual = item.stock_actual || 0;
        const stockMinimo = item.stock_minimo || 0;

        if (stockActual === 0) {
          alerts.push({
            id: `${item.id}_out`,
            itemId: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            stockActual,
            stockMinimo,
            tipo: 'sin_stock' as const,
            severidad: 'error' as const
          });
        } else if (stockActual <= stockMinimo && stockMinimo > 0) {
          alerts.push({
            id: `${item.id}_low`,
            itemId: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            stockActual,
            stockMinimo,
            tipo: 'stock_bajo' as const,
            severidad: 'warning' as const
          });
        }
      }

      return alerts;
    },
  });
};

// Utility function to calculate stock after movement
export const calculateNewStock = (currentStock: number, movement: Pick<InventoryMovement, 'tipo' | 'cantidad'>): number => {
  switch (movement.tipo) {
    case 'entrada':
      return currentStock + movement.cantidad;
    case 'salida':
      return Math.max(0, currentStock - movement.cantidad);
    case 'ajuste':
      return movement.cantidad; // Absolute value for adjustments
    case 'merma':
      return Math.max(0, currentStock - movement.cantidad);
    default:
      return currentStock;
  }
};

// Utility function to validate movement
export const validateMovement = (movement: Partial<InventoryMovement>, currentStock: number = 0): string[] => {
  const errors: string[] = [];

  if (!movement.itemId) {
    errors.push('Producto es requerido');
  }

  if (!movement.tipo) {
    errors.push('Tipo de movimiento es requerido');
  }

  if (!movement.cantidad || movement.cantidad <= 0) {
    errors.push('Cantidad debe ser mayor a 0');
  }

  if (movement.tipo === 'salida' && movement.cantidad && movement.cantidad > currentStock) {
    errors.push(`No hay suficiente stock. Disponible: ${currentStock}`);
  }

  if (!movement.motivo?.trim()) {
    errors.push('Motivo es requerido');
  }

  return errors;
};