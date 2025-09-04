// js/eventHandlers.js

import StateManager from './state.js';
import * as UI from './ui.js';
import * as ReportHandlers from './reportHandlers.js';
import { handleBillCounterActions } from './calculators.js';
import { PROMOTIONAL_MODALS } from './config.js';
import { showAlert } from './customModals.js';
import * as AppActions from './appActions.js'; // Se importan todas las acciones de la aplicación

// Mapeo de acciones unificado. Ahora incluye las acciones que antes estaban en el switch.
const actionHandlers = {
    // Acciones de UI
    'switchToCreate': () => UI.switchLoginView(true),
    'switchToLogin': () => UI.switchLoginView(false),
    'addProductBtn': () => UI.toggleModal("product-modal", true),
    'addGastoBtn': () => UI.toggleModal("gastos-modal", true),
    'toggleAllBtn': UI.toggleAllCategories,
    'openCalculatorBtn': () => UI.toggleModal("calculatorModal", true),
    'openBillCounterBtn': () => UI.toggleModal("billCounterModal", true),

    // Acciones de Reportes y Menú
    'menu-audit-costs': ReportHandlers.handleAuditCosts,
    'menu-audit-products': () => UI.toggleModal('dataAuditModal', true),
    'runAuditBtn': ReportHandlers.runProductAudit,
    'menu-financial-summary': () => ReportHandlers.handleFinancialSummary(),
    'menu-performance-report': () => UI.toggleModal('performanceReportModal', true),
    'generatePerformanceReportBtn': ReportHandlers.generatePerformanceReport,
    'menu-compare-periods': () => UI.toggleModal('comparisonModal', true),
    'runComparisonBtn': ReportHandlers.runComparison,
    'menu-copy-report': ReportHandlers.handleCopyReport,
    'menu-export-day': ReportHandlers.handleExportDay,
    'menu-import-day': ReportHandlers.handleImportDay,
    'menu-about': ReportHandlers.handleShowAbout,

    // Acciones principales de la aplicación
    "localMode": AppActions.startLocalMode,
    "deleteBusinessBtn": AppActions.handleDeleteBusiness,
    "prevDayBtn": () => AppActions.changeDay(-1),
    "nextDayBtn": () => AppActions.changeDay(1),
    "toggle-admin-mode": AppActions.toggleAdminMode,
    "deleteSelectedBtn": AppActions.handleDeleteSelected,
    "showZeroStockBtn": AppActions.handleShowZeroStock,
    "syncButton": (target) => AppActions.syncToCloud(target),
    "logoutBtn": AppActions.logout,
    "menu-reset-day": AppActions.handleResetDay,
    "menu-end-of-day": AppActions.handleEndOfDay,
    "menu-clear-cache": AppActions.handleClearCache,
    "deleteProduct": (target) => AppActions.handleDeleteProduct(target),
    "deleteGasto": (target) => AppActions.handleDeleteGasto(target),
    
    // Test de modales
    "test-promo-modal": (target) => {
        const index = parseInt(target.dataset.index, 10);
        if (!isNaN(index) && PROMOTIONAL_MODALS[index]) {
            const modalData = PROMOTIONAL_MODALS[index];
            showAlert(modalData.message, modalData.title, { className: modalData.className });
        }
    }
};

/**
 * Configura todos los listeners de eventos de la aplicación.
 * Ya no necesita la instancia 'app' porque importa las acciones directamente.
 */
export function setupEventListeners() {
    document.body.addEventListener("submit", handleFormSubmit);
    document.body.addEventListener("click", handleGlobalClick);
    document.body.addEventListener("change", handleGlobalChange);
    
    document.getElementById("searchInput")?.addEventListener("keyup", e => UI.filterProducts(e.target.value));
    
    let notesTimeout;
    document.getElementById("notas-dia")?.addEventListener("input", e => {
        clearTimeout(notesTimeout);
        notesTimeout = setTimeout(() => StateManager.updateNotes(e.target.value), 300);
    });

    document.getElementById('menu-toggle')?.addEventListener('change', e => {
        if (!e.target.checked) {
            document.querySelector('.header-menu')?.scrollTo(0, 0);
        }
    });
}

/**
 * Manejador global para todos los eventos de click.
 * Utiliza un mapa de acciones y delegación de eventos.
 * @param {Event} e - El objeto del evento.
 */
function handleGlobalClick(e) {
    const target = e.target.closest("[data-action], .modal-backdrop, .modal .close, .filter-buttons button");
    if (!target) return;

    const action = target.dataset.action;

    if (action) {
        if (action.startsWith('bc_')) {
            handleBillCounterActions(action, UI);
            return;
        }

        if (actionHandlers[action]) {
            actionHandlers[action](target);
            return;
        }
    } else if (target.matches(".modal-backdrop, .modal .close")) {
        const modalId = target.closest(".modal")?.id;
        if (modalId && !['alertModal', 'confirmModal', 'promptModal'].includes(modalId)) {
            UI.toggleModal(modalId, false);
        }
    } else if (target.matches(".filter-buttons button")) {
        const period = target.dataset.period;
        if (period) ReportHandlers.handleFinancialSummary(period);
    }
}

/**
 * Manejador global para eventos de cambio (inputs, selects).
 * @param {Event} e - El objeto del evento.
 */
function handleGlobalChange(e) {
    const target = e.target;
    if (target.matches("#product-list input[data-field]")) {
        const { productId, field } = target.dataset;
        if (productId && field) {
            StateManager.updateProductFieldById(productId, field, target.value);
        }
    } else if (target.id === "selectAllCheckbox") {
        UI.toggleAllCheckboxes(target.checked);
    }

    switch (target.id) {
        case "dateInput": 
            // La carga de datos ahora es manejada por un listener directo en main.js
            break;
        case "userSelector": StateManager.updateUser(target.value); break;
    }
    
    if (target.matches("#note-diferencia-tipo, #note-diferencia-monto")) {
        const tipo = document.getElementById("note-diferencia-tipo")?.value;
        const monto = document.getElementById("note-diferencia-monto")?.value;
        StateManager.updateDiferenciaCaja(tipo, monto);
    }
}

/**
 * Manejador global para envíos de formularios.
 * @param {Event} e - El objeto del evento.
 */
function handleFormSubmit(e) {
    e.preventDefault();
    switch (e.target.id) {
        case 'loginForm': AppActions.handleLogin(); break;
        case 'createForm': AppActions.handleCreateBusiness(); break;
        case 'pinForm': AppActions.verifyPin(); break;
        case 'addProductForm': AppActions.addProduct(); break;
        case 'addGastoForm': AppActions.addGasto(); break;
    }
}