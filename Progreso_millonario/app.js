// Variables globales
let currentBalance = 0;
let investedAmount = 0;

// Abrir/Cerrar Modales
document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').style.display = 'block';
});

document.getElementById('registerBtn').addEventListener('click', () => {
    // Simular registro y abrir dashboard
    document.getElementById('dashboardModal').style.display = 'block';
});

document.getElementById('investBtn').addEventListener('click', () => {
    document.getElementById('investModal').style.display = 'block';
});

// Cerrar modales al hacer clic en la "X"
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    });
});

// Seleccionar paquete de inversión (simulado)
document.querySelectorAll('.selectPackage').forEach(btn => {
    btn.addEventListener('click', function() {
        const amount = parseInt(this.parentElement.getAttribute('data-amount'));
        investedAmount += amount;
        currentBalance += amount;
        updateBalance();
        alert(`¡Inversión simulada de $${amount}!`);
        document.getElementById('investModal').style.display = 'none';
    });
});

// Actualizar saldo en el dashboard
function updateBalance() {
    document.getElementById('currentBalance').textContent = currentBalance;
}

// Simular ganancias cada 5 segundos (solo demo)
setInterval(() => {
    if (investedAmount > 0) {
        currentBalance += investedAmount * 0.01; // 1% de "ganancia"
        updateBalance();
    }
}, 5000);