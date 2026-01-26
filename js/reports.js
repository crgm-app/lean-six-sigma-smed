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
        titulo: 'Informe de Análisis SMED',
        empresa: 'Planta Corrugadora'
    },
    
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
            'incluirTablaDetalle', 'incluirSixSigma', 'incluirRecomendaciones'
        ];
        
        checkboxes.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = Reports.config[id];
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
            'incluirTablaDetalle', 'incluirSixSigma', 'incluirRecomendaciones'
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
    
    // Obtener datos filtrados actuales
    getFilteredData: () => {
        let data = [...AppState.registros];
        const filtros = AppState.filtros;
        
        // Aplicar filtros actuales
        if (filtros.maquina && filtros.maquina !== 'ALL') {
            data = data.filter(r => r.maquina === filtros.maquina);
        }
        if (filtros.op && filtros.op !== 'ALL') {
            data = data.filter(r => r.op === filtros.op);
        }
        if (filtros.turno && filtros.turno !== 'ALL') {
            data = data.filter(r => r.turno === filtros.turno);
        }
        if (filtros.categoria && filtros.categoria !== 'ALL') {
            data = data.filter(r => r.cat === filtros.categoria);
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
    }
};

// Exponer globalmente
window.Reports = Reports;
