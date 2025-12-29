#!/usr/bin/env node

/**
 * CREADOR DE PRODUCTOS Y SERVICIOS - SISTEMA FACTURACIÓN
 *
 * Agrega productos y servicios típicos venezolanos para facturación
 */

const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

console.log('🛍️ CREADOR DE PRODUCTOS Y SERVICIOS');
console.log('===================================');
console.log(`🏠 Supabase URL: ${SUPABASE_URL}`);
console.log('');

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

/**
 * Productos y servicios venezolanos típicos
 * Estructura según el schema real: codigo, descripcion, tipo, precioBase, precioUsd, ivaAplica, categoria, activo
 */
const productosServicios = [
  // PRODUCTOS TECNOLÓGICOS
  {
    codigo: 'PROD-001',
    descripcion: 'Laptop HP Pavilion 15" Intel Core i5, 8GB RAM, 256GB SSD',
    tipo: 'producto',
    precio_base: 11250000.00, // 450 USD * 25000 VES
    precio_usd: 450.00,
    iva_aplica: true,
    categoria: 'Tecnología',
    activo: true
  },
  {
    codigo: 'PROD-002',
    descripcion: 'Mouse inalámbrico Logitech M220, conexión USB',
    tipo: 'producto',
    precio_base: 625000.00, // 25 USD * 25000 VES
    precio_usd: 25.00,
    iva_aplica: true,
    categoria: 'Tecnología',
    activo: true
  },
  {
    codigo: 'PROD-003',
    descripcion: 'Teclado mecánico gaming con iluminación RGB',
    tipo: 'producto',
    precio_base: 1875000.00, // 75 USD * 25000 VES
    precio_usd: 75.00,
    iva_aplica: true,
    categoria: 'Tecnología',
    activo: true
  },

  // SERVICIOS PROFESIONALES
  {
    codigo: 'SERV-001',
    descripcion: 'Desarrollo de sitio web personalizado con responsive design',
    tipo: 'servicio',
    precio_base: 20000000.00, // 800 USD * 25000 VES
    precio_usd: 800.00,
    iva_aplica: true,
    categoria: 'Servicios Digitales',
    activo: true
  },
  {
    codigo: 'SERV-002',
    descripcion: 'Consultoría técnica en sistemas y desarrollo de software',
    tipo: 'servicio',
    precio_base: 1250000.00, // 50 USD * 25000 VES
    precio_usd: 50.00,
    iva_aplica: true,
    categoria: 'Consultoría',
    activo: true
  },
  {
    codigo: 'SERV-003',
    descripcion: 'Soporte técnico remoto para sistemas y aplicaciones',
    tipo: 'servicio',
    precio_base: 750000.00, // 30 USD * 25000 VES
    precio_usd: 30.00,
    iva_aplica: true,
    categoria: 'Soporte',
    activo: true
  },

  // PRODUCTOS DE OFICINA
  {
    codigo: 'PROD-004',
    descripcion: 'Resma de papel bond blanco A4, 500 hojas',
    tipo: 'producto',
    precio_base: 300000.00, // 12 USD * 25000 VES
    precio_usd: 12.00,
    iva_aplica: true,
    categoria: 'Papelería',
    activo: true
  },
  {
    codigo: 'PROD-005',
    descripcion: 'Carpeta archivador tamaño oficio con palanca',
    tipo: 'producto',
    precio_base: 212500.00, // 8.5 USD * 25000 VES
    precio_usd: 8.50,
    iva_aplica: true,
    categoria: 'Papelería',
    activo: true
  },

  // SERVICIOS DE CAPACITACIÓN
  {
    codigo: 'SERV-004',
    descripcion: 'Curso de Excel avanzado con macros y análisis de datos',
    tipo: 'servicio',
    precio_base: 3000000.00, // 120 USD * 25000 VES
    precio_usd: 120.00,
    iva_aplica: true,
    categoria: 'Capacitación',
    activo: true
  },
  {
    codigo: 'SERV-005',
    descripcion: 'Taller intensivo de desarrollo web con HTML, CSS y JavaScript',
    tipo: 'servicio',
    precio_base: 5000000.00, // 200 USD * 25000 VES
    precio_usd: 200.00,
    iva_aplica: true,
    categoria: 'Capacitación',
    activo: true
  },

  // PRODUCTOS LOCALES (solo en bolívares)
  {
    codigo: 'PROD-006',
    descripcion: 'Café tostado venezolano de la región andina, 500g',
    tipo: 'producto',
    precio_base: 350000.00,
    iva_aplica: true,
    categoria: 'Alimentación',
    activo: true
  },
  {
    codigo: 'PROD-007',
    descripcion: 'Aceite lubricante para motor 20W-50, 4 litros',
    tipo: 'producto',
    precio_base: 280000.00,
    iva_aplica: true,
    categoria: 'Automotriz',
    activo: true
  }
];

/**
 * Función para crear un producto
 */
async function crearProducto(producto) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(producto)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      const error = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${error}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Función principal
 */
async function crearProductosServicios() {
  console.log('🔌 Verificando conexión a Supabase...');

  // Test de conexión
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/items?limit=1`, { headers });
    if (!testResponse.ok) {
      console.log('❌ Error de conexión a Supabase');
      return;
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return;
  }

  console.log('✅ Conexión a Supabase OK');
  console.log('');

  console.log('📦 CREANDO PRODUCTOS Y SERVICIOS...');
  console.log('===================================');

  let creados = 0;
  let errores = 0;

  for (const producto of productosServicios) {
    console.log(`📝 Creando: ${producto.codigo} - ${producto.descripcion.substring(0, 50)}...`);

    const resultado = await crearProducto(producto);

    if (resultado.success) {
      const precio = producto.precio_usd ? `$${producto.precio_usd} USD` : `${producto.precio_base.toLocaleString()} VES`;
      console.log(`   ✅ ${producto.tipo === 'producto' ? 'Producto' : 'Servicio'} creado - ${precio}`);
      creados++;
    } else {
      console.log(`   ❌ Error: ${resultado.error}`);
      errores++;
    }

    // Pausa pequeña para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('📊 RESUMEN:');
  console.log(`✅ Creados exitosamente: ${creados}`);
  console.log(`❌ Errores: ${errores}`);
  console.log('');

  if (creados > 0) {
    console.log('🎉 ¡PRODUCTOS Y SERVICIOS CREADOS!');
    console.log('');
    console.log('📋 CATEGORÍAS CREADAS:');
    console.log('  • Tecnología (laptops, mouse, teclados)');
    console.log('  • Servicios Digitales (desarrollo web)');
    console.log('  • Consultoría (soporte técnico)');
    console.log('  • Papelería (papel, carpetas)');
    console.log('  • Capacitación (cursos y talleres)');
    console.log('  • Alimentación (café venezolano)');
    console.log('  • Automotriz (aceites y lubricantes)');
    console.log('');
    console.log('💰 MONEDAS INCLUIDAS:');
    console.log('  • USD (productos tecnológicos y servicios)');
    console.log('  • VES (productos locales)');
    console.log('');
    console.log('🧾 Ahora puedes crear facturas con estos productos!');
  }
}

// Ejecutar
crearProductosServicios().catch(error => {
  console.error('💥 Error:', error.message);
  process.exit(1);
});