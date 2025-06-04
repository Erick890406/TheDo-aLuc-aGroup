var gastos = [];
var calculos = {
    totalVentas: 0, inversion: 0, costoPorPizza: 0, ganancias: 0,
    quesoPorPizza: 0, pizzasPorJarro: 0,
    totalVentasJamon: 0, inversionJamon: 0, gananciasJamon: 0,
    totalVentasSalchicha: 0, inversionSalchicha: 0, gananciasSalchicha: 0
};
var fechaActual = new Date().toISOString().split('T')[0];

const listaGastosEl = document.getElementById('listaGastos');
const totalGastosPEl = document.querySelector('#totalGastos p');
const otrosGastosDescEl = document.getElementById('otrosGastosDesc');
const otrosGastosEl = document.getElementById('otrosGastos');
const totalesEl = document.getElementById('totales');
const registroTotalesEl = document.getElementById('registroTotales');
const fechaVisualizacionEl = document.getElementById('fechaVisualizacion');

const inputs = {
    jarrosHarina: document.getElementById('jarrosHarina'), costoJarro: document.getElementById('costoJarro'),
    librasQueso: document.getElementById('librasQueso'), costoQueso: document.getElementById('costoQueso'),
    manoObra: document.getElementById('manoObra'), precioVenta: document.getElementById('precioVenta'),
    cantidadPizzas: document.getElementById('cantidadPizzas'), librasJamon: document.getElementById('librasJamon'),
    costoJamon: document.getElementById('costoJamon'), cantidadPizzasJamon: document.getElementById('cantidadPizzasJamon'),
    precioVentaJamon: document.getElementById('precioVentaJamon'), librasSalchicha: document.getElementById('librasSalchicha'),
    costoSalchicha: document.getElementById('costoSalchicha'), cantidadPizzasSalchicha: document.getElementById('cantidadPizzasSalchicha'),
    precioVentaSalchicha: document.getElementById('precioVentaSalchicha')
};

function agregarGasto() {
  const desc = otrosGastosDescEl.value.trim();
  const costo = parseFloat(otrosGastosEl.value);
  if (desc && !isNaN(costo) && costo > 0) {
    gastos.push({ desc: desc, costo: costo });
    otrosGastosDescEl.value = '';
    otrosGastosEl.value = '';
    mostrarGastos();
    guardarDatos();
    otrosGastosDescEl.focus();
  } else {
      alert("Ingrese una descripción y un costo válido para el gasto.");
  }
}

function eliminarGasto(index) {
  if (index >= 0 && index < gastos.length) {
      const gastoEliminar = gastos[index];
      if(confirm(`¿Eliminar gasto "${gastoEliminar.desc}" por $${gastoEliminar.costo.toFixed(2)}?`)) {
           gastos.splice(index, 1);
           mostrarGastos();
           guardarDatos();
      }
  }
}

function mostrarGastos() {
  listaGastosEl.innerHTML = '';
  let totalOtrosGastos = 0;
  if (gastos.length === 0) {
      listaGastosEl.innerHTML = '<li class="hint-text"><i class="fas fa-info-circle"></i> No hay gastos adicionales añadidos.</li>';
  } else {
      gastos.forEach((gasto, index) => {
        totalOtrosGastos += gasto.costo;
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${gasto.desc}: <strong>$${gasto.costo.toFixed(2)}</strong></span>
            <button class="btn btn-danger btn-sm btn-eliminar" onclick="eliminarGasto(${index})" title="Eliminar Gasto">
                <i class="fas fa-times"></i>
            </button>
        `;
        listaGastosEl.appendChild(li);
      });
  }
  totalGastosPEl.textContent = `$${totalOtrosGastos.toFixed(2)}`;
}

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const button = section.previousElementSibling;
  if (section.style.display === 'none' || section.style.display === '') {
      section.style.display = 'block';
      button.classList.add('active');
  } else {
      section.style.display = 'none';
      button.classList.remove('active');
  }
}

function calcular() {
    const jarrosHarina = parseFloat(inputs.jarrosHarina.value) || 0;
    const costoJarro = parseFloat(inputs.costoJarro.value) || 0;
    const librasQueso = parseFloat(inputs.librasQueso.value) || 0;
    const costoQueso = parseFloat(inputs.costoQueso.value) || 0;
    const manoObra = parseFloat(inputs.manoObra.value) || 0;
    const precioVenta = parseFloat(inputs.precioVenta.value) || 0;
    const cantidadPizzas = parseFloat(inputs.cantidadPizzas.value) || 0;
    const librasJamon = parseFloat(inputs.librasJamon.value) || 0;
    const costoJamon = parseFloat(inputs.costoJamon.value) || 0;
    const cantidadPizzasJamon = parseFloat(inputs.cantidadPizzasJamon.value) || 0;
    const precioVentaJamon = parseFloat(inputs.precioVentaJamon.value) || 0;
    const librasSalchicha = parseFloat(inputs.librasSalchicha.value) || 0;
    const costoSalchicha = parseFloat(inputs.costoSalchicha.value) || 0;
    const cantidadPizzasSalchicha = parseFloat(inputs.cantidadPizzasSalchicha.value) || 0;
    const precioVentaSalchicha = parseFloat(inputs.precioVentaSalchicha.value) || 0;

    const costoHarina = jarrosHarina * costoJarro;
    const costoQuesoTotal = librasQueso * costoQueso;
    const totalOtrosGastos = gastos.reduce((sum, gasto) => sum + (gasto.costo || 0), 0);
    calculos.inversion = costoHarina + costoQuesoTotal + manoObra + totalOtrosGastos;

    calculos.totalVentas = precioVenta * cantidadPizzas;
    calculos.ganancias = calculos.totalVentas - calculos.inversion;
    calculos.costoPorPizza = cantidadPizzas > 0 ? calculos.inversion / cantidadPizzas : 0;

    calculos.quesoPorPizza = librasQueso > 0 && cantidadPizzas > 0 ? cantidadPizzas / librasQueso : 0;
    calculos.pizzasPorJarro = jarrosHarina > 0 && cantidadPizzas > 0 ? cantidadPizzas / jarrosHarina : 0;

    calculos.inversionJamon = librasJamon * costoJamon;
    calculos.totalVentasJamon = precioVentaJamon * cantidadPizzasJamon;
    calculos.gananciasJamon = calculos.totalVentasJamon - calculos.inversionJamon;

    calculos.inversionSalchicha = librasSalchicha * costoSalchicha;
    calculos.totalVentasSalchicha = precioVentaSalchicha * cantidadPizzasSalchicha;
    calculos.gananciasSalchicha = calculos.totalVentasSalchicha - calculos.inversionSalchicha;

    mostrarResultados(calculos, totalesEl);
    guardarDatos();
}

function mostrarResultados(datos, elementoDestino) {
    if (!datos) {
        elementoDestino.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> No hay datos calculados para mostrar.</p>`;
        return;
    }
    const parseNum = (val) => parseFloat(val) || 0;

    elementoDestino.innerHTML = `
        <div class="total-box income">
            <h3><i class="fas fa-chart-pie"></i> Ganancia Neta (Base)</h3>
            <p>$${parseNum(datos.ganancias).toFixed(2)}</p>
        </div>
        <div class="total-box balance">
            <h3><i class="fas fa-cash-register"></i> Ventas Totales (Base)</h3>
            <p>$${parseNum(datos.totalVentas).toFixed(2)}</p>
        </div>
         <div class="total-box expense">
            <h3><i class="fas fa-file-invoice-dollar"></i> Inversión Total (Base)</h3>
            <p>$${parseNum(datos.inversion).toFixed(2)}</p>
        </div>
        <div class="total-box expense small">
            <h3><i class="fas fa-divide"></i> Costo / Pizza (Base)</h3>
            <p>$${parseNum(datos.costoPorPizza).toFixed(2)}</p>
        </div>
        <div class="total-box info small">
            <h3><i class="fas fa-balance-scale-right"></i> Pizzas / Lb Queso</h3>
            <p>${parseNum(datos.quesoPorPizza).toFixed(2)}</p>
        </div>
        <div class="total-box info small">
            <h3><i class="fas fa-bread-slice"></i> Pizzas / Jarro Harina</h3>
            <p>${parseNum(datos.pizzasPorJarro).toFixed(2)}</p>
        </div>
         ${parseNum(datos.gananciasJamon) !== 0 ? `
         <div class="total-box income small">
            <h3><i class="fas fa-drumstick-bite"></i> Ganancia (Jamón)</h3>
            <p>$${parseNum(datos.gananciasJamon).toFixed(2)}</p>
         </div>` : ''}
         ${parseNum(datos.gananciasSalchicha) !== 0 ? `
         <div class="total-box income small">
            <h3><i class="fas fa-hotdog"></i> Ganancia (Salchicha)</h3>
            <p>$${parseNum(datos.gananciasSalchicha).toFixed(2)}</p>
         </div>` : ''}
    `;
}

function limpiarYReiniciar() {
    if (confirm("¿Seguro que quieres borrar todos los campos y gastos?")) {
        for (const key in inputs) {
            if (inputs[key]) {
                 inputs[key].value = '';
            }
        }
        otrosGastosDescEl.value = '';
        otrosGastosEl.value = '';
        gastos = [];
        mostrarGastos();
        totalesEl.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> Presione Calcular para ver los resultados.</p>`;
        registroTotalesEl.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> Seleccione una fecha y presione Mostrar.</p>`;
        calculos = { totalVentas: 0, inversion: 0, costoPorPizza: 0, ganancias: 0, quesoPorPizza: 0, pizzasPorJarro: 0, totalVentasJamon: 0, inversionJamon: 0, gananciasJamon: 0, totalVentasSalchicha: 0, inversionSalchicha: 0, gananciasSalchicha: 0 };
        console.log("Campos limpiados.");
    }
}

function guardarDatos() {
  const fecha = new Date().toISOString().split('T')[0];
  const datosDelDia = {
    jarrosHarina: inputs.jarrosHarina.value, costoJarro: inputs.costoJarro.value,
    librasQueso: inputs.librasQueso.value, costoQueso: inputs.costoQueso.value,
    manoObra: inputs.manoObra.value, precioVenta: inputs.precioVenta.value,
    cantidadPizzas: inputs.cantidadPizzas.value, librasJamon: inputs.librasJamon.value,
    costoJamon: inputs.costoJamon.value, cantidadPizzasJamon: inputs.cantidadPizzasJamon.value,
    precioVentaJamon: inputs.precioVentaJamon.value, librasSalchicha: inputs.librasSalchicha.value,
    costoSalchicha: inputs.costoSalchicha.value, cantidadPizzasSalchicha: inputs.cantidadPizzasSalchicha.value,
    precioVentaSalchicha: inputs.precioVentaSalchicha.value,
    otrosGastos: [...gastos],
    totalVentas: (calculos.totalVentas || 0).toFixed(2),
    inversion: (calculos.inversion || 0).toFixed(2),
    costoPorPizza: (calculos.costoPorPizza || 0).toFixed(2),
    ganancias: (calculos.ganancias || 0).toFixed(2),
    quesoPorPizza: (calculos.quesoPorPizza || 0).toFixed(2),
    pizzasPorJarro: (calculos.pizzasPorJarro || 0).toFixed(2),
    gananciasJamon: (calculos.gananciasJamon || 0).toFixed(2),
    gananciasSalchicha: (calculos.gananciasSalchicha || 0).toFixed(2)
  };

  try {
      let registros = JSON.parse(localStorage.getItem('registrosPizza')) || {};
      registros[fecha] = datosDelDia;
      localStorage.setItem('registrosPizza', JSON.stringify(registros));
      console.log(`Datos guardados para ${fecha}`);
  } catch (error) {
      console.error("Error al guardar datos en localStorage:", error);
      alert("Hubo un error al guardar los datos. Verifica el espacio disponible en el navegador.");
  }
}

function cargarDatos() {
  const fecha = new Date().toISOString().split('T')[0];
  if (!fechaVisualizacionEl.value) {
      fechaVisualizacionEl.value = fecha;
  }

  try {
      const registros = JSON.parse(localStorage.getItem('registrosPizza')) || {};
      const datosGuardados = registros[fecha];

      if (datosGuardados) {
        inputs.jarrosHarina.value = datosGuardados.jarrosHarina || '';
        inputs.costoJarro.value = datosGuardados.costoJarro || '';
        inputs.librasQueso.value = datosGuardados.librasQueso || '';
        inputs.costoQueso.value = datosGuardados.costoQueso || '';
        inputs.manoObra.value = datosGuardados.manoObra || '';
        inputs.precioVenta.value = datosGuardados.precioVenta || '';
        inputs.cantidadPizzas.value = datosGuardados.cantidadPizzas || '';
        inputs.librasJamon.value = datosGuardados.librasJamon || '';
        inputs.costoJamon.value = datosGuardados.costoJamon || '';
        inputs.cantidadPizzasJamon.value = datosGuardados.cantidadPizzasJamon || '';
        inputs.precioVentaJamon.value = datosGuardados.precioVentaJamon || '';
        inputs.librasSalchicha.value = datosGuardados.librasSalchicha || '';
        inputs.costoSalchicha.value = datosGuardados.costoSalchicha || '';
        inputs.cantidadPizzasSalchicha.value = datosGuardados.cantidadPizzasSalchicha || '';
        inputs.precioVentaSalchicha.value = datosGuardados.precioVentaSalchicha || '';

        gastos = Array.isArray(datosGuardados.otrosGastos) ? datosGuardados.otrosGastos : [];
        mostrarGastos();

        calculos.totalVentas = parseFloat(datosGuardados.totalVentas) || 0;
        calculos.inversion = parseFloat(datosGuardados.inversion) || 0;
        calculos.costoPorPizza = parseFloat(datosGuardados.costoPorPizza) || 0;
        calculos.ganancias = parseFloat(datosGuardados.ganancias) || 0;
        calculos.quesoPorPizza = parseFloat(datosGuardados.quesoPorPizza) || 0;
        calculos.pizzasPorJarro = parseFloat(datosGuardados.pizzasPorJarro) || 0;
        calculos.gananciasJamon = parseFloat(datosGuardados.gananciasJamon) || 0;
        calculos.gananciasSalchicha = parseFloat(datosGuardados.gananciasSalchicha) || 0;

        if(calculos.inversion > 0 || calculos.totalVentas > 0) {
             mostrarResultados(calculos, totalesEl);
        } else {
             totalesEl.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> Presione Calcular para ver los resultados del día.</p>`;
        }
         console.log(`Datos cargados para ${fecha}`);
      } else {
          console.log(`No hay datos guardados para hoy (${fecha}).`);
          mostrarGastos();
          totalesEl.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> Ingrese los datos y presione Calcular.</p>`;
      }
      registroTotalesEl.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> Seleccione una fecha y presione Mostrar.</p>`;

  } catch (error) {
      console.error("Error al cargar datos de localStorage:", error);
      alert("Hubo un error al cargar los datos guardados.");
      localStorage.removeItem('registrosPizza');
      gastos = [];
      mostrarGastos();
      totalesEl.innerHTML = `<p class="hint-text"><i class="fas fa-info-circle"></i> Error al cargar. Ingrese datos y calcule.</p>`;
  }
}

function mostrarRegistro() {
  const fecha = fechaVisualizacionEl.value;
  if (!fecha) {
    alert('Por favor, selecciona una fecha.');
    return;
  }

  try {
      const registros = JSON.parse(localStorage.getItem('registrosPizza')) || {};
      const datosGuardados = registros[fecha];

      if (!datosGuardados) {
        registroTotalesEl.innerHTML = `<p class="hint-text error"><i class="fas fa-exclamation-triangle"></i> No hay registros guardados para la fecha ${fecha}.</p>`;
        return;
      }
      mostrarResultados(datosGuardados, registroTotalesEl);

  } catch (error) {
       console.error("Error al mostrar registro:", error);
       registroTotalesEl.innerHTML = `<p class="hint-text error"><i class="fas fa-exclamation-triangle"></i> Error al leer los registros.</p>`;
  }
}

function obtenerNombreDia(fechaStr) {
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const date = new Date(`${fechaStr}T12:00:00`);
  return diasSemana[date.getUTCDay()];
}

function copiarAlPortapapeles() {
  const fecha = fechaVisualizacionEl.value;
  if (!fecha) {
    alert('Por favor, selecciona una fecha para copiar.');
    return;
  }

  try {
      const registros = JSON.parse(localStorage.getItem('registrosPizza')) || {};
      const totales = registros[fecha];

      if (!totales) {
        alert('No hay registros para copiar de la fecha seleccionada.');
        return;
      }

      const nombreDia = obtenerNombreDia(fecha);
      const parseNum = (val) => parseFloat(val) || 0;

      let texto = `📊 CÁLCULO PIZZAS - ${nombreDia}, ${fecha} 📊\n\n`;
      texto += `💰 GANANCIA NETA (Base): $${parseNum(totales.ganancias).toFixed(2)}\n`;
      texto += `📈 VENTAS TOTALES (Base): $${parseNum(totales.totalVentas).toFixed(2)}\n`;
      texto += `📉 INVERSIÓN TOTAL (Base): $${parseNum(totales.inversion).toFixed(2)}\n`;
      texto += `🍕 COSTO / PIZZA (Base): $${parseNum(totales.costoPorPizza).toFixed(2)}\n\n`;
      texto += `🧀 Pizzas / Lb Queso: ${parseNum(totales.quesoPorPizza).toFixed(2)}\n`;
      texto += `🍞 Pizzas / Jarro Harina: ${parseNum(totales.pizzasPorJarro).toFixed(2)}\n\n`;

      if (parseNum(totales.gananciasJamon) !== 0) {
          texto += `🥓 GANANCIA (Jamón): $${parseNum(totales.gananciasJamon).toFixed(2)}\n`;
      }
      if (parseNum(totales.gananciasSalchicha) !== 0) {
          texto += `🌭 GANANCIA (Salchicha): $${parseNum(totales.gananciasSalchicha).toFixed(2)}\n`;
      }

      if (totales.otrosGastos && totales.otrosGastos.length > 0) {
          texto += "\n--- Otros Gastos ---\n";
          let totalOtros = 0;
          totales.otrosGastos.forEach(g => {
              texto += `- ${g.desc}: $${parseNum(g.costo).toFixed(2)}\n`;
              totalOtros += parseNum(g.costo);
          });
          texto += `Total Otros Gastos: $${totalOtros.toFixed(2)}\n`;
      }

      navigator.clipboard.writeText(texto).then(() => {
        alert('Registro copiado al portapapeles.');
      }).catch(err => {
        console.error('Error al copiar al portapapeles: ', err);
        alert('Error al intentar copiar el registro.');
      });

  } catch(error) {
      console.error("Error al preparar texto para copiar:", error);
      alert("Error al procesar los datos para copiar.");
  }
}

function verificarCambioDiaYGuardar() {
    const hoy = new Date().toISOString().split('T')[0];
    if (hoy !== fechaActual) {
        console.log("Detectado cambio de día. Cargando datos para:", hoy);
        fechaActual = hoy;
        cargarDatos();
    }
}

window.addEventListener('focus', verificarCambioDiaYGuardar);
window.onload = cargarDatos;