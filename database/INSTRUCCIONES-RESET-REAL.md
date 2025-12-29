# 🔥 INSTRUCCIONES PARA RESET REAL DE SUPABASE

## ⚠️ **PROBLEMA IDENTIFICADO**

Los scripts SQL anteriores están diseñados para PostgreSQL local, pero **el sistema usa Supabase real** con API REST.

### 📊 **Análisis completado:**
- **URL Supabase real**: `https://supfddcbyfuzvxsrzwio.supabase.co`
- **Tablas encontradas**: 12 tablas operacionales + configuración
- **Problema**: Mis scripts SQL no funcionan con Supabase Cloud

---

## 🛠️ **SOLUCIONES IMPLEMENTADAS**

### ⚠️ **PROBLEMA DETECTADO - RLS POLICIES**

Los scripts encuentran datos pero no pueden eliminarlos debido a:
- **Row Level Security (RLS)** activado en Supabase
- Tablas requieren campo `created_by` para eliminaciones
- La API key `anon` no tiene permisos completos de eliminación

### 1️⃣ **Script Node.js (Limitado por RLS)**
```bash
# Ver qué se haría (seguro):
node reset-supabase-completo.js --dry-run

# Ejecutar reset real (LIMITADO):
node reset-supabase-completo.js --force
```

### 2️⃣ **Interfaz Web (También limitada)**
```bash
# Abrir en navegador:
reset-browser.html
```

### 3️⃣ **SOLUCIÓN RECOMENDADA - Dashboard Supabase**
```
1. Ir a: https://app.supabase.com/project/supfddcbyfuzvxsrzwio
2. Authentication > Users > Eliminar usuarios de prueba
3. Table Editor > Seleccionar tabla > Delete all rows
4. Repetir para: invoices, customers, items, quotations
```

---

## 📋 **TABLAS QUE SE ELIMINARÁN**

### 🗑️ **DATOS OPERACIONALES (ELIMINADOS):**
- `invoices` - Facturas
- `quotations` - Cotizaciones
- `quotation_items` - Items de cotizaciones
- `customers` - Clientes
- `items` - Productos/Servicios
- `inventory_movements` - Movimientos inventario
- `fiscal_documents` - Documentos fiscales
- `fiscal_backups` - Respaldos fiscales
- `fiscal_audit_log` - Log auditoría fiscal
- `fiscal_traceability` - Trazabilidad fiscal

### ✅ **CONFIGURACIÓN (MANTENIDA):**
- `users` - Usuarios
- `user_permissions` - Permisos
- `permission_audit` - Auditoría permisos
- `fiscal_configuration` - Configuración fiscal

---

## 🚀 **INSTRUCCIONES DE USO**

### **Opción A: Script Node.js**

1. **Verificar estado actual:**
   ```bash
   cd database/
   node reset-supabase-completo.js --dry-run
   ```

2. **Si está seguro, ejecutar reset real:**
   ```bash
   node reset-supabase-completo.js --force
   ```

### **Opción B: Interfaz Web**

1. **Abrir en navegador:**
   ```
   reset-browser.html
   ```

2. **Seguir pasos en la interfaz:**
   - Verificar estado actual
   - Hacer dry run
   - Ejecutar reset real

---

## 🔍 **VALIDACIÓN POST-RESET**

### Verificar que el reset funcionó:
```javascript
// Desde consola del navegador en tu app:
fetch('https://supfddcbyfuzvxsrzwio.supabase.co/rest/v1/customers', {
  headers: {
    'apikey': 'tu_api_key',
    'Authorization': 'Bearer tu_api_key'
  }
}).then(r => r.json()).then(console.log)
```

### Resultado esperado:
```json
[]  // Array vacío = datos eliminados correctamente
```

---

## 💡 **POR QUÉ AÚN VES DATOS**

### **Posibles causas:**

1. **Cache del navegador**
   ```bash
   # Solución: Ctrl + F5 (hard refresh)
   ```

2. **React Query cache**
   ```javascript
   // En consola del navegador:
   localStorage.clear();
   location.reload();
   ```

3. **Datos mock/fallback**
   ```javascript
   // El código puede mostrar datos falsos cuando Supabase falla
   ```

4. **No se ejecutó el reset real**
   ```bash
   # Asegúrate de usar --force, no --dry-run
   ```

---

## 🎯 **PASOS FINALES RECOMENDADOS**

### 1. **Ejecutar reset real:**
```bash
cd database/
node reset-supabase-completo.js --force
```

### 2. **Limpiar cache del navegador:**
```
Ctrl + F5 (o Cmd + Shift + R en Mac)
```

### 3. **Verificar en la aplicación:**
```
http://localhost:5174
- Clientes: debe estar vacío
- Productos: debe estar vacío
- Facturas: debe estar vacío
```

### 4. **Si persisten datos mock:**
```javascript
// Verificar en consola del navegador:
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

---

## ✅ **ANÁLISIS FINAL COMPLETADO**

### 📊 **DATOS ENCONTRADOS (Dic 28, 2025):**
- **🔴 27 Facturas** (FAC-000001 a FAC-000027)
- **🔴 7 Clientes** (V-12345678-9, V-07519575-0, etc.)
- **⚪ 0 Productos/Items** (tabla vacía)
- **⚪ 0 Cotizaciones** (tabla vacía)
- **🟢 5 Usuarios + 6 Permisos** (se mantienen)

### 🎯 **SOLUCIÓN DEFINITIVA:**

**OPCIÓN 1 - Dashboard Supabase (GARANTIZADA):**
```
1. Ir a: https://app.supabase.com/project/supfddcbyfuzvxsrzwio
2. Table Editor > invoices > Seleccionar todo > Delete (27 registros)
3. Table Editor > customers > Seleccionar todo > Delete (7 registros)
```

**OPCIÓN 2 - SQL Editor en Supabase:**
```sql
DELETE FROM invoices;   -- 27 registros
DELETE FROM customers;  -- 7 registros
```

### 🔍 **VERIFICACIÓN POST-LIMPIEZA:**
```bash
# Correr este script para verificar:
node database/verificar-datos.js
```

**Resultado esperado:**
```
🎉 ¡SISTEMA LIMPIO!
✅ No hay datos operacionales que eliminar
🔴 Datos operacionales: 0 registros
```

---

## 🆘 **POR QUÉ NO FUNCIONAN LOS SCRIPTS AUTOMÁTICOS**

### **Causa identificada:**
- **Row Level Security (RLS)** activado en Supabase
- Tablas requieren `created_by` para eliminaciones
- API key `anon` no tiene permisos de eliminación masiva

### **Los datos "aparecen" de nuevo:**
- Cache del navegador (Ctrl + F5)
- React Query cache (`localStorage.clear()`)
- Datos mock/fallback del frontend

---

## ✅ **CONFIRMACIÓN FINAL**

El sistema tiene **exactamente 34 registros operacionales** que eliminar.
Después del reset manual exitoso tendrás:

- **✅ Supabase limpio** (0 facturas, 0 clientes)
- **✅ Aplicación vacía** (después de limpiar cache)
- **✅ Sistema listo** para pruebas reales

**¡Análisis completo realizado!** 🎉