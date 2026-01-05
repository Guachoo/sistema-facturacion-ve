-- =====================================================
-- MIGRAR FACTURAS DE INVOICES A FACTURAS_ELECTRONICAS
-- =====================================================

-- Migrar todas las facturas de la tabla invoices a facturas_electronicas
INSERT INTO facturas_electronicas (
  tipo_documento,
  numero_documento,
  serie,
  sucursal,
  fecha_emision,
  hora_emision,
  cliente_id,
  cliente_tipo_id,
  cliente_numero_id,
  cliente_razon_social,
  cliente_direccion,
  tipo_de_pago,
  tipo_de_venta,
  moneda,
  nro_items,
  monto_gravado_total,
  monto_exento_total,
  subtotal,
  total_descuento,
  subtotal_antes_descuento,
  total_iva,
  monto_total_con_iva,
  total_a_pagar,
  moneda_secundaria,
  tipo_cambio,
  total_a_pagar_usd,
  monto_igtf,
  estado,
  anulado,
  created_at,
  updated_at
)
SELECT
  '01' as tipo_documento, -- Factura
  COALESCE(numero, 'FAC-000001') as numero_documento,
  '001' as serie,
  '001' as sucursal,
  COALESCE(fecha, NOW()) as fecha_emision,
  CURRENT_TIME as hora_emision,
  customer_id as cliente_id,
  SPLIT_PART(receptor_rif, '-', 1) as cliente_tipo_id,
  SUBSTRING(receptor_rif FROM POSITION('-' IN receptor_rif) + 1) as cliente_numero_id,
  receptor_razon_social as cliente_razon_social,
  receptor_domicilio as cliente_direccion,
  'efectivo' as tipo_de_pago,
  'contado' as tipo_de_venta,
  'VES' as moneda,
  0 as nro_items,
  COALESCE(subtotal, 0) as monto_gravado_total,
  0 as monto_exento_total,
  COALESCE(subtotal, 0) as subtotal,
  0 as total_descuento,
  COALESCE(subtotal, 0) as subtotal_antes_descuento,
  COALESCE(monto_iva, 0) as total_iva,
  COALESCE(subtotal, 0) + COALESCE(monto_iva, 0) as monto_total_con_iva,
  COALESCE(total, 0) as total_a_pagar,
  'USD' as moneda_secundaria,
  COALESCE(tasa_bcv, 0) as tipo_cambio,
  COALESCE(total_usd_referencia, 0) as total_a_pagar_usd,
  COALESCE(monto_igtf, 0) as monto_igtf,
  COALESCE(estado, 'emitida') as estado,
  false as anulado,
  created_at,
  updated_at
FROM invoices;

-- Verificar la migración
SELECT 'Facturas migradas:' as mensaje, COUNT(*) as total
FROM facturas_electronicas;

-- Ver las facturas migradas
SELECT id, numero_documento, serie, fecha_emision, total_a_pagar, estado
FROM facturas_electronicas
ORDER BY created_at DESC;
