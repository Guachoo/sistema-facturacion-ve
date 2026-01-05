// Core types for the Venezuelan invoice system
export type UserRole = 'administrador' | 'vendedor' | 'promotor' | 'contador';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Customer {
  id?: string;
  rif: string;
  razonSocial: string;
  nombre?: string;
  domicilio: string;
  telefono?: string;
  email?: string;
  tipoContribuyente: 'especial' | 'ordinario' | 'formal';
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id?: string;
  codigo: string;
  descripcion: string;
  tipo: 'producto' | 'servicio';
  moneda: 'VES' | 'USD' | 'EUR'; // Currency type
  precioUsd?: number; // Price in USD (if moneda is USD)
  precioEur?: number; // Price in EUR (if moneda is EUR)
  precioBase: number; // Price in VES (calculated from USD/EUR if foreign currency, or direct if VES)
  ivaAplica: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceLine {
  itemId: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number; // VES
  descuento: number; // percentage 0-100
  baseImponible: number; // calculated
  porcentajeIva: number; // percentage 0-100 (editable, default 16)
  montoIva: number; // calculated
}

export interface Payment {
  tipo: 'transferencia_ves' | 'usd_cash' | 'zelle' | 'mixto';
  monto: number; // VES
  montoUsd?: number; // Reference only
  aplicaIgtf: boolean;
  montoIgtf?: number;
}

export interface Invoice {
  id?: string;
  numero: string;
  numeroControl: string;
  fecha: string;
  emisor: {
    nombre: string;
    rif: string;
    domicilio: string;
  };
  receptor: Customer;
  lineas: InvoiceLine[];
  pagos: Payment[];
  subtotal: number; // VES
  montoIva: number; // VES
  montoIgtf: number; // VES
  total: number; // VES
  totalUsdReferencia: number; // Reference only
  tasaBcv: number;
  fechaTasaBcv: string;
  canal: 'digital' | 'maquina';
  estado: 'emitida' | 'nota_credito' | 'nota_debito';
  facturaAfectadaId?: string;
  facturaAfectadaNumero?: string;
  tipoNota?: 'credito' | 'debito';
  motivoNota?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BcvRate {
  date: string;
  rate: number;
  source: string;
  lastUpdate?: string;
}

export interface ExchangeRates {
  usd: number;
  eur: number;
  date: string;
  lastUpdate: string;
}

export interface SalesBookEntry {
  fecha: string;
  numeroFactura: string;
  cliente: string;
  baseImponible: number;
  montoIva: number;
  exento: number;
  total: number;
  canal: 'digital' | 'maquina';
}

export interface IgtfReport {
  periodo: string;
  formaPago: string;
  montoBase: number;
  montoIgtf: number;
  numeroOperaciones: number;
}

export interface CompanySettings {
  razonSocial: string;
  rif: string;
  domicilioFiscal: string;
  telefonos: string;
  email: string;
  logo?: string;
  condicionesVenta: string;
}

export interface ControlNumberBatch {
  id: string;
  rangeFrom: number;
  rangeTo: number;
  active: boolean;
  used: number;
  remaining: number;
}