// Configuración de la empresa emisora de facturas
// Este archivo contiene los datos que aparecerán en las facturas

export const COMPANY_CONFIG = {
  razonSocial: 'GRU CORPORACIÓN NAUTICA DE SERVICIOS, C.A.',
  rif: 'J-50725064-4',
  domicilioFiscal: 'AV LA ESTANCIA CON CALLE ERNESTO BLOHM CC CIUDAD TAMANACO. PIRAMIDE INVERTIDA NIVEL 6 OF 610 URB CHUAO CARACAS (CHACAO) MIRANDA ZONA POSTAL 1060',
  telefonos: '+58-212-1234567 / +58-414-9876543',
  email: 'grunautica@gmail.com',
  condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
} as const;

export type CompanyConfig = typeof COMPANY_CONFIG;
