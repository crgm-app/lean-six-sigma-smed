/**
 * SMED Analyzer Pro - Módulo de Sincronización con Google Drive
 * Backup automático, sincronización multi-dispositivo y colaboración en tiempo real
 * v2.0 - Con fusión de datos y sincronización bidireccional
 */

// =====================================================
// CONFIGURACIÓN DE GOOGLE
// =====================================================

const GOOGLE_CONFIG = {
    CLIENT_ID: '580144782102-r7glsokidfbp56hmgh5bjc1c8ft1leu9.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    FOLDER_NAME: 'SMED_Analyzer_Pro',
    BACKUP_FILE: 'smed_backup.json',
    SYNC_INTERVAL: 2 * 60 * 1000  // Cada 2 minutos para colaboración activa
};

// =====================================================
// MÓDULO GOOGLE DRIVE - MEJORADO
// =====================================================

const GoogleDrive = {
    // Estado de autenticación
    isSignedIn: false,
    tokenClient: null,
    accessToken: null,
    gapiInited: false,
    gisInited: false,
    userEmail: null,
    folderId: null,
    backupFileId: null,
    autoSyncInterval: null,
    lastRemoteModified: null,
    isSyncing: false,
    
    // Inicializar Google API
    init: async () => {
        // Cargar las librerías
        await GoogleDrive.loadGapiScript();
        await GoogleDrive.loadGisScript();
        
        // Recuperar IDs guardados de sesiones anteriores
        GoogleDrive.folderId = localStorage.getItem('smed_drive_folder_id') || null;
        GoogleDrive.backupFileId = localStorage.getItem('smed_drive_file_id') || null;
        
        // Verificar si hay token guardado
        const savedToken = localStorage.getItem('smed_google_token');
        if (savedToken) {
            try {
                GoogleDrive.accessToken = savedToken;
                await GoogleDrive.validateToken();
            } catch (e) {
                console.log('Token expirado, necesita reautenticar');
                localStorage.removeItem('smed_google_token');
                GoogleDrive.folderId = null;
                GoogleDrive.backupFileId = null;
            }
        }
        
        GoogleDrive.updateUI();
    },
    
    // Cargar script de GAPI
    loadGapiScript: () => {
        return new Promise((resolve, reject) => {
            if (window.gapi) {
                GoogleDrive.initGapi().then(resolve);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => GoogleDrive.initGapi().then(resolve);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    // Cargar script de GIS (Google Identity Services)
    loadGisScript: () => {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts) {
                GoogleDrive.initGis();
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.onload = () => {
                GoogleDrive.initGis();
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    // Inicializar GAPI
    initGapi: async () => {
        await new Promise((resolve) => gapi.load('client', resolve));
        await gapi.client.init({});
        GoogleDrive.gapiInited = true;
        console.log('✅ GAPI inicializado');
    },
    
    // Inicializar GIS (Google Identity Services)
    initGis: () => {
        GoogleDrive.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: (response) => {
                if (response.error) {
                    console.error('Error de autenticación:', response.error);
                    return;
                }
                GoogleDrive.accessToken = response.access_token;
                localStorage.setItem('smed_google_token', response.access_token);
                GoogleDrive.isSignedIn = true;
                GoogleDrive.onSignIn();
            }
        });
        GoogleDrive.gisInited = true;
        console.log('✅ GIS inicializado');
    },
    
    // Login con Google
    signIn: () => {
        if (!GoogleDrive.tokenClient) {
            alert('Error: Google API no inicializada. Recarga la página.');
            return;
        }
        
        GoogleDrive.tokenClient.requestAccessToken({
            prompt: 'consent'
        });
    },
    
    // Logout
    signOut: () => {
        if (GoogleDrive.accessToken) {
            google.accounts.oauth2.revoke(GoogleDrive.accessToken);
        }
        GoogleDrive.accessToken = null;
        GoogleDrive.isSignedIn = false;
        GoogleDrive.userEmail = null;
        // NO borrar folderId/backupFileId - pueden ser útiles si se reconecta
        localStorage.removeItem('smed_google_token');
        
        if (GoogleDrive.autoSyncInterval) {
            clearInterval(GoogleDrive.autoSyncInterval);
        }
        
        GoogleDrive.updateUI();
        console.log('👋 Sesión cerrada');
    },
    
    // Callback después de login exitoso
    onSignIn: async () => {
        try {
            GoogleDrive.updateUI();
            const statusEl = document.getElementById('googleDriveStatus');
            if (statusEl) statusEl.innerHTML = '<span style="color:#f59e0b;">⏳ Conectando...</span>';
            
            // Obtener info del usuario
            const userInfo = await GoogleDrive.fetchUserInfo();
            GoogleDrive.userEmail = userInfo?.email || 'Usuario';
            console.log('👤 Usuario obtenido:', GoogleDrive.userEmail);
            
            // Buscar o usar carpeta existente (propia o compartida)
            GoogleDrive.folderId = await GoogleDrive.findOrCreateFolder();
            localStorage.setItem('smed_drive_folder_id', GoogleDrive.folderId);
            
            // Buscar archivo de backup existente
            GoogleDrive.backupFileId = await GoogleDrive.findBackupFile();
            if (GoogleDrive.backupFileId) {
                localStorage.setItem('smed_drive_file_id', GoogleDrive.backupFileId);
            }
            
            // Sincronizar datos (bidireccional)
            await GoogleDrive.syncData();
            
            // Iniciar auto-sync colaborativo
            GoogleDrive.startAutoSync();
            
            GoogleDrive.updateUI();
            
            console.log(`✅ Conectado como: ${GoogleDrive.userEmail}`);
            alert(`✅ Conectado como: ${GoogleDrive.userEmail}\n\n🔄 Sincronización colaborativa activa cada 2 minutos.`);
            
        } catch (error) {
            console.error('Error en onSignIn:', error);
            alert('Error al conectar con Google Drive: ' + error.message);
        }
    },
    
    // Validar token existente
    validateToken: async () => {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + GoogleDrive.accessToken);
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        GoogleDrive.isSignedIn = true;
        await GoogleDrive.onSignIn();
    },
    
    // Obtener info del usuario
    fetchUserInfo: async () => {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` }
        });
        return response.json();
    },
    
    // =====================================================
    // BUSCAR CARPETA - MEJORADO PARA EVITAR DUPLICADOS
    // =====================================================
    findOrCreateFolder: async () => {
        // 1. Si ya tenemos un folderId guardado, verificar que existe
        if (GoogleDrive.folderId) {
            const exists = await GoogleDrive.checkFolderExists(GoogleDrive.folderId);
            if (exists) {
                console.log('📁 Usando carpeta guardada:', GoogleDrive.folderId);
                return GoogleDrive.folderId;
            }
        }
        
        // 2. Buscar carpeta PROPIA con ese nombre (no compartida)
        const ownedFolder = await GoogleDrive.searchFolder(false);
        if (ownedFolder) {
            console.log('📁 Carpeta propia encontrada:', ownedFolder);
            return ownedFolder;
        }
        
        // 3. Buscar carpeta COMPARTIDA conmigo
        const sharedFolder = await GoogleDrive.searchFolder(true);
        if (sharedFolder) {
            console.log('📁 Carpeta compartida encontrada:', sharedFolder);
            return sharedFolder;
        }
        
        // 4. Si no existe ninguna, crear una nueva
        const newFolder = await GoogleDrive.createFolder();
        console.log('📁 Carpeta nueva creada:', newFolder);
        return newFolder;
    },
    
    // Verificar si una carpeta existe
    checkFolderExists: async (folderId) => {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,trashed`,
                { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
            );
            if (!response.ok) return false;
            const data = await response.json();
            return !data.trashed;
        } catch (e) {
            return false;
        }
    },
    
    // Buscar carpeta (propia o compartida)
    searchFolder: async (sharedWithMe = false) => {
        // Construir query según tipo de búsqueda
        let query = `name='${GOOGLE_CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        
        if (sharedWithMe) {
            query += ` and sharedWithMe=true`;
        } else {
            query += ` and 'me' in owners`;
        }
        
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,owners)`,
            { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
        );
        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
            // Devolver la más reciente si hay varias
            return data.files[0].id;
        }
        return null;
    },
    
    // Crear carpeta nueva
    createFolder: async () => {
        const response = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GoogleDrive.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: GOOGLE_CONFIG.FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder'
            })
        });
        const data = await response.json();
        return data.id;
    },
    
    // =====================================================
    // BUSCAR ARCHIVO BACKUP
    // =====================================================
    findBackupFile: async () => {
        // Si ya tenemos ID guardado, verificar que existe
        if (GoogleDrive.backupFileId) {
            const exists = await GoogleDrive.checkFileExists(GoogleDrive.backupFileId);
            if (exists) {
                return GoogleDrive.backupFileId;
            }
        }
        
        // Buscar en la carpeta
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_CONFIG.BACKUP_FILE}' and '${GoogleDrive.folderId}' in parents and trashed=false&fields=files(id,modifiedTime)`,
            { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
        );
        const data = await response.json();
        
        if (data.files && data.files.length > 0) {
            // Guardar fecha de modificación para comparar
            GoogleDrive.lastRemoteModified = data.files[0].modifiedTime;
            console.log('📄 Archivo backup encontrado:', data.files[0].id);
            return data.files[0].id;
        }
        return null;
    },
    
    // Verificar si un archivo existe
    checkFileExists: async (fileId) => {
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,trashed`,
                { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
            );
            if (!response.ok) return false;
            const data = await response.json();
            return !data.trashed;
        } catch (e) {
            return false;
        }
    },
    
    // =====================================================
    // SINCRONIZACIÓN BIDIRECCIONAL (PULL + PUSH + MERGE)
    // =====================================================
    syncData: async (showAlert = false) => {
        if (GoogleDrive.isSyncing) {
            console.log('⏳ Sincronización ya en progreso...');
            return;
        }
        
        GoogleDrive.isSyncing = true;
        
        try {
            // Si no hay archivo remoto, solo subir
            if (!GoogleDrive.backupFileId) {
                await GoogleDrive.saveBackup(showAlert);
                return;
            }
            
            // Obtener metadatos del archivo remoto
            const metaResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${GoogleDrive.backupFileId}?fields=modifiedTime`,
                { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
            );
            const metadata = await metaResponse.json();
            const remoteModified = new Date(metadata.modifiedTime);
            const lastSync = localStorage.getItem('smed_last_sync');
            const localLastSync = lastSync ? new Date(lastSync) : new Date(0);
            
            // Si el archivo remoto es más reciente que nuestra última sincronización
            if (remoteModified > localLastSync) {
                console.log('📥 Datos remotos más recientes, descargando y fusionando...');
                await GoogleDrive.pullAndMerge();
            }
            
            // Subir datos locales (fusionados)
            await GoogleDrive.saveBackup(false);
            
            if (showAlert) {
                alert('✅ Sincronización completada');
            }
            
        } catch (error) {
            console.error('Error en syncData:', error);
        } finally {
            GoogleDrive.isSyncing = false;
        }
    },
    
    // Descargar datos remotos y fusionar con locales
    pullAndMerge: async () => {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${GoogleDrive.backupFileId}?alt=media`,
            { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
        );
        
        const remoteData = await response.json();
        const remoteRegistros = remoteData.registros || [];
        const localRegistros = AppState.registros || [];
        
        // FUSIONAR registros por ID (evita duplicados)
        const merged = GoogleDrive.mergeRegistros(localRegistros, remoteRegistros);
        
        // Actualizar AppState
        AppState.registros = merged;
        
        // Fusionar botones si hay nuevos
        if (remoteData.buttons && remoteData.buttons.length > 0) {
            AppState.buttons = GoogleDrive.mergeButtons(AppState.buttons, remoteData.buttons);
        }
        
        // Guardar localmente
        Storage.save();
        UI.renderAll();
        
        console.log(`🔀 Fusionados: ${localRegistros.length} local + ${remoteRegistros.length} remoto = ${merged.length} total`);
    },
    
    // Fusionar registros por ID (sin duplicados)
    mergeRegistros: (local, remote) => {
        const merged = new Map();
        
        // Agregar registros locales
        local.forEach(r => {
            merged.set(r.id, r);
        });
        
        // Agregar/actualizar con registros remotos
        remote.forEach(r => {
            if (!merged.has(r.id)) {
                // Registro nuevo del remoto
                merged.set(r.id, r);
            } else {
                // Si existe, mantener el más reciente (por timestamp)
                const existing = merged.get(r.id);
                const existingTime = existing.timestamp || 0;
                const remoteTime = r.timestamp || 0;
                if (remoteTime > existingTime) {
                    merged.set(r.id, r);
                }
            }
        });
        
        // Convertir Map a array y ordenar por timestamp (más reciente primero)
        return Array.from(merged.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },
    
    // Fusionar botones (por nombre)
    mergeButtons: (local, remote) => {
        const merged = new Map();
        
        local.forEach(b => merged.set(b.name, b));
        
        remote.forEach(b => {
            if (!merged.has(b.name)) {
                merged.set(b.name, b);
            }
        });
        
        return Array.from(merged.values());
    },
    
    // =====================================================
    // GUARDAR BACKUP
    // =====================================================
    saveBackup: async (showAlert = true) => {
        if (!GoogleDrive.isSignedIn) {
            if (showAlert) alert('⚠️ No estás conectado a Google Drive');
            return false;
        }
        
        try {
            const backupData = {
                version: '2.1',
                fecha: new Date().toISOString(),
                email: GoogleDrive.userEmail,
                registros: AppState.registros,
                buttons: AppState.buttons,
                config: AppState.config
            };
            
            const content = JSON.stringify(backupData, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            
            if (GoogleDrive.backupFileId) {
                // Actualizar archivo existente
                await GoogleDrive.updateFile(GoogleDrive.backupFileId, blob);
            } else {
                // Crear archivo nuevo
                GoogleDrive.backupFileId = await GoogleDrive.createFile(GOOGLE_CONFIG.BACKUP_FILE, blob);
                localStorage.setItem('smed_drive_file_id', GoogleDrive.backupFileId);
            }
            
            // Actualizar fecha de última sincronización
            localStorage.setItem('smed_last_sync', new Date().toISOString());
            GoogleDrive.updateUI();
            
            console.log('☁️ Backup guardado en Google Drive');
            if (showAlert) alert('✅ Backup guardado en Google Drive');
            return true;
            
        } catch (error) {
            console.error('Error guardando backup:', error);
            if (showAlert) alert('❌ Error guardando backup: ' + error.message);
            return false;
        }
    },
    
    // Crear archivo en Drive
    createFile: async (fileName, blob) => {
        const metadata = {
            name: fileName,
            parents: [GoogleDrive.folderId]
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` },
            body: form
        });
        
        const data = await response.json();
        return data.id;
    },
    
    // Actualizar archivo existente en Drive
    updateFile: async (fileId, blob) => {
        const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${GoogleDrive.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: blob
        });
        
        if (!response.ok) {
            throw new Error('Error actualizando archivo');
        }
    },
    
    // =====================================================
    // CARGAR BACKUP MANUAL
    // =====================================================
    loadBackup: async () => {
        if (!GoogleDrive.isSignedIn) {
            alert('⚠️ No estás conectado a Google Drive');
            return false;
        }
        
        if (!GoogleDrive.backupFileId) {
            // Intentar buscar archivo
            GoogleDrive.backupFileId = await GoogleDrive.findBackupFile();
            if (!GoogleDrive.backupFileId) {
                alert('⚠️ No hay backup en Google Drive');
                return false;
            }
        }
        
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${GoogleDrive.backupFileId}?alt=media`,
                { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
            );
            
            const data = await response.json();
            
            const registrosActuales = AppState.registros.length;
            const registrosNube = data.registros?.length || 0;
            
            const opcion = prompt(`📥 Backup encontrado:\n\n- Fecha: ${new Date(data.fecha).toLocaleString()}\n- Registros en nube: ${registrosNube}\n- Registros locales: ${registrosActuales}\n\n¿Qué deseas hacer?\n\n1 = REEMPLAZAR locales con nube\n2 = FUSIONAR (combinar ambos)\n0 = Cancelar`);
            
            if (opcion === '1') {
                // Reemplazar
                AppState.registros = data.registros || [];
                AppState.buttons = data.buttons || AppState.buttons;
                if (data.config) AppState.config = { ...AppState.config, ...data.config };
                
                Storage.save();
                UI.renderAll();
                alert('✅ Datos reemplazados desde Google Drive');
                
            } else if (opcion === '2') {
                // Fusionar
                const merged = GoogleDrive.mergeRegistros(AppState.registros, data.registros || []);
                AppState.registros = merged;
                AppState.buttons = GoogleDrive.mergeButtons(AppState.buttons, data.buttons || []);
                
                Storage.save();
                UI.renderAll();
                alert(`✅ Datos fusionados: ${merged.length} registros totales`);
                
                // Subir la versión fusionada
                await GoogleDrive.saveBackup(false);
            }
            
            return true;
            
        } catch (error) {
            console.error('Error cargando backup:', error);
            alert('❌ Error cargando backup: ' + error.message);
        }
        return false;
    },
    
    // =====================================================
    // AUTO-SYNC COLABORATIVO
    // =====================================================
    startAutoSync: () => {
        if (GoogleDrive.autoSyncInterval) {
            clearInterval(GoogleDrive.autoSyncInterval);
        }
        
        // Sincronización cada 2 minutos para colaboración activa
        GoogleDrive.autoSyncInterval = setInterval(async () => {
            if (GoogleDrive.isSignedIn) {
                console.log('🔄 Auto-sync colaborativo ejecutando...');
                await GoogleDrive.syncData(false);
            }
        }, GOOGLE_CONFIG.SYNC_INTERVAL);
        
        console.log(`🔄 Auto-sync colaborativo iniciado (cada ${GOOGLE_CONFIG.SYNC_INTERVAL / 60000} min)`);
    },
    
    // Forzar sincronización manual
    forceSync: async () => {
        if (!GoogleDrive.isSignedIn) {
            alert('⚠️ No estás conectado a Google Drive');
            return;
        }
        
        document.getElementById('googleDriveStatus').innerHTML = '<span style="color:#f59e0b;">🔄 Sincronizando...</span>';
        await GoogleDrive.syncData(true);
        GoogleDrive.updateUI();
    },
    
    // =====================================================
    // COMPARTIR CON COLABORADORES
    // =====================================================
    shareWith: async (email) => {
        if (!GoogleDrive.isSignedIn || !GoogleDrive.folderId) {
            alert('⚠️ Debes estar conectado a Google Drive');
            return false;
        }
        
        if (!email || !email.includes('@')) {
            alert('⚠️ Ingresa un email válido');
            return false;
        }
        
        try {
            // Compartir la CARPETA con permisos de escritura
            const folderResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${GoogleDrive.folderId}/permissions`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${GoogleDrive.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'user',
                        role: 'writer',
                        emailAddress: email
                    })
                }
            );
            
            if (!folderResponse.ok) {
                const error = await folderResponse.json();
                throw new Error(error.error?.message || 'Error compartiendo carpeta');
            }
            
            // También compartir el ARCHIVO de backup si existe
            if (GoogleDrive.backupFileId) {
                await fetch(
                    `https://www.googleapis.com/drive/v3/files/${GoogleDrive.backupFileId}/permissions`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${GoogleDrive.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            type: 'user',
                            role: 'writer',
                            emailAddress: email
                        })
                    }
                );
            }
            
            alert(`✅ Compartido con ${email}\n\n📋 Instrucciones para el colaborador:\n\n1. Abrir SMED Analyzer Pro\n2. Ir a Config → Google Drive\n3. Conectar con su cuenta de Google\n4. La app detectará automáticamente la carpeta compartida\n5. Los datos se sincronizarán cada 2 minutos`);
            return true;
            
        } catch (error) {
            console.error('Error compartiendo:', error);
            alert('❌ Error al compartir: ' + error.message);
            return false;
        }
    },
    
    // =====================================================
    // ACTUALIZAR UI
    // =====================================================
    updateUI: () => {
        const statusEl = document.getElementById('googleDriveStatus');
        const emailEl = document.getElementById('googleEmail');
        const lastSyncEl = document.getElementById('lastSyncTime');
        const loginBtn = document.getElementById('googleLoginBtn');
        const logoutBtn = document.getElementById('googleLogoutBtn');
        const syncBtns = document.getElementById('googleSyncBtns');
        
        if (GoogleDrive.isSignedIn) {
            if (statusEl) statusEl.innerHTML = '<span style="color:#00ff9d;">✅ Conectado</span>';
            if (emailEl) emailEl.textContent = GoogleDrive.userEmail || '';
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (syncBtns) syncBtns.style.display = 'flex';
            
            const lastSync = localStorage.getItem('smed_last_sync');
            if (lastSyncEl && lastSync) {
                lastSyncEl.textContent = new Date(lastSync).toLocaleString();
            }
        } else {
            if (statusEl) statusEl.innerHTML = '<span style="color:#888;">❌ No conectado</span>';
            if (emailEl) emailEl.textContent = '';
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (syncBtns) syncBtns.style.display = 'none';
        }
    }
};

// Exponer globalmente
window.GoogleDrive = GoogleDrive;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => GoogleDrive.init(), 500);
});
