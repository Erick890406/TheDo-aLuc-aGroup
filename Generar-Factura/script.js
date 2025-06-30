const { jsPDF } = window.jspdf;

document.addEventListener('DOMContentLoaded', async function() {
    let pdfTemplates = {};

    async function cargarPlantillasPDF() {
        try {
            const response = await fetch('./plantillas.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            pdfTemplates = await response.json();
            console.log("Plantillas PDF cargadas exitosamente.");
        } catch (error) {
            console.error("No se pudieron cargar las plantillas PDF desde 'plantillas.json'", error);
            alert("Error: No se pudieron cargar las plantillas. Verifique el archivo 'plantillas.json' y la consola.");
        }
    }
    
    await cargarPlantillasPDF();

    ['empresasData', 'vendedoresData', 'clientesData'].forEach(key => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify([]));
    });

    if (!localStorage.getItem('productosPredefinidosData')) {
        localStorage.setItem('productosPredefinidosData', JSON.stringify({
            "Servicios Generales": [
                { id: Date.now().toString(), descripcion: "Consultoría Inicial (1 hora)", cantidad: "1", precio: "75.00" }
            ]
        }));
    }
    
    let facturasCount = localStorage.getItem('facturasCount') || 1;
    let plantillaActual = localStorage.getItem('plantillaFactura') || 'classic';
    
    const empresaFields = { 
        empresaNombre: 'nombre', empresaNit: 'nit', empresaDireccion: 'direccion', 
        empresaTelefono: 'telefono', empresaEmail: 'email', empresaLicencia: 'licencia',
        empresaCuentaCUP: 'cuentaCUP', empresaRepresentante: 'representante', 
        empresaCargo: 'cargo', empresaFirma: 'firma', empresaUsarFirma: 'usarFirma'
    };
    const vendedorFields = { 
        vendedorNombre: 'nombre', vendedorIdentificacion: 'identificacion', 
        vendedorTelefono: 'telefono', vendedorEmail: 'email', vendedorFirma: 'firma',
        vendedorUsarFirma: 'usarFirma'
    };
    const clienteFields = { 
        clienteNombre: 'nombre', clienteIdentificacion: 'identificacion', 
        clienteDireccion: 'direccion', clienteTelefono: 'telefono', 
        clienteEmail: 'email', clienteFirma: 'firma', clienteUsarFirma: 'usarFirma'
    };
    
    cargarPerfilesEmpresa();
    cargarPerfilesVendedor();
    cargarPerfilesCliente();
    cargarProductosGuardados();
    renderizarPestanasProductos();
    setFechaActual();
    generarNumeroFactura();
    aplicarPlantilla(plantillaActual);
    
    document.getElementById('importarProductosBtn').addEventListener('click', importarProductos);
    document.getElementById('generarFactura').addEventListener('click', generarPDF);
    document.getElementById('agregarProducto').addEventListener('click', () => agregarFilaProducto());
    document.getElementById('limpiarProductos').addEventListener('click', limpiarProductos);
    document.getElementById('listaProductos').addEventListener('input', guardarProductos);

    document.querySelectorAll('.seleccionar-plantilla').forEach(boton => {
        boton.addEventListener('click', function() {
            const plantilla = this.closest('.template-card').dataset.template;
            aplicarPlantilla(plantilla);
        });
    });

    document.getElementById('empresaSelector').addEventListener('change', (e) => cargarDatosFormularioEmpresa(e.target.value));
    document.getElementById('guardarDatosEmpresa').addEventListener('click', guardarPerfilEmpresa);
    document.getElementById('nuevaEmpresa').addEventListener('click', limpiarFormularioEmpresa);
    document.getElementById('eliminarEmpresa').addEventListener('click', eliminarPerfilEmpresa);

    document.getElementById('vendedorSelector').addEventListener('change', (e) => cargarDatosFormularioVendedor(e.target.value));
    document.getElementById('guardarDatosVendedor').addEventListener('click', guardarPerfilVendedor);
    document.getElementById('nuevoVendedor').addEventListener('click', limpiarFormularioVendedor);
    document.getElementById('eliminarVendedor').addEventListener('click', eliminarPerfilVendedor);

    document.getElementById('clienteSelector').addEventListener('change', (e) => cargarDatosFormularioCliente(e.target.value));
    document.getElementById('guardarCliente').addEventListener('click', guardarPerfilCliente);
    document.getElementById('nuevoCliente').addEventListener('click', limpiarFormularioCliente);
    document.getElementById('eliminarCliente').addEventListener('click', eliminarPerfilCliente);
    
    // *** CORRECCIÓN #2: Event listeners para los checkboxes de firma ***
    // Estos listeners actualizan la vista previa de la firma en la pestaña principal en tiempo real.
    document.getElementById('empresaUsarFirma').addEventListener('change', () => cargarDatosFormularioEmpresa(document.getElementById('empresaSelector').value));
    document.getElementById('vendedorUsarFirma').addEventListener('change', () => cargarDatosFormularioVendedor(document.getElementById('vendedorSelector').value));
    document.getElementById('clienteUsarFirma').addEventListener('change', () => cargarDatosFormularioCliente(document.getElementById('clienteSelector').value));


    function aplicarPlantilla(plantilla) {
        const container = document.getElementById('invoiceContainer');
        container.className = 'invoice-container';
        container.classList.add(`template-${plantilla}`);
        plantillaActual = plantilla;
        localStorage.setItem('plantillaFactura', plantilla);
    }

    function generarNumeroFactura() {
        const fecha = new Date();
        const year = fecha.getFullYear().toString();
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const dia = fecha.getDate().toString().padStart(2, '0');
        const numero = facturasCount.toString().padStart(4, '0');
        document.getElementById('numeroFactura').value = `FAC-${year}${mes}${dia}-${numero}`;
    }

    function setFechaActual() {
        const hoy = new Date();
        document.getElementById('fechaFactura').value = hoy.toISOString().split('T')[0];
    }

    function agregarFilaProducto(descripcion = '', cantidad = 1, precio = 0) {
        const tbody = document.getElementById('listaProductos');
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><input type="text" class="form-control form-control-sm descripcion" value="${descripcion}"></td>
            <td><input type="number" class="form-control form-control-sm cantidad" value="${cantidad}" min="1"></td>
            <td><input type="number" class="form-control form-control-sm precio" value="${precio.toFixed(2)}" min="0" step="0.01"></td>
            <td class="total-item text-end fw-bold">${(cantidad * precio).toFixed(2)}</td>
            <td class="text-center"><button class="btn btn-sm btn-link text-danger eliminar-producto"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(fila);
        fila.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
            calcularTotales();
            guardarProductos();
        }));
        fila.querySelector('.eliminar-producto').addEventListener('click', () => {
            fila.remove();
            calcularTotales();
            guardarProductos();
            if (tbody.rows.length === 0) agregarFilaProducto();
        });
        calcularTotales();
    }

    function calcularTotales() {
        let subtotal = 0;
        document.querySelectorAll('#listaProductos tr').forEach(fila => {
            const cantidad = parseFloat(fila.querySelector('.cantidad').value) || 0;
            const precio = parseFloat(fila.querySelector('.precio').value) || 0;
            const totalItem = cantidad * precio;
            fila.querySelector('.total-item').textContent = totalItem.toFixed(2);
            subtotal += totalItem;
        });
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('total').textContent = `$${subtotal.toFixed(2)}`;
    }

    function importarProductos() {
        const texto = document.getElementById('productosImportar').value.trim();
        if (!texto) return;
        if (document.querySelectorAll('#listaProductos tr').length === 1 && document.querySelector('#listaProductos .descripcion').value === '') {
            document.querySelector('#listaProductos tr').remove();
        }
        texto.split('\n').forEach(linea => {
            const partes = linea.split('|').map(p => p.trim());
            if (partes.length >= 3) {
                agregarFilaProducto(partes[0], parseFloat(partes[1]) || 1, parseFloat(partes[2]) || 0);
            }
        });
        bootstrap.Modal.getInstance(document.getElementById('modalImportar')).hide();
        document.getElementById('productosImportar').value = '';
        guardarProductos();
    }
    
    function guardarProductos() {
        const productos = Array.from(document.querySelectorAll('#listaProductos tr')).map(fila => ({
            descripcion: fila.querySelector('.descripcion').value,
            cantidad: fila.querySelector('.cantidad').value,
            precio: fila.querySelector('.precio').value,
        }));
        localStorage.setItem('productosFactura', JSON.stringify(productos));
    }

    function cargarProductosGuardados() {
        const productosGuardados = JSON.parse(localStorage.getItem('productosFactura'));
        if (productosGuardados && productosGuardados.length > 0) {
            document.getElementById('listaProductos').innerHTML = '';
            productosGuardados.forEach(p => agregarFilaProducto(p.descripcion, parseFloat(p.cantidad), parseFloat(p.precio)));
        } else if (document.getElementById('listaProductos').rows.length === 0) {
            agregarFilaProducto();
        }
    }
    
    function limpiarProductos() {
        if (confirm('¿Está seguro de que desea eliminar todos los productos de la lista?')) {
            document.getElementById('listaProductos').innerHTML = '';
            agregarFilaProducto();
            guardarProductos();
        }
    }

    function cargarPerfiles(key, selectorId, displayFn, requiredField) {
        const perfiles = JSON.parse(localStorage.getItem(key)) || [];
        const selector = document.getElementById(selectorId);
        selector.innerHTML = '<option value="">-- Seleccione o cree uno nuevo --</option>';
        perfiles.forEach(perfil => {
            const option = document.createElement('option');
            option.value = perfil.id;
            option.textContent = `${perfil.nombre || 'Sin nombre'} (${perfil[requiredField] || 'Sin ID'})`;
            selector.appendChild(option);
        });
        const ultimoIdKey = `ultimo${key.charAt(0).toUpperCase() + key.slice(1, -5)}Id`;
        const ultimoId = localStorage.getItem(ultimoIdKey);
        if (ultimoId && perfiles.some(p => p.id === ultimoId)) {
            selector.value = ultimoId;
            displayFn(ultimoId);
        } else {
            displayFn("");
        }
    }

    function cargarPerfilesEmpresa() { cargarPerfiles('empresasData', 'empresaSelector', cargarDatosFormularioEmpresa, 'nit'); }
    function cargarPerfilesVendedor() { cargarPerfiles('vendedoresData', 'vendedorSelector', cargarDatosFormularioVendedor, 'identificacion'); }
    function cargarPerfilesCliente() { cargarPerfiles('clientesData', 'clienteSelector', cargarDatosFormularioCliente, 'identificacion'); }
    
    function cargarDatosFormulario(id, key, fields, displayFn) {
        const perfiles = JSON.parse(localStorage.getItem(key)) || [];
        const perfil = perfiles.find(p => p.id == id) || {};
        for (const fieldId in fields) {
            const element = document.getElementById(fieldId);
            if (element) {
                element.type === 'checkbox' ? (element.checked = perfil[fields[fieldId]] || false) : (element.value = perfil[fields[fieldId]] || '');
            }
        }
        displayFn(perfil);
        const ultimoIdKey = `ultimo${key.charAt(0).toUpperCase() + key.slice(1, -5)}Id`;
        if (id) localStorage.setItem(ultimoIdKey, id);
    }

    function cargarDatosFormularioEmpresa(id) { 
        cargarDatosFormulario(id, 'empresasData', empresaFields, (perfil) => {
            actualizarDisplayEmpresa(perfil);
            const usarFirma = document.getElementById('empresaUsarFirma').checked;
            document.getElementById('firmaRepresentante').innerHTML = usarFirma && perfil.firma ? `<img src="${perfil.firma}" style="max-height: 80px; max-width: 100%;">` : '<div class="signature-line"></div>';
        }); 
    }
    
    function cargarDatosFormularioVendedor(id) { 
        cargarDatosFormulario(id, 'vendedoresData', vendedorFields, (perfil) => {
            actualizarDisplayVendedor(perfil);
            const usarFirma = document.getElementById('vendedorUsarFirma').checked;
            document.getElementById('firmaVendedor').innerHTML = usarFirma && perfil.firma ? `<img src="${perfil.firma}" style="max-height: 80px; max-width: 100%;">` : '<div class="signature-line"></div>';
        }); 
    }
    
    function cargarDatosFormularioCliente(id) { 
        cargarDatosFormulario(id, 'clientesData', clienteFields, (perfil) => {
            document.getElementById('nombreClienteFirma').textContent = perfil.nombre || '';
            const usarFirma = document.getElementById('clienteUsarFirma').checked;
            document.getElementById('firmaCliente').innerHTML = usarFirma && perfil.firma ? `<img src="${perfil.firma}" style="max-height: 80px; max-width: 100%;">` : '<div class="signature-line"></div>';
        }); 
    }

    function limpiarFormulario(selectorId, fields, displayFn) {
        document.getElementById(selectorId).value = "";
        for (const fieldId in fields) {
            const element = document.getElementById(fieldId);
            if (element) element.type === 'checkbox' ? (element.checked = false) : (element.value = '');
        }
        displayFn({});
    }

    function limpiarFormularioEmpresa() { limpiarFormulario('empresaSelector', empresaFields, (p) => { actualizarDisplayEmpresa(p); document.getElementById('firmaRepresentante').innerHTML = '<div class="signature-line"></div>'; }); }
    function limpiarFormularioVendedor() { limpiarFormulario('vendedorSelector', vendedorFields, (p) => { actualizarDisplayVendedor(p); document.getElementById('firmaVendedor').innerHTML = '<div class="signature-line"></div>'; }); }
    function limpiarFormularioCliente() { limpiarFormulario('clienteSelector', clienteFields, (p) => { document.getElementById('nombreClienteFirma').textContent = ''; document.getElementById('firmaCliente').innerHTML = '<div class="signature-line"></div>'; }); }

    function guardarPerfil(selectorId, key, fields, required, loadFn, displayFn) {
        let perfiles = JSON.parse(localStorage.getItem(key)) || [];
        const datos = {};
        for (const fieldId in fields) {
            const element = document.getElementById(fieldId);
            if (element) datos[fields[fieldId]] = element.type === 'checkbox' ? element.checked : element.value.trim();
        }

        if (!datos[required.field]) return alert(required.message);

        const uniqueFieldKey = key === 'empresasData' ? 'nit' : 'identificacion';
        const uniqueFieldValue = datos[uniqueFieldKey];
        
        let perfilExistente = uniqueFieldValue ? perfiles.find(p => p[uniqueFieldKey] === uniqueFieldValue) : null;
        let perfilGuardado;

        if (perfilExistente) {
            const index = perfiles.findIndex(p => p.id === perfilExistente.id);
            perfiles[index] = { ...perfilExistente, ...datos };
            perfilGuardado = perfiles[index];
            alert('Perfil actualizado correctamente.');
        } else {
            datos.id = Date.now().toString();
            perfiles.push(datos);
            perfilGuardado = datos;
            alert('Nuevo perfil guardado correctamente.');
        }

        localStorage.setItem(key, JSON.stringify(perfiles));
        loadFn();
        
        setTimeout(() => {
            document.getElementById(selectorId).value = perfilGuardado.id;
            cargarDatosFormulario(perfilGuardado.id, key, fields, displayFn);
        }, 100);
    }

    function guardarPerfilEmpresa() { guardarPerfil('empresaSelector', 'empresasData', empresaFields, { field: 'nombre', message: 'El nombre de la empresa es obligatorio.' }, cargarPerfilesEmpresa, cargarDatosFormularioEmpresa); }
    function guardarPerfilVendedor() { guardarPerfil('vendedorSelector', 'vendedoresData', vendedorFields, { field: 'nombre', message: 'El nombre del vendedor es obligatorio.' }, cargarPerfilesVendedor, cargarDatosFormularioVendedor); }
    function guardarPerfilCliente() { guardarPerfil('clienteSelector', 'clientesData', clienteFields, { field: 'nombre', message: 'El nombre del cliente es obligatorio.' }, cargarPerfilesCliente, cargarDatosFormularioCliente); }
    
    function eliminarPerfil(selectorId, key, message, loadFn) {
        const id = document.getElementById(selectorId).value;
        if (!id) return alert("Por favor, seleccione un perfil para eliminar.");
        if (!confirm(message)) return;
        let perfiles = JSON.parse(localStorage.getItem(key)) || [];
        perfiles = perfiles.filter(p => p.id != id);
        localStorage.setItem(key, JSON.stringify(perfiles));
        alert('Perfil eliminado.');
        loadFn();
    }

    function eliminarPerfilEmpresa() { eliminarPerfil('empresaSelector', 'empresasData', '¿Eliminar este perfil de empresa?', cargarPerfilesEmpresa); }
    function eliminarPerfilVendedor() { eliminarPerfil('vendedorSelector', 'vendedoresData', '¿Eliminar este perfil de vendedor?', cargarPerfilesVendedor); }
    function eliminarPerfilCliente() { eliminarPerfil('clienteSelector', 'clientesData', '¿Eliminar este cliente?', cargarPerfilesCliente); }
    
    function actualizarDisplayEmpresa(datos) {
        let html = `<p class="mb-1"><strong>${datos.nombre || 'N/A'}</strong></p>`;
        if (datos.nit) html += `<p class="mb-1">NIT: ${datos.nit}</p>`;
        if (datos.direccion) html += `<p class="mb-1">${datos.direccion}</p>`;
        if (datos.telefono) html += `<p class="mb-1">Tel: ${datos.telefono}</p>`;
        if (datos.email) html += `<p class="mb-1">Email: ${datos.email}</p>`;
        if (datos.licencia) html += `<p class="mb-1">Lic. Sanitaria: ${datos.licencia}</p>`;
        if (datos.cuentaCUP) html += `<p class="mb-1">Cta. CUP: ${datos.cuentaCUP}</p>`;
        if (datos.representante) html += `<p class="mb-0">Rep.: ${datos.representante} (${datos.cargo || 'Titular'})</p>`;
        document.getElementById('datosEmpresaDisplay').innerHTML = html;
        document.getElementById('nombreDueñoFirma').textContent = datos.representante || '';
    }
    
    function actualizarDisplayVendedor(datos) {
        let html;
        if (datos && datos.nombre) {
            html = `<p class="mb-1"><strong>${datos.nombre}</strong></p>`;
            if (datos.identificacion) html += `<p class="mb-1">ID: ${datos.identificacion}</p>`;
            let contactInfo = [];
            if (datos.telefono) contactInfo.push(`Tel: ${datos.telefono}`);
            if (datos.email) contactInfo.push(`Email: ${datos.email}`);
            if (contactInfo.length > 0) html += `<p class="mb-0">${contactInfo.join(' | ')}</p>`;
        } else {
            html = '<p class="text-muted">Ninguno seleccionado</p>';
        }
        document.getElementById('datosVendedorDisplay').innerHTML = html;
        document.getElementById('nombreVendedorFirma').textContent = (datos && datos.nombre) ? datos.nombre : '';
    }

    function guardarProductosPredefinidos(data) {
        localStorage.setItem('productosPredefinidosData', JSON.stringify(data));
    }

    function cargarProductosPredefinidos() {
        return JSON.parse(localStorage.getItem('productosPredefinidosData'));
    }

    function renderizarPestanasProductos() {
        const data = cargarProductosPredefinidos();
        const categoriasPills = document.getElementById('categoriasProductoPills');
        const categoriasContent = document.getElementById('categoriasProductoContent');
        
        categoriasPills.innerHTML = '';
        categoriasContent.innerHTML = '';
        
        const btnEliminarCategoria = document.getElementById('eliminarCategoriaBtn');
        if (Object.keys(data).length === 0) {
            categoriasPills.innerHTML = '<p class="text-muted">No hay categorías. Añada una para empezar.</p>';
            btnEliminarCategoria.disabled = true;
            return;
        }

        btnEliminarCategoria.disabled = false;
        let isFirst = true;

        for (const categoria in data) {
            const categoriaId = categoria.replace(/\s+/g, '-').toLowerCase();
            const pill = document.createElement('li');
            pill.className = 'nav-item';
            pill.innerHTML = `<button class="nav-link ${isFirst ? 'active' : ''}" id="pills-${categoriaId}-tab" data-bs-toggle="pill" data-bs-target="#pills-${categoriaId}" type="button">${categoria}</button>`;
            categoriasPills.appendChild(pill);

            const content = document.createElement('div');
            content.className = `tab-pane fade ${isFirst ? 'show active' : ''}`;
            content.id = `pills-${categoriaId}`;
            
            let productosHtml = data[categoria].map(p => `
                <tr data-product-id="${p.id}" data-category="${categoria}">
                    <td class="align-middle"><input class="form-check-input prod-checkbox" type="checkbox"></td>
                    <td><input type="text" class="form-control form-control-sm prod-descripcion" value="${p.descripcion}"></td>
                    <td><input type="number" class="form-control form-control-sm prod-cantidad" value="${p.cantidad || 1}" min="1"></td>
                    <td><input type="number" class="form-control form-control-sm prod-precio" value="${p.precio}" step="0.01"></td>
                    <td class="text-end">
                        <button class="btn btn-success btn-sm anadir-a-factura-btn" title="Añadir a Factura"><i class="fas fa-plus"></i></button>
                        <button class="btn btn-primary btn-sm guardar-producto-btn" title="Guardar Cambios"><i class="fas fa-save"></i></button>
                        <button class="btn btn-danger btn-sm eliminar-producto-btn" title="Eliminar Producto"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');

            content.innerHTML = `
                <div class="card"><div class="card-body"><div class="table-responsive"><table class="table table-sm table-striped">
                    <thead><tr>
                        <th style="width: 40px;"><input class="form-check-input select-all-checkbox" type="checkbox" title="Seleccionar Todos"></th>
                        <th>Descripción</th>
                        <th style="width: 80px;">Cant.</th>
                        <th style="width: 120px;">P. Unit.</th>
                        <th style="width: 150px;" class="text-end">Acciones</th>
                    </tr></thead>
                    <tbody>${productosHtml}</tbody>
                    <tfoot>
                        <tr data-category="${categoria}">
                            <td></td>
                            <td><input type="text" class="form-control form-control-sm nuevo-prod-descripcion" placeholder="Nueva descripción"></td>
                            <td><input type="number" class="form-control form-control-sm nuevo-prod-cantidad" value="1" min="1"></td>
                            <td><input type="number" class="form-control form-control-sm nuevo-prod-precio" placeholder="0.00" step="0.01"></td>
                            <td class="text-end"><button class="btn btn-success btn-sm agregar-producto-btn"><i class="fas fa-plus"></i> Añadir</button></td>
                        </tr>
                    </tfoot>
                </table></div>
                <button class="btn btn-primary mt-3 anadir-seleccionados-btn"><i class="fas fa-tasks me-2"></i>Añadir Seleccionados a Factura</button>
                </div></div>
            `;
            categoriasContent.appendChild(content);
            isFirst = false;
        }
    }

    document.getElementById('agregarCategoriaBtn').addEventListener('click', () => {
        const input = document.getElementById('nuevaCategoriaInput');
        const nuevaCategoria = input.value.trim();
        if (nuevaCategoria) {
            const data = cargarProductosPredefinidos();
            if (data[nuevaCategoria]) {
                alert('Esa categoría ya existe.');
            } else {
                data[nuevaCategoria] = [];
                guardarProductosPredefinidos(data);
                renderizarPestanasProductos();
                input.value = '';
            }
        }
    });

    document.getElementById('eliminarCategoriaBtn').addEventListener('click', () => {
        const activePill = document.querySelector('#categoriasProductoPills .nav-link.active');
        if (!activePill) return alert('No hay ninguna categoría seleccionada.');
        const categoriaAEliminar = activePill.textContent;
        if (confirm(`¿Eliminar la categoría "${categoriaAEliminar}" y todos sus productos?`)) {
            const data = cargarProductosPredefinidos();
            delete data[categoriaAEliminar];
            guardarProductosPredefinidos(data);
            renderizarPestanasProductos();
        }
    });

    document.getElementById('categoriasProductoContent').addEventListener('click', (e) => {
        const target = e.target;
        if (!target.closest('button') && !target.classList.contains('form-check-input')) return;

        const container = target.closest('.tab-pane');
        const tr = target.closest('tr');

        if (target.classList.contains('select-all-checkbox')) {
            const isChecked = target.checked;
            container.querySelectorAll('.prod-checkbox').forEach(cb => cb.checked = isChecked);
        }

        if (target.classList.contains('prod-checkbox')) {
            const allCheckboxes = container.querySelectorAll('.prod-checkbox');
            const selectAll = container.querySelector('.select-all-checkbox');
            selectAll.checked = Array.from(allCheckboxes).every(cb => cb.checked);
        }
        
        if (target.closest('.anadir-seleccionados-btn')) {
            const productosSeleccionados = container.querySelectorAll('.prod-checkbox:checked');
            if (productosSeleccionados.length === 0) {
                return alert("No hay productos seleccionados para añadir.");
            }

            const ultimaFila = document.querySelector('#listaProductos tr:last-child');
            const ultimaFilaVacia = ultimaFila && ultimaFila.querySelector('.descripcion').value === '' && ultimaFila.querySelector('.cantidad').value === '1';
            
            if (ultimaFilaVacia) {
                 ultimaFila.remove();
            }

            productosSeleccionados.forEach(cb => {
                const fila = cb.closest('tr');
                const descripcion = fila.querySelector('.prod-descripcion').value;
                const cantidad = parseFloat(fila.querySelector('.prod-cantidad').value) || 1;
                const precio = parseFloat(fila.querySelector('.prod-precio').value) || 0;
                agregarFilaProducto(descripcion, cantidad, precio);
            });
            
            // *** CORRECCIÓN #1: Llamar a las funciones después de añadir los productos ***
            calcularTotales();
            guardarProductos();
            
            alert(`${productosSeleccionados.length} productos añadidos a la factura.`);
            bootstrap.Tab.getInstance(document.getElementById('factura-tab')).show();
        }

        if (tr) {
            const categoria = tr.dataset.category;
            if (target.closest('.agregar-producto-btn')) {
                const descripcion = tr.querySelector('.nuevo-prod-descripcion').value.trim();
                const cantidad = tr.querySelector('.nuevo-prod-cantidad').value;
                const precio = tr.querySelector('.nuevo-prod-precio').value;
                if (descripcion && precio && cantidad) {
                    const data = cargarProductosPredefinidos();
                    data[categoria].push({ id: Date.now().toString(), descripcion, cantidad, precio });
                    guardarProductosPredefinidos(data);
                    renderizarPestanasProductos();
                    setTimeout(() => document.querySelector(`#pills-${categoria.replace(/\s+/g, '-').toLowerCase()}-tab`).click(), 100);
                } else {
                    alert('Por favor, complete todos los campos del nuevo producto.');
                }
            }

            if (target.closest('.guardar-producto-btn')) {
                const productoId = tr.dataset.productId;
                const descripcion = tr.querySelector('.prod-descripcion').value.trim();
                const cantidad = tr.querySelector('.prod-cantidad').value;
                const precio = tr.querySelector('.prod-precio').value;
                if (descripcion && precio && cantidad) {
                    const data = cargarProductosPredefinidos();
                    const producto = data[categoria].find(p => p.id === productoId);
                    if (producto) {
                        producto.descripcion = descripcion;
                        producto.cantidad = cantidad;
                        producto.precio = precio;
                        guardarProductosPredefinidos(data);
                        alert('Producto guardado.');
                    }
                } else {
                    alert('Todos los campos del producto son obligatorios.');
                }
            }

            if (target.closest('.eliminar-producto-btn')) {
                if (confirm('¿Eliminar este producto predefinido?')) {
                    const productoId = tr.dataset.productId;
                    const data = cargarProductosPredefinidos();
                    data[categoria] = data[categoria].filter(p => p.id !== productoId);
                    guardarProductosPredefinidos(data);
                    renderizarPestanasProductos();
                    setTimeout(() => document.querySelector(`#pills-${categoria.replace(/\s+/g, '-').toLowerCase()}-tab`).click(), 100);
                }
            }
            
            if (target.closest('.anadir-a-factura-btn')) {
                const descripcion = tr.querySelector('.prod-descripcion').value;
                const cantidad = parseFloat(tr.querySelector('.prod-cantidad').value) || 1;
                const precio = parseFloat(tr.querySelector('.prod-precio').value) || 0;
                const ultimaFila = document.querySelector('#listaProductos tr:last-child');
                if (ultimaFila && ultimaFila.querySelector('.descripcion').value === '' && ultimaFila.querySelector('.cantidad').value === '1') {
                     ultimaFila.querySelector('.descripcion').value = descripcion;
                     ultimaFila.querySelector('.cantidad').value = cantidad;
                     ultimaFila.querySelector('.precio').value = precio.toFixed(2);
                } else {
                    agregarFilaProducto(descripcion, cantidad, precio);
                }
                
                // *** CORRECCIÓN #1: Llamar a las funciones después de añadir el producto ***
                calcularTotales();
                guardarProductos();
                bootstrap.Tab.getInstance(document.getElementById('factura-tab')).show();
            }
        }
    });

    document.getElementById('abrirModalImportarProductos').addEventListener('click', () => {
        const selector = document.getElementById('importarCategoriaSelector');
        const categorias = Object.keys(cargarProductosPredefinidos());
        selector.innerHTML = categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    });

    document.getElementById('importarProductosPredefinidosBtn').addEventListener('click', () => {
        const categoriaSeleccionada = document.getElementById('importarCategoriaSelector').value;
        const texto = document.getElementById('productosPredefinidosImportar').value.trim();

        if (!categoriaSeleccionada) return alert('Por favor, seleccione una categoría de destino.');
        if (!texto) return;

        const data = cargarProductosPredefinidos();
        let productosImportados = 0;

        texto.split('\n').forEach(linea => {
            const partes = linea.split('|').map(p => p.trim());
            if (partes.length >= 3) {
                const descripcion = partes[0];
                const cantidad = parseFloat(partes[1]) || 1;
                const precio = parseFloat(partes[2]) || 0;
                if (descripcion) {
                    data[categoriaSeleccionada].push({ id: Date.now().toString() + Math.random(), descripcion, cantidad, precio: precio.toFixed(2) });
                    productosImportados++;
                }
            }
        });

        guardarProductosPredefinidos(data);
        alert(`${productosImportados} productos importados a la categoría "${categoriaSeleccionada}".`);
        bootstrap.Modal.getInstance(document.getElementById('modalImportarProductosPredefinidos')).hide();
        document.getElementById('productosPredefinidosImportar').value = '';
        renderizarPestanasProductos();
        setTimeout(() => document.querySelector(`#pills-${categoriaSeleccionada.replace(/\s+/g, '-').toLowerCase()}-tab`).click(), 100);
    });

    async function generarPDF() {
        const empresaId = document.getElementById('empresaSelector').value;
        const vendedorId = document.getElementById('vendedorSelector').value;
        const clienteId = document.getElementById('clienteSelector').value;

        if (!empresaId) return alert('Por favor, seleccione un perfil de Empresa.');
        if (!clienteId) return alert('Por favor, seleccione un perfil de Cliente.');
        if (Object.keys(pdfTemplates).length === 0) return alert('Las plantillas no se han cargado. Revise la consola de errores.');
        
        const originalText = document.getElementById('generarFactura').innerHTML;
        document.getElementById('generarFactura').innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Generando...';
        document.getElementById('generarFactura').disabled = true;
        
        try {
            facturasCount++;
            localStorage.setItem('facturasCount', facturasCount);
            
            const empresa = JSON.parse(localStorage.getItem('empresasData')).find(e => e.id == empresaId);
            const cliente = JSON.parse(localStorage.getItem('clientesData')).find(c => c.id == clienteId);
            const vendedor = vendedorId ? JSON.parse(localStorage.getItem('vendedoresData')).find(v => v.id == vendedorId) : null;
            
            const productos = Array.from(document.querySelectorAll('#listaProductos tr')).filter(row => row.querySelector('.descripcion').value.trim());
            const lotesDeProductos = [];
            for (let i = 0; i < productos.length; i += 22) {
                lotesDeProductos.push(productos.slice(i, i + 22));
            }

            const pdf = new jsPDF('p', 'mm', 'letter');
            const MARGIN_MM = 15;
            const contentWidth = pdf.internal.pageSize.getWidth() - (MARGIN_MM * 2);

            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'fixed';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = `${contentWidth}mm`; 
            tempContainer.style.background = '#fff';
            document.body.appendChild(tempContainer);

            for (let i = 0; i < lotesDeProductos.length; i++) {
                const esUltimaPagina = (i === lotesDeProductos.length - 1);
                const omitirFecha = document.getElementById('omitirFechaCheck').checked;
                const omitirPaginacion = document.getElementById('omitirPaginacionCheck').checked || lotesDeProductos.length === 1;
                
                const datosPagina = {
                    empresa, vendedor, cliente,
                    numeroFactura: document.getElementById('numeroFactura').value,
                    fechaFormateada: omitirFecha ? '__BLANK_DATE__' : new Date(document.getElementById('fechaFactura').value + 'T00:00:00').toLocaleDateString('es-ES'),
                    numeroPagina: omitirPaginacion ? '' : `Página ${i + 1} de ${lotesDeProductos.length}`,
                    subtotal: esUltimaPagina ? document.getElementById('subtotal').textContent : '',
                    total: esUltimaPagina ? document.getElementById('total').textContent : '',
                    notas: esUltimaPagina ? document.getElementById('notasFactura').value.replace(/\n/g, '<br>') : '',
                    mostrarFirmas: esUltimaPagina,
                    loteProductos: lotesDeProductos[i]
                };
                
                tempContainer.innerHTML = construirHtmlParaPagina(datosPagina);
                
                await new Promise(resolve => {
                    const images = tempContainer.querySelectorAll('img');
                    if (images.length === 0) return resolve();
                    let loadedCount = 0;
                    images.forEach(img => {
                        if (img.complete) loadedCount++;
                        else {
                            img.onload = img.onerror = () => { loadedCount++; if (loadedCount === images.length) resolve(); };
                        }
                    });
                    if (loadedCount === images.length) resolve();
                });

                const canvas = await html2canvas(tempContainer, { scale: 2, useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                if (i > 0) pdf.addPage();
                const contentHeight = contentWidth * (canvas.height / canvas.width);
                pdf.addImage(imgData, 'PNG', MARGIN_MM, MARGIN_MM, contentWidth, contentHeight);
            }

            document.body.removeChild(tempContainer);
            pdf.save(`factura_${document.getElementById('numeroFactura').value}.pdf`);

        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar el PDF. Verifica la consola.');
        } finally {
            document.getElementById('generarFactura').innerHTML = originalText;
            document.getElementById('generarFactura').disabled = false;
        }
    }

    function construirHtmlParaPagina(datos) {
        const { empresa, vendedor, cliente, numeroFactura, fechaFormateada, numeroPagina, subtotal, total, notas, mostrarFirmas, loteProductos } = datos;
        
        const templateArray = pdfTemplates[plantillaActual] || pdfTemplates['classic'];
        if (!templateArray) return '<div>Error: Plantilla no encontrada en el JSON.</div>';
        let template = templateArray.join('\n');

        let tablaBody = loteProductos.map(fila => {
            const descripcion = fila.querySelector('.descripcion').value || 'N/A';
            const cantidad = fila.querySelector('.cantidad').value || '0';
            const precio = parseFloat(fila.querySelector('.precio').value || 0).toFixed(2);
            const totalItem = fila.querySelector('.total-item').textContent || '0.00';
            
            if (['premium', 'minimalist', 'monochrome', 'swiss', 'artisan', 'classic', 'modern', 'horizontal'].includes(plantillaActual)) {
                return `<tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${descripcion}</td><td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #eee;">${cantidad}</td><td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #eee;">${precio}</td><td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #eee;">${totalItem}</td></tr>`;
            } else if (plantillaActual === 'creative') {
                return `<tr><td style="padding: 6px 0; border-bottom: 1px solid #eee;">${descripcion}<br><small style="color: #777;">${cantidad} x ${precio}</small></td><td style="padding: 6px 0; text-align: right; border-bottom: 1px solid #eee;">${totalItem}</td></tr>`;
            } else {
                return `<tr><td style="padding: 5px; border-bottom: 1px solid #eee;">${descripcion}</td><td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${cantidad}</td><td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${precio}</td><td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${totalItem}</td></tr>`;
            }
        }).join('');

        const firmaManualHtml = '<div style="border-top: 1px solid #333; width: 80%; margin: 25px auto 5px auto; padding-top: 5px;"></div>';
        let firmaVendedorHtml = (vendedor && vendedor.nombre) ? `<div style="width: 30%;">${(vendedor.usarFirma && vendedor.firma) ? `<img src="${vendedor.firma}" style="max-height: 50px; max-width: 100%;" alt="Firma Vendedor">` : firmaManualHtml}<div style="font-size: 8px; margin-top: 5px;">${vendedor.nombre}</div></div>` : '<div style="width: 30%;"></div>';
        const firmasHtml = mostrarFirmas ? `<div style="margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 15px;"><div style="display: flex; justify-content: space-between; text-align: center; font-family: sans-serif;">${firmaVendedorHtml}<div style="width: 30%;">${(empresa.usarFirma && empresa.firma) ? `<img src="${empresa.firma}" style="max-height: 50px; max-width: 100%;" alt="Firma Representante">` : firmaManualHtml}${empresa.representante ? `<div style="font-size: 8px; margin-top: 5px;">${empresa.representante}</div>` : ''}</div><div style="width: 30%;">${(cliente.usarFirma && cliente.firma) ? `<img src="${cliente.firma}" style="max-height: 50px; max-width: 100%;" alt="Firma Cliente">` : firmaManualHtml}<div style="font-size: 8px; margin-top: 5px;">${cliente.nombre || 'Cliente'}</div></div></div></div>` : '';
        const totalesHtml = mostrarFirmas ? `<div style="display: flex; justify-content: flex-end; margin-top: 15px; font-family: sans-serif;"><div style="width: 45%; min-width: 180px; background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 10px;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Subtotal:</span><span>${subtotal}</span></div><div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #ddd; font-weight: bold; font-size: 12px;"><span>TOTAL GENERAL:</span><span>${total}</span></div></div></div>` : '';
        const notasHtml = mostrarFirmas && notas ? `<div style="margin-top: 15px; font-size: 8px; color: #555; font-family: sans-serif;"><strong>Notas:</strong><br>${notas}</div>` : '';
        const empresaHtmlBlock = `${empresa.nombre ? `<p style="margin:0;"><strong>${empresa.nombre}</strong></p>` : ''}${empresa.nit ? `<p style="margin:0;">NIT: ${empresa.nit}</p>` : ''}${empresa.direccion ? `<p style="margin:0;">${empresa.direccion}</p>` : ''}${empresa.licencia ? `<p style="margin:0;">Lic. Sanitaria: ${empresa.licencia}</p>` : ''}${empresa.cuentaCUP ? `<p style="margin:0;">Cta. CUP: ${empresa.cuentaCUP}</p>` : ''}`;
        const clienteHtmlBlock = `${cliente.nombre ? `<p style="margin:0;"><strong>${cliente.nombre}</strong></p>` : ''}${cliente.identificacion ? `<p style="margin:0;">NIT/Cédula: ${cliente.identificacion}</p>` : ''}${cliente.direccion ? `<p style="margin:0;">${cliente.direccion}</p>` : ''}`;
        
        const generarFechaHtml = () => {
            const esFechaEnBlanco = fechaFormateada === '__BLANK_DATE__';
            const contenidoFecha = esFechaEnBlanco ? '_______________' : fechaFormateada;
            if (!fechaFormateada && !esFechaEnBlanco) return '';
            switch (plantillaActual) {
                case 'premium': return `<div><strong style="color: #888; font-size: 8px; text-transform: uppercase;">Fecha</strong><p style="margin:0;">${contenidoFecha}</p></div>`;
                case 'creative': return `<div style="margin-bottom: 15px;"><strong style="font-size: 9px; text-transform: uppercase; opacity: 0.7;">Fecha:</strong><p style="margin:2px 0 0 0; font-size: 10px;">${contenidoFecha}</p></div>`;
                case 'monochrome': return `<p style="font-size: 9px; margin: 0;"><strong>Fecha:</strong> ${contenidoFecha}</p>`;
                default: return `<p style="margin: 0; font-size: 9px;"><strong>Fecha:</strong> ${contenidoFecha}</p>`;
            }
        };

        const generarNumFacturaHtml = () => {
            if (!numeroFactura) return '';
            const numeroPaginaHtml = numeroPagina ? ` | ${numeroPagina}` : '';
            switch (plantillaActual) {
                case 'premium': return `<p style="margin: 0; color: #555;">No. ${numeroFactura}${numeroPaginaHtml}</p>`;
                case 'creative': return `<div style="margin-bottom: 15px;"><strong style="font-size: 9px; text-transform: uppercase; opacity: 0.7;">Factura No:</strong><p style="margin:2px 0 0 0; font-size: 10px;">${numeroFactura}</p></div>`;
                case 'minimalist': return `<p style="margin:0;"><strong>No.:</strong> ${numeroFactura}</p>`;
                case 'monochrome': return `<p style="font-size: 9px; margin: 0;"><strong>Nº Factura:</strong> ${numeroFactura}</p>`;
                default: return `<p style="margin: 0; font-size: 9px;"><strong>No.:</strong> ${numeroFactura}</p>`;
            }
        }
        
        const replacements = {
            '{{baseStyles}}': "font-family: 'Montserrat', sans-serif; font-size: 9px; line-height: 1.5; color: #333; box-sizing: border-box;",
            '{{fechaHtml}}': generarFechaHtml(),
            '{{fechaRaw}}': fechaFormateada === '__BLANK_DATE__' ? '_______________' : (fechaFormateada || ''),
            '{{numeroFacturaRaw}}': numeroFactura || '',
            '{{numeroFactura}}': generarNumFacturaHtml(),
            '{{numeroPagina}}': numeroPagina,
            '{{empresaHtmlBlock}}': empresaHtmlBlock,
            '{{empresaNombre}}': empresa.nombre || '',
            '{{empresaNit}}': empresa.nit || '',
            '{{clienteHtmlBlock}}': clienteHtmlBlock,
            '{{clienteNombre}}': cliente.nombre || '',
            '{{clienteDireccion}}': cliente.direccion || '',
            '{{clienteIdentificacion}}': cliente.identificacion ? `NIT/Cédula: ${cliente.identificacion}` : '',
            '{{vendedorNombre}}': (vendedor && vendedor.nombre) ? vendedor.nombre : '',
            '{{tablaBody}}': tablaBody,
            '{{totalesHtml}}': mostrarFirmas ? totalesHtml : '',
            '{{notasHtml}}': mostrarFirmas ? notasHtml : '',
            '{{firmasHtml}}': mostrarFirmas ? firmasHtml : '',
        };

        for (const [key, value] of Object.entries(replacements)) {
            template = template.replace(new RegExp(key, 'g'), value);
        }

        return template;
    }
});