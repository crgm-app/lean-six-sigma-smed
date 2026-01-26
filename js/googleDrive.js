/**
 * SMED Analyzer Pro - Módulo de Sincronización con Google Drive
 * Backup automático y sincronización multi-dispositivo
 */

// =====================================================
// CONFIGURACIÓN DE GOOGLE
// =====================================================

const GOOGLE_CONFIG = {
    CLIENT_ID: '580144782102-r7glsokidfbp56hmgh5bjc1c8ft1leu9.apps.googleusercontent.com',
    SCOPES: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    FOLDER_NAME: 'SMED_Analyzer_Pro',
    BACKUP_FILE: 'smed_backup.json'
};

// =====================================================
// MÓDULO GOOGLE DRIVE
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
    
    // Inicializar Google API
    init: async () => {
        // Cargar la librería GAPI
        await GoogleDrive.loadGapiScript();
        await GoogleDrive.loadGisScript();
        
        // Verificar si hay token guardado
        const savedToken = localStorage.getItem('smed_google_token');
        if (savedToken) {
            try {
                GoogleDrive.accessToken = savedToken;
                await GoogleDrive.validateToken();
            } catch (e) {
                console.log('Token expirado, necesita reautenticar');
                localStorage.removeItem('smed_google_token');
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
        GoogleDrive.folderId = null;
        GoogleDrive.backupFileId = null;
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
            // Obtener info del usuario
            const userInfo = await GoogleDrive.fetchUserInfo();
            GoogleDrive.userEmail = userInfo.email;
            
            // Buscar o crear carpeta de la app
            GoogleDrive.folderId = await GoogleDrive.findOrCreateFolder();
            
            // Buscar archivo de backup existente
            GoogleDrive.backupFileId = await GoogleDrive.findBackupFile();
            
            // Iniciar auto-sync
            GoogleDrive.startAutoSync();
            
            GoogleDrive.updateUI();
            
            console.log(`✅ Conectado como: ${GoogleDrive.userEmail}`);
            alert(`✅ Conectado como: ${GoogleDrive.userEmail}\n\nLa sincronización automática está activa.`);
            
        } catch (error) {
            console.error('Error en onSignIn:', error);
            alert('Error al conectar con Google Drive. Intenta de nuevo.');
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
    
    // Buscar o crear carpeta de la app en Drive
    findOrCreateFolder: async () => {
        // Buscar carpeta existente
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_CONFIG.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
        );
        const searchData = await searchResponse.json();
        
        if (searchData.files && searchData.files.length > 0) {
            console.log('📁 Carpeta encontrada:', searchData.files[0].id);
            return searchData.files[0].id;
        }
        
        // Crear carpeta nueva
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
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
        const createData = await createResponse.json();
        console.log('📁 Carpeta creada:', createData.id);
        return createData.id;
    },
    
    // Buscar archivo de backup existente
    findBackupFile: async () => {
        const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${GOOGLE_CONFIG.BACKUP_FILE}' and '${GoogleDrive.folderId}' in parents and trashed=false`,
            { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
        );
        const searchData = await searchResponse.json();
        
        if (searchData.files && searchData.files.length > 0) {
            console.log('📄 Archivo backup encontrado:', searchData.files[0].id);
            return searchData.files[0].id;
        }
        return null;
    },
    
    // Guardar backup en Google Drive
    saveBackup: async (showAlert = true) => {
        if (!GoogleDrive.isSignedIn) {
            if (showAlert) alert('⚠️ No estás conectado a Google Drive');
            return false;
        }
        
        try {
            const backupData = {
                version: '2.0',
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
    
    // Actualizar archivo en Drive
    updateFile: async (fileId, blob) => {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${GoogleDrive.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: blob
        });
    },
    
    // Cargar backup desde Google Drive
    loadBackup: async () => {
        if (!GoogleDrive.isSignedIn) {
            alert('⚠️ No estás conectado a Google Drive');
            return false;
        }
        
        if (!GoogleDrive.backupFileId) {
            alert('⚠️ No hay backup en Google Drive');
            return false;
        }
        
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${GoogleDrive.backupFileId}?alt=media`,
                { headers: { 'Authorization': `Bearer ${GoogleDrive.accessToken}` } }
            );
            
            const data = await response.json();
            
            const registrosActuales = AppState.registros.length;
            const registrosNube = data.registros?.length || 0;
            
            if (confirm(`📥 Backup encontrado:\n\n- Fecha: ${new Date(data.fecha).toLocaleString()}\n- Registros en nube: ${registrosNube}\n- Registros locales: ${registrosActuales}\n\n¿Deseas cargar los datos de la nube?\n(Los datos locales se reemplazarán)`)) {
                AppState.registros = data.registros || [];
                AppState.buttons = data.buttons || AppState.buttons;
                if (data.config) AppState.config = { ...AppState.config, ...data.config };
                
                Storage.save();
                UI.renderAll();
                
                alert('✅ Datos restaurados desde Google Drive');
                return true;
            }
        } catch (error) {
            console.error('Error cargando backup:', error);
            alert('❌ Error cargando backup: ' + error.message);
        }
        return false;
    },
    
    // Iniciar sincronización automática
    startAutoSync: () => {
        // Sincronizar cada 5 minutos (300000 ms)
        const SYNC_INTERVAL = 5 * 60 * 1000;
        
        if (GoogleDrive.autoSyncInterval) {
            clearInterval(GoogleDrive.autoSyncInterval);
        }
        
        GoogleDrive.autoSyncInterval = setInterval(() => {
            if (GoogleDrive.isSignedIn && AppState.registros.length > 0) {
                console.log('🔄 Auto-sync ejecutando...');
                GoogleDrive.saveBackup(false);
            }
        }, SYNC_INTERVAL);
        
        console.log('🔄 Auto-sync iniciado (cada 5 min)');
    },
    
    // Compartir carpeta con otro usuario
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
            const response = await fetch(
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
            
            if (response.ok) {
                alert(`✅ Carpeta compartida con ${email}\n\nEsta persona ahora puede ver y editar los datos.`);
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error?.message || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error compartiendo:', error);
            alert('❌ Error al compartir: ' + error.message);
            return false;
        }
    },
    
    // Actualizar UI
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
