import { ApiClient } from './api.js';

export function generateUUID() { 
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export function getAllHistoricalData(currentBusinessName) {
    const all = [];
    const prefix = `ipv_data_${currentBusinessName}_`;
    for (const key in localStorage) {
        if (key.startsWith(prefix)) {
            try {
                const date = key.replace(prefix, '');
                all.push({ date, data: JSON.parse(localStorage.getItem(key)) });
            } catch (e) {
                console.error(`Error parseando datos locales para ${key}`, e);
            }
        }
    }
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    return all;
}

export function getFilteredHistoricalData(startDate, endDate, currentBusinessName) {
    const allData = getAllHistoricalData(currentBusinessName);
    if (!startDate && !endDate) return allData;

    const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;
    
    return allData.filter(day => {
        const itemDate = new Date(day.date + 'T12:00:00Z');
        const isAfterStart = start ? itemDate >= start : true;
        const isBeforeEnd = end ? itemDate <= end : true;
        return isAfterStart && isBeforeEnd;
    });
}

export function normalizeData(data, businessName) {
    if (!data || !data.products) return data;

    const ID_MAP_KEY = `ipv_id_map_${businessName}`;
    let idMap = JSON.parse(localStorage.getItem(ID_MAP_KEY)) || {};
    let mapWasModified = false;

    const productConsolidationMap = new Map();

    data.products.forEach(p => {
        if (!p || !p.name) return;

        const isInvalidId = !p.id || typeof p.id !== 'string' || p.id.length < 15;
        let finalId = p.id;

        if (isInvalidId) {
            const oldIdKey = String(p.id);
            if (idMap[oldIdKey]) {
                finalId = idMap[oldIdKey];
            } else {
                const newId = generateUUID();
                idMap[oldIdKey] = newId;
                finalId = newId;
                mapWasModified = true;
            }
        }
        p.id = finalId;

        const existingProduct = productConsolidationMap.get(p.id);
        if (!existingProduct || new Date(p.lastModified || 0) > new Date(existingProduct.lastModified || 0)) {
            if (p.isActive === undefined) {
                p.isActive = true;
            }
            productConsolidationMap.set(p.id, p);
        }
    });

    if (mapWasModified) {
        localStorage.setItem(ID_MAP_KEY, JSON.stringify(idMap));
    }
    
    data.products = Array.from(productConsolidationMap.values());
    
    return data;
}

export async function createNewDayDataFromPrevious(Session) {
    const { businessName, password, currentDate } = Session;
    const prevDate = new Date(currentDate + "T12:00:00Z");
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);
    const prevDateString = prevDate.toISOString().split("T")[0];
    const prevStorageKey = `ipv_data_${businessName}_${prevDateString}`;
    let prevDayData = null;
    try { prevDayData = JSON.parse(localStorage.getItem(prevStorageKey)); } catch (e) {}
    
    if (!prevDayData && navigator.onLine && businessName !== "local_mode") {
        try {
            const response = await ApiClient.getDailyData(businessName, password, prevDateString);
            if (response.status === "success") prevDayData = response.data;
        } catch (e) {}
    }
    
    if (prevDayData && prevDayData.products) {
        const prods = prevDayData.products.filter(p => p.isActive !== false).map(p => {
            const finalValue = typeof p.finales === 'number' ? p.finales : (p.start || 0);
            return {
                ...p,
                start: finalValue,
                entrada: 0,
                finales: finalValue,
                lastModified: new Date().toISOString()
            };
        });
        
        return {
            products: prods,
            gastos: [],
            notas: "",
            user: prevDayData.user || "",
            categories: prevDayData.categories || [],
            predefinedNotes: {},
            pizzaCalcs: {},
            isClosed: false
        };
    }
    
    return {
        products: [],
        gastos: [],
        notas: "",
        user: "",
        categories: [],
        predefinedNotes: {},
        pizzaCalcs: {},
        isClosed: false
    };
}