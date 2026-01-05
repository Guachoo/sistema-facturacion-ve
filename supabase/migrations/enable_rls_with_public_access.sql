-- =====================================================
-- HABILITAR RLS CON POLÍTICAS DE ACCESO PÚBLICO
-- =====================================================
--
-- En lugar de desactivar RLS (que causa 401 sin autenticación),
-- vamos a habilitarlo con políticas que permitan acceso público
-- =====================================================

-- EXCHANGE_RATES: Habilitar RLS y crear políticas públicas
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "allow_all_exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "Enable read access for all users" ON exchange_rates;
DROP POLICY IF EXISTS "Enable insert access for all users" ON exchange_rates;
DROP POLICY IF EXISTS "Enable update access for all users" ON exchange_rates;
DROP POLICY IF EXISTS "Enable delete access for all users" ON exchange_rates;

-- Crear nuevas políticas que permiten TODO a TODOS (incluso sin autenticación)
CREATE POLICY "Public read access for exchange_rates"
ON exchange_rates FOR SELECT
USING (true);

CREATE POLICY "Public insert access for exchange_rates"
ON exchange_rates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access for exchange_rates"
ON exchange_rates FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access for exchange_rates"
ON exchange_rates FOR DELETE
USING (true);

-- COMPANY_SETTINGS: Habilitar RLS y crear políticas públicas
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores si existen
DROP POLICY IF EXISTS "allow_all_company_settings" ON company_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON company_settings;
DROP POLICY IF EXISTS "Enable insert access for all users" ON company_settings;
DROP POLICY IF EXISTS "Enable update access for all users" ON company_settings;
DROP POLICY IF EXISTS "Enable delete access for all users" ON company_settings;

-- Crear nuevas políticas que permiten TODO a TODOS
CREATE POLICY "Public read access for company_settings"
ON company_settings FOR SELECT
USING (true);

CREATE POLICY "Public insert access for company_settings"
ON company_settings FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public update access for company_settings"
ON company_settings FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Public delete access for company_settings"
ON company_settings FOR DELETE
USING (true);

-- Verificar que RLS está habilitado y las políticas existen
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('exchange_rates', 'company_settings')
ORDER BY tablename, policyname;
