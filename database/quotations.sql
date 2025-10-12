-- Quotations Database Schema
-- Execute this SQL in Supabase SQL Editor to create quotations tables

-- Create quotations table
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    cliente_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255),
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'convertida')) DEFAULT 'borrador',
    subtotal DECIMAL(15,2) DEFAULT 0,
    descuento_global DECIMAL(15,2) DEFAULT 0,
    iva DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    observaciones TEXT,
    vendedor_id UUID REFERENCES public.users(id),
    vendedor_nombre VARCHAR(255) NOT NULL,
    valida_hasta DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotation_items table
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.items(id),
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(15,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_cliente_id ON public.quotations(cliente_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vendedor_id ON public.quotations(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_estado ON public.quotations(estado);
CREATE INDEX IF NOT EXISTS idx_quotations_fecha_creacion ON public.quotations(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_quotations_numero ON public.quotations(numero);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_item_id ON public.quotation_items(item_id);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotation_items_updated_at ON public.quotation_items;
CREATE TRIGGER update_quotation_items_updated_at
    BEFORE UPDATE ON public.quotation_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotations
CREATE POLICY "Enable read access for all users" ON public.quotations
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.quotations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.quotations
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.quotations
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create RLS policies for quotation_items
CREATE POLICY "Enable read access for all users" ON public.quotation_items
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.quotation_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.quotation_items
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.quotation_items
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insert sample data
INSERT INTO public.quotations (
    numero,
    cliente_id,
    cliente_nombre,
    cliente_email,
    fecha_creacion,
    fecha_vencimiento,
    estado,
    subtotal,
    descuento_global,
    iva,
    total,
    observaciones,
    vendedor_id,
    vendedor_nombre,
    valida_hasta
) VALUES
(
    'COT-2024-001',
    (SELECT id FROM public.customers LIMIT 1),
    'Empresa Demo C.A.',
    'demo@empresa.com',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'enviada',
    1000000.00,
    50000.00,
    152000.00,
    1102000.00,
    'Cotización para servicios de consultoría',
    (SELECT id FROM public.users WHERE rol IN ('vendedor', 'admin', 'superadmin') LIMIT 1),
    'Juan Vendedor',
    CURRENT_DATE + INTERVAL '30 days'
),
(
    'COT-2024-002',
    (SELECT id FROM public.customers OFFSET 1 LIMIT 1),
    'Juan Pérez',
    'juan@email.com',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '27 days',
    'aprobada',
    500000.00,
    0.00,
    80000.00,
    580000.00,
    'Servicios de desarrollo web',
    (SELECT id FROM public.users WHERE rol IN ('vendedor', 'admin', 'superadmin') LIMIT 1),
    'Juan Vendedor',
    CURRENT_DATE + INTERVAL '27 days'
);

-- Insert sample quotation items
INSERT INTO public.quotation_items (
    quotation_id,
    item_id,
    nombre,
    descripcion,
    cantidad,
    precio_unitario,
    descuento,
    total
) VALUES
(
    (SELECT id FROM public.quotations WHERE numero = 'COT-2024-001'),
    (SELECT id FROM public.items LIMIT 1),
    'Consultoría de Sistemas',
    'Análisis y diseño de sistema',
    10.00,
    100000.00,
    0.00,
    1000000.00
),
(
    (SELECT id FROM public.quotations WHERE numero = 'COT-2024-002'),
    (SELECT id FROM public.items OFFSET 1 LIMIT 1),
    'Desarrollo Web',
    'Sitio web corporativo',
    1.00,
    500000.00,
    0.00,
    500000.00
);

-- Create a view for quotations with related data
CREATE OR REPLACE VIEW quotations_with_details AS
SELECT
    q.*,
    c.rif as cliente_rif,
    c.domicilio as cliente_domicilio,
    c.telefono as cliente_telefono,
    u.nombre as vendedor_nombre_completo,
    u.email as vendedor_email,
    COALESCE(
        (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', qi.id,
                'item_id', qi.item_id,
                'nombre', qi.nombre,
                'descripcion', qi.descripcion,
                'cantidad', qi.cantidad,
                'precio_unitario', qi.precio_unitario,
                'descuento', qi.descuento,
                'total', qi.total
            )
        ) FROM quotation_items qi WHERE qi.quotation_id = q.id),
        '[]'::json
    ) as items_json
FROM quotations q
LEFT JOIN customers c ON q.cliente_id = c.id
LEFT JOIN users u ON q.vendedor_id = u.id
ORDER BY q.created_at DESC;

COMMENT ON TABLE public.quotations IS 'Tabla para almacenar cotizaciones del sistema';
COMMENT ON TABLE public.quotation_items IS 'Tabla para almacenar los items de cada cotización';
COMMENT ON VIEW quotations_with_details IS 'Vista que incluye información completa de cotizaciones con clientes, vendedores e items';