// ======================= CONFIGURACIÓN API =======================
//const API_BASE_URL = "https://menstrual-cycle-tracking-api.onrender.com";
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://menstrual-cycle-tracking-api.onrender.com";
let isOnline = true;
/* let userId =
  localStorage.getItem("userId") ||
  "user_" + Date.now() + Math.random().toString(36).substr(2, 9);
localStorage.setItem("userId", userId); */
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
  if (storedId && storedName) return { userId: storedId, userName: storedName };

  // Si no, mostramos el formulario de auth
  document.getElementById("auth-container").style.display = "block";
  const form = document.getElementById("auth-form");
  const emailIn = document.getElementById("auth-email");
  const passIn = document.getElementById("auth-password");
  const regBtn = document.getElementById("auth-register");
  const loginBtn = document.getElementById("auth-login");

  return new Promise((resolve, reject) => {
    // Registro
    regBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const res = await safeFetch(`${API_BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: emailIn.value.split("@")[0], // o pide un campo “name” extra
            email: emailIn.value,
            password: passIn.value,
          }),
        });
        localStorage.setItem("userId", res.userId);
        localStorage.setItem("userName", res.name);
        document.getElementById("auth-container").remove();
        resolve({ userId: res.userId, userName: res.name });
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
        localStorage.setItem("userId", res.userId);
        localStorage.setItem("userName", res.name);
        document.getElementById("auth-container").remove();
        resolve({ userId: res.userId, userName: res.name });
      } catch (err) {
        alert(err.message);
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

    // Manejar caso de datos insuficientes desde API
    if (predictions.status === "insufficient_data") {
      prediccionesContainer.innerHTML = `
        <div class="insufficient-data">
          <i class="fas fa-info-circle"></i>
          <p>${predictions.message}</p>
        </div>
      `;
      return;
    }

    // Actualizar la UI con las predicciones
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
async function sincronizarConAPI() {
  if (!navigator.onLine) return;

  try {
    const ciclosLocales = JSON.parse(localStorage.getItem("ciclos")) || [];

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
        }
      }
    }

    localStorage.setItem("ciclos", JSON.stringify(ciclosLocales));
    localStorage.setItem("lastSync", new Date().toISOString());
  } catch (error) {
    console.error("Error sincronizando con API:", error);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  // 0️⃣ Autenticación / registro
  const auth = await ensureUser();
  userId = auth.userId;
  nombreUsuaria = auth.userName;

  // Actualizar saludo con nombre real
  const titulo = document.querySelector("header h1");
  titulo.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola ${nombreUsuaria}! ¿Cómo te sentís hoy?`;

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
});
