/**
 * Hook para manejar el servicio de email
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emailService, type EmailTemplateKey } from '@/services/email-service';
import type { Invoice, Customer } from '@/types';
import { toast } from 'sonner';

// Hook para enviar factura por email
export const useSendInvoiceEmail = () => {
  return useMutation({
    mutationFn: async ({ invoice, customer }: { invoice: Invoice; customer: Customer }) => {
      return await emailService.sendInvoiceEmail(invoice, customer);
    },
    onSuccess: (success, { invoice }) => {
      if (success) {
        toast.success(`📧 Factura ${invoice.numero} enviada por email exitosamente`);
      } else {
        toast.error('Error al enviar la factura por email');
      }
    },
    onError: (error) => {
      console.error('Error sending invoice email:', error);
      toast.error('Error al enviar la factura por email');
    }
  });
};

// Hook para notificaciones de cambio de estado
export const useSendStatusChangeNotification = () => {
  return useMutation({
    mutationFn: async ({
      invoice,
      customer,
      oldStatus,
      newStatus,
      reason
    }: {
      invoice: Invoice;
      customer: Customer;
      oldStatus: string;
      newStatus: string;
      reason?: string;
    }) => {
      return await emailService.sendStatusChangeNotification(
        invoice,
        customer,
        oldStatus,
        newStatus,
        reason
      );
    },
    onSuccess: (success, { invoice, newStatus }) => {
      if (success) {
        toast.success(`📧 Notificación de cambio a "${newStatus}" enviada para factura ${invoice.numero}`);
      } else {
        toast.error('Error al enviar notificación de cambio de estado');
      }
    },
    onError: (error) => {
      console.error('Error sending status change notification:', error);
      toast.error('Error al enviar notificación de cambio de estado');
    }
  });
};

// Hook para probar conexión de email
export const useTestEmailConnection = () => {
  return useMutation({
    mutationFn: async () => {
      return await emailService.testEmailConnection();
    },
    onSuccess: (success) => {
      if (success) {
        toast.success('✅ Conexión de email configurada correctamente');
      } else {
        toast.error('❌ Error en la configuración de email');
      }
    },
    onError: (error) => {
      console.error('Error testing email connection:', error);
      toast.error('❌ Error al probar la conexión de email');
    }
  });
};

// Hook personalizado para envío automático de facturas
export const useAutoSendInvoice = () => {
  const sendEmailMutation = useSendInvoiceEmail();

  return useMutation({
    mutationFn: async ({
      invoice,
      customer,
      autoSend = false
    }: {
      invoice: Invoice;
      customer: Customer;
      autoSend?: boolean
    }) => {
      // Lógica de envío automático basada en configuración
      if (autoSend) {
        // Verificar configuración de envío automático
        const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
        const autoSendEnabled = settings.notificaciones?.email?.envioAutomatico || false;

        if (autoSendEnabled) {
          return await sendEmailMutation.mutateAsync({ invoice, customer });
        }
      }
      return true;
    },
    onSuccess: () => {
      // Ya manejado por sendEmailMutation
    },
    onError: (error) => {
      console.error('Error in auto send invoice:', error);
    }
  });
};

// Hook para obtener estado de las notificaciones
export const useNotificationStatus = () => {
  const queryClient = useQueryClient();

  const getEmailSettings = () => {
    try {
      const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
      return settings.notificaciones?.email || {};
    } catch {
      return {};
    }
  };

  const updateEmailSettings = (newSettings: any) => {
    try {
      const settings = JSON.parse(localStorage.getItem('systemSettings') || '{}');
      if (!settings.notificaciones) settings.notificaciones = {};
      settings.notificaciones.email = { ...settings.notificaciones.email, ...newSettings };

      localStorage.setItem('systemSettings', JSON.stringify(settings));
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });

      toast.success('Configuración de email actualizada');
    } catch (error) {
      console.error('Error updating email settings:', error);
      toast.error('Error al actualizar configuración de email');
    }
  };

  return {
    emailSettings: getEmailSettings(),
    updateEmailSettings
  };
};