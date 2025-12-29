#!/usr/bin/env node

/**
 * CREADOR DE FACTURAS CON PRODUCTOS - SISTEMA FACTURACIÓN
 *
 * Crea facturas de ejemplo utilizando los clientes y productos existentes
 */

const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

console.log('🧾 CREADOR DE FACTURAS CON PRODUCTOS');
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
 * Función para obtener datos de Supabase
 */
async function obtenerDatos(tabla) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, { headers });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Función para crear una factura
 */
async function crearFactura(factura) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(factura)
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
 * Generar número de control único
 */
function generarNumeroControl() {
  const fecha = new Date();
  const año = fecha.getFullYear().toString().slice(-2);
  const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `${año}${mes}${random}`;
}

/**
 * Función principal
 */
async function crearFacturasEjemplo() {
  console.log('🔌 Verificando conexión a Supabase...');

  // Test de conexión
  const testClientes = await obtenerDatos('customers?limit=1');
  if (!testClientes.success) {
    console.log('❌ Error de conexión a Supabase:', testClientes.error);
    return;
  }

  console.log('✅ Conexión a Supabase OK');
  console.log('');

  // Obtener clientes y productos existentes
  console.log('📋 Obteniendo clientes y productos existentes...');

  const clientesResult = await obtenerDatos('customers');
  const productosResult = await obtenerDatos('items');

  if (!clientesResult.success || !productosResult.success) {
    console.log('❌ Error obteniendo datos:', clientesResult.error || productosResult.error);
    return;
  }

  const clientes = clientesResult.data;
  const productos = productosResult.data;

  console.log(`   📊 Clientes disponibles: ${clientes.length}`);
  console.log(`   📦 Productos disponibles: ${productos.length}`);

  if (clientes.length === 0) {
    console.log('❌ No hay clientes disponibles. Crear clientes primero.');
    return;
  }

  if (productos.length === 0) {
    console.log('❌ No hay productos disponibles. Crear productos primero.');
    return;
  }

  console.log('');

  // Definir facturas de ejemplo
  const facturasEjemplo = [
    {
      cliente: clientes[0],
      productos: [
        { producto: productos.find(p => p.codigo === 'PROD-001'), cantidad: 1 }, // Laptop
        { producto: productos.find(p => p.codigo === 'PROD-002'), cantidad: 2 }, // Mouse
      ],
      descripcion: 'Venta de equipos tecnológicos - Laptop y accesorios'
    },
    {
      cliente: clientes[1] || clientes[0],
      productos: [
        { producto: productos.find(p => p.codigo === 'SERV-001'), cantidad: 1 }, // Desarrollo web
      ],
      descripcion: 'Servicio de desarrollo web personalizado'
    },
    {
      cliente: clientes[2] || clientes[0],
      productos: [
        { producto: productos.find(p => p.codigo === 'PROD-004'), cantidad: 5 }, // Resma papel
        { producto: productos.find(p => p.codigo === 'PROD-005'), cantidad: 3 }, // Carpetas
      ],
      descripcion: 'Suministros de oficina - Papelería'
    },
    {
      cliente: clientes[0],
      productos: [
        { producto: productos.find(p => p.codigo === 'SERV-004'), cantidad: 1 }, // Curso Excel
        { producto: productos.find(p => p.codigo === 'SERV-002'), cantidad: 5 }, // Consultoría (5 horas)
      ],
      descripción: 'Servicios de capacitación y consultoría'
    },
    {
      cliente: clientes[1] || clientes[0],
      productos: [
        { producto: productos.find(p => p.codigo === 'PROD-006'), cantidad: 2 }, // Café
        { producto: productos.find(p => p.codigo === 'PROD-007'), cantidad: 1 }, // Aceite
      ],
      descripcion: 'Productos locales venezolanos'
    }
  ];

  console.log('🧾 CREANDO FACTURAS DE EJEMPLO...');
  console.log('=================================');

  let creadas = 0;
  let errores = 0;

  for (let i = 0; i < facturasEjemplo.length; i++) {
    const ejemplo = facturasEjemplo[i];

    // Filtrar productos que existen
    const productosValidos = ejemplo.productos.filter(item => item.producto);

    if (productosValidos.length === 0) {
      console.log(`⚠️  Factura ${i + 1}: Sin productos válidos, saltando...`);
      continue;
    }

    // Calcular totales
    let subtotal = 0;
    const lineas = productosValidos.map(item => {
      const precio = item.producto.precio_base || 0;
      const baseImponible = precio * item.cantidad;
      const montoIva = baseImponible * 0.16;
      subtotal += baseImponible;

      return {
        codigo: item.producto.codigo,
        itemId: item.producto.id,
        cantidad: item.cantidad,
        descripcion: item.producto.descripcion,
        precioUnitario: precio,
        baseImponible: baseImponible,
        montoIva: montoIva,
        descuento: 0
      };
    });

    const monto_iva = subtotal * 0.16;
    const total = subtotal + monto_iva;

    // Crear factura según estructura real
    const nuevaFactura = {
      numero: `FAC-${(creadas + 28).toString().padStart(6, '0')}`,
      numero_control: `DIG-${generarNumeroControl()}`,
      fecha: new Date().toISOString(),

      // Emisor (datos de la empresa)
      emisor_nombre: 'Mi Empresa C.A.',
      emisor_rif: 'J-12345678-9',
      emisor_domicilio: 'Caracas, Venezuela',

      // Cliente/Receptor
      customer_id: ejemplo.cliente.id,
      receptor_rif: ejemplo.cliente.rif,
      receptor_razon_social: ejemplo.cliente.razon_social || ejemplo.cliente.nombre,
      receptor_domicilio: ejemplo.cliente.domicilio || 'No especificado',
      receptor_tipo_contribuyente: ejemplo.cliente.tipo_contribuyente || 'ordinario',

      // Líneas de productos
      lineas: lineas,

      // Forma de pago por defecto
      pagos: [{
        tipo: 'transferencia_ves',
        monto: total,
        aplicaIgtf: false
      }],

      // Totales
      subtotal: subtotal,
      monto_iva: monto_iva,
      monto_igtf: 0,
      total: total,
      total_usd_referencia: total / 25000, // Usando tasa 25000
      tasa_bcv: 25000,
      fecha_tasa_bcv: new Date().toISOString().split('T')[0],

      // Estado
      canal: 'digital',
      estado: 'emitida',
      estado_seniat: 'pendiente'
    };

    console.log(`📝 Creando Factura ${nuevaFactura.numero}:`);
    console.log(`   Cliente: ${ejemplo.cliente.rif} - ${ejemplo.cliente.razon_social || ejemplo.cliente.nombre}`);
    console.log(`   Productos: ${productosValidos.length} items`);
    console.log(`   Total: ${total.toLocaleString()} VES`);

    const resultado = await crearFactura(nuevaFactura);

    if (resultado.success) {
      console.log(`   ✅ Factura creada exitosamente`);
      creadas++;
    } else {
      console.log(`   ❌ Error: ${resultado.error}`);
      errores++;
    }

    console.log('');

    // Pausa pequeña para no sobrecargar la API
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('📊 RESUMEN:');
  console.log(`✅ Facturas creadas: ${creadas}`);
  console.log(`❌ Errores: ${errores}`);
  console.log('');

  if (creadas > 0) {
    console.log('🎉 ¡FACTURAS CREADAS EXITOSAMENTE!');
    console.log('');
    console.log('📋 TIPOS DE FACTURAS CREADAS:');
    console.log('  • Venta de equipos tecnológicos');
    console.log('  • Servicios de desarrollo web');
    console.log('  • Suministros de oficina');
    console.log('  • Capacitación y consultoría');
    console.log('  • Productos locales venezolanos');
    console.log('');
    console.log('💰 INCLUYE:');
    console.log('  • Cálculos de IVA (16%)');
    console.log('  • Múltiples líneas por factura');
    console.log('  • Diferentes tipos de productos/servicios');
    console.log('  • Numeración consecutiva');
    console.log('');
    console.log('🖥️  Revisa las facturas en tu sistema!');
  }
}

// Ejecutar
crearFacturasEjemplo().catch(error => {
  console.error('💥 Error:', error.message);
  process.exit(1);
});