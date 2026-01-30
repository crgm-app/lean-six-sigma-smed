/**
 * SMED Analyzer Pro - Galería de Informes Especializados
 * Sistema para visualizar informes con datos de la app
 */

const ReportsGallery = {
    // Catálogo de informes disponibles
    reports: [
        {
            id: 'pareto',
            nombre: 'Análisis Pareto',
            descripcion: 'Identifica el 20% de actividades que causan el 80% del tiempo. Top 10 con análisis de variabilidad.',
            icono: '📊',
            color: '#8b5cf6',
            path: 'informes/pareto/index.html',
            tags: ['estadística', 'six-sigma', 'priorización']
        },
        {
            id: '360',
            nombre: 'Análisis 360° Multidimensional',
            descripcion: 'Matriz de 36 escenarios: 3 Turnos × 4 Colores × 3 Tipos SMED. Estadística completa con 5 cuartiles y Six Sigma.',
            icono: '🔬',
            color: '#00d4ff',
            path: 'informes/360/index.html',
            tags: ['multidimensional', 'six-sigma', 'avanzado']
        },
        {
            id: 'cgantcolor',
            nombre: 'Gantt por Colores',
            descripcion: 'Timeline comparativo por cantidad de colores del pedido.',
            icono: '🎨',
            color: '#f59e0b',
            path: 'informes/cgantcolor/index.html',
            tags: ['gantt', 'visual', 'comparativo']
        },
        {
            id: 'cgantturnos',
            nombre: 'Gantt por Turnos',
            descripcion: 'Comparación visual del desempeño entre T1, T2 y T3.',
            icono: '⏰',
            color: '#10b981',
            path: 'informes/cgantturnos/index.html',
            tags: ['gantt', 'turnos', 'comparativo']
        },
        {
            id: 'chartgant',
            nombre: 'Chart Gantt Completo',
            descripcion: 'Diagrama de Gantt interactivo con todas las actividades.',
            icono: '📈',
            color: '#ef4444',
            path: 'informes/chartgant/index.html',
            tags: ['gantt', 'timeline', 'completo']
        },
        {
            id: 't',
            nombre: 'Informe T',
            descripcion: 'Análisis especializado T.',
            icono: '📑',
            color: '#3b82f6',
            path: 'informes/t/index.html',
            tags: ['análisis']
        },
        {
            id: 'p',
            nombre: 'Informe P',
            descripcion: 'Análisis especializado P.',
            icono: '📄',
            color: '#ec4899',
            path: 'informes/p/index.html',
            tags: ['análisis']
        },
        {
            id: 'a',
            nombre: 'Informe A',
            descripcion: 'Análisis especializado A.',
            icono: '📋',
            color: '#14b8a6',
            path: 'informes/a/index.html',
            tags: ['análisis']
        },
        {
            id: 'b',
            nombre: 'Informe B',
            descripcion: 'Análisis especializado B.',
            icono: '📝',
            color: '#84cc16',
            path: 'informes/b/index.html',
            tags: ['análisis']
        }
    ],

    // Renderizar galería de informes
    renderGallery: () => {
        const container = document.getElementById('reportsGallery');
        if (!container) return;

        container.innerHTML = ReportsGallery.reports.map(report => `
            <div class="report-card" style="
                background: linear-gradient(135deg, ${report.color}15, ${report.color}05);
                border: 2px solid ${report.color}40;
                border-radius: 12px;
                padding: 20px;
                cursor: pointer;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 25px ${report.color}40';"
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                
                <!-- Icono grande de fondo -->
                <div style="position: absolute; top: -20px; right: -20px; font-size: 8em; opacity: 0.1;">
                    ${report.icono}
                </div>
                
                <!-- Contenido -->
                <div style="position: relative; z-index: 1;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <span style="font-size: 2.5em;">${report.icono}</span>
                        <h4 style="margin: 0; color: ${report.color}; font-size: 1.1em;">${report.nombre}</h4>
                    </div>
                    
                    <p style="color: #aaa; font-size: 0.85em; margin: 0 0 15px 0; min-height: 60px;">
                        ${report.descripcion}
                    </p>
                    
                    <!-- Tags -->
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 15px;">
                        ${report.tags.map(tag => `
                            <span style="background: ${report.color}20; color: ${report.color}; 
                                        padding: 3px 10px; border-radius: 12px; font-size: 0.7em; 
                                        border: 1px solid ${report.color}40;">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                    
                    <!-- Botones -->
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button onclick="ReportsGallery.openReport('${report.id}', 'modal'); event.stopPropagation();"
                                style="flex: 1; min-width: 100px; padding: 8px 15px; border-radius: 8px; 
                                       border: 2px solid ${report.color}; background: ${report.color}; 
                                       color: white; font-weight: bold; cursor: pointer; font-size: 0.85em;
                                       transition: all 0.2s;">
                            👁️ Ver
                        </button>
                        <button onclick="ReportsGallery.openReport('${report.id}', 'tab'); event.stopPropagation();"
                                style="flex: 1; min-width: 100px; padding: 8px 15px; border-radius: 8px; 
                                       border: 2px solid ${report.color}; background: transparent; 
                                       color: ${report.color}; font-weight: bold; cursor: pointer; font-size: 0.85em;
                                       transition: all 0.2s;">
                            🗔 Pestaña
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Abrir informe (modal o nueva pestaña)
    openReport: (reportId, mode = 'modal') => {
        const report = ReportsGallery.reports.find(r => r.id === reportId);
        if (!report) {
            alert('Informe no encontrado');
            return;
        }

        // Exportar datos actuales a CSV en memoria
        const csvData = ReportsGallery.generateCSVData();
        
        if (mode === 'modal') {
            ReportsGallery.openInModal(report, csvData);
        } else {
            ReportsGallery.openInNewTab(report, csvData);
        }
    },

    // Generar datos CSV para pasar al informe
    generateCSVData: () => {
        if (!window.AppState || AppState.registros.length === 0) {
            return null;
        }

        // Usar la misma lógica de exportación CSV
        const headers = ['ID', 'FechaExcel', 'Maquina', 'OP', 'Colores', 'Turno', 'Actividad', 'Categoria', 'Tipo', 'InicioSeg', 'FinSeg', 'DuracionSeg', 'Notas'];
        
        const rows = AppState.registros.map(r => {
            const nr = window.CSVIntegrity ? CSVIntegrity.normalizeRecord(r) : r;
            
            let finSeg = nr.finSeg;
            if (finSeg === undefined && nr.endTime) {
                const [h, m, s] = nr.endTime.split(':').map(Number);
                finSeg = (h * 3600) + (m * 60) + (s || 0);
            } else if (finSeg === undefined) {
                finSeg = 0;
            }
            
            let inicioSeg = nr.inicioSeg;
            if (inicioSeg === undefined) {
                inicioSeg = window.Utils ? Utils.round2(finSeg - (nr.duracion || 0)) : finSeg - (nr.duracion || 0);
                if (inicioSeg < 0) inicioSeg += 86400;
            }
            
            const fechaExcelInt = Math.floor(nr.fechaExcel || (window.Utils ? Utils.dateToExcel(new Date()) : 46047));
            
            return [
                nr.id,
                fechaExcelInt,
                nr.maquina || '',
                nr.op || '',
                nr.colores || 1,
                nr.turno || 'T1',
                nr.name || '',
                nr.cat || '',
                nr.tipo || 'INT',
                window.Utils ? Utils.round2(inicioSeg) : Math.round(inicioSeg * 100) / 100,
                window.Utils ? Utils.round2(finSeg) : Math.round(finSeg * 100) / 100,
                window.Utils ? Utils.round2(nr.duracion || nr.duration || 0) : Math.round((nr.duracion || nr.duration || 0) * 100) / 100,
                (nr.notas || '').replace(/[\r\n]+/g, ' ')
            ];
        });

        // Construir CSV
        let csvContent = '\ufeff'; // BOM para UTF-8
        csvContent += headers.join(',') + '\n';
        csvContent += rows.map(row => 
            row.map((cell, i) => {
                // Campos de texto entre comillas
                if ([0, 2, 3, 5, 6, 7, 8, 12].includes(i)) {
                    return `"${String(cell).replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        ).join('\n');

        return csvContent;
    },

    // Abrir en modal
    openInModal: (report, csvData) => {
        // Crear modal si no existe
        let modal = document.getElementById('reportViewerModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reportViewerModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                padding: 20px;
            `;
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: white; display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 1.5em;">${report.icono}</span>
                    ${report.nombre}
                </h3>
                <div style="display: flex; gap: 10px;">
                    <button onclick="ReportsGallery.openInNewTab(ReportsGallery.reports.find(r => r.id==='${report.id}'), \`${csvData ? csvData.replace(/`/g, '\\`') : ''}\`)"
                            style="padding: 10px 15px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                        🗔 Abrir en Pestaña
                    </button>
                    <button onclick="ReportsGallery.closeModal()"
                            style="padding: 10px 15px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1.2em; font-weight: bold;">
                        ✕
                    </button>
                </div>
            </div>
            <iframe id="reportIframe" 
                    style="flex: 1; border: 3px solid ${report.color}; border-radius: 12px; background: white; width: 100%;">
            </iframe>
        `;

        // Cargar contenido en iframe
        setTimeout(() => {
            const iframe = document.getElementById('reportIframe');
            if (iframe && csvData) {
                ReportsGallery.loadReportWithData(iframe, report.path, csvData);
            } else {
                iframe.src = report.path;
            }
        }, 100);

        modal.style.display = 'flex';
    },

    // Abrir en nueva pestaña
    openInNewTab: (report, csvData) => {
        const newWindow = window.open('', '_blank');
        
        if (!newWindow) {
            alert('Por favor, permite las ventanas emergentes para abrir el informe');
            return;
        }

        if (csvData) {
            // Cargar el HTML del informe y luego inyectar datos
            fetch(report.path)
                .then(response => response.text())
                .then(html => {
                    // Inyectar script para cargar datos automáticamente
                    const modifiedHtml = html.replace('</body>', `
                        <script>
                            // Auto-cargar datos desde la app principal
                            window.addEventListener('load', function() {
                                const csvData = \`${csvData.replace(/`/g, '\\`')}\`;
                                const blob = new Blob([csvData], { type: 'text/csv' });
                                const file = new File([blob], 'datos_app.csv', { type: 'text/csv' });
                                
                                // Simular carga de archivo
                                const fileInput = document.getElementById('csvFile');
                                if (fileInput && typeof Papa !== 'undefined') {
                                    Papa.parse(file, {
                                        header: true,
                                        dynamicTyping: true,
                                        skipEmptyLines: true,
                                        beforeFirstChunk: function(chunk) {
                                            let rows = chunk.split(/\\r\\n|\\r|\\n/);
                                            if (rows[0].startsWith("#")) rows.shift();
                                            return rows.join("\\n");
                                        },
                                        complete: function(results) {
                                            if (typeof buildDataMatrix === 'function') {
                                                buildDataMatrix(results.data);
                                            } else if (typeof rawData !== 'undefined') {
                                                rawData = results.data;
                                            }
                                            
                                            const statusEl = document.getElementById('status');
                                            if (statusEl) {
                                                statusEl.innerText = "✓ " + results.data.length + " mediciones cargadas desde SMED Analyzer Pro";
                                                statusEl.style.color = "#10b981";
                                            }
                                            
                                            // Renderizar si existe la función
                                            if (typeof render === 'function') render();
                                            if (typeof refreshUI === 'function') refreshUI();
                                        }
                                    });
                                }
                            });
                        </script>
                    </body>`);
                    
                    newWindow.document.write(modifiedHtml);
                    newWindow.document.close();
                })
                .catch(error => {
                    console.error('Error cargando informe:', error);
                    newWindow.location.href = report.path;
                });
        } else {
            newWindow.location.href = report.path;
        }
    },

    // Cargar informe con datos en iframe
    loadReportWithData: (iframe, reportPath, csvData) => {
        fetch(reportPath)
            .then(response => response.text())
            .then(html => {
                // Inyectar script para auto-cargar datos
                const modifiedHtml = html.replace('</body>', `
                    <script>
                        window.addEventListener('load', function() {
                            const csvData = \`${csvData.replace(/`/g, '\\`')}\`;
                            const blob = new Blob([csvData], { type: 'text/csv' });
                            const file = new File([blob], 'datos_app.csv', { type: 'text/csv' });
                            
                            const fileInput = document.getElementById('csvFile');
                            if (fileInput && typeof Papa !== 'undefined') {
                                Papa.parse(file, {
                                    header: true,
                                    dynamicTyping: true,
                                    skipEmptyLines: true,
                                    beforeFirstChunk: function(chunk) {
                                        let rows = chunk.split(/\\r\\n|\\r|\\n/);
                                        if (rows[0].startsWith("#")) rows.shift();
                                        return rows.join("\\n");
                                    },
                                    complete: function(results) {
                                        if (typeof buildDataMatrix === 'function') {
                                            buildDataMatrix(results.data);
                                        } else if (typeof rawData !== 'undefined') {
                                            rawData = results.data;
                                        }
                                        
                                        const statusEl = document.getElementById('status');
                                        if (statusEl) {
                                            statusEl.innerText = "✓ " + results.data.length + " mediciones desde SMED Analyzer Pro";
                                            statusEl.style.color = "#10b981";
                                        }
                                        
                                        if (typeof render === 'function') render();
                                        if (typeof refreshUI === 'function') refreshUI();
                                    }
                                });
                            }
                        });
                    </script>
                </body>`);
                
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                iframeDoc.open();
                iframeDoc.write(modifiedHtml);
                iframeDoc.close();
            })
            .catch(error => {
                console.error('Error cargando informe:', error);
                iframe.src = reportPath;
            });
    },

    // Cerrar modal
    closeModal: () => {
        const modal = document.getElementById('reportViewerModal');
        if (modal) {
            modal.style.display = 'none';
            modal.innerHTML = '';
        }
    },

    // Inicializar
    init: () => {
        // Renderizar galería cuando se carga la pestaña de informes
        const observer = new MutationObserver(() => {
            const reportsTab = document.getElementById('tab-reports');
            if (reportsTab && reportsTab.classList.contains('active')) {
                ReportsGallery.renderGallery();
            }
        });

        // Observar cambios en las clases de las pestañas
        const sections = document.querySelectorAll('.view-section');
        sections.forEach(section => {
            observer.observe(section, { attributes: true, attributeFilter: ['class'] });
        });

        // Renderizar si ya estamos en la pestaña de informes
        ReportsGallery.renderGallery();

        console.log('📊 Galería de informes inicializada');
    }
};

// Exponer globalmente
window.ReportsGallery = ReportsGallery;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(ReportsGallery.init, 500);
    });
} else {
    setTimeout(ReportsGallery.init, 500);
}
