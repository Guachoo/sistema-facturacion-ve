# 🔥 INSTRUCCIONES PARA RESET REAL DE SUPABASE

## ⚠️ **PROBLEMA IDENTIFICADO**

Los scripts SQL anteriores están diseñados para PostgreSQL local, pero **el sistema usa Supabase real** con API REST.

### 📊 **Análisis completado:**
- **URL Supabase real**: `https://supfddcbyfuzvxsrzwio.supabase.co`
- **Tablas encontradas**: 12 tablas operacionales + configuración
- **Problema**: Mis scripts SQL no funcionan con Supabase Cloud

---

## 🛠️ **SOLUCIONES IMPLEMENTADAS**

### 1️⃣ **Script Node.js (Recomendado)**
```bash
# Ver qué se haría (seguro):
node reset-supabase-completo.js --dry-run

# Ejecutar reset real (CUIDADO):
node reset-supabase-completo.js --force
```

### 2️⃣ **Interfaz Web (Más fácil)**
```bash
# Abrir en navegador:
reset-browser.html
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

## 🆘 **SI ALGO SALE MAL**

### **Los datos "aparecen" de nuevo:**
- Son datos mock/fallback del código
- El reset SÍ funcionó en Supabase
- El frontend muestra datos falsos cuando no encuentra datos reales

### **Error de conexión:**
- Verificar API key de Supabase
- Verificar URL de Supabase
- Verificar permisos de la API key

### **Reset parcial:**
- Algunas tablas pueden tener políticas RLS
- Ejecutar el reset varias veces puede resolver dependencias

---

## ✅ **CONFIRMACIÓN FINAL**

Después del reset exitoso deberías tener:

- **✅ Supabase limpio** (verificar con API directa)
- **✅ Aplicación sin datos** (después de limpiar cache)
- **✅ Sistema listo** para nuevas pruebas

**¡Sistema completamente limpio y listo para pruebas!** 🎉