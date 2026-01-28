# 📋 Instrucciones para Actualizar la App

Este documento explica cómo publicar una nueva versión de SMED Analyzer Pro y hacer que los usuarios la reciban automáticamente.

## 🎯 Resumen del Sistema

La aplicación ahora cuenta con un **sistema de actualización automática** que:
- ✅ Verifica actualizaciones automáticamente cada 30 minutos
- ✅ Notifica al usuario cuando hay nueva versión disponible
- ✅ Actualiza sin perder datos del LocalStorage
- ✅ Permite forzar actualización manual si hay problemas

## 📁 Archivos Importantes

### 1. `version.json` (En el servidor)
Este archivo debe estar en **https://smed.crgm.app/version.json**

```json
{
  "version": "2.2",
  "fecha": "2026-01-28",
  "changelog": [
    "✨ Descripción de mejora 1",
    "🔄 Descripción de mejora 2",
    "🐛 Bug fix 3"
  ],
  "minVersion": "2.0",
  "forceUpdate": false,
  "updateURL": "https://smed.crgm.app/"
}
```

### 2. `sw.js` (Service Worker)
Contiene la versión del caché:
```javascript
const VERSION = '2.2';
const CACHE_NAME = `smed-analyzer-v${VERSION}`;
```

### 3. `js/updater.js`
Contiene la versión actual:
```javascript
CURRENT_VERSION: '2.1'
```

### 4. `js/app.js`
Contiene el número de versión:
```javascript
const SOPORTE = {
    email: 'smed@crgm.app',
    dominio: 'https://smed.crgm.app',
    version: '2.1',
    fecha: '26 Enero 2026'
};
```

## 🚀 Pasos para Publicar una Nueva Versión

### Paso 1: Actualizar Números de Versión

Cambiar la versión en **4 archivos**:

**1. `js/app.js`**
```javascript
version: '2.2',  // ← Cambiar aquí
fecha: '28 Enero 2026'  // ← Actualizar fecha
```

**2. `js/updater.js`**
```javascript
CURRENT_VERSION: '2.2',  // ← Cambiar aquí
```

**3. `sw.js`**
```javascript
const VERSION = '2.2';  // ← Cambiar aquí
```

**4. `version.json`**
```json
{
  "version": "2.2",  // ← Cambiar aquí
  "fecha": "2026-01-28",
  "changelog": [
    "✨ Nueva característica X",
    "🔄 Mejora Y",
    "🐛 Fix Z"
  ]
}
```

### Paso 2: Subir Archivos al Servidor

1. **Subir PRIMERO** el archivo `version.json` a:
   ```
   https://smed.crgm.app/version.json
   ```

2. **Luego subir** todos los demás archivos:
   - `index.html`
   - `js/app.js`
   - `js/updater.js`
   - `sw.js`
   - Cualquier otro archivo modificado

### Paso 3: Probar la Actualización

1. Abre la app en un navegador donde ya la tengas instalada
2. Ve a la pestaña **Configuración**
3. Haz clic en **"🔍 Buscar Actualizaciones"**
4. Deberías ver el panel verde con la nueva versión disponible
5. Haz clic en **"🚀 Actualizar Ahora"**
6. La app se recargará con la nueva versión
7. Verifica que tus datos sigan ahí

## 🔧 Troubleshooting

### Los usuarios no ven la actualización

**Problema:** El navegador cachea `version.json`

**Solución:** El sistema ya incluye `?t=timestamp` para evitar caché, pero si persiste:
1. Pide al usuario que use el botón **"🔧 Forzar Actualización"**
2. Esto limpiará completamente el caché y descargará todo de nuevo

### La actualización falla

**Problema:** Error al aplicar actualización

**Solución:**
1. Verificar que `version.json` sea accesible desde el navegador
2. Verificar que el CORS permita acceder al archivo
3. Usar el botón "Forzar Actualización"

### Los datos se borran

**Problema:** (Esto NO debería pasar)

**Solución:**
- El sistema crea backup automático antes de actualizar
- Ir a Config → "📦 Restaurar Backup"
- Los datos están en LocalStorage y nunca se borran

## 📊 Changelog Guidelines

Usa emojis para categorizar los cambios:

- ✨ Nueva funcionalidad
- 🔄 Mejora existente
- 🐛 Bug fix / Corrección
- 🎨 Cambios visuales / UI
- ⚡ Mejoras de rendimiento
- 🔒 Seguridad
- 📝 Documentación

**Ejemplo:**
```json
"changelog": [
  "✨ Sistema de actualización automática",
  "🔄 Mejora en filtros de fecha",
  "🐛 Fix en exportación CSV",
  "🎨 Nuevo diseño de botones"
]
```

## 🎯 Checklist de Publicación

Antes de subir una nueva versión, verificar:

- [ ] ¿Actualicé el número de versión en los 4 archivos?
- [ ] ¿Actualicé la fecha en `app.js` y `version.json`?
- [ ] ¿Escribí un changelog claro y descriptivo?
- [ ] ¿Probé localmente que funciona?
- [ ] ¿Subí primero `version.json`?
- [ ] ¿Subí todos los archivos modificados?
- [ ] ¿Probé la actualización en un navegador?
- [ ] ¿Verifiqué que los datos no se pierden?

## 🔐 Seguridad de Datos

El sistema está diseñado para **NUNCA** borrar datos:

1. **LocalStorage permanece intacto** durante actualizaciones
2. **Backup automático** se crea antes de actualizar
3. **Service Worker y caché** se limpian, pero LocalStorage NO
4. Los usuarios pueden restaurar desde backup en cualquier momento

## 📱 Para Usuarios Finales

Si un usuario tiene problemas para actualizar:

1. **Ir a Configuración**
2. **Botón "🔍 Buscar Actualizaciones"** - verifica nueva versión
3. **Botón "🔧 Forzar Actualización"** - limpia caché y recarga

**IMPORTANTE:** Sus datos están seguros en LocalStorage y no se borrarán.

## 🎉 ¡Listo!

Con este sistema, los usuarios ya no necesitarán:
- ❌ Borrar datos de Chrome manualmente
- ❌ Desinstalar y reinstalar la app
- ❌ Limpiar caché manualmente
- ❌ Preocuparse por perder sus datos

Todo es automático y seguro! 🚀

---

**Versión de este documento:** 1.0  
**Fecha:** 28 Enero 2026  
**Autor:** Sistema de Actualización Automática v2.2
