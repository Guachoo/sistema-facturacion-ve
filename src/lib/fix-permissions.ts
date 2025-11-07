// Script para corregir permisos de usuarios que no pueden acceder a módulos

import { getDefaultPermissionsForRole } from '@/hooks/use-permissions';
import type { ModuleType } from '@/hooks/use-permissions';

const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: string;
}

interface UserPermission {
  id?: string;
  user_id: string;
  modulo: ModuleType;
  puede_leer: boolean;
  puede_escribir: boolean;
  puede_eliminar: boolean;
}

export async function fixUserPermissions(userId?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔧 Iniciando corrección de permisos...');

    // 1. Obtener todos los usuarios o uno específico
    let usersUrl = `${SUPABASE_URL}/rest/v1/users?activo=eq.true`;
    if (userId) {
      usersUrl += `&id=eq.${userId}`;
    }

    const usersResponse = await fetch(usersUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!usersResponse.ok) {
      throw new Error('No se pudieron obtener los usuarios');
    }

    const users: User[] = await usersResponse.json();

    if (users.length === 0) {
      return {
        success: false,
        message: 'No se encontraron usuarios activos'
      };
    }

    console.log(`👥 Encontrados ${users.length} usuarios para revisar`);

    const results = [];

    for (const user of users) {
      console.log(`🔍 Revisando usuario: ${user.nombre} (${user.email})`);

      // 2. Verificar si el usuario ya tiene permisos
      const permissionsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/user_permissions?user_id=eq.${user.id}`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!permissionsResponse.ok) {
        console.error(`❌ Error al obtener permisos para ${user.email}`);
        continue;
      }

      const existingPermissions: UserPermission[] = await permissionsResponse.json();

      // 3. Si no tiene permisos, crear los predeterminados para su rol
      if (existingPermissions.length === 0) {
        console.log(`🚨 Usuario ${user.email} no tiene permisos. Creando permisos para rol: ${user.rol}`);

        const defaultPermissions = getDefaultPermissionsForRole(user.rol);
        const permissionsToCreate: Omit<UserPermission, 'id'>[] = [];

        // Convertir el objeto de permisos a array
        Object.entries(defaultPermissions).forEach(([modulo, perms]) => {
          permissionsToCreate.push({
            user_id: user.id,
            modulo: modulo as ModuleType,
            puede_leer: perms.leer,
            puede_escribir: perms.escribir,
            puede_eliminar: perms.eliminar
          });
        });

        // 4. Insertar permisos en la base de datos
        if (permissionsToCreate.length > 0) {
          const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_permissions`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(permissionsToCreate)
          });

          if (insertResponse.ok) {
            console.log(`✅ Permisos creados para ${user.email}`);
            results.push({
              user: user.email,
              status: 'created',
              permissions: permissionsToCreate.length
            });
          } else {
            console.error(`❌ Error al crear permisos para ${user.email}`);
            results.push({
              user: user.email,
              status: 'error',
              error: 'Failed to insert permissions'
            });
          }
        }
      } else {
        console.log(`✅ Usuario ${user.email} ya tiene ${existingPermissions.length} permisos`);
        results.push({
          user: user.email,
          status: 'existing',
          permissions: existingPermissions.length
        });
      }
    }

    return {
      success: true,
      message: `Proceso completado. Revisados ${users.length} usuarios.`,
      details: results
    };

  } catch (error) {
    console.error('❌ Error en fixUserPermissions:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      details: error
    };
  }
}

// Función específica para arreglar el superadmin
export async function ensureSuperAdminPermissions(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('🔧 Asegurando permisos de superadmin...');

    // Buscar usuarios superadmin
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?rol=eq.superadmin&activo=eq.true`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo obtener usuarios superadmin');
    }

    const superAdmins: User[] = await response.json();

    if (superAdmins.length === 0) {
      return {
        success: false,
        message: 'No se encontraron usuarios superadmin'
      };
    }

    for (const admin of superAdmins) {
      // Eliminar permisos existentes
      await fetch(`${SUPABASE_URL}/rest/v1/user_permissions?user_id=eq.${admin.id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      // Crear permisos completos
      const modules: ModuleType[] = ['clientes', 'items', 'cotizaciones', 'facturas', 'reportes', 'configuracion', 'usuarios'];
      const permissions = modules.map(modulo => ({
        user_id: admin.id,
        modulo,
        puede_leer: true,
        puede_escribir: true,
        puede_eliminar: true
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/user_permissions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(permissions)
      });

      console.log(`✅ Permisos de superadmin actualizados para ${admin.email}`);
    }

    return {
      success: true,
      message: `Permisos de superadmin actualizados para ${superAdmins.length} usuarios`
    };

  } catch (error) {
    console.error('❌ Error en ensureSuperAdminPermissions:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

// Función para crear un usuario de prueba con permisos completos
export async function createTestUser(): Promise<{
  success: boolean;
  message: string;
  credentials?: { email: string; password: string; };
}> {
  try {
    const testUser = {
      email: 'admin@axiona.test',
      nombre: 'Administrador Test',
      rol: 'superadmin',
      activo: true
    };

    // Verificar si ya existe
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?email=eq.${testUser.email}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const existing = await checkResponse.json();
    if (existing.length > 0) {
      // Ya existe, solo asegurar permisos
      await fixUserPermissions(existing[0].id);
      return {
        success: true,
        message: 'Usuario de prueba ya existe, permisos actualizados',
        credentials: { email: testUser.email, password: 'cualquier_contraseña' }
      };
    }

    // Crear usuario
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testUser)
    });

    if (!createResponse.ok) {
      throw new Error('No se pudo crear el usuario de prueba');
    }

    const createdUser = await createResponse.json();
    const userId = Array.isArray(createdUser) ? createdUser[0].id : createdUser.id;

    // Crear permisos completos
    await fixUserPermissions(userId);

    return {
      success: true,
      message: 'Usuario de prueba creado exitosamente',
      credentials: { email: testUser.email, password: 'cualquier_contraseña' }
    };

  } catch (error) {
    console.error('❌ Error en createTestUser:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}