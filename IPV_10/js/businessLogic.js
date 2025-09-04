// js/businessLogic.js

/**
 * Calcula las métricas derivadas para un solo producto.
 * @param {object} product - El objeto del producto del estado.
 * @returns {object} Un nuevo objeto de producto con las métricas calculadas.
 */
export function calculateProductMetrics(product) {
    const start = Number(product.start || 0);
    const entrada = Number(product.entrada || 0);
    const cost = Number(product.cost || 0);
    const price = Number(product.price || 0);
    
    const vendido = (typeof product.finales === 'number') ? Math.max(0, start + entrada - product.finales) : 0;
    const importe = vendido * price;
    const ganancias = importe - (vendido * cost);
    
    return { 
        ...product, 
        vendido, 
        importe, 
        ganancias 
    };
}

/**
 * Calcula los totales para todo el día a partir de los datos de la aplicación.
 * @param {object} appData - El objeto de estado completo de la aplicación.
 * @returns {object} Un objeto que contiene todos los totales calculados.
 */
export function calculateTotals(appData) {
    const { products = [], gastos = [] } = appData;
    const totals = {
        totalImporte: 0,
        totalGanancias: 0,
        totalStockCost: 0,
        totalStockValue: 0,
        gastosOperativos: 0,
        recogidas: 0,
    };

    const activeProducts = products.filter(p => p.isActive !== false);
    
    activeProducts.forEach(p => {
        const metrics = calculateProductMetrics(p);
        totals.totalImporte += metrics.importe;
        totals.totalGanancias += metrics.ganancias;
        const finales = typeof p.finales === 'number' ? p.finales : (p.start || 0);
        totals.totalStockCost += finales * (p.cost || 0);
        totals.totalStockValue += finales * (p.price || 0);
    });

    const activeGastos = gastos.filter(g => g.isActive !== false);
    activeGastos.forEach(g => {
        if (g.type === 'recogida') {
            totals.recogidas += g.amount || 0;
        } else {
            totals.gastosOperativos += g.amount || 0;
        }
    });

    totals.gananciaNetaOperativa = totals.totalGanancias - totals.gastosOperativos;
    totals.efectivoTeoricoCaja = totals.totalImporte - totals.gastosOperativos - totals.recogidas;

    return totals;
}