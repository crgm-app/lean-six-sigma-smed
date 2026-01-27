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
    
    // Calcular estadísticas - USA FILTROS CENTRALIZADOS
    calculate: () => {
        // USAR FILTROS CENTRALIZADOS si están disponibles
        let filtered = typeof Filtros !== 'undefined' ? Filtros.getFiltered('stats') : [...AppState.registros];
        
        // Aplicar filtro adicional por Tipo (INT/EXT/NVA) si existe el selector
        const filterTipo = document.getElementById('statsFilterTipo')?.value || 'ALL';
        if (filterTipo !== 'ALL') {
            filtered = filtered.filter(r => r.tipo === filterTipo);
        }
        
        // Aplicar filtro adicional por Categoría/Actividad específica si existe
        const filterCat = document.getElementById('statsFilter')?.value || 'ALL';
        if (filterCat !== 'ALL') {
            if (filterCat.startsWith('CAT:')) {
                filtered = filtered.filter(r => r.cat === filterCat.split(':')[1]);
            } else if (filterCat.startsWith('NAME:')) {
                filtered = filtered.filter(r => r.name === filterCat.split(':')[1]);
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

// =====================================================
// INTERPRETACIÓN ESTADÍSTICA PROFUNDA
// =====================================================

const StatsInterpretation = {
    // Generar interpretación completa de las estadísticas
    generate: (stats, sixSigma) => {
        if (!stats || stats.n < 2) return null;
        
        return {
            resumen: StatsInterpretation.getResumen(stats, sixSigma),
            variabilidad: StatsInterpretation.getVariabilidad(stats),
            capacidad: StatsInterpretation.getCapacidad(sixSigma),
            acciones: StatsInterpretation.getAcciones(stats, sixSigma),
            ejemplo: StatsInterpretation.getEjemplo(stats)
        };
    },
    
    // Resumen ejecutivo
    getResumen: (stats, sixSigma) => {
        let nivel = 'crítico';
        let color = '#ef4444';
        
        if (sixSigma.cpk >= 1.67) {
            nivel = 'excelente';
            color = '#10b981';
        } else if (sixSigma.cpk >= 1.33) {
            nivel = 'bueno';
            color = '#22c55e';
        } else if (sixSigma.cpk >= 1.0) {
            nivel = 'aceptable';
            color = '#f59e0b';
        } else if (sixSigma.cpk >= 0.67) {
            nivel = 'marginal';
            color = '#f97316';
        }
        
        return {
            nivel,
            color,
            texto: `El proceso tiene un nivel de desempeño ${nivel.toUpperCase()}. ` +
                   `Con ${stats.n} mediciones, el tiempo promedio es ${stats.mean}s ` +
                   `con una variación de ±${stats.stdDev}s.`
        };
    },
    
    // Interpretación de variabilidad
    getVariabilidad: (stats) => {
        let categoria, descripcion, icono;
        
        if (stats.cv < 10) {
            categoria = 'Muy Estable';
            descripcion = 'Excelente consistencia. El proceso está muy controlado.';
            icono = '🎯';
        } else if (stats.cv < 20) {
            categoria = 'Estable';
            descripcion = 'Buena consistencia. Variaciones dentro de lo esperado.';
            icono = '✅';
        } else if (stats.cv < 30) {
            categoria = 'Moderada';
            descripcion = 'Variabilidad significativa. Requiere atención.';
            icono = '⚠️';
        } else {
            categoria = 'Alta';
            descripcion = 'Proceso inestable. Necesita intervención urgente.';
            icono = '🔴';
        }
        
        return {
            categoria,
            descripcion,
            icono,
            cv: stats.cv,
            formula: `CV = (σ / μ) × 100 = (${stats.stdDev} / ${stats.mean}) × 100 = ${stats.cv}%`,
            interpretacion: `El Coeficiente de Variación (CV) de ${stats.cv}% indica que las mediciones ` +
                           `varían en promedio un ${stats.cv}% respecto a la media.`
        };
    },
    
    // Interpretación de capacidad
    getCapacidad: (sixSigma) => {
        const { cp, cpk, sigmaLevel, processClass } = sixSigma;
        
        let interpretacionCp = '';
        let interpretacionCpk = '';
        
        // Interpretar Cp
        if (cp >= 2.0) {
            interpretacionCp = 'El proceso tiene potencial de clase mundial.';
        } else if (cp >= 1.67) {
            interpretacionCp = 'El proceso tiene muy buen potencial.';
        } else if (cp >= 1.33) {
            interpretacionCp = 'El proceso tiene buen potencial.';
        } else if (cp >= 1.0) {
            interpretacionCp = 'El proceso es apenas capaz.';
        } else {
            interpretacionCp = 'El proceso NO es capaz de cumplir especificaciones.';
        }
        
        // Interpretar Cpk
        if (cpk >= cp * 0.9) {
            interpretacionCpk = 'El proceso está bien centrado.';
        } else {
            interpretacionCpk = 'El proceso está descentrado. La media debería acercarse al objetivo.';
        }
        
        return {
            cp,
            cpk,
            sigmaLevel,
            processClass,
            interpretacionCp,
            interpretacionCpk,
            formula: {
                cp: 'Cp = (USL - LSL) / (6σ)',
                cpk: 'Cpk = min[(USL - μ)/(3σ), (μ - LSL)/(3σ)]'
            },
            significado: `Cp mide el potencial del proceso si estuviera centrado. ` +
                        `Cpk mide la capacidad real considerando el centrado actual.`
        };
    },
    
    // Acciones recomendadas
    getAcciones: (stats, sixSigma) => {
        const acciones = [];
        
        // Por variabilidad
        if (stats.cv > 30) {
            acciones.push({
                prioridad: 'ALTA',
                area: 'Variabilidad',
                accion: 'Estandarizar el proceso con procedimientos escritos',
                impacto: 'Reducir CV a menos de 20%'
            });
        }
        
        // Por capacidad
        if (sixSigma.cpk < 1.0) {
            acciones.push({
                prioridad: 'ALTA',
                area: 'Capacidad',
                accion: 'Identificar y eliminar causas de variación especiales',
                impacto: 'Elevar Cpk a 1.33 mínimo'
            });
        }
        
        // Por centrado
        if (sixSigma.cpk < sixSigma.cp * 0.8) {
            acciones.push({
                prioridad: 'MEDIA',
                area: 'Centrado',
                accion: 'Ajustar el proceso para centrar la media en el objetivo',
                impacto: 'Igualar Cpk con Cp'
            });
        }
        
        // Por rango
        if (stats.range > stats.mean * 0.5) {
            acciones.push({
                prioridad: 'MEDIA',
                area: 'Rango',
                accion: 'Investigar los valores extremos (outliers)',
                impacto: 'Reducir el rango de variación'
            });
        }
        
        // Si todo está bien
        if (acciones.length === 0) {
            acciones.push({
                prioridad: 'BAJA',
                area: 'Mantenimiento',
                accion: 'Mantener las condiciones actuales y monitorear',
                impacto: 'Preservar el nivel de desempeño'
            });
        }
        
        return acciones;
    },
    
    // Ejemplo práctico
    getEjemplo: (stats) => {
        const tiempoObjetivo = Math.round(stats.mean * 0.8); // Meta: 20% menos
        const tiempoIdeal = Math.round(stats.mean * 0.6);    // Ideal: 40% menos
        
        return {
            titulo: 'Ejemplo: Actividad "Cambio de Troquel"',
            actual: {
                descripcion: 'Estado Actual',
                tiempo: `${stats.mean}s (±${stats.stdDev}s)`,
                significado: `Tarda en promedio ${stats.mean} segundos con variación de ±${stats.stdDev}s`
            },
            objetivo: {
                descripcion: 'Objetivo SMED (Etapa 1-2)',
                tiempo: `${tiempoObjetivo}s`,
                significado: 'Separar internas/externas y convertir actividades'
            },
            ideal: {
                descripcion: 'Meta Lean (Etapa 3)',
                tiempo: `${tiempoIdeal}s`,
                significado: 'Optimización total con operaciones paralelas'
            },
            comoLograrlo: [
                'Documentar el proceso actual con video',
                'Clasificar cada paso como INT, EXT o NVA',
                'Mover actividades externas fuera del tiempo de paro',
                'Usar fijaciones rápidas (quick clamps)',
                'Implementar operaciones paralelas con 2+ personas',
                'Eliminar ajustes mediante poka-yoke'
            ]
        };
    },
    
    // Renderizar panel de interpretación
    renderPanel: (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const stats = Statistics.data.stats;
        const sixSigma = Statistics.data.sixSigma;
        
        if (!stats || !sixSigma || stats.n < 2) {
            container.innerHTML = '<div class="no-data-msg">Se necesitan más datos para el análisis</div>';
            return;
        }
        
        const interp = StatsInterpretation.generate(stats, sixSigma);
        
        container.innerHTML = `
            <!-- Resumen -->
            <div style="background: linear-gradient(135deg, ${interp.resumen.color}22, #1a1a2e); padding: 15px; border-radius: 8px; border-left: 4px solid ${interp.resumen.color}; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: ${interp.resumen.color};">📊 Resumen: Nivel ${interp.resumen.nivel.toUpperCase()}</h4>
                <p style="margin: 0; color: #ccc;">${interp.resumen.texto}</p>
            </div>
            
            <!-- Variabilidad -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #00d4ff;">${interp.variabilidad.icono} Variabilidad: ${interp.variabilidad.categoria}</h4>
                <p style="margin: 0 0 10px 0; color: #888;">${interp.variabilidad.descripcion}</p>
                <div style="background: #0a0a0a; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 0.85em; color: #00ff9d;">
                    ${interp.variabilidad.formula}
                </div>
                <p style="margin: 10px 0 0 0; color: #aaa; font-size: 0.9em;">${interp.variabilidad.interpretacion}</p>
            </div>
            
            <!-- Capacidad -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #8b5cf6;">📐 Capacidad del Proceso</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <div style="background: #0a0a0a; padding: 10px; border-radius: 4px;">
                        <span style="color: #888; font-size: 0.8em;">Cp (Potencial)</span>
                        <div style="color: #00d4ff; font-size: 1.3em; font-weight: bold;">${interp.capacidad.cp}</div>
                        <span style="color: #666; font-size: 0.75em;">${interp.capacidad.interpretacionCp}</span>
                    </div>
                    <div style="background: #0a0a0a; padding: 10px; border-radius: 4px;">
                        <span style="color: #888; font-size: 0.8em;">Cpk (Real)</span>
                        <div style="color: #00ff9d; font-size: 1.3em; font-weight: bold;">${interp.capacidad.cpk}</div>
                        <span style="color: #666; font-size: 0.75em;">${interp.capacidad.interpretacionCpk}</span>
                    </div>
                </div>
                <p style="margin: 0; color: #888; font-size: 0.85em;">${interp.capacidad.significado}</p>
            </div>
            
            <!-- Acciones -->
            <div style="background: #1a1a2e; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; color: #f59e0b;">🎯 Acciones Recomendadas</h4>
                ${interp.acciones.map(a => `
                    <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; padding: 10px; background: #0a0a0a; border-radius: 4px; border-left: 3px solid ${a.prioridad === 'ALTA' ? '#ef4444' : a.prioridad === 'MEDIA' ? '#f59e0b' : '#10b981'};">
                        <span style="background: ${a.prioridad === 'ALTA' ? '#ef4444' : a.prioridad === 'MEDIA' ? '#f59e0b' : '#10b981'}; color: #000; padding: 2px 8px; border-radius: 4px; font-size: 0.7em; font-weight: bold;">${a.prioridad}</span>
                        <div style="flex: 1;">
                            <div style="color: #fff; font-weight: bold;">${a.area}</div>
                            <div style="color: #aaa; font-size: 0.9em;">${a.accion}</div>
                            <div style="color: #00ff9d; font-size: 0.8em;">Impacto esperado: ${a.impacto}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Ejemplo -->
            <div style="background: linear-gradient(135deg, #1e40af22, #1a1a2e); padding: 15px; border-radius: 8px; border: 1px solid #3b82f6;">
                <h4 style="margin: 0 0 10px 0; color: #3b82f6;">💡 ${interp.ejemplo.titulo}</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                    <div style="background: #0a0a0a; padding: 10px; border-radius: 4px; text-align: center;">
                        <div style="color: #888; font-size: 0.8em;">${interp.ejemplo.actual.descripcion}</div>
                        <div style="color: #ef4444; font-size: 1.2em; font-weight: bold;">${interp.ejemplo.actual.tiempo}</div>
                    </div>
                    <div style="background: #0a0a0a; padding: 10px; border-radius: 4px; text-align: center;">
                        <div style="color: #888; font-size: 0.8em;">${interp.ejemplo.objetivo.descripcion}</div>
                        <div style="color: #f59e0b; font-size: 1.2em; font-weight: bold;">${interp.ejemplo.objetivo.tiempo}</div>
                    </div>
                    <div style="background: #0a0a0a; padding: 10px; border-radius: 4px; text-align: center;">
                        <div style="color: #888; font-size: 0.8em;">${interp.ejemplo.ideal.descripcion}</div>
                        <div style="color: #10b981; font-size: 1.2em; font-weight: bold;">${interp.ejemplo.ideal.tiempo}</div>
                    </div>
                </div>
                <div style="color: #aaa; font-size: 0.85em;">
                    <strong style="color: #fff;">¿Cómo lograrlo?</strong>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                        ${interp.ejemplo.comoLograrlo.map(paso => `<li style="margin-bottom: 5px;">${paso}</li>`).join('')}
                    </ol>
                </div>
            </div>
        `;
    }
};

// =====================================================
// ANÁLISIS PARETO (80/20)
// =====================================================

const Pareto = {
    // Calcular análisis Pareto por categoría, actividad, tipo, etc.
    calculate: (groupBy = 'cat') => {
        const registros = typeof Filtros !== 'undefined' ? Filtros.getFiltered('stats') : AppState.registros;
        
        if (registros.length === 0) return { items: [], total: 0 };
        
        // Agrupar por el campo indicado
        const grupos = {};
        registros.forEach(r => {
            const key = r[groupBy] || 'Sin clasificar';
            if (!grupos[key]) {
                grupos[key] = { tiempo: 0, count: 0 };
            }
            grupos[key].tiempo += (r.duracion || r.duration || 0);
            grupos[key].count += 1;
        });
        
        // Convertir a array y ordenar de mayor a menor
        const items = Object.entries(grupos)
            .map(([name, data]) => ({
                name,
                tiempo: Utils.round2(data.tiempo),
                count: data.count
            }))
            .sort((a, b) => b.tiempo - a.tiempo);
        
        // Calcular total
        const total = items.reduce((sum, item) => sum + item.tiempo, 0);
        
        // Calcular porcentaje y acumulado
        let acumulado = 0;
        items.forEach(item => {
            item.porcentaje = Utils.round2((item.tiempo / total) * 100);
            acumulado += item.porcentaje;
            item.acumulado = Utils.round2(acumulado);
            item.esVital = item.acumulado <= 80; // Pocos vitales (80%)
        });
        
        return { items, total };
    },
    
    // Obtener resumen 80/20
    getResumen: (data) => {
        if (!data || data.items.length === 0) return null;
        
        const vitales = data.items.filter(i => i.esVital);
        const triviales = data.items.filter(i => !i.esVital);
        
        const tiempoVitales = vitales.reduce((sum, i) => sum + i.tiempo, 0);
        const pctVitales = Utils.round2((tiempoVitales / data.total) * 100);
        
        return {
            totalItems: data.items.length,
            vitales: {
                count: vitales.length,
                pct: Utils.round2((vitales.length / data.items.length) * 100),
                tiempo: Utils.round2(tiempoVitales),
                tiempoPct: pctVitales
            },
            triviales: {
                count: triviales.length,
                pct: Utils.round2((triviales.length / data.items.length) * 100),
                tiempo: Utils.round2(data.total - tiempoVitales),
                tiempoPct: Utils.round2(100 - pctVitales)
            },
            interpretacion: `${vitales.length} de ${data.items.length} categorías (${Utils.round2((vitales.length / data.items.length) * 100)}%) ` +
                           `representan el ${pctVitales}% del tiempo total. ` +
                           `Enfoca tus mejoras en: ${vitales.map(v => v.name).join(', ')}.`
        };
    },
    
    // Renderizar Pareto en un contenedor
    render: (containerId, groupBy = 'cat') => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const data = Pareto.calculate(groupBy);
        
        if (data.items.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay datos para análisis Pareto</div>';
            return;
        }
        
        const resumen = Pareto.getResumen(data);
        const maxTiempo = data.items[0].tiempo;
        
        container.innerHTML = `
            <!-- Resumen 80/20 -->
            <div style="background: linear-gradient(135deg, #f59e0b22, #1a1a2e); padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #f59e0b;">
                <h4 style="margin: 0 0 10px 0; color: #f59e0b;">📊 Principio de Pareto (80/20)</h4>
                <p style="margin: 0; color: #ccc;">${resumen.interpretacion}</p>
            </div>
            
            <!-- Tabla Pareto -->
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                    <thead>
                        <tr style="background: #1a1a2e;">
                            <th style="padding: 8px; text-align: left; color: #888;">#</th>
                            <th style="padding: 8px; text-align: left; color: #888;">Categoría</th>
                            <th style="padding: 8px; text-align: right; color: #888;">Tiempo</th>
                            <th style="padding: 8px; text-align: right; color: #888;">%</th>
                            <th style="padding: 8px; text-align: right; color: #888;">Acum.</th>
                            <th style="padding: 8px; text-align: left; color: #888;">Barra</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map((item, i) => `
                            <tr style="background: ${item.esVital ? 'rgba(239,68,68,0.1)' : 'transparent'}; border-bottom: 1px solid #333;">
                                <td style="padding: 8px; color: #666;">${i + 1}</td>
                                <td style="padding: 8px; color: ${item.esVital ? '#fff' : '#888'}; font-weight: ${item.esVital ? 'bold' : 'normal'};">
                                    ${item.esVital ? '🔥 ' : ''}${item.name}
                                </td>
                                <td style="padding: 8px; text-align: right; color: #00d4ff; font-family: monospace;">${Utils.formatDuration ? Utils.formatDuration(item.tiempo) : item.tiempo.toFixed(1) + 's'}</td>
                                <td style="padding: 8px; text-align: right; color: ${item.esVital ? '#ef4444' : '#666'};">${item.porcentaje}%</td>
                                <td style="padding: 8px; text-align: right; color: ${item.acumulado <= 80 ? '#f59e0b' : '#666'}; font-weight: ${item.acumulado <= 80 ? 'bold' : 'normal'};">${item.acumulado}%</td>
                                <td style="padding: 8px; width: 150px;">
                                    <div style="position: relative; height: 16px; background: #333; border-radius: 8px; overflow: hidden;">
                                        <div style="position: absolute; height: 100%; width: ${(item.tiempo / maxTiempo) * 100}%; background: ${item.esVital ? 'linear-gradient(90deg, #ef4444, #f97316)' : '#3b82f6'}; border-radius: 8px;"></div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Explicación para tontos -->
            <div style="background: #0a0a0a; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px dashed #333;">
                <h5 style="margin: 0 0 10px 0; color: #00d4ff;">💡 ¿Qué significa esto?</h5>
                <p style="margin: 0; color: #888; font-size: 0.9em;">
                    El <strong style="color: #f59e0b;">Principio de Pareto</strong> dice que el 80% de los problemas vienen del 20% de las causas.
                    <br><br>
                    🔥 Las filas marcadas en <span style="color: #ef4444;">rojo</span> son los <strong>"pocos vitales"</strong> donde debes enfocar tus mejoras.
                    <br><br>
                    Si mejoras solo estas ${resumen.vitales.count} categorías, impactarás el ${resumen.vitales.tiempoPct}% del tiempo total.
                </p>
            </div>
        `;
    }
};

// =====================================================
// COMPARATIVO MULTI-DIMENSIONAL PARA ESTADÍSTICAS
// =====================================================

const StatsComparative = {
    // Calcular stats por grupo
    calculateByGroup: (groupBy = 'op') => {
        const registros = typeof Filtros !== 'undefined' ? Filtros.getFiltered('stats') : AppState.registros;
        
        if (registros.length === 0) return [];
        
        // Agrupar
        const grupos = {};
        registros.forEach(r => {
            let key = r[groupBy] || 'Sin clasificar';
            if (groupBy === 'op' && key) key = key.padStart(8, '0');
            if (!grupos[key]) grupos[key] = [];
            grupos[key].push(r.duracion || r.duration || 0);
        });
        
        // Calcular stats para cada grupo
        return Object.entries(grupos)
            .filter(([_, values]) => values.length >= 2)
            .map(([name, values]) => {
                const sorted = [...values].sort((a, b) => a - b);
                const n = sorted.length;
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / n;
                const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
                const stdDev = Math.sqrt(variance);
                const cv = mean > 0 ? (stdDev / mean) * 100 : 0;
                
                return {
                    name,
                    n,
                    total: Utils.round2(sum),
                    mean: Utils.round2(mean),
                    stdDev: Utils.round2(stdDev),
                    cv: Utils.round2(cv),
                    min: Utils.round2(sorted[0]),
                    max: Utils.round2(sorted[n - 1])
                };
            })
            .sort((a, b) => a.mean - b.mean); // Ordenar por promedio
    },
    
    // Renderizar comparativo
    render: (containerId, groupBy = 'op') => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const data = StatsComparative.calculateByGroup(groupBy);
        
        if (data.length === 0) {
            container.innerHTML = '<div class="no-data-msg">No hay suficientes datos para comparar (mínimo 2 por grupo)</div>';
            return;
        }
        
        const labels = {
            'op': 'Orden de Producción',
            'maquina': 'Máquina',
            'turno': 'Turno',
            'tipo': 'Tipo SMED'
        };
        
        // Encontrar mejor y peor
        const mejor = data[0]; // Menor promedio
        const peor = data[data.length - 1]; // Mayor promedio
        const masConsistente = [...data].sort((a, b) => a.cv - b.cv)[0]; // Menor CV
        
        container.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #00d4ff;">📊 Comparativo por ${labels[groupBy] || groupBy}</h4>
            
            <!-- Resumen -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px;">
                <div style="background: #10b981; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="color: #fff; font-size: 0.8em;">🏆 Más Rápido</div>
                    <div style="color: #fff; font-weight: bold;">${mejor.name}</div>
                    <div style="color: #d1fae5;">${mejor.mean}s prom</div>
                </div>
                <div style="background: #3b82f6; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="color: #fff; font-size: 0.8em;">🎯 Más Consistente</div>
                    <div style="color: #fff; font-weight: bold;">${masConsistente.name}</div>
                    <div style="color: #bfdbfe;">CV: ${masConsistente.cv}%</div>
                </div>
                <div style="background: #ef4444; padding: 10px; border-radius: 8px; text-align: center;">
                    <div style="color: #fff; font-size: 0.8em;">⚠️ Más Lento</div>
                    <div style="color: #fff; font-weight: bold;">${peor.name}</div>
                    <div style="color: #fecaca;">${peor.mean}s prom</div>
                </div>
            </div>
            
            <!-- Tabla -->
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                <thead>
                    <tr style="background: #1a1a2e;">
                        <th style="padding: 8px; text-align: left; color: #888;">${labels[groupBy] || groupBy}</th>
                        <th style="padding: 8px; text-align: right; color: #888;">N</th>
                        <th style="padding: 8px; text-align: right; color: #888;">Promedio</th>
                        <th style="padding: 8px; text-align: right; color: #888;">σ</th>
                        <th style="padding: 8px; text-align: right; color: #888;">CV%</th>
                        <th style="padding: 8px; text-align: right; color: #888;">Rango</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(item => {
                        const esMejor = item.name === mejor.name;
                        const esPeor = item.name === peor.name;
                        return `
                        <tr style="background: ${esMejor ? 'rgba(16,185,129,0.1)' : esPeor ? 'rgba(239,68,68,0.1)' : 'transparent'}; border-bottom: 1px solid #333;">
                            <td style="padding: 8px; color: ${esMejor ? '#10b981' : esPeor ? '#ef4444' : '#fff'}; font-weight: bold;">
                                ${esMejor ? '🏆 ' : esPeor ? '⚠️ ' : ''}${item.name}
                            </td>
                            <td style="padding: 8px; text-align: right; color: #666;">${item.n}</td>
                            <td style="padding: 8px; text-align: right; color: #00d4ff; font-family: monospace;">${item.mean}s</td>
                            <td style="padding: 8px; text-align: right; color: #888;">${item.stdDev}s</td>
                            <td style="padding: 8px; text-align: right; color: ${item.cv < 20 ? '#10b981' : item.cv < 30 ? '#f59e0b' : '#ef4444'};">${item.cv}%</td>
                            <td style="padding: 8px; text-align: right; color: #666;">${item.min}-${item.max}s</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    }
};

// Exponer globalmente
window.Statistics = Statistics;
window.StatsInterpretation = StatsInterpretation;
window.Pareto = Pareto;
window.StatsComparative = StatsComparative;
