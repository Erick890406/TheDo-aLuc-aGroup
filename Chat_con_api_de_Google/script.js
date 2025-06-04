document.addEventListener('DOMContentLoaded', () => {
    // --- Seleccionar elementos ---
    const chatbox = document.getElementById('chatbox');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const apiKeyInput = document.getElementById('api-key');
    // const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility'); // Ya no se usa aquí, script inline
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatList = document.getElementById('chat-list');
    const loader = document.getElementById('loader');

    // --- Variables Globales ---
    const MODEL_NAME = "gemini-1.5-flash-latest";
    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    let currentConversationHistory = []; // Historial del chat ACTIVO
    let savedChats = []; // Array para todos los chats guardados
    let currentChatId = null; // ID del chat activo (null si es nuevo)
    const MAX_HISTORY_LENGTH = 20; // Limita el historial enviado a la API (pares user/model)
    let lastUserMessageForRegeneration = null; // Guarda el último mensaje del usuario para regenerar

    // --- Cargar datos al inicio ---
    function initializeApp() {
        // Cargar API Key
        const savedApiKey = localStorage.getItem('geminiApiKey');
        if (savedApiKey) {
            apiKeyInput.value = savedApiKey;
            enableInput();
        } else {
            disableInput();
        }

        // Cargar chats guardados
        savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');

        // Cargar último chat activo o crear uno nuevo
        currentChatId = localStorage.getItem('currentChatId');
        if (!currentChatId || !savedChats.some(chat => chat.id == currentChatId)) {
            currentChatId = null;
        }

        renderChatList();
        loadChat(currentChatId); // Carga el chat y renderiza mensajes iniciales

        // Listener para guardar la API Key
        apiKeyInput.addEventListener('input', () => {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey) {
                localStorage.setItem('geminiApiKey', apiKey);
                enableInput();
            } else {
                localStorage.removeItem('geminiApiKey');
                disableInput();
            }
        });

         // Inicializar Highlight.js para cualquier código ya existente (poco probable aquí)
         // Se llamará principalmente después de añadir nuevos mensajes
         // hljs.highlightAll(); // Comentado porque lo haremos por elemento
    }

    function enableInput() {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.placeholder = "Escribe tu mensaje aquí...";
    }
    function disableInput() {
        userInput.disabled = true;
        sendBtn.disabled = true;
        userInput.placeholder = "Introduce tu clave API para empezar...";
    }

    // --- Funciones de Manejo de Chats ---
    function renderChatList() {
        chatList.innerHTML = '';
        if (savedChats.length === 0) {
            chatList.innerHTML = '<li class="list-group-item disabled">No hay chats guardados.</li>';
            return;
        }
        const sortedChats = [...savedChats].sort((a, b) => b.id - a.id);
        sortedChats.forEach(chat => {
            const li = document.createElement('li');
            li.classList.add('list-group-item'); // Quitar list-group-flush de aquí
            li.dataset.chatId = chat.id;
            if (chat.id == currentChatId) {
                li.classList.add('active');
            }

            const titleSpan = document.createElement('span');
            const firstUserMessage = chat.messages.find(m => m.role === 'user');
            titleSpan.textContent = firstUserMessage ? firstUserMessage.parts[0].text.substring(0, 25) + (firstUserMessage.parts[0].text.length > 25 ? '...' : '') : chat.title || `Chat ${new Date(chat.id).toLocaleTimeString()}`;
            titleSpan.title = firstUserMessage ? firstUserMessage.parts[0].text : titleSpan.textContent; // Tooltip

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('btn-delete');
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteBtn.title = 'Borrar chat';
            deleteBtn.dataset.chatId = chat.id;

            li.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete')) return;
                loadChat(chat.id);
            });
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteChat(chat.id);
            });

            li.appendChild(titleSpan);
            li.appendChild(deleteBtn);
            chatList.appendChild(li);
        });
    }

    function loadChat(chatId) {
        currentChatId = chatId;
        localStorage.setItem('currentChatId', currentChatId || '');
        chatbox.innerHTML = '';
        lastUserMessageForRegeneration = null; // Resetear al cambiar de chat

        const chat = savedChats.find(c => c.id == chatId);

        if (chat) {
            currentConversationHistory = [...chat.messages];
            // Renderizar mensajes existentes
            currentConversationHistory.forEach((msg, index) => {
                 // No mostrar mensajes iniciales del sistema si los hubiera
                 if (msg.role !== 'system') {
                    const isLastMessage = index === currentConversationHistory.length - 1;
                    displayMessage(msg.role, msg.parts[0].text, isLastMessage);
                    // Guardar el penúltimo mensaje si el último es del modelo (para regenerar)
                    if (msg.role === 'user' && isLastMessage && currentConversationHistory.length > 1 && currentConversationHistory[index-1]?.role === 'model') {
                       // Si el ultimo es user, pero el anterior fue model, el user no tiene respuesta aun
                       lastUserMessageForRegeneration = msg.parts[0].text;
                    } else if (msg.role === 'model' && isLastMessage && index > 0) {
                         lastUserMessageForRegeneration = currentConversationHistory[index - 1]?.parts[0]?.text;
                    }
                 }
            });
             if (apiKeyInput.value.trim()) enableInput();

        } else {
            currentConversationHistory = [];
            currentChatId = null;
            localStorage.removeItem('currentChatId');
            // displayMessage('model', 'Iniciando nuevo chat. Escribe tu primer mensaje.'); // No mostrar mensaje inicial aquí, se muestra si la API key falta
             if (apiKeyInput.value.trim()) enableInput(); else disableInput();
             if (!apiKeyInput.value.trim()) {
                 displayMessage('model', 'Introduce tu clave API para empezar.', true);
             }
        }
        renderChatList();
        chatbox.scrollTop = chatbox.scrollHeight; // Scroll al final al cargar
    }

    function saveCurrentChat() {
        // Solo guardar si hay historial
        if (currentConversationHistory.length === 0) return;

        if (currentChatId) {
            const chatIndex = savedChats.findIndex(c => c.id == currentChatId);
            if (chatIndex > -1) {
                savedChats[chatIndex].messages = [...currentConversationHistory];
            } else {
                 // Si el ID existía pero ya no se encuentra (raro), crea uno nuevo
                 currentChatId = null;
            }
        }

        if (!currentChatId) {
            // Crear nuevo chat
            currentChatId = Date.now();
            const firstUserMsg = currentConversationHistory.find(m => m.role === 'user');
             // Generar título mejorado
             let title = `Chat ${new Date(currentChatId).toLocaleString()}`;
             if(firstUserMsg) {
                 const cleanText = firstUserMsg.parts[0].text.replace(/```[\s\S]*?```/g, '').trim(); // Quitar bloques de código
                 title = cleanText.substring(0, 30) + (cleanText.length > 30 ? '...' : '');
                 if (!title) title = `Chat con código ${new Date(currentChatId).toLocaleTimeString()}`; // Fallback si solo hay código
             }

            const newChat = {
                id: currentChatId,
                title: title,
                messages: [...currentConversationHistory]
            };
            savedChats.push(newChat);
            localStorage.setItem('currentChatId', currentChatId);
        }

        localStorage.setItem('savedChats', JSON.stringify(savedChats));
        renderChatList(); // Actualizar lista siempre que se guarde
    }

    function handleDeleteChat(chatId) {
        if (confirm('¿Estás seguro de que quieres borrar este chat permanentemente?')) {
            savedChats = savedChats.filter(c => c.id != chatId);
            localStorage.setItem('savedChats', JSON.stringify(savedChats));

            if (currentChatId == chatId) {
                loadChat(null);
            } else {
                renderChatList();
            }
        }
    }

    // --- Funciones de Mensajes y API ---

    /**
     * Muestra un mensaje en el chatbox.
     * @param {string} sender - 'user', 'model', o 'error'.
     * @param {string} text - El contenido completo del mensaje.
     * @param {boolean} isLatestMsg - Indica si este es el último mensaje añadido (para botón regenerar).
     */
    function displayMessage(sender, text, isLatestMsg = false) {
        // 1. Crear contenedor principal del mensaje y acciones
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('message-container', sender);
        messageContainer.dataset.fullText = text; // Guardar texto original para copiar

        // 2. Crear la burbuja del mensaje
        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message', sender);

        // 3. Procesar texto y código
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
        let lastIndex = 0;
        let match;
        let hasContent = false;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            hasContent = true;
            // Texto antes del código
            const textBefore = text.substring(lastIndex, match.index).trim();
            if (textBefore) {
                const textNode = document.createElement('div');
                textNode.textContent = textBefore;
                messageBubble.appendChild(textNode); // Añadir al bubble
            }

            // Bloque de código
            const lang = match[1] || 'plaintext'; // Default a plaintext si no hay lenguaje
            const code = match[2].trim();
            const codeBlockElement = renderCodeBlock(lang, code);
            messageBubble.appendChild(codeBlockElement); // Añadir al bubble
             // Resaltar este bloque específico
             const codeElement = codeBlockElement.querySelector('code');
             if(codeElement) {
                 try {
                     hljs.highlightElement(codeElement);
                 } catch (e) {
                     console.error("Error resaltando código:", e);
                 }
             }

            lastIndex = codeBlockRegex.exec(text).lastIndex; // Corregido para evitar bucle infinito potencial
        }

        // Texto después del último bloque o texto completo si no hay bloques
        const remainingText = text.substring(lastIndex).trim();
        if (remainingText) {
            hasContent = true;
            const textNode = document.createElement('div');
            textNode.textContent = remainingText;
            messageBubble.appendChild(textNode); // Añadir al bubble
        }

        // Si no hay contenido (raro), no añadir nada
        if (!hasContent && sender !== 'error') { // Permitir errores vacíos si fuera necesario
             console.warn("Intentando mostrar mensaje vacío:", sender, text);
             // Podríamos mostrar un mensaje placeholder o simplemente no añadirlo
             // return; // Descomentar para evitar mensajes vacíos
             messageBubble.textContent = "[Respuesta vacía]"; // Placeholder
        }


        // 4. Crear botones de acción
        const messageActions = document.createElement('div');
        messageActions.classList.add('message-actions');

        // Botón Copiar Mensaje (siempre)
        const copyMsgBtn = document.createElement('button');
        copyMsgBtn.classList.add('message-action-btn', 'copy-message-btn');
        copyMsgBtn.title = 'Copiar texto';
        copyMsgBtn.innerHTML = '<i class="fas fa-copy"></i>';
        copyMsgBtn.dataset.clipboardText = text; // Texto a copiar
        messageActions.appendChild(copyMsgBtn);

        // Botón Regenerar (solo para el último mensaje del modelo y si hubo un mensaje de usuario antes)
        if (sender === 'model' && isLatestMsg && lastUserMessageForRegeneration) {
            const regenerateBtn = document.createElement('button');
            regenerateBtn.classList.add('message-action-btn', 'regenerate-btn');
            regenerateBtn.title = 'Regenerar respuesta';
            regenerateBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            messageActions.appendChild(regenerateBtn);
        }

        // 5. Ensamblar y añadir al DOM
        messageContainer.appendChild(messageBubble);
        messageContainer.appendChild(messageActions);
        chatbox.appendChild(messageContainer);

        // Scroll al final (puede necesitar un pequeño delay a veces)
        // setTimeout(() => { chatbox.scrollTop = chatbox.scrollHeight; }, 50);
         chatbox.scrollTop = chatbox.scrollHeight;
    }


    function renderCodeBlock(language, code) {
        const blockDiv = document.createElement('div');
        blockDiv.classList.add('code-block');
        // Añadir lenguaje como data-attribute para el ::before CSS
        blockDiv.dataset.language = language || 'código';

        // Botón de Copiar Código (ahora posicionado absoluto)
        const copyBtn = document.createElement('button');
        copyBtn.classList.add('copy-code-btn'); // No necesita clase 'btn' de bootstrap aquí
        copyBtn.title = 'Copiar código';
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
        copyBtn.dataset.code = code; // Texto a copiar

        const pre = document.createElement('pre');
        const codeElement = document.createElement('code');
        // Añadir clase de lenguaje para Highlight.js
        // hljs espera 'language-xyz' o solo 'xyz' si está configurado
        if (language) {
             // Normalizar lenguajes comunes que hljs podría no reconocer por defecto
             const langClass = language.toLowerCase() === 'html' ? 'xml' : language.toLowerCase();
             codeElement.classList.add(langClass);
            // codeElement.classList.add(`language-${language}`); // Alternativa si la anterior falla
        } else {
            codeElement.classList.add('plaintext');
        }

        codeElement.textContent = code;
        pre.appendChild(codeElement);

        // Añadir elementos al contenedor del bloque
        blockDiv.appendChild(pre); // El <pre> va primero en el DOM
        blockDiv.appendChild(copyBtn); // El botón va después para el posicionamiento absoluto

        return blockDiv;
    }

    // --- Event Listener Delegado para Botones en Mensajes ---
    chatbox.addEventListener('click', (event) => {
        const target = event.target;

        // Botón Copiar Código Específico
        const copyCodeButton = target.closest('.copy-code-btn');
        if (copyCodeButton) {
            handleCopy(copyCodeButton, copyCodeButton.dataset.code, '<i class="fas fa-check"></i> Copiado');
            return; // Evitar que se procese también como copia de mensaje
        }

        // Botón Copiar Mensaje Completo
        const copyMessageButton = target.closest('.copy-message-btn');
        if (copyMessageButton) {
            handleCopy(copyMessageButton, copyMessageButton.dataset.clipboardText, '<i class="fas fa-check"></i>');
            return;
        }

        // Botón Regenerar Respuesta
        const regenerateButton = target.closest('.regenerate-btn');
        if (regenerateButton) {
            handleRegenerate(regenerateButton);
            return;
        }
    });

    // --- Función unificada para copiar y dar feedback ---
    function handleCopy(buttonElement, textToCopy, feedbackHtml) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalHtml = buttonElement.innerHTML;
            const originalTitle = buttonElement.title;
            buttonElement.innerHTML = feedbackHtml;
            buttonElement.classList.add('copied'); // Añadir clase para estilo de éxito
            buttonElement.disabled = true;
            buttonElement.title = 'Copiado!';

            setTimeout(() => {
                buttonElement.innerHTML = originalHtml;
                buttonElement.classList.remove('copied');
                buttonElement.disabled = false;
                buttonElement.title = originalTitle;
            }, 1500);
        }).catch(err => {
            console.error('Error al copiar:', err);
            // Mostrar error al usuario de forma sutil
            const originalTitle = buttonElement.title;
            buttonElement.title = 'Error al copiar';
            setTimeout(() => { buttonElement.title = originalTitle; }, 2000);
        });
    }


    // --- Función para llamar a la API Gemini ---
    async function callGeminiChatApi(apiKey, history) {
        const API_ENDPOINT = `${BASE_URL}${MODEL_NAME}:generateContent?key=${apiKey}`;
        const limitedHistory = history.slice(-MAX_HISTORY_LENGTH * 2); // *2 porque cuenta user Y model

        // Validar historial: Asegurar que no termine con 'model' si es posible
        // (Aunque Gemini debería manejarlo, es buena práctica)
        // const finalHistory = limitedHistory.length > 0 && limitedHistory[limitedHistory.length - 1].role === 'model'
        //    ? limitedHistory.slice(0, -1)
        //    : limitedHistory;
        // --> Comentado: Gemini v1.5 maneja bien el historial alternado

        const requestBody = {
            contents: limitedHistory, // Usar historial limitado
            generationConfig: { temperature: 0.7, topK: 1, topP: 1, maxOutputTokens: 4096 }, // Ajusta según necesites
            safetySettings: [ // Mantener configuraciones de seguridad
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                // ... (Manejo de errores de red/API igual que antes) ...
                 const errorData = await response.json().catch(() => ({}));
                 console.error("Error API:", response.status, errorData);
                 let errorMessage = `Error de la API (${response.status})`;
                 if (errorData.error && errorData.error.message) {
                     errorMessage += `: ${errorData.error.message}`;
                 } else if (typeof errorData === 'string') {
                      errorMessage += `: ${errorData}`;
                 }
                  if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
                      errorMessage = "Error: Clave API no válida. Revísala.";
                 } else if (response.status === 403 || (errorData.error && errorData.error.message.includes('permission'))) {
                      errorMessage = `Error: Permisos insuficientes para la clave API o el modelo '${MODEL_NAME}'.`;
                 } else if (response.status === 404) {
                      errorMessage = `Error: Modelo '${MODEL_NAME}' no encontrado o no disponible.`;
                 } else if (response.status === 429) {
                      errorMessage = "Error: Has excedido la cuota de la API. Inténtalo más tarde.";
                 } else if (errorData.error?.message?.includes('SAFETY')) {
                       errorMessage = "Respuesta bloqueada por Google por razones de seguridad."; // Mensaje más específico
                 }
                 throw new Error(errorMessage);
            }

            const data = await response.json();
            // console.log("Respuesta API:", data);

            // Manejo robusto de la respuesta
             const candidate = data.candidates?.[0];
             if (candidate?.content?.parts?.[0]?.text) {
                 return candidate.content.parts[0].text;
             } else if (candidate?.finishReason === 'SAFETY') {
                 throw new Error('Respuesta bloqueada por Google por razones de seguridad.');
             } else if (candidate?.finishReason === 'MAX_TOKENS') {
                 return candidate.content.parts[0].text + "\n[Respuesta truncada por límite de tokens]";
             } else if (data.promptFeedback?.blockReason) {
                 throw new Error(`Prompt bloqueado por Google: ${data.promptFeedback.blockReason}`);
             } else {
                 console.error("Formato respuesta inesperado:", data);
                 throw new Error('Respuesta inesperada o vacía de la API.');
             }
        } catch (error) {
            console.error('Error en callGeminiChatApi:', error);
            // Añadir manejo específico para fallos de red
            if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
                throw new Error('Error de red. Verifica tu conexión o posibles bloqueos (CORS, firewall).');
            }
            // Relanzar otros errores (incluidos los lanzados desde el !response.ok)
            throw error;
        }
    }


    // --- Función Principal para Enviar/Recibir Mensajes ---
    async function processAndDisplayResponse(userMessageText, isRegeneration = false) {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            displayMessage('error', 'Error: Falta la clave API de Google AI.', true);
            apiKeyInput.focus();
            return; // No continuar sin API key
        }

        // Si NO es regeneración, mostrar mensaje de usuario y añadirlo al historial
        if (!isRegeneration) {
            displayMessage('user', userMessageText, false); // El mensaje de usuario nunca es el 'último' para regenerar
            currentConversationHistory.push({ role: "user", parts: [{ text: userMessageText }] });
            lastUserMessageForRegeneration = userMessageText; // Guardar para posible regeneración
            saveCurrentChat(); // Guardar el mensaje del usuario
            userInput.value = ''; // Limpiar input solo si es un envío nuevo
        }

        // Mostrar loader y deshabilitar input/botón
        loader.classList.remove('hidden');
        disableInput(); // Usar la función general para deshabilitar

        try {
            // Construir el historial a enviar (excluyendo la última respuesta del modelo si es regeneración)
            const historyToSend = isRegeneration
                 ? currentConversationHistory.slice(0, -1) // Quita la última respuesta (del modelo)
                 : [...currentConversationHistory]; // Usa el historial actual

            // Llamar a la API
            const aiResponse = await callGeminiChatApi(apiKey, historyToSend);

            // Si es regeneración, la respuesta anterior ya fue eliminada del DOM por handleRegenerate
            // Añadir nueva respuesta al historial
             currentConversationHistory.push({ role: "model", parts: [{ text: aiResponse }] });
             displayMessage('model', aiResponse, true); // Mostrar nueva respuesta, marcada como última
             saveCurrentChat(); // Guardar la nueva respuesta

        } catch (error) {
            // Si falló la regeneración, el mensaje de usuario sigue ahí.
            // Si falló un envío normal, el mensaje de usuario ya está visible.
            displayMessage('error', `Error: ${error.message}`, true); // Mostrar error como 'último' mensaje
            // No quitamos mensajes previos en caso de error
             // Si fue un error de regeneración, lastUserMessageForRegeneration sigue siendo válido.
        } finally {
            loader.classList.add('hidden');
            enableInput(); // Usar la función general para habilitar
            if (!isRegeneration) userInput.focus(); // Focus solo en envíos nuevos
        }
    }

    // --- Función para manejar el envío desde el botón/Enter ---
    function handleSendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;
        processAndDisplayResponse(messageText, false);
    }

    // --- Función para manejar la regeneración ---
    function handleRegenerate(buttonElement) {
        if (!lastUserMessageForRegeneration) {
            console.error("No se encontró el último mensaje del usuario para regenerar.");
            displayMessage('error', "Error: No se pudo encontrar el mensaje original para regenerar.", true);
            return;
        }

        // 1. Eliminar visualmente la última respuesta del modelo
        const modelMessageContainer = buttonElement.closest('.message-container');
        if (modelMessageContainer) {
            modelMessageContainer.remove();
        } else {
             console.error("No se encontró el contenedor del mensaje del modelo a eliminar.");
             // Continuar de todos modos, el historial se corregirá
        }

        // 2. Llamar a la función principal, indicando que es regeneración
        // El historial ya se ajustará dentro de processAndDisplayResponse antes de la llamada API
        processAndDisplayResponse(lastUserMessageForRegeneration, true);
    }


    // --- Event Listeners ---
    sendBtn.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });
    newChatBtn.addEventListener('click', () => loadChat(null));

    // --- Inicializar la aplicación ---
    initializeApp();

}); // Fin DOMContentLoaded