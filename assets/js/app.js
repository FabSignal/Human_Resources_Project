// Al inicio de app.js
const API_URL = "https://menstrual-cycle-tracking-api.onrender.com";

// Generar userId único si no existe
let userId = localStorage.getItem("userId");
if (!userId) {
  userId = "user_" + Date.now() + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("userId", userId);
}

// Función para manejar peticiones fetch
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    throw error;
  }
}

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

/* ============ Ciclos: leer de localStorage o cargar ejemplo ============ */
let ciclos = JSON.parse(localStorage.getItem("ciclos") || []);
let ciclosPrecargados = !localStorage.getItem("ciclos");

if (ciclos.length === 0) {
  ciclos = [
    {
      id: 1,
      fecha: "2025-01-01",
      duracion: 5,
      sintomas: "Dolor abdominal, Hinchazón, Fatiga",
    },
    {
      id: 2,
      fecha: "2025-01-28",
      duracion: 6,
      sintomas: "Dolor de cabeza, Cólicos, Dolor de espalda",
    },
  ];
  ciclosPrecargados = true;
  localStorage.setItem("ciclos", JSON.stringify(ciclos));
}

// Función para sincronizar con la API
async function sincronizarConAPI() {
  try {
    const apiCycles = await safeFetch(`${API_URL}/api/cycles/${userId}`);

    if (apiCycles && apiCycles.length > 0) {
      ciclos = apiCycles;
      ciclosPrecargados = false;
      localStorage.setItem("ciclos", JSON.stringify(ciclos));
    }
  } catch (error) {
    console.error("Error sincronizando con la API:", error.message);
  }
}

// Función para mostrar predicciones
async function mostrarPredicciones() {
  try {
    const predictions = await safeFetch(
      `${API_URL}/api/cycles/predictions/${userId}`
    );

    // Verificar si existe el contenedor antes de intentar actualizarlo
    const prediccionesContainer = document.getElementById(
      "predicciones-container"
    );
    if (!prediccionesContainer) {
      console.warn("El contenedor de predicciones no existe en el DOM");
      return;
    }

    if (predictions.status === "insufficient_data") {
      prediccionesContainer.innerHTML = `
        <div class="insufficient-data">
          <i class="fas fa-info-circle"></i>
          <p>Necesitás registrar al menos 3 ciclos para generar predicciones.</p>
        </div>
      `;
      return;
    }

    // Actualizar cada elemento con los datos
    const updateElement = (id, content) => {
      const element = document.getElementById(id);
      if (element) element.textContent = content;
    };

    updateElement("next-period", predictions.nextPeriod || "No disponible");
    updateElement(
      "ovulation-status",
      predictions.ovulationStatus || "No disponible"
    );
    updateElement(
      "pregnancy-chance",
      predictions.pregnancyChance || "No disponible"
    );
    updateElement(
      "days-before-period",
      predictions.daysBeforePeriod || "No disponible"
    );
    updateElement("current-phase", predictions.currentPhase || "No disponible");

    // Estadísticas
    const statsElement = document.getElementById("cycle-stats");
    if (statsElement) {
      statsElement.innerHTML = predictions.cycleStatistics
        ? `
        Promedio: ${predictions.cycleStatistics.averageLength || "N/A"} días<br>
        Último: ${predictions.cycleStatistics.lastPeriod || "N/A"}<br>
        Próximo: ${predictions.cycleStatistics.nextPredicted || "N/A"}
      `
        : "Datos estadísticos no disponibles";
    }
  } catch (error) {
    console.error("Error obteniendo predicciones:", error.message);
    const prediccionesContainer = document.getElementById(
      "predicciones-container"
    );
    if (prediccionesContainer) {
      prediccionesContainer.innerHTML = `
        <div class="insufficient-data">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar predicciones: ${error.message}</p>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Elementos del DOM
  sincronizarConAPI();
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const indicatorDots = document.querySelectorAll(".indicator-dot");
  const cycleList = document.getElementById("lista-ciclos");
  const emptyState = document.querySelector(".empty-state");

  mostrarCiclos();
  mostrarPredicciones(); // <-- Nueva función para mostrar predicciones

  let currentStep = 0;

  // Función para cambiar de paso en el formulario
  function updateStep(newStep) {
    formCards[currentStep].classList.remove("active");
    indicatorDots[currentStep].classList.remove("active");

    currentStep = newStep;
    formCards[currentStep].classList.add("active");
    indicatorDots[currentStep].classList.add("active");
  }

  // Event listeners para botones
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

  // Envío del formulario
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const fecha = document.getElementById("fecha").value;
    const duracion = parseInt(document.getElementById("duracion").value);
    const sintomas = document.getElementById("sintomas").value;

    if (!fecha || isNaN(duracion) || duracion <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }

    if (ciclosPrecargados) {
      ciclos = [];
      ciclosPrecargados = false;
    }

    const nuevoCiclo = {
      id: ciclos[ciclos.length - 1]?.id + 1 || 1,
      fecha,
      duracion,
      sintomas,
    };

    ciclos.push(nuevoCiclo);
    localStorage.setItem("ciclos", JSON.stringify(ciclos));
    mostrarCiclos();
    ciclosPrecargados = false;

    if (emptyState && cycleList.contains(emptyState)) {
      cycleList.removeChild(emptyState);
    }

    mostrarCiclos();

    // Guardar en la API
    try {
      await safeFetch(`${API_URL}/api/cycles`, {
        method: "POST",
        body: JSON.stringify({
          userId,
          startDate: fecha,
          duration: duracion,
          symptoms: sintomas,
        }),
      });

      // Actualizar predicciones después de guardar
      mostrarPredicciones();
    } catch (error) {
      console.error("Error guardando en la API:", error.message);
      alert(
        "Los datos se guardaron localmente pero no se pudieron enviar al servidor"
      );
    }

    form.reset();
    updateStep(0);
    showSuccessAnimation();
  });

  // Función para ordenar ciclos
  function ordenarCiclosPorFechaDesc(array) {
    return [...array].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  // Función para mostrar ciclos
  async function mostrarCiclos() {
    cycleList.innerHTML = "";

    if (ciclos.length === 0 || ciclosPrecargados) {
      cycleList.appendChild(emptyState.cloneNode(true));
    }

    try {
      const apiCycles = await safeFetch(`${API_URL}/api/cycles/${userId}`);

      if (apiCycles && apiCycles.length > 0) {
        ciclos = apiCycles;
        ciclosPrecargados = false;
        localStorage.setItem("ciclos", JSON.stringify(ciclos));
      }
    } catch (error) {
      console.error("Error obteniendo ciclos de la API:", error.message);
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
    // Si es un objeto Date de MongoDB, convertir a string ISO
    if (typeof dateString === "object" && dateString !== null) {
      dateString = dateString.toISOString().split("T")[0];
    }

    // Si ya es un string en formato ISO
    if (typeof dateString === "string") {
      const dateObj = new Date(dateString);

      // Verificar si la fecha es válida
      if (isNaN(dateObj.getTime())) {
        return "Fecha inválida";
      }

      const options = { year: "numeric", month: "long", day: "numeric" };
      return dateObj.toLocaleDateString("es-ES", options);
    }

    return "Formato no soportado";
  }

  // Función para mostrar animación de éxito
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

  // Estilos para animación
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
  `;
  document.head.appendChild(style);
});
