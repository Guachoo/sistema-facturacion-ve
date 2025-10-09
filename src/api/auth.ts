import { useMutation } from '@tanstack/react-query';
import { apiClient, tokenManager } from '@/lib/api-client';
import type { AuthResponse } from '@/types';

interface LoginCredentials {
  email: string;
  password: string;
}

export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      // Simular delay de autenticación
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar que el usuario existe en Supabase
      const response = await fetch(`https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/users?email=eq.${credentials.email}&activo=eq.true&limit=1`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error de conexión. Intente nuevamente.');
      }

      const users = await response.json();

      // Verificar si el usuario existe
      if (!users || users.length === 0) {
        throw new Error('Usuario no registrado o inactivo. Contacte al administrador.');
      }

      const user = users[0];

      // Actualizar último acceso
      await fetch(`https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ultimo_acceso: new Date().toISOString()
        })
      });

      const authResponse: AuthResponse = {
        token: 'auth-token-' + Date.now(),
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      };

      tokenManager.set(authResponse.token);
      return authResponse;
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      tokenManager.remove();
      window.location.href = '/login';
    },
  });
};