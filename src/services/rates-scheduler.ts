import cron from 'node-cron';
import { supabase } from '@/lib/supabase';

/**
 * Servicio de actualización automática de tasas de cambio
 * Se ejecuta todos los días a las 9:00 AM
 */

// Función para obtener las tasas de la API DolarVzla
async function fetchRatesFromAPI() {
  try {
    console.log('🔄 Obteniendo tasas de cambio desde DolarVzla API...');

    const response = await fetch('https://api.dolarvzla.com/public/exchange-rate');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const usd = data.current?.usd || 36.50;
    const eur = data.current?.eur || 40.00;
    const rateDate = data.current?.date || new Date().toISOString().split('T')[0];

    console.log('✅ Tasas obtenidas - USD:', usd, 'EUR:', eur, 'Fecha:', rateDate);

    return {
      usd,
      eur,
      date: rateDate,
      lastUpdate: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error al obtener tasas de la API:', error);
    throw error;
  }
}

// Función para guardar las tasas en Supabase
async function saveRatesToDatabase(rates: { usd: number; eur: number; date: string; lastUpdate: string }) {
  try {
    console.log('💾 Guardando tasas en la base de datos...');

    // Verificar si ya existe una tasa para esta fecha
    const { data: existingRate, error: checkError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('rate_date', rates.date)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, que es válido
      throw checkError;
    }

    if (existingRate) {
      // Actualizar tasa existente
      const { error: updateError } = await supabase
        .from('exchange_rates')
        .update({
          usd_rate: rates.usd,
          eur_rate: rates.eur,
          updated_at: rates.lastUpdate
        })
        .eq('rate_date', rates.date);

      if (updateError) throw updateError;
      console.log('✅ Tasas actualizadas en la base de datos');
    } else {
      // Insertar nueva tasa
      const { error: insertError } = await supabase
        .from('exchange_rates')
        .insert({
          rate_date: rates.date,
          usd_rate: rates.usd,
          eur_rate: rates.eur,
          created_at: rates.lastUpdate,
          updated_at: rates.lastUpdate
        });

      if (insertError) throw insertError;
      console.log('✅ Nuevas tasas insertadas en la base de datos');
    }

    return true;

  } catch (error) {
    console.error('❌ Error al guardar tasas en la base de datos:', error);
    throw error;
  }
}

// Función principal que actualiza las tasas
export async function updateExchangeRates() {
  try {
    console.log('⏰ Iniciando actualización automática de tasas de cambio...');

    // Obtener tasas de la API
    const rates = await fetchRatesFromAPI();

    // Guardar en la base de datos
    await saveRatesToDatabase(rates);

    console.log('✅ Actualización de tasas completada exitosamente');
    return { success: true, rates };

  } catch (error) {
    console.error('❌ Error durante la actualización de tasas:', error);
    return { success: false, error };
  }
}

// Configurar el cron job para ejecutar a las 9:00 AM todos los días
export function startRatesScheduler() {
  console.log('🚀 Iniciando programador de actualización de tasas...');
  console.log('📅 Las tasas se actualizarán automáticamente todos los días a las 9:00 AM');

  // Cron expression: '0 9 * * *' = A las 9:00 AM todos los días
  // Formato: segundo minuto hora dia mes dia-semana
  const task = cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Ejecutando actualización programada de tasas de cambio...');
    await updateExchangeRates();
  }, {
    scheduled: true,
    timezone: "America/Caracas" // Zona horaria de Venezuela
  });

  // Ejecutar una actualización inmediata al iniciar (opcional)
  updateExchangeRates();

  return task;
}

// Función para detener el scheduler (útil para testing o shutdown)
export function stopRatesScheduler(task: cron.ScheduledTask) {
  console.log('🛑 Deteniendo programador de actualización de tasas...');
  task.stop();
}
