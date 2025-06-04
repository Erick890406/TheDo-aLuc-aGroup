document.addEventListener('DOMContentLoaded', () => {
    const billInputs = document.querySelectorAll('.bills-container input[type="number"]');
    const totalDisplay = document.getElementById('total');
    const inactiveTotalDisplay = document.getElementById('inactiveTotal');
    const clearBtn = document.getElementById('clearBtn');
    const modal = document.getElementById('confirmModal');
    const closeModalBtn = modal.querySelector('.close');
    const confirmClearBtn = document.getElementById('confirmClear');
    const cancelClearBtn = document.getElementById('cancelClear');

    const formatCurrency = (value) => {
        return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function calculateTotals() {
        let total = 0;
        let inactiveTotal = 0;

        billInputs.forEach(input => {
            const container = input.closest('.bill-row');
            const toggle = container.querySelector('.bill-toggle');
            const billValue = parseInt(input.id.replace('bill', '')) || 0;
            const count = parseInt(input.value) || 0;
            const individualTotalEl = container.querySelector('.individual-total');
            const currentIndividualTotal = billValue * count;

            if (individualTotalEl) {
                individualTotalEl.textContent = formatCurrency(currentIndividualTotal);
            }

            if (toggle && toggle.checked) {
                total += currentIndividualTotal;
                container.classList.remove('inactive');
            } else if(toggle) {
                inactiveTotal += currentIndividualTotal;
                container.classList.add('inactive');
            }
        });

        totalDisplay.textContent = formatCurrency(total);
        inactiveTotalDisplay.textContent = formatCurrency(inactiveTotal);
    }

    function saveData() {
        billInputs.forEach(input => {
            try {
                localStorage.setItem(`billCounter_${input.id}`, input.value);
            } catch (e) {
                console.error("Error guardando en localStorage: ", e);
            }
        });
        document.querySelectorAll('.bill-toggle').forEach(toggle => {
             try {
                localStorage.setItem(`billCounter_${toggle.id}`, toggle.checked);
            } catch (e) {
                console.error("Error guardando en localStorage: ", e);
            }
        });
         console.log("Datos guardados.");
    }

    function loadData() {
         console.log("Cargando datos...");
        billInputs.forEach(input => {
             try {
                const savedValue = localStorage.getItem(`billCounter_${input.id}`);
                if (savedValue !== null) {
                    input.value = savedValue;
                } else {
                    input.value = 0; // Default to 0 if nothing saved
                }
            } catch (e) {
                console.error("Error cargando de localStorage: ", e);
                input.value = 0;
            }
        });
        document.querySelectorAll('.bill-toggle').forEach(toggle => {
            try {
                const toggleState = localStorage.getItem(`billCounter_${toggle.id}`);
                 // Default to checked (true) if nothing is saved
                toggle.checked = toggleState !== null ? (toggleState === 'true') : true;
            } catch (e) {
                 console.error("Error cargando de localStorage: ", e);
                 toggle.checked = true;
            }
        });
        calculateTotals(); // Calcular totales después de cargar
    }

    function clearAll() {
        if (confirm("¿Estás seguro de que deseas limpiar todos los contadores? Esto no se puede deshacer.")) {
            billInputs.forEach(input => {
                input.value = 0;
                 localStorage.removeItem(`billCounter_${input.id}`); // Limpiar storage también
            });
            document.querySelectorAll('.bill-toggle').forEach(toggle => {
                toggle.checked = true;
                localStorage.removeItem(`billCounter_${toggle.id}`); // Limpiar storage también
            });
            calculateTotals();
            console.log("Contadores limpiados.");
        }
    }

    function showModal() {
        modal.style.display = 'flex'; // <-- CAMBIAR A 'flex'
    }

    function hideModal() {
        modal.style.display = 'none'; // Esto ya debería estar correcto
    }

    // --- Event Listeners ---
    billInputs.forEach(input => {
        // Calcular al cambiar el valor
        input.addEventListener('input', () => {
            calculateTotals();
            saveData(); // Guardar en cada input
        });
        // Seleccionar todo al hacer clic para fácil edición
        input.addEventListener('click', (e) => e.target.select());
        // Guardar también al perder el foco (por si acaso)
        input.addEventListener('blur', saveData);
    });

    document.querySelectorAll('.bill-toggle').forEach(toggle => {
        toggle.addEventListener('change', () => {
            calculateTotals();
            saveData(); // Guardar estado del toggle
        });
    });

    clearBtn.addEventListener('click', showModal);
    closeModalBtn.addEventListener('click', hideModal);
    cancelClearBtn.addEventListener('click', hideModal);

    confirmClearBtn.addEventListener('click', () => {
         billInputs.forEach(input => {
            input.value = 0;
            localStorage.removeItem(`billCounter_${input.id}`);
        });
        document.querySelectorAll('.bill-toggle').forEach(toggle => {
            toggle.checked = true;
            localStorage.removeItem(`billCounter_${toggle.id}`);
        });
        calculateTotals();
        hideModal();
        console.log("Contadores limpiados vía modal.");
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            hideModal();
        }
    });

    // --- Initial Load ---
    loadData();

});