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
    const apiCycles = await safeFetch(`${API_BASE_URL}/api/cycles/${userId}`);

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
      `${API_BASE_URL}/api/cycles/predictions/${userId}`
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
  // 1. INICIALIZAR ELEMENTOS DEL DOM PRIMERO
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const indicatorDots = document.querySelectorAll(".indicator-dot");
  const cycleList = document.getElementById("lista-ciclos");
  const emptyState = document.querySelector(".empty-state");
  let currentStep = 0;

  // 2. CARGAR DATOS INICIALES
  await cargarCiclos();
  mostrarCiclos();
  await mostrarPredicciones();

  // 3. FUNCIÓN PARA CAMBIAR PASOS (DEBE ESTAR ANTES DE LOS EVENT LISTENERS)
  function updateStep(newStep) {
    // Remover clase active del paso actual
    formCards[currentStep].classList.remove("active");
    indicatorDots[currentStep].classList.remove("active");

    // Asignar nuevo paso
    currentStep = newStep;

    // Agregar clase active al nuevo paso
    formCards[currentStep].classList.add("active");
    indicatorDots[currentStep].classList.add("active");
  }

  // 4. CONFIGURAR EVENT LISTENERS PARA BOTONES
  nextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (currentStep < formCards.length - 1) {
        updateStep(currentStep + 1);
      }
    });
  });

  prevButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (currentStep > 0) {
        updateStep(currentStep - 1);
      }
    });
  });

  // 5. FUNCIÓN PARA MOSTRAR CICLOS
  function mostrarCiclos() {
    if (!cycleList) return;

    cycleList.innerHTML = "";

    // Mostrar empty state solo si no hay ciclos
    if (ciclos.length === 0 && emptyState) {
      const clone = emptyState.cloneNode(true);
      cycleList.appendChild(clone);
      return;
    }

    // Ordenar ciclos por fecha (más reciente primero)
    const ciclosOrdenados = [...ciclos].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    // Crear elementos para cada ciclo
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

  // 6. MANEJADOR DE ENVÍO DE FORMULARIO
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fecha").value;
    const duracion = parseInt(document.getElementById("duracion").value);
    const sintomas = document.getElementById("sintomas").value;

    // Validación básica
    if (!fecha || isNaN(duracion) || duracion <= 0) {
      alert("Por favor completa todos los campos correctamente");
      return;
    }

    // Crear nuevo ciclo
    const nuevoCiclo = {
      id: ciclos.length > 0 ? Math.max(...ciclos.map((c) => c.id)) + 1 : 1,
      fecha,
      duracion,
      sintomas,
      userId,
      synced: false,
    };

    // Guardar localmente
    ciclos.push(nuevoCiclo);
    localStorage.setItem("ciclos", JSON.stringify(ciclos));

    // Actualizar UI
    mostrarCiclos();

    // Sincronizar con API si hay conexión
    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cycles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            startDate: fecha,
            duration: duracion,
            symptoms: sintomas,
          }),
        });

        if (response.ok) {
          nuevoCiclo.synced = true;
          localStorage.setItem("ciclos", JSON.stringify(ciclos));
        }
      } catch (error) {
        console.error("Error guardando en API:", error);
      }
    }

    // Resetear formulario y mostrar animación
    form.reset();
    updateStep(0);
    showSuccessAnimation();
  });

  // 7. FUNCIÓN DE ANIMACIÓN DE ÉXITO
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
      animation: slideIn 0.6s ease, fadeOut 0.6s ease 3s forwards;
    `;

    successMsg.innerHTML = `
      <i class="fas fa-check-circle" style="color: var(--accent-lavender); font-size: 1.6rem;"></i>
      <div>Ciclo registrado exitosamente</div>
    `;

    document.body.appendChild(successMsg);

    // Agregar estilos de animación
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
    `;
    document.head.appendChild(style);

    // Eliminar después de 3.6 segundos
    setTimeout(() => {
      successMsg.remove();
    }, 3600);
  }

  // 8. FUNCIÓN PARA FORMATEAR FECHAS
  function formatDate(dateString) {
    try {
      const dateObj = new Date(dateString);
      return dateObj.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formateando fecha:", error);
      return "Fecha inválida";
    }
  }
});
