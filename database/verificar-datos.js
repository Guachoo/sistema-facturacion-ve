#!/usr/bin/env node

/**
 * VERIFICADOR DE DATOS - SISTEMA FACTURACIÓN
 *
 * Este script muestra exactamente qué datos existen en Supabase
 * y proporciona instrucciones precisas para limpiar el sistema.
 */

const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

console.log('🔍 VERIFICADOR DE DATOS - SISTEMA FACTURACIÓN');
console.log('=============================================');
console.log(`🏠 Supabase URL: ${SUPABASE_URL}`);
console.log('');

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

/**
 * Función para contar registros exactos
 */
async function countExactRecords(table) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers
    });

    if (!response.ok) {
      return { count: 0, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { count: Array.isArray(data) ? data.length : 0, data: data.slice(0, 3) };
  } catch (error) {
    return { count: 0, error: error.message };
  }
}

/**
 * Función principal
 */
async function verificarDatos() {
  console.log('🔌 Verificando conexión a Supabase...');

  const testResult = await countExactRecords('users');
  if (testResult.error && !testResult.error.includes('HTTP 4')) {
    console.log('❌ Error de conexión a Supabase:');
    console.log(`   ${testResult.error}`);
    return;
  }

  console.log('✅ Conexión a Supabase OK');
  console.log('');

  const tablas = [
    { name: 'invoices', label: 'Facturas', operacional: true },
    { name: 'quotations', label: 'Cotizaciones', operacional: true },
    { name: 'customers', label: 'Clientes', operacional: true },
    { name: 'items', label: 'Productos/Servicios', operacional: true },
    { name: 'quotation_items', label: 'Items de Cotización', operacional: true },
    { name: 'inventory_movements', label: 'Movimientos Inventario', operacional: true },
    { name: 'fiscal_documents', label: 'Documentos Fiscales', operacional: true },
    { name: 'fiscal_backups', label: 'Respaldos Fiscales', operacional: true },
    { name: 'fiscal_audit_log', label: 'Log Auditoría', operacional: true },
    { name: 'fiscal_traceability', label: 'Trazabilidad', operacional: true },
    { name: 'users', label: 'Usuarios', operacional: false },
    { name: 'user_permissions', label: 'Permisos', operacional: false }
  ];

  console.log('📊 ESTADO ACTUAL DEL SISTEMA:');
  console.log('=============================');

  let totalOperacional = 0;
  let totalConfig = 0;
  let tablasConDatos = [];

  for (const tabla of tablas) {
    const result = await countExactRecords(tabla.name);

    if (result.error) {
      console.log(`❌ ${tabla.label.padEnd(25)}: Error - ${result.error}`);
    } else {
      const icon = result.count > 0 ? (tabla.operacional ? '🔴' : '🟢') : '⚪';
      console.log(`${icon} ${tabla.label.padEnd(25)}: ${result.count} registros`);

      if (tabla.operacional) {
        totalOperacional += result.count;
      } else {
        totalConfig += result.count;
      }

      if (result.count > 0) {
        tablasConDatos.push({
          ...tabla,
          count: result.count,
          samples: result.data || []
        });
      }
    }
  }

  console.log('');
  console.log('📈 RESUMEN:');
  console.log(`🔴 Datos operacionales: ${totalOperacional} registros`);
  console.log(`🟢 Configuración: ${totalConfig} registros`);
  console.log('');

  if (totalOperacional === 0) {
    console.log('🎉 ¡SISTEMA LIMPIO!');
    console.log('✅ No hay datos operacionales que eliminar');
    console.log('✅ El sistema está listo para nuevas pruebas');
    return;
  }

  console.log('🚨 DATOS ENCONTRADOS QUE NECESITAN LIMPIEZA:');
  console.log('============================================');

  for (const tabla of tablasConDatos) {
    if (tabla.operacional) {
      console.log(`\n📋 ${tabla.label} (${tabla.count} registros):`);

      if (tabla.samples.length > 0) {
        tabla.samples.forEach((sample, index) => {
          const identificador = sample.rif || sample.numero || sample.name || sample.id;
          console.log(`   ${index + 1}. ${identificador}`);
        });

        if (tabla.count > 3) {
          console.log(`   ... y ${tabla.count - 3} más`);
        }
      }
    }
  }

  console.log('');
  console.log('🛠️ CÓMO LIMPIAR EL SISTEMA:');
  console.log('==========================');
  console.log('');
  console.log('🎯 OPCIÓN 1 - Dashboard Supabase (RECOMENDADO):');
  console.log('1. Ir a: https://app.supabase.com/project/supfddcbyfuzvxsrzwio');
  console.log('2. Table Editor > Seleccionar cada tabla');
  console.log('3. Seleccionar todos los registros');
  console.log('4. Click en "Delete" para cada tabla');
  console.log('');
  console.log('📋 Orden recomendado de eliminación:');

  const ordenEliminacion = [
    'quotation_items', 'inventory_movements', 'fiscal_audit_log',
    'fiscal_traceability', 'fiscal_backups', 'fiscal_documents',
    'invoices', 'quotations', 'items', 'customers'
  ];

  ordenEliminacion.forEach((tabla, index) => {
    const tablaInfo = tablasConDatos.find(t => t.name === tabla);
    if (tablaInfo) {
      console.log(`   ${index + 1}. ${tablaInfo.label} (${tablaInfo.count} registros)`);
    }
  });

  console.log('');
  console.log('🎯 OPCIÓN 2 - SQL Directo:');
  console.log('(Si tienes acceso al SQL Editor en Supabase)');
  console.log('');
  ordenEliminacion.forEach(tabla => {
    const tablaInfo = tablasConDatos.find(t => t.name === tabla);
    if (tablaInfo) {
      console.log(`DELETE FROM ${tabla}; -- ${tablaInfo.count} registros`);
    }
  });

  console.log('');
  console.log('💡 NOTA IMPORTANTE:');
  console.log('Las tablas tienen Row Level Security (RLS) activo,');
  console.log('por eso los scripts automáticos no pueden eliminar datos.');
  console.log('El dashboard de Supabase tiene permisos completos.');
}

// Ejecutar
verificarDatos().catch(error => {
  console.error('💥 Error:', error.message);
  process.exit(1);
});