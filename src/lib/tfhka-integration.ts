import type { FacturaDB } from '@/api/facturas';

// Formato de solicitud para descarga/timbrado TFHKA
export interface TFHKADescargaRequest {
  serie: string;
  tipoDocumento: string;
  numeroDocumento: string;
  tipoArchivo: 'PDF' | 'JSON' | 'XML';
}

// Formato de respuesta de TFHKA después del timbrado
export interface TFHKATimbraResponse {
  transaccionId: string;
  urlPdf?: string;
  urlXml?: string;
  mensaje?: string;
  error?: string;
}

/**
 * Genera la solicitud de descarga para TFHKA
 * @param factura - Factura de la base de datos
 * @param tipoArchivo - Tipo de archivo a descargar (PDF, JSON, XML)
 * @returns Objeto con formato de solicitud TFHKA
 */
export function generarSolicitudDescargaTFHKA(
  factura: FacturaDB,
  tipoArchivo: 'PDF' | 'JSON' | 'XML' = 'PDF'
): TFHKADescargaRequest {
  return {
    serie: factura.serie || 'A',
    tipoDocumento: factura.tipo_documento,
    numeroDocumento: factura.numero_documento,
    tipoArchivo: tipoArchivo
  };
}

/**
 * Procesa la respuesta del timbrado TFHKA y actualiza la factura
 * @param facturaId - ID de la factura en la base de datos
 * @param response - Respuesta del servidor TFHKA
 * @returns Promise con la factura actualizada
 */
export async function procesarRespuestaTimbrado(
  facturaId: string,
  response: TFHKATimbraResponse
): Promise<void> {
  if (response.error) {
    throw new Error(`Error en timbrado TFHKA: ${response.error}`);
  }

  const SUPABASE_URL = 'https://supfddcbyfuzvxsrzwio.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGZkZGNieWZ1enZ4c3J6d2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MzI1NTgsImV4cCI6MjA3NDMwODU1OH0.ahAMsD3GIqJA87fK_Vk_n3BhzF7sxWQ2GJCtvrPvaUk';

  const updateData: any = {
    transaccion_id: response.transaccionId
  };

  if (response.urlPdf) {
    updateData.url_pdf = response.urlPdf;
  }

  const updateResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/facturas_electronicas?id=eq.${facturaId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(updateData)
    }
  );

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Error actualizando factura: ${errorText}`);
  }
}

/**
 * Descarga el archivo desde TFHKA
 * @param solicitud - Solicitud de descarga
 * @param urlBase - URL base del servidor TFHKA (ejemplo: 'https://tfhka.com/api')
 * @returns Promise con la URL del archivo descargado
 */
export async function descargarArchivoTFHKA(
  solicitud: TFHKADescargaRequest,
  urlBase: string
): Promise<string> {
  const response = await fetch(`${urlBase}/descarga`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(solicitud)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en descarga TFHKA: ${errorText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.url || data.urlPdf || data.urlArchivo;
}

/**
 * Timbra una factura con TFHKA
 * @param factura - Factura a timbrar
 * @param documentoJSON - JSON del documento electrónico
 * @param urlBase - URL base del servidor TFHKA
 * @returns Promise con la respuesta del timbrado
 */
export async function timbrarFacturaTFHKA(
  factura: FacturaDB,
  documentoJSON: any,
  urlBase: string
): Promise<TFHKATimbraResponse> {
  const response = await fetch(`${urlBase}/timbrar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(documentoJSON)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en timbrado: ${errorText}`);
  }

  const data = await response.json();

  // Actualizar la factura con los datos del timbrado
  await procesarRespuestaTimbrado(factura.id, data);

  return data;
}
