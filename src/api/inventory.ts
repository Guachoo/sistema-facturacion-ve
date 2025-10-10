import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { InventoryMovement } from '@/types';

// Mock data for development
const mockMovements: InventoryMovement[] = [
  {
    id: '1',
    itemId: '1',
    tipo: 'entrada',
    cantidad: 100,
    costoUnitario: 45000,
    motivo: 'Compra inicial',
    referencia: 'PO-001',
    usuarioId: '1',
    fecha: '2024-01-15T10:00:00Z',
    stockAnterior: 0,
    stockNuevo: 100,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    itemId: '1',
    tipo: 'salida',
    cantidad: 5,
    motivo: 'Venta - Factura FAC-001',
    referencia: 'FAC-001',
    usuarioId: '1',
    fecha: '2024-01-16T14:30:00Z',
    stockAnterior: 100,
    stockNuevo: 95,
    createdAt: '2024-01-16T14:30:00Z'
  },
  {
    id: '3',
    itemId: '2',
    tipo: 'entrada',
    cantidad: 50,
    costoUnitario: 140000,
    motivo: 'Compra de inventario',
    referencia: 'PO-002',
    usuarioId: '1',
    fecha: '2024-01-20T09:15:00Z',
    stockAnterior: 0,
    stockNuevo: 50,
    createdAt: '2024-01-20T09:15:00Z'
  }
];

export const useInventoryMovements = (itemId?: string) => {
  return useQuery({
    queryKey: ['inventoryMovements', itemId],
    queryFn: async (): Promise<InventoryMovement[]> => {
      console.log('Fetching inventory movements', itemId ? `for item ${itemId}` : 'for all items');

      // For now, return mock data
      // In production, this would be a real API call
      const movements = itemId
        ? mockMovements.filter(m => m.itemId === itemId)
        : mockMovements;

      // Sort by date descending (most recent first)
      return movements.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    },
  });
};

export const useCreateInventoryMovement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: Omit<InventoryMovement, 'id' | 'createdAt'>): Promise<InventoryMovement> => {
      console.log('Creating inventory movement:', movement);

      // For now, simulate API call
      // In production, this would be a real API call
      const newMovement: InventoryMovement = {
        ...movement,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString()
      };

      // Add to mock data for development
      mockMovements.unshift(newMovement);

      return newMovement;
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
      console.log('Fetching inventory statistics');

      // Mock calculation for development
      // In production, this would be calculated from real data
      const totalItems = 2;
      const totalValue = 4500000; // VES
      const lowStockItems = 1;
      const outOfStockItems = 0;

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
      console.log('Fetching inventory alerts');

      // Mock alerts for development
      // In production, this would check real stock levels vs minimum stock
      return [
        {
          id: '1',
          itemId: '1',
          codigo: 'SERV-001',
          descripcion: 'Consultoría en Sistemas',
          stockActual: 5,
          stockMinimo: 10,
          tipo: 'stock_bajo' as const,
          severidad: 'warning' as const
        }
      ];
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