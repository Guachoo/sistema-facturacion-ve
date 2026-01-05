-- =====================================================
-- FIX: Cambiar políticas para usar el rol 'anon' en lugar de 'public'
-- =====================================================
-- El problema es que Supabase usa el rol 'anon' para clientes no autenticados
-- Las políticas creadas con TO PUBLIC no funcionan correctamente
-- Necesitamos recrearlas específicamente para 'anon'
-- =====================================================

-- EXCHANGE_RATES: Eliminar políticas actuales y recrear para 'anon'

DROP POLICY IF EXISTS "Public delete access for exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Public insert access for exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Public read access for exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Public update access for exchange_rates" ON exchange_rates;

-- Crear políticas para el rol 'anon' específicamente
CREATE POLICY "anon_select_exchange_rates"
ON exchange_rates FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_insert_exchange_rates"
ON exchange_rates FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon_update_exchange_rates"
ON exchange_rates FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "anon_delete_exchange_rates"
ON exchange_rates FOR DELETE
TO anon
USING (true);

-- COMPANY_SETTINGS: Eliminar políticas actuales y recrear para 'anon'

DROP POLICY IF EXISTS "Public delete access for company_settings" ON company_settings;
DROP POLICY IF EXISTS "Public insert access for company_settings" ON company_settings;
DROP POLICY IF EXISTS "Public read access for company_settings" ON company_settings;
DROP POLICY IF EXISTS "Public update access for company_settings" ON company_settings;
DROP POLICY IF EXISTS "Permitir actualización a todos los autenticados" ON company_settings;
DROP POLICY IF EXISTS "Permitir inserción a todos los autenticados" ON company_settings;
DROP POLICY IF EXISTS "Permitir lectura a todos los autenticados" ON company_settings;

-- Crear políticas para el rol 'anon' específicamente
CREATE POLICY "anon_select_company_settings"
ON company_settings FOR SELECT
TO anon
USING (true);

CREATE POLICY "anon_insert_company_settings"
ON company_settings FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon_update_company_settings"
ON company_settings FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "anon_delete_company_settings"
ON company_settings FOR DELETE
TO anon
USING (true);

-- Verificar que las nuevas políticas existen
SELECT
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('exchange_rates', 'company_settings')
ORDER BY tablename, policyname;
