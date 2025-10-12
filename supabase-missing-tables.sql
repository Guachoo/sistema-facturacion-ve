-- =====================================================
-- SISTEMA DE FACTURACIÓN VENEZOLANO - TABLAS FALTANTES
-- =====================================================
-- Este script crea las tablas que faltan para completar
-- la funcionalidad de cotizaciones e inventario
-- =====================================================

-- =====================================================
-- LIMPIAR TABLAS EXISTENTES (POR SEGURIDAD)
-- =====================================================
-- Primero eliminamos las tablas si ya existen para evitar conflictos
DROP TABLE IF EXISTS quotation_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;

-- =====================================================
-- MODIFICAR TABLA ITEMS EXISTENTE (AGREGAR CAMPOS INVENTARIO)
-- =====================================================
-- Verificar y agregar campos de inventario a la tabla items existente
DO $$
BEGIN
    -- Agregar stock_actual
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'stock_actual') THEN
        ALTER TABLE items ADD COLUMN stock_actual INTEGER DEFAULT 0;
    END IF;

    -- Agregar stock_minimo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'stock_minimo') THEN
        ALTER TABLE items ADD COLUMN stock_minimo INTEGER DEFAULT 0;
    END IF;

    -- Agregar stock_maximo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'stock_maximo') THEN
        ALTER TABLE items ADD COLUMN stock_maximo INTEGER DEFAULT 1000;
    END IF;

    -- Agregar costo_promedio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'costo_promedio') THEN
        ALTER TABLE items ADD COLUMN costo_promedio DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- Agregar ubicacion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'ubicacion') THEN
        ALTER TABLE items ADD COLUMN ubicacion VARCHAR(255);
    END IF;

    -- Agregar categoria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'categoria') THEN
        ALTER TABLE items ADD COLUMN categoria VARCHAR(100);
    END IF;

    -- Agregar activo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'items' AND column_name = 'activo') THEN
        ALTER TABLE items ADD COLUMN activo BOOLEAN DEFAULT true;
    END IF;

    RAISE NOTICE 'Campos de inventario agregados a la tabla items';
END
$$;

-- =====================================================
-- TABLA: QUOTATIONS (COTIZACIONES)
-- =====================================================
CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) NOT NULL UNIQUE,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Cliente (usando nombres exactos del API)
    cliente_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_rif VARCHAR(20),
    cliente_domicilio TEXT,
    cliente_email VARCHAR(255),
    cliente_telefono VARCHAR(50),

    -- Fechas del API
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITH TIME ZONE,
    valida_hasta DATE,

    -- Estado y gestión
    estado VARCHAR(20) NOT NULL DEFAULT 'borrador'
        CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'convertida')),

    -- Totales calculados (nombres exactos del API)
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    descuento_global DECIMAL(15,2) NOT NULL DEFAULT 0,
    iva DECIMAL(15,2) NOT NULL DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,

    -- Observaciones
    observaciones TEXT,
    condiciones_comerciales TEXT,

    -- Vendedor (campos del API)
    vendedor_id VARCHAR(50),
    vendedor_nombre VARCHAR(255),

    -- Metadatos
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: QUOTATION_ITEMS (ÍTEMS DE COTIZACIÓN)
-- =====================================================
CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,

    -- Datos del producto (usando nombres exactos del API)
    nombre VARCHAR(255), -- Nombre del producto/servicio
    descripcion TEXT NOT NULL,

    -- Cantidades y precios (nombres exactos del API)
    cantidad DECIMAL(10,2) NOT NULL,
    precio_unitario DECIMAL(15,2) NOT NULL,
    descuento DECIMAL(15,2) DEFAULT 0, -- Monto de descuento, no porcentaje

    -- Total final (como lo envía el API)
    total DECIMAL(15,2) NOT NULL,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: INVENTORY_MOVEMENTS (MOVIMIENTOS DE INVENTARIO)
-- =====================================================
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,

    -- Tipo de movimiento
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'merma')),

    -- Cantidades
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL DEFAULT 0,
    stock_nuevo INTEGER NOT NULL DEFAULT 0,

    -- Costos (opcional, principalmente para entradas)
    costo_unitario DECIMAL(15,2),

    -- Información del movimiento
    motivo VARCHAR(255) NOT NULL,
    referencia VARCHAR(100), -- Número de factura, orden de compra, etc.

    -- Auditoría
    usuario_id UUID REFERENCES users(id) ON DELETE SET NULL,
    fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZAR PERFORMANCE
-- =====================================================
-- Eliminar índices existentes primero (por seguridad)
DROP INDEX IF EXISTS idx_quotations_numero;
DROP INDEX IF EXISTS idx_quotations_cliente_id;
DROP INDEX IF EXISTS idx_quotations_estado;
DROP INDEX IF EXISTS idx_quotations_fecha;
DROP INDEX IF EXISTS idx_quotations_fecha_creacion;
DROP INDEX IF EXISTS idx_quotations_vendedor_id;
DROP INDEX IF EXISTS idx_quotations_created_by;
DROP INDEX IF EXISTS idx_quotations_created_at;
DROP INDEX IF EXISTS idx_quotation_items_quotation_id;
DROP INDEX IF EXISTS idx_quotation_items_item_id;
DROP INDEX IF EXISTS idx_inventory_movements_item_id;
DROP INDEX IF EXISTS idx_inventory_movements_tipo;
DROP INDEX IF EXISTS idx_inventory_movements_fecha;
DROP INDEX IF EXISTS idx_inventory_movements_usuario_id;
DROP INDEX IF EXISTS idx_items_stock_actual;
DROP INDEX IF EXISTS idx_items_categoria;
DROP INDEX IF EXISTS idx_items_activo;

-- Crear índices para quotations
CREATE INDEX idx_quotations_numero ON quotations(numero);
CREATE INDEX idx_quotations_cliente_id ON quotations(cliente_id);
CREATE INDEX idx_quotations_estado ON quotations(estado);
CREATE INDEX idx_quotations_fecha ON quotations(fecha DESC);
CREATE INDEX idx_quotations_fecha_creacion ON quotations(fecha_creacion DESC);
CREATE INDEX idx_quotations_vendedor_id ON quotations(vendedor_id);
CREATE INDEX idx_quotations_created_by ON quotations(created_by);
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC);

-- Crear índices para quotation_items
CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX idx_quotation_items_item_id ON quotation_items(item_id);

-- Crear índices para inventory_movements
CREATE INDEX idx_inventory_movements_item_id ON inventory_movements(item_id);
CREATE INDEX idx_inventory_movements_tipo ON inventory_movements(tipo);
CREATE INDEX idx_inventory_movements_fecha ON inventory_movements(fecha DESC);
CREATE INDEX idx_inventory_movements_usuario_id ON inventory_movements(usuario_id);

-- Crear índices adicionales para items (campos de inventario)
CREATE INDEX idx_items_stock_actual ON items(stock_actual);
CREATE INDEX idx_items_categoria ON items(categoria);
CREATE INDEX idx_items_activo ON items(activo);

-- =====================================================
-- TRIGGERS PARA updated_at
-- =====================================================
CREATE TRIGGER update_quotations_updated_at
BEFORE UPDATE ON quotations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotation_items_updated_at
BEFORE UPDATE ON quotation_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS POLICIES)
-- Modo desarrollo: Permitir todo acceso público
-- =====================================================

-- Políticas para QUOTATIONS
DROP POLICY IF EXISTS "Enable all for quotations" ON quotations;
CREATE POLICY "Enable all for quotations"
ON quotations FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para QUOTATION_ITEMS
DROP POLICY IF EXISTS "Enable all for quotation_items" ON quotation_items;
CREATE POLICY "Enable all for quotation_items"
ON quotation_items FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para INVENTORY_MOVEMENTS
DROP POLICY IF EXISTS "Enable all for inventory_movements" ON inventory_movements;
CREATE POLICY "Enable all for inventory_movements"
ON inventory_movements FOR ALL
USING (true)
WITH CHECK (true);

-- =====================================================
-- FUNCIÓN PARA GENERAR NÚMERO DE COTIZACIÓN
-- =====================================================
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    last_number INTEGER := 0;
    new_number VARCHAR(50);
BEGIN
    -- Obtener el último número de cotización
    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(numero, '-', 2) AS INTEGER)),
        0
    ) INTO last_number
    FROM quotations
    WHERE numero LIKE 'COT-%';

    -- Generar nuevo número
    new_number := 'COT-' || LPAD((last_number + 1)::TEXT, 6, '0');

    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN PARA ACTUALIZAR STOCK AUTOMÁTICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION update_item_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar el stock actual del item
    UPDATE items
    SET stock_actual = NEW.stock_nuevo,
        updated_at = NOW()
    WHERE id = NEW.item_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock automáticamente
CREATE TRIGGER update_stock_after_movement
AFTER INSERT ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION update_item_stock();

-- =====================================================
-- DATOS INICIALES DE PRUEBA
-- =====================================================

-- Actualizar items existentes con datos de inventario
UPDATE items
SET
    stock_actual = CASE
        WHEN tipo = 'producto' THEN 100
        ELSE 0 -- Los servicios no tienen stock físico
    END,
    stock_minimo = CASE
        WHEN tipo = 'producto' THEN 10
        ELSE 0
    END,
    stock_maximo = CASE
        WHEN tipo = 'producto' THEN 500
        ELSE 0
    END,
    costo_promedio = precio_base * 0.6, -- Ejemplo: 60% del precio de venta
    categoria = CASE
        WHEN descripcion ILIKE '%laptop%' OR descripcion ILIKE '%mouse%' THEN 'Tecnología'
        WHEN descripcion ILIKE '%consultor%' OR descripcion ILIKE '%soporte%' THEN 'Servicios'
        ELSE 'General'
    END,
    activo = true;

-- Cotización de ejemplo
INSERT INTO quotations (
    numero,
    cliente_id,
    cliente_nombre,
    cliente_rif,
    cliente_domicilio,
    cliente_email,
    fecha_creacion,
    fecha_vencimiento,
    estado,
    valida_hasta,
    subtotal,
    descuento_global,
    iva,
    total,
    observaciones,
    condiciones_comerciales,
    vendedor_id,
    vendedor_nombre,
    created_by
)
SELECT
    generate_quotation_number(),
    c.id,
    c.razon_social,
    c.rif,
    c.domicilio,
    c.email,
    NOW(),
    NOW() + INTERVAL '15 days',
    'borrador',
    CURRENT_DATE + INTERVAL '30 days',
    80000.00,
    0.00,
    12800.00,
    92800.00,
    'Cotización de ejemplo para demostración del sistema',
    'Válida por 30 días. Precios en bolívares venezolanos.',
    u.id::text,
    u.nombre,
    u.id
FROM customers c, users u
WHERE c.rif = 'J-87654321-0'
AND u.email = 'vendedor@sistema.com'
LIMIT 1;

-- Items de la cotización de ejemplo
INSERT INTO quotation_items (
    quotation_id,
    item_id,
    nombre,
    descripcion,
    cantidad,
    precio_unitario,
    descuento,
    total
)
SELECT
    q.id,
    i.id,
    i.descripcion, -- Usar descripción como nombre
    i.descripcion,
    CASE
        WHEN i.codigo = 'SERV-001' THEN 1.00
        WHEN i.codigo = 'PROD-002' THEN 2.00
        ELSE 1.00
    END,
    i.precio_base,
    0.00, -- Sin descuento
    CASE
        WHEN i.codigo = 'SERV-001' THEN 50000.00  -- 1 * 50000
        WHEN i.codigo = 'PROD-002' THEN 30000.00  -- 2 * 15000
        ELSE i.precio_base
    END
FROM quotations q, items i
WHERE q.numero LIKE 'COT-%'
AND i.codigo IN ('SERV-001', 'PROD-002')
ORDER BY q.created_at DESC, i.codigo
LIMIT 2;

-- Algunos movimientos de inventario de ejemplo
INSERT INTO inventory_movements (
    item_id,
    tipo,
    cantidad,
    stock_anterior,
    stock_nuevo,
    costo_unitario,
    motivo,
    referencia,
    usuario_id,
    fecha
)
SELECT
    i.id,
    'entrada',
    100,
    0,
    100,
    i.costo_promedio,
    'Inventario inicial del sistema',
    'INV-INICIAL-001',
    u.id,
    NOW() - INTERVAL '7 days'
FROM items i, users u
WHERE i.tipo = 'producto'
AND u.email = 'admin@sistema.com';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Verificar que las nuevas tablas se crearon correctamente
SELECT
    'quotations' as tabla, COUNT(*) as registros FROM quotations
UNION ALL
SELECT 'quotation_items', COUNT(*) FROM quotation_items
UNION ALL
SELECT 'inventory_movements', COUNT(*) FROM inventory_movements
UNION ALL
SELECT 'items_actualizados', COUNT(*) FROM items WHERE stock_actual IS NOT NULL;

-- Verificar estructura de la tabla items actualizada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'items'
AND column_name IN ('stock_actual', 'stock_minimo', 'stock_maximo', 'costo_promedio', 'ubicacion', 'categoria', 'activo')
ORDER BY column_name;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Ahora el sistema tiene todas las tablas necesarias:
-- ✅ Sistema completo de cotizaciones (quotations, quotation_items)
-- ✅ Sistema completo de inventario (inventory_movements + campos en items)
-- ✅ Funciones auxiliares para numeración automática
-- ✅ Triggers para mantener stock actualizado
-- ✅ Datos de ejemplo para pruebas
-- =====================================================