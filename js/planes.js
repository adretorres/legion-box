// ─── js/planes.js ─────────────────────────────────────────────────────────────
import { fsGet, fsSet, currentUser } from './firebase.js';

// ─── DATOS POR DEFECTO ────────────────────────────────────────────────────────
const PLANES_DEFAULT = [
  {
    id: 'cf5',
    nombre: 'CrossFit',
    frecuencia: 'x5 por semana',
    precio: 45000,
    disciplina: 'crossfit',
    destacado: true,
    beneficios: [
      'Entrenamiento todos los días de la semana',
      'WOD diario programado',
      'Seguimiento de PRs y progreso',
      'Acceso al Open Box los sábados',
      'Mayor velocidad para lograr tus objetivos'
    ]
  },
  {
    id: 'cf3',
    nombre: 'CrossFit',
    frecuencia: 'x3 por semana',
    precio: 40000,
    disciplina: 'crossfit',
    destacado: false,
    beneficios: [
      '3 clases semanales programadas',
      'WOD diario programado',
      'Seguimiento de PRs y progreso'
    ]
  },
  {
    id: 'fn5',
    nombre: 'Funcional',
    frecuencia: 'x5 por semana',
    precio: 40000,
    disciplina: 'funcional',
    destacado: false,
    beneficios: [
      'Entrenamiento todos los días de la semana',
      'Clases funcionales de alta intensidad',
      'Progresión guiada y seguimiento personalizado',
      'Acceso al Open Box los sábados'
    ]
  },
  {
    id: 'fn3',
    nombre: 'Funcional',
    frecuencia: 'x3 por semana',
    precio: 35000,
    disciplina: 'funcional',
    destacado: false,
    beneficios: [
      '3 clases semanales programadas',
      'Clases funcionales de alta intensidad',
      'Progresión guiada'
    ]
  },
  {
    id: 'suelta',
    nombre: 'Clase Individual',
    frecuencia: 'por clase',
    precio: 5000,
    disciplina: 'ambas',
    destacado: false,
    beneficios: [
      'Sin compromiso mensual',
      'Acceso a cualquier disciplina disponible'
    ]
  }
];

// ─── CACHE LOCAL ──────────────────────────────────────────────────────────────
export let cachePlanes = null;

export async function cargarPlanes() {
  const data = await fsGet('planes');
  cachePlanes = data?.lista || PLANES_DEFAULT;
  return cachePlanes;
}

export async function guardarPlanes() {
  await fsSet('planes', { lista: cachePlanes });
}

// ─── RENDER LANDING ───────────────────────────────────────────────────────────
export function renderPlanesLanding() {
  const cont = document.getElementById('lnd-pricing-content');
  if (!cont) return;
  if (!cachePlanes) cachePlanes = PLANES_DEFAULT;

  const planesNormales = cachePlanes.filter(p => p.id !== 'suelta');
  const planSuelta     = cachePlanes.find(p => p.id === 'suelta');

  cont.innerHTML = `
    <div class="lnd-price-grid">
      ${planesNormales.map(p => `
        <div class="lnd-price-card ${p.destacado ? 'lnd-price-card-featured' : ''}">
          ${p.destacado ? '<div class="lnd-price-badge">MÁS POPULAR</div>' : ''}
          <div class="lnd-price-header">
            <span class="lnd-disc-tag">${p.disciplina.toUpperCase()}</span>
            <h3 class="lnd-price-title">${p.nombre}</h3>
            <p class="lnd-price-freq-label">${p.frecuencia}</p>
          </div>
          <div class="lnd-price-amount-wrap">
            <span class="lnd-price-currency">$</span>
            <span class="lnd-price-amount">${Number(p.precio).toLocaleString('es-AR')}</span>
            <span class="lnd-price-period">/mes</span>
          </div>
          <ul class="lnd-price-benefits">
            ${p.beneficios.map(b => `<li><span class="lnd-price-check">✓</span>${b}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
    </div>

    ${planSuelta ? `
    <div class="lnd-price-single-row">
      <div class="lnd-price-single-info">
        <span class="lnd-price-single-label">${planSuelta.nombre}</span>
        <span class="lnd-price-single-sub">${planSuelta.beneficios.join(' · ')}</span>
      </div>
      <div class="lnd-price-single-amount-wrap">
        <span class="lnd-price-currency">$</span>
        <span class="lnd-price-single-amount">${Number(planSuelta.precio).toLocaleString('es-AR')}</span>
        <span class="lnd-price-period">/ clase</span>
      </div>
    </div>` : ''}

    <div class="lnd-price-discounts">
      <div class="lnd-discount-item">
        <span class="lnd-discount-badge">10%</span>
        <div>
          <strong>Plan Familiar</strong>
          <p>Descuento para grupos familiares.</p>
        </div>
      </div>
      <div class="lnd-discount-item">
        <span class="lnd-discount-badge">15%</span>
        <div>
          <strong>Primer Mes</strong>
          <p>Para nuevos atletas de la Legión.</p>
        </div>
      </div>
    </div>

    <div style="text-align:center; margin-top:28px;">
      <a href="https://wa.me/5493704818550" target="_blank" class="lnd-btn-primary" style="text-decoration:none;">
        CONSULTAR POR WHATSAPP
      </a>
    </div>
  `;
}

// ─── RENDER APP — ATLETA (selector de plan) ───────────────────────────────────
export function renderPlanesAtleta(userData) {
  const cont  = document.getElementById('planes-atleta-cont');
  const cotiz = document.getElementById('atleta-cotizacion-cont');
  if (!cont || !cachePlanes) return;

  // ── Cotización personalizada ─────────────────────────────────────────────
  if (cotiz && window.calcularCotizacionSocio && window.TARIFAS) {
    try {
      const plan      = userData?.plans?.[0] || 'crossfit';
      const planKey   = plan + '_x5';
      const precioBase = window.TARIFAS[planKey] || window.TARIFAS.crossfit_x5 || 45000;
      const c = window.calcularCotizacionSocio(
        {
          condicion:      userData?.condicion || 'regular',
          esPlanFamiliar: userData?.esPlanFamiliar || false,
          primerMes:      userData?.primerMes || false,
          primerMesUsado: userData?.primerMesUsado || false,
          expiry:         userData?.expiry || null
        },
        { fechaPago: new Date(), precioBase }
      );
      if (c.alDia) {
        // Membresía al día — mostrar estado y próximo vencimiento
        cotiz.innerHTML =
          '<div style="background:rgba(52,223,69,0.06); border:1px solid rgba(52,223,69,0.2);' +
          'border-radius:var(--radius); padding:16px; margin-bottom:16px; text-align:center;">' +
            '<div style="font-size:1.1rem; margin-bottom:6px;">✅</div>' +
            '<div style="font-size:0.9rem; font-weight:700; color:var(--accent); margin-bottom:4px;">Membresía al día</div>' +
            '<div style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:14px;">' +
              'Próx. vencimiento: ' + c.fechaVencimiento.toLocaleDateString('es-AR') +
            '</div>' +
            '<button onclick="abrirModalNotifPago(0)"' +
            ' style="width:100%; background:var(--surface); color:var(--accent); border:1px solid var(--accent);' +
            'padding:10px; border-radius:var(--radius); cursor:pointer; font-family:Barlow Condensed,sans-serif;' +
            'font-size:0.82rem; font-weight:700; letter-spacing:2px;">ABONAR POR ADELANTADO</button>' +
          '</div>';
      } else {
      const colorMonto = c.recargo > 0 ? '#ff5050' : 'var(--accent)';
      cotiz.innerHTML =
        '<div style="background:var(--surface); border:1px solid var(--border);' +
        'border-radius:var(--radius); padding:16px; margin-bottom:16px;">' +
          '<div style="font-size:0.65rem; font-weight:700; letter-spacing:2px;' +
          'color:var(--accent); margin-bottom:10px; font-family:Barlow Condensed,sans-serif;">COTIZACIÓN HOY</div>' +
          '<div style="display:flex; justify-content:space-between; margin-bottom:6px;">' +
            '<span style="font-size:0.82rem; color:var(--text-secondary);">Precio base</span>' +
            '<span style="font-size:0.9rem;">$' + c.precioBase.toLocaleString('es-AR') + '</span>' +
          '</div>' +
          (c.recargo > 0
            ? '<div style="display:flex; justify-content:space-between; margin-bottom:6px;">' +
              '<span style="font-size:0.82rem; color:#ff5050;">Mora (' + c.diasMora + ' días × $500)</span>' +
              '<span style="font-size:0.9rem; color:#ff5050;">+$' + c.recargo.toLocaleString('es-AR') + '</span>' +
              '</div>'
            : '') +
          '<div style="display:flex; justify-content:space-between; padding-top:8px;' +
          'border-top:1px solid var(--border); margin-top:4px;">' +
            '<span style="font-size:0.85rem; font-weight:700;">TOTAL A ABONAR</span>' +
            '<span style="font-size:1.6rem; font-family:Bebas Neue,sans-serif; color:' + colorMonto + ';">' +
              '$' + c.montoFinal.toLocaleString('es-AR') +
            '</span>' +
          '</div>' +
          (c.detalle ? '<div style="font-size:0.72rem; color:var(--text-tertiary); margin-top:6px;">' + c.detalle + '</div>' : '') +
          '<div style="font-size:0.72rem; color:var(--text-tertiary); margin-top:4px;">' +
            'Próx. venc: ' + c.fechaVencimiento.toLocaleDateString('es-AR') +
          '</div>' +
          '<button onclick="abrirModalNotifPago(' + c.montoFinal + ', null, \"renovacion\")"' +
          ' style="width:100%; margin-top:14px; background:var(--accent); color:#000; border:none;' +
          'padding:11px; border-radius:var(--radius); cursor:pointer; font-family:Barlow Condensed,sans-serif;' +
          'font-size:0.85rem; font-weight:700; letter-spacing:2px;">NOTIFICAR PAGO</button>' +
        '</div>';
      }
    } catch(e) { cotiz.innerHTML = ''; }
  }

  // ── Lista de planes (solo lectura — para referencia) ─────────────────────
  const planesNormales = cachePlanes.filter(p => p.id !== 'suelta');
  cont.innerHTML =
    '<p style="font-size:0.72rem; color:var(--text-secondary); margin-bottom:12px; letter-spacing:0.5px;">' +
    'Planes disponibles — para cambiar de plan consultá al coach.</p>' +
    '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px;">' +
    planesNormales.map(function(p) {
      return '<div style="background:var(--surface); border:1px solid ' +
        (p.destacado ? 'var(--accent)' : 'var(--border)') +
        '; border-radius:var(--radius); padding:12px; text-align:center;">' +
        '<div style="font-size:0.6rem; font-weight:700; letter-spacing:2px; color:var(--accent);">' +
          p.disciplina.toUpperCase() + '</div>' +
        '<div style="font-family:Bebas Neue,sans-serif; font-size:1.2rem; margin:4px 0;">' +
          p.nombre + '</div>' +
        '<div style="font-size:0.7rem; color:var(--text-secondary); margin-bottom:8px;">' +
          p.frecuencia + '</div>' +
        '<div style="font-family:Bebas Neue,sans-serif; font-size:1.4rem; color:var(--accent);">' +
          '$' + Number(p.precio).toLocaleString('es-AR') + '</div>' +
        '</div>';
    }).join('') +
    '</div>';
}

// ─── ELEGIR PLAN (ATLETA) — por ahora registra intención, luego MP ────────────
export function elegirPlan(planId, precio) {
  // Abre el modal de notificación de pago con el plan seleccionado
  abrirModalNotifPago(precio, planId);
}

// ─── RENDER ADMIN (COACH) ─────────────────────────────────────────────────────
export function renderPlanesAdmin() {
  const cont = document.getElementById('planes-admin-cont');
  if (!cont || !cachePlanes) return;

  cont.innerHTML = cachePlanes.map((p, idx) => `
    <div class="plan-admin-card" id="plan-admin-${p.id}">
      <div class="plan-admin-header">
        <div>
          <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.65rem;
            font-weight:700; letter-spacing:2px; color:var(--accent); text-transform:uppercase;">
            ${p.disciplina.toUpperCase()}</span>
          <strong style="display:block; font-size:0.95rem;">${p.nombre} — ${p.frecuencia}</strong>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-family:'Bebas Neue',sans-serif; font-size:1.4rem; color:var(--accent);">
            $${Number(p.precio).toLocaleString('es-AR')}</span>
          <button onclick="editarPlan('${p.id}')"
            style="background:none; border:1px solid var(--border-strong); color:var(--text-secondary);
            padding:4px 10px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.72rem;">
            Editar</button>
          <button onclick="eliminarPlan('${p.id}')"
            style="background:none; border:1px solid var(--danger); color:var(--danger);
            padding:4px 10px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.72rem;">
            Eliminar</button>
        </div>
      </div>
      <ul style="margin:8px 0 0; padding:0 0 0 16px; color:var(--text-secondary); font-size:0.8rem;">
        ${p.beneficios.map(b => `<li>${b}</li>`).join('')}
      </ul>
    </div>
  `).join('') + `
    <button onclick="abrirFormNuevoPlan()"
      style="width:100%; margin-top:12px; background:none; border:1px dashed var(--accent);
      color:var(--accent); padding:12px; border-radius:var(--radius); cursor:pointer;
      font-family:'Barlow Condensed',sans-serif; font-size:0.82rem; font-weight:700; letter-spacing:2px;">
      + AGREGAR NUEVO PLAN
    </button>
  `;
}

// ─── FORMULARIO EDITAR / NUEVO PLAN ──────────────────────────────────────────
export function abrirFormNuevoPlan() {
  abrirFormPlan(null);
}

export function editarPlan(id) {
  const plan = cachePlanes.find(p => p.id === id);
  if (plan) abrirFormPlan(plan);
}

function abrirFormPlan(plan) {
  const esNuevo = !plan;
  const modal   = document.getElementById('modal-plan-editor');
  if (!modal) return;

  document.getElementById('plan-form-titulo').textContent  = esNuevo ? 'Nuevo Plan' : 'Editar Plan';
  document.getElementById('plan-form-id').value           = plan?.id || ('plan_' + Date.now());
  document.getElementById('plan-form-nombre').value       = plan?.nombre || '';
  document.getElementById('plan-form-frecuencia').value   = plan?.frecuencia || '';
  document.getElementById('plan-form-precio').value       = plan?.precio || '';
  document.getElementById('plan-form-disciplina').value   = plan?.disciplina || 'crossfit';
  document.getElementById('plan-form-destacado').checked  = plan?.destacado || false;
  document.getElementById('plan-form-beneficios').value   = plan?.beneficios?.join('\n') || '';

  modal.classList.remove('hidden');
}

export function cerrarFormPlan() {
  document.getElementById('modal-plan-editor')?.classList.add('hidden');
}

export async function guardarFormPlan() {
  const id          = document.getElementById('plan-form-id').value.trim();
  const nombre      = document.getElementById('plan-form-nombre').value.trim();
  const frecuencia  = document.getElementById('plan-form-frecuencia').value.trim();
  const precio      = parseFloat(document.getElementById('plan-form-precio').value);
  const disciplina  = document.getElementById('plan-form-disciplina').value;
  const destacado   = document.getElementById('plan-form-destacado').checked;
  const beneficios  = document.getElementById('plan-form-beneficios').value
    .split('\n').map(b => b.trim()).filter(Boolean);

  if (!nombre || !frecuencia || !precio) return alert('Completá todos los campos obligatorios.');

  const idx = cachePlanes.findIndex(p => p.id === id);
  const nuevoPlan = { id, nombre, frecuencia, precio, disciplina, destacado, beneficios };

  if (idx >= 0) cachePlanes[idx] = nuevoPlan;
  else cachePlanes.push(nuevoPlan);

  await guardarPlanes();
  cerrarFormPlan();
  renderPlanesAdmin();
  renderPlanesLanding();
  alert('Plan guardado.');
}

export async function eliminarPlan(id) {
  const plan = cachePlanes.find(p => p.id === id);
  if (!confirm(`¿Eliminar el plan "${plan?.nombre} — ${plan?.frecuencia}"?`)) return;
  cachePlanes = cachePlanes.filter(p => p.id !== id);
  await guardarPlanes();
  renderPlanesAdmin();
  renderPlanesLanding();
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
// ─── RENDER INFO BOX (APP) ───────────────────────────────────────────────────
export function renderPlanesInfoBox() {
  const cont = document.getElementById('planes-info-cont');
  if (!cont) return;
  if (!cachePlanes) cachePlanes = PLANES_DEFAULT;

  const esCoach        = currentUser?.role === 'coach';
  const planesNormales = cachePlanes.filter(p => p.id !== 'suelta');
  const planSuelta     = cachePlanes.find(p => p.id === 'suelta');

  cont.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-top:8px;">
      ${planesNormales.map(p => `
        <div style="background:var(--surface); border:1px solid ${p.destacado ? 'var(--accent)' : 'var(--border)'};
          border-radius:var(--radius); padding:14px 12px; position:relative;">
          ${p.destacado ? `<span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);
            background:var(--accent);color:#000;font-family:'Barlow Condensed',sans-serif;
            font-size:0.55rem;font-weight:700;letter-spacing:1.5px;padding:2px 8px;border-radius:10px;">
            MÁS POPULAR</span>` : ''}
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.6rem;font-weight:700;
            letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:3px;">
            ${p.disciplina.toUpperCase()}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.3rem;letter-spacing:1px;
            color:var(--text-primary);margin-bottom:2px;">${p.nombre}</div>
          <div style="font-size:0.72rem;color:var(--text-secondary);margin-bottom:8px;">${p.frecuencia}</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--accent);
            line-height:1;margin-bottom:10px;">$${Number(p.precio).toLocaleString('es-AR')}<span
            style="font-size:0.7rem;color:var(--text-secondary);font-family:'Barlow',sans-serif;">/mes</span></div>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px;">
            ${p.beneficios.map(b => `<li style="font-size:0.74rem;color:var(--text-secondary);
              display:flex;gap:6px;align-items:flex-start;line-height:1.4;">
              <span style="color:var(--accent);font-weight:700;flex-shrink:0;">✓</span>${b}</li>`).join('')}
          </ul>
          ${esCoach ? `
          <div style="display:flex;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
            <button onclick="editarPlan('${p.id}')"
              style="flex:1;background:none;border:1px solid var(--border-strong);color:var(--text-secondary);
              padding:4px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.7rem;">
              Editar</button>
            <button onclick="eliminarPlan('${p.id}')"
              style="flex:1;background:none;border:1px solid var(--danger);color:var(--danger);
              padding:4px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.7rem;">
              Eliminar</button>
          </div>` : ''}
        </div>`).join('')}
    </div>
    ${planSuelta ? `
    <div style="display:flex;align-items:center;justify-content:space-between;
      background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);
      padding:12px 14px;margin-top:10px;">
      <div>
        <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:1px;">
          ${planSuelta.nombre}</div>
        <div style="font-size:0.72rem;color:var(--text-secondary);">
          ${planSuelta.beneficios.join(' · ')}</div>
      </div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:1.6rem;color:var(--accent);">
        $${Number(planSuelta.precio).toLocaleString('es-AR')}
        <span style="font-size:0.7rem;color:var(--text-secondary);font-family:'Barlow',sans-serif;">/ clase</span>
      </div>
    </div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
      <div style="background:var(--surface);border:1px solid var(--border);
        border-radius:var(--radius);padding:12px;display:flex;gap:10px;align-items:flex-start;">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--accent);">10%</span>
        <div><strong style="font-size:0.82rem;">Plan Familiar</strong>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin:2px 0 0;">Descuento para grupos familiares.</p></div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);
        border-radius:var(--radius);padding:12px;display:flex;gap:10px;align-items:flex-start;">
        <span style="font-family:'Bebas Neue',sans-serif;font-size:1.4rem;color:var(--accent);">15%</span>
        <div><strong style="font-size:0.82rem;">Primer Mes</strong>
        <p style="font-size:0.72rem;color:var(--text-secondary);margin:2px 0 0;">Para nuevos atletas de la Legión.</p></div>
      </div>
    </div>
  `;
}

window.renderPlanesInfoBox = renderPlanesInfoBox;
window.editarPlan       = editarPlan;
window.eliminarPlan     = eliminarPlan;
window.abrirFormNuevoPlan = abrirFormNuevoPlan;
window.cerrarFormPlan   = cerrarFormPlan;
window.guardarFormPlan  = guardarFormPlan;
window.elegirPlan       = elegirPlan;