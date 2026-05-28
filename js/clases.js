// ─── js/clases.js ─────────────────────────────────────────────────────────────
import {
  fsSet,
  cachePrograms, setCachePrograms,
  cacheInfo, setCacheInfo,
  currentUser
} from './firebase.js';

import { selectedViewDay, setSelectedViewDay, currentViewPlan, setCurrentViewPlan, diasSeleccionadosReset } from './main.js';
import { enviarNotificacion } from './notificaciones.js';
import { renderHorariosPublico } from './horarios.js';

// ─── PROGRAMACIÓN ─────────────────────────────────────────────────────────────
export function syncAdminView() {
  const d = document.getElementById("edit-day-select").value;
  const p = document.getElementById("edit-plan-select").value;
  setSelectedViewDay(d);
  setCurrentViewPlan(p);
  const c = cachePrograms[d]?.[p] || {};
  document.getElementById('edit-result-type').value  = c.resultType || 'time';
  document.getElementById("edit-warmup").value       = c.warmup   || "";
  document.getElementById("edit-strength").value     = c.strength || "";
  document.getElementById("edit-wod").value          = c.wod      || "";
  renderClass();
}

export async function saveClass() {
  const d = document.getElementById("edit-day-select").value;
  const p = document.getElementById("edit-plan-select").value;
  if(!cachePrograms[d]) cachePrograms[d] = {};
  cachePrograms[d][p] = {
    resultType: document.getElementById('edit-result-type').value,
    warmup:     document.getElementById('edit-warmup').value,
    strength:   document.getElementById('edit-strength').value,
    wod:        document.getElementById('edit-wod').value
  };
  await fsSet('programs', cachePrograms);
  enviarNotificacion('clases');
  alert("Clase publicada.");
  syncAdminView();
}

export function renderClass() {
  const c = cachePrograms[selectedViewDay]?.[currentViewPlan] || {};
  document.getElementById("display-day-name").textContent  = selectedViewDay.toUpperCase();
  document.getElementById("display-plan-name").textContent = currentViewPlan.toUpperCase();
  const cont = document.getElementById("class-blocks-display");
  cont.innerHTML = "";
  const nl = t => t.replace(/\n/g, '<br>');
  if(c.warmup)   cont.innerHTML += `<div class="class-block"><strong>Calentamiento</strong>${nl(c.warmup)}</div>`;
  if(c.strength) cont.innerHTML += `<div class="class-block"><strong>Fuerza / Técnica</strong>${nl(c.strength)}</div>`;
  if(c.wod)      cont.innerHTML += `<div class="class-block"><strong>WOD</strong>${nl(c.wod)}</div>`;
  const placeholders = { time:'Ej: 12:40', reps:'Ej: 45 reps', weight:'Ej: 85 kg' };
  const scoreInput = document.getElementById('input-score');
  if(scoreInput) scoreInput.placeholder = placeholders[c.resultType || 'time'];
}

export function changeViewDay(d, btn) {
  setSelectedViewDay(d);
  document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderClass();
}

export function setupPlanSwitcher(plans) {
  const container = document.getElementById("user-plan-switcher");
  if (!plans || plans.length <= 1) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = "";
  plans.forEach(p => {
    const b = document.createElement("button");
    b.className = "day-btn " + (currentViewPlan === p ? "active" : "");
    b.textContent = p.toUpperCase();
    b.onclick = () => {
      setCurrentViewPlan(p);
      document.querySelectorAll("#user-plan-switcher .day-btn")
        .forEach(btn => btn.classList.remove("active"));
      b.classList.add("active");
      renderClass();
    };
    container.appendChild(b);
  });
}

export async function resetProgramacion() {
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

export function toggleResetDay(btn, dia) {
  if(diasSeleccionadosReset.has(dia)) {
    diasSeleccionadosReset.delete(dia);
    btn.classList.remove('active');
  } else {
    diasSeleccionadosReset.add(dia);
    btn.classList.add('active');
  }
}

export async function saveNews() {
  const text = document.getElementById("edit-news").value;
  cacheInfo.news = text;
  await fsSet('info', cacheInfo);
  document.getElementById("news-text").textContent = text;
  renderNoticiasPublico();
  enviarNotificacion('comunicado');
  alert("Comunicado actualizado.");
}

export async function savePrices() {
  cacheInfo.prices = document.getElementById("edit-prices").value;
  await fsSet('info', cacheInfo);
  alert("Información actualizada.");
  loadBoxInfo();
}

export function loadBoxInfo() {
  const preciosHTML = cacheInfo.prices || '';
  const displayApp = document.getElementById("display-prices");
  if (displayApp) displayApp.innerHTML = preciosHTML;
  if (currentUser && currentUser.role === "coach") {
    const editPricesInput = document.getElementById("edit-prices");
    if (editPricesInput) editPricesInput.value = preciosHTML;
  }
  const displayLanding = document.getElementById("lnd-pricing-content");
  if (displayLanding) displayLanding.innerHTML = preciosHTML;
  renderHorariosPublico();
  renderNoticiasPublico();
}

// ─── NOVEDADES PÚBLICAS (LANDING) ─────────────────────────────────────────────
export function renderNoticiasPublico() {
  const cont = document.getElementById('lnd-news-content');
  if (!cont) return;

  const news = cacheInfo?.news || '';

  if (!news.trim()) {
    cont.innerHTML = `<p style="color:var(--text-secondary); text-align:center;
      grid-column:1/-1; font-family:'Barlow',sans-serif; font-size:0.88rem;">
      No hay eventos o novedades programadas por el momento.</p>`;
    return;
  }

  // Dividir por líneas dobles para mostrar como tarjetas separadas
  const items = news.split(/+/).filter(t => t.trim());

  if (items.length <= 1) {
    // Un solo bloque — mostrar como una tarjeta ancha
    cont.innerHTML = `
      <div style="background:var(--card); border:1px solid rgba(255,255,255,0.08);
        padding:20px; border-radius:var(--radius); color:var(--text-main);
        font-family:'Barlow',sans-serif; font-size:0.9rem; line-height:1.7;
        grid-column:1/-1; white-space:pre-wrap;">
        ${news.trim()}
      </div>`;
  } else {
    cont.innerHTML = items.map(item => `
      <div style="background:var(--card); border:1px solid rgba(255,255,255,0.08);
        padding:20px; border-radius:var(--radius); color:var(--text-main);
        font-family:'Barlow',sans-serif; font-size:0.9rem; line-height:1.7;
        white-space:pre-wrap;">
        ${item.trim()}
      </div>`).join('');
  }
}

// ─── QUILL EDITOR ─────────────────────────────────────────────────────────────
let quillEditor = null;

export function initQuillEditor() {
  if(quillEditor) return;
  quillEditor = new Quill('#quill-editor', {
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'size': ['small', false, 'large'] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['clean']
      ]
    }
  });
  quillEditor.root.innerHTML = cacheInfo.prices || '';
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.saveClass             = saveClass;
window.renderNoticiasPublico = renderNoticiasPublico;
window.saveNews         = saveNews;
window.savePrices       = savePrices;
window.syncAdminView    = syncAdminView;
window.changeViewDay    = changeViewDay;
window.toggleResetDay   = toggleResetDay;
window.resetProgramacion = resetProgramacion;
window.initQuillEditor = initQuillEditor;