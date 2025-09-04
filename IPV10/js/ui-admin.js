import { ApiClient } from './api.js';

let salesChart = null;

export function showLoading(show, message = 'Cargando...') {
    const overlay = document.getElementById('loading-overlay-admin');
    overlay.querySelector('p').textContent = message;
    overlay.classList.toggle('hidden', !show);
}

export function showLoginScreen() {
    document.getElementById('admin-login-screen').classList.remove('hidden');
    document.getElementById('admin-panel').classList.add('hidden');
}

export function showAdminPanel() {
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
}

export async function populateBusinessSelect() {
    const select = document.getElementById('adminBusinessSelect');
    select.innerHTML = '<option value="">Cargando negocios...</option>';
    try {
        const response = await ApiClient.getBusinessList();
        if (response.status === "success" && response.businesses) {
            if(response.businesses.length > 0) {
                select.innerHTML = '<option value="">Seleccionar negocio...</option>';
                select.innerHTML += response.businesses.map(name => `<option value="${name}">${name.replace(/_/g, ' ')}</option>`).join('');
            } else {
                select.innerHTML = '<option value="">No hay negocios</option>';
            }
        } else {
             select.innerHTML = '<option value="">Error al cargar</option>';
        }
    } catch (e) {
        console.error("Error populating business select:", e);
        select.innerHTML = '<option value="">Error de conexión</option>';
    }
}

export function showView(viewId) {
    // Manejo de Vistas
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewId}-view`).classList.add('active');
    
    // Manejo de Botones de Navegación
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
        // Actualizar el título de la cabecera
        const titleEl = document.getElementById('view-title');
        titleEl.textContent = activeLink.querySelector('span').textContent;
    }
}

export function renderDashboard(data) {
    const container = document.getElementById('dashboard-content');
    if (!data) {
        container.innerHTML = `<p>No hay suficientes datos para mostrar el dashboard en este periodo.</p>`;
        return;
    }
    
    const { currentTotals, previousTotals, chartData } = data;

    const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : (current === 0 ? 0 : -100);
        return ((current - previous) / Math.abs(previous)) * 100;
    };

    const formatChange = (change) => {
        if (isNaN(change)) return '';
        const cls = change >= 0 ? 'positive' : 'negative';
        const sign = change >= 0 ? '▲' : '▼';
        return `<span class="change ${cls}">${sign} ${Math.abs(change).toFixed(1)}%</span>`;
    };

    const salesChange = calculateChange(currentTotals.totalSales, previousTotals.totalSales);
    const netProfitChange = calculateChange(currentTotals.totalNetProfit, previousTotals.totalNetProfit);

    container.innerHTML = `
        <div class="kpi-grid">
            <div class="kpi-card">
                <h4>Ventas Totales</h4>
                <p>$${currentTotals.totalSales.toFixed(2)} ${formatChange(salesChange)}</p>
            </div>
            <div class="kpi-card">
                <h4>Ganancia Neta</h4>
                <p>$${currentTotals.totalNetProfit.toFixed(2)} ${formatChange(netProfitChange)}</p>
            </div>
             <div class="kpi-card">
                <h4>Ganancia Bruta</h4>
                <p>$${currentTotals.totalProfit.toFixed(2)}</p>
            </div>
             <div class="kpi-card">
                <h4>Periodo</h4>
                <p style="font-size: 1rem; color: var(--text-muted); font-weight: 500;">${data.period}</p>
            </div>
        </div>
        <div class="chart-container">
            <h3>Rendimiento del Periodo</h3>
            <canvas id="salesChartCanvas"></canvas>
        </div>
    `;

    renderSalesChart(chartData);
}

function renderSalesChart(chartData) {
    const canvas = document.getElementById('salesChartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const labels = Object.keys(chartData);
    const salesValues = labels.map(label => chartData[label].sales);
    const profitValues = labels.map(label => chartData[label].profit);

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas',
                data: salesValues,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.2,
                fill: true
            }, {
                label: 'Ganancia Neta',
                data: profitValues,
                borderColor: 'rgb(16, 185, 129)',
                 backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'day', tooltipFormat: 'dd MMM yyyy' }, title: { display: true, text: 'Fecha' } },
                y: { beginAtZero: true, title: { display: true, text: 'Monto ($)' } }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

export function renderDetailedReport(data) {
    const container = document.getElementById('report-results-container');
    if (!data) {
        container.innerHTML = `<p>No se encontraron datos para el rango de fechas seleccionado.</p>`;
        return;
    }

    const { totalSales, totalProfit, totalExpenses, totalNetProfit, salesByCategory, period, daysCount } = data;

    let categoryRows = salesByCategory.map(([category, amount]) => `
        <tr>
            <td>${category}</td>
            <td class="text-right">$${amount.toFixed(2)}</td>
            <td class="text-right">${totalSales > 0 ? ((amount / totalSales) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="kpi-grid">
            <div class="kpi-card"><h4>Ventas Totales</h4><p>$${totalSales.toFixed(2)}</p></div>
            <div class="kpi-card"><h4>Ganancia Neta</h4><p>$${totalNetProfit.toFixed(2)}</p></div>
            <div class="kpi-card"><h4>Gastos</h4><p>$${totalExpenses.toFixed(2)}</p></div>
            <div class="kpi-card"><h4>Venta Prom./Día</h4><p>$${daysCount > 0 ? (totalSales / daysCount).toFixed(2) : '0.00'}</p></div>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th colspan="3">Ventas por Categoría (${period})</th></tr></thead>
                <tbody>
                    <tr><th>Categoría</th><th class="text-right">Total Ventas</th><th class="text-right">% del Total</th></tr>
                    ${categoryRows || '<tr><td colspan="3">Sin ventas en este periodo.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

export function renderProductsReport(productsData) {
    const container = document.getElementById('products-report-container');
    if (!productsData || productsData.length === 0) {
        container.innerHTML = `<p>No se vendió ningún producto en este periodo.</p>`;
        return;
    }
    
    let productRows = productsData.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category}</td>
            <td class="text-right">${p.unitsSold}</td>
            <td class="text-right">$${p.totalSales.toFixed(2)}</td>
            <td class="text-right">$${p.totalProfit.toFixed(2)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th class="text-right">Unidades Vendidas</th>
                        <th class="text-right">Ventas Totales</th>
                        <th class="text-right">Ganancia Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productRows}
                </tbody>
            </table>
        </div>
    `;
}