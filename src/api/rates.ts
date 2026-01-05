import { useQuery } from '@tanstack/react-query';
import type { BcvRate, ExchangeRates } from '@/types';
import { supabase } from '@/lib/supabase';

// Fetch exchange rates from database first, then fallback to API
const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    console.log('📊 Obteniendo tasas de cambio...');

    // Intentar obtener las tasas de la base de datos primero
    const today = new Date().toISOString().split('T')[0];

    const { data: dbRates, error: dbError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('rate_date', today)
      .single();

    if (!dbError && dbRates) {
      console.log('✅ Tasas obtenidas de la base de datos:', dbRates);
      return {
        usd: Number(dbRates.usd_rate),
        eur: Number(dbRates.eur_rate),
        date: dbRates.rate_date,
        lastUpdate: dbRates.updated_at
      };
    }

    // Si no hay tasas en la base de datos, obtener de la API
    console.log('📡 Tasas no encontradas en DB, obteniendo de DolarVzla API...');

    // Agregar timestamp para evitar caché del navegador
    const timestamp = new Date().getTime();
    const response = await fetch(`https://api.dolarvzla.com/public/exchange-rate?_t=${timestamp}`, {
      cache: 'no-store', // Forzar no usar caché
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('DolarVzla API response:', data);

    const usd = data.current?.usd || 36.50;
    const eur = data.current?.eur || 40.00;
    const rateDate = data.current?.date || new Date().toISOString().split('T')[0];

    console.log('Using rates - USD:', usd, 'EUR:', eur, 'from date:', rateDate);

    // Guardar las tasas en la base de datos para uso futuro
    try {
      await supabase.from('exchange_rates').insert({
        rate_date: rateDate,
        usd_rate: usd,
        eur_rate: eur
      });
      console.log('💾 Tasas guardadas en la base de datos');
    } catch (insertError) {
      console.error('⚠️ Error al guardar tasas en DB:', insertError);
    }

    return {
      usd: usd,
      eur: eur,
      date: rateDate,
      lastUpdate: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Error fetching exchange rates:', error);

    // Fallback to default rates
    return {
      usd: 36.50,
      eur: 40.00,
      date: new Date().toISOString().split('T')[0],
      lastUpdate: new Date().toISOString()
    };
  }
};

// Fetch BCV rate from DolarVzla API (reliable Venezuelan exchange rate source)
const fetchBCVRate = async (date?: string): Promise<BcvRate> => {
  try {
    const rates = await fetchExchangeRates();

    return {
      date: date || rates.date,
      rate: rates.usd,
      source: 'BCV Oficial',
      lastUpdate: rates.lastUpdate
    };

  } catch (error) {
    console.error('Error fetching BCV rate:', error);

    // Fallback to default rate
    return {
      date: date || new Date().toISOString().split('T')[0],
      rate: 36.50,
      source: 'BCV (Sin conexión)',
      lastUpdate: new Date().toISOString()
    };
  }
};

export const useBcvRate = (date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['bcv-rate', targetDate],
    queryFn: () => fetchBCVRate(targetDate),
    staleTime: 0, // Sin caché - siempre considerado stale
    gcTime: 0, // Sin caché en garbage collection
    refetchOnWindowFocus: true, // Actualizar al volver a la ventana
    refetchOnMount: true, // Actualizar al montar el componente
    refetchInterval: 1000 * 60 * 2, // Actualizar cada 2 minutos
    retry: 3,
  });
};

export const useExchangeRates = () => {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: fetchExchangeRates,
    staleTime: 0, // Sin caché - siempre considerado stale
    gcTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: true, // Actualizar al volver a la ventana
    refetchOnMount: true, // Actualizar al montar el componente
    refetchInterval: 1000 * 60 * 2, // Actualizar cada 2 minutos
    retry: 3,
  });
};