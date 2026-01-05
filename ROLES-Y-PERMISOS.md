# Sistema de Roles y Permisos

## Descripción General

El sistema de facturación Axiona implementa un sistema de control de acceso basado en roles (RBAC - Role-Based Access Control) con 4 roles predefinidos, cada uno con permisos específicos según su función en la organización.

## Roles Disponibles

### 1. 👤 ADMINISTRADOR
**Acceso:** Total
**Descripción:** Control completo del sistema, incluyendo gestión de usuarios, configuración y todos los módulos.

**Permisos:**
- ✅ Ver dashboard y KPIs
- ✅ Crear, ver, editar y anular facturas
- ✅ Crear notas de crédito y débito
- ✅ Gestionar clientes (crear, editar, eliminar)
- ✅ Gestionar productos/servicios (crear, editar, eliminar)
- ✅ Acceso completo a reportes
- ✅ Configurar el sistema
- ✅ Gestionar usuarios
- ✅ Gestionar números de control

**Casos de uso:**
- Gerente general
- Propietario del negocio
- Administrador del sistema

---

### 2. 💼 VENDEDOR
**Acceso:** Operativo
**Descripción:** Puede crear facturas, gestionar clientes y consultar productos. Acceso limitado a reportes.

**Permisos:**
- ✅ Ver dashboard
- ✅ Crear facturas
- ✅ Ver facturas existentes
- ✅ Descargar PDFs de facturas
- ✅ Crear y editar clientes
- ✅ Ver clientes
- ✅ Ver productos/servicios (solo lectura)

**Restricciones:**
- ❌ No puede anular facturas
- ❌ No puede crear notas de crédito/débito
- ❌ No puede eliminar clientes
- ❌ No puede modificar productos/servicios
- ❌ Acceso limitado a reportes
- ❌ No puede acceder a configuración del sistema

**Casos de uso:**
- Personal de ventas
- Cajeros
- Asistentes comerciales

---

### 3. 🎯 PROMOTOR
**Acceso:** Limitado
**Descripción:** Similar al vendedor pero sin capacidad de editar clientes. Enfocado en generación de facturas.

**Permisos:**
- ✅ Ver dashboard
- ✅ Crear facturas
- ✅ Ver facturas existentes
- ✅ Descargar PDFs de facturas
- ✅ Ver clientes (solo lectura)
- ✅ Ver productos/servicios (solo lectura)

**Restricciones:**
- ❌ No puede crear o editar clientes
- ❌ No puede anular facturas
- ❌ No puede crear notas de crédito/débito
- ❌ No puede modificar productos/servicios
- ❌ Sin acceso a reportes
- ❌ No puede acceder a configuración

**Casos de uso:**
- Promotores de ventas externos
- Personal temporal
- Vendedores con acceso restringido

---

### 4. 📊 CONTADOR
**Acceso:** Consultivo y Reportes
**Descripción:** Acceso a reportes contables, facturas de solo lectura y configuración fiscal.

**Permisos:**
- ✅ Ver dashboard y KPIs
- ✅ Ver facturas (solo lectura)
- ✅ Descargar PDFs de facturas
- ✅ Ver clientes (solo lectura)
- ✅ Ver productos/servicios (solo lectura)
- ✅ Acceso completo a reportes
- ✅ Ver Libro de Ventas
- ✅ Ver Reporte IGTF
- ✅ Exportar reportes
- ✅ Ver configuración del sistema

**Restricciones:**
- ❌ No puede crear o modificar facturas
- ❌ No puede anular facturas
- ❌ No puede crear clientes o productos
- ❌ No puede modificar configuración del sistema
- ❌ No puede gestionar usuarios

**Casos de uso:**
- Contador de la empresa
- Auditor interno
- Analista financiero

---

## Matriz de Permisos

| Permiso | Administrador | Vendedor | Promotor | Contador |
|---------|:-------------:|:--------:|:--------:|:--------:|
| **Dashboard** |
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |
| Ver KPIs | ✅ | ❌ | ❌ | ✅ |
| **Facturas** |
| Crear facturas | ✅ | ✅ | ✅ | ❌ |
| Ver facturas | ✅ | ✅ | ✅ | ✅ |
| Editar facturas | ✅ | ❌ | ❌ | ❌ |
| Anular facturas | ✅ | ❌ | ❌ | ❌ |
| Crear notas crédito/débito | ✅ | ❌ | ❌ | ❌ |
| Descargar PDFs | ✅ | ✅ | ✅ | ✅ |
| **Clientes** |
| Crear clientes | ✅ | ✅ | ❌ | ❌ |
| Ver clientes | ✅ | ✅ | ✅ | ✅ |
| Editar clientes | ✅ | ✅ | ❌ | ❌ |
| Eliminar clientes | ✅ | ❌ | ❌ | ❌ |
| **Productos/Servicios** |
| Crear items | ✅ | ❌ | ❌ | ❌ |
| Ver items | ✅ | ✅ | ✅ | ✅ |
| Editar items | ✅ | ❌ | ❌ | ❌ |
| Eliminar items | ✅ | ❌ | ❌ | ❌ |
| **Reportes** |
| Ver reportes | ✅ | ❌ | ❌ | ✅ |
| Libro de ventas | ✅ | ❌ | ❌ | ✅ |
| Reporte IGTF | ✅ | ❌ | ❌ | ✅ |
| Exportar reportes | ✅ | ❌ | ❌ | ✅ |
| **Configuración** |
| Ver configuración | ✅ | ❌ | ❌ | ✅ |
| Editar configuración | ✅ | ❌ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |
| Gestionar números control | ✅ | ❌ | ❌ | ❌ |

---

## Implementación Técnica

### Archivo de Permisos
El sistema de permisos está definido en `src/lib/permissions.ts` que contiene:
- Tipos de permisos disponibles
- Permisos asignados a cada rol
- Funciones de verificación de permisos

### Hook de Permisos
`src/hooks/use-permissions.tsx` proporciona:
```typescript
const { can, canAny, canAll, isRole, role } = usePermissions();

// Verificar un permiso
if (can('create_invoice')) {
  // Mostrar botón de crear factura
}

// Verificar múltiples permisos (OR)
if (canAny(['edit_invoice', 'void_invoice'])) {
  // Mostrar opciones de edición
}
```

### Componente Protected
`src/components/auth/protected.tsx` protege componentes y rutas:

```typescript
// Proteger un componente
<Protected permission="create_invoice">
  <CreateInvoiceButton />
</Protected>

// Proteger con múltiples permisos
<Protected permissions={['edit_customer', 'delete_customer']} requireAll>
  <CustomerActions />
</Protected>

// Ocultar sin mostrar mensaje
<ProtectedHidden permission="view_reports">
  <ReportsMenuItem />
</ProtectedHidden>
```

---

## Migración de Base de Datos

### Aplicar Migración
Para habilitar el sistema de roles en la base de datos:

1. Abre el panel de Supabase
2. Ve a SQL Editor
3. Ejecuta el contenido de `migration-users-roles.sql`

### Usuarios de Prueba
La migración crea 4 usuarios de prueba:

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@axiona.com | (por configurar) | Administrador |
| vendedor@axiona.com | (por configurar) | Vendedor |
| promotor@axiona.com | (por configurar) | Promotor |
| contador@axiona.com | (por configurar) | Contador |

⚠️ **Importante:** Cambia las contraseñas por defecto antes de usar en producción.

---

## Uso en Componentes

### Ejemplo: Botón Protegido
```typescript
import { Protected } from '@/components/auth/protected';

function InvoiceActions({ invoice }) {
  return (
    <div>
      {/* Todos pueden ver */}
      <Button>Ver Factura</Button>

      {/* Solo administradores */}
      <Protected permission="void_invoice">
        <Button variant="destructive">Anular Factura</Button>
      </Protected>

      {/* Vendedores y administradores */}
      <Protected permissions={['create_invoice', 'edit_invoice']}>
        <Button>Editar</Button>
      </Protected>
    </div>
  );
}
```

### Ejemplo: Navegación Condicional
```typescript
import { usePermissions } from '@/hooks/use-permissions';

function Navigation() {
  const { can } = usePermissions();

  return (
    <nav>
      {can('view_dashboard') && <Link to="/dashboard">Dashboard</Link>}
      {can('view_invoices') && <Link to="/facturas">Facturas</Link>}
      {can('view_reports') && <Link to="/reportes">Reportes</Link>}
    </nav>
  );
}
```

---

## Mejores Prácticas

1. **Verificar permisos en el frontend Y backend:** Nunca confíes solo en la verificación del frontend
2. **Usar el componente Protected:** Mantiene el código limpio y consistente
3. **Mensajes claros:** Informa al usuario por qué no tiene acceso
4. **Auditoría:** Registra acciones importantes con el rol del usuario
5. **Principio de mínimo privilegio:** Asigna solo los permisos necesarios

---

## Agregar Nuevos Permisos

1. Define el permiso en `src/lib/permissions.ts`:
```typescript
export type Permission =
  | 'existing_permission'
  | 'new_permission'; // Agregar aquí
```

2. Asigna el permiso a los roles apropiados:
```typescript
const rolePermissions: Record<UserRole, Permission[]> = {
  administrador: [
    'existing_permission',
    'new_permission', // Agregar aquí
  ],
  // ...
};
```

3. Usa el permiso en componentes:
```typescript
<Protected permission="new_permission">
  <NewFeature />
</Protected>
```

---

## Preguntas Frecuentes

**Q: ¿Puedo asignar múltiples roles a un usuario?**
A: No, cada usuario tiene un solo rol. Si necesitas más flexibilidad, considera crear roles híbridos.

**Q: ¿Cómo cambio el rol de un usuario?**
A: Solo los administradores pueden gestionar usuarios desde el panel de administración.

**Q: ¿Los permisos se verifican en el backend?**
A: La verificación del frontend es solo para UX. Debes implementar verificación de permisos en tu API también.

**Q: ¿Puedo personalizar los permisos de un rol?**
A: Sí, edita el archivo `src/lib/permissions.ts` y modifica el array de permisos del rol correspondiente.

---

## Soporte

Para más información o soporte, contacta al equipo de desarrollo o consulta la documentación técnica del proyecto.
