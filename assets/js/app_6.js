// ======================= CONFIGURACIÓN API =======================
const API_BASE_URL = "https://menstrual-cycle-tracking-api.onrender.com";

/* ======================= DECLARACIONES GLOBALES ====================== */
let ciclosPrecargados = false; // <-- MOVIDO AL INICIO DEL ARCHIVO
let ciclos = [];

/* ======================= AUTENTICACIÓN ====================== */

// Elementos del DOM
const authModal = document.getElementById("auth-modal");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const greetingDiv = document.getElementById("greeting");
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
  // Leer SIEMPRE desde localStorage
  const storedUserName = localStorage.getItem("userName");

  authModal.classList.remove("active");
  greetingDiv.hidden = false;

  // Usar el nombre almacenado
  userNameSpan.textContent = storedUserName;

  // Actualizar el saludo en el header
  const titulo = document.querySelector("header h1");
  titulo.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola ${
    storedUserName || "usuaria"
  }! ¿Cómo te sentís hoy?`;
}

// Función para mostrar estado no autenticado
function showUnauthenticatedState() {
  authModal.classList.add("active");
  greetingDiv.hidden = true;
  greetingText.innerHTML = `<span class="icon"><img src="./assets/img/luna.png" alt="Luna" class="icon-img"></span> ¡Hola! ¿Cómo te sentís hoy?`;
}

// ======================= MENÚ DE USUARIO =======================

// Elementos del menú de usuario
const userMenu = document.querySelector(".user-menu");
const userIcon = document.querySelector(".user-icon");
const userDropdown = document.querySelector(".user-dropdown");
const logoutBtn = document.getElementById("logout-btn");

// Solo si existen estos elementos
if (userIcon && userDropdown && logoutBtn) {
  // Mostrar/ocultar menú
  userIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.hidden = !userDropdown.hidden;
  });

  // Cerrar sesión
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    userDropdown.hidden = true;
    showUnauthenticatedState();
  });

  // Ocultar menú al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target)) {
      userDropdown.hidden = true;
    }
  });

  // Actualizar visibilidad del menú en estados de autenticación
  function updateAuthStateUI() {
    if (localStorage.getItem("userId")) {
      userMenu.style.display = "block";
      userDropdown.hidden = true;
    } else {
      userMenu.style.display = "none";
    }
  }

  // Actualizar UI al cambiar estados
  const originalShowAuth = showAuthenticatedState;
  showAuthenticatedState = function () {
    originalShowAuth();
    updateAuthStateUI();
  };

  const originalShowUnauth = showUnauthenticatedState;
  showUnauthenticatedState = function () {
    originalShowUnauth();
    updateAuthStateUI();
  };

  // Inicializar UI
  updateAuthStateUI();
}

// Al cargar la página
if (userId && userName) {
  showAuthenticatedState();
} else {
  showUnauthenticatedState();
  // Eliminar nombre anterior si existe
  localStorage.removeItem("nombre");
}

// Verificar si debemos limpiar los ciclos de ejemplo
if (userId && !ciclosPrecargados) {
  localStorage.removeItem("ciclos");
  ciclos = [];
}

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

// Manejar registro
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  // Mostrar indicador de carga
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
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
    } else {
      const text = await response.text();
      throw new Error(text || "Respuesta inesperada del servidor");
    }

    if (response.ok) {
      // Guardar en localStorage
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", data.userName);

      // Eliminar ciclos de ejemplo
      localStorage.removeItem("ciclos");
      ciclosPrecargados = false;

      // Ocultar modal y mostrar estado autenticado
      authModal.classList.remove("active");
      showAuthenticatedState();

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
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ingresando...';
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
    } else {
      const text = await response.text();
      throw new Error(text || "Respuesta inesperada del servidor");
    }

    if (response.ok) {
      // Guardar en localStorage
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("userName", data.userName);
      showAuthenticatedState();
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

/* ============ Ciclos: leer de localStorage o cargar ejemplo ============ */

// Verificar si hay ciclos guardados en localStorage
const ciclosGuardados = localStorage.getItem("ciclos");

if (ciclosGuardados) {
  // Si existen ciclos guardados, se cargan desde Storage
  ciclos = JSON.parse(ciclosGuardados);
} else {
  // Si no hay nada en Storage, se cargan ciclos de ejemplo
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

  // se guardan los ciclos de ejemplo en localStorage para persistencia
  localStorage.setItem("ciclos", JSON.stringify(ciclos));
}

document.addEventListener("DOMContentLoaded", function () {
  // Elementos del DOM relacionados al formulario por pasos
  const form = document.getElementById("form-ciclo");
  const formCards = document.querySelectorAll(".form-card"); // Tarjetas del form
  const nextButtons = document.querySelectorAll(".next-btn"); // Botones siguiente
  const prevButtons = document.querySelectorAll(".prev-btn"); // Botones Anterior
  const indicatorDots = document.querySelectorAll(".indicator-dot"); // Puntos para pasar de tarjeta
  const cycleList = document.getElementById("lista-ciclos"); // Lista donde se muestran los ciclos
  const emptyState = document.querySelector(".empty-state"); // Tarjeta que indica que no se han ingresado ciclos ( de estado vacío)

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

  // Se cargan los ciclos existentes al iniciar la página
  mostrarCiclos();

  let currentStep = 0; // Paso actual del formulario

  // Función para cambiar de tarjeta en el formulario por pasos
  function updateStep(newStep) {
    // Se oculta tarjeta actual
    formCards[currentStep].classList.remove("active");
    indicatorDots[currentStep].classList.remove("active");

    // Se muestra una tarjeta nueva
    currentStep = newStep;
    formCards[currentStep].classList.add("active");
    indicatorDots[currentStep].classList.add("active");
  }

  // Event listeners para cambiar de tarjeta al hacer click en botones Siguiente
  nextButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (currentStep < formCards.length - 1) {
        updateStep(currentStep + 1);
      }
    });
  });

  // Event listeners para volver atrás al hacer click en botones Anterior
  prevButtons.forEach((button) => {
    button.addEventListener("click", function () {
      if (currentStep > 0) {
        updateStep(currentStep - 1);
      }
    });
  });

  /* ========== Registro de datos ingresados mediante el formulario ========== */
  /* 
// Se obtiene la información ingresada (fecha, duración, síntomas)
// Se crea un nuevo objeto y se agrega al array ciclos
// Se eliminan los ciclos de de ejemplo y se actualiza la lista con los nuevos datos
*/

  // Envío del formulario
  form.addEventListener("submit", function (e) {
    e.preventDefault(); // Evita que se recargue la página

    // Se obtienen los valores ingresados por la usuaria en el formulario
    const fecha = document.getElementById("fecha").value;
    const duracion = parseInt(document.getElementById("duracion").value);
    const sintomas = document.getElementById("sintomas").value;

    // Validación simple: si no se ingresó fecha o duración, se muestra un mensaje de error
    if (!fecha || isNaN(duracion) || duracion <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return; // Detiene la ejecución si hay error
    }

    // Se eliminan los ciclos de muestra al agregar el primer ciclo real
    if (ciclosPrecargados) {
      ciclos = []; // Se eliminan todos los ciclos actuales (los de ejemplo)
      ciclosPrecargados = false; // Evita que esto vuelva a ejecutarse
    }

    // Se crea un nuevo objeto con los nuevos datos ingresados del ciclo
    const nuevoCiclo = {
      id: ciclos[ciclos.length - 1]?.id + 1 || 1, // ID autoincremental
      fecha,
      duracion,
      sintomas,
    };

    // Se agrega el nuevo ciclo al array
    ciclos.push(nuevoCiclo);

    localStorage.setItem("ciclos", JSON.stringify(ciclos));

    // Se actualiza la lista de ciclos en pantalla
    mostrarCiclos();

    // Se actualiza ciclosPrecargados para avisar que ya no deben mostrarse solo los ciclos de prueba
    ciclosPrecargados = false;

    // Si la tarjeta de estado vacío está visible, se remueve
    if (emptyState && cycleList.contains(emptyState)) {
      cycleList.removeChild(emptyState);
    }

    // Se vuelve a mostrar la lista actualizada
    mostrarCiclos();

    // Se resetea el formulario y se vuelve al primer paso
    form.reset();
    updateStep(0);

    // Se muestra animación de éxito de carga de datos
    showSuccessAnimation();
  });

  // Función para ordenar ciclos por fecha (más reciente primero)
  function ordenarCiclosPorFechaDesc(array) {
    return [...array].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }

  /* ========== Mostrar ciclos dinámicamente en el DOM ========== */
  /* 
  - Se limpia la lista previa y se agregan los ciclos ordenados por fecha
  - Se usa una función para formatear fechas en español
  */

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

  // Se agregan estilos de animación para el mensaje de éxito de carga de de ciclo
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
