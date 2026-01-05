# Migración: Soporte de Precios en USD

## Descripción
Esta migración agrega soporte para que los productos/servicios puedan tener precio en dólares americanos (USD) con conversión automática a bolívares (VES) usando la tasa BCV del día.

## Cambios en la Base de Datos

### Nuevos Campos en la tabla `items`:
- `moneda` (VARCHAR(3)): Tipo de moneda ('VES' o 'USD')
- `precio_usd` (DECIMAL(15,2)): Precio en USD (solo si moneda=USD)

### Comportamiento:
- **Items en VES**: `moneda='VES'`, `precio_usd=NULL`, `precio_base` contiene el precio en bolívares
- **Items en USD**: `moneda='USD'`, `precio_usd` contiene el precio en dólares, `precio_base` contiene la conversión automática a VES usando la tasa BCV

## Cómo Aplicar la Migración

### Opción 1: Panel de Supabase
1. Ve a tu proyecto en https://supabase.com
2. Navega a **SQL Editor**
3. Abre el archivo `migration-items-usd.sql`
4. Copia y pega el contenido
5. Ejecuta la consulta (botón "RUN")

### Opción 2: CLI de Supabase
```bash
supabase db push migration-items-usd.sql
```

### Opción 3: psql
```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f migration-items-usd.sql
```

## Verificar la Migración

Después de ejecutar la migración, verifica que las columnas se agregaron correctamente:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'items'
AND column_name IN ('moneda', 'precio_usd');
```

Deberías ver:
```
column_name  | data_type        | is_nullable | column_default
-------------|------------------|-------------|---------------
moneda       | character varying| NO          | 'VES'::character varying
precio_usd   | numeric          | YES         | NULL
```

## Funcionalidad en la Aplicación

### Crear Producto/Servicio en USD
1. Ve a **Productos y Servicios**
2. Haz clic en **Nuevo Item**
3. Selecciona **Moneda: Dólares (USD)**
4. Ingresa el precio en USD
5. Verás la conversión automática a VES usando la tasa BCV del día
6. Guarda el producto

### Crear Producto/Servicio en VES
1. Ve a **Productos y Servicios**
2. Haz clic en **Nuevo Item**
3. Selecciona **Moneda: Bolívares (VES)**
4. Ingresa el precio directamente en VES
5. Guarda el producto

### En el Wizard de Facturas
- Los productos en USD mostrarán el precio en dólares en azul
- Debajo se mostrará el equivalente en VES
- Al agregar a la factura, se usará el precio en VES calculado con la tasa BCV del día

## Rollback (Revertir)

Si necesitas revertir los cambios:

```sql
ALTER TABLE items DROP COLUMN IF EXISTS precio_usd;
ALTER TABLE items DROP COLUMN IF EXISTS moneda;
```

⚠️ **Advertencia**: Esto eliminará todos los datos de precio en USD.

## Notas Importantes

- La migración es segura y no afecta datos existentes
- Los items existentes se mantienen como VES por defecto
- La tasa BCV se actualiza diariamente de forma automática
- Los precios en VES de items USD se recalculan usando la tasa actual cada vez que se crea la factura
