# 🔄 RESET DE AMBIENTE DE PRUEBAS - SISTEMA FACTURACIÓN

## 📋 **RESUMEN EJECUTIVO**

Sistema completo para resetear el ambiente de pruebas del sistema de facturación venezolano, eliminando todos los datos operacionales pero preservando configuraciones críticas.

### 🎯 **¿QUÉ HACE?**
- ✅ **Mantiene**: Usuarios, permisos, configuración de empresa
- ❌ **Elimina**: Facturas, clientes, productos, numeraciones
- 🔄 **Resetea**: Secuencias a estado inicial
- 📦 **Incluye**: Datos de prueba básicos

---

## 📁 **ARCHIVOS INCLUIDOS**

| Archivo | Propósito |
|---------|-----------|
| `reset-ejecutor.sh` | **🚀 Script principal** - Coordina todo el proceso |
| `backup-before-reset.sql` | **💾 Backup selectivo** - Respaldo de configuraciones |
| `reset-test-environment.sql` | **🗑️ Reset principal** - Limpieza y reset |
| `CHECKLIST-RESET-AMBIENTE-PRUEBAS.md` | **📋 Checklist completo** - Validaciones paso a paso |
| `README-RESET-AMBIENTE.md` | **📖 Este archivo** - Documentación |

---

## 🚀 **EJECUCIÓN RÁPIDA**

### Opción 1: Script Automático (Recomendado)
```bash
# Configurar variables
export DB_HOST=localhost
export DB_USER=postgres
export DB_NAME=facturacion_test

# Ejecutar
./reset-ejecutor.sh
```

### Opción 2: Manual
```bash
# 1. Backup
psql -h localhost -U postgres -d facturacion_test -f backup-before-reset.sql

# 2. Reset
psql -h localhost -U postgres -d facturacion_test -f reset-test-environment.sql
```

---

## ⚠️ **ADVERTENCIAS CRÍTICAS**

### 🚫 **NUNCA usar en PRODUCCIÓN**
- Este sistema está diseñado **EXCLUSIVAMENTE** para ambientes de pruebas
- Incluye verificaciones para detectar bases de datos de producción
- Si el script detecta facturas marcadas como "PROD", **aborta automáticamente**

### 🔒 **Verificaciones de Seguridad Incluidas**
- Detección automática de ambiente por nombre de BD
- Verificación de facturas de producción recientes
- Confirmación manual del usuario requerida
- Backup automático antes de cualquier operación

---

## 📊 **ESTRATEGIA DE DATOS**

### 🟢 **PRESERVADO** (No se modifica)
```sql
-- Usuarios y autenticación
users (id, email, nombre, rol, activo, ...)

-- Permisos del sistema
user_permissions (user_id, modulo, puede_leer, puede_escribir, puede_eliminar)

-- Configuración empresarial
company_settings (razon_social, rif, domicilio_fiscal, ...)

-- Auditoría de permisos
permission_audit (user_id, accion, timestamp, ...)
```

### 🔴 **ELIMINADO** (Datos operacionales)
```sql
-- Facturas y documentos fiscales
invoices (numero, numero_control, fecha, totales, ...)

-- Base de clientes
customers (rif, razon_social, domicilio, ...)

-- Catálogo de productos/servicios
items (codigo, descripcion, precio_base, ...)

-- Control de numeración
control_number_batches (range_from, range_to, used, ...)
```

### 🆕 **AGREGADO** (Datos de prueba)
```sql
-- Cliente de prueba predeterminado
INSERT INTO customers VALUES (
  'V-12345678-9',
  'CLIENTE PRUEBA FACTURACION',
  'Cliente de Prueba',
  'Avenida Principal, Caracas 1000',
  '+58 212 555-0001',
  'prueba@facturacion.test',
  'ordinario'
);

-- Productos/servicios de prueba
INSERT INTO items VALUES
  ('PROD-001', 'Producto de Prueba', 'producto', 100.00, true),
  ('SERV-001', 'Servicio de Prueba', 'servicio', 250.00, true);

-- Lote inicial de números de control
INSERT INTO control_number_batches VALUES (1, 1000, true, 0, 1000);
```

---

## 🔧 **CONFIGURACIÓN**

### Variables de Ambiente
```bash
# PostgreSQL Connection
export DB_HOST=localhost          # Host de la base de datos
export DB_USER=postgres           # Usuario de PostgreSQL
export DB_NAME=facturacion_test   # Nombre de la base de datos

# Opcional: Password
export PGPASSWORD=tu_password     # Evita prompt de password
```

### Supabase Cloud
```bash
# Para Supabase Cloud
export DB_HOST=db.xxxxxxxx.supabase.co
export DB_USER=postgres
export DB_NAME=postgres
export PGPASSWORD=tu_supabase_password
```

---

## 📋 **PROCESO PASO A PASO**

### 1. **Verificaciones Iniciales**
- ✅ Confirmar que es ambiente de pruebas
- ✅ Probar conexión a base de datos
- ✅ Verificar archivos necesarios
- ✅ Validar permisos de usuario

### 2. **Backup Selectivo**
- 💾 Respaldar usuarios activos
- 💾 Respaldar permisos de módulos
- 💾 Respaldar configuración de empresa
- 💾 Crear script de restauración

### 3. **Reset Operacional**
- 🗑️ Limpiar facturas (con FK constraints)
- 🗑️ Limpiar clientes
- 🗑️ Limpiar productos/servicios
- 🗑️ Limpiar lotes de numeración

### 4. **Reinicialización**
- 🔄 Resetear secuencias automáticas
- 🆕 Crear lote inicial de números de control
- 🆕 Insertar datos de prueba básicos
- 📝 Registrar en auditoría

### 5. **Validaciones Finales**
- ✅ Verificar conteos de registros
- ✅ Probar funcionalidad básica
- ✅ Confirmar integridad referencial
- ✅ Generar reporte final

---

## 🔍 **VALIDACIÓN POST-RESET**

### Consultas de Verificación
```sql
-- Estado final esperado
SELECT 'Facturas' as tabla, COUNT(*) as registros FROM invoices;      -- 0
SELECT 'Clientes' as tabla, COUNT(*) as registros FROM customers;     -- 1
SELECT 'Items' as tabla, COUNT(*) as registros FROM items;           -- 2
SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM users;        -- N (mantenidos)
SELECT 'Config' as tabla, COUNT(*) as registros FROM company_settings; -- 1 (mantenida)

-- Verificar datos de prueba
SELECT rif, razon_social FROM customers;
SELECT codigo, descripcion FROM items;
SELECT range_from, range_to, remaining FROM control_number_batches;
```

### Pruebas Funcionales Básicas
```bash
# 1. Login en la aplicación
# 2. Crear nuevo cliente
# 3. Crear nuevo producto
# 4. Generar primera factura
# 5. Verificar numeración secuencial
```

---

## 🆘 **RECUPERACIÓN EN CASO DE PROBLEMAS**

### Si el reset falla a medias:
```sql
-- Verificar si existe backup
\d backup_temp_reset.*

-- Restaurar configuraciones críticas
SELECT sql_command FROM backup_temp_reset.restauracion_script ORDER BY orden;

-- Ejecutar restauración
\gexec
```

### Si se perdieron configuraciones:
```sql
-- Restaurar usuarios
INSERT INTO users SELECT * FROM backup_temp_reset.users_backup
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Restaurar permisos
INSERT INTO user_permissions SELECT * FROM backup_temp_reset.user_permissions_backup
ON CONFLICT (user_id, modulo) DO UPDATE SET puede_leer = EXCLUDED.puede_leer;

-- Restaurar configuración empresa
INSERT INTO company_settings SELECT * FROM backup_temp_reset.company_settings_backup
ON CONFLICT (id) DO UPDATE SET razon_social = EXCLUDED.razon_social;
```

---

## 📞 **SOPORTE Y CONTACTO**

### En caso de problemas:
1. **Revisar logs** en `database/logs/`
2. **Consultar checklist** detallado
3. **Verificar backup** en schema `backup_temp_reset`
4. **Contactar equipo de desarrollo**

### Logs Importantes:
- `logs/backup_YYYYMMDD_HHMMSS.log` - Log del backup
- `logs/reset_YYYYMMDD_HHMMSS.log` - Log del reset principal
- `logs/validation_YYYYMMDD_HHMMSS.log` - Log de validaciones
- `logs/reset_report_YYYYMMDD_HHMMSS.md` - Reporte final

---

## ✅ **CHECKLIST EJECUTIVO**

Para uso del script completo:

- [ ] ✅ **Confirmar ambiente de pruebas**
- [ ] ✅ **Configurar variables de conexión**
- [ ] ✅ **Ejecutar: `./reset-ejecutor.sh`**
- [ ] ✅ **Revisar logs generados**
- [ ] ✅ **Ejecutar validaciones básicas**
- [ ] ✅ **Confirmar funcionalidad del sistema**
- [ ] ✅ **Notificar equipo que ambiente está listo**

---

## 🎯 **RESULTADO FINAL**

Después del reset exitoso tendrás:

- **Sistema limpio** para nuevas pruebas
- **Usuarios y permisos** preservados
- **Configuración empresarial** intacta
- **Numeración** iniciando desde 1
- **Datos de prueba** básicos disponibles
- **Backup completo** por seguridad

**¡Ambiente listo para pruebas intensivas!** 🚀