-- =============================================================================
-- SCRIPT PARA AGREGAR RESTRICCIONES DE UNICIDAD EN FACTURAS
-- =============================================================================
-- Este script asegura que los números de facturas no se repitan a nivel de BD
-- Ejecutar en Supabase SQL Editor

-- 1. VERIFICAR ESTRUCTURA ACTUAL DE LA TABLA INVOICES
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- 2. VERIFICAR SI YA EXISTEN RESTRICCIONES DE UNICIDAD
SELECT constraint_name, constraint_type, column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu USING (constraint_name)
WHERE tc.table_name = 'invoices' AND tc.constraint_type = 'UNIQUE';

-- 3. VERIFICAR DATOS DUPLICADOS ANTES DE AGREGAR RESTRICCIONES
-- Verificar números de factura duplicados
SELECT numero, COUNT(*) as cantidad
FROM invoices
GROUP BY numero
HAVING COUNT(*) > 1;

-- Verificar números de control duplicados
SELECT numero_control, COUNT(*) as cantidad
FROM invoices
GROUP BY numero_control
HAVING COUNT(*) > 1;

-- 4. LIMPIAR DATOS DUPLICADOS SI EXISTEN (EJECUTAR SOLO SI ES NECESARIO)
-- CUIDADO: Esto eliminará registros duplicados manteniendo solo el más reciente
/*
WITH duplicates AS (
    SELECT id, numero,
           ROW_NUMBER() OVER (PARTITION BY numero ORDER BY created_at DESC) as rn
    FROM invoices
)
DELETE FROM invoices
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

WITH duplicates_control AS (
    SELECT id, numero_control,
           ROW_NUMBER() OVER (PARTITION BY numero_control ORDER BY created_at DESC) as rn
    FROM invoices
)
DELETE FROM invoices
WHERE id IN (
    SELECT id FROM duplicates_control WHERE rn > 1
);
*/

-- 5. AGREGAR RESTRICCIONES DE UNICIDAD
-- Agregar restricción única para número de factura
DO $$
BEGIN
    -- Verificar si la restricción ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'invoices'
        AND constraint_name = 'unique_invoice_numero'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT unique_invoice_numero UNIQUE (numero);
        RAISE NOTICE 'Restricción unique_invoice_numero agregada exitosamente';
    ELSE
        RAISE NOTICE 'La restricción unique_invoice_numero ya existe';
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Error: Ya existe una restricción similar';
    WHEN others THEN
        RAISE NOTICE 'Error al agregar restricción unique_invoice_numero: %', SQLERRM;
END $$;

-- Agregar restricción única para número de control
DO $$
BEGIN
    -- Verificar si la restricción ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'invoices'
        AND constraint_name = 'unique_invoice_numero_control'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT unique_invoice_numero_control UNIQUE (numero_control);
        RAISE NOTICE 'Restricción unique_invoice_numero_control agregada exitosamente';
    ELSE
        RAISE NOTICE 'La restricción unique_invoice_numero_control ya existe';
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Error: Ya existe una restricción similar';
    WHEN others THEN
        RAISE NOTICE 'Error al agregar restricción unique_invoice_numero_control: %', SQLERRM;
END $$;

-- 6. AGREGAR RESTRICCIONES ADICIONALES PARA INTEGRIDAD
-- Restricción para formato de número de factura
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'check_invoice_numero_format'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT check_invoice_numero_format
        CHECK (numero ~ '^FAC-\d{6}$');
        RAISE NOTICE 'Check constraint para formato de número agregado';
    ELSE
        RAISE NOTICE 'Check constraint para formato de número ya existe';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error al agregar check constraint de formato: %', SQLERRM;
END $$;

-- Restricción para formato de número de control
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'check_numero_control_format'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT check_numero_control_format
        CHECK (numero_control ~ '^DIG-\d{10}$');
        RAISE NOTICE 'Check constraint para formato de número de control agregado';
    ELSE
        RAISE NOTICE 'Check constraint para formato de número de control ya existe';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error al agregar check constraint de número de control: %', SQLERRM;
END $$;

-- 7. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS DE VALIDACIÓN
CREATE INDEX IF NOT EXISTS idx_invoices_numero_unique ON invoices(numero);
CREATE INDEX IF NOT EXISTS idx_invoices_numero_control_unique ON invoices(numero_control);
CREATE INDEX IF NOT EXISTS idx_invoices_fecha_numero ON invoices(fecha, numero);

-- 8. CREAR FUNCIÓN PARA GENERAR PRÓXIMO NÚMERO DE FACTURA
CREATE OR REPLACE FUNCTION get_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
    last_number INTEGER;
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Obtener el último número de factura
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(numero FROM 'FAC-(\d+)') AS INTEGER)),
        0
    )
    INTO last_number
    FROM invoices
    WHERE numero ~ '^FAC-\d{6}$';

    -- Calcular siguiente número
    next_number := last_number + 1;

    -- Formatear con ceros a la izquierda
    formatted_number := 'FAC-' || LPAD(next_number::TEXT, 6, '0');

    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 9. CREAR FUNCIÓN PARA GENERAR PRÓXIMO NÚMERO DE CONTROL
CREATE OR REPLACE FUNCTION get_next_control_number()
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    last_number INTEGER;
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Obtener año actual
    current_year := EXTRACT(year FROM CURRENT_DATE);

    -- Obtener el último número de control del año actual
    SELECT COALESCE(
        MAX(CAST(SUBSTRING(numero_control FROM 'DIG-\d{4}(\d{6})') AS INTEGER)),
        0
    )
    INTO last_number
    FROM invoices
    WHERE numero_control ~ ('^DIG-' || current_year || '\d{6}$');

    -- Calcular siguiente número
    next_number := last_number + 1;

    -- Formatear con ceros a la izquierda
    formatted_number := 'DIG-' || current_year || LPAD(next_number::TEXT, 6, '0');

    RETURN formatted_number;
END;
$$ LANGUAGE plpgsql;

-- 10. CREAR TRIGGER PARA AUTO-GENERAR NÚMEROS SI NO SE PROPORCIONAN
CREATE OR REPLACE FUNCTION auto_generate_invoice_numbers()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-generar número de factura si está vacío
    IF NEW.numero IS NULL OR NEW.numero = '' THEN
        NEW.numero := get_next_invoice_number();
    END IF;

    -- Auto-generar número de control si está vacío
    IF NEW.numero_control IS NULL OR NEW.numero_control = '' THEN
        NEW.numero_control := get_next_control_number();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_invoice_numbers ON invoices;
CREATE TRIGGER trigger_auto_generate_invoice_numbers
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_invoice_numbers();

-- 11. VERIFICAR QUE TODO ESTÉ CORRECTO
SELECT 'Configuración completada exitosamente' as status;

-- Verificar restricciones creadas
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'invoices'
AND constraint_type IN ('UNIQUE', 'CHECK')
ORDER BY constraint_name;

-- Verificar funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('get_next_invoice_number', 'get_next_control_number', 'auto_generate_invoice_numbers');

-- Verificar índices creados
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invoices'
AND indexname LIKE 'idx_invoices_%unique';

-- 12. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON CONSTRAINT unique_invoice_numero ON invoices IS 'Garantiza que cada número de factura sea único en el sistema';
COMMENT ON CONSTRAINT unique_invoice_numero_control ON invoices IS 'Garantiza que cada número de control sea único en el sistema';
COMMENT ON FUNCTION get_next_invoice_number() IS 'Genera el siguiente número de factura disponible en formato FAC-NNNNNN';
COMMENT ON FUNCTION get_next_control_number() IS 'Genera el siguiente número de control disponible en formato DIG-YYYYNNNNNN';