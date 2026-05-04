// ─── js/atletas.js ────────────────────────────────────────────────────────────
import {
  fsSet,
  cacheUsers, setCacheUsers,
  SCHEDULES
} from './firebase.js';

import { currentSocioStatusFilter, setCurrentSocioStatusFilter, editingUserId, setEditingUserId, tipoPagoSeleccionado, setTipoPagoSeleccionado } from './main.js';

// ─── FILTRO ───────────────────────────────────────────────────────────────────
export function setSocioFilter(f, btn) {
  setCurrentSocioStatusFilter(f);
  document.querySelectorAll(".filter-bar .day-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderUserList();
}

// ─── LISTA DE ATLETAS ─────────────────────────────────────────────────────────
export function renderUserList() {
  const users  = cacheUsers || {};
  const cont   = document.getElementById("user-list-container");
  const search = document.getElementById("user-search").value.toLowerCase();
  const disc   = document.getElementById("filter-discipline").value;
  cont.innerHTML = "";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const idsOrdenados = Object.keys(users)
    .filter(id => id !== 'coach')
    .sort((a, b) => (users[a].name || '').localeCompare(users[b].name || '', 'es'));

  for(const id of idsOrdenados) {
    const u  = users[id];
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    const isVencido  = fv && fv < hoy;
    const diff       = fv ? (hoy - fv) / (1000*60*60*24) : 0;
    const isInactive = diff >= 60;

    if(currentSocioStatusFilter === "inactive") {
      if(!isInactive) continue;
    } else {
      if(isInactive) continue;
      if(currentSocioStatusFilter === "active"  &&  isVencido) continue;
      if(currentSocioStatusFilter === "expired" && !isVencido) continue;
    }

    if(disc && disc !== "all" && (!u.plans || !u.plans.includes(disc))) continue;
    if(search && !u.name.toLowerCase().includes(search) && !id.includes(search)) continue;

    const label = isInactive ? "INACTIVO" : isVencido ? "VENCIDA" : "AL DÍA";
    const color = isInactive ? "#555"     : isVencido ? "#e74c3c" : "#2ecc71";

    cont.innerHTML += `
      <div class="user-item">
        <div>
          <b>${u.name}</b>
          <small style="color:var(--text-tertiary); margin-left:4px;">${u.schedule || "S/H"}</small>
          <br><small>DNI: ${id} &nbsp;·&nbsp; ${u.plans?.join(", ")}</small>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="status-pill" style="background:${color}20; color:${color}; border:1px solid ${color}40;">${label}</span>
          <button onclick="editUser('${id}')"
            style="background:none; border:1px solid var(--border-strong); color:var(--text-secondary);
            padding:5px 10px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.75rem;">Editar</button>
          <button onclick="eliminarAtleta('${id}')"
            style="background:none; border:1px solid var(--danger); color:var(--danger);
            padding:5px 10px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.75rem;">Borrar</button>
        </div>
      </div>`;
  }
}

// ─── GUARDAR ATLETA ───────────────────────────────────────────────────────────
export async function saveUser() {
  const id   = document.getElementById('user-id').value.toLowerCase().trim();
  const name = document.getElementById('user-name').value;
  if(!id || !name) return alert("DNI y Nombre son obligatorios");

  const p = Array.from(document.querySelectorAll('.plan-check:checked')).map(c => c.value);

  if(cacheUsers[id] && editingUserId !== id) {
    const confirmar = confirm(`El DNI ${id} ya está registrado como "${cacheUsers[id].name}".\n\n¿Querés actualizar sus datos?`);
    if(!confirmar) return;
  }

  cacheUsers[id] = {
    ...cacheUsers[id], name, plans: p,
    pass:      document.getElementById('user-pass-admin').value || cacheUsers[id]?.pass || '1234',
    expiry:    document.getElementById('user-expiry').value,
    email:     document.getElementById('user-email').value,
    phone:     document.getElementById('user-phone').value,
    address:   document.getElementById('user-address').value,
    emergency: document.getElementById('user-emergency').value,
    birth:     document.getElementById('user-birth').value,
    schedule:  document.getElementById('user-schedule').value
  };

  await fsSet('users', cacheUsers);
  setEditingUserId(null);
  alert("Atleta guardado.");
  renderUserList();
  renderBirthdays();
}

// ─── EDITAR ATLETA ────────────────────────────────────────────────────────────
export function editUser(id) {
  setEditingUserId(id);
  const u = cacheUsers[id];
  document.getElementById("user-id").value        = id;
  document.getElementById("user-name").value      = u.name;
  document.getElementById("user-pass-admin").value = u.pass;
  document.getElementById("user-expiry").value    = u.expiry    || "";
  document.getElementById("user-email").value     = u.email     || "";
  document.getElementById("user-phone").value     = u.phone     || "";
  document.getElementById("user-address").value   = u.address   || "";
  document.getElementById("user-emergency").value = u.emergency || "";
  document.getElementById("user-birth").value     = u.birth     || "";

  document.querySelectorAll(".plan-check").forEach(c => {
    c.checked = !!(u.plans && u.plans.includes(c.value));
  });
  refreshScheduleUI();
  setTimeout(() => {
    document.getElementById("user-schedule").value = u.schedule || "";
  }, 0);

  document.getElementById("admin-user-history").classList.remove("hidden");
  document.getElementById("history-user-name").textContent = u.name;
  document.getElementById("pay-amount").value = "";
  document.getElementById("pay-obs").value    = "";
  document.getElementById("pay-date").valueAsDate = new Date();
  setTipoPagoSeleccionado('renovacion');
  setTimeout(() => seleccionarTipoPago('renovacion'), 0);

  renderPaymentHistory(u.payments || [], "payment-history-list", true);
  document.querySelector('#tab-users .admin-section')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── ELIMINAR ATLETA ──────────────────────────────────────────────────────────
export async function eliminarAtleta(id) {
  const u = cacheUsers[id];
  if(!confirm(`¿Eliminar a ${u.name}?\n\nEsta acción no se puede deshacer.`)) return;
  delete cacheUsers[id];
  await fsSet('users', cacheUsers);
  renderUserList();
  renderVencimientos();
  alert('Atleta eliminado.');
}

// ─── PAGOS ────────────────────────────────────────────────────────────────────
export async function addPaymentRecord() {
  const amount   = document.getElementById('pay-amount').value;
  const obs      = document.getElementById('pay-obs').value;
  const date     = document.getElementById('pay-date').value;
  const method   = document.getElementById('pay-method').value;
  const nuevoVenc = document.getElementById('pay-nuevo-venc').value;

  if(!amount || !editingUserId || !date) return alert("Ingrese monto y fecha.");
  if(!nuevoVenc) return alert("Calculá el nuevo vencimiento seleccionando el tipo de pago.");

  if(!cacheUsers[editingUserId].payments) cacheUsers[editingUserId].payments = [];

  const parts = date.split('-');
  cacheUsers[editingUserId].payments.push({
    id:     Date.now(),
    date:   `${parts[2]}/${parts[1]}/${parts[0]}`,
    amount, method,
    obs:    obs || "S/O",
    tipo:   tipoPagoSeleccionado
  });

  cacheUsers[editingUserId].expiry = nuevoVenc;
  await fsSet('users', cacheUsers);

  document.getElementById('pay-amount').value      = '';
  document.getElementById('pay-obs').value         = '';
  document.getElementById('pay-nuevo-venc').value  = '';
  setTipoPagoSeleccionado('renovacion');

  renderPaymentHistory(cacheUsers[editingUserId].payments, 'payment-history-list', true);
  renderUserList();
  renderVencimientos();
  alert("Pago registrado. Nuevo vencimiento: " + nuevoVenc.split('-').reverse().join('/'));
}

export function renderPaymentHistory(payments, containerId, canDelete = false) {
  const cont = document.getElementById(containerId);
  if(!cont) return;
  cont.innerHTML = payments && payments.length > 0
    ? ""
    : '<small style="color:var(--muted)">Sin pagos registrados.</small>';

  if(payments) {
    payments.slice().reverse().forEach(p => {
      cont.innerHTML += `
        <div class="payment-row">
          <div>
            <span style="color:var(--accent); font-weight:600; font-size:0.82rem;">${p.date}</span>
            &nbsp;·&nbsp;
            <b style="color:#2ecc71;">$${p.amount}</b>
            <br><small style="color:var(--text-tertiary);">${p.method} · ${p.obs}</small>
          </div>
          ${canDelete
            ? `<button onclick="deletePayment(${p.id})"
                style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem; padding:4px 8px;">✕</button>`
            : ""}
        </div>`;
    });
  }
}

export async function deletePayment(payId) {
  if(!confirm("¿Eliminar este pago?")) return;
  cacheUsers[editingUserId].payments = cacheUsers[editingUserId].payments.filter(
    p => p.id !== payId
  );
  await fsSet('users', cacheUsers);
  renderPaymentHistory(cacheUsers[editingUserId].payments, "payment-history-list", true);
}

// ─── SCHEDULE UI ──────────────────────────────────────────────────────────────
export function refreshScheduleUI() {
  const selectedPlans = Array.from(
    document.querySelectorAll(".plan-check:checked")
  ).map(c => c.value);
  const select = document.getElementById("user-schedule");
  const oldVal = select.value;
  select.innerHTML = '<option value="">-- Seleccionar Horario --</option>';
  let combined = [];
  selectedPlans.forEach(p => {
    if(SCHEDULES[p]) combined = [...combined, ...SCHEDULES[p]];
  });
  [...new Set(combined)].forEach(h => {
    const opt = document.createElement("option");
    opt.value = h;
    opt.textContent = h;
    select.appendChild(opt);
  });
  select.value = oldVal;
}

// ─── CUMPLEAÑOS ───────────────────────────────────────────────────────────────
export function renderBirthdays() {
  const cont = document.getElementById("info-birthday-list");
  if(!cont) return;
  const mesHoy = new Date().getMonth();
  cont.innerHTML = '';

  const cumples = [];
  for(let id in cacheUsers) {
    const u = cacheUsers[id];
    if(u.birth) {
      const fb = new Date(u.birth + "T00:00:00");
      if(fb.getMonth() === mesHoy)
        cumples.push({ name: u.name, dia: fb.getDate() });
    }
  }

  if(!cumples.length) {
    cont.innerHTML = "<small style='color:var(--text-tertiary)'>No hay cumpleaños este mes.</small>";
    return;
  }

  cumples.sort((a, b) => a.dia - b.dia);
  cumples.forEach(c => {
    cont.innerHTML += `<span class="birthday-chip"> ${c.name.split(' ')[0]} (${c.dia})</span>`;
  });
}

// ─── EXPORTAR ATLETAS ─────────────────────────────────────────────────────────
export function exportAtletas(formato) {
  const users = cacheUsers || {};
  const hoy   = new Date(); hoy.setHours(0,0,0,0);

  const filtroActivo = currentSocioStatusFilter;
  const discFiltro   = document.getElementById('filter-discipline').value;
  const busqueda     = document.getElementById('user-search').value.toLowerCase();
  const filas        = [];

  for(let id in users) {
    if(id === 'coach') continue;
    const u  = users[id];
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    const isVencido  = fv && fv < hoy;
    const diff       = fv ? (hoy - fv) / (1000*60*60*24) : 0;
    const isInactivo = diff >= 60;

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
      'Nombre':      u.name      || '',
      'Teléfono':    u.phone     || '',
      'Email':       u.email     || '',
      'Disciplinas': u.plans?.join(', ') || '',
      'Horario':     u.schedule  || '',
      'Vencimiento': u.expiry    || 'S/D',
      'Estado':      isVencido   ? 'VENCIDA' : 'AL DÍA',
    });
  }

  if(!filas.length) return alert("No hay atletas con el filtro actual.");

  const titulos = { all:'Todos los Atletas', active:'Atletas al Día', expired:'Cuotas Vencidas', inactive:'Atletas Inactivos' };
  const colores = { all:'#888', active:'#C8F135', expired:'#FF4545', inactive:'#555' };
  const titulo  = titulos[filtroActivo] || 'Atletas';
  const color   = colores[filtroActivo] || '#C8F135';
  const fecha   = new Date().toLocaleDateString('es-AR');

  if(formato === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filas);
    ws['!cols'] = [14,28,14,28,20,14,14,10].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, titulo);
    XLSX.writeFile(wb, `legion_${filtroActivo}.xlsx`);
  } else {
    const cols = Object.keys(filas[0]);
    const colorTextoHeader = filtroActivo === 'active' ? '#000' : '#fff';
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      body { margin:32px; font-family:Arial,sans-serif; color:#111; }
      h1 { font-size:22px; font-weight:900; letter-spacing:3px; margin:0; }
      .sub { font-size:11px; color:#666; margin-top:3px; }
      .fecha { font-size:10px; color:#999; }
      .header-wrap { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid ${color}; padding-bottom:12px; margin-bottom:20px; }
      h2 { font-size:13px; letter-spacing:2px; text-transform:uppercase; color:${color === '#C8F135' ? '#555' : color}; margin:0 0 10px; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      thead tr { background:${color}; color:${colorTextoHeader}; }
      th { padding:7px 10px; text-align:left; }
      td { padding:6px 10px; border-bottom:1px solid #eee; }
      tr:nth-child(even) td { background:#f9f9f9; }
    </style></head><body>
      <div class="header-wrap">
        <div><h1>LEGION BOX</h1><div class="sub">Centro de Entrenamiento · Formosa Capital</div></div>
        <div class="fecha">Generado el ${fecha}</div>
      </div>
      <h2>${titulo} — ${filas.length} atletas</h2>
      <table>
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${filas.map(f => `<tr>${cols.map(c => `<td>${f[c]}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>`;

    const blob = new Blob([html], { type:'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `legion_${filtroActivo}.html`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Se descargó el archivo HTML. Abrilo en el navegador y usá Ctrl+P para imprimir/guardar como PDF.');
  }
}

// ─── VENCIMIENTOS ─────────────────────────────────────────────────────────────
export function renderVencimientos() {
  const panel = document.getElementById('vencimientos-panel');
  const cont  = document.getElementById('vencimientos-proximos');
  if(!panel || !cont) return;

  const hoy   = new Date(); hoy.setHours(0,0,0,0);
  const en7   = new Date(hoy); en7.setDate(hoy.getDate() + 7);
  const hace7 = new Date(hoy); hace7.setDate(hoy.getDate() - 7);

  const proximos  = [];
  const vencidos  = [];
  const hoyVencen = [];

  for(let id in cacheUsers) {
    const u = cacheUsers[id];
    if(!u.expiry) continue;
    const fv   = new Date(u.expiry + 'T00:00:00');
    const diff = Math.round((fv - hoy) / (1000*60*60*24));
    if(diff === 0)            hoyVencen.push({ id, name:u.name, expiry:u.expiry, diff });
    else if(diff > 0 && diff <= 7)  proximos.push({ id, name:u.name, expiry:u.expiry, diff });
    else if(diff < 0 && diff >= -7) vencidos.push({ id, name:u.name, expiry:u.expiry, diff });
  }

  const total = hoyVencen.length + proximos.length + vencidos.length;
  if(!total) { panel.classList.add('hidden'); return; }

  panel.classList.remove('hidden');
  if(hoyVencen.length) enviarNotificacion('vencimiento');
  cont.innerHTML = '';

  const fila = (a, color, texto) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border);">
      <div>
        <b style="font-size:0.88rem;">${a.name}</b>
        <small style="color:var(--text-tertiary); margin-left:6px;">DNI: ${a.id}</small>
      </div>
      <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700;
        letter-spacing:1px; color:${color}; white-space:nowrap;">${texto}</span>
    </div>`;

  if(hoyVencen.length) {
    cont.innerHTML += `<p style="font-size:0.68rem; font-weight:700; letter-spacing:2px; color:var(--danger); margin:8px 0 4px; text-transform:uppercase;">Vence Hoy</p>`;
    hoyVencen.forEach(a => cont.innerHTML += fila(a, 'var(--danger)', 'HOY'));
  }
  if(proximos.length) {
    cont.innerHTML += `<p style="font-size:0.68rem; font-weight:700; letter-spacing:2px; color:var(--warning); margin:12px 0 4px; text-transform:uppercase;">Próximos 7 días</p>`;
    proximos.sort((a,b) => a.diff - b.diff);
    proximos.forEach(a => cont.innerHTML += fila(a, 'var(--warning)', `en ${a.diff} día${a.diff !== 1 ? 's' : ''}`));
  }
  if(vencidos.length) {
    cont.innerHTML += `<p style="font-size:0.68rem; font-weight:700; letter-spacing:2px; color:#e74c3c; margin:12px 0 4px; text-transform:uppercase;">Vencidos Recientemente</p>`;
    vencidos.sort((a,b) => a.diff - b.diff);
    vencidos.forEach(a => cont.innerHTML += fila(a, '#e74c3c', `hace ${Math.abs(a.diff)} día${Math.abs(a.diff) !== 1 ? 's' : ''}`));
  }
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.setSocioFilter    = setSocioFilter;
window.saveUser          = saveUser;
window.editUser          = editUser;
window.eliminarAtleta    = eliminarAtleta;
window.addPaymentRecord  = addPaymentRecord;
window.deletePayment     = deletePayment;
window.refreshScheduleUI = refreshScheduleUI;
window.exportAtletas     = exportAtletas;
window.renderUserList    = renderUserList;
window.renderVencimientos = renderVencimientos;
window.renderBirthdays   = renderBirthdays;