// ─── js/atletas.js ────────────────────────────────────────────────────────────
import {
  fsSet,
  cacheUsers, setCacheUsers,
  SCHEDULES
} from './firebase.js';

import { currentSocioStatusFilter, setCurrentSocioStatusFilter, editingUserId, setEditingUserId, tipoPagoSeleccionado, setTipoPagoSeleccionado } from './main.js';

// ─── HELPER INICIALES ─────────────────────────────────────────────────────────
function iniciales(nombre) {
  if (!nombre) return '?';
  return nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── FILTRO ───────────────────────────────────────────────────────────────────
export function setSocioFilter(f, btn) {
  setCurrentSocioStatusFilter(f);
  document.querySelectorAll(".filter-bar .day-btn")
    .forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderUserList();
}

// ─── LISTA DE ATLETAS (ACORDEÓN) ──────────────────────────────────────────────
export function renderUserList() {
  const users  = cacheUsers || {};
  const cont   = document.getElementById("user-list-container");
  if (!cont) return;
  const search = document.getElementById("user-search").value.toLowerCase();
  const disc   = document.getElementById("filter-discipline").value;
  cont.innerHTML = "";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const idsOrdenados = Object.keys(users)
    .filter(id => id !== 'coach')
    .sort((a, b) => (users[a].name || '').localeCompare(users[b].name || '', 'es'));

  for (const id of idsOrdenados) {
    const u  = users[id];
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    const isVencido  = fv && fv < hoy;
    const diff       = fv ? (hoy - fv) / (1000*60*60*24) : 0;
    const isInactive = diff >= 60;

    if (currentSocioStatusFilter === "inactive") {
      if (!isInactive) continue;
    } else {
      if (isInactive) continue;
      if (currentSocioStatusFilter === "active"  &&  isVencido) continue;
      if (currentSocioStatusFilter === "expired" && !isVencido) continue;
    }

    if (disc && disc !== "all" && (!u.plans || !u.plans.includes(disc))) continue;
    if (search && !u.name.toLowerCase().includes(search) && !id.includes(search)) continue;

    const label = isInactive ? "INACTIVO" : isVencido ? "VENCIDA" : "AL DÍA";
    const color = isInactive ? "var(--text-tertiary)" : isVencido ? "var(--danger)" : "var(--accent)";

    let vencCorto = "—";
    if (fv) {
      const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      vencCorto = `${fv.getDate()} ${meses[fv.getMonth()]}`;
    }

    const pagos = u.payments || [];
    const ultimoPago = pagos.length ? pagos[pagos.length - 1] : null;

    // ── WhatsApp ──────────────────────────────────────────────────────────────
    const tel = (u.phone || '').replace(/\D/g, '');
    const fechaVenc = u.expiry ? u.expiry.split('-').reverse().join('/') : '';
    const nombre1 = u.name.split(' ')[0];
    const diasParaVencer = fv ? Math.round((fv - hoy) / (1000*60*60*24)) : null;
    let msgWsp = '';
    if (isInactive || isVencido) {
      msgWsp = `Hola ${nombre1}! Tu cuota venció el ${fechaVenc}, comunicate con el coach. Si tuviste algún problema o necesitás que veamos algo, escribinos. ¡Queremos verte pronto por acá! y ponete al día para seguir entrenando. @legion.box`;
    } else if (diasParaVencer !== null && diasParaVencer <= 7) {
      msgWsp = `Hola ${nombre1}, como estás? Tu cuota vence el ${fechaVenc}, no lo dejes pasar y seguí entrenando con nosotros. Saludos @legion.box`;
    } else {
      msgWsp = `Hola ${nombre1}, como estás? Queríamos avisarte que [mensaje de aviso]. Saludos @legion.box`;
    }
    const urlWsp = tel ? `https://wa.me/54${tel}?text=${encodeURIComponent(msgWsp)}` : '';

    cont.innerHTML += `
      <div class="atleta-acordeon" id="atleta-${id}">

        <div class="atleta-header" onclick="toggleAtleta('${id}')">
          <div class="atleta-header-izq">
            <div class="atleta-iniciales">${iniciales(u.name)}</div>
            <div>
              <div class="atleta-nombre-header">${u.name}</div>
              <div class="atleta-meta-header">DNI: ${id} &nbsp;·&nbsp; ${u.schedule || "S/H"}</div>
            </div>
          </div>
          <div class="atleta-header-der">
            <span class="status-pill" style="background:${color}20; color:${color}; border:1px solid ${color}40; font-size:0.65rem;">${label}</span>
            <span style="font-size:0.72rem; color:var(--text-tertiary); white-space:nowrap;">${vencCorto}</span>
            <span class="atleta-chevron" id="chev-${id}">▼</span>
          </div>
        </div>

        <div class="atleta-body accordion-body" id="body-${id}">

          <div class="atleta-tabs">
            <button class="atleta-tab active" id="tab-info-${id}"
              onclick="switchAtletaTab('${id}','info')">INFO</button>
            <button class="atleta-tab" id="tab-pagos-${id}"
              onclick="switchAtletaTab('${id}','pagos')">PAGOS</button>
          </div>

          <div id="panel-info-${id}" class="atleta-panel">
            <div class="atleta-data-grid">
              <div class="atleta-dato">
                <span class="atleta-dato-label">Estado</span>
                <span class="atleta-dato-val" style="color:${color};">${label}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Vencimiento</span>
                <span class="atleta-dato-val">${u.expiry ? u.expiry.split('-').reverse().join('/') : '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Último pago</span>
                <span class="atleta-dato-val">${ultimoPago ? `$${ultimoPago.amount} · ${ultimoPago.date}` : '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Planes</span>
                <span class="atleta-dato-val">${u.plans?.join(", ") || '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Horario</span>
                <span class="atleta-dato-val">${u.schedule || '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Teléfono</span>
                <span class="atleta-dato-val">${u.phone || '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Email</span>
                <span class="atleta-dato-val">${u.email || '—'}</span>
              </div>
              <div class="atleta-dato atleta-dato-full">
                <span class="atleta-dato-label">Dirección</span>
                <span class="atleta-dato-val">${u.address || '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Emergencia</span>
                <span class="atleta-dato-val">${u.emergency || '—'}</span>
              </div>
              <div class="atleta-dato">
                <span class="atleta-dato-label">Nacimiento</span>
                <span class="atleta-dato-val">${u.birth ? u.birth.split('-').reverse().join('/') : '—'}</span>
              </div>
            </div>
            <div style="display:flex; gap:8px; margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
              <button class="btn-save" onclick="abrirDrawerAtleta('${id}')"
                style="flex:1; background:none; border:1px solid #fff; color:#fff; font-size:0.75rem;">
                EDITAR
              </button>
              <button class="btn-save" onclick="eliminarAtleta('${id}')"
                style="flex:1; background:none; border:1px solid var(--danger); color:var(--danger); font-size:0.75rem;">
                BORRAR
              </button>
              ${urlWsp
                ? `<a href="${urlWsp}" target="_blank"
                    style="flex:1; display:flex; align-items:center; justify-content:center; gap:4px;
                    background:none; border:1px solid #25D366; color:#25D366;
                    border-radius:var(--radius-sm); font-size:0.75rem; font-weight:700;
                    font-family:'Barlow Condensed',sans-serif; letter-spacing:1px;
                    padding:7px; text-decoration:none; cursor:pointer;">
                    WhatsApp
                  </a>`
                : `<button class="btn-save" disabled
                    style="flex:1; background:none; border:1px solid var(--border);
                    color:var(--text-tertiary); font-size:0.75rem; opacity:0.4; cursor:not-allowed;">
                    WhatsApp
                  </button>`
              }
            </div>
          </div>

          <div id="panel-pagos-${id}" class="atleta-panel" style="display:none;">
            <div class="pago-mini-header" onclick="togglePagoPanel('${id}')">
              <span style="font-size:0.72rem; font-weight:700; letter-spacing:1.5px;
                color:var(--warning); font-family:'Barlow Condensed',sans-serif;">
                REGISTRAR PAGO
              </span>
              <span id="chev-pago-${id}" style="font-size:0.72rem; color:var(--text-tertiary);">▼</span>
            </div>

            <div class="accordion-body" id="pago-body-${id}">
              <div style="padding-top:14px; display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="form-row">
                  <label>Fecha</label>
                  <input type="date" id="pay-date-${id}" />
                </div>
                <div class="form-row">
                  <label>Método</label>
                  <select id="pay-method-${id}">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mixto">Mixto</option>
                  </select>
                </div>
                <div class="form-row">
                  <label>Monto $</label>
                  <input type="number" id="pay-amount-${id}" placeholder="8500" />
                </div>
                <div class="form-row">
                  <label>Observación</label>
                  <input type="text" id="pay-obs-${id}" placeholder="Opcional" />
                </div>
              </div>
              <div class="form-row">
                <label>Tipo de Pago</label>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;">
                  <button id="pay-tipo-renovacion-${id}"
                    onclick="seleccionarTipoPagoAtleta('${id}','renovacion')"
                    class="btn-save tipo-pago-btn tipo-activo">RENOVACIÓN</button>
                  <button id="pay-tipo-reincorporacion-${id}"
                    onclick="seleccionarTipoPagoAtleta('${id}','reincorporacion')"
                    class="btn-save tipo-pago-btn">REINCORPORACIÓN</button>
                </div>
              </div>
              <div class="form-row">
                <label>Nuevo Vencimiento</label>
                <input type="date" id="pay-nuevo-venc-${id}" disabled style="opacity:0.6;" />
              </div>
              <button class="btn-save" onclick="guardarPagoAtleta('${id}')"
                style="width:100%; margin-top:8px; background:var(--warning); color:#000;">
                GUARDAR PAGO
              </button>
            </div>

            <div style="margin-top:16px;">
              <div style="font-size:0.68rem; font-weight:700; letter-spacing:2px;
                color:var(--text-tertiary); text-transform:uppercase; margin-bottom:10px;">
                Historial
              </div>
              <div id="historial-pagos-${id}"
                style="max-height:220px; overflow-y:auto; background:var(--surface);
                border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 14px;">
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }
}

// ─── TOGGLE ACORDEÓN ──────────────────────────────────────────────────────────
export function toggleAtleta(id) {
  const body = document.getElementById(`body-${id}`);
  const chev = document.getElementById(`chev-${id}`);
  const item = document.getElementById(`atleta-${id}`);
  const estaAbierto = body.classList.contains('open');

  document.querySelectorAll('.atleta-body.open').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.atleta-chevron.open').forEach(c => c.classList.remove('open'));
  document.querySelectorAll('.atleta-acordeon.abierto').forEach(a => a.classList.remove('abierto'));

  if (!estaAbierto) {
    body.classList.add('open');
    chev.classList.add('open');
    item.classList.add('abierto');
    setEditingUserId(id);
    const u = cacheUsers[id];
    renderHistorialPagosInline(id, u.payments || []);
    const dateInput = document.getElementById(`pay-date-${id}`);
    if (dateInput) dateInput.valueAsDate = new Date();
    seleccionarTipoPagoAtleta(id, 'renovacion');
  }
}

// ─── TABS INFO / PAGOS ────────────────────────────────────────────────────────
export function switchAtletaTab(id, tab) {
  document.getElementById(`panel-info-${id}`).style.display  = tab === 'info'  ? '' : 'none';
  document.getElementById(`panel-pagos-${id}`).style.display = tab === 'pagos' ? '' : 'none';
  document.getElementById(`tab-info-${id}`).classList.toggle('active',  tab === 'info');
  document.getElementById(`tab-pagos-${id}`).classList.toggle('active', tab === 'pagos');
  if (tab === 'pagos') setEditingUserId(id);
}

// ─── TOGGLE MINI-PANEL PAGO ───────────────────────────────────────────────────
export function togglePagoPanel(id) {
  const body = document.getElementById(`pago-body-${id}`);
  const chev = document.getElementById(`chev-pago-${id}`);
  body.classList.toggle('open');
  chev.classList.toggle('open');
}

// ─── TIPO DE PAGO POR ATLETA ──────────────────────────────────────────────────
export function seleccionarTipoPagoAtleta(id, tipo) {
  setTipoPagoSeleccionado(tipo);
  const btnRen   = document.getElementById(`pay-tipo-renovacion-${id}`);
  const btnReinc = document.getElementById(`pay-tipo-reincorporacion-${id}`);
  if (!btnRen || !btnReinc) return;

  if (tipo === 'renovacion') {
    btnRen.classList.add('tipo-activo');
    btnReinc.classList.remove('tipo-activo');
  } else {
    btnReinc.classList.add('tipo-activo');
    btnRen.classList.remove('tipo-activo');
  }

  const u = cacheUsers[id];
  if (!u) return;
  const base = u.expiry && tipo === 'renovacion'
    ? new Date(u.expiry + 'T00:00:00')
    : new Date();
  if (tipo === 'reincorporacion') base.setHours(0,0,0,0);
  base.setMonth(base.getMonth() + 1);
  const yyyy = base.getFullYear();
  const mm   = String(base.getMonth() + 1).padStart(2, '0');
  const dd   = String(base.getDate()).padStart(2, '0');
  const inputVenc = document.getElementById(`pay-nuevo-venc-${id}`);
  if (inputVenc) inputVenc.value = `${yyyy}-${mm}-${dd}`;
}

// ─── GUARDAR PAGO INLINE ──────────────────────────────────────────────────────
export async function guardarPagoAtleta(id) {
  const amount    = document.getElementById(`pay-amount-${id}`).value;
  const obs       = document.getElementById(`pay-obs-${id}`).value;
  const date      = document.getElementById(`pay-date-${id}`).value;
  const method    = document.getElementById(`pay-method-${id}`).value;
  const nuevoVenc = document.getElementById(`pay-nuevo-venc-${id}`).value;

  if (!amount || !date)  return alert("Ingresá monto y fecha.");
  if (!nuevoVenc)        return alert("Calculá el nuevo vencimiento seleccionando el tipo de pago.");

  setEditingUserId(id);
  if (!cacheUsers[id].payments) cacheUsers[id].payments = [];

  const parts = date.split('-');
  cacheUsers[id].payments.push({
    id:     Date.now(),
    date:   `${parts[2]}/${parts[1]}/${parts[0]}`,
    amount, method,
    obs:    obs || "S/O",
    tipo:   tipoPagoSeleccionado
  });

  cacheUsers[id].expiry = nuevoVenc;
  await fsSet('users', cacheUsers);

  document.getElementById(`pay-amount-${id}`).value = '';
  document.getElementById(`pay-obs-${id}`).value    = '';

  renderHistorialPagosInline(id, cacheUsers[id].payments);
  renderUserList();
  renderVencimientos();
  alert("Pago registrado. Nuevo vencimiento: " + nuevoVenc.split('-').reverse().join('/'));
}

// ─── HISTORIAL DE PAGOS INLINE ────────────────────────────────────────────────
export function renderHistorialPagosInline(id, payments) {
  const cont = document.getElementById(`historial-pagos-${id}`);
  if (!cont) return;
  if (!payments || !payments.length) {
    cont.innerHTML = '<small style="color:var(--text-tertiary)">Sin pagos registrados.</small>';
    return;
  }
  cont.innerHTML = payments.slice().reverse().map(p => `
    <div class="payment-row">
      <div>
        <span style="color:var(--accent); font-weight:600; font-size:0.82rem;">${p.date}</span>
        &nbsp;·&nbsp;
        <b style="color:#2ecc71;">$${p.amount}</b>
        <br><small style="color:var(--text-tertiary);">${p.method} · ${p.obs}</small>
      </div>
      <button onclick="deletePaymentInline('${id}', ${p.id})"
        style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem; padding:4px 8px;">✕</button>
    </div>
  `).join('');
}

// ─── ELIMINAR PAGO INLINE ─────────────────────────────────────────────────────
export async function deletePaymentInline(atletaId, payId) {
  if (!confirm("¿Eliminar este pago?")) return;
  cacheUsers[atletaId].payments = cacheUsers[atletaId].payments.filter(p => p.id !== payId);
  await fsSet('users', cacheUsers);
  renderHistorialPagosInline(atletaId, cacheUsers[atletaId].payments);
}

// ─── DRAWER NUEVO / EDITAR ────────────────────────────────────────────────────
export function abrirDrawerAtleta(id) {
  const overlay = document.getElementById('drawer-overlay');
  const drawer  = document.getElementById('drawer-atleta');
  const titulo  = document.getElementById('drawer-titulo');

  if (id) {
    setEditingUserId(id);
    titulo.textContent = 'EDITAR ATLETA';
    const u = cacheUsers[id];
    document.getElementById("user-id").value         = id;
    document.getElementById("user-id").disabled      = true;
    document.getElementById("user-name").value       = u.name;
    document.getElementById("user-pass-admin").value = u.pass || '';
    document.getElementById("user-expiry").value     = u.expiry    || '';
    document.getElementById("user-email").value      = u.email     || '';
    document.getElementById("user-phone").value      = u.phone     || '';
    document.getElementById("user-address").value    = u.address   || '';
    document.getElementById("user-emergency").value  = u.emergency || '';
    document.getElementById("user-birth").value      = u.birth     || '';
    document.querySelectorAll(".plan-check").forEach(c => {
      c.checked = !!(u.plans && u.plans.includes(c.value));
    });
    refreshScheduleUI();
    setTimeout(() => { document.getElementById("user-schedule").value = u.schedule || ''; }, 0);
  } else {
    setEditingUserId(null);
    titulo.textContent = 'NUEVO ATLETA';
    document.getElementById("user-id").value         = '';
    document.getElementById("user-id").disabled      = false;
    document.getElementById("user-name").value       = '';
    document.getElementById("user-pass-admin").value = '';
    document.getElementById("user-expiry").value     = '';
    document.getElementById("user-email").value      = '';
    document.getElementById("user-phone").value      = '';
    document.getElementById("user-address").value    = '';
    document.getElementById("user-emergency").value  = '';
    document.getElementById("user-birth").value      = '';
    document.querySelectorAll(".plan-check").forEach(c => c.checked = false);
    refreshScheduleUI();
  }

  overlay.style.display = 'block';
  drawer.style.display  = 'block';
  document.body.style.overflow = 'hidden';
}

export function cerrarDrawerAtleta() {
  document.getElementById('drawer-overlay').style.display = 'none';
  document.getElementById('drawer-atleta').style.display  = 'none';
  document.body.style.overflow = '';
  setEditingUserId(null);
}

// ─── GUARDAR ATLETA ───────────────────────────────────────────────────────────
export async function saveUser() {
  const id   = document.getElementById('user-id').value.toLowerCase().trim();
  const name = document.getElementById('user-name').value;
  if (!id || !name) return alert("DNI y Nombre son obligatorios");

  const p = Array.from(document.querySelectorAll('.plan-check:checked')).map(c => c.value);

  if (cacheUsers[id] && editingUserId !== id) {
    const confirmar = confirm(`El DNI ${id} ya está registrado como "${cacheUsers[id].name}".\n\n¿Querés actualizar sus datos?`);
    if (!confirmar) return;
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
  cerrarDrawerAtleta();
  renderUserList();
  renderBirthdays();
}

// ─── EDITAR ATLETA (compat) ───────────────────────────────────────────────────
export function editUser(id) {
  abrirDrawerAtleta(id);
}

// ─── ELIMINAR ATLETA ──────────────────────────────────────────────────────────
export async function eliminarAtleta(id) {
  const u = cacheUsers[id];
  if (!confirm(`¿Eliminar a ${u.name}?\n\nEsta acción no se puede deshacer.`)) return;
  delete cacheUsers[id];
  await fsSet('users', cacheUsers);
  renderUserList();
  renderVencimientos();
  alert('Atleta eliminado.');
}

// ─── PAGOS (compat con flujo viejo) ──────────────────────────────────────────
export async function addPaymentRecord() {
  const amount    = document.getElementById('pay-amount').value;
  const obs       = document.getElementById('pay-obs').value;
  const date      = document.getElementById('pay-date').value;
  const method    = document.getElementById('pay-method').value;
  const nuevoVenc = document.getElementById('pay-nuevo-venc').value;

  if (!amount || !editingUserId || !date) return alert("Ingrese monto y fecha.");
  if (!nuevoVenc) return alert("Calculá el nuevo vencimiento seleccionando el tipo de pago.");

  if (!cacheUsers[editingUserId].payments) cacheUsers[editingUserId].payments = [];

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
  if (!cont) return;
  cont.innerHTML = payments && payments.length > 0
    ? ""
    : '<small style="color:var(--muted)">Sin pagos registrados.</small>';

  if (payments) {
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
  if (!confirm("¿Eliminar este pago?")) return;
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
    if (SCHEDULES[p]) combined = [...combined, ...SCHEDULES[p]];
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
  if (!cont) return;
  const mesHoy = new Date().getMonth();
  cont.innerHTML = '';

  const cumples = [];
  for (let id in cacheUsers) {
    const u = cacheUsers[id];
    if (u.birth) {
      const fb = new Date(u.birth + "T00:00:00");
      if (fb.getMonth() === mesHoy)
        cumples.push({ name: u.name, dia: fb.getDate(), schedule: u.schedule || '—' });
    }
  }

  if (!cumples.length) {
    cont.innerHTML = "<small style='color:var(--text-tertiary)'>No hay cumpleaños este mes.</small>";
    return;
  }

  cumples.sort((a, b) => a.dia - b.dia);
  cont.style.display = 'flex';
  cont.style.flexDirection = 'column';
  cont.style.gap = '0';

cumples.forEach(c => {
  cont.innerHTML += `
    <div style="display:flex; justify-content:space-between; align-items:center;
      padding:10px 0; border-bottom:1px solid var(--border);">
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span style="font-size:0.88rem; font-weight:600;"> ${c.name}</span>
        <small style="color:var(--text-tertiary); font-size:0.75rem;">${c.schedule}</small>
      </div>
      <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.82rem;
        font-weight:700; color:var(--accent); letter-spacing:1px; white-space:nowrap;">
        día ${c.dia}
      </span>
    </div>`;
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

  for (let id in users) {
    if (id === 'coach') continue;
    const u  = users[id];
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    const isVencido  = fv && fv < hoy;
    const diff       = fv ? (hoy - fv) / (1000*60*60*24) : 0;
    const isInactivo = diff >= 60;

    if (filtroActivo === 'inactive') { if (!isInactivo) continue; }
    else {
      if (isInactivo) continue;
      if (filtroActivo === 'active'  &&  isVencido) continue;
      if (filtroActivo === 'expired' && !isVencido) continue;
    }
    if (discFiltro !== 'all' && (!u.plans || !u.plans.includes(discFiltro))) continue;
    if (busqueda && !u.name.toLowerCase().includes(busqueda) && !id.includes(busqueda)) continue;

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

  if (!filas.length) return alert("No hay atletas con el filtro actual.");

  const titulos = { all:'Todos los Atletas', active:'Atletas al Día', expired:'Cuotas Vencidas', inactive:'Atletas Inactivos' };
  const colores = { all:'#888', active:'#C8F135', expired:'#FF4545', inactive:'#555' };
  const titulo  = titulos[filtroActivo] || 'Atletas';
  const color   = colores[filtroActivo] || '#C8F135';
  const fecha   = new Date().toLocaleDateString('es-AR');

  if (formato === 'xlsx') {
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
  if (!panel || !cont) return;

  const hoy = new Date(); hoy.setHours(0,0,0,0);

  const proximos  = [];
  const vencidos  = [];
  const hoyVencen = [];

  for (let id in cacheUsers) {
    const u = cacheUsers[id];
    if (!u.expiry) continue;
    const fv   = new Date(u.expiry + 'T00:00:00');
    const diff = Math.round((fv - hoy) / (1000*60*60*24));
    if (diff === 0)                  hoyVencen.push({ id, name:u.name, expiry:u.expiry, diff });
    else if (diff > 0 && diff <= 7)  proximos.push({ id, name:u.name, expiry:u.expiry, diff });
    else if (diff < 0 && diff >= -7) vencidos.push({ id, name:u.name, expiry:u.expiry, diff });
  }

  const total = hoyVencen.length + proximos.length + vencidos.length;
  if (!total) { panel.style.display = 'none'; return; }

  panel.style.display = 'block';
  const badge = document.getElementById('venc-badge');
  if (badge) badge.textContent = total;
  if (hoyVencen.length) enviarNotificacion('vencimiento');
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

  if (hoyVencen.length) {
    cont.innerHTML += `<p style="font-size:0.68rem; font-weight:700; letter-spacing:2px; color:var(--danger); margin:8px 0 4px; text-transform:uppercase;">Vence Hoy</p>`;
    hoyVencen.forEach(a => cont.innerHTML += fila(a, 'var(--danger)', 'HOY'));
  }
  if (proximos.length) {
    cont.innerHTML += `<p style="font-size:0.68rem; font-weight:700; letter-spacing:2px; color:var(--warning); margin:12px 0 4px; text-transform:uppercase;">Próximos 7 días</p>`;
    proximos.sort((a,b) => a.diff - b.diff);
    proximos.forEach(a => cont.innerHTML += fila(a, 'var(--warning)', `en ${a.diff} día${a.diff !== 1 ? 's' : ''}`));
  }
  if (vencidos.length) {
    cont.innerHTML += `<p style="font-size:0.68rem; font-weight:700; letter-spacing:2px; color:#e74c3c; margin:12px 0 4px; text-transform:uppercase;">Vencidos Recientemente</p>`;
    vencidos.sort((a,b) => a.diff - b.diff);
    vencidos.forEach(a => cont.innerHTML += fila(a, '#e74c3c', `hace ${Math.abs(a.diff)} día${Math.abs(a.diff) !== 1 ? 's' : ''}`));
  }
}

// ─── ALERTA DE VENCIMIENTO (ATLETA) ──────────────────────────────────────────
export function verificarVencimientoAtleta(user) {
  const cont = document.getElementById('atleta-vencimiento-alerta');
  if (!cont || !user || user.role === 'coach') {
    cont?.classList.add('hidden');
    return;
  }

  if (!user.expiry) {
    cont.classList.add('hidden');
    return;
  }

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const fv  = new Date(user.expiry + 'T00:00:00');
  const diff = Math.ceil((fv - hoy) / (1000 * 60 * 60 * 24));
  const fechaFormateada = fv.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });

  if (diff > 7) {
    cont.classList.add('hidden');
    return;
  }

  let html = '';
  if (diff < 0) {
    html = `
      <div style="background:var(--card); border:1px solid rgba(255,80,80,0.25);
        padding:12px 16px; border-radius:var(--radius); margin-bottom:12px;
        font-size:0.85rem; color:var(--text-secondary); font-family:'Barlow',sans-serif;">
        ⚠️ Tu cuota venció el <strong style="color:#ff5050;">${fechaFormateada}</strong>.
        Comunicate con el Coach para renovar.
      </div>`;
  } else {
    html = `
      <div style="background:var(--card); border:1px solid rgba(255,255,255,0.1);
        padding:12px 16px; border-radius:var(--radius); margin-bottom:12px;
        font-size:0.85rem; color:var(--text-secondary); font-family:'Barlow',sans-serif;">
        ⏰ Tu cuota está próxima a vencer: <strong>${fechaFormateada}</strong>
        (Quedan <strong>${diff}</strong> día${diff !== 1 ? 's' : ''}).
      </div>`;
  }

  cont.innerHTML = html;
  cont.classList.remove('hidden');
}

window.verificarVencimientoAtleta = verificarVencimientoAtleta;

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
window.toggleAtleta              = toggleAtleta;
window.switchAtletaTab           = switchAtletaTab;
window.togglePagoPanel           = togglePagoPanel;
window.seleccionarTipoPagoAtleta = seleccionarTipoPagoAtleta;
window.guardarPagoAtleta         = guardarPagoAtleta;
window.deletePaymentInline       = deletePaymentInline;
window.abrirDrawerAtleta         = abrirDrawerAtleta;
window.cerrarDrawerAtleta        = cerrarDrawerAtleta;
window.renderHistorialPagosInline = renderHistorialPagosInline;