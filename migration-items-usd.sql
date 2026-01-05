-- =====================================================
-- MIGRACIÓN: Agregar soporte de precios en USD a Items
-- =====================================================
-- Esta migración agrega los campos moneda y precio_usd
-- a la tabla items sin perder datos existentes

-- Agregar columna moneda (por defecto VES para items existentes)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'VES' CHECK (moneda IN ('VES', 'USD'));

-- Agregar columna precio_usd (NULL para items en VES)
ALTER TABLE items
ADD COLUMN IF NOT EXISTS precio_usd DECIMAL(15,2);

-- Comentarios para documentación
COMMENT ON COLUMN items.moneda IS 'Moneda del precio: VES (Bolívares) o USD (Dólares)';
COMMENT ON COLUMN items.precio_usd IS 'Precio en USD si moneda=USD, NULL si moneda=VES';
COMMENT ON COLUMN items.precio_base IS 'Precio en VES (si moneda=VES es directo, si moneda=USD es conversión automática)';
