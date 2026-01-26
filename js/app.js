/**
 * SMED Analyzer Pro - Aplicación Principal
 * Metodología: Lean Manufacturing + Six Sigma
 * Versión: 1.0
 */

// =====================================================
// CONFIGURACIÓN Y CONSTANTES
// =====================================================

const CATEGORIAS_SMED = [
    { id: 'preparacion', nombre: 'Preparación', tipo: 'VA', color: '#3b82f6' },
    { id: 'ajuste-int', nombre: 'Ajuste Interno', tipo: 'INT', color: '#f97316' },
    { id: 'ajuste-ext', nombre: 'Ajuste Externo', tipo: 'EXT', color: '#10b981' },
    { id: 'verificacion', nombre: 'Verificación', tipo: 'VA', color: '#8b5cf6' },
    { id: 'limpieza', nombre: 'Limpieza', tipo: 'SOP', color: '#14b8a6' },
    { id: 'muda', nombre: 'Muda', tipo: 'NVA', color: '#ef4444' },
    { id: 'espera', nombre: 'Espera', tipo: 'NVA', color: '#f59e0b' },
    { id: 'transporte', nombre: 'Transporte', tipo: 'NVA', color: '#ec4899' },
    { id: 'movimiento', nombre: 'Movimiento', tipo: 'NVA', color: '#06b6d4' },
    { id: 'defectos', nombre: 'Defectos', tipo: 'NVA', color: '#dc2626' }
];

const COSTO_HORA_DEFAULT = 500; // GTQ por hora

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
    
    // Configuración general
    config: {
        costoHora: COSTO_HORA_DEFAULT,
        metaEficiencia: 95
    },
    
    // Filtros actuales
    filtros: {
        categoria: 'ALL',
        vista: 'general'
    }
};

// =====================================================
// UTILIDADES
// =====================================================

const Utils = {
    // Formatear número con ceros a la izquierda
    pad: (n, width = 2) => n.toString().padStart(width, '0'),
    
    // Obtener segundos del día
    getDaySeconds: (date = new Date()) => {
        return (date.getHours() * 3600) + 
               (date.getMinutes() * 60) + 
               date.getSeconds() + 
               (date.getMilliseconds() / 1000);
    },
    
    // Formatear hora HH:MM:SS
    formatHMS: (date = new Date()) => {
        return `${Utils.pad(date.getHours())}:${Utils.pad(date.getMinutes())}:${Utils.pad(date.getSeconds())}`;
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
    
    // Obtener color de categoría
    getCategoryColor: (catName) => {
        const cat = CATEGORIAS_SMED.find(c => c.nombre === catName);
        return cat ? cat.color : '#666666';
    },
    
    // Obtener clase CSS de categoría
    getCategoryClass: (catName) => {
        const cat = CATEGORIAS_SMED.find(c => c.nombre === catName);
        return cat ? `cat-${cat.id}` : '';
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
        CONFIG: 'smed_config'
    },
    
    save: () => {
        try {
            localStorage.setItem(Storage.KEYS.REGISTROS, JSON.stringify(AppState.registros));
            localStorage.setItem(Storage.KEYS.BUTTONS, JSON.stringify(AppState.buttons));
            localStorage.setItem(Storage.KEYS.ACTIVE_TIMERS, JSON.stringify(AppState.activeTimers));
            localStorage.setItem(Storage.KEYS.CONFIG, JSON.stringify(AppState.config));
        } catch (e) {
            console.error('Error guardando datos:', e);
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
        AppState.buttons = [
            { id: Utils.generateId(), name: 'Revisar Planos', cat: 'Preparación' },
            { id: Utils.generateId(), name: 'Cambio Molde', cat: 'Ajuste Interno' },
            { id: Utils.generateId(), name: 'Pre-calentar', cat: 'Ajuste Externo' },
            { id: Utils.generateId(), name: 'Verificar Medidas', cat: 'Verificación' },
            { id: Utils.generateId(), name: 'Limpiar Máquina', cat: 'Limpieza' },
            { id: Utils.generateId(), name: 'Buscar Herramienta', cat: 'Muda' },
            { id: Utils.generateId(), name: 'Esperar Material', cat: 'Espera' },
            { id: Utils.generateId(), name: 'Traer Pieza', cat: 'Transporte' },
            { id: Utils.generateId(), name: 'Caminar', cat: 'Movimiento' },
            { id: Utils.generateId(), name: 'Retrabajo', cat: 'Defectos' }
        ];
        Storage.save();
    },
    
    clear: () => {
        if (confirm('¿Está seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
            AppState.registros = [];
            AppState.activeTimers = {};
            Storage.save();
            UI.renderAll();
            alert('Datos eliminados correctamente');
        }
    }
};

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
        const record = {
            id: Utils.generateId(),
            name: timer.btnName,
            cat: timer.cat,
            duration: Utils.round2(duration),
            endTime: Utils.formatHMS(),
            timestamp: Date.now(),
            fecha: new Date().toISOString().split('T')[0]
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
    }
};

// =====================================================
// GESTIÓN DE BOTONES
// =====================================================

const ButtonManager = {
    add: (name, cat) => {
        if (!name || !cat) {
            alert('Complete nombre y categoría');
            return false;
        }
        
        AppState.buttons.push({
            id: Utils.generateId(),
            name: name.trim(),
            cat: cat
        });
        
        Storage.save();
        UI.renderAll();
        return true;
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
// EXPORT/IMPORT CSV
// =====================================================

const CSV = {
    export: () => {
        if (AppState.registros.length === 0) {
            alert('No hay datos para exportar');
            return;
        }
        
        const headers = ['ID', 'Fecha', 'Actividad', 'Categoría', 'Duración (s)', 'Hora Fin', 'Timestamp'];
        const rows = AppState.registros.map(r => [
            r.id,
            r.fecha || '',
            r.name,
            r.cat,
            r.duration,
            r.endTime,
            r.timestamp || ''
        ]);
        
        let csvContent = '\ufeff'; // BOM para Excel
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SMED_Export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    },
    
    import: (file) => {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                // Saltar header
                const data = lines.slice(1).map(line => {
                    // Parsear CSV con comillas
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
                    
                    return {
                        id: values[0] || Utils.generateId(),
                        fecha: values[1] || new Date().toISOString().split('T')[0],
                        name: values[2] || 'Actividad',
                        cat: values[3] || 'Preparación',
                        duration: parseFloat(values[4]) || 0,
                        endTime: values[5] || '00:00:00',
                        timestamp: parseInt(values[6]) || Date.now()
                    };
                }).filter(r => r.name && r.duration > 0);
                
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
    
    // Grid de botones SMED
    renderButtons: () => {
        const container = document.getElementById('buttonsGrid');
        if (!container) return;
        
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
                    ${isActive ? `<span class="btn-timer" data-btn-timer="${btn.id}">${elapsed.toFixed(1)}s</span>` : ''}
                </button>
            `;
        }).join('');
    },
    
    // Historial de actividades
    renderHistory: () => {
        const container = document.getElementById('historyList');
        if (!container) return;
        
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
                    <span class="item-cat">${record.cat}</span>
                    <span class="item-time">Fin: ${record.endTime}</span>
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
    
    // Configuración
    renderConfig: () => {
        const container = document.getElementById('configButtonsList');
        if (!container) return;
        
        container.innerHTML = AppState.buttons.map(btn => `
            <div class="config-row">
                <div>
                    <span class="config-item-name">${btn.name}</span>
                    <span class="config-item-cat">(${btn.cat})</span>
                </div>
                <button class="action-btn danger" onclick="ButtonManager.remove('${btn.id}')">
                    Eliminar
                </button>
            </div>
        `).join('');
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
    
    // Renderizar UI inicial
    UI.renderAll();
    
    // Iniciar loop principal
    UI.startMainLoop();
    
    // Event listeners
    setupEventListeners();
    
    console.log('SMED Analyzer Pro inicializado');
}

function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            Tabs.switch(tabId);
        });
    });
    
    // Formulario de nuevo botón
    const addBtnForm = document.getElementById('addButtonForm');
    if (addBtnForm) {
        addBtnForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newBtnName');
            const catSelect = document.getElementById('newBtnCat');
            
            if (ButtonManager.add(nameInput.value, catSelect.value)) {
                nameInput.value = '';
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

// Exponer funciones globales necesarias
window.Timer = Timer;
window.ButtonManager = ButtonManager;
window.CSV = CSV;
window.Storage = Storage;
window.Tabs = Tabs;
window.Theory = Theory;
