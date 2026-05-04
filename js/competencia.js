// ─── js/competencia.js ────────────────────────────────────────────────────────
import {
  fsSet,
  cacheComp, setCacheComp,
  setCurrentUser
} from './firebase.js';

import { switchTab } from './main.js';

// ─── FORM ─────────────────────────────────────────────────────────────────────
export function mostrarFormComp() {
  document.getElementById('comp-empty').classList.add('hidden');
  document.getElementById('comp-form').classList.remove('hidden');
}

export async function guardarCompetencia() {
  const nombre = document.getElementById('comp-nombre').value.trim();
  const fecha  = document.getElementById('comp-fecha').value;
  const desc   = document.getElementById('comp-desc').value.trim();
  if(!nombre) return alert('El nombre es obligatorio.');

  if(!cacheComp) {
    setCacheComp({ nombre, fecha, desc, activa: true,
      categorias: [], eventos: [], participantes: [], resultados: {} });
  } else {
    cacheComp.nombre = nombre;
    cacheComp.fecha  = fecha;
    cacheComp.desc   = desc;
  }

  await fsSet('competencia', cacheComp);
  alert('Competencia guardada.');
  renderCompAdmin();
}

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────
export function agregarCategoria() {
  const nivel     = document.getElementById('cat-nivel').value;
  const modalidad = document.getElementById('cat-modalidad').value;
  const sexo      = document.getElementById('cat-sexo').value;
  const nombre    = `${nivel} — ${modalidad} — ${sexo}`;

  if(!cacheComp) return alert('Primero guardá los datos de la competencia.');
  if(cacheComp.categorias.find(c => c.nombre === nombre))
    return alert('Esa categoría ya existe.');

  const tamEquipo = { Individual:1, Duplas:2, 'Tríos':3, Cuarteto:4 }[modalidad] || 1;
  cacheComp.categorias.push({ id: Date.now().toString(), nombre, modalidad, sexo, tamEquipo });
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

export function eliminarCategoria(id) {
  if(!confirm('¿Eliminar esta categoría? Se eliminarán sus participantes y resultados.')) return;
  cacheComp.categorias    = cacheComp.categorias.filter(c => c.id !== id);
  cacheComp.participantes = cacheComp.participantes.filter(p => p.catId !== id);
  for(let key in cacheComp.resultados) {
    if(key.endsWith('_' + id)) delete cacheComp.resultados[key];
  }
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
export function agregarEvento() {
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

export function eliminarEvento(id) {
  if(!confirm('¿Eliminar este evento? Se borrarán sus resultados.')) return;
  cacheComp.eventos = cacheComp.eventos.filter(e => e.id !== id);
  for(let key in cacheComp.resultados) {
    if(key.startsWith(id + '_')) delete cacheComp.resultados[key];
  }
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

export function editarEvento(id) {
  const e = cacheComp.eventos.find(e => e.id === id);
  if(!e) return;
  document.getElementById('evento-nombre').value = e.nombre;
  document.getElementById('evento-tipo').value   = e.tipo;
  document.getElementById('evento-desc').value   = e.desc || '';
  const btn = document.querySelector('[onclick="agregarEvento()"]');
  btn.textContent = 'GUARDAR CAMBIOS';
  btn.onclick = () => guardarEdicionEvento(id);
}

export async function guardarEdicionEvento(id) {
  const e = cacheComp.eventos.find(e => e.id === id);
  if(!e) return;
  e.nombre = document.getElementById('evento-nombre').value.trim();
  e.tipo   = document.getElementById('evento-tipo').value;
  e.desc   = document.getElementById('evento-desc').value.trim();
  await fsSet('competencia', cacheComp);
  const btn = document.querySelector('[onclick]');
  btn.textContent = '+ AGREGAR EVENTO';
  btn.onclick = agregarEvento;
  document.getElementById('evento-nombre').value = '';
  document.getElementById('evento-desc').value   = '';
  renderCompAdmin();
  alert('Evento actualizado.');
}

// ─── PARTICIPANTES ────────────────────────────────────────────────────────────
export function agregarParticipante() {
  const catId       = document.getElementById('part-cat').value;
  const nombre      = document.getElementById('part-nombre').value.trim();
  const box         = document.getElementById('part-box').value.trim();
  const integrantes = document.getElementById('part-integrantes').value.trim();
  if(!catId || !nombre) return alert('Categoría y nombre son obligatorios.');

  cacheComp.participantes.push({
    id: Date.now().toString(), catId, nombre, box,
    integrantes: integrantes ? integrantes.split(',').map(s => s.trim()) : []
  });
  fsSet('competencia', cacheComp);
  document.getElementById('part-nombre').value      = '';
  document.getElementById('part-box').value         = '';
  document.getElementById('part-integrantes').value = '';
  renderCompAdmin();
}

export function eliminarParticipante(id) {
  if(!confirm('¿Eliminar este participante?')) return;
  cacheComp.participantes = cacheComp.participantes.filter(p => p.id !== id);
  fsSet('competencia', cacheComp);
  renderCompAdmin();
}

export function editarParticipante(id) {
  document.getElementById(`view-${id}`).style.display = 'none';
  const editDiv = document.getElementById(`edit-${id}`);
  editDiv.classList.remove('hidden');
  editDiv.style.display = 'flex';
}

export function cancelarEdicionParticipante(id) {
  document.getElementById(`view-${id}`).style.display = 'block';
  const editDiv = document.getElementById(`edit-${id}`);
  editDiv.classList.add('hidden');
  editDiv.style.display = 'none';
}

export async function guardarEdicionParticipante(id) {
  const nuevoNombre = document.getElementById(`edit-nombre-${id}`).value.trim();
  const nuevoBox    = document.getElementById(`edit-box-${id}`).value.trim();
  if(!nuevoNombre) return alert('El nombre no puede estar vacío.');
  const p = cacheComp.participantes.find(p => p.id === id);
  if(!p) return;
  p.nombre = nuevoNombre;
  p.box    = nuevoBox;
  for(let key in cacheComp.resultados) {
    if(cacheComp.resultados[key][id]) {
      cacheComp.resultados[key][id].nombre = nuevoNombre;
      cacheComp.resultados[key][id].box    = nuevoBox;
    }
  }
  await fsSet('competencia', cacheComp);
  renderCompAdmin();
}

// ─── RESULTADOS ───────────────────────────────────────────────────────────────
export function renderParticipantesResultado() {
  const catId    = document.getElementById('res-cat').value;
  const eventoId = document.getElementById('res-evento').value;
  const cont     = document.getElementById('res-inputs');
  cont.innerHTML = '';
  if(!catId || !eventoId || !cacheComp) return;

  const evento = cacheComp.eventos.find(e => e.id === eventoId);
  const partic = cacheComp.participantes.filter(p => p.catId === catId);
  if(!partic.length) {
    cont.innerHTML = '<small style="color:var(--text-tertiary)">No hay participantes en esta categoría.</small>';
    return;
  }

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

export async function guardarResultados() {
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
        score:  input.value.trim(),
        nombre: p.nombre,
        box:    p.box
      };
    }
  });

  calcularPosiciones(key, evento.tipo, partic);
  await fsSet('competencia', cacheComp);
  alert('Resultados guardados.');
  renderRankingPublico();
}

function calcularPosiciones(key, tipo, partic) {
  const res      = cacheComp.resultados[key];
  const conScore = partic.filter(p => res[p.id]?.score);
  const sinScore = partic.filter(p => !res[p.id]?.score);

  const toSec = s => {
    const pts = s.trim().replace(',','.').split(':');
    return pts.length === 2 ? parseInt(pts[0])*60 + parseFloat(pts[1]) : parseFloat(pts[0]);
  };

  conScore.sort((a, b) => {
    const sa = res[a.id].score;
    const sb = res[b.id].score;
    return tipo === 'time'
      ? toSec(sa) - toSec(sb)
      : (parseFloat(sb) || 0) - (parseFloat(sa) || 0);
  });

  let i = 0;
  while(i < conScore.length) {
    const scoreActual = res[conScore[i].id].score;
    let j = i;
    while(j < conScore.length && res[conScore[j].id].score === scoreActual) j++;
    const puntos = Math.round(
      Array.from({length: j - i}, (_, k) => i + k + 1)
        .reduce((a, b) => a + b, 0) / (j - i)
    );
    for(let k = i; k < j; k++) res[conScore[k].id].puntos = puntos;
    i = j;
  }
  sinScore.forEach(p => { res[p.id].puntos = conScore.length + 1; });
}

// ─── RANKING PÚBLICO ─────────────────────────────────────────────────────────
export function renderRankingPublico() {
  const cont  = document.getElementById('public-ranking-cont');
  const catId = document.getElementById('public-cat-select')?.value;
  if(!cont || !cacheComp) return;
  cont.innerHTML = '';

  const categorias = catId
    ? cacheComp.categorias.filter(c => c.id === catId)
    : cacheComp.categorias;

  categorias.forEach(cat => {
    const partic = cacheComp.participantes.filter(p => p.catId === cat.id);
    if(!partic.length) return;

    let totalPuntos = {};
    partic.forEach(p => { totalPuntos[p.id] = { nombre: p.nombre, box: p.box, puntos: 0, eventos: 0 }; });

    cacheComp.eventos.forEach(ev => {
      const key = `${ev.id}_${cat.id}`;
      const res = cacheComp.resultados[key];
      if(!res) return;
      partic.forEach(p => {
        if(res[p.id]?.puntos !== undefined) {
          totalPuntos[p.id].puntos += res[p.id].puntos;
          totalPuntos[p.id].eventos++;
        }
      });
    });

    const sorted = Object.values(totalPuntos)
      .filter(p => p.eventos > 0)
      .sort((a, b) => a.puntos - b.puntos);

    if(!sorted.length) return;

    cont.innerHTML += `
      <div style="margin-bottom:24px;">
        <p style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700;
          letter-spacing:2px; color:var(--accent); text-transform:uppercase; margin-bottom:10px;">${cat.nombre}</p>
        ${sorted.map((r, idx) => `
          <div class="ranking-row">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="rank-num">#${idx+1}</span>
              <div>
                <span style="font-size:0.9rem;">${r.nombre}</span>
                ${r.box ? `<small style="color:var(--text-tertiary); margin-left:6px;">· ${r.box}</small>` : ''}
              </div>
            </div>
            <span class="rank-score">${r.puntos} pts</span>
          </div>`).join('')}
      </div>`;
  });
}

// ─── ACCESO PÚBLICO ───────────────────────────────────────────────────────────
export async function toggleAccesoPublico(habilitar) {
  if(!cacheComp) return alert('Primero guardá la competencia.');
  const label = document.getElementById('comp-btn-label').value.trim() || 'Ver Competencia';
  cacheComp.accesoPublico = habilitar;
  cacheComp.btnLabel      = label;
  await fsSet('competencia', cacheComp);
  actualizarBotonLeaderboard();
  document.getElementById('comp-acceso-status').textContent =
    habilitar ? `✓ Acceso habilitado — botón: "${label}"` : '✗ Acceso deshabilitado';
}

export function actualizarBotonLeaderboard() {
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

export function entrarLeaderboard() {
  setCurrentUser({ id: 'espectador', role: 'espectador', name: 'Espectador' });
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  document.getElementById('tab-link-comp-public').classList.remove('hidden');
  document.getElementById('nav-username').textContent = cacheComp?.nombre || 'Competencia';
  renderCompAdmin();
  switchTab('comp-public', document.getElementById('tab-link-comp-public'));
  localStorage.setItem('legion_session', JSON.stringify({ id: 'espectador', role: 'espectador', name: 'Espectador' }));
}

export async function finalizarCompetencia() {
  if(!confirm('¿Finalizar y archivar la competencia?\n\nQuedará guardada pero ya no estará activa.')) return;
  cacheComp.activa = false;
  await fsSet('competencia', cacheComp);
  setCacheComp(null);
  alert('Competencia finalizada.');
  switchTab('comp', document.getElementById('tab-link-comp'));
  renderCompAdmin();
}

export function renderCompAdmin() {
  if(!cacheComp || !cacheComp.activa) {
    document.getElementById('comp-empty').classList.remove('hidden');
    document.getElementById('comp-form').classList.add('hidden');
    return;
  }

  document.getElementById('comp-empty').classList.add('hidden');
  document.getElementById('comp-form').classList.remove('hidden');
  document.getElementById('comp-nombre').value = cacheComp.nombre || '';
  document.getElementById('comp-fecha').value  = cacheComp.fecha  || '';
  document.getElementById('comp-desc').value   = cacheComp.desc   || '';

  const catList = document.getElementById('comp-cat-list');
  catList.innerHTML = '';
  cacheComp.categorias.forEach(c => {
    catList.innerHTML += `
      <div class="comp-cat-pill">
        <span>${c.nombre}</span>
        <button onclick="eliminarCategoria('${c.id}')"
          style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;">✕</button>
      </div>`;
  });

  const evList = document.getElementById('comp-evento-list');
  evList.innerHTML = '';
  cacheComp.eventos.forEach(e => {
    const tipos = { time:'Tiempo', reps:'Repeticiones', weight:'Peso' };
    evList.innerHTML += `
      <div class="comp-cat-pill" style="flex-direction:column; align-items:flex-start; gap:4px;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <div><b>${e.nombre}</b> <small style="color:var(--text-tertiary);">· ${tipos[e.tipo]}</small></div>
          <div style="display:flex; gap:6px;">
            <button onclick="editarEvento('${e.id}')"
              style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);
              padding:4px 10px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">Editar</button>
            <button onclick="eliminarEvento('${e.id}')"
              style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;">✕</button>
          </div>
        </div>
        ${e.desc ? `<small style="color:var(--text-tertiary); line-height:1.4; display:block; margin-top:4px;">${e.desc}</small>` : ''}
      </div>`;
  });

  const partCat = document.getElementById('part-cat');
  partCat.innerHTML = '<option value="">— Seleccionar —</option>';
  cacheComp.categorias.forEach(c => {
    partCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });

  const partList = document.getElementById('comp-part-list');
  partList.innerHTML = '';
  cacheComp.categorias.forEach(c => {
    const partic = cacheComp.participantes.filter(p => p.catId === c.id);
    if(!partic.length) return;
    partList.innerHTML += `<p style="font-size:0.72rem; font-weight:700; letter-spacing:1.5px;
      color:var(--accent); margin:12px 0 6px; text-transform:uppercase;">${c.nombre}</p>`;
    partic.forEach(p => {
      partList.innerHTML += `
        <div class="comp-cat-pill" id="pill-${p.id}">
          <div style="flex:1;">
            <div id="view-${p.id}">
              <b>${p.nombre}</b> <small style="color:var(--text-tertiary);">· ${p.box}</small>
              ${p.integrantes?.length
                ? `<div style="font-size:0.75rem; color:var(--text-tertiary); margin-top:2px;">${p.integrantes.join(', ')}</div>`
                : ''}
            </div>
            <div id="edit-${p.id}" class="hidden" style="display:none; gap:6px; flex-wrap:wrap;">
              <input type="text" id="edit-nombre-${p.id}" value="${p.nombre}"
                style="flex:1; min-width:120px; padding:6px 10px; font-size:0.82rem;">
              <input type="text" id="edit-box-${p.id}" value="${p.box}"
                style="flex:1; min-width:120px; padding:6px 10px; font-size:0.82rem;">
              <button onclick="guardarEdicionParticipante('${p.id}')"
                style="background:var(--accent);border:none;color:#000;padding:6px 12px;
                border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;font-weight:700;">OK</button>
              <button onclick="cancelarEdicionParticipante('${p.id}')"
                style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);
                padding:6px 12px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">✕</button>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <button onclick="editarParticipante('${p.id}')"
              style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);
              padding:5px 10px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.75rem;">Editar</button>
            <button onclick="eliminarParticipante('${p.id}')"
              style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:0.9rem;">✕</button>
          </div>
        </div>`;
    });
  });

  const resCat = document.getElementById('res-cat');
  resCat.innerHTML = '<option value="">— Categoría —</option>';
  cacheComp.categorias.forEach(c => {
    resCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });

  const resEv = document.getElementById('res-evento');
  resEv.innerHTML = '<option value="">— Evento —</option>';
  cacheComp.eventos.forEach(e => {
    resEv.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
  });

  const statusEl = document.getElementById('comp-acceso-status');
  const labelEl  = document.getElementById('comp-btn-label');
  if(statusEl) statusEl.textContent = cacheComp.accesoPublico
    ? `Acceso habilitado — boton: ${cacheComp.btnLabel || 'Ver Competencia'}`
    : 'Acceso deshabilitado';
  if(labelEl) labelEl.value = cacheComp.btnLabel || '';

  const pubCat = document.getElementById('public-cat-select');
  pubCat.innerHTML = '<option value="">— Seleccionar —</option>';
  cacheComp.categorias.forEach(c => {
    pubCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
  });
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.mostrarFormComp             = mostrarFormComp;
window.guardarCompetencia          = guardarCompetencia;
window.agregarCategoria            = agregarCategoria;
window.eliminarCategoria           = eliminarCategoria;
window.agregarEvento               = agregarEvento;
window.eliminarEvento              = eliminarEvento;
window.editarEvento                = editarEvento;
window.guardarEdicionEvento        = guardarEdicionEvento;
window.agregarParticipante         = agregarParticipante;
window.eliminarParticipante        = eliminarParticipante;
window.editarParticipante          = editarParticipante;
window.cancelarEdicionParticipante = cancelarEdicionParticipante;
window.guardarEdicionParticipante  = guardarEdicionParticipante;
window.renderParticipantesResultado = renderParticipantesResultado;
window.guardarResultados           = guardarResultados;
window.renderRankingPublico        = renderRankingPublico;
window.toggleAccesoPublico         = toggleAccesoPublico;
window.actualizarBotonLeaderboard  = actualizarBotonLeaderboard;
window.entrarLeaderboard           = entrarLeaderboard;
window.finalizarCompetencia        = finalizarCompetencia;
window.renderCompAdmin             = renderCompAdmin;
window.actualizarTamEquipo         = function(){};