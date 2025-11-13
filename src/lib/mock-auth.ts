// Sistema de autenticación mock para desarrollo sin Supabase
// USUARIOS DE PRUEBA PARA VERCEL (demo):
// 👤 admin@sistema.com / admin123 (Super Admin)
// 👤 contador@sistema.com / contador123 (Contador)
// 👤 vendedor@sistema.com / vendedor123 (Vendedor)
import { hashPassword } from '@/lib/security';
import type { AuthResponse } from '@/types';

// Usuarios mock con contraseñas hasheadas
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@sistema.com',
    nombre: 'Administrador General',
    rol: 'superadmin',
    activo: true,
    password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9' // admin123
  },
  {
    id: '2',
    email: 'contador@sistema.com',
    nombre: 'Contador Principal',
    rol: 'contador',
    activo: true,
    password_hash: '7d0fa94701416c46f0833330336f33071f32191a67d4c50257ee022dc05d4815' // contador123
  },
  {
    id: '3',
    email: 'vendedor@sistema.com',
    nombre: 'Vendedor',
    rol: 'vendedor',
    activo: true,
    password_hash: '56976bf24998ca63e35fe4f1e2469b5751d1856003e8d16fef0aafef496ed044' // vendedor123
  }
];

export const mockAuthenticate = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = email.trim().toLowerCase();

  // Buscar usuario mock
  const user = MOCK_USERS.find(u => u.email === normalizedEmail);

  if (!user) {
    throw new Error('Usuario no registrado.');
  }

  if (!user.activo) {
    throw new Error('Usuario desactivado. Contacte al administrador.');
  }

  // Verificar contraseña
  const hashedInput = await hashPassword(password);
  if (hashedInput !== user.password_hash) {
    throw new Error('Credenciales inválidas.');
  }

  // Generar token mock
  const token = 'mock-auth-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

  return {
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    }
  };
};

export const useMockMode = () => {
  // FORZAR MODO MOCK SIEMPRE - Para demostración en Vercel
  // En una implementación real, esto vendría de una variable de entorno
  const forceMock = true; // Cambiar a false cuando tengas Supabase real configurado

  if (forceMock) {
    console.log('🔧 Modo mock forzado activo - Usuario: admin@sistema.com, Password: admin123');
    return true;
  }

  // Lógica original para detectar automáticamente
  const isDevelopment = import.meta.env.MODE === 'development';
  const supabaseUnavailable = !import.meta.env.VITE_SUPABASE_URL ||
                               import.meta.env.VITE_SUPABASE_URL.includes('supfddcbyfuzvxsrzwio');

  return isDevelopment && supabaseUnavailable;
};