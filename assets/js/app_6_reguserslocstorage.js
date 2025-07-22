// ======================= CONFIGURACIÓN API =======================
const API_BASE_URL = "https://menstrual-cycle-tracking-api.onrender.com";
/* const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://menstrual-cycle-tracking-api.onrender.com"; */
let isOnline = true;
/* let userId =
  localStorage.getItem("userId") ||
  "user_" + Date.now() + Math.random().toString(36).substr(2, 9);
localStorage.setItem("userId", userId); */

// Comprueba la conexión primero
async function checkApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) throw new Error("API no disponible");
    return true;
  } catch (error) {
    console.error("API offline:", error);
    return false;
  }
}

let userId = localStorage.getItem("userId");
let userName = localStorage.getItem("userName");

// Función para manejar peticiones fetch
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    // Verificar primero el tipo de contenido
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    // Manejar respuestas no-JSON
    if (!isJson) {
      const text = await response.text();
      throw new Error(
        `Respuesta no-JSON (${response.status}): ${text.slice(0, 100)}`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    throw new Error(`Error de red: ${error.message}`);
  }
}

// ======================= AUTENTICACIÓN =======================
async function ensureUser() {
  // 1. Verificar si ya está autenticado
  const storedId = localStorage.getItem("userId");
  const storedName = localStorage.getItem("userName");
  if (storedId && storedName) return { userId: storedId, userName: storedName };

  // 2. Verificar estado de la API
  const apiOnline = await checkApiStatus();

  // 3. Crear modal de autenticación
  const authContainer = document.createElement("div");
  authContainer.id = "auth-container";
  authContainer.innerHTML = `
    <div class="auth-card">
      <h2>Regístrate o Inicia Sesión</h2>
      <form id="auth-form">
        <div class="form-group">
          <label for="auth-name">Nombre</label>
          <input type="text" id="auth-name" required>
        </div>
        <div class="form-group">
          <label for="auth-email">Correo electrónico</label>
          <input type="email" id="auth-email" required>
        </div>
        <div class="form-group">
          <label for="auth-password">Contraseña (mínimo 6 caracteres)</label>
          <input type="password" id="auth-password" minlength="6" required>
        </div>
        <div class="btn-container">
          <button type="button" id="auth-register">Registrarse</button>
          <button type="button" id="auth-login">Iniciar Sesión</button>
        </div>
        ${
          !apiOnline
            ? `<div class="api-warning">
          <i class="fas fa-exclamation-triangle"></i>
          API offline. Usando modo local.
        </div>`
            : ""
        }
      </form>
    </div>
  `;

  // Insertar el modal en el DOM
  document.body.prepend(authContainer);

  // Retornar una promesa que manejará el registro/login
  return new Promise((resolve) => {
    // 4. Obtener referencias a los elementos después de insertar el modal
    const registerBtn = document.getElementById("auth-register");
    const loginBtn = document.getElementById("auth-login");
    const nameInput = document.getElementById("auth-name");
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");

    // 5. Evento para registro
    registerBtn.addEventListener("click", async () => {
      const name = nameInput.value;
      const email = emailInput.value;
      const password = passwordInput.value;

      try {
        let userId;
        let userName = name;

        if (apiOnline) {
          // Registrar en la API
          const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });
          userId = res.userId;
        } else {
          // Modo offline: crear ID local
          userId = `local_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        }

        // Guardar en localStorage
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);

        // Remover el modal
        authContainer.remove();

        // Resolver la promesa
        resolve({ userId, userName });
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });

    // 6. Evento para login
    loginBtn.addEventListener("click", async () => {
      const email = emailInput.value;
      const password = passwordInput.value;

      try {
        let userId, userName;

        if (apiOnline) {
          // Login en la API
          const res = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          userId = res.userId;
          userName = res.name;
        } else {
          throw new Error("No se puede iniciar sesión en modo offline");
        }

        // Guardar en localStorage
        localStorage.setItem("userId", userId);
        localStorage.setItem("userName", userName);

        // Remover el modal
        authContainer.remove();

        // Resolver la promesa
        resolve({ userId, userName });
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
    });
  });
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
  const ciclosGuardados = localStorage.getItem("ciclos");

  // 1. Intentar cargar desde localStorage
  if (ciclosGuardados) {
    ciclos = JSON.parse(ciclosGuardados);
    ciclosPrecargados = false;
    return;
  }

  // 2. Si no hay en localStorage, intentar cargar desde API
  try {
    const apiCycles = await safeFetch(`${API_BASE_URL}/api/cycles/${userId}`);

    if (apiCycles.length > 0) {
      ciclos = apiCycles.map((c) => ({
        id: c._id,
        fecha: c.startDate,
        duracion: c.duration,
        sintomas: c.symptoms,
      }));
      localStorage.setItem("ciclos", JSON.stringify(ciclos));
      return;
    }
  } catch (error) {
    console.error("Error cargando ciclos desde API:", error.message);
  }

  // 3. Si no hay datos en ningún lado, cargar ejemplos
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

// Función para mostrar predicciones
async function mostrarPredicciones() {
  const prediccionesContainer = document.getElementById(
    "predicciones-container"
  );
  if (!prediccionesContainer) return;

  // Verificar si tenemos suficientes ciclos
  if (ciclos.length < 3) {
    prediccionesContainer.innerHTML = `
      <div class="insufficient-data">
        <i class="fas fa-info-circle"></i>
        <p>Necesitás registrar al menos 3 ciclos para generar predicciones.</p>
      </div>
    `;
    return;
  }

  try {
    const predictions = await safeFetch(
      `${API_BASE_URL}/api/cycles/predictions/${userId}`
    );

    // Manejar diferentes estados
    if (predictions.status !== "success") {
      prediccionesContainer.innerHTML = `
        <div class="insufficient-data">
          <i class="fas fa-info-circle"></i>
          <p>${predictions.message}</p>
        </div>
      `;
      return;
    }

    // Actualizar UI con nueva estructura
    const updateElement = (id, content) => {
      const element = document.getElementById(id);
      if (element) element.textContent = content;
    };

    updateElement("next-period", predictions.proximoPeriodo.fecha);
    updateElement("ovulation-status", predictions.ovulacion.mensaje);
    updateElement("pregnancy-chance", predictions.fertilidad.mensaje);
    updateElement(
      "days-before-period",
      `${predictions.proximoPeriodo.diasRestantes} días`
    );
    updateElement("current-phase", predictions.faseActual.nombre);

    // Agregar información adicional
    const phaseInfo = document.createElement("div");
    phaseInfo.className = "phase-info";
    phaseInfo.innerHTML = `
      <p><strong>Síntomas comunes:</strong></p>
      <ul>
        ${predictions.insights.sintomas.fisicos
          .map((s) => `<li>${s}</li>`)
          .join("")}
      </ul>
      <p><strong>Consejos:</strong> ${predictions.insights.consejo}</p>
    `;
    prediccionesContainer.appendChild(phaseInfo);
  } catch (error) {
    prediccionesContainer.innerHTML = `
      <div class="insufficient-data">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Función para sincronizar datos con la API
// Función sincronizarConAPI actualizada
async function sincronizarConAPI() {
  if (!navigator.onLine) return;

  try {
    const ciclosLocales = JSON.parse(localStorage.getItem("ciclos")) || [];

    for (const ciclo of ciclosLocales) {
      if (!ciclo._id || !ciclo.synced) {
        // Estructura compatible con el servidor
        const cicloData = {
          startDate: ciclo.fecha,
          duration: ciclo.duracion,
          symptoms: ciclo.sintomas || "",
        };

        const response = await safeFetch(`${API_BASE_URL}/api/cycles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cicloData),
        });

        if (response && response._id) {
          ciclo._id = response._id;
          ciclo.synced = true;
        }
      }
    }

    localStorage.setItem("ciclos", JSON.stringify(ciclosLocales));
  } catch (error) {
    console.error("Error sincronizando con API:", error);
    // Intenta sincronizar solo un ciclo a la vez
    if (ciclosLocales.length > 0) {
      localStorage.setItem("pendingSync", JSON.stringify(ciclosLocales));
    }
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  // 0️⃣ Autenticación / registro
  /* const auth = await ensureUser();
  userId = auth.userId;
  nombreUsuaria = auth.userName;

  // Actualizar saludo con nombre real
  const titulo = document.querySelector("header h1");
  titulo.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola ${nombreUsuaria}! ¿Cómo te sentís hoy?`; */

  const { userName } = await ensureUser();

  const titulo = document.querySelector("header h1");
  titulo.innerHTML = `
    <span class="icon">
      <img src="./assets/img/luna.png" alt="Luna" class="icon-img">
    </span>
    ¡Hola ${userName}! ¿Cómo te sentís hoy?
  `;

  // Inicializar elementos del DOM
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card");
  const nextButtons = document.querySelectorAll(".next-btn");
  const prevButtons = document.querySelectorAll(".prev-btn");
  const indicatorDots = document.querySelectorAll(".indicator-dot");
  const cycleList = document.getElementById("lista-ciclos");
  let currentStep = 0;

  // Cargar datos iniciales
  await cargarCiclos();
  mostrarCiclos();
  await mostrarPredicciones();

  // Sincronizar con API en segundo plano
  setTimeout(sincronizarConAPI, 2000);

  // Función para cambiar pasos del formulario
  function updateStep(newStep) {
    formCards[currentStep].classList.remove("active");
    indicatorDots[currentStep].classList.remove("active");
    currentStep = newStep;
    formCards[currentStep].classList.add("active");
    indicatorDots[currentStep].classList.add("active");
  }

  // Event listeners para botones
  nextButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => currentStep < formCards.length - 1 && updateStep(currentStep + 1)
    );
  });

  prevButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => currentStep > 0 && updateStep(currentStep - 1)
    );
  });

  // Función para mostrar ciclos
  function mostrarCiclos() {
    if (!cycleList) return;

    cycleList.innerHTML = "";

    // Mostrar estado vacío si no hay ciclos
    if (ciclos.length === 0) {
      const emptyState = document.querySelector(".empty-state");
      if (emptyState) cycleList.appendChild(emptyState.cloneNode(true));
      return;
    }

    // Ordenar y mostrar ciclos
    const ciclosOrdenados = [...ciclos].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

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

  // Event listener para enviar formulario
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
    await mostrarPredicciones();

    // Sincronizar con API en segundo plano
    sincronizarConAPI();

    // Resetear formulario
    form.reset();
    updateStep(0);
    showSuccessAnimation();
  });

  // Función para formatear fechas
  function formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Fecha inválida";
    }
  }

  // Función para mostrar animación de éxito
  function showSuccessAnimation() {
    const successMsg = document.createElement("div");
    successMsg.className = "success-animation";
    successMsg.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>Ciclo registrado exitosamente</div>
    `;
    document.body.appendChild(successMsg);

    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  }

  // Botón de cierre de sesión
  const logoutBtn = document.createElement("button");
  logoutBtn.id = "logout-btn";
  logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar sesión';
  logoutBtn.classList.add("logout-btn");
  document.querySelector("header").appendChild(logoutBtn);

  logoutBtn.addEventListener("click", () => {
    // Limpiar almacenamiento local
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("ciclos");

    // Recargar la aplicación
    window.location.reload();
  });
});
