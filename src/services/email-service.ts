/**
 * Servicio de Email Automatizado
 * Maneja el envío de PDF y notificaciones por email
 */

import { generateInvoicePDF } from '@/lib/pdf-generator';
import type { Invoice, Customer } from '@/types';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailAttachment {
  filename: string;
  content: Blob | Buffer;
  contentType: string;
}

export interface EmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: EmailTemplate;
  attachments?: EmailAttachment[];
  variables?: Record<string, any>;
}

// Configuración de plantillas de email
export const EMAIL_TEMPLATES = {
  INVOICE_SENT: {
    subject: 'Factura #{numeroFactura} - {empresaNombre}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Factura #{numeroFactura}</h2>
        <p>Estimado/a {clienteNombre},</p>
        <p>Adjuntamos su factura correspondiente a nuestros servicios.</p>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Detalles de la Factura:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Número:</strong> {numeroFactura}</li>
            <li><strong>Fecha:</strong> {fechaFactura}</li>
            <li><strong>Total:</strong> {totalFactura}</li>
            <li><strong>Estado:</strong> {estadoFactura}</li>
          </ul>
        </div>

        <p>Si tiene alguna consulta, no dude en contactarnos.</p>
        <p>Saludos cordiales,<br>{empresaNombre}</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          Este es un email automático. Por favor, no responda a este mensaje.
        </p>
      </div>
    `,
    text: `
      Factura #{numeroFactura}

      Estimado/a {clienteNombre},

      Adjuntamos su factura correspondiente a nuestros servicios.

      Detalles:
      - Número: {numeroFactura}
      - Fecha: {fechaFactura}
      - Total: {totalFactura}
      - Estado: {estadoFactura}

      Saludos cordiales,
      {empresaNombre}
    `
  },

  INVOICE_STATUS_CHANGE: {
    subject: 'Cambio de Estado - Factura #{numeroFactura}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Actualización de Estado</h2>
        <p>Estimado/a {clienteNombre},</p>
        <p>Le informamos que el estado de su factura ha cambiado:</p>

        <div style="background-color: {colorEstado}; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin: 0;">Factura #{numeroFactura}</h3>
          <p style="margin: 5px 0; font-size: 18px;"><strong>{estadoNuevo}</strong></p>
        </div>

        <p><strong>Motivo:</strong> {motivoCambio}</p>
        <p><strong>Fecha del cambio:</strong> {fechaCambio}</p>

        <p>Saludos cordiales,<br>{empresaNombre}</p>
      </div>
    `,
    text: `
      Actualización de Estado - Factura #{numeroFactura}

      Estimado/a {clienteNombre},

      El estado de su factura ha cambiado a: {estadoNuevo}

      Motivo: {motivoCambio}
      Fecha: {fechaCambio}

      {empresaNombre}
    `
  },

  CREDIT_NOTE: {
    subject: 'Nota de Crédito #{numeroNota} - {empresaNombre}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Nota de Crédito #{numeroNota}</h2>
        <p>Estimado/a {clienteNombre},</p>
        <p>Adjuntamos su nota de crédito generada.</p>

        <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <h3>Detalles de la Nota de Crédito:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Número:</strong> {numeroNota}</li>
            <li><strong>Factura Original:</strong> {facturaOriginal}</li>
            <li><strong>Fecha:</strong> {fechaNota}</li>
            <li><strong>Monto:</strong> {montoCredito}</li>
            <li><strong>Motivo:</strong> {motivoCredito}</li>
          </ul>
        </div>

        <p>Este crédito será aplicado automáticamente a su cuenta.</p>
        <p>Saludos cordiales,<br>{empresaNombre}</p>
      </div>
    `,
    text: `
      Nota de Crédito #{numeroNota}

      Estimado/a {clienteNombre},

      Detalles de su nota de crédito:
      - Número: {numeroNota}
      - Factura Original: {facturaOriginal}
      - Fecha: {fechaNota}
      - Monto: {montoCredito}
      - Motivo: {motivoCredito}

      {empresaNombre}
    `
  },

  PAYMENT_REMINDER: {
    subject: 'Recordatorio de Pago - Factura #{numeroFactura}',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Recordatorio de Pago</h2>
        <p>Estimado/a {clienteNombre},</p>
        <p>Le recordamos que tiene una factura pendiente de pago:</p>

        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3>Factura Pendiente:</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Número:</strong> {numeroFactura}</li>
            <li><strong>Fecha Emisión:</strong> {fechaFactura}</li>
            <li><strong>Fecha Vencimiento:</strong> {fechaVencimiento}</li>
            <li><strong>Monto Pendiente:</strong> {montoPendiente}</li>
            <li><strong>Días Vencido:</strong> {diasVencido}</li>
          </ul>
        </div>

        <p>Por favor, proceda con el pago a la brevedad posible.</p>
        <p>Si ya realizó el pago, ignore este mensaje.</p>

        <p>Saludos cordiales,<br>{empresaNombre}</p>
      </div>
    `,
    text: `
      Recordatorio de Pago - Factura #{numeroFactura}

      Estimado/a {clienteNombre},

      Factura pendiente:
      - Número: {numeroFactura}
      - Vencimiento: {fechaVencimiento}
      - Monto: {montoPendiente}
      - Días vencido: {diasVencido}

      Por favor, proceda con el pago.

      {empresaNombre}
    `
  }
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;

export class EmailService {
  private static instance: EmailService;
  private smtpConfig: any = null;

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private constructor() {
    this.loadSMTPConfig();
  }

  private async loadSMTPConfig() {
    // Cargar configuración SMTP desde settings
    try {
      const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
      this.smtpConfig = settings.notificaciones?.email || null;
    } catch (error) {
      console.error('Error loading SMTP config:', error);
    }
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      result = result.replace(regex, String(value || ''));
    }
    return result;
  }

  private async generateEmailTemplate(
    templateKey: EmailTemplateKey,
    variables: Record<string, any>
  ): Promise<EmailTemplate> {
    const template = EMAIL_TEMPLATES[templateKey];

    return {
      subject: this.replaceVariables(template.subject, variables),
      html: this.replaceVariables(template.html, variables),
      text: this.replaceVariables(template.text, variables)
    };
  }

  async sendInvoiceEmail(invoice: Invoice, customer: Customer): Promise<boolean> {
    try {
      // Generar PDF de la factura
      const pdfBlob = await generateInvoicePDF(invoice);

      // Preparar variables para la plantilla
      const variables = {
        numeroFactura: invoice.numero,
        clienteNombre: customer.nombre || customer.razonSocial,
        fechaFactura: new Date(invoice.fecha).toLocaleDateString('es-VE'),
        totalFactura: new Intl.NumberFormat('es-VE', {
          style: 'currency',
          currency: 'VES'
        }).format(invoice.total),
        estadoFactura: invoice.estado,
        empresaNombre: 'Su Empresa' // Obtener de configuración
      };

      // Generar plantilla de email
      const emailTemplate = await this.generateEmailTemplate('INVOICE_SENT', variables);

      // Configurar attachment del PDF
      const attachment: EmailAttachment = {
        filename: `factura-${invoice.numero}.pdf`,
        content: pdfBlob,
        contentType: 'application/pdf'
      };

      // Enviar email
      const emailOptions: EmailOptions = {
        to: [customer.email],
        subject: emailTemplate.subject,
        template: emailTemplate,
        attachments: [attachment],
        variables
      };

      return await this.sendEmail(emailOptions);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      return false;
    }
  }

  async sendStatusChangeNotification(
    invoice: Invoice,
    customer: Customer,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const variables = {
        numeroFactura: invoice.numero,
        clienteNombre: customer.nombre || customer.razonSocial,
        estadoNuevo: newStatus,
        estadoAnterior: oldStatus,
        motivoCambio: reason || 'Sin motivo especificado',
        fechaCambio: new Date().toLocaleDateString('es-VE'),
        colorEstado: this.getStatusColor(newStatus),
        empresaNombre: 'Su Empresa'
      };

      const emailTemplate = await this.generateEmailTemplate('INVOICE_STATUS_CHANGE', variables);

      const emailOptions: EmailOptions = {
        to: [customer.email],
        subject: emailTemplate.subject,
        template: emailTemplate,
        variables
      };

      return await this.sendEmail(emailOptions);
    } catch (error) {
      console.error('Error sending status change notification:', error);
      return false;
    }
  }

  private getStatusColor(status: string): string {
    const colors = {
      'emitida': '#059669',
      'pagada': '#059669',
      'anulada': '#dc2626',
      'vencida': '#f59e0b',
      'nota_credito': '#3b82f6',
      'nota_debito': '#8b5cf6'
    };
    return colors[status as keyof typeof colors] || '#6b7280';
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Simulación del envío de email
      // En un entorno real, aquí integrarías con un servicio como SendGrid, AWS SES, etc.

      console.log('📧 Sending email:', {
        to: options.to,
        subject: options.subject,
        attachments: options.attachments?.length || 0,
        timestamp: new Date().toISOString()
      });

      // Simular delay de envío
      await new Promise(resolve => setTimeout(resolve, 1000));

      // En producción, retornar el resultado real del servicio de email
      return true;
    } catch (error) {
      console.error('Error in email service:', error);
      return false;
    }
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      // Enviar email de prueba
      const testOptions: EmailOptions = {
        to: ['test@example.com'],
        subject: 'Prueba de Conexión - Sistema de Facturación',
        template: {
          subject: 'Prueba de Conexión',
          html: '<h2>Conexión exitosa</h2><p>El servicio de email está funcionando correctamente.</p>',
          text: 'Conexión exitosa. El servicio de email está funcionando correctamente.'
        }
      };

      return await this.sendEmail(testOptions);
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();