/**
 * SMED Analyzer Pro - Módulo de Análisis y Gráficos
 * Vistas: General, Financiera, Gerencial, Operacional
 */

// =====================================================
// MÓDULO DE ANÁLISIS
// =====================================================

const Analysis = {
    // Datos calculados
    data: {
        general: {},
        financiero: {},
        gerencial: {},
        operacional: {}
    },
    
    // Renderizar vista actual
    render: () => {
        const vista = AppState.filtros.vista || 'general';
        
        // Calcular datos
        Analysis.calculate();
        
        // Ocultar todos los paneles
        document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
        
        // Mostrar panel seleccionado
        const panel = document.getElementById(`panel-${vista}`);
        if (panel) panel.classList.add('active');
        
        // Renderizar según vista
        switch(vista) {
            case 'financiero':
                Analysis.renderFinanciero();
                break;
            case 'gerencial':
                Analysis.renderGerencial();
                break;
            case 'operacional':
                Analysis.renderOperacional();
                break;
            default:
                Analysis.renderGeneral();
        }
        
        // Renderizar gráficos siempre
        Charts.renderBarChart();
        Charts.renderPieChart();
    },
    
    // Calcular todos los datos - USANDO DATOS FILTRADOS
    calculate: () => {
        // USAR FILTROS CENTRALIZADOS si están disponibles
        const registros = typeof Filtros !== 'undefined' ? Filtros.getFiltered('analysis') : AppState.registros;
        
        // Tiempo total
        const tiempoTotal = registros.reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        
        // Tiempo por categoría (dinámico)
        const porCategoria = {};
        registros.forEach(r => {
            if (!porCategoria[r.cat]) {
                porCategoria[r.cat] = 0;
            }
            porCategoria[r.cat] += (r.duration || r.duracion || 0);
        });
        
        // Tiempo de mudas - USAR CAMPO TIPO (NVA) en lugar de nombres de categoría
        // Esto es más preciso porque el usuario define qué es muda
        const tiempoMuda = registros
            .filter(r => r.tipo === 'NVA')
            .reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        
        // Tiempo de valor agregado (INT + EXT)
        const tiempoVA = tiempoTotal - tiempoMuda;
        
        // Eficiencia (tiempo VA / total)
        const eficiencia = tiempoTotal > 0 ? (tiempoVA / tiempoTotal) * 100 : 0;
        
        // Ajuste interno vs externo - USAR CAMPO TIPO
        const tiempoAjusteInt = registros
            .filter(r => r.tipo === 'INT')
            .reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        const tiempoAjusteExt = registros
            .filter(r => r.tipo === 'EXT')
            .reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        const ratioInEx = tiempoAjusteExt > 0 ? tiempoAjusteInt / tiempoAjusteExt : 0;
        
        // Promedio por registro
        const promedio = registros.length > 0 ? tiempoTotal / registros.length : 0;
        
        // Guardar datos generales
        Analysis.data.general = {
            tiempoTotal: Utils.round2(tiempoTotal),
            tiempoMuda: Utils.round2(tiempoMuda),
            tiempoVA: Utils.round2(tiempoVA),
            eficiencia: Utils.round2(eficiencia),
            promedio: Utils.round2(promedio),
            totalRegistros: registros.length,
            porCategoria
        };
        
        // Datos financieros
        const costoHora = AppState.config.costoHora;
        const costoMuda = (tiempoMuda / 3600) * costoHora;
        const ahorrosPotenciales = costoMuda * 0.5; // Objetivo 50% reducción
        const roi = costoMuda > 0 ? (ahorrosPotenciales / costoMuda) * 100 : 0;
        
        Analysis.data.financiero = {
            costoMuda: Utils.round2(costoMuda),
            ahorrosPotenciales: Utils.round2(ahorrosPotenciales),
            roi: Utils.round2(roi),
            costoPorMinuto: Utils.round2(costoHora / 60)
        };
        
        // Datos gerenciales
        const metaEficiencia = AppState.config.metaEficiencia;
        const brecha = metaEficiencia - eficiencia;
        
        Analysis.data.gerencial = {
            eficienciaActual: Utils.round2(eficiencia),
            metaEficiencia: metaEficiencia,
            brecha: Utils.round2(brecha),
            cumplimiento: Utils.round2((eficiencia / metaEficiencia) * 100)
        };
        
        // Datos operacionales
        Analysis.data.operacional = {
            tiempoAjusteInt: Utils.round2(tiempoAjusteInt),
            tiempoAjusteExt: Utils.round2(tiempoAjusteExt),
            ratioInEx: Utils.round2(ratioInEx),
            oportunidadConversion: Utils.round2(tiempoAjusteInt * 0.3) // 30% convertible
        };
    },
    
    // Renderizar vista General
    renderGeneral: () => {
        const d = Analysis.data.general;
        
        // KPIs
        const kpiMappings = {
            'kpi-total': Utils.formatDuration(d.tiempoTotal),
            'kpi-muda': Utils.formatDuration(d.tiempoMuda),
            'kpi-eficiencia': d.eficiencia + '%',
            'kpi-registros': d.totalRegistros,
            'kpi-promedio': Utils.formatDuration(d.promedio)
        };
        
        for (const [id, value] of Object.entries(kpiMappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    },
    
    // Renderizar vista Financiera
    renderFinanciero: () => {
        const d = Analysis.data.financiero;
        
        const mappings = {
            'fin-costo-muda': `Q${d.costoMuda.toFixed(2)}`,
            'fin-ahorros': `Q${d.ahorrosPotenciales.toFixed(2)}`,
            'fin-roi': `${d.roi}%`
        };
        
        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        
        // Recomendación
        const recEl = document.getElementById('fin-recomendacion');
        if (recEl) {
            recEl.textContent = `Reducir mudas en 50% generaría ahorros de Q${d.ahorrosPotenciales.toFixed(2)} por ciclo de cambio.`;
        }
    },
    
    // Renderizar vista Gerencial
    renderGerencial: () => {
        const d = Analysis.data.gerencial;
        const g = Analysis.data.general;
        
        const mappings = {
            'ger-eficiencia-actual': `${d.eficienciaActual}%`,
            'ger-meta': `${d.metaEficiencia}%`,
            'ger-brecha': `${d.brecha}%`,
            'ger-promedio': Utils.formatDuration(g.promedio),
            'ger-total-cambios': g.totalRegistros,
            'ger-tiempo-va': Utils.formatDuration(g.tiempoVA)
        };
        
        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    },
    
    // Renderizar vista Operacional
    renderOperacional: () => {
        const d = Analysis.data.operacional;
        
        const mappings = {
            'op-ajuste-int': Utils.formatDuration(d.tiempoAjusteInt),
            'op-ajuste-ext': Utils.formatDuration(d.tiempoAjusteExt),
            'op-ratio': d.ratioInEx.toFixed(2),
            'op-oportunidad': Utils.formatDuration(d.oportunidadConversion)
        };
        
        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        
        // Recomendación
        const recEl = document.getElementById('op-recomendacion');
        if (recEl) {
            const estrategia = d.ratioInEx > 1 
                ? 'ALTA prioridad: Convertir actividades internas a externas.'
                : d.ratioInEx > 0.5 
                    ? 'MEDIA prioridad: Optimizar operaciones paralelas.'
                    : 'BAJA prioridad: Proceso bien balanceado.';
            recEl.textContent = `Ratio Interno/Externo: ${d.ratioInEx.toFixed(2)}. ${estrategia}`;
        }
    }
};

// =====================================================
// MÓDULO DE GRÁFICOS (SVG)
// =====================================================

const Charts = {
    colors: ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#14b8a6', 
             '#ef4444', '#f59e0b', '#ec4899', '#06b6d4', '#dc2626'],
    
    // Renderizar gráfico de barras
    renderBarChart: () => {
        const container = document.getElementById('barChartSvg');
        if (!container) return;
        
        const data = Analysis.data.general.porCategoria || {};
        const entries = Object.entries(data).filter(([_, v]) => v > 0);
        
        if (entries.length === 0) {
            container.innerHTML = '<text x="150" y="100" fill="#666" text-anchor="middle">Sin datos</text>';
            return;
        }
        
        const maxVal = Math.max(...entries.map(([_, v]) => v));
        const barWidth = 25;
        const gap = 8;
        const chartHeight = 150;
        const chartWidth = 300;
        const startX = 10;
        const startY = 10;
        
        let svg = '';
        
        entries.forEach(([cat, val], i) => {
            const barHeight = (val / maxVal) * (chartHeight - 30);
            const x = startX + i * (barWidth + gap);
            const y = startY + (chartHeight - 30) - barHeight;
            const color = Charts.colors[i % Charts.colors.length];
            
            // Barra
            svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
                    fill="${color}" rx="2" opacity="0.8">
                    <title>${cat}: ${val.toFixed(1)}s</title>
                    </rect>`;
            
            // Valor
            svg += `<text x="${x + barWidth/2}" y="${y - 3}" fill="#fff" 
                    font-size="8" text-anchor="middle">${val.toFixed(0)}</text>`;
            
            // Label (rotado)
            svg += `<text x="${x + barWidth/2}" y="${chartHeight - 5}" fill="#666" 
                    font-size="7" text-anchor="end" transform="rotate(-45, ${x + barWidth/2}, ${chartHeight - 5})">${cat.substring(0, 8)}</text>`;
        });
        
        container.innerHTML = svg;
    },
    
    // Renderizar gráfico de pie
    renderPieChart: () => {
        const container = document.getElementById('pieChartSvg');
        if (!container) return;
        
        const data = Analysis.data.general.porCategoria || {};
        const entries = Object.entries(data).filter(([_, v]) => v > 0);
        
        if (entries.length === 0) {
            container.innerHTML = '<text x="100" y="100" fill="#666" text-anchor="middle">Sin datos</text>';
            return;
        }
        
        const total = entries.reduce((sum, [_, v]) => sum + v, 0);
        const cx = 100;
        const cy = 90;
        const r = 70;
        
        let svg = '';
        let currentAngle = -Math.PI / 2; // Empezar arriba
        
        entries.forEach(([cat, val], i) => {
            const angle = (val / total) * 2 * Math.PI;
            const color = Charts.colors[i % Charts.colors.length];
            
            // Calcular arco
            const x1 = cx + r * Math.cos(currentAngle);
            const y1 = cy + r * Math.sin(currentAngle);
            const x2 = cx + r * Math.cos(currentAngle + angle);
            const y2 = cy + r * Math.sin(currentAngle + angle);
            
            const largeArc = angle > Math.PI ? 1 : 0;
            
            // Path del segmento
            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            
            svg += `<path d="${d}" fill="${color}" stroke="#0a0a0a" stroke-width="1" opacity="0.85">
                    <title>${cat}: ${val.toFixed(1)}s (${((val/total)*100).toFixed(1)}%)</title>
                    </path>`;
            
            // Label en el centro del segmento
            const labelAngle = currentAngle + angle / 2;
            const labelR = r * 0.6;
            const lx = cx + labelR * Math.cos(labelAngle);
            const ly = cy + labelR * Math.sin(labelAngle);
            
            if ((val / total) > 0.05) { // Solo mostrar si es >5%
                svg += `<text x="${lx}" y="${ly}" fill="#fff" font-size="8" 
                        text-anchor="middle" dominant-baseline="middle">${((val/total)*100).toFixed(0)}%</text>`;
            }
            
            currentAngle += angle;
        });
        
        // Leyenda
        let legendY = 10;
        entries.slice(0, 5).forEach(([cat, val], i) => {
            const color = Charts.colors[i % Charts.colors.length];
            svg += `<rect x="180" y="${legendY}" width="10" height="10" fill="${color}" rx="2"/>`;
            svg += `<text x="195" y="${legendY + 8}" fill="#999" font-size="8">${cat.substring(0,10)}</text>`;
            legendY += 15;
        });
        
        container.innerHTML = svg;
    }
};

// =====================================================
// ANÁLISIS COMPARATIVO MULTI-DIMENSIONAL
// =====================================================

const AnalysisComparativo = {
    // Obtener datos filtrados según los filtros aplicados
    getFilteredData: () => {
        return typeof Filtros !== 'undefined' ? Filtros.getFiltered('analysis') : AppState.registros;
    },
    
    // Calcular estadísticas genéricas para un grupo de registros
    calcularStats: (registros, nombre, campo = 'name') => {
        const stats = {
            nombre: nombre,
            registros: registros,
            tiempoTotal: 0,
            tiempoINT: 0,
            tiempoEXT: 0,
            tiempoNVA: 0,
            count: registros.length,
            tiempos: []
        };
        
        registros.forEach(r => {
            const duracion = r.duration || r.duracion || 0;
            stats.tiempoTotal += duracion;
            stats.tiempos.push(duracion);
            
            if (r.tipo === 'INT') stats.tiempoINT += duracion;
            else if (r.tipo === 'EXT') stats.tiempoEXT += duracion;
            else if (r.tipo === 'NVA') stats.tiempoNVA += duracion;
        });
        
        // Calcular métricas derivadas
        stats.eficiencia = stats.tiempoTotal > 0 ? ((stats.tiempoTotal - stats.tiempoNVA) / stats.tiempoTotal * 100) : 0;
        stats.promedio = stats.count > 0 ? stats.tiempoTotal / stats.count : 0;
        stats.ratioIntExt = stats.tiempoEXT > 0 ? stats.tiempoINT / stats.tiempoEXT : 0;
        
        // Variabilidad
        if (stats.tiempos.length > 1) {
            const mean = stats.promedio;
            const variance = stats.tiempos.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / stats.tiempos.length;
            stats.stdDev = Math.sqrt(variance);
            stats.cv = mean > 0 ? (stats.stdDev / mean * 100) : 0;
        } else {
            stats.stdDev = 0;
            stats.cv = 0;
        }
        
        return stats;
    },
    
    // Obtener estadísticas por OP (con filtros aplicados)
    getStatsByOP: (useFilters = true) => {
        const registros = useFilters ? AnalysisComparativo.getFilteredData() : AppState.registros;
        const groups = {};
        
        registros.forEach(r => {
            const key = r.op || 'Sin OP';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        
        return Object.entries(groups)
            .map(([nombre, regs]) => AnalysisComparativo.calcularStats(regs, nombre, 'op'))
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal);
    },
    
    // Obtener estadísticas por Máquina (con filtros aplicados)
    getStatsByMaquina: (useFilters = true) => {
        const registros = useFilters ? AnalysisComparativo.getFilteredData() : AppState.registros;
        const groups = {};
        
        registros.forEach(r => {
            const key = r.maquina || 'Sin Máquina';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        
        return Object.entries(groups)
            .map(([nombre, regs]) => AnalysisComparativo.calcularStats(regs, nombre, 'maquina'))
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal);
    },
    
    // Obtener estadísticas por Turno (con filtros aplicados)
    getStatsByTurno: (useFilters = true) => {
        const registros = useFilters ? AnalysisComparativo.getFilteredData() : AppState.registros;
        const groups = {};
        
        registros.forEach(r => {
            const key = r.turno || 'Sin Turno';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        
        return Object.entries(groups)
            .map(([nombre, regs]) => AnalysisComparativo.calcularStats(regs, nombre, 'turno'))
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal);
    },
    
    // Obtener estadísticas por Tipo SMED (con filtros aplicados)
    getStatsByTipo: (useFilters = true) => {
        const registros = useFilters ? AnalysisComparativo.getFilteredData() : AppState.registros;
        const groups = {};
        
        registros.forEach(r => {
            const key = r.tipo || 'INT';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        
        return Object.entries(groups)
            .map(([nombre, regs]) => AnalysisComparativo.calcularStats(regs, nombre, 'tipo'))
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal);
    },
    
    // Renderizar tabla comparativa MULTI-DIMENSIONAL
    renderTablaComparativa: (containerId, dimension = 'op') => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Obtener datos según dimensión seleccionada
        let stats, dimensionLabel, dimensionColor, emptyLabel;
        
        switch(dimension) {
            case 'maquina':
                stats = AnalysisComparativo.getStatsByMaquina().filter(s => s.nombre !== 'Sin Máquina');
                dimensionLabel = '🏭 Máquina';
                dimensionColor = '#00d4ff';
                emptyLabel = 'máquinas';
                break;
            case 'turno':
                stats = AnalysisComparativo.getStatsByTurno().filter(s => s.nombre !== 'Sin Turno');
                dimensionLabel = '⏰ Turno';
                dimensionColor = '#f59e0b';
                emptyLabel = 'turnos';
                break;
            case 'tipo':
                stats = AnalysisComparativo.getStatsByTipo();
                dimensionLabel = '🏷️ Tipo';
                dimensionColor = '#8b5cf6';
                emptyLabel = 'tipos';
                break;
            default: // op
                stats = AnalysisComparativo.getStatsByOP().filter(s => s.nombre !== 'Sin OP');
                dimensionLabel = '📋 OP';
                dimensionColor = '#00ff9d';
                emptyLabel = 'OPs';
        }
        
        if (stats.length === 0) {
            container.innerHTML = `<div class="no-data-msg">No hay ${emptyLabel} para comparar con los filtros actuales</div>`;
            return;
        }
        
        // Info de filtros aplicados
        const filtrosInfo = AnalysisComparativo.getFilterInfo();
        
        let html = `
            <div style="margin-bottom: 10px; padding: 8px; background: #0f0f1a; border-radius: 4px; font-size: 0.8em; color: #888;">
                <strong>📋 Filtros aplicados:</strong> ${filtrosInfo}
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                <thead>
                    <tr style="background: #1a1a2e;">
                        <th style="padding: 10px; text-align: left; border-bottom: 2px solid #333; color: ${dimensionColor};">${dimensionLabel}</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">Reg.</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">Total</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">Prom.</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">Efic.%</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">INT/EXT</th>
                        <th style="padding: 10px; text-align: center; border-bottom: 2px solid #333;">CV%</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        stats.slice(0, 15).forEach((s, i) => {
            const efColor = s.eficiencia >= 90 ? '#10b981' : s.eficiencia >= 70 ? '#f59e0b' : '#ef4444';
            const cvColor = s.cv < 20 ? '#10b981' : s.cv < 40 ? '#f59e0b' : '#ef4444';
            const ratioColor = s.ratioIntExt > 1 ? '#f97316' : '#10b981';
            
            html += `
                <tr style="background: ${i % 2 === 0 ? '#0a0a0a' : '#121212'};">
                    <td style="padding: 8px; color: ${dimensionColor}; font-weight: bold;">${s.nombre}</td>
                    <td style="padding: 8px; text-align: center;">${s.count}</td>
                    <td style="padding: 8px; text-align: center;">${Utils.formatDuration(s.tiempoTotal)}</td>
                    <td style="padding: 8px; text-align: center;">${Utils.formatDuration(s.promedio)}</td>
                    <td style="padding: 8px; text-align: center; color: ${efColor}; font-weight: bold;">${s.eficiencia.toFixed(1)}%</td>
                    <td style="padding: 8px; text-align: center; color: ${ratioColor};">${s.ratioIntExt.toFixed(2)}</td>
                    <td style="padding: 8px; text-align: center; color: ${cvColor};">${s.cv.toFixed(1)}%</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        // Agregar resumen
        const mejorEficiencia = stats.reduce((a, b) => a.eficiencia > b.eficiencia ? a : b);
        const menorCV = stats.reduce((a, b) => a.cv < b.cv ? a : b);
        
        html += `
            <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="background: #10b98122; padding: 10px; border-radius: 8px; border-left: 3px solid #10b981;">
                    <span style="color: #888; font-size: 0.8em;">🏆 Mejor Eficiencia</span><br>
                    <strong style="color: #10b981;">${mejorEficiencia.nombre}</strong>: ${mejorEficiencia.eficiencia.toFixed(1)}%
                </div>
                <div style="background: #3b82f622; padding: 10px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <span style="color: #888; font-size: 0.8em;">🎯 Más Consistente (menor CV)</span><br>
                    <strong style="color: #3b82f6;">${menorCV.nombre}</strong>: ${menorCV.cv.toFixed(1)}%
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    },
    
    // Obtener descripción de filtros aplicados
    getFilterInfo: () => {
        const f = AppState.filtros;
        const parts = [];
        
        if (f.maquina && f.maquina !== 'ALL') parts.push(`Máquina: ${f.maquina}`);
        if (f.turno && f.turno !== 'ALL') parts.push(`Turno: ${f.turno}`);
        if (f.op && f.op !== 'ALL') parts.push(`OP: ${f.op}`);
        if (f.tipo && f.tipo !== 'ALL') parts.push(`Tipo: ${f.tipo}`);
        if (f.periodo && f.periodo !== 'all') parts.push(`Período: ${f.periodo}`);
        
        return parts.length > 0 ? parts.join(' | ') : 'Ninguno (todos los datos)';
    },
    
    // Renderizar gráfico de barras comparativo por OP
    renderGraficoComparativoOP: (containerId, tipo = 'tiempoTotal') => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const stats = AnalysisComparativo.getStatsByOP().filter(s => s.op !== 'Sin OP').slice(0, 8);
        
        if (stats.length === 0) {
            container.innerHTML = '<text x="150" y="90" fill="#666" text-anchor="middle">Sin OPs para comparar</text>';
            return;
        }
        
        const maxVal = Math.max(...stats.map(s => s[tipo]));
        const barHeight = 20;
        const gap = 5;
        
        let svg = '';
        stats.forEach((s, i) => {
            const val = s[tipo];
            const barWidth = maxVal > 0 ? (val / maxVal) * 200 : 0;
            const y = i * (barHeight + gap) + 10;
            const color = Charts.colors[i % Charts.colors.length];
            
            // Label OP
            svg += `<text x="0" y="${y + 14}" fill="#00ff9d" font-size="10">${s.op.slice(-6)}</text>`;
            
            // Barra
            svg += `<rect x="50" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3" opacity="0.8">
                    <title>${s.op}: ${tipo === 'tiempoTotal' ? Utils.formatDuration(val) : val.toFixed(1)}</title>
                    </rect>`;
            
            // Valor
            const displayVal = tipo === 'eficiencia' ? val.toFixed(0) + '%' : Utils.formatDuration(val);
            svg += `<text x="${55 + barWidth}" y="${y + 14}" fill="#888" font-size="9">${displayVal}</text>`;
        });
        
        container.innerHTML = svg;
    }
};

// =====================================================
// ANÁLISIS DETALLADO POR CATEGORÍA
// =====================================================

const AnalysisDetallado = {
    // Obtener estadísticas por categoría
    getStatsByCategoria: () => {
        const registros = typeof Filtros !== 'undefined' ? Filtros.getFiltered('analysis') : AppState.registros;
        const byCat = {};
        
        registros.forEach(r => {
            const cat = r.cat || 'Sin categoría';
            if (!byCat[cat]) {
                byCat[cat] = {
                    categoria: cat,
                    tiempos: [],
                    tiempoTotal: 0,
                    tiempoINT: 0,
                    tiempoEXT: 0,
                    tiempoNVA: 0,
                    count: 0
                };
            }
            
            const duracion = r.duration || r.duracion || 0;
            byCat[cat].tiempos.push(duracion);
            byCat[cat].tiempoTotal += duracion;
            byCat[cat].count++;
            
            if (r.tipo === 'INT') byCat[cat].tiempoINT += duracion;
            else if (r.tipo === 'EXT') byCat[cat].tiempoEXT += duracion;
            else if (r.tipo === 'NVA') byCat[cat].tiempoNVA += duracion;
        });
        
        // Calcular estadísticas
        Object.values(byCat).forEach(c => {
            const sorted = c.tiempos.sort((a, b) => a - b);
            const n = sorted.length;
            
            c.promedio = c.count > 0 ? c.tiempoTotal / c.count : 0;
            c.min = sorted[0] || 0;
            c.max = sorted[n - 1] || 0;
            c.mediana = n > 0 ? sorted[Math.floor(n / 2)] : 0;
            
            // Desviación estándar
            const mean = c.promedio;
            const variance = c.tiempos.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / n || 0;
            c.stdDev = Math.sqrt(variance);
            c.cv = mean > 0 ? (c.stdDev / mean * 100) : 0;
        });
        
        return Object.values(byCat).sort((a, b) => b.tiempoTotal - a.tiempoTotal);
    },
    
    // Renderizar análisis detallado
    renderDetallado: (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const stats = AnalysisDetallado.getStatsByCategoria();
        
        if (stats.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay datos para analizar</div>';
            return;
        }
        
        let html = `
            <div style="display: grid; gap: 15px;">
        `;
        
        stats.forEach(c => {
            const tipoPrincipal = c.tiempoINT >= c.tiempoEXT && c.tiempoINT >= c.tiempoNVA ? 'INT' :
                                  c.tiempoEXT >= c.tiempoNVA ? 'EXT' : 'NVA';
            const tipoColor = tipoPrincipal === 'INT' ? '#f97316' : tipoPrincipal === 'EXT' ? '#10b981' : '#ef4444';
            const cvColor = c.cv < 20 ? '#10b981' : c.cv < 40 ? '#f59e0b' : '#ef4444';
            
            html += `
                <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; border-left: 4px solid ${tipoColor};">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: ${tipoColor};">${c.categoria}</h4>
                        <span style="background: ${tipoColor}22; color: ${tipoColor}; padding: 2px 8px; border-radius: 4px; font-size: 0.8em;">${tipoPrincipal}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; font-size: 0.85em;">
                        <div style="background: #0a0a0a; padding: 8px; border-radius: 4px;">
                            <span style="color: #888;">Total</span><br>
                            <strong style="color: #00d4ff;">${Utils.formatDuration(c.tiempoTotal)}</strong>
                        </div>
                        <div style="background: #0a0a0a; padding: 8px; border-radius: 4px;">
                            <span style="color: #888;">Promedio</span><br>
                            <strong style="color: #fff;">${Utils.formatDuration(c.promedio)}</strong>
                        </div>
                        <div style="background: #0a0a0a; padding: 8px; border-radius: 4px;">
                            <span style="color: #888;">CV</span><br>
                            <strong style="color: ${cvColor};">${c.cv.toFixed(1)}%</strong>
                        </div>
                        <div style="background: #0a0a0a; padding: 8px; border-radius: 4px;">
                            <span style="color: #888;">Rango</span><br>
                            <strong style="color: #888;">${Utils.round2(c.min)}-${Utils.round2(c.max)}s</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }
};

// Exponer globalmente
window.Analysis = Analysis;
window.Charts = Charts;
window.AnalysisComparativo = AnalysisComparativo;
window.AnalysisDetallado = AnalysisDetallado;
