-- =====================================================
-- FACTURA DE EJEMPLO PARA PRUEBA DE PDF
-- =====================================================
-- Este script inserta una factura de ejemplo con sus items
-- para poder probar la generación del PDF

-- Insertar factura de ejemplo
INSERT INTO facturas_electronicas (
  tipo_documento,
  numero_documento,
  serie,
  sucursal,
  fecha_emision,
  fecha_vencimiento,
  hora_emision,

  -- Cliente
  cliente_tipo_id,
  cliente_numero_id,
  cliente_razon_social,
  cliente_direccion,
  cliente_telefono,
  cliente_correo,

  -- Vendedor
  vendedor_codigo,
  vendedor_nombre,
  num_cajero,

  -- Tipo de operación
  tipo_de_pago,
  tipo_de_venta,
  moneda,

  -- Totales en VES
  nro_items,
  monto_gravado_total,
  monto_exento_total,
  subtotal,
  total_descuento,
  subtotal_antes_descuento,
  total_iva,
  monto_total_con_iva,
  total_a_pagar,
  monto_en_letras,

  -- Totales en USD
  moneda_secundaria,
  tipo_cambio,
  monto_gravado_total_usd,
  subtotal_usd,
  total_iva_usd,
  monto_total_con_iva_usd,
  total_a_pagar_usd,

  -- IGTF (3%)
  base_igtf,
  alicuota_igtf,
  monto_igtf,
  base_igtf_usd,
  monto_igtf_usd,

  -- Estado
  estado,
  anulado
) VALUES (
  '01', -- Factura
  '00000001',
  'A',
  '0001',
  NOW(),
  NOW() + INTERVAL '30 days',
  '14:30:00',

  -- Cliente
  'J',
  '123456789',
  'COMERCIAL LOS ANDES C.A.',
  'Av. Principal, Los Ruices, Caracas',
  '0212-1234567',
  'ventas@losandes.com.ve',

  -- Vendedor
  'V001',
  'Juan Pérez',
  'CAJ001',

  -- Tipo de operación
  'CONTADO',
  'MOSTRADOR',
  'VES',

  -- Totales en VES
  3, -- 3 items
  8620.69, -- Subtotal sin IVA
  0.00, -- Exento
  8620.69, -- Subtotal
  0.00, -- Descuento
  8620.69, -- Subtotal antes descuento
  1379.31, -- IVA 16%
  10000.00, -- Total con IVA
  10300.00, -- Total a pagar (con IGTF)
  'DIEZ MIL TRESCIENTOS BOLÍVARES CON 00/100',

  -- Totales en USD (Tasa: 36.50)
  'USD',
  36.5000,
  236.18, -- Subtotal USD
  236.18,
  37.79, -- IVA USD
  273.97, -- Total USD con IVA
  282.19, -- Total USD con IGTF

  -- IGTF (3%)
  10000.00, -- Base IGTF
  3.00, -- Alícuota 3%
  300.00, -- Monto IGTF
  273.97, -- Base USD
  8.22, -- IGTF USD

  -- Estado
  'emitida',
  false
) RETURNING id;

-- Guardar el ID de la factura (reemplazar 'FACTURA_ID' con el UUID generado)
-- Para obtener el ID, ejecuta primero la query anterior y copia el UUID

-- Ejemplo: INSERT INTO facturas_items usando el ID de la factura
-- Reemplaza 'YOUR_FACTURA_ID_HERE' con el UUID real

-- Item 1: Laptop Dell Inspiron
INSERT INTO facturas_items (
  factura_id,
  numero_linea,
  codigo_plu,
  indicador_bien_servicio,
  descripcion,
  cantidad,
  unidad_medida,
  precio_unitario,
  descuento_monto,
  monto_bonificacion,
  recargo_monto,
  precio_item,
  codigo_impuesto,
  tasa_iva,
  valor_iva,
  valor_total_item
) VALUES (
  (SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001' ORDER BY created_at DESC LIMIT 1),
  1,
  'LAPTOP-001',
  '1', -- Bien
  'Laptop Dell Inspiron 15, Intel Core i7, 16GB RAM, 512GB SSD',
  2,
  'UND',
  2500.00,
  0.00,
  0.00,
  0.00,
  5000.00,
  'IVA',
  16.00,
  800.00,
  5800.00
);

-- Item 2: Mouse Inalámbrico
INSERT INTO facturas_items (
  factura_id,
  numero_linea,
  codigo_plu,
  indicador_bien_servicio,
  descripcion,
  cantidad,
  unidad_medida,
  precio_unitario,
  descuento_monto,
  monto_bonificacion,
  recargo_monto,
  precio_item,
  codigo_impuesto,
  tasa_iva,
  valor_iva,
  valor_total_item
) VALUES (
  (SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001' ORDER BY created_at DESC LIMIT 1),
  2,
  'MOUSE-001',
  '1', -- Bien
  'Mouse Inalámbrico Logitech MX Master 3',
  5,
  'UND',
  250.00,
  0.00,
  0.00,
  0.00,
  1250.00,
  'IVA',
  16.00,
  200.00,
  1450.00
);

-- Item 3: Teclado Mecánico
INSERT INTO facturas_items (
  factura_id,
  numero_linea,
  codigo_plu,
  indicador_bien_servicio,
  descripcion,
  cantidad,
  unidad_medida,
  precio_unitario,
  descuento_monto,
  monto_bonificacion,
  recargo_monto,
  precio_item,
  codigo_impuesto,
  tasa_iva,
  valor_iva,
  valor_total_item
) VALUES (
  (SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001' ORDER BY created_at DESC LIMIT 1),
  3,
  'TECLADO-001',
  '1', -- Bien
  'Teclado Mecánico Razer BlackWidow V3',
  3,
  'UND',
  790.23,
  0.00,
  0.00,
  0.00,
  2370.69,
  'IVA',
  16.00,
  379.31,
  2750.00
);

-- Insertar formas de pago
INSERT INTO facturas_formas_pago (
  factura_id,
  descripcion,
  forma,
  fecha,
  monto,
  moneda,
  tipo_cambio
) VALUES (
  (SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001' ORDER BY created_at DESC LIMIT 1),
  'Transferencia Bancaria',
  'TRF',
  CURRENT_DATE,
  10300.00,
  'VES',
  36.5000
);

-- Insertar impuestos subtotales
INSERT INTO facturas_impuestos_subtotal (
  factura_id,
  codigo_impuesto,
  alicuota,
  base_imponible,
  valor_total,
  moneda
) VALUES (
  (SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001' ORDER BY created_at DESC LIMIT 1),
  'IVA',
  16.00,
  8620.69,
  1379.31,
  'VES'
);

INSERT INTO facturas_impuestos_subtotal (
  factura_id,
  codigo_impuesto,
  alicuota,
  base_imponible,
  valor_total,
  moneda
) VALUES (
  (SELECT id FROM facturas_electronicas WHERE numero_documento = '00000001' ORDER BY created_at DESC LIMIT 1),
  'IGTF',
  3.00,
  10000.00,
  300.00,
  'VES'
);
