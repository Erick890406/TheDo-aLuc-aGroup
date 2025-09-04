// js/api.js

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwOTKlC63g0BhscBxTjkIStZsoy_Hr-7AlS4XXwHdWSyO1zsGBi01_NvsoJXhaBANY8/exec';

async function apiCall(body) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body),
            redirect: 'follow'
        });
        if (!response.ok) {
            throw new Error(`Error de red: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en apiCall:", error);
        throw error;
    }
}

export const ApiClient = {
    getBusinessList: () => apiCall({ action: 'getBusinessList' }),
    login: (businessName, password) => apiCall({ action: 'login', businessName, password }),
    createBusiness: (businessName, password, creationKey, adminEmail) => apiCall({ action: 'create', businessName, password, creationKey, adminEmail }),
    deleteBusiness: (businessName, creationKey) => apiCall({ action: 'deleteBusiness', businessName, creationKey }),
    getDailyData: (businessName, password, date) => apiCall({ action: 'getDailyData', businessName, password, date }),
    sync: (businessName, password, date, dataToSync) => apiCall({ action: 'sync', businessName, password, date, dataToSync }),
    
    // --- NUEVA FUNCIÓN OPTIMIZADA ---
    getHistoricalData: (businessName, password) => apiCall({ action: 'getHistoricalData', businessName, password }),
};