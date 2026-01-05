-- =====================================================
-- ELIMINAR FACTURA DE EJEMPLO
-- =====================================================
-- Este script elimina completamente la factura A-00000001 y todos sus registros relacionados

-- Primero, obtener el ID de la factura para verificar
SELECT id, numero_documento, serie, cliente_razon_social, total_a_pagar
FROM facturas_electronicas
WHERE numero_documento = '00000001' AND serie = 'A';

-- Eliminar registros relacionados en orden (de hijos a padres)
-- 1. Eliminar items de la factura
DELETE FROM facturas_items
WHERE factura_id IN (
  SELECT id FROM facturas_electronicas
  WHERE numero_documento = '00000001' AND serie = 'A'
);

-- 2. Eliminar formas de pago
DELETE FROM facturas_formas_pago
WHERE factura_id IN (
  SELECT id FROM facturas_electronicas
  WHERE numero_documento = '00000001' AND serie = 'A'
);

-- 3. Eliminar descuentos (si hay)
DELETE FROM facturas_descuentos
WHERE factura_id IN (
  SELECT id FROM facturas_electronicas
  WHERE numero_documento = '00000001' AND serie = 'A'
);

-- 4. Eliminar impuestos subtotal (si hay)
DELETE FROM facturas_impuestos_subtotal
WHERE factura_id IN (
  SELECT id FROM facturas_electronicas
  WHERE numero_documento = '00000001' AND serie = 'A'
);

-- 5. Finalmente, eliminar la factura principal
DELETE FROM facturas_electronicas
WHERE numero_documento = '00000001' AND serie = 'A';

-- Verificar que se eliminó correctamente
SELECT COUNT(*) as facturas_restantes
FROM facturas_electronicas
WHERE numero_documento = '00000001' AND serie = 'A';

-- Debería retornar 0
