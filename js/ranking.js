// ─── js/ranking.js ────────────────────────────────────────────────────────────
import {
  fsSet, fsGet,
  cacheResults, setCacheResults,
  cachePrograms, cacheUsers,
  currentUser
} from './firebase.js';

import { selectedViewDay, currentViewPlan, setCurrentViewPlan } from './main.js';

let diaRankingActual  = null;
let planRankingActual = null; // null = sigue currentViewPlan de main

// ─── MODALIDAD RX / SCALED ────────────────────────────────────────────────────
let modalidadSeleccionada = null;

export function seleccionarModalidad(modo) {
  modalidadSeleccionada = modo;
  const btnRx     = document.getElementById('btn-rx');
  const btnScaled = document.getElementById('btn-scaled');
  const info      = document.getElementById('modalidad-info');

  if(modo === 'rx') {
    btnRx.style.background     = 'var(--accent)';
    btnRx.style.color          = '#000';
    btnRx.style.border         = 'none';
    btnScaled.style.background = 'none';
    btnScaled.style.color      = 'var(--text-secondary)';
    btnScaled.style.border     = '1px solid var(--border-strong)';
  } else {
    btnScaled.style.background = 'var(--accent)';
    btnScaled.style.color      = '#000';
    btnScaled.style.border     = 'none';
    btnRx.style.background     = 'none';
    btnRx.style.color          = 'var(--text-secondary)';
    btnRx.style.border         = '1px solid var(--border-strong)';
  }
  info.style.display = 'block';
  actualizarHintFormato();
}

function actualizarHintFormato() {
  const day    = diaRankingActual  || selectedViewDay;
  const plan   = planRankingActual || currentViewPlan;
  const tipo   = cachePrograms[day]?.[plan]?.resultType || 'time';
  const hintEl = document.getElementById('score-format-hint');
  if(!hintEl) return;

  const hints = {
    time:   '⏱ Formato: mm:ss — Ejemplo: 17:00 para 17 minutos, 1:45 para 1 minuto 45 segundos.',
    reps:   '🔢 Ingresá solo números enteros. Ejemplo: 45',
    weight: '🏋️ Ingresá el peso en kg. Ejemplo: 85 o 85.5'
  };
  hintEl.textContent = hints[tipo] || '';
}

// ─── VALIDACIÓN ───────────────────────────────────────────────────────────────
function validarScore(score, tipo, mostrarEnDOM = true) {
  if(mostrarEnDOM) {
    const errorEl = document.getElementById('score-error');
    if(errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
  }

  if(!score.trim()) {
    if(mostrarEnDOM) _mostrarError('Ingresá tu resultado.');
    return false;
  }

  if(tipo === 'time') {
    const regex = /^\d{1,2}:\d{2}$/;
    if(!regex.test(score.trim())) {
      if(mostrarEnDOM) _mostrarError('Formato incorrecto. Usá mm:ss — Ejemplo: 17:00 para 17 minutos.');
      return false;
    }
    const parts = score.trim().split(':');
    const segs  = parseInt(parts[1]);
    if(segs > 59) {
      if(mostrarEnDOM) _mostrarError('Los segundos no pueden superar 59.');
      return false;
    }
  }

  if(tipo === 'reps') {
    if(!/^\d+$/.test(score.trim())) {
      if(mostrarEnDOM) _mostrarError('Solo se permiten números enteros. Ejemplo: 45');
      return false;
    }
  }

  if(tipo === 'weight') {
    if(!/^\d+(\.\d+)?$/.test(score.trim().replace(',','.'))) {
      if(mostrarEnDOM) _mostrarError('Solo se permiten números. Ejemplo: 85 o 85.5');
      return false;
    }
  }

  return true;
}

function _mostrarError(msg) {
  const errorEl = document.getElementById('score-error');
  if(!errorEl) return;
  errorEl.textContent   = msg;
  errorEl.style.display = 'block';
}

// ─── GUARDAR RESULTADO ────────────────────────────────────────────────────────
export async function saveWodScore() {
  const score = document.getElementById("input-score").value.trim();
  const day   = diaRankingActual  || selectedViewDay;
  const plan  = planRankingActual || currentViewPlan;
  const tipo  = cachePrograms[day]?.[plan]?.resultType || 'time';

  if(!modalidadSeleccionada) {
    _mostrarError('Seleccioná RX o Scaled antes de cargar tu resultado.');
    return;
  }

  if(!validarScore(score, tipo)) return;

  if(!cacheResults[day])       cacheResults[day]       = {};
  if(!cacheResults[day][plan]) cacheResults[day][plan] = {};

  cacheResults[day][plan][currentUser.id] = {
    name:      currentUser.name,
    score:     score,
    modalidad: modalidadSeleccionada,
    timestamp: Date.now(),
  };

  await fsSet('results', cacheResults);
  document.getElementById("input-score").value = "";
  document.getElementById('score-error').style.display = 'none';
  renderRanking();
  alert("¡Resultado subido con éxito!");
}

// ─── RENDER RANKING ───────────────────────────────────────────────────────────
export function renderRanking() {
  const cont    = document.getElementById("ranking-list-container");
  if(!cont) return;
  const results = cacheResults || {};
  const day     = diaRankingActual  || selectedViewDay;
  const plan    = planRankingActual || currentViewPlan;
  const tipo    = cachePrograms[day]?.[plan]?.resultType || 'time';
  const hoy     = new Date(); hoy.setHours(0,0,0,0);
  cont.innerHTML = "";

  // Actualizar título del ranking con disciplina activa
  const titleEl = document.getElementById('rank-plan-title');
  if(titleEl) titleEl.textContent = plan.toUpperCase();

  const todos = Object.entries(cacheUsers)
    .filter(([id, u]) => {
      if(id === 'coach') return false;
      const fv   = u.expiry ? new Date(u.expiry + 'T00:00:00') : null;
      const diff = fv ? (hoy - fv) / (1000*60*60*24) : 0;
      if(diff >= 60) return false;
      return u.plans?.includes(plan);
    })
    .sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || '', 'es'));

  const lista = results[day]?.[plan] || {};

  const conResultado = todos.filter(([id]) => lista[id]?.score);
  const sinResultado = todos.filter(([id]) => !lista[id]?.score);

  const toSec = str => {
    const parts = str.trim().replace(',','.').split(':');
    return parts.length === 2 ? parseInt(parts[0])*60 + parseFloat(parts[1]) : parseFloat(parts[0]);
  };
  const toNum = str => parseFloat(str.replace(',','.')) || 0;

  const conOrdenado = conResultado
    .map(([id, u]) => ({ id, name: u.name, ...lista[id] }))
    .sort((a, b) => tipo === 'time'
      ? toSec(a.score) - toSec(b.score)
      : toNum(b.score) - toNum(a.score)
    );

  conOrdenado.forEach((r, idx) => {
    const esCoach    = currentUser?.role === 'coach';
    const medalEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
    const numLabel   = medalEmoji
      ? `<span class="rank-num" style="font-size:1.1rem;">${medalEmoji}</span>`
      : `<span class="rank-num">#${idx+1}</span>`;

    const modalBadge = r.modalidad === 'scaled'
      ? `<span style="font-size:0.65rem; background:#55555530; color:var(--text-tertiary);
          border:1px solid var(--border-strong); border-radius:4px; padding:1px 5px; margin-left:4px;">SC</span>`
      : `<span style="font-size:0.65rem; background:var(--accent)20; color:var(--accent);
          border:1px solid var(--accent)40; border-radius:4px; padding:1px 5px; margin-left:4px;">RX</span>`;

    cont.innerHTML += `
      <div class="ranking-row">
        <div style="display:flex; align-items:center; gap:10px;">
          ${numLabel}
          <span style="font-size:0.9rem;">${r.name}</span>
          ${modalBadge}
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="rank-score">${r.score}</span>
          ${esCoach ? `<button onclick="editarResultadoRanking('${day}','${plan}','${r.id}')"
            style="background:none; border:1px solid var(--border-strong); color:var(--text-secondary);
            padding:3px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.7rem;">Editar</button>` : ''}
        </div>
      </div>`;
  });

  sinResultado.forEach(([id, u]) => {
    const esCoach = currentUser?.role === 'coach';
    cont.innerHTML += `
      <div class="ranking-row" style="opacity:0.5;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="rank-num" style="color:var(--text-tertiary);">—</span>
          <span style="font-size:0.9rem;">${u.name}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.78rem; color:var(--text-tertiary);">Sin resultado</span>
          ${esCoach ? `<button onclick="cargarResultadoCoach('${id}','${u.name}','${day}','${plan}')"
            style="background:none; border:1px solid var(--accent); color:var(--accent);
            padding:3px 8px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.7rem;">Cargar</button>` : ''}
        </div>
      </div>`;
  });

  if(!todos.length) {
    cont.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">No hay atletas activos en esta disciplina.</p>';
  }
}

// ─── EDITAR RESULTADO (COACH) ─────────────────────────────────────────────────
export async function editarResultadoRanking(day, plan, uid) {
  const actual    = cacheResults[day]?.[plan]?.[uid];
  const scoreAct  = actual?.score || '';
  const tipo      = cachePrograms[day]?.[plan]?.resultType || 'time';
  const hints     = { time:'mm:ss — Ej: 17:00', reps:'Número entero — Ej: 45', weight:'Peso en kg — Ej: 85' };

  const nuevoScore = prompt(
    `Editar resultado de ${actual?.name}\nFormato: ${hints[tipo]}\nActual: ${scoreAct}`,
    scoreAct
  );
  if(nuevoScore === null) return;

  if(!nuevoScore.trim()) {
    if(!confirm('¿Eliminar este resultado del ranking?')) return;
    delete cacheResults[day][plan][uid];
    await fsSet('results', cacheResults);
    renderRanking();
    return;
  }

  if(!validarScore(nuevoScore.trim(), tipo, false)) {
    alert(`Formato incorrecto.\n${hints[tipo]}`);
    return;
  }

  const nuevaModalidad = confirm('Modalidad del atleta:\n✅ Aceptar = RX\n❌ Cancelar = Scaled') ? 'rx' : 'scaled';

  cacheResults[day][plan][uid].score     = nuevoScore.trim();
  cacheResults[day][plan][uid].modalidad = nuevaModalidad;
  await fsSet('results', cacheResults);
  renderRanking();
}

// ─── CARGAR RESULTADO COACH ───────────────────────────────────────────────────
export async function cargarResultadoCoach(uid, nombre, day, plan) {
  const tipo  = cachePrograms[day]?.[plan]?.resultType || 'time';
  const hints = { time:'mm:ss — Ej: 17:00', reps:'Número entero — Ej: 45', weight:'Peso en kg — Ej: 85' };

  const score = prompt(`Cargar resultado de ${nombre}\nFormato: ${hints[tipo]}`);
  if(!score) return;

  if(!validarScore(score.trim(), tipo, false)) {
    alert(`Formato incorrecto.\n${hints[tipo]}`);
    return;
  }

  const modalidad = confirm('¿El atleta realizó el WOD en RX?\n(Cancelar = Scaled)') ? 'rx' : 'scaled';

  if(!cacheResults[day])       cacheResults[day]       = {};
  if(!cacheResults[day][plan]) cacheResults[day][plan] = {};

  cacheResults[day][plan][uid] = {
    name: nombre, score: score.trim(),
    modalidad, timestamp: Date.now()
  };

  await fsSet('results', cacheResults);
  renderRanking();
}

// ─── CAMBIAR DÍA ──────────────────────────────────────────────────────────────
export function cambiarDiaRanking(dia, btn) {
  diaRankingActual = dia;
  document.querySelectorAll('#rank-day-btns .day-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRanking();
}

// ─── CAMBIAR DISCIPLINA EN RANKING ────────────────────────────────────────────
export function cambiarPlanRanking(plan, btn) {
  planRankingActual = plan;
  setCurrentViewPlan(plan);
  document.querySelectorAll('#rank-plan-btns .day-btn')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRanking();
}

// ─── GETTER DÍA ACTUAL (usado por share.js) ───────────────────────────────────
export function getDiaRankingActual() {
  return diaRankingActual || selectedViewDay;
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.renderRanking          = renderRanking;
window.saveWodScore           = saveWodScore;
window.editarResultadoRanking = editarResultadoRanking;
window.cargarResultadoCoach   = cargarResultadoCoach;
window.seleccionarModalidad   = seleccionarModalidad;
window.cambiarDiaRanking      = cambiarDiaRanking;
window.cambiarPlanRanking     = cambiarPlanRanking;
window.getDiaRankingActual    = getDiaRankingActual;