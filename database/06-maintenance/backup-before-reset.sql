-- =====================================================
-- BACKUP ANTES DEL RESET - ENTORNO DE PRUEBAS
-- =====================================================
-- Script para hacer backup selectivo antes del reset
-- Guarda solo configuraciones críticas, no datos operacionales
-- =====================================================

-- =====================================================
-- CREAR SCHEMA TEMPORAL PARA BACKUP
-- =====================================================
CREATE SCHEMA IF NOT EXISTS backup_temp_reset;

-- =====================================================
-- BACKUP 1: USUARIOS Y PERMISOS
-- =====================================================

-- Backup de usuarios
CREATE TABLE backup_temp_reset.users_backup AS
SELECT
    id,
    email,
    nombre,
    rol,
    activo,
    ultimo_acceso,
    created_at,
    updated_at
FROM users
WHERE activo = true; -- Solo usuarios activos

-- Backup de permisos
CREATE TABLE backup_temp_reset.user_permissions_backup AS
SELECT
    user_id,
    modulo,
    puede_leer,
    puede_escribir,
    puede_eliminar,
    created_at,
    updated_at
FROM user_permissions up
WHERE EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = up.user_id
    AND u.activo = true
);

-- =====================================================
-- BACKUP 2: CONFIGURACIÓN DE EMPRESA
-- =====================================================

CREATE TABLE backup_temp_reset.company_settings_backup AS
SELECT
    id,
    razon_social,
    rif,
    domicilio_fiscal,
    telefonos,
    email,
    logo,
    condiciones_venta,
    created_at,
    updated_at
FROM company_settings;

-- =====================================================
-- BACKUP 3: CONFIGURACIONES DEL SISTEMA
-- =====================================================

-- Si existen otras tablas de configuración, agregarlas aquí
-- Ejemplo: configuraciones fiscales, tasas, etc.

-- =====================================================
-- BACKUP 4: ÚLTIMO ESTADO DE NUMERACIONES
-- =====================================================

CREATE TABLE backup_temp_reset.numeracion_state AS
SELECT
    'ultimo_numero_factura' as tipo,
    COALESCE(MAX(CAST(numero AS INTEGER)), 0) as ultimo_numero,
    NOW() as fecha_backup
FROM invoices
WHERE numero ~ '^[0-9]+$'  -- Solo números

UNION ALL

SELECT
    'ultimo_control_number' as tipo,
    COALESCE(MAX(CAST(numero_control AS INTEGER)), 0) as ultimo_numero,
    NOW() as fecha_backup
FROM invoices
WHERE numero_control ~ '^[0-9]+$'; -- Solo números

-- =====================================================
-- BACKUP 5: ESTADÍSTICAS PARA VALIDACIÓN
-- =====================================================

CREATE TABLE backup_temp_reset.pre_reset_stats AS
SELECT
    'invoices' as tabla,
    COUNT(*) as total_registros,
    MIN(created_at) as fecha_primer_registro,
    MAX(created_at) as fecha_ultimo_registro,
    NOW() as fecha_backup
FROM invoices

UNION ALL

SELECT
    'customers' as tabla,
    COUNT(*) as total_registros,
    MIN(created_at) as fecha_primer_registro,
    MAX(created_at) as fecha_ultimo_registro,
    NOW() as fecha_backup
FROM customers

UNION ALL

SELECT
    'items' as tabla,
    COUNT(*) as total_registros,
    MIN(created_at) as fecha_primer_registro,
    MAX(created_at) as fecha_ultimo_registro,
    NOW() as fecha_backup
FROM items;

-- =====================================================
-- GENERAR SCRIPT DE RESTAURACIÓN
-- =====================================================

-- Crear vista con script de restauración
CREATE OR REPLACE VIEW backup_temp_reset.restauracion_script AS
SELECT
    'restore_users' as seccion,
    1 as orden,
    'INSERT INTO users (id, email, nombre, rol, activo, ultimo_acceso, created_at, updated_at)
     SELECT id, email, nombre, rol, activo, ultimo_acceso, created_at, updated_at
     FROM backup_temp_reset.users_backup
     ON CONFLICT (id) DO UPDATE SET
     email = EXCLUDED.email,
     nombre = EXCLUDED.nombre,
     rol = EXCLUDED.rol,
     activo = EXCLUDED.activo;' as sql_command

UNION ALL

SELECT
    'restore_permissions' as seccion,
    2 as orden,
    'INSERT INTO user_permissions (user_id, modulo, puede_leer, puede_escribir, puede_eliminar, created_at, updated_at)
     SELECT user_id, modulo, puede_leer, puede_escribir, puede_eliminar, created_at, updated_at
     FROM backup_temp_reset.user_permissions_backup
     ON CONFLICT (user_id, modulo) DO UPDATE SET
     puede_leer = EXCLUDED.puede_leer,
     puede_escribir = EXCLUDED.puede_escribir,
     puede_eliminar = EXCLUDED.puede_eliminar;' as sql_command

UNION ALL

SELECT
    'restore_company_settings' as seccion,
    3 as orden,
    'INSERT INTO company_settings (id, razon_social, rif, domicilio_fiscal, telefonos, email, logo, condiciones_venta, created_at, updated_at)
     SELECT id, razon_social, rif, domicilio_fiscal, telefonos, email, logo, condiciones_venta, created_at, updated_at
     FROM backup_temp_reset.company_settings_backup
     ON CONFLICT (id) DO UPDATE SET
     razon_social = EXCLUDED.razon_social,
     rif = EXCLUDED.rif,
     domicilio_fiscal = EXCLUDED.domicilio_fiscal;' as sql_command

ORDER BY orden;

-- =====================================================
-- VERIFICACIONES DE BACKUP
-- =====================================================

DO $$
DECLARE
    users_count INTEGER;
    permissions_count INTEGER;
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO users_count FROM backup_temp_reset.users_backup;
    SELECT COUNT(*) INTO permissions_count FROM backup_temp_reset.user_permissions_backup;
    SELECT COUNT(*) INTO settings_count FROM backup_temp_reset.company_settings_backup;

    RAISE NOTICE '=== BACKUP COMPLETADO ===';
    RAISE NOTICE 'Usuarios respaldados: %', users_count;
    RAISE NOTICE 'Permisos respaldados: %', permissions_count;
    RAISE NOTICE 'Configuraciones respaldadas: %', settings_count;
    RAISE NOTICE 'Timestamp: %', NOW();

    IF users_count = 0 THEN
        RAISE WARNING 'ADVERTENCIA: No se respaldaron usuarios';
    END IF;

    IF settings_count = 0 THEN
        RAISE WARNING 'ADVERTENCIA: No se respaldaron configuraciones';
    END IF;

    RAISE NOTICE 'Backup almacenado en schema: backup_temp_reset';
    RAISE NOTICE 'Para restaurar, ejecute las consultas de la vista restauracion_script';
END $$;

-- =====================================================
-- LOG DEL BACKUP
-- =====================================================

INSERT INTO permission_audit (
    accion,
    detalles,
    timestamp
) VALUES (
    'BACKUP_BEFORE_RESET',
    '{"action": "backup_completed", "schema": "backup_temp_reset", "timestamp": "' || NOW()::text || '"}',
    NOW()
);

RAISE NOTICE 'Backup completado y registrado en auditoría';

-- =====================================================
-- INSTRUCCIONES FINALES
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'BACKUP PRE-RESET COMPLETADO';
RAISE NOTICE 'Ahora puede ejecutar: reset-test-environment.sql';
RAISE NOTICE 'Para restaurar configuraciones use:';
RAISE NOTICE 'SELECT * FROM backup_temp_reset.restauracion_script ORDER BY orden;';
RAISE NOTICE '==============================================';