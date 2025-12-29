#!/usr/bin/env node

/**
 * RESET COMPLETO DE SUPABASE - SISTEMA FACTURACIÓN
 *
 * Este script elimina TODOS los datos operacionales de Supabase
 * usando la API REST, respetando las dependencias y Foreign Keys.
 *
 * ADVERTENCIA: SOLO PARA AMBIENTE DE PRUEBAS
 */

const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

// Configuración
const FORCE_DELETE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

console.log('🔥 RESET COMPLETO DE SUPABASE - SISTEMA FACTURACIÓN');
console.log('==================================================');
console.log(`🏠 Supabase URL: ${SUPABASE_URL}`);
console.log(`🔧 Modo: ${DRY_RUN ? 'DRY RUN (solo mostrar)' : 'EJECUCIÓN REAL'}`);
console.log(`⚡ Force: ${FORCE_DELETE ? 'SÍ' : 'NO'}`);
console.log('');

// Headers para requests
const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

/**
 * Función para hacer requests a Supabase
 */
async function supabaseRequest(table, method = 'GET', filter = '', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter}`;

  const options = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  if (DRY_RUN && method !== 'GET') {
    console.log(`[DRY RUN] ${method} ${url}`);
    return { success: true, data: [], count: 0 };
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
    }

    // Obtener count del header si está disponible
    const count = response.headers.get('content-range')
      ? parseInt(response.headers.get('content-range').split('/')[1])
      : (Array.isArray(data) ? data.length : 1);

    return { success: true, data, count };
  } catch (error) {
    return { success: false, error: error.message, data: [], count: 0 };
  }
}

/**
 * Función para contar registros en una tabla
 */
async function countRecords(table) {
  const result = await supabaseRequest(table, 'GET', '?select=id&limit=1');
  if (!result.success) {
    return 0;
  }

  // Usar HEAD request para obtener count exacto
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
      method: 'HEAD',
      headers
    });

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      const total = contentRange.split('/')[1];
      return total === '*' ? 'muchos' : parseInt(total);
    }

    return 0;
  } catch (error) {
    console.warn(`⚠️  No se pudo contar ${table}: ${error.message}`);
    return '?';
  }
}

/**
 * Función para eliminar todos los registros de una tabla
 */
async function deleteAllFromTable(table) {
  console.log(`🗑️  Eliminando todos los registros de: ${table}`);

  if (DRY_RUN) {
    const count = await countRecords(table);
    console.log(`   [DRY RUN] Se eliminarían ${count} registros de ${table}`);
    return { success: true, count };
  }

  // Para Supabase, usamos rango para eliminar todos
  const result = await supabaseRequest(table, 'DELETE', '?id=gte.0');

  if (result.success) {
    console.log(`   ✅ Eliminados ${result.count || 'todos los'} registros de ${table}`);
  } else {
    console.log(`   ❌ Error eliminando ${table}: ${result.error}`);
  }

  return result;
}

/**
 * Verificar estado inicial
 */
async function verificarEstadoInicial() {
  console.log('📊 ESTADO INICIAL:');

  const tablas = [
    'invoices',
    'quotations',
    'quotation_items',
    'customers',
    'items',
    'inventory_movements',
    'fiscal_documents',
    'fiscal_backups',
    'fiscal_audit_log',
    'fiscal_traceability',
    'users',
    'user_permissions'
  ];

  let totalRegistros = 0;

  for (const tabla of tablas) {
    const count = await countRecords(tabla);
    console.log(`   ${tabla.padEnd(20)}: ${count} registros`);
    if (typeof count === 'number') {
      totalRegistros += count;
    }
  }

  console.log(`📈 Total estimado: ${totalRegistros} registros`);
  console.log('');

  return totalRegistros;
}

/**
 * Función principal de reset
 */
async function resetCompleto() {
  console.log('🚀 INICIANDO RESET COMPLETO...');
  console.log('');

  // Verificar estado inicial
  const estadoInicial = await verificarEstadoInicial();

  if (!FORCE_DELETE && !DRY_RUN) {
    console.log('⚠️  Para ejecutar el reset real, use: --force');
    console.log('💡 Para ver qué se haría, use: --dry-run');
    return;
  }

  console.log('⏳ Iniciando eliminación en orden correcto...');
  console.log('');

  // ORDEN CRÍTICO: Eliminar dependencias primero
  const tablasAEliminar = [
    // 1. Documentos y auditoría (sin dependencias)
    'fiscal_audit_log',
    'fiscal_traceability',
    'fiscal_backups',
    'fiscal_documents',

    // 2. Items de cotizaciones (depende de quotations)
    'quotation_items',

    // 3. Movimientos de inventario (depende de items)
    'inventory_movements',

    // 4. Facturas (depende de customers)
    'invoices',

    // 5. Cotizaciones (depende de customers)
    'quotations',

    // 6. Items/productos (independiente)
    'items',

    // 7. Clientes (al final, muchas tablas dependen de esta)
    'customers'
  ];

  let totalEliminados = 0;
  const errores = [];

  for (const tabla of tablasAEliminar) {
    try {
      const result = await deleteAllFromTable(tabla);
      if (result.success) {
        if (typeof result.count === 'number') {
          totalEliminados += result.count;
        }
      } else {
        errores.push(`${tabla}: ${result.error}`);
      }

      // Pausa entre eliminaciones para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.log(`   ❌ Error eliminando ${tabla}: ${error.message}`);
      errores.push(`${tabla}: ${error.message}`);
    }
  }

  console.log('');
  console.log('📊 RESUMEN DEL RESET:');
  console.log(`✅ Total eliminado: ${totalEliminados} registros`);
  console.log(`❌ Errores: ${errores.length}`);

  if (errores.length > 0) {
    console.log('');
    console.log('❌ ERRORES ENCONTRADOS:');
    errores.forEach(error => console.log(`   • ${error}`));
  }

  console.log('');
  console.log('🔍 VERIFICANDO ESTADO FINAL...');
  await verificarEstadoInicial();

  console.log('');
  console.log('✅ RESET COMPLETADO');
  console.log('');
  console.log('💡 NOTAS:');
  console.log('   • Los usuarios y permisos se mantuvieron intactos');
  console.log('   • Todas las facturas, clientes e items fueron eliminados');
  console.log('   • El sistema está listo para nuevas pruebas');
}

/**
 * Función para mostrar ayuda
 */
function mostrarAyuda() {
  console.log('');
  console.log('📖 MODO DE USO:');
  console.log('   node reset-supabase-completo.js [opciones]');
  console.log('');
  console.log('🔧 OPCIONES:');
  console.log('   --dry-run    Solo mostrar qué se haría, sin ejecutar');
  console.log('   --force      Ejecutar el reset real (PELIGROSO)');
  console.log('   --help       Mostrar esta ayuda');
  console.log('');
  console.log('📋 EJEMPLOS:');
  console.log('   # Ver qué se haría:');
  console.log('   node reset-supabase-completo.js --dry-run');
  console.log('');
  console.log('   # Ejecutar reset real (CUIDADO):');
  console.log('   node reset-supabase-completo.js --force');
  console.log('');
  console.log('⚠️  ADVERTENCIA:');
  console.log('   Este script ELIMINARÁ TODOS los datos operacionales');
  console.log('   Solo usar en ambientes de PRUEBA/TEST/DEV');
  console.log('');
}

/**
 * Función principal
 */
async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    mostrarAyuda();
    return;
  }

  // Verificar conexión
  console.log('🔌 Verificando conexión a Supabase...');
  const testResult = await supabaseRequest('users', 'GET', '?limit=1');

  if (!testResult.success) {
    console.log('❌ Error de conexión a Supabase:');
    console.log(`   ${testResult.error}`);
    console.log('');
    console.log('🔧 Verifique:');
    console.log('   • URL de Supabase correcta');
    console.log('   • API Key válida');
    console.log('   • Permisos de la API Key');
    return;
  }

  console.log('✅ Conexión a Supabase OK');
  console.log('');

  await resetCompleto();
}

// Ejecutar
main().catch(error => {
  console.error('💥 Error fatal:', error.message);
  process.exit(1);
});