-- =====================================================
-- ACTUALIZAR FACTURA DE EJEMPLO CON CÁLCULOS CORRECTOS
-- =====================================================
-- Este script actualiza la factura existente con los cálculos correctos

UPDATE facturas_electronicas
SET
  -- Corregir montos en USD
  monto_gravado_total_usd = ROUND(monto_gravado_total / tipo_cambio, 2),
  subtotal_usd = ROUND(subtotal / tipo_cambio, 2),
  total_iva_usd = ROUND(total_iva / tipo_cambio, 2),
  monto_total_con_iva_usd = ROUND(monto_total_con_iva / tipo_cambio, 2),
  total_a_pagar_usd = ROUND(total_a_pagar / tipo_cambio, 2),
  base_igtf_usd = ROUND(base_igtf / tipo_cambio, 2),
  monto_igtf_usd = ROUND(monto_igtf / tipo_cambio, 2)
WHERE numero_documento = '00000001';

-- Verificar los resultados
SELECT
  numero_documento,
  serie,
  -- VES
  subtotal as subtotal_ves,
  total_iva as iva_ves,
  monto_total_con_iva as total_con_iva_ves,
  monto_igtf as igtf_ves,
  total_a_pagar as total_ves,
  -- Tasa
  tipo_cambio,
  -- USD
  subtotal_usd,
  total_iva_usd,
  monto_total_con_iva_usd,
  monto_igtf_usd,
  total_a_pagar_usd
FROM facturas_electronicas
WHERE numero_documento = '00000001';
