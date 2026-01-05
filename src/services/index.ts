/**
 * Servicios de la aplicación
 * Aquí se inicializan todos los servicios en segundo plano
 */

import { initRatesUpdater } from './rates-updater';

// Variable para almacenar la función cleanup
let cleanupRates: (() => void) | null = null;

/**
 * Inicia todos los servicios en segundo plano
 */
export function startServices() {
  console.log('🚀 Iniciando servicios de la aplicación...');

  // Iniciar el updater de tasas
  cleanupRates = initRatesUpdater();

  console.log('✅ Todos los servicios iniciados correctamente');
}

/**
 * Detiene todos los servicios en segundo plano
 */
export function stopServices() {
  console.log('🛑 Deteniendo servicios de la aplicación...');

  if (cleanupRates) {
    cleanupRates();
    console.log('✅ Servicio de tasas detenido');
  }

  console.log('✅ Todos los servicios detenidos');
}

// Auto-iniciar los servicios cuando se importa este módulo
if (typeof window !== 'undefined') {
  // Solo en el navegador (no en SSR)
  startServices();

  // Detener servicios cuando se cierra la ventana
  window.addEventListener('beforeunload', stopServices);
}
