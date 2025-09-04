import StateManager from './state.js';
import { calculateProductMetrics, calculateTotals } from './businessLogic.js';

let collapsedCategories = new Set();
let areAllCategoriesCollapsed = false;

// Cache de elementos del DOM para mejorar el rendimiento
const DOM = {
    appVersion: document.getElementById('app-version-display'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingMessage: document.getElementById('loadingMessage'),
    syncIndicator: document.getElementById('sync-indicator'),
    syncButton: document.getElementById('syncButton'),
    loginForm: document.getElementById('loginForm'),
    createForm: document.getElementById('createForm'),
    loginWrapper: document.getElementById('login-screen-wrapper'),
    header: document.getElementById('header'),
    container: document.getElementById('container'),
    businessSelect: document.getElementById('businessSelect'),
    businessTitle: document.getElementById('businessTitle'),
    userSelector: document.getElementById('userSelector'),
    workerDisplay: document.getElementById('worker-display'),
    notasDia: document.getElementById('notas-dia'),
    diferenciaTipo: document.getElementById('note-diferencia-tipo'),
    diferenciaMonto: document.getElementById('note-diferencia-monto'),
    productList: document.getElementById('product-list'),
    gastosList: document.getElementById('gastos-list'),
    totalImporte: document.getElementById("total-importe"),
    totalGanancias: document.getElementById("total-ganancias"),
    totalGastosOperativos: document.getElementById("total-gastos-operativos"),
    gananciaNetaOperativa: document.getElementById("ganancia-neta-operativa"),
    totalRecogidas: document.getElementById("total-recogidas"),
    efectivoTeoricoCaja: document.getElementById("efectivo-teorico-caja"),
    totalStockCost: document.getElementById("total-stock-cost"),
    totalStockValue: document.getElementById("total-stock-value"),
    categoryDropdown: document.getElementById('modal-product-category'),
};


export function setAppVersion(version) {
    if (DOM.appVersion) {
        DOM.appVersion.textContent = `Versión ${version}`;
    }
}

export function toggleModal(id, show) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.style.display = show ? 'flex' : 'none';
  if (show) {
    const firstInput = modal.querySelector('input:not([type=hidden]), select');
    firstInput?.focus();
  } else {
    modal.querySelectorAll('.modal-scrollable-content').forEach(el => (el.scrollTop = 0));
  }
  document.body.style.overflow = show ? 'hidden' : '';
}

export function showLoading(msg) {
  if (DOM.loadingMessage) DOM.loadingMessage.textContent = msg || 'Procesando...';
  if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'flex';
}

export function hideLoading() {
  if (DOM.loadingOverlay) DOM.loadingOverlay.style.display = 'none';
}

export function updateSyncIndicator(hasChanges, isSyncing = false) {
  if (DOM.syncIndicator) {
    DOM.syncIndicator.style.backgroundColor = isSyncing ? '#3498db' : (hasChanges ? '#f39c12' : '#28a745');
    DOM.syncIndicator.title = isSyncing ? 'Sincronizando...' : (hasChanges ? 'Cambios locales pendientes' : 'Sincronizado');
  }
  if (DOM.syncButton) {
    DOM.syncButton.textContent = isSyncing ? 'Sincronizando...' : 'Sincronizar';
  }
}

export function switchLoginView(showCreate) {
  DOM.loginForm?.classList.toggle('hidden', showCreate);
  DOM.createForm?.classList.toggle('hidden', !showCreate);
}

export function showMainApp() {
  DOM.loginWrapper?.classList.add('hidden');
  DOM.header?.classList.remove('hidden');
  DOM.container?.classList.remove('hidden');
}

export function showLoginScreen() {
  DOM.loginWrapper?.classList.remove('hidden');
  DOM.header?.classList.add('hidden');
  DOM.container?.classList.add('hidden');
}

export function populateBusinessSelect(businesses) {
    const select = DOM.businessSelect;
    if (!select) return;
    if (businesses === null) {
        select.innerHTML = '<option value="">Error de conexión</option>';
        select.disabled = true;
        return;
    }
    select.innerHTML = '<option value="">Seleccionar negocio...</option>';
    if (businesses?.length > 0) {
        select.innerHTML += businesses.map(name => `<option value="${name}">${name.replace(/_/g, ' ')}</option>`).join('');
        select.disabled = false;
    } else {
        select.innerHTML = '<option value="">No hay negocios creados</option>';
        select.disabled = true;
    }
}

export function renderApp(appData, session) {
    if (!appData || !session || !session.businessName) return;
    
    DOM.businessTitle.textContent = `IPV - ${session.businessName.replace(/_/g, ' ')}`;
    DOM.userSelector.value = appData.user || '';
    DOM.workerDisplay.textContent = DOM.userSelector.options[DOM.userSelector.selectedIndex]?.text || "Seleccionar...";
    
    if (DOM.notasDia && document.activeElement !== DOM.notasDia) {
      DOM.notasDia.value = appData.notas || '';
    }
    
    const diferencia = appData.predefinedNotes?.diferenciaCaja || { tipo: 'ninguna', monto: 0 };
    DOM.diferenciaTipo.value = diferencia.tipo;
    DOM.diferenciaMonto.value = diferencia.monto || '';
    DOM.diferenciaMonto.disabled = appData.isClosed || diferencia.tipo === 'ninguna';
    
    renderProductTable(appData.products || [], session.isAdmin, appData.isClosed);
    renderGastosList(appData.gastos || [], appData.isClosed);
    renderTotals(appData);
    updateAdminVisibility(session.isAdmin);
    populateCategoryDropdown(appData.categories);
}

function renderProductTable(products, isAdmin, isClosed) {
    const tbody = DOM.productList;
    if (!tbody) return;
    
    const activeProducts = products.filter(p => p.isActive !== false);
    if (activeProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:20px;">No hay productos. Añade uno para empezar.</td></tr>`;
        return;
    }

    const productsByCategory = activeProducts.reduce((acc, p) => {
        const category = p.category || "General";
        if (!acc[category]) acc[category] = [];
        acc[category].push(p);
        return acc;
    }, {});
    const sortedCategories = Object.keys(productsByCategory).sort((a, b) => a.localeCompare(b));
    
    tbody.innerHTML = "";
    sortedCategories.forEach(category => {
        const isCollapsed = collapsedCategories.has(category);
        const catRow = tbody.insertRow();
        catRow.className = "category-row";
        catRow.innerHTML = `<td colspan="11"><span class="toggle-icon">${isCollapsed ? "►" : "▼"}</span>${category}</td>`;
        catRow.addEventListener('click', () => toggleCategory(category));

        productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            const row = createProductRow(p, isAdmin, isClosed);
            if (isCollapsed) row.classList.add('hidden');
            tbody.appendChild(row);
        });
    });
}

function createProductRow(product, isAdmin, isClosed) {
    const row = document.createElement('tr');
    row.dataset.productId = product.id;
    row.dataset.category = product.category || 'General';

    const p = calculateProductMetrics(product);

    const start = Number(p.start || 0);
    const entrada = Number(p.entrada || 0);

    if (typeof p.finales === 'number' && p.finales > (start + entrada)) {
        row.classList.add('fila-error');
    } else if (typeof p.finales === 'number' && p.finales === 0) {
        row.classList.add('fila-stock-cero');
    }

    const finalesDisplayValue = (p.finales === null || p.finales === undefined) ? '' : p.finales;
    const disabledAttr = isClosed ? 'disabled' : '';
    
    row.innerHTML = `
        <td><input type="checkbox" class="product-select-checkbox" ${disabledAttr}></td>
        <td>${escapeHtml(p.name)}</td>
        <td><input type="number" value="${p.start}" data-field="start" data-product-id="${p.id}" ${disabledAttr}></td>
        <td><input type="number" value="${p.entrada}" data-field="entrada" data-product-id="${p.id}" ${disabledAttr}></td>
        <td><input type="number" value="${finalesDisplayValue}" data-field="finales" data-product-id="${p.id}" ${disabledAttr}></td>
        <td>${p.vendido}</td>
        <td class="admin-only"><input type="number" step="0.01" value="${(p.cost || 0).toFixed(2)}" data-field="cost" data-product-id="${p.id}" ${disabledAttr}></td>
        <td><input type="number" step="0.01" value="${(p.price || 0).toFixed(2)}" data-field="price" data-product-id="${p.id}" ${disabledAttr}></td>
        <td>${p.importe.toFixed(2)}</td>
        <td class="admin-only">${p.ganancias.toFixed(2)}</td>
        <td><button class="delete-button" data-action="deleteProduct" ${disabledAttr}>&times;</button></td>`;
    return row;
}

function renderGastosList(gastos, isClosed) {
    const listDiv = DOM.gastosList;
    listDiv.innerHTML = '';
    const disabledAttr = isClosed ? 'disabled' : '';
    
    gastos.filter(g => g.isActive !== false).forEach((g) => {
        const item = document.createElement('div');
        item.className = 'gasto-item';
        const type = g.type || 'gasto';
        const tagText = type === 'recogida' ? 'Recogida' : 'Gasto';
        
        item.innerHTML = `
            <span>${escapeHtml(g.description || '')} <span class="gasto-tag gasto-type--${type}">${tagText}</span></span>
            <span>$${(g.amount || 0).toFixed(2)}</span>
            <button class="delete-button" data-action="deleteGasto" data-gasto-id="${g.id}" ${disabledAttr}>&times;</button>`;
        listDiv.appendChild(item);
    });
}

function renderTotals(appData) {
    const totals = calculateTotals(appData);
    DOM.totalImporte.textContent = totals.totalImporte.toFixed(2);
    DOM.totalGanancias.textContent = totals.totalGanancias.toFixed(2);
    DOM.totalGastosOperativos.textContent = totals.gastosOperativos.toFixed(2);
    DOM.gananciaNetaOperativa.textContent = totals.gananciaNetaOperativa.toFixed(2);
    DOM.totalRecogidas.textContent = totals.recogidas.toFixed(2);
    DOM.efectivoTeoricoCaja.textContent = totals.efectivoTeoricoCaja.toFixed(2);
    DOM.totalStockCost.textContent = totals.totalStockCost.toFixed(2);
    DOM.totalStockValue.textContent = totals.totalStockValue.toFixed(2);
}

export function updateAdminVisibility(isAdmin) {
    document.querySelectorAll(".admin-toggle-btn").forEach(btn => btn.classList.toggle("admin-active", isAdmin));
    DOM.header?.classList.toggle("admin-mode-active", isAdmin);
    document.querySelectorAll(".admin-only-row").forEach(el => el.classList.toggle("hidden", !isAdmin));
    document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
}

export function filterProducts(term) {
    const lowerCaseTerm = term.toLowerCase();
    document.querySelectorAll('#product-list tr:not(.category-row)').forEach(row => {
        const name = row.cells[1]?.textContent.toLowerCase() || '';
        row.style.display = name.includes(lowerCaseTerm) ? '' : 'none';
    });
}

export function populateCategoryDropdown(categories) {
    const select = DOM.categoryDropdown;
    if (!select) return;
    const allCategories = [...new Set(["General", ...(categories || [])])].sort();
    select.innerHTML = allCategories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function toggleCategory(category) {
    collapsedCategories.has(category) ? collapsedCategories.delete(category) : collapsedCategories.add(category);
    areAllCategoriesCollapsed = false;
    const appData = StateManager.getState();
    const isAdmin = document.querySelector('.admin-toggle-btn.admin-active') !== null;
    renderProductTable(appData.products, isAdmin, appData.isClosed);
}

export function toggleAllCategories() {
    areAllCategoriesCollapsed = !areAllCategoriesCollapsed;
    const allCategoriesFromState = new Set(
        (StateManager.getState().products || [])
        .filter(p => p.isActive !== false)
        .map(p => p.category || 'General')
    );
    collapsedCategories = areAllCategoriesCollapsed ? new Set(allCategoriesFromState) : new Set();
    const appData = StateManager.getState();
    const isAdmin = document.querySelector('.admin-toggle-btn.admin-active') !== null;
    renderProductTable(appData.products, isAdmin, appData.isClosed);
}

export function getSelectedProductIds() {
    const ids = new Set();
    document.querySelectorAll('.product-select-checkbox:checked').forEach(checkbox => {
        const row = checkbox.closest('tr');
        if (row && row.dataset.productId) ids.add(row.dataset.productId);
    });
    return ids;
}

export function toggleAllCheckboxes(checked) {
    document.querySelectorAll('.product-select-checkbox').forEach(checkbox => checkbox.checked = checked);
}

function escapeHtml(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function renderZeroStockList(products) {
    const list = document.getElementById('zeroStockList');
    list.innerHTML = products.length > 0
        ? products.map(p => `<li>${escapeHtml(p.name)}</li>`).join('')
        : '<li>No hay productos con stock cero.</li>';
}

export function renderZeroCostList(products) {
    const container = document.getElementById('zeroCostListContainer');
    container.innerHTML = products.length > 0
        ? products.map(p => `<div class="gasto-item">${escapeHtml(p.name)} (Categoría: ${p.category})</div>`).join('')
        : '<p>¡Excelente! Todos los productos tienen un costo asignado.</p>';
}

export function renderAuditResults(history, productName) {
    const container = document.getElementById('audit-results');
    if (history.length === 0) {
        container.innerHTML = `<p>No se encontraron registros para "${productName}".</p>`;
        return;
    }
    const metricsHistory = history.map(item => ({...item, product: calculateProductMetrics(item.product)}));
    let html = `<h4>Historial para "${escapeHtml(productName)}":</h4>`;
    metricsHistory.forEach(item => {
        html += `
            <div class="summary-card">
                <strong>${item.date}</strong><br>
                Inicio: ${item.product.start}, Entrada: ${item.product.entrada}, Final: ${item.product.finales ?? 'N/A'}<br>
                Vendido: ${item.product.vendido}, Importe: $${(item.product.importe || 0).toFixed(2)}
            </div>`;
    });
    container.innerHTML = html;
}

/**
 * REFACTOR: Esta función ahora es "tonta". Recibe los totales ya calculados
 * y solo se encarga de mostrarlos en el DOM. La lógica de cálculo se mueve
 * a quien la llama.
 */
export function renderFinancialSummary(totals, dateInfo, isAdmin) {
    const container = document.getElementById('summary-content');
    container.innerHTML = `
        <div class="summary-card"><h4>Ingresos Brutos</h4><p>$${totals.ingresos.toFixed(2)}</p></div>
        <div class="summary-card"><h4>Gastos Totales</h4><p>$${totals.gastos.toFixed(2)}</p></div>
        <div class="summary-card admin-only-row" style="display: ${isAdmin ? 'block' : 'none'}"><h4>Ganancia Bruta</h4><p>$${totals.ganancias.toFixed(2)}</p></div>
        <div class="summary-card"><h4>Balance Neto</h4><p>$${(totals.ingresos - totals.gastos).toFixed(2)}</p></div>
        <p style="text-align:center; font-size: 0.9em; color: var(--text-muted);">Resultados para ${dateInfo.dayCount} día(s).</p>`;
}


export function renderPerformanceReport(reportData, start, end, isAdmin) {
    const container = document.getElementById('performance-content');
    const sortedByVendido = [...reportData].sort((a, b) => b.totalVendido - a.totalVendido);
    const sortedByImporte = [...reportData].sort((a, b) => b.totalImporte - a.totalImporte);
    const sortedByGanancias = [...reportData].sort((a, b) => b.totalGanancias - a.totalGanancias);
    
    const renderList = (title, data, key) => `
        <h4>${title}</h4>
        ${data.slice(0, 10).map(p => `<div class="gasto-item"><span>${escapeHtml(p.name)}</span><strong>${key === 'totalVendido' ? p[key] : '$' + p[key].toFixed(2)}</strong></div>`).join('') || '<p>No hay datos.</p>'}`;
    
    container.innerHTML = `
        <p style="text-align:center;">Mostrando reporte desde ${start} hasta ${end}</p>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div>${renderList('🏆 Top 10 Más Vendidos (Unidades)', sortedByVendido, 'totalVendido')}</div>
            <div>${renderList('💰 Top 10 Más Ingresos', sortedByImporte, 'totalImporte')}</div>
            <div class="admin-only-row" style="display: ${isAdmin ? 'block' : 'none'}">${renderList('💹 Top 10 Más Rentables', sortedByGanancias, 'totalGanancias')}</div>
        </div>`;
}

export function renderComparisonReport(data, dates, isAdmin) {
    const container = document.getElementById('comparison-results');
    const { periodA, periodB } = data;
    
    const comparisonRow = (label, valA, valB) => {
        const diff = valB - valA;
        const percent = valA !== 0 ? (diff / Math.abs(valA)) * 100 : (valB > 0 ? 100 : 0);
        const color = diff >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const icon = diff >= 0 ? '▲' : '▼';
        return `
            <div class="summary-card">
                <h4>${label}</h4>
                <div style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                    <span>A: $${valA.toFixed(2)}</span>
                    <span>B: $${valB.toFixed(2)}</span>
                    <strong style="color:${color};">${icon} ${diff.toFixed(2)} (${percent.toFixed(1)}%)</strong>
                </div>
            </div>`;
    };
    
    container.innerHTML = `
        <p style="text-align:center;">
            <strong>Periodo A:</strong> ${dates.a_start} a ${dates.a_end} (${periodA.dias} días) <br>
            <strong>Periodo B:</strong> ${dates.b_start} a ${dates.b_end} (${periodB.dias} días)
        </p>
        ${comparisonRow('Ingresos', periodA.ingresos, periodB.ingresos)}
        ${comparisonRow('Gastos', periodA.gastos, periodB.gastos)}
        <div class="admin-only-row" style="display: ${isAdmin ? 'block' : 'none'}">${comparisonRow('Ganancias', periodA.ganancias, periodB.ganancias)}</div>
    `;
}