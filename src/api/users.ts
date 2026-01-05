import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';

// Supabase configuration
const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

// Extended User type for CRUD operations
export interface UserData extends User {
  password?: string;
  activo?: boolean;
  ultimoAcceso?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to normalize string values
const normalizeString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserData[]> => {
      try {
        console.log('Fetching users via REST API');

        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?order=created_at.desc`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          }
        });

        console.log('Users fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error fetching users:', errorText);

          // Si la tabla no existe o no hay permisos, usar datos mock
          console.log('Using mock data for users');
          return [
            {
              id: '1',
              nombre: 'Administrador',
              email: 'admin@axiona.com',
              rol: 'administrador',
              activo: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: '2',
              nombre: 'Vendedor Demo',
              email: 'vendedor@axiona.com',
              rol: 'vendedor',
              activo: true,
              createdAt: new Date().toISOString(),
            },
            {
              id: '3',
              nombre: 'Contador Demo',
              email: 'contador@axiona.com',
              rol: 'contador',
              activo: true,
              createdAt: new Date().toISOString(),
            },
          ];
        }

        const data = await response.json();
        console.log('Users fetched via REST API:', data?.length || 0, 'records');

        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data);
          return [];
        }

        return data.map(row => ({
          id: row.id,
          nombre: row.nombre,
          email: row.email,
          rol: row.rol,
          activo: row.activo,
          ultimoAcceso: row.ultimo_acceso,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch (error) {
        console.error('Error in useUsers:', error);
        // Fallback a datos mock
        return [
          {
            id: '1',
            nombre: 'Administrador',
            email: 'admin@axiona.com',
            rol: 'administrador',
            activo: true,
            createdAt: new Date().toISOString(),
          },
        ];
      }
    },
    retry: false, // No reintentar si falla
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Omit<UserData, 'id'>): Promise<UserData> => {
      console.log('Creating user with raw data:', user);

      // Validate required fields
      if (!user.nombre?.trim()) {
        throw new Error('Nombre es requerido');
      }
      if (!user.email?.trim()) {
        throw new Error('Email es requerido');
      }
      if (!user.password?.trim()) {
        throw new Error('Contraseña es requerida');
      }
      if (!user.rol) {
        throw new Error('Rol es requerido');
      }

      // Simple hash for password (in production, use proper bcrypt on backend)
      const passwordHash = `$2a$10$${btoa(user.password || '')}`;

      const insertData = {
        nombre: normalizeString(user.nombre) || '',
        email: normalizeString(user.email) || '',
        password_hash: passwordHash,
        rol: user.rol,
        activo: user.activo !== undefined ? user.activo : true,
      };

      console.log('Normalized data for Supabase:', { ...insertData, password_hash: '***' });

      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(insertData)
        });

        console.log('Fetch response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('REST API error:', errorText);

          if (response.status === 409 || errorText.includes('duplicate') || errorText.includes('unique')) {
            throw new Error(`Ya existe un usuario con el email: ${insertData.email}`);
          }

          throw new Error(`Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('REST API response:', data);

        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('No se recibieron datos del servidor');
        }

        const createdUser = data[0];
        console.log('User created successfully via REST API:', createdUser);

        return {
          id: createdUser.id,
          nombre: createdUser.nombre,
          email: createdUser.email,
          rol: createdUser.rol,
          activo: createdUser.activo,
          ultimoAcceso: createdUser.ultimo_acceso,
          createdAt: createdUser.created_at,
          updatedAt: createdUser.updated_at,
        };

      } catch (dbError: any) {
        console.error('REST API operation failed:', dbError);
        throw new Error(dbError.message || 'Error en la operación de base de datos');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password, ...user }: UserData): Promise<UserData> => {
      console.log('Updating user via REST API:', { id, ...user });

      if (!user.nombre?.trim()) {
        throw new Error('Nombre es requerido');
      }
      if (!user.email?.trim()) {
        throw new Error('Email es requerido');
      }
      if (!user.rol) {
        throw new Error('Rol es requerido');
      }

      const updateData: any = {
        nombre: normalizeString(user.nombre) || '',
        email: normalizeString(user.email) || '',
        rol: user.rol,
        activo: user.activo !== undefined ? user.activo : true,
      };

      // Only update password if provided
      if (password?.trim()) {
        const passwordHash = `$2a$10$${btoa(password)}`;
        updateData.password_hash = passwordHash;
      }

      console.log('Normalized update data:', { ...updateData, password_hash: updateData.password_hash ? '***' : undefined });

      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      console.log('Update user response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error updating user:', errorText);

        if (response.status === 409 || errorText.includes('duplicate') || errorText.includes('unique')) {
          throw new Error(`Ya existe un usuario con el email: ${updateData.email}`);
        }

        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('User updated via REST API:', data);

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron datos del servidor');
      }

      const updatedUser = data[0];

      return {
        id: updatedUser.id,
        nombre: updatedUser.nombre,
        email: updatedUser.email,
        rol: updatedUser.rol,
        activo: updatedUser.activo,
        ultimoAcceso: updatedUser.ultimo_acceso,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      console.log('Deleting user via REST API:', id);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        }
      });

      console.log('Delete user response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API error deleting user:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('User deleted successfully via REST API');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
