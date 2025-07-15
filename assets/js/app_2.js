/* ======================= SALUDO INICIAL ====================== */
let nombreUsuaria = localStorage.getItem("nombre");
if (nombreUsuaria === null || nombreUsuaria.trim() === "") {
  const nombreIngresado = prompt("¡Hola! ¿Cómo te llamás?");

  if (nombreIngresado && nombreIngresado.trim() !== "") {
    nombreUsuaria = nombreIngresado.trim();
    localStorage.setItem("nombre", nombreUsuaria);
  } else {
    nombreUsuaria = "";
  }
}

const saludo =
  nombreUsuaria && nombreUsuaria.trim() !== ""
    ? `¡Hola ${nombreUsuaria}! ¿Cómo te sentís hoy?`
    : "¡Hola! ¿Cómo te sentís hoy?";

const titulo = document.querySelector("header h1");
titulo.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ${saludo}`;

/* ============ Configuración de la API ============ */
const API_URL = "https://pcos-tracker-api.onrender.com"; // Cambia esto si es necesario
let ciclos = [];
let cargando = false;

/* ============ Funciones para interactuar con la API ============ */

// Función para mostrar estado de carga
function mostrarCarga(mostrar) {
  const loader = document.getElementById("api-loader");
  if (loader) {
    loader.style.display = mostrar ? "flex" : "none";
  } else if (mostrar) {
    const loaderDiv = document.createElement("div");
    loaderDiv.id = "api-loader";
    loaderDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;
    loaderDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <div class="spinner" style="
          width: 50px;
          height: 50px;
          border: 5px solid var(--accent-lavender);
          border-top: 5px solid transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        <p style="color: var(--accent-lavender); font-weight: 600;">Cargando datos...</p>
      </div>
    `;
    document.body.appendChild(loaderDiv);

    // Agregar estilos de animación
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

// Obtener ciclos desde la API
async function obtenerCiclos() {
  try {
    cargando = true;
    mostrarCarga(true);

    const response = await fetch(`${API_URL}/cycles`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    ciclos = data.map((ciclo) => ({
      id: ciclo.id,
      fecha: ciclo.start_date,
      duracion: ciclo.duration,
      sintomas: ciclo.symptoms,
    }));

    cargando = false;
    mostrarCarga(false);
    return ciclos;
  } catch (error) {
    console.error("Error al obtener ciclos:", error);
    cargando = false;
    mostrarCarga(false);

    // Mostrar mensaje de error
    const errorDiv = document.createElement("div");
    errorDiv.id = "api-error";
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background: #ffebee;
      color: #c62828;
      border-radius: var(--element-radius);
      box-shadow: var(--shadow-hover);
      z-index: 1001;
      display: flex;
      align-items: center;
      gap: 10px;
    `;
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <div>Error al cargar los datos. Reintentando...</div>
    `;
    document.body.appendChild(errorDiv);

    // Reintentar después de 5 segundos
    setTimeout(() => {
      document.body.removeChild(errorDiv);
      obtenerCiclos();
    }, 5000);

    return [];
  }
}

// Crear un nuevo ciclo
async function crearCiclo(nuevoCiclo) {
  try {
    mostrarCarga(true);

    const response = await fetch(`${API_URL}/cycles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start_date: nuevoCiclo.fecha,
        duration: nuevoCiclo.duracion,
        symptoms: nuevoCiclo.sintomas,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    mostrarCarga(false);
    return data;
  } catch (error) {
    console.error("Error al crear ciclo:", error);
    mostrarCarga(false);

    // Mostrar mensaje de error
    alert("Error al guardar el ciclo. Por favor, intenta nuevamente.");
    return null;
  }
}

// Función para inicializar la aplicación
async function inicializarApp() {
  await obtenerCiclos();
  mostrarCiclos();
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const indicatorDots = document.querySelectorAll(".indicator-dot");
  const cycleList = document.getElementById("lista-ciclos");
  const emptyState = document.querySelector(".empty-state");

  // Inicializar la aplicación
  inicializarApp();

  let currentStep = 0;

  function updateStep(newStep) {
    formCards[currentStep].classList.remove("active");
    indicatorDots[currentStep].classList.remove("active");

    currentStep = newStep;
    formCards[currentStep].classList.add("active");
    indicatorDots[currentStep].classList.add("active");
  }

  nextButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (currentStep < formCards.length - 1) {
        updateStep(currentStep + 1);
      }
    });
  });

  prevButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (currentStep > 0) {
        updateStep(currentStep - 1);
      }
    });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fecha = document.getElementById("fecha").value;
    const duracion = parseInt(document.getElementById("duracion").value);
    const sintomas = document.getElementById("sintomas").value;

    if (!fecha || isNaN(duracion) || duracion <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }

    // Crear el nuevo objeto ciclo
    const nuevoCiclo = {
      fecha,
      duracion,
      sintomas,
    };

    // Enviar a la API
    const cicloCreado = await crearCiclo(nuevoCiclo);

    if (cicloCreado) {
      // Actualizar la lista local
      ciclos.push({
        id: cicloCreado.id,
        fecha: cicloCreado.start_date,
        duracion: cicloCreado.duration,
        sintomas: cicloCreado.symptoms,
      });

      // Actualizar la lista en pantalla
      mostrarCiclos();

      // Resetear formulario
      form.reset();
      updateStep(0);
      showSuccessAnimation();

      // Ocultar estado vacío si es necesario
      if (emptyState && cycleList.contains(emptyState)) {
        cycleList.removeChild(emptyState);
      }
    }
  });

  // Función para ordenar ciclos por fecha
  function ordenarCiclosPorFechaDesc(array) {
    return [...array].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  // Función para mostrar ciclos
  function mostrarCiclos() {
    cycleList.innerHTML = "";

    if (cargando) {
      const loadingItem = document.createElement("div");
      loadingItem.className = "loading-state";
      loadingItem.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem;">
          <div class="spinner" style="
            width: 40px;
            height: 40px;
            border: 4px solid var(--accent-lavender);
            border-top: 4px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <p style="color: var(--accent-lavender);">Cargando ciclos...</p>
        </div>
      `;
      cycleList.appendChild(loadingItem);
      return;
    }

    if (ciclos.length === 0) {
      cycleList.appendChild(emptyState.cloneNode(true));
      return;
    }

    const ciclosOrdenados = ordenarCiclosPorFechaDesc(ciclos);

    ciclosOrdenados.forEach((ciclo) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <div>
          <div class="cycle-date">${formatDate(ciclo.fecha)}</div>
          <div class="cycle-symptoms">${
            ciclo.sintomas || "Sin síntomas registrados"
          }</div>
        </div>
        <div class="cycle-duration">${ciclo.duracion} días</div>
      `;
      cycleList.appendChild(listItem);
    });
  }

  // Función para formatear fechas
  function formatDate(dateString) {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("es-ES", options);
  }

  // Función para mostrar notificación de éxito
  function showSuccessAnimation() {
    const successMsg = document.createElement("div");
    successMsg.style.cssText = `
      position: fixed;
      top: 30px;
      right: 30px;
      background: var(--accent-mint);
      color: var(--dark-brown);
      padding: 1.2rem 2rem;
      border-radius: var(--element-radius);
      box-shadow: var(--shadow-hover);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 1rem;
      font-weight: 600;
      font-size: 1rem;
      animation: slideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), fadeOut 0.6s ease 3s forwards;
      border-radius: var(--card-radius);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.8);
    `;

    successMsg.innerHTML = `
      <i class="fas fa-check-circle" style="color: var(--accent-lavender); font-size: 1.6rem;"></i>
      <div>Ciclo registrado exitosamente</div>
    `;

    document.body.appendChild(successMsg);

    setTimeout(() => {
      if (successMsg.parentNode === document.body) {
        document.body.removeChild(successMsg);
      }
    }, 3600);
  }

  // Agregar estilos de animación
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%) translateY(20px); opacity: 0; }
      to { transform: translateX(0) translateY(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-20px); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
});
