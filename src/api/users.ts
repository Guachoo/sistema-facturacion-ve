import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'superadmin' | 'admin' | 'contador' | 'vendedor' | 'supervisor' | 'auditor';
  activo: boolean;
  ultimo_acceso?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  modulo: 'clientes' | 'items' | 'facturas' | 'reportes' | 'configuracion' | 'usuarios';
  puede_leer: boolean;
  puede_escribir: boolean;
  puede_eliminar: boolean;
}

export interface PermissionAudit {
  id: string;
  user_id?: string;
  target_user_id?: string;
  changed_by?: string;
  modulo?: string;
  accion: string;
  detalles: Record<string, any>;
  timestamp: string;
}

export interface CreateUserData {
  email: string;
  nombre: string;
  rol: User['rol'];
  activo?: boolean;
}

export interface UpdateUserData {
  nombre?: string;
  rol?: User['rol'];
  activo?: boolean;
}

export interface UpdatePermissionsData {
  permissions: Omit<UserPermission, 'id' | 'user_id'>[];
}

// API Functions using Supabase
const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

// Get all users
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener usuarios');
      }

      return response.json();
    }
  });
};

// Get user permissions
export const useUserPermissions = (userId: string) => {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async (): Promise<UserPermission[]> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_permissions?user_id=eq.${userId}`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener permisos del usuario');
      }

      return response.json();
    },
    enabled: !!userId
  });
};

// Create user
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData): Promise<User> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Error al crear usuario');
      }

      const result = await response.json();
      return Array.isArray(result) ? result[0] : result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Update user
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserData }): Promise<User> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Error al actualizar usuario');
      }

      const result = await response.json();
      return Array.isArray(result) ? result[0] : result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Update user permissions
export const useUpdateUserPermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: UpdatePermissionsData['permissions'] }): Promise<void> => {
      // First, delete existing permissions
      await fetch(`${SUPABASE_URL}/rest/v1/user_permissions?user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      // Then, insert new permissions
      if (permissions.length > 0) {
        const permissionsWithUserId = permissions.map(p => ({
          ...p,
          user_id: userId
        }));

        const response = await fetch(`${SUPABASE_URL}/rest/v1/user_permissions`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(permissionsWithUserId)
        });

        if (!response.ok) {
          throw new Error('Error al actualizar permisos');
        }
      }
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
    }
  });
};

// Delete user
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al eliminar usuario');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

// Get permission audit log
export const usePermissionAudit = () => {
  return useQuery({
    queryKey: ['permission-audit'],
    queryFn: async (): Promise<PermissionAudit[]> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/permission_audit?order=timestamp.desc&limit=100`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener auditoría de permisos');
      }

      return response.json();
    }
  });
};

// Log permission change
export const useLogPermissionChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PermissionAudit, 'id' | 'timestamp'>): Promise<void> => {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/permission_audit`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Error al registrar cambio de permisos');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-audit'] });
    }
  });
};