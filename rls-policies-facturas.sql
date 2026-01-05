-- =====================================================
-- POLÍTICAS RLS PARA TABLAS DE FACTURACIÓN
-- =====================================================
-- Para desarrollo, vamos a deshabilitar RLS temporalmente
-- En producción, deberías habilitar RLS con políticas apropiadas

-- Deshabilitar RLS en tablas de facturación (SOLO PARA DESARROLLO)
ALTER TABLE facturas_electronicas DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_formas_pago DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_descuentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_impuestos_subtotal DISABLE ROW LEVEL SECURITY;

-- NOTA: En producción, deberías habilitar RLS y crear políticas como:
-- ALTER TABLE facturas_electronicas ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Permitir lectura a todos los usuarios autenticados"
-- ON facturas_electronicas FOR SELECT
-- TO authenticated
-- USING (true);
--
-- CREATE POLICY "Permitir inserción a usuarios autenticados"
-- ON facturas_electronicas FOR INSERT
-- TO authenticated
-- WITH CHECK (true);
--
-- CREATE POLICY "Permitir actualización al creador"
-- ON facturas_electronicas FOR UPDATE
-- TO authenticated
-- USING (created_by = auth.uid());
