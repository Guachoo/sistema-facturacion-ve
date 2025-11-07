import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ControlNumberBatch {
  id: string;
  range_from: number;
  range_to: number;
  active: boolean;
  used: number;
  remaining: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBatchData {
  range_from: number;
  range_to: number;
  active?: boolean;
}

// Hook para obtener lotes de números de control
export const useControlNumberBatches = () => {
  return useQuery({
    queryKey: ['control-number-batches'],
    queryFn: async (): Promise<ControlNumberBatch[]> => {
      const { data, error } = await supabase
        .from('control_number_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching control number batches:', error);
        throw new Error('Error al obtener los lotes de números de control');
      }

      return data || [];
    }
  });
};

// Hook para crear un nuevo lote
export const useCreateControlBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchData: CreateBatchData): Promise<ControlNumberBatch> => {
      // Validar que el rango sea válido
      if (batchData.range_from >= batchData.range_to) {
        throw new Error('El número inicial debe ser menor que el número final');
      }

      // Calcular remaining
      const remaining = batchData.range_to - batchData.range_from + 1;

      // Verificar si hay solapamiento con lotes existentes
      const { data: existingBatches } = await supabase
        .from('control_number_batches')
        .select('range_from, range_to')
        .or(`and(range_from.lte.${batchData.range_to},range_to.gte.${batchData.range_from})`);

      if (existingBatches && existingBatches.length > 0) {
        throw new Error('El rango especificado se solapa con un lote existente');
      }

      const { data, error } = await supabase
        .from('control_number_batches')
        .insert({
          range_from: batchData.range_from,
          range_to: batchData.range_to,
          active: batchData.active ?? false,
          used: 0,
          remaining
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating control batch:', error);
        throw new Error('Error al crear el lote de números de control');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-number-batches'] });
      toast.success('Lote de números de control creado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
};

// Hook para activar/desactivar un lote
export const useToggleBatchStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('control_number_batches')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating batch status:', error);
        throw new Error('Error al actualizar el estado del lote');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-number-batches'] });
      toast.success('Estado del lote actualizado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
};

// Hook para eliminar un lote
export const useDeleteControlBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('control_number_batches')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting control batch:', error);
        throw new Error('Error al eliminar el lote');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-number-batches'] });
      toast.success('Lote eliminado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
};

// Hook para obtener el siguiente número de control disponible
export const useGetNextControlNumber = () => {
  return useQuery({
    queryKey: ['next-control-number'],
    queryFn: async (): Promise<number | null> => {
      // Obtener el lote activo con números disponibles
      const { data: activeBatch, error } = await supabase
        .from('control_number_batches')
        .select('*')
        .eq('active', true)
        .gt('remaining', 0)
        .order('range_from', { ascending: true })
        .limit(1)
        .single();

      if (error || !activeBatch) {
        return null;
      }

      // El siguiente número sería: range_from + used
      return activeBatch.range_from + activeBatch.used;
    }
  });
};

// Hook para usar un número de control (incrementar contador)
export const useUseControlNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string): Promise<number> => {
      const { data: batch, error: fetchError } = await supabase
        .from('control_number_batches')
        .select('*')
        .eq('id', batchId)
        .single();

      if (fetchError || !batch) {
        throw new Error('Lote no encontrado');
      }

      if (batch.remaining <= 0) {
        throw new Error('No hay números disponibles en este lote');
      }

      const newUsed = batch.used + 1;
      const newRemaining = batch.remaining - 1;
      const usedNumber = batch.range_from + batch.used;

      const { error: updateError } = await supabase
        .from('control_number_batches')
        .update({
          used: newUsed,
          remaining: newRemaining,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId);

      if (updateError) {
        throw new Error('Error al actualizar el contador del lote');
      }

      return usedNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control-number-batches'] });
      queryClient.invalidateQueries({ queryKey: ['next-control-number'] });
    }
  });
};