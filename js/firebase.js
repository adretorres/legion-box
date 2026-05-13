// ─── js/firebase.js ───────────────────────────────────────────────────────────
import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDv21TtSaK8W5ewTgM9oVgCf7CMoRFSW_o",
  authDomain: "legion-box.firebaseapp.com",
  projectId: "legion-box",
  storageBucket: "legion-box.firebasestorage.app",
  messagingSenderId: "466827904574",
  appId: "1:466827904574:web:abb454a6f79f00517ff36f"
};

export const app       = initializeApp(firebaseConfig);
export const db        = getFirestore(app);
export let messaging = null;
try {
  messaging = getMessaging(app);
} catch(e) {
  console.log('Messaging no disponible en este navegador:', e.message);
}
export const VAPID_KEY = 'BEGpwN4-q-JlAufpo4ROWVPboSqdTMys39ikJHD-VOUPVx1eTN1bWuFLOq2-aGHyCW0Vlx5hPlJeyaOvkD1IPEM';

// ─── CRUD genérico ────────────────────────────────────────────────────────────
export async function fsGet(doc_id) {
  const snap = await getDoc(doc(db, 'legion', doc_id));
  return snap.exists() ? snap.data() : null;
}
export async function fsSet(doc_id, data) {
  await setDoc(doc(db, 'legion', doc_id), data);
}

// ─── Estado global compartido ─────────────────────────────────────────────────
export let cacheUsers    = null;
export let cachePrograms = null;
export let cacheResults  = null;
export let cacheInfo     = null;
export let cacheComp     = null;
export let currentUser   = null;

export let SCHEDULES = {
  crossfit:      ["09:00 hs","13:00 hs","14:00 hs","15:00 hs","16:00 hs","19:00 hs","20:00 hs","21:00 hs","22:00 hs"],
  funcional:     ["09:00 hs","13:00 hs","14:00 hs","15:00 hs","16:00 hs","19:00 hs","22:00 hs"],
  planificacion: ["Libre"],
  openbox:       ["15:30 - 18:00 hs"]
};

// ─── Setters ──────────────────────────────────────────────────────────────────
export function setCacheUsers(v)    { cacheUsers    = v; }
export function setCachePrograms(v) { cachePrograms = v; }
export function setCacheResults(v)  { cacheResults  = v; }
export function setCacheInfo(v)     { cacheInfo     = v; }
export function setCacheComp(v)     { cacheComp     = v; }
export function setCurrentUser(v)   { currentUser   = v; }
export function setSchedules(v)     { SCHEDULES     = { ...SCHEDULES, ...v }; }

// ─── Carga de datos ───────────────────────────────────────────────────────────
export async function cargarDatos() {
  const [users, programs, results, info] = await Promise.all([
    fsGet('users'), fsGet('programs'), fsGet('results'), fsGet('info')
  ]);
  cacheUsers    = users    || {};
  cachePrograms = programs || { lunes:{}, martes:{}, miercoles:{}, jueves:{}, viernes:{}, sabado:{} };
  cacheResults  = results  || {};
  cacheInfo     = info     || { news: "Bienvenidos al Centro de Entrenamiento.", prices: "Membresías y Planes actualizados..." };
  if (cacheInfo.schedules) SCHEDULES = { ...SCHEDULES, ...cacheInfo.schedules };
  if (!programs) await fsSet('programs', cachePrograms);
  if (!results)  await fsSet('results',  cacheResults);
  if (!info)     await fsSet('info',     cacheInfo);
}

export async function cargarCompetencia() {
  cacheComp = await fsGet('competencia') || null;
}

export function escucharResultados(callback) {
  return onSnapshot(doc(db, 'legion', 'results'), snap => {
    if (snap.exists()) {
      cacheResults = snap.data();
      callback(cacheResults);
    }
  });
}

export function escucharPrograms(callback) {
  return onSnapshot(doc(db, 'legion', 'programs'), snap => {
    if (snap.exists()) {
      cachePrograms = snap.data();
      callback(cachePrograms);
    }
  });
}

export { getToken, onMessage };