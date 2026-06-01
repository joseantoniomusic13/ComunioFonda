(function () {
  // Firebase Configuración e Inicialización para "Firebase Realtime Database" (fir-comunio-mundial)
  // Soportando Motor Dual: Realtime Database Nube Real vs Base de Datos Local de la Fonda (LocalStorage Fallback)

  // --- CONFIGURACIÓN ---
  const firebaseConfig = {
    apiKey: "AIzaSyB4v6elcctq94CknWFH-n-LlcQ0sgnV0kU",
    authDomain: "mundial-fonda.firebaseapp.com",
    databaseURL: "https://mundial-fonda-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mundial-fonda",
    storageBucket: "mundial-fonda.firebasestorage.app",
    messagingSenderId: "218147984757",
    appId: "1:218147984757:web:7cb25a9aa81afb9246ef3c"
  };

  // ¿Es una clave dummy o no está cargado Firebase?
  const isMock = firebaseConfig.apiKey.includes("DummyKey") || 
                 typeof firebase === "undefined";

  // --- INICIALIZACIÓN CONDICIONAL DE LA NUBE ---
  let firebaseApp = null;
  let firebaseDb = null;
  const firebaseAuth = {
    currentUser: null
  };

  const savedCloudUser = localStorage.getItem("comunio_auth_user_cloud");
  if (savedCloudUser) {
    try {
      firebaseAuth.currentUser = JSON.parse(savedCloudUser);
    } catch (e) {
      localStorage.removeItem("comunio_auth_user_cloud");
    }
  }

  if (!isMock) {
    try {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      firebaseDb = firebase.database();
      console.log("🔥 Firebase Realtime Database Cloud Engine inicializado correctamente.");

      // Auto-crear la liga FONDA FANEGAS en el motor de nube si no existe
      const ligaFondaRef = firebaseDb.ref("leagues/FF-FONDA");
      ligaFondaRef.once("value").then(snap => {
        if (!snap.exists()) {
          ligaFondaRef.set({
            id: "FF-FONDA",
            codigo: "FF-FONDA",
            nombre: "FONDA FANEGAS",
            password: "mariacatena",
            creador_id: "admin",
            participantes: [],
            fecha_creacion: "2026-06-01T00:00:00.000Z",
            jornada_activa: "Jornada 1",
            market_players: [],
            secondary_market: [],
            incidencias: []
          }).then(() => {
            console.log("🏆 [Cloud] Liga oficial FONDA FANEGAS (FF-FONDA) creada en Firebase Realtime Database.");
          });
        } else {
          console.log("✅ [Cloud] Liga FONDA FANEGAS ya existe en Firebase.");
        }
      }).catch(err => console.warn("⚠️ No se pudo verificar/crear la liga predefinida en nube:", err));
    } catch (err) {
      console.error("⚠️ Falló inicialización en la nube. Activando Motor Local.", err);
    }
  } else {
    console.log("🏠 [Fonda Engine] Motor de Base de Datos Local ACTIVADO.");
  }

  // =========================================================================
  // ================= ESTADO DE BASE DE DATOS LOCAL =========================
  // =========================================================================

  const LOCAL_DB_KEY = "fonda_comunio_local_db";

  // Limpiar base de datos vieja si existe para empezar 100% de cero como se solicitó
  if (!localStorage.getItem("fonda_comunio_rtdb_purged_v4")) {
    localStorage.removeItem(LOCAL_DB_KEY);
    localStorage.removeItem("fonda_comunio_auth_user");
    localStorage.setItem("fonda_comunio_rtdb_purged_v4", "true");
    console.log("🧹 Base de datos anterior purgada. Iniciando Realtime Database desde cero con liga predefinida.");
  }

  const mockDB = JSON.parse(localStorage.getItem(LOCAL_DB_KEY)) || {
    users: {},
    leagues: {},
    players: {},
    partidos: {},
    auth_users: {}
  };

  // =========================================================================
  // ========== LIGA PREDEFINIDA: FONDA FANEGAS (FF-FONDA) ===================
  // =========================================================================
  // Liga única oficial. Código: FF-FONDA | Contraseña: mariacatena
  const LIGA_PREDEFINIDA = {
    id: "FF-FONDA",
    codigo: "FF-FONDA",
    nombre: "FONDA FANEGAS",
    password: "mariacatena",
    creador_id: "uid_admin_global",
    participantes: [],
    fecha_creacion: "2026-06-01T00:00:00.000Z",
    jornada_activa: "Jornada 1",
    market_players: [],
    secondary_market: [],
    incidencias: []
  };

  // Pre-crear el usuario admin con contraseña catena13 si no existe
  if (!mockDB.auth_users["admin@comuniomundial.com"]) {
    mockDB.auth_users["admin@comuniomundial.com"] = {
      password: "catena13",
      uid: "uid_admin_global"
    };
    mockDB.users["uid_admin_global"] = {
      uid: "uid_admin_global",
      email: "admin@comuniomundial.com",
      nombre_usuario: "admin",
      nombre: "admin",
      rol: "admin",
      ligas: [],
      liga_activa: ""
    };
    // Soportar también la cadena de texto plana "admin" como login
    mockDB.auth_users["admin"] = {
      password: "catena13",
      uid: "uid_admin_global"
    };
  }

  // Pre-crear la liga oficial FONDA FANEGAS si no existe en el mockDB
  if (!mockDB.leagues) mockDB.leagues = {};
  if (!mockDB.leagues["FF-FONDA"]) {
    mockDB.leagues["FF-FONDA"] = JSON.parse(JSON.stringify(LIGA_PREDEFINIDA));
    console.log("🏆 [Fonda Engine] Liga oficial FONDA FANEGAS (FF-FONDA) inicializada en la base de datos local.");
  }

  function saveLocalDB() {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(mockDB));
    triggerSnapshotListeners();
  }

  // Se fuerza guardado inicial de las credenciales de admin y la liga si es una instalación limpia
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(mockDB));

  const snapshotListeners = [];
  let snapshotTimeout = null;
  function triggerSnapshotListeners() {
    if (snapshotTimeout) clearTimeout(snapshotTimeout);
    snapshotTimeout = setTimeout(() => {
      snapshotListeners.forEach(listener => {
        try {
          listener.callback();
        } catch(e) {
          console.error("Error in snapshot listener:", e);
        }
      });
    }, 50);
  }

  // Travesía de caminos (paths) en el objeto Mock Local
  const getMockDBValue = (path) => {
    const parts = path.split("/");
    let obj = mockDB;
    for (const part of parts) {
      if (!obj || typeof obj !== "object") return null;
      obj = obj[part];
    }
    return obj !== undefined ? obj : null;
  };

  const setMockDBValue = (path, val) => {
    const parts = path.split("/");
    let obj = mockDB;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!obj[part] || typeof obj[part] !== "object") {
        obj[part] = {};
      }
      obj = obj[part];
    }
    const lastKey = parts[parts.length - 1];
    obj[lastKey] = JSON.parse(JSON.stringify(val));
    saveLocalDB();
  };

  const deleteMockDBValue = (path) => {
    const parts = path.split("/");
    let obj = mockDB;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!obj[part] || typeof obj[part] !== "object") return;
      obj = obj[part];
    }
    const lastKey = parts[parts.length - 1];
    if (obj && typeof obj === "object") {
      delete obj[lastKey];
    }
    saveLocalDB();
  };

  // Deep merge para guardados incrementales (options.merge)
  const deepMerge = (target, source) => {
    const output = Object.assign({}, target);
    if (target && typeof target === "object" && source && typeof source === "object") {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === "object") {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  };

  // Expande claves dot-notation ("a.b") a estructuras de objetos anidados
  const expandDotNotation = (data) => {
    if (!data || typeof data !== "object" || Array.isArray(data)) return data;
    const expanded = {};
    Object.keys(data).forEach(key => {
      let val = data[key];
      if (val && typeof val === "object" && !Array.isArray(val) && val._type === undefined) {
        val = expandDotNotation(val);
      }
      
      if (key.includes(".")) {
        const parts = key.split(".");
        let temp = expanded;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!temp[part] || typeof temp[part] !== "object") {
            temp[part] = {};
          }
          temp = temp[part];
        }
        const last = parts[parts.length - 1];
        temp[last] = val;
      } else {
        if (expanded[key] && typeof expanded[key] === "object" && val && typeof val === "object") {
          expanded[key] = deepMerge(expanded[key], val);
        } else {
          expanded[key] = val;
        }
      }
    });
    return expanded;
  };

  // Limpieza de datos (convierte sentinelas a valores serializables)
  const cleanFirebaseData = (data) => {
    if (data === null || data === undefined) return data;
    if (typeof data !== "object") return data;
    
    if (data._type === "timestamp") {
      return { seconds: Math.floor(Date.now() / 1000) };
    }
    if (data._type === "arrayUnion") {
      return Array.isArray(data.value) ? data.value : [data.value];
    }
    
    const clean = Array.isArray(data) ? [] : {};
    Object.keys(data).forEach(key => {
      let val = data[key];
      if (val && val._type === "arrayUnion") {
        clean[key] = Array.isArray(val.value) ? val.value : [val.value];
      } else {
        clean[key] = cleanFirebaseData(val);
      }
    });
    return clean;
  };

  // =========================================================================
  // ==================== MAPEADOR DE RUTAS JERÁRQUICAS =======================
  // =========================================================================

  // Mapea colecciones de Firestore a la estructura organizada de Realtime Database:
  // - leagues -> leagues/{leagueCode}
  // - users -> users/{uid}
  // - user_teams -> leagues/{leagueCode}/users/{uid}/team
  // - messages/trades/club_bets -> leagues/{leagueCode}/{collection} (se filtra por leagueCode)
  // - players / partidos -> permanecen globales para todas las ligas.
  const getRTDBPath = (collName, id = null, constraints = []) => {
    collName = collName.replace(/^\/|\/$/g, "");

    const parts = collName.split("/");
    if (parts.length > 1) {
      return id ? `${collName}/${id}` : collName;
    }

    // 1. Catálogos globales
    if (collName === "leagues" || collName === "users" || collName === "players" || collName === "partidos" || collName === "matches") {
      return id ? `${collName}/${id}` : collName;
    }

    // 2. Equipos de usuario (squads)
    if (collName === "user_teams") {
      if (id) {
        const p = id.split("_");
        const userId = p[0];
        const leagueCode = p.slice(1).join("_");
        return `leagues/${leagueCode}/users/${userId}/team`;
      }
      return `user_teams`;
    }

    // 3. Colecciones filtradas por liga (chat, trades, bets)
    let leagueCode = null;
    if (constraints && constraints.length > 0) {
      const c = constraints.find(item => item.field === "leagueCode" || item.field === "liga");
      if (c) leagueCode = c.value;
    }
    
    if (!leagueCode && id) {
      const p = id.split("_");
      if (p.length > 1) {
        leagueCode = p[p.length - 1];
      }
    }

    if (leagueCode) {
      return id ? `leagues/${leagueCode}/${collName}/${id}` : `leagues/${leagueCode}/${collName}`;
    }

    return id ? `${collName}/${id}` : collName;
  };

  // =========================================================================
  // ==================== CLASES DE REFERENCIA PERSONALIZADAS ================
  // =========================================================================

  class CustomDocRef {
    constructor(collectionName, id) {
      this._type = "doc";
      this.collectionName = collectionName;
      this.id = id;
    }
    
    collection(subCollName) {
      return new CustomCollectionRef(`${this.collectionName}/${this.id}/${subCollName}`);
    }
    
    async set(data, options = {}) {
      return await dbSetDoc(this, data, options);
    }
    
    async update(data) {
      return await dbUpdateDoc(this, data);
    }
    
    async delete() {
      return await dbDeleteDoc(this);
    }
    
    onSnapshot(callback) {
      return dbOnSnapshot(this, callback);
    }
    
    async get() {
      return await dbGetDoc(this);
    }
  }

  class CustomCollectionRef {
    constructor(collName, constraints = []) {
      this._type = "collection";
      this.collectionName = collName;
      this.constraints = constraints;
    }
    
    doc(id) {
      return new CustomDocRef(this.collectionName, id);
    }
    
    where(field, op, value) {
      return new CustomCollectionRef(this.collectionName, [...this.constraints, { field, op, value }]);
    }
    
    orderBy(field, direction = "asc") {
      const newRef = new CustomCollectionRef(this.collectionName, this.constraints);
      newRef.sortField = field;
      newRef.sortDirection = direction;
      newRef._type = "query";
      return newRef;
    }
    
    async add(data) {
      const leagueCode = data.leagueCode || data.liga || "";
      const randomId = "doc_" + Math.random().toString(36).substring(2, 11);
      const id = leagueCode ? `${randomId}_${leagueCode}` : randomId;
      const docRef = new CustomDocRef(this.collectionName, id);
      await dbSetDoc(docRef, data);
      return { id, parent: this };
    }
    
    onSnapshot(callback) {
      return dbOnSnapshot(this, callback);
    }
    
    async get() {
      return await dbGetDocs(this);
    }
  }

  // Exponer creadores de referencias
  const doc = (db, ...paths) => {
    if (paths.length === 0 || paths[0] === undefined) return null;
    const id = paths.pop();
    const collectionName = paths.join("/");
    return new CustomDocRef(collectionName, id);
  };

  const collection = (db, ...paths) => {
    const collectionName = paths.join("/");
    return new CustomCollectionRef(collectionName);
  };

  // =========================================================================
  // ================= MOTOR DUAL DE TRANSACCIONES RTDB ======================
  // =========================================================================

  const dbGetDoc = async (docRef) => {
    const path = getRTDBPath(docRef.collectionName, docRef.id);
    let data = null;

    if (isMock) {
      data = getMockDBValue(path);
    } else {
      const snap = await firebaseDb.ref(path).get();
      data = snap.val();
    }

    return {
      exists: () => data !== null && data !== undefined,
      id: docRef.id,
      data: () => data ? JSON.parse(JSON.stringify(data)) : null
    };
  };

  const dbSetDoc = async (docRef, data, options = {}) => {
    const path = getRTDBPath(docRef.collectionName, docRef.id);
    const expandedData = expandDotNotation(data);
    const cleanData = cleanFirebaseData(expandedData);

    if (isMock) {
      if (options.merge) {
        const current = getMockDBValue(path) || {};
        const merged = deepMerge(current, cleanData);
        setMockDBValue(path, merged);
      } else {
        setMockDBValue(path, cleanData);
      }
    } else {
      if (options.merge) {
        try {
          const snap = await firebaseDb.ref(path).get();
          const current = snap.val() || {};
          const merged = deepMerge(current, cleanData);
          await firebaseDb.ref(path).set(merged);
        } catch(err) {
          await firebaseDb.ref(path).update(cleanData);
        }
      } else {
        await firebaseDb.ref(path).set(cleanData);
      }
    }
  };

  const dbUpdateDoc = async (docRef, data) => {
    const path = getRTDBPath(docRef.collectionName, docRef.id);
    const expandedData = expandDotNotation(data);
    
    const applyUpdates = (target, updates) => {
      Object.keys(updates).forEach(key => {
        let val = updates[key];
        if (val && val._type === "timestamp") {
          val = { seconds: Math.floor(Date.now() / 1000) };
        }
        
        if (val && val._type === "arrayUnion") {
          const arr = target[key] || [];
          const unionVal = Array.isArray(val.value) ? val.value : [val.value];
          unionVal.forEach(v => {
            if (!arr.includes(v)) arr.push(v);
          });
          target[key] = arr;
        } else if (val && typeof val === "object" && !Array.isArray(val) && val._type === undefined) {
          if (!target[key] || typeof target[key] !== "object") target[key] = {};
          applyUpdates(target[key], val);
        } else {
          target[key] = val;
        }
      });
    };

    if (isMock) {
      const current = getMockDBValue(path) || {};
      applyUpdates(current, expandedData);
      setMockDBValue(path, current);
    } else {
      try {
        const snap = await firebaseDb.ref(path).get();
        const current = snap.val() || {};
        applyUpdates(current, expandedData);
        await firebaseDb.ref(path).set(current);
      } catch (err) {
        console.error("Error doing real RTDB update doc:", err);
        // Fallback robusto a update directo
        await firebaseDb.ref(path).update(expandedData);
      }
    }
  };

  const dbDeleteDoc = async (docRef) => {
    const path = getRTDBPath(docRef.collectionName, docRef.id);
    
    if (isMock) {
      deleteMockDBValue(path);
      
      if (docRef.collectionName === "users") {
        const email = Object.keys(mockDB.auth_users || {}).find(
          key => mockDB.auth_users[key] && mockDB.auth_users[key].uid === docRef.id
        );
        if (email) {
          delete mockDB.auth_users[email];
        }
        saveLocalDB();
      }
    } else {
      await firebaseDb.ref(path).remove();
      
      if (docRef.collectionName === "users") {
        const authPath = "users_auth/" + docRef.id;
        await firebaseDb.ref(authPath).remove().catch(err => {
          console.error("Error deleting auth credentials for user:", docRef.id, err);
        });
      }
    }
  };

  const dbGetDocs = async (ref) => {
    const path = getRTDBPath(ref.collectionName, null, ref.constraints);
    let items = [];

    if (isMock) {
      const rawVal = getMockDBValue(path);
      if (rawVal && typeof rawVal === "object") {
        items = Object.keys(rawVal).map(id => ({ id, data: rawVal[id] }));
      }
    } else {
      const snap = await firebaseDb.ref(path).get();
      const rawVal = snap.val();
      if (rawVal && typeof rawVal === "object") {
        items = Object.keys(rawVal).map(id => ({ id, data: rawVal[id] }));
      }
    }

    // Filtrado de queries
    if (ref.constraints && ref.constraints.length > 0) {
      ref.constraints.forEach(c => {
        const val = item => item.data[c.field];
        if (c.op === "==") {
          items = items.filter(item => val(item) === c.value);
        } else if (c.op === "!=") {
          items = items.filter(item => val(item) !== c.value);
        } else if (c.op === "in") {
          items = items.filter(item => Array.isArray(c.value) ? c.value.includes(val(item)) : false);
        } else if (c.op === "array-contains") {
          items = items.filter(item => {
            const arr = val(item);
            return Array.isArray(arr) ? arr.includes(c.value) : false;
          });
        }
      });
    }

    // Ordenamiento
    if (ref.sortField) {
      const field = ref.sortField;
      const dir = ref.sortDirection === "desc" ? -1 : 1;
      items.sort((a, b) => {
        let valA = a.data[field];
        let valB = b.data[field];
        if (valA && valA.seconds !== undefined) valA = valA.seconds;
        if (valB && valB.seconds !== undefined) valB = valB.seconds;
        if (valA === undefined || valA === null) return 1 * dir;
        if (valB === undefined || valB === null) return -1 * dir;
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    }

    const docSnapshots = items.map(item => ({
      id: item.id,
      data: () => JSON.parse(JSON.stringify(item.data)),
      exists: () => true
    }));

    return {
      empty: items.length === 0,
      size: items.length,
      docs: docSnapshots,
      forEach: (callback) => {
        docSnapshots.forEach(snap => callback(snap));
      }
    };
  };

  const dbOnSnapshot = (ref, callback) => {
    if (isMock) {
      const listener = {
        callback: async () => {
          if (ref._type === "doc") {
            const snap = await dbGetDoc(ref);
            callback(snap);
          } else {
            const snap = await dbGetDocs(ref);
            callback(snap);
          }
        }
      };
      listener.callback();
      snapshotListeners.push(listener);
      return () => {
        const idx = snapshotListeners.indexOf(listener);
        if (idx !== -1) snapshotListeners.splice(idx, 1);
      };
    } else {
      const path = getRTDBPath(ref.collectionName, ref._type === "doc" ? ref.id : null, ref.constraints);
      const rtdbRef = firebaseDb.ref(path);
      
      const handler = async (snap) => {
        if (ref._type === "doc") {
          const val = snap.val();
          callback({
            exists: () => val !== null && val !== undefined,
            id: ref.id,
            data: () => val ? JSON.parse(JSON.stringify(val)) : null
          });
        } else {
          const snapDocs = await dbGetDocs(ref);
          callback(snapDocs);
        }
      };
      
      rtdbRef.on("value", handler);
      return () => rtdbRef.off("value", handler);
    }
  };

  // =========================================================================
  // ==================== SERVICIO DE AUTENTICACIÓN RTDB =====================
  // =========================================================================

  const mockAuthInstance = {
    currentUser: null
  };

  const savedUser = JSON.parse(localStorage.getItem("fonda_comunio_auth_user"));
  if (savedUser && savedUser.uid) {
    const existsInAuth = Object.values(mockDB.auth_users || {}).some(u => u.uid === savedUser.uid);
    if (existsInAuth) {
      mockAuthInstance.currentUser = savedUser;
    } else {
      localStorage.removeItem("fonda_comunio_auth_user");
    }
  }

  const mockCreateUser = async (auth, email, password) => {
    const cleanEmail = email.toLowerCase().trim();
    if (mockDB.auth_users[cleanEmail]) {
      throw { code: "auth/email-already-in-use", message: "User exists" };
    }
    const uid = "uid_" + Math.random().toString(36).substr(2, 9);
    mockDB.auth_users[cleanEmail] = { password, uid };
    saveLocalDB();
    
    const user = { uid, email };
    mockAuthInstance.currentUser = user;
    localStorage.setItem("fonda_comunio_auth_user", JSON.stringify(user));
    
    setTimeout(() => triggerSnapshotListeners(), 100);
    return { user };
  };

  const mockSignIn = async (auth, email, password) => {
    const cleanEmail = email.toLowerCase().trim();
    const record = mockDB.auth_users[cleanEmail];
    if (!record || record.password !== password) {
      throw { code: "auth/invalid-credential", message: "Invalid credentials" };
    }
    const user = { uid: record.uid, email };
    mockAuthInstance.currentUser = user;
    localStorage.setItem("fonda_comunio_auth_user", JSON.stringify(user));
    
    setTimeout(() => triggerSnapshotListeners(), 100);
    return { user };
  };

  const mockOnAuth = (auth, callback) => {
    callback(mockAuthInstance.currentUser);
    const listener = {
      callback: () => callback(mockAuthInstance.currentUser)
    };
    snapshotListeners.push(listener);
    return () => {
      const idx = snapshotListeners.indexOf(listener);
      if (idx !== -1) snapshotListeners.splice(idx, 1);
    };
  };

  const mockSignOut = async (auth) => {
    mockAuthInstance.currentUser = null;
    localStorage.removeItem("fonda_comunio_auth_user");
    triggerSnapshotListeners();
  };

  const authListeners = [];

  const realCreateUser = async (auth, email, password) => {
    if (!firebaseDb) {
      throw { code: "auth/network-error", message: "No database connection available" };
    }
    const cleanEmail = email.toLowerCase().trim();
    const username = cleanEmail.split('@')[0];
    const userRef = firebaseDb.ref("users_auth/" + username);
    
    const snap = await userRef.once("value");
    if (snap.exists()) {
      throw { code: "auth/email-already-in-use", message: "User already exists" };
    }
    
    const user = { uid: username, email: cleanEmail };
    await userRef.set({ password, uid: username, email: cleanEmail });
    
    firebaseAuth.currentUser = user;
    localStorage.setItem("comunio_auth_user_cloud", JSON.stringify(user));
    
    authListeners.forEach(cb => {
      try { cb(user); } catch(e) { console.error(e); }
    });
    
    setTimeout(() => triggerSnapshotListeners(), 100);
    return { user };
  };

  const realSignIn = async (auth, email, password) => {
    if (!firebaseDb) {
      throw { code: "auth/network-error", message: "No database connection available" };
    }
    const cleanEmail = email.toLowerCase().trim();
    const username = cleanEmail.split('@')[0];
    const userRef = firebaseDb.ref("users_auth/" + username);
    
    // CASO ESPECIAL: Auto-registro del Admin Maestro si es la primera vez que entra
    const snap = await userRef.once("value");
    if (username === "admin" && !snap.exists()) {
      const user = { uid: "admin", email: "admin@comuniomundial.com" };
      await userRef.set({ password: "catena13", uid: "admin", email: "admin@comuniomundial.com" });
      
      firebaseAuth.currentUser = user;
      localStorage.setItem("comunio_auth_user_cloud", JSON.stringify(user));
      
      authListeners.forEach(cb => {
        try { cb(user); } catch(e) { console.error(e); }
      });
      setTimeout(() => triggerSnapshotListeners(), 100);
      return { user };
    }
    
    if (!snap.exists()) {
      throw { code: "auth/user-not-found", message: "User not found" };
    }
    
    const record = snap.val();
    if (record.password !== password) {
      throw { code: "auth/wrong-password", message: "Incorrect password" };
    }
    
    const user = { uid: username, email: cleanEmail };
    firebaseAuth.currentUser = user;
    localStorage.setItem("comunio_auth_user_cloud", JSON.stringify(user));
    
    authListeners.forEach(cb => {
      try { cb(user); } catch(e) { console.error(e); }
    });
    
    setTimeout(() => triggerSnapshotListeners(), 100);
    return { user };
  };

  const realOnAuth = (auth, callback) => {
    authListeners.push(callback);
    callback(firebaseAuth.currentUser);
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx !== -1) authListeners.splice(idx, 1);
    };
  };

  const realSignOut = async (auth) => {
    firebaseAuth.currentUser = null;
    localStorage.removeItem("comunio_auth_user_cloud");
    authListeners.forEach(cb => {
      try { cb(null); } catch(e) { console.error(e); }
    });
    triggerSnapshotListeners();
  };

  // Fallback global de firebase si no está cargada la librería CDN (sin conexión)
  if (typeof firebase === "undefined") {
    window.firebase = {
      database: () => ({
        ref: () => ({
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
          remove: () => Promise.resolve(),
          get: () => Promise.resolve({ val: () => null, exists: () => false })
        })
      })
    };
  }

  // =========================================================================
  // ==================== EXPORTACIÓN AL ÁMBITO GLOBAL =======================
  // =========================================================================

  window.isMock = isMock;
  window.auth = isMock ? mockAuthInstance : firebaseAuth;
  window.db = {
    collection: (name) => collection(null, name),
    doc: (path) => doc(null, path)
  };

  window.createUserWithEmailAndPassword = isMock ? mockCreateUser : realCreateUser;
  window.signInWithEmailAndPassword = isMock ? mockSignIn : realSignIn;
  window.onAuthStateChanged = isMock ? mockOnAuth : realOnAuth;
  window.signOut = isMock ? mockSignOut : realSignOut;

  window.doc = doc;
  window.setDoc = dbSetDoc;
  window.getDoc = dbGetDoc;
  window.updateDoc = dbUpdateDoc;
  window.deleteDoc = dbDeleteDoc;
  window.onSnapshot = dbOnSnapshot;
  window.collection = collection;
  window.getDocs = dbGetDocs;

  window.query = (ref, ...constraints) => {
    let sortField = null;
    let sortDirection = "asc";
    const cleanConstraints = constraints.filter(c => {
      if (c && c._type === "orderBy") {
        sortField = c.field;
        sortDirection = c.direction;
        return false;
      }
      return c && c.field;
    });
    const newRef = new CustomCollectionRef(ref.collectionName, cleanConstraints);
    if (sortField) {
      newRef.sortField = sortField;
      newRef.sortDirection = sortDirection;
      newRef._type = "query";
    }
    return newRef;
  };

  window.where = (field, op, value) => ({ field, op, value });
  window.orderBy = (field, direction = "asc") => ({ _type: "orderBy", field, direction });
  window.limit = (num) => ({ _type: "limit", limit: num });
  window.arrayUnion = (...values) => {
    const val = (values.length === 1 && Array.isArray(values[0])) ? values[0] : values;
    return { _type: "arrayUnion", value: val };
  };
  window.serverTimestamp = () => ({ _type: "timestamp" });

  window.writeBatch = () => {
    const operations = [];
    return {
      set: (docRef, data) => { operations.push({ type: "set", ref: docRef, data }); },
      update: (docRef, data) => { operations.push({ type: "update", ref: docRef, data }); },
      delete: (docRef) => { operations.push({ type: "delete", ref: docRef }); },
      commit: async () => {
        for (const op of operations) {
          if (op.type === "set") await dbSetDoc(op.ref, op.data);
          else if (op.type === "update") await dbUpdateDoc(op.ref, op.data);
          else if (op.type === "delete") await dbDeleteDoc(op.ref);
        }
      }
    };
  };
})();
