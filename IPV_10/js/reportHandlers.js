// js/reportHandlers.js

import StateManager from './state.js';
import * as UI from './ui.js';
import { getAllHistoricalData, getFilteredHistoricalData } from './utils.js';
import { showAlert } from './customModals.js';
import { APP_VERSION } from './config.js';
import { calculateTotals as calculateDayTotals } from './businessLogic.js';

let Session;

export function init(session) {
    Session = session;
}

export function handleAuditCosts() {
    const zeroCostProducts = StateManager.getState().products.filter(p => p.isActive !== false && (p.cost === 0 || p.cost === null || p.cost === undefined));
    UI.renderZeroCostList(zeroCostProducts);
    UI.toggleModal('zeroCostModal', true);
}

export async function runProductAudit() {
    const productName = document.getElementById('audit-product-name').value.trim().toLowerCase();
    if (!productName) return showAlert('Por favor, escribe el nombre de un producto.');
    UI.showLoading('Buscando en el historial...');
    const allData = getAllHistoricalData(Session.businessName);
    const history = [];
    allData.forEach(day => {
        day.data.products?.forEach(p => {
            if (p.name.toLowerCase().includes(productName)) {
                history.push({ date: day.date, product: p });
            }
        });
    });
    UI.renderAuditResults(history, productName);
    UI.hideLoading();
}

export async function handleCopyReport() {
    const data = StateManager.getState();
    const totals = calculateDayTotals(data);
    let report = `📋 REPORTE DEL DÍA: ${Session.currentDate}\n`;
    report += `🧑‍💼 Dependiente: ${data.user || 'No asignado'}\n`;
    report += `================================\n\n`;

    report += `📊 RESUMEN FINANCIERO\n`;
    report += `  - Ingresos Brutos: $${totals.totalImporte.toFixed(2)}\n`;
    if(Session.isAdmin) {
        report += `  - Ganancia Bruta (Productos): $${totals.totalGanancias.toFixed(2)}\n`;
        report += `  - Gastos Operativos: $${totals.gastosOperativos.toFixed(2)}\n`;
        report += `  - Ganancia Neta: $${totals.gananciaNetaOperativa.toFixed(2)}\n`;
    }
    report += `  - Total Recogidas: $${totals.recogidas.toFixed(2)}\n`;
    report += `  - Efectivo en Caja (Teórico): $${totals.efectivoTeoricoCaja.toFixed(2)}\n\n`;
    
    report += `📦 VENTAS DETALLADAS\n`;
    data.products.forEach(p => {
        if (p.isActive !== false && p.vendido > 0) {
            report += `  - ${p.name}: ${p.vendido} x $${p.price.toFixed(2)} = $${p.importe.toFixed(2)}\n`;
        }
    });
    report += `\n`;

    const activeGastos = data.gastos.filter(g => g.isActive !== false);
    const gastosOperativos = activeGastos.filter(g => g.type !== 'recogida');
    const recogidas = activeGastos.filter(g => g.type === 'recogida');

    if (gastosOperativos.length > 0) {
        report += `💸 GASTOS OPERATIVOS\n`;
        gastosOperativos.forEach(g => {
            report += `  - ${g.description}: $${g.amount.toFixed(2)}\n`;
        });
        report += `\n`;
    }
    if (recogidas.length > 0) {
        report += `💰 RECOGIDAS DE EFECTIVO\n`;
        recogidas.forEach(g => {
            report += `  - ${g.description}: $${g.amount.toFixed(2)}\n`;
        });
        report += `\n`;
    }

    if (data.notas) {
        report += `📝 NOTAS ADICIONALES\n${data.notas}\n\n`;
    }
    
    report += `================================\n`;
    report += `Sistema de Gestión IPV`;

    navigator.clipboard.writeText(report).then(
        () => showAlert("Reporte copiado al portapapeles."),
        () => showAlert("Error al copiar el reporte.")
    );
}

export function handleExportDay() {
    const data = StateManager.getState();
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipv_data_${Session.businessName}_${Session.currentDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function handleImportDay() {
    const fileInput = document.getElementById('file-input');
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async event => {
            try {
                const importedData = JSON.parse(event.target.result);
                const confirmed = await showConfirm("Se cargará el archivo. Los datos actuales de este día se sobrescribirán. ¿Continuar?");
                if(confirmed) {
                    StateManager.setState(importedData);
                    await showAlert("Datos importados correctamente.");
                }
            } catch (err) {
                await showAlert("Error: El archivo no es un JSON válido.");
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    };
    fileInput.click();
}

export function handleShowAbout() {
    const content = `
        <div style="text-align: center;">
            <h3>Versión ${APP_VERSION}</h3>
            <p>Sistema de Gestión de Inventario y Punto de Venta.</p>
        </div>
        <hr style="border-color: var(--border-glass); margin: 15px 0;">
        <h4>Historial de Cambios Recientes:</h4>
        <ul style="list-style-position: inside; padding-left: 10px; font-size: 0.9em; text-align: left;">
            <li><b>v${APP_VERSION} (Refactorización Mayor):</b>
                <ul>
                    <li>Separación de lógica y UI para mayor mantenibilidad.</li>
                    <li>Centralización del manejo de eventos.</li>
                    <li>Estructura de archivos modular (JS y CSS).</li>
                    <li>Eliminación de claves secretas del código cliente (mejora de seguridad crítica).</li>
                </ul>
            </li>
            <li><b>v10.21 (Solución Duplicados Definitiva):</b>
                <ul>
                    <li>Implementado un mapa de IDs persistente para garantizar que los productos antiguos siempre se conviertan al mismo UUID, eliminando la causa raíz de la duplicación.</li>
                </ul>
            </li>
        </ul>
    `;
    showAlert(content, "Acerca de IPV Gestión");
}

export function handleFinancialSummary(period = 'week') {
    const allData = getFilteredHistoricalData(null, null, Session.businessName);
    
    // REFACTOR: La lógica de cálculo ahora está aquí, no en la UI.
    let totals = { ingresos: 0, gastos: 0, ganancias: 0 };
    allData.forEach(day => {
        const dayTotals = calculateDayTotals(day.data);
        totals.ingresos += dayTotals.totalImporte;
        totals.ganancias += dayTotals.totalGanancias;
        totals.gastos += dayTotals.gastosOperativos;
    });

    const dateInfo = { dayCount: allData.length };
    
    UI.renderFinancialSummary(totals, dateInfo, Session.isAdmin);
    UI.toggleModal('financialSummaryModal', true);
}

export async function generatePerformanceReport() {
    const start = document.getElementById('perf-start-date').value;
    const end = document.getElementById('perf-end-date').value;
    if (!start || !end) return showAlert('Selecciona un rango de fechas.');
    const data = getFilteredHistoricalData(start, end, Session.businessName);
    const productMap = new Map();
    data.forEach(day => {
        day.data.products?.forEach(p => {
            if (p.vendido > 0) {
                const existing = productMap.get(p.name) || { name: p.name, totalVendido: 0, totalImporte: 0, totalGanancias: 0 };
                existing.totalVendido += p.vendido;
                existing.totalImporte += p.importe;
                existing.totalGanancias += p.ganancias;
                productMap.set(p.name, existing);
            }
        });
    });
    const reportData = Array.from(productMap.values());
    UI.renderPerformanceReport(reportData, start, end, Session.isAdmin);
}

export async function runComparison() {
    const a_start = document.getElementById('comp-a-start').value;
    const a_end = document.getElementById('comp-a-end').value;
    const b_start = document.getElementById('comp-b-start').value;
    const b_end = document.getElementById('comp-b-end').value;
    if (!a_start || !a_end || !b_start || !b_end) return showAlert('Completa todos los rangos de fecha.');

    const calculateTotalsForPeriod = (start, end) => {
        const data = getFilteredHistoricalData(start, end, Session.businessName);
        let totals = { ingresos: 0, gastos: 0, ganancias: 0, dias: data.length };
        data.forEach(day => {
            const dayTotals = calculateDayTotals(day.data);
            totals.ingresos += dayTotals.totalImporte;
            totals.ganancias += dayTotals.totalGanancias;
            totals.gastos += dayTotals.gastosOperativos;
        });
        return totals;
    };
    
    const periodA = calculateTotalsForPeriod(a_start, a_end);
    const periodB = calculateTotalsForPeriod(b_start, b_end);
    UI.renderComparisonReport({ periodA, periodB }, {a_start, a_end, b_start, b_end}, Session.isAdmin);
}

export { calculateDayTotals };