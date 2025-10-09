import { useQuery } from '@tanstack/react-query';
import type { BcvRate } from '@/types';

// Fetch real BCV rates from DolarApi Venezuela
const fetchBCVRate = async (date?: string): Promise<BcvRate> => {
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Find official BCV rate
    const oficial = data.find((item: any) =>
      item.nombre === 'Oficial' ||
      item.casa === 'bcv' ||
      item.fuente?.toLowerCase().includes('bcv')
    );

    if (oficial) {
      return {
        date: date || new Date().toISOString().split('T')[0],
        rate: oficial.venta || oficial.promedio || oficial.compra || 36.50,
        source: 'BCV',
        lastUpdate: oficial.fechaActualizacion || new Date().toISOString()
      };
    }

    // Fallback if no official rate found
    throw new Error('No official BCV rate found');

  } catch (error) {
    console.error('Error fetching BCV rate:', error);

    // Fallback to mock data
    return {
      date: date || new Date().toISOString().split('T')[0],
      rate: 36.50,
      source: 'BCV (Fallback)',
      lastUpdate: new Date().toISOString()
    };
  }
};

export const useBcvRate = (date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['bcv-rate', targetDate],
    queryFn: () => fetchBCVRate(targetDate),
    staleTime: 1000 * 60 * 60, // 1 hour cache
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    retry: 3,
  });
};