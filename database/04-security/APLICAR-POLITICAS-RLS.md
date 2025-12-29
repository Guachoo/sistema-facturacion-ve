# 🔧 SOLUCIÓN INMEDIATA - APLICAR POLÍTICAS RLS

## ❌ PROBLEMA ACTUAL
```
"record \"new\" has no field \"created_by\""
```

Las funciones de eliminar NO funcionan porque faltan políticas RLS.

## ✅ SOLUCIÓN INMEDIATA

### 1. Abrir SQL Editor en Supabase
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `supfddcbyfuzvxsrzwio`
3. Ve a **SQL Editor**

### 2. Ejecutar este SQL (COPIAR Y PEGAR)

```sql
-- =====================================
-- POLÍTICAS RLS PERMISIVAS - SOLUCIÓN RÁPIDA
-- =====================================

-- 1. CLIENTES
DROP POLICY IF EXISTS "customers_delete_authenticated" ON customers;
DROP POLICY IF EXISTS "customers_delete_permissive" ON customers;
CREATE POLICY "customers_delete_permissive" ON customers
    FOR DELETE
    USING (true);

-- 2. PRODUCTOS/ITEMS
DROP POLICY IF EXISTS "items_delete_authenticated" ON items;
DROP POLICY IF EXISTS "items_delete_permissive" ON items;
CREATE POLICY "items_delete_permissive" ON items
    FOR DELETE
    USING (true);

-- 3. COTIZACIONES
DROP POLICY IF EXISTS "quotations_delete_authenticated" ON quotations;
DROP POLICY IF EXISTS "quotations_delete_permissive" ON quotations;
CREATE POLICY "quotations_delete_permissive" ON quotations
    FOR DELETE
    USING (true);

-- 4. USUARIOS
DROP POLICY IF EXISTS "users_delete_admin" ON users;
DROP POLICY IF EXISTS "users_delete_permissive" ON users;
CREATE POLICY "users_delete_permissive" ON users
    FOR DELETE
    USING (true);

-- 5. QUOTATION ITEMS
DROP POLICY IF EXISTS "quotation_items_delete_authenticated" ON quotation_items;
DROP POLICY IF EXISTS "quotation_items_delete_permissive" ON quotation_items;
CREATE POLICY "quotation_items_delete_permissive" ON quotation_items
    FOR DELETE
    USING (true);

-- VERIFICACIÓN
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND cmd = 'DELETE'
AND policyname LIKE '%_permissive'
ORDER BY tablename;
```

### 3. Ejecutar y verificar
- Hacer clic en **"Run"**
- Deberías ver políticas creadas para: customers, items, quotations, users
- ✅ **Las eliminaciones deberían funcionar inmediatamente**

## 🧪 PROBAR
1. Ve al sistema de facturación
2. Intenta eliminar un cliente
3. Debería funcionar sin errores

## ⚠️ NOTA
Estas son políticas **permisivas** para desarrollo. En producción se recomiendan políticas más estrictas con autenticación.