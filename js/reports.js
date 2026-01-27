/**
 * SMED Analyzer Pro - Módulo de Informes
 * Generación de informes personalizables y exportables
 */

// =====================================================
// MÓDULO DE INFORMES
// =====================================================

const Reports = {
    // Configuración por defecto del informe
    config: {
        incluirEncabezado: true,
        incluirResumen: true,
        incluirGraficoBarras: true,
        incluirGraficoPastel: true,
        incluirGantt: true,
        incluirBoxPlot: true,
        incluirTablaDetalle: true,
        incluirSixSigma: true,
        incluirRecomendaciones: true,
        // Opciones de comparativas
        incluirComparativoOP: true,
        incluirComparativoMaquina: true,
        incluirComparativoTurno: true,
        incluirPareto: true,
        // NUEVAS: Comparadores Multidimensionales
        incluirMultiDimAnalysis: true,
        incluirMultiDimStats: true,
        incluirMultiDimGantt: true,
        titulo: 'Informe de Análisis SMED',
        empresa: 'Planta Corrugadora'
    },
    
    // Configuraciones guardadas
    savedConfigs: [],
    
    // Cargar configuración guardada
    loadConfig: () => {
        try {
            const saved = localStorage.getItem('smed_report_config');
            if (saved) {
                Reports.config = { ...Reports.config, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Error cargando configuración de informes:', e);
        }
        Reports.updateUI();
    },
    
    // Guardar configuración
    saveConfig: () => {
        try {
            localStorage.setItem('smed_report_config', JSON.stringify(Reports.config));
            alert('✅ Configuración de informe guardada');
        } catch (e) {
            console.error('Error guardando configuración:', e);
        }
    },
    
    // Actualizar UI con la configuración
    updateUI: () => {
        const checkboxes = [
            'incluirEncabezado', 'incluirResumen', 'incluirGraficoBarras',
            'incluirGraficoPastel', 'incluirGantt', 'incluirBoxPlot',
            'incluirTablaDetalle', 'incluirSixSigma', 'incluirRecomendaciones',
            'incluirComparativoOP', 'incluirComparativoMaquina', 'incluirComparativoTurno', 'incluirPareto'
        ];
        
        checkboxes.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = Reports.config[id] !== false; // Default true si no está definido
        });
        
        const tituloEl = document.getElementById('reportTitulo');
        if (tituloEl) tituloEl.value = Reports.config.titulo;
        
        const empresaEl = document.getElementById('reportEmpresa');
        if (empresaEl) empresaEl.value = Reports.config.empresa;
    },
    
    // Leer configuración desde UI
    readConfigFromUI: () => {
        const checkboxes = [
            'incluirEncabezado', 'incluirResumen', 'incluirGraficoBarras',
            'incluirGraficoPastel', 'incluirGantt', 'incluirBoxPlot',
            'incluirTablaDetalle', 'incluirSixSigma', 'incluirRecomendaciones',
            'incluirComparativoOP', 'incluirComparativoMaquina', 'incluirComparativoTurno', 'incluirPareto'
        ];
        
        checkboxes.forEach(id => {
            const el = document.getElementById(id);
            if (el) Reports.config[id] = el.checked;
        });
        
        const tituloEl = document.getElementById('reportTitulo');
        if (tituloEl) Reports.config.titulo = tituloEl.value;
        
        const empresaEl = document.getElementById('reportEmpresa');
        if (empresaEl) Reports.config.empresa = empresaEl.value;
    },
    
    // Obtener datos filtrados actuales - USA FILTROS CENTRALIZADOS
    getFilteredData: () => {
        // Usar el sistema de filtros centralizado si está disponible
        if (typeof Filtros !== 'undefined' && Filtros.getFiltered) {
            return Filtros.getFiltered('history');
        }
        
        // Fallback manual si no está disponible Filtros
        let data = [...AppState.registros];
        const filtros = AppState.filtros;
        
        // Aplicar todos los filtros incluyendo TIPO
        if (filtros.maquina && filtros.maquina !== 'ALL') {
            data = data.filter(r => r.maquina === filtros.maquina);
        }
        if (filtros.op && filtros.op !== 'ALL') {
            data = data.filter(r => r.op === filtros.op);
        }
        if (filtros.turno && filtros.turno !== 'ALL') {
            data = data.filter(r => r.turno === filtros.turno);
        }
        if (filtros.colores && filtros.colores !== 'ALL') {
            const numColores = parseInt(filtros.colores);
            if (numColores >= 4) {
                data = data.filter(r => (r.colores || 1) >= 4);
            } else {
                data = data.filter(r => (r.colores || 1) === numColores);
            }
        }
        if (filtros.tipo && filtros.tipo !== 'ALL') {
            data = data.filter(r => r.tipo === filtros.tipo);
        }
        if (filtros.categoria && filtros.categoria !== 'ALL') {
            data = data.filter(r => r.cat === filtros.categoria);
        }
        
        // Aplicar filtro de período
        if (filtros.periodo && filtros.periodo !== 'all') {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            data = data.filter(r => {
                let fechaReg;
                if (r.fecha) {
                    fechaReg = new Date(r.fecha + 'T00:00:00');
                } else if (r.timestamp) {
                    fechaReg = new Date(r.timestamp);
                    fechaReg.setHours(0, 0, 0, 0);
                } else {
                    return true;
                }
                
                switch (filtros.periodo) {
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
                        const desde = filtros.fechaDesde ? new Date(filtros.fechaDesde + 'T00:00:00') : null;
                        const hasta = filtros.fechaHasta ? new Date(filtros.fechaHasta + 'T23:59:59') : null;
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
    
    // Calcular estadísticas para el informe
    calcularEstadisticas: (data) => {
        if (data.length === 0) return null;
        
        const tiempoTotal = data.reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        const tiempoMuda = data.filter(r => r.tipo === 'NVA').reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        const tiempoINT = data.filter(r => r.tipo === 'INT').reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        const tiempoEXT = data.filter(r => r.tipo === 'EXT').reduce((sum, r) => sum + (r.duration || r.duracion || 0), 0);
        
        const eficiencia = tiempoTotal > 0 ? ((tiempoTotal - tiempoMuda) / tiempoTotal * 100) : 0;
        
        // Estadísticas avanzadas
        const tiempos = data.map(r => r.duration || r.duracion || 0).sort((a, b) => a - b);
        const n = tiempos.length;
        const media = tiempoTotal / n;
        const varianza = tiempos.reduce((sum, t) => sum + Math.pow(t - media, 2), 0) / n;
        const desviacion = Math.sqrt(varianza);
        const cv = media > 0 ? (desviacion / media * 100) : 0;
        
        return {
            registros: n,
            tiempoTotal: Utils.round2(tiempoTotal),
            tiempoMuda: Utils.round2(tiempoMuda),
            tiempoINT: Utils.round2(tiempoINT),
            tiempoEXT: Utils.round2(tiempoEXT),
            eficiencia: Utils.round2(eficiencia),
            media: Utils.round2(media),
            desviacion: Utils.round2(desviacion),
            cv: Utils.round2(cv),
            min: tiempos[0] || 0,
            max: tiempos[n - 1] || 0,
            mediana: n > 0 ? tiempos[Math.floor(n / 2)] : 0
        };
    },
    
    // Generar contenido HTML del informe
    generarHTML: () => {
        Reports.readConfigFromUI();
        const config = Reports.config;
        const data = Reports.getFilteredData();
        const stats = Reports.calcularEstadisticas(data);
        const fecha = new Date().toLocaleString();
        
        let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${config.titulo}</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            background: #fff;
            line-height: 1.6;
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
        }
        .header h1 { color: #1e40af; margin: 0; font-size: 2em; }
        .header p { color: #666; margin: 5px 0; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section h2 { 
            color: #1e40af; 
            border-bottom: 2px solid #3b82f6; 
            padding-bottom: 5px;
            font-size: 1.3em;
        }
        .kpi-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 15px; 
            margin: 20px 0;
        }
        .kpi-card { 
            background: #f0f9ff; 
            padding: 15px; 
            border-radius: 8px; 
            text-align: center;
            border: 1px solid #bae6fd;
        }
        .kpi-card.red { background: #fef2f2; border-color: #fecaca; }
        .kpi-card.green { background: #f0fdf4; border-color: #bbf7d0; }
        .kpi-card.yellow { background: #fffbeb; border-color: #fde68a; }
        .kpi-label { font-size: 0.85em; color: #666; }
        .kpi-value { font-size: 1.5em; font-weight: bold; color: #1e40af; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            font-size: 0.9em;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { background: #3b82f6; color: white; }
        tr:nth-child(even) { background: #f8fafc; }
        .chart-container { 
            margin: 20px 0; 
            text-align: center;
        }
        .chart-container canvas, .chart-container svg { 
            max-width: 100%; 
            height: auto;
        }
        .recomendacion { 
            background: #fffbeb; 
            border-left: 4px solid #f59e0b; 
            padding: 15px; 
            margin: 10px 0;
        }
        .footer { 
            text-align: center; 
            font-size: 0.8em; 
            color: #888; 
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        .filtros-aplicados {
            background: #f1f5f9;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>`;

        // Encabezado
        if (config.incluirEncabezado) {
            html += `
    <div class="header">
        <h1>🏭 ${config.titulo}</h1>
        <p><strong>${config.empresa}</strong></p>
        <p>Generado: ${fecha}</p>
    </div>
    
    <div class="filtros-aplicados">
        <strong>📋 Filtros aplicados:</strong> 
        Máquina: ${AppState.filtros.maquina || 'Todas'} | 
        OP: ${AppState.filtros.op || 'Todas'} | 
        Turno: ${AppState.filtros.turno || 'Todos'} | 
        Categoría: ${AppState.filtros.categoria || 'Todas'} |
        Registros: ${data.length}
    </div>`;
        }

        // Resumen Ejecutivo
        if (config.incluirResumen && stats) {
            html += `
    <div class="section">
        <h2>📊 Resumen Ejecutivo</h2>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">⏱️ Tiempo Total</div>
                <div class="kpi-value">${Utils.formatDuration(stats.tiempoTotal)}</div>
            </div>
            <div class="kpi-card green">
                <div class="kpi-label">📈 Eficiencia</div>
                <div class="kpi-value">${stats.eficiencia}%</div>
            </div>
            <div class="kpi-card red">
                <div class="kpi-label">⚠️ Mudas</div>
                <div class="kpi-value">${Utils.formatDuration(stats.tiempoMuda)}</div>
            </div>
            <div class="kpi-card yellow">
                <div class="kpi-label">🔧 Internas</div>
                <div class="kpi-value">${Utils.formatDuration(stats.tiempoINT)}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">📋 Registros</div>
                <div class="kpi-value">${stats.registros}</div>
            </div>
        </div>
    </div>`;
        }

        // Distribución por Tipo
        if ((config.incluirGraficoBarras || config.incluirGraficoPastel) && stats) {
            const pctINT = stats.tiempoTotal > 0 ? (stats.tiempoINT / stats.tiempoTotal * 100).toFixed(1) : 0;
            const pctEXT = stats.tiempoTotal > 0 ? (stats.tiempoEXT / stats.tiempoTotal * 100).toFixed(1) : 0;
            const pctNVA = stats.tiempoTotal > 0 ? (stats.tiempoMuda / stats.tiempoTotal * 100).toFixed(1) : 0;
            
            html += `
    <div class="section">
        <h2>📈 Distribución por Tipo SMED</h2>
        <table>
            <tr>
                <th>Tipo</th>
                <th>Tiempo</th>
                <th>Porcentaje</th>
                <th>Gráfico</th>
            </tr>
            <tr>
                <td>🟠 Interna (INT)</td>
                <td>${Utils.formatDuration(stats.tiempoINT)}</td>
                <td>${pctINT}%</td>
                <td><div style="background:#f97316; height:20px; width:${pctINT}%;"></div></td>
            </tr>
            <tr>
                <td>🟢 Externa (EXT)</td>
                <td>${Utils.formatDuration(stats.tiempoEXT)}</td>
                <td>${pctEXT}%</td>
                <td><div style="background:#10b981; height:20px; width:${pctEXT}%;"></div></td>
            </tr>
            <tr>
                <td>🔴 Muda (NVA)</td>
                <td>${Utils.formatDuration(stats.tiempoMuda)}</td>
                <td>${pctNVA}%</td>
                <td><div style="background:#ef4444; height:20px; width:${pctNVA}%;"></div></td>
            </tr>
        </table>
    </div>`;
        }

        // Distribución por Categoría
        if (config.incluirGraficoBarras && data.length > 0) {
            const byCat = {};
            data.forEach(r => {
                byCat[r.cat] = (byCat[r.cat] || 0) + (r.duration || r.duracion || 0);
            });
            const sortedCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
            const maxCat = sortedCats[0] ? sortedCats[0][1] : 1;
            
            html += `
    <div class="section">
        <h2>📊 Distribución por Categoría</h2>
        <table>
            <tr><th>Categoría</th><th>Tiempo</th><th>Gráfico</th></tr>
            ${sortedCats.map(([cat, tiempo]) => `
            <tr>
                <td>${cat}</td>
                <td>${Utils.formatDuration(tiempo)}</td>
                <td><div style="background:#3b82f6; height:20px; width:${(tiempo/maxCat*100).toFixed(0)}%;"></div></td>
            </tr>`).join('')}
        </table>
    </div>`;
        }

        // Estadísticas Six Sigma
        if (config.incluirSixSigma && stats) {
            const usl = stats.media * 1.2;
            const lsl = stats.media * 0.8;
            const cp = stats.desviacion > 0 ? (usl - lsl) / (6 * stats.desviacion) : 0;
            const cpk = Math.min(
                stats.desviacion > 0 ? (usl - stats.media) / (3 * stats.desviacion) : 0,
                stats.desviacion > 0 ? (stats.media - lsl) / (3 * stats.desviacion) : 0
            );
            const sigmaLevel = cpk * 3;
            
            let clasificacion = 'Incapaz';
            if (cpk >= 2.0) clasificacion = 'Clase Mundial';
            else if (cpk >= 1.67) clasificacion = 'Excelente';
            else if (cpk >= 1.33) clasificacion = 'Bueno';
            else if (cpk >= 1.0) clasificacion = 'Capaz';
            
            html += `
    <div class="section">
        <h2>📐 Métricas Six Sigma</h2>
        <div class="kpi-grid">
            <div class="kpi-card">
                <div class="kpi-label">Media (μ)</div>
                <div class="kpi-value">${stats.media}s</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Desv. Est. (σ)</div>
                <div class="kpi-value">${stats.desviacion}s</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">CV</div>
                <div class="kpi-value">${stats.cv}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Cp</div>
                <div class="kpi-value">${Utils.round2(cp)}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Cpk</div>
                <div class="kpi-value">${Utils.round2(cpk)}</div>
            </div>
            <div class="kpi-card ${clasificacion === 'Clase Mundial' || clasificacion === 'Excelente' ? 'green' : clasificacion === 'Incapaz' ? 'red' : 'yellow'}">
                <div class="kpi-label">Clasificación</div>
                <div class="kpi-value" style="font-size:1em;">${clasificacion}</div>
            </div>
        </div>
    </div>`;
        }

        // Box Plot info
        if (config.incluirBoxPlot && stats) {
            const tiempos = data.map(r => r.duration || r.duracion || 0).sort((a, b) => a - b);
            const n = tiempos.length;
            const q1 = tiempos[Math.floor(n * 0.25)] || 0;
            const q3 = tiempos[Math.floor(n * 0.75)] || 0;
            
            html += `
    <div class="section">
        <h2>📦 Diagrama de Caja (Box Plot)</h2>
        <table>
            <tr><th>Estadístico</th><th>Valor</th></tr>
            <tr><td>Mínimo</td><td>${stats.min}s</td></tr>
            <tr><td>Q1 (25%)</td><td>${Utils.round2(q1)}s</td></tr>
            <tr><td>Mediana</td><td>${Utils.round2(stats.mediana)}s</td></tr>
            <tr><td>Q3 (75%)</td><td>${Utils.round2(q3)}s</td></tr>
            <tr><td>Máximo</td><td>${stats.max}s</td></tr>
            <tr><td>Rango</td><td>${Utils.round2(stats.max - stats.min)}s</td></tr>
            <tr><td>IQR</td><td>${Utils.round2(q3 - q1)}s</td></tr>
        </table>
    </div>`;
        }

        // Tabla de detalle
        if (config.incluirTablaDetalle && data.length > 0) {
            html += `
    <div class="section">
        <h2>📋 Detalle de Actividades (Top 50)</h2>
        <table>
            <tr>
                <th>Fecha</th>
                <th>Máquina</th>
                <th>OP</th>
                <th>Turno</th>
                <th>Actividad</th>
                <th>Tipo</th>
                <th>Duración</th>
            </tr>
            ${data.slice(0, 50).map(r => `
            <tr>
                <td>${r.fecha || '-'}</td>
                <td>${r.maquina || '-'}</td>
                <td>${r.op || '-'}</td>
                <td>${r.turno || '-'}</td>
                <td>${r.name}</td>
                <td>${r.tipo === 'INT' ? '🟠 INT' : r.tipo === 'EXT' ? '🟢 EXT' : '🔴 NVA'}</td>
                <td>${r.duration || r.duracion}s</td>
            </tr>`).join('')}
        </table>
    </div>`;
        }

        // =====================================================
        // ANÁLISIS COMPARATIVO MULTI-DIMENSIONAL
        // =====================================================
        
        // Comparativo por OP
        if (config.incluirComparativoOP !== false && data.length > 0) {
            const byOP = Reports.agruparPorDimension(data, 'op');
            if (byOP.length > 1) {
                html += Reports.generarTablaComparativa(byOP, 'OP', '📋', '#10b981');
            }
        }
        
        // Comparativo por Máquina
        if (config.incluirComparativoMaquina !== false && data.length > 0) {
            const byMaquina = Reports.agruparPorDimension(data, 'maquina');
            if (byMaquina.length > 1) {
                html += Reports.generarTablaComparativa(byMaquina, 'Máquina', '🏭', '#00d4ff');
            }
        }
        
        // Comparativo por Turno
        if (config.incluirComparativoTurno !== false && data.length > 0) {
            const byTurno = Reports.agruparPorDimension(data, 'turno');
            if (byTurno.length > 1) {
                html += Reports.generarTablaComparativa(byTurno, 'Turno', '⏰', '#f59e0b');
            }
        }
        
        // Análisis Pareto
        if (config.incluirPareto !== false && data.length > 0) {
            html += Reports.generarAnalisisPareto(data);
        }

        // Recomendaciones
        if (config.incluirRecomendaciones && stats) {
            html += `
    <div class="section">
        <h2>💡 Recomendaciones</h2>`;
            
            if (stats.eficiencia < 80) {
                html += `<div class="recomendacion">
                    <strong>🎯 Mejorar eficiencia:</strong> La eficiencia actual (${stats.eficiencia}%) está por debajo del 80%. 
                    Enfocarse en reducir actividades tipo NVA (mudas).
                </div>`;
            }
            
            if (stats.tiempoMuda > stats.tiempoTotal * 0.2) {
                html += `<div class="recomendacion">
                    <strong>⚠️ Alto porcentaje de mudas:</strong> Las mudas representan más del 20% del tiempo total. 
                    Identificar y eliminar las causas raíz de los desperdicios.
                </div>`;
            }
            
            if (stats.tiempoINT > stats.tiempoEXT) {
                html += `<div class="recomendacion">
                    <strong>🔄 Convertir internas a externas:</strong> El tiempo de actividades internas (${Utils.formatDuration(stats.tiempoINT)}) 
                    supera al de externas. Aplicar metodología SMED para convertir actividades.
                </div>`;
            }
            
            if (stats.cv > 30) {
                html += `<div class="recomendacion">
                    <strong>📊 Alta variabilidad:</strong> El coeficiente de variación (${stats.cv}%) indica proceso inestable. 
                    Estandarizar procedimientos para reducir variabilidad.
                </div>`;
            }
            
            html += `</div>`;
        }

        // Footer
        html += `
    <div class="footer">
        <p>Informe generado por <strong>SMED Analyzer Pro</strong> - Lean Manufacturing + Six Sigma</p>
        <p>${fecha}</p>
    </div>
</body>
</html>`;

        return html;
    },
    
    // Exportar a HTML (editable)
    exportHTML: () => {
        const html = Reports.generarHTML();
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Informe_SMED_${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        URL.revokeObjectURL(link.href);
        alert('✅ Informe HTML exportado. Puedes abrirlo en cualquier navegador o editarlo.');
    },
    
    // Exportar a PDF usando ventana de impresión
    exportPDF: () => {
        const html = Reports.generarHTML();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Esperar a que cargue y abrir diálogo de impresión
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
        
        alert('💡 Se abrió una ventana con el informe.\n\nPara guardar como PDF:\n1. En el diálogo de impresión, selecciona "Guardar como PDF"\n2. O elige una impresora PDF');
    },
    
    // Vista previa del informe
    preview: () => {
        const html = Reports.generarHTML();
        const previewWindow = window.open('', '_blank');
        previewWindow.document.write(html);
        previewWindow.document.close();
    },
    
    // =====================================================
    // FUNCIONES AUXILIARES PARA COMPARATIVAS
    // =====================================================
    
    // Agrupar datos por dimensión (op, maquina, turno)
    agruparPorDimension: (data, dimension) => {
        const grupos = {};
        
        data.forEach(r => {
            let key;
            switch(dimension) {
                case 'maquina': key = r.maquina || 'Sin Máquina'; break;
                case 'turno': key = r.turno || 'Sin Turno'; break;
                default: key = r.op || 'Sin OP';
            }
            
            if (!grupos[key]) {
                grupos[key] = {
                    nombre: key,
                    registros: [],
                    tiempoTotal: 0,
                    tiempoINT: 0,
                    tiempoEXT: 0,
                    tiempoNVA: 0
                };
            }
            
            const duracion = r.duration || r.duracion || 0;
            grupos[key].registros.push(r);
            grupos[key].tiempoTotal += duracion;
            
            if (r.tipo === 'INT') grupos[key].tiempoINT += duracion;
            else if (r.tipo === 'EXT') grupos[key].tiempoEXT += duracion;
            else grupos[key].tiempoNVA += duracion;
        });
        
        // Calcular métricas adicionales
        Object.values(grupos).forEach(g => {
            g.eficiencia = g.tiempoTotal > 0 ? ((g.tiempoTotal - g.tiempoNVA) / g.tiempoTotal * 100) : 0;
            g.promedio = g.registros.length > 0 ? g.tiempoTotal / g.registros.length : 0;
            g.ratioIntExt = g.tiempoEXT > 0 ? g.tiempoINT / g.tiempoEXT : 0;
            
            // Calcular CV
            const mean = g.promedio;
            const tiempos = g.registros.map(r => r.duration || r.duracion || 0);
            const variance = tiempos.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / tiempos.length || 0;
            g.cv = mean > 0 ? (Math.sqrt(variance) / mean * 100) : 0;
        });
        
        return Object.values(grupos)
            .filter(g => g.nombre !== 'Sin OP' && g.nombre !== 'Sin Máquina' && g.nombre !== 'Sin Turno')
            .sort((a, b) => b.tiempoTotal - a.tiempoTotal);
    },
    
    // Generar tabla comparativa HTML
    generarTablaComparativa: (grupos, dimensionLabel, icono, color) => {
        if (grupos.length === 0) return '';
        
        const mejorEficiencia = grupos.reduce((a, b) => a.eficiencia > b.eficiencia ? a : b);
        const menorCV = grupos.reduce((a, b) => a.cv < b.cv ? a : b);
        
        return `
    <div class="section">
        <h2>${icono} Análisis Comparativo por ${dimensionLabel}</h2>
        <table>
            <tr>
                <th style="background: ${color};">${dimensionLabel}</th>
                <th>Registros</th>
                <th>Tiempo Total</th>
                <th>Promedio</th>
                <th>Eficiencia</th>
                <th>Ratio INT/EXT</th>
                <th>CV%</th>
            </tr>
            ${grupos.slice(0, 10).map(g => {
                const efColor = g.eficiencia >= 90 ? '#10b981' : g.eficiencia >= 70 ? '#f59e0b' : '#ef4444';
                const cvColor = g.cv < 20 ? '#10b981' : g.cv < 40 ? '#f59e0b' : '#ef4444';
                return `
            <tr>
                <td style="color: ${color}; font-weight: bold;">${g.nombre}</td>
                <td>${g.registros.length}</td>
                <td>${Utils.formatDuration(g.tiempoTotal)}</td>
                <td>${Utils.formatDuration(g.promedio)}</td>
                <td style="color: ${efColor}; font-weight: bold;">${g.eficiencia.toFixed(1)}%</td>
                <td>${g.ratioIntExt.toFixed(2)}</td>
                <td style="color: ${cvColor};">${g.cv.toFixed(1)}%</td>
            </tr>`;
            }).join('')}
        </table>
        <div class="kpi-grid" style="margin-top: 15px;">
            <div class="kpi-card green">
                <div class="kpi-label">🏆 Mejor Eficiencia</div>
                <div class="kpi-value" style="font-size: 1.2em;">${mejorEficiencia.nombre}</div>
                <div style="font-size: 0.9em; color: #10b981;">${mejorEficiencia.eficiencia.toFixed(1)}%</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">🎯 Más Consistente (menor CV)</div>
                <div class="kpi-value" style="font-size: 1.2em;">${menorCV.nombre}</div>
                <div style="font-size: 0.9em; color: #3b82f6;">${menorCV.cv.toFixed(1)}%</div>
            </div>
        </div>
    </div>`;
    },
    
    // Generar análisis Pareto (80/20)
    generarAnalisisPareto: (data) => {
        // Agrupar por actividad
        const byActivity = {};
        data.forEach(r => {
            const name = r.name;
            if (!byActivity[name]) {
                byActivity[name] = { nombre: name, tiempoTotal: 0, count: 0, tipo: r.tipo };
            }
            byActivity[name].tiempoTotal += (r.duration || r.duracion || 0);
            byActivity[name].count++;
        });
        
        // Ordenar por tiempo total (mayor a menor)
        const sorted = Object.values(byActivity).sort((a, b) => b.tiempoTotal - a.tiempoTotal);
        const tiempoGlobal = sorted.reduce((sum, a) => sum + a.tiempoTotal, 0);
        
        // Calcular acumulado y encontrar el punto 80%
        let acumulado = 0;
        let punto80 = -1;
        sorted.forEach((a, i) => {
            acumulado += a.tiempoTotal;
            a.pct = (a.tiempoTotal / tiempoGlobal * 100);
            a.pctAcumulado = (acumulado / tiempoGlobal * 100);
            if (a.pctAcumulado >= 80 && punto80 === -1) {
                punto80 = i;
            }
        });
        
        const topActividades = sorted.slice(0, Math.max(punto80 + 1, 5));
        const pctCubierto = topActividades.length > 0 ? topActividades[topActividades.length - 1].pctAcumulado : 0;
        
        return `
    <div class="section">
        <h2>📊 Análisis Pareto (Principio 80/20)</h2>
        <p style="color: #666; margin-bottom: 15px;">
            Las <strong style="color: #ef4444;">${topActividades.length}</strong> actividades principales representan 
            <strong style="color: #ef4444;">${pctCubierto.toFixed(1)}%</strong> del tiempo total.
            Enfocarse en estas actividades maximiza el impacto de las mejoras.
        </p>
        <table>
            <tr>
                <th>#</th>
                <th>Actividad</th>
                <th>Tipo</th>
                <th>Tiempo</th>
                <th>%</th>
                <th>% Acumulado</th>
                <th>Gráfico</th>
            </tr>
            ${topActividades.map((a, i) => `
            <tr ${a.pctAcumulado <= 80 ? 'style="background: #fef3c7;"' : ''}>
                <td>${i + 1}</td>
                <td>${a.nombre}</td>
                <td>${a.tipo === 'INT' ? '🟠 INT' : a.tipo === 'EXT' ? '🟢 EXT' : '🔴 NVA'}</td>
                <td>${Utils.formatDuration(a.tiempoTotal)}</td>
                <td>${a.pct.toFixed(1)}%</td>
                <td style="font-weight: bold; ${a.pctAcumulado <= 80 ? 'color: #ef4444;' : ''}">${a.pctAcumulado.toFixed(1)}%</td>
                <td><div style="background: ${a.pctAcumulado <= 80 ? '#ef4444' : '#3b82f6'}; height:16px; width:${a.pct}%;"></div></td>
            </tr>`).join('')}
        </table>
        <div class="recomendacion" style="margin-top: 15px;">
            <strong>💡 Recomendación Pareto:</strong> Concentrar los esfuerzos de mejora en las 
            ${topActividades.length} actividades resaltadas en amarillo, ya que representan 
            la mayor parte del tiempo de cambio.
        </div>
    </div>`;
    }
};

// =====================================================
// SISTEMA DE GUARDADO DE CONFIGURACIONES DE EXPORTACIÓN
// =====================================================

const SavedExportConfigs = {
    // Clave de localStorage
    STORAGE_KEY: 'smed_saved_export_configs',
    
    // Obtener todas las configuraciones guardadas
    getAll: () => {
        try {
            const saved = localStorage.getItem(SavedExportConfigs.STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error cargando configuraciones guardadas:', e);
            return [];
        }
    },
    
    // Guardar nueva configuración
    save: (nombre = null) => {
        const configs = SavedExportConfigs.getAll();
        
        // Leer configuración actual de UI
        Reports.readConfigFromUI();
        
        // Crear objeto de configuración con filtros actuales
        const newConfig = {
            id: Date.now(),
            nombre: nombre || `Config ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            fechaCreacion: new Date().toISOString(),
            // Configuración del informe
            reportConfig: { ...Reports.config },
            // Filtros aplicados
            filtros: { ...AppState.filtros },
            // Comparadores multidimensionales seleccionados
            multiDimAnalysis: typeof MultiDimComparator !== 'undefined' ? {
                dimension: MultiDimComparator.state.dimension,
                selected: [...MultiDimComparator.state.selected]
            } : null,
            multiDimStats: typeof StatsMultiComparator !== 'undefined' ? {
                dimension: StatsMultiComparator.state.dimension,
                selected: [...StatsMultiComparator.state.selected]
            } : null,
            // Metadata
            registrosCount: AppState.registros.length,
            descripcion: ''
        };
        
        configs.unshift(newConfig); // Agregar al inicio
        
        // Limitar a 20 configuraciones
        if (configs.length > 20) {
            configs.pop();
        }
        
        try {
            localStorage.setItem(SavedExportConfigs.STORAGE_KEY, JSON.stringify(configs));
            SavedExportConfigs.renderList('savedConfigsList');
            return newConfig;
        } catch (e) {
            console.error('Error guardando configuración:', e);
            alert('❌ Error al guardar la configuración');
            return null;
        }
    },
    
    // Guardar con nombre personalizado (prompt)
    saveWithName: () => {
        const nombre = prompt('Nombre para esta configuración:', `Análisis ${new Date().toLocaleDateString()}`);
        if (nombre) {
            const saved = SavedExportConfigs.save(nombre);
            if (saved) {
                alert('✅ Configuración guardada: ' + nombre);
            }
        }
    },
    
    // Cargar una configuración guardada
    load: (configId) => {
        const configs = SavedExportConfigs.getAll();
        const config = configs.find(c => c.id === configId);
        
        if (!config) {
            alert('❌ Configuración no encontrada');
            return;
        }
        
        // Restaurar configuración de informe
        Reports.config = { ...Reports.config, ...config.reportConfig };
        Reports.updateUI();
        
        // Restaurar filtros
        if (config.filtros) {
            Object.assign(AppState.filtros, config.filtros);
            
            // Actualizar selectores de filtros en UI
            const filterMappings = {
                'analysisFilterMaquina': config.filtros.maquina,
                'analysisFilterOP': config.filtros.op,
                'analysisFilterTurno': config.filtros.turno,
                'analysisFilterTipo': config.filtros.tipo,
                'statsFilterMaquina': config.filtros.maquina,
                'statsFilterOP': config.filtros.op,
                'statsFilterTurno': config.filtros.turno,
                'ganttFilterMaquina': config.filtros.maquina,
                'ganttFilterOP': config.filtros.op,
                'ganttFilterTurno': config.filtros.turno
            };
            
            Object.entries(filterMappings).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el && value) el.value = value;
            });
        }
        
        // Restaurar comparadores multidimensionales
        if (config.multiDimAnalysis && typeof MultiDimComparator !== 'undefined') {
            MultiDimComparator.state.dimension = config.multiDimAnalysis.dimension;
            MultiDimComparator.state.selected = config.multiDimAnalysis.selected || [];
            MultiDimComparator.renderSelector('multiDimSelector');
            MultiDimComparator.renderComparison('multiDimChart');
        }
        
        if (config.multiDimStats && typeof StatsMultiComparator !== 'undefined') {
            StatsMultiComparator.state.dimension = config.multiDimStats.dimension;
            StatsMultiComparator.state.selected = config.multiDimStats.selected || [];
            StatsMultiComparator.renderSelector('statsMultiSelector');
            StatsMultiComparator.renderComparison('statsMultiChart');
        }
        
        alert(`✅ Configuración cargada: ${config.nombre}\n\n📋 Filtros restaurados:\nMáquina: ${config.filtros.maquina || 'Todas'}\nOP: ${config.filtros.op || 'Todas'}\nTurno: ${config.filtros.turno || 'Todos'}\nPeríodo: ${config.filtros.periodo || 'Todo'}`);
    },
    
    // Eliminar una configuración
    delete: (configId) => {
        if (!confirm('¿Eliminar esta configuración guardada?')) return;
        
        let configs = SavedExportConfigs.getAll();
        configs = configs.filter(c => c.id !== configId);
        
        try {
            localStorage.setItem(SavedExportConfigs.STORAGE_KEY, JSON.stringify(configs));
            SavedExportConfigs.renderList('savedConfigsList');
            alert('✅ Configuración eliminada');
        } catch (e) {
            console.error('Error eliminando configuración:', e);
        }
    },
    
    // Exportar directamente usando una configuración guardada
    exportWithConfig: (configId) => {
        SavedExportConfigs.load(configId);
        setTimeout(() => {
            Reports.preview();
        }, 300);
    },
    
    // Renderizar lista de configuraciones guardadas
    renderList: (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const configs = SavedExportConfigs.getAll();
        
        if (configs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <p>📂 No hay configuraciones guardadas</p>
                    <p style="font-size: 0.85em;">Guarda una configuración para reutilizar los mismos filtros y opciones en futuras exportaciones.</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="max-height: 300px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                    <thead>
                        <tr style="background: #1a1a2e; position: sticky; top: 0;">
                            <th style="padding: 8px; text-align: left; color: #00ff9d;">Nombre</th>
                            <th style="padding: 8px; text-align: center; color: #888;">Fecha</th>
                            <th style="padding: 8px; text-align: center; color: #888;">Filtros</th>
                            <th style="padding: 8px; text-align: center; color: #888;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        configs.forEach((c, i) => {
            const fecha = new Date(c.fechaCreacion).toLocaleDateString();
            const filtrosResumen = [];
            if (c.filtros.maquina && c.filtros.maquina !== 'ALL') filtrosResumen.push(`🏭${c.filtros.maquina}`);
            if (c.filtros.op && c.filtros.op !== 'ALL') filtrosResumen.push(`📋${c.filtros.op.slice(-4)}`);
            if (c.filtros.turno && c.filtros.turno !== 'ALL') filtrosResumen.push(`⏰${c.filtros.turno}`);
            if (c.filtros.periodo && c.filtros.periodo !== 'all') filtrosResumen.push(`📅${c.filtros.periodo}`);
            
            // Indicadores de comparadores guardados
            const multiDimIndicators = [];
            if (c.multiDimAnalysis && c.multiDimAnalysis.selected.length > 0) {
                multiDimIndicators.push(`📊${c.multiDimAnalysis.selected.length}`);
            }
            if (c.multiDimStats && c.multiDimStats.selected.length > 0) {
                multiDimIndicators.push(`📐${c.multiDimStats.selected.length}`);
            }
            
            html += `
                <tr style="background: ${i % 2 === 0 ? '#0a0a0a' : '#121212'}; border-bottom: 1px solid #333;">
                    <td style="padding: 8px;">
                        <strong style="color: #00ff9d;">${c.nombre}</strong>
                        ${multiDimIndicators.length > 0 ? `<br><span style="font-size: 0.75em; color: #8b5cf6;">Comparadores: ${multiDimIndicators.join(' ')}</span>` : ''}
                    </td>
                    <td style="padding: 8px; text-align: center; color: #666; font-size: 0.8em;">${fecha}</td>
                    <td style="padding: 8px; text-align: center; font-size: 0.75em; color: #888;">
                        ${filtrosResumen.length > 0 ? filtrosResumen.join(' ') : 'Sin filtros'}
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <button onclick="SavedExportConfigs.load(${c.id})" class="action-btn" style="padding: 4px 8px; font-size: 0.75em; margin: 2px;">📂 Cargar</button>
                        <button onclick="SavedExportConfigs.exportWithConfig(${c.id})" class="action-btn success" style="padding: 4px 8px; font-size: 0.75em; margin: 2px;">📄 Exportar</button>
                        <button onclick="SavedExportConfigs.delete(${c.id})" class="action-btn danger" style="padding: 4px 8px; font-size: 0.75em; margin: 2px;">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    },
    
    // Exportar todas las configuraciones (backup)
    exportAll: () => {
        const configs = SavedExportConfigs.getAll();
        const blob = new Blob([JSON.stringify(configs, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `smed_export_configs_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    },
    
    // Importar configuraciones desde archivo
    importFromFile: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    const existing = SavedExportConfigs.getAll();
                    const merged = [...imported, ...existing].slice(0, 20);
                    localStorage.setItem(SavedExportConfigs.STORAGE_KEY, JSON.stringify(merged));
                    SavedExportConfigs.renderList('savedConfigsList');
                    alert(`✅ ${imported.length} configuraciones importadas`);
                }
            } catch (err) {
                alert('❌ Error al importar archivo');
            }
        };
        reader.readAsText(file);
    }
};

// Exponer globalmente
window.Reports = Reports;
window.SavedExportConfigs = SavedExportConfigs;
