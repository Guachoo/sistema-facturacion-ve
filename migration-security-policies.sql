-- =====================================================
-- MIGRACIÓN: Políticas de Seguridad (RLS)
-- =====================================================
-- Esta migración configura las políticas de seguridad
-- para permitir acceso público a las tablas mientras
-- desarrollamos. En producción, estas políticas deben
-- ser más restrictivas.

-- IMPORTANTE: Solo para desarrollo/testing
-- En producción, implementa políticas basadas en usuarios autenticados

-- Desactivar RLS temporalmente para todas las tablas
ALTER TABLE IF EXISTS customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoice_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;

-- Si prefieres mantener RLS habilitado con políticas permisivas:
-- Descomentar las siguientes líneas y comentar las de arriba

/*
-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para desarrollo
-- CUSTOMERS
CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- ITEMS
CREATE POLICY "Allow all operations on items" ON items
  FOR ALL USING (true) WITH CHECK (true);

-- INVOICES
CREATE POLICY "Allow all operations on invoices" ON invoices
  FOR ALL USING (true) WITH CHECK (true);

-- INVOICE_LINES
CREATE POLICY "Allow all operations on invoice_lines" ON invoice_lines
  FOR ALL USING (true) WITH CHECK (true);

-- USERS
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);
*/

-- NOTA: En producción, reemplaza estas políticas con reglas basadas en:
-- 1. Autenticación de usuarios: auth.uid()
-- 2. Roles específicos: auth.jwt() ->> 'role'
-- 3. Permisos granulares por operación (SELECT, INSERT, UPDATE, DELETE)
