// js/state.js
import { generateUUID } from './utils.js';

let appData = {};
let subscribers = [];

/**
 * StateManager ahora usa un patrón inmutable.
 * En lugar de modificar el estado existente (ej. appData.products.push(...)),
 * cada función de actualización crea una nueva versión del estado con los cambios.
 * Esto es más seguro y predecible.
 */
const StateManager = {
    subscribe(callback) {
        subscribers.push(callback);
    },

    _notify() {
        // Notificamos a los suscriptores con una copia profunda para evitar mutaciones accidentales.
        // structuredClone es más moderno y robusto que JSON.parse(JSON.stringify(...)).
        const stateCopy = structuredClone(appData);
        subscribers.forEach(callback => callback(stateCopy));
    },

    getState() {
        return structuredClone(appData);
    },

    setState(data) {
        appData = data || {};
        this._notify();
    },

    triggerUpdate() {
        this._notify();
    },
    
    updateProductFieldById(productId, field, value) {
        if (appData.isClosed) return;

        let parsedValue = value;
        if (field === 'finales') {
            parsedValue = value === '' ? null : Number(value);
        } else if (['start', 'entrada'].includes(field)) {
            parsedValue = Number(value) || 0;
        } else if (['cost', 'price'].includes(field)) {
            parsedValue = parseFloat(value) || 0;
        }
        
        const newProducts = (appData.products || []).map(p => {
            if (String(p.id) === String(productId)) {
                // Devolvemos un nuevo objeto producto con el campo actualizado
                return { ...p, [field]: parsedValue, lastModified: new Date().toISOString() };
            }
            return p;
        });

        // Reemplazamos el array de productos con el nuevo array
        appData = { ...appData, products: newProducts };
        this._notify();
    },

    addProduct(productDetails) {
        const { names, category, start, cost, price } = productDetails;
        
        const newProducts = names.map(name => {
            const startValue = Number(start) || 0;
            return {
                id: generateUUID(),
                name, category, 
                start: startValue, 
                cost: Number(cost) || 0, 
                price: Number(price) || 0,
                entrada: 0, 
                finales: startValue, 
                isActive: true,
                lastModified: new Date().toISOString()
            };
        });
        
        const currentProducts = appData.products || [];
        const updatedProducts = [...currentProducts, ...newProducts];
        
        const currentCategories = appData.categories || [];
        const updatedCategories = category && !currentCategories.includes(category)
            ? [...currentCategories, category]
            : currentCategories;
        
        appData = { ...appData, products: updatedProducts, categories: updatedCategories };
        this._notify();
    },

    addGasto(description, amount, type) {
        const newGasto = {
            id: generateUUID(),
            description, 
            amount,
            type: type || 'gasto',
            isActive: true,
            lastModified: new Date().toISOString()
        };
        const updatedGastos = [...(appData.gastos || []), newGasto];
        appData = { ...appData, gastos: updatedGastos };
        this._notify();
    },

    deleteProductById(productId) {
        const newProducts = (appData.products || []).map(p => {
            if (String(p.id) === String(productId)) {
                return { ...p, isActive: false, lastModified: new Date().toISOString() };
            }
            return p;
        });
        appData = { ...appData, products: newProducts };
        this._notify();
    },
    
    deleteSelectedProducts(idsToDelete) {
        const newProducts = (appData.products || []).map(p => {
            if (idsToDelete.has(String(p.id))) {
                return { ...p, isActive: false, lastModified: new Date().toISOString() };
            }
            return p;
        });
        appData = { ...appData, products: newProducts };
        this._notify();
    },

    deleteGastoById(gastoId) {
        const newGastos = (appData.gastos || []).map(g => {
            if (String(g.id) === String(gastoId)) {
                return { ...g, isActive: false, lastModified: new Date().toISOString() };
            }
            return g;
        });
        appData = { ...appData, gastos: newGastos };
        this._notify();
    },
    
    closeDay() {
        appData = { ...appData, isClosed: true };
        this._notify();
    },

    updateNotes(newNotes) {
        if (appData.notas !== newNotes) {
            appData = { ...appData, notas: newNotes };
            this._notify();
        }
    },
    
    updateUser(newUser) {
        appData = { ...appData, user: newUser };
        this._notify();
    },
    
    updateDiferenciaCaja(tipo, monto) {
        const montoVal = tipo === 'ninguna' ? 0 : parseFloat(monto) || 0;
        const newPredefinedNotes = {
            ...(appData.predefinedNotes || {}),
            diferenciaCaja: { tipo, monto: montoVal }
        };
        appData = { ...appData, predefinedNotes: newPredefinedNotes };
        this._notify();
    },

    updatePizzaCalcs(pizzaData) {
        const newPizzaCalcs = {
            ...pizzaData,
            lastModified: new Date().toISOString()
        };
        appData = { ...appData, pizzaCalcs: newPizzaCalcs };
        this._notify();
    }
};

export default StateManager;