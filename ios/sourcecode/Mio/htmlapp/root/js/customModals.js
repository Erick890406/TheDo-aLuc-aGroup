// js/customModals.js

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';
    document.body.style.overflow = show ? 'hidden' : '';
}

export function showAlert(message, title = 'Alerta', options = {}) {
    return new Promise(resolve => {
        const modal = document.getElementById('alertModal');
        const titleEl = document.getElementById('alertTitle');
        const messageEl = document.getElementById('alertMessage');
        const okButton = document.getElementById('alertOkButton');
        
        if (!modal || !titleEl || !messageEl || !okButton) {
            console.error('Elementos del modal de alerta no encontrados.');
            alert(message); // Fallback
            return resolve();
        }

        modal.className = 'modal'; 
        if (options.className) {
            modal.classList.add(options.className);
        }

        titleEl.textContent = title;
        messageEl.innerHTML = message.replace(/\n/g, '<br>');

        const controller = new AbortController();
        const { signal } = controller;

        const closeHandler = () => {
            toggleModal('alertModal', false);
            if (options.className) {
                modal.classList.remove(options.className);
            }
            controller.abort();
            resolve();
        };
        
        okButton.addEventListener('click', closeHandler, { signal });
        modal.querySelector('.modal-backdrop').addEventListener('click', closeHandler, { signal });
        modal.querySelector('.close').addEventListener('click', closeHandler, { signal });

        toggleModal('alertModal', true);
        okButton.focus();
    });
}

export function showConfirm(message, title = 'Confirmación') {
    return new Promise(resolve => {
        const modal = document.getElementById('confirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const yesButton = document.getElementById('confirmYes');
        const noButton = document.getElementById('confirmNo');

        if (!modal || !titleEl || !messageEl || !yesButton || !noButton) {
            console.error('Elementos del modal de confirmación no encontrados.');
            return resolve(confirm(message)); // Fallback
        }

        titleEl.textContent = title;
        messageEl.textContent = message;

        const controller = new AbortController();
        const { signal } = controller;

        const cleanupAndResolve = (value) => {
            toggleModal('confirmModal', false);
            controller.abort();
            resolve(value);
        };

        yesButton.addEventListener('click', () => cleanupAndResolve(true), { signal });
        noButton.addEventListener('click', () => cleanupAndResolve(false), { signal });
        modal.querySelector('.modal-backdrop').addEventListener('click', () => cleanupAndResolve(false), { signal });
        modal.querySelector('.close').addEventListener('click', () => cleanupAndResolve(false), { signal });
        
        toggleModal('confirmModal', true);
        yesButton.focus();
    });
}

export function showPrompt(message, title = 'Entrada Requerida') {
    return new Promise(resolve => {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const messageEl = document.getElementById('promptMessage');
        const inputEl = document.getElementById('promptInput');
        const formEl = document.getElementById('promptForm');
        const cancelButton = document.getElementById('promptCancel');

        if (!modal || !titleEl || !messageEl || !inputEl || !formEl) {
            console.error('Elementos del modal de prompt no encontrados.');
            return resolve(prompt(message)); // Fallback
        }

        titleEl.textContent = title;
        messageEl.textContent = message;
        inputEl.value = '';

        const controller = new AbortController();
        const { signal } = controller;

        const cleanupAndResolve = (value) => {
            toggleModal('promptModal', false);
            controller.abort();
            resolve(value);
        };

        formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            cleanupAndResolve(inputEl.value);
        }, { signal });

        cancelButton.addEventListener('click', () => cleanupAndResolve(null), { signal });
        modal.querySelector('.modal-backdrop').addEventListener('click', () => cleanupAndResolve(null), { signal });
        modal.querySelector('.close').addEventListener('click', () => cleanupAndResolve(null), { signal });

        toggleModal('promptModal', true);
        inputEl.focus();
    });
}