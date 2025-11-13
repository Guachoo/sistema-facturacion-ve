# 🧪 Guía de Pruebas - Sistema de Facturación

## 🎯 Problema Resuelto: Facturas Aparecen en Historial

Hemos corregido el problema donde las facturas creadas no aparecían en el historial.

## 🔧 Cambios Realizados

✅ **Cache Actualizada**: Las nuevas facturas se agregan automáticamente al cache
✅ **Invalidación de Queries**: Fuerza el re-render de la lista
✅ **Modo Mock Completo**: Funciona sin Supabase en desarrollo

## 🚀 Cómo Probar la Funcionalidad

### 1. **Acceder al Sistema**
- URL: `http://localhost:5176`
- Usuario: `admin@sistema.com`
- Contraseña: `admin123`

### 2. **Ver Facturas Existentes**
- Ve a **"Facturas"** en el menú
- Deberías ver las 5 facturas mock de ejemplo
- Nota los totales reales (ya no $0.00)

### 3. **Crear Nueva Factura**
- Click en **"Nueva Factura"**
- Sigue el wizard paso a paso
- **¡IMPORTANTE!** Después de crear la factura:

### 4. **Verificar que Aparece en el Historial**
- Regresa a la página de **"Facturas"**
- La nueva factura debe aparecer **al tope de la lista**
- Debería tener el número siguiente (ej: FAC-000028)
- El total debe ser correcto (no $0.00)

## 📊 Lo Que Deberías Ver en la Consola

```bash
🔧 Creando factura mock (sin Supabase)
🔧 Guardando factura fiscal mock (sin Supabase)
🔧 Mock: Actualizando estado TFHKA localmente
🔧 Mock: Actualizando cache de facturas con nueva factura
✅ Fiscal invoice created successfully
```

## 🎉 Funcionalidades Que Funcionan

✅ **Creación**: Wizard completo sin errores
✅ **Cálculos**: IVA y totales correctos
✅ **TFHKA**: Simulación de envío fiscal
✅ **Numeración**: Secuencial automática
✅ **Cache**: Actualización en tiempo real
✅ **Persistencia**: Durante la sesión

## 🔍 Si Algo No Funciona

### **Si la factura no aparece:**
1. Abre DevTools (F12)
2. Ve a la pestaña **Console**
3. Busca los mensajes con 🔧 Mock
4. Si no ves "Mock: Actualizando cache", reporta el error

### **Si hay errores 401:**
- Esto significa que el modo mock no se activó correctamente
- Verifica que en `.env` esté `VITE_MOCK_MODE=true`
- Reinicia el servidor si es necesario

## 📝 Datos de Prueba

Usa estos datos para crear facturas de prueba:

**Clientes disponibles en mock:**
- Roberto Morales (V-07519575-0)
- MOISES SERVICE (V-27853152-6)
- David (J-74567967-7)
- Comerciante (J-98765432-1)
- Alejandro (V-32135424-4)

**Productos disponibles:**
- Servicios IT, Hosting, Desarrollo Web
- Laptops, Mouse, Hardware POS
- Cursos, Dominios, Software

---

**¡Todo está listo para probar! 🎊**