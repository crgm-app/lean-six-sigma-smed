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

// Exponer globalmente
window.Analysis = Analysis;
window.Charts = Charts;
