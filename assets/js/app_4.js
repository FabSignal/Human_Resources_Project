// ======================= CONFIGURACIÓN API =======================
const API_BASE_URL = "https://menstrual-cycle-tracking-api.onrender.com";
let isOnline = true;

// Verificar conexión a internet
function checkOnlineStatus() {
  isOnline = navigator.onLine;
  return isOnline;
}

// Función para sincronizar datos locales con MongoDB
async function sincronizarConAPI() {
  try {
    const ciclosLocales = JSON.parse(localStorage.getItem("ciclos")) || [];
    const lastSync = localStorage.getItem("lastSync");

    for (const ciclo of ciclosLocales) {
      // Solo sincronizar si no tiene ID de MongoDB o es nuevo
      if (
        !ciclo._id ||
        !lastSync ||
        new Date(ciclo.createdAt) > new Date(lastSync)
      ) {
        const response = await fetch(`${API_BASE_URL}/api/cycles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            startDate: ciclo.fecha,
            duration: ciclo.duracion,
            symptoms: ciclo.sintomas,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Actualizar con ID de MongoDB
          ciclo._id = data._id;
          ciclo.synced = true;
        }
      }
    }

    localStorage.setItem("ciclos", JSON.stringify(ciclosLocales));
    localStorage.setItem("lastSync", new Date().toISOString());
  } catch (error) {
    console.error("Error sincronizando con API:", error);
  }
}

// ======================= AUTENTICACIÓN =======================
async function loginUsuario(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      sincronizarConAPI();
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error en login:", error);
    return false;
  }
}

//==============================
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
let ciclos = [];
let ciclosPrecargados = false;

// Función para sincronizar con la API y cargar ciclos
async function cargarCiclos() {
  try {
    // Intentar cargar desde la API
    const apiCycles = await safeFetch(`${API_URL}/api/cycles/${userId}`);

    if (apiCycles && apiCycles.length > 0) {
      ciclos = apiCycles;
      ciclosPrecargados = false;
      localStorage.setItem("ciclos", JSON.stringify(ciclos));
      return;
    }
  } catch (error) {
    console.error("Error cargando ciclos desde API:", error.message);
  }

  // Si la API no tiene datos, intentar cargar desde localStorage
  const ciclosGuardados = localStorage.getItem("ciclos");
  if (ciclosGuardados) {
    ciclos = JSON.parse(ciclosGuardados);
    ciclosPrecargados = false;
  } else {
    // Si no hay datos en ningún lado, cargar ejemplos
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

document.addEventListener("DOMContentLoaded", async function () {
  // Cargar ciclos antes de cualquier otra acción
  await cargarCiclos();

  // Elementos del DOM
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const indicatorDots = document.querySelectorAll(".indicator-dot");
  const cycleList = document.getElementById("lista-ciclos");
  const emptyState = document.querySelector(".empty-state");

  mostrarCiclos();
  mostrarPredicciones();

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

    // Crear nuevo ciclo
    const nuevoCiclo = {
      id: ciclos.length > 0 ? Math.max(...ciclos.map((c) => c.id)) + 1 : 1,
      fecha,
      duracion,
      sintomas,
    };

    // Guardar localmente
    ciclos.push(nuevoCiclo);
    localStorage.setItem("ciclos", JSON.stringify(ciclos));
    ciclosPrecargados = false;

    // Actualizar UI
    mostrarCiclos();

    if (emptyState && cycleList.contains(emptyState)) {
      cycleList.removeChild(emptyState);
    }

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
    return [...array].sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      return dateB - dateA;
    });
  }

  // Función para mostrar ciclos
  function mostrarCiclos() {
    cycleList.innerHTML = "";

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

  // Función para formatear fechas (mejorada)
  function formatDate(dateInput) {
    try {
      // Si es un objeto con $date (formato MongoDB Extended JSON)
      if (dateInput && typeof dateInput === "object" && dateInput.$date) {
        dateInput = dateInput.$date;
      }

      // Si es un objeto Date
      if (dateInput instanceof Date) {
        const options = { year: "numeric", month: "long", day: "numeric" };
        return dateInput.toLocaleDateString("es-ES", options);
      }

      // Si es un string ISO
      if (typeof dateInput === "string") {
        // Intentar parsear la fecha
        const dateObj = new Date(dateInput);
        if (!isNaN(dateObj.getTime())) {
          const options = { year: "numeric", month: "long", day: "numeric" };
          return dateObj.toLocaleDateString("es-ES", options);
        }

        // Si es una fecha en formato simple (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
          const [year, month, day] = dateInput.split("-");
          const dateObj = new Date(year, month - 1, day);
          const options = { year: "numeric", month: "long", day: "numeric" };
          return dateObj.toLocaleDateString("es-ES", options);
        }
      }

      return "Fecha inválida";
    } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Error en fecha";
    }
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
