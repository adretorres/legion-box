// ─── js/benchmark.js ──────────────────────────────────────────────────────────
import { fsGet, fsSet, currentUser, cacheResults } from './firebase.js';

// ─── BENCHMARK BASE DATA ──────────────────────────────────────────────────────
export const BENCHMARK_DEFAULT = [
  { id:'fran',      nombre:'Fran',      modalidad:'For Time', tiempo:'',   esquema:'21-15-9',         nivel:'benchmark', ejercicios:[{nombre:'Thrusters',peso:'43kg/30kg'},{nombre:'Pull-ups',peso:''}] },
  { id:'helen',     nombre:'Helen',     modalidad:'For Time', tiempo:'',   esquema:'3 rounds',        nivel:'benchmark', ejercicios:[{nombre:'400m Run',peso:''},{nombre:'KB Swings',peso:'24kg/16kg'},{nombre:'Pull-ups',peso:''}] },
  { id:'grace',     nombre:'Grace',     modalidad:'For Time', tiempo:'',   esquema:'30 reps',         nivel:'benchmark', ejercicios:[{nombre:'Clean & Jerk',peso:'61kg/43kg'}] },
  { id:'isabel',    nombre:'Isabel',    modalidad:'For Time', tiempo:'',   esquema:'30 reps',         nivel:'benchmark', ejercicios:[{nombre:'Snatch',peso:'61kg/43kg'}] },
  { id:'cindy',     nombre:'Cindy',     modalidad:'AMRAP',    tiempo:'20', esquema:'',                nivel:'benchmark', ejercicios:[{nombre:'Pull-ups',peso:''},{nombre:'Push-ups',peso:''},{nombre:'Air Squats',peso:''}] },
  { id:'mary',      nombre:'Mary',      modalidad:'AMRAP',    tiempo:'20', esquema:'',                nivel:'benchmark', ejercicios:[{nombre:'Handstand Push-ups',peso:''},{nombre:'Pistols alternados',peso:''},{nombre:'Pull-ups',peso:''}] },
  { id:'chelsea',   nombre:'Chelsea',   modalidad:'EMOM',     tiempo:'30', esquema:'cada minuto',     nivel:'benchmark', ejercicios:[{nombre:'Pull-ups',peso:''},{nombre:'Push-ups',peso:''},{nombre:'Air Squats',peso:''}] },
  { id:'barbara',   nombre:'Barbara',   modalidad:'For Time', tiempo:'',   esquema:'5 rounds',        nivel:'benchmark', ejercicios:[{nombre:'Pull-ups',peso:''},{nombre:'Push-ups',peso:''},{nombre:'Sit-ups',peso:''},{nombre:'Air Squats',peso:''}] },
  { id:'annie',     nombre:'Annie',     modalidad:'For Time', tiempo:'',   esquema:'50-40-30-20-10',  nivel:'benchmark', ejercicios:[{nombre:'Double Unders',peso:''},{nombre:'Sit-ups',peso:''}] },
  { id:'angie',     nombre:'Angie',     modalidad:'For Time', tiempo:'',   esquema:'100 reps c/u',    nivel:'benchmark', ejercicios:[{nombre:'Pull-ups',peso:''},{nombre:'Push-ups',peso:''},{nombre:'Sit-ups',peso:''},{nombre:'Air Squats',peso:''}] },
  { id:'diane',     nombre:'Diane',     modalidad:'For Time', tiempo:'',   esquema:'21-15-9',         nivel:'benchmark', ejercicios:[{nombre:'Deadlift',peso:'102kg/70kg'},{nombre:'Handstand Push-ups',peso:''}] },
  { id:'elizabeth', nombre:'Elizabeth', modalidad:'For Time', tiempo:'',   esquema:'21-15-9',         nivel:'benchmark', ejercicios:[{nombre:'Clean',peso:'61kg/43kg'},{nombre:'Ring Dips',peso:''}] },
  { id:'kelly',     nombre:'Kelly',     modalidad:'For Time', tiempo:'',   esquema:'5 rounds',        nivel:'benchmark', ejercicios:[{nombre:'400m Run',peso:''},{nombre:'Box Jumps',peso:'61cm/51cm'},{nombre:'Wall Ball',peso:'9kg/6kg'}] },
  { id:'eva',       nombre:'Eva',       modalidad:'For Time', tiempo:'',   esquema:'5 rounds',        nivel:'benchmark', ejercicios:[{nombre:'800m Run',peso:''},{nombre:'KB Swings',peso:'32kg/24kg'},{nombre:'Pull-ups',peso:''}] },
  { id:'linda',     nombre:'Linda',     modalidad:'For Time', tiempo:'',   esquema:'10-9-8...1',      nivel:'benchmark', ejercicios:[{nombre:'Deadlift',peso:'1.5xBW'},{nombre:'Bench Press',peso:'BW'},{nombre:'Clean',peso:'0.75xBW'}] },
  { id:'nancy',     nombre:'Nancy',     modalidad:'For Time', tiempo:'',   esquema:'5 rounds',        nivel:'benchmark', ejercicios:[{nombre:'400m Run',peso:''},{nombre:'Overhead Squats',peso:'43kg/30kg'}] },
  { id:'amanda',    nombre:'Amanda',    modalidad:'For Time', tiempo:'',   esquema:'9-7-5',           nivel:'benchmark', ejercicios:[{nombre:'Muscle-ups',peso:''},{nombre:'Squat Snatches',peso:'61kg/43kg'}] },
  { id:'jackie',    nombre:'Jackie',    modalidad:'For Time', tiempo:'',   esquema:'',                nivel:'benchmark', ejercicios:[{nombre:'1000m Row',peso:''},{nombre:'Thrusters',peso:'20kg'},{nombre:'Pull-ups',peso:''}] },
  { id:'karen',     nombre:'Karen',     modalidad:'For Time', tiempo:'',   esquema:'150 reps',        nivel:'benchmark', ejercicios:[{nombre:'Wall Ball',peso:'9kg/6kg a 3m/2.7m'}] },
  { id:'murph',     nombre:'Murph',     modalidad:'For Time', tiempo:'',   esquema:'con chaleco 9kg', nivel:'hero',      ejercicios:[{nombre:'1 Mile Run',peso:''},{nombre:'Pull-ups',peso:''},{nombre:'Push-ups',peso:''},{nombre:'Air Squats',peso:''},{nombre:'1 Mile Run',peso:''}] },
  { id:'dt',        nombre:'DT',        modalidad:'For Time', tiempo:'',   esquema:'5 rounds',        nivel:'hero',      ejercicios:[{nombre:'Deadlift',peso:'70kg/47kg'},{nombre:'Hang Power Clean',peso:'70kg/47kg'},{nombre:'Push Jerk',peso:'70kg/47kg'}] },
  { id:'daniel',    nombre:'Daniel',    modalidad:'For Time', tiempo:'',   esquema:'',                nivel:'hero',      ejercicios:[{nombre:'Pull-ups',peso:''},{nombre:'400m Run',peso:''},{nombre:'Thrusters',peso:'43kg'},{nombre:'800m Run',peso:''},{nombre:'400m Run',peso:''},{nombre:'Pull-ups',peso:''}] },
  { id:'jason',     nombre:'Jason',     modalidad:'For Time', tiempo:'',   esquema:'100-75-50-25 / 5-10-15-20', nivel:'hero', ejercicios:[{nombre:'Air Squats',peso:''},{nombre:'Muscle-ups',peso:''}] },
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

  // Render descripción estructurada
  const descEl = document.getElementById('bench-modal-descripcion');
  if (descEl) {
    let html = '';
    // Esquema en itálica
    if (w.esquema) {
      html += '<div style="font-size:0.82rem; color:var(--text-secondary); font-style:italic;' +
              'margin-bottom:12px; padding-bottom:10px; border-bottom:1px solid var(--border);">' +
              w.esquema + '</div>';
    }
    // Ejercicios
    const lista = w.ejercicios || [];
    if (lista.length) {
      html += '<div style="display:flex; flex-direction:column;">';
      lista.forEach(ej => {
        const nombre = typeof ej === 'string' ? ej : ej.nombre;
        const peso   = typeof ej === 'string' ? '' : (ej.peso || '');
        html += '<div style="display:flex; justify-content:space-between; align-items:center;' +
                'padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
                  '<span style="font-size:0.88rem; color:var(--text);">' + nombre + '</span>' +
                  (peso ? '<span style="font-size:0.78rem; color:var(--accent); font-weight:600;' +
                  'font-family:Barlow Condensed,sans-serif; letter-spacing:0.5px;' +
                  'flex-shrink:0; margin-left:12px;">(' + peso + ')</span>' : '') +
                '</div>';
      });
      html += '</div>';
    } else if (w.descripcion) {
      // Fallback: texto plano con saltos de línea
      html += '<p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.7; margin:0; white-space:pre-line;">' + w.descripcion + '</p>';
    }
    descEl.innerHTML = html;
  }


  // Cargar tiempo personal si existe
  const tiempoPersonal = _getTiempoPersonal(w.id);
  const inputTiempo = document.getElementById('bench-tiempo-input');
  if (inputTiempo) inputTiempo.value = tiempoPersonal || '';

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
  const errEl  = document.getElementById('bench-error');

  if (!tiempo) { if(errEl) errEl.textContent = 'Ingresá tu tiempo.'; return; }
  if (!currentUser?.id) { if(errEl) errEl.textContent = 'Iniciá sesión para guardar.'; return; }

  try {
    const key = 'bench_' + currentUser.id + '_' + wodId;
    const resultados = await fsGet('results') || {};
    resultados[key] = {
      tiempo,
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

  document.getElementById('bench-form-titulo').textContent = w ? 'Editar WOD' : 'Nuevo WOD';
  document.getElementById('bench-form-id').value           = w?.id || '';
  document.getElementById('bench-form-nombre').value       = w?.nombre || '';
  document.getElementById('bench-form-modalidad').value    = w?.modalidad || 'For Time';
  document.getElementById('bench-form-tiempo').value       = w?.tiempo || '';
  document.getElementById('bench-form-esquema').value      = w?.esquema || '';
  document.getElementById('bench-form-nivel').value        = w?.nivel || 'benchmark';

  // Cargar ejercicios
  const ejercicios = w?.ejercicios || [];
  _renderEjerciciosForm(ejercicios);

  modal.classList.remove('hidden');
};

function _renderEjerciciosForm(ejercicios) {
  const cont = document.getElementById('bench-form-ejercicios');
  if (!cont) return;
  cont.innerHTML = '';
  const lista = ejercicios.length ? ejercicios : [{nombre:'', peso:''}];
  lista.forEach((ej, i) => _agregarFilaEjercicio(cont, ej.nombre || '', ej.peso || '', i));
}

function _agregarFilaEjercicio(cont, nombre, peso, idx) {
  const div = document.createElement('div');
  div.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:8px;';

  const inputNombre = document.createElement('input');
  inputNombre.type        = 'text';
  inputNombre.placeholder = 'Ejercicio (ej: Thrusters)';
  inputNombre.value       = nombre;
  inputNombre.setAttribute('data-ej-nombre', '');
  inputNombre.style.cssText = 'flex:1.5; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.16); border-radius:8px; color:#fff; padding:8px 12px; font-size:0.84rem; outline:none;';

  const inputPeso = document.createElement('input');
  inputPeso.type        = 'text';
  inputPeso.placeholder = 'Peso (ej: 43kg/30kg)';
  inputPeso.value       = peso;
  inputPeso.setAttribute('data-ej-peso', '');
  inputPeso.style.cssText = 'flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.16); border-radius:8px; color:#fff; padding:8px 12px; font-size:0.84rem; outline:none;';

  const btnDel = document.createElement('button');
  btnDel.textContent    = '✕';
  btnDel.style.cssText  = 'background:none; border:1px solid rgba(255,80,80,0.4); color:#ff5050; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:0.75rem; flex-shrink:0;';
  btnDel.addEventListener('click', function() { div.remove(); });

  div.appendChild(inputNombre);
  div.appendChild(inputPeso);
  div.appendChild(btnDel);
  cont.appendChild(div);
}


window.benchAgregarEjercicio = function() {
  const cont = document.getElementById('bench-form-ejercicios');
  if (cont) _agregarFilaEjercicio(cont, '', '', cont.children.length);
};

window.cerrarFormBenchmark = function() {
  document.getElementById('modal-benchmark-form')?.classList.add('hidden');
};

window.guardarFormBenchmark = async function() {
  const id       = document.getElementById('bench-form-id').value.trim();
  const nombre   = document.getElementById('bench-form-nombre').value.trim();
  const modalidad= document.getElementById('bench-form-modalidad').value.trim();
  const tiempo   = document.getElementById('bench-form-tiempo').value.trim();
  const esquema  = document.getElementById('bench-form-esquema').value.trim();
  const nivel    = document.getElementById('bench-form-nivel').value;

  if (!nombre) { alert('Ingresá el nombre del WOD.'); return; }

  // Recolectar ejercicios del formulario dinámico
  const filas = document.querySelectorAll('#bench-form-ejercicios > div');
  const ejercicios = Array.from(filas).map(fila => ({
    nombre: fila.querySelector('[data-ej-nombre]')?.value?.trim() || '',
    peso:   fila.querySelector('[data-ej-peso]')?.value?.trim()   || ''
  })).filter(e => e.nombre);

  if (!ejercicios.length) { alert('Agregá al menos un ejercicio.'); return; }

  const finalId = id || nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const idx = cacheBenchmarks.findIndex(b => b.id === finalId);
  const wod = { id: finalId, nombre, modalidad, tiempo, esquema, nivel, ejercicios };

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