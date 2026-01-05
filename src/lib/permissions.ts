import type { UserRole } from '@/types';

// Definición de permisos disponibles en el sistema
export type Permission =
  // Dashboard
  | 'view_dashboard'
  | 'view_kpis'

  // Facturas
  | 'create_invoice'
  | 'view_invoices'
  | 'edit_invoice'
  | 'void_invoice'
  | 'create_credit_note'
  | 'create_debit_note'
  | 'download_invoice_pdf'

  // Clientes
  | 'create_customer'
  | 'view_customers'
  | 'edit_customer'
  | 'delete_customer'

  // Productos/Servicios
  | 'create_item'
  | 'view_items'
  | 'edit_item'
  | 'delete_item'

  // Reportes
  | 'view_reports'
  | 'view_sales_book'
  | 'view_igtf_report'
  | 'export_reports'

  // Trámites
  | 'view_tramites'
  | 'create_tramite'
  | 'edit_tramite'
  | 'delete_tramite'
  | 'approve_tramite'

  // Configuración
  | 'view_settings'
  | 'edit_settings'
  | 'manage_users'
  | 'manage_control_numbers';

// Permisos por rol
const rolePermissions: Record<UserRole, Permission[]> = {
  // ADMINISTRADOR: Acceso total al sistema
  administrador: [
    'view_dashboard',
    'view_kpis',
    'create_invoice',
    'view_invoices',
    'edit_invoice',
    'void_invoice',
    'create_credit_note',
    'create_debit_note',
    'download_invoice_pdf',
    'create_customer',
    'view_customers',
    'edit_customer',
    'delete_customer',
    'create_item',
    'view_items',
    'edit_item',
    'delete_item',
    'view_reports',
    'view_sales_book',
    'view_igtf_report',
    'export_reports',
    'view_tramites',
    'create_tramite',
    'edit_tramite',
    'delete_tramite',
    'approve_tramite',
    'view_settings',
    'edit_settings',
    'manage_users',
    'manage_control_numbers',
  ],

  // VENDEDOR: Crear facturas, ver clientes, productos limitado
  vendedor: [
    'view_dashboard',
    'create_invoice',
    'view_invoices',
    'download_invoice_pdf',
    'create_customer',
    'view_customers',
    'edit_customer',
    'view_items',
  ],

  // PROMOTOR: Similar al vendedor pero sin editar clientes ni ver todos los reportes
  promotor: [
    'view_dashboard',
    'create_invoice',
    'view_invoices',
    'download_invoice_pdf',
    'view_customers',
    'view_items',
  ],

  // CONTADOR: Acceso a reportes, facturas (solo lectura), y configuración contable
  contador: [
    'view_dashboard',
    'view_kpis',
    'view_invoices',
    'download_invoice_pdf',
    'view_customers',
    'view_items',
    'view_reports',
    'view_sales_book',
    'view_igtf_report',
    'export_reports',
    'view_settings',
  ],
};

// Descripción de cada rol
export const roleDescriptions: Record<UserRole, string> = {
  administrador: 'Acceso total al sistema. Puede gestionar usuarios, configuración y todos los módulos.',
  vendedor: 'Puede crear facturas, gestionar clientes y ver productos. Acceso limitado a reportes.',
  promotor: 'Puede crear facturas y consultar información. No puede modificar clientes ni productos.',
  contador: 'Acceso a reportes contables, facturas de solo lectura y configuración fiscal.',
};

// Verificar si un rol tiene un permiso específico
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return rolePermissions[role]?.includes(permission) ?? false;
};

// Verificar si un rol tiene al menos uno de varios permisos
export const hasAnyPermission = (role: UserRole, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(role, permission));
};

// Verificar si un rol tiene todos los permisos especificados
export const hasAllPermissions = (role: UserRole, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(role, permission));
};

// Obtener todos los permisos de un rol
export const getRolePermissions = (role: UserRole): Permission[] => {
  return rolePermissions[role] || [];
};

// Obtener descripción del rol
export const getRoleDescription = (role: UserRole): string => {
  return roleDescriptions[role] || '';
};

// Nombre legible del rol
export const getRoleDisplayName = (role: UserRole): string => {
  const displayNames: Record<UserRole, string> = {
    administrador: 'Administrador',
    vendedor: 'Vendedor',
    promotor: 'Promotor',
    contador: 'Contador',
  };
  return displayNames[role] || role;
};
