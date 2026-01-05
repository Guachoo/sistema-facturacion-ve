import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Download, FileText, Calendar as CalendarIcon, FileEdit, FileMinus, Eye, Trash2, FileJson, MoreVertical, CheckCircle } from 'lucide-react';
import { useFacturas, useAnularFactura, useDeleteFactura, useFacturaItems } from '@/api/facturas';
import type { FacturaDB } from '@/api/facturas';
import { formatVES, formatUSD, formatDateVE } from '@/lib/formatters';
import { generateFacturaPDF } from '@/lib/pdf-factura-generator-fixed';
import { descargarFacturaJSON, convertirFacturaAJSON } from '@/lib/factura-json-exporter';
import { generarSolicitudDescargaTFHKA } from '@/lib/tfhka-integration';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function InvoicesPage() {
  // Simular rol de usuario (hardcodeado como admin por ahora)
  // En producción, esto vendría de tu sistema de autenticación
  const userRole = 'admin'; // Puede ser: 'admin', 'support', 'user'
  const canTimbrar = userRole === 'admin' || userRole === 'support';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedFactura, setSelectedFactura] = useState<FacturaDB | null>(null);
  const [anularDialogOpen, setAnularDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [notaDebitoDialogOpen, setNotaDebitoDialogOpen] = useState(false);
  const [notaCreditoDialogOpen, setNotaCreditoDialogOpen] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [comentarioNotaDebito, setComentarioNotaDebito] = useState('');
  const [montoNotaDebito, setMontoNotaDebito] = useState('');
  const [comentarioNotaCredito, setComentarioNotaCredito] = useState('');
  const [montoNotaCredito, setMontoNotaCredito] = useState('');

  const { data: facturas = [], isLoading } = useFacturas();
  const anularMutation = useAnularFactura();
  const deleteMutation = useDeleteFactura();

  const filteredFacturas = facturas.filter(factura => {
    const matchesSearch =
      factura.numero_documento.toLowerCase().includes(search.toLowerCase()) ||
      factura.cliente_razon_social.toLowerCase().includes(search.toLowerCase()) ||
      factura.cliente_numero_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || factura.estado === statusFilter;

    const facturaDate = new Date(factura.fecha_emision);
    const matchesDateFrom = !dateFrom || facturaDate >= dateFrom;
    const matchesDateTo = !dateTo || facturaDate <= dateTo;

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleAnular = async () => {
    if (!selectedFactura || !motivoAnulacion.trim()) {
      toast.error('Debe especificar el motivo de anulación');
      return;
    }

    try {
      await anularMutation.mutateAsync({
        id: selectedFactura.id,
        motivo: motivoAnulacion
      });
      toast.success('Factura anulada exitosamente');
      setAnularDialogOpen(false);
      setMotivoAnulacion('');
      setSelectedFactura(null);
    } catch (error) {
      toast.error('Error al anular factura');
    }
  };

  const handleDelete = async (factura: FacturaDB) => {
    if (factura.estado !== 'borrador') {
      toast.error('Solo se pueden eliminar facturas en estado borrador');
      return;
    }

    if (confirm(`¿Está seguro de eliminar la factura ${factura.numero_documento}?`)) {
      try {
        await deleteMutation.mutateAsync(factura.id);
        toast.success('Factura eliminada');
      } catch (error) {
        toast.error('Error al eliminar factura');
      }
    }
  };

  const handleDownloadPDF = async (factura: FacturaDB) => {
    try {
      toast.loading('Generando PDF...');

      // Obtener los items de la factura
      const itemsResponse = await fetch(
        `https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items?factura_id=eq.${factura.id}&order=numero_linea.asc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const items = await itemsResponse.json();

      console.log('🔍 DEBUG - URL de consulta:', `https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items?factura_id=eq.${factura.id}&order=numero_linea.asc`);
      console.log('🔍 DEBUG - Items obtenidos de la BD:', items);
      console.log('🔍 DEBUG - Factura ID:', factura.id);
      console.log('🔍 DEBUG - Factura número:', factura.numero_documento);
      console.log('🔍 DEBUG - Cantidad de items:', items?.length || 0);

      if (items && items.length > 0) {
        console.log('🔍 DEBUG - Primer item:', items[0]);
      } else {
        console.warn('⚠️ ADVERTENCIA: No se encontraron items para esta factura. Verifica que los items estén guardados en la tabla facturas_items con el factura_id correcto.');
      }

      await generateFacturaPDF(factura, items || []);

      toast.dismiss();
      toast.success(`PDF generado: Factura_${factura.serie}_${factura.numero_documento}.pdf`);
    } catch (error) {
      toast.dismiss();
      console.error('Error generando PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  const handleDownloadJSON = async (factura: FacturaDB) => {
    try {
      toast.loading('Generando JSON...');

      // Obtener los items de la factura
      const itemsResponse = await fetch(
        `https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items?factura_id=eq.${factura.id}&order=numero_linea.asc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const items = await itemsResponse.json();

      descargarFacturaJSON(factura, items || []);

      toast.dismiss();
      toast.success(`JSON generado: Factura_${factura.serie}_${factura.numero_documento}.json`);
    } catch (error) {
      toast.dismiss();
      console.error('Error generando JSON:', error);
      toast.error('Error al generar el JSON');
    }
  };

  const handleTimbrarFactura = async (factura: FacturaDB) => {
    try {
      toast.loading('Generando solicitud de timbrado...');

      // Obtener los items de la factura
      const itemsResponse = await fetch(
        `https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items?factura_id=eq.${factura.id}&order=numero_linea.asc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const items = await itemsResponse.json();

      // Generar el JSON completo del documento electrónico
      const documentoJSON = convertirFacturaAJSON(factura, items || []);

      // Generar el JSON de solicitud de descarga (formato corto)
      const solicitudDescarga = generarSolicitudDescargaTFHKA(factura, 'PDF');

      // Por ahora, descargar ambos JSON para que el usuario pueda enviarlos manualmente
      // En producción, aquí se haría la llamada al endpoint de TFHKA

      // Descargar JSON completo (para timbrado)
      const jsonCompleto = JSON.stringify(documentoJSON, null, 2);
      const blobCompleto = new Blob([jsonCompleto], { type: 'application/json' });
      const urlCompleto = URL.createObjectURL(blobCompleto);
      const linkCompleto = document.createElement('a');
      linkCompleto.href = urlCompleto;
      linkCompleto.download = `TFHKA_Timbrado_${factura.serie}_${factura.numero_documento}.json`;
      document.body.appendChild(linkCompleto);
      linkCompleto.click();
      document.body.removeChild(linkCompleto);
      URL.revokeObjectURL(urlCompleto);

      // Descargar JSON de descarga (formato corto)
      const jsonDescarga = JSON.stringify(solicitudDescarga, null, 2);
      const blobDescarga = new Blob([jsonDescarga], { type: 'application/json' });
      const urlDescarga = URL.createObjectURL(blobDescarga);
      const linkDescarga = document.createElement('a');
      linkDescarga.href = urlDescarga;
      linkDescarga.download = `TFHKA_Descarga_${factura.serie}_${factura.numero_documento}.json`;
      document.body.appendChild(linkDescarga);
      linkDescarga.click();
      document.body.removeChild(linkDescarga);
      URL.revokeObjectURL(urlDescarga);

      toast.dismiss();
      toast.success('JSONs de timbrado generados. Envía el archivo de timbrado a TFHKA.');
      toast.info('Una vez timbrado, actualiza la factura con el TransaccionId recibido.');
    } catch (error) {
      toast.dismiss();
      console.error('Error generando solicitud de timbrado:', error);
      toast.error('Error al generar la solicitud de timbrado');
    }
  };

  const handleCrearNotaDebito = async () => {
    if (!selectedFactura || !comentarioNotaDebito.trim() || !montoNotaDebito) {
      toast.error('Debe especificar el comentario y monto de la nota de débito');
      return;
    }

    const monto = parseFloat(montoNotaDebito);
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser un número válido mayor a cero');
      return;
    }

    try {
      toast.loading('Creando Nota de Débito...');

      // Obtener los items de la factura original
      const itemsResponse = await fetch(
        `https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items?factura_id=eq.${selectedFactura.id}&order=numero_linea.asc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const items = await itemsResponse.json();

      // Obtener el siguiente número de documento
      const facturasResponse = await fetch(
        'https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_electronicas?select=numero_documento&tipo_documento=eq.03&order=created_at.desc&limit=1',
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const existingNotasDebito = await facturasResponse.json();
      const lastNumber = existingNotasDebito.length > 0
        ? parseInt(existingNotasDebito[0].numero_documento)
        : 0;
      const nextNumber = (lastNumber + 1).toString().padStart(8, '0');

      // Calcular totales basados en el monto ingresado
      const subtotal = monto;
      const totalIVA = subtotal * 0.16;
      const totalAPagar = subtotal + totalIVA;

      // Crear la nota de débito
      const notaDebitoData = {
        tipo_documento: '03', // Nota de Débito
        numero_documento: nextNumber,
        serie: selectedFactura.serie,
        sucursal: selectedFactura.sucursal,
        fecha_emision: new Date().toISOString(),
        hora_emision: new Date().toLocaleTimeString('es-VE', { hour12: true }),
        cliente_id: selectedFactura.cliente_id,
        cliente_tipo_id: selectedFactura.cliente_tipo_id,
        cliente_numero_id: selectedFactura.cliente_numero_id,
        cliente_razon_social: selectedFactura.cliente_razon_social,
        cliente_direccion: selectedFactura.cliente_direccion,
        cliente_telefono: selectedFactura.cliente_telefono,
        cliente_correo: selectedFactura.cliente_correo,
        tipo_de_pago: selectedFactura.tipo_de_pago,
        tipo_de_venta: selectedFactura.tipo_de_venta,
        moneda: selectedFactura.moneda,
        nro_items: items.length,
        monto_gravado_total: subtotal,
        monto_exento_total: 0,
        subtotal: subtotal,
        total_descuento: 0,
        total_iva: totalIVA,
        monto_total_con_iva: totalAPagar,
        total_a_pagar: totalAPagar,
        moneda_secundaria: selectedFactura.moneda_secundaria,
        tipo_cambio: selectedFactura.tipo_cambio,
        total_a_pagar_usd: selectedFactura.tipo_cambio ? totalAPagar / selectedFactura.tipo_cambio : null,
        estado: 'emitida',
        anulado: false,
        serie_factura_afectada: selectedFactura.serie,
        numero_factura_afectada: selectedFactura.numero_documento,
        fecha_factura_afectada: selectedFactura.fecha_emision,
        monto_factura_afectada: selectedFactura.total_a_pagar,
        comentario_factura_afectada: comentarioNotaDebito
      };

      const createResponse = await fetch(
        'https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_electronicas',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(notaDebitoData)
        }
      );

      if (!createResponse.ok) {
        throw new Error('Error al crear la nota de débito');
      }

      const [notaDebito] = await createResponse.json();

      // Crear los items de la nota de débito (copiar los items de la factura original)
      const notaDebitoItems = items.map((item: any) => ({
        factura_id: notaDebito.id,
        numero_linea: item.numero_linea,
        codigo_plu: item.codigo_plu,
        indicador_bien_servicio: item.indicador_bien_servicio,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad_medida: item.unidad_medida,
        precio_unitario: item.precio_unitario,
        descuento_monto: item.descuento_monto || 0,
        precio_item: item.precio_item,
        codigo_impuesto: item.codigo_impuesto || 'G',
        tasa_iva: item.tasa_iva || 16,
        valor_iva: item.valor_iva,
        valor_total_item: item.valor_total_item
      }));

      await fetch(
        'https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          },
          body: JSON.stringify(notaDebitoItems)
        }
      );

      toast.dismiss();
      toast.success(`Nota de Débito ${nextNumber} creada exitosamente`);
      setNotaDebitoDialogOpen(false);
      setComentarioNotaDebito('');
      setMontoNotaDebito('');
      setSelectedFactura(null);
    } catch (error) {
      toast.dismiss();
      console.error('Error creando nota de débito:', error);
      toast.error('Error al crear la nota de débito');
    }
  };

  const handleCrearNotaCredito = async () => {
    if (!selectedFactura || !comentarioNotaCredito.trim() || !montoNotaCredito) {
      toast.error('Debe especificar el comentario y monto de la nota de crédito');
      return;
    }

    const monto = parseFloat(montoNotaCredito);
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser un número válido mayor a cero');
      return;
    }

    try {
      toast.loading('Creando Nota de Crédito...');

      // Obtener los items de la factura original
      const itemsResponse = await fetch(
        `https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items?factura_id=eq.${selectedFactura.id}&order=numero_linea.asc`,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const items = await itemsResponse.json();

      // Obtener el siguiente número de documento
      const facturasResponse = await fetch(
        'https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_electronicas?select=numero_documento&tipo_documento=eq.02&order=created_at.desc&limit=1',
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          }
        }
      );

      const existingNotasCredito = await facturasResponse.json();
      const lastNumber = existingNotasCredito.length > 0
        ? parseInt(existingNotasCredito[0].numero_documento)
        : 0;
      const nextNumber = (lastNumber + 1).toString().padStart(8, '0');

      // Calcular totales basados en el monto ingresado
      const subtotal = monto;
      const totalIVA = subtotal * 0.16;
      const totalAPagar = subtotal + totalIVA;

      // Crear la nota de crédito
      const notaCreditoData = {
        tipo_documento: '02', // Nota de Crédito
        numero_documento: nextNumber,
        serie: selectedFactura.serie,
        sucursal: selectedFactura.sucursal,
        fecha_emision: new Date().toISOString(),
        hora_emision: new Date().toLocaleTimeString('es-VE', { hour12: true }),
        cliente_id: selectedFactura.cliente_id,
        cliente_tipo_id: selectedFactura.cliente_tipo_id,
        cliente_numero_id: selectedFactura.cliente_numero_id,
        cliente_razon_social: selectedFactura.cliente_razon_social,
        cliente_direccion: selectedFactura.cliente_direccion,
        cliente_telefono: selectedFactura.cliente_telefono,
        cliente_correo: selectedFactura.cliente_correo,
        tipo_de_pago: selectedFactura.tipo_de_pago,
        tipo_de_venta: selectedFactura.tipo_de_venta,
        moneda: selectedFactura.moneda,
        nro_items: items.length,
        monto_gravado_total: subtotal,
        monto_exento_total: 0,
        subtotal: subtotal,
        total_descuento: 0,
        total_iva: totalIVA,
        monto_total_con_iva: totalAPagar,
        total_a_pagar: totalAPagar,
        moneda_secundaria: selectedFactura.moneda_secundaria,
        tipo_cambio: selectedFactura.tipo_cambio,
        total_a_pagar_usd: selectedFactura.tipo_cambio ? totalAPagar / selectedFactura.tipo_cambio : null,
        estado: 'emitida',
        anulado: false,
        serie_factura_afectada: selectedFactura.serie,
        numero_factura_afectada: selectedFactura.numero_documento,
        fecha_factura_afectada: selectedFactura.fecha_emision,
        monto_factura_afectada: selectedFactura.total_a_pagar,
        comentario_factura_afectada: comentarioNotaCredito
      };

      const createResponse = await fetch(
        'https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_electronicas',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(notaCreditoData)
        }
      );

      if (!createResponse.ok) {
        throw new Error('Error al crear la nota de crédito');
      }

      const [notaCredito] = await createResponse.json();

      // Crear los items de la nota de crédito (copiar los items de la factura original)
      const notaCreditoItems = items.map((item: any) => ({
        factura_id: notaCredito.id,
        numero_linea: item.numero_linea,
        codigo_plu: item.codigo_plu,
        indicador_bien_servicio: item.indicador_bien_servicio,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad_medida: item.unidad_medida,
        precio_unitario: item.precio_unitario,
        descuento_monto: item.descuento_monto || 0,
        precio_item: item.precio_item,
        codigo_impuesto: item.codigo_impuesto || 'G',
        tasa_iva: item.tasa_iva || 16,
        valor_iva: item.valor_iva,
        valor_total_item: item.valor_total_item
      }));

      await fetch(
        'https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/facturas_items',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk'
          },
          body: JSON.stringify(notaCreditoItems)
        }
      );

      toast.dismiss();
      toast.success(`Nota de Crédito ${nextNumber} creada exitosamente`);
      setNotaCreditoDialogOpen(false);
      setComentarioNotaCredito('');
      setMontoNotaCredito('');
      setSelectedFactura(null);
    } catch (error) {
      toast.dismiss();
      console.error('Error creando nota de crédito:', error);
      toast.error('Error al crear la nota de crédito');
    }
  };

  const totalEmitidas = facturas.filter(f => f.estado === 'emitida').length;
  const totalBorradores = facturas.filter(f => f.estado === 'borrador').length;
  const totalAnuladas = facturas.filter(f => f.anulado).length;
  const totalVentasMes = facturas
    .filter(f => f.estado === 'emitida')
    .reduce((sum, f) => sum + f.total_a_pagar, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestiona todas tus facturas emitidas
          </p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link to="/facturas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facturas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emitidas</CardTitle>
            <FileText className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{totalEmitidas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileEdit className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalBorradores}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatVES(totalVentasMes)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente o RIF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borradores</SelectItem>
                <SelectItem value="emitida">Emitidas</SelectItem>
                <SelectItem value="anulada">Anuladas</SelectItem>
                <SelectItem value="pagada">Pagadas</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: es }) : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: es }) : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total (VES)</TableHead>
                <TableHead>Total (USD)</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Cargando facturas...
                  </TableCell>
                </TableRow>
              ) : filteredFacturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No se encontraron facturas
                  </TableCell>
                </TableRow>
              ) : (
                filteredFacturas.map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono font-medium">{factura.serie}-{factura.numero_documento}</div>
                        <div className="text-xs text-muted-foreground">
                          {factura.tipo_documento === '01' ? 'Factura' :
                           factura.tipo_documento === '02' ? 'Nota Débito' :
                           factura.tipo_documento === '03' ? 'Nota Crédito' : 'Otro'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateVE(factura.fecha_emision)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{factura.cliente_razon_social}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {factura.cliente_tipo_id}-{factura.cliente_numero_id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatVES(factura.total_a_pagar)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {factura.total_a_pagar_usd ? formatUSD(factura.total_a_pagar_usd) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          factura.anulado ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                          factura.estado === 'emitida' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                          factura.estado === 'borrador' ? 'bg-orange-100 text-orange-700 hover:bg-orange-100' :
                          factura.estado === 'pagada' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        }
                      >
                        {factura.anulado ? 'Anulada' :
                         factura.estado === 'emitida' ? 'Emitida' :
                         factura.estado === 'borrador' ? 'Borrador' :
                         factura.estado === 'pagada' ? 'Pagada' : factura.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFactura(factura);
                            setPreviewDialogOpen(true);
                          }}
                          title="Vista Previa"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(factura)}
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadJSON(factura)}
                          title="Descargar JSON"
                        >
                          <FileJson className="h-4 w-4" />
                        </Button>
                        {factura.estado === 'emitida' && !factura.anulado && factura.tipo_documento === '01' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFactura(factura);
                                setNotaDebitoDialogOpen(true);
                              }}
                              title="Crear Nota de Débito"
                            >
                              <FileEdit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFactura(factura);
                                setNotaCreditoDialogOpen(true);
                              }}
                              title="Crear Nota de Crédito"
                            >
                              <FileMinus className="h-4 w-4 text-green-600" />
                            </Button>
                          </>
                        )}
                        {factura.estado === 'emitida' && !factura.anulado && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFactura(factura);
                              setAnularDialogOpen(true);
                            }}
                            title="Anular Factura"
                          >
                            <FileMinus className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                        {factura.estado === 'borrador' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(factura)}
                            title="Eliminar Borrador"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}

                        {/* Menú de Acciones Avanzadas */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" title="Más acciones">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones Avanzadas</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            {/* Opción Timbrar - Solo para Admin/Support, factura emitida y no timbrada */}
                            {canTimbrar &&
                             factura.estado === 'emitida' &&
                             !factura.anulado &&
                             !factura.transaccion_id && (
                              <DropdownMenuItem
                                onClick={() => handleTimbrarFactura(factura)}
                                className="cursor-pointer"
                              >
                                <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                                <span>Timbrar con TFHKA</span>
                              </DropdownMenuItem>
                            )}

                            {/* Mostrar mensaje si ya está timbrada */}
                            {factura.transaccion_id && (
                              <DropdownMenuItem disabled>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                <span>Ya timbrada</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Vista Previa Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa de Factura</DialogTitle>
          </DialogHeader>
          {selectedFactura && (
            <div className="space-y-6">
              {/* Encabezado */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Información de la Factura</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Número:</span>
                      <span className="font-mono font-medium">{selectedFactura.serie}-{selectedFactura.numero_documento}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{selectedFactura.tipo_documento === '01' ? 'Factura' : selectedFactura.tipo_documento === '02' ? 'Nota Débito' : 'Nota Crédito'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span>{formatDateVE(selectedFactura.fecha_emision)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hora:</span>
                      <span>{selectedFactura.hora_emision}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge className={
                        selectedFactura.anulado ? 'bg-red-100 text-red-700' :
                        selectedFactura.estado === 'emitida' ? 'bg-emerald-100 text-emerald-700' :
                        selectedFactura.estado === 'borrador' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {selectedFactura.anulado ? 'Anulada' : selectedFactura.estado}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-3">Cliente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RIF:</span>
                      <span className="font-mono">{selectedFactura.cliente_tipo_id}-{selectedFactura.cliente_numero_id}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Razón Social:</span>
                      <p className="font-medium">{selectedFactura.cliente_razon_social}</p>
                    </div>
                    {selectedFactura.cliente_direccion && (
                      <div>
                        <span className="text-muted-foreground">Dirección:</span>
                        <p className="text-xs">{selectedFactura.cliente_direccion}</p>
                      </div>
                    )}
                    {selectedFactura.cliente_telefono && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teléfono:</span>
                        <span>{selectedFactura.cliente_telefono}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Montos en VES</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-mono">{formatVES(selectedFactura.subtotal)}</span>
                    </div>
                    {selectedFactura.total_descuento > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descuento:</span>
                        <span className="font-mono text-red-600">-{formatVES(selectedFactura.total_descuento)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span className="font-mono">{formatVES(selectedFactura.total_iva)}</span>
                    </div>
                    {selectedFactura.monto_igtf && selectedFactura.monto_igtf > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IGTF (3%):</span>
                        <span className="font-mono">{formatVES(selectedFactura.monto_igtf)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-semibold text-base">
                      <span>Total:</span>
                      <span className="font-mono">{formatVES(selectedFactura.total_a_pagar)}</span>
                    </div>
                  </div>
                </div>
                {selectedFactura.total_a_pagar_usd && (
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold mb-3">Montos en USD</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tasa BCV:</span>
                        <span className="font-mono">{selectedFactura.tipo_cambio?.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-mono">{formatUSD(selectedFactura.subtotal_usd || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IVA (16%):</span>
                        <span className="font-mono">{formatUSD(selectedFactura.total_iva_usd || 0)}</span>
                      </div>
                      {selectedFactura.monto_igtf_usd && selectedFactura.monto_igtf_usd > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IGTF (3%):</span>
                          <span className="font-mono">{formatUSD(selectedFactura.monto_igtf_usd)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t font-semibold text-base">
                        <span>Total:</span>
                        <span className="font-mono">{formatUSD(selectedFactura.total_a_pagar_usd)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Monto en letras */}
              {selectedFactura.monto_en_letras && (
                <div className="p-3 bg-blue-50 rounded text-sm">
                  <span className="font-semibold">Son: </span>
                  <span>{selectedFactura.monto_en_letras}</span>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    setSelectedFactura(null);
                  }}
                >
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    handleDownloadJSON(selectedFactura);
                  }}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Descargar JSON
                </Button>
                <Button
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    handleDownloadPDF(selectedFactura);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Anular Dialog */}
      <Dialog open={anularDialogOpen} onOpenChange={setAnularDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro de anular la factura <span className="font-mono font-medium">{selectedFactura?.numero_documento}</span>?
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo de anulación:</label>
              <Input
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                placeholder="Indique el motivo de la anulación"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setAnularDialogOpen(false);
                  setMotivoAnulacion('');
                  setSelectedFactura(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnular}
                disabled={!motivoAnulacion.trim() || anularMutation.isPending}
              >
                {anularMutation.isPending ? 'Anulando...' : 'Anular Factura'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nota de Débito Dialog */}
      <Dialog open={notaDebitoDialogOpen} onOpenChange={setNotaDebitoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nota de Débito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crear Nota de Débito para la factura <span className="font-mono font-medium">{selectedFactura?.numero_documento}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comentario:</label>
              <Input
                value={comentarioNotaDebito}
                onChange={(e) => setComentarioNotaDebito(e.target.value)}
                placeholder="Motivo de la nota de débito"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto (sin IVA):</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={montoNotaDebito}
                onChange={(e) => setMontoNotaDebito(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Total con IVA (16%): {montoNotaDebito ? (parseFloat(montoNotaDebito) * 1.16).toFixed(2) : '0.00'} {selectedFactura?.moneda}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setNotaDebitoDialogOpen(false);
                  setComentarioNotaDebito('');
                  setMontoNotaDebito('');
                  setSelectedFactura(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrearNotaDebito}
                disabled={!comentarioNotaDebito.trim() || !montoNotaDebito}
              >
                Crear Nota de Débito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Nota de Crédito Dialog */}
      <Dialog open={notaCreditoDialogOpen} onOpenChange={setNotaCreditoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nota de Crédito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Crear Nota de Crédito para la factura <span className="font-mono font-medium">{selectedFactura?.numero_documento}</span>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Comentario:</label>
              <Input
                value={comentarioNotaCredito}
                onChange={(e) => setComentarioNotaCredito(e.target.value)}
                placeholder="Motivo de la devolución o ajuste"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monto a devolver (sin IVA):</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={montoNotaCredito}
                onChange={(e) => setMontoNotaCredito(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Total con IVA (16%): {montoNotaCredito ? (parseFloat(montoNotaCredito) * 1.16).toFixed(2) : '0.00'} {selectedFactura?.moneda}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setNotaCreditoDialogOpen(false);
                  setComentarioNotaCredito('');
                  setMontoNotaCredito('');
                  setSelectedFactura(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrearNotaCredito}
                disabled={!comentarioNotaCredito.trim() || !montoNotaCredito}
              >
                Crear Nota de Crédito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}