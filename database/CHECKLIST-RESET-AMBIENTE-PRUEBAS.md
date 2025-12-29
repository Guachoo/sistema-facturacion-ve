# 📋 CHECKLIST - RESET AMBIENTE DE PRUEBAS

## ⚠️ **ADVERTENCIA CRÍTICA**
- **SOLO para ambientes de PRUEBAS/TEST/DEV**
- **NUNCA ejecutar en PRODUCCIÓN**
- Este proceso **ELIMINA TODOS** los datos operacionales

---

## 🎯 **OBJETIVO**
Resetear el sistema de facturación a estado inicial limpio, manteniendo:
- ✅ Usuarios y permisos
- ✅ Configuraciones de empresa
- ✅ Estructura de base de datos
- ❌ Eliminando: facturas, clientes, productos, numeraciones

---

## 📝 **PREPARACIÓN PRE-RESET**

### 1. Verificación de Ambiente
- [ ] ✅ Confirmar que es ambiente de **PRUEBAS** (no producción)
- [ ] ✅ Verificar nombre de base de datos (`*test*`, `*prueba*`, `*dev*`)
- [ ] ✅ Confirmar con equipo que es momento adecuado para reset
- [ ] ✅ Notificar a usuarios del sistema sobre el downtime

### 2. Backup de Configuraciones
```sql
-- Ejecutar PRIMERO:
psql -h [HOST] -U [USER] -d [DATABASE] -f backup-before-reset.sql
```
- [ ] ✅ Backup ejecutado sin errores
- [ ] ✅ Verificar que se creó schema `backup_temp_reset`
- [ ] ✅ Confirmar usuarios respaldados: `SELECT COUNT(*) FROM backup_temp_reset.users_backup`
- [ ] ✅ Confirmar configuraciones respaldadas: `SELECT COUNT(*) FROM backup_temp_reset.company_settings_backup`

### 3. Backup Externo (Opcional pero Recomendado)
```bash
# Backup completo como seguridad adicional
pg_dump -h [HOST] -U [USER] -d [DATABASE] > backup_completo_$(date +%Y%m%d_%H%M%S).sql
```
- [ ] ✅ Backup externo creado (opcional)

---

## 🚀 **EJECUCIÓN DEL RESET**

### 4. Ejecutar Reset Principal
```sql
-- Ejecutar script principal:
psql -h [HOST] -U [USER] -d [DATABASE] -f reset-test-environment.sql
```
- [ ] ✅ Script ejecutado sin errores fatales
- [ ] ✅ Verificaciones de ambiente pasadas
- [ ] ✅ Todas las tablas operacionales limpiadas
- [ ] ✅ Datos de prueba insertados correctamente
- [ ] ✅ Log de auditoría creado

---

## 🔍 **VALIDACIONES POST-RESET**

### 5. Verificación de Datos
```sql
-- Ejecutar estas consultas para verificar:

-- 5.1 Facturas (debe ser 0)
SELECT COUNT(*) as facturas_count FROM invoices; -- Esperado: 0

-- 5.2 Clientes (debe ser 1 - cliente prueba)
SELECT COUNT(*) as clientes_count FROM customers; -- Esperado: 1
SELECT rif, razon_social FROM customers; -- Verificar cliente prueba

-- 5.3 Items (debe ser 2 - items prueba)
SELECT COUNT(*) as items_count FROM items; -- Esperado: 2
SELECT codigo, descripcion FROM items; -- Verificar items prueba

-- 5.4 Usuarios (MANTENIDOS - verificar que no se perdieron)
SELECT COUNT(*) as usuarios_count FROM users;
SELECT email, nombre, rol FROM users WHERE activo = true;

-- 5.5 Configuración empresa (MANTENIDA)
SELECT COUNT(*) as config_count FROM company_settings;
SELECT razon_social, rif FROM company_settings;

-- 5.6 Lotes de numeración (debe tener lote inicial)
SELECT COUNT(*) as lotes_count FROM control_number_batches;
SELECT range_from, range_to, remaining FROM control_number_batches;
```

### 6. Checklist de Validación
- [ ] ✅ **Facturas**: 0 registros
- [ ] ✅ **Clientes**: 1 registro (cliente prueba)
- [ ] ✅ **Items**: 2 registros (items prueba)
- [ ] ✅ **Usuarios**: Mantenidos (verificar cantidad esperada)
- [ ] ✅ **Configuración**: Mantenida
- [ ] ✅ **Lotes numeración**: 1 lote activo (1-1000)
- [ ] ✅ **Auditoría**: Log de reset creado

---

## 🧪 **PRUEBAS FUNCIONALES**

### 7. Pruebas Básicas del Sistema
- [ ] ✅ **Login**: Usuarios pueden autenticarse
- [ ] ✅ **Permisos**: Módulos accesibles según permisos
- [ ] ✅ **Cliente nuevo**: Crear cliente adicional
- [ ] ✅ **Item nuevo**: Crear producto/servicio adicional
- [ ] ✅ **Factura nueva**: Crear primera factura post-reset
- [ ] ✅ **Numeración**: Números de control se asignan correctamente
- [ ] ✅ **Dashboard**: Estadísticas se muestran (en 0)

### 8. Verificación de Numeración
```sql
-- Verificar que las numeraciones inician desde 1
SELECT
    numero,
    numero_control,
    fecha
FROM invoices
ORDER BY created_at DESC
LIMIT 5;
```
- [ ] ✅ Primera factura tiene número 1 o secuencia correcta
- [ ] ✅ Número de control se asigna del lote inicial

---

## 🔧 **RESTAURACIÓN DE CONFIGURACIONES**

### 9. Restaurar Configuraciones si es Necesario
```sql
-- Si se perdieron configuraciones, restaurar desde backup:
SELECT sql_command FROM backup_temp_reset.restauracion_script ORDER BY orden;

-- Ejecutar cada comando manualmente o usar:
-- \gexec para ejecutar automáticamente
```
- [ ] ✅ Configuraciones restauradas si fue necesario

---

## 🧹 **LIMPIEZA POST-RESET**

### 10. Limpieza Opcional
```sql
-- Remover schema de backup temporal (SOLO si todo está correcto)
-- DROP SCHEMA backup_temp_reset CASCADE;
```
- [ ] ✅ Backup temporal mantenido por seguridad
- [ ] ✅ O eliminado si ya no se necesita

---

## 📊 **REPORTE FINAL**

### 11. Documentar Reset
```
Fecha/Hora: ____________________
Ejecutado por: _________________
Base de datos: _________________
Ambiente: _____________________

Resultados:
- Facturas eliminadas: _________
- Clientes eliminados: _________ (dejando 1 de prueba)
- Items eliminados: ___________ (dejando 2 de prueba)
- Usuarios mantenidos: ________
- Configuraciones mantenidas: __

Observaciones:
________________________________
________________________________

Reset completado: ✅ SÍ / ❌ NO
```

---

## 🆘 **EN CASO DE PROBLEMAS**

### Si algo sale mal:
1. **NO ENTRAR EN PÁNICO**
2. **Revisar logs de error específicos**
3. **Verificar que backup existe**: `\d backup_temp_reset.*`
4. **Restaurar desde backup externo si es necesario**
5. **Contactar al equipo de desarrollo**

### Comandos de Emergencia:
```sql
-- Ver backups disponibles
\d backup_temp_reset.*

-- Restaurar usuarios
SELECT sql_command FROM backup_temp_reset.restauracion_script WHERE seccion = 'restore_users';

-- Restaurar configuraciones
SELECT sql_command FROM backup_temp_reset.restauracion_script WHERE seccion = 'restore_company_settings';
```

---

## ✅ **CONFIRMACIÓN FINAL**

- [ ] ✅ Reset completado exitosamente
- [ ] ✅ Todas las validaciones pasadas
- [ ] ✅ Sistema funcional para pruebas
- [ ] ✅ Backup de configuraciones preservado
- [ ] ✅ Equipo notificado del completion
- [ ] ✅ Documentación actualizada

**Firma responsable**: _________________________ **Fecha**: _____________

---

## 📞 **CONTACTOS DE SOPORTE**

- **Desarrollador**: _________________________
- **DBA**: ___________________________________
- **Equipo QA**: _____________________________

**Ambiente listo para nuevas pruebas** 🎉