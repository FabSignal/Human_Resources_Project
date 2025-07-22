// ======================= CONFIGURACIÓN API =======================
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://menstrual-cycle-tracking-api.onrender.com";
let isOnline = true;
let userId = localStorage.getItem("userId");
let userName = localStorage.getItem("userName");

// Función para manejar peticiones fetch
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Error ${response.status}: ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error: ${error.message}`);
    throw error;
  }
}

// ======================= AUTENTICACIÓN =======================
async function ensureUser() {
  // Si ya tenemos credenciales en localStorage, devolvemos
  let storedId = localStorage.getItem("userId");
  let storedName = localStorage.getItem("userName");

  if (storedId && storedName) {
    // Actualizar saludo inmediatamente si ya existe
    document.querySelector("header h1").innerHTML = `
      <span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span>
      ¡Hola ${storedName}! ¿Cómo te sentís hoy?
    `;
    return { userId: storedId, userName: storedName };
  }

  // Crear elementos de autenticación si no existen
  createAuthContainerIfMissing();

  // Mostrar formulario de autenticación
  const authContainer = document.getElementById("auth-container");
  authContainer.style.display = "block";

  return new Promise((resolve) => {
    const emailIn = document.getElementById("auth-email");
    const passIn = document.getElementById("auth-password");
    const regBtn = document.getElementById("auth-register");
    const loginBtn = document.getElementById("auth-login");

    const handleAuthSuccess = (res) => {
      localStorage.setItem("userId", res.userId);
      localStorage.setItem("userName", res.name);
      authContainer.style.display = "none";

      // Actualizar saludo
      document.querySelector("header h1").innerHTML = `
        <span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span>
        ¡Hola ${res.name}! ¿Cómo te sentís hoy?
      `;

      resolve({ userId: res.userId, userName: res.name });
    };

    // Registro
    regBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const userName = prompt("Por favor ingresa tu nombre") || "Usuario";
        const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: userName,
            email: emailIn.value,
            password: passIn.value,
          }),
        });
        handleAuthSuccess(res);
      } catch (err) {
        alert(err.message);
      }
    });

    // Login
    loginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailIn.value,
            password: passIn.value,
          }),
        });
        handleAuthSuccess(res);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function createAuthContainerIfMissing() {
  if (!document.getElementById("auth-container")) {
    const authContainer = document.createElement("div");
    authContainer.id = "auth-container";
    authContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
    `;

    authContainer.innerHTML = `
      <div style="
        background: white;
        padding: 2rem;
        border-radius: 1.5rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      ">
        <h2 style="text-align: center; color: #7c5295; margin-bottom: 1.5rem;">Autenticación</h2>
        <form id="auth-form">
          <div class="form-group" style="margin-bottom: 1.2rem;">
            <label for="auth-email" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email</label>
            <input 
              type="email" 
              id="auth-email" 
              required 
              style="
                width: 100%;
                padding: 0.8rem;
                border: 1px solid #d6baaa;
                border-radius: 0.8rem;
                font-size: 1rem;
              "
            >
          </div>
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label for="auth-password" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Contraseña</label>
            <input 
              type="password" 
              id="auth-password" 
              required 
              style="
                width: 100%;
                padding: 0.8rem;
                border: 1px solid #d6baaa;
                border-radius: 0.8rem;
                font-size: 1rem;
              "
            >
          </div>
          <div class="btn-container" style="display: flex; gap: 1rem;">
            <button 
              type="button" 
              id="auth-register" 
              style="
                flex: 1;
                background: #ffb1ee;
                color: #333;
                border: none;
                padding: 0.8rem;
                border-radius: 0.8rem;
                font-weight: 600;
                cursor: pointer;
              "
            >
              Registrarse
            </button>
            <button 
              type="button" 
              id="auth-login" 
              style="
                flex: 1;
                background: #8f9aff;
                color: white;
                border: none;
                padding: 0.8rem;
                border-radius: 0.8rem;
                font-weight: 600;
                cursor: pointer;
              "
            >
              Iniciar sesión
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.prepend(authContainer);
  }
}

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
    // VERIFICAR QUE userId ESTÉ DEFINIDO
    if (!userId) {
      console.log("userId no definido, no se pueden cargar ciclos");
      return;
    }

    const apiCycles = await safeFetch(`${API_BASE_URL}/api/cycles/${userId}`);

    if (apiCycles.length > 0) {
      ciclos = apiCycles.map((c) => ({
        id: c._id,
        fecha: c.startDate,
        duracion: c.duration,
        sintomas: c.symptoms,
        synced: true, // Marcar como sincronizado
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
      synced: false,
    },
    {
      id: 2,
      fecha: "2025-01-28",
      duracion: 6,
      sintomas: "Dolor de cabeza, Cólicos, Dolor de espalda",
      synced: false,
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
  const insightsContainer = document.getElementById("insights-container");

  // Mensaje de carga
  prediccionesContainer.innerHTML =
    '<div class="loading-predicciones"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';
  insightsContainer.innerHTML =
    '<div class="loading-predicciones"><i class="fas fa-spinner fa-spin"></i> Generando insights...</div>';

  if (ciclos.length < 3) {
    prediccionesContainer.innerHTML = `
      <div class="insufficient-data">
        <i class="fas fa-info-circle"></i>
        <p>Necesitás registrar al menos 3 ciclos para generar predicciones.</p>
      </div>
    `;
    insightsContainer.innerHTML = `
      <div class="insufficient-data">
        <i class="fas fa-info-circle"></i>
        <p>Necesitás registrar al menos 3 ciclos para generar insights personalizados.</p>
      </div>
    `;
    return;
  }

  try {
    const predictions = await safeFetch(
      `${API_BASE_URL}/api/cycles/predictions/${userId}`
    );

    if (predictions.status === "insufficient_data") {
      prediccionesContainer.innerHTML = `
        <div class="insufficient-data">
          <i class="fas fa-info-circle"></i>
          <p>${predictions.message}</p>
        </div>
      `;
      insightsContainer.innerHTML = `
        <div class="insufficient-data">
          <i class="fas fa-info-circle"></i>
          <p>${predictions.message}</p>
        </div>
      `;
      return;
    }

    // Actualizar predicciones
    prediccionesContainer.innerHTML = `
      <div class="prediction-item">
        <i class="fas fa-calendar-alt"></i>
        <span>Próximo período:</span>
        <span id="proximo-periodo">${
          predictions.proximoPeriodo?.mensaje || "No disponible"
        }</span>
      </div>
      <div class="prediction-item">
        <i class="fas fa-egg"></i>
        <span>Ovulación:</span>
        <span id="ovulacion">${
          predictions.ovulacion?.mensaje || "No disponible"
        }</span>
      </div>
      <div class="prediction-item">
        <i class="fas fa-baby"></i>
        <span>Probabilidad embarazo:</span>
        <span id="fertilidad">${
          predictions.fertilidad?.mensaje || "No disponible"
        }</span>
      </div>
      <div class="prediction-item">
        <i class="fas fa-sync-alt"></i>
        <span>Fase actual:</span>
        <span id="fase-actual">${
          predictions.faseActual?.nombre || "No disponible"
        }</span>
      </div>
      <div class="prediction-item">
        <i class="fas fa-calendar-day"></i>
        <span>Día del ciclo:</span>
        <span id="dia-ciclo">${
          predictions.faseActual
            ? `${predictions.faseActual.diaDelCiclo}/${predictions.faseActual.duracionCiclo}`
            : "No disponible"
        }</span>
      </div>
    `;

    // Mostrar insights
    if (predictions.insights) {
      insightsContainer.innerHTML = `
        <div class="insight-section">
          <h3>${predictions.insights.mensaje}</h3>
          <p>${predictions.insights.consejo}</p>
          
          <div class="symptoms-grid">
            <div class="symptom-category">
              <h4><i class="fas fa-heartbeat"></i> Síntomas físicos</h4>
              <ul>
                ${predictions.insights.sintomas.fisicos
                  .map((s) => `<li>${s}</li>`)
                  .join("")}
              </ul>
            </div>
            
            <div class="symptom-category">
              <h4><i class="fas fa-smile"></i> Síntomas emocionales</h4>
              <ul>
                ${predictions.insights.sintomas.emocionales
                  .map((s) => `<li>${s}</li>`)
                  .join("")}
              </ul>
            </div>
            
            <div class="symptom-category">
              <h4><i class="fas fa-lightbulb"></i> Consejos</h4>
              <ul>
                ${predictions.insights.sintomas.consejos
                  .map((s) => `<li>${s}</li>`)
                  .join("")}
              </ul>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    prediccionesContainer.innerHTML = `
      <div class="insufficient-data">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar predicciones: ${error.message}</p>
      </div>
    `;
    insightsContainer.innerHTML = `
      <div class="insufficient-data">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar insights: ${error.message}</p>
      </div>
    `;
  }
}

// Función para sincronizar datos con la API
async function sincronizarConAPI() {
  if (!navigator.onLine) return;

  try {
    const ciclosLocales = JSON.parse(localStorage.getItem("ciclos")) || [];
    let needsUpdate = false;

    for (const ciclo of ciclosLocales) {
      // Sincronizar solo si no tiene ID de MongoDB o no está marcado como sincronizado
      if (!ciclo._id || !ciclo.synced) {
        const response = await safeFetch(`${API_BASE_URL}/api/cycles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            startDate: ciclo.fecha,
            duration: ciclo.duracion,
            symptoms: ciclo.sintomas,
          }),
        });

        // Actualizar ciclo local con ID de MongoDB
        if (response && response._id) {
          ciclo._id = response._id;
          ciclo.synced = true;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      localStorage.setItem("ciclos", JSON.stringify(ciclosLocales));
      localStorage.setItem("lastSync", new Date().toISOString());
    }
  } catch (error) {
    console.error("Error sincronizando con API:", error);
  }
}

// Función para mostrar ciclos
function mostrarCiclos() {
  const cycleList = document.getElementById("lista-ciclos");
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

document.addEventListener("DOMContentLoaded", async function () {
  // 0️⃣ Autenticación / registro
  try {
    const auth = await ensureUser();
    userId = auth.userId;
    userName = auth.userName;

    // Actualizar saludo con nombre real
    const titulo = document.querySelector("header h1");
    titulo.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola ${userName}! ¿Cómo te sentís hoy?`;

    // Inicializar elementos del DOM
    const form = document.getElementById("form-ciclo");
    const formCards = document.querySelectorAll(".form-card");
    const nextButtons = document.querySelectorAll(".next-btn");
    const prevButtons = document.querySelectorAll(".prev-btn");
    const indicatorDots = document.querySelectorAll(".indicator-dot");
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
  } catch (error) {
    console.error("Error en inicialización:", error);
  }
});
