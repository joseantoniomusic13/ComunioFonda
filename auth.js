// Lógica de Autenticación de Firebase y Gestión de Perfiles para Comunio Mundial
// Carga servicios de firebase-config.js y controla los formularios en el DOM de forma reactiva.

const auth = window.auth;
const db = window.db;
const createUserWithEmailAndPassword = window.createUserWithEmailAndPassword;
const signInWithEmailAndPassword = window.signInWithEmailAndPassword;
const onAuthStateChanged = window.onAuthStateChanged;
const signOut = window.signOut;
const doc = window.doc;
const setDoc = window.setDoc;
const getDoc = window.getDoc;

// --- SISTEMA DE TOASTS/NOTIFICACIONES PREMIUM ---
function showNotification(message, type = "success") {
  // Eliminar toasts anteriores si existen
  const oldToast = document.querySelector(".notification-toast");
  if (oldToast) oldToast.remove();

  const toast = document.createElement("div");
  toast.className = `notification-toast glass-panel border ${
    type === "success" 
      ? "border-emerald-500 bg-slate-900/90 text-emerald-400" 
      : "border-rose-500 bg-slate-900/90 text-rose-400"
  }`;

  // Icono dinámico
  const icon = type === "success" 
    ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

  toast.innerHTML = `
    ${icon}
    <span class="font-medium text-sm text-center">${message}</span>
  `;

  document.body.appendChild(toast);

  // Auto destruir después de 4 segundos
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-4");
    toast.style.transition = "all 0.5s ease";
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// --- REGISTRO DE NUEVO MÁNAGER (CON USERNAME PURO) ---
async function registerManager(username, password, nombreEquipo, isSystemInit = false) {
  try {
    const cleanUsername = username.toLowerCase().trim();

    // El usuario "admin" está reservado exclusivamente para el Gran Fondero.
    // Solo puede crearse vía auto-init interno (isSystemInit = true).
    if (cleanUsername === "admin" && !isSystemInit) {
      showNotification("El nombre de usuario 'admin' está reservado. Elige otro.", "error");
      return { success: false, error: "Username reservado." };
    }

    // Mapeo transparente a correo ficticio para Firebase Auth
    const fakeEmail = `${cleanUsername}@comuniomundial.com`;

    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, password);
    const user = userCredential.user;

    // Asignación de rol dinámico
    const userRole = (cleanUsername === "admin") ? "admin" : "manager";

    // 2. Inicializar perfil del usuario en Firestore (users)
    const userProfileRef = doc(db, "users", user.uid);
    const initialProfile = {
      uid: user.uid,
      nombre_usuario: username,
      nombre_equipo: nombreEquipo || `${username} FC`,
      nombres_equipo: {},    // Mapa { codigoLiga: nombreEquipoEnEsaLiga }
      fecha_registro: new Date().toISOString(),
      presupuesto_actual: 100000000, // 100M$ inicial
      presupuesto_club: 100000000, // 100M$ inicial
      fonda_coins: 10, // 10 FC inicial (escala concentrada)
      ultimo_login: new Date().toDateString(),
      puntos_totales: 0,
      puntos_jornada_actual: 0,
      ranking_global: 1,
      rol: userRole,
      ligas: [],       // Lista de códigos de liga a las que pertenece
      liga_activa: ""   // Código de la liga seleccionada
    };
    await setDoc(userProfileRef, initialProfile);

    // 3. Inicializar plantilla y Chips en Firestore (user_teams)
    const userTeamRef = doc(db, "user_teams", user.uid);
    const initialTeam = {
      uid: user.uid,
      jugadores_ids: [], // Comienza vacío
      alineacion: {
        titulares: {
          portero: [],
          defensas: [],
          mediocampistas: [],
          delanteros: []
        },
        suplentes: {
          portero: [],
          defensas: [],
          mediocampistas: [],
          delanteros: []
        }
      },
      capitan_id: "",
      cambios_realizados_jornada: 0,
      chips: {
        wildcard: { disponible: true, usado_en_jornada: null },
        jugador_12: { disponible: true, usado_en_jornada: null, jugador_extra_id: null },
        capitan_maximo: { disponible: true, usado_en_jornada: null },
        comodin_misterioso: { disponible: true, usado_en_jornada: null },
        super_banquillo: { disponible: true, usado_en_jornada: null } // Potenciador 5
      }
    };
    await setDoc(userTeamRef, initialTeam);

    showNotification(`¡Registro completado con éxito! Bienvenido, ${username}.`);
    return { success: true, user };
  } catch (error) {
    console.error("Error en Registro:", error);
    let errorMsg = "Ocurrió un error inesperado al registrar el usuario.";
    if (error.code === "auth/email-already-in-use") {
      errorMsg = "El nombre de usuario ya está registrado por otro mánager.";
    } else if (error.code === "auth/weak-password") {
      errorMsg = "La contraseña debe tener al menos 6 caracteres.";
    }
    showNotification(errorMsg, "error");
    return { success: false, error: errorMsg };
  }
}

// --- INICIO DE SESIÓN ---
async function loginManager(username, password) {
  const cleanUsername = username.toLowerCase().trim();
  const fakeEmail = `${cleanUsername}@comuniomundial.com`;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, password);
    showNotification(`¡Sesión iniciada con éxito! Cargando perfil de ${username}...`);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Error en Login:", error);
    
    // CASO ESPECIAL: Auto-registro del Admin Maestro si es el primer inicio de sesión
    if (cleanUsername === "admin" && password === "catena13") {
      showNotification("Inicializando cuenta de Administrador por primera vez...", "success");
      const regResult = await registerManager("admin", "catena13", "Consola de Administración", true);
      if (regResult.success) {
        // Volver a iniciar sesión tras registrar
        return await loginManager("admin", "catena13");
      }
    }

    let errorMsg = "Usuario o contraseña incorrectos.";
    if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      errorMsg = "Credenciales incorrectas. Revisa tu usuario y contraseña.";
    }
    showNotification(errorMsg, "error");
    return { success: false, error: errorMsg };
  }
}

// --- CIERRE DE SESIÓN ---
async function logoutManager() {
  try {
    await signOut(auth);
    showNotification("Sesión cerrada correctamente. ¡Hasta pronto!");
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    showNotification("Error al cerrar sesión.", "error");
  }
}

// --- ESCUCHADOR DE ESTADO DE AUTENTICACIÓN ---
function initAuthListener(onUserLogin, onUserLogout) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Determinar si es admin por email (fallback seguro)
      const isAdminEmail = user.email === "admin@comuniomundial.com";

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data() && userDoc.data().nombre_usuario) {
          const data = userDoc.data();
          
          // Auto-sanar campo 'uid' si falta en el documento
          if (!data.uid) {
            data.uid = user.uid;
            await setDoc(doc(db, "users", user.uid), { uid: user.uid }, { merge: true })
              .catch(e => console.error("Error auto-sanando uid:", e));
          }

          // Si el email es de admin pero el rol no está puesto, forzarlo
          if (isAdminEmail && data.rol !== "admin") {
            data.rol = "admin";
          }

          // BONO DIARIO LOGIN: +1 FC
          const todayStr = new Date().toDateString();
          if (data.ultimo_login !== todayStr && data.rol !== "admin") {
            const currentFC = data.fonda_coins || 0;
            const newFC = currentFC + 1;
            data.fonda_coins = newFC;
            data.ultimo_login = todayStr;

            await setDoc(doc(db, "users", user.uid), {
              fonda_coins: newFC,
              ultimo_login: todayStr
            }, { merge: true }).catch(err => console.error("Error daily login bonus:", err));

            setTimeout(() => {
              showNotification("🌞 ¡BONO DIARIO! Recibes +1 Fonda Coin (FC) por entrar hoy.", "success");
            }, 2000);
          }

          onUserLogin(user, data);
        } else {
          // AUTO-REPARACIÓN: solo rellena los campos que faltan, sin borrar datos existentes
          const repairsUsername = user.email?.split("@")[0] || "Usuario";
          // Leer el documento existente para preservar ligas, nombres_equipo, etc.
          const existingData = userDoc.exists() ? (userDoc.data() || {}) : {};

          const repairFields = {};
          if (!existingData.uid)               repairFields.uid               = user.uid;
          if (!existingData.nombre_usuario)    repairFields.nombre_usuario    = repairsUsername;
          if (!existingData.nombre_equipo)     repairFields.nombre_equipo     = `${repairsUsername} FC`;
          if (!existingData.fecha_registro)    repairFields.fecha_registro    = new Date().toISOString();
          if (!existingData.presupuesto_actual) repairFields.presupuesto_actual = 100000000;
          if (!existingData.presupuesto_club)  repairFields.presupuesto_club  = 100000000;
          if (existingData.fonda_coins === undefined) repairFields.fonda_coins = 10;
          if (!existingData.ultimo_login)      repairFields.ultimo_login      = new Date().toDateString();
          if (existingData.puntos_totales === undefined) repairFields.puntos_totales = 0;
          if (existingData.puntos_jornada_actual === undefined) repairFields.puntos_jornada_actual = 0;
          if (existingData.ranking_global === undefined) repairFields.ranking_global = 1;
          if (!existingData.rol)               repairFields.rol               = isAdminEmail ? "admin" : "manager";
          // NUNCA sobrescribir ligas ni liga_activa para no borrar membresías existentes
          if (!Array.isArray(existingData.ligas)) repairFields.ligas          = [];
          if (existingData.liga_activa === undefined) repairFields.liga_activa = "";
          // Preservar nombres_equipo; inicializar solo si no es un objeto válido
          if (!existingData.nombres_equipo || typeof existingData.nombres_equipo !== "object" || Array.isArray(existingData.nombres_equipo)) {
            repairFields.nombres_equipo = {};
          }

          const mergedProfile = { ...existingData, ...repairFields };

          try {
            // merge:true garantiza que solo se actualicen los campos que faltan
            if (Object.keys(repairFields).length > 0) {
              await setDoc(doc(db, "users", user.uid), repairFields, { merge: true });
              console.log(`🔧 [Self-Healing] Campos reparados en perfil de ${repairsUsername}:`, Object.keys(repairFields));
            }

            // Asegurar user_teams con merge:true para no borrar plantillas existentes
            const userTeamRef = doc(db, "user_teams", user.uid);
            const teamSnap = await getDoc(userTeamRef);
            if (!teamSnap.exists()) {
              await setDoc(userTeamRef, {
                uid: user.uid,
                jugadores_ids: [],
                alineacion: {
                  titulares: { portero: [], defensas: [], mediocampistas: [], delanteros: [] },
                  suplentes: { portero: [], defensas: [], mediocampistas: [], delanteros: [] }
                },
                capitan_id: "",
                cambios_realizados_jornada: 0,
                chips: {
                  wildcard: { disponible: true, usado_en_jornada: null },
                  jugador_12: { disponible: true, usado_en_jornada: null, jugador_extra_id: null },
                  capitan_maximo: { disponible: true, usado_en_jornada: null },
                  comodin_misterioso: { disponible: true, usado_en_jornada: null },
                  super_banquillo: { disponible: true, usado_en_jornada: null }
                }
              }, { merge: true });
            }

            onUserLogin(user, mergedProfile);
          } catch (repairErr) {
            console.error("Error al reparar perfil en Firestore:", repairErr);
            onUserLogin(user, mergedProfile);
          }
        }
      } catch (err) {
        console.error("Error al cargar perfil de Firestore:", err);
        // Fallback: usar email para determinar el rol
        onUserLogin(user, {
          nombre_usuario: user.email?.split("@")[0] || "Usuario",
          nombre_equipo: isAdminEmail ? "Consola de Administración" : "Mi Equipo FC",
          presupuesto_actual: 100000000,
          presupuesto_club: 100000000,
          fonda_coins: 10,
          rol: isAdminEmail ? "admin" : "manager",
          ligas: [],
          liga_activa: ""
        });
      }
    } else {
      onUserLogout();
    }
  });
}

// Expose to global window scope
window.showNotification = showNotification;
window.registerManager = registerManager;
window.loginManager = loginManager;
window.logoutManager = logoutManager;
window.initAuthListener = initAuthListener;
