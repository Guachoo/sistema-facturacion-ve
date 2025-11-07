# 📋 Sistema de Números de Control

## 🎯 Resumen
Los números de control han sido integrados exitosamente en el módulo de **Configuración de Empresa**. Ya no aparece el mensaje "No hay lotes de números de control configurados" una vez que agregues lotes desde la base de datos.

## 🗄️ Base de Datos
La tabla `control_number_batches` gestiona los lotes:

```sql
CREATE TABLE control_number_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  range_from INTEGER NOT NULL,    -- Número inicial del lote
  range_to INTEGER NOT NULL,      -- Número final del lote
  active BOOLEAN DEFAULT false,   -- Si está activo actualmente
  used INTEGER DEFAULT 0,         -- Cuántos números se han usado
  remaining INTEGER NOT NULL,     -- Cuántos números quedan
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## ⚡ Agregar Lotes de Ejemplo

### Opción 1: Ejecutar SQL directamente
```sql
-- Ejecuta en tu base de datos Supabase:
\i control-numbers-sample-data.sql
```

### Opción 2: SQL Manual
```sql
-- Lote activo actual (2025)
INSERT INTO control_number_batches (range_from, range_to, active, used, remaining)
VALUES (2025001, 2025500, true, 127, 373);

-- Lote anterior (2024) - casi agotado
INSERT INTO control_number_batches (range_from, range_to, active, used, remaining)
VALUES (2024001, 2024500, false, 485, 15);

-- Lote futuro (preparado)
INSERT INTO control_number_batches (range_from, range_to, active, used, remaining)
VALUES (2025501, 2026000, false, 0, 500);
```

## 🎨 Interfaz de Usuario
Una vez agregados los lotes, la interfaz mostrará:

- ✅ **Rango**: 2,024,001 - 2,024,500
- ✅ **Estado**: Activo/Inactivo (clickeable)
- ✅ **Utilizados**: 485
- ✅ **Disponibles**: 15
- ✅ **Progreso**: Barra visual con colores:
  - 🔵 Azul: < 75% usado
  - 🟡 Amarillo: 75-90% usado
  - 🔴 Rojo: > 90% usado
- ✅ **Acciones**: Activar/Desactivar y Eliminar

## 🔧 Funcionalidades Implementadas

### ✅ Crear Nuevo Lote
- Formulario con validación
- Prevención de solapamiento
- Activación automática si es el primer lote

### ✅ Gestión de Estados
- Click en badge para activar/desactivar
- Solo un lote puede estar activo a la vez
- Validación de números disponibles

### ✅ Eliminación Segura
- No se puede eliminar lotes con números usados
- Confirmación antes de eliminar
- Actualización automática de la lista

### ✅ Hooks de React Query
- `useControlNumberBatches()` - Obtener lotes
- `useCreateControlBatch()` - Crear nuevo lote
- `useToggleBatchStatus()` - Activar/desactivar
- `useDeleteControlBatch()` - Eliminar lote
- `useGetNextControlNumber()` - Obtener siguiente número
- `useUseControlNumber()` - Marcar número como usado

## 🚀 Próximo Paso
Para conectar con la generación de facturas, usa:

```typescript
const { data: nextNumber } = useGetNextControlNumber();
const useNumberMutation = useUseControlNumber();

// Al generar factura:
const controlNumber = await useNumberMutation.mutateAsync(activeBatchId);
```

## 🔗 Navegación
Ve a: **Configuración** → **Configuración de Empresa** → **Números de Control**

¡Ya tienes un sistema completo de gestión de números de control fiscales! 🎉