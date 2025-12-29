-- =====================================
-- POLÍTICAS RLS PARA ELIMINACIONES
-- Sistema de Facturación Venezolano
-- =====================================

-- Este script corrige las políticas Row Level Security (RLS)
-- para permitir que las eliminaciones funcionen correctamente

-- =====================================
-- 1. POLÍTICAS PARA TABLA CUSTOMERS
-- =====================================

-- Eliminar políticas existentes si causan conflictos
DROP POLICY IF EXISTS "customers_delete_policy" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON customers;

-- Crear política de eliminación para clientes
-- Permite eliminar a usuarios autenticados
CREATE POLICY "customers_delete_authenticated" ON customers
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Alternativa más permisiva si la anterior falla:
-- CREATE POLICY "customers_delete_all" ON customers
--     FOR DELETE
--     USING (true);

-- =====================================
-- 2. POLÍTICAS PARA TABLA ITEMS
-- =====================================

-- Eliminar políticas existentes si causan conflictos
DROP POLICY IF EXISTS "items_delete_policy" ON items;
DROP POLICY IF EXISTS "Users can delete items" ON items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON items;

-- Crear política de eliminación para productos/servicios
CREATE POLICY "items_delete_authenticated" ON items
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- =====================================
-- 3. POLÍTICAS PARA TABLA QUOTATIONS
-- =====================================

-- Eliminar políticas existentes si causan conflictos
DROP POLICY IF EXISTS "quotations_delete_policy" ON quotations;
DROP POLICY IF EXISTS "Users can delete quotations" ON quotations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON quotations;

-- Crear política de eliminación para cotizaciones
CREATE POLICY "quotations_delete_authenticated" ON quotations
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- =====================================
-- 4. POLÍTICAS PARA TABLA USERS
-- =====================================

-- Eliminar políticas existentes si causan conflictos
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "Users can delete users" ON users;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON users;

-- Crear política de eliminación para usuarios
-- Solo administradores pueden eliminar usuarios
CREATE POLICY "users_delete_admin" ON users
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM user_permissions up
            WHERE up.user_id = auth.uid()::text
            AND up.can_delete_users = true
        )
    );

-- Alternativa más simple si no existe user_permissions:
-- CREATE POLICY "users_delete_authenticated" ON users
--     FOR DELETE
--     USING (auth.uid() IS NOT NULL);

-- =====================================
-- 5. POLÍTICAS PARA TABLA INVOICES
-- =====================================

-- IMPORTANTE: Las facturas NO deben tener política de eliminación
-- Solo deben poder anularse (cambiar estado a 'nota_credito')

-- Verificar que NO existe política de eliminación para facturas
DROP POLICY IF EXISTS "invoices_delete_policy" ON invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON invoices;

-- Asegurar que existe política de actualización para anulación
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_void_authenticated" ON invoices;

CREATE POLICY "invoices_update_authenticated" ON invoices
    FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- =====================================
-- 6. POLÍTICAS ADICIONALES (OPTIONAL)
-- =====================================

-- Si existen otras tablas relacionadas que necesiten eliminación:

-- Para quotation_items (items de cotizaciones)
DROP POLICY IF EXISTS "quotation_items_delete_policy" ON quotation_items;
CREATE POLICY "quotation_items_delete_authenticated" ON quotation_items
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- Para inventory_movements (movimientos de inventario)
DROP POLICY IF EXISTS "inventory_movements_delete_policy" ON inventory_movements;
CREATE POLICY "inventory_movements_delete_authenticated" ON inventory_movements
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- =====================================
-- 7. VERIFICACIÓN DE POLÍTICAS
-- =====================================

-- Ver todas las políticas creadas
SELECT
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- =====================================
-- NOTAS IMPORTANTES:
-- =====================================

/*
1. AUTENTICACIÓN REQUERIDA:
   - Todas las políticas requieren auth.uid() IS NOT NULL
   - Esto significa que el usuario debe estar autenticado

2. ALTERNATIVAS MÁS PERMISIVAS:
   - Si las políticas fallan, puedes cambiar 'auth.uid() IS NOT NULL' por 'true'
   - Esto permitiría eliminaciones sin autenticación (menos seguro)

3. FACTURAS:
   - NO tienen política de eliminación (correcto fiscalmente)
   - Solo pueden anularse cambiando el estado a 'nota_credito'

4. USUARIOS:
   - Requiere permisos especiales en user_permissions
   - Si no existe esa tabla, usar la versión simplificada

5. TESTING:
   - Después de aplicar estas políticas, probar con el script:
     node database/probar-eliminaciones.js

6. ROLLBACK:
   - Si algo falla, puedes eliminar todas las políticas:
     DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
     DROP POLICY IF EXISTS "items_delete_authenticated" ON items;
     -- etc...
*/

-- =====================================
-- SCRIPT DE VERIFICACIÓN RÁPIDA
-- =====================================

-- Ejecutar esto después para verificar que las políticas se aplicaron:
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND cmd = 'DELETE'
    AND policyname LIKE '%_delete_%';

    RAISE NOTICE 'Políticas de eliminación creadas: %', policy_count;

    IF policy_count >= 4 THEN
        RAISE NOTICE '✅ Políticas aplicadas correctamente';
    ELSE
        RAISE NOTICE '⚠️ Faltan políticas por aplicar';
    END IF;
END $$;