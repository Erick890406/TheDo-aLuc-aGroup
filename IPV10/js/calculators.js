// js/calculators.js
import StateManager from './state.js';
import { showAlert, showConfirm } from './customModals.js';

let billCounterHistory = [];
const MAX_HIST = 10;

export function initializeCalculators(ui) {
    initializeStandardCalculator();
    initializeBillCounter(ui);
    
    return {
        loadPizzaData: initializePizzaCalculator()
    };
}

function initializeStandardCalculator() {
    const modal = document.getElementById('calculatorModal');
    if (!modal) return;
    
    class Calculator {
        constructor(previousOperandEl, currentOperandEl) { 
            this.previousOperandEl = previousOperandEl; 
            this.currentOperandEl = currentOperandEl; 
            this.clear(); 
        }
        clear() { 
            this.currentOperand = ''; 
            this.previousOperand = ''; 
            this.operation = undefined; 
            this.updateDisplay(); 
        }
        delete() { 
            this.currentOperand = this.currentOperand.toString().slice(0, -1) || '0'; 
            this.updateDisplay(); 
        }
        appendNumber(number) { 
            if (number === '.' && this.currentOperand.includes('.')) return; 
            if (this.currentOperand === '0' && number !== '.') this.currentOperand = ''; 
            this.currentOperand += number.toString(); 
        }
        chooseOperation(operation) { 
            if (this.currentOperand === '') return; 
            if (this.previousOperand !== '') this.compute(); 
            this.operation = operation; 
            this.previousOperand = this.currentOperand; 
            this.currentOperand = ''; 
        }
        compute() {
            let computation; 
            const prev = parseFloat(this.previousOperand);
            const current = parseFloat(this.currentOperand);
            if (isNaN(prev) || isNaN(current)) return;
            switch (this.operation) {
                case '+': computation = prev + current; break; 
                case '-': computation = prev - current; break;
                case '×': computation = prev * current; break; 
                case '÷': computation = prev / current; break;
                default: return;
            }
            this.currentOperand = computation; 
            this.operation = undefined; 
            this.previousOperand = '';
        }
        getDisplayNumber(number) {
            const stringNumber = number.toString();
            const integerDigits = parseFloat(stringNumber.split('.')[0]);
            const decimalDigits = stringNumber.split('.')[1];
            let integerDisplay = isNaN(integerDigits) ? '' : integerDigits.toLocaleString('en', { maximumFractionDigits: 0 });
            return decimalDigits != null ? `${integerDisplay}.${decimalDigits}` : integerDisplay;
        }
        updateDisplay() {
            this.currentOperandEl.innerText = this.getDisplayNumber(this.currentOperand) || '0';
            this.previousOperandEl.innerText = this.operation != null ? `${this.getDisplayNumber(this.previousOperand)} ${this.operation}` : '';
        }
    }
    
    const calculator = new Calculator(modal.querySelector('#calcPrevious'), modal.querySelector('#calcCurrent'));
    modal.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
        const { action } = button.dataset; 
        const text = button.innerText;
        if (action === 'number') calculator.appendNumber(text); 
        else if (action === 'operator') calculator.chooseOperation(text);
        else if (action === 'equals') calculator.compute(); 
        else if (action === 'clear') calculator.clear();
        else if (action === 'delete') calculator.delete(); 
        calculator.updateDisplay();
    }));
}

function initializeBillCounter(ui) {
    const modal = document.getElementById('billCounterModal'); 
    if (!modal) return;
    
    const inputs = modal.querySelectorAll('input[type="number"]');
    const toggles = modal.querySelectorAll('.bill-toggle');

    loadBillCounterData();

    inputs.forEach(i => { 
        i.addEventListener('input', () => { 
            saveBillInput(i); 
            updateBillTotals(); 
        }); 
        i.addEventListener('click', () => i.select()); 
    });
    
    toggles.forEach(t => t.addEventListener('change', () => { 
        updateBillRowStyle(t); 
        saveBillToggle(t); 
        updateBillTotals(); 
    }));
}

export function handleBillCounterActions(action, ui) {
    switch(action) {
        case 'bc_save':
            saveBillHistory();
            break;
        case 'bc_history':
            showBillHistory(ui);
            break;
        case 'bc_clear_prompt':
            ui.toggleModal('bc_confirmModal', true);
            break;
        case 'bc_confirm_clear':
            clearBillCounter(ui);
            break;
        case 'bc_cancel_clear':
            ui.toggleModal('bc_confirmModal', false);
            break;
    }
}

function updateBillTotals() {
    const modal = document.getElementById('billCounterModal');
    if (!modal) return;
    
    let active = 0, inactive = 0;
    const inputs = modal.querySelectorAll('input[type="number"]');
    
    inputs.forEach(i => {
        const den = parseInt(i.id.replace('bc_bill', ''));
        const count = parseInt(i.value) || 0;
        const toggle = modal.querySelector(`#bc_toggle${den}`);
        const sub = den * count;
        modal.querySelector(`#bc_total${den}`).textContent = `$${sub.toLocaleString('es-MX')}`;
        if (toggle.checked) active += sub; else inactive += sub;
    });

    const grand = active + inactive;
    modal.querySelector('#bc_total').textContent = `Activos: $${active.toLocaleString('es-MX')}`;
    modal.querySelector('#bc_inactiveTotal').textContent = `Inactivos: $${inactive.toLocaleString('es-MX')}`;
    modal.querySelector('#bc_grandTotal').textContent = `Total: $${grand.toLocaleString('es-MX')}`;
    modal.querySelector('[data-action="bc_save"]').disabled = grand === 0;
}

function loadBillCounterData() {
    const modal = document.getElementById('billCounterModal');
    if (!modal) return;
    
    const inputs = modal.querySelectorAll('input[type="number"]');
    inputs.forEach(i => {
        i.value = localStorage.getItem(i.id) || '0';
        const toggle = modal.querySelector(`#bc_toggle${i.id.replace('bc_bill', '')}`);
        const savedState = localStorage.getItem(toggle.id);
        if (savedState !== null) toggle.checked = savedState === 'true';
        updateBillRowStyle(toggle);
    });
    
    billCounterHistory = JSON.parse(localStorage.getItem('billCounterHistory') || '[]');
    updateBillTotals();
}

function saveBillInput(inputElement) {
    localStorage.setItem(inputElement.id, inputElement.value);
}

function saveBillToggle(toggleElement) {
    localStorage.setItem(toggleElement.id, toggleElement.checked);
}

function updateBillRowStyle(toggle) {
    const row = document.getElementById(`bc_row${toggle.id.replace('bc_toggle', '')}`);
    if(row) row.classList.toggle('inactive', !toggle.checked);
}

function saveBillHistory() {
    const modal = document.getElementById('billCounterModal');
    if (!modal) return;
    
    const details = [];
    let active = 0, inactive = 0;
    const inputs = modal.querySelectorAll('input[type="number"]');

    inputs.forEach(i => {
        const den = parseInt(i.id.replace('bc_bill', ''));
        const count = parseInt(i.value) || 0;
        const toggle = modal.querySelector(`#bc_toggle${den}`);
        if (count > 0) details.push({ den, count, sub: den * count, isActive: toggle.checked });
        if (toggle.checked) active += den * count; else inactive += den * count;
    });

    if (details.length === 0) {
        showAlert("No hay nada que guardar.");
        return;
    }
    
    billCounterHistory.unshift({ id: Date.now(), date: new Date().toLocaleString('es-MX'), active, inactive, grand: active + inactive, details });
    if (billCounterHistory.length > MAX_HIST) billCounterHistory.pop();
    localStorage.setItem('billCounterHistory', JSON.stringify(billCounterHistory)); 
    showAlert('Conteo guardado.');
}

function showBillHistory(ui) {
    const list = document.getElementById('bc_historyList'); 
    list.innerHTML = billCounterHistory.length === 0 ? '<li>No hay historial.</li>' : '';
    billCounterHistory.forEach(e => {
        const li = document.createElement('li'); 
        li.dataset.id = e.id;
        li.innerHTML = `<span class="date">${e.date}</span><span class="total">$${e.grand.toLocaleString('es-MX')}</span>`;
        li.addEventListener('click', () => showBillDetail(e.id, ui)); 
        list.appendChild(li);
    });
    ui.toggleModal('bc_historyModal', true);
}

function showBillDetail(id, ui) {
    const entry = billCounterHistory.find(h => h.id.toString() === id.toString()); 
    if (!entry) return;
    const content = document.getElementById('bc_historyDetailContent');
    let rows = entry.details.map(d => `<tr><td>${d.isActive ? 'Activo' : 'Inactivo'}</td><td>$${d.den.toLocaleString('es-MX')}</td><td>${d.count}</td><td>$${d.sub.toLocaleString('es-MX')}</td></tr>`).join('');
    content.innerHTML = `<p><strong>Fecha:</strong> ${entry.date}</p><table><thead><tr><th>Estado</th><th>Denom.</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>${rows}</tbody></table><div class="detail-totals"><p><strong>Total Activo:</strong> $${entry.active.toLocaleString('es-MX')}</p><p><strong>Total Inactivo:</strong> $${entry.inactive.toLocaleString('es-MX')}</p><p><strong>Total General:</strong> $${entry.grand.toLocaleString('es-MX')}</p></div>`;
    ui.toggleModal('bc_historyDetailModal', true);
}

function clearBillCounter(ui) {
    const modal = document.getElementById('billCounterModal');
    if (!modal) return;

    const inputs = modal.querySelectorAll('input[type="number"]');
    const toggles = modal.querySelectorAll('.bill-toggle');
    
    inputs.forEach(i => { i.value = 0; localStorage.removeItem(i.id); });
    toggles.forEach(t => { t.checked = true; localStorage.removeItem(t.id); updateBillRowStyle(t); });
    
    updateBillTotals();
    ui.toggleModal('bc_confirmModal', false);
}

// --- LÓGICA REFACTORIZADA DE LA CALCULADORA DE PIZZAS ---

/**
 * Función pura que calcula todas las métricas de la pizza.
 * No interactúa con el DOM.
 * @param {object} inputs - Un objeto con todos los valores de los inputs.
 * @returns {object} Un objeto con todos los resultados calculados.
 */
function calculatePizzaMetrics(inputs) {
    const getVal = key => parseFloat(inputs[key]) || 0;

    const totalOtrosGastos = getVal('costoCarbon') + getVal('costoLevadura') + getVal('costoGrasa') + getVal('costoColor') + getVal('costoPolvoreo') + getVal('costoOtros');

    const calculos = { totalOtrosGastos };
    
    const inversionBasePizza = (getVal('jarrosHarina') * getVal('costoJarro')) + (getVal('librasQueso') * getVal('costoQueso')) + getVal('manoObra') + totalOtrosGastos;
    const ventasBasePizza = getVal('precioVenta') * getVal('cantidadPizzas');
    calculos.gananciaPizza = ventasBasePizza - inversionBasePizza;
    
    const inversionJamon = getVal('librasJamon') * getVal('costoJamon');
    const ventasJamon = getVal('cantidadPizzasJamon') * getVal('precioVentaJamon');
    calculos.gananciaJamon = ventasJamon - inversionJamon;
    
    const inversionSalchicha = getVal('unidadesSalchicha') * getVal('costoUnidadSalchicha');
    const ventasSalchicha = getVal('cantidadRacionesVendidas') * getVal('precioVentaRacion');
    calculos.gananciaSalchicha = ventasSalchicha - inversionSalchicha;
    
    calculos.inversionTotal = inversionBasePizza + inversionJamon + inversionSalchicha;
    calculos.ventasTotales = ventasBasePizza + ventasJamon + ventasSalchicha;
    calculos.gananciaTotalBruta = calculos.gananciaPizza + calculos.gananciaJamon + calculos.gananciaSalchicha;
    
    calculos.costoPorPizza = getVal('cantidadPizzas') > 0 ? inversionBasePizza / getVal('cantidadPizzas') : 0;
    calculos.pizzasPorLibraQueso = getVal('librasQueso') > 0 ? getVal('cantidadPizzas') / getVal('librasQueso') : 0;
    calculos.pizzasPorJarroHarina = getVal('jarrosHarina') > 0 ? getVal('cantidadPizzas') / getVal('jarrosHarina') : 0;
    
    return calculos;
}

/**
 * Función que renderiza los resultados de la pizza en el DOM.
 * @param {object} datos - El objeto de resultados de calculatePizzaMetrics.
 * @param {HTMLElement} destino - El contenedor para los resultados.
 */
function displayPizzaResults(datos, destino) {
    if (!destino) return;
    if (!datos || (!datos.inversionTotal && !datos.ventasTotales)) {
        destino.innerHTML = `<p class="hint-text">Rellena los campos para ver los resultados.</p>`;
        return;
    }
    const p = v => parseFloat(v || 0).toFixed(2);
    
    destino.innerHTML = `
        <div class="result-grid">
            <div class="total-box grand-total income"><h3>Ganancia Total Bruta</h3><p>$${p(datos.gananciaTotalBruta)}</p></div>
            <div class="total-box grand-total balance"><h3>Total Efectivo (Ventas)</h3><p>$${p(datos.ventasTotales)}</p></div>
            <div class="total-box grand-total expense"><h3>Inversión Total</h3><p>$${p(datos.inversionTotal)}</p></div>
        </div>
        <hr class="result-divider">
        <h4>Desglose de Ganancias</h4>
        <div class="result-grid">
            <div class="total-box small income"><h5>Ganancia (Pizza Base)</h5><p>$${p(datos.gananciaPizza)}</p></div>
            <div class="total-box small income"><h5>Ganancia (Jamón)</h5><p>$${p(datos.gananciaJamon)}</p></div>
            <div class="total-box small income"><h5>Ganancia (Salchicha)</h5><p>$${p(datos.gananciaSalchicha)}</p></div>
        </div>
        <hr class="result-divider">
        <h4>Métricas por Pizza</h4>
        <div class="result-grid">
            <div class="total-box small expense"><h5>Costo por Pizza</h5><p>$${p(datos.costoPorPizza)}</p></div>
            <div class="total-box small info"><h5>Pizzas / Lb Queso</h5><p>${p(datos.pizzasPorLibraQueso)}</p></div>
            <div class="total-box small info"><h5>Pizzas / Jarro Harina</h5><p>${p(datos.pizzasPorJarroHarina)}</p></div>
        </div>`;
}

/**
 * Función que renderiza el resumen de la pizza en el DOM.
 * @param {object} datos - El objeto de resultados de calculatePizzaMetrics.
 * @param {HTMLElement} destino - El contenedor para el resumen.
 */
function displayPizzaSummaryPreview(datos, destino) {
    if (!destino) return;
    if (!datos || (!datos.inversionTotal && !datos.ventasTotales && !datos.gananciaTotalBruta)) {
        destino.innerHTML = '';
        return;
    }
    const p = v => parseFloat(v || 0).toFixed(2);
    
    destino.innerHTML = `
        <div class="summary-preview-item income"><span>Ganancia</span><strong>$${p(datos.gananciaTotalBruta)}</strong></div>
        <div class="summary-preview-item balance"><span>Ventas</span><strong>$${p(datos.ventasTotales)}</strong></div>
        <div class="summary-preview-item expense"><span>Inversión</span><strong>$${p(datos.inversionTotal)}</strong></div>`;
}

function initializePizzaCalculator() {
    const section = document.getElementById('pizza-calculator-section');
    if (!section) return () => {};

    const inputElements = [...section.querySelectorAll('input[type="number"]')].reduce((obj, input) => {
        obj[input.id.replace('pizza-', '')] = input;
        return obj;
    }, {});
    
    const totalGastosPEl = document.querySelector('#pizza-total-gastos p');
    const resultsContainer = document.querySelector('#pizza-results-container');
    const summaryPreviewEl = document.querySelector('#pizza-summary-preview');

    const readInputsFromDOM = () => Object.keys(inputElements).reduce((obj, key) => {
        obj[key] = inputElements[key].value;
        return obj;
    }, {});

    function orchestrateCalculationAndDisplay() {
        const inputsData = readInputsFromDOM();
        const results = calculatePizzaMetrics(inputsData);
        
        if (totalGastosPEl) {
            totalGastosPEl.textContent = `$${results.totalOtrosGastos.toFixed(2)}`;
        }
        displayPizzaResults(results, resultsContainer);
        displayPizzaSummaryPreview(results, summaryPreviewEl);
        
        return { inputs: inputsData, results };
    }

    function calculateAndSave() {
        const { inputs, results } = orchestrateCalculationAndDisplay();
        StateManager.updatePizzaCalcs({ inputs, results });
    }

    async function clearPizzaForm() {
        const confirmed = await showConfirm("¿Borrar todos los campos de la calculadora de pizzas?");
        if (confirmed) {
            for (const key in inputElements) {
                if(inputElements[key]) inputElements[key].value = '';
            }
            calculateAndSave();
        }
    }
    
    document.getElementById('pizza-clear-btn')?.addEventListener('click', clearPizzaForm);
    Object.values(inputElements).forEach(input => input.addEventListener('input', calculateAndSave));
    
    ['jamon', 'salchicha'].forEach(type => {
        const toggleButton = document.getElementById(`pizza-toggle-${type}`);
        const contentSection = document.getElementById(`pizza-${type}-section`);
        if (toggleButton && contentSection) {
            toggleButton.addEventListener('click', e => {
                const btn = e.currentTarget;
                const isOpen = contentSection.style.display !== 'none';
                contentSection.style.display = isOpen ? 'none' : 'block';
                btn.classList.toggle('active', !isOpen);
            });
        }
    });

    return (appData) => {
        const pizzaData = appData.pizzaCalcs;
        for (const key in inputElements) {
            if (inputElements[key]) {
                 inputElements[key].value = (pizzaData?.inputs?.[key]) || '';
            }
        }
        orchestrateCalculationAndDisplay();
    };
}