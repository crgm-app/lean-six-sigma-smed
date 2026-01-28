/**
 * Sistema de Actualización Automática
 * Verifica y aplica actualizaciones de la app sin perder datos
 */

const AppUpdater = {
    // URL del archivo de versión remoto
    VERSION_URL: 'https://smed.crgm.app/version.json',
    
    // Versión actual de la app (debe coincidir con app.js)
    CURRENT_VERSION: '2.2',
    
    // Estado
    updateAvailable: false,
    remoteVersion: null,
    checking: false,
    
    /**
     * Verificar si hay una nueva versión disponible
     */
    checkForUpdates: async (showMessages = true) => {
        if (AppUpdater.checking) return;
        
        AppUpdater.checking = true;
        const statusEl = document.getElementById('updateStatus');
        const btnEl = document.getElementById('checkUpdateBtn');
        
        if (statusEl && showMessages) {
            statusEl.innerHTML = '<span style="color: #f59e0b;">⏳ Verificando actualizaciones...</span>';
        }
        
        if (btnEl) btnEl.disabled = true;
        
        try {
            // Agregar timestamp para evitar caché del navegador
            const response = await fetch(`${AppUpdater.VERSION_URL}?t=${Date.now()}`, {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const remoteData = await response.json();
            AppUpdater.remoteVersion = remoteData;
            
            // Comparar versiones
            const isNewer = AppUpdater.compareVersions(remoteData.version, AppUpdater.CURRENT_VERSION);
            
            if (isNewer) {
                AppUpdater.updateAvailable = true;
                AppUpdater.showUpdateUI(remoteData);
                
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: #10b981;">🎉 Nueva versión disponible: v${remoteData.version}</span>`;
                }
            } else {
                AppUpdater.updateAvailable = false;
                
                if (statusEl && showMessages) {
                    statusEl.innerHTML = `<span style="color: #10b981;">✅ Tienes la última versión (v${AppUpdater.CURRENT_VERSION})</span>`;
                }
            }
            
        } catch (error) {
            console.error('Error verificando actualizaciones:', error);
            
            if (statusEl && showMessages) {
                statusEl.innerHTML = `<span style="color: #ef4444;">❌ Error al verificar actualizaciones: ${error.message}</span>`;
            }
        } finally {
            AppUpdater.checking = false;
            if (btnEl) btnEl.disabled = false;
        }
    },
    
    /**
     * Comparar dos versiones (formato: "2.1", "2.2", etc)
     * Retorna true si v1 > v2
     */
    compareVersions: (v1, v2) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 > p2) return true;
            if (p1 < p2) return false;
        }
        
        return false; // Son iguales
    },
    
    /**
     * Mostrar UI de actualización disponible
     */
    showUpdateUI: (versionData) => {
        // Mostrar panel de actualización en Config
        const panel = document.getElementById('updatePanel');
        if (panel) {
            const changelogHTML = versionData.changelog.map(item => `<li>${item}</li>`).join('');
            
            panel.innerHTML = `
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #00ff9d;">
                    <h3 style="margin: 0 0 15px 0; color: white;">🎉 Nueva Versión Disponible</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;">
                            <div style="font-size: 0.9em; color: rgba(255,255,255,0.8);">Versión Actual</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: white;">v${AppUpdater.CURRENT_VERSION}</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 12px; border-radius: 8px;">
                            <div style="font-size: 0.9em; color: rgba(255,255,255,0.8);">Nueva Versión</div>
                            <div style="font-size: 1.5em; font-weight: bold; color: white;">v${versionData.version} ✨</div>
                        </div>
                    </div>
                    
                    <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: white;">📋 Novedades:</h4>
                        <ul style="margin: 0; padding-left: 20px; color: white;">
                            ${changelogHTML}
                        </ul>
                    </div>
                    
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button onclick="AppUpdater.applyUpdate()" style="flex: 1; padding: 12px 25px; background: white; color: #059669; border: none; border-radius: 8px; cursor: pointer; font-size: 1.1em; font-weight: bold;">
                            🚀 Actualizar Ahora
                        </button>
                        <button onclick="AppUpdater.dismissUpdate()" style="padding: 12px 20px; background: rgba(255,255,255,0.2); color: white; border: 1px solid white; border-radius: 8px; cursor: pointer;">
                            Más Tarde
                        </button>
                    </div>
                    
                    <p style="margin: 15px 0 0 0; font-size: 0.85em; color: rgba(255,255,255,0.8);">
                        💾 Se creará un backup automático antes de actualizar. Tus datos estarán seguros.
                    </p>
                </div>
            `;
            panel.style.display = 'block';
        }
        
        // Mostrar badge en el tab de Config
        AppUpdater.showUpdateBadge();
    },
    
    /**
     * Mostrar badge de actualización en el tab de Config
     */
    showUpdateBadge: () => {
        const configTab = document.querySelector('[data-tab="config"]');
        if (configTab && !configTab.querySelector('.update-badge')) {
            const badge = document.createElement('span');
            badge.className = 'update-badge';
            badge.textContent = '●';
            badge.style.cssText = 'color: #10b981; font-size: 1.5em; margin-left: 5px; animation: pulse 2s infinite;';
            configTab.appendChild(badge);
            
            // Agregar animación de pulso si no existe
            if (!document.getElementById('updateBadgeStyles')) {
                const style = document.createElement('style');
                style.id = 'updateBadgeStyles';
                style.textContent = `
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(1.2); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    },
    
    /**
     * Ocultar UI de actualización
     */
    dismissUpdate: () => {
        const panel = document.getElementById('updatePanel');
        if (panel) {
            panel.style.display = 'none';
        }
        
        // Remover badge
        const badge = document.querySelector('.update-badge');
        if (badge) badge.remove();
    },
    
    /**
     * Aplicar la actualización
     */
    applyUpdate: async () => {
        if (!AppUpdater.updateAvailable || !AppUpdater.remoteVersion) {
            alert('No hay actualización disponible');
            return;
        }
        
        // Confirmar con el usuario
        if (!confirm(`¿Actualizar de v${AppUpdater.CURRENT_VERSION} a v${AppUpdater.remoteVersion.version}?\n\nSe creará un backup automático de tus datos.`)) {
            return;
        }
        
        try {
            // 1. Crear backup de seguridad
            console.log('📦 Creando backup antes de actualizar...');
            if (typeof Storage !== 'undefined' && Storage.createBackup) {
                Storage.createBackup();
            }
            
            // 2. Limpiar Service Worker y caché
            console.log('🗑️ Limpiando Service Worker y caché...');
            await AppUpdater.clearServiceWorkerAndCache();
            
            // 3. Recargar la página para obtener la nueva versión
            console.log('🔄 Recargando aplicación...');
            
            // Mostrar mensaje de carga
            document.body.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0a0a0a; color: white; flex-direction: column; gap: 20px;">
                    <div style="font-size: 3em;">🔄</div>
                    <div style="font-size: 1.5em; font-weight: bold;">Actualizando a v${AppUpdater.remoteVersion.version}</div>
                    <div style="color: #888;">Por favor espera...</div>
                    <div style="width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                        <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #10b981, #00ff9d); animation: loading 1.5s infinite;"></div>
                    </div>
                </div>
                <style>
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                </style>
            `;
            
            // Forzar recarga completa después de un breve delay
            setTimeout(() => {
                window.location.reload(true);
            }, 1000);
            
        } catch (error) {
            console.error('Error aplicando actualización:', error);
            alert('❌ Error al aplicar la actualización: ' + error.message + '\n\nIntenta el botón "Forzar Actualización" en Configuración.');
        }
    },
    
    /**
     * Limpiar Service Worker y todo el caché
     */
    clearServiceWorkerAndCache: async () => {
        // Limpiar todos los cachés
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('✅ Cachés limpiados:', cacheNames.length);
        }
        
        // Desregistrar Service Worker
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => registration.unregister())
            );
            console.log('✅ Service Workers desregistrados:', registrations.length);
        }
    },
    
    /**
     * Forzar actualización manual (botón de emergencia)
     */
    forceUpdate: async () => {
        if (!confirm('⚠️ Esto limpiará el Service Worker y la caché de la aplicación.\n\n✅ LocalStorage (tus datos) NO se borrará.\n\n¿Continuar?')) {
            return;
        }
        
        try {
            // Crear backup
            console.log('📦 Creando backup de seguridad...');
            if (typeof Storage !== 'undefined' && Storage.createBackup) {
                Storage.createBackup();
            }
            
            // Limpiar Service Worker y caché
            console.log('🗑️ Limpiando Service Worker y caché...');
            await AppUpdater.clearServiceWorkerAndCache();
            
            // Mostrar mensaje de éxito
            alert('✅ Limpieza completada.\n\nLa página se recargará para obtener la última versión.');
            
            // Recargar forzando descarga desde servidor
            window.location.reload(true);
            
        } catch (error) {
            console.error('Error en actualización forzada:', error);
            alert('❌ Error: ' + error.message + '\n\nPuedes intentar borrar los datos del sitio manualmente desde la configuración de Chrome.');
        }
    },
    
    /**
     * Inicializar el sistema de actualización
     */
    init: () => {
        console.log('🔄 Sistema de actualización inicializado');
        
        // Verificar actualizaciones al iniciar (silenciosamente)
        setTimeout(() => {
            AppUpdater.checkForUpdates(false);
        }, 3000); // Esperar 3 segundos después de cargar la app
        
        // Verificar periódicamente cada 30 minutos
        setInterval(() => {
            AppUpdater.checkForUpdates(false);
        }, 30 * 60 * 1000);
    }
};

// Exponer globalmente
window.AppUpdater = AppUpdater;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', AppUpdater.init);
} else {
    AppUpdater.init();
}
