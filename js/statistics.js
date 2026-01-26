/**
 * SMED Analyzer Pro - Módulo de Estadísticas
 * Cálculos estadísticos avanzados y Six Sigma
 */

// =====================================================
// MÓDULO DE ESTADÍSTICAS
// =====================================================

const Statistics = {
    // Datos calculados
    data: {
        values: [],
        stats: {},
        sixSigma: {}
    },
    
    // Actualizar opciones del filtro (incluye OP dinámica)
    updateFilterOptions: () => {
        // Filtro de Categoría
        const selectCat = document.getElementById('statsFilter');
        if (selectCat) {
            const currentValue = selectCat.value;
            const cats = [...new Set(AppState.registros.map(r => r.cat))];
            const names = [...new Set(AppState.registros.map(r => r.name))];
            
            let html = '<option value="ALL">Todas</option>';
            if (cats.length > 0) {
                html += '<optgroup label="Por Categoría">';
                cats.forEach(c => html += `<option value="CAT:${c}">${c}</option>`);
                html += '</optgroup>';
            }
            if (names.length > 0) {
                html += '<optgroup label="Por Actividad">';
                names.forEach(n => html += `<option value="NAME:${n}">${n}</option>`);
                html += '</optgroup>';
            }
            selectCat.innerHTML = html;
            selectCat.value = currentValue || 'ALL';
        }
        
        // Filtro de OP (dinámico)
        const selectOP = document.getElementById('statsFilterOP');
        if (selectOP) {
            const currentOP = selectOP.value;
            const ops = [...new Set(AppState.registros.filter(r => r.op).map(r => r.op))].sort();
            
            let html = '<option value="ALL">Todas las OP</option>';
            ops.forEach(op => {
                const count = AppState.registros.filter(r => r.op === op).length;
                html += `<option value="${op}">${op.padStart(8, '0')} (${count})</option>`;
            });
            selectOP.innerHTML = html;
            selectOP.value = currentOP || 'ALL';
        }
    },
    
    // Calcular estadísticas con filtros de Máquina, OP, Turno, Colores, Categoría
    calculate: () => {
        const filterCat = document.getElementById('statsFilter')?.value || 'ALL';
        const filterOP = document.getElementById('statsFilterOP')?.value || 'ALL';
        const filterTurno = document.getElementById('statsFilterTurno')?.value || 'ALL';
        const filterColores = document.getElementById('statsFilterColores')?.value || 'ALL';
        const filterMaquina = document.getElementById('statsFilterMaquina')?.value || 'ALL';
        
        // Aplicar todos los filtros
        let filtered = [...AppState.registros];
        
        // Filtro por Máquina
        if (filterMaquina !== 'ALL') {
            filtered = filtered.filter(r => r.maquina === filterMaquina);
        }
        
        // Filtro por OP
        if (filterOP !== 'ALL') {
            filtered = filtered.filter(r => r.op === filterOP);
        }
        
        // Filtro por Turno
        if (filterTurno !== 'ALL') {
            filtered = filtered.filter(r => r.turno === filterTurno);
        }
        
        // Filtro por Colores
        if (filterColores !== 'ALL') {
            const numColores = parseInt(filterColores);
            if (numColores === 5) {
                filtered = filtered.filter(r => (r.colores || 1) >= 5);
            } else {
                filtered = filtered.filter(r => (r.colores || 1) === numColores);
            }
        }
        
        // Filtro por Categoría/Actividad
        if (filterCat !== 'ALL') {
            if (filterCat.startsWith('CAT:')) {
                const cat = filterCat.split(':')[1];
                filtered = filtered.filter(r => r.cat === cat);
            } else if (filterCat.startsWith('NAME:')) {
                const name = filterCat.split(':')[1];
                filtered = filtered.filter(r => r.name === name);
            }
        }
        
        let values = filtered.map(r => r.duration || r.duracion || 0);
        
        // Ordenar valores
        values = values.sort((a, b) => a - b);
        Statistics.data.values = values;
        
        if (values.length < 2) {
            Statistics.renderNoData();
            return;
        }
        
        // Calcular estadísticas básicas
        const stats = Statistics.calculateBasicStats(values);
        Statistics.data.stats = stats;
        
        // Calcular Six Sigma
        const sixSigma = Statistics.calculateSixSigma(values, stats);
        Statistics.data.sixSigma = sixSigma;
        
        // Renderizar
        Statistics.renderStats(stats);
        Statistics.renderBoxPlot(stats);
        Statistics.renderBellCurve(values, stats);
    },
    
    // Calcular estadísticas básicas
    calculateBasicStats: (values) => {
        const n = values.length;
        const sorted = [...values].sort((a, b) => a - b);
        
        // Min, Max, Rango
        const min = sorted[0];
        const max = sorted[n - 1];
        const range = max - min;
        
        // Media
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        // Mediana
        const midIndex = Math.floor(n / 2);
        const median = n % 2 === 0 
            ? (sorted[midIndex - 1] + sorted[midIndex]) / 2 
            : sorted[midIndex];
        
        // Moda (valor más frecuente)
        const frequency = {};
        values.forEach(v => {
            const key = v.toFixed(1);
            frequency[key] = (frequency[key] || 0) + 1;
        });
        const maxFreq = Math.max(...Object.values(frequency));
        const modes = Object.entries(frequency)
            .filter(([_, freq]) => freq === maxFreq)
            .map(([val]) => parseFloat(val));
        const mode = modes.length === n ? null : modes[0]; // null si todos son únicos
        
        // Varianza y Desviación Estándar
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(variance);
        
        // Coeficiente de Variación
        const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
        
        // Cuartiles
        const q1Index = Math.floor(n * 0.25);
        const q3Index = Math.floor(n * 0.75);
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;
        
        // Percentiles adicionales
        const p10 = sorted[Math.floor(n * 0.10)];
        const p90 = sorted[Math.floor(n * 0.90)];
        const p95 = sorted[Math.floor(n * 0.95)];
        
        return {
            n,
            min: Utils.round2(min),
            max: Utils.round2(max),
            range: Utils.round2(range),
            sum: Utils.round2(sum),
            mean: Utils.round2(mean),
            median: Utils.round2(median),
            mode: mode ? Utils.round2(mode) : 'N/A',
            variance: Utils.round2(variance),
            stdDev: Utils.round2(stdDev),
            cv: Utils.round2(cv),
            q1: Utils.round2(q1),
            q3: Utils.round2(q3),
            iqr: Utils.round2(iqr),
            p10: Utils.round2(p10),
            p90: Utils.round2(p90),
            p95: Utils.round2(p95)
        };
    },
    
    // Calcular métricas Six Sigma
    calculateSixSigma: (values, stats) => {
        // Límites de control (3 sigma)
        const ucl = stats.mean + (3 * stats.stdDev);
        const lcl = Math.max(0, stats.mean - (3 * stats.stdDev));
        
        // Límites de especificación (ejemplo: ±20% de la media como tolerancia)
        const usl = stats.mean * 1.2;
        const lsl = stats.mean * 0.8;
        
        // Cp (Capacidad del proceso)
        const cp = stats.stdDev > 0 ? (usl - lsl) / (6 * stats.stdDev) : 0;
        
        // Cpk (Capacidad del proceso centrado)
        const cpkUpper = stats.stdDev > 0 ? (usl - stats.mean) / (3 * stats.stdDev) : 0;
        const cpkLower = stats.stdDev > 0 ? (stats.mean - lsl) / (3 * stats.stdDev) : 0;
        const cpk = Math.min(cpkUpper, cpkLower);
        
        // Nivel Sigma estimado
        const sigmaLevel = cpk * 3;
        
        // DPMO estimado (basado en Cpk)
        const dpmo = Statistics.cpkToDPMO(cpk);
        
        // Clasificación del proceso
        let processClass = 'Incapaz';
        if (cpk >= 2.0) processClass = 'Clase Mundial';
        else if (cpk >= 1.67) processClass = 'Excelente';
        else if (cpk >= 1.33) processClass = 'Bueno';
        else if (cpk >= 1.0) processClass = 'Capaz';
        else if (cpk >= 0.67) processClass = 'Marginal';
        
        // Clasificación por CV
        let stability = 'Inestable';
        if (stats.cv < 15) stability = 'Estable';
        else if (stats.cv < 30) stability = 'Moderado';
        
        return {
            ucl: Utils.round2(ucl),
            lcl: Utils.round2(lcl),
            usl: Utils.round2(usl),
            lsl: Utils.round2(lsl),
            cp: Utils.round2(cp),
            cpk: Utils.round2(cpk),
            sigmaLevel: Utils.round2(sigmaLevel),
            dpmo: Math.round(dpmo),
            processClass,
            stability
        };
    },
    
    // Convertir Cpk a DPMO (aproximación)
    cpkToDPMO: (cpk) => {
        if (cpk <= 0) return 1000000;
        if (cpk >= 2) return 3.4;
        
        // Tabla aproximada de conversión
        const table = [
            { cpk: 0.33, dpmo: 500000 },
            { cpk: 0.67, dpmo: 227000 },
            { cpk: 1.00, dpmo: 66807 },
            { cpk: 1.33, dpmo: 6210 },
            { cpk: 1.50, dpmo: 1350 },
            { cpk: 1.67, dpmo: 233 },
            { cpk: 2.00, dpmo: 3.4 }
        ];
        
        // Interpolación lineal
        for (let i = 0; i < table.length - 1; i++) {
            if (cpk >= table[i].cpk && cpk < table[i + 1].cpk) {
                const ratio = (cpk - table[i].cpk) / (table[i + 1].cpk - table[i].cpk);
                return table[i].dpmo - ratio * (table[i].dpmo - table[i + 1].dpmo);
            }
        }
        
        return cpk < 0.33 ? 500000 : 3.4;
    },
    
    // Renderizar sin datos
    renderNoData: () => {
        // Estadísticas
        ['st-min', 'st-q1', 'st-med', 'st-q3', 'st-max'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
        
        // Box Plot
        const boxPlot = document.getElementById('boxPlotContainer');
        if (boxPlot) {
            boxPlot.innerHTML = '<div class="no-data-msg">Se necesitan al menos 2 registros</div>';
        }
        
        // Bell Curve
        const bellCurve = document.getElementById('bellCurve');
        if (bellCurve) {
            bellCurve.innerHTML = '';
        }
        
        // Six Sigma
        ['ss-cp', 'ss-cpk', 'ss-sigma', 'ss-dpmo'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '--';
        });
    },
    
    // Renderizar estadísticas
    renderStats: (stats) => {
        // Estadísticas básicas
        const mappings = {
            'st-min': stats.min,
            'st-q1': stats.q1,
            'st-med': stats.median,
            'st-q3': stats.q3,
            'st-max': stats.max,
            'st-mean': stats.mean,
            'st-stddev': stats.stdDev,
            'st-cv': stats.cv + '%',
            'st-n': stats.n,
            'st-range': stats.range
        };
        
        for (const [id, value] of Object.entries(mappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
        
        // Six Sigma
        const sixSigma = Statistics.data.sixSigma;
        const ssMappings = {
            'ss-cp': sixSigma.cp,
            'ss-cpk': sixSigma.cpk,
            'ss-sigma': sixSigma.sigmaLevel,
            'ss-dpmo': sixSigma.dpmo,
            'ss-ucl': sixSigma.ucl,
            'ss-lcl': sixSigma.lcl,
            'ss-class': sixSigma.processClass,
            'ss-stability': sixSigma.stability
        };
        
        for (const [id, value] of Object.entries(ssMappings)) {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        }
    },
    
    // Renderizar Box Plot (Diagrama de Vela)
    renderBoxPlot: (stats) => {
        const container = document.getElementById('boxPlotContainer');
        if (!container) return;
        
        const { min, q1, median, q3, max } = stats;
        const range = max - min || 1;
        
        // Mapear valores a porcentajes (con padding de 5%)
        const getPct = (val) => ((val - min) / range) * 90 + 5;
        
        const pMin = getPct(min);
        const pQ1 = getPct(q1);
        const pMed = getPct(median);
        const pQ3 = getPct(q3);
        const pMax = getPct(max);
        
        container.innerHTML = `
            <div class="boxplot-track">
                <!-- Whisker izquierdo -->
                <div class="bp-whisker" style="left:${pMin}%"></div>
                
                <!-- Línea min a Q1 -->
                <div class="bp-line" style="left:${pMin}%; width:${pQ1 - pMin}%"></div>
                
                <!-- Caja Q1 a Q3 -->
                <div class="bp-box" style="left:${pQ1}%; width:${pQ3 - pQ1}%"></div>
                
                <!-- Mediana -->
                <div class="bp-median" style="left:${pMed}%"></div>
                
                <!-- Línea Q3 a Max -->
                <div class="bp-line" style="left:${pQ3}%; width:${pMax - pQ3}%"></div>
                
                <!-- Whisker derecho -->
                <div class="bp-whisker" style="left:${pMax}%"></div>
                
                <!-- Labels -->
                <div class="bp-label" style="left:${pMin}%">${min}s</div>
                <div class="bp-label top" style="left:${pMed}%">μ=${median}s</div>
                <div class="bp-label" style="left:${pMax}%">${max}s</div>
            </div>
        `;
    },
    
    // Renderizar Curva de Gauss (Distribución Normal)
    renderBellCurve: (values, stats) => {
        const svg = document.getElementById('bellCurve');
        if (!svg) return;
        
        const { mean, stdDev, min, max } = stats;
        
        // Dimensiones del SVG
        const w = 300;
        const h = 150;
        const pad = 15;
        
        // Rango para la curva (±3 sigmas o min/max)
        const startX = Math.min(min, mean - 3 * stdDev);
        const endX = Math.max(max, mean + 3 * stdDev);
        
        // Generar puntos de la curva
        const points = [];
        let maxY = 0;
        const step = (endX - startX) / 50;
        
        for (let x = startX; x <= endX; x += step) {
            // Función de densidad de probabilidad normal
            const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
                      Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
            if (y > maxY) maxY = y;
            points.push({ x, y });
        }
        
        // Mapear a coordenadas SVG
        const mapX = (v) => ((v - startX) / (endX - startX)) * (w - 2 * pad) + pad;
        const mapY = (v) => h - pad - ((v / maxY) * (h - 2 * pad));
        
        // Crear path de la curva
        let pathD = `M ${mapX(points[0].x)} ${mapY(points[0].y)}`;
        points.forEach(p => {
            pathD += ` L ${mapX(p.x)} ${mapY(p.y)}`;
        });
        
        // Path del área bajo la curva
        const areaD = pathD + ` L ${mapX(points[points.length - 1].x)} ${h - pad} L ${mapX(points[0].x)} ${h - pad} Z`;
        
        // Línea de la media
        const meanX = mapX(mean);
        
        // Líneas de sigma
        const sigma1L = mapX(mean - stdDev);
        const sigma1R = mapX(mean + stdDev);
        const sigma2L = mapX(mean - 2 * stdDev);
        const sigma2R = mapX(mean + 2 * stdDev);
        
        svg.innerHTML = `
            <!-- Área bajo la curva -->
            <path d="${areaD}" fill="rgba(0, 255, 157, 0.1)" stroke="none" />
            
            <!-- Curva -->
            <path d="${pathD}" fill="none" stroke="#00d4ff" stroke-width="2" />
            
            <!-- Líneas de sigma -->
            <line x1="${sigma2L}" y1="${pad}" x2="${sigma2L}" y2="${h - pad}" 
                  stroke="#333" stroke-dasharray="2" opacity="0.5" />
            <line x1="${sigma2R}" y1="${pad}" x2="${sigma2R}" y2="${h - pad}" 
                  stroke="#333" stroke-dasharray="2" opacity="0.5" />
            <line x1="${sigma1L}" y1="${pad}" x2="${sigma1L}" y2="${h - pad}" 
                  stroke="#444" stroke-dasharray="4" opacity="0.7" />
            <line x1="${sigma1R}" y1="${pad}" x2="${sigma1R}" y2="${h - pad}" 
                  stroke="#444" stroke-dasharray="4" opacity="0.7" />
            
            <!-- Media -->
            <line x1="${meanX}" y1="${pad - 5}" x2="${meanX}" y2="${h - pad + 5}" 
                  stroke="#fff" stroke-width="2" stroke-dasharray="4" />
            
            <!-- Labels -->
            <text x="${meanX}" y="${h - 2}" fill="#00ff9d" font-size="10" text-anchor="middle">μ=${mean}</text>
            <text x="${sigma1L}" y="${h - 2}" fill="#666" font-size="8" text-anchor="middle">-1σ</text>
            <text x="${sigma1R}" y="${h - 2}" fill="#666" font-size="8" text-anchor="middle">+1σ</text>
        `;
    }
};

// Exponer globalmente
window.Statistics = Statistics;
