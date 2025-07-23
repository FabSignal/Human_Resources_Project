// ======================= CONFIGURACIÓN API =======================
const API_BASE_URL = "https://menstrual-cycle-tracking-api.onrender.com";

/* ======================= DECLARACIONES GLOBALES ====================== */
//let ciclosPrecargados = false;
let ciclos = [];

// ESTADO DE AUTENTICACIÓN
const userId = localStorage.getItem("userId");
const userName = localStorage.getItem("userName");

// Ejemplos para cuando NO hay ciclos cargados aún
const exampleCycles = [
  {
    id: 1,
    fecha: "2025-01-01",
    duracion: 5,
    sintomas: "Dolor abdominal, Hinchazón, Fatiga",
    synced: true,
    isExample: true,
  },
  {
    id: 2,
    fecha: "2025-01-28",
    duracion: 6,
    sintomas: "Dolor de cabeza, Cólicos, Dolor de espalda",
    synced: true,
    isExample: true,
  },
];

/* ======================= Funciones ============================= */
// Función para mostrar los datos de los ciclos en pantalla
function mostrarCiclos() {
  // Se limpia el contenido anterior de la lista (por si ya hay ciclos)
  cycleList.innerHTML = "";

  // Si no hay ciclos nuevos agregados por la usuaria (es decir, solo están los precargados)
  // se muestra el estado vacío como indicación visual. Esto se controla con la variable ciclosPrecargados.
  if (ciclos.length === 0 || ciclosPrecargados) {
    cycleList.appendChild(emptyState.cloneNode(true));
  }

  // Se ordena el array de ciclos por fecha usando la función ordenarCiclosPorFechaDesc y se guarda en ciclosOrdenados
  const ciclosOrdenados = ordenarCiclosPorFechaDesc(ciclos);

  // Se recorre cada ciclo del array ordenado y cada uno se inserta como lista en el HTML
  ciclosOrdenados.forEach((ciclo) => {
    const listItem = document.createElement("li");

    // Se le agrega contenido HTML con los datos del ciclo, incluyendo la fecha formateada
    listItem.innerHTML = `
      <div>
        <div class="cycle-date">${formatDate(ciclo.fecha)}</div>
        <div class="cycle-symptoms">${
          ciclo.sintomas || "Sin síntomas registrados"
        }</div>
      </div>
      <div class="cycle-duration">${ciclo.duracion} días</div>
    `;
    // Se inserta la lista en el DOM
    cycleList.appendChild(listItem);
  });
}

// Función para mostrar fechas en español
function formatDate(dateString) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

// Función para ordenar ciclos por fecha (más reciente primero)
function ordenarCiclosPorFechaDesc(array) {
  return [...array].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

/* ========== Mostrar notificación animada al guardar un ciclo ========== */
/* 
  - Se crea una notificación (toast) con estilos
  - Se elimina automáticamente después de unos segundos  */

// Se muestra animación cuando se guarda un ciclo con éxito
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

  // Se remueve animación después de 3.6 segundos
  setTimeout(() => {
    if (successMsg.parentNode === document.body) {
      document.body.removeChild(successMsg);
    }
  }, 3600);
}

/* ======================= AUTENTICACIÓN ====================== */

// Elementos del DOM
const authModal = document.getElementById("auth-modal");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const userNameSpan = document.getElementById("userName");
const greetingText = document.querySelector("header h1");
//const logoutBtn = document.getElementById("logout-btn");
const tabButtons = document.querySelectorAll(".tab-btn");

// Función para mostrar errores
function showError(form, message) {
  // Eliminar errores anteriores en este formulario
  const existingError = form.querySelector(".error-message");
  if (existingError) existingError.remove();

  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.textContent = message;

  // Insertar después del último elemento del formulario
  form.appendChild(errorElement);
}

// Verificar estado de autenticación
function showAuthenticatedState() {
  authModal.classList.remove("active");
  // Leer SIEMPRE desde localStorage
  const storedUserName = localStorage.getItem("userName") || "usuaria";

  // Usar el nombre almacenado
  userNameSpan.textContent = storedUserName;

  // Actualizar el saludo en el header
  const titulo = document.querySelector("header h1");
  titulo.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola ${storedUserName}! ¿Cómo te sentís hoy?`;
}

// Función para mostrar estado no autenticado
function showUnauthenticatedState() {
  authModal.classList.add("active");
  greetingText.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola! ¿Cómo te sentís hoy?`;
}

// ======================= MENÚ DE USUARIa =======================

// Verificar si debemos limpiar los ciclos de ejemplo
/* if (userId && !ciclosPrecargados) {
  localStorage.removeItem("ciclos");
  ciclos = [];
} */

// Manejar tabs
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Actualizar botones activos
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Mostrar formulario correspondiente
    const tab = button.getAttribute("data-tab");
    document.querySelectorAll(".auth-form").forEach((form) => {
      form.classList.remove("active");
    });
    document.getElementById(`${tab}-form`).classList.add("active");
  });
});

// ============= Función para mostrar notificación de éxito
function showSuccessNotification(message) {
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
    <div>${message}</div>
  `;

  document.body.appendChild(successMsg);

  // Se remueve animación después de 3.6 segundos
  setTimeout(() => {
    if (successMsg.parentNode === document.body) {
      document.body.removeChild(successMsg);
    }
  }, 3600);
}

// ===== OFFLINE-FIRST & SINCRONIZACIÓN ===================================================

// 1) Intentar sincronizar siempre que volvamos online
window.addEventListener("online", syncPendingCycles);

// 2) Subir al backend los ciclos pendientes
async function syncPendingCycles() {
  if (!navigator.onLine) return;
  const storedArr = JSON.parse(localStorage.getItem("ciclos") || "[]");
  let changed = false;

  for (const ciclo of storedArr) {
    if (!ciclo.synced) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cycles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId,
            startDate: ciclo.fecha,
            duration: ciclo.duracion,
            symptoms: ciclo.sintomas,
          }),
        });
        if (res.ok) {
          ciclo.synced = true;
          changed = true;
        } else {
          const errorText = await res.text();
          console.error(
            `Sync falló ciclo ${ciclo.id}: HTTP ${res.status}`,
            errorText
          );
        }
      } catch (err) {
        console.error(`Error de red al sync ciclo ${ciclo.id}:`, err);
      }
    }
  }

  if (changed) {
    localStorage.setItem("ciclos", JSON.stringify(storedArr));
    ciclos = storedArr;
    console.log("Ciclos sincronizados con la API");
  }
}

// 3) Traer ciclos reales del servidor SOLO si LS está vacío
async function fetchUserCycles() {
  const stored = JSON.parse(localStorage.getItem("ciclos") || "[]");
  // Si ya hay algo (ejemplos o ciclos reales previos), no tocamos nada
  if (stored.length > 0) {
    ciclos = stored;
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/cycles/${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    console.log("fetchUserCycles payload →", json);

    const serverCycles = json.cycles || json.data || [];
    if (serverCycles.length > 0) {
      // Guardar los reales en LS
      ciclos = serverCycles.map((c, i) => ({
        id: i + 1,
        fecha: c.startDate,
        duracion: c.duration,
        sintomas: c.symptoms,
        synced: true,
        isExample: false,
      }));
      localStorage.setItem("ciclos", JSON.stringify(ciclos));
    } else {
      // Sin ciclos en servidor y LS vacío → usar ejemplos
      ciclos = [...exampleCycles];
    }
  } catch (err) {
    console.error("Error al cargar ciclos reales:", err);
  }
}

// 4) Pedir predicciones si hay ≥2 ciclos reales
async function fetchPredictions() {
  const realesCount = ciclos.filter((c) => !c.isExample).length;
  if (realesCount < 2) return;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/cycles/predictions/${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    console.log("fetchPredictions payload →", json);

    const payload = json.proximoPeriodo ? json : json.data || {};
    if (!payload.proximoPeriodo) return;
    showPredictions(payload);
  } catch (err) {
    console.error("Error al obtener predicciones:", err);
  }
}

// 5) Función para mostrar predicciones
function showPredictions(data) {
  const container = document.getElementById("predictions-container");
  const insightsContainer = document.getElementById("insights-content");
  if (!container || !insightsContainer) return;

  // Limpiar contenedores
  container.innerHTML = "";
  insightsContainer.innerHTML = "";

  // Extraer datos
  const {
    proximoPeriodo,
    ovulacion,
    fertilidad,
    faseActual,
    estadisticas,
    insights,
  } = data;

  // Crear tarjetas para cada predicción
  const predictionCards = [
    {
      title: "Próximo Período",
      icon: "calendar-alt",
      content: `
        <p><strong>Fecha:</strong> ${proximoPeriodo.fecha}</p>
        <p><strong>Días restantes:</strong> ${proximoPeriodo.diasRestantes}</p>
        <p>${proximoPeriodo.mensaje}</p>
      `,
    },
    {
      title: "Ovulación",
      icon: "egg",
      content: `
        <p><strong>Estado:</strong> ${ovulacion.estado}</p>
        <p><strong>Fecha:</strong> ${ovulacion.fechaAmigable} (${
        ovulacion.fecha
      })</p>
        <p><strong>Ventana fértil:</strong> ${
          ovulacion.ventanaFertil ? "Sí" : "No"
        }</p>
        <p>${ovulacion.mensaje}</p>
      `,
    },
    {
      title: "Fertilidad",
      icon: "heart",
      content: `
        <p><strong>Probabilidad:</strong> ${fertilidad.probabilidad}</p>
        <p><strong>Nivel:</strong> ${fertilidad.nivel}</p>
        <p>${fertilidad.mensaje}</p>
      `,
    },
    {
      title: "Fase Actual",
      icon: "moon",
      content: `
        <p>${faseActual.nombre} (Día ${faseActual.diaDelCiclo} de ${
        faseActual.duracionCiclo
      })</p>
        <p>${faseActual.descripcion || ""}</p>
      `,
    },
    {
      title: "Estadísticas",
      icon: "chart-bar",
      content: `
        <h4>Ciclo</h4>
        <ul>
          <li>Duración promedio: ${estadisticas.ciclo.duracionPromedio} días</li>
          <li>Variabilidad: ${estadisticas.ciclo.variabilidad} días</li>
          <li>Regularidad: ${estadisticas.ciclo.regularidad}</li>
          <li>Último período: ${estadisticas.ciclo.ultimoPeriodo}</li>
          <li>Siguiente predicción: ${estadisticas.ciclo.siguientePrediccion}</li>
        </ul>
        <h4>Menstruación</h4>
        <ul>
          <li>Duración promedio: ${estadisticas.menstruacion.duracionPromedio} días</li>
          <li>Última duración: ${estadisticas.menstruacion.ultimaDuracion} días</li>
        </ul>
        <h4>Precisión</h4>
        <ul>
          <li>Ciclos analizados: ${estadisticas.precision.ciclosAnalizados}</li>
          <li>Confiabilidad: ${estadisticas.precision.confiabilidad}</li>
          <li>Intervalos calculados: ${estadisticas.precision.intervalosCalculados}</li>
        </ul>
      `,
    },
  ];

  // Renderizar tarjetas de predicciones
  predictionCards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.className = "prediction-card";
    cardElement.innerHTML = `
      <div class="prediction-header">
        <i class="fas fa-${card.icon}"></i>
        <h3>${card.title}</h3>
      </div>
      ${card.content}
    `;
    container.appendChild(cardElement);
  });

  // Renderizar insights
  insightsContainer.innerHTML = `
    <div class="insight-item">
      <p><strong>Mensaje:</strong> ${insights.mensaje}</p>
    </div>
    <div class="insight-item">
      <h3>Consejo</h3>
      <p>${insights.consejo}</p>
    </div>
    <div class="insight-item">
      <h3>Síntomas físicos</h3>
      <p>${insights.sintomas.fisicos.join(", ")}</p>
    </div>
    <div class="insight-item">
      <h3>Síntomas emocionales</h3>
      <p>${insights.sintomas.emocionales.join(", ")}</p>
    </div>
    <div class="insight-item">
      <h3>Recomendaciones</h3>
      <p>${insights.sintomas.consejos.join(", ")}</p>
    </div>
  `;
}

/* ==========================Trae los ciclos del usuario desde el backend y los guarda en LS, reemplazando los ejemplos ==*/
async function fetchUserCycles() {
  // 1) Si ya hay algo en LS, lo usamos y salimos
  const stored = JSON.parse(localStorage.getItem("ciclos") || "[]");
  if (stored.length > 0) {
    ciclos = stored;
    return;
  }

  // 2) Si LS vacío, pedimos al backend
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/cycles/${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const json = await res.json();
    console.log("fetchUserCycles payload →", json);

    // Extraer array de ciclos del wrapper
    const serverCycles = json.cycles || json.data || [];

    if (serverCycles.length > 0) {
      // 3) Tenemos datos reales: mapear, guardar en LS y pintar
      ciclos = serverCycles.map((c, i) => ({
        id: i + 1,
        fecha: c.startDate,
        duracion: c.duration,
        sintomas: c.symptoms,
        synced: true,
        isExample: false,
      }));
      localStorage.setItem("ciclos", JSON.stringify(ciclos));
      mostrarCiclos();
    } else {
      // 4) Sin datos reales y LS vacío: mostramos ejemplos (no guardamos en LS)
      ciclos = [...exampleCycles];
      mostrarCiclos();
    }
  } catch (err) {
    console.error("Error al cargar ciclos reales:", err);
  }
}

/* ===== Sincronización Offline-First de Ciclos ===== */
async function syncPendingCycles() {
  // 1) Salir si estamos offline
  if (!navigator.onLine) return;

  // 2) Leer array desde LS
  const storedArr = JSON.parse(localStorage.getItem("ciclos") || "[]");
  let changed = false;

  // 3) Por cada ciclo con synced === false → POST al backend
  for (const ciclo of storedArr) {
    if (ciclo.synced === false) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/cycles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId, // tal cual guardaste en LS
            startDate: ciclo.fecha, // renombrado para la API
            duration: ciclo.duracion, // coincide con tu esquema
            symptoms: ciclo.sintomas, // en inglés
          }),
        });

        if (res.ok) {
          ciclo.synced = true;
          changed = true;
        } else {
          // Capturar body de error
          const errorText = await res.text();
          console.error(
            `Sync falló ciclo ${ciclo.id}: HTTP ${res.status}`,
            errorText
          );
        }
      } catch (err) {
        console.error(`Error de red al sync ciclo ${ciclo.id}:`, err);
      }
    }
  }

  // 4) Si hubo cambios, actualizar LS y la variable runtime
  if (changed) {
    localStorage.setItem("ciclos", JSON.stringify(storedArr));
    ciclos = storedArr;
    console.log("Ciclos sincronizados con la API");
    // Dispara predicciones actualizadas
    fetchPredictions();
  }
}

// 5) Listener de reconexión
window.addEventListener("online", syncPendingCycles);

/* ====================GET /api/cycles/predictions/:userId ========================
  Solo si hay al menos 2 ciclos reales */
async function fetchPredictions() {
  if (!userId) return;
  const realesCount = ciclos.filter((c) => c.synced).length;
  if (realesCount < 2) return;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/cycles/predictions/${encodeURIComponent(userId)}`
    );
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const json = await res.json();
    console.log("fetchPredictions payload →", json);

    // Si viene envuelto en .data, hacemos:
    const payload = json.proximoPeriodo ? json : json.data || {};

    // Si no hay proximoPeriodo, abortamos
    if (!payload.proximoPeriodo) return;

    showPredictions(payload);
  } catch (err) {
    console.error("Error al obtener predicciones:", err);
  }
}

/* =================================== DOM  ======================================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Listenesrs de registro
  // Manejar registro
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    // Mostrar indicador de carga
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Registrando...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      let data;
      // Manejar respuesta según el tipo de contenido
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
        console.log("Registro payload →", data);
        console.log("auth response payload:", data);
      } else {
        const text = await response.text();
        throw new Error(text || "Respuesta inesperada del servidor");
      }

      if (response.ok) {
        // Guardar en localStorage
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userName", data.name);

        // Ocultar modal y mostrar estado autenticado
        authModal.classList.remove("active");
        showAuthenticatedState();

        syncPendingCycles();

        // Eliminar ejemplos y cargar cilos reales
        fetchUserCycles();

        // Mostrar notificación de éxito
        showSuccessNotification("¡Registro exitoso! ¡Bienvenida!");
      } else {
        // Mostrar error
        if (response.status === 409) {
          showError(
            registerForm,
            data.message || "Este correo ya está registrado"
          );
        } else {
          showError(
            registerForm,
            data.message || `Error ${response.status}: ${response.statusText}`
          );
        }
      }
    } catch (error) {
      console.error("Error:", error);
      showError(registerForm, error.message || "Error en la conexión");
    } finally {
      // Restaurar botón
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  // Manejar login
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    // Mostrar indicador de carga
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
    submitBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data;
      // Manejar respuesta según el tipo de contenido
      if (response.headers.get("content-type")?.includes("application/json")) {
        data = await response.json();
        console.log("Registro payload →", data);
      } else {
        const text = await response.text();
        throw new Error(text || "Respuesta inesperada del servidor");
      }

      if (response.ok) {
        // Guardar en localStorage
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("userName", data.name);

        showAuthenticatedState();
        syncPendingCycles();
        showSuccessNotification("¡Bienvenida de nuevo!");
      } else {
        // Mostrar error
        const errorMsg =
          data.message || `Error ${response.status}: ${response.statusText}`;
        showError(loginForm, errorMsg);
      }
    } catch (error) {
      console.error("Error:", error);
      showError(loginForm, error.message || "Error en la conexión");
    } finally {
      // Restaurar botón
      submitBtn.textContent = originalBtnText;
      submitBtn.disabled = false;
    }
  });

  // 1) Mostrar UI autenticada
  showAuthenticatedState();

  // 2) Offline-first: carga LS, sync, luego servidor o ejemplos
  const stored = JSON.parse(localStorage.getItem("ciclos") || "[]");
  ciclos = stored;
  syncPendingCycles();
  if (ciclos.length === 0) {
    fetchUserCycles();
  }

  // 3) Pintar ciclos e intentar predicciones
  mostrarCiclos();
  fetchPredictions();

  // 4) Captura elementos de UI para el form por pasos
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const indicatorDots = document.querySelectorAll(".indicator-dot");
  const cycleList = document.getElementById("lista-ciclos");
  const emptyState = document.querySelector(".empty-state");

  // 5) Menú de usuario y logout
  const userMenu = document.querySelector(".user-menu");
  const userIcon = document.querySelector(".user-icon");
  const userDropdown = document.querySelector(".user-dropdown");
  const logoutBtn = document.getElementById("logout-btn");
  if (userIcon && logoutBtn) {
    userIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.hidden = !userDropdown.hidden;
    });
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      userDropdown.hidden = true;
      showUnauthenticatedState();
    });
    document.addEventListener("click", (e) => {
      if (!userMenu.contains(e.target)) userDropdown.hidden = true;
    });
  }

  // 6) Multi-step form logic
  let currentStep = 0;
  function updateStep(step) {
    formCards[currentStep].classList.remove("active");
    indicatorDots[currentStep].classList.remove("active");
    currentStep = step;
    formCards[currentStep].classList.add("active");
    indicatorDots[currentStep].classList.add("active");
  }
  nextButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (currentStep < formCards.length - 1) updateStep(currentStep + 1);
    })
  );
  prevButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (currentStep > 0) updateStep(currentStep - 1);
    })
  );

  // 7) Envío del formulario de nuevo ciclo
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const fecha = document.getElementById("fecha").value;
    const duracion = parseInt(document.getElementById("duracion").value);
    const sintomas = document.getElementById("sintomas").value;
    if (!fecha || isNaN(duracion) || duracion <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }
    // Si solo había ejemplos, los borramos
    if (ciclos.length > 0 && ciclos[0].isExample) {
      ciclos = [];
    }
    const nuevoCiclo = {
      id: ciclos[ciclos.length - 1]?.id + 1 || 1,
      fecha,
      duracion,
      sintomas,
      synced: false,
      isExample: false,
    };
    ciclos.push(nuevoCiclo);
    localStorage.setItem("ciclos", JSON.stringify(ciclos));
    syncPendingCycles();
    mostrarCiclos();
    form.reset();
    updateStep(0);
    showSuccessAnimation();
  });
});
