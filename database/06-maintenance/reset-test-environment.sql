-- =====================================================
-- RESET SISTEMA FACTURACIÓN - ENTORNO DE PRUEBAS
-- =====================================================
-- ADVERTENCIA: SOLO PARA AMBIENTE DE PRUEBAS
-- Este script elimina TODOS los datos operacionales
-- pero mantiene usuarios, permisos y configuraciones
-- =====================================================

-- =====================================================
-- PASO 1: BACKUP PREVIO (EJECUTAR MANUALMENTE)
-- =====================================================
-- Antes de ejecutar este script, hacer backup:
--
-- pg_dump -h [HOST] -U [USER] -d [DB] --data-only \
--   --table=users \
--   --table=user_permissions \
--   --table=company_settings \
--   > backup_config_$(date +%Y%m%d_%H%M%S).sql

-- =====================================================
-- PASO 2: VERIFICACIÓN DE AMBIENTE
-- =====================================================
-- Confirmar que estamos en ambiente de PRUEBAS
DO $$
BEGIN
    -- Verificar que no hay facturas de producción recientes
    IF EXISTS (
        SELECT 1 FROM invoices
        WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'
        AND numero LIKE '%PROD%'
    ) THEN
        RAISE EXCEPTION 'PELIGRO: Detectadas facturas de producción recientes. ABORTANDO RESET.';
    END IF;

    -- Verificar que estamos en base de datos de pruebas
    IF CURRENT_DATABASE() NOT ILIKE '%test%'
       AND CURRENT_DATABASE() NOT ILIKE '%prueba%'
       AND CURRENT_DATABASE() NOT ILIKE '%dev%' THEN
        RAISE WARNING 'ADVERTENCIA: No se detectó nombre de BD de pruebas. Confirme que es ambiente correcto.';
    END IF;

    RAISE NOTICE 'Verificaciones completadas. Iniciando reset...';
END $$;

-- =====================================================
-- PASO 3: DESACTIVAR TRIGGERS Y CONSTRAINTS TEMPORALMENTE
-- =====================================================
-- Deshabilitar triggers para evitar problemas con FKs
SET session_replication_role = replica;

-- =====================================================
-- PASO 4: LIMPIEZA DE DATOS OPERACIONALES
-- =====================================================

-- ORDEN IMPORTANTE: Eliminar primero las tablas dependientes

-- 4.1 Eliminar facturas (contiene FK a customers)
TRUNCATE TABLE invoices RESTART IDENTITY CASCADE;
RAISE NOTICE 'Facturas eliminadas: %', (SELECT COUNT(*) FROM invoices);

-- 4.2 Eliminar clientes
TRUNCATE TABLE customers RESTART IDENTITY CASCADE;
RAISE NOTICE 'Clientes eliminados: %', (SELECT COUNT(*) FROM customers);

-- 4.3 Eliminar productos/servicios
TRUNCATE TABLE items RESTART IDENTITY CASCADE;
RAISE NOTICE 'Items eliminados: %', (SELECT COUNT(*) FROM items);

-- 4.4 Resetear lotes de numeración
TRUNCATE TABLE control_number_batches RESTART IDENTITY CASCADE;
RAISE NOTICE 'Lotes de numeración reseteados: %', (SELECT COUNT(*) FROM control_number_batches);

-- =====================================================
-- PASO 5: RESETEAR SECUENCIAS Y NUMERACIONES
-- =====================================================

-- 5.1 Resetear secuencias automáticas si existen
DO $$
BEGIN
    -- Resetear secuencia de facturas si existe
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices_numero_seq') THEN
        ALTER SEQUENCE invoices_numero_seq RESTART WITH 1;
        RAISE NOTICE 'Secuencia de facturas reseteada';
    END IF;

    -- Resetear secuencia de control si existe
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices_numero_control_seq') THEN
        ALTER SEQUENCE invoices_numero_control_seq RESTART WITH 1;
        RAISE NOTICE 'Secuencia de números de control reseteada';
    END IF;
END $$;

-- 5.2 Crear lote inicial de números de control para pruebas
INSERT INTO control_number_batches (
    range_from,
    range_to,
    active,
    used,
    remaining,
    created_at
) VALUES (
    1,
    1000,
    true,
    0,
    1000,
    NOW()
);

RAISE NOTICE 'Lote de números de control creado: 1-1000';

-- =====================================================
-- PASO 6: REACTIVAR TRIGGERS Y CONSTRAINTS
-- =====================================================
SET session_replication_role = DEFAULT;

-- =====================================================
-- PASO 7: INSERTAR DATOS DE PRUEBA BÁSICOS
-- =====================================================

-- 7.1 Cliente de prueba por defecto
INSERT INTO customers (
    rif,
    razon_social,
    nombre,
    domicilio,
    telefono,
    email,
    tipo_contribuyente,
    created_at
) VALUES (
    'V-12345678-9',
    'CLIENTE PRUEBA FACTURACION',
    'Cliente de Prueba',
    'Avenida Principal, Caracas 1000',
    '+58 212 555-0001',
    'prueba@facturacion.test',
    'ordinario',
    NOW()
);

-- 7.2 Producto/servicio de prueba por defecto
INSERT INTO items (
    codigo,
    descripcion,
    tipo,
    precio_base,
    iva_aplica,
    created_at
) VALUES
    ('PROD-001', 'Producto de Prueba', 'producto', 100.00, true, NOW()),
    ('SERV-001', 'Servicio de Prueba', 'servicio', 250.00, true, NOW());

-- =====================================================
-- PASO 8: VERIFICACIONES POST-RESET
-- =====================================================

-- Verificar que las tablas están vacías o con datos básicos
DO $$
DECLARE
    invoices_count INTEGER;
    customers_count INTEGER;
    items_count INTEGER;
    users_count INTEGER;
    settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invoices_count FROM invoices;
    SELECT COUNT(*) INTO customers_count FROM customers;
    SELECT COUNT(*) INTO items_count FROM items;
    SELECT COUNT(*) INTO users_count FROM users;
    SELECT COUNT(*) INTO settings_count FROM company_settings;

    RAISE NOTICE '=== RESUMEN POST-RESET ===';
    RAISE NOTICE 'Facturas: % (debe ser 0)', invoices_count;
    RAISE NOTICE 'Clientes: % (debe ser 1 - cliente prueba)', customers_count;
    RAISE NOTICE 'Items: % (debe ser 2 - items prueba)', items_count;
    RAISE NOTICE 'Usuarios: % (MANTENIDOS)', users_count;
    RAISE NOTICE 'Configuración: % (MANTENIDA)', settings_count;

    -- Verificar integridad
    IF invoices_count != 0 THEN
        RAISE WARNING 'ADVERTENCIA: Aún existen facturas';
    END IF;

    IF customers_count != 1 THEN
        RAISE WARNING 'ADVERTENCIA: Clientes no están en estado esperado';
    END IF;

    IF items_count != 2 THEN
        RAISE WARNING 'ADVERTENCIA: Items no están en estado esperado';
    END IF;

    RAISE NOTICE 'Reset completado exitosamente';
END $$;

-- =====================================================
-- PASO 9: ACTUALIZAR ESTADÍSTICAS
-- =====================================================
ANALYZE customers;
ANALYZE items;
ANALYZE invoices;
ANALYZE control_number_batches;

-- =====================================================
-- PASO 10: LOG FINAL
-- =====================================================
RAISE NOTICE '==============================================';
RAISE NOTICE 'RESET DE ENTORNO DE PRUEBAS COMPLETADO';
RAISE NOTICE 'Timestamp: %', NOW();
RAISE NOTICE 'Base de datos: %', CURRENT_DATABASE();
RAISE NOTICE '==============================================';

-- Insertar log en tabla de auditoría si es necesario
INSERT INTO permission_audit (
    accion,
    detalles,
    timestamp
) VALUES (
    'RESET_TEST_ENVIRONMENT',
    '{"action": "complete_test_reset", "timestamp": "' || NOW()::text || '"}',
    NOW()
);

RAISE NOTICE 'Log de auditoría creado';

-- FIN DEL SCRIPT DE RESET