import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '@/lib/api-client';
import type { AuthResponse } from '@/types';
// FASE 9: Integración con sistema de auditoría
import { auditSystem, generateDeviceFingerprint, getClientIP } from '@/lib/audit-system';
import { hashPassword } from '@/lib/security';
import { mockAuthenticate, useMockMode } from '@/lib/mock-auth';

// FASE 9: Interfaces mejoradas para seguridad y auditoría
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

interface DeviceInfo {
  userAgent: string;
  ip?: string;
  location?: string;
  deviceId?: string;
}

interface UserPermission {
  module: string;
  actions: string[];
  conditions?: Record<string, any>;
}

interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: UserPermission[];
  level: number; // Para jerarquía de roles
}

interface SecurityAuditLog {
  id: string;
  userId: string;
  action: 'login' | 'logout' | 'failed_login' | 'permission_denied' | 'session_expired';
  timestamp: string;
  deviceInfo: DeviceInfo;
  metadata?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
}

interface EnhancedUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  roles: UserRole[];
  permissions: UserPermission[];
  lastLogin?: string;
  failedLoginAttempts: number;
  accountLocked?: boolean;
  lockoutUntil?: string;
  twoFactorEnabled: boolean;
  preferences?: Record<string, any>;
}

interface AuthUserRecord {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  ultimo_acceso?: string;
  intentos_login_fallidos?: number;
  cuenta_bloqueada?: boolean;
  bloqueo_hasta?: string;
  password_hash?: string;
  activo?: boolean;
}

// Cache para mejorar rendimiento
const authCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.JQQbEn4ORkKR63fvfO0mUOo1hfFPQHgUr_9F2I0NV0E';

// Funciones auxiliares de seguridad
const getDeviceInfo = (): DeviceInfo => ({
  userAgent: navigator.userAgent,
  deviceId: localStorage.getItem('device_id') || generateDeviceId(),
});

const generateDeviceId = (): string => {
  const deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('device_id', deviceId);
  return deviceId;
};

const logSecurityEvent = async (event: Omit<SecurityAuditLog, 'id' | 'timestamp'>) => {
  try {
    const auditLog: SecurityAuditLog = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    // Log to console for development (en producción sería a la base de datos)
    console.log('🔒 Security Event:', auditLog);

    // En producción: enviar a endpoint de auditoría
    // await fetch('/api/security-audit', { method: 'POST', body: JSON.stringify(auditLog) });

    // Guardar en localStorage para demostración
    const existingLogs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
    existingLogs.push(auditLog);
    // Mantener solo los últimos 100 logs
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100);
    }
    localStorage.setItem('security_audit_logs', JSON.stringify(existingLogs));
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

const checkRateLimit = (email: string): boolean => {
  const key = `rate_limit_${email}`;
  const attempts = authCache.get(key) || { count: 0, timestamp: Date.now() };

  // Resetear contador si han pasado más de 15 minutos
  if (Date.now() - attempts.timestamp > 15 * 60 * 1000) {
    attempts.count = 0;
    attempts.timestamp = Date.now();
  }

  // Máximo 5 intentos por 15 minutos
  if (attempts.count >= 5) {
    return false;
  }

  attempts.count++;
  authCache.set(key, attempts);
  return true;
};

export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      const deviceInfo = getDeviceInfo();
      const startTime = Date.now();
      const normalizedEmail = credentials.email.trim().toLowerCase();

      // Verificar si usamos modo mock (sin Supabase)
      if (useMockMode()) {
        console.log('🔧 Usando modo de desarrollo (sin Supabase)');
        try {
          const authResponse = await mockAuthenticate(normalizedEmail, credentials.password);

          // Log evento de seguridad
          await logSecurityEvent({
            userId: authResponse.user.id,
            action: 'login',
            deviceInfo,
            metadata: {
              mode: 'mock_development',
              remember_me: credentials.rememberMe || false
            },
            riskLevel: 'low'
          });

          // Configurar token con TTL
          const tokenTTL = credentials.rememberMe ? undefined : 8 * 60 * 60 * 1000;
          tokenManager.set(authResponse.token, tokenTTL);

          return authResponse;
        } catch (error) {
          await logSecurityEvent({
            userId: normalizedEmail,
            action: 'failed_login',
            deviceInfo,
            metadata: { reason: 'invalid_credentials', mode: 'mock_development' },
            riskLevel: 'medium'
          });
          throw error;
        }
      }

      if (!checkRateLimit(normalizedEmail)) {
        await logSecurityEvent({
          userId: normalizedEmail,
          action: 'failed_login',
          deviceInfo,
          metadata: { reason: 'rate_limit_exceeded' },
          riskLevel: 'high'
        });
        throw new Error('Demasiados intentos de login. Intente en 15 minutos.');
      }

      const cacheKey = `user_${normalizedEmail}`;
      const cachedUser = authCache.get(cacheKey);
      let user: AuthUserRecord | null = null;

      if (cachedUser && (Date.now() - cachedUser.timestamp) < CACHE_TTL) {
        user = cachedUser.data as AuthUserRecord;
      } else {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${normalizedEmail}&select=id,nombre,email,rol,ultimo_acceso,intentos_login_fallidos,cuenta_bloqueada,bloqueo_hasta,password_hash,activo&limit=1`, {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=60'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          await logSecurityEvent({
            userId: normalizedEmail,
            action: 'failed_login',
            deviceInfo,
            metadata: { reason: 'server_error', error: errorText },
            riskLevel: 'medium'
          });
          throw new Error('No se pudo conectar con el servidor de autenticaci�n.');
        }

        const users = await response.json();
        if (!users || users.length === 0) {
          await logSecurityEvent({
            userId: normalizedEmail,
            action: 'failed_login',
            deviceInfo,
            metadata: { reason: 'user_not_found' },
            riskLevel: 'medium'
          });
          throw new Error('Usuario no registrado.');
        }

        user = users[0];
        authCache.set(cacheKey, { data: user, timestamp: Date.now() });
      }

      if (!user) {
        throw new Error('Usuario no encontrado.');
      }

      if (user.activo === false) {
        await logSecurityEvent({
          userId: user.id,
          action: 'failed_login',
          deviceInfo,
          metadata: { reason: 'user_disabled' },
          riskLevel: 'medium'
        });
        throw new Error('Usuario desactivado. Contacte al administrador.');
      }

      if (user.cuenta_bloqueada) {
        const bloqueoHasta = new Date(user.bloqueo_hasta || 0);
        if (Date.now() < bloqueoHasta.getTime()) {
          await logSecurityEvent({
            userId: user.id,
            action: 'failed_login',
            deviceInfo,
            metadata: { reason: 'account_locked', unlock_time: user.bloqueo_hasta },
            riskLevel: 'high'
          });
          throw new Error(`Cuenta bloqueada hasta ${bloqueoHasta.toLocaleString()}`);
        }
      }

      if (!user.password_hash) {
        await logSecurityEvent({
          userId: user.id,
          action: 'failed_login',
          deviceInfo,
          metadata: { reason: 'missing_password_hash' },
          riskLevel: 'medium'
        });
        throw new Error('Usuario sin credenciales configuradas.');
      }

      const hashedInput = await hashPassword(credentials.password);
      if (hashedInput !== user.password_hash) {
        await logSecurityEvent({
          userId: user.id,
          action: 'failed_login',
          deviceInfo,
          metadata: { reason: 'invalid_password' },
          riskLevel: 'medium'
        });
        throw new Error('Credenciales inv�lidas.');
      }

      const updatePromise = fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ultimo_acceso: new Date().toISOString(),
          intentos_login_fallidos: 0,
          cuenta_bloqueada: false,
          bloqueo_hasta: null
        })
      });

      const loginDuration = Date.now() - startTime;
      const clientIP = await getClientIP();

      await auditSystem.log({
        userId: user.id,
        userEmail: user.email,
        userName: user.nombre,
        action: 'login',
        riskLevel: 'low',
        ipAddress: clientIP,
        userAgent: navigator.userAgent,
        deviceFingerprint: generateDeviceFingerprint(),
        sessionId: 'session_' + Date.now(),
        success: true,
        duration: loginDuration,
        metadata: {
          remember_me: credentials.rememberMe || false,
          last_login: user.ultimo_acceso
        }
      });

      const token = 'auth-token-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const authResponse: AuthResponse = {
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      };

      const tokenTTL = credentials.rememberMe ? undefined : 8 * 60 * 60 * 1000;
      tokenManager.set(authResponse.token, tokenTTL);

      updatePromise.catch(error => {
        console.error('Error updating user login info:', error);
      });

      authCache.delete(`rate_limit_${normalizedEmail}`);

      return authResponse;
    }
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: async () => {
      const deviceInfo = getDeviceInfo();

      // Obtener info del usuario actual antes del logout
      const currentUser = tokenManager.get() ? 'current_user' : 'anonymous';

      try {
        // Log logout event
        await logSecurityEvent({
          userId: currentUser,
          action: 'logout',
          deviceInfo,
          metadata: {
            logout_type: 'manual',
            session_duration: Date.now() - (parseInt(localStorage.getItem('session_start') || '0'))
          },
          riskLevel: 'low'
        });

        // Limpiar todos los caches relacionados con el usuario
        authCache.clear();

        // Remover token
        tokenManager.remove();

        // Limpiar datos sensibles del localStorage
        localStorage.removeItem('session_start');
        localStorage.removeItem('last_activity');

        // Redireccionar al login
        window.location.href = '/login';
      } catch (error) {
        console.error('Error during logout:', error);
        // Forzar logout incluso si falla el logging
        tokenManager.remove();
        window.location.href = '/login';
      }
    },
  });
};

// FASE 9: Hooks adicionales para roles y permisos granulares
export const useUserRoles = () => {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async (): Promise<UserRole[]> => {
      // Mock de roles - en producción vendría de la API
      return [
        {
          id: 'super_admin',
          name: 'Super Administrador',
          description: 'Acceso total al sistema',
          level: 100,
          permissions: [
            { module: '*', actions: ['*'] }
          ]
        },
        {
          id: 'admin',
          name: 'Administrador',
          description: 'Gestión completa excepto configuración del sistema',
          level: 80,
          permissions: [
            { module: 'usuarios', actions: ['read', 'write', 'delete'] },
            { module: 'facturas', actions: ['read', 'write', 'delete'] },
            { module: 'clientes', actions: ['read', 'write', 'delete'] },
            { module: 'reportes', actions: ['read', 'write'] },
            { module: 'configuracion', actions: ['read', 'write'] }
          ]
        },
        {
          id: 'contador',
          name: 'Contador',
          description: 'Acceso a facturación y reportes',
          level: 60,
          permissions: [
            { module: 'facturas', actions: ['read', 'write'] },
            { module: 'clientes', actions: ['read'] },
            { module: 'reportes', actions: ['read', 'write'] }
          ]
        },
        {
          id: 'vendedor',
          name: 'Vendedor',
          description: 'Gestión de clientes y facturas',
          level: 40,
          permissions: [
            { module: 'clientes', actions: ['read', 'write'] },
            { module: 'facturas', actions: ['read', 'write'] },
            { module: 'cotizaciones', actions: ['read', 'write'] }
          ]
        },
        {
          id: 'consulta',
          name: 'Solo Consulta',
          description: 'Solo lectura de datos',
          level: 20,
          permissions: [
            { module: 'facturas', actions: ['read'] },
            { module: 'clientes', actions: ['read'] },
            { module: 'reportes', actions: ['read'] }
          ]
        }
      ];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  });
};

export const useSecurityAuditLogs = (limit: number = 50) => {
  return useQuery({
    queryKey: ['security-audit-logs', limit],
    queryFn: async (): Promise<SecurityAuditLog[]> => {
      try {
        const logs = JSON.parse(localStorage.getItem('security_audit_logs') || '[]');
        return logs
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      } catch (error) {
        console.error('Error loading security logs:', error);
        return [];
      }
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
    staleTime: 10000, // Datos frescos por 10 segundos
  });
};

export const usePermissionCheck = () => {
  const queryClient = useQueryClient();

  return {
    hasPermission: (userRoles: string[], module: string, action: string): boolean => {
      // Obtener roles del cache
      const roles = queryClient.getQueryData<UserRole[]>(['user-roles']) || [];

      // Super admin bypass
      if (userRoles.includes('super_admin')) {
        return true;
      }

      // Verificar permisos específicos
      return userRoles.some(roleName => {
        const role = roles.find(r => r.id === roleName);
        if (!role) return false;

        return role.permissions.some(permission => {
          const moduleMatch = permission.module === '*' || permission.module === module;
          const actionMatch = permission.actions.includes('*') || permission.actions.includes(action);
          return moduleMatch && actionMatch;
        });
      });
    },

    getRoleLevel: (userRoles: string[]): number => {
      const roles = queryClient.getQueryData<UserRole[]>(['user-roles']) || [];
      return Math.max(...userRoles.map(roleName => {
        const role = roles.find(r => r.id === roleName);
        return role?.level || 0;
      }));
    },

    canAccessModule: (userRoles: string[], module: string): boolean => {
      return userRoles.includes('super_admin') ||
             ['read', 'write', 'delete'].some(action =>
               usePermissionCheck().hasPermission(userRoles, module, action)
             );
    }
  };
};

// Hook para session management avanzado
export const useSessionManager = () => {
  const queryClient = useQueryClient();

  return {
    extendSession: () => {
      localStorage.setItem('last_activity', Date.now().toString());
    },

    checkSessionTimeout: (): boolean => {
      const lastActivity = parseInt(localStorage.getItem('last_activity') || '0');
      const sessionTimeout = 8 * 60 * 60 * 1000; // 8 horas
      return (Date.now() - lastActivity) > sessionTimeout;
    },

    clearSecurityData: () => {
      authCache.clear();
      localStorage.removeItem('security_audit_logs');
      localStorage.removeItem('device_id');
      queryClient.clear();
    },

    getSessionInfo: () => {
      const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
      const lastActivity = parseInt(localStorage.getItem('last_activity') || '0');
      return {
        sessionDuration: sessionStart ? Date.now() - sessionStart : 0,
        lastActivity: lastActivity ? new Date(lastActivity) : null,
        deviceId: localStorage.getItem('device_id')
      };
    }
  };
};

// Export tipos para uso externo
export type {
  LoginCredentials,
  DeviceInfo,
  UserPermission,
  UserRole,
  SecurityAuditLog,
  EnhancedUser
};
