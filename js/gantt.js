/**
 * SMED Analyzer Pro - Módulo de Diagrama de Gantt
 * Visualización de timeline de actividades
 */

// =====================================================
// MÓDULO DE GANTT
// =====================================================

const Gantt = {
    // Configuración
    config: {
        zoom: 1,
        filter: 'ALL'
    },
    
    // Renderizar diagrama de Gantt - AGRUPADO POR NOMBRE DE ACTIVIDAD
    render: () => {
        const container = document.getElementById('ganttTimeline');
        if (!container) return;
        
        const registros = Gantt.getFilteredData();
        
        if (registros.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades para mostrar</div>';
            Gantt.updateSummary(0, 0, 0);
            return;
        }
        
        // Ordenar por timestamp
        const sorted = [...registros].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        // Calcular el rango total de tiempo
        const firstTimestamp = sorted[0].timestamp || Date.now() - sorted[0].duration * 1000;
        const lastRecord = sorted[sorted.length - 1];
        const lastTimestamp = lastRecord.timestamp || Date.now();
        const totalTimeRange = (lastTimestamp - firstTimestamp) / 1000 + lastRecord.duration;
        
        // Agrupar registros por nombre de actividad
        const byName = {};
        sorted.forEach(record => {
            if (!byName[record.name]) {
                byName[record.name] = {
                    name: record.name,
                    cat: record.cat,
                    records: [],
                    totalDuration: 0
                };
            }
            // Calcular posición relativa de cada registro
            const startTime = ((record.timestamp || Date.now()) - firstTimestamp) / 1000 - record.duration;
            byName[record.name].records.push({
                ...record,
                startTime: Math.max(0, startTime),
                endTime: startTime + record.duration
            });
            byName[record.name].totalDuration += record.duration;
        });
        
        // Generar HTML del Gantt - UNA FILA POR ACTIVIDAD
        let html = '';
        
        Object.values(byName).forEach(activity => {
            const catClass = Gantt.getCategoryClass(activity.cat);
            
            // Generar todas las barras de esta actividad
            let barsHtml = '';
            activity.records.forEach(rec => {
                const startPct = (rec.startTime / totalTimeRange) * 100;
                const widthPct = (rec.duration / totalTimeRange) * 100;
                
                barsHtml += `
                    <div class="gantt-bar ${catClass}" 
                         style="left: ${startPct}%; width: ${Math.max(widthPct, 1)}%;"
                         title="${rec.name}: ${rec.duration.toFixed(1)}s (${rec.endTime ? Utils.secondsToHMS(rec.finSeg || 0) : ''})">
                    </div>
                `;
            });
            
            html += `
                <div class="gantt-row">
                    <div class="gantt-label" title="${activity.name} (Total: ${activity.totalDuration.toFixed(1)}s)">${activity.name.substring(0, 18)}</div>
                    <div class="gantt-bar-container">
                        ${barsHtml}
                    </div>
                    <div class="gantt-total">${activity.totalDuration.toFixed(0)}s</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Renderizar escala
        Gantt.renderScale(totalTimeRange);
        
        // Actualizar resumen
        const totalDuration = sorted.reduce((sum, r) => sum + r.duration, 0);
        const tiempoVA = Gantt.calcularTiempoVA(registros);
        const tiempoNVA = totalDuration - tiempoVA;
        Gantt.updateSummary(totalDuration, tiempoVA, tiempoNVA);
    },
    
    // Obtener datos filtrados
    getFilteredData: () => {
        let data = [...AppState.registros];
        
        if (Gantt.config.filter !== 'ALL') {
            data = data.filter(r => r.cat === Gantt.config.filter);
        }
        
        return data;
    },
    
    // Obtener clase CSS para categoría (dinámico)
    getCategoryClass: (cat) => {
        // Usar la función de Utils si existe
        if (typeof Utils !== 'undefined' && Utils.getCategoryClass) {
            return Utils.getCategoryClass(cat);
        }
        // Fallback: normalizar nombre para clase CSS
        return `cat-${cat.toLowerCase().replace(/\s+/g, '-')}`;
    },
    
    // Renderizar escala de tiempo
    renderScale: (totalDuration) => {
        const container = document.getElementById('ganttScale');
        if (!container) return;
        
        const numMarks = 6;
        let html = '';
        
        for (let i = 0; i <= numMarks; i++) {
            const time = (totalDuration / numMarks) * i;
            const label = time < 60 ? `${time.toFixed(0)}s` : `${(time/60).toFixed(1)}m`;
            html += `<span>${label}</span>`;
        }
        
        container.innerHTML = html;
    },
    
    // Calcular tiempo de valor agregado
    calcularTiempoVA: (registros) => {
        const categoriasNVA = ['Muda', 'Espera', 'Transporte', 'Movimiento', 'Defectos'];
        return registros
            .filter(r => !categoriasNVA.includes(r.cat))
            .reduce((sum, r) => sum + r.duration, 0);
    },
    
    // Actualizar resumen
    updateSummary: (total, va, nva) => {
        const pctVA = total > 0 ? (va / total) * 100 : 0;
        const pctNVA = total > 0 ? (nva / total) * 100 : 0;
        
        const mappings = {
            'gantt-total': Utils.formatDuration(total),
            'gantt-va': `${Utils.formatDuration(va)} (${pctVA.toFixed(1)}%)`,
            'gantt-nva': `${Utils.formatDuration(nva)} (${pctNVA.toFixed(1)}%)`
        };
        
        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    },
    
    // Cambiar filtro
    setFilter: (filter) => {
        Gantt.config.filter = filter;
        Gantt.render();
    },
    
    // Zoom in
    zoomIn: () => {
        Gantt.config.zoom = Math.min(Gantt.config.zoom * 1.5, 5);
        const container = document.getElementById('ganttTimeline');
        if (container) {
            container.style.transform = `scaleX(${Gantt.config.zoom})`;
            container.style.transformOrigin = 'left';
        }
    },
    
    // Zoom out
    zoomOut: () => {
        Gantt.config.zoom = Math.max(Gantt.config.zoom / 1.5, 0.5);
        const container = document.getElementById('ganttTimeline');
        if (container) {
            container.style.transform = `scaleX(${Gantt.config.zoom})`;
            container.style.transformOrigin = 'left';
        }
    },
    
    // Reset zoom
    resetZoom: () => {
        Gantt.config.zoom = 1;
        const container = document.getElementById('ganttTimeline');
        if (container) {
            container.style.transform = 'scaleX(1)';
        }
    },
    
    // Renderizar vista agrupada por categoría
    renderByCategory: () => {
        const container = document.getElementById('ganttTimeline');
        if (!container) return;
        
        const registros = AppState.registros;
        
        if (registros.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades para mostrar</div>';
            return;
        }
        
        // Agrupar por categoría (dinámico)
        const byCategory = {};
        registros.forEach(r => {
            if (!byCategory[r.cat]) {
                byCategory[r.cat] = 0;
            }
            byCategory[r.cat] += r.duration;
        });
        
        const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
        
        let html = '';
        let cumulativeStart = 0;
        
        Object.entries(byCategory).forEach(([cat, duration]) => {
            if (duration === 0) return;
            
            const startPct = (cumulativeStart / total) * 100;
            const widthPct = (duration / total) * 100;
            const catClass = Gantt.getCategoryClass(cat);
            
            html += `
                <div class="gantt-row">
                    <div class="gantt-label">${cat}</div>
                    <div class="gantt-bar-container">
                        <div class="gantt-bar ${catClass}" 
                             style="left: ${startPct}%; width: ${Math.max(widthPct, 2)}%;"
                             title="${cat}: ${duration.toFixed(1)}s (${widthPct.toFixed(1)}%)">
                            ${widthPct > 5 ? duration.toFixed(0) + 's' : ''}
                        </div>
                    </div>
                </div>
            `;
            
            cumulativeStart += duration;
        });
        
        container.innerHTML = html;
        Gantt.renderScale(total);
    }
};

// Exponer globalmente
window.Gantt = Gantt;
