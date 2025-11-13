// Sistema de facturas mock para desarrollo sin Supabase
import type { Invoice } from '@/types';

// Cache dinámico para facturas mock
let RUNTIME_MOCK_INVOICES: Invoice[] = [];
let MOCK_INVOICES_INITIALIZED = false;

// Datos mock de facturas con productos y precios reales
const BASE_MOCK_INVOICES: Invoice[] = [
  {
    id: '28',
    numero: 'FAC-000028',
    transaction_id: 'DIG-2025000028',
    numeroControl: 'DIG-2025000028',
    fecha: '2025-11-13',
    emisor: {
      nombre: 'Mi Empresa C.A.',
      rif: 'J-12345678-9',
      domicilio: 'Av. Principal, Centro Comercial Plaza, Piso 5, Local 12, Caracas, Venezuela',
      correo: 'facturacion@miempresa.com.ve',
      telefono: '0212-555-0000'
    },
    receptor: {
      id: 'cliente-002',
      rif: 'V-27853152-6',
      razonSocial: 'MOISES SERVICE',
      domicilio: 'Av. Bolivar Norte, Residencias El Parque, Apto 8-B, Valencia, Carabobo',
      correo: 'moises@service.com.ve',
      telefono: '+58-241-123-4567',
      tipoContribuyente: 'PERSONA_NATURAL'
    },
    vendedor: {
      codigo: '001',
      nombre: 'Maria Rodriguez',
      cajero: '1'
    },
    lineas: [
      {
        id: '1',
        codigo: 'SERV-002',
        descripcion: 'Desarrollo Web',
        cantidad: 1,
        precioUnitario: 33657.00,
        baseImponible: 33657.00,
        montoIva: 5385.12,
        descuento: 0
      },
      {
        id: '2',
        codigo: 'SERV-003',
        descripcion: 'Soporte Técnico',
        cantidad: 10,
        precioUnitario: 5609.50,
        baseImponible: 56095.00,
        montoIva: 8975.20,
        descuento: 0
      }
    ],
    pagos: [
      {
        tipoPago: 'TRANSFERENCIA',
        monto: 104112.32
      }
    ],
    subtotal: 89752.00,
    baseImponible: 89752.00,
    montoIva: 14360.32,
    montoIgtf: 0,
    total: 104112.32,
    totalUsdReferencia: 464.00,
    tasaBcv: 224.38,
    fechaTasaBcv: '2025-11-13',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'EMITIDA',
    informacionAdicional: {
      adicional1: 'De conformidad con el Art. 10 de la ley del IVA y Art. 4 de su reglamento. Nuestras facturas son emitidas por orden y cuenta de terceros.',
      adicional2: 'De conformidad con el Art. 128 de la Ley del BCV, los pagos estipulados en moneda extranjera se cancelan, salvo convención especial, con la entrega de lo equivalente en moneda de curso legal, al tipo de cambio corriente en el lugar de la fecha de pago.',
      adicional3: 'De conformidad con la Gaceta Oficial N° 42339 de fecha 17/03/2022 se aplica el cobro de IGTF.',
      adicional4: 'Documento emitido conforme a la normativa fiscal venezolana vigente.'
    },
    numeroDocumento: 'D-22975',
    horaEmision: '04:52:00 pm'
  },
  {
    id: '27',
    numero: 'NC-000374',
    transaction_id: 'DIG-2025000374',
    numeroControl: '00-00000337',
    numeroDocumento: 'D-374',
    fecha: '2025-02-22',
    horaEmision: '09:06:00 am',
    emisor: {
      nombre: 'EMPRESA DE PRUEBA C.A',
      rif: 'J-236897223',
      domicilio: 'CARACAS DISTRITO FEDERAL',
      correo: 'hezeuneippeula-8517@yopmail.com',
      telefono: '+584123668872, +582126589722'
    },
    receptor: {
      id: 'cliente-001',
      rif: 'V-123456789',
      razonSocial: 'Gerardo',
      domicilio: 'alguna parte de ccs',
      tipoContribuyente: 'PERSONA_NATURAL'
    },
    lineas: [
      {
        id: '1',
        codigo: '00001',
        descripcion: 'Producto 1',
        cantidad: 10.00,
        precioUnitario: 5.00,
        baseImponible: 50.00,
        montoIva: 8.00,
        descuento: 0
      },
      {
        id: '2',
        codigo: '00002',
        descripcion: 'Producto 2',
        cantidad: 10,
        precioUnitario: 5.00,
        baseImponible: 50.00,
        montoIva: 8.00,
        descuento: 0
      },
      {
        id: '3',
        codigo: '00003',
        descripcion: 'Producto 3',
        cantidad: 2,
        precioUnitario: 25.00,
        baseImponible: 50.00,
        montoIva: 8.00,
        descuento: 0
      },
      {
        id: '4',
        codigo: '00004',
        descripcion: 'Producto 4',
        cantidad: 1,
        precioUnitario: 50.00,
        baseImponible: 50.00,
        montoIva: 8.00,
        descuento: 0
      },
      {
        id: '5',
        codigo: '00005',
        descripcion: 'Producto 5',
        cantidad: 1,
        precioUnitario: 50.00,
        baseImponible: 50.00,
        montoIva: 10.81,
        descuento: 0
      }
    ],
    pagos: [
      {
        tipoPago: 'EFECTIVO',
        monto: 25.00
      }
    ],
    // Campos específicos de Nota de Crédito
    facturaAfectadaNumero: 'D-2',
    facturaAfectadaFecha: '2022-12-05',
    facturaAfectadaMonto: 300.81,
    motivoNota: 'Comentario para la factura',
    tipoNota: 'credito',

    // Cálculos fiscales con IGTF
    subtotal: 250.00,
    baseImponible: 250.00,
    montoIva: 42.81, // Total de los IVAs sumados con ajuste
    baseImponibleIgtf: 292.05, // Base para calcular IGTF
    montoIgtf: 8.76, // 3% sobre base imponible IGTF
    total: 300.81, // Total final incluyendo IGTF
    totalUsdReferencia: 300.81,
    tasaBcv: 12.56, // Según ejemplo del documento
    fechaTasaBcv: '2025-02-22',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'NOTA_CREDITO',
    informacionAdicional: {
      adicional1: 'string string'
    }
  },
  {
    id: '27b',
    numero: 'ND-000028',
    transaction_id: 'DIG-2025000028B',
    numeroControl: '00-00000338',
    numeroDocumento: 'D-28B',
    fecha: '2025-11-13',
    horaEmision: '02:30:00 pm',
    emisor: {
      nombre: 'Mi Empresa C.A.',
      rif: 'J-12345678-9',
      domicilio: 'Av. Principal, Centro Comercial Plaza, Piso 5, Local 12, Caracas, Venezuela',
      correo: 'facturacion@miempresa.com.ve',
      telefono: '0212-555-0000'
    },
    receptor: {
      id: 'cliente-002',
      rif: 'V-27853152-6',
      razonSocial: 'MOISES SERVICE',
      domicilio: 'Av. Bolivar Norte, Residencias El Parque, Apto 8-B, Valencia, Carabobo',
      correo: 'moises@service.com.ve',
      telefono: '+58-241-123-4567',
      tipoContribuyente: 'PERSONA_NATURAL'
    },
    lineas: [
      {
        id: '1',
        codigo: 'INT001',
        descripcion: 'Intereses por Mora',
        cantidad: 1,
        precioUnitario: 50.00,
        baseImponible: 50.00,
        montoIva: 8.00,
        descuento: 0
      },
      {
        id: '2',
        codigo: 'REC001',
        descripcion: 'Recargo Administrativo',
        cantidad: 1,
        precioUnitario: 25.00,
        baseImponible: 25.00,
        montoIva: 4.00,
        descuento: 0
      }
    ],
    pagos: [
      {
        tipoPago: 'TRANSFERENCIA',
        monto: 87.00
      }
    ],
    // Campos específicos de Nota de Débito
    facturaAfectadaNumero: 'FAC-000026',
    facturaAfectadaFecha: '2025-11-04',
    facturaAfectadaMonto: 837.40,
    motivoNota: 'Intereses y recargos por mora en el pago',
    tipoNota: 'debito',

    // Cálculos fiscales
    subtotal: 75.00,
    baseImponible: 75.00,
    montoIva: 12.00,
    montoIgtf: 0,
    total: 87.00,
    totalUsdReferencia: 87.00,
    tasaBcv: 224.38,
    fechaTasaBcv: '2025-11-13',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'NOTA_DEBITO'
  },
  {
    id: '26',
    numero: 'FAC-000026',
    transaction_id: 'DIG-2025000026',
    numeroControl: 'DIG-2025000026',
    fecha: '2025-11-04',
    emisor: {
      nombre: 'Mi Empresa C.A.',
      rif: 'J-12345678-9',
      domicilio: 'Caracas, Venezuela'
    },
    receptor: {
      id: 'cliente-002',
      rif: 'V-27853152-6',
      razonSocial: 'MOISES SERVICE',
      domicilio: 'Maracay, Venezuela',
      tipoContribuyente: 'PERSONA_NATURAL'
    },
    lineas: [
      {
        id: '1',
        codigo: 'DEV002',
        descripcion: 'Desarrollo de Aplicación Web',
        cantidad: 1,
        precioUnitario: 750.00,
        baseImponible: 750.00,
        montoIva: 120.00,
        descuento: 50.00
      },
      {
        id: '2',
        codigo: 'DOM001',
        descripcion: 'Dominio .com (1 año)',
        cantidad: 1,
        precioUnitario: 15.00,
        baseImponible: 15.00,
        montoIva: 2.40,
        descuento: 0
      }
    ],
    pagos: [
      {
        tipoPago: 'EFECTIVO',
        monto: 837.40
      }
    ],
    subtotal: 765.00,
    baseImponible: 715.00, // Con descuento aplicado
    montoIva: 122.40,
    montoIgtf: 0,
    total: 837.40,
    totalUsdReferencia: 837.40,
    tasaBcv: 224.38,
    fechaTasaBcv: '2025-11-04',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'EMITIDA'
  },
  {
    id: '25',
    numero: 'FAC-000025',
    transaction_id: 'DIG-2025000025',
    numeroControl: 'DIG-2025000025',
    fecha: '2025-11-04',
    emisor: {
      nombre: 'Mi Empresa C.A.',
      rif: 'J-12345678-9',
      domicilio: 'Caracas, Venezuela'
    },
    receptor: {
      id: 'cliente-003',
      rif: 'J-74567967-7',
      razonSocial: 'David',
      domicilio: 'Barquisimeto, Venezuela',
      tipoContribuyente: 'JURIDICA'
    },
    lineas: [
      {
        id: '1',
        codigo: 'LAP001',
        descripcion: 'Laptop Dell Inspiron 15',
        cantidad: 2,
        precioUnitario: 420.00,
        baseImponible: 840.00,
        montoIva: 134.40,
        descuento: 0
      },
      {
        id: '2',
        codigo: 'MOU001',
        descripcion: 'Mouse Logitech MX Master 3',
        cantidad: 2,
        precioUnitario: 65.00,
        baseImponible: 130.00,
        montoIva: 20.80,
        descuento: 10.00
      }
    ],
    pagos: [
      {
        tipoPago: 'TARJETA_CREDITO',
        monto: 1115.20
      }
    ],
    subtotal: 970.00,
    baseImponible: 960.00, // Con descuentos
    montoIva: 155.20,
    montoIgtf: 0,
    total: 1115.20,
    totalUsdReferencia: 1115.20,
    tasaBcv: 224.38,
    fechaTasaBcv: '2025-11-04',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'EMITIDA'
  },
  {
    id: '24',
    numero: 'FAC-000024',
    transaction_id: 'DIG-2025000024',
    numeroControl: 'DIG-2025000024',
    fecha: '2025-11-03',
    emisor: {
      nombre: 'Mi Empresa C.A.',
      rif: 'J-12345678-9',
      domicilio: 'Caracas, Venezuela'
    },
    receptor: {
      id: 'cliente-004',
      rif: 'J-98765432-1',
      razonSocial: 'Comerciante',
      domicilio: 'Valencia, Venezuela',
      tipoContribuyente: 'JURIDICA'
    },
    lineas: [
      {
        id: '1',
        codigo: 'POS001',
        descripcion: 'Caja Registradora POS',
        cantidad: 1,
        precioUnitario: 285.00,
        baseImponible: 285.00,
        montoIva: 45.60,
        descuento: 0
      },
      {
        id: '2',
        codigo: 'IMP001',
        descripcion: 'Impresora de Tickets',
        cantidad: 1,
        precioUnitario: 95.00,
        baseImponible: 95.00,
        montoIva: 15.20,
        descuento: 0
      }
    ],
    pagos: [
      {
        tipoPago: 'TRANSFERENCIA',
        monto: 440.80
      }
    ],
    subtotal: 380.00,
    baseImponible: 380.00,
    montoIva: 60.80,
    montoIgtf: 0,
    total: 440.80,
    totalUsdReferencia: 440.80,
    tasaBcv: 224.38,
    fechaTasaBcv: '2025-11-03',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'EMITIDA'
  },
  {
    id: '23',
    numero: 'FAC-000023',
    transaction_id: 'DIG-2025000023',
    numeroControl: 'DIG-2025000023',
    fecha: '2025-10-28',
    emisor: {
      nombre: 'Mi Empresa C.A.',
      rif: 'J-12345678-9',
      domicilio: 'Caracas, Venezuela'
    },
    receptor: {
      id: 'cliente-005',
      rif: 'V-32135424-4',
      razonSocial: 'Alejandro',
      domicilio: 'Caracas, Venezuela',
      tipoContribuyente: 'PERSONA_NATURAL'
    },
    lineas: [
      {
        id: '1',
        codigo: 'CUR001',
        descripcion: 'Curso Online de Marketing Digital',
        cantidad: 1,
        precioUnitario: 150.00,
        baseImponible: 150.00,
        montoIva: 24.00,
        descuento: 30.00
      }
    ],
    pagos: [
      {
        tipoPago: 'PAYPAL',
        monto: 144.00
      }
    ],
    subtotal: 150.00,
    baseImponible: 120.00, // Con descuento
    montoIva: 24.00,
    montoIgtf: 0,
    total: 144.00,
    totalUsdReferencia: 144.00,
    tasaBcv: 224.38,
    fechaTasaBcv: '2025-10-28',
    moneda: 'USD',
    canal: 'Digital',
    estado: 'EMITIDA'
  }
];

// Inicializar cache dinámico
const initializeMockInvoices = () => {
  if (!MOCK_INVOICES_INITIALIZED) {
    RUNTIME_MOCK_INVOICES = [...BASE_MOCK_INVOICES];
    MOCK_INVOICES_INITIALIZED = true;
    console.log('🔧 Mock: Cache dinámico inicializado con', RUNTIME_MOCK_INVOICES.length, 'facturas');
  }
};

// Obtener facturas mock (con cache dinámico)
export const getMockInvoices = (): Invoice[] => {
  initializeMockInvoices();
  return [...RUNTIME_MOCK_INVOICES].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
};

// Agregar nueva factura al cache dinámico
export const addMockInvoice = (invoice: Invoice): void => {
  initializeMockInvoices();
  RUNTIME_MOCK_INVOICES = [invoice, ...RUNTIME_MOCK_INVOICES];
  console.log('🔧 Mock: Factura agregada al cache dinámico:', invoice.numero, '- Total:', RUNTIME_MOCK_INVOICES.length);
};

// Resetear cache dinámico (forzar reinicialización)
export const resetMockInvoicesCache = (): void => {
  MOCK_INVOICES_INITIALIZED = false;
  RUNTIME_MOCK_INVOICES = [];
  console.log('🔧 Mock: Cache dinámico reseteado');
};

// Exportar facturas (compatibilidad)
export const MOCK_INVOICES = getMockInvoices();

export const useMockInvoices = () => {
  // Verificar si estamos en modo desarrollo y Supabase no está disponible
  const isDevelopment = import.meta.env.MODE === 'development';
  const supabaseUnavailable = !import.meta.env.VITE_SUPABASE_URL ||
                               import.meta.env.VITE_SUPABASE_URL.includes('supfddcbyfuzvxsrzwio');

  return isDevelopment && supabaseUnavailable;
};