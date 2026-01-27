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
    
    // Obtener datos filtrados - USA FILTROS CENTRALIZADOS
    getFilteredData: () => {
        // USAR FILTROS CENTRALIZADOS si están disponibles
        let data = typeof Filtros !== 'undefined' ? Filtros.getFiltered('gantt') : [...AppState.registros];
        
        // Aplicar filtro adicional por Tipo (INT/EXT/NVA) si existe el selector
        const filterTipo = document.getElementById('ganttFilterTipo')?.value || 'ALL';
        if (filterTipo !== 'ALL') {
            data = data.filter(r => r.tipo === filterTipo);
        }
        
        // Aplicar filtro adicional por Categoría específica si existe
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
        
        // Calcular tiempo neto: SOLO actividades INTERNAS (tipo INT)
        // NO incluye mudas (NVA) ni externas (EXT)
        let tiempoNeto = 0;
        let rangoText = 'Solo actividades INT';
        
        if (registros && registros.length > 0) {
            // Filtrar SOLO actividades internas (INT)
            const soloInternas = registros.filter(r => r.tipo === 'INT');
            
            if (soloInternas.length > 0) {
                // Sumar todas las duraciones de actividades internas
                tiempoNeto = soloInternas.reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
                rangoText = `${soloInternas.length} actividades INT`;
            }
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
    
    // =====================================================
    // ANÁLISIS COMPARATIVO MULTI-DIMENSIONAL
    // =====================================================
    
    // Renderizar Gantt comparativo por dimensión
    renderComparativo: (dimension = 'op') => {
        const container = document.getElementById('ganttTimeline');
        if (!container) return;
        
        // Obtener registros filtrados
        const registros = Gantt.getFilteredData();
        
        if (registros.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay actividades para comparar</div>';
            return;
        }
        
        // Agrupar por dimensión seleccionada
        const grupos = {};
        registros.forEach(r => {
            let key;
            switch(dimension) {
                case 'maquina': key = r.maquina || 'Sin Máquina'; break;
                case 'turno': key = r.turno || 'Sin Turno'; break;
                case 'tipo': key = r.tipo || 'INT'; break;
                default: key = r.op || 'Sin OP';
            }
            
            if (!grupos[key]) {
                grupos[key] = {
                    registros: [],
                    tiempoTotal: 0,
                    tiempoINT: 0,
                    tiempoEXT: 0,
                    tiempoNVA: 0
                };
            }
            grupos[key].registros.push(r);
            grupos[key].tiempoTotal += (r.duration || r.duracion || 0);
            
            const tipo = r.tipo || 'INT';
            if (tipo === 'INT') grupos[key].tiempoINT += (r.duration || r.duracion || 0);
            else if (tipo === 'EXT') grupos[key].tiempoEXT += (r.duration || r.duracion || 0);
            else grupos[key].tiempoNVA += (r.duration || r.duracion || 0);
        });
        
        // Calcular métricas adicionales
        Object.values(grupos).forEach(g => {
            g.eficiencia = g.tiempoTotal > 0 ? ((g.tiempoTotal - g.tiempoNVA) / g.tiempoTotal * 100) : 0;
            g.ratioIntExt = g.tiempoEXT > 0 ? (g.tiempoINT / g.tiempoEXT) : 0;
        });
        
        // Ordenar por tiempo total (mayor a menor)
        const sorted = Object.entries(grupos)
            .sort((a, b) => b[1].tiempoTotal - a[1].tiempoTotal);
        
        const maxTiempo = sorted[0] ? sorted[0][1].tiempoTotal : 1;
        
        // Colores por dimensión
        const dimensionConfig = {
            op: { label: '📋 OP', color: '#00ff9d' },
            maquina: { label: '🏭 Máquina', color: '#00d4ff' },
            turno: { label: '⏰ Turno', color: '#f59e0b' },
            tipo: { label: '🏷️ Tipo', color: '#8b5cf6' }
        };
        const config = dimensionConfig[dimension] || dimensionConfig.op;
        
        // Generar HTML del Gantt comparativo
        let html = `
            <div style="margin-bottom: 15px; padding: 10px; background: #0f0f1a; border-radius: 8px;">
                <strong style="color: ${config.color};">${config.label}</strong>
                <span style="color: #888; margin-left: 10px;">${sorted.length} grupos | ${registros.length} registros</span>
            </div>
        `;
        
        sorted.slice(0, 15).forEach(([key, data]) => {
            const pct = (data.tiempoTotal / maxTiempo) * 100;
            const pctINT = data.tiempoTotal > 0 ? (data.tiempoINT / data.tiempoTotal * 100) : 0;
            const pctEXT = data.tiempoTotal > 0 ? (data.tiempoEXT / data.tiempoTotal * 100) : 0;
            const pctNVA = data.tiempoTotal > 0 ? (data.tiempoNVA / data.tiempoTotal * 100) : 0;
            
            const efColor = data.eficiencia >= 90 ? '#10b981' : data.eficiencia >= 70 ? '#f59e0b' : '#ef4444';
            
            html += `
                <div class="gantt-row" style="margin-bottom: 8px;">
                    <div class="gantt-label" style="color: ${config.color}; font-weight: bold;" 
                         title="${key}: ${data.registros.length} registros">${key}</div>
                    <div class="gantt-bar-container" style="position: relative;">
                        <!-- Barra de fondo -->
                        <div style="position: absolute; left: 0; width: ${pct}%; height: 100%; 
                                    background: linear-gradient(to right, 
                                        ${TIPO_COLORS.INT} ${pctINT}%, 
                                        ${TIPO_COLORS.EXT} ${pctINT}% ${pctINT + pctEXT}%, 
                                        ${TIPO_COLORS.NVA} ${pctINT + pctEXT}%);
                                    border-radius: 4px; opacity: 0.85;"
                             title="INT: ${data.tiempoINT.toFixed(1)}s | EXT: ${data.tiempoEXT.toFixed(1)}s | NVA: ${data.tiempoNVA.toFixed(1)}s">
                        </div>
                        <!-- Info de eficiencia -->
                        <span style="position: relative; z-index: 1; color: #fff; font-size: 0.75em; padding-left: 5px;">
                            Efic: <strong style="color: ${efColor};">${data.eficiencia.toFixed(0)}%</strong>
                        </span>
                    </div>
                    <div class="gantt-total" style="min-width: 80px;">
                        ${Utils.formatDuration(data.tiempoTotal)}
                    </div>
                </div>
            `;
        });
        
        // Agregar resumen comparativo
        const mejorEficiencia = sorted.reduce((a, b) => a[1].eficiencia > b[1].eficiencia ? a : b);
        const peorEficiencia = sorted.reduce((a, b) => a[1].eficiencia < b[1].eficiencia ? a : b);
        
        html += `
            <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: #10b98122; padding: 10px; border-radius: 8px; border-left: 3px solid #10b981;">
                    <span style="color: #888; font-size: 0.8em;">🏆 Mejor Eficiencia</span><br>
                    <strong style="color: #10b981;">${mejorEficiencia[0]}</strong>: ${mejorEficiencia[1].eficiencia.toFixed(1)}%
                </div>
                <div style="background: #ef444422; padding: 10px; border-radius: 8px; border-left: 3px solid #ef4444;">
                    <span style="color: #888; font-size: 0.8em;">⚠️ Menor Eficiencia</span><br>
                    <strong style="color: #ef4444;">${peorEficiencia[0]}</strong>: ${peorEficiencia[1].eficiencia.toFixed(1)}%
                </div>
            </div>
        `;
        
        // Leyenda de colores
        html += `
            <div style="margin-top: 15px; display: flex; gap: 15px; font-size: 0.8em; color: #888;">
                <span><span style="display: inline-block; width: 12px; height: 12px; background: ${TIPO_COLORS.INT}; border-radius: 2px;"></span> Interna (INT)</span>
                <span><span style="display: inline-block; width: 12px; height: 12px; background: ${TIPO_COLORS.EXT}; border-radius: 2px;"></span> Externa (EXT)</span>
                <span><span style="display: inline-block; width: 12px; height: 12px; background: ${TIPO_COLORS.NVA}; border-radius: 2px;"></span> Muda (NVA)</span>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Actualizar resumen general
        const totalDuration = registros.reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        const tiempoVA = Gantt.calcularTiempoVA(registros);
        const tiempoNVA = totalDuration - tiempoVA;
        Gantt.updateSummary(totalDuration, tiempoVA, tiempoNVA, registros);
    },
    
    // Renderizar comparativo por OP
    renderByOP: () => {
        Gantt.renderComparativo('op');
    },
    
    // Renderizar comparativo por Máquina
    renderByMaquina: () => {
        Gantt.renderComparativo('maquina');
    },
    
    // Renderizar comparativo por Turno
    renderByTurno: () => {
        Gantt.renderComparativo('turno');
    },
    
    // Renderizar comparativo por Tipo SMED
    renderByTipo: () => {
        Gantt.renderComparativo('tipo');
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
