# 🚀 Sistema de Facturación Venezolano - Modo Desarrollo

## ✅ Problema de Autenticación RESUELTO

El sistema ahora funciona correctamente en **modo desarrollo** sin necesidad de Supabase.

## 🔐 Credenciales de Desarrollo

Puedes hacer login con cualquiera de estas credenciales:

| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| **Administrador** | `admin@sistema.com` | `admin123` | Super Admin |
| **Contador** | `contador@sistema.com` | `contador123` | Contador |
| **Vendedor** | `vendedor@sistema.com` | `vendedor123` | Vendedor |

## 🔧 Configuración Actual

- **Modo**: Desarrollo (Mock Data)
- **Servidor**: `http://localhost:5176`
- **Estado Supabase**: Deshabilitado (proyecto no existe)
- **Autenticación**: Sistema mock local
- **Facturas**: Datos mock con productos y precios reales

## ✨ Funcionalidades Disponibles

✅ **Login/Logout** - Funcional con usuarios mock
✅ **Sistema de Facturas** - 5 facturas de ejemplo con totales reales
✅ **Creación de Facturas** - Wizard completo funcionando en modo mock
✅ **Productos y Precios** - Items detallados con IVA calculado
✅ **TFHKA Simulation** - Envío fiscal simulado exitosamente
✅ **Sistema de Auditoría** - Registra eventos de seguridad
✅ **Control de Sesiones** - Gestión de tokens y timeouts
✅ **Roles y Permisos** - Sistema granular por módulos
✅ **Interfaz Responsiva** - Desktop y móvil
✅ **Monitoreo BCV** - Tasas de cambio automáticas

## 📊 **Facturas de Ejemplo**

Las facturas ahora muestran totales reales:
- **FAC-000027**: $185.60 (Servicios IT + Hosting) - Nota de Crédito
- **FAC-000026**: $837.40 (Desarrollo Web + Dominio) - Emitida
- **FAC-000025**: $1,115.20 (Laptops + Mouse) - Emitida
- **FAC-000024**: $440.80 (POS + Impresora) - Emitida
- **FAC-000023**: $144.00 (Curso Marketing) - Emitida

## 🎯 Próximos Pasos

1. **Probar Login**: Usa cualquiera de las credenciales de arriba
2. **Explorar Sistema**: Navega por todos los módulos
3. **Configurar Supabase Real**: Cuando tengas un proyecto real de Supabase

## 🔄 Modo Producción

Para usar con Supabase real:

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ejecuta los scripts SQL en tu base de datos:
   - `supabase-complete.sql`
   - `supabase-missing-tables.sql`
   - `update-user-passwords.sql`
3. Actualiza las credenciales en `.env`

---

**¡El sistema ya está listo para usar! 🎉**