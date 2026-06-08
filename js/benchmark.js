// ─── js/benchmark.js ──────────────────────────────────────────────────────────
import { fsGet, fsSet, currentUser, cacheResults } from './firebase.js';

// ─── BENCHMARK BASE DATA ──────────────────────────────────────────────────────
export const BENCHMARK_DEFAULT = [
  { id: 'fran',      nombre: 'Fran',      modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['21-15-9 reps', 'Thrusters (43kg / 30kg)', 'Pull-ups'] },
  { id: 'helen',     nombre: 'Helen',     modalidad: 'For Time — 3 rounds', nivel: 'benchmark',
    ejercicios: ['400m Run', 'KB Swings x21 (24kg / 16kg)', 'Pull-ups x12'] },
  { id: 'grace',     nombre: 'Grace',     modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['Clean & Jerk x30 (61kg / 43kg)'] },
  { id: 'isabel',    nombre: 'Isabel',    modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['Snatch x30 (61kg / 43kg)'] },
  { id: 'cindy',     nombre: 'Cindy',     modalidad: 'AMRAP 20 min', nivel: 'benchmark',
    ejercicios: ['Pull-ups x5', 'Push-ups x10', 'Air Squats x15'] },
  { id: 'mary',      nombre: 'Mary',      modalidad: 'AMRAP 20 min', nivel: 'benchmark',
    ejercicios: ['Handstand Push-ups x5', 'Pistols alternados x10', 'Pull-ups x15'] },
  { id: 'chelsea',   nombre: 'Chelsea',   modalidad: 'EMOM 30 min', nivel: 'benchmark',
    ejercicios: ['Pull-ups x5', 'Push-ups x10', 'Air Squats x15'] },
  { id: 'barbara',   nombre: 'Barbara',   modalidad: 'For Time — 5 rounds (3 min descanso)', nivel: 'benchmark',
    ejercicios: ['Pull-ups x20', 'Push-ups x30', 'Sit-ups x40', 'Air Squats x50'] },
  { id: 'annie',     nombre: 'Annie',     modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['50-40-30-20-10 reps', 'Double Unders', 'Sit-ups'] },
  { id: 'angie',     nombre: 'Angie',     modalidad: 'For Time — en ese orden', nivel: 'benchmark',
    ejercicios: ['Pull-ups x100', 'Push-ups x100', 'Sit-ups x100', 'Air Squats x100'] },
  { id: 'diane',     nombre: 'Diane',     modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['21-15-9 reps', 'Deadlift (102kg / 70kg)', 'Handstand Push-ups'] },
  { id: 'elizabeth', nombre: 'Elizabeth', modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['21-15-9 reps', 'Clean (61kg / 43kg)', 'Ring Dips'] },
  { id: 'kelly',     nombre: 'Kelly',     modalidad: 'For Time — 5 rounds', nivel: 'benchmark',
    ejercicios: ['400m Run', 'Box Jumps x30 (61cm / 51cm)', 'Wall Ball x30 (9kg / 6kg)'] },
  { id: 'nancy',     nombre: 'Nancy',     modalidad: 'For Time — 5 rounds', nivel: 'benchmark',
    ejercicios: ['400m Run', 'Overhead Squats x15 (43kg / 30kg)'] },
  { id: 'amanda',    nombre: 'Amanda',    modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['9-7-5 reps', 'Muscle-ups', 'Squat Snatches (61kg / 43kg)'] },
  { id: 'jackie',    nombre: 'Jackie',    modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['1000m Row', 'Thrusters x50 (20kg)', 'Pull-ups x30'] },
  { id: 'karen',     nombre: 'Karen',     modalidad: 'For Time',  nivel: 'benchmark',
    ejercicios: ['Wall Ball Shots x150 (9kg / 6kg — objetivo 3m / 2.7m)'] },
  { id: 'linda',     nombre: 'Linda',     modalidad: 'For Time — 10-9-8...1', nivel: 'benchmark',
    ejercicios: ['Deadlift (1.5 × bodyweight)', 'Bench Press (bodyweight)', 'Clean (0.75 × bodyweight)'] },
  { id: 'eva',       nombre: 'Eva',       modalidad: 'For Time — 5 rounds', nivel: 'benchmark',
    ejercicios: ['800m Run', 'KB Swings x30 (32kg / 24kg)', 'Pull-ups x30'] },
  { id: 'murph',     nombre: 'Murph',     modalidad: 'For Time (chaleco 9kg)', nivel: 'hero',
    ejercicios: ['1 Mile Run', 'Pull-ups x100', 'Push-ups x200', 'Air Squats x300', '1 Mile Run'] },
  { id: 'dt',        nombre: 'DT',        modalidad: 'For Time — 5 rounds', nivel: 'hero',
    ejercicios: ['Deadlift x12 (70kg / 47kg)', 'Hang Power Clean x9 (70kg / 47kg)', 'Push Jerk x6 (70kg / 47kg)'] },
  { id: 'daniel',    nombre: 'Daniel',    modalidad: 'For Time',  nivel: 'hero',
    ejercicios: ['Pull-ups x50', '400m Run', 'Thrusters x21 (43kg)', '800m Run', 'Thrusters x21 (43kg)', '400m Run', 'Pull-ups x50'] },
  { id: 'jason',     nombre: 'Jason',     modalidad: 'For Time',  nivel: 'hero',
    ejercicios: ['100 Squats — 5 Muscle-ups', '75 Squats — 10 Muscle-ups', '50 Squats — 15 Muscle-ups', '25 Squats — 20 Muscle-ups'] },
];

// ─── CACHE LOCAL ──────────────────────────────────────────────────────────────
export let cacheBenchmarks = null;

export async function cargarBenchmarks() {
  const data = await fsGet('benchmarks').catch(() => null);
  cacheBenchmarks = data?.lista || BENCHMARK_DEFAULT;
  return cacheBenchmarks;
}

export async function guardarBenchmarks() {
  await fsSet('benchmarks', { lista: cacheBenchmarks });
}

// ─── RENDER LISTA DE BENCHMARKS ───────────────────────────────────────────────
export function renderBenchmarkList(isCoach) {
  const cont = document.getElementById('benchmark-list');
  if (!cont) return;
  if (!cacheBenchmarks) { cacheBenchmarks = BENCHMARK_DEFAULT; }

  // Agrupar: primero benchmarks, luego heroes
  const benchmarks = cacheBenchmarks.filter(w => w.nivel !== 'hero');
  const heroes     = cacheBenchmarks.filter(w => w.nivel === 'hero');

  let html = '';

  if (benchmarks.length) {
    html += '<div style="font-family:Barlow Condensed,sans-serif; font-size:0.62rem;' +
            'font-weight:700; letter-spacing:2.5px; color:var(--accent); margin-bottom:8px;' +
            'text-transform:uppercase;">The Girls</div>';
    html += _renderGrupo(benchmarks, isCoach);
  }

  if (heroes.length) {
    html += '<div style="font-family:Barlow Condensed,sans-serif; font-size:0.62rem;' +
            'font-weight:700; letter-spacing:2.5px; color:#ff6b6b; margin:14px 0 8px;' +
            'text-transform:uppercase;">Hero WODs</div>';
    html += _renderGrupo(heroes, isCoach);
  }

  if (isCoach) {
    html += '<button onclick="abrirFormBenchmark(null)"' +
            ' style="width:100%; margin-top:12px; background:none;' +
            'border:1px dashed var(--accent); color:var(--accent); padding:10px;' +
            'border-radius:var(--radius); cursor:pointer; font-family:Barlow Condensed,sans-serif;' +
            'font-size:0.8rem; font-weight:700; letter-spacing:2px;">+ AGREGAR WOD</button>';
  }

  cont.innerHTML = html;
}

function _renderGrupo(lista, isCoach) {
  return '<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; margin-bottom:16px;">' +
    lista.map(w => {
      const tieneRegistro = _getTiempoPersonal(w.id);
      return '<div style="background:var(--surface); border:1px solid var(--border);' +
        'border-radius:10px; padding:14px; cursor:pointer; position:relative;' +
        'transition:border-color 0.2s, transform 0.15s;"' +
        ' onmouseover="this.style.borderColor=\'rgba(52,223,69,0.35)\';this.style.transform=\'translateY(-2px)\'"' +
        ' onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'none\'"' +
        ' onclick="abrirBenchmark(\'' + w.id + '\')">' +
          '<div style="font-family:Bebas Neue,sans-serif; font-size:1.1rem; letter-spacing:1px;' +
          'color:var(--text-primary); margin-bottom:3px;">' + w.nombre + '</div>' +
          '<div style="font-size:0.68rem; color:var(--text-secondary);">' + w.modalidad + '</div>' +
          (tieneRegistro
            ? '<div style="margin-top:8px; font-size:0.68rem; color:var(--accent);' +
              'background:rgba(52,223,69,0.08); border:1px solid rgba(52,223,69,0.2);' +
              'padding:2px 6px; border-radius:8px; display:inline-block;">⏱ ' + tieneRegistro + '</div>'
            : '') +
          (isCoach
            ? '<div style="display:flex; gap:4px; margin-top:10px; padding-top:8px; border-top:1px solid var(--border);">' +
                '<button onclick="event.stopPropagation(); abrirFormBenchmark(\'' + w.id + '\')"' +
                ' style="flex:1; background:none; border:1px solid var(--border-strong); color:var(--text-secondary);' +
                'padding:3px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.65rem;">✏️</button>' +
                '<button onclick="event.stopPropagation(); eliminarBenchmark(\'' + w.id + '\')"' +
                ' style="flex:1; background:none; border:1px solid var(--danger); color:var(--danger);' +
                'padding:3px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.65rem;">✕</button>' +
              '</div>'
            : '') +
        '</div>';
    }).join('') +
  '</div>';
}

function _getTiempoPersonal(wodId) {
  const uid = currentUser?.id;
  if (!uid || !cacheResults) return null;
  const key = 'bench_' + uid + '_' + wodId;
  const val = cacheResults[key];
  return val ? val.tiempo : null;
}

// ─── ABRIR MODAL DETALLE ──────────────────────────────────────────────────────
window.abrirBenchmark = function(id) {
  const w = cacheBenchmarks?.find(b => b.id === id);
  if (!w) return;

  const modal = document.getElementById('modal-benchmark');
  if (!modal) return;

  document.getElementById('bench-modal-nombre').textContent    = w.nombre;
  document.getElementById('bench-modal-modalidad').textContent = w.modalidad;
  document.getElementById('bench-modal-id').value              = w.id;

  // Parsear descripción estructurada
  const descEl = document.getElementById('bench-modal-descripcion');
  if (descEl) {
    const partes = (w.descripcion || '').split('·').map(s => s.trim()).filter(Boolean);
    if (partes.length <= 1) {
      descEl.innerHTML = '<p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.7; margin:0;">' +
                         (w.descripcion || '') + '</p>';
    } else {
      const tieneIntro = !partes[0].match(/\([\d,\.kgKGlbLB\/]+\)/);
      const intro      = tieneIntro ? partes[0] : null;
      const ejercicios = tieneIntro ? partes.slice(1) : partes;
      let html = '';
      if (intro) {
        html += '<div style="font-size:0.82rem; color:var(--text-secondary);' +
                'margin-bottom:12px; font-style:italic;">' + intro + '</div>';
      }
      html += '<div style="display:flex; flex-direction:column; gap:0;">';
      ejercicios.forEach(ej => {
        const match = ej.match(/^(.+?)\s*(\([^)]+\))\s*$/);
        if (match) {
          html += '<div style="display:flex; justify-content:space-between; align-items:baseline;' +
                  'padding:9px 0; border-bottom:1px solid var(--border);">' +
                    '<span style="font-size:0.88rem; color:var(--text-primary);">' + match[1].trim() + '</span>' +
                    '<span style="font-size:0.78rem; color:var(--accent);' +
                    'font-family:Barlow Condensed,sans-serif; letter-spacing:0.5px;">' + match[2] + '</span>' +
                  '</div>';
        } else {
          html += '<div style="padding:9px 0; border-bottom:1px solid var(--border);' +
                  'font-size:0.88rem; color:var(--text-primary);">' + ej + '</div>';
        }
      });
      html += '</div>';
      descEl.innerHTML = html;
    }
  }


  // Cargar tiempo personal si existe
  const tiempoPersonal = _getTiempoPersonal(w.id);
  const inputTiempo    = document.getElementById('bench-tiempo-input');
  const inputObs       = document.getElementById('bench-obs-input');
  if (inputTiempo) inputTiempo.value = tiempoPersonal || '';
  if (inputObs)    inputObs.value    = '';

  // Mostrar tiempo guardado
  const tiempoGuardado = document.getElementById('bench-tiempo-guardado');
  if (tiempoGuardado) {
    tiempoGuardado.textContent = tiempoPersonal ? '⏱ Tu mejor tiempo: ' + tiempoPersonal : '';
    tiempoGuardado.style.display = tiempoPersonal ? 'block' : 'none';
  }

  modal.classList.remove('hidden');
};

// ─── GUARDAR TIEMPO PERSONAL ──────────────────────────────────────────────────
window.guardarTiempoBenchmark = async function() {
  const wodId  = document.getElementById('bench-modal-id')?.value;
  const tiempo = document.getElementById('bench-tiempo-input')?.value?.trim();
  const obs    = document.getElementById('bench-obs-input')?.value?.trim();
  const errEl  = document.getElementById('bench-error');

  if (!tiempo) { if(errEl) errEl.textContent = 'Ingresá tu tiempo.'; return; }
  if (!currentUser?.id) { if(errEl) errEl.textContent = 'Iniciá sesión para guardar.'; return; }

  try {
    const key = 'bench_' + currentUser.id + '_' + wodId;
    const resultados = await fsGet('results') || {};
    resultados[key] = {
      tiempo,
      obs:   obs || '',
      fecha: new Date().toLocaleDateString('es-AR'),
      uid:   currentUser.id,
      wod:   wodId
    };
    await fsSet('results', resultados);

    document.getElementById('modal-benchmark')?.classList.add('hidden');
    renderBenchmarkList(currentUser.role === 'coach');
    alert('✅ Tiempo guardado: ' + tiempo);
  } catch(e) {
    if(errEl) errEl.textContent = 'Error al guardar: ' + e.message;
  }
};

// ─── FORMULARIO COACH (AGREGAR / EDITAR) ─────────────────────────────────────
window.abrirFormBenchmark = function(id) {
  const w = id ? cacheBenchmarks?.find(b => b.id === id) : null;
  const modal = document.getElementById('modal-benchmark-form');
  if (!modal) return;

  document.getElementById('bench-form-titulo').textContent    = w ? 'Editar WOD' : 'Nuevo WOD';
  document.getElementById('bench-form-id').value              = w?.id || '';
  document.getElementById('bench-form-nombre').value          = w?.nombre || '';
  document.getElementById('bench-form-modalidad').value       = w?.modalidad || 'For Time';
  document.getElementById('bench-form-descripcion').value     = w?.descripcion || '';
  document.getElementById('bench-form-nivel').value           = w?.nivel || 'benchmark';

  modal.classList.remove('hidden');
};

window.cerrarFormBenchmark = function() {
  document.getElementById('modal-benchmark-form')?.classList.add('hidden');
};

window.guardarFormBenchmark = async function() {
  const id          = document.getElementById('bench-form-id').value.trim();
  const nombre      = document.getElementById('bench-form-nombre').value.trim();
  const modalidad   = document.getElementById('bench-form-modalidad').value.trim();
  const descripcion = document.getElementById('bench-form-descripcion').value.trim();
  const nivel       = document.getElementById('bench-form-nivel').value;

  if (!nombre || !descripcion) { alert('Completá nombre y descripción.'); return; }

  const finalId = id || nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const idx = cacheBenchmarks.findIndex(b => b.id === finalId);
  const wod = { id: finalId, nombre, modalidad, descripcion, nivel };

  if (idx >= 0) cacheBenchmarks[idx] = wod;
  else cacheBenchmarks.push(wod);

  await guardarBenchmarks();
  window.cerrarFormBenchmark();
  renderBenchmarkList(true);
};

window.eliminarBenchmark = async function(id) {
  const w = cacheBenchmarks?.find(b => b.id === id);
  if (!confirm('¿Eliminar "' + (w?.nombre || id) + '"?')) return;
  cacheBenchmarks = cacheBenchmarks.filter(b => b.id !== id);
  await guardarBenchmarks();
  renderBenchmarkList(currentUser?.role === 'coach');
};

window.cerrarModalBenchmark = function() {
  document.getElementById('modal-benchmark')?.classList.add('hidden');
};

// ─── EXPONER ──────────────────────────────────────────────────────────────────
window.renderBenchmarkList = renderBenchmarkList;
window.cargarBenchmarks    = cargarBenchmarks;