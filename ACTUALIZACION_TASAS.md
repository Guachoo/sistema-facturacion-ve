# Sistema de Actualización Automática de Tasas de Cambio

## 📋 Descripción

Este sistema actualiza automáticamente las tasas de cambio (USD y EUR) desde la API de DolarVzla.

## 🎯 Opciones de Implementación

### ✅ Opción A: Frontend (ACTUAL - YA CONFIGURADA)

**Estado**: ✅ Implementada y funcionando

- Actualiza al iniciar la aplicación
- Verifica cada hora si necesita actualizar
- Compatible con navegador web
- **No requiere configuración adicional**

### ⏰ Opción B: Backend con Supabase (RECOMENDADA PARA PRODUCCIÓN)

**Estado**: 📝 Archivos de configuración listos, requiere setup en Supabase

- Ejecuta exactamente a las 9:00 AM todos los días
- Más confiable (no depende de que la app esté abierta)
- Requiere configuración en Supabase Dashboard

---

## 🏗️ Arquitectura Actual (Opción A - Frontend)

### Componentes

1. **[rates-updater.ts](src/services/rates-updater.ts)** - Servicio que actualiza tasas desde el navegador
2. **[rates.ts](src/api/rates.ts)** - API que obtiene tasas (primero de DB, luego de API)
3. **[services/index.ts](src/services/index.ts)** - Inicializador de servicios
4. **exchange_rates** - Tabla de Supabase que almacena historial

### Flujo de Datos

```
┌─────────────────────┐
│   App Startup       │ ← Al abrir la aplicación
│   + Hourly Check    │ ← Verifica cada hora
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ¿Tasa de hoy       │
│  existe en DB?      │
└──────────┬──────────┘
           │ No
           ▼
┌─────────────────────┐
│  DolarVzla API      │ ← Obtiene tasas actuales
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Supabase         │ ← Guarda/actualiza en exchange_rates
│   (Database)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  React Query        │ ← Consulta para mostrar en UI
│   (Frontend)        │
└─────────────────────┘
```

### Cómo Funciona

1. **Al iniciar la app**: Verifica si existe la tasa de hoy en la BD
2. **Si no existe**: Obtiene de la API y la guarda
3. **Si ya existe**: No hace nada (ya está actualizado)
4. **Cada hora**: Repite la verificación

---

## 📊 Tabla de Base de Datos

### exchange_rates

| Campo      | Tipo                        | Descripción                    |
|------------|-----------------------------|--------------------------------|
| id         | UUID                        | ID único                       |
| rate_date  | DATE                        | Fecha de la tasa (UNIQUE)      |
| usd_rate   | DECIMAL(10, 4)              | Tasa USD en bolívares          |
| eur_rate   | DECIMAL(10, 4)              | Tasa EUR en bolívares          |
| created_at | TIMESTAMP WITH TIME ZONE    | Fecha de creación              |
| updated_at | TIMESTAMP WITH TIME ZONE    | Última actualización           |

### exchange_rates_update_log (opcional)

Tabla para registrar el historial de actualizaciones.

---

## 🔧 Configuración Rápida (Ya Está Lista)

### 1. Crear la tabla en Supabase

Ve al SQL Editor en Supabase y ejecuta:

```bash
# Ubicación del archivo
supabase/migrations/create_exchange_rates_table.sql
```

O copia este SQL:

```sql
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_date DATE NOT NULL UNIQUE,
  usd_rate DECIMAL(10, 4) NOT NULL,
  eur_rate DECIMAL(10, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_exchange_rates_date ON exchange_rates(rate_date DESC);
```

### 2. Iniciar la aplicación

```bash
npm run dev
```

**¡Listo!** El sistema ya está funcionando. Verás en la consola:

```
🚀 Iniciando servicios de la aplicación...
🔍 Verificando si es necesario actualizar las tasas...
✅ Tasas de cambio actualizadas exitosamente
```

---

## 🚀 Configuración Avanzada (Opción B - Supabase Backend)

Para implementar la actualización exacta a las 9:00 AM usando Supabase:

### Método 1: Usando pg_cron (Más Simple)

1. Ve a **SQL Editor** en Supabase
2. Ejecuta el archivo: `supabase/migrations/setup_daily_rates_update_simple.sql`
3. Sigue las instrucciones en los comentarios del archivo

### Método 2: Usando Supabase Edge Functions

Ver detalles en: `supabase/migrations/setup_daily_rates_update_simple.sql`

---

## 📝 Uso Manual

### Actualizar tasas manualmente desde el código

```typescript
import { updateExchangeRatesIfNeeded } from '@/services/rates-updater';

// Forzar actualización
await updateExchangeRatesIfNeeded();
```

### Actualizar desde SQL (Supabase)

```sql
-- Insertar/actualizar tasa manualmente
SELECT insert_exchange_rate(
  CURRENT_DATE,  -- fecha
  37.50,         -- USD
  41.20          -- EUR
);
```

---

## 📝 Logs y Monitoreo

### Logs en Consola del Navegador

El sistema genera logs detallados:

- 🔍 `Verificando si es necesario actualizar las tasas...`
- ✅ `Las tasas de hoy ya están actualizadas`
- 🔄 `Obteniendo tasas de cambio desde DolarVzla API...`
- 💾 `Tasas guardadas/actualizadas en la base de datos`
- ❌ `Error durante la actualización de tasas`

### Verificar tasas en la base de datos

```sql
-- Ver últimas 10 tasas
SELECT * FROM exchange_rates
ORDER BY rate_date DESC
LIMIT 10;

-- Ver tasa de hoy
SELECT * FROM exchange_rates
WHERE rate_date = CURRENT_DATE;

-- Ver log de actualizaciones (si configuraste la tabla de logs)
SELECT * FROM exchange_rates_update_log
ORDER BY update_date DESC
LIMIT 20;
```

---

## 🛠️ Solución de Problemas

### ❌ Error: "La aplicación no carga"

**Causa**: Intentar usar `node-cron` en el navegador

**Solución**: ✅ Ya solucionado. Ahora usa `rates-updater.ts` que es compatible con navegador

### ❌ Las tasas no se actualizan

1. Abre la consola del navegador (F12)
2. Busca logs que comiencen con 🔍 o ❌
3. Verifica la conexión a Supabase
4. Verifica que la API de DolarVzla esté disponible: https://api.dolarvzla.com/public/exchange-rate

### ❌ Error al guardar en la base de datos

1. Verifica que la tabla `exchange_rates` exista
2. Ejecuta en SQL Editor:
   ```sql
   SELECT * FROM exchange_rates LIMIT 1;
   ```
3. Si da error, ejecuta la migración: `create_exchange_rates_table.sql`

### ⚠️ Políticas RLS

Si tienes Row Level Security habilitado, necesitas agregar políticas:

```sql
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios pueden leer tasas"
ON exchange_rates FOR SELECT
TO authenticated
USING (true);

-- Permitir inserción/actualización solo desde service role
CREATE POLICY "Service role puede escribir tasas"
ON exchange_rates FOR ALL
TO service_role
USING (true);
```

---

## 📚 API Externa

**DolarVzla API**
- **URL**: `https://api.dolarvzla.com/public/exchange-rate`
- **Método**: GET
- **Autenticación**: No requiere
- **Rate Limit**: No especificado
- **Gratis**: Sí
- **Documentación**: https://dolarvzla.com/

### Ejemplo de Respuesta

```json
{
  "current": {
    "usd": 37.45,
    "eur": 41.20,
    "date": "2026-01-01"
  }
}
```

---

## 📅 Historial de Cambios

- **2026-01-01**: Implementación inicial con frontend updater
  - Removido `node-cron` (no compatible con navegador)
  - Implementado `rates-updater.ts` para navegador
  - Agregadas opciones de configuración para Supabase backend

---

## 👨‍💻 Mantenimiento

- **Revisar logs**: Diariamente en consola del navegador
- **Verificar actualizaciones**: Semanalmente en Supabase
- **Limpieza de datos antiguos**: Opcional (la tabla crece ~365 registros/año)

---

## 🎯 Próximas Mejoras

- [ ] Implementar Supabase Edge Function para 9:00 AM exacto
- [ ] Panel de administración para ver historial
- [ ] Notificaciones en caso de error
- [ ] Gráficos de evolución de tasas
- [ ] API endpoint para consultar historial

---

## 🔐 Seguridad

- ✅ Credenciales de Supabase en variables de entorno
- ✅ No requiere claves API para DolarVzla
- ✅ Tasas históricas protegidas en Supabase
- ⚠️ Configurar RLS si es necesario

---

## 📦 Archivos del Sistema

```
src/
├── services/
│   ├── rates-updater.ts          ← Actualización desde navegador (ACTUAL)
│   ├── rates-scheduler.ts        ← DEPRECADO (node-cron, no usar)
│   └── index.ts                  ← Inicializador de servicios
├── api/
│   └── rates.ts                  ← API de tasas (DB first, fallback a API)
└── main.tsx                      ← Import de servicios

supabase/migrations/
├── create_exchange_rates_table.sql              ← Tabla principal
├── setup_daily_rates_update.sql                 ← Config pg_cron (avanzado)
└── setup_daily_rates_update_simple.sql          ← Instrucciones Edge Function
```
