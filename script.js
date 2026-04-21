// ─── FIREBASE ────────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDv21TtSaK8W5ewTgM9oVgCf7CMoRFSW_o",
  authDomain: "legion-box.firebaseapp.com",
  projectId: "legion-box",
  storageBucket: "legion-box.firebasestorage.app",
  messagingSenderId: "466827904574",
  appId: "1:466827904574:web:abb454a6f79f00517ff36f"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

async function fsGet(doc_id) {
  const snap = await getDoc(doc(db, 'legion', doc_id));
  return snap.exists() ? snap.data() : null;
}
async function fsSet(doc_id, data) {
  await setDoc(doc(db, 'legion', doc_id), data);
}

// Cache en memoria
let cacheUsers    = null;
let cachePrograms = null;
let cacheResults  = null;
let cacheInfo     = null;

async function cargarDatos() {
  const [users, programs, results, info] = await Promise.all([
    fsGet('users'), fsGet('programs'), fsGet('results'), fsGet('info')
  ]);
  cacheUsers    = users    || {};
  cachePrograms = programs || { lunes:{}, martes:{}, miercoles:{}, jueves:{}, viernes:{}, sabado:{} };
  cacheResults  = results  || {};
  cacheInfo     = info     || { news: "Bienvenidos Atletas al Centro de Entrenamiento.", prices: "Membresías y Planes actualizados..." };
  if(!programs) await fsSet('programs', cachePrograms);
  if(!results)  await fsSet('results',  cacheResults);
  if(!info)     await fsSet('info',     cacheInfo);
}

const SCHEDULES = {
  crossfit: [
    "9:00 hs",
    "13:00 hs",
    "14:00 hs",
    "15:00 hs",
    "16:00 hs",
    "19:00 hs",
    "20:00 hs",
    "21:00 hs",
    "22:00 hs",
  ],
  funcional: [
    "9:00 hs",
    "13:00 hs",
    "15:00 hs",
    "16:00 hs",
    "19:00 hs",
    "22:00 hs",
  ],
  planificacion: ["Libre"],
};

let selectedViewDay = "lunes";
let currentUser = null;
let currentViewPlan = "crossfit";
let currentSocioStatusFilter = "all";
let editingUserId = null;
let currentRankingMode = "day";

document.addEventListener("DOMContentLoaded", () => {
  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];
  const hoyIdx = new Date().getDay();
  selectedViewDay = hoyIdx === 0 ? "lunes" : dias[hoyIdx];

  if (!localStorage.getItem("legion_init_done")) {
    // primera carga — cargarDatos() se llama en doLogin()
  }

  // Poblar select de ranking día
  const rSelect = document.getElementById("rank-day-select");
  ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"].forEach(
    (d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d.charAt(0).toUpperCase() + d.slice(1);
      rSelect.appendChild(opt);
    },
  );
  rSelect.value = selectedViewDay;

  const payDateInput = document.getElementById("pay-date");
  if (payDateInput) payDateInput.valueAsDate = new Date();
  cargarCompetencia().then(() => actualizarBotonLeaderboard());

  // Reset automático del ranking los domingos a las 23:59
  async function checkAutoReset() {
    const ahora = new Date();
    if(ahora.getDay() === 0) { // domingo
      const clave = `legion_reset_${ahora.getFullYear()}_${ahora.getMonth()}_${ahora.getDate()}`;
      if(!localStorage.getItem(clave)) {
        const horas = ahora.getHours();
        const mins  = ahora.getMinutes();
        if(horas === 23 && mins === 59) {
          cacheResults = {};
          await fsSet('results', {});
          localStorage.setItem(clave, '1');
          renderRanking();
          console.log('Ranking reseteado automáticamente.');
        }
      }
    }
  }
  setInterval(checkAutoReset, 30000); // chequea cada 30 segundos

  // Restaurar sesión si existe
 const sesionGuardada = localStorage.getItem('legion_session');
  if(sesionGuardada) {
    const s = JSON.parse(sesionGuardada);
    currentUser = s;
    if(s.role === 'espectador') {
      cargarCompetencia().then(() => {
        if(cacheComp && cacheComp.activa) {
          document.getElementById('screen-login').classList.add('hidden');
          document.getElementById('screen-app').classList.remove('hidden');
          document.getElementById('tab-link-comp-public').classList.remove('hidden');
          document.getElementById('nav-username').textContent = cacheComp.nombre;
          renderCompAdmin();
          switchTab('comp-public', document.getElementById('tab-link-comp-public'));
        } else {
          localStorage.removeItem('legion_session');
        }
      });
    } else {
      cargarDatos().then(() => {
        if(s.role === 'coach') showApp(true);
        else showApp(false, cacheUsers[s.id] || s);
      });
    }
  }
});

// --- SISTEMA DE LOGIN ---
async function doLogin() {
  const role = document.getElementById("login-role").value;
  const userIn = document
    .getElementById("login-user")
    .value.toLowerCase()
    .trim();
  const passIn = document.getElementById("login-pass").value;

  document.getElementById("login-error").textContent = "Verificando...";
  await cargarCompetencia();
  await cargarDatos();

  if (role === "admin" && userIn === "coach" && passIn === "coach123") {
    currentUser = { id: "coach", role: "coach", name: "Coach" };
    showApp(true);
    return;
  }

  const u = cacheUsers[userIn];
  if (u && u.pass === passIn) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    if (fv && fv < hoy) {
      document.getElementById("login-error").innerHTML =
        "CUOTA VENCIDA.<br>Comunicate con el Coach.";
      return;
    }
    currentUser = { id: userIn, ...u, role: "atleta" };
    showApp(false, u);
  } else {
    document.getElementById("login-error").textContent =
      "Credenciales incorrectas.";
  }
}

async function showApp(isCoach, userData = null) {
  document.getElementById("screen-login").classList.add("hidden");
  document.getElementById("screen-app").classList.remove("hidden");
  localStorage.setItem('legion_session', JSON.stringify(currentUser));
  const info = cacheInfo;
  document.getElementById("news-text").textContent = info.news;

  const navUser = document.getElementById("nav-username");
  if (isCoach) navUser.textContent = "Hola, Coach";
  else
    navUser.textContent =
      "Hola, " + (userData.name ? userData.name.split(" ")[0] : "Atleta");

  renderBirthdays();

  if (isCoach) {
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("tab-link-users").classList.remove("hidden");
    document.getElementById("admin-prices-editor").classList.remove("hidden");
    document.getElementById("tab-link-calc").classList.add("hidden");
    document.getElementById("tab-link-profile").classList.add("hidden");
    document.getElementById("score-upload-container").classList.add("hidden");
    renderUserList();
    syncAdminView();
   document.getElementById('tab-link-comp').classList.remove('hidden');
    await cargarCompetencia();
    if (cacheComp && cacheComp.activa) {
      mostrarFormComp();
      renderCompAdmin();
    }
  } else {
    currentViewPlan =
      userData.plans && userData.plans.length > 0
        ? userData.plans[0]
        : "crossfit";
    document
      .getElementById("score-upload-container")
      .classList.remove("hidden");
    setupPlanSwitcher(userData.plans);
    const btnH = document.getElementById("btn-" + selectedViewDay);
    if (btnH) changeViewDay(selectedViewDay, btnH);
  }
}

// --- GESTIÓN DE ATLETAS ---
function setSocioFilter(f, btn) {
  currentSocioStatusFilter = f;
  document
    .querySelectorAll(".filter-bar .day-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderUserList();
}

function renderUserList() {
  const users = cacheUsers || {};
  const cont = document.getElementById("user-list-container");
  const search = document.getElementById("user-search").value.toLowerCase();
  const disc = document.getElementById("filter-discipline").value;
  cont.innerHTML = "";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  for (let id in users) {
    const u = users[id];
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    const isVencido = fv && fv < hoy;
    let isInactive = false;
    if (fv) {
      const diff = (hoy - fv) / (1000 * 60 * 60 * 24);
      if (diff >= 60) isInactive = true;
    }

    if (currentSocioStatusFilter === "inactive") {
      if (!isInactive) continue;
    } else {
      if (isInactive) continue;
      if (currentSocioStatusFilter === "active" && isVencido) continue;
      if (currentSocioStatusFilter === "expired" && !isVencido) continue;
    }

    if (disc !== "all" && (!u.plans || !u.plans.includes(disc))) continue;
    if (
      search &&
      !u.name.toLowerCase().includes(search) &&
      !id.includes(search)
    )
      continue;

    const label = isInactive ? "INACTIVO" : isVencido ? "VENCIDA" : "AL DÍA";
    const color = isInactive ? "#555" : isVencido ? "#e74c3c" : "#2ecc71";

    cont.innerHTML += `
      <div class="user-item">
        <div>
          <b>${u.name}</b> <small style="color:var(--text-tertiary); margin-left:4px;">${u.schedule || "S/H"}</small>
          <br><small>DNI: ${id} &nbsp;·&nbsp; ${u.plans?.join(", ")}</small>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="status-pill" style="background:${color}20; color:${color}; border:1px solid ${color}40;">${label}</span>
          <button onclick="editUser('${id}')" style="background:none; border:1px solid var(--border-strong); color:var(--text-secondary); padding:5px 10px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.75rem; letter-spacing:0.5px;">Editar</button>
        </div>
      </div>`;
  }
}

async function saveUser() {
  const id = document.getElementById('user-id').value.toLowerCase().trim();
  const name = document.getElementById('user-name').value;
  if(!id || !name) return alert("DNI y Nombre son obligatorios");

  const p = Array.from(document.querySelectorAll('.plan-check:checked')).map(c => c.value);

  if(cacheUsers[id] && editingUserId !== id) {
    const confirmar = confirm(`El DNI ${id} ya está registrado como "${cacheUsers[id].name}".\n\n¿Querés actualizar sus datos? Si cancelás no se realizará ningún cambio.`);
    if(!confirmar) return;
  }

  cacheUsers[id] = {
    ...cacheUsers[id], name, plans: p,
    pass: document.getElementById('user-pass-admin').value || cacheUsers[id]?.pass || '1234',
    expiry: document.getElementById('user-expiry').value,
    email: document.getElementById('user-email').value,
    phone: document.getElementById('user-phone').value,
    address: document.getElementById('user-address').value,
    emergency: document.getElementById('user-emergency').value,
    birth: document.getElementById('user-birth').value,
    schedule: document.getElementById('user-schedule').value
  };

  await fsSet('users', cacheUsers);
  editingUserId = null;
  alert("Atleta guardado.");
  renderUserList();
  renderBirthdays();
}

function editUser(id) {
  editingUserId = id;
  const u = cacheUsers[id];
  document.getElementById("user-id").value = id;
  document.getElementById("user-name").value = u.name;
  document.getElementById("user-pass-admin").value = u.pass;
  document.getElementById("user-expiry").value = u.expiry || "";
  document.getElementById("user-email").value = u.email || "";
  document.getElementById("user-phone").value = u.phone || "";
  document.getElementById("user-address").value = u.address || "";
  document.getElementById("user-emergency").value = u.emergency || "";
  document.getElementById("user-birth").value = u.birth || "";
  document.querySelectorAll(".plan-check").forEach((c) => {
    c.checked = !!(u.plans && u.plans.includes(c.value));
  });
  refreshScheduleUI();
  setTimeout(() => {
    document.getElementById("user-schedule").value = u.schedule || "";
  }, 0);

  document.getElementById("admin-user-history").classList.remove("hidden");
  document.getElementById("history-user-name").textContent = u.name;

  document.getElementById("pay-amount").value = "";
  document.getElementById("pay-obs").value = "";
  document.getElementById("pay-date").valueAsDate = new Date();

  renderPaymentHistory(u.payments || [], "payment-history-list", true);
  document.querySelector('#tab-users .admin-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- PAGOS ---
async function addPaymentRecord() {
  const amount = document.getElementById("pay-amount").value;
  const obs = document.getElementById("pay-obs").value;
  const date = document.getElementById("pay-date").value;
  const method = document.getElementById("pay-method").value;

  if (!amount || !editingUserId || !date)
    return alert("Ingrese monto y fecha.");

  if (!cacheUsers[editingUserId].payments) cacheUsers[editingUserId].payments = [];

  const dateParts = date.split("-");
  const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

  cacheUsers[editingUserId].payments.push({
    id: Date.now(),
    date: formattedDate,
    amount,
    method,
    obs: obs || "S/O",
  });

  await fsSet('users', cacheUsers);
  document.getElementById("pay-amount").value = "";
  document.getElementById("pay-obs").value = "";

  renderPaymentHistory(cacheUsers[editingUserId].payments, "payment-history-list", true);
  alert("Pago registrado.");
}

function renderPaymentHistory(payments, containerId, canDelete = false) {
  const cont = document.getElementById(containerId);
  if (!cont) return;
  cont.innerHTML =
    payments && payments.length > 0
      ? ""
      : '<small style="color:var(--muted)">Sin pagos registrados.</small>';

  if (payments) {
    payments
      .slice()
      .reverse()
      .forEach((p) => {
        cont.innerHTML += `
        <div class="payment-row">
          <div>
            <span style="color:var(--accent); font-weight:600; font-size:0.82rem;">${p.date}</span>
            &nbsp;·&nbsp;
            <b style="color:#2ecc71;">$${p.amount}</b>
            <br><small style="color:var(--text-tertiary);">${p.method} · ${p.obs}</small>
          </div>
          ${canDelete ? `<button onclick="deletePayment(${p.id})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem; padding:4px 8px;">✕</button>` : ""}
        </div>`;
      });
  }
}

async function deletePayment(payId) {
  if (!confirm("¿Eliminar este pago?")) return;
  cacheUsers[editingUserId].payments = cacheUsers[editingUserId].payments.filter(
    (p) => p.id !== payId,
  );
  await fsSet('users', cacheUsers);
  renderPaymentHistory(cacheUsers[editingUserId].payments, "payment-history-list", true);
}

// --- RANKING ---
function setRankingMode(mode) {
  currentRankingMode = mode;
  document
    .getElementById("rank-mode-day")
    .classList.toggle("active", mode === "day");
  document
    .getElementById("rank-mode-week")
    .classList.toggle("active", mode === "week");
  document.getElementById("rank-filters-row").style.display =
    mode === "day" ? "grid" : "none";
  renderRanking();
}

async function saveWodScore() {
  const score = document.getElementById("input-score").value.trim();
  if (!score) return alert("Ingresa un resultado.");

  if (!cacheResults[selectedViewDay]) cacheResults[selectedViewDay] = {};
  if (!cacheResults[selectedViewDay][currentViewPlan]) cacheResults[selectedViewDay][currentViewPlan] = {};

  cacheResults[selectedViewDay][currentViewPlan][currentUser.id] = {
    name: currentUser.name,
    score: score,
    timestamp: Date.now(),
  };

  await fsSet('results', cacheResults);
  document.getElementById("input-score").value = "";
  alert("¡Resultado subido con éxito!");
}

function renderRanking() {
  const cont = document.getElementById("ranking-list-container");
  const results = cacheResults || {};
  cont.innerHTML = "";

  if (currentRankingMode === "day") {
    const day = document.getElementById("rank-day-select").value;
    const plan = document.getElementById("rank-plan-select").value;
    const list = results[day]?.[plan] || {};
    const entries = Object.values(list);

    if (entries.length === 0) {
      cont.innerHTML =
        '<p style="text-align:center; color:var(--muted); padding:20px;">No hay resultados cargados para este día.</p>';
      return;
    }

    const week = cachePrograms;
    const resultType = week[day]?.[plan]?.resultType || 'time';

    entries.sort((a, b) => {
      if(resultType === 'time') {
        // Convertir mm:ss o ss a segundos para comparar
        const toSec = str => {
          const parts = str.trim().replace(',','.').split(':');
          if(parts.length === 2) return parseInt(parts[0])*60 + parseFloat(parts[1]);
          return parseFloat(parts[0]);
        };
        return toSec(a.score) - toSec(b.score); // menor es mejor
      } else {
        // Reps o peso: extraer primer número del string
        const toNum = str => parseFloat(str.replace(',','.')) || 0;
        return toNum(b.score) - toNum(a.score); // mayor es mejor
      }
    });

    entries.forEach((r, idx) => {
      cont.innerHTML += `
        <div class="ranking-row">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="rank-num">#${idx + 1}</span>
            <span style="font-size:0.9rem;">${r.name}</span>
          </div>
          <span class="rank-score">${r.score}</span>
        </div>`;
    });
  } else {
    const week = cachePrograms;
    let athletes = {}; // { uid: { name, points, wods } }

    // Por cada día y disciplina con resultados, ordenar y asignar posiciones
    for(let d in results) {
      for(let p in results[d]) {
        const entriesDay = Object.entries(results[d][p]);
        if(!entriesDay.length) continue;

        const resultType = week[d]?.[p]?.resultType || 'time';

        // Mismo ordenamiento que el ranking diario
        entriesDay.sort(([, a], [, b]) => {
          if(resultType === 'time') {
            const toSec = str => {
              const parts = str.trim().replace(',','.').split(':');
              return parts.length === 2 ? parseInt(parts[0])*60 + parseFloat(parts[1]) : parseFloat(parts[0]);
            };
            return toSec(a.score) - toSec(b.score);
          } else {
            const toNum = str => parseFloat(str.replace(',','.')) || 0;
            return toNum(b.score) - toNum(a.score);
          }
        });

        // Asignar puntos según posición (1° = 1 punto, 2° = 2 puntos, etc.)
        entriesDay.forEach(([uid, entry], idx) => {
          if(!athletes[uid]) athletes[uid] = { name: entry.name, points: 0, wods: 0 };
          athletes[uid].points += (idx + 1);
          athletes[uid].wods++;
        });
      }
    }

    const sorted = Object.values(athletes).sort((a, b) => a.points - b.points);

    if(!sorted.length) {
      cont.innerHTML = '<p style="text-align:center; color:var(--text-tertiary); padding:20px;">Sin actividad semanal registrada.</p>';
      return;
    }

    sorted.forEach((r, idx) => {
      cont.innerHTML += `
        <div class="ranking-row">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="rank-num">#${idx+1}</span>
            <span style="font-size:0.9rem;">${r.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; color:var(--text-tertiary);">${r.wods} WOD${r.wods !== 1 ? 's' : ''}</span>
            <span class="rank-score">${r.points} pts</span>
          </div>
        </div>`;
    });
  }
}

// --- CUMPLEAÑOS ---
function renderBirthdays() {
  const users = cacheUsers || {};
  const cont = document.getElementById("info-birthday-list");
  if (!cont) return;
  const mesHoy = new Date().getMonth();
  cont.innerHTML = "";
  let hay = false;
  for (let id in users) {
    const u = users[id];
    if (u.birth) {
      const fb = new Date(u.birth + "T00:00:00");
      if (fb.getMonth() === mesHoy) {
        hay = true;
        cont.innerHTML += `<span class="birthday-chip"> ${u.name.split(" ")[0]} (${fb.getDate()})</span>`;
      }
    }
  }
  if (!hay)
    cont.innerHTML =
      "<small style='color:var(--muted)'>No hay cumpleaños este mes.</small>";
}

// --- PROGRAMACIÓN ---
async function saveNews() {
  const text = document.getElementById("edit-news").value;
  cacheInfo.news = text;
  await fsSet('info', cacheInfo);
  document.getElementById("news-text").textContent = text;
  alert("Comunicado actualizado.");
}

function syncAdminView() {
  const d = document.getElementById("edit-day-select").value;
  const p = document.getElementById("edit-plan-select").value;
  selectedViewDay = d;
  currentViewPlan = p;
  const week = cachePrograms;
  const c = week[d]?.[p] || {};
  document.getElementById('edit-title').value = c.title || '';
  document.getElementById('edit-result-type').value = c.resultType || 'time';
  document.getElementById("edit-warmup").value = c.warmup || "";
  document.getElementById("edit-strength").value = c.strength || "";
  document.getElementById("edit-wod").value = c.wod || "";
  renderClass();
}

async function saveClass() {
  const d = document.getElementById("edit-day-select").value;
  const p = document.getElementById("edit-plan-select").value;
  if(!cachePrograms[d]) cachePrograms[d] = {};
  cachePrograms[d][p] = {
    title: document.getElementById('edit-title').value,
    resultType: document.getElementById('edit-result-type').value,
    warmup: document.getElementById('edit-warmup').value,
    strength: document.getElementById('edit-strength').value,
    wod: document.getElementById('edit-wod').value
  };
  await fsSet('programs', cachePrograms);
  alert("Clase publicada.");
  syncAdminView();
}

function renderClass() {
  const week = cachePrograms;
  const c = week[selectedViewDay]?.[currentViewPlan] || {};
  document.getElementById("display-day-name").textContent =
    selectedViewDay.toUpperCase();
  document.getElementById("display-plan-name").textContent =
    currentViewPlan.toUpperCase();
  document.getElementById("class-title-display").textContent =
    c.title || "";
  const cont = document.getElementById("class-blocks-display");
  cont.innerHTML = "";
  const nl = t => t.replace(/\n/g, '<br>');
  if(c.warmup)   cont.innerHTML += `<div class="class-block"><strong>Calentamiento</strong>${nl(c.warmup)}</div>`;
  if(c.strength) cont.innerHTML += `<div class="class-block"><strong>Fuerza / Técnica</strong>${nl(c.strength)}</div>`;
  if(c.wod)      cont.innerHTML += `<div class="class-block"><strong>WOD</strong>${nl(c.wod)}</div>`;

  // Actualizar placeholder del input según tipo de resultado
  const placeholders = { time: 'Ej: 12:40', reps: 'Ej: 45 reps', weight: 'Ej: 85 kg' };
  const scoreInput = document.getElementById('input-score');
  if(scoreInput) scoreInput.placeholder = placeholders[c.resultType || 'time'];
}

// --- RM Y PERFIL ---
function loadRMValue() {
  const ex = document.getElementById("rm-exercise").value;
  document.getElementById("input-rm").value =
    cacheUsers[currentUser.id]?.rms?.[ex] || "";
  calculate();
}

async function saveRM() {
  const ex = document.getElementById("rm-exercise").value;
  if (!ex) return alert("Selecciona ejercicio");
  if (!cacheUsers[currentUser.id].rms) cacheUsers[currentUser.id].rms = {};
  cacheUsers[currentUser.id].rms[ex] = document.getElementById("input-rm").value;
  await fsSet('users', cacheUsers);
  alert("PR guardado.");
}

function calculate() {
  const rm = parseFloat(document.getElementById("input-rm").value);
  const res = document.getElementById("calc-results");
  if (!rm) {
    res.innerHTML = "";
    return;
  }
  const percent = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 40];
  res.innerHTML = percent
    .map(
      (p) => `
    <div class="rm-cell">
      <small>${p}%</small>
      <b>${((rm * p) / 100).toFixed(1)}</b>
      <span>kg</span>
    </div>`,
    )
    .join("");
}

function loadProfileData() {
  const u = cacheUsers[currentUser.id];
  document.getElementById("prof-id").value = currentUser.id;
  document.getElementById("prof-name").value = u.name;
  document.getElementById("prof-email").value = u.email || "";
  document.getElementById("prof-address").value = u.address || "";
  document.getElementById("prof-phone").value = u.phone || "";
  document.getElementById("prof-emergency").value = u.emergency || "";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
  const isV = fv && fv < hoy;
  document.getElementById("prof-status-info").innerHTML = `
    <p><b>Estado Cuota</b> &nbsp;<span style="color:${isV ? "var(--danger)" : "#2ecc71"}; font-weight:600;">${isV ? "VENCIDA" : "AL DÍA"}</span></p>
    <p><b>Vencimiento</b> &nbsp;${u.expiry || "No registrado"}</p>
    <p><b>Planes</b> &nbsp;${u.plans?.join(", ").toUpperCase()}</p>
    <p><b>Horario</b> &nbsp;${u.schedule || "S/H"}</p>`;

  renderPaymentHistory(u.payments || [], "profile-payment-list", false);
}

async function updateOwnProfile() {
  const u = cacheUsers[currentUser.id];
  u.name = document.getElementById("prof-name").value;
  u.email = document.getElementById("prof-email").value;
  u.address = document.getElementById("prof-address").value;
  u.phone = document.getElementById("prof-phone").value;
  u.emergency = document.getElementById("prof-emergency").value;
  if (document.getElementById("prof-pass").value)
    u.pass = document.getElementById("prof-pass").value;
  await fsSet('users', cacheUsers);
  alert("Perfil guardado.");
}

// --- UTILIDADES ---
function switchTab(id, btn) {
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("tab-" + id).classList.add("active");
  btn.classList.add("active");
  if (id === "profile") loadProfileData();
  if (id === "ranking") renderRanking();
  if (id === "info") {
    loadBoxInfo();
    renderBirthdays();
  }
}

function changeViewDay(d, btn) {
  selectedViewDay = d;
  document
    .querySelectorAll(".day-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderClass();
}

function setupPlanSwitcher(plans) {
  const container = document.getElementById("user-plan-switcher");
  if (!plans || plans.length <= 1) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = "";
  plans.forEach((p) => {
    const b = document.createElement("button");
    b.className = "day-btn " + (currentViewPlan === p ? "active" : "");
    b.textContent = p.toUpperCase();
    b.onclick = () => {
      currentViewPlan = p;
      document
        .querySelectorAll("#user-plan-switcher .day-btn")
        .forEach((btn) => btn.classList.remove("active"));
      b.classList.add("active");
      renderClass();
    };
    container.appendChild(b);
  });
}

function refreshScheduleUI() {
  const selectedPlans = Array.from(
    document.querySelectorAll(".plan-check:checked"),
  ).map((c) => c.value);
  const select = document.getElementById("user-schedule");
  const oldVal = select.value;
  select.innerHTML = '<option value="">-- Seleccionar Horario --</option>';
  let combined = [];
  selectedPlans.forEach((p) => {
    if (SCHEDULES[p]) combined = [...combined, ...SCHEDULES[p]];
  });
  [...new Set(combined)].forEach((h) => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = h;
    select.appendChild(opt);
  });
  select.value = oldVal;
}

function loadBoxInfo() {
  document.getElementById("display-prices").textContent = cacheInfo.prices || '';
  if (currentUser.role === "coach")
    document.getElementById("edit-prices").value = cacheInfo.prices || '';
}

async function savePrices() {
  cacheInfo.prices = document.getElementById("edit-prices").value;
  await fsSet('info', cacheInfo);
  alert("Información actualizada.");
  loadBoxInfo();
}

function exportAtletas(formato) {
  const users = cacheUsers || {};
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  // Respetar el filtro activo en pantalla
  const filtroActivo = currentSocioStatusFilter; // 'all', 'active', 'expired', 'inactive'
  const discFiltro = document.getElementById('filter-discipline').value;
  const busqueda = document.getElementById('user-search').value.toLowerCase();

  const filas = [];

  for(let id in users) {
    const u = users[id];
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    const isVencido = fv && fv < hoy;
    const diff = fv ? (hoy - fv) / (1000*60*60*24) : 0;
    const isInactivo = diff >= 60;

    // Aplicar mismo filtro que la lista visible
    if(filtroActivo === 'inactive') { if(!isInactivo) continue; }
    else {
      if(isInactivo) continue;
      if(filtroActivo === 'active'  &&  isVencido) continue;
      if(filtroActivo === 'expired' && !isVencido) continue;
    }
    if(discFiltro !== 'all' && (!u.plans || !u.plans.includes(discFiltro))) continue;
    if(busqueda && !u.name.toLowerCase().includes(busqueda) && !id.includes(busqueda)) continue;

    filas.push({
      'DNI':         id,
      'Nombre':      u.name || '',
      'Teléfono':    u.phone || '',
      'Email':       u.email || '',
      'Disciplinas': u.plans?.join(', ') || '',
      'Horario':     u.schedule || '',
      'Vencimiento': u.expiry || 'S/D',
      'Estado':      isVencido ? 'VENCIDA' : 'AL DÍA',
    });
  }

  if(!filas.length) return alert("No hay atletas con el filtro actual.");

  // Título según filtro
  const titulos = { all:'Todos los Atletas', active:'Atletas al Día', expired:'Cuotas Vencidas', inactive:'Atletas Inactivos' };
  const colores = { all:'#888', active:'#C8F135', expired:'#FF4545', inactive:'#555' };
  const titulo = titulos[filtroActivo] || 'Atletas';
  const color  = colores[filtroActivo] || '#C8F135';
  const fecha  = new Date().toLocaleDateString('es-AR');

  if(formato === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [14, 28, 14, 28, 20, 14, 14, 10].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, titulo);
    XLSX.writeFile(wb, `legion_${filtroActivo}.xlsx`);

  } else {
    // PDF via iframe oculto para evitar bloqueo de popups
    const cols = Object.keys(filas[0]);
    const colorTextoHeader = (filtroActivo === 'active') ? '#000' : '#fff';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { margin: 32px; font-family: Arial, sans-serif; color: #111; }
      h1 { font-size: 22px; font-weight: 900; letter-spacing: 3px; margin: 0; }
      .sub { font-size: 11px; color: #666; margin-top: 3px; }
      .fecha { font-size: 10px; color: #999; }
      .header-wrap { display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 3px solid ${color}; padding-bottom: 12px; margin-bottom: 20px; }
      h2 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: ${color === '#C8F135' ? '#555' : color}; margin: 0 0 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      thead tr { background: ${color}; color: ${colorTextoHeader}; }
      th { padding: 7px 10px; text-align: left; }
      td { padding: 6px 10px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #f9f9f9; }
      @media print { body { margin: 16px; } }
    </style></head><body>
      <div class="header-wrap">
        <div><h1>LEGION BOX</h1><div class="sub">Centro de Entrenamiento · Formosa Capital</div></div>
        <div class="fecha">Generado el ${fecha}</div>
      </div>
      <h2>${titulo} — ${filas.length} atletas</h2>
      <table>
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${filas.map((f,i) => `<tr>${cols.map(c => `<td>${f[c]}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `legion_${filtroActivo}.html`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Se descargó el archivo HTML. Abrilo en el navegador y usá Ctrl+P para imprimir/guardar como PDF.');
  }
}

const diasSeleccionadosReset = new Set();

function toggleResetDay(btn, dia) {
  if(diasSeleccionadosReset.has(dia)) {
    diasSeleccionadosReset.delete(dia);
    btn.classList.remove('active');
  } else {
    diasSeleccionadosReset.add(dia);
    btn.classList.add('active');
  }
}

async function resetProgramacion() {
  if(!diasSeleccionadosReset.size) return alert('Seleccioná al menos un día para limpiar.');

  const diasTexto = [...diasSeleccionadosReset].join(', ');
  if(!confirm(`¿Borrar la programación de: ${diasTexto}?\n\nLos resultados del ranking se conservan.`)) return;

  diasSeleccionadosReset.forEach(d => { cachePrograms[d] = {}; });
  await fsSet('programs', cachePrograms);

  diasSeleccionadosReset.clear();
  document.querySelectorAll('#reset-day-selector .day-btn').forEach(b => b.classList.remove('active'));

  syncAdminView();
  renderClass();
  alert(`Programación de ${diasTexto} borrada correctamente.`);
}

function cerrarSesion() {
  localStorage.removeItem('legion_session');
  location.reload();
}

// ─── COMPETENCIA ─────────────────────────────────────────────────────────────

let cacheComp = null;

async function cargarCompetencia() {
  cacheComp = await fsGet('competencia') || null;
}

function mostrarFormComp() {
  document.getElementById('comp-empty').classList.add('hidden');
  document.getElementById('comp-form').classList.remove('hidden');
}

async function guardarCompetencia() {
  const nombre = document.getElementById('comp-nombre').value.trim();
  const fecha  = document.getElementById('comp-fecha').value;
  const desc   = document.getElementById('comp-desc').value.trim();
  const pass   = document.getElementById('comp-pass').value.trim();
  if(!nombre) return alert('El nombre es obligatorio.');

  if(!cacheComp) {
    cacheComp = { nombre, fecha, desc, pass, activa: true,
      categorias: [], eventos: [], participantes: [], resultados: {} };
  } else {
    cacheComp.nombre = nombre;
    cacheComp.fecha  = fecha;
    cacheComp.desc   = desc;
    cacheComp.pass   = pass;
  }

  await fsSet('competencia', cacheComp);
  alert('Competencia guardada.');
  renderCompAdmin();
}

function agregarCategoria() {
  const nivel    = document.getElementById('cat-nivel').value;
  const modalidad = document.getElementById('cat-modalidad').value;
  const sexo     = document.getElementById('cat-sexo').value;
  const nombre   = `${nivel} — ${modalidad} — ${sexo}`;

  if(!cacheComp) return alert('Primero guardá los datos de la competencia.');
  if(cacheComp.categorias.find(c => c.nombre === nombre))
    return alert('Esa categoría ya existe.');

  const tamEquipo = { Individual:1, Duplas:2, 'Tríos':3, Cuarteto:4 }[modalidad] || 1;
  cacheComp.categorias.push({ id: Date.now().toString(), nombre, modalidad, sexo, tamEquipo });
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

function agregarEvento() {
  const nombre = document.getElementById('evento-nombre').value.trim();
  const tipo   = document.getElementById('evento-tipo').value;
  const desc   = document.getElementById('evento-desc').value.trim();
  if(!nombre) return alert('Ingresá el nombre del evento.');
  if(!cacheComp) return alert('Primero guardá los datos de la competencia.');

  cacheComp.eventos.push({ id: Date.now().toString(), nombre, tipo, desc });
  fsSet('competencia', cacheComp);
  document.getElementById('evento-nombre').value = '';
  document.getElementById('evento-desc').value   = '';
  renderCompAdmin();
}

function eliminarEvento(id) {
  if(!confirm('¿Eliminar este evento? Se borrarán sus resultados.')) return;
  cacheComp.eventos = cacheComp.eventos.filter(e => e.id !== id);
  for(let key in cacheComp.resultados) {
    if(key.startsWith(id + '_')) delete cacheComp.resultados[key];
  }
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

function eliminarCategoria(id) {
  if(!confirm('¿Eliminar esta categoría? Se eliminarán sus participantes y resultados.')) return;
  cacheComp.categorias    = cacheComp.categorias.filter(c => c.id !== id);
  cacheComp.participantes = cacheComp.participantes.filter(p => p.catId !== id);
  for(let key in cacheComp.resultados) {
    if(key.endsWith('_' + id)) delete cacheComp.resultados[key];
  }
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

function agregarParticipante() {
  const catId  = document.getElementById('part-cat').value;
  const nombre = document.getElementById('part-nombre').value.trim();
  const box    = document.getElementById('part-box').value.trim();
  const integrantes = document.getElementById('part-integrantes').value.trim();
  if(!catId || !nombre) return alert('Categoría y nombre son obligatorios.');

  cacheComp.participantes.push({
    id: Date.now().toString(), catId, nombre, box,
    integrantes: integrantes ? integrantes.split(',').map(s => s.trim()) : []
  });
  fsSet('competencia', cacheComp);
  document.getElementById('part-nombre').value = '';
  document.getElementById('part-box').value    = '';
  document.getElementById('part-integrantes').value = '';
  renderCompAdmin();
}

function eliminarParticipante(id) {
  if(!confirm('¿Eliminar este participante?')) return;
  cacheComp.participantes = cacheComp.participantes.filter(p => p.id !== id);
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

function renderParticipantesResultado() {
  const catId    = document.getElementById('res-cat').value;
  const eventoId = document.getElementById('res-evento').value;
  const cont     = document.getElementById('res-inputs');
  cont.innerHTML = '';
  if(!catId || !eventoId || !cacheComp) return;

  const evento = cacheComp.eventos.find(e => e.id === eventoId);
  const partic = cacheComp.participantes.filter(p => p.catId === catId);
  if(!partic.length) { cont.innerHTML = '<small style="color:var(--text-tertiary)">No hay participantes en esta categoría.</small>'; return; }

  const placeholders = { time:'Ej: 6:01', reps:'Ej: 61 reps', weight:'Ej: 130 kg' };

  partic.forEach(p => {
    const key      = `${eventoId}_${catId}`;
    const scoreAct = cacheComp.resultados[key]?.[p.id]?.score || '';
    cont.innerHTML += `
      <div class="comp-res-row">
        <div>
          <b>${p.nombre}</b>
          <small style="color:var(--text-tertiary); display:block;">${p.box}</small>
        </div>
        <input type="text" id="score_${p.id}"
          placeholder="${placeholders[evento?.tipo || 'time']}"
          value="${scoreAct}"
          style="padding:8px 12px;">
      </div>`;
  });
}

async function guardarResultados() {
  const catId    = document.getElementById('res-cat').value;
  const eventoId = document.getElementById('res-evento').value;
  if(!catId || !eventoId) return alert('Seleccioná categoría y evento.');

  const key    = `${eventoId}_${catId}`;
  const evento = cacheComp.eventos.find(e => e.id === eventoId);
  const partic = cacheComp.participantes.filter(p => p.catId === catId);

  if(!cacheComp.resultados[key]) cacheComp.resultados[key] = {};

  partic.forEach(p => {
    const input = document.getElementById(`score_${p.id}`);
    if(input) {
      cacheComp.resultados[key][p.id] = {
        score: input.value.trim(),
        nombre: p.nombre,
        box: p.box
      };
    }
  });

  // Calcular posiciones con sistema olímpico
  calcularPosiciones(key, evento.tipo, partic);

  await fsSet('competencia', cacheComp);
  alert('Resultados guardados.');
  renderRankingPublico();
}

function calcularPosiciones(key, tipo, partic) {
  const res = cacheComp.resultados[key];

  // Separar con score y sin score
  const conScore  = partic.filter(p => res[p.id]?.score);
  const sinScore  = partic.filter(p => !res[p.id]?.score);

  // Ordenar los que tienen score
  conScore.sort((a, b) => {
    const sa = res[a.id].score;
    const sb = res[b.id].score;
    if(tipo === 'time') {
      const toSec = s => {
        const pts = s.trim().replace(',','.').split(':');
        return pts.length === 2 ? parseInt(pts[0])*60 + parseFloat(pts[1]) : parseFloat(pts[0]);
      };
      return toSec(sa) - toSec(sb);
    } else {
      return (parseFloat(sb) || 0) - (parseFloat(sa) || 0);
    }
  });

  // Asignar puntos con sistema olímpico
  let i = 0;
  while(i < conScore.length) {
    const scoreActual = res[conScore[i].id].score;
    // Buscar empates
    let j = i;
    while(j < conScore.length && res[conScore[j].id].score === scoreActual) j++;
    // Todos los empatados reciben el punto de la primera posición del grupo
    const puntos = i + 1;
    for(let k = i; k < j; k++) {
      res[conScore[k].id].posicion = puntos;
      res[conScore[k].id].puntos   = puntos;
    }
    i = j; // El siguiente empieza después del grupo empatado
  }

  // Los sin score van al último lugar: posición = total de participantes
  const ultimaPosicion = partic.length;
  sinScore.forEach(p => {
    if(!res[p.id]) res[p.id] = { score:'', nombre: p.nombre, box: p.box };
    res[p.id].posicion = ultimaPosicion;
    res[p.id].puntos   = ultimaPosicion;
  });
}

function calcularRankingCategoria(catId) {
  const partic = cacheComp.participantes.filter(p => p.catId === catId);
  const totales = {};

  partic.forEach(p => {
    totales[p.id] = { nombre: p.nombre, box: p.box, puntos: 0, posiciones: [], detalle: [] };
  });

  cacheComp.eventos.forEach(ev => {
    const key = `${ev.id}_${catId}`;
    const res = cacheComp.resultados[key] || {};
    partic.forEach(p => {
      const r = res[p.id];
      const pos    = r?.posicion || null;
      const score  = r?.score    || '-';
      totales[p.id].puntos += pos || 0;
      totales[p.id].posiciones.push(pos || null);
      totales[p.id].detalle.push({ evento: ev.nombre, pos, score });
    });
  });

  const lista = Object.values(totales);

  // Ordenar: menos puntos primero, desempate por mejor posición acumulada
  lista.sort((a, b) => {
    if(a.puntos !== b.puntos) return a.puntos - b.puntos;
    // Desempate: contar mejores posiciones
    const maxPos = cacheComp.eventos.length + 1;
    for(let pos = 1; pos <= maxPos; pos++) {
      const countA = a.posiciones.filter(p => p === pos).length;
      const countB = b.posiciones.filter(p => p === pos).length;
      if(countA !== countB) return countB - countA;
    }
    return 0;
  });

  return lista;
}

function renderRankingPublico() {
  const catId = document.getElementById('public-cat-select').value;
  const cont  = document.getElementById('public-ranking-container');
  cont.innerHTML = '';
  if(!catId || !cacheComp) return;

  const cat   = cacheComp.categorias.find(c => c.id === catId);
  const lista = calcularRankingCategoria(catId);

  if(!lista.length) {
    cont.innerHTML = '<p style="text-align:center; color:var(--text-tertiary); padding:20px;">Sin participantes en esta categoría.</p>';
    return;
  }

  const eventos = cacheComp.eventos;

  // Cabecera
  let tabla = `
    <div style="margin-bottom:12px;">
      <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700; letter-spacing:2px; color:var(--accent);">${cat.nombre}</span>
    </div>
    <div style="overflow-x:auto; -webkit-overflow-scrolling:touch;">
    <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
      <thead>
        <tr style="border-bottom:2px solid var(--accent);">
          <th style="text-align:left; padding:8px 12px; font-family:'Barlow Condensed',sans-serif; font-size:0.7rem; letter-spacing:1.5px; color:var(--text-tertiary); font-weight:700; white-space:nowrap;">ATLETA</th>`;

  eventos.forEach(e => {
    tabla += `<th style="text-align:center; padding:8px 10px; font-family:'Barlow Condensed',sans-serif; font-size:0.7rem; letter-spacing:1.5px; color:var(--text-tertiary); font-weight:700; white-space:nowrap;">${e.nombre}</th>`;
  });

  tabla += `<th style="text-align:center; padding:8px 10px; font-family:'Barlow Condensed',sans-serif; font-size:0.7rem; letter-spacing:1.5px; color:var(--accent); font-weight:700;">PUESTO</th>
        </tr>
      </thead>
      <tbody>`;

  // Filas con empates olímpicos
  let posActual = 1;
  lista.forEach((r, idx) => {
    if(idx > 0 && lista[idx].puntos !== lista[idx-1].puntos) {
      posActual = idx + 1;
    }

    const esPar = idx % 2 === 0;
    tabla += `<tr style="border-bottom:1px solid var(--border); background:${esPar ? 'transparent' : 'rgba(255,255,255,0.02)'};">
      <td style="padding:10px 12px;">
        <b style="font-size:0.88rem;">${r.nombre}</b>
        <div style="font-size:0.72rem; color:var(--text-tertiary); margin-top:2px;">${r.box}</div>
      </td>`;

    r.detalle.forEach((d, di) => {
      const tipo  = cacheComp.eventos[di]?.tipo || 'time';
      const unidad = tipo === 'reps' ? ' reps' : tipo === 'weight' ? ' kg' : '';
      tabla += `<td style="text-align:center; padding:10px 8px; white-space:nowrap;">
        <div style="font-size:0.82rem; color:var(--text-secondary);">${d.score ? d.score + unidad : '-'}</div>
        <div style="font-size:0.72rem; color:var(--accent); font-weight:700; margin-top:2px;">${d.pos ? d.pos+'°' : 'DNS'}</div>
      </td>`;
    });

    tabla += `<td style="text-align:center; padding:10px 8px;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:1rem; font-weight:700; color:${posActual === 1 ? '#FFD700' : posActual === 2 ? '#C0C0C0' : posActual === 3 ? '#CD7F32' : 'var(--text)'};">#${posActual}</span>
        <div style="font-size:0.68rem; color:var(--text-tertiary); margin-top:2px;">${r.puntos} pts</div>
      </td>
    </tr>`;
  });

  tabla += `</tbody></table></div>`;
  cont.innerHTML = tabla;
}

function renderCompAdmin() {
  if(!cacheComp) return;

  // Llenar datos del form
  document.getElementById('comp-nombre').value = cacheComp.nombre || '';
  document.getElementById('comp-fecha').value  = cacheComp.fecha  || '';
  document.getElementById('comp-desc').value   = cacheComp.desc   || '';
  document.getElementById('comp-pass').value   = cacheComp.pass   || '';

  // Lista categorías
  const catList = document.getElementById('comp-cat-list');
  catList.innerHTML = '';
  cacheComp.categorias.forEach(c => {
    catList.innerHTML += `
      <div class="comp-cat-pill">
        <span>${c.nombre}</span>
        <button onclick="eliminarCategoria('${c.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;">✕</button>
      </div>`;
  });

  // Lista eventos
  const evList = document.getElementById('comp-evento-list');
  evList.innerHTML = '';
  cacheComp.eventos.forEach(e => {
    const tipos = { time:'Tiempo', reps:'Repeticiones', weight:'Peso' };
    evList.innerHTML += `
      <div class="comp-cat-pill" style="flex-direction:column; align-items:flex-start; gap:4px;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <div><b>${e.nombre}</b> <small style="color:var(--text-tertiary);">· ${tipos[e.tipo]}</small></div>
          <div style="display:flex; gap:6px;">
            <button onclick="editarEvento('${e.id}')" style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);padding:4px 10px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">Editar</button>
            <button onclick="eliminarEvento('${e.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;">✕</button>
          </div>
        </div>
        ${e.desc ? '<small style="color:var(--text-tertiary); line-height:1.4; display:block; margin-top:4px;">' + e.desc + '</small>' : ''}
      </div>`;
  });

  // Poblar selects de participantes
  const partCat = document.getElementById('part-cat');
  partCat.innerHTML = '<option value="">— Seleccionar —</option>';
  cacheComp.categorias.forEach(c => {
    partCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });

  // Lista participantes agrupados por categoría
  const partList = document.getElementById('comp-part-list');
  partList.innerHTML = '';
  cacheComp.categorias.forEach(c => {
    const partic = cacheComp.participantes.filter(p => p.catId === c.id);
    if(!partic.length) return;
    partList.innerHTML += `<p style="font-size:0.72rem; font-weight:700; letter-spacing:1.5px; color:var(--accent); margin:12px 0 6px; text-transform:uppercase;">${c.nombre}</p>`;
    partic.forEach(p => {
      partList.innerHTML += `
        <div class="comp-cat-pill" id="pill-${p.id}">
          <div style="flex:1;">
            <div id="view-${p.id}">
              <b>${p.nombre}</b> <small style="color:var(--text-tertiary);">· ${p.box}</small>
              ${p.integrantes?.length ? `<div style="font-size:0.75rem; color:var(--text-tertiary); margin-top:2px;">${p.integrantes.join(', ')}</div>` : ''}
            </div>
            <div id="edit-${p.id}" class="hidden" style="display:none; gap:6px; flex-wrap:wrap;">
              <input type="text" id="edit-nombre-${p.id}" value="${p.nombre}" style="flex:1; min-width:120px; padding:6px 10px; font-size:0.82rem;">
              <input type="text" id="edit-box-${p.id}" value="${p.box}" style="flex:1; min-width:120px; padding:6px 10px; font-size:0.82rem;">
              <button onclick="guardarEdicionParticipante('${p.id}')" style="background:var(--accent);border:none;color:#000;padding:6px 12px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;font-weight:700;">OK</button>
              <button onclick="cancelarEdicionParticipante('${p.id}')" style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);padding:6px 12px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">✕</button>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button onclick="editarParticipante('${p.id}')" style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);padding:5px 10px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">Editar</button>
            <button onclick="eliminarParticipante('${p.id}')" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;">✕</button>
          </div>
        </div>`;
   });
  });

  // Poblar selects de resultados
  const resCat = document.getElementById('res-cat');
  resCat.innerHTML = '<option value="">— Categoría —</option>';
  cacheComp.categorias.forEach(c => {
    resCat.innerHTML += '<option value="' + c.id + '">' + c.nombre + '</option>';
  });

  const resEv = document.getElementById('res-evento');
  resEv.innerHTML = '<option value="">— Evento —</option>';
  cacheComp.eventos.forEach(e => {
    resEv.innerHTML += '<option value="' + e.id + '">' + e.nombre + '</option>';
  });

  // Estado acceso público
  const statusEl = document.getElementById('comp-acceso-status');
  const labelEl  = document.getElementById('comp-btn-label');
  if(statusEl) statusEl.textContent = cacheComp.accesoPublico ? ('Acceso habilitado — boton: ' + (cacheComp.btnLabel || 'Ver Competencia')) : 'Acceso deshabilitado';
  if(labelEl) labelEl.value = cacheComp.btnLabel || '';

  // Poblar select público
  const pubCat = document.getElementById('public-cat-select');
  pubCat.innerHTML = '<option value="">— Seleccionar —</option>';
  cacheComp.categorias.forEach(c => {
    pubCat.innerHTML += '<option value="' + c.id + '">' + c.nombre + '</option>';
  });
}

async function finalizarCompetencia() {
  if(!confirm('¿Finalizar y archivar la competencia?\n\nQuedará guardada pero ya no estará activa.')) return;
  cacheComp.activa = false;
  await fsSet('competencia', cacheComp);
  cacheComp = null;
  alert('Competencia finalizada.');
  switchTab('comp', document.getElementById('tab-link-comp'));
  renderCompAdmin();
}

function entrarLeaderboard() {
  currentUser = { id: 'espectador', role: 'espectador', name: 'Espectador' };
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  document.getElementById('tab-link-comp-public').classList.remove('hidden');
  document.getElementById('nav-username').textContent = cacheComp?.nombre || 'Competencia';
  renderCompAdmin();
  switchTab('comp-public', document.getElementById('tab-link-comp-public'));
  localStorage.setItem('legion_session', JSON.stringify(currentUser));
}

async function toggleAccesoPublico(habilitar) {
  if(!cacheComp) return alert('Primero guardá la competencia.');
  const label = document.getElementById('comp-btn-label').value.trim() || 'Ver Competencia';
  cacheComp.accesoPublico  = habilitar;
  cacheComp.btnLabel       = label;
  await fsSet('competencia', cacheComp);
  actualizarBotonLeaderboard();
  document.getElementById('comp-acceso-status').textContent = 
    habilitar ? `✓ Acceso habilitado — botón: "${label}"` : '✗ Acceso deshabilitado';
}

function actualizarBotonLeaderboard() {
  const wrap  = document.getElementById('btn-ver-comp-wrap');
  const label = document.getElementById('btn-ver-comp-label');
  if(!wrap || !label) return;
  if(cacheComp?.accesoPublico && cacheComp?.activa) {
    wrap.classList.remove('hidden');
    label.textContent = cacheComp.btnLabel || 'Ver Competencia';
  } else {
    wrap.classList.add('hidden');
  }
}

function editarParticipante(id) {
  document.getElementById(`view-${id}`).style.display = 'none';
  const editDiv = document.getElementById(`edit-${id}`);
  editDiv.classList.remove('hidden');
  editDiv.style.display = 'flex';
}

function cancelarEdicionParticipante(id) {
  document.getElementById(`view-${id}`).style.display = 'block';
  const editDiv = document.getElementById(`edit-${id}`);
  editDiv.classList.add('hidden');
  editDiv.style.display = 'none';
}

async function guardarEdicionParticipante(id) {
  const nuevoNombre = document.getElementById(`edit-nombre-${id}`).value.trim();
  const nuevoBox    = document.getElementById(`edit-box-${id}`).value.trim();
  if(!nuevoNombre) return alert('El nombre no puede estar vacío.');
  const p = cacheComp.participantes.find(p => p.id === id);
  if(!p) return;
  p.nombre = nuevoNombre;
  p.box    = nuevoBox;
  // Actualizar también en resultados
  for(let key in cacheComp.resultados) {
    if(cacheComp.resultados[key][id]) {
      cacheComp.resultados[key][id].nombre = nuevoNombre;
      cacheComp.resultados[key][id].box    = nuevoBox;
    }
  }
  await fsSet('competencia', cacheComp);
  renderCompAdmin();
}

function editarEvento(id) {
  const e = cacheComp.eventos.find(e => e.id === id);
  if(!e) return;
  document.getElementById('evento-nombre').value = e.nombre;
  document.getElementById('evento-tipo').value   = e.tipo;
  document.getElementById('evento-desc').value   = e.desc || '';
  // Cambiar el botón agregar para que guarde la edición
  const btn = document.querySelector('[onclick="agregarEvento()"]');
  btn.textContent = 'GUARDAR CAMBIOS';
  btn.onclick = () => guardarEdicionEvento(id);
}

async function guardarEdicionEvento(id) {
  const e = cacheComp.eventos.find(e => e.id === id);
  if(!e) return;
  e.nombre = document.getElementById('evento-nombre').value.trim();
  e.tipo   = document.getElementById('evento-tipo').value;
  e.desc   = document.getElementById('evento-desc').value.trim();
  await fsSet('competencia', cacheComp);
  // Restaurar botón
  const btn = document.querySelector('[onclick]');
  btn.textContent = '+ AGREGAR EVENTO';
  btn.onclick = agregarEvento;
  document.getElementById('evento-nombre').value = '';
  document.getElementById('evento-desc').value   = '';
  renderCompAdmin();
  alert('Evento actualizado.');
}

// Exponer funciones al scope global para los onclick del HTML
window.doLogin         = doLogin;
window.switchTab       = switchTab;
window.changeViewDay   = changeViewDay;
window.setSocioFilter  = setSocioFilter;
window.saveUser        = saveUser;
window.editUser        = editUser;
window.saveClass       = saveClass;
window.saveNews        = saveNews;
window.savePrices      = savePrices;
window.saveRM          = saveRM;
window.saveWodScore    = saveWodScore;
window.calculate       = calculate;
window.loadRMValue     = loadRMValue;
window.updateOwnProfile = updateOwnProfile;
window.addPaymentRecord = addPaymentRecord;
window.deletePayment   = deletePayment;
window.setRankingMode  = setRankingMode;
window.renderRanking   = renderRanking;
window.refreshScheduleUI = refreshScheduleUI;
window.syncAdminView   = syncAdminView;
window.toggleResetDay  = toggleResetDay;
window.resetProgramacion = resetProgramacion;
window.exportAtletas   = exportAtletas;
window.cerrarSesion = cerrarSesion;
window.mostrarFormComp          = mostrarFormComp;
window.guardarCompetencia       = guardarCompetencia;
window.agregarCategoria         = agregarCategoria;
window.agregarEvento            = agregarEvento;
window.eliminarEvento           = eliminarEvento;
window.eliminarCategoria        = eliminarCategoria;
window.agregarParticipante      = agregarParticipante;
window.eliminarParticipante     = eliminarParticipante;
window.renderParticipantesResultado = renderParticipantesResultado;
window.guardarResultados        = guardarResultados;
window.renderRankingPublico     = renderRankingPublico;
window.finalizarCompetencia     = finalizarCompetencia;
window.actualizarTamEquipo = function(){};
window.entrarLeaderboard    = entrarLeaderboard;
window.toggleAccesoPublico  = toggleAccesoPublico;
window.entrarLeaderboard    = entrarLeaderboard;
window.toggleAccesoPublico  = toggleAccesoPublico;
window.editarParticipante          = editarParticipante;
window.cancelarEdicionParticipante = cancelarEdicionParticipante;
window.guardarEdicionParticipante  = guardarEdicionParticipante;
window.editarEvento           = editarEvento;
window.guardarEdicionEvento   = guardarEdicionEvento;
