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
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockResponse: AuthResponse = {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: '1',
          nombre: 'Usuario Demo',
          email: credentials.email,
          rol: 'admin'
        }
      };
      tokenManager.set(mockResponse.token);
      return mockResponse;
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