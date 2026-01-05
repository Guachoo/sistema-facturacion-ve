-- =====================================================
-- SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA DE TASAS
-- Se ejecuta todos los días a las 9:00 AM
-- =====================================================

-- 1. Habilitar la extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Crear función que actualiza las tasas desde la API
CREATE OR REPLACE FUNCTION update_exchange_rates_from_api()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_response json;
  usd_value numeric;
  eur_value numeric;
  rate_date_value date;
BEGIN
  -- Hacer request HTTP a la API de DolarVzla
  -- Nota: Requiere la extensión http
  SELECT content::json INTO api_response
  FROM http_get('https://api.dolarvzla.com/public/exchange-rate');

  -- Extraer valores de la respuesta
  usd_value := COALESCE((api_response->'current'->>'usd')::numeric, 36.50);
  eur_value := COALESCE((api_response->'current'->>'eur')::numeric, 40.00);
  rate_date_value := COALESCE((api_response->'current'->>'date')::date, CURRENT_DATE);

  -- Insertar o actualizar la tasa del día
  INSERT INTO exchange_rates (rate_date, usd_rate, eur_rate, created_at, updated_at)
  VALUES (rate_date_value, usd_value, eur_value, NOW(), NOW())
  ON CONFLICT (rate_date)
  DO UPDATE SET
    usd_rate = EXCLUDED.usd_rate,
    eur_rate = EXCLUDED.eur_rate,
    updated_at = NOW();

  -- Log success
  RAISE NOTICE 'Tasas actualizadas: USD=%, EUR=%, Fecha=%', usd_value, eur_value, rate_date_value;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no fallar
    RAISE WARNING 'Error al actualizar tasas: %', SQLERRM;
END;
$$;

-- 3. Configurar pg_cron para ejecutar la función todos los días a las 9:00 AM
-- Primero, eliminar cualquier job existente con el mismo nombre
SELECT cron.unschedule('daily-exchange-rates-update');

-- Crear el nuevo cron job
SELECT cron.schedule(
  'daily-exchange-rates-update',           -- nombre del job
  '0 9 * * *',                             -- cron expression: 9:00 AM todos los días
  $$SELECT update_exchange_rates_from_api();$$  -- comando a ejecutar
);

-- 4. Comentarios para documentación
COMMENT ON FUNCTION update_exchange_rates_from_api() IS
'Actualiza las tasas de cambio USD y EUR desde la API de DolarVzla. Se ejecuta automáticamente todos los días a las 9:00 AM mediante pg_cron.';

-- 5. Verificar que el job fue creado correctamente
SELECT
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'daily-exchange-rates-update';

-- 6. Ejecutar una primera vez manualmente para verificar (opcional)
-- SELECT update_exchange_rates_from_api();
