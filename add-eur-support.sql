-- =====================================================
-- AGREGAR SOPORTE PARA EUR EN LA TABLA ITEMS
-- =====================================================
-- Este script actualiza la tabla items para permitir EUR como moneda

-- Paso 1: Eliminar la restricción actual de moneda
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_moneda_check;

-- Paso 2: Agregar la nueva restricción que incluye EUR
ALTER TABLE items ADD CONSTRAINT items_moneda_check
  CHECK (moneda IN ('VES', 'USD', 'EUR'));

-- Paso 3: Agregar columna precio_eur si no existe
ALTER TABLE items ADD COLUMN IF NOT EXISTS precio_eur DECIMAL(10, 2);

-- Verificar que la restricción se actualizó correctamente
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'items'::regclass AND conname = 'items_moneda_check';
