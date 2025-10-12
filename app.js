// ================ CONFIGURACIÓN Y CONSTANTES ========================
const GOOGLE_SCRIPT_URL_USER = 'https://script.google.com/macros/s/AKfycbzLbpczFxO0BTgLuHXb5IAWIteIO5Ycr1xmTwDj775LCpxjEhoI-6-ir0mjbJVJ7qsGOw/exec'; // ¡IMPORTANTE! Actualiza esta URL.
const LOGGED_IN_CLIENT_KEY = 'cafeteriaVipClientLoggedIn_v11';
const USER_CART_KEY = 'cafeteriaUserCart_v8';
const PRESENTATION_VIDEO_SHOWN_KEY = 'presentationVideoShown_v2';
const SEEN_MESSAGE_TIMESTAMP_KEY = 'seenGlobalMessageTimestamp_v2';

const REFERRAL_POINTS_FOR_REFERRER = 15;
const REFERRAL_POINTS_FOR_REFEREE = 15;
const GRANDPARENT_REFERRAL_BONUS = 5;
const ANCESTOR_REFERRAL_BONUS = 1;

const AVATAR_GALLERY_IMAGES = [
    'https://i.postimg.cc/DZJmXb0N/Caricature1.png', 'https://i.postimg.cc/NM9LHrFz/Caricature2.png',
    'https://i.postimg.cc/76Gb2Thc/Caricature3.png', 'https://i.postimg.cc/mDzhHFkJ/Caricature4.png',
    'https://i.postimg.cc/sXQ1hZ1x/Caricature5.png', 'https://i.postimg.cc/76FhMYTq/Caricature6.png',
    'https://i.postimg.cc/V6xvBLbs/Caricature7.png', 'https://i.postimg.cc/RFkhQVnZ/Caricature8.png',
    'https://i.postimg.cc/L5YwqF6J/Caricature9.png', 'https://i.postimg.cc/135z38H1/Caricature10.png',
    'https://i.postimg.cc/L6Sg3M0R/Caricature11.png', 'https://i.postimg.cc/J0bZVXjD/Caricature12.png'
];

// ================ GESTOR DE SONIDOS (NUEVO) ========================
const SoundManager = {
    sounds: {},
    isMuted: true, // Empezar silenciado por defecto es buena práctica
    volume: 0.3,   // Volumen bajo para que sea sutil

    init() {
        // Cargar el estado de silencio desde el almacenamiento local
        const savedMuteState = localStorage.getItem('appMuted');
        this.isMuted = savedMuteState ? JSON.parse(savedMuteState) : true;
        
        // El navegador bloquea el audio hasta la primera interacción del usuario.
        // Creamos un listener que se ejecuta UNA SOLA VEZ para "desbloquear" el audio.
        document.body.addEventListener('click', this.unlockAudio.bind(this), { once: true });
        document.body.addEventListener('touchend', this.unlockAudio.bind(this), { once: true });
    },

    unlockAudio() {
        console.log('Audio context unlocked by user interaction.');
        this.preloadSounds();
    },

    preloadSounds() {
        const soundFiles = {
            'click': './sounds/click.mp3',
            'success': './sounds/success.mp3',
            'notification': './sounds/notification.mp3',
            'error': './sounds/error.mp3'
        };

        for (const key in soundFiles) {
            this.sounds[key] = new Audio(soundFiles[key]);
            this.sounds[key].volume = this.volume;
        }
        console.log('Sounds preloaded.');
    },

    playSound(soundName) {
        if (!this.isMuted && this.sounds[soundName]) {
            // Reinicia el audio para poder reproducirlo rápidamente en sucesión
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => console.error("Error playing sound:", e));
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('appMuted', JSON.stringify(this.isMuted));
        updateMuteButtonIcon(); // Actualizar la UI del botón
        // Toca un sonido para dar feedback del cambio
        if (!this.isMuted) {
            this.playSound('notification');
        }
    }
};

// ================ VARIABLES GLOBALES ========================
let clientData = null;
let menuItems = [];
let availableRewards = [];
let shoppingCart = [];
let currentFilterCategory = 'all';
let currentSortOption = 'default';
let deferredPrompt;
let initialReferralCode = null;

// Instancias de Modales
let authModalInstance, cartModalInstance, productDetailModalInstance, sharePageModalInstance, avatarGalleryModalInstance, helpModalInstance;
let presentationVideoModalInstance, globalMessageModalInstance;

// Elementos de UI cacheados
const loadingSpinnerUser = document.getElementById('loadingSpinnerUser');
let floatingCartButtonEl, floatingCartCountEl;

// ================ INICIALIZACIÓN ========================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Inicializando aplicación v3.2 con Sonidos...');
    SoundManager.init();
    
    floatingCartButtonEl = document.getElementById('floatingCartButton');
    floatingCartCountEl = document.getElementById('floating-cart-count');
    
    handleInitialReferral();
    initializeModals();
    
    loadClientDataFromStorage();
    loadCartFromStorage();
    updateClientDisplayAndUI();
    
    setupEventListeners();
    setupSearchAndSort();
    setupPWA();
    setupVipCardInteraction();
    populateAvatarGallery();
    initializeShareModal();
    setupNavbarToggler();
    updateMuteButtonIcon();

    await loadInitialData();

    if (!localStorage.getItem(PRESENTATION_VIDEO_SHOWN_KEY)) {
        presentationVideoModalInstance?.show();
        localStorage.setItem(PRESENTATION_VIDEO_SHOWN_KEY, 'true');
    }
    
    console.log('Aplicación inicializada correctamente.');
});

function initializeModals() {
    const modalIds = ['authModal', 'cartModal', 'productDetailModal', 'sharePageModal', 'avatarGalleryModal', 'helpModal', 'presentationVideoModal', 'globalMessageModal'];
    const instances = {};
    modalIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            instances[id + 'Instance'] = new bootstrap.Modal(el);
        }
    });
    ({ authModalInstance, cartModalInstance, productDetailModalInstance, sharePageModalInstance, avatarGalleryModalInstance, helpModalInstance, presentationVideoModalInstance, globalMessageModalInstance } = instances);
}

function handleInitialReferral() {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
        initialReferralCode = refCode.trim();
        showGlobalFeedback(`¡Código de referido detectado! Recibirás ${REFERRAL_POINTS_FOR_REFEREE} puntos extra.`, 'success', 5000);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ================ AUTENTICACIÓN Y USUARIO ======================
function loadClientDataFromStorage() {
    const storedClientData = localStorage.getItem(LOGGED_IN_CLIENT_KEY);
    try {
        clientData = storedClientData ? JSON.parse(storedClientData) : null;
    } catch (e) {
        clientData = null;
        console.error('Error cargando datos del cliente:', e);
        localStorage.removeItem(LOGGED_IN_CLIENT_KEY);
    }
}

function updateClientDisplayAndUI() {
    const vipCard = document.getElementById('vip-card-container');
    const guestPrompt = document.getElementById('guest-prompt');
    const authNav = document.getElementById('auth-buttons-nav');
    const logoutNav = document.getElementById('logoutButtonNav');
    const adminTab = document.getElementById('admin-tab');

    if (clientData && clientData.id) {
        document.getElementById('client-name').textContent = clientData.nombre || 'Cliente VIP';
        document.getElementById('client-points').textContent = clientData.puntos || 0;
        document.getElementById('user-avatar').src = clientData.avatarurl || 'https://i.postimg.cc/DZJmXb0N/Caricature1.png';
        authNav.innerHTML = `<span class="navbar-text me-2 small">Hola, ${clientData.nombre ? clientData.nombre.split(' ')[0] : 'VIP'}</span>`;
        logoutNav.style.display = 'inline-block';
        vipCard.style.display = 'block';
        guestPrompt.style.display = 'none';
        
        if (clientData.referralcode) {
            document.getElementById('clientReferralCode').textContent = clientData.referralcode;
            document.getElementById('client-referral-code-container').style.display = 'flex';
        }

        // Lógica para mostrar la pestaña de Admin
        if (clientData.role === 'admin') {
            adminTab.style.display = 'block';
        } else {
            adminTab.style.display = 'none';
        }

    } else {
        vipCard.style.display = 'none';
        guestPrompt.style.display = 'block';
        authNav.innerHTML = `
            <button class="btn btn-sm btn-outline-primary me-2" onclick="openAuthModal('login')"><i class="bi bi-box-arrow-in-right"></i> Login</button>
            <button class="btn btn-sm btn-warning" onclick="openAuthModal('register')"><i class="bi bi-person-plus"></i> Registro</button>`;
        logoutNav.style.display = 'none';
        adminTab.style.display = 'none'; // Ocultar si no está logueado
        
        // Limpiar vistas de usuario
        document.getElementById('orders-history-container').innerHTML = `<div class="col-12 text-center p-5"><p class="fs-5">Inicia sesión para ver tus envíos.</p></div>`;
        document.getElementById('referrals-dashboard-container').innerHTML = `<div class="col-12 text-center p-5"><p class="fs-5">Inicia sesión para ver tu panel de referidos.</p></div>`;
        document.getElementById('referral-tree-container').style.display = 'none';
    }
    updateCartDisplay();
}

function openAuthModal(tab = 'login') {
    authModalInstance?.show();
    const tabBtn = document.getElementById(tab === 'register' ? 'register-tab-btn' : 'login-tab-btn');
    if (tabBtn) new bootstrap.Tab(tabBtn).show();
    
    if (tab === 'register') {
        applyReferralCodeToForm();
    }
}

function applyReferralCodeToForm() {
    if (initialReferralCode) {
        const refInput = document.getElementById('newUserReferralCodeUsed');
        if(refInput) {
            refInput.value = initialReferralCode;
            refInput.readOnly = true;
            document.getElementById('referral-code-feedback').style.display = 'block';
        }
    }
}

async function handleLoginAttempt() {
    const telefono = document.getElementById('loginPhone').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!telefono || !password) {
        showFeedbackInModal(null, "login-feedback", "Teléfono y contraseña son requeridos.", "danger");
        return;
    }
    
    showFeedbackInModal(null, "login-feedback", '<div class="spinner-border spinner-border-sm me-2"></div>Iniciando sesión...', "info", null);
    
    const result = await callApi("loginUser", { telefono, password });
    
    if (result.success && result.data) {
        clientData = result.data;
        localStorage.setItem(LOGGED_IN_CLIENT_KEY, JSON.stringify(clientData));
        
        showFeedbackInModal(null, "login-feedback", `¡Bienvenido, ${clientData.nombre.split(' ')[0]}!`, "success", 3000);
        
        setTimeout(() => {
            authModalInstance?.hide();
            updateClientDisplayAndUI(); // Actualiza la UI para mostrar la pestaña de admin si es necesario
            loadUserOrders(); 
            loadReferralDashboard();
            generateRewardsList();
        }, 1500);
    } else {
        showFeedbackInModal(null, "login-feedback", result.message || "Error: Credenciales incorrectas.", "danger");
    }
}

async function handleUserRegistrationAttempt() {
    const nombre = document.getElementById('newUserName').value.trim();
    const telefono = document.getElementById('newUserPhone').value.trim();
    const email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    const password = document.getElementById('newUserPassword').value;
    const confirmPassword = document.getElementById('newUserConfirmPassword').value;
    const referralCodeUsed = document.getElementById('newUserReferralCodeUsed').value.trim();
    
    if (!nombre || !telefono || !password || !confirmPassword) {
        return showFeedbackInModal(null, "registration-feedback", "Todos los campos con * son requeridos.", "danger");
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return showFeedbackInModal(null, "registration-feedback", "Por favor, introduce un email válido.", "danger");
    }
    if (password.length < 6) {
        return showFeedbackInModal(null, "registration-feedback", "La contraseña debe tener al menos 6 caracteres.", "danger");
    }
    if (password !== confirmPassword) {
        return showFeedbackInModal(null, "registration-feedback", "Las contraseñas no coinciden.", "danger");
    }
    
    showFeedbackInModal(null, "registration-feedback", '<div class="spinner-border spinner-border-sm me-2"></div>Registrando...', "info", null);
    
    const result = await callApi("registerNewUser", { nombre, telefono, email, password, referralCodeUsed });
    
    if (result.success) {
        showFeedbackInModal(null, "registration-feedback", `${result.message || '¡Registro exitoso!'} Ahora puedes iniciar sesión.`, "success", 4000);
        document.getElementById('newUserRegistrationForm').reset();
        setTimeout(() => bootstrap.Tab.getOrCreateInstance(document.getElementById('login-tab-btn')).show(), 3000);
    } else {
        showFeedbackInModal(null, "registration-feedback", result.message || "Error al registrar. El teléfono ya puede existir.", "danger");
    }
}

function logoutClient() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        clientData = null;
        shoppingCart = [];
        localStorage.removeItem(LOGGED_IN_CLIENT_KEY);
        localStorage.removeItem(USER_CART_KEY);
        showGlobalFeedback('Sesión cerrada correctamente.', 'info');
        updateClientDisplayAndUI();
    }
}

// ================ AVATAR ========================
function populateAvatarGallery() {
    const galleryContainer = document.getElementById('avatar-gallery');
    if (!galleryContainer) return;
    galleryContainer.innerHTML = AVATAR_GALLERY_IMAGES.map(imageUrl => 
        `<img src="${imageUrl}" alt="Avatar" class="gallery-avatar" loading="lazy" onclick="selectAvatar('${imageUrl}')">`
    ).join('');
}

async function selectAvatar(imageUrl) {
    if (!clientData || !clientData.id) {
        showGlobalFeedback("Inicia sesión para cambiar tu avatar.", "warning");
        return;
    }
    
    document.getElementById('user-avatar').src = imageUrl;
    const oldAvatarUrl = clientData.avatarurl;
    clientData.avatarurl = imageUrl;
    localStorage.setItem(LOGGED_IN_CLIENT_KEY, JSON.stringify(clientData));
    
    avatarGalleryModalInstance?.hide();
    showGlobalFeedback('Avatar actualizado. Guardando cambios...', 'info');

    const result = await callApi('updateClientAvatarUrl', { clientId: clientData.id, newAvatarUrl: imageUrl });
    
    if (result.success && result.data) {
        clientData = result.data; // Actualiza con los datos del servidor
        localStorage.setItem(LOGGED_IN_CLIENT_KEY, JSON.stringify(clientData));
        showGlobalFeedback('¡Tu nuevo avatar ha sido guardado!', 'success');
    } else {
        showGlobalFeedback('Error al guardar el avatar. Se restaurará.', 'danger');
        clientData.avatarurl = oldAvatarUrl;
        localStorage.setItem(LOGGED_IN_CLIENT_KEY, JSON.stringify(clientData));
        document.getElementById('user-avatar').src = oldAvatarUrl;
    }
}

// ================ CARRITO Y COMPRA ========================
function loadCartFromStorage() {
    const storedCart = localStorage.getItem(USER_CART_KEY);
    shoppingCart = storedCart ? JSON.parse(storedCart) || [] : [];
    updateCartDisplay();
}

function saveCartToStorage() {
    localStorage.setItem(USER_CART_KEY, JSON.stringify(shoppingCart));
}

function updateCartDisplay() {
    let totalItems = shoppingCart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (floatingCartButtonEl && floatingCartCountEl) {
        const shouldBeVisible = totalItems > 0 && clientData && clientData.id;
        floatingCartButtonEl.style.display = shouldBeVisible ? 'flex' : 'none';
        floatingCartCountEl.textContent = totalItems;
    }
}

function addToCart(productId) {
    if (!clientData || !clientData.id) {
        SoundManager.playSound('error'); // Sonido de error si no hay sesión
        showGlobalFeedback('Inicia sesión para añadir productos.', 'warning');
        return openAuthModal('login');
    }
    
    const product = menuItems.find(item => item.id === productId);
    if (!product) {
        SoundManager.playSound('error'); // <-- AÑADIDO: Sonido de error si el producto no existe
        return showGlobalFeedback("Producto no encontrado.", "danger");
    }
    
    const existingItem = shoppingCart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        shoppingCart.push({
            productId: product.id, name: product.name,
            price: parseFloat(product.price) || 0, quantity: 1,
            points: parseInt(product.points) || 0
        });
    }
    
    saveCartToStorage();
    updateCartDisplay();
    showGlobalFeedback(`${product.name} añadido a tu envío!`, 'success', 2000);
    SoundManager.playSound('success'); // <-- AÑADIDO: Sonido de éxito al añadir al carrito
}


function renderCartItems() {
    const wrapper = document.getElementById('cart-content-wrapper');
    if (!wrapper) return;

    if (shoppingCart.length === 0) {
        wrapper.innerHTML = `<div class="cart-empty-state"><i class="bi bi-cart-x cart-empty-icon"></i><p>Tu carrito está vacío.</p></div>`;
        return;
    }

    let total = 0;
    const itemsHtml = shoppingCart.map(item => {
        total += item.price * item.quantity;
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">USD ${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div class="cart-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', -1)" aria-label="Disminuir cantidad">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', 1)" aria-label="Aumentar cantidad">+</button>
                </div>
                <button class="remove-btn" onclick="removeFromCart('${item.productId}')" aria-label="Eliminar producto"><i class="bi bi-x-lg"></i></button>
            </div>
        `;
    }).join('');

    wrapper.innerHTML = `
        <div class="cart-items-container">${itemsHtml}</div>
        <div class="cart-summary">
            <div class="cart-total">
                <span class="cart-total-label">Total a Pagar:</span>
                <span class="cart-total-amount">USD ${total.toFixed(2)}</span>
            </div>
            <div class="cart-actions">
                <button class="btn btn-outline-danger" onclick="clearCart()">Vaciar Carrito</button>
                <button class="btn btn-success" onclick="confirmAndPlaceOrder()">Confirmar y Pagar con Zelle</button>
            </div>
        </div>
    `;
}

function updateCartQuantity(productId, change) {
    const itemInCart = shoppingCart.find(item => item.productId === productId);
    if (itemInCart) {
        itemInCart.quantity += change;
        if (itemInCart.quantity <= 0) {
            shoppingCart = shoppingCart.filter(item => item.productId !== productId);
        }
    }
    saveCartToStorage();
    renderCartItems();
    updateCartDisplay();
}

function removeFromCart(productId) {
    shoppingCart = shoppingCart.filter(item => item.productId !== productId);
    saveCartToStorage();
    renderCartItems();
    updateCartDisplay();
    showGlobalFeedback("Producto eliminado.", "info", 1500);
}

function clearCart() {
    if (shoppingCart.length > 0) {
        shoppingCart = [];
        saveCartToStorage();
        renderCartItems();
        updateCartDisplay();
        showGlobalFeedback('Carrito vaciado.', 'info');
    }
}

async function confirmAndPlaceOrder() {
    if (shoppingCart.length === 0) return showGlobalFeedback('El carrito está vacío.', 'warning');
    if (!clientData || !clientData.id) return openAuthModal('login');

    showGlobalFeedback('Procesando tu envío...', 'info', 5000); 
    
    const cartPayload = shoppingCart.map(item => ({
        productId: String(item.productId),
        quantity: item.quantity,
    }));

    const result = await callApi('placeOrder', { 
        clientId: String(clientData.id), 
        cartItems: cartPayload 
    });

    if (result.success && result.data) {
        const orderId = result.data.orderId;
        const orderTotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let productList = "*Resumen de mi pedido:*\n";
        shoppingCart.forEach(item => {
            productList += `- ${item.quantity}x ${item.name} ($${(item.price * item.quantity).toFixed(2)})\n`;
        });
        const whatsappMessage = `¡Hola! 👋 Acabo de realizar un nuevo pedido en la App DL Cumanayagua.\n*Número de Pedido:* ${orderId.slice(-6)}\n\n${productList}\n*----------------------*\n*Total a Pagar:* *$${orderTotal.toFixed(2)} USD*\n\nQuisiera coordinar el pago por Zelle. ¡Gracias!`;
        const whatsappUrl = `https://wa.me/5355189657?text=${encodeURIComponent(whatsappMessage)}`;

        // Mostramos el feedback DENTRO del wrapper del contenido del carrito
        const cartContentWrapper = document.getElementById('cart-content-wrapper');
        if (cartContentWrapper) {
            cartContentWrapper.innerHTML = `
                <div class="alert alert-success text-center m-3">
                    <h4><i class="bi bi-check-circle-fill"></i> ¡Envío Registrado!</h4>
                    <p>Tu pedido <strong>#${orderId.slice(-6)}</strong> ha sido creado exitosamente.</p>
                    <p class="mb-3">Por favor, contáctanos por WhatsApp para coordinar el pago y la entrega.</p>
                    <a href="${whatsappUrl}" target="_blank" class="btn btn-success btn-lg w-100" onclick="handleWhatsAppNotification()">
                        <i class="bi bi-whatsapp me-2"></i>Notificar por WhatsApp
                    </a>
                </div>`;
        }
        
        document.getElementById('order-placement-feedback').innerHTML = '';
        
        shoppingCart = [];
        saveCartToStorage();
        updateCartDisplay();

    } else {
        showGlobalFeedback(result.message || 'Error al procesar el pedido. Intenta de nuevo.', 'danger');
        document.getElementById('order-placement-feedback').innerHTML = `
            <div class="alert alert-danger m-3">
                <h4>Error al registrar el envío</h4>
                <p>${result.message || 'Ocurrió un problema con el servidor. Por favor, intenta más tarde.'}</p>
            </div>`;
    }
}

function handleWhatsAppNotification() {
    setTimeout(() => {
        document.getElementById('order-placement-feedback').innerHTML = '';
        renderCartItems(); 
        if (clientData) {
            loadUserOrders(); 
        }
    }, 1000); 
}

// ================ DATOS Y API ========================
async function loadInitialData() {
    showGlobalFeedback('Cargando datos...', 'info');
    try {
        const res = await callApi("getInitialClientData");
        if (res.success && res.data) {
            menuItems = (res.data.products || []).map(p => ({ ...p, price: parseFloat(p.price) || 0, points: parseInt(p.points) || 0, id: String(p.id), category: p.category || "Otros" }));
            availableRewards = (res.data.rewards || []).map(r => ({ ...r, rewardid: String(r.rewardid), pointsrequired: parseInt(r.pointsrequired) || 0, stock: parseInt(r.stock) }));
            
            generatePopularItems();
            generateCategoryFilters();
            generateMenu();
            generateRewardsList();

            showGlobalFeedback('Datos cargados', 'success', 2000);
        } else {
            throw new Error(res.message || 'Error del servidor');
        }
    } catch (error) {
        showGlobalFeedback("Error al cargar datos: " + error.message, "danger");
        menuItems = []; availableRewards = [];
        generateMenu(); generateRewardsList();
    }
}

async function callApi(action, payload = {}) {
    loadingSpinnerUser?.classList.add('show');
    try {
        const formBody = new URLSearchParams();
        formBody.append("data", JSON.stringify({ action, payload }));
        const response = await fetch(GOOGLE_SCRIPT_URL_USER, { method: 'POST', body: formBody });
        if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`API Call Error (${action}):`, error);
        showGlobalFeedback(`Error de conexión: ${error.message}.`, "danger", 7000);
        return { success: false, message: `Error de conexión: ${error.message}` };
    } finally {
        loadingSpinnerUser?.classList.remove('show');
    }
}

// ================ RENDERIZADO DE PRODUCTOS Y RECOMPENSAS ========================
function generateMenu() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    const searchTerm = document.getElementById('productSearchInput')?.value.toLowerCase().trim() || '';
    let itemsToDisplay = menuItems.filter(item => item.active !== false);

    if (currentFilterCategory !== 'all') {
        itemsToDisplay = itemsToDisplay.filter(item => (item.category || "Otros") === currentFilterCategory);
    }
    if (searchTerm) {
        itemsToDisplay = itemsToDisplay.filter(item => (item.name || '').toLowerCase().includes(searchTerm) || (item.description || '').toLowerCase().includes(searchTerm));
    }
    
    switch (currentSortOption) {
        case 'name-asc': itemsToDisplay.sort((a, b) => (a.name || "").localeCompare(b.name || "")); break;
        case 'name-desc': itemsToDisplay.sort((a, b) => (b.name || "").localeCompare(a.name || "")); break;
        case 'price-asc': itemsToDisplay.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
        case 'price-desc': itemsToDisplay.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
    }

    if (itemsToDisplay.length === 0) {
        container.innerHTML = `<div class="col-12 text-center p-5"><p>No se encontraron productos.</p></div>`;
        return;
    }

    container.innerHTML = itemsToDisplay.map(item => `
        <div class="col-6 col-md-6 col-lg-4 d-flex align-items-stretch animate__animated animate__fadeInUp">
            <div class="card w-100">
                <img src="${item.imageurl || 'https://i.postimg.cc/DZJmXb0N/Caricature1.png'}" 
                     class="product-image" alt="${item.name}"
                     onerror="this.src='https://i.postimg.cc/DZJmXb0N/Caricature1.png'"
                     onclick="showProductDetailModal('${item.id}')" style="cursor:pointer;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${item.name}</h5>
                    <p class="card-text flex-grow-1">${item.description || ''}</p>
                    <div class="price-points-row mt-auto">
                        <span class="price">USD ${item.price.toFixed(2)}</span>
                        <span class="badge bg-success">+${item.points} Pts</span>
                    </div>
                    <button class="btn btn-primary w-100 mt-3" onclick="addToCart('${item.id}')"><i class="bi bi-cart-plus"></i> Añadir</button>
                </div>
            </div>
        </div>`).join('');
}

function generateRewardsList() {
    const container = document.getElementById('rewards-container');
    if (!container) return;

    if (!clientData || !clientData.id) {
        container.innerHTML = `<div class="col-12 text-center p-5"><p>Inicia sesión para ver y canjear recompensas.</p></div>`;
        return;
    }
    
    if (availableRewards.length === 0) {
        container.innerHTML = `<div class="col-12 text-center p-5"><p>No hay recompensas disponibles por ahora.</p></div>`;
        return;
    }

    const clientPoints = clientData.puntos || 0;
    container.innerHTML = availableRewards.map(reward => {
        const canAfford = clientPoints >= reward.pointsrequired;
        const hasStock = reward.stock > 0;
        const canRedeem = canAfford && hasStock;
        let btnText = "Canjear";
        if (!canAfford) btnText = "Puntos Insuf.";
        if (!hasStock) btnText = "Agotado";

        return `
            <div class="col-6 col-md-6 col-lg-4 d-flex align-items-stretch">
                <div class="card w-100 ${!canRedeem ? 'opacity-75' : ''}">
                    <img src="${reward.imageurl || 'https://i.postimg.cc/DZJmXb0N/Caricature1.png'}" class="reward-image" alt="${reward.name}">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${reward.name}</h5>
                        <p class="card-text flex-grow-1">${reward.description}</p>
                        <div class="price-points-row mt-auto">
                            <span class="price">${reward.pointsrequired} Pts</span>
                            <span class="small text-muted">Disp: ${reward.stock === 9999 ? 'Ilimitado' : reward.stock}</span>
                        </div>
                        <button class="btn btn-warning w-100 mt-3" ${!canRedeem ? 'disabled' : ''} onclick="attemptRedeemReward('${reward.rewardid}')">${btnText}</button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function attemptRedeemReward(rewardId) {
    if (!clientData || !clientData.id) return openAuthModal('login');
    const reward = availableRewards.find(r => r.rewardid === rewardId);
    if (!reward) return showGlobalFeedback('Recompensa no encontrada.', 'danger');
    if (clientData.puntos < reward.pointsrequired) return showGlobalFeedback('Puntos insuficientes.', 'warning');
    if (reward.stock <= 0) return showGlobalFeedback('Recompensa agotada.', 'warning');

    if (confirm(`¿Canjear "${reward.name}" por ${reward.pointsrequired} puntos?`)) {
        showGlobalFeedback('Procesando canje...', 'info');
        const result = await callApi('redeemReward', { clientId: clientData.id, rewardId: reward.rewardid });

        if (result.success) {
            showGlobalFeedback(`¡"${reward.name}" canjeada! Contacta por WhatsApp para coordinar la entrega.`, 'success');
            if (result.data && result.data.updatedClient) {
                clientData = result.data.updatedClient;
                localStorage.setItem(LOGGED_IN_CLIENT_KEY, JSON.stringify(clientData));
                updateClientDisplayAndUI();
                generateRewardsList(); // Actualizar la lista de recompensas
            }
        } else {
            showGlobalFeedback(result.message || 'Error al canjear la recompensa.', 'danger');
        }
    }
}

function generatePopularItems() {
    const container = document.getElementById('popular-items-container');
    if (!container || menuItems.length === 0) {
        container.innerHTML = `<div class="col-12 text-center p-3"><p class="text-muted">No hay productos destacados.</p></div>`;
        return;
    }
    const popular = [...menuItems].filter(p => p.active !== false).sort(() => 0.5 - Math.random()).slice(0, 4);
    container.innerHTML = popular.map(item => `
        <div class="col-6 col-lg-3 d-flex align-items-stretch">
            <div class="card w-100">
                <img src="${item.imageurl || 'https://i.postimg.cc/DZJmXb0N/Caricature1.png'}" 
                     class="product-image" alt="${item.name}"
                     onerror="this.src='https://i.postimg.cc/DZJmXb0N/Caricature1.png'"
                     onclick="showProductDetailModal('${item.id}')" style="cursor:pointer;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">${item.name}</h5>
                    <div class="price-points-row mt-auto"><span class="price">USD ${item.price.toFixed(2)}</span></div>
                    <button class="btn btn-sm btn-primary w-100 mt-2" onclick="addToCart('${item.id}')">Añadir</button>
                </div>
            </div>
        </div>`).join('');
}

function generateCategoryFilters() {
    const container = document.getElementById('filter-container');
    if (!container || menuItems.length === 0) return;
    const categories = ['all', ...new Set(menuItems.map(item => item.category || 'Otros'))];
    container.innerHTML = categories.map(cat => 
        `<button class="btn-filter ${cat === currentFilterCategory ? 'active' : ''}" onclick="filterMenuByCategory('${cat}')">${cat === 'all' ? 'Todos' : cat}</button>`
    ).join('');
}

function filterMenuByCategory(category) {
    currentFilterCategory = category;
    generateCategoryFilters();
    generateMenu();
}

function showProductDetailModal(productId) {
    const product = menuItems.find(p => p.id === productId);
    if (!product) return;
    document.getElementById('modal-product-image').src = product.imageurl || 'https://i.postimg.cc/DZJmXb0N/Caricature1.png';
    document.getElementById('modal-product-name').textContent = product.name;
    document.getElementById('modal-product-description').textContent = product.description;
    document.getElementById('modal-product-price').textContent = `USD ${product.price.toFixed(2)}`;
    document.getElementById('modal-product-points').textContent = `+${product.points} Puntos`;
    document.getElementById('modal-add-to-cart-button-container').innerHTML = `<button class="btn btn-primary btn-lg w-100" onclick="addToCartAndCloseModal('${productId}')"><i class="bi bi-cart-plus-fill me-2"></i>Añadir al Carrito</button>`;
    generateRecommendations(productId);
    productDetailModalInstance?.show();
}

function addToCartAndCloseModal(productId) {
    addToCart(productId);
    productDetailModalInstance?.hide();
}

function generateRecommendations(currentProductId) {
    const container = document.getElementById('modal-recommendations-container');
    if (!container) return;
    container.innerHTML = '<h6>También podría interesarte</h6>';
    const recommendations = menuItems.filter(p => p.id !== currentProductId && p.active !== false).sort(() => 0.5 - Math.random()).slice(0, 3);
    if(recommendations.length > 0) {
        container.innerHTML += `<div class="row g-2">${recommendations.map(rec => `
            <div class="col-4"><div class="card h-100" onclick="switchProductInModal('${rec.id}')" style="cursor:pointer;">
                <img src="${rec.imageurl || 'https://i.postimg.cc/DZJmXb0N/Caricature1.png'}" alt="${rec.name}" class="img-fluid rounded" style="aspect-ratio:1/1; object-fit:cover;">
            </div></div>`).join('')}</div>`;
    }
}

function switchProductInModal(productId) {
    showProductDetailModal(productId);
}

// ================ PWA (Progressive Web App) ========================
function setupPWA() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('SW registrado:', registration))
                .catch(err => console.error('SW registro fallido:', err));
        });
    }
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('`beforeinstallprompt` event fired.');
        updatePwaInstallButtonVisibility();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        console.log('`appinstalled` event fired.');
        updatePwaInstallButtonVisibility();
        showGlobalFeedback('¡Aplicación instalada con éxito!', 'success');
    });
    checkIfPWAInstalled();
}

function checkIfPWAInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        console.log('App is running in standalone mode.');
        updatePwaInstallButtonVisibility();
    }
}

function updatePwaInstallButtonVisibility() {
    const banner = document.getElementById('pwa-install-banner');
    const installButtonInMenu = document.getElementById('installAppButton');

    if (installButtonInMenu) {
        if (deferredPrompt) {
            // App es instalable
            installButtonInMenu.style.display = 'block';
            if (banner && !sessionStorage.getItem('pwaInstallBannerClosed')) {
                banner.style.display = 'flex';
                banner.classList.add('animate__animated', 'animate__fadeInDown');
            } else if (banner) {
                banner.style.display = 'none';
            }
        } else {
            // App no es instalable o ya está instalada
            installButtonInMenu.style.display = 'none';
            if (banner) {
                banner.style.display = 'none';
            }
        }
    }
}

async function showManualInstallPrompt() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
    } else {
        showGlobalFeedback('La app ya está instalada o tu navegador no es compatible.', 'info');
    }
}

// ================ REFERIDOS Y COMPARTIR ========================
function initializeShareModal() {
    const shareModalEl = document.getElementById("sharePageModal");
    if (!shareModalEl) return;

    shareModalEl.addEventListener("shown.bs.modal", () => {
        try {
            const pageUrl = generateReferralLink();
            const shareText = clientData && clientData.referralcode
                ? `¡Te invito a DL Cumanayagua! Usa mi código ${clientData.referralcode} al registrarte y gana puntos.`
                : "¡Echa un vistazo a DL Cumanayagua para enviar productos a Cuba!";

            const qrCanvas = document.getElementById("qrcodeCanvas");
            if (qrCanvas) {
                qrCanvas.innerHTML = '';
                new QRCode(qrCanvas, { text: pageUrl, width: 130, height: 130 });
            }

            const encodedUrl = encodeURIComponent(pageUrl);
            const encodedText = encodeURIComponent(shareText);

            document.getElementById("shareViaWhatsAppButton").href = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
            document.getElementById("shareViaTelegramButton").href = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
            document.getElementById("shareViaFacebookButton").href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
            
            document.getElementById("copyLinkButton").onclick = () => {
                navigator.clipboard.writeText(pageUrl).then(() => showGlobalFeedback("¡Enlace copiado!", "success"));
            };

            const nativeShareBtn = document.getElementById("shareViaSystemButton");
            if (navigator.share) {
                nativeShareBtn.style.display = "block";
                nativeShareBtn.onclick = () => navigator.share({ title: "DL Cumanayagua", text: shareText, url: pageUrl });
            } else {
                nativeShareBtn.style.display = "none";
            }
        } catch(error) {
            console.error("Error al inicializar el modal de compartir:", error);
        }
    });
}

function copyReferralCodeWithFeedback(buttonElement) {
    if (clientData && clientData.referralcode) {
        navigator.clipboard.writeText(clientData.referralcode).then(() => {
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="bi bi-check-lg"></i> Copiado';
            buttonElement.classList.add('btn-success');
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
                buttonElement.classList.remove('btn-success');
            }, 2000);
            showGlobalFeedback("¡Código copiado!", "success");
        });
    }
}

function generateReferralLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    return clientData && clientData.referralcode ? `${baseUrl}?ref=${clientData.referralcode}` : baseUrl;
}

async function loadReferralDashboard() {
    const container = document.getElementById('referrals-dashboard-container');
    const treeContainer = document.getElementById('referral-tree-container');
    if (!clientData) {
        container.innerHTML = `<div class="col-12 text-center p-5"><p class="fs-5">Inicia sesión para ver tu panel de referidos.</p></div>`;
        return;
    };

    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;
    treeContainer.style.display = 'block';
    treeContainer.innerHTML = '';

    await loadAndDisplayReferralTree();
}

async function loadAndDisplayReferralTree() {
    const treeContainer = document.getElementById('referral-tree-container');
    const result = await callApi('getReferralTree', { clientId: clientData.id });

    if (result.success && result.data) {
        const treeData = result.data;
        let html = `<h4 class="mb-3 text-center text-white">Tu Red de Referidos (${treeData.totalReferrals || 0} en total)</h4>`;
        if (treeData.children && treeData.children.length > 0) {
            html += '<ul class="referral-tree">';
            html += treeData.children.map(child => renderTreeNode(child, 1)).join('');
            html += '</ul>';
        } else {
            html += '<p class="text-muted text-center">Aún no tienes referidos. ¡Comparte tu código para empezar a ganar puntos!</p>';
        }
        treeContainer.innerHTML = html;
    } else {
        treeContainer.innerHTML = `<div class="alert alert-warning">${result.message || 'No se pudo cargar tu red.'}</div>`;
    }
}

function renderTreeNode(node, level) {
    let childrenHtml = '';
    if (node.children && node.children.length > 0) {
        childrenHtml = `<ul class="referral-level-${level + 1}">${node.children.map(child => renderTreeNode(child, level + 1)).join('')}</ul>`;
    }
    return `
        <li>
            <div class="referral-node">
                <img src="${node.avatarurl || AVATAR_GALLERY_IMAGES[0]}" class="referral-avatar" alt="Avatar">
                <span class="referral-name">${node.name}</span>
                <span class="badge bg-light text-dark ms-auto">${new Date(node.date).toLocaleDateString()}</span>
            </div>
            ${childrenHtml}
        </li>`;
}

// ================ UTILIDADES Y MANEJO DE UI ========================
function setupEventListeners() {
    document.getElementById('cartModal')?.addEventListener('show.bs.modal', renderCartItems);
    document.getElementById('authModal')?.addEventListener('hidden.bs.modal', () => {
        clearFormAndFeedback('newUserRegistrationForm', 'registration-feedback');
        clearFormAndFeedback('loginForm', 'login-feedback');
    });
    document.getElementById('my-orders-tab-link')?.addEventListener('shown.bs.tab', loadUserOrders);
    document.getElementById('referrals-tab-link')?.addEventListener('shown.bs.tab', loadReferralDashboard);
    document.getElementById('admin-tab-link')?.addEventListener('shown.bs.tab', loadAdminDashboard);
    document.getElementById('helpModal')?.addEventListener('shown.bs.modal', populateHelpModal);
    
    document.querySelector('.vip-avatar-section')?.addEventListener('click', () => {
        if (clientData && clientData.id) avatarGalleryModalInstance?.show();
        else openAuthModal('login');
    });

    document.getElementById('installAppButton')?.addEventListener('click', showManualInstallPrompt);
    document.getElementById('pwa-install-button')?.addEventListener('click', showManualInstallPrompt);
    document.getElementById('pwa-close-banner-button')?.addEventListener('click', () => {
        sessionStorage.setItem('pwaInstallBannerClosed', 'true');
        updatePwaInstallButtonVisibility();
    });
}

function setupNavbarToggler() {
    const navLinks = document.querySelectorAll('#navbarNavContent .nav-link:not(.dropdown-toggle), #navbarNavContent .dropdown-item');
    const bsCollapse = new bootstrap.Collapse(document.getElementById('navbarNavContent'), { toggle: false });
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 576) { // Bootstrap's sm breakpoint
                bsCollapse.hide();
            }
        });
    });
}

function setupVipCardInteraction() {
    const card = document.getElementById('vip-card-container');
    if (!card) return;
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        card.style.transform = `perspective(1000px) rotateX(${-mouseY/20}deg) rotateY(${mouseX/20}deg)`;
    });
    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
}

function setupSearchAndSort() {
    const searchInput = document.getElementById('productSearchInput');
    const clearBtn = document.getElementById('clearSearchButton');
    searchInput?.addEventListener('input', () => {
        generateMenu();
        if (clearBtn) clearBtn.style.display = searchInput.value ? 'block' : 'none';
    });
    clearBtn?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        clearBtn.style.display = 'none';
        generateMenu();
    });
    document.getElementById('sortProductsSelect')?.addEventListener('change', function() {
        currentSortOption = this.value;
        generateMenu();
    });
}

function showGlobalFeedback(msg, type = 'info', duration = 4000) {
    const container = document.getElementById('toastPlacement');
    if (!container) return;

    const validDuration = (typeof duration === 'number' && duration > 0) ? duration : 4000;

    const toastId = 'toast-' + Date.now();
    let bgColorClass = `bg-${type}`;
    if(type === 'warning') bgColorClass = 'bg-warning text-dark';
    const toastHtml = `
        <div class="toast align-items-center text-white ${bgColorClass} border-0" role="alert" id="${toastId}" aria-live="assertive" aria-atomic="true">
            <div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button></div>
        </div>`;
    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);

    if (type === 'success') {
        SoundManager.playSound('success');
    } else if (type === 'danger') {
        SoundManager.playSound('error');
    } else {
        SoundManager.playSound('notification');
    }

    const toast = new bootstrap.Toast(toastEl, { delay: validDuration });
    toast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function showFeedbackInModal(modalId, feedbackElId, msg, type = 'info', duration = 4000) {
    const feedbackEl = document.getElementById(feedbackElId);
    if (feedbackEl) {
        feedbackEl.innerHTML = `<div class="alert alert-${type} small py-2">${msg}</div>`;
        if (duration && !msg.includes('spinner-border')) {
            setTimeout(() => { if (feedbackEl.innerHTML.includes(msg)) feedbackEl.innerHTML = ''; }, duration);
        }
    }
}

function clearFormAndFeedback(formId, feedbackId) {
    document.getElementById(formId)?.reset();
    const feedbackEl = document.getElementById(feedbackId);
    if (feedbackEl) feedbackEl.innerHTML = '';
}

function showTabAndScroll(tabId) {
    const tabLink = document.getElementById(tabId);
    if (tabLink) {
        new bootstrap.Tab(tabLink).show();
        const target = document.querySelector(tabLink.getAttribute('href'));
        setTimeout(() => target?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    }
}

async function forceFullCacheRefresh() {
    if (!confirm("¿Actualizar la aplicación y borrar todos los datos en caché? Esto puede solucionar problemas de visualización.")) return;

    showGlobalFeedback("Iniciando limpieza profunda...", "info");
    try {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        }
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) { await registration.unregister(); }
        }
        showGlobalFeedback("Limpieza completada. Recargando...", "success");
        setTimeout(() => window.location.reload(true), 2000);
    } catch (error) {
        showGlobalFeedback("Error durante la limpieza. Recargando de todas formas.", "danger");
        console.error("Error en forceFullCacheRefresh:", error);
        setTimeout(() => window.location.reload(true), 2000);
    }
}

function updateMuteButtonIcon() {
    const icon = document.getElementById('sound-icon');
    const button = document.getElementById('floatingSoundButton');
    if (icon && button) {
        if (SoundManager.isMuted) {
            icon.className = 'bi bi-volume-mute-fill';
            button.style.background = '#6c757d'; // Gris
        } else {
            icon.className = 'bi bi-volume-up-fill';
            button.style.background = '#198754'; // Verde
        }
    }
}

// ================ PESTAÑAS DE PERFIL (ÓRDENES, AYUDA, ADMIN) ========================
async function loadUserOrders() {
    const container = document.getElementById('orders-history-container');
    if (!container || !clientData || !clientData.id) return;
    
    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border"></div><p class="mt-2">Cargando tus envíos...</p></div>`;

    const result = await callApi('getUserOrders', { clientId: String(clientData.id) });
    if (result.success && Array.isArray(result.data)) {
        if (result.data.length === 0) {
            container.innerHTML = `<div class="text-center p-5"><i class="bi bi-box2-heart display-1 text-muted"></i><h5 class="mt-3">Aún no tienes envíos</h5></div>`;
            return;
        }

        const ordersHtml = result.data.map((order, index) => {
            const orderDate = new Date(order.orderdateiso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            const itemsHtml = (order.itemsjson || []).map(item => `<li>${item.quantity}x ${item.name}</li>`).join('');
            return `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${order.orderid}"><button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${order.orderid}"><div class="d-flex w-100 justify-content-between align-items-center pe-2"><span><strong>Envío #${String(order.orderid).slice(-6)}</strong> - ${orderDate}</span><span class="badge bg-info text-dark">${order.status || 'Registrado'}</span></div></button></h2>
                <div id="collapse${order.orderid}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#ordersAccordion">
                    <div class="accordion-body"><div class="row"><div class="col-md-8"><strong>Productos:</strong><ul class="mb-0">${itemsHtml}</ul></div><div class="col-md-4 text-md-end mt-3 mt-md-0"><strong>Total:</strong> <span class="fs-5 fw-bold text-success">USD ${parseFloat(order.totalamount).toFixed(2)}</span><br><strong>Puntos Ganados:</strong> <span class="badge bg-warning text-dark">+${order.totalpointsawarded} Pts</span></div></div></div>
                </div>
            </div>`;
        }).join('');
        container.innerHTML = `<div class="accordion" id="ordersAccordion">${ordersHtml}</div>`;
    } else {
        container.innerHTML = `<div class="alert alert-danger">Error al cargar el historial de envíos.</div>`;
    }
}

function populateHelpModal() {
    const helpAccordion = document.getElementById('helpAccordion');
    if (!helpAccordion || helpAccordion.innerHTML.trim() !== '') return;
    
    const helpTopics = [
        { 
            title: "¿Cómo funciona el programa de referidos?", 
            content: `<p>Gana puntos por cada amigo que invites y por los amigos que ellos inviten. ¡Es una red de beneficios!</p>
                      <ul>
                          <li>Por cada amigo que se registre con tu código: <strong>${REFERRAL_POINTS_FOR_REFERRER} Puntos</strong> para ti.</li>
                          <li>Tu amigo también recibe: <strong>${REFERRAL_POINTS_FOR_REFEREE} Puntos</strong> de bienvenida.</li>
                          <li>Por los amigos de tus amigos (2do nivel): <strong>${GRANDPARENT_REFERRAL_BONUS} Puntos</strong>.</li>
                          <li>Por los referidos del 3er nivel en adelante: <strong>${ANCESTOR_REFERRAL_BONUS} Punto</strong>.</li>
                      </ul>
                      <p>¡Mientras más grande sea tu red, más puntos ganas de forma pasiva!</p>`
        },
        { 
            title: "¿Cómo realizo un envío?", 
            content: `<p>Es muy fácil, solo sigue estos pasos:</p>
                      <ol>
                          <li><strong>Inicia sesión</strong> en tu cuenta o regístrate.</li>
                          <li>Navega por nuestro menú y <strong>añade productos</strong> al carrito.</li>
                          <li>Cuando estés listo, haz clic en el <strong>botón flotante del carrito</strong>.</li>
                          <li>Revisa tu pedido y haz clic en <strong>'Confirmar y Pagar con Zelle'</strong>.</li>
                          <li>Finalmente, se abrirá un chat de <strong>WhatsApp</strong> para que nos notifiques y coordinemos el pago y la entrega.</li>
                      </ol>` 
        },
        { 
            title: "¿Qué son los puntos y cómo los uso?", 
            content: `<p>Ganas puntos con cada compra y por traer amigos. Puedes usar tus puntos para canjear productos y recompensas en la pestaña <strong>'Recompensas'</strong>.</p>` 
        },
        {
            title: "¿Puedo instalar esto como una aplicación?",
            content: `<p>¡Sí! Nuestra web es una Aplicación Web Progresiva (PWA). Puedes instalarla en tu teléfono o computadora para un acceso más rápido. Busca el botón de <strong>instalar <i class="bi bi-download"></i></strong> en la barra de navegación o en el menú de tu navegador.</p>`
        }
    ];

    helpAccordion.innerHTML = helpTopics.map((topic, index) => `
        <div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button ${index !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapseHelp${index}">${topic.title}</button></h2><div id="collapseHelp${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#helpAccordion"><div class="accordion-body">${topic.content}</div></div></div>
    `).join('');
}

async function loadAdminDashboard() {
    const container = document.getElementById('admin-dashboard-container');
    if (!container || !clientData || clientData.role !== 'admin') {
        container.innerHTML = `<div class="alert alert-danger">No tienes permiso para ver esta sección.</div>`;
        return;
    }

    container.innerHTML = `<div class="text-center p-5"><div class="spinner-border"></div><p class="mt-2">Cargando datos de administrador...</p></div>`;

    const result = await callApi('getAdminDashboardData', { clientId: clientData.id });

    if (result.success && result.data && result.data.clients) {
        const clients = result.data.clients;
        const totalUsers = clients.length;
        const usersWithPurchases = clients.filter(c => c.hasPurchased).length;

        const clientsHtml = clients
            .sort((a, b) => new Date(b.fecharegistro) - new Date(a.fecharegistro)) // Ordenar por más reciente
            .map(client => `
            <tr>
                <td><strong>${client.nombre}</strong><br><small class="text-muted">${client.email || 'Sin email'}</small></td>
                <td>${client.telefono}</td>
                <td>${new Date(client.fecharegistro).toLocaleDateString()}</td>
                <td class="text-center">${client.puntos}</td>
                <td class="text-center">${client.hasPurchased ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-secondary">No</span>'}</td>
                <td class="text-center"><span class="badge ${client.role === 'admin' ? 'bg-primary' : 'bg-info'}">${client.role || 'user'}</span></td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <div class="card card-body text-center shadow-sm">
                        <h6 class="text-muted">Total de Usuarios</h6>
                        <p class="fs-1 fw-bold mb-0 text-primary">${totalUsers}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card card-body text-center shadow-sm">
                        <h6 class="text-muted">Usuarios con Compras</h6>
                        <p class="fs-1 fw-bold mb-0 text-success">${usersWithPurchases}</p>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Registro</th>
                            <th class="text-center">Puntos</th>
                            <th class="text-center">Ha Comprado</th>
                            <th class="text-center">Rol</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clientsHtml}
                    </tbody>
                </table>
            </div>
        `;
    } else {
        container.innerHTML = `<div class="alert alert-warning">${result.message || 'No se pudieron cargar los datos.'}</div>`;
    }
}