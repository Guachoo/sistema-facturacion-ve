-- Verificar facturas actuales
SELECT 
  id,
  tipo_documento,
  numero_documento,
  serie,
  estado,
  anulado,
  fecha_emision,
  total_a_pagar,
  CASE 
    WHEN estado = 'emitida' AND anulado = false AND tipo_documento = '01' 
    THEN 'SI - Aparecerá botón Nota de Débito' 
    ELSE 'NO - No aparecerá botón'
  END as puede_crear_nota_debito
FROM facturas_electronicas
ORDER BY created_at DESC;
