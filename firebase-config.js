// Firebase Configuración e Inicialización para "Firebase Comunio Mundial" (fir-comunio-mundial)
// Soportando Motor Dual: Firebase Real CDN vs Base de Datos Local de la Fonda (LocalStorage Fallback)

// --- CONFIGURACIÓN ---
const firebaseConfig = {
  apiKey: "AIzaSyAuavGdnkq9lhqu4CcMVrGbe_u4ZZ-XPbM",
  authDomain: "fir-comunio-mundial.firebaseapp.com",
  databaseURL: "https://fir-comunio-mundial-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fir-comunio-mundial",
  storageBucket: "fir-comunio-mundial.firebasestorage.app",
  messagingSenderId: "864387254690",
  appId: "1:864387254690:web:6553df4d895efb56c34afb",
  measurementId: "G-X6SD5Z7DF8"
};

// ¿Es una clave dummy? En ese caso, activar Motor Local de la Fonda automáticamente.
// O si no se ha podido cargar la librería global 'firebase' (por ejemplo, al abrir localmente sin conexión).
const isMock = firebaseConfig.apiKey.includes("DummyKey") || typeof firebase === "undefined";

// --- INICIALIZACIÓN CONDICIONAL DE LA NUBE ---
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

if (!isMock) {
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    console.log("🔥 Firebase Cloud Engine (Compat) inicializado correctamente.");
  } catch (err) {
    console.error("⚠️ Falló inicialización en la nube. Activando Motor Local.", err);
  }
}

const wrapRealSnapshot = (snap) => {
  if (!snap) return snap;
  if (typeof snap.exists === "boolean") {
    const isExisting = snap.exists;
    Object.defineProperty(snap, "exists", {
      value: () => isExisting,
      writable: true,
      configurable: true
    });
  }
  if (snap.docs && Array.isArray(snap.docs)) {
    snap.docs.forEach(docSnap => {
      if (docSnap && typeof docSnap.exists === "boolean") {
        const isExisting = docSnap.exists;
        Object.defineProperty(docSnap, "exists", {
          value: () => isExisting,
          writable: true,
          configurable: true
        });
      }
    });
  }
  return snap;
};

// Mapeo de funciones Cloud Compatibles
const realCreateUser = (auth, email, password) => auth.createUserWithEmailAndPassword(email, password);
const realSignIn = (auth, email, password) => auth.signInWithEmailAndPassword(email, password);
const realOnAuth = (auth, callback) => auth.onAuthStateChanged(callback);
const realSignOut = (auth) => auth.signOut();

const realDoc = (db, col, id) => db.doc(`${col}/${id}`);
const realCollection = (db, colName) => db.collection(colName);
const realGetDoc = async (docRef) => {
  const snap = await docRef.get();
  return wrapRealSnapshot(snap);
};
const realSetDoc = async (docRef, data) => docRef.set(data);
const realUpdateDoc = async (docRef, data) => docRef.update(data);
const realDeleteDoc = async (docRef) => docRef.delete();
const realOnSnapshot = (ref, callback) => {
  return ref.onSnapshot((snap) => {
    callback(wrapRealSnapshot(snap));
  });
};
const realGetDocs = async (ref) => {
  const snap = await ref.get();
  return wrapRealSnapshot(snap);
};
const realQuery = (collectionRef, ...constraints) => {
  let q = collectionRef;
  constraints.forEach(c => {
    if (c && c.field) {
      if (c.op === "in") q = q.where(c.field, "in", c.value);
      else if (c.op === "array-contains") q = q.where(c.field, "array-contains", c.value);
      else q = q.where(c.field, c.op, c.value);
    }
  });
  return q;
};
const realWhere = (field, op, value) => ({ field, op, value });
const realWriteBatch = () => firebase.firestore().batch();
const realArrayUnion = (value) => firebase.firestore.FieldValue.arrayUnion(value);


// =========================================================================
// ==================== MOTOR DE BASE DE DATOS LOCAL =======================
// =========================================================================

// Estructura de almacenamiento en localStorage
const LOCAL_DB_KEY = "fonda_comunio_local_db";
const mockDB = JSON.parse(localStorage.getItem(LOCAL_DB_KEY)) || {
  users: {},       // { uid: { profile } }
  user_teams: {},  // { uid: { team } }
  players: {},     // { playerId: { stats } }
  leagues: {},     // { leagueCode: { league } }
  auth_users: {}   // { email: { password, uid } }
};

function saveLocalDB() {
  localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(mockDB));
  triggerSnapshotListeners();
}

// Oyentes de snapshots locales
const snapshotListeners = [];
function triggerSnapshotListeners() {
  snapshotListeners.forEach(listener => {
    try {
      listener.callback();
    } catch(e) {
      console.error("Error in snapshot listener:", e);
    }
  });
}

// Mock de Auth
const mockAuthInstance = {
  currentUser: JSON.parse(localStorage.getItem("fonda_comunio_auth_user")) || null
};

// --- IMPLEMENTACIÓN DE MOCK ---

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

// Mock Firestore references
const mockDoc = (db, collectionName, id) => {
  return { _type: "doc", collectionName, id };
};

const mockCollection = (db, collectionName) => {
  return { _type: "collection", collectionName };
};

const mockGetDoc = async (docRef) => {
  const { collectionName, id } = docRef;
  const data = mockDB[collectionName] ? mockDB[collectionName][id] : null;
  return {
    exists: () => !!data,
    data: () => data ? JSON.parse(JSON.stringify(data)) : null
  };
};

const mockSetDoc = async (docRef, data) => {
  const { collectionName, id } = docRef;
  if (!mockDB[collectionName]) mockDB[collectionName] = {};
  mockDB[collectionName][id] = JSON.parse(JSON.stringify(data));
  saveLocalDB();
};

const mockUpdateDoc = async (docRef, data) => {
  const { collectionName, id } = docRef;
  if (!mockDB[collectionName]) mockDB[collectionName] = {};
  if (!mockDB[collectionName][id]) mockDB[collectionName][id] = {};
  
  const current = mockDB[collectionName][id];
  Object.keys(data).forEach(key => {
    let val = data[key];
    if (val && val._type === "timestamp") {
      val = { seconds: Math.floor(Date.now() / 1000) };
    }
    if (val && val._type === "arrayUnion") {
      const arr = current[key] || [];
      if (!arr.includes(val.value)) {
        arr.push(val.value);
      }
      current[key] = arr;
    } else {
      current[key] = val;
    }
  });
  saveLocalDB();
};

const mockDeleteDoc = async (docRef) => {
  const { collectionName, id } = docRef;
  if (mockDB[collectionName] && mockDB[collectionName][id]) {
    delete mockDB[collectionName][id];
    saveLocalDB();
  }
};

const mockOnSnapshot = (ref, callback) => {
  const listener = {
    callback: async () => {
      if (ref._type === "doc") {
        const snap = await mockGetDoc(ref);
        callback(snap);
      } else if (ref._type === "collection" || ref._type === "query") {
        const snap = await mockGetDocs(ref);
        callback(snap);
      }
    }
  };
  
  // Ejecutar inmediatamente
  listener.callback();
  
  snapshotListeners.push(listener);
  return () => {
    const idx = snapshotListeners.indexOf(listener);
    if (idx !== -1) snapshotListeners.splice(idx, 1);
  };
};

const mockGetDocs = async (ref) => {
  let items = [];
  const collName = ref.collectionName || (ref.ref && ref.ref.collectionName);
  
  if (mockDB[collName]) {
    items = Object.keys(mockDB[collName]).map(id => ({
      id,
      data: mockDB[collName][id]
    }));
  }

  // Si hay filtros
  if ((ref._type === "query" || ref._type === "collection") && ref.constraints) {
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
      } else if (c.op === "<") {
        items = items.filter(item => val(item) < c.value);
      } else if (c.op === "<=") {
        items = items.filter(item => val(item) <= c.value);
      } else if (c.op === ">") {
        items = items.filter(item => val(item) > c.value);
      } else if (c.op === ">=") {
        items = items.filter(item => val(item) >= c.value);
      }
    });
  }

  // Si hay ordenamiento
  if (ref.sortField) {
    const field = ref.sortField;
    const dir = ref.sortDirection === "desc" ? -1 : 1;
    items.sort((a, b) => {
      let valA = a.data[field];
      let valB = b.data[field];
      
      // Si son timestamps u objetos con seconds
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
    data: () => JSON.parse(JSON.stringify(item.data))
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

const mockQuery = (collectionRef, ...constraints) => {
  return {
    _type: "query",
    ref: collectionRef,
    constraints: constraints.filter(c => c && c.field)
  };
};

const mockWhere = (field, op, value) => {
  return { field, op, value };
};

const mockWriteBatch = () => {
  const operations = [];
  return {
    set: (docRef, data) => {
      operations.push({ type: "set", ref: docRef, data });
    },
    commit: async () => {
      for (const op of operations) {
        const { collectionName, id } = op.ref;
        if (!mockDB[collectionName]) mockDB[collectionName] = {};
        
        const cleanedData = { ...op.data };
        Object.keys(cleanedData).forEach(key => {
          if (cleanedData[key] && cleanedData[key]._type === "timestamp") {
            cleanedData[key] = { seconds: Math.floor(Date.now() / 1000) };
          }
        });
        
        mockDB[collectionName][id] = JSON.parse(JSON.stringify(cleanedData));
      }
      saveLocalDB();
    }
  };
};

const mockArrayUnion = (value) => {
  return { _type: "arrayUnion", value };
};

// =========================================================================
// ==================== CONECTOR CHAINABLE (API COMPAT) ====================
// =========================================================================

const makeMockCollectionRef = (collName, constraints = []) => {
  const ref = {
    _type: "collection",
    collectionName: collName,
    constraints: constraints,
    
    doc(id) {
      return mockDoc({}, collName, id);
    },
    
    where(field, op, value) {
      return makeMockCollectionRef(collName, [...constraints, { field, op, value }]);
    },
    
    orderBy(field, direction = "asc") {
      const newRef = makeMockCollectionRef(collName, constraints);
      newRef.sortField = field;
      newRef.sortDirection = direction;
      newRef._type = "query";
      return newRef;
    },
    
    async add(data) {
      const id = "msg_" + Math.random().toString(36).substring(2, 11);
      const docRef = mockDoc({}, collName, id);
      await mockSetDoc(docRef, data);
      return { id, parent: ref };
    },
    
    onSnapshot(callback) {
      return mockOnSnapshot(this, callback);
    },
    
    async get() {
      return await mockGetDocs(this);
    }
  };
  return ref;
};

const makeMockDocRef = (path) => {
  const parts = path.split("/");
  return mockDoc({}, parts[0], parts[1]);
};

// Fallback global de firebase si no está cargada la librería CDN (sin conexión)
if (typeof firebase === "undefined") {
  window.firebase = {
    firestore: {
      FieldValue: {
        serverTimestamp: () => ({ _type: "timestamp", seconds: Math.floor(Date.now() / 1000) }),
        arrayUnion: (value) => ({ _type: "arrayUnion", value })
      }
    }
  };
}

// =========================================================================
// ==================== EXPORTACIÓN AL ÁMBITO GLOBAL =======================
// =========================================================================

window.isMock = isMock;
window.auth = isMock ? mockAuthInstance : firebaseAuth;
window.db = isMock ? {
  collection: (name) => makeMockCollectionRef(name),
  doc: (path) => makeMockDocRef(path)
} : firebaseDb;

window.createUserWithEmailAndPassword = isMock ? mockCreateUser : realCreateUser;
window.signInWithEmailAndPassword = isMock ? mockSignIn : realSignIn;
window.onAuthStateChanged = isMock ? mockOnAuth : realOnAuth;
window.signOut = isMock ? mockSignOut : realSignOut;

window.doc = isMock ? mockDoc : realDoc;
window.setDoc = isMock ? mockSetDoc : realSetDoc;
window.getDoc = isMock ? mockGetDoc : realGetDoc;
window.updateDoc = isMock ? mockUpdateDoc : realUpdateDoc;
window.deleteDoc = isMock ? mockDeleteDoc : realDeleteDoc;
window.onSnapshot = isMock ? mockOnSnapshot : realOnSnapshot;
window.collection = isMock ? mockCollection : realCollection;
window.getDocs = isMock ? mockGetDocs : realGetDocs;
window.query = isMock ? mockQuery : realQuery;
window.where = isMock ? mockWhere : realWhere;
window.writeBatch = isMock ? mockWriteBatch : realWriteBatch;
window.arrayUnion = isMock ? mockArrayUnion : realArrayUnion;
