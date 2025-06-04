// Variables globales
let investmentPlans = [];
let transactionHistory = [];
let totalCurrentAmount = 0;
let totalGain = 0;
let walletBalance = 0; // Saldo de la cartera
let lastSimulationTime = new Date(); // Marca de tiempo de última simulación

// Capturar elementos del DOM
const totalCurrentAmountElement = document.getElementById('totalCurrentAmount');
const totalGainElement = document.getElementById('totalGain');
const walletBalanceElement = document.getElementById('walletBalance');
const investmentPlansList = document.getElementById('investmentPlans');
const transactionTable = document.getElementById('transactionTable');
const confirmationModal = document.getElementById('confirmationModal');
const confirmPlanBtn = document.getElementById('confirmPlanBtn');
const cancelPlanBtn = document.getElementById('cancelPlanBtn');
const addFundsModal = document.getElementById('addFundsModal');
const closeAddFundsModalBtn = document.getElementById('closeAddFundsModalBtn');
const addFundsInput = document.getElementById('addFundsInput');
const confirmAddFundsBtn = document.getElementById('confirmAddFundsBtn');

// Modales a pantalla completa
const fullScreenChartModal = document.getElementById('fullScreenChartModal');
const openFullScreenChartModalBtn = document.getElementById('openFullScreenChartModalBtn');
const closeFullScreenChartModalBtn = document.getElementById('closeFullScreenChartModalBtn');
const fullScreenHistoryModal = document.getElementById('fullScreenHistoryModal');
const openFullScreenHistoryModalBtn = document.getElementById('openFullScreenHistoryModalBtn');
const closeFullScreenHistoryModalBtn = document.getElementById('closeFullScreenHistoryModalBtn');
const fullScreenTransactionTable = document.getElementById('fullScreenTransactionTable');

// Configuración del gráfico principal
const ctx = document.getElementById('investmentChart').getContext('2d');
const investmentChart = new Chart(ctx, {
    type: 'line', // Changed to line for visual smoothness
    data: {
        labels: [],
        datasets: [{
            label: 'Monto total de inversión',
            data: [],
            backgroundColor: 'rgba(126, 34, 206, 0.2)', // Semi-transparent purple
            borderColor: '#7e22ce', // Solid purple
            borderWidth: 2,
            tension: 0.4 // Add tension for smoother lines
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,  // Allow the chart to take up the modal's height
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#cbd5e1' // Match text color
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false // Remove grid lines
                },
                ticks: {
                    color: '#9ca3af' // Match text color
                }
            },
            y: {
                beginAtZero: false,
                grid: {
                    color: '#374151' // Darker grid lines
                },
                ticks: {
                    color: '#9ca3af' // Match text color
                }
            }
        }
    }
});

// Configuración del gráfico a pantalla completa
const fullScreenCtx = document.getElementById('fullScreenInvestmentChart').getContext('2d');
const fullScreenInvestmentChart = new Chart(fullScreenCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Monto total de inversión',
            data: [],
            backgroundColor: 'rgba(126, 34, 206, 0.2)',
            borderColor: '#7e22ce',
            borderWidth: 2,
            tension: 0.4
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    color: '#cbd5e1'
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: '#9ca3af'
                }
            },
            y: {
                beginAtZero: false,
                grid: {
                    color: '#374151'
                },
                ticks: {
                    color: '#9ca3af'
                }
            }
        }
    }
});

// Control del menú hamburguesa
const menuBtn = document.getElementById('menuBtn');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');

// Abrir el menú
menuBtn.addEventListener('click', () => {
    mobileMenu.classList.remove('hidden'); // Mostrar el menú
});

// Cerrar el menú
closeMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.add('hidden'); // Ocultar el menú
});

// Opcional: Cerrar el menú al hacer clic fuera de él
document.addEventListener('click', (event) => {
    if (!mobileMenu.contains(event.target) && !menuBtn.contains(event.target)) {
        mobileMenu.classList.add('hidden');
    }
});

// Cargar datos desde localStorage
function loadFromLocalStorage() {
    try {
        const savedData = JSON.parse(localStorage.getItem('investmentData')) || {};
        investmentPlans = savedData.investmentPlans || [];
        transactionHistory = savedData.transactionHistory || [];
        totalCurrentAmount = savedData.totalCurrentAmount || 0;
        totalGain = savedData.totalGain || 0;
        walletBalance = savedData.walletBalance || 0;
        lastSimulationTime = savedData.lastSimulationTime ? new Date(savedData.lastSimulationTime) : new Date();

        updateMainStats();
        updateInvestmentPlansList();
        updateTransactionHistory();
        simulateRealTimeGains(); // Calcular ganancias basadas en tiempo real
        updateChartData(); // update chart after load localStorage
    } catch (error) {
        console.error('Error cargando datos:', error);
        toastr.error('Hubo un problema cargando tus datos.');
        resetLocalStorage();
    }
}

// Guardar datos en localStorage
function saveToLocalStorage() {
    try {
        const dataToSave = {
            investmentPlans,
            transactionHistory,
            totalCurrentAmount,
            totalGain,
            walletBalance,
            lastSimulationTime: lastSimulationTime.toISOString()
        };
        localStorage.setItem('investmentData', JSON.stringify(dataToSave));
    } catch (error) {
        console.error('Error guardando datos:', error);
        toastr.error('Hubo un problema guardando tus datos.');
    }
}

// Simular ganancias basadas en tiempo real
function simulateRealTimeGains() {
    const now = new Date();
    const elapsedTime = now - lastSimulationTime;
    const daysPassed = Math.floor(elapsedTime / (1000 * 60 * 60 * 24));

    if (daysPassed > 0) {
        investmentPlans.forEach(plan => {
            if (plan.active) {
                const daysToProcess = Math.min(daysPassed, plan.daysRemaining);
                for (let i = 0; i < daysToProcess; i++) {
                    const dailyGain = plan.currentAmount * 0.02;
                    walletBalance += dailyGain;
                    totalGain += dailyGain;
                    plan.totalGain += dailyGain;
                    plan.currentAmount += dailyGain;
                    plan.daysRemaining--;
                    if (plan.daysRemaining === 0) {
                        plan.active = false;
                        walletBalance += plan.initialAmount;
                        totalCurrentAmount -= plan.initialAmount;
                        addTransaction(`Retorno de inversión del ${plan.name}`, plan.initialAmount);
                    }
                }
            }
        });
        lastSimulationTime = now;
        updateMainStats();
        updateInvestmentPlansList();
        saveToLocalStorage();
    }
}

// Actualizar lista de planes
function updateInvestmentPlansList() {
    investmentPlansList.innerHTML = '';
    investmentPlans.forEach(plan => {
        const progress = Math.min(30 - plan.daysRemaining, 30) / 30;
        const listItem = document.createElement('li');
        listItem.className = 'bg-gray-800 p-4 rounded-lg shadow-sm';
        listItem.innerHTML = `
      <h3 class="text-lg font-semibold text-purple-400">${plan.name}</h3>
      <p class="text-gray-300">Monto inicial: $${plan.initialAmount.toFixed(2)}</p>
      <p class="text-gray-300">Días restantes: ${plan.daysRemaining}</p>
      <div class="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
        <div class="h-full bg-purple-600" style="width: ${progress * 100}%;"></div>
      </div>
      <p class="text-yellow-400">Ganancia acumulada: $${plan.totalGain.toFixed(2)}</p>
      ${plan.active ? '<p class="text-green-400">Activo</p>' : '<p class="text-red-400">Finalizado</p>'}
    `;
        investmentPlansList.appendChild(listItem);
    });
}

// Agregar transacción
function addTransaction(action, amount, date = new Date().toLocaleString()) {
    transactionHistory.push({
        date,
        action,
        amount
    });
    updateTransactionHistory();
    updateChartData(); //Update all the charts
}

// Update chart with historical data
function updateChartData() {
    investmentChart.data.labels = [];
    investmentChart.data.datasets[0].data = [];
    fullScreenInvestmentChart.data.labels = [];
    fullScreenInvestmentChart.data.datasets[0].data = [];

    transactionHistory.forEach(tx => {
        investmentChart.data.labels.push(tx.date);
        investmentChart.data.datasets[0].data.push(tx.amount);

        fullScreenInvestmentChart.data.labels.push(tx.date);
        fullScreenInvestmentChart.data.datasets[0].data.push(tx.amount);
    });

    investmentChart.update();
    fullScreenInvestmentChart.update();
}

// Actualizar historial de transacciones
function updateTransactionHistory() {
    transactionTable.innerHTML = '';
    fullScreenTransactionTable.innerHTML = '';
    transactionHistory.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="p-3">${tx.date}</td><td class="p-3">${tx.action}</td><td class="p-3">$${tx.amount.toFixed(2)}</td>`;
        transactionTable.appendChild(row);

        const fullScreenRow = document.createElement('tr');
        fullScreenRow.innerHTML = `<td class="p-3">${tx.date}</td><td class="p-3">${tx.action}</td><td class="p-3">$${tx.amount.toFixed(2)}</td>`;
        fullScreenTransactionTable.appendChild(fullScreenRow);
    });
}

// Confirmar selección de plan
function confirmPlanSelection() {
    const amount = window.selectedPlanAmount;
    if (walletBalance >= amount) {
        const newPlan = {
            id: Date.now(),
            name: getPlanName(amount),
            initialAmount: amount,
            currentAmount: amount,
            totalGain: 0,
            daysRemaining: 30,
            active: true,
        };
        walletBalance -= amount;
        totalCurrentAmount += amount;
        investmentPlans.push(newPlan);
        updateMainStats();
        updateInvestmentPlansList();
        addTransaction(`Compra de ${newPlan.name}`, amount);
        saveToLocalStorage();
        closeConfirmationModal();
    }
}

// Inicializar aplicación
function initializeApp() {
    loadFromLocalStorage();

    // Eventos de selección de planes
    document.querySelectorAll('.select-plan').forEach(button => {
        button.addEventListener('click', () => openConfirmationModal(parseFloat(button.dataset.amount)));
    });

    // Eventos de modales
    confirmPlanBtn.addEventListener('click', confirmPlanSelection);
    cancelPlanBtn.addEventListener('click', closeConfirmationModal);
    closeAddFundsModalBtn.addEventListener('click', () => addFundsModal.classList.add('hidden'));
    confirmAddFundsBtn.addEventListener('click', addFundsToWallet);
    document.getElementById('openAddFundsModalBtn')?.addEventListener('click', () => addFundsModal.classList.remove('hidden'));

    // Modal de gráfico a pantalla completa
    openFullScreenChartModalBtn.addEventListener('click', () => {
        fullScreenChartModal.classList.remove('hidden');
        updateFullScreenChart();
    });
    closeFullScreenChartModalBtn.addEventListener('click', () => fullScreenChartModal.classList.add('hidden'));

    // Modal de historial a pantalla completa
    openFullScreenHistoryModalBtn.addEventListener('click', () => {
        fullScreenHistoryModal.classList.remove('hidden');
        loadFullScreenTransactionHistory();
    });
    closeFullScreenHistoryModalBtn.addEventListener('click', () => fullScreenHistoryModal.classList.add('hidden'));

    // Botón para reiniciar datos
    document.getElementById('resetLocalStorageBtn')?.addEventListener('click', resetLocalStorage);

     // Mobile menu button click (Chart)
    const mobileChartButton = document.querySelectorAll('#mobileMenu #openFullScreenChartModalBtn');
    mobileChartButton.forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent navigation
            mobileMenu.classList.add('hidden'); // Close mobile menu
            fullScreenChartModal.classList.remove('hidden'); // Open chart modal
            updateFullScreenChart(); // Update the chart with data
        });
    });

    // Mobile menu button click (History)
    const mobileHistoryButton = document.querySelectorAll('#mobileMenu #openFullScreenHistoryModalBtn');
    mobileHistoryButton.forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent navigation
            mobileMenu.classList.add('hidden'); // Close mobile menu
            fullScreenHistoryModal.classList.remove('hidden'); // Open history modal
            loadFullScreenTransactionHistory(); // Load transaction history
        });
    });
}

// Agregar fondos a la cartera
function addFundsToWallet() {
    const amount = parseFloat(addFundsInput.value);
    if (isNaN(amount) || amount <= 0) {
        toastr.error('Ingresa un monto válido.'); // use toastr
        return;
    }
    walletBalance += amount;
    updateMainStats();
    addTransaction('Recarga de cartera', amount);
    addFundsInput.value = '';
    addFundsModal.classList.add('hidden');
    saveToLocalStorage();
}

// Al cerrar la página
window.addEventListener('beforeunload', () => {
    simulateRealTimeGains();
    saveToLocalStorage();
});

// Funciones auxiliares
function getPlanName(amount) {
    switch (amount) {
        case 5000:
            return 'Plan Básico';
        case 10000:
            return 'Plan Intermedio';
        case 20000:
            return 'Plan Premium';
        default:
            return 'Plan Personalizado';
    }
}

function openConfirmationModal(amount) {
    if (walletBalance >= amount) {
        window.selectedPlanAmount = amount;
        confirmationModal.classList.remove('hidden');
    } else {
        toastr.error('Saldo insuficiente.'); // use toastr
    }
}

function closeConfirmationModal() {
    confirmationModal.classList.add('hidden');
    window.selectedPlanAmount = undefined;
}

function resetLocalStorage() {
    if (confirm('¿Estás seguro de que deseas eliminar todos los datos guardados?')) {
        investmentPlans = [];
        transactionHistory = [];
        totalCurrentAmount = 0;
        totalGain = 0;
        walletBalance = 0;
        updateMainStats();
        updateInvestmentPlansList();
        updateTransactionHistory();
        investmentChart.data.labels = [];
        investmentChart.data.datasets[0].data = [];
        investmentChart.update();
        localStorage.clear();
        toastr.success('Datos reiniciados correctamente.'); // use toastr
    }
}

function updateFullScreenChart() {
    if (investmentChart && fullScreenInvestmentChart) {
        fullScreenInvestmentChart.data.labels = investmentChart.data.labels.slice();
        fullScreenInvestmentChart.data.datasets[0].data = investmentChart.data.datasets[0].data.slice();
        fullScreenInvestmentChart.update();
    }
}

function loadFullScreenTransactionHistory() {
    const table = document.getElementById('fullScreenTransactionTable');
    table.innerHTML = ''; // Limpiar la tabla

    transactionHistory.forEach((tx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>${tx.date}</td>
      <td>${tx.action}</td>
      <td>$${tx.amount.toFixed(2)}</td>
    `;
        table.appendChild(row);
    });
}

function updateMainStats() {
    walletBalanceElement.textContent = walletBalance.toFixed(2);
    totalCurrentAmountElement.textContent = totalCurrentAmount.toFixed(2);
    totalGainElement.textContent = totalGain.toFixed(2);
}

// Inicialización
document.addEventListener('DOMContentLoaded', initializeApp);