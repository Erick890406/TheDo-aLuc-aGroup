// js/admin-main.js

import Session from './session.js';
import { ApiClient } from './api.js';
import * as UI from './ui-admin.js';
import { processDataForDashboard, processDataForReport, processDataForProducts } from './data-processor.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const CACHE_KEY = 'ipv_admin_data_cache';
let allBusinessDataCache = null;

document.addEventListener('DOMContentLoaded', main);

async function main() {
    if (Session.load()) {
        UI.showAdminPanel();
        await initializePanel();
    } else {
        UI.showLoginScreen();
        await UI.populateBusinessSelect();
    }
    setupEventListeners();
}

function setupEventListeners() {
    document.getElementById('adminLoginForm').addEventListener('submit', handleLogin);
    document.getElementById('adminLogoutBtn').addEventListener('click', handleLogout);

    // --- NUEVA LÓGICA DE NAVEGACIÓN ---
    document.querySelector('.bottom-nav').addEventListener('click', (e) => {
        const navLink = e.target.closest('.nav-link');
        if (navLink) {
            const view = navLink.dataset.view;
            UI.showView(view);
        }
    });

    document.getElementById('dashboard-period-selector').addEventListener('change', loadDashboardData);
    document.getElementById('generate-report-btn').addEventListener('click', loadReportData);
    document.getElementById('generate-products-report-btn').addEventListener('click', loadProductsReport);
}

async function handleLogin(e) {
    e.preventDefault();
    const businessName = document.getElementById('adminBusinessSelect').value;
    const password = document.getElementById('adminPasswordInput').value;
    if (!businessName || !password) return alert('Selecciona un negocio y escribe la contraseña.');

    UI.showLoading(true, 'Verificando...');
    try {
        const response = await ApiClient.login(businessName, password);
        if (response.status === 'success') {
            Session.businessName = businessName;
            Session.password = password;
            Session.save();
            UI.showAdminPanel();
            await initializePanel();
        } else {
            throw new Error(response.message || 'Credenciales incorrectas.');
        }
    } catch (error) {
        if (error.message.includes('Failed to fetch')) {
             alert(`Error de red o CORS. Revisa tu conexión a internet.`);
        } else {
            alert(`Error al iniciar sesión: ${error.message}`);
        }
    } finally {
        UI.showLoading(false);
    }
}

function handleLogout() {
    Session.clear();
    allBusinessDataCache = null;
    sessionStorage.removeItem(CACHE_KEY);
    window.location.reload();
}

async function initializePanel() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    document.getElementById('report-start-date').value = formatDate(thirtyDaysAgo);
    document.getElementById('report-end-date').value = formatDate(today);
    document.getElementById('products-start-date').value = formatDate(thirtyDaysAgo);
    document.getElementById('products-end-date').value = formatDate(today);

    document.getElementById('adminBusinessTitle').textContent = Session.businessName.replace(/_/g, ' ');
    await loadDashboardData();
}

async function loadDashboardData() {
    UI.showLoading(true, 'Procesando Dashboard...');
    const allData = await fetchAllDataForBusiness();
    if (allData) {
        const period = document.getElementById('dashboard-period-selector').value;
        const dashboardData = processDataForDashboard(allData, period);
        UI.renderDashboard(dashboardData);
    }
    UI.showLoading(false);
}

async function loadReportData() {
    UI.showLoading(true, 'Generando Reporte...');
    const start = document.getElementById('report-start-date').value;
    const end = document.getElementById('report-end-date').value;
    if (!start || !end) {
        UI.showLoading(false);
        return alert("Selecciona un rango de fechas.");
    }
    const allData = await fetchAllDataForBusiness();
    if (allData) {
        const reportData = processDataForReport(allData, start, end);
        UI.renderDetailedReport(reportData);
    }
    UI.showLoading(false);
}

async function loadProductsReport() {
    UI.showLoading(true, 'Analizando Productos...');
    const start = document.getElementById('products-start-date').value;
    const end = document.getElementById('products-end-date').value;
    if (!start || !end) {
        UI.showLoading(false);
        return alert("Selecciona un rango de fechas.");
    }
    const allData = await fetchAllDataForBusiness();
    if (allData) {
        const productsData = processDataForProducts(allData, start, end);
        UI.renderProductsReport(productsData);
    }
    UI.showLoading(false);
}

async function fetchAllDataForBusiness() {
    if (allBusinessDataCache) return allBusinessDataCache;

    const cachedDataString = sessionStorage.getItem(CACHE_KEY);
    if (cachedDataString) {
        console.log("Cargando datos históricos desde la CACHÉ DE LA SESIÓN.");
        UI.showLoading(true, "Cargando desde caché...");
        allBusinessDataCache = JSON.parse(cachedDataString);
        await sleep(200);
        return allBusinessDataCache;
    }

    const allData = [];
    const today = new Date();
    const maxDaysToScan = 365;
    let consecutiveEmptyDays = 0;
    const stopAfterEmptyDays = 3;
    UI.showLoading(true, `Buscando historial de datos...`);
    
    try {
        for (let i = 0; i < maxDaysToScan; i++) {
            if (consecutiveEmptyDays >= stopAfterEmptyDays) {
                console.log(`Se detuvo la búsqueda tras ${stopAfterEmptyDays} días vacíos.`);
                break; 
            }
            const date = new Date();
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            UI.showLoading(true, `Consultando: ${dateString}...`);
           
            try {
                await sleep(50);
                const response = await ApiClient.getDailyData(Session.businessName, Session.password, dateString);
                
                if (response.status === 'success' && response.data) {
                    allData.push({ date: dateString, data: response.data });
                    consecutiveEmptyDays = 0;
                } else {
                    consecutiveEmptyDays++;
                }
            } catch (err) {
                console.error(`Error de red en ${dateString}. Deteniendo búsqueda.`, err);
                throw new Error(`Error de conexión. Revisa tu internet y recarga.`);
            }
        }

        UI.showLoading(true, 'Procesamiento final...');
        if (allData.length === 0) {
            alert("No se encontraron datos para este negocio en el último año.");
            return [];
        }

        allData.sort((a, b) => new Date(a.date) - new Date(b.date));
        allBusinessDataCache = allData;
        
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(allData));
            console.log("Datos guardados en caché de sesión.");
        } catch (e) {
            console.warn("No se pudo guardar la caché de sesión.", e);
        }

        return allData;

    } catch (error) {
        alert(error.message);
        return null;
    } finally {
        UI.showLoading(false);
    }
}