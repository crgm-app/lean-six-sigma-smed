/**
 * SMED Analyzer Pro - Aplicación Principal
 * Metodología: Lean Manufacturing + Six Sigma
 * Versión: 1.0
 */

// =====================================================
// CONFIGURACIÓN Y CONSTANTES
// =====================================================

// Colores predefinidos para categorías dinámicas
const COLORES_CATEGORIAS = [
    '#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#14b8a6', 
    '#ef4444', '#f59e0b', '#ec4899', '#06b6d4', '#dc2626',
    '#6366f1', '#84cc16', '#22c55e', '#a855f7', '#0ea5e9'
];

// Tipos de actividad SMED
const TIPOS_ACTIVIDAD = {
    'INT': { nombre: 'Interna', desc: 'Máquina parada', color: '#f97316' },
    'EXT': { nombre: 'Externa', desc: 'Máquina en marcha', color: '#10b981' },
    'NVA': { nombre: 'Muda/NVA', desc: 'No Valor Agregado', color: '#ef4444' }
};

// Mapa de colores por categoría (se genera dinámicamente)
const categoryColors = {};

const COSTO_HORA_DEFAULT = 500; // GTQ por hora

// Lista de máquinas por defecto
const MAQUINAS_DEFAULT = ['i4', 'i5', 'i6', 'i8', 'i10', 'i11', 'i12', 'i13', 'i14', 'i15', 'i16', 'i17'];

// =====================================================
// SISTEMA DE ROTACIÓN DE TURNOS (Ciclo de 3 semanas)
// =====================================================

// Fecha base: Domingo 26 enero 2026 (semana 1 del ciclo)
const SEMANA_BASE = new Date(2026, 0, 26);

const TurnoManager = {
    // Horarios de cada jornada
    HORARIOS: {
        M: { nombre: 'Mañana', inicio: 6, fin: 14 },
        T: { nombre: 'Tarde', inicio: 14, fin: 21 },
        N: { nombre: 'Noche', inicio: 21, fin: 6 }
    },
    
    // Rotación: cada fila es una semana del ciclo
    // Columnas: M=Mañana, T=Tarde, N=Noche -> qué turno trabaja
    ROTACION: [
        { M: 'T1', T: 'T2', N: 'T3' }, // Semana 1 (actual)
        { M: 'T2', T: 'T3', N: 'T1' }, // Semana 2
        { M: 'T3', T: 'T1', N: 'T2' }  // Semana 3
    ],
    
    // Obtener semana del ciclo (0, 1, o 2)
    getSemanaDelCiclo: (fecha = new Date()) => {
        const ms = fecha.getTime() - SEMANA_BASE.getTime();
        const dias = Math.floor(ms / (24 * 60 * 60 * 1000));
        const semanas = Math.floor(dias / 7);
        return ((semanas % 3) + 3) % 3; // Manejo de valores negativos
    },
    
    // Obtener horario actual (M, T, N)
    getHorarioActual: (fecha = new Date()) => {
        const hora = fecha.getHours();
        if (hora >= 6 && hora < 14) return 'M';
        if (hora >= 14 && hora < 21) return 'T';
        return 'N'; // 21:00 - 06:00
    },
    
    // Obtener turno que trabaja actualmente (T1, T2, T3)
    getTurnoActual: (fecha = new Date()) => {
        const semanaCiclo = TurnoManager.getSemanaDelCiclo(fecha);
        const horario = TurnoManager.getHorarioActual(fecha);
        return TurnoManager.ROTACION[semanaCiclo][horario];
    },
    
    // Obtener info completa del turno actual
    getInfoTurno: (fecha = new Date()) => {
        const turno = TurnoManager.getTurnoActual(fecha);
        const horario = TurnoManager.getHorarioActual(fecha);
        const semana = TurnoManager.getSemanaDelCiclo(fecha) + 1;
        const horarioInfo = TurnoManager.HORARIOS[horario];
        
        return {
            turno: turno,
            horario: horario,
            nombreHorario: horarioInfo.nombre,
            semanaCiclo: semana,
            horaInicio: horarioInfo.inicio,
            horaFin: horarioInfo.fin
        };
    },
    
    // Auto-seleccionar turno en el UI
    autoSelectTurno: () => {
        const turnoActual = TurnoManager.getTurnoActual();
        const select = document.getElementById('opTurno');
        if (select) {
            select.value = turnoActual;
            AppState.opActiva.turno = turnoActual;
        }
        
        // Actualizar indicador de turno
        const infoEl = document.getElementById('turnoInfo');
        if (infoEl) {
            const info = TurnoManager.getInfoTurno();
            infoEl.innerHTML = `<small style="color:#00ff9d;">Sem.${info.semanaCiclo} | ${info.nombreHorario}</small>`;
        }
    }
};

// Exponer globalmente
window.TurnoManager = TurnoManager;

// =====================================================
// ESTADO DE LA APLICACIÓN
// =====================================================

const AppState = {
    // Registros de actividades cerradas
    registros: [],
    
    // Timers activos por categoría { categoria: { start, btnName, activityName } }
    activeTimers: {},
    
    // Configuración de botones
    buttons: [],
    
    // Botones libres (hasta 5+)
    freeButtons: [],
    
    // OP (Orden de Producción) activa - contenedor del cambio de formato
    opActiva: {
        numero: '',      // Número de OP (ej: "40005000")
        colores: 1,      // Cantidad de colores del pedido
        turno: 'T1',     // Turno: T1, T2, T3
        maquina: ''      // Máquina: i4, i5, i6, etc.
    },
    
    // Configuración general
    config: {
        costoHora: COSTO_HORA_DEFAULT,
        metaEficiencia: 95,
        maquinas: [...MAQUINAS_DEFAULT]  // Lista de máquinas configurables
    },
    
    // Filtros actuales
    filtros: {
        categoria: 'ALL',
        vista: 'general',
        op: 'ALL',
        periodo: 'today',
        maquina: 'ALL',
        turno: 'ALL',
        colores: 'ALL'
    }
};

// =====================================================
// UTILIDADES
// =====================================================

const Utils = {
    // Formatear número con ceros a la izquierda
    pad: (n, width = 2) => n.toString().padStart(width, '0'),
    
    // Obtener segundos del día (0 a 86399)
    getDaySeconds: (date = new Date()) => {
        return (date.getHours() * 3600) + 
               (date.getMinutes() * 60) + 
               date.getSeconds() + 
               (date.getMilliseconds() / 1000);
    },
    
    // Convertir segundos del día a HH:MM:SS
    secondsToHMS: (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${Utils.pad(h)}:${Utils.pad(m)}:${Utils.pad(s)}`;
    },
    
    // Formatear hora HH:MM:SS
    formatHMS: (date = new Date()) => {
        return `${Utils.pad(date.getHours())}:${Utils.pad(date.getMinutes())}:${Utils.pad(date.getSeconds())}`;
    },
    
    // Convertir fecha a número Excel (días desde 1900-01-01, decimales = hora)
    // Excel: 1 = 1900-01-01, parte decimal = fracción del día
    dateToExcel: (date = new Date()) => {
        // Días desde 1900-01-01 (Excel tiene un bug con 1900 siendo bisiesto, +2 días)
        const epoch = new Date(1899, 11, 30); // 1899-12-30 para compensar
        const days = (date - epoch) / (24 * 60 * 60 * 1000);
        return Utils.round2(days);
    },
    
    // Convertir número Excel a Date
    excelToDate: (excelNum) => {
        const epoch = new Date(1899, 11, 30);
        const ms = excelNum * 24 * 60 * 60 * 1000;
        return new Date(epoch.getTime() + ms);
    },
    
    // Obtener solo la parte de fecha de un número Excel (sin decimales)
    excelDatePart: (excelNum) => Math.floor(excelNum),
    
    // Obtener segundos del día desde la parte decimal de Excel
    excelToSeconds: (excelNum) => {
        const fraction = excelNum - Math.floor(excelNum);
        return Utils.round2(fraction * 86400);
    },
    
    // Formatear duración en formato legible
    formatDuration: (seconds) => {
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(0);
            return `${mins}m ${secs}s`;
        }
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${mins}m`;
    },
    
    // Generar ID único
    generateId: () => Date.now() + Math.random().toString(36).substr(2, 9),
    
    // Redondear a 2 decimales
    round2: (num) => Math.round(num * 100) / 100,
    
    // Obtener color de categoría (dinámico)
    getCategoryColor: (catName) => {
        if (!categoryColors[catName]) {
            // Asignar un color basado en el hash del nombre
            const existingCount = Object.keys(categoryColors).length;
            categoryColors[catName] = COLORES_CATEGORIAS[existingCount % COLORES_CATEGORIAS.length];
        }
        return categoryColors[catName];
    },
    
    // Obtener clase CSS de categoría
    getCategoryClass: (catName) => {
        // Normalizar nombre para clase CSS
        return `cat-${catName.toLowerCase().replace(/\s+/g, '-')}`;
    },
    
    // Extraer categoría de un nombre (primera palabra)
    extractCategory: (name) => {
        if (!name || typeof name !== 'string') return 'General';
        const firstWord = name.trim().split(/\s+/)[0];
        // Capitalizar primera letra
        return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
};

// =====================================================
// PERSISTENCIA (LocalStorage)
// =====================================================

const Storage = {
    KEYS: {
        REGISTROS: 'smed_registros',
        BUTTONS: 'smed_buttons',
        ACTIVE_TIMERS: 'smed_active_timers',
        CONFIG: 'smed_config',
        BACKUP: 'smed_backup',
        BACKUP_DATE: 'smed_backup_date'
    },
    
    save: () => {
        try {
            localStorage.setItem(Storage.KEYS.REGISTROS, JSON.stringify(AppState.registros));
            localStorage.setItem(Storage.KEYS.BUTTONS, JSON.stringify(AppState.buttons));
            localStorage.setItem(Storage.KEYS.ACTIVE_TIMERS, JSON.stringify(AppState.activeTimers));
            localStorage.setItem(Storage.KEYS.CONFIG, JSON.stringify(AppState.config));
            
            // Crear backup automático diario
            Storage.autoBackup();
        } catch (e) {
            console.error('Error guardando datos:', e);
        }
    },
    
    // Crear backup automático una vez al día
    autoBackup: () => {
        const today = new Date().toISOString().split('T')[0];
        const lastBackup = localStorage.getItem(Storage.KEYS.BACKUP_DATE);
        
        if (lastBackup !== today && AppState.registros.length > 0) {
            Storage.createBackup();
            localStorage.setItem(Storage.KEYS.BACKUP_DATE, today);
            console.log('📦 Backup automático creado:', today);
        }
    },
    
    // Crear backup manual
    createBackup: () => {
        const backup = {
            fecha: new Date().toISOString(),
            registros: AppState.registros,
            buttons: AppState.buttons,
            config: AppState.config
        };
        localStorage.setItem(Storage.KEYS.BACKUP, JSON.stringify(backup));
    },
    
    // Recuperar backup
    restoreBackup: () => {
        const backupStr = localStorage.getItem(Storage.KEYS.BACKUP);
        if (!backupStr) {
            alert('No hay backup disponible para restaurar');
            return false;
        }
        
        try {
            const backup = JSON.parse(backupStr);
            const fecha = new Date(backup.fecha).toLocaleString();
            
            if (confirm(`¿Restaurar backup del ${fecha}?\n\nEsto reemplazará los datos actuales con:\n- ${backup.registros.length} registros\n- ${backup.buttons.length} botones`)) {
                AppState.registros = backup.registros || [];
                AppState.buttons = backup.buttons || [];
                if (backup.config) AppState.config = { ...AppState.config, ...backup.config };
                
                Storage.save();
                UI.renderAll();
                alert('✅ Backup restaurado correctamente');
                return true;
            }
        } catch (e) {
            console.error('Error restaurando backup:', e);
            alert('Error al restaurar backup');
        }
        return false;
    },
    
    // Ver info del backup
    getBackupInfo: () => {
        const backupStr = localStorage.getItem(Storage.KEYS.BACKUP);
        if (!backupStr) return null;
        
        try {
            const backup = JSON.parse(backupStr);
            return {
                fecha: backup.fecha,
                registros: backup.registros?.length || 0,
                buttons: backup.buttons?.length || 0
            };
        } catch (e) {
            return null;
        }
    },
    
    load: () => {
        try {
            const registros = localStorage.getItem(Storage.KEYS.REGISTROS);
            const buttons = localStorage.getItem(Storage.KEYS.BUTTONS);
            const activeTimers = localStorage.getItem(Storage.KEYS.ACTIVE_TIMERS);
            const config = localStorage.getItem(Storage.KEYS.CONFIG);
            
            if (registros) AppState.registros = JSON.parse(registros);
            if (buttons) AppState.buttons = JSON.parse(buttons);
            if (activeTimers) AppState.activeTimers = JSON.parse(activeTimers);
            if (config) AppState.config = { ...AppState.config, ...JSON.parse(config) };
            
            // Si no hay botones, cargar los por defecto
            if (AppState.buttons.length === 0) {
                Storage.loadDefaultButtons();
            }
        } catch (e) {
            console.error('Error cargando datos:', e);
            Storage.loadDefaultButtons();
        }
    },
    
    loadDefaultButtons: () => {
        // Botones por defecto con tipo SMED
        const defaultButtons = [
            { name: 'Troquel Desmontar', tipo: 'INT' },
            { name: 'Troquel Montar', tipo: 'INT' },
            { name: 'Sello Desmontar', tipo: 'INT' },
            { name: 'Sello Montar', tipo: 'INT' },
            { name: 'Tinta Desmontar', tipo: 'EXT' },
            { name: 'Tinta Montar', tipo: 'EXT' }
        ];
        
        AppState.buttons = defaultButtons.map(btn => ({
            id: Utils.generateId(),
            name: btn.name,
            cat: Utils.extractCategory(btn.name),
            tipo: btn.tipo || 'INT',
            color: null // null = usar color de categoría automático
        }));
        Storage.save();
    },
    
    // Borrar SOLO registros (NO borra botones personalizados)
    clear: () => {
        if (AppState.registros.length === 0) {
            alert('No hay registros que borrar');
            return;
        }
        
        // Crear backup antes de borrar
        Storage.createBackup();
        console.log('📦 Backup creado antes de borrar');
        
        if (confirm(`¿Está seguro de eliminar ${AppState.registros.length} registros?\n\n⚠️ Los botones personalizados NO se borrarán.\n✅ Se ha creado un backup que puede restaurar.`)) {
            AppState.registros = [];
            AppState.activeTimers = {};
            Storage.save();
            UI.renderAll();
            alert('✅ Registros eliminados.\n\n💡 Puedes recuperarlos con el botón "🔄 Restaurar Backup" en Configuración.');
        }
    },
    
    // Borrar TODO (incluye botones) - solo para casos extremos
    clearAll: () => {
        Storage.createBackup();
        if (confirm('⚠️ ADVERTENCIA: Esto borrará TODOS los datos incluyendo botones personalizados.\n\nSe ha creado un backup.')) {
            AppState.registros = [];
            AppState.activeTimers = {};
            AppState.buttons = [];
            Storage.loadDefaultButtons();
            Storage.save();
            UI.renderAll();
            alert('Todo eliminado. Botones restaurados a valores por defecto.');
        }
    }
};

// Backup automático al cerrar/salir de la app
window.addEventListener('beforeunload', () => {
    if (AppState.registros.length > 0) {
        Storage.createBackup();
    }
});

// =====================================================
// LÓGICA DEL CRONÓMETRO
// =====================================================

const Timer = {
    // Manejar click en botón de actividad
    handleButtonClick: (btnId) => {
        const btn = AppState.buttons.find(b => b.id === btnId);
        if (!btn) return;
        
        const now = Date.now();
        const cat = btn.cat;
        
        // Verificar si hay un timer activo en esta categoría
        if (AppState.activeTimers[cat]) {
            const prev = AppState.activeTimers[cat];
            
            // Si es el mismo botón, no hacer nada (o podríamos detenerlo)
            if (prev.btnId === btnId) {
                // Detener este timer específico
                Timer.stopTimer(cat);
                return;
            }
            
            // Cerrar el timer anterior
            const duration = (now - prev.start) / 1000;
            Timer.saveRecord(prev, duration);
        }
        
        // Iniciar nuevo timer
        AppState.activeTimers[cat] = {
            btnId: btnId,
            btnName: btn.name,
            cat: cat,
            start: now
        };
        
        Storage.save();
        UI.renderAll();
    },
    
    // Detener un timer específico
    stopTimer: (cat) => {
        if (!AppState.activeTimers[cat]) return;
        
        const timer = AppState.activeTimers[cat];
        const duration = (Date.now() - timer.start) / 1000;
        Timer.saveRecord(timer, duration);
        
        delete AppState.activeTimers[cat];
        Storage.save();
        UI.renderAll();
    },
    
    // Detener todos los timers
    stopAllTimers: () => {
        const now = Date.now();
        
        for (const cat in AppState.activeTimers) {
            const timer = AppState.activeTimers[cat];
            const duration = (now - timer.start) / 1000;
            Timer.saveRecord(timer, duration);
        }
        
        AppState.activeTimers = {};
        Storage.save();
        UI.renderAll();
    },
    
    // Guardar registro de actividad cerrada
    saveRecord: (timer, duration) => {
        const now = new Date();
        const endSeconds = Utils.getDaySeconds(now);
        const startSeconds = Utils.round2(endSeconds - duration);
        const btn = AppState.buttons.find(b => b.id === timer.btnId);
        
        const record = {
            id: Utils.generateId(),
            name: timer.btnName,
            cat: timer.cat,
            tipo: btn?.tipo || 'INT',          // Tipo: INT, EXT, NVA
            // OP (Orden de Producción) activa
            op: AppState.opActiva.numero || '',
            colores: AppState.opActiva.colores || 1,
            turno: AppState.opActiva.turno || 'T1',
            maquina: AppState.opActiva.maquina || '',
            // Tiempos
            fechaExcel: Utils.dateToExcel(now), // Fecha en formato Excel (con decimales para hora)
            inicioSeg: startSeconds < 0 ? startSeconds + 86400 : startSeconds, // Segundos del día inicio
            finSeg: Utils.round2(endSeconds),   // Segundos del día fin
            duracion: Utils.round2(duration),   // Duración en segundos
            // Campos legacy para compatibilidad
            duration: Utils.round2(duration),
            endTime: Utils.formatHMS(now),
            timestamp: Date.now(),
            fecha: now.toISOString().split('T')[0]
        };
        
        AppState.registros.unshift(record);
    },
    
    // Eliminar un registro
    deleteRecord: (id) => {
        if (confirm('¿Eliminar este registro?')) {
            AppState.registros = AppState.registros.filter(r => r.id !== id);
            Storage.save();
            UI.renderAll();
        }
    },
    
    // Obtener tiempo transcurrido de un timer activo
    getElapsedTime: (cat) => {
        if (!AppState.activeTimers[cat]) return 0;
        return (Date.now() - AppState.activeTimers[cat].start) / 1000;
    },
    
    // =====================================================
    // CRONÓMETRO LIBRE
    // =====================================================
    
    // Estado del timer libre
    freeTimer: {
        active: false,
        start: null,
        interval: null
    },
    
    // Iniciar cronómetro libre
    startFreeTimer: () => {
        if (Timer.freeTimer.active) {
            // Si ya está activo, detener y mostrar panel de datos
            Timer.stopFreeTimerCounting();
            document.getElementById('freeTimerPanel').style.display = 'block';
            document.getElementById('freeTimerBtn').textContent = '⏱️ Esperando datos...';
            document.getElementById('freeTimerBtn').style.background = '#f59e0b';
            return;
        }
        
        // Iniciar nuevo timer libre
        Timer.freeTimer.active = true;
        Timer.freeTimer.start = Date.now();
        
        document.getElementById('freeTimerBtn').textContent = '⏹️ Detener';
        document.getElementById('freeTimerBtn').style.background = '#ef4444';
        
        // Actualizar display cada 100ms
        Timer.freeTimer.interval = setInterval(() => {
            const elapsed = (Date.now() - Timer.freeTimer.start) / 1000;
            document.getElementById('freeTimerDisplay').textContent = elapsed.toFixed(1) + 's';
        }, 100);
    },
    
    // Detener el conteo (pero mantener el tiempo)
    stopFreeTimerCounting: () => {
        if (Timer.freeTimer.interval) {
            clearInterval(Timer.freeTimer.interval);
            Timer.freeTimer.interval = null;
        }
    },
    
    // Guardar timer libre con los datos ingresados
    saveFreeTimer: () => {
        const nameInput = document.getElementById('freeTimerName');
        const tipoSelect = document.getElementById('freeTimerTipo');
        
        const name = nameInput.value.trim() || 'Actividad Libre';
        const tipo = tipoSelect.value || 'NVA';
        
        if (!Timer.freeTimer.start) {
            alert('No hay tiempo registrado');
            return;
        }
        
        const duration = (Date.now() - Timer.freeTimer.start) / 1000;
        const now = new Date();
        const endSeconds = Utils.getDaySeconds(now);
        const startSeconds = Utils.round2(endSeconds - duration);
        
        // Crear registro
        const record = {
            id: Utils.generateId(),
            name: name,
            cat: Utils.extractCategory(name),
            tipo: tipo,
            op: AppState.opActiva.numero || '',
            colores: AppState.opActiva.colores || 1,
            turno: AppState.opActiva.turno || 'T1',
            maquina: AppState.opActiva.maquina || '',
            fechaExcel: Utils.dateToExcel(now),
            inicioSeg: startSeconds < 0 ? startSeconds + 86400 : startSeconds,
            finSeg: Utils.round2(endSeconds),
            duracion: Utils.round2(duration),
            duration: Utils.round2(duration),
            endTime: Utils.formatHMS(now),
            timestamp: Date.now(),
            fecha: now.toISOString().split('T')[0]
        };
        
        AppState.registros.unshift(record);
        Storage.save();
        
        // Resetear timer libre
        Timer.cancelFreeTimer();
        UI.renderAll();
        
        alert(`Actividad "${name}" guardada: ${duration.toFixed(1)}s`);
    },
    
    // Cancelar timer libre
    cancelFreeTimer: () => {
        Timer.stopFreeTimerCounting();
        Timer.freeTimer.active = false;
        Timer.freeTimer.start = null;
        
        document.getElementById('freeTimerPanel').style.display = 'none';
        document.getElementById('freeTimerDisplay').textContent = '--';
        document.getElementById('freeTimerBtn').textContent = '⏱️ Cronómetro Libre';
        document.getElementById('freeTimerBtn').style.background = '#8b5cf6';
        document.getElementById('freeTimerName').value = '';
    }
};

// =====================================================
// GESTIÓN DE BOTONES
// =====================================================

const ButtonManager = {
    // Agregar botón con tipo y color opcional
    add: (name, tipo = 'INT', color = null) => {
        if (!name || !name.trim()) {
            alert('Ingrese el nombre del botón (ej: "Troquel Limpiar")');
            return false;
        }
        
        const trimmedName = name.trim();
        const cat = Utils.extractCategory(trimmedName);
        
        // Validar tipo
        const validTipo = ['INT', 'EXT', 'NVA'].includes(tipo) ? tipo : 'INT';
        
        AppState.buttons.push({
            id: Utils.generateId(),
            name: trimmedName,
            cat: cat,
            tipo: validTipo,
            color: color // null = usar color automático
        });
        
        Storage.save();
        UI.renderAll();
        return true;
    },
    
    // Actualizar tipo de un botón existente
    updateTipo: (id, tipo) => {
        const btn = AppState.buttons.find(b => b.id === id);
        if (btn) {
            btn.tipo = ['INT', 'EXT', 'NVA'].includes(tipo) ? tipo : 'INT';
            Storage.save();
            UI.renderAll();
        }
    },
    
    // Actualizar color de un botón existente
    updateColor: (id, color) => {
        const btn = AppState.buttons.find(b => b.id === id);
        if (btn) {
            btn.color = color || null;
            Storage.save();
            UI.renderAll();
        }
    },
    
    remove: (id) => {
        // Verificar si hay un timer activo con este botón
        for (const cat in AppState.activeTimers) {
            if (AppState.activeTimers[cat].btnId === id) {
                Timer.stopTimer(cat);
            }
        }
        
        AppState.buttons = AppState.buttons.filter(b => b.id !== id);
        Storage.save();
        UI.renderAll();
    },
    
    restore: () => {
        if (confirm('¿Restaurar botones por defecto? Se perderán los botones personalizados.')) {
            Storage.loadDefaultButtons();
            UI.renderAll();
        }
    }
};

// =====================================================
// EXPORT/IMPORT CSV - FORMATO NUMÉRICO SIMPLE
// =====================================================

/*
 * FORMATO CSV:
 * - FechaExcel: Número entero = días desde 1900, decimales = fracción del día (formato Excel)
 * - InicioSeg: Segundos del día (0-86399) cuando inició la actividad
 * - FinSeg: Segundos del día (0-86399) cuando terminó la actividad
 * - DuracionSeg: Duración en segundos
 * - Tipo: INT (interna), EXT (externa), NVA (muda/no valor agregado)
 * 
 * EJEMPLO para importar datos externos:
 * FechaExcel = 45678 (es 22/01/2026)
 * InicioSeg = 36000 (es 10:00:00)
 * FinSeg = 36300 (es 10:05:00)
 * DuracionSeg = 300 (5 minutos)
 */

const CSV = {
    // Exportar con formato completo (incluye OP, Colores, Turno)
    export: () => {
        if (AppState.registros.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        // Pedir nombre de quien guarda el archivo
        const nombreUsuario = prompt('¿Quién guarda este archivo? (Tu nombre):', '');
        if (nombreUsuario === null) {
            // Usuario canceló
            return;
        }
        
        // Limpiar nombre para usarlo en el archivo (quitar caracteres especiales)
        const nombreLimpio = nombreUsuario.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Usuario';
        
        // Headers con OP, Colores, Turno, Maquina
        const headers = ['FechaExcel', 'Maquina', 'OP', 'Colores', 'Turno', 'Actividad', 'Categoria', 'Tipo', 'InicioSeg', 'FinSeg', 'DuracionSeg'];
        
        const rows = AppState.registros.map(r => {
            // Calcular fechaExcel si no existe
            let fechaExcel = r.fechaExcel;
            if (!fechaExcel && r.timestamp) {
                fechaExcel = Utils.dateToExcel(new Date(r.timestamp));
            } else if (!fechaExcel && r.fecha) {
                fechaExcel = Utils.dateToExcel(new Date(r.fecha + 'T12:00:00'));
            } else if (!fechaExcel) {
                fechaExcel = Utils.dateToExcel(new Date());
            }
            
            // Calcular tiempos en segundos si no existen
            let finSeg = r.finSeg;
            if (finSeg === undefined && r.endTime) {
                const [h, m, s] = r.endTime.split(':').map(Number);
                finSeg = (h * 3600) + (m * 60) + (s || 0);
            } else if (finSeg === undefined) {
                finSeg = 0;
            }
            
            let inicioSeg = r.inicioSeg;
            if (inicioSeg === undefined) {
                inicioSeg = Utils.round2(finSeg - (r.duracion || r.duration || 0));
                if (inicioSeg < 0) inicioSeg += 86400;
            }
            
            return [
                Utils.round2(fechaExcel),
                r.maquina || '',
                r.op || '',
                r.colores || 1,
                r.turno || 'T1',
                r.name,
                r.cat,
                r.tipo || 'INT',
                Utils.round2(inicioSeg),
                Utils.round2(finSeg),
                Utils.round2(r.duracion || r.duration || 0)
            ];
        });
        
        // CSV con comillas en texto
        let csvContent = '\ufeff';
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => 
            row.map((cell, i) => {
                // OP, Turno, Actividad, Categoria, Tipo entre comillas
                if (i === 1 || i === 3 || i === 4 || i === 5 || i === 6) {
                    return `"${String(cell).replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Nombre del archivo incluye fecha y nombre de usuario
        link.download = `SMED_${new Date().toISOString().split('T')[0]}_${nombreLimpio}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    },
    
    // Importar con formato numérico simple
    import: (file) => {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                // Detectar si es formato nuevo o legacy
                const header = lines[0].toLowerCase();
                const isNewFormat = header.includes('fechaexcel') || header.includes('inicioseg');
                
                const data = lines.slice(1).map(line => {
                    // Parsear CSV
                    const values = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let char of line) {
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            values.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    values.push(current.trim());
                    
                    if (isNewFormat) {
                        // Nuevo formato: FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg
                        const fechaExcel = parseFloat(values[0]) || Utils.dateToExcel(new Date());
                        const maquina = values[1] || '';
                        const op = values[2] || '';
                        const colores = parseInt(values[3]) || 1;
                        const turno = values[4] || 'T1';
                        const name = values[5] || 'Actividad';
                        const cat = values[6] || 'General';
                        const tipo = values[7] || 'INT';
                        const inicioSeg = parseFloat(values[8]) || 0;
                        const finSeg = parseFloat(values[9]) || 0;
                        const duracion = parseFloat(values[10]) || 0;
                        
                        // Convertir fechaExcel a fecha legible para campos legacy
                        const dateObj = Utils.excelToDate(fechaExcel);
                        
                        return {
                            id: Utils.generateId(),
                            name: name,
                            cat: cat,
                            tipo: tipo,
                            maquina: maquina,
                            op: op,
                            colores: colores,
                            turno: turno,
                            fechaExcel: fechaExcel,
                            inicioSeg: Utils.round2(inicioSeg),
                            finSeg: Utils.round2(finSeg),
                            duracion: Utils.round2(duracion),
                            // Campos legacy
                            duration: Utils.round2(duracion),
                            endTime: Utils.secondsToHMS(finSeg),
                            timestamp: dateObj.getTime(),
                            fecha: dateObj.toISOString().split('T')[0]
                        };
                    } else {
                        // Formato legacy: ID, Fecha, Actividad, Categoría, Duración, HoraFin, Timestamp
                        return {
                            id: values[0] || Utils.generateId(),
                            fecha: values[1] || new Date().toISOString().split('T')[0],
                            name: values[2] || 'Actividad',
                            cat: values[3] || 'General',
                            duration: parseFloat(values[4]) || 0,
                            duracion: parseFloat(values[4]) || 0,
                            endTime: values[5] || '00:00:00',
                            timestamp: parseInt(values[6]) || Date.now(),
                            tipo: 'INT'
                        };
                    }
                }).filter(r => r.name && (r.duracion > 0 || r.duration > 0));
                
                AppState.registros = data;
                Storage.save();
                UI.renderAll();
                alert(`${data.length} registros importados correctamente`);
            } catch (error) {
                console.error('Error importando CSV:', error);
                alert('Error al importar el archivo. Verifique el formato CSV.');
            }
        };
        reader.readAsText(file);
    }
};

// =====================================================
// INTERFAZ DE USUARIO (UI)
// =====================================================

const UI = {
    // Renderizar todo
    renderAll: () => {
        UI.renderMasterClock();
        UI.renderActiveTimers();
        UI.renderButtons();
        UI.renderHistory();
        UI.renderStats();
        UI.renderConfig();
        UI.updateAnalysis();
    },
    
    // Reloj maestro
    renderMasterClock: () => {
        const now = new Date();
        const secondsEl = document.getElementById('masterSeconds');
        const timeEl = document.getElementById('masterTime');
        
        if (secondsEl) {
            secondsEl.textContent = Utils.getDaySeconds(now).toFixed(1);
        }
        if (timeEl) {
            timeEl.textContent = Utils.formatHMS(now);
        }
    },
    
    // Panel de timers activos
    renderActiveTimers: () => {
        const panel = document.getElementById('activeTimersPanel');
        const list = document.getElementById('activeTimersList');
        
        if (!panel || !list) return;
        
        const activeKeys = Object.keys(AppState.activeTimers);
        
        if (activeKeys.length === 0) {
            panel.classList.add('hidden');
            return;
        }
        
        panel.classList.remove('hidden');
        list.innerHTML = activeKeys.map(cat => {
            const timer = AppState.activeTimers[cat];
            const elapsed = Timer.getElapsedTime(cat);
            return `
                <div class="active-timer-row">
                    <span class="timer-cat">[${cat}]</span>
                    <span class="timer-name">${timer.btnName}</span>
                    <span class="timer-val" data-timer-cat="${cat}">${elapsed.toFixed(1)}s</span>
                </div>
            `;
        }).join('');
    },
    
    // Grid de botones SMED - muestra OP activa en cada botón
    renderButtons: () => {
        const container = document.getElementById('buttonsGrid');
        if (!container) return;
        
        // Mostrar OP activa en cada botón
        const opActiva = AppState.opActiva.numero ? AppState.opActiva.numero.padStart(8, '0') : '';
        const turnoActivo = AppState.opActiva.turno || 'T1';
        
        container.innerHTML = AppState.buttons.map(btn => {
            const isActive = AppState.activeTimers[btn.cat] && 
                           AppState.activeTimers[btn.cat].btnId === btn.id;
            const elapsed = isActive ? Timer.getElapsedTime(btn.cat) : 0;
            
            return `
                <button class="smed-btn ${isActive ? 'is-running' : ''}" 
                        data-cat="${btn.cat}"
                        onclick="Timer.handleButtonClick('${btn.id}')">
                    <span class="btn-name">${isActive ? '▶ ' : ''}${btn.name}</span>
                    <span class="btn-cat">${btn.cat}</span>
                    ${opActiva ? `<span style="font-size:0.6rem; color:#00ff9d; opacity:0.8;">OP: ${opActiva}</span>` : '<span style="font-size:0.6rem; color:#ff4444;">Sin OP</span>'}
                    ${isActive ? `<span class="btn-timer" data-btn-timer="${btn.id}">${elapsed.toFixed(1)}s</span>` : ''}
                </button>
            `;
        }).join('');
        
        // Actualizar indicador de estado OP
        const opStatus = document.getElementById('opStatus');
        if (opStatus) {
            if (opActiva) {
                opStatus.innerHTML = `<span style="color:#00ff9d;">✓ ${opActiva}</span><br><span style="font-size:10px;">${turnoActivo}</span>`;
                opStatus.style.background = 'rgba(0,255,157,0.1)';
                opStatus.style.border = '1px solid #00ff9d';
            } else {
                opStatus.innerHTML = 'Sin OP activa';
                opStatus.style.background = '#333';
                opStatus.style.border = 'none';
            }
        }
    },
    
    // Actualizar opciones del filtro de historial (categorías dinámicas)
    updateHistoryFilterOptions: () => {
        const select = document.getElementById('historyFilter');
        if (!select) return;
        
        const currentValue = select.value;
        
        // Obtener categorías únicas de botones y registros
        const catFromButtons = AppState.buttons.map(b => b.cat);
        const catFromRecords = AppState.registros.map(r => r.cat);
        const allCats = [...new Set([...catFromButtons, ...catFromRecords])].sort();
        
        let html = '<option value="ALL">Todas las categorías</option>';
        allCats.forEach(cat => {
            html += `<option value="${cat}">${cat}</option>`;
        });
        
        select.innerHTML = html;
        // Restaurar selección si aún existe
        if (allCats.includes(currentValue) || currentValue === 'ALL') {
            select.value = currentValue;
        }
    },
    
    // Historial de actividades
    renderHistory: () => {
        const container = document.getElementById('historyList');
        if (!container) return;
        
        // Actualizar opciones del filtro
        UI.updateHistoryFilterOptions();
        
        if (AppState.registros.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades registradas</div>';
            return;
        }
        
        // Filtrar si es necesario
        let filtered = AppState.registros;
        if (AppState.filtros.categoria !== 'ALL') {
            filtered = filtered.filter(r => r.cat === AppState.filtros.categoria);
        }
        
        container.innerHTML = filtered.slice(0, 50).map(record => `
            <div class="history-item">
                <div class="item-info">
                    <span class="item-name">${record.name}</span>
                    <span class="item-cat">${record.cat}${record.op ? ` • <span style="color:#00ff9d;">${record.op}</span>` : ''}${record.turno ? ` [${record.turno}]` : ''}</span>
                    <span class="item-time">Fin: ${record.endTime}${record.colores > 1 ? ` • ${record.colores} colores` : ''}</span>
                </div>
                <div class="item-actions">
                    <span class="item-duration">${record.duration}s</span>
                    <button class="delete-btn" onclick="Timer.deleteRecord('${record.id}')" title="Eliminar">×</button>
                </div>
            </div>
        `).join('');
    },
    
    // Estadísticas en tab Stats
    renderStats: () => {
        Statistics.updateFilterOptions();
        Statistics.calculate();
    },
    
    // Configuración - muestra tipo y color de cada botón
    renderConfig: () => {
        const container = document.getElementById('configButtonsList');
        if (!container) return;
        
        container.innerHTML = AppState.buttons.map(btn => {
            const tipoInfo = TIPOS_ACTIVIDAD[btn.tipo] || TIPOS_ACTIVIDAD['INT'];
            const btnColor = btn.color || Utils.getCategoryColor(btn.cat);
            
            return `
            <div class="config-row" style="align-items: center; gap: 10px;">
                <div style="flex: 2;">
                    <span class="config-item-name">${btn.name}</span>
                    <span class="config-item-cat">(${btn.cat})</span>
                </div>
                <div style="flex: 1;">
                    <select onchange="ButtonManager.updateTipo('${btn.id}', this.value)" 
                            style="padding: 4px; border-radius: 4px; background: #2a2a2a; color: ${tipoInfo.color}; border: 1px solid ${tipoInfo.color};">
                        <option value="INT" ${btn.tipo === 'INT' ? 'selected' : ''} style="color: #f97316;">🟠 Interna</option>
                        <option value="EXT" ${btn.tipo === 'EXT' ? 'selected' : ''} style="color: #10b981;">🟢 Externa</option>
                        <option value="NVA" ${btn.tipo === 'NVA' ? 'selected' : ''} style="color: #ef4444;">🔴 Muda</option>
                    </select>
                </div>
                <div style="flex: 0;">
                    <input type="color" value="${btnColor}" 
                           onchange="ButtonManager.updateColor('${btn.id}', this.value)"
                           style="width: 32px; height: 28px; border: none; cursor: pointer; border-radius: 4px;">
                </div>
                <button class="action-btn danger" onclick="ButtonManager.remove('${btn.id}')" style="padding: 6px 10px;">
                    ✕
                </button>
            </div>
        `}).join('');
    },
    
    // Filtrar historial por período
    filterHistoryByPeriod: (periodo) => {
        AppState.filtros.periodo = periodo;
        UI.renderHistory();
    },
    
    // Actualizar análisis
    updateAnalysis: () => {
        Analysis.render();
    },
    
    // Loop principal (actualiza contadores)
    startMainLoop: () => {
        setInterval(() => {
            UI.renderMasterClock();
            UI.updateTimerDisplays();
        }, 100);
    },
    
    // Actualizar displays de timers
    updateTimerDisplays: () => {
        for (const cat in AppState.activeTimers) {
            const elapsed = Timer.getElapsedTime(cat);
            const val = elapsed.toFixed(1) + 's';
            
            // Actualizar en panel
            const panelEl = document.querySelector(`[data-timer-cat="${cat}"]`);
            if (panelEl) panelEl.textContent = val;
            
            // Actualizar en botón
            const btnTimer = AppState.activeTimers[cat];
            if (btnTimer) {
                const btnEl = document.querySelector(`[data-btn-timer="${btnTimer.btnId}"]`);
                if (btnEl) btnEl.textContent = val;
            }
        }
    }
};

// =====================================================
// TABS NAVIGATION
// =====================================================

const Tabs = {
    switch: (tabId) => {
        // Ocultar todas las secciones
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.remove('active');
        });
        
        // Desactivar todos los botones de tab
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('active');
        });
        
        // Mostrar sección seleccionada
        const section = document.getElementById(`tab-${tabId}`);
        if (section) section.classList.add('active');
        
        // Activar botón
        const btn = document.querySelector(`[data-tab="${tabId}"]`);
        if (btn) btn.classList.add('active');
        
        // Actualizar contenido específico
        if (tabId === 'stats') {
            Statistics.calculate();
        } else if (tabId === 'gantt') {
            Gantt.render();
        } else if (tabId === 'analysis') {
            Analysis.render();
        }
    }
};

// =====================================================
// TEORÍA SMED (COLAPSABLE)
// =====================================================

const Theory = {
    toggle: () => {
        const content = document.getElementById('theoryContent');
        const toggle = document.getElementById('theoryToggle');
        
        if (content && toggle) {
            content.classList.toggle('expanded');
            toggle.textContent = content.classList.contains('expanded') ? '−' : '+';
        }
    }
};

// =====================================================
// INICIALIZACIÓN
// =====================================================

function init() {
    // Cargar datos guardados
    Storage.load();
    
    // Auto-seleccionar turno basado en fecha/hora actual
    setTimeout(() => {
        TurnoManager.autoSelectTurno();
    }, 100);
    
    // Renderizar UI inicial
    UI.renderAll();
    
    // Iniciar loop principal
    UI.startMainLoop();
    
    // Event listeners
    setupEventListeners();
    
    // Info del turno en consola
    const info = TurnoManager.getInfoTurno();
    console.log(`🏭 SMED Analyzer Pro inicializado | Turno: ${info.turno} (${info.nombreHorario}) | Semana ${info.semanaCiclo}/3`);
}

function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            Tabs.switch(tabId);
        });
    });
    
    // Formulario de nuevo botón con tipo y color
    const addBtnForm = document.getElementById('addButtonForm');
    if (addBtnForm) {
        addBtnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newBtnName');
            const tipoSelect = document.getElementById('newBtnTipo');
            const colorInput = document.getElementById('newBtnColor');
            
            const tipo = tipoSelect?.value || 'INT';
            const color = colorInput?.value || null;
            
            if (ButtonManager.add(nameInput.value, tipo, color)) {
                nameInput.value = '';
                // Resetear a valores por defecto
                if (tipoSelect) tipoSelect.value = 'INT';
                if (colorInput) colorInput.value = '#3b82f6';
            }
        });
    }
    
    // Import CSV
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            CSV.import(e.target.files[0]);
            e.target.value = '';
        });
    }
    
    // Filtro de categoría en historial
    const catFilter = document.getElementById('historyFilter');
    if (catFilter) {
        catFilter.addEventListener('change', (e) => {
            AppState.filtros.categoria = e.target.value;
            UI.renderHistory();
        });
    }
    
    // Vista de análisis
    const viewSelect = document.getElementById('analysisView');
    if (viewSelect) {
        viewSelect.addEventListener('change', (e) => {
            AppState.filtros.vista = e.target.value;
            Analysis.render();
        });
    }
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);

// =====================================================
// MÚLTIPLES CRONÓMETROS LIBRES
// =====================================================

const FreeTimers = {
    // Lista de timers activos { id, start, interval }
    active: [],
    
    // Agregar nuevo cronómetro libre
    add: () => {
        const id = Utils.generateId();
        const timer = {
            id: id,
            start: Date.now(),
            interval: null,
            stopped: false,
            elapsed: 0
        };
        
        FreeTimers.active.push(timer);
        
        // Renderizar HTML una sola vez
        FreeTimers.render();
        
        // Iniciar interval para este timer - solo actualizar texto, no reconstruir HTML
        timer.interval = setInterval(() => {
            if (!timer.stopped) {
                timer.elapsed = (Date.now() - timer.start) / 1000;
                // Solo actualizar el texto del contador, NO reconstruir todo el HTML
                const displayEl = document.getElementById(`freeTimerDisplay_${id}`);
                if (displayEl) {
                    displayEl.textContent = timer.elapsed.toFixed(1) + 's';
                }
            }
        }, 100);
    },
    
    // Detener un cronómetro (mostrar panel de datos)
    stop: (id) => {
        const timer = FreeTimers.active.find(t => t.id === id);
        if (timer && !timer.stopped) {
            timer.stopped = true;
            timer.elapsed = (Date.now() - timer.start) / 1000;
            if (timer.interval) {
                clearInterval(timer.interval);
                timer.interval = null;
            }
            // Reconstruir HTML para mostrar panel de datos
            FreeTimers.render();
        }
    },
    
    // Guardar un cronómetro como registro
    save: (id) => {
        const timer = FreeTimers.active.find(t => t.id === id);
        if (!timer) return;
        
        const nameInput = document.getElementById(`freeTimerName_${id}`);
        const tipoSelect = document.getElementById(`freeTimerTipo_${id}`);
        
        const name = nameInput?.value.trim() || 'Actividad Libre';
        const tipo = tipoSelect?.value || 'NVA';
        
        const duration = timer.elapsed;
        const now = new Date();
        const endSeconds = Utils.getDaySeconds(now);
        const startSeconds = Utils.round2(endSeconds - duration);
        
        const record = {
            id: Utils.generateId(),
            name: name,
            cat: Utils.extractCategory(name),
            tipo: tipo,
            op: AppState.opActiva.numero || '',
            colores: AppState.opActiva.colores || 1,
            turno: AppState.opActiva.turno || 'T1',
            maquina: AppState.opActiva.maquina || '',
            fechaExcel: Utils.dateToExcel(now),
            inicioSeg: startSeconds < 0 ? startSeconds + 86400 : startSeconds,
            finSeg: Utils.round2(endSeconds),
            duracion: Utils.round2(duration),
            duration: Utils.round2(duration),
            endTime: Utils.formatHMS(now),
            timestamp: Date.now(),
            fecha: now.toISOString().split('T')[0]
        };
        
        AppState.registros.unshift(record);
        Storage.save();
        
        // Eliminar este timer de la lista
        FreeTimers.remove(id);
        UI.renderAll();
        
        alert(`✅ "${name}" guardado: ${duration.toFixed(1)}s`);
    },
    
    // Cancelar un cronómetro
    remove: (id) => {
        const timer = FreeTimers.active.find(t => t.id === id);
        if (timer && timer.interval) {
            clearInterval(timer.interval);
        }
        FreeTimers.active = FreeTimers.active.filter(t => t.id !== id);
        FreeTimers.render();
    },
    
    // Renderizar la lista de cronómetros libres
    render: () => {
        const container = document.getElementById('freeTimersList');
        if (!container) return;
        
        if (FreeTimers.active.length === 0) {
            container.innerHTML = '<p style="color:#666; font-size:0.85em; margin:0;">No hay cronómetros activos</p>';
            return;
        }
        
        container.innerHTML = FreeTimers.active.map((timer, index) => {
            const elapsed = timer.elapsed.toFixed(1);
            
            if (timer.stopped) {
                // Mostrar panel de datos
                return `
                    <div style="background: #1a1a2e; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #8b5cf6;">
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
                            <div style="flex: 0; min-width: 80px;">
                                <span style="font-size: 1.3em; color: #8b5cf6; font-weight: bold; font-family: monospace;">${elapsed}s</span>
                            </div>
                            <div style="flex: 2; min-width: 120px;">
                                <label style="font-size: 10px; color: #888;">Nombre:</label>
                                <input type="text" id="freeTimerName_${timer.id}" placeholder="Ej: Espera supervisor" 
                                       style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                            </div>
                            <div style="flex: 1; min-width: 90px;">
                                <label style="font-size: 10px; color: #888;">Tipo:</label>
                                <select id="freeTimerTipo_${timer.id}" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #444; background: #0a0a0a; color: #f59e0b;">
                                    <option value="NVA">🔴 Muda</option>
                                    <option value="INT">🟠 Interna</option>
                                    <option value="EXT">🟢 Externa</option>
                                </select>
                            </div>
                            <button class="action-btn success" onclick="FreeTimers.save('${timer.id}')" style="padding: 6px 12px;">✓</button>
                            <button class="action-btn danger" onclick="FreeTimers.remove('${timer.id}')" style="padding: 6px 12px;">✕</button>
                        </div>
                    </div>
                `;
            } else {
                // Mostrar timer corriendo - con ID único para actualizar solo el texto
                return `
                    <div style="display: flex; align-items: center; gap: 10px; background: #1a1a2e; padding: 10px; border-radius: 8px; margin-bottom: 8px;">
                        <span style="color: #888;">⏱️ Timer ${index + 1}:</span>
                        <span id="freeTimerDisplay_${timer.id}" style="font-size: 1.3em; color: #8b5cf6; font-weight: bold; font-family: monospace; min-width: 80px;">${elapsed}s</span>
                        <button class="action-btn" onclick="FreeTimers.stop('${timer.id}')" style="background: #ef4444; padding: 8px 15px; font-size: 1em;">⏹️ Detener</button>
                        <button class="action-btn danger" onclick="FreeTimers.remove('${timer.id}')" style="padding: 8px 12px;">✕</button>
                    </div>
                `;
            }
        }).join('');
    }
};

// =====================================================
// GESTIÓN DE MÁQUINAS
// =====================================================

const MaquinaManager = {
    // Agregar nueva máquina
    add: (nombre) => {
        if (!nombre || !nombre.trim()) {
            alert('Ingrese el nombre de la máquina');
            return false;
        }
        
        const trimmed = nombre.trim();
        if (AppState.config.maquinas.includes(trimmed)) {
            alert('Esta máquina ya existe');
            return false;
        }
        
        AppState.config.maquinas.push(trimmed);
        AppState.config.maquinas.sort((a, b) => {
            // Ordenar numéricamente si son del tipo iXX
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        
        Storage.save();
        MaquinaManager.updateSelectors();
        MaquinaManager.renderList();
        return true;
    },
    
    // Eliminar máquina
    remove: (nombre) => {
        if (confirm(`¿Eliminar la máquina "${nombre}"?`)) {
            AppState.config.maquinas = AppState.config.maquinas.filter(m => m !== nombre);
            Storage.save();
            MaquinaManager.updateSelectors();
            MaquinaManager.renderList();
        }
    },
    
    // Restaurar lista original
    restore: () => {
        if (confirm('¿Restaurar lista de máquinas a valores originales?')) {
            AppState.config.maquinas = [...MAQUINAS_DEFAULT];
            Storage.save();
            MaquinaManager.updateSelectors();
            MaquinaManager.renderList();
        }
    },
    
    // Actualizar todos los selectores de máquina
    updateSelectors: () => {
        const selectors = ['opMaquina', 'historyFilterMaquina', 'ganttFilterMaquina', 'statsFilterMaquina', 'analysisFilterMaquina'];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (!select) return;
            
            const currentValue = select.value;
            const isFilter = selectorId.includes('Filter');
            
            let html = isFilter ? '<option value="ALL">🏭 Todas</option>' : '<option value="">--</option>';
            
            AppState.config.maquinas.forEach(m => {
                html += `<option value="${m}">${m}</option>`;
            });
            
            select.innerHTML = html;
            
            // Restaurar valor si existe
            if (currentValue && (AppState.config.maquinas.includes(currentValue) || currentValue === 'ALL')) {
                select.value = currentValue;
            }
        });
    },
    
    // Renderizar lista de máquinas en Config
    renderList: () => {
        const container = document.getElementById('maquinasList');
        if (!container) return;
        
        container.innerHTML = AppState.config.maquinas.map(m => `
            <span style="display: inline-flex; align-items: center; gap: 4px; background: #1a1a2e; padding: 4px 10px; border-radius: 15px; margin: 3px; border: 1px solid #333;">
                <span style="color: #00d4ff;">${m}</span>
                <button onclick="MaquinaManager.remove('${m}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1em; padding: 0 2px;">×</button>
            </span>
        `).join('');
    }
};

// Exponer funciones globales necesarias
window.Timer = Timer;
window.ButtonManager = ButtonManager;
window.CSV = CSV;
window.Storage = Storage;
window.Tabs = Tabs;
window.Theory = Theory;
window.FreeTimers = FreeTimers;
window.MaquinaManager = MaquinaManager;
