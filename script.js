const DB_USERS = "legion_final_users";
const DB_PROGRAMS = "legion_final_programs";
const DB_BOXINFO = "legion_final_info";
const DB_RESULTS = "legion_final_results";

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

  if (!localStorage.getItem(DB_PROGRAMS)) {
    localStorage.setItem(
      DB_PROGRAMS,
      JSON.stringify({
        lunes: {},
        martes: {},
        miercoles: {},
        jueves: {},
        viernes: {},
        sabado: {},
      }),
    );
  }
  if (!localStorage.getItem(DB_RESULTS)) {
    localStorage.setItem(DB_RESULTS, JSON.stringify({}));
  }
  if (!localStorage.getItem(DB_BOXINFO)) {
    localStorage.setItem(
      DB_BOXINFO,
      JSON.stringify({
        news: "Bienvenidos Atletas al Centro de Entrenamiento.",
        prices: "Membresías y Planes actualizados...",
      }),
    );
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

  // Reset automático del ranking los domingos a las 23:59
  function checkAutoReset() {
    const ahora = new Date();
    if(ahora.getDay() === 0) { // domingo
      const clave = `legion_reset_${ahora.getFullYear()}_${ahora.getMonth()}_${ahora.getDate()}`;
      if(!localStorage.getItem(clave)) {
        const horas = ahora.getHours();
        const mins  = ahora.getMinutes();
        if(horas === 23 && mins === 59) {
          localStorage.setItem(DB_RESULTS, JSON.stringify({}));
          localStorage.setItem(clave, '1');
          renderRanking();
          console.log('Ranking reseteado automáticamente.');
        }
      }
    }
  }
  setInterval(checkAutoReset, 30000); // chequea cada 30 segundos
});

// --- SISTEMA DE LOGIN ---
function doLogin() {
  const role = document.getElementById("login-role").value;
  const userIn = document
    .getElementById("login-user")
    .value.toLowerCase()
    .trim();
  const passIn = document.getElementById("login-pass").value;

  if (role === "admin" && userIn === "coach" && passIn === "coach123") {
    currentUser = { id: "coach", role: "coach", name: "Coach" };
    showApp(true);
  } else {
    const users = JSON.parse(localStorage.getItem(DB_USERS)) || {};
    const u = users[userIn];
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
}

function showApp(isCoach, userData = null) {
  document.getElementById("screen-login").classList.add("hidden");
  document.getElementById("screen-app").classList.remove("hidden");
  const info = JSON.parse(localStorage.getItem(DB_BOXINFO));
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
  const users = JSON.parse(localStorage.getItem(DB_USERS)) || {};
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

function saveUser() {
  const id = document.getElementById('user-id').value.toLowerCase().trim();
  const name = document.getElementById('user-name').value;
  if(!id || !name) return alert("DNI y Nombre son obligatorios");

  const users = JSON.parse(localStorage.getItem(DB_USERS)) || {};
  const p = Array.from(document.querySelectorAll('.plan-check:checked')).map(c => c.value);

  // Si el DNI ya existe y NO estamos editando ese mismo usuario, avisar
  if(users[id] && editingUserId !== id) {
    const confirmar = confirm(`El DNI ${id} ya está registrado como "${users[id].name}".\n\n¿Querés actualizar sus datos? Si cancelás no se realizará ningún cambio.`);
    if(!confirmar) return;
  }

  users[id] = {
    ...users[id], name, plans: p,
    pass: document.getElementById('user-pass-admin').value || users[id]?.pass || '1234',
    expiry: document.getElementById('user-expiry').value,
    email: document.getElementById('user-email').value,
    phone: document.getElementById('user-phone').value,
    address: document.getElementById('user-address').value,
    emergency: document.getElementById('user-emergency').value,
    birth: document.getElementById('user-birth').value,
    schedule: document.getElementById('user-schedule').value
  };

  localStorage.setItem(DB_USERS, JSON.stringify(users));
  editingUserId = null;
  alert("Atleta guardado.");
  renderUserList();
  renderBirthdays();
}

function editUser(id) {
  editingUserId = id;
  const u = JSON.parse(localStorage.getItem(DB_USERS))[id];
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
function addPaymentRecord() {
  const amount = document.getElementById("pay-amount").value;
  const obs = document.getElementById("pay-obs").value;
  const date = document.getElementById("pay-date").value;
  const method = document.getElementById("pay-method").value;

  if (!amount || !editingUserId || !date)
    return alert("Ingrese monto y fecha.");

  const users = JSON.parse(localStorage.getItem(DB_USERS));
  if (!users[editingUserId].payments) users[editingUserId].payments = [];

  const dateParts = date.split("-");
  const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

  users[editingUserId].payments.push({
    id: Date.now(),
    date: formattedDate,
    amount,
    method,
    obs: obs || "S/O",
  });

  localStorage.setItem(DB_USERS, JSON.stringify(users));
  document.getElementById("pay-amount").value = "";
  document.getElementById("pay-obs").value = "";

  renderPaymentHistory(
    users[editingUserId].payments,
    "payment-history-list",
    true,
  );
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

function deletePayment(payId) {
  if (!confirm("¿Eliminar este pago?")) return;
  const users = JSON.parse(localStorage.getItem(DB_USERS));
  users[editingUserId].payments = users[editingUserId].payments.filter(
    (p) => p.id !== payId,
  );
  localStorage.setItem(DB_USERS, JSON.stringify(users));
  renderPaymentHistory(
    users[editingUserId].payments,
    "payment-history-list",
    true,
  );
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

function saveWodScore() {
  const score = document.getElementById("input-score").value.trim();
  if (!score) return alert("Ingresa un resultado.");

  const results = JSON.parse(localStorage.getItem(DB_RESULTS)) || {};
  const day = selectedViewDay;
  const plan = currentViewPlan;

  if (!results[day]) results[day] = {};
  if (!results[day][plan]) results[day][plan] = {};

  results[day][plan][currentUser.id] = {
    name: currentUser.name,
    score: score,
    timestamp: Date.now(),
  };

  localStorage.setItem(DB_RESULTS, JSON.stringify(results));
  document.getElementById("input-score").value = "";
  alert("¡Resultado subido con éxito!");
}

function renderRanking() {
  const cont = document.getElementById("ranking-list-container");
  const results = JSON.parse(localStorage.getItem(DB_RESULTS)) || {};
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

    // Ordenar según tipo de resultado de la clase
    const week = JSON.parse(localStorage.getItem(DB_PROGRAMS));
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
    const week = JSON.parse(localStorage.getItem(DB_PROGRAMS));
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
  const users = JSON.parse(localStorage.getItem(DB_USERS)) || {};
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
function saveNews() {
  const text = document.getElementById("edit-news").value;
  const info = JSON.parse(localStorage.getItem(DB_BOXINFO));
  info.news = text;
  localStorage.setItem(DB_BOXINFO, JSON.stringify(info));
  document.getElementById("news-text").textContent = text;
  alert("Comunicado actualizado.");
}

function syncAdminView() {
  const d = document.getElementById("edit-day-select").value;
  const p = document.getElementById("edit-plan-select").value;
  selectedViewDay = d;
  currentViewPlan = p;
  const week = JSON.parse(localStorage.getItem(DB_PROGRAMS));
  const c = week[d][p] || {};
  document.getElementById('edit-title').value = c.title || '';
  document.getElementById('edit-result-type').value = c.resultType || 'time';
  document.getElementById("edit-warmup").value = c.warmup || "";
  document.getElementById("edit-strength").value = c.strength || "";
  document.getElementById("edit-wod").value = c.wod || "";
  renderClass();
}

function saveClass() {
  const d = document.getElementById("edit-day-select").value;
  const p = document.getElementById("edit-plan-select").value;
  const week = JSON.parse(localStorage.getItem(DB_PROGRAMS));
 week[d][p] = {
    title: document.getElementById('edit-title').value,
    resultType: document.getElementById('edit-result-type').value,
    warmup: document.getElementById('edit-warmup').value,
    strength: document.getElementById('edit-strength').value,
    wod: document.getElementById('edit-wod').value
  };
  localStorage.setItem(DB_PROGRAMS, JSON.stringify(week));
  alert("Clase publicada.");
  renderClass();
}

function renderClass() {
  const week = JSON.parse(localStorage.getItem(DB_PROGRAMS));
  const c = week[selectedViewDay][currentViewPlan] || {};
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
  const users = JSON.parse(localStorage.getItem(DB_USERS));
  document.getElementById("input-rm").value =
    users[currentUser.id]?.rms?.[ex] || "";
  calculate();
}

function saveRM() {
  const ex = document.getElementById("rm-exercise").value;
  if (!ex) return alert("Selecciona ejercicio");
  const users = JSON.parse(localStorage.getItem(DB_USERS));
  if (!users[currentUser.id].rms) users[currentUser.id].rms = {};
  users[currentUser.id].rms[ex] = document.getElementById("input-rm").value;
  localStorage.setItem(DB_USERS, JSON.stringify(users));
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
  const u = JSON.parse(localStorage.getItem(DB_USERS))[currentUser.id];
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

function updateOwnProfile() {
  const users = JSON.parse(localStorage.getItem(DB_USERS));
  const u = users[currentUser.id];
  u.name = document.getElementById("prof-name").value;
  u.email = document.getElementById("prof-email").value;
  u.address = document.getElementById("prof-address").value;
  u.phone = document.getElementById("prof-phone").value;
  u.emergency = document.getElementById("prof-emergency").value;
  if (document.getElementById("prof-pass").value)
    u.pass = document.getElementById("prof-pass").value;
  localStorage.setItem(DB_USERS, JSON.stringify(users));
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
  const info = JSON.parse(localStorage.getItem(DB_BOXINFO));
  document.getElementById("display-prices").textContent = info.prices;
  if (currentUser.role === "coach")
    document.getElementById("edit-prices").value = info.prices;
}

function savePrices() {
  const info = JSON.parse(localStorage.getItem(DB_BOXINFO));
  info.prices = document.getElementById("edit-prices").value;
  localStorage.setItem(DB_BOXINFO, JSON.stringify(info));
  alert("Información actualizada.");
  loadBoxInfo();
}

function exportAtletas(formato) {
  const users = JSON.parse(localStorage.getItem(DB_USERS)) || {};
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

function resetProgramacion() {
  if(!diasSeleccionadosReset.size) return alert('Seleccioná al menos un día para limpiar.');

  const diasTexto = [...diasSeleccionadosReset].join(', ');
  if(!confirm(`¿Borrar la programación de: ${diasTexto}?\n\nLos resultados del ranking se conservan.`)) return;

  const week = JSON.parse(localStorage.getItem(DB_PROGRAMS));
  diasSeleccionadosReset.forEach(d => { week[d] = {}; });
  localStorage.setItem(DB_PROGRAMS, JSON.stringify(week));

  // Limpiar selección visual
  diasSeleccionadosReset.clear();
  document.querySelectorAll('#reset-day-selector .day-btn').forEach(b => b.classList.remove('active'));

  syncAdminView();
  renderClass();
  alert(`Programación de ${diasTexto} borrada correctamente.`);
}
