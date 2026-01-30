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

// =====================================================
// INFORMACIÓN DE SOPORTE
// =====================================================
const SOPORTE = {
    email: 'smed@crgm.app',
    dominio: 'https://smed.crgm.app',
    version: '2.2',
    fecha: '26 Enero 2026'
};
window.SOPORTE = SOPORTE;

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
    
    // Filtros actuales - CENTRALIZADOS
    filtros: {
        categoria: 'ALL',
        tipo: 'ALL',       // INT, EXT, NVA
        vista: 'general',
        op: 'ALL',
        periodo: 'all',    // today, week, month, year, all, custom
        maquina: 'ALL',
        turno: 'ALL',
        colores: 'ALL',
        fechaDesde: null,  // Para rango personalizado
        fechaHasta: null   // Para rango personalizado
    }
};

// =====================================================
// FILTRADO CENTRALIZADO - Función usada por todos los módulos
// =====================================================

const Filtros = {
    // Obtener registros filtrados según todos los criterios activos
    getFiltered: (source = 'history') => {
        let data = [...AppState.registros];
        const f = AppState.filtros;
        
        // Obtener valores de filtros del DOM según el módulo
        const prefix = source === 'history' ? 'historyFilter' : 
                       source === 'gantt' ? 'ganttFilter' : 
                       source === 'stats' ? 'statsFilter' : 'historyFilter';
        
        // Filtro por Máquina
        const maquina = document.getElementById(`${prefix}Maquina`)?.value || f.maquina;
        if (maquina && maquina !== 'ALL') {
            data = data.filter(r => r.maquina === maquina);
        }
        
        // Filtro por OP
        const op = document.getElementById(`${prefix}OP`)?.value || f.op;
        if (op && op !== 'ALL') {
            data = data.filter(r => r.op === op);
        }
        
        // Filtro por Turno
        const turno = document.getElementById(`${prefix}Turno`)?.value || f.turno;
        if (turno && turno !== 'ALL') {
            data = data.filter(r => r.turno === turno);
        }
        
        // Filtro por Colores
        const colores = document.getElementById(`${prefix}Colores`)?.value || f.colores;
        if (colores && colores !== 'ALL') {
            const numColores = parseInt(colores);
            if (numColores >= 4) {
                data = data.filter(r => (r.colores || 1) >= 4);
            } else {
                data = data.filter(r => (r.colores || 1) === numColores);
            }
        }
        
        // Filtro por Categoría
        const categoria = document.getElementById(`${prefix}`)?.value || 
                          document.getElementById('historyFilter')?.value || f.categoria;
        if (categoria && categoria !== 'ALL') {
            if (categoria.startsWith('CAT:')) {
                data = data.filter(r => r.cat === categoria.split(':')[1]);
            } else if (categoria.startsWith('NAME:')) {
                data = data.filter(r => r.name === categoria.split(':')[1]);
            } else {
                data = data.filter(r => r.cat === categoria);
            }
        }
        
        // Filtro por Tipo (INT/EXT/NVA)
        const tipo = document.getElementById(`${prefix}Tipo`)?.value || f.tipo;
        if (tipo && tipo !== 'ALL') {
            data = data.filter(r => r.tipo === tipo);
        }
        
        // Filtro por Período/Fecha
        const periodo = f.periodo || 'all';
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (periodo !== 'all') {
            data = data.filter(r => {
                // Obtener fecha del registro
                let fechaReg;
                if (r.fecha) {
                    fechaReg = new Date(r.fecha + 'T00:00:00');
                } else if (r.timestamp) {
                    fechaReg = new Date(r.timestamp);
                    fechaReg.setHours(0, 0, 0, 0);
                } else if (r.fechaExcel) {
                    fechaReg = Utils.excelToDate(r.fechaExcel);
                    fechaReg.setHours(0, 0, 0, 0);
                } else {
                    return true; // Sin fecha, incluir
                }
                
                switch (periodo) {
                    case 'today':
                        return fechaReg.getTime() === hoy.getTime();
                    case 'week':
                        const inicioSemana = new Date(hoy);
                        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
                        return fechaReg >= inicioSemana;
                    case 'month':
                        return fechaReg.getMonth() === hoy.getMonth() && 
                               fechaReg.getFullYear() === hoy.getFullYear();
                    case 'year':
                        return fechaReg.getFullYear() === hoy.getFullYear();
                    case 'custom':
                        const desde = f.fechaDesde ? new Date(f.fechaDesde + 'T00:00:00') : null;
                        const hasta = f.fechaHasta ? new Date(f.fechaHasta + 'T23:59:59') : null;
                        if (desde && fechaReg < desde) return false;
                        if (hasta && fechaReg > hasta) return false;
                        return true;
                    default:
                        return true;
                }
            });
        }
        
        return data;
    },
    
    // Actualizar todos los selectores de filtros dinámicos
    updateAllFilters: () => {
        Filtros.updateOPFilter('historyFilterOP');
        Filtros.updateOPFilter('ganttFilterOP');
        Filtros.updateOPFilter('statsFilterOP');
        Filtros.updateCategoryFilter('historyFilter');
        Filtros.updateCategoryFilter('ganttFilter');
        Filtros.updateCategoryFilter('statsFilter');
        MaquinaManager.updateSelectors();
    },
    
    // Actualizar filtro de OP
    updateOPFilter: (selectId) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        const ops = [...new Set(AppState.registros.filter(r => r.op).map(r => r.op))].sort();
        
        let html = '<option value="ALL">📋 Todas las OP</option>';
        ops.forEach(op => {
            const count = AppState.registros.filter(r => r.op === op).length;
            html += `<option value="${op}">${op.padStart(8, '0')} (${count})</option>`;
        });
        select.innerHTML = html;
        if (ops.includes(currentValue)) select.value = currentValue;
    },
    
    // Actualizar filtro de categoría
    updateCategoryFilter: (selectId) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        const cats = [...new Set(AppState.registros.map(r => r.cat))].sort();
        
        let html = '<option value="ALL">📁 Todas</option>';
        cats.forEach(c => html += `<option value="${c}">${c}</option>`);
        select.innerHTML = html;
        if (cats.includes(currentValue) || currentValue === 'ALL') select.value = currentValue;
    },
    
    // Aplicar período desde botones rápidos
    setPeriodo: (periodo) => {
        AppState.filtros.periodo = periodo;
        UI.renderHistory();
        // Actualizar otros módulos si están visibles
        if (typeof Statistics !== 'undefined') Statistics.calculate();
        if (typeof Analysis !== 'undefined') Analysis.render();
        if (typeof Gantt !== 'undefined') Gantt.render();
    },
    
    // Aplicar rango personalizado
    setCustomRange: (desde, hasta) => {
        AppState.filtros.periodo = 'custom';
        AppState.filtros.fechaDesde = desde;
        AppState.filtros.fechaHasta = hasta;
        UI.renderHistory();
    }
};

window.Filtros = Filtros;

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
        // Botones por defecto con tipo SMED - INCLUYE CAMBIO DE OP
        const defaultButtons = [
            // BOTÓN ESPECIAL: Cambio de OP (mide tiempo total del cambio)
            { name: 'CAMBIO DE OP', tipo: 'INT', special: true },
            // Actividades de Troquel
            { name: 'Troquel Desmontar', tipo: 'INT' },
            { name: 'Troquel Montar', tipo: 'INT' },
            { name: 'Troquel Ajustar', tipo: 'INT' },
            // Actividades de Sello
            { name: 'Sello Desmontar', tipo: 'INT' },
            { name: 'Sello Montar', tipo: 'INT' },
            { name: 'Sello Ajustar', tipo: 'INT' },
            // Actividades de Tinta (pueden ser externas)
            { name: 'Tinta Desmontar', tipo: 'EXT' },
            { name: 'Tinta Montar', tipo: 'EXT' },
            { name: 'Tinta Preparar', tipo: 'EXT' },
            // Ajustes generales
            { name: 'Ajuste Registro', tipo: 'INT' },
            { name: 'Ajuste Presión', tipo: 'INT' },
            // Mudas comunes
            { name: 'Espera Material', tipo: 'NVA' },
            { name: 'Espera Supervisor', tipo: 'NVA' },
            { name: 'Búsqueda Herramienta', tipo: 'NVA' },
            { name: 'Desplazamiento', tipo: 'NVA' }
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
    // Los timers se agrupan por CATEGORÍA + TIPO (ej: "Troquel_INT", "Troquel_EXT")
    handleButtonClick: (btnId) => {
        const btn = AppState.buttons.find(b => b.id === btnId);
        if (!btn) return;
        
        const now = Date.now();
        const tipo = btn.tipo || 'INT';
        // Clave compuesta: categoría + tipo (ej: "Troquel_INT", "Montacargas_NVA")
        const timerKey = `${btn.cat}_${tipo}`;
        
        // Verificar si hay un timer activo en esta categoría+tipo
        if (AppState.activeTimers[timerKey]) {
            const prev = AppState.activeTimers[timerKey];
            
            // Si es el mismo botón, detenerlo
            if (prev.btnId === btnId) {
                Timer.stopTimer(timerKey);
                return;
            }
            
            // Cerrar el timer anterior (mismo grupo categoría+tipo)
            const duration = (now - prev.start) / 1000;
            Timer.saveRecord(prev, duration);
        }
        
        // Iniciar nuevo timer
        AppState.activeTimers[timerKey] = {
            btnId: btnId,
            btnName: btn.name,
            cat: btn.cat,
            tipo: tipo,
            timerKey: timerKey,
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
        
        const record = {
            id: Utils.generateId(),
            name: timer.btnName,
            cat: timer.cat,
            tipo: timer.tipo || 'INT',          // Tipo: INT, EXT, NVA (viene del timer)
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
            fecha: now.toISOString().split('T')[0],
            // Campo de notas
            notas: ''
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
        
        // Actualizar filtro de categorías
        if (typeof CategoryFilter !== 'undefined') {
            CategoryFilter.selectAll(); // Auto-seleccionar la nueva categoría
        }
        
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
// EXPORT/IMPORT CSV - FORMATO v3 OPTIMIZADO (13 campos)
// =====================================================

/*
 * FORMATO CSV v3 (sin redundancia):
 * 
 * HEADERS: ID, FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg, Notas
 * 
 * CAMPOS:
 * - ID: Identificador único del registro
 * - FechaExcel: Número ENTERO = días desde 1900 (formato Excel, SIN decimales)
 * - Maquina: Código de máquina (ej: "i5", "i10")
 * - OP: Número de orden de producción
 * - Colores: Cantidad de colores del pedido (1-8)
 * - Turno: T1, T2, T3
 * - Actividad: Nombre de la actividad
 * - Categoria: Categoría (primera palabra del nombre)
 * - Tipo: INT (interna), EXT (externa), NVA (muda/no valor agregado)
 * - InicioSeg: Segundos del día (0-86399) cuando INICIÓ la actividad
 * - FinSeg: Segundos del día (0-86399) cuando TERMINÓ la actividad
 * - DuracionSeg: Duración en segundos
 * - Notas: Observaciones opcionales
 * 
 * LÓGICA DE DATOS:
 * - Localización temporal: FechaExcel (entero) = DÍA
 * - Ubicación en el día: InicioSeg y FinSeg = segundos 0-86399
 * - Sin redundancia: La fecha no tiene hora, los segundos no tienen fecha
 * 
 * EJEMPLO para importar datos externos:
 * FechaExcel = 46047 (es 27/01/2026)
 * InicioSeg = 36000 (es 10:00:00)
 * FinSeg = 36300 (es 10:05:00)
 * DuracionSeg = 300 (5 minutos)
 * 
 * COMPATIBILIDAD:
 * - Importa formatos v1 (legacy), v2 (16 campos) y v3 (13 campos)
 * - Exporta solo formato v3
 */

// =====================================================
// SISTEMA DE INTEGRIDAD CSV v2.0
// Validación completa para exportación/importación
// =====================================================

const CSVIntegrity = {
    // Versión del formato CSV
    VERSION: '2.0',
    
    // Calcular checksum simple (hash básico)
    calculateChecksum: (data) => {
        let hash = 0;
        const str = JSON.stringify(data);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    },
    
    // Validar registro individual
    validateRecord: (record, rowIndex) => {
        const errors = [];
        const warnings = [];
        
        // Campos requeridos
        if (!record.name || !record.name.trim()) {
            errors.push(`Fila ${rowIndex}: Nombre de actividad es requerido`);
        }
        
        const duracion = record.duracion || record.duration;
        if (duracion === undefined || duracion === null || isNaN(duracion)) {
            errors.push(`Fila ${rowIndex}: Duración inválida o faltante`);
        } else if (duracion < 0) {
            errors.push(`Fila ${rowIndex}: Duración no puede ser negativa`);
        } else if (duracion === 0) {
            warnings.push(`Fila ${rowIndex}: Duración es 0 segundos`);
        }
        
        // Validar tipo SMED
        const tiposValidos = ['INT', 'EXT', 'NVA'];
        if (record.tipo && !tiposValidos.includes(record.tipo.toUpperCase())) {
            warnings.push(`Fila ${rowIndex}: Tipo "${record.tipo}" no es válido (INT/EXT/NVA), se usará INT`);
            record.tipo = 'INT';
        }
        
        // Validar colores
        if (record.colores !== undefined) {
            const colores = parseInt(record.colores);
            if (isNaN(colores) || colores < 1 || colores > 12) {
                warnings.push(`Fila ${rowIndex}: Colores "${record.colores}" inválido, se usará 1`);
                record.colores = 1;
            }
        }
        
        // Validar turno
        const turnosValidos = ['T1', 'T2', 'T3'];
        if (record.turno && !turnosValidos.includes(record.turno.toUpperCase())) {
            warnings.push(`Fila ${rowIndex}: Turno "${record.turno}" no válido, se usará T1`);
            record.turno = 'T1';
        }
        
        // Validar fecha
        if (record.fecha) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(record.fecha)) {
                warnings.push(`Fila ${rowIndex}: Formato de fecha inválido "${record.fecha}"`);
            }
        }
        
        return { errors, warnings, record };
    },
    
    // Normalizar registro (unificar campos legacy)
    normalizeRecord: (record) => {
        const normalized = { ...record };
        
        // Normalizar duración (usar duracion como principal)
        if (normalized.duration !== undefined && normalized.duracion === undefined) {
            normalized.duracion = normalized.duration;
        } else if (normalized.duracion !== undefined) {
            normalized.duration = normalized.duracion;
        }
        
        // Asegurar valores por defecto
        normalized.tipo = (normalized.tipo || 'INT').toUpperCase();
        normalized.turno = (normalized.turno || 'T1').toUpperCase();
        normalized.colores = parseInt(normalized.colores) || 1;
        normalized.cat = normalized.cat || Utils.extractCategory(normalized.name);
        normalized.notas = normalized.notas || '';
        
        // Generar ID si no existe
        if (!normalized.id) {
            normalized.id = Utils.generateId();
        }
        
        // Calcular fechaExcel si falta
        if (!normalized.fechaExcel) {
            if (normalized.timestamp) {
                normalized.fechaExcel = Utils.dateToExcel(new Date(normalized.timestamp));
            } else if (normalized.fecha) {
                normalized.fechaExcel = Utils.dateToExcel(new Date(normalized.fecha + 'T12:00:00'));
            } else {
                normalized.fechaExcel = Utils.dateToExcel(new Date());
            }
        }
        
        // Calcular fecha legible si falta
        if (!normalized.fecha && normalized.fechaExcel) {
            const dateObj = Utils.excelToDate(normalized.fechaExcel);
            normalized.fecha = dateObj.toISOString().split('T')[0];
        }
        
        // Calcular timestamp si falta
        if (!normalized.timestamp) {
            if (normalized.fechaExcel) {
                normalized.timestamp = Utils.excelToDate(normalized.fechaExcel).getTime();
            } else {
                normalized.timestamp = Date.now();
            }
        }
        
        return normalized;
    }
};

const CSV = {
    // Exportar con formato v3 optimizado (13 campos, sin redundancia)
    export: () => {
        if (AppState.registros.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        // Pedir nombre de quien guarda el archivo
        const nombreUsuario = prompt('¿Quién guarda este archivo? (Tu nombre):', '');
        if (nombreUsuario === null) {
            return;
        }
        
        const nombreLimpio = nombreUsuario.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Usuario';
        const fechaExport = new Date().toISOString();
        
        // Headers v3 - 13 campos sin redundancia
        // FechaExcel = entero (solo día), InicioSeg/FinSeg = segundos del día
        const headers = ['ID', 'FechaExcel', 'Maquina', 'OP', 'Colores', 'Turno', 'Actividad', 'Categoria', 'Tipo', 'InicioSeg', 'FinSeg', 'DuracionSeg', 'Notas'];
        
        const rows = AppState.registros.map(r => {
            // Normalizar registro antes de exportar
            const nr = CSVIntegrity.normalizeRecord(r);
            
            // Calcular tiempos en segundos si no existen
            let finSeg = nr.finSeg;
            if (finSeg === undefined && nr.endTime) {
                const [h, m, s] = nr.endTime.split(':').map(Number);
                finSeg = (h * 3600) + (m * 60) + (s || 0);
            } else if (finSeg === undefined) {
                finSeg = 0;
            }
            
            let inicioSeg = nr.inicioSeg;
            if (inicioSeg === undefined) {
                inicioSeg = Utils.round2(finSeg - (nr.duracion || 0));
                if (inicioSeg < 0) inicioSeg += 86400;
            }
            
            // FechaExcel como entero (solo día, sin decimales)
            const fechaExcelInt = Math.floor(nr.fechaExcel || Utils.dateToExcel(new Date()));
            
            return [
                nr.id,
                fechaExcelInt,                              // Entero: solo día
                nr.maquina || '',
                nr.op || '',
                nr.colores || 1,
                nr.turno || 'T1',
                nr.name || '',
                nr.cat || '',
                nr.tipo || 'INT',
                Utils.round2(inicioSeg),
                Utils.round2(finSeg),
                Utils.round2(nr.duracion || nr.duration || 0),
                (nr.notas || '').replace(/[\r\n]+/g, ' ')   // Notas sin saltos de línea
            ];
        });
        
        // Calcular checksum de integridad
        const checksum = CSVIntegrity.calculateChecksum(rows);
        
        // Construir CSV con metadatos
        let csvContent = '\ufeff'; // BOM para UTF-8
        // Línea de metadatos (comentario) - v3
        csvContent += `#SMED_CSV_V3.0,${fechaExport},${nombreLimpio},${AppState.registros.length},${checksum}\n`;
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => 
            row.map((cell, i) => {
                // Campos de texto entre comillas: ID, Maquina, OP, Turno, Actividad, Categoria, Tipo, Notas
                if ([0, 2, 3, 5, 6, 7, 8, 12].includes(i)) {
                    return `"${String(cell).replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SMED_${new Date().toISOString().split('T')[0]}_${nombreLimpio}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        
        console.log(`✅ CSV v3 exportado: ${rows.length} registros, checksum: ${checksum}`);
    },
    
    // Parsear una línea CSV respetando comillas
    parseCSVLine: (line) => {
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
        return values;
    },
    
    // Importar con validación completa y preview
    import: (file) => {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                let lines = text.split('\n').filter(line => line.trim());
                
                // Detectar metadatos (línea que empieza con #)
                let metadata = null;
                let checksumOriginal = null;
                if (lines[0].startsWith('#SMED_CSV_V')) {
                    const metaLine = lines[0].substring(1);
                    const metaParts = metaLine.split(',');
                    metadata = {
                        version: metaParts[0] || '',
                        fecha: metaParts[1] || '',
                        usuario: metaParts[2] || '',
                        registros: parseInt(metaParts[3]) || 0,
                        checksum: metaParts[4] || ''
                    };
                    checksumOriginal = metadata.checksum;
                    lines = lines.slice(1); // Quitar línea de metadatos
                }
                
                // Detectar formato por headers
                const headerLine = lines[0].toLowerCase();
                // v3: ID, FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg, Notas
                const isV3Format = headerLine.startsWith('id,fechaexcel,maquina') || 
                                   (headerLine.includes('fechaexcel') && !headerLine.includes('fecha,horafin'));
                // v2: ID, Fecha, HoraFin, FechaExcel, ...
                const isV2Format = headerLine.includes('id,fecha,horafin') || 
                                   (headerLine.includes('horafin') && headerLine.includes('timestamp'));
                const isNewFormat = headerLine.includes('fechaexcel') || headerLine.includes('inicioseg');
                
                // Obtener headers
                const headers = CSV.parseCSVLine(lines[0]);
                
                // Parsear datos
                const allErrors = [];
                const allWarnings = [];
                const parsedData = [];
                
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;
                    
                    const values = CSV.parseCSVLine(line);
                    let record;
                    
                    if (isV3Format) {
                        // Formato v3 optimizado (13 campos):
                        // ID, FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg, Notas
                        const fechaExcelInt = parseInt(values[1]) || Math.floor(Utils.dateToExcel(new Date()));
                        const dateObj = Utils.excelToDate(fechaExcelInt);
                        const finSeg = parseFloat(values[10]) || 0;
                        
                        record = {
                            id: values[0] || Utils.generateId(),
                            fechaExcel: fechaExcelInt,
                            maquina: values[2] || '',
                            op: values[3] || '',
                            colores: parseInt(values[4]) || 1,
                            turno: values[5] || 'T1',
                            name: values[6] || '',
                            cat: values[7] || '',
                            tipo: (values[8] || 'INT').toUpperCase(),
                            inicioSeg: parseFloat(values[9]) || 0,
                            finSeg: finSeg,
                            duracion: parseFloat(values[11]) || 0,
                            notas: values[12] || '',
                            // Campos legacy recalculados
                            duration: parseFloat(values[11]) || 0,
                            endTime: Utils.secondsToHMS(finSeg),
                            timestamp: dateObj.getTime(),
                            fecha: dateObj.toISOString().split('T')[0]
                        };
                    } else if (isV2Format) {
                        // Formato v2 completo (16 campos):
                        // ID, Fecha, HoraFin, FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg, Timestamp, Notas
                        record = {
                            id: values[0] || Utils.generateId(),
                            fecha: values[1] || '',
                            endTime: values[2] || '',
                            fechaExcel: parseFloat(values[3]) || Utils.dateToExcel(new Date()),
                            maquina: values[4] || '',
                            op: values[5] || '',
                            colores: parseInt(values[6]) || 1,
                            turno: values[7] || 'T1',
                            name: values[8] || '',
                            cat: values[9] || '',
                            tipo: (values[10] || 'INT').toUpperCase(),
                            inicioSeg: parseFloat(values[11]) || 0,
                            finSeg: parseFloat(values[12]) || 0,
                            duracion: parseFloat(values[13]) || 0,
                            timestamp: parseInt(values[14]) || Date.now(),
                            notas: values[15] || ''
                        };
                        record.duration = record.duracion;
                    } else if (isNewFormat) {
                        // Formato sin ID: FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg
                        const fechaExcel = parseFloat(values[0]) || Utils.dateToExcel(new Date());
                        const dateObj = Utils.excelToDate(fechaExcel);
                        const finSeg = parseFloat(values[9]) || 0;
                        
                        record = {
                            id: Utils.generateId(),
                            fechaExcel: Math.floor(fechaExcel),
                            maquina: values[1] || '',
                            op: values[2] || '',
                            colores: parseInt(values[3]) || 1,
                            turno: values[4] || 'T1',
                            name: values[5] || '',
                            cat: values[6] || '',
                            tipo: (values[7] || 'INT').toUpperCase(),
                            inicioSeg: parseFloat(values[8]) || 0,
                            finSeg: finSeg,
                            duracion: parseFloat(values[10]) || 0,
                            duration: parseFloat(values[10]) || 0,
                            endTime: Utils.secondsToHMS(finSeg),
                            timestamp: dateObj.getTime(),
                            fecha: dateObj.toISOString().split('T')[0],
                            notas: ''
                        };
                    } else {
                        // Formato legacy
                        record = {
                            id: values[0] || Utils.generateId(),
                            fecha: values[1] || new Date().toISOString().split('T')[0],
                            name: values[2] || '',
                            cat: values[3] || '',
                            duracion: parseFloat(values[4]) || 0,
                            duration: parseFloat(values[4]) || 0,
                            endTime: values[5] || '00:00:00',
                            timestamp: parseInt(values[6]) || Date.now(),
                            tipo: 'INT',
                            notas: ''
                        };
                    }
                    
                    // Validar registro
                    const validation = CSVIntegrity.validateRecord(record, i + 1);
                    allErrors.push(...validation.errors);
                    allWarnings.push(...validation.warnings);
                    
                    // Normalizar registro
                    const normalized = CSVIntegrity.normalizeRecord(validation.record);
                    
                    // Solo agregar si tiene nombre y duración válida
                    if (normalized.name && (normalized.duracion > 0 || normalized.duration > 0)) {
                        parsedData.push(normalized);
                    }
                }
                
                // Verificar checksum si existe (para v3 y v2)
                let checksumValid = true;
                if (checksumOriginal) {
                    let rowsForChecksum;
                    if (isV3Format) {
                        // Checksum v3: solo 13 campos
                        rowsForChecksum = parsedData.map(r => [
                            r.id, Math.floor(r.fechaExcel), r.maquina, r.op, r.colores, r.turno,
                            r.name, r.cat, r.tipo, r.inicioSeg, r.finSeg, r.duracion, r.notas || ''
                        ]);
                    } else {
                        // Checksum v2: 16 campos
                        rowsForChecksum = parsedData.map(r => [
                            r.id, r.fecha, r.endTime, r.fechaExcel, r.maquina, r.op, r.colores, r.turno,
                            r.name, r.cat, r.tipo, r.inicioSeg, r.finSeg, r.duracion, r.timestamp, r.notas || ''
                        ]);
                    }
                    const calculatedChecksum = CSVIntegrity.calculateChecksum(rowsForChecksum);
                    checksumValid = calculatedChecksum === checksumOriginal;
                    
                    if (!checksumValid) {
                        allWarnings.push('⚠️ El checksum no coincide. El archivo pudo haber sido modificado externamente.');
                    }
                }
                
                // Si hay errores críticos, mostrar y abortar
                if (allErrors.length > 0) {
                    const errorMsg = `❌ ERRORES DE VALIDACIÓN (${allErrors.length}):\n\n${allErrors.slice(0, 10).join('\n')}${allErrors.length > 10 ? `\n\n... y ${allErrors.length - 10} errores más` : ''}`;
                    alert(errorMsg);
                    console.error('Errores de importación:', allErrors);
                    return;
                }
                
                // Mostrar preview con opción de continuar
                CSV.showImportPreview(parsedData, allWarnings, metadata, checksumValid);
                
            } catch (error) {
                console.error('Error importando CSV:', error);
                alert('❌ Error al importar el archivo.\n\nDetalles: ' + error.message);
            }
        };
        reader.readAsText(file);
    },
    
    // Mostrar modal de preview antes de importar
    showImportPreview: (data, warnings, metadata, checksumValid) => {
        // Crear modal de preview
        let modal = document.getElementById('csvImportPreviewModal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'csvImportPreviewModal';
        
        // Calcular estadísticas del preview
        const totalDuracion = data.reduce((sum, r) => sum + (r.duracion || 0), 0);
        const tiposCount = { INT: 0, EXT: 0, NVA: 0 };
        const categoriasSet = new Set();
        const maquinasSet = new Set();
        const opsSet = new Set();
        
        data.forEach(r => {
            tiposCount[r.tipo] = (tiposCount[r.tipo] || 0) + 1;
            categoriasSet.add(r.cat);
            if (r.maquina) maquinasSet.add(r.maquina);
            if (r.op) opsSet.add(r.op);
        });
        
        const metaInfo = metadata ? `
            <div style="background: #0f0f1a; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 0.85em;">
                <strong>📄 Metadatos del archivo:</strong><br>
                Versión: ${metadata.version} | Exportado: ${new Date(metadata.fecha).toLocaleString()} | Por: ${metadata.usuario}
                ${!checksumValid ? '<br><span style="color: #f59e0b;">⚠️ Checksum modificado</span>' : '<br><span style="color: #10b981;">✓ Checksum válido</span>'}
            </div>
        ` : '';
        
        const warningsHtml = warnings.length > 0 ? `
            <div style="background: #f59e0b22; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 3px solid #f59e0b;">
                <strong style="color: #f59e0b;">⚠️ Advertencias (${warnings.length}):</strong>
                <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 0.85em; color: #ccc;">
                    ${warnings.slice(0, 5).map(w => `<li>${w}</li>`).join('')}
                    ${warnings.length > 5 ? `<li>... y ${warnings.length - 5} más</li>` : ''}
                </ul>
            </div>
        ` : '';
        
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div style="background: #1a1a2e; padding: 25px; border-radius: 12px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; border: 2px solid #00d4ff;">
                    <h3 style="margin: 0 0 20px 0; color: #00d4ff;">📥 Preview de Importación</h3>
                    
                    ${metaInfo}
                    ${warningsHtml}
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                        <div style="background: #0a0a0a; padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8em; color: #00d4ff; font-weight: bold;">${data.length}</div>
                            <div style="font-size: 0.8em; color: #888;">Registros</div>
                        </div>
                        <div style="background: #0a0a0a; padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8em; color: #00ff9d; font-weight: bold;">${Utils.formatDuration(totalDuracion)}</div>
                            <div style="font-size: 0.8em; color: #888;">Tiempo Total</div>
                        </div>
                        <div style="background: #0a0a0a; padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8em; color: #8b5cf6; font-weight: bold;">${categoriasSet.size}</div>
                            <div style="font-size: 0.8em; color: #888;">Categorías</div>
                        </div>
                        <div style="background: #0a0a0a; padding: 12px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.8em; color: #f59e0b; font-weight: bold;">${opsSet.size}</div>
                            <div style="font-size: 0.8em; color: #888;">OPs</div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <h5 style="margin: 0 0 8px 0; color: #888;">Distribución por Tipo:</h5>
                            <div style="display: flex; gap: 10px;">
                                <span style="background: #f9731622; color: #f97316; padding: 5px 10px; border-radius: 15px;">🟠 INT: ${tiposCount.INT || 0}</span>
                                <span style="background: #10b98122; color: #10b981; padding: 5px 10px; border-radius: 15px;">🟢 EXT: ${tiposCount.EXT || 0}</span>
                                <span style="background: #ef444422; color: #ef4444; padding: 5px 10px; border-radius: 15px;">🔴 NVA: ${tiposCount.NVA || 0}</span>
                            </div>
                        </div>
                        <div>
                            <h5 style="margin: 0 0 8px 0; color: #888;">Máquinas encontradas:</h5>
                            <div style="color: #00d4ff; font-size: 0.9em;">${maquinasSet.size > 0 ? [...maquinasSet].join(', ') : 'Ninguna'}</div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h5 style="margin: 0 0 8px 0; color: #888;">Muestra de datos (primeros 5):</h5>
                        <div style="max-height: 200px; overflow-y: auto; background: #0a0a0a; border-radius: 6px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.8em;">
                                <thead>
                                    <tr style="background: #1a1a2e; position: sticky; top: 0;">
                                        <th style="padding: 8px; text-align: left;">Actividad</th>
                                        <th style="padding: 8px; text-align: left;">Cat</th>
                                        <th style="padding: 8px; text-align: center;">Tipo</th>
                                        <th style="padding: 8px; text-align: right;">Duración</th>
                                        <th style="padding: 8px; text-align: left;">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.slice(0, 5).map(r => `
                                        <tr style="border-bottom: 1px solid #333;">
                                            <td style="padding: 6px 8px; color: #fff;">${r.name}</td>
                                            <td style="padding: 6px 8px; color: #888;">${r.cat}</td>
                                            <td style="padding: 6px 8px; text-align: center; color: ${r.tipo === 'NVA' ? '#ef4444' : r.tipo === 'EXT' ? '#10b981' : '#f97316'};">${r.tipo}</td>
                                            <td style="padding: 6px 8px; text-align: right; color: #00d4ff;">${(r.duracion || 0).toFixed(1)}s</td>
                                            <td style="padding: 6px 8px; color: #666;">${r.fecha || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div style="background: #1e40af22; padding: 12px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #3b82f6;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" id="importReplaceData" checked style="width: 18px; height: 18px;">
                            <span style="color: #fff;">Reemplazar datos existentes (${AppState.registros.length} registros actuales)</span>
                        </label>
                        <p style="margin: 8px 0 0 28px; font-size: 0.8em; color: #888;">Si desmarca, los datos se agregarán a los existentes.</p>
                    </div>
                    
                    <div style="display: flex; gap: 15px; justify-content: flex-end;">
                        <button onclick="CSV.cancelImport()" style="padding: 12px 25px; background: #666; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em;">
                            ✕ Cancelar
                        </button>
                        <button onclick="CSV.confirmImport()" style="padding: 12px 25px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1em; font-weight: bold;">
                            ✓ Importar ${data.length} registros
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Guardar datos temporalmente para confirmar
        CSV._pendingImport = data;
    },
    
    // Cancelar importación
    cancelImport: () => {
        const modal = document.getElementById('csvImportPreviewModal');
        if (modal) modal.remove();
        CSV._pendingImport = null;
    },
    
    // Confirmar e importar datos
    confirmImport: () => {
        const data = CSV._pendingImport;
        if (!data || data.length === 0) {
            alert('No hay datos para importar');
            return;
        }
        
        const replaceData = document.getElementById('importReplaceData')?.checked ?? true;
        
        // Crear backup antes de importar
        Storage.createBackup();
        console.log('📦 Backup creado antes de importar');
        
        // Importar datos
        if (replaceData) {
            AppState.registros = data;
        } else {
            // Agregar al inicio (más recientes primero)
            AppState.registros = [...data, ...AppState.registros];
        }
        
        // Crear botones automáticamente desde datos importados
        const existingBtnNames = new Set(AppState.buttons.map(b => b.name.toLowerCase()));
        const newButtonsCreated = [];
        
        data.forEach(r => {
            const btnName = r.name;
            if (btnName && !existingBtnNames.has(btnName.toLowerCase())) {
                existingBtnNames.add(btnName.toLowerCase());
                AppState.buttons.push({
                    id: Utils.generateId(),
                    name: btnName,
                    cat: r.cat || Utils.extractCategory(btnName),
                    tipo: r.tipo || 'INT',
                    color: null
                });
                newButtonsCreated.push(btnName);
            }
        });
        
        // Agregar máquinas nuevas
        const maquinasNuevas = [];
        data.forEach(r => {
            if (r.maquina && !AppState.config.maquinas.includes(r.maquina)) {
                AppState.config.maquinas.push(r.maquina);
                maquinasNuevas.push(r.maquina);
            }
        });
        
        // Ordenar máquinas
        AppState.config.maquinas.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numA - numB;
        });
        
        // Guardar y actualizar UI
        Storage.save();
        UI.renderAll();
        MaquinaManager.updateSelectors();
        Filtros.updateAllFilters();
        
        // Cerrar modal
        CSV.cancelImport();
        
        // Mostrar resumen
        let mensaje = `✅ ${data.length} registros importados correctamente`;
        if (newButtonsCreated.length > 0) {
            mensaje += `\n\n🔘 ${newButtonsCreated.length} botones nuevos creados`;
        }
        if (maquinasNuevas.length > 0) {
            mensaje += `\n\n🏭 ${maquinasNuevas.length} máquinas nuevas: ${maquinasNuevas.join(', ')}`;
        }
        
        alert(mensaje);
        console.log(`✅ Importación completada: ${data.length} registros, ${newButtonsCreated.length} botones, ${maquinasNuevas.length} máquinas`);
    },
    
    // Datos pendientes de importar
    _pendingImport: null
};

// Exponer CSVIntegrity globalmente
window.CSVIntegrity = CSVIntegrity;

// =====================================================
// ORGANIZADOR DE BOTONES
// =====================================================

const ButtonOrganizer = {
    // Modo de ordenamiento actual
    sortBy: 'category', // category, name, type, color
    
    // Obtener botones ordenados
    getSorted: () => {
        let sorted = [...AppState.buttons];
        
        switch(ButtonOrganizer.sortBy) {
            case 'name':
                // Ordenar alfabéticamente por nombre
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
                
            case 'category':
                // Ordenar por categoría, luego por nombre
                sorted.sort((a, b) => {
                    const catCompare = a.cat.localeCompare(b.cat);
                    if (catCompare !== 0) return catCompare;
                    return a.name.localeCompare(b.name);
                });
                break;
                
            case 'type':
                // Ordenar por tipo SMED (INT → EXT → NVA)
                const typeOrder = { INT: 0, EXT: 1, NVA: 2 };
                sorted.sort((a, b) => {
                    const typeA = a.tipo || 'INT';
                    const typeB = b.tipo || 'INT';
                    const orderCompare = typeOrder[typeA] - typeOrder[typeB];
                    if (orderCompare !== 0) return orderCompare;
                    return a.name.localeCompare(b.name);
                });
                break;
                
            case 'color':
                // Ordenar por color (hue del color hexadecimal)
                sorted.sort((a, b) => {
                    const colorA = a.color || Utils.getCategoryColor(a.cat);
                    const colorB = b.color || Utils.getCategoryColor(b.cat);
                    
                    // Convertir hex a valor numérico para ordenar
                    const hexToNum = (hex) => parseInt(hex.replace('#', ''), 16);
                    return hexToNum(colorA) - hexToNum(colorB);
                });
                break;
                
            default:
                // Sin ordenamiento (orden de creación)
                break;
        }
        
        return sorted;
    },
    
    // Cambiar modo de ordenamiento
    setSortMode: (mode) => {
        ButtonOrganizer.sortBy = mode;
        // Guardar preferencia
        localStorage.setItem('smed_button_sort', mode);
        UI.renderButtons();
    },
    
    // Cargar preferencia guardada
    loadPreference: () => {
        const saved = localStorage.getItem('smed_button_sort');
        if (saved) {
            ButtonOrganizer.sortBy = saved;
            // Actualizar selector en UI si existe
            const selector = document.getElementById('btnSortOrder');
            if (selector) selector.value = saved;
        }
    }
};

// Exponer globalmente
window.ButtonOrganizer = ButtonOrganizer;

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
    
    // Grid de botones SMED - muestra OP activa en cada botón con colores personalizados
    // Los botones verifican si están activos usando la clave compuesta cat_tipo
    renderButtons: () => {
        const container = document.getElementById('buttonsGrid');
        if (!container) return;
        
        // Mostrar OP activa en cada botón
        const opActiva = AppState.opActiva.numero ? AppState.opActiva.numero.padStart(8, '0') : '';
        const turnoActivo = AppState.opActiva.turno || 'T1';
        
        // Obtener botones ordenados según preferencia del usuario
        const sortedButtons = ButtonOrganizer.getSorted();
        
        // Filtrar botones según el filtro de categorías
        const filteredButtons = sortedButtons.filter(btn => {
            return typeof CategoryFilter !== 'undefined' ? CategoryFilter.shouldShowButton(btn) : true;
        });
        
        container.innerHTML = filteredButtons.map(btn => {
            // Clave compuesta: categoría + tipo (ej: "Troquel_INT", "Montacargas_NVA")
            const timerKey = `${btn.cat}_${btn.tipo || 'INT'}`;
            const isActive = AppState.activeTimers[timerKey] && 
                           AppState.activeTimers[timerKey].btnId === btn.id;
            const elapsed = isActive ? Timer.getElapsedTime(timerKey) : 0;
            
            // Obtener color del botón (personalizado o automático por categoría)
            const btnColor = btn.color || Utils.getCategoryColor(btn.cat);
            
            // Estilos dinámicos con color personalizado visible
            const btnStyle = `
                border-left: 4px solid ${btnColor};
                ${isActive ? `
                    background: linear-gradient(135deg, ${btnColor}15, ${btnColor}05);
                    box-shadow: 0 0 15px ${btnColor}60, inset 0 0 20px ${btnColor}10;
                ` : ''}
            `.replace(/\s+/g, ' ').trim();
            
            return `
                <button class="smed-btn ${isActive ? 'is-running' : ''}" 
                        data-cat="${btn.cat}"
                        data-tipo="${btn.tipo || 'INT'}"
                        data-timer-key="${timerKey}"
                        style="${btnStyle}"
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
    
    // Historial de actividades - USA FILTROS CENTRALIZADOS
    renderHistory: () => {
        const container = document.getElementById('historyList');
        if (!container) return;
        
        // Actualizar opciones del filtro
        UI.updateHistoryFilterOptions();
        Filtros.updateAllFilters();
        
        if (AppState.registros.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades registradas</div>';
            UI.updateHistoryCount(0, 0);
            return;
        }
        
        // USAR FILTROS CENTRALIZADOS
        const filtered = Filtros.getFiltered('history');
        
        // Actualizar contador
        UI.updateHistoryCount(filtered.length, AppState.registros.length);
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades con los filtros actuales</div>';
            return;
        }
        
        container.innerHTML = filtered.slice(0, 100).map(record => {
            const tipoColor = record.tipo === 'NVA' ? '#ef4444' : record.tipo === 'EXT' ? '#10b981' : '#f97316';
            const tipoIcon = record.tipo === 'NVA' ? '🔴' : record.tipo === 'EXT' ? '🟢' : '🟠';
            const hasNotas = record.notas && record.notas.trim().length > 0;
            
            return `
            <div class="history-item" data-record-id="${record.id}">
                <div class="item-info">
                    <span class="item-name">${tipoIcon} ${record.name}${hasNotas ? ' <span title="Tiene notas" style="opacity:0.7;">📝</span>' : ''}</span>
                    <span class="item-cat">${record.cat}${record.op ? ` • <span style="color:#00ff9d;">OP:${record.op}</span>` : ''}${record.turno ? ` [${record.turno}]` : ''}${record.maquina ? ` <span style="color:#00d4ff;">${record.maquina}</span>` : ''}</span>
                    <span class="item-time">${record.fecha || ''} ${record.endTime || ''}${record.colores > 1 ? ` • ${record.colores}col` : ''}</span>
                </div>
                <div class="item-actions" style="display: flex; gap: 5px; align-items: center;">
                    <span class="item-duration" style="color: ${tipoColor}; font-weight: bold;">${(record.duration || record.duracion || 0).toFixed(1)}s</span>
                    <button class="edit-btn" onclick="RecordEditor.open('${record.id}')" title="Editar" style="background:#3b82f6; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">✏️</button>
                    <button class="delete-btn" onclick="Timer.deleteRecord('${record.id}')" title="Eliminar">×</button>
                </div>
            </div>
        `}).join('');
    },
    
    // Actualizar contador de registros filtrados
    updateHistoryCount: (filtrados, total) => {
        const countEl = document.getElementById('historyCount');
        if (countEl) {
            countEl.textContent = filtrados === total ? `${total} registros` : `${filtrados} de ${total} registros`;
        }
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
    
    // Cargar preferencia de ordenamiento de botones
    ButtonOrganizer.loadPreference();
    
    // Auto-seleccionar turno basado en fecha/hora actual
    setTimeout(() => {
        TurnoManager.autoSelectTurno();
    }, 100);
    
    // Renderizar UI inicial
    UI.renderAll();
    
    // Inicializar filtros globales
    setTimeout(() => {
        GlobalFilters.init();
        DateNavigator.init();
        CategoryFilter.init();
    }, 200);
    
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
    // Lista de timers activos { id, start, interval, tempName }
    active: [],
    
    // Agregar nuevo cronómetro libre
    add: () => {
        const id = Utils.generateId();
        const timer = {
            id: id,
            start: Date.now(),
            interval: null,
            stopped: false,
            elapsed: 0,
            tempName: '' // Nombre temporal mientras corre el cronómetro
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
    
    // Actualizar nombre temporal de un cronómetro
    updateTempName: (id, name) => {
        const timer = FreeTimers.active.find(t => t.id === id);
        if (timer) {
            timer.tempName = name;
        }
    },
    
    // Detener un cronómetro (mostrar panel de datos)
    stop: (id) => {
        const timer = FreeTimers.active.find(t => t.id === id);
        if (timer && !timer.stopped) {
            // Capturar nombre temporal del input antes de detener
            const tempInput = document.getElementById(`freeTimerTempName_${id}`);
            if (tempInput) {
                timer.tempName = tempInput.value.trim();
            }
            
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
            fecha: now.toISOString().split('T')[0],
            notas: ''
        };
        
        AppState.registros.unshift(record);
        Storage.save();
        
        // Eliminar este timer de la lista
        FreeTimers.remove(id);
        UI.renderAll();
        
        // Mostrar feedback visual mejorado
        FreeTimers.showSaveNotification(name, duration);
    },
    
    // Mostrar notificación de guardado exitoso
    showSaveNotification: (name, duration) => {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
            z-index: 9999;
            font-weight: bold;
            animation: slideIn 0.3s ease-out;
        `;
        notification.innerHTML = `✅ "${name}" guardado en historial: ${duration.toFixed(1)}s`;
        
        // Añadir animación CSS si no existe
        if (!document.getElementById('notificationStyles')) {
            const style = document.createElement('style');
            style.id = 'notificationStyles';
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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
                // Mostrar panel de datos con nombre prellenado
                return `
                    <div style="background: #1a1a2e; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #8b5cf6;">
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end;">
                            <div style="flex: 0; min-width: 80px;">
                                <span style="font-size: 1.3em; color: #8b5cf6; font-weight: bold; font-family: monospace;">${elapsed}s</span>
                            </div>
                            <div style="flex: 2; min-width: 120px;">
                                <label style="font-size: 10px; color: #888;">Nombre:</label>
                                <input type="text" id="freeTimerName_${timer.id}" placeholder="Ej: Espera supervisor" value="${timer.tempName || ''}"
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
                            <button class="action-btn success" onclick="FreeTimers.save('${timer.id}')" style="padding: 6px 12px;">✓ Guardar</button>
                            <button class="action-btn danger" onclick="FreeTimers.remove('${timer.id}')" style="padding: 6px 12px;">✕</button>
                        </div>
                    </div>
                `;
            } else {
                // Mostrar timer corriendo con campo de nombre editable inline
                return `
                    <div style="display: flex; align-items: center; gap: 10px; background: #1a1a2e; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 2px solid #8b5cf6;">
                        <span id="freeTimerDisplay_${timer.id}" style="font-size: 1.2em; color: #8b5cf6; font-weight: bold; font-family: monospace; min-width: 70px;">${elapsed}s</span>
                        <input type="text" 
                               id="freeTimerTempName_${timer.id}" 
                               placeholder="Nombre temporal (ej: Espera material)"
                               value="${timer.tempName || ''}"
                               oninput="FreeTimers.updateTempName('${timer.id}', this.value)"
                               style="flex: 1; min-width: 150px; padding: 8px; border-radius: 4px; border: 1px solid #8b5cf6; background: #0a0a0a; color: #fff; font-size: 0.95em;">
                        <button class="action-btn" onclick="FreeTimers.stop('${timer.id}')" style="background: #ef4444; padding: 8px 15px; font-size: 1em; white-space: nowrap;">⏹️ Detener</button>
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
            
            let html = isFilter ? '<option value="ALL">Todas las máquinas</option>' : '<option value="">--</option>';
            
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

// =====================================================
// EDITOR DE REGISTROS INDIVIDUALES
// =====================================================

const RecordEditor = {
    currentId: null,
    
    // Abrir editor para un registro específico
    open: (id) => {
        const record = AppState.registros.find(r => r.id === id);
        if (!record) {
            alert('Registro no encontrado');
            return;
        }
        
        RecordEditor.currentId = id;
        
        // Crear modal si no existe
        let modal = document.getElementById('recordEditorModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'recordEditorModal';
            modal.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center;">
                    <div style="background: #1a1a2e; padding: 20px; border-radius: 12px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; border: 2px solid #3b82f6;">
                        <h3 style="margin: 0 0 15px 0; color: #00d4ff;">✏️ Editar Actividad</h3>
                        <div id="editorFields" style="display: grid; gap: 12px;"></div>
                        <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
                            <button onclick="RecordEditor.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancelar</button>
                            <button onclick="RecordEditor.save()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">💾 Guardar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Llenar campos
        const fieldsContainer = document.getElementById('editorFields');
        
        // Generar opciones de máquinas
        const maquinaOpts = AppState.config.maquinas.map(m => 
            `<option value="${m}" ${record.maquina === m ? 'selected' : ''}>${m}</option>`
        ).join('');
        
        fieldsContainer.innerHTML = `
            <div>
                <label style="font-size: 11px; color: #888;">Actividad:</label>
                <input type="text" id="edit_name" value="${record.name || ''}" 
                       style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
            </div>
            <div>
                <label style="font-size: 11px; color: #888;">Categoría:</label>
                <input type="text" id="edit_cat" value="${record.cat || ''}" 
                       style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <label style="font-size: 11px; color: #888;">Tipo SMED:</label>
                    <select id="edit_tipo" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                        <option value="INT" ${record.tipo === 'INT' ? 'selected' : ''}>🟠 Interna</option>
                        <option value="EXT" ${record.tipo === 'EXT' ? 'selected' : ''}>🟢 Externa</option>
                        <option value="NVA" ${record.tipo === 'NVA' ? 'selected' : ''}>🔴 Muda/NVA</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: #888;">Duración (seg):</label>
                    <input type="number" step="0.1" id="edit_duracion" value="${record.duracion || record.duration || 0}" 
                           style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                    <label style="font-size: 11px; color: #888;">Máquina:</label>
                    <select id="edit_maquina" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                        <option value="">-- Sin asignar --</option>
                        ${maquinaOpts}
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: #888;">OP:</label>
                    <input type="text" id="edit_op" value="${record.op || ''}" 
                           style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                <div>
                    <label style="font-size: 11px; color: #888;">Turno:</label>
                    <select id="edit_turno" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                        <option value="T1" ${record.turno === 'T1' ? 'selected' : ''}>T1</option>
                        <option value="T2" ${record.turno === 'T2' ? 'selected' : ''}>T2</option>
                        <option value="T3" ${record.turno === 'T3' ? 'selected' : ''}>T3</option>
                    </select>
                </div>
                <div>
                    <label style="font-size: 11px; color: #888;">Colores:</label>
                    <input type="number" min="1" max="8" id="edit_colores" value="${record.colores || 1}" 
                           style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                </div>
                <div>
                    <label style="font-size: 11px; color: #888;">Fecha:</label>
                    <input type="date" id="edit_fecha" value="${record.fecha || ''}" 
                           style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff;">
                </div>
            </div>
            <div>
                <label style="font-size: 11px; color: #888;">📝 Notas / Observaciones:</label>
                <textarea id="edit_notas" rows="3" placeholder="Comentarios, observaciones, causas de demora..."
                          style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #444; background: #0a0a0a; color: #fff; resize: vertical; font-family: inherit;">${record.notas || ''}</textarea>
            </div>
        `;
        
        modal.style.display = 'block';
    },
    
    // Cerrar editor
    close: () => {
        const modal = document.getElementById('recordEditorModal');
        if (modal) {
            modal.style.display = 'none';
        }
        RecordEditor.currentId = null;
    },
    
    // Guardar cambios
    save: () => {
        if (!RecordEditor.currentId) return;
        
        const record = AppState.registros.find(r => r.id === RecordEditor.currentId);
        if (!record) {
            alert('Registro no encontrado');
            return;
        }
        
        // Obtener valores del formulario
        const newName = document.getElementById('edit_name')?.value.trim();
        const newCat = document.getElementById('edit_cat')?.value.trim();
        const newTipo = document.getElementById('edit_tipo')?.value;
        const newDuracion = parseFloat(document.getElementById('edit_duracion')?.value) || 0;
        const newMaquina = document.getElementById('edit_maquina')?.value;
        const newOP = document.getElementById('edit_op')?.value.trim();
        const newTurno = document.getElementById('edit_turno')?.value;
        const newColores = parseInt(document.getElementById('edit_colores')?.value) || 1;
        const newFecha = document.getElementById('edit_fecha')?.value;
        const newNotas = document.getElementById('edit_notas')?.value.trim();
        
        // Validar
        if (!newName) {
            alert('El nombre de la actividad es requerido');
            return;
        }
        
        // Actualizar registro
        record.name = newName;
        record.cat = newCat || Utils.extractCategory(newName);
        record.tipo = newTipo || 'INT';
        record.duracion = Utils.round2(newDuracion);
        record.duration = Utils.round2(newDuracion);
        record.maquina = newMaquina || '';
        record.op = newOP || '';
        record.turno = newTurno || 'T1';
        record.colores = newColores;
        record.notas = newNotas || '';
        
        if (newFecha) {
            record.fecha = newFecha;
            record.fechaExcel = Utils.dateToExcel(new Date(newFecha + 'T12:00:00'));
        }
        
        // Guardar y actualizar UI
        Storage.save();
        UI.renderAll();
        RecordEditor.close();
        
        console.log('✅ Registro actualizado:', record.id);
    }
};

// =====================================================
// FILTROS GLOBALES UNIFICADOS
// =====================================================

const GlobalFilters = {
    // Estado del panel (expandido/colapsado)
    isExpanded: true,
    
    // Toggle expandir/colapsar
    toggle: () => {
        const content = document.getElementById('globalFiltersContent');
        const btn = document.getElementById('filtersToggleBtn');
        const wrapper = document.getElementById('globalFiltersWrapper');
        
        if (!content || !btn) return;
        
        GlobalFilters.isExpanded = !GlobalFilters.isExpanded;
        
        if (GlobalFilters.isExpanded) {
            content.classList.remove('collapsed');
            btn.textContent = '−';
        } else {
            content.classList.add('collapsed');
            btn.textContent = '+';
        }
    },
    
    // Establecer período
    setPeriod: (period) => {
        // Actualizar estado
        AppState.filtros.periodo = period;
        
        // Limpiar fechas personalizadas si no es custom
        if (period !== 'custom') {
            AppState.filtros.fechaDesde = null;
            AppState.filtros.fechaHasta = null;
            document.getElementById('globalDateFrom').value = '';
            document.getElementById('globalDateTo').value = '';
        }
        
        // Actualizar UI de botones
        document.querySelectorAll('.global-filter-btn[data-period]').forEach(btn => {
            if (btn.getAttribute('data-period') === period) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Aplicar filtros
        GlobalFilters.applyFilters();
    },
    
    // Establecer rango personalizado
    setCustomRange: () => {
        const desde = document.getElementById('globalDateFrom')?.value;
        const hasta = document.getElementById('globalDateTo')?.value;
        
        if (desde || hasta) {
            AppState.filtros.periodo = 'custom';
            AppState.filtros.fechaDesde = desde || null;
            AppState.filtros.fechaHasta = hasta || null;
            
            // Desactivar botones de período
            document.querySelectorAll('.global-filter-btn[data-period]').forEach(btn => {
                btn.classList.remove('active');
            });
            
            GlobalFilters.applyFilters();
        }
    },
    
    // Aplicar todos los filtros
    applyFilters: () => {
        // Sincronizar con selectores legacy (para compatibilidad con código existente)
        GlobalFilters.syncLegacySelectors();
        
        // Actualizar badge de filtros activos
        GlobalFilters.updateBadge();
        
        // Renderizar todas las vistas
        UI.renderHistory();
        
        if (typeof Statistics !== 'undefined') {
            Statistics.calculate();
        }
        
        if (typeof Analysis !== 'undefined') {
            Analysis.render();
        }
        
        if (typeof Gantt !== 'undefined') {
            Gantt.render();
        }
    },
    
    // Sincronizar con selectores legacy
    syncLegacySelectors: () => {
        const maquina = document.getElementById('globalFilterMaquina')?.value;
        const op = document.getElementById('globalFilterOP')?.value;
        const turno = document.getElementById('globalFilterTurno')?.value;
        const colores = document.getElementById('globalFilterColores')?.value;
        const tipo = document.getElementById('globalFilterTipo')?.value;
        const categoria = document.getElementById('globalFilterCategoria')?.value;
        
        // Actualizar estado
        if (maquina) AppState.filtros.maquina = maquina;
        if (op) AppState.filtros.op = op;
        if (turno) AppState.filtros.turno = turno;
        if (colores) AppState.filtros.colores = colores;
        if (tipo) AppState.filtros.tipo = tipo;
        if (categoria) AppState.filtros.categoria = categoria;
        
        // Sincronizar con selectores legacy de cada pestaña
        const legacySelectors = [
            'historyFilterMaquina', 'analysisFilterMaquina', 'ganttFilterMaquina', 'statsFilterMaquina',
            'historyFilterOP', 'analysisFilterOP', 'ganttFilterOP', 'statsFilterOP',
            'historyFilterTurno', 'analysisFilterTurno', 'ganttFilterTurno', 'statsFilterTurno',
            'historyFilterColores', 'ganttFilterColores', 'statsFilterColores',
            'historyFilterTipo', 'analysisFilterTipo', 'ganttFilterTipo', 'statsFilterTipo',
            'historyFilter', 'analysisFilter', 'ganttFilter', 'statsFilter'
        ];
        
        legacySelectors.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            
            if (id.includes('Maquina') && maquina) el.value = maquina;
            else if (id.includes('OP') && op) el.value = op;
            else if (id.includes('Turno') && turno) el.value = turno;
            else if (id.includes('Colores') && colores) el.value = colores;
            else if (id.includes('Tipo') && tipo) el.value = tipo;
            else if (id.includes('Filter') && !id.includes('Maquina') && !id.includes('OP') && !id.includes('Turno') && !id.includes('Colores') && !id.includes('Tipo') && categoria) {
                el.value = categoria;
            }
        });
    },
    
    // Actualizar badge con número de filtros activos
    updateBadge: () => {
        const badge = document.getElementById('filtersBadge');
        if (!badge) return;
        
        let count = 0;
        
        // Contar filtros activos
        if (AppState.filtros.periodo !== 'all') count++;
        if (AppState.filtros.maquina !== 'ALL') count++;
        if (AppState.filtros.op !== 'ALL') count++;
        if (AppState.filtros.turno !== 'ALL') count++;
        if (AppState.filtros.colores !== 'ALL') count++;
        if (AppState.filtros.tipo !== 'ALL') count++;
        if (AppState.filtros.categoria !== 'ALL') count++;
        
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    },
    
    // Limpiar todos los filtros
    clearAll: () => {
        // Resetear estado
        AppState.filtros = {
            categoria: 'ALL',
            tipo: 'ALL',
            vista: 'general',
            op: 'ALL',
            periodo: 'all',
            maquina: 'ALL',
            turno: 'ALL',
            colores: 'ALL',
            fechaDesde: null,
            fechaHasta: null
        };
        
        // Resetear UI
        document.querySelectorAll('.global-filter-btn[data-period]').forEach(btn => {
            if (btn.getAttribute('data-period') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        document.getElementById('globalDateFrom').value = '';
        document.getElementById('globalDateTo').value = '';
        
        const selects = [
            'globalFilterMaquina', 'globalFilterOP', 'globalFilterTurno',
            'globalFilterColores', 'globalFilterTipo', 'globalFilterCategoria'
        ];
        
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 'ALL';
        });
        
        // Aplicar cambios
        GlobalFilters.applyFilters();
    },
    
    // Inicializar filtros globales
    init: () => {
        // Poblar selectores
        GlobalFilters.populateSelectors();
        
        // Actualizar badge inicial
        GlobalFilters.updateBadge();
        
        // Ocultar filtros globales en pestañas de Teoría y Config
        Tabs.onSwitch = (tabId) => {
            const wrapper = document.getElementById('globalFiltersWrapper');
            if (!wrapper) return;
            
            if (tabId === 'theory' || tabId === 'config') {
                wrapper.style.display = 'none';
            } else {
                wrapper.style.display = 'block';
            }
        };
    },
    
    // Poblar selectores dinámicamente
    populateSelectors: () => {
        // Máquinas
        const maquinaSelect = document.getElementById('globalFilterMaquina');
        if (maquinaSelect) {
            let html = '<option value="ALL">Todas</option>';
            AppState.config.maquinas.forEach(m => {
                html += `<option value="${m}">${m}</option>`;
            });
            maquinaSelect.innerHTML = html;
        }
        
        // OPs
        Filtros.updateOPFilter('globalFilterOP');
        
        // Categorías
        Filtros.updateCategoryFilter('globalFilterCategoria');
    },
    
    // Actualizar opciones dinámicas cuando cambian los datos
    updateDynamicOptions: () => {
        GlobalFilters.populateSelectors();
    }
};

// Modificar Tabs.switch para incluir callback
const OriginalTabsSwitch = Tabs.switch;
Tabs.switch = (tabId) => {
    OriginalTabsSwitch(tabId);
    
    // Callback para ocultar/mostrar filtros
    const wrapper = document.getElementById('globalFiltersWrapper');
    if (wrapper) {
        if (tabId === 'theory' || tabId === 'config') {
            wrapper.style.display = 'none';
        } else {
            wrapper.style.display = 'block';
        }
    }
};

// Modificar Filtros.updateAllFilters para incluir filtros globales
const OriginalUpdateAllFilters = Filtros.updateAllFilters;
Filtros.updateAllFilters = () => {
    OriginalUpdateAllFilters();
    if (typeof GlobalFilters !== 'undefined') {
        GlobalFilters.updateDynamicOptions();
    }
};

// =====================================================
// NAVEGADOR DE FECHAS AMIGABLE
// =====================================================

const DateNavigator = {
    // Estado actual
    currentDate: new Date(),
    viewMode: 'all', // day, week, month, year, all
    
    // Nombres de meses y días en español
    MONTHS: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
             'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    DAYS: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    
    // Cambiar modo de vista
    setView: (mode) => {
        DateNavigator.viewMode = mode;
        
        // Actualizar UI de tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            if (tab.getAttribute('data-view') === mode) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Si se selecciona "Todo", resetear fecha a hoy
        if (mode === 'all') {
            DateNavigator.currentDate = new Date();
        }
        
        // Aplicar cambios
        DateNavigator.updateDisplay();
        DateNavigator.apply();
    },
    
    // Navegar al período anterior
    previous: () => {
        if (DateNavigator.viewMode === 'all') return;
        
        const date = new Date(DateNavigator.currentDate);
        
        switch(DateNavigator.viewMode) {
            case 'day':
                date.setDate(date.getDate() - 1);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - 1);
                break;
        }
        
        DateNavigator.currentDate = date;
        DateNavigator.updateDisplay();
        DateNavigator.apply();
    },
    
    // Navegar al período siguiente
    next: () => {
        if (DateNavigator.viewMode === 'all') return;
        
        const date = new Date(DateNavigator.currentDate);
        
        switch(DateNavigator.viewMode) {
            case 'day':
                date.setDate(date.getDate() + 1);
                break;
            case 'week':
                date.setDate(date.getDate() + 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() + 1);
                break;
        }
        
        DateNavigator.currentDate = date;
        DateNavigator.updateDisplay();
        DateNavigator.apply();
    },
    
    // Saltar atrás (cantidad mayor)
    jumpBack: () => {
        if (DateNavigator.viewMode === 'all') return;
        
        const date = new Date(DateNavigator.currentDate);
        
        switch(DateNavigator.viewMode) {
            case 'day':
                date.setDate(date.getDate() - 7); // 1 semana
                break;
            case 'week':
                date.setDate(date.getDate() - 28); // 4 semanas
                break;
            case 'month':
                date.setMonth(date.getMonth() - 3); // 3 meses
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - 5); // 5 años
                break;
        }
        
        DateNavigator.currentDate = date;
        DateNavigator.updateDisplay();
        DateNavigator.apply();
    },
    
    // Saltar adelante (cantidad mayor)
    jumpForward: () => {
        if (DateNavigator.viewMode === 'all') return;
        
        const date = new Date(DateNavigator.currentDate);
        
        switch(DateNavigator.viewMode) {
            case 'day':
                date.setDate(date.getDate() + 7); // 1 semana
                break;
            case 'week':
                date.setDate(date.getDate() + 28); // 4 semanas
                break;
            case 'month':
                date.setMonth(date.getMonth() + 3); // 3 meses
                break;
            case 'year':
                date.setFullYear(date.getFullYear() + 5); // 5 años
                break;
        }
        
        DateNavigator.currentDate = date;
        DateNavigator.updateDisplay();
        DateNavigator.apply();
    },
    
    // Volver a hoy
    today: () => {
        DateNavigator.currentDate = new Date();
        DateNavigator.updateDisplay();
        DateNavigator.apply();
    },
    
    // Obtener rango de fechas según el modo actual
    getDateRange: () => {
        const date = DateNavigator.currentDate;
        let desde, hasta, label, sublabel;
        
        switch(DateNavigator.viewMode) {
            case 'day':
                desde = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                hasta = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
                label = `${date.getDate()} ${DateNavigator.MONTHS[date.getMonth()]} ${date.getFullYear()}`;
                sublabel = DateNavigator.DAYS[date.getDay()];
                break;
                
            case 'week':
                // Obtener inicio de semana (domingo)
                const startOfWeek = new Date(date);
                startOfWeek.setDate(date.getDate() - date.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                
                // Fin de semana (sábado)
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                desde = startOfWeek;
                hasta = endOfWeek;
                
                // Calcular número de semana
                const onejan = new Date(date.getFullYear(), 0, 1);
                const weekNum = Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
                
                label = `Semana ${weekNum}: ${startOfWeek.getDate()} ${DateNavigator.MONTHS[startOfWeek.getMonth()].substr(0, 3)} - ${endOfWeek.getDate()} ${DateNavigator.MONTHS[endOfWeek.getMonth()].substr(0, 3)}`;
                sublabel = `${date.getFullYear()}`;
                break;
                
            case 'month':
                desde = new Date(date.getFullYear(), date.getMonth(), 1);
                hasta = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
                label = `${DateNavigator.MONTHS[date.getMonth()]} ${date.getFullYear()}`;
                
                // Contar días del mes
                const daysInMonth = hasta.getDate();
                sublabel = `${daysInMonth} días`;
                break;
                
            case 'year':
                desde = new Date(date.getFullYear(), 0, 1);
                hasta = new Date(date.getFullYear(), 11, 31, 23, 59, 59);
                label = `${date.getFullYear()}`;
                sublabel = '365 días';
                break;
                
            case 'all':
            default:
                desde = null;
                hasta = null;
                label = 'Todos los registros';
                sublabel = '';
                break;
        }
        
        return { desde, hasta, label, sublabel };
    },
    
    // Actualizar el display visual
    updateDisplay: () => {
        const range = DateNavigator.getDateRange();
        const displayMain = document.getElementById('dateDisplayMain');
        const displaySub = document.getElementById('dateDisplaySub');
        const display = document.getElementById('dateDisplay');
        
        if (displayMain) {
            displayMain.textContent = range.label;
            // Animación de cambio
            if (display) {
                display.classList.add('changing');
                setTimeout(() => display.classList.remove('changing'), 300);
            }
        }
        
        if (displaySub) {
            displaySub.textContent = range.sublabel;
        }
        
        // Deshabilitar botones de navegación si está en modo "Todo"
        const navControls = document.getElementById('navControls');
        if (navControls) {
            const btns = navControls.querySelectorAll('.nav-btn:not(.today)');
            btns.forEach(btn => {
                if (DateNavigator.viewMode === 'all') {
                    btn.style.opacity = '0.3';
                    btn.style.cursor = 'not-allowed';
                } else {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                }
            });
        }
    },
    
    // Actualizar estadísticas del período
    updateStats: () => {
        const statsText = document.querySelector('.nav-stats-text');
        if (!statsText) return;
        
        // Obtener registros filtrados usando el sistema existente
        const filtered = Filtros.getFiltered('history');
        
        // Calcular totales
        const count = filtered.length;
        const totalTime = filtered.reduce((sum, r) => sum + (r.duracion || r.duration || 0), 0);
        
        // Calcular distribución por tipo
        const types = { INT: 0, EXT: 0, NVA: 0 };
        filtered.forEach(r => {
            const tipo = (r.tipo || 'INT').toUpperCase();
            if (types.hasOwnProperty(tipo)) {
                types[tipo]++;
            }
        });
        
        if (count === 0) {
            statsText.textContent = 'Sin registros en este período';
        } else {
            statsText.textContent = `${count} registros • ${Utils.formatDuration(totalTime)} • 🟠${types.INT} 🟢${types.EXT} 🔴${types.NVA}`;
        }
    },
    
    // Aplicar filtros de fecha
    apply: () => {
        const range = DateNavigator.getDateRange();
        
        // Actualizar estado de filtros
        if (range.desde && range.hasta) {
            AppState.filtros.periodo = 'custom';
            AppState.filtros.fechaDesde = range.desde.toISOString().split('T')[0];
            AppState.filtros.fechaHasta = range.hasta.toISOString().split('T')[0];
        } else {
            AppState.filtros.periodo = 'all';
            AppState.filtros.fechaDesde = null;
            AppState.filtros.fechaHasta = null;
        }
        
        // Aplicar filtros globales (esto actualizará todas las vistas)
        GlobalFilters.applyFilters();
        
        // Actualizar estadísticas
        DateNavigator.updateStats();
    },
    
    // Inicializar
    init: () => {
        // Configurar modo inicial
        DateNavigator.setView('all');
        
        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            // Solo si no está escribiendo en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    DateNavigator.previous();
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    DateNavigator.next();
                    e.preventDefault();
                    break;
                case 'h':
                case 'H':
                    DateNavigator.today();
                    e.preventDefault();
                    break;
            }
        });
        
        console.log('📅 Navegador de fechas inicializado');
    }
};

// =====================================================
// FILTRO DE CATEGORÍAS PARA BOTONES
// =====================================================

const CategoryFilter = {
    // Estado: categorías seleccionadas (por defecto, todas)
    selectedCategories: new Set(),
    isCollapsed: false,
    
    // Inicializar desde localStorage
    init: () => {
        const saved = localStorage.getItem('smed_category_filter');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                CategoryFilter.selectedCategories = new Set(data.selected || []);
                CategoryFilter.isCollapsed = data.collapsed || false;
            } catch (e) {
                console.error('Error cargando filtro de categorías:', e);
            }
        }
        
        // Si no hay nada guardado, seleccionar todas por defecto
        if (CategoryFilter.selectedCategories.size === 0) {
            CategoryFilter.selectAll();
        }
        
        // Renderizar el filtro
        CategoryFilter.render();
    },
    
    // Guardar estado en localStorage
    save: () => {
        const data = {
            selected: Array.from(CategoryFilter.selectedCategories),
            collapsed: CategoryFilter.isCollapsed
        };
        localStorage.setItem('smed_category_filter', JSON.stringify(data));
    },
    
    // Obtener todas las categorías únicas de los botones
    getAllCategories: () => {
        const categories = new Set();
        AppState.buttons.forEach(btn => {
            if (btn.cat) categories.add(btn.cat);
        });
        return Array.from(categories).sort();
    },
    
    // Contar botones por categoría
    getButtonCountByCategory: () => {
        const counts = {};
        AppState.buttons.forEach(btn => {
            const cat = btn.cat || 'Sin categoría';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    },
    
    // Alternar una categoría
    toggleCategory: (category) => {
        if (CategoryFilter.selectedCategories.has(category)) {
            CategoryFilter.selectedCategories.delete(category);
        } else {
            CategoryFilter.selectedCategories.add(category);
        }
        
        CategoryFilter.save();
        CategoryFilter.render();
        UI.renderButtons();
    },
    
    // Toggle: Seleccionar/Deseleccionar todas las categorías
    selectAll: () => {
        const allCategories = CategoryFilter.getAllCategories();
        const allSelected = CategoryFilter.selectedCategories.size === allCategories.length;
        
        if (allSelected) {
            // Si todas están seleccionadas, deseleccionar todas
            CategoryFilter.selectedCategories.clear();
        } else {
            // Si no todas están seleccionadas, seleccionar todas
            CategoryFilter.selectedCategories = new Set(allCategories);
        }
        
        CategoryFilter.save();
        CategoryFilter.render();
        UI.renderButtons();
    },
    
    // Deseleccionar todas las categorías
    deselectAll: () => {
        CategoryFilter.selectedCategories.clear();
        CategoryFilter.save();
        CategoryFilter.render();
        UI.renderButtons();
    },
    
    // Toggle expandir/colapsar
    toggle: () => {
        const content = document.getElementById('categoryFilterContent');
        const btn = document.getElementById('categoryFilterToggleBtn');
        
        if (!content || !btn) return;
        
        CategoryFilter.isCollapsed = !CategoryFilter.isCollapsed;
        
        if (CategoryFilter.isCollapsed) {
            content.style.display = 'none';
            btn.textContent = '▶ Mostrar';
        } else {
            content.style.display = 'block';
            btn.textContent = '▼ Ocultar';
        }
        
        CategoryFilter.save();
    },
    
    // Verificar si un botón debe mostrarse según el filtro
    shouldShowButton: (button) => {
        // Si todas las categorías están seleccionadas, mostrar todos
        const allCategories = CategoryFilter.getAllCategories();
        if (CategoryFilter.selectedCategories.size === allCategories.length) {
            return true;
        }
        
        // Si no hay categorías seleccionadas, no mostrar nada
        if (CategoryFilter.selectedCategories.size === 0) {
            return false;
        }
        
        // Verificar si la categoría del botón está seleccionada
        return CategoryFilter.selectedCategories.has(button.cat);
    },
    
    // Renderizar el filtro de categorías
    render: () => {
        const container = document.getElementById('categoryFilterButtons');
        const countEl = document.getElementById('categoryFilterCount');
        
        if (!container) return;
        
        const allCategories = CategoryFilter.getAllCategories();
        const counts = CategoryFilter.getButtonCountByCategory();
        const allSelected = CategoryFilter.selectedCategories.size === allCategories.length;
        
        // Contar botones visibles
        const visibleButtons = AppState.buttons.filter(btn => CategoryFilter.shouldShowButton(btn)).length;
        const totalButtons = AppState.buttons.length;
        
        // Actualizar contador
        if (countEl) {
            countEl.textContent = `${visibleButtons} de ${totalButtons} botones`;
            countEl.style.background = visibleButtons === totalButtons ? '#0a0a0a' : '#8b5cf622';
            countEl.style.color = visibleButtons === totalButtons ? '#888' : '#8b5cf6';
        }
        
        // Botón "Todas" (toggle)
        const todasIcon = allSelected ? '✓' : '◻';
        const todasText = allSelected ? 'Todas' : 'Ninguna';
        
        let html = `
            <button onclick="CategoryFilter.selectAll()" 
                    style="padding: 8px 16px; border-radius: 20px; border: 2px solid ${allSelected ? '#00d4ff' : '#444'}; 
                           background: ${allSelected ? '#00d4ff22' : '#1a1a2e'}; color: ${allSelected ? '#00d4ff' : '#888'}; 
                           cursor: pointer; font-size: 0.9em; font-weight: ${allSelected ? 'bold' : 'normal'}; 
                           transition: all 0.2s;">
                ${todasIcon} ${todasText} (${totalButtons})
            </button>
        `;
        
        // Botones por categoría
        allCategories.forEach(cat => {
            const isSelected = CategoryFilter.selectedCategories.has(cat);
            const count = counts[cat] || 0;
            const btnColor = Utils.getCategoryColor(cat);
            
            html += `
                <button onclick="CategoryFilter.toggleCategory('${cat}')" 
                        style="padding: 8px 16px; border-radius: 20px; border: 2px solid ${isSelected ? btnColor : '#444'}; 
                               background: ${isSelected ? btnColor + '22' : '#1a1a2e'}; 
                               color: ${isSelected ? btnColor : '#888'}; 
                               cursor: pointer; font-size: 0.9em; font-weight: ${isSelected ? 'bold' : 'normal'}; 
                               transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    ${isSelected ? '✓' : ''} 
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${btnColor};"></span>
                    ${cat} (${count})
                </button>
            `;
        });
        
        container.innerHTML = html;
        
        // Aplicar estado de colapsado
        const content = document.getElementById('categoryFilterContent');
        const btn = document.getElementById('categoryFilterToggleBtn');
        
        if (content && btn) {
            if (CategoryFilter.isCollapsed) {
                content.style.display = 'none';
                btn.textContent = '▶ Mostrar';
            } else {
                content.style.display = 'block';
                btn.textContent = '▼ Ocultar';
            }
        }
    }
};

// Exponer CategoryFilter globalmente
window.CategoryFilter = CategoryFilter;

// Exponer GlobalFilters globalmente
window.GlobalFilters = GlobalFilters;
window.DateNavigator = DateNavigator;

// Exponer funciones globales necesarias
window.Timer = Timer;
window.ButtonManager = ButtonManager;
window.CSV = CSV;
window.Storage = Storage;
window.Tabs = Tabs;
window.Theory = Theory;
window.FreeTimers = FreeTimers;
window.MaquinaManager = MaquinaManager;
window.RecordEditor = RecordEditor;
window.Filtros = Filtros;
