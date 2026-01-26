/**
 * SMED Analyzer Pro - Módulo de Diagrama de Gantt
 * Visualización de timeline de actividades
 */

// =====================================================
// MÓDULO DE GANTT
// =====================================================

// Colores por Tipo SMED
const TIPO_COLORS = {
    'INT': '#f97316', // Naranja - Interna
    'EXT': '#10b981', // Verde - Externa
    'NVA': '#ef4444'  // Rojo - Muda
};

const Gantt = {
    // Configuración
    config: {
        zoom: 1,
        filter: 'ALL'
    },
    
    // Actualizar dropdown de OPs
    updateOPFilter: () => {
        const select = document.getElementById('ganttFilterOP');
        if (!select) return;
        
        const currentOP = select.value;
        const ops = [...new Set(AppState.registros.filter(r => r.op).map(r => r.op))].sort();
        
        let html = '<option value="ALL">Todas las OP</option>';
        ops.forEach(op => {
            const count = AppState.registros.filter(r => r.op === op).length;
            html += `<option value="${op}">${op.padStart(8, '0')} (${count})</option>`;
        });
        select.innerHTML = html;
        select.value = currentOP || 'ALL';
        
        // También actualizar filtro de categorías
        const selectCat = document.getElementById('ganttFilter');
        if (selectCat) {
            const currentCat = selectCat.value;
            const cats = [...new Set(AppState.registros.map(r => r.cat))].sort();
            let catHtml = '<option value="ALL">Todas</option>';
            cats.forEach(c => catHtml += `<option value="${c}">${c}</option>`);
            selectCat.innerHTML = catHtml;
            selectCat.value = currentCat || 'ALL';
        }
    },
    
    // Renderizar diagrama de Gantt - AGRUPADO POR NOMBRE + COLORES POR TIPO
    render: () => {
        const container = document.getElementById('ganttTimeline');
        if (!container) return;
        
        // Actualizar filtros dinámicos
        Gantt.updateOPFilter();
        
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
            
            // Generar todas las barras de esta actividad (coloreadas por Tipo SMED)
            let barsHtml = '';
            activity.records.forEach(rec => {
                const startPct = (rec.startTime / totalTimeRange) * 100;
                const widthPct = (rec.duration / totalTimeRange) * 100;
                const tipoColor = Gantt.getTipoColor(rec.tipo);
                const opLabel = rec.op ? rec.op.padStart(8, '0') : '';
                const turnoLabel = rec.turno || 'T1';
                
                barsHtml += `
                    <div class="gantt-bar" 
                         style="left: ${startPct}%; width: ${Math.max(widthPct, 1)}%; background: ${tipoColor};"
                         title="${rec.name} | ${rec.duration.toFixed(1)}s | ${rec.tipo || 'INT'} | OP: ${opLabel} | ${turnoLabel}">
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
        
        // Actualizar resumen (pasar registros filtrados para calcular tiempo neto)
        const totalDuration = sorted.reduce((sum, r) => sum + r.duration, 0);
        const tiempoVA = Gantt.calcularTiempoVA(registros);
        const tiempoNVA = totalDuration - tiempoVA;
        Gantt.updateSummary(totalDuration, tiempoVA, tiempoNVA, registros);
    },
    
    // Obtener datos filtrados con filtros de OP, Turno, Colores, Categoría
    getFilteredData: () => {
        let data = [...AppState.registros];
        
        // Filtro por OP
        const filterOP = document.getElementById('ganttFilterOP')?.value || 'ALL';
        if (filterOP !== 'ALL') {
            data = data.filter(r => r.op === filterOP);
        }
        
        // Filtro por Turno
        const filterTurno = document.getElementById('ganttFilterTurno')?.value || 'ALL';
        if (filterTurno !== 'ALL') {
            data = data.filter(r => r.turno === filterTurno);
        }
        
        // Filtro por Colores
        const filterColores = document.getElementById('ganttFilterColores')?.value || 'ALL';
        if (filterColores !== 'ALL') {
            const numColores = parseInt(filterColores);
            if (numColores === 5) {
                data = data.filter(r => (r.colores || 1) >= 5);
            } else {
                data = data.filter(r => (r.colores || 1) === numColores);
            }
        }
        
        // Filtro por Categoría
        const filterCat = document.getElementById('ganttFilter')?.value || 'ALL';
        if (filterCat !== 'ALL') {
            data = data.filter(r => r.cat === filterCat);
        }
        
        return data;
    },
    
    // Obtener color según tipo SMED
    getTipoColor: (tipo) => {
        return TIPO_COLORS[tipo] || TIPO_COLORS['INT'];
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
    
    // Actualizar resumen con tiempo neto (primer botón a último)
    updateSummary: (total, va, nva, registros) => {
        const pctVA = total > 0 ? (va / total) * 100 : 0;
        const pctNVA = total > 0 ? (nva / total) * 100 : 0;
        
        // Calcular tiempo neto: desde inicio de primera actividad hasta fin de última
        let tiempoNeto = 0;
        let rangoText = 'Sin datos';
        
        if (registros && registros.length > 0) {
            // Ordenar por timestamp
            const sorted = [...registros].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const primero = sorted[0];
            const ultimo = sorted[sorted.length - 1];
            
            // Calcular tiempos
            const inicioSeg = primero.inicioSeg || 0;
            const finSeg = ultimo.finSeg || (ultimo.inicioSeg || 0) + (ultimo.duration || 0);
            
            // Tiempo neto = fin del último - inicio del primero
            tiempoNeto = finSeg - inicioSeg;
            if (tiempoNeto < 0) tiempoNeto += 86400; // Cruzó medianoche
            
            // Mostrar rango de horas
            const horaInicio = Utils.secondsToHMS(inicioSeg);
            const horaFin = Utils.secondsToHMS(finSeg);
            rangoText = `${horaInicio} → ${horaFin}`;
        }
        
        const mappings = {
            'gantt-total': Utils.formatDuration(total),
            'gantt-va': `${Utils.formatDuration(va)} (${pctVA.toFixed(1)}%)`,
            'gantt-nva': `${Utils.formatDuration(nva)} (${pctNVA.toFixed(1)}%)`,
            'gantt-neto': Utils.formatDuration(tiempoNeto)
        };
        
        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        
        // Actualizar texto del rango
        const rangoEl = document.getElementById('gantt-neto-rango');
        if (rangoEl) rangoEl.textContent = rangoText;
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
    
    // Renderizar vista agrupada por categoría - CON FILTROS Y COLORES POR TIPO
    renderByCategory: () => {
        const container = document.getElementById('ganttTimeline');
        if (!container) return;
        
        // Usar datos filtrados
        const registros = Gantt.getFilteredData();
        
        if (registros.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades para mostrar</div>';
            Gantt.updateSummary(0, 0, 0, []);
            return;
        }
        
        // Agrupar por categoría con tipos SMED
        const byCategory = {};
        registros.forEach(r => {
            if (!byCategory[r.cat]) {
                byCategory[r.cat] = {
                    total: 0,
                    byTipo: { INT: 0, EXT: 0, NVA: 0 }
                };
            }
            byCategory[r.cat].total += r.duration;
            byCategory[r.cat].byTipo[r.tipo || 'INT'] = (byCategory[r.cat].byTipo[r.tipo || 'INT'] || 0) + r.duration;
        });
        
        const total = Object.values(byCategory).reduce((a, b) => a + b.total, 0);
        
        let html = '';
        
        // Ordenar categorías por tiempo total (mayor a menor)
        const sortedCats = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
        
        sortedCats.forEach(([cat, data]) => {
            if (data.total === 0) return;
            
            const pctTotal = (data.total / total) * 100;
            
            // Generar barras apiladas por tipo SMED
            let barsHtml = '';
            let currentLeft = 0;
            
            ['INT', 'EXT', 'NVA'].forEach(tipo => {
                const tiempoPorTipo = data.byTipo[tipo] || 0;
                if (tiempoPorTipo > 0) {
                    const widthPct = (tiempoPorTipo / data.total) * pctTotal;
                    const tipoColor = Gantt.getTipoColor(tipo);
                    const tipoLabel = tipo === 'INT' ? 'Interna' : tipo === 'EXT' ? 'Externa' : 'Muda';
                    
                    barsHtml += `
                        <div class="gantt-bar" 
                             style="left: ${currentLeft}%; width: ${Math.max(widthPct, 1)}%; background: ${tipoColor};"
                             title="${cat} [${tipoLabel}]: ${tiempoPorTipo.toFixed(1)}s">
                        </div>
                    `;
                    currentLeft += widthPct;
                }
            });
            
            html += `
                <div class="gantt-row">
                    <div class="gantt-label" title="${cat}: ${data.total.toFixed(1)}s">${cat}</div>
                    <div class="gantt-bar-container">
                        ${barsHtml}
                    </div>
                    <div class="gantt-total">${data.total.toFixed(0)}s</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        Gantt.renderScale(total);
        
        // Actualizar resumen con datos filtrados
        const tiempoVA = Gantt.calcularTiempoVA(registros);
        const tiempoNVA = total - tiempoVA;
        Gantt.updateSummary(total, tiempoVA, tiempoNVA, registros);
    }
};

// Exponer globalmente
window.Gantt = Gantt;
