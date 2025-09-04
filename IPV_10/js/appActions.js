// js/appActions.js

import StateManager from './state.js';
import * as UI from './ui.js';
import Session from './session.js';
import { ApiClient } from './api.js';
import { ADMIN_PIN } from './config.js';
import { showAlert, showConfirm, showPrompt } from './customModals.js';

// --- ACCIONES DE SESIÓN Y AUTENTICACIÓN ---

export async function handleLogin() {
    const businessName = document.getElementById('businessSelect').value;
    const password = document.getElementById('passwordInput').value;
    if (!businessName || !password) return showAlert('Por favor, selecciona un negocio y escribe la contraseña.');
    
    UI.showLoading('Iniciando sesión...');
    try {
        const response = await ApiClient.login(businessName, password);
        if (response.status === 'success') {
            Session.businessName = businessName;
            Session.password = password;
            Session.save();
            window.location.reload();
        } else {
            throw new Error(response.message || 'Credenciales incorrectas.');
        }
    } catch (error) {
        showAlert(`Error al iniciar sesión: ${error.message}`);
    } finally {
        UI.hideLoading();
    }
}

export async function handleCreateBusiness() {
    const businessName = document.getElementById('newBusinessName').value.trim().replace(/\s+/g, '_');
    const password = document.getElementById('newPassword').value;
    const creationKey = document.getElementById('creationKeyInput').value;
    const adminEmail = document.getElementById('newAdminEmail').value;

    if (!businessName || !password || !creationKey || !adminEmail) {
        return showAlert('Todos los campos son obligatorios.');
    }
    
    UI.showLoading('Creando negocio...');
    try {
        const response = await ApiClient.createBusiness(businessName, password, creationKey, adminEmail);
        if (response.status === 'success') {
            await showAlert('¡Negocio creado con éxito! Ahora puedes iniciar sesión.');
            UI.switchLoginView(false);
            // Recargar la lista de negocios
            location.reload();
        } else {
            throw new Error(response.message || 'No se pudo crear el negocio.');
        }
    } catch (error) {
        showAlert(`Error al crear: ${error.message}`);
    } finally {
        UI.hideLoading();
    }
}

export async function handleDeleteBusiness() {
    const businessName = document.getElementById('businessSelect').value;
    if (!businessName) return showAlert('Por favor, selecciona un negocio para eliminar.');
    
    const confirmed = await showConfirm(`¿Estás SEGURO de que quieres eliminar el negocio "${businessName}"? Esta acción es IRREVERSIBLE y borrará TODOS sus datos.`);
    if (!confirmed) return;

    const creationKey = await showPrompt('Introduce la clave maestra para confirmar la eliminación.');
    if (!creationKey) return;

    UI.showLoading('Eliminando negocio...');
    try {
        const response = await ApiClient.deleteBusiness(businessName, creationKey);
        if (response.status === 'success') {
            await showAlert('Negocio eliminado correctamente.');
            location.reload();
        } else {
            throw new Error(response.message || 'No se pudo eliminar el negocio.');
        }
    } catch (error) {
        showAlert(`Error al eliminar: ${error.message}`);
    } finally {
        UI.hideLoading();
    }
}


export async function toggleAdminMode() {
    if (Session.isAdmin) {
        Session.isAdmin = false;
        UI.updateAdminVisibility(false);
    } else {
        UI.toggleModal('pinModal', true);
    }
}

export async function verifyPin() {
    const pinInput = document.getElementById('pinInput');
    if (pinInput.value === ADMIN_PIN) {
        Session.isAdmin = true;
        UI.updateAdminVisibility(true);
        UI.toggleModal('pinModal', false);
    } else {
        await showAlert('PIN incorrecto.');
    }
    pinInput.value = '';
}

export function startLocalMode() {
    Session.businessName = "local_mode";
    Session.password = "local";
    Session.isAdmin = true;
    Session.save();
    window.location.reload();
}

export function logout() {
    Session.clear();
    window.location.reload();
}

// --- ACCIONES DE DATOS DIARIOS ---

export function changeDay(offset) {
    const dateInput = document.getElementById('dateInput');
    const currentDate = new Date(dateInput.value + 'T12:00:00Z');
    currentDate.setUTCDate(currentDate.getUTCDate() + offset);
    dateInput.value = currentDate.toISOString().split('T')[0];
    dateInput.dispatchEvent(new Event('change')); // Dispara el evento para que main.js recargue los datos
}

export async function syncToCloud(button) {
    if (Session.businessName === "local_mode") {
        return showAlert("El modo local no se puede sincronizar con la nube.");
    }
    if (!navigator.onLine) {
        return showAlert("No hay conexión a internet para sincronizar.");
    }

    button.disabled = true;
    UI.updateSyncIndicator(true, true);
    
    try {
        const dataToSync = StateManager.getState();
        const response = await ApiClient.sync(Session.businessName, Session.password, Session.currentDate, dataToSync);
        if (response.status === 'success') {
            UI.updateSyncIndicator(false);
            showAlert("Sincronización completada con éxito.");
        } else {
            throw new Error(response.message || 'Respuesta inesperada del servidor.');
        }
    } catch (error) {
        showAlert(`Error de sincronización: ${error.message}`);
        UI.updateSyncIndicator(true); // Vuelve a estado 'cambios pendientes'
    } finally {
        button.disabled = false;
        UI.updateSyncIndicator(StateManager.getState().hasChanges, false);
    }
}

// --- ACCIONES DE PRODUCTOS Y GASTOS ---

export function addProduct() {
    const namesInput = document.getElementById('modal-product-name');
    const names = namesInput.value.split(',').map(name => name.trim()).filter(Boolean);
    if (names.length === 0) return showAlert('Debes introducir al menos un nombre de producto.');

    const productDetails = {
        names,
        category: document.getElementById('modal-product-category').value,
        start: document.getElementById('modal-product-start').value,
        cost: document.getElementById('modal-product-cost').value,
        price: document.getElementById('modal-product-price').value
    };

    StateManager.addProduct(productDetails);
    document.getElementById('addProductForm').reset();
    namesInput.focus();
}

export function addGasto() {
    const description = document.getElementById('gastos-description').value;
    const amount = parseFloat(document.getElementById('gastos-amount').value);
    const type = document.getElementById('gasto-type').value;

    if (!description || isNaN(amount)) return showAlert('Descripción y monto son requeridos.');

    StateManager.addGasto(description, amount, type);
    UI.toggleModal('gastos-modal', false);
    document.getElementById('addGastoForm').reset();
}

export async function handleDeleteProduct(target) {
    const productId = target.closest('tr').dataset.productId;
    const productName = target.closest('tr').cells[1].textContent;
    const confirmed = await showConfirm(`¿Eliminar el producto "${productName}"?`);
    if (confirmed) {
        StateManager.deleteProductById(productId);
    }
}

export async function handleDeleteGasto(target) {
    const gastoId = target.dataset.gastoId;
    const confirmed = await showConfirm('¿Eliminar este gasto/recogida?');
    if (confirmed) {
        StateManager.deleteGastoById(gastoId);
    }
}

export async function handleDeleteSelected() {
    const idsToDelete = UI.getSelectedProductIds();
    if (idsToDelete.size === 0) return showAlert('No has seleccionado ningún producto.');
    const confirmed = await showConfirm(`¿Eliminar ${idsToDelete.size} productos seleccionados?`);
    if (confirmed) {
        StateManager.deleteSelectedProducts(idsToDelete);
    }
}

export function handleShowZeroStock() {
    const zeroStockProducts = StateManager.getState().products.filter(p => p.finales === 0 && p.isActive);
    UI.renderZeroStockList(zeroStockProducts);
    UI.toggleModal('zeroStockModal', true);
}


// --- ACCIONES DE MENÚ Y OTRAS ---

export async function handleResetDay() {
    const confirmed = await showConfirm('¿Seguro que quieres reiniciar el día? Se perderán todas las entradas y finales, volviendo al estado inicial.');
    if (confirmed) {
        const currentState = StateManager.getState();
        const resetProducts = currentState.products.map(p => ({
            ...p,
            entrada: 0,
            finales: p.start,
            lastModified: new Date().toISOString()
        }));
        StateManager.setState({ ...currentState, products: resetProducts, gastos: [], notas: '' });
    }
}

export async function handleEndOfDay() {
    const confirmed = await showConfirm('¿Marcar este día como cerrado? No podrás editar los datos después.');
    if (confirmed) {
        StateManager.closeDay();
    }
}

export async function handleClearCache() {
    const confirmed = await showConfirm('Esto borrará TODOS los datos locales de TODOS los negocios en este dispositivo. La próxima vez que inicies sesión, se descargarán los datos de la nube. ¿Estás seguro?');
    if (confirmed) {
        const session = localStorage.getItem('ipv_session');
        localStorage.clear();
        if(session) localStorage.setItem('ipv_session', session);
        await showAlert('Caché local limpiada. La aplicación se recargará.');
        location.reload();
    }
}