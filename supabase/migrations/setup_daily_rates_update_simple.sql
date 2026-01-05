-- =====================================================
-- SISTEMA DE ACTUALIZACIÓN AUTOMÁTICA DE TASAS (SIMPLE)
-- Versión sin dependencia de extensión HTTP
-- =====================================================

-- OPCIÓN 1: Usar Supabase Edge Functions + Database Webhooks
-- Esta es la forma recomendada para Supabase

-- 1. Crear tabla para logs de actualización
CREATE TABLE IF NOT EXISTS exchange_rates_update_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL, -- 'success' o 'error'
  message TEXT,
  usd_rate DECIMAL(10, 4),
  eur_rate DECIMAL(10, 4)
);

-- 2. Comentario
COMMENT ON TABLE exchange_rates_update_log IS
'Registro de actualizaciones automáticas de tasas de cambio';

-- =====================================================
-- INSTRUCCIONES PARA CONFIGURAR EN SUPABASE DASHBOARD:
-- =====================================================

/*
PASO 1: Crear una Supabase Edge Function
------------------------------------------
1. Ve al Dashboard de Supabase > Edge Functions
2. Crea una nueva función llamada "update-exchange-rates"
3. Usa el siguiente código:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Obtener tasas de la API
    const response = await fetch('https://api.dolarvzla.com/public/exchange-rate')
    const data = await response.json()

    const usd = data.current?.usd || 36.50
    const eur = data.current?.eur || 40.00
    const rateDate = data.current?.date || new Date().toISOString().split('T')[0]

    // Conectar a Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insertar/actualizar tasas
    const { error: upsertError } = await supabase
      .from('exchange_rates')
      .upsert({
        rate_date: rateDate,
        usd_rate: usd,
        eur_rate: eur,
        updated_at: new Date().toISOString()
      }, { onConflict: 'rate_date' })

    if (upsertError) throw upsertError

    // Log success
    await supabase
      .from('exchange_rates_update_log')
      .insert({
        status: 'success',
        message: `Tasas actualizadas: USD=${usd}, EUR=${eur}`,
        usd_rate: usd,
        eur_rate: eur
      })

    return new Response(
      JSON.stringify({ success: true, usd, eur, date: rateDate }),
      { headers: { "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error('Error:', error)

    // Log error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase
      .from('exchange_rates_update_log')
      .insert({
        status: 'error',
        message: error.message
      })

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

PASO 2: Configurar Cron Job en Supabase
----------------------------------------
1. Ve al Dashboard de Supabase > Database > Cron Jobs
2. Crea un nuevo cron job:
   - Nombre: daily-exchange-rates-update
   - Horario: 0 9 * * * (9:00 AM todos los días)
   - Comando SQL:
     SELECT
       net.http_post(
         url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-exchange-rates',
         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
       ) as request_id;

PASO 3: Verificar
-----------------
1. Ejecuta manualmente la función edge para verificar:
   curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-exchange-rates \
     -H "Authorization: Bearer YOUR_ANON_KEY"

2. Verifica los logs:
   SELECT * FROM exchange_rates_update_log ORDER BY update_date DESC LIMIT 10;

3. Verifica las tasas:
   SELECT * FROM exchange_rates ORDER BY rate_date DESC LIMIT 5;
*/

-- =====================================================
-- ALTERNATIVA: Función PL/pgSQL simple (sin HTTP)
-- =====================================================

-- Si no quieres usar Edge Functions, puedes insertar manualmente las tasas
-- o llamar a esta función desde tu aplicación frontend

CREATE OR REPLACE FUNCTION insert_exchange_rate(
  p_date DATE,
  p_usd DECIMAL(10, 4),
  p_eur DECIMAL(10, 4)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO exchange_rates (rate_date, usd_rate, eur_rate, created_at, updated_at)
  VALUES (p_date, p_usd, p_eur, NOW(), NOW())
  ON CONFLICT (rate_date)
  DO UPDATE SET
    usd_rate = EXCLUDED.usd_rate,
    eur_rate = EXCLUDED.eur_rate,
    updated_at = NOW();

  -- Log
  INSERT INTO exchange_rates_update_log (status, message, usd_rate, eur_rate)
  VALUES ('success', 'Tasas insertadas/actualizadas manualmente', p_usd, p_eur);
END;
$$;

COMMENT ON FUNCTION insert_exchange_rate IS
'Función helper para insertar/actualizar tasas de cambio manualmente';
