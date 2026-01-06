// Configuración de la empresa emisora de facturas
// Este archivo contiene los datos que aparecerán en las facturas

export const COMPANY_CONFIG = {
  razonSocial: 'GRU CORPORACIÓN NAUTICA DE SERVICIOS, C.A.',
  rif: 'J-507250644',
  domicilioFiscal: 'AV LA ESTANCIA CON CALLE ERNESTO BLOHM CC CIUDAD TAMANACO, PIRAMIDE INVERTIDA NIVEL 6 OF 610 URB CHUAO CARACAS (CHACAO) MIRANDA ZONA POSTAL 1060',
  telefonos: '+58 422 700 0477 / 0212 959 0954',
  email: 'Grunautica@gmail.com',
  condicionesVenta: 'Pago de contado. Precios incluyen IVA. Válido por 30 días.',
} as const;

export type CompanyConfig = typeof COMPANY_CONFIG;
