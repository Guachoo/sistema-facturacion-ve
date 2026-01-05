-- =====================================================
-- AGREGAR COLUMNA 'CANAL' A LA TABLA INVOICES
-- =====================================================
-- Esta columna indica si la factura fue emitida digitalmente o en máquina

-- Agregar la columna canal
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS canal VARCHAR(20) DEFAULT 'digital';

-- Agregar restricción para que solo acepte 'digital' o 'maquina'
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_canal_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_canal_check
  CHECK (canal IN ('digital', 'maquina'));

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'canal';
