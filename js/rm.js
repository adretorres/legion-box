// ─── js/rm.js ─────────────────────────────────────────────────────────────────
import {
  fsGet, fsSet,
  cacheUsers, setCacheUsers,
  currentUser
} from './firebase.js';

import { renderPaymentHistory } from './atletas.js';

// ─── CALCULADORA ──────────────────────────────────────────────────────────────
export function calculate() {
  const rm    = parseFloat(document.getElementById("input-rm").value);
  const res   = document.getElementById("calc-results");
  const unidad = document.getElementById("btn-convertir")?.dataset.modo === 'lb' ? 'lb' : 'kg';
  if(!rm) { res.innerHTML = ""; return; }

  const percent = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 40];
  res.innerHTML = percent.map(p => `
    <div class="rm-cell">
      <small>${p}%</small>
      <b>${((rm * p) / 100).toFixed(1)}</b>
      <span>${unidad}</span>
    </div>`).join("");
}

export function convertirPeso() {
  const input = document.getElementById("input-rm");
  const btn   = document.getElementById("btn-convertir");
  const val   = parseFloat(input.value);
  if(!val) return;

  if(btn.dataset.modo === 'lb') {
    // Libras a kg
    input.value = (val / 2.205).toFixed(1);
    btn.textContent = 'kg → lb';
    btn.dataset.modo = 'kg';
  } else {
    // kg a libras
    input.value = (val * 2.205).toFixed(1);
    btn.textContent = 'lb → kg';
    btn.dataset.modo = 'lb';
  }
  calculate();
}

export function loadRMValue() {
  const ex = document.getElementById("rm-exercise").value;
  document.getElementById("input-rm").value =
    cacheUsers[currentUser.id]?.rms?.[ex] || "";
  calculate();
  renderRMChart(ex);
}

export async function saveRM() {
  const ex    = document.getElementById("rm-exercise").value;
  if(!ex)     return alert("Selecciona ejercicio");
  const valor = document.getElementById("input-rm").value;
  if(!valor)  return alert("Ingresá un peso.");

  const usersActualizados = await fsGet('users');
  if(usersActualizados) setCacheUsers(usersActualizados);

  if(!cacheUsers[currentUser.id].rms)      cacheUsers[currentUser.id].rms      = {};
  if(!cacheUsers[currentUser.id].rmHistory) cacheUsers[currentUser.id].rmHistory = {};
  if(!cacheUsers[currentUser.id].rmHistory[ex]) cacheUsers[currentUser.id].rmHistory[ex] = [];

  cacheUsers[currentUser.id].rms[ex] = valor;
  const hoy  = new Date().toISOString().split('T')[0];
  const hist = cacheUsers[currentUser.id].rmHistory[ex];
  const yaHoy = hist.find(h => h.date === hoy);
  if(yaHoy) yaHoy.value = valor;
  else hist.push({ date: hoy, value: valor });

  await fsSet('users', cacheUsers);
  alert("PR guardado.");
  renderRMChart(ex);
}

// ─── GRÁFICO DE PROGRESO ──────────────────────────────────────────────────────
export function renderRMChart(ex) {
  const cont = document.getElementById('rm-chart-container');
  if(!cont || !ex) { if(cont) cont.innerHTML = ''; return; }

  const hist = cacheUsers[currentUser.id]?.rmHistory?.[ex] || [];
  if(hist.length < 2) {
    cont.innerHTML = hist.length === 1
      ? `<p style="color:var(--text-tertiary); font-size:0.82rem; text-align:center; padding:12px;">
          Registrá más PRs para ver tu progreso.</p>`
      : '';
    return;
  }

  const sorted = [...hist].sort((a,b) => a.date.localeCompare(b.date));
  const maxVal = Math.max(...sorted.map(h => parseFloat(h.value)));
  const minVal = Math.min(...sorted.map(h => parseFloat(h.value)));
  const range  = maxVal - minVal || 1;
  const W = 100, H = 60, pad = 8;

  const pts = sorted.map((h, i) => {
    const x = pad + (i / (sorted.length - 1)) * (W - pad*2);
    const y = H - pad - ((parseFloat(h.value) - minVal) / range) * (H - pad*2);
    return { x, y, ...h };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area     = `${pts[0].x},${H} ` + pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length-1].x},${H}`;
  const ejercicioNombre = document.getElementById('rm-exercise')
    .options[document.getElementById('rm-exercise').selectedIndex].text;

  cont.innerHTML = `
    <div style="background:var(--card); border:1px solid var(--border);
      border-radius:var(--radius); padding:16px; margin-top:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700;
          letter-spacing:2px; color:var(--accent); text-transform:uppercase;">
          Progreso — ${ejercicioNombre}</span>
        <span style="font-size:0.78rem; color:var(--text-tertiary);">${sorted.length} registros</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:80px; overflow:visible;">
        <defs>
          <linearGradient id="rmGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="#C8F135" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#C8F135" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon points="${area}" fill="url(#rmGrad)"/>
        <polyline points="${polyline}" fill="none" stroke="#C8F135"
          stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${pts.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="2" fill="#C8F135"/>
          ${i === pts.length - 1 ? `
            <text x="${p.x}" y="${p.y - 4}" text-anchor="middle"
              fill="#C8F135" font-size="5" font-weight="bold">${p.value}kg</text>` : ''}
        `).join('')}
      </svg>
      <div style="display:flex; justify-content:space-between; margin-top:4px;">
        <span style="font-size:0.68rem; color:var(--text-tertiary);">
          ${sorted[0].date.split('-').reverse().join('/')}</span>
        <span style="font-size:0.68rem; color:var(--text-tertiary);">
          ${sorted[sorted.length-1].date.split('-').reverse().join('/')}</span>
      </div>
    </div>`;
}

// ─── PERFIL ───────────────────────────────────────────────────────────────────
export function loadProfileData() {
  const u = cacheUsers[currentUser.id];
  document.getElementById("prof-id").value        = currentUser.id;
  document.getElementById("prof-name").value      = u.name;
  document.getElementById("prof-email").value     = u.email     || "";
  document.getElementById("prof-address").value   = u.address   || "";
  document.getElementById("prof-phone").value     = u.phone     || "";
  document.getElementById("prof-emergency").value = u.emergency || "";

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fv  = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
  const isV = fv && fv < hoy;

  document.getElementById("prof-status-info").innerHTML = `
    <p><b>Estado Cuota</b> &nbsp;
      <span style="color:${isV ? "var(--danger)" : "#2ecc71"}; font-weight:600;">
        ${isV ? "VENCIDA" : "AL DÍA"}</span></p>
    <p><b>Vencimiento</b> &nbsp;${u.expiry || "No registrado"}</p>
    <p><b>Planes</b> &nbsp;${u.plans?.join(", ").toUpperCase()}</p>
    <p><b>Horario</b> &nbsp;${u.schedule || "S/H"}</p>`;

  renderPaymentHistory(u.payments || [], "profile-payment-list", false);
}

export async function updateOwnProfile() {
  const u = cacheUsers[currentUser.id];
  u.name      = document.getElementById("prof-name").value;
  u.email     = document.getElementById("prof-email").value;
  u.address   = document.getElementById("prof-address").value;
  u.phone     = document.getElementById("prof-phone").value;
  u.emergency = document.getElementById("prof-emergency").value;
  if(document.getElementById("prof-pass").value)
    u.pass = document.getElementById("prof-pass").value;
  await fsSet('users', cacheUsers);
  alert("Perfil guardado.");
}

// ─── CONVERSOR INDEPENDIENTE ──────────────────────────────────────────────────
export function convertirKgLb() {
  const kg = parseFloat(document.getElementById('conv-kg').value);
  const lb = document.getElementById('conv-lb');
  if(!isNaN(kg) && kg !== '') lb.value = (kg * 2.205).toFixed(2);
  else lb.value = '';
}

export function convertirLbKg() {
  const lb = parseFloat(document.getElementById('conv-lb').value);
  const kg = document.getElementById('conv-kg');
  if(!isNaN(lb) && lb !== '') kg.value = (lb / 2.205).toFixed(2);
  else kg.value = '';
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.calculate         = calculate;
window.loadRMValue       = loadRMValue;
window.saveRM            = saveRM;
window.renderRMChart     = renderRMChart;
window.loadProfileData   = loadProfileData;
window.updateOwnProfile  = updateOwnProfile;
window.convertirPeso = convertirPeso;
window.convertirKgLb = convertirKgLb;
window.convertirLbKg = convertirLbKg;