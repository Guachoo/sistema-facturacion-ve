/**
 * Servicio para actualizar tasas de cambio del BCV
 *
 * El Banco Central de Venezuela publica las tasas de lunes a viernes a las 9:00 AM
 * Este servicio:
 * - Verifica cada minuto si es hora de actualizar (lunes-viernes a las 9:00 AM)
 * - Solo actualiza una vez por día
 * - Ignora fines de semana
 */

import { supabase } from '@/lib/supabase';

// Función para obtener tasas de la API
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

// Función para guardar tasas en Supabase
async function saveRatesToDatabase(rates: { usd: number; eur: number; date: string; lastUpdate: string }) {
  try {
    console.log('💾 Guardando tasas en la base de datos...');

    const { error } = await supabase
      .from('exchange_rates')
      .upsert({
        rate_date: rates.date,
        usd_rate: rates.usd,
        eur_rate: rates.eur,
        updated_at: rates.lastUpdate
      }, {
        onConflict: 'rate_date'
      });

    if (error) throw error;

    console.log('✅ Tasas guardadas/actualizadas en la base de datos');
    return true;

  } catch (error) {
    console.error('❌ Error al guardar tasas en la base de datos:', error);
    throw error;
  }
}

// Verificar si es lunes a viernes
function isWeekday(): boolean {
  const day = new Date().getDay();
  return day >= 1 && day <= 5; // 1 = lunes, 5 = viernes
}

// Verificar si es exactamente las 9:00 AM
function isNineAM(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour === 9 && minute >= 0 && minute < 1; // Entre 9:00:00 y 9:00:59
}

// Verificar si ya tenemos la tasa de hoy
async function hasRateForToday(): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate_date')
      .eq('rate_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    // Si hay data, ya tenemos la tasa de hoy
    return !!data;

  } catch (error) {
    console.error('⚠️ Error al verificar tasa de hoy:', error);
    return false; // En caso de error, asumir que no hay tasa
  }
}

// Verificar si necesitamos actualizar las tasas
async function shouldUpdateRates(): Promise<boolean> {
  // Solo actualizar de lunes a viernes
  if (!isWeekday()) {
    console.log('⏭️ Fin de semana - no se actualizan tasas');
    return false;
  }

  // Solo actualizar a las 9:00 AM
  if (!isNineAM()) {
    return false;
  }

  // Verificar si ya tenemos la tasa de hoy
  const hasRate = await hasRateForToday();
  if (hasRate) {
    console.log('✅ Ya existe la tasa de hoy');
    return false;
  }

  console.log('🔔 Es hora de actualizar las tasas del BCV (lunes-viernes 9:00 AM)');
  return true;
}

// Función para actualizar manualmente (cuando se abre la app)
export async function updateRatesOnStartup() {
  try {
    // Si no es día de semana, no actualizar
    if (!isWeekday()) {
      console.log('⏭️ Fin de semana - las tasas del BCV no se publican');
      return { success: true, updated: false, message: 'Fin de semana' };
    }

    // Verificar si ya tenemos la tasa de hoy
    const hasRate = await hasRateForToday();
    if (hasRate) {
      console.log('✅ Ya existe la tasa de hoy');
      return { success: true, updated: false, message: 'Ya actualizado' };
    }

    // Si no tenemos la tasa de hoy y es día de semana, actualizar
    console.log('🔄 No hay tasa para hoy, actualizando desde DolarVzla API...');

    const rates = await fetchRatesFromAPI();
    await saveRatesToDatabase(rates);

    console.log('✅ Tasas de cambio actualizadas exitosamente');
    return { success: true, updated: true, rates };

  } catch (error) {
    console.error('❌ Error durante la actualización de tasas:', error);
    return { success: false, updated: false, error };
  }
}

// Función principal que actualiza las tasas solo si es lunes-viernes 9:00 AM
export async function updateExchangeRatesIfNeeded() {
  try {
    const needsUpdate = await shouldUpdateRates();

    if (!needsUpdate) {
      return { success: true, updated: false, message: 'No es hora de actualizar' };
    }

    console.log('🔄 Actualizando tasas de cambio del BCV...');

    const rates = await fetchRatesFromAPI();
    await saveRatesToDatabase(rates);

    console.log('✅ Tasas de cambio actualizadas exitosamente');
    return { success: true, updated: true, rates };

  } catch (error) {
    console.error('❌ Error durante la actualización de tasas:', error);
    return { success: false, updated: false, error };
  }
}

// Iniciar verificación al cargar la app
export function initRatesUpdater() {
  console.log('🚀 Iniciando servicio de actualización de tasas del BCV...');
  console.log('📅 Horario automático: Lunes a Viernes a las 9:00 AM');

  // Actualizar al iniciar la app si no existe la tasa de hoy
  updateRatesOnStartup();

  // Verificar cada minuto si es hora de actualizar (lunes-viernes 9:00 AM)
  const intervalId = setInterval(() => {
    updateExchangeRatesIfNeeded();
  }, 60 * 1000); // 1 minuto

  console.log('✅ Servicio de actualización de tasas iniciado');
  console.log('⏰ Verificará cada minuto si es lunes-viernes 9:00 AM');

  // Retornar función para limpiar el interval
  return () => {
    console.log('🛑 Deteniendo servicio de actualización de tasas...');
    clearInterval(intervalId);
  };
}
