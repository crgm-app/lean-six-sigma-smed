# 📘 SMED Analyzer Pro - Guía Completa de Desarrollo

**Versión:** 2.3  
**Fecha:** 27 de Enero de 2026  
**Autor:** Desarrollo Lean Manufacturing  
**Dominio:** https://smed.crgm.app  
**Soporte:** smed@crgm.app  

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Análisis de Códigos Fuente](#2-análisis-de-códigos-fuente)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Especificaciones Técnicas](#4-especificaciones-técnicas)
5. [Funcionalidades Detalladas](#5-funcionalidades-detalladas)
6. [Categorías SMED](#6-categorías-smed)
7. [Fórmulas Estadísticas](#7-fórmulas-estadísticas)
8. [Teoría SMED/Lean/Six Sigma](#8-teoría-smedleansix-sigma)
9. [Wireframes de Interfaz](#9-wireframes-de-interfaz)
10. [Roadmap de Implementación](#10-roadmap-de-implementación)

---

## 1. Resumen Ejecutivo

### 🎯 Objetivo del Proyecto

Desarrollar una aplicación web HTML5 autónoma que combine las mejores características de dos sistemas:

1. **Cronómetro Industrial V10** - Sistema de medición de tiempos en tiempo real
2. **Analizador SMED React** - Sistema de análisis Lean Manufacturing

### 💡 Propuesta de Valor

- Herramienta completa para análisis SMED (Single-Minute Exchange of Die)
- Cronometraje industrial profesional con múltiples actividades simultáneas
- Estadísticas avanzadas con metodología Six Sigma
- Visualizaciones: Box Plot, Curva de Gauss, Gantt, Barras, Pie
- Vistas multi-perspectiva: Financiera, Gerencial, Operacional, Estadística
- 100% offline, sin dependencias de servidor
- Exportación/Importación CSV
- ☁️ **Sincronización Google Drive** - Multi-dispositivo y trabajo en equipo
- 📄 **Generador de Informes** - Exportar PDF/HTML personalizables
- ⏰ **Sistema de Turnos** - Rotación T1/T2/T3 en ciclo de 3 semanas
- 🏭 **Gestión de Máquinas** - Lista configurable (i4-i17)
- 📱 **PWA** - Instalable como app nativa

### 🆕 Novedades Versión 2.0 (26 Enero 2026)

| Módulo | Descripción |
|--------|-------------|
| **📄 Informes** | Generador de informes configurables, exportar PDF/HTML |
| **☁️ Google Drive Sync** | Sincronización automática cada 5 min, compartir con equipo |
| **⏰ Sistema de Turnos** | Rotación T1/T2/T3 en ciclo de 3 semanas |
| **🏭 Gestión de Máquinas** | Lista configurable: i4, i5, i6, i8, i10-i17 |
| **📋 OP Activa** | Orden de Producción, Colores, Turno, Máquina |
| **⏱️ Cronómetros Libres** | Múltiples timers simultáneos con asignación posterior |
| **📥 CSV Mejorado** | Incluye Máquina, OP, Colores, Turno |

### 🆕 Novedades Versión 2.1 (26 Enero 2026 - Noche)

| Módulo | Descripción |
|--------|-------------|
| **📊 Análisis Comparativo Multi-Dimensional** | Comparar por OP, Máquina, Turno, Tipo SMED con filtros cruzados |
| **💰 Configuración Financiera** | Costo/hora, Meta eficiencia, Horas por turno, Cambios por turno (meta) |
| **📖 Interpretación Estadística Profunda** | Módulo `StatsInterpretation` con análisis explicativo detallado |
| **🔘 Botones por Defecto Expandidos** | 16 botones incluyendo "CAMBIO DE OP" (especial con ícono 🔄) |
| **🏷️ Filtros de Tipo SMED** | Filtros INT/EXT/NVA en todas las pestañas (Análisis, Gantt, Stats, Historial) |
| **📥 CSV Mejorado v2** | 15 campos: ID, Fecha, HoraFin, FechaExcel, Maquina, OP, Colores, Turno, Actividad, Categoria, Tipo, InicioSeg, FinSeg, DuracionSeg, Timestamp |
| **📋 Análisis Detallado por Categoría** | Estadísticas CV, promedio, rango, tipo dominante por cada categoría |
| **🎯 Resumen Ejecutivo Estadístico** | Nivel de desempeño, interpretación de variabilidad con fórmulas, análisis de capacidad Cp/Cpk |

### 🆕 Novedades Versión 2.2 (26 Enero 2026 - 11:30PM)

| Módulo | Descripción |
|--------|-------------|
| **📊 Gantt Comparativo Multi-Dimensional** | Vista Gantt con comparativo por OP, Máquina, Turno, Tipo - barras apiladas con distribución INT/EXT/NVA |
| **📄 Informes con Comparativas** | Exportar PDF/HTML con tablas comparativas por OP, Máquina, Turno + análisis Pareto |
| **📈 Análisis Pareto en Informes** | Identificación automática del 80/20 - actividades que causan mayor impacto |
| **🏆 Métricas de Mejor/Peor** | Identificación automática del mejor y peor performer por dimensión |
| **📧 Correo de Soporte** | soporte@crgm.app añadido en la aplicación |
| **🔄 Botones Auto desde CSV** | Al importar CSV, los botones se crean automáticamente según las actividades |

### 🆕 Novedades Versión 2.3 (27 Enero 2026)

| Módulo | Descripción |
|--------|-------------|
| **🎛️ MultiDimComparator** | Comparador interactivo multi-dimensional con selección de hasta 6 elementos, gráficos con barras degradadas INT/EXT/NVA, tabla comparativa con rankings |
| **📐 StatsMultiComparator** | Comparador estadístico multi-dimensional con Box Plots comparativos visuales, cálculo completo (media, mediana, σ, CV, Cp, Cpk) por grupo |
| **💾 SavedExportConfigs** | Sistema para guardar/cargar configuraciones de exportación incluyendo filtros y comparadores seleccionados, exportar/importar backup JSON |
| **✏️ RecordEditor** | Editor modal para registros individuales - cambiar nombre, categoría, tipo, duración, máquina, OP, turno, colores, fecha |
| **🔍 Filtros Centralizados** | Módulo `Filtros` con función `getFiltered(source)` usada por todos los módulos, filtros por período (today, week, month, year, custom) |
| **📊 Pareto Module** | Módulo independiente para análisis 80/20 con visualización de barras y resumen de "pocos vitales" |
| **📈 StatsComparative** | Comparativo estadístico por grupo con identificación de mejor/peor/más consistente |
| **🔄 Backup Automático** | Backup diario automático en LocalStorage + opción de restaurar |

---

## 2. Análisis de Códigos Fuente

### 2.1 Código 1: Cronómetro Industrial V10 (HTML Puro)

**Fortalezas identificadas:**
- ✅ Cronómetro maestro en tiempo real (segundos del día)
- ✅ Sistema de botones dinámicos personalizables
- ✅ Múltiples timers activos simultáneamente por categoría
- ✅ Box Plot (Diagrama de Vela) con SVG puro
- ✅ Curva de Distribución Normal (Gauss)
- ✅ Interfaz industrial oscura elegante
- ✅ Persistencia en LocalStorage
- ✅ Sistema de tabs (Reloj/Estadísticas/Configurar)

**Estructura de datos (código 1):**
```javascript
// Registro de actividad cerrada
{
    id: timestamp,
    name: "Nombre actividad",
    cat: "Categoría",
    duration: 45.3, // segundos
    endTime: "12:45:30"
}

// Timer activo
{
    start: timestamp,
    btnName: "Nombre botón"
}
```

### 2.2 Código 2: Analizador SMED (React)

**Fortalezas identificadas:**
- ✅ 10 categorías SMED predefinidas
- ✅ Vistas de análisis: General, Financiera, Gerencial, Operacional, Estadística
- ✅ Métricas Six Sigma (CV, capacidad de proceso)
- ✅ Cálculos de costos y ROI
- ✅ Gráficos con Recharts (Barras, Pie, Líneas)
- ✅ Formulario de registro detallado
- ✅ Tabla de registros con filtros

**Estructura de datos (código 2):**
```javascript
{
    id: timestamp,
    fecha: "2026-01-22",
    orden: "ORD-001",
    operador: "Juan Pérez",
    categoria: "Ajuste Interno",
    actividad: "Cambio de molde",
    tiempoMinutos: 15.5,
    observaciones: "Sin novedad"
}
```

### 2.3 Análisis Detallado del Código Implementado (v2.2)

A continuación se documenta la estructura y funciones principales de cada archivo JavaScript del proyecto:

#### 📁 app.js - Lógica Principal (1,200+ líneas)

**Estado Global:**
```javascript
const state = {
    registros: [],           // Historial de actividades cerradas
    activeTimers: {},        // Timers activos por categoría {catName: {start, btnName}}
    freeTimers: [],          // Cronómetros libres [{id, start, nombre}]
    buttons: [],             // Botones configurables [{name, cat}]
    maquinaActual: 'i4',     // Máquina seleccionada
    opActual: '',            // Orden de Producción activa
    coloresOP: '',           // Colores de la OP
    turnoManual: null        // Override de turno automático
};
```

**Sistema de Turnos (Ciclo 3 semanas):**
```javascript
function calcularTurnoActual() {
    // Ciclo: Semana 1 → T1, Semana 2 → T2, Semana 3 → T3
    const semanaDelAño = Math.ceil((hoy - inicioAño) / (7 * 24 * 60 * 60 * 1000));
    const posicionCiclo = semanaDelAño % 3;
    // T1: 06:00-14:00, T2: 14:00-22:00, T3: 22:00-06:00
}
```

**Máquinas Disponibles:**
```javascript
const MAQUINAS_DISPONIBLES = ['i4', 'i5', 'i6', 'i8', 'i10', 'i11', 'i12', 'i13', 'i14', 'i15', 'i16', 'i17'];
```

**Funciones Principales:**
| Función | Descripción |
|---------|-------------|
| `initApp()` | Inicializa la aplicación, carga datos de LocalStorage |
| `handleBtnClick(name, cat)` | Maneja clic en botones SMED (inicia/cierra timer) |
| `addFreeTimer()` | Agrega cronómetro libre sin categoría asignada |
| `finalizeFreeTimer(id)` | Finaliza cronómetro libre y permite asignar categoría |
| `exportCSV()` | Exporta registros a CSV con 15 campos |
| `importCSV(file)` | Importa CSV y crea botones automáticamente |
| `saveToLocalStorage()` | Persiste estado en navegador |
| `loadFromLocalStorage()` | Carga estado guardado |

**Formato CSV v2 (15 campos):**
```
ID,Fecha,HoraFin,FechaExcel,Maquina,OP,Colores,Turno,Actividad,Categoria,Tipo,InicioSeg,FinSeg,DuracionSeg,Timestamp
```

---

#### 📁 charts.js - Análisis Multi-Perspectiva (800+ líneas)

**Vistas de Análisis:**
```javascript
const VISTAS = ['general', 'financiera', 'gerencial', 'operacional', 'estadistica'];
```

**Configuración Financiera Editable:**
```javascript
const CONFIG_FINANCIERA = {
    costoHora: 150,          // Q/hora
    metaEficiencia: 85,      // %
    horasPorTurno: 8,
    cambiosPorTurno: 4       // Meta de cambios
};
```

**Funciones de Análisis Comparativo:**
| Función | Descripción |
|---------|-------------|
| `agruparPorOP(registros)` | Agrupa datos por Orden de Producción |
| `agruparPorMaquina(registros)` | Agrupa datos por máquina (i4-i17) |
| `agruparPorTurno(registros)` | Agrupa datos por turno (T1/T2/T3) |
| `agruparPorTipoSMED(registros)` | Agrupa por tipo (INT/EXT/NVA) |
| `calcularMetricasGrupo(grupo)` | Calcula métricas para un grupo |
| `identificarMejorPeor(grupos)` | Identifica mejor y peor performer |

**Gráficos SVG:**
```javascript
function renderBarChart(containerId, data) { /* SVG barras horizontales */ }
function renderPieChart(containerId, data) { /* SVG gráfico circular */ }
function renderBoxPlot(containerId, data) { /* SVG diagrama de caja */ }
function renderGaussianCurve(containerId, data) { /* SVG curva normal */ }
```

---

#### 📁 statistics.js - Estadísticas Six Sigma (600+ líneas)

**Módulo de Interpretación Estadística:**
```javascript
const StatsInterpretation = {
    interpretarCV(cv) {
        // CV < 10%: Muy consistente
        // CV 10-20%: Consistente
        // CV 20-30%: Moderada variabilidad
        // CV > 30%: Alta variabilidad
    },
    interpretarCp(cp) {
        // Cp > 1.67: Excelente
        // Cp 1.33-1.67: Bueno
        // Cp 1.0-1.33: Marginal
        // Cp < 1.0: Inadecuado
    },
    interpretarCpk(cpk) { /* Similar a Cp */ },
    generarResumenEjecutivo(stats) { /* Análisis completo */ }
};
```

**Fórmulas Implementadas:**
```javascript
function calcularEstadisticas(datos) {
    const n = datos.length;
    const media = datos.reduce((a, b) => a + b, 0) / n;
    const varianza = datos.reduce((sum, x) => sum + Math.pow(x - media, 2), 0) / n;
    const desviacion = Math.sqrt(varianza);
    const cv = (desviacion / media) * 100;
    
    // Six Sigma
    const USL = media + (3 * desviacion); // Límite superior
    const LSL = media - (3 * desviacion); // Límite inferior
    const Cp = (USL - LSL) / (6 * desviacion);
    const Cpk = Math.min((USL - media) / (3 * desviacion), (media - LSL) / (3 * desviacion));
    
    return { media, desviacion, cv, Cp, Cpk, min, max, rango, q1, q2, q3 };
}
```

**Análisis por Categoría:**
```javascript
function analizarPorCategoria(registros) {
    // Agrupa por categoría
    // Calcula stats por cada una
    // Identifica tipo dominante (INT/EXT/NVA)
    // Genera interpretación
}
```

---

#### 📁 gantt.js - Diagrama de Gantt Comparativo (500+ líneas)

**Vistas Comparativas del Gantt:**
```javascript
const GANTT_VIEWS = {
    timeline: 'Vista timeline tradicional',
    byOP: 'Comparativo por Orden de Producción',
    byMaquina: 'Comparativo por Máquina',
    byTurno: 'Comparativo por Turno',
    byTipo: 'Comparativo por Tipo SMED'
};
```

**Funciones de Renderizado:**
| Función | Descripción |
|---------|-------------|
| `renderGantt(registros)` | Vista timeline tradicional |
| `renderByOP(registros)` | Barras apiladas por OP |
| `renderByMaquina(registros)` | Barras apiladas por máquina |
| `renderByTurno(registros)` | Barras apiladas por turno |
| `renderByTipo(registros)` | Distribución INT/EXT/NVA |

**Estructura de Barra Apilada:**
```javascript
function renderStackedBar(grupo, tiempoTotal) {
    // Calcula proporciones INT/EXT/NVA
    // Renderiza 3 segmentos de color:
    // - Verde (#10b981): Externo
    // - Naranja (#f97316): Interno  
    // - Rojo (#ef4444): NVA
}
```

---

#### 📁 reports.js - Generador de Informes (400+ líneas)

**Tipos de Informe:**
```javascript
const REPORT_TYPES = {
    resumen: 'Resumen Ejecutivo',
    detallado: 'Análisis Detallado',
    comparativo: 'Comparativo Multi-Dimensional',
    pareto: 'Análisis Pareto 80/20'
};
```

**Funciones de Generación:**
| Función | Descripción |
|---------|-------------|
| `generarInformeHTML(registros, tipo)` | Genera HTML completo |
| `generarInformePDF(registros, tipo)` | Genera PDF (usando html2pdf) |
| `generarTablaComparativa(dimension)` | Tabla comparativa automática |
| `generarAnalisisPareto(registros)` | Identifica 80/20 de impacto |

**Análisis Pareto:**
```javascript
function generarAnalisisPareto(registros) {
    // 1. Ordena actividades por tiempo total (descendente)
    // 2. Calcula porcentaje acumulado
    // 3. Identifica actividades que causan 80% del tiempo
    // 4. Genera recomendaciones de priorización
}
```

**Estructura del Informe Comparativo:**
```javascript
{
    encabezado: { titulo, fecha, periodo, maquina, turno },
    metricas: { tiempoTotal, eficiencia, costoMudas },
    comparativas: {
        porOP: [...],
        porMaquina: [...],
        porTurno: [...]
    },
    pareto: { topActividades: [...], porcentajeAcumulado: 80 },
    recomendaciones: [...]
}
```

---

### 2.4 Módulos Nuevos v2.3 - Documentación Detallada

#### 📁 MultiDimComparator (charts.js) - Comparador Interactivo Multi-Dimensional

```javascript
const MultiDimComparator = {
    // Estado del comparador
    state: {
        dimension: 'maquina', // maquina, op, turno
        selected: [],         // Elementos seleccionados (máx 6)
        baseFilters: {},      // Filtros base aplicados
        chartType: 'bar'      // bar, line, radar
    }
};
```

**Funciones Principales:**
| Función | Descripción |
|---------|-------------|
| `getAvailableItems(dimension)` | Obtiene elementos disponibles para una dimensión |
| `toggleItem(item)` | Agrega/quita elemento de la selección (máx 6) |
| `setDimension(dimension)` | Cambia la dimensión activa (maquina/op/turno) |
| `selectAll()` | Selecciona los primeros 6 elementos |
| `clearSelection()` | Limpia la selección actual |
| `renderSelector(containerId)` | Renderiza UI de selección con chips |
| `renderComparison(containerId)` | Renderiza gráficos y tabla comparativa |
| `getExportData()` | Obtiene datos para exportación |

**Métricas Calculadas por Elemento:**
- Tiempo total, Tiempo INT, Tiempo EXT, Tiempo NVA
- Promedio, Eficiencia, CV%
- Ratio INT/EXT, Rankings (Mejor Eficiencia, Más Rápido, Más Consistente)

---

#### 📁 StatsMultiComparator (statistics.js) - Comparador Estadístico con Box Plots

```javascript
const StatsMultiComparator = {
    state: {
        dimension: 'maquina',
        selected: [],
        showBoxPlot: true,
        showDistribution: true
    }
};
```

**Funciones Principales:**
| Función | Descripción |
|---------|-------------|
| `getAvailableItems(dimension)` | Obtiene elementos con mínimo 2 registros |
| `calcularStats(tiempos, nombre)` | Calcula estadísticas completas para un grupo |
| `renderSelector(containerId)` | Renderiza selector de elementos |
| `renderComparison(containerId)` | Renderiza Box Plots comparativos + tabla |
| `getExportData()` | Obtiene datos estadísticos para exportación |

**Estadísticas Calculadas:**
```javascript
{
    nombre, n, min, max, range,
    q1, median, q3, iqr,
    mean, stdDev, cv,
    cp, cpk, tiempos[]
}
```

**Visualización Box Plot Comparativo:**
- Escala global compartida para todos los elementos
- Colores distintos por elemento
- Whiskers, cajas Q1-Q3, línea de mediana
- Rankings: Más Rápido, Más Consistente, Mejor Capacidad

---

#### 📁 SavedExportConfigs (reports.js) - Sistema de Configuraciones Guardadas

```javascript
const SavedExportConfigs = {
    STORAGE_KEY: 'smed_saved_export_configs'
};
```

**Estructura de Configuración Guardada:**
```javascript
{
    id: timestamp,
    nombre: 'Config 27/01/2026 10:30:00',
    fechaCreacion: ISO_string,
    reportConfig: { ...Reports.config },
    filtros: { ...AppState.filtros },
    multiDimAnalysis: { dimension, selected[] },
    multiDimStats: { dimension, selected[] },
    registrosCount: number,
    descripcion: ''
}
```

**Funciones Principales:**
| Función | Descripción |
|---------|-------------|
| `getAll()` | Obtiene todas las configuraciones guardadas |
| `save(nombre)` | Guarda configuración actual con filtros y comparadores |
| `saveWithName()` | Muestra prompt para nombrar la configuración |
| `load(configId)` | Carga una configuración guardada |
| `delete(configId)` | Elimina una configuración |
| `exportWithConfig(configId)` | Carga y exporta directamente |
| `renderList(containerId)` | Renderiza lista de configs guardadas |
| `exportAll()` | Exporta backup de todas las configs (JSON) |
| `importFromFile(file)` | Importa configs desde archivo JSON |

---

#### 📁 RecordEditor (app.js) - Editor de Registros Individuales

**Funciones:**
| Función | Descripción |
|---------|-------------|
| `RecordEditor.open(id)` | Abre modal para editar un registro |
| `RecordEditor.close()` | Cierra el modal |
| `RecordEditor.save()` | Guarda los cambios del registro |

**Campos Editables:**
- Nombre de actividad
- Categoría
- Tipo SMED (INT/EXT/NVA)
- Duración (segundos)
- Máquina
- OP (Orden de Producción)
- Turno (T1/T2/T3)
- Colores (1-8)
- Fecha

---

#### 📁 Filtros (app.js) - Sistema de Filtrado Centralizado

```javascript
const Filtros = {
    getFiltered: (source = 'history') => {
        // Aplica todos los filtros activos
        // source: 'history', 'gantt', 'stats', 'analysis'
    },
    updateAllFilters: () => { /* Actualiza selectores dinámicos */ },
    updateOPFilter: (selectId) => { /* Actualiza filtro de OP */ },
    updateCategoryFilter: (selectId) => { /* Actualiza filtro de categoría */ },
    setPeriodo: (periodo) => { /* Aplica filtro de período */ },
    setCustomRange: (desde, hasta) => { /* Aplica rango personalizado */ }
};
```

**Períodos Disponibles:**
- `today` - Solo registros de hoy
- `week` - Semana actual
- `month` - Mes actual
- `year` - Año actual
- `all` - Todos los registros
- `custom` - Rango personalizado (fechaDesde, fechaHasta)

---

#### 📁 Pareto (statistics.js) - Análisis 80/20

```javascript
const Pareto = {
    calculate: (groupBy = 'cat') => {
        // Agrupa y ordena por tiempo descendente
        // Calcula porcentaje acumulado
        // Identifica punto 80%
    },
    getResumen: (data) => { /* Genera interpretación */ },
    render: (containerId, groupBy) => { /* Renderiza tabla + barras */ }
};
```

**Estructura de Resultado:**
```javascript
{
    items: [{
        name, tiempo, count,
        porcentaje, acumulado,
        esVital: boolean // <= 80%
    }],
    total: number
}
```

---

#### 📁 StatsComparative (statistics.js) - Comparativo por Grupo

```javascript
const StatsComparative = {
    calculateByGroup: (groupBy = 'op') => {
        // Agrupa registros por dimensión
        // Calcula estadísticas por cada grupo
        // Ordena por promedio
    },
    render: (containerId, groupBy) => {
        // Renderiza tabla comparativa
        // Identifica mejor, peor, más consistente
    }
};
```

---

## 3. Arquitectura del Sistema

### 3.1 Estructura de Carpetas

```
SMED_Analyzer_Pro/
├── index.html                      # Página principal (7 tabs)
├── manifest.json                   # PWA manifest
├── sw.js                          # Service Worker para offline
├── css/
│   └── styles.css                  # Estilos CSS (tema oscuro industrial)
├── js/
│   ├── app.js                      # Lógica principal, cronómetro, turnos, máquinas
│   ├── charts.js                   # Análisis multi-perspectiva y gráficos SVG
│   ├── statistics.js               # Estadísticas avanzadas y Six Sigma
│   ├── gantt.js                    # Diagrama de Gantt interactivo
│   ├── reports.js                  # 📄 Generador de informes PDF/HTML
│   └── googleDrive.js              # ☁️ Sincronización con Google Drive
├── icons/
│   └── icon.svg                    # Icono de la app
└── docs/
    ├── GUIA_COMPLETA.md            # Este documento
    └── BUSINESS_MODEL_CANVAS.md    # Plan de negocio
```

### 📝 Nota Importante
Este proyecto es una **aplicación web frontend pura** (HTML/CSS/JavaScript) que funciona 100% en el navegador sin necesidad de:
- ❌ Backend (Python, Node.js, etc.)
- ❌ Base de datos (PostgreSQL, MongoDB, etc.)
- ❌ Docker / Contenedores
- ❌ requirements.txt / Dockerfile

La persistencia de datos se maneja con **LocalStorage** del navegador.

### 3.2 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     SMED Analyzer Pro                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  RELOJ   │  │ ANÁLISIS │  │  GANTT   │  │  CONFIG  │   │
│  │   TAB    │  │   TAB    │  │   TAB    │  │   TAB    │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│  ┌────▼─────────────▼─────────────▼─────────────▼────┐    │
│  │              ESTADO CENTRAL (state)               │    │
│  │  - registros[]  - activeTimers{}  - buttons[]    │    │
│  │  - filtros      - configuración                  │    │
│  └───────────────────┬───────────────────────────────┘    │
│                      │                                     │
│  ┌───────────────────▼───────────────────────────────┐    │
│  │              CAPA DE PERSISTENCIA                 │    │
│  │         LocalStorage + CSV Import/Export          │    │
│  └───────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Flujo de Datos

```
Usuario Click Botón
        │
        ▼
┌───────────────┐
│ handleBtnClick│
└───────┬───────┘
        │
        ▼
┌───────────────────────────────┐
│ ¿Hay timer activo en esta    │
│ categoría?                    │
└───────────────┬───────────────┘
        │
    ┌───┴───┐
    │       │
   SÍ      NO
    │       │
    ▼       ▼
┌────────┐ ┌────────┐
│Cerrar  │ │Iniciar │
│anterior│ │nuevo   │
│timer   │ │timer   │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────────────────┐
│ Guardar en         │
│ LocalStorage       │
└────────────────────┘
```

---

## 4. Especificaciones Técnicas

### 4.1 Tecnologías Utilizadas

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Estructura | HTML5 | - |
| Estilos | CSS3 + Variables CSS | - |
| Lógica | JavaScript ES6+ | - |
| Gráficos | SVG + Canvas API | - |
| Persistencia | LocalStorage | - |
| Iconos | Unicode/Emoji | - |

### 4.2 Compatibilidad de Navegadores

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Edge 90+
- ✅ Safari 14+
- ⚠️ IE11 (no soportado)

### 4.3 Paleta de Colores

```css
:root {
    /* Fondo */
    --bg-primary: #0a0a0a;
    --bg-secondary: #141414;
    --bg-card: #1a1a1a;
    
    /* Texto */
    --text-primary: #e0e0e0;
    --text-muted: #666666;
    
    /* Acentos */
    --accent-primary: #00ff9d;    /* Verde SMED */
    --accent-secondary: #00d4ff;  /* Cyan tiempo */
    --accent-warning: #ffaa00;    /* Naranja activo */
    --accent-danger: #ff4444;     /* Rojo eliminar */
    
    /* Categorías */
    --cat-preparacion: #3b82f6;
    --cat-ajuste-int: #f97316;
    --cat-ajuste-ext: #10b981;
    --cat-verificacion: #8b5cf6;
    --cat-limpieza: #14b8a6;
    --cat-muda: #ef4444;
    --cat-espera: #f59e0b;
    --cat-transporte: #ec4899;
    --cat-movimiento: #06b6d4;
    --cat-defectos: #dc2626;
}
```

---

## 5. Funcionalidades Detalladas

### 5.1 Tab RELOJ (Cronómetro)

| Función | Descripción |
|---------|-------------|
| Reloj Maestro | Muestra segundos del día (00000.0 - 86399.9) y hora HH:MM:SS |
| Panel Timers Activos | Lista de actividades en curso con tiempo transcurrido |
| Botones Dinámicos | Grid de botones SMED configurables |
| Detener Todo | Cierra todos los timers activos |
| Historial | Lista de actividades cerradas con opción de eliminar |

### 5.2 Tab ANÁLISIS

| Vista | Métricas |
|-------|----------|
| **General** | Tiempo total, Mudas, Eficiencia |
| **Financiera** | Costo de mudas (Q), Ahorros potenciales, ROI |
| **Gerencial** | Eficiencia vs Meta, Brecha, KPIs |
| **Operacional** | Ratio Interno/Externo, tiempos por categoría |
| **Estadística** | Media, σ, CV, Min, Max, Rango, Six Sigma |

### 5.3 Tab GANTT

| Función | Descripción |
|---------|-------------|
| Vista Timeline | Barras horizontales por actividad |
| Zoom | Control de escala temporal |
| Filtro Categoría | Mostrar solo una categoría |
| Código de Colores | Por tipo de actividad |
| Tooltip | Información detallada al hover |

### 5.4 Tab CONFIGURACIÓN

| Función | Descripción |
|---------|-------------|
| Crear Botón | Nombre + Categoría |
| Eliminar Botón | Quitar del grid |
| Restaurar Fábrica | Volver a botones predeterminados |
| Teoría SMED | Sección educativa colapsable |
| Exportar/Importar | CSV con todos los datos |

---

## 6. Categorías SMED

### 6.1 Definición de Categorías

| # | Categoría | Código | Color | Tipo | Descripción |
|---|-----------|--------|-------|------|-------------|
| 1 | Preparación | PREP | 🔵 #3b82f6 | VA | Actividades de preparación antes del cambio |
| 2 | Ajuste Interno | AINT | 🟠 #f97316 | INT | Ajustes con máquina parada |
| 3 | Ajuste Externo | AEXT | 🟢 #10b981 | EXT | Ajustes con máquina en marcha |
| 4 | Verificación | VERI | 🟣 #8b5cf6 | VA | Pruebas y verificaciones de calidad |
| 5 | Limpieza | LIMP | 🔵 #14b8a6 | SOP | Limpieza de equipos y área |
| 6 | Muda (Desperdicio) | MUDA | 🔴 #ef4444 | NVA | Actividades sin valor agregado |
| 7 | Espera | ESPE | 🟡 #f59e0b | NVA | Tiempos muertos esperando |
| 8 | Transporte | TRAN | 🟠 #ec4899 | NVA | Movimiento de materiales |
| 9 | Movimiento | MOVI | 🔵 #06b6d4 | NVA | Desplazamientos innecesarios |
| 10 | Defectos | DEFE | 🔴 #dc2626 | NVA | Retrabajos por defectos |

### 6.2 Clasificación por Tipo

```
VA  = Valor Agregado (cliente paga)
NVA = No Valor Agregado (desperdicio)
INT = Actividad Interna (máquina parada)
EXT = Actividad Externa (máquina en marcha)
SOP = Soporte (necesario pero no agrega valor)
```

---

## 7. Fórmulas Estadísticas

### 7.1 Estadísticas Básicas

```
Media (μ) = Σxi / n

Varianza (σ²) = Σ(xi - μ)² / n

Desviación Estándar (σ) = √σ²

Coeficiente de Variación (CV) = (σ / μ) × 100%

Rango = Max - Min
```

### 7.2 Cuartiles (Box Plot)

```
Q1 (25%) = valor en posición n × 0.25
Q2 (50%) = Mediana = valor en posición n × 0.50
Q3 (75%) = valor en posición n × 0.75

IQR (Rango Intercuartílico) = Q3 - Q1

Límite inferior whisker = Q1 - 1.5 × IQR
Límite superior whisker = Q3 + 1.5 × IQR
```

### 7.3 Six Sigma

```
Nivel Sigma = (USL - μ) / σ

Cp = (USL - LSL) / (6 × σ)

Cpk = min[(USL - μ) / (3σ), (μ - LSL) / (3σ)]

DPMO = Defectos por millón de oportunidades
```

### 7.4 Indicadores SMED

```
Eficiencia = (Tiempo VA / Tiempo Total) × 100%

Ratio Interno/Externo = Tiempo Ajuste Interno / Tiempo Ajuste Externo

Costo Muda = (Tiempo Muda / 60) × Costo Hora

ROI = (Ahorros - Inversión) / Inversión × 100%
```

---

## 8. Teoría SMED/Lean/Six Sigma

### 8.1 ¿Qué es SMED?

**SMED** (Single-Minute Exchange of Die) es una metodología desarrollada por **Shigeo Shingo** para Toyota que busca reducir los tiempos de cambio de formato a menos de 10 minutos (single digit).

### 8.2 Las 4 Etapas SMED

```
┌─────────────────────────────────────────────────────────┐
│ ETAPA 0: Estado Inicial                                 │
│ - Observar y documentar el proceso actual              │
│ - No hay distinción entre actividades                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ ETAPA 1: Separar Interno de Externo                    │
│ - Identificar qué se hace con máquina PARADA           │
│ - Identificar qué se puede hacer con máquina ANDANDO   │
│ - Reducción típica: 30-50%                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ ETAPA 2: Convertir Interno a Externo                   │
│ - Preparar todo ANTES de parar la máquina              │
│ - Pre-calentar moldes, pre-ajustar herramientas       │
│ - Reducción adicional: 25-50%                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ ETAPA 3: Optimizar todas las operaciones               │
│ - Usar fijaciones rápidas (quick clamps)               │
│ - Eliminar ajustes (poka-yoke)                         │
│ - Operaciones paralelas                                │
│ - Reducción adicional: 25-50%                          │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Los 8 Desperdicios (MUDA)

| # | Desperdicio | Inglés | Descripción | Ejemplo SMED |
|---|-------------|--------|-------------|--------------|
| 1 | Sobreproducción | Overproduction | Producir más de lo necesario | Preparar piezas extra |
| 2 | Espera | Waiting | Tiempos muertos | Esperar herramientas |
| 3 | Transporte | Transportation | Mover materiales | Buscar moldes lejos |
| 4 | Sobreprocesamiento | Over-processing | Trabajo innecesario | Ajustes repetitivos |
| 5 | Inventario | Inventory | Stock excesivo | Moldes sin usar |
| 6 | Movimiento | Motion | Desplazamientos | Caminar buscando |
| 7 | Defectos | Defects | Errores y retrabajos | Piezas de prueba malas |
| 8 | Talento no utilizado | Non-utilized talent | No usar ideas del equipo | Ignorar sugerencias |

### 8.4 DMAIC de Six Sigma

```
┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐    ┌───────┐
│   D   │───▶│   M   │───▶│   A   │───▶│   I   │───▶│   C   │
│Define │    │Measure│    │Analyze│    │Improve│    │Control│
└───────┘    └───────┘    └───────┘    └───────┘    └───────┘
     │            │            │            │            │
     ▼            ▼            ▼            ▼            ▼
 Definir      Medir el    Analizar    Implementar  Controlar
 problema     proceso      causas     mejoras      resultados
```

### 8.5 Niveles de Certificación Six Sigma

| Belt | Color | Rol | Conocimiento |
|------|-------|-----|--------------|
| White Belt | ⚪ | Equipo | Conceptos básicos |
| Yellow Belt | 🟡 | Participante | Herramientas básicas |
| Green Belt | 🟢 | Líder proyecto | Metodología completa |
| Black Belt | ⚫ | Experto | Estadística avanzada |
| Master Black Belt | ⚫⚫ | Mentor | Estrategia organizacional |

---

## 9. Wireframes de Interfaz

### 9.1 Pantalla Principal

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏭 SMED Analyzer Pro - Cronómetro Industrial Lean Manufacturing │
│ ════════════════════════════════════════════════════════════════│
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  RELOJ  │ │ ANÁLISIS│ │  GANTT  │ │  STATS  │ │ CONFIG  │   │
│  │  ████   │ │         │ │         │ │         │ │         │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                   45678.3                                 │ │
│  │                   12:41:18                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ ⏱ ACTIVIDAD EN CURSO:                                     │ │
│  │ ├─ [Ajuste Interno] Cambio de molde ─────────── 45.2s    │ │
│  │ └─ [Verificación] Revisión de medidas ─────────  12.8s   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Preparación│ │Aj.Interno│ │Aj.Externo│ │Verificac.│          │
│  │   🔵     │ │   🟠 ▶   │ │   🟢     │ │   🟣 ▶   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Limpieza │ │  Muda    │ │  Espera  │ │Transporte│          │
│  │   🔵     │ │   🔴     │ │   🟡     │ │   🟠     │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
│  [⏹ DETENER TODO] [📥 Exportar] [📤 Importar] [🗑️ Reset]       │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  HISTORIAL DE ACTIVIDADES                                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Preparación    │ Revisar planos        │ 15.3s │ 12:40:05│ │
│  │ Aj. Interno    │ Cambio fixture        │ 45.1s │ 12:39:20│ │
│  │ Muda           │ Espera herramienta    │  8.7s │ 12:38:35│ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Tab Análisis

```
┌─────────────────────────────────────────────────────────────────┐
│  Vista: [▼ General    ]  Filtro: [▼ Todas categorías ]         │
│                                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ ⏱ Total    │ │ ⚠️ Mudas    │ │ 📈 Eficiencia│               │
│  │   245 min  │ │   32 min    │ │    87%      │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                 │
│  ┌─────────────────────────┐ ┌─────────────────────────┐       │
│  │   Distribución Barras   │ │     Proporción Pie      │       │
│  │                         │ │                         │       │
│  │  Prep   ████████  45m   │ │        ╭─────╮          │       │
│  │  AjInt  ██████    32m   │ │      ╱   ░░   ╲         │       │
│  │  AjExt  ████      28m   │ │     │  ██  ░░  │        │       │
│  │  Verif  ███       22m   │ │      ╲   ██   ╱         │       │
│  │  Muda   ██        18m   │ │        ╰─────╯          │       │
│  │                         │ │                         │       │
│  └─────────────────────────┘ └─────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Tab Gantt

```
┌─────────────────────────────────────────────────────────────────┐
│  Diagrama de Gantt - Timeline de Actividades                    │
│  Zoom: [−] [100%] [+]    Filtro: [▼ Todas ]                    │
│                                                                 │
│  Tiempo →  0s    30s    60s    90s    120s   150s   180s      │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Preparación   ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                 │
│  Aj. Interno   ░░░░░░░░████████████░░░░░░░░░░░░░░░░░░░░░░░░░   │
│                                                                 │
│  Verificación  ░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░   │
│                                                                 │
│  Espera        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░██░░░░░░░░░░░░░░░   │
│                                                                 │
│  Aj. Externo   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Total: 180s | VA: 145s (80.5%) | NVA: 35s (19.5%)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Roadmap de Implementación

### 10.1 Fase 1: Estructura Base (Día 1)

- [x] Crear estructura de carpetas
- [x] Definir arquitectura
- [x] Documentar guía completa
- [ ] Crear CSS base (styles.css)
- [ ] Crear HTML estructura (index.html)

### 10.2 Fase 2: Core Functionality (Día 1-2)

- [ ] Implementar cronómetro maestro
- [ ] Sistema de botones dinámicos
- [ ] Timers múltiples activos
- [ ] Historial de actividades
- [ ] Persistencia LocalStorage

### 10.3 Fase 3: Análisis (Día 2)

- [ ] Vista General con KPIs
- [ ] Vista Financiera
- [ ] Vista Gerencial
- [ ] Vista Operacional
- [ ] Vista Estadística

### 10.4 Fase 4: Visualizaciones (Día 3)

- [ ] Gráfico de Barras (SVG)
- [ ] Gráfico Pie (SVG)
- [ ] Box Plot (SVG)
- [ ] Curva de Gauss (SVG)
- [ ] Diagrama de Gantt (Canvas)

### 10.5 Fase 5: Finalización (Día 3)

- [ ] Import/Export CSV
- [ ] Configuración de botones
- [ ] Sección teoría SMED
- [ ] Testing completo
- [ ] Optimización de rendimiento

---

## Anexo A: Checklist de Desarrollo

```
[x] index.html creado
[x] styles.css creado
[x] app.js creado
[x] charts.js creado
[x] statistics.js creado
[x] gantt.js creado
[x] reports.js creado (v2.0)
[x] googleDrive.js creado (v2.0)
[x] Cronómetro funcional
[x] Botones SMED implementados
[x] Timers múltiples funcionando
[x] LocalStorage operativo
[x] Export CSV funcional
[x] Import CSV funcional
[x] Box Plot renderizado
[x] Curva Gauss renderizada
[x] Gráfico Barras renderizado
[x] Gráfico Pie renderizado
[x] Diagrama Gantt renderizado
[x] Vista General completa
[x] Vista Financiera completa
[x] Vista Gerencial completa
[x] Vista Operacional completa
[x] Vista Estadística completa
[x] Sección Teoría incluida
[x] Responsive design verificado

=== VERSIÓN 2.0 (26 Enero 2026) ===
[x] Sistema de Turnos (T1/T2/T3 ciclo 3 semanas)
[x] Gestión de Máquinas (i4-i17 configurable)
[x] OP Activa (Número, Colores, Turno, Máquina)
[x] Cronómetros Libres múltiples
[x] CSV mejorado con campos nuevos
[x] Módulo de Informes (PDF/HTML)
[x] Google Drive Sync
[x] Trabajo en equipo (compartir datos)
[x] PWA (manifest.json, sw.js)
[x] Backup automático en Drive (cada 5 min)

=== VERSIÓN 2.1 (26 Enero 2026 - Noche) ===
[x] Análisis Comparativo Multi-Dimensional (OP, Máquina, Turno, Tipo)
[x] Filtros cruzados en comparativas
[x] Configuración Financiera editable (Costo/hora, Meta eficiencia, etc.)
[x] Interpretación Estadística Profunda (StatsInterpretation)
[x] Botones por defecto expandidos (16 botones)
[x] Botón especial "CAMBIO DE OP" con ícono 🔄
[x] Filtros de Tipo SMED (INT/EXT/NVA) en todas las pestañas
[x] CSV mejorado v2 con 15 campos completos
[x] Análisis Detallado por Categoría (CV, promedio, rango)
[x] Resumen ejecutivo en estadísticas
[x] Métricas de mejor eficiencia y más consistente por grupo
[ ] Cross-browser testing (pendiente usuario)

=== VERSIÓN 2.2 (26 Enero 2026 - 11:30PM) ===
[x] Gantt Comparativo Multi-Dimensional (renderByOP, renderByMaquina, renderByTurno, renderByTipo)
[x] Vista Gantt con barras apiladas INT/EXT/NVA
[x] Informes con Comparativas por OP, Máquina, Turno
[x] Análisis Pareto (80/20) en informes exportados
[x] Funciones auxiliares: agruparPorDimension, generarTablaComparativa, generarAnalisisPareto
[x] Identificación de mejor/peor performer por dimensión
[x] Botones en UI para vistas comparativas del Gantt
[x] Documentación actualizada con novedades v2.2

=== VERSIÓN 2.3 (27 Enero 2026) ===
[x] MultiDimComparator - Comparador interactivo multi-dimensional (charts.js)
[x] StatsMultiComparator - Comparador estadístico con Box Plots comparativos (statistics.js)
[x] SavedExportConfigs - Sistema guardar/cargar configuraciones de exportación (reports.js)
[x] RecordEditor - Editor modal de registros individuales (app.js)
[x] Módulo Filtros centralizado con getFiltered(source) (app.js)
[x] Filtros por período (today, week, month, year, all, custom)
[x] Módulo Pareto independiente para análisis 80/20 (statistics.js)
[x] StatsComparative - Comparativo estadístico por grupo (statistics.js)
[x] Backup automático diario en LocalStorage
[x] Restaurar backup desde configuración
[x] Exportar/Importar configuraciones guardadas (JSON)
[x] Documentación completa de módulos v2.3
```

## Anexo B: Cómo Abrir la Aplicación

### Opción 1: Doble clic
Simplemente haz doble clic en `index.html` desde el explorador de archivos.

### Opción 2: Desde terminal
```bash
# Si tienes Firefox instalado
firefox /home/crgm-unix/Desktop/SMED_Analyzer_Pro/index.html

# Si tienes Chrome/Chromium instalado
google-chrome /home/crgm-unix/Desktop/SMED_Analyzer_Pro/index.html
chromium /home/crgm-unix/Desktop/SMED_Analyzer_Pro/index.html

# Si tienes xdg-utils instalado
xdg-open /home/crgm-unix/Desktop/SMED_Analyzer_Pro/index.html
```

### Opción 3: Desde VS Code
1. Abre el archivo `index.html` en VS Code
2. Haz clic derecho → "Open with Live Server" (si tienes la extensión)
3. O usa la extensión "Open in Browser"

---

**Documento generado automáticamente para SMED Analyzer Pro**  
**Metodología: Lean Manufacturing + Six Sigma**  
**© 2026 - Desarrollo Industrial**
