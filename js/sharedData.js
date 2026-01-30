/**
 * SMED Shared Data Module
 * Módulo compartido para acceso a datos desde localStorage
 * Permite a los informes acceder directamente a los datos sin necesidad de CSV
 */

const SMEDSharedData = {
    /**
     * Obtener todos los registros desde localStorage
     * @returns {Array} Array de registros SMED
     */
    getRecords: function() {
        try {
            const data = localStorage.getItem('smed_registros');
            if (!data) {
                console.log('📊 No hay datos en localStorage');
                return [];
            }
            const records = JSON.parse(data);
            console.log(`✅ Cargados ${records.length} registros desde localStorage`);
            return records;
        } catch (e) {
            console.error('❌ Error cargando datos desde localStorage:', e);
            return [];
        }
    },

    /**
     * Normalizar un registro al formato esperado por los informes
     * Convierte el formato interno de la app al formato CSV esperado
     */
    normalizeRecord: function(record) {
        return {
            // Campos principales
            ID: record.id || '',
            FechaExcel: record.fechaExcel || 0,
            Maquina: record.maquina || '',
            OP: record.op || '',
            Colores: record.colores || 1,
            Turno: record.turno || '',
            Actividad: record.name || '',
            Categoria: record.cat || '',
            Tipo: record.tipo || 'INT',
            InicioSeg: record.inicioSeg || 0,
            FinSeg: record.finSeg || 0,
            DuracionSeg: record.duracion || record.duration || 0,
            Notas: record.notas || '',
            
            // Campos adicionales para compatibilidad
            Fecha: record.fecha || '',
            HoraFin: record.endTime || '',
            Timestamp: record.timestamp || 0
        };
    },

    /**
     * Obtener registros normalizados (formato CSV)
     */
    getNormalizedRecords: function() {
        const records = this.getRecords();
        return records.map(r => this.normalizeRecord(r));
    },

    /**
     * Filtrar registros por criterios
     * @param {Object} filters - Objeto con filtros: { turno, colores, maquina, tipo, op }
     * @returns {Array} Registros filtrados
     */
    filterRecords: function(filters = {}) {
        let records = this.getNormalizedRecords();
        
        // Filtro por turno
        if (filters.turno && filters.turno !== 'ALL') {
            records = records.filter(r => r.Turno === filters.turno);
        }
        
        // Filtro por colores
        if (filters.colores && filters.colores !== 'ALL') {
            const targetColores = parseInt(filters.colores);
            if (targetColores >= 4) {
                // 4+ colores
                records = records.filter(r => (r.Colores || 1) >= 4);
            } else {
                records = records.filter(r => (r.Colores || 1) === targetColores);
            }
        }
        
        // Filtro por máquina
        if (filters.maquina && filters.maquina !== 'ALL') {
            records = records.filter(r => r.Maquina === filters.maquina);
        }
        
        // Filtro por tipo SMED
        if (filters.tipo && filters.tipo !== 'ALL') {
            records = records.filter(r => r.Tipo === filters.tipo);
        }
        
        // Filtro por OP
        if (filters.op && filters.op !== 'ALL') {
            records = records.filter(r => r.OP === filters.op);
        }
        
        return records;
    },

    /**
     * Obtener opciones únicas para filtros
     */
    getFilterOptions: function() {
        const records = this.getNormalizedRecords();
        
        return {
            turnos: [...new Set(records.map(r => r.Turno).filter(Boolean))].sort(),
            colores: [...new Set(records.map(r => r.Colores).filter(Boolean))].sort((a, b) => a - b),
            maquinas: [...new Set(records.map(r => r.Maquina).filter(Boolean))].sort(),
            tipos: [...new Set(records.map(r => r.Tipo).filter(Boolean))].sort(),
            ops: [...new Set(records.map(r => r.OP).filter(Boolean))].sort(),
            categorias: [...new Set(records.map(r => r.Categoria).filter(Boolean))].sort()
        };
    },

    /**
     * Verificar si hay datos disponibles
     */
    hasData: function() {
        return this.getRecords().length > 0;
    },

    /**
     * Obtener estadísticas básicas
     */
    getStats: function() {
        const records = this.getNormalizedRecords();
        
        if (records.length === 0) {
            return {
                total: 0,
                duracionTotal: 0,
                porTipo: { INT: 0, EXT: 0, NVA: 0 }
            };
        }
        
        const duracionTotal = records.reduce((sum, r) => sum + (r.DuracionSeg || 0), 0);
        const porTipo = { INT: 0, EXT: 0, NVA: 0 };
        
        records.forEach(r => {
            const tipo = (r.Tipo || 'INT').toUpperCase();
            if (porTipo.hasOwnProperty(tipo)) {
                porTipo[tipo]++;
            }
        });
        
        return {
            total: records.length,
            duracionTotal: duracionTotal,
            porTipo: porTipo,
            duracionPromedio: duracionTotal / records.length
        };
    }
};

// Exponer globalmente
window.SMEDSharedData = SMEDSharedData;

console.log('📊 SMED Shared Data Module cargado');
