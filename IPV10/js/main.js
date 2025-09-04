// js/main.js

import StateManager from '../state.js';
import { ApiClient } from '../api.js';
import * as UI from '../ui.js';
import { initializeCalculators } from '../calculators.js';
import { normalizeData, createNewDayDataFromPrevious } from '../utils.js';
import { showAlert } from '../customModals.js';
import { APP_VERSION, PROMOTIONAL_MODALS } from '../config.js';
import Session from '../session.js';
import * as EventHandlers from '../eventHandlers.js';
import * as ReportHandlers from '../reportHandlers.js';

console.log(`main.js: Módulo cargado. Versión ${APP_VERSION}`);

let pizzaDataLoader;

document.addEventListener('DOMContentLoaded', main);

async function main() {
    UI.setAppVersion(APP_VERSION);
    
    const showMotivationalModal = () => {
        const today = new Date().toISOString().split('T')[0];
        const lastShownDate = localStorage.getItem('motivationalModalLastShown');

        if (lastShownDate !== today) {
            const randomModal = PROMOTIONAL_MODALS[Math.floor(Math.random() * PROMOTIONAL_MODALS.length)];
            showAlert(randomModal.message, randomModal.title, { className: randomModal.className });
            localStorage.setItem('motivationalModalLastShown', today);
        }
    };
    
    // Inicializar módulos
    EventHandlers.setupEventListeners(); // <-- CORRECCIÓN CLAVE: Se asegura que los listeners correctos se activen.
    const calculatorFunctions = initializeCalculators(UI);
    pizzaDataLoader = calculatorFunctions.loadPizzaData;
    ReportHandlers.init(Session);

    // Suscribirse a los cambios de estado para re-renderizar la UI
    StateManager.subscribe((appData) => {
        if (!appData || !Session.businessName) return;
        UI.renderApp(appData, Session);
        if(pizzaDataLoader) pizzaDataLoader(appData);
        saveDataForCurrentDate(appData);
    });

    if (Session.load()) {
        const dateInput = document.getElementById('dateInput');
        const lastDate = localStorage.getItem('ipv_last_selected_date') || new Date().toISOString().split('T')[0];
        Session.currentDate = lastDate;
        if (dateInput) {
            dateInput.value = lastDate;
            dateInput.addEventListener('change', (e) => loadDataForDate(e.target.value));
        }
        UI.showMainApp();
        showMotivationalModal();
        await loadDataForDate(Session.currentDate);
    } else {
        UI.showLoginScreen();
        await loadAndCacheBusinessList();
    }
    
    setupScrollAndHeaderListeners();
}

async function loadAndCacheBusinessList() {
    const CACHE_KEY = 'ipv_business_list_cache';
    try {
        const cachedList = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cachedList && Array.isArray(cachedList)) {
            console.log("Cargando lista de negocios desde la caché.");
            UI.populateBusinessSelect(cachedList);
        }
    } catch (e) {
        console.warn("No se pudo leer la caché de la lista de negocios.");
    }

    try {
        const response = await ApiClient.getBusinessList();
        if (response.status === "success" && response.businesses) {
            console.log("Actualizando caché con nueva lista de negocios.");
            localStorage.setItem(CACHE_KEY, JSON.stringify(response.businesses));
            UI.populateBusinessSelect(response.businesses);
        }
    } catch (e) {
        console.error("No se pudo obtener la lista de negocios del servidor. Se usará la caché si está disponible.", e);
        if (!localStorage.getItem(CACHE_KEY)) {
            UI.populateBusinessSelect(null);
        }
    }
}

async function loadDataForDate(dateString) {
    UI.showLoading(`Cargando ${dateString}...`);
    Session.currentDate = dateString;
    localStorage.setItem("ipv_last_selected_date", dateString);
    const storageKey = `ipv_data_${Session.businessName}_${dateString}`;
    
    let localData = null;
    let cloudData = null;

    try { 
        localData = JSON.parse(localStorage.getItem(storageKey)); 
    } catch (e) {
        console.warn("No se pudieron cargar los datos locales o estaban vacíos.");
    }
    
    if (navigator.onLine && Session.businessName !== "local_mode") {
        try {
            const cloudResponse = await ApiClient.getDailyData(Session.businessName, Session.password, dateString);
            if (cloudResponse.status === "success" && cloudResponse.data) {
                cloudData = cloudResponse.data;
            }
        } catch (error) {
            console.error("Error al obtener datos de la nube, se usarán los locales.", error);
        }
    }
    
    let finalData = mergeData(localData, cloudData);

    if (!finalData) {
        finalData = await createNewDayDataFromPrevious(Session);
    }

    finalData = normalizeData(finalData, Session.businessName);

    StateManager.setState(finalData);
    UI.hideLoading();
    UI.updateSyncIndicator(false);
}

function saveDataForCurrentDate(appData) {
    if (!Session.businessName || !Session.currentDate) return;
    localStorage.setItem(`ipv_data_${Session.businessName}_${Session.currentDate}`, JSON.stringify(appData));
    UI.updateSyncIndicator(true);
}

function mergeData(local, cloud) {
    if (!local) return cloud;
    if (!cloud) return local;

    const merged = { ...cloud, ...local };

    const allProducts = new Map();
    [...(cloud.products || []), ...(local.products || [])].forEach(p => {
        if (p && p.id) {
            const existing = allProducts.get(String(p.id));
            if (!existing || new Date(p.lastModified || 0) > new Date(existing?.lastModified || 0)) {
                allProducts.set(String(p.id), p);
            }
        }
    });
    merged.products = Array.from(allProducts.values());

    const allGastos = new Map();
    [...(cloud.gastos || []), ...(local.gastos || [])].forEach(g => {
        if (g && g.id) {
            const existing = allGastos.get(String(g.id));
            if (!existing || new Date(g.lastModified || 0) > new Date(existing?.lastModified || 0)) {
                allGastos.set(String(g.id), g);
            }
        }
    });
    merged.gastos = Array.from(allGastos.values());
    
    const localPizza = local.pizzaCalcs;
    const cloudPizza = cloud.pizzaCalcs;
    if (localPizza && cloudPizza) {
        merged.pizzaCalcs = new Date(localPizza.lastModified || 0) > new Date(cloudPizza.lastModified || 0) ? localPizza : cloudPizza;
    } else {
        merged.pizzaCalcs = localPizza || cloudPizza || {};
    }

    return merged;
}

function setupScrollAndHeaderListeners() {
    const header = document.getElementById('header');
    if (!header) return;
    
    let lastScrollTop = 0;
    window.addEventListener('scroll', () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);

}
