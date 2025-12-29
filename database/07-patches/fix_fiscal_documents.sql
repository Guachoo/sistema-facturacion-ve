-- =============================================================================
-- ARCHIVO SQL PARA CORREGIR LA TABLA fiscal_documents
-- =============================================================================
-- Este script arregla el error: "Could not find the 'status' column of 'fiscal_documents'"
-- Ejecutar en Supabase SQL Editor

-- 1. VERIFICAR ESTRUCTURA ACTUAL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'fiscal_documents'
ORDER BY ordinal_position;

-- 2. AGREGAR COLUMNAS FALTANTES SI NO EXISTEN
-- Agregar columna 'status' si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fiscal_documents' AND column_name = 'status'
    ) THEN
        ALTER TABLE fiscal_documents
        ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
    END IF;
END $$;

-- 3. AGREGAR OTRAS COLUMNAS NECESARIAS PARA LA ESTRUCTURA DEL PDF
-- Campos del emisor
DO $$
BEGIN
    -- Emisor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'emisor_nombre') THEN
        ALTER TABLE fiscal_documents ADD COLUMN emisor_nombre TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'emisor_rif') THEN
        ALTER TABLE fiscal_documents ADD COLUMN emisor_rif VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'emisor_domicilio') THEN
        ALTER TABLE fiscal_documents ADD COLUMN emisor_domicilio TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'emisor_correo') THEN
        ALTER TABLE fiscal_documents ADD COLUMN emisor_correo VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'emisor_telefono') THEN
        ALTER TABLE fiscal_documents ADD COLUMN emisor_telefono VARCHAR(50);
    END IF;

    -- Receptor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'receptor_nombre') THEN
        ALTER TABLE fiscal_documents ADD COLUMN receptor_nombre TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'receptor_identificacion') THEN
        ALTER TABLE fiscal_documents ADD COLUMN receptor_identificacion VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'receptor_domicilio') THEN
        ALTER TABLE fiscal_documents ADD COLUMN receptor_domicilio TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'receptor_correo') THEN
        ALTER TABLE fiscal_documents ADD COLUMN receptor_correo VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'receptor_telefono') THEN
        ALTER TABLE fiscal_documents ADD COLUMN receptor_telefono VARCHAR(50);
    END IF;

    -- Vendedor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'vendedor_codigo') THEN
        ALTER TABLE fiscal_documents ADD COLUMN vendedor_codigo VARCHAR(20);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'vendedor_nombre') THEN
        ALTER TABLE fiscal_documents ADD COLUMN vendedor_nombre VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'num_cajero') THEN
        ALTER TABLE fiscal_documents ADD COLUMN num_cajero INTEGER;
    END IF;

    -- Campos de totales según PDF
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'total_base_imponible_g') THEN
        ALTER TABLE fiscal_documents ADD COLUMN total_base_imponible_g DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'total_impuesto_g') THEN
        ALTER TABLE fiscal_documents ADD COLUMN total_impuesto_g DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'total_exento') THEN
        ALTER TABLE fiscal_documents ADD COLUMN total_exento DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'pago_divisas') THEN
        ALTER TABLE fiscal_documents ADD COLUMN pago_divisas DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'impuesto_igtf') THEN
        ALTER TABLE fiscal_documents ADD COLUMN impuesto_igtf DECIMAL(15,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'total_bs_despues_igtf') THEN
        ALTER TABLE fiscal_documents ADD COLUMN total_bs_despues_igtf DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- Información adicional legal (4 campos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'adicional1') THEN
        ALTER TABLE fiscal_documents ADD COLUMN adicional1 TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'adicional2') THEN
        ALTER TABLE fiscal_documents ADD COLUMN adicional2 TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'adicional3') THEN
        ALTER TABLE fiscal_documents ADD COLUMN adicional3 TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'adicional4') THEN
        ALTER TABLE fiscal_documents ADD COLUMN adicional4 TEXT;
    END IF;

    -- Datos de hora de emisión
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'hora_emision') THEN
        ALTER TABLE fiscal_documents ADD COLUMN hora_emision TIME;
    END IF;

    -- Número de documento según formato del PDF
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fiscal_documents' AND column_name = 'numero_documento') THEN
        ALTER TABLE fiscal_documents ADD COLUMN numero_documento VARCHAR(20);
    END IF;

END $$;

-- 4. ACTUALIZAR DATOS EXISTENTES CON VALORES POR DEFECTO
UPDATE fiscal_documents
SET
    status = COALESCE(status, 'emitida'),
    emisor_nombre = COALESCE(emisor_nombre, 'EMPRESA DE PRUEBA'),
    emisor_rif = COALESCE(emisor_rif, 'J-231122344'),
    emisor_domicilio = COALESCE(emisor_domicilio, 'CUALQUIER LUGAR DE CSS'),
    emisor_correo = COALESCE(emisor_correo, 'empresa@nueva.ext'),
    emisor_telefono = COALESCE(emisor_telefono, '0123-456-8556'),
    vendedor_codigo = COALESCE(vendedor_codigo, '23600'),
    vendedor_nombre = COALESCE(vendedor_nombre, 'Jose Quintero'),
    num_cajero = COALESCE(num_cajero, 1),
    adicional1 = COALESCE(adicional1, 'De conformidad con el Art. 10 de la ley del IVA y Art. 4 de su reglamento. Nuestras facturas son emitidas por orden y cuenta de terceros.'),
    adicional2 = COALESCE(adicional2, 'De conformidad con el Art. 128 de la Ley del BCV, los pagos estipulados en moneda extranjera se cancelan, salvo convención especial, con la entrega de lo equivalente en moneda de curso legal, al tipo de cambio corriente en el lugar de la fecha de pago.'),
    adicional3 = COALESCE(adicional3, 'De conformidad con la Gaceta Oficial N° 42339 de fecha 17/03/2022 se aplica el cobro de IGTF.'),
    adicional4 = COALESCE(adicional4, 'De conformidad a lo establecido en la Ley General de Puertos, publicada en GO N° 39.140 de fecha 17 de marzo del 2009, Tasas Portuarias, Art. 56, numeral4, derecho de USO DE SUPERFICIE.'),
    hora_emision = COALESCE(hora_emision, '16:52:00')
WHERE id IS NOT NULL;

-- 5. VERIFICAR CAMBIOS
SELECT 'Columnas agregadas correctamente' as mensaje;

-- Verificar estructura final
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'fiscal_documents'
ORDER BY ordinal_position;

-- 6. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_status ON fiscal_documents(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_numero_documento ON fiscal_documents(numero_documento);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_emisor_rif ON fiscal_documents(emisor_rif);

COMMENT ON TABLE fiscal_documents IS 'Documentos fiscales con estructura completa según formato PDF Venezuela';
COMMENT ON COLUMN fiscal_documents.status IS 'Estado del documento: draft, emitida, anulada';
COMMENT ON COLUMN fiscal_documents.numero_documento IS 'Número de documento formato D-22975';
COMMENT ON COLUMN fiscal_documents.adicional1 IS 'Información legal adicional campo 1';
COMMENT ON COLUMN fiscal_documents.adicional2 IS 'Información legal adicional campo 2';
COMMENT ON COLUMN fiscal_documents.adicional3 IS 'Información legal adicional campo 3';
COMMENT ON COLUMN fiscal_documents.adicional4 IS 'Información legal adicional campo 4';