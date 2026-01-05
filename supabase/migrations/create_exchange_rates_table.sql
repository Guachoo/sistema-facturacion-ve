-- Tabla para almacenar las tasas de cambio históricas
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_date DATE NOT NULL UNIQUE,
  usd_rate DECIMAL(10, 4) NOT NULL,
  eur_rate DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por fecha
CREATE INDEX idx_exchange_rates_date ON exchange_rates(rate_date DESC);

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_exchange_rates_updated_at
  BEFORE UPDATE ON exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE exchange_rates IS 'Almacena las tasas de cambio históricas (USD y EUR) obtenidas de la API DolarVzla';
COMMENT ON COLUMN exchange_rates.rate_date IS 'Fecha de la tasa de cambio';
COMMENT ON COLUMN exchange_rates.usd_rate IS 'Tasa de cambio del dólar (USD) en bolívares';
COMMENT ON COLUMN exchange_rates.eur_rate IS 'Tasa de cambio del euro (EUR) en bolívares';
