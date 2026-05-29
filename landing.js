// ─── LANDING JS ───────────────────────────────────────────────────────────────

// ─── MODAL LOGIN ──────────────────────────────────────────────────────────────
window.abrirModalLogin = function() {
  document.getElementById('modal-login').classList.remove('hidden');
  setTimeout(() => document.getElementById('login-user')?.focus(), 100);
};

window.cerrarModalLogin = function(e) {
  if (e && e.target !== document.getElementById('modal-login')) return;
  document.getElementById('modal-login').classList.add('hidden');
  document.getElementById('login-error').textContent = '';
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') window.cerrarModalLogin();
});

// ─── MOBILE MENU ──────────────────────────────────────────────────────────────
window.toggleMobileMenu = function() {
  document.getElementById('lnd-mobile-menu').classList.toggle('hidden');
};

// ─── TABS DE LA APP DESDE LA LANDING ──────────────────────────────────────────
window.lndSwitchTab = function(id, btn) {
  // Scroll hasta el contenido de la app
  const appEl = document.getElementById('screen-app');
  if (appEl) {
    const navH  = document.querySelector('.lnd-nav')?.offsetHeight  || 64;
    const tabsH = document.querySelector('.lnd-app-tabs')?.offsetHeight || 42;
    const top   = appEl.getBoundingClientRect().top + window.scrollY - navH - tabsH - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  // Delegar al switchTab de main.js
  if (window.switchTab) window.switchTab(id, btn);
};

// ─── CALCULADORA PÚBLICA ──────────────────────────────────────────────────────
window.lndCalculate = function() {
  const rm  = parseFloat(document.getElementById('lnd-rm-input').value);
  const res = document.getElementById('lnd-calc-results');
  if (!rm || rm <= 0) { res.innerHTML = ''; return; }
  const percents = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 40];
  res.innerHTML = percents.map(p => `
    <div class="lnd-rm-cell">
      <small>${p}%</small>
      <b>${((rm * p) / 100).toFixed(1)}</b>
      <span>kg</span>
    </div>`).join('');
};

// ─── CARGAR HORARIOS DESDE FIRESTORE ──────────────────────────────────────────
window.lndRenderSchedules = function(SCHEDULES) {
  const renderTimes = (id, disc) => {
    const el = document.getElementById(id);
    if (!el || !SCHEDULES[disc]?.length) return;
    el.innerHTML = SCHEDULES[disc].map(t => `<span>${t}</span>`).join('');
  };
  renderTimes('lnd-times-crossfit',  'crossfit');
  renderTimes('lnd-times-funcional', 'funcional');
};

// ─── CARGAR MEMBRESÍAS DESDE FIRESTORE ────────────────────────────────────────
// Solo se usa si el coach actualizó info.prices con contenido enriquecido
window.lndRenderPricing = function(prices) {
  // Las membresías están hardcodeadas en el HTML — solo sobreescribir si hay contenido
  // enriquecido guardado por el coach en Firestore
  if (!prices || prices.trim() === '' ||
      prices.includes('Membresías y Planes actualizados')) return;
  const cont = document.getElementById('lnd-pricing-content');
  if (!cont) return;
  cont.innerHTML = prices;
};

// ─── COMPETENCIA PÚBLICA ──────────────────────────────────────────────────────
window.lndMostrarCompetencia = function(comp) {
  if (!comp || !comp.activa || !comp.accesoPublico) return;
  const banner = document.getElementById('lnd-comp-banner');
  if (!banner) return;
  banner.classList.remove('hidden');
  const nombreEl = document.getElementById('lnd-comp-nombre');
  const descEl   = document.getElementById('lnd-comp-desc');
  if (nombreEl && comp.nombre) nombreEl.textContent = comp.nombre;
  if (descEl) descEl.textContent = 'Competencia en curso — seguí el leaderboard en vivo.';
};

// ─── SMOOTH SCROLL ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#screen-landing a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        const navH  = document.querySelector('.lnd-nav')?.offsetHeight  || 64;
        const tabsH = document.querySelector('.lnd-app-tabs')?.offsetHeight || 0;
        const top   = target.getBoundingClientRect().top + window.scrollY - navH - tabsH - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
});


// ─── ENCICLOPEDIA DE MOVIMIENTOS ─────────────────────────────────────────────
// Base de datos de movimientos — alfabética
// Los que tienen contenido están completos, el resto aparece como "próximamente"

const ENC_MOVIMIENTOS = {
  backSquat: {
    nombre: 'Back Squat',
    desc: 'La sentadilla con barra es el rey de los ejercicios de piernas. Desarrolla fuerza, potencia y masa muscular en cuádriceps, isquiotibiales y glúteos.',
    pasos: ['Barra sobre los trapecios (high bar) o deltoides posteriores (low bar).','Pies algo más abiertos que el ancho de cadera, punteras levemente hacia afuera.','Respiración profunda, bracing de core antes de bajar.','Descendé controlado manteniendo rodillas alineadas con los pies.','Bajá hasta que los muslos queden paralelos o más abajo del suelo.','Ascendé empujando el suelo, extendiendo caderas y rodillas a la vez.']
  },
  benchPress: {
    nombre: 'Bench Press',
    desc: 'El press de banca es el ejercicio de empuje horizontal por excelencia. Trabaja pectorales, deltoides anteriores y tríceps.',
    pasos: ['Acostado en el banco, pies apoyados en el suelo.','Agarre ligeramente más ancho que los hombros, retracción de escápulas.','Bajá la barra controlado hasta rozar el pecho.','Empujá explosivamente hasta extender los codos.','Mantené los arcos naturales de la columna durante todo el movimiento.']
  },
  boxJump: {
    nombre: 'Box Jump',
    desc: 'El salto al cajón desarrolla potencia explosiva en piernas y mejora la capacidad reactiva del sistema nervioso.',
    pasos: ['Parado frente al cajón, pies al ancho de caderas.','Flexión de rodillas con balanceo de brazos hacia atrás.','Impulsá con los brazos y saltá explosivamente.','Aterrizá sobre el cajón con ambos pies simultáneamente.','Extendé las caderas completamente en la parte superior.','Bajá controlado o saltá hacia atrás según el movimiento requerido.']
  },
  burpee: {
    nombre: 'Burpee',
    desc: 'El Burpee es el ejercicio de acondicionamiento físico más completo del CrossFit. Combina flexión de brazos, salto y coordinación en un movimiento continuo.',
    pasos: ['De pie, saltá hacia abajo llevando las manos al suelo.','Llevá los pies hacia atrás en posición de plank.','Realizá una flexión de brazos tocando el pecho al suelo.','Empujá y llevá los pies hacia adelante hacia las manos.','Extendé las caderas y saltá con los brazos arriba.','Palmadas sobre la cabeza en el punto más alto del salto.']
  },
  clean: {
    nombre: 'Clean & Jerk',
    desc: 'El Clean & Jerk combina dos movimientos: llevás la barra a los hombros (clean) y luego la proyectás sobre la cabeza (jerk). Es el movimiento más completo de la halterofilia.',
    pasos: ['CLEAN: agarre medio, pies al ancho de caderas.','Primera tracción: empujá el suelo manteniendo el pecho alto.','Segunda tracción: extensión explosiva de caderas al pasar las rodillas.','Recibí la barra en rack position en posición de sentadilla frontal.','JERK: dip controlado flexionando levemente las rodillas.','Impulsá la barra arriba extendiendo piernas y brazos simultáneamente.']
  },
  deadlift: {
    nombre: 'Deadlift',
    desc: 'El peso muerto es el ejercicio de fuerza más básico y completo. Trabaja toda la cadena posterior del cuerpo.',
    pasos: ['Parado detrás de la barra, pies al ancho de caderas.','Flexioná las rodillas hasta tomar la barra con agarre doble prono.','Espalda recta, pecho alto, escápulas retraídas.','Empujá el suelo con los pies, extendé rodillas y caderas simultáneamente.','La barra sube pegada al cuerpo en todo momento.','Finalizá de pie, hombros atrás, sin hiperlordosis lumbar.']
  },
  doubleUnder: { nombre: 'Double Under', desc: null, pasos: [] },
  frontSquat: {
    nombre: 'Front Squat',
    desc: 'La sentadilla frontal trabaja los cuádriceps y el core con mayor exigencia que el back squat. Es base del Clean.',
    pasos: ['Barra sobre los deltoides anteriores, codos paralelos al suelo.','Pies al ancho de hombros, punteras hacia afuera.','Descendé manteniendo el torso erguido y los codos altos.','Bajá hasta paralelo o más, sin que los codos caigan.','Ascendé empujando el suelo, manteniendo posición de rack.']
  },
  ghd: { nombre: 'GHD Sit-up', desc: null, pasos: [] },
  handstandPushup: { nombre: 'Handstand Push-up', desc: null, pasos: [] },
  handstandWalk: { nombre: 'Handstand Walk', desc: null, pasos: [] },
  hangClean: { nombre: 'Hang Clean', desc: null, pasos: [] },
  hangSnatch: { nombre: 'Hang Snatch', desc: null, pasos: [] },
  kettlebellSwing: {
    nombre: 'Kettlebell Swing',
    desc: 'El swing de kettlebell es un movimiento de bisagra de cadera explosivo que desarrolla potencia en la cadena posterior.',
    pasos: ['Kettlebell en el suelo, parado detrás con pies al ancho de hombros.','Bisagra de cadera para tomar la pesa.','Balanceá la pesa entre las piernas manteniendo la espalda recta.','Extendé las caderas explosivamente proyectando la pesa.','La pesa sube por inercia hasta la altura de los hombros o sobre la cabeza.','Dejala bajar controlada y repetí el movimiento en bisagra.']
  },
  lunge: { nombre: 'Lunge', desc: null, pasos: [] },
  muscleUp: { nombre: 'Muscle-up', desc: null, pasos: [] },
  ohSquat: { nombre: 'Overhead Squat', desc: null, pasos: [] },
  pistol: { nombre: 'Pistol Squat', desc: null, pasos: [] },
  powerClean: { nombre: 'Power Clean', desc: null, pasos: [] },
  powerSnatch: { nombre: 'Power Snatch', desc: null, pasos: [] },
  press: {
    nombre: 'Press (Shoulder Press)',
    desc: 'El press de hombros stricto desarrolla fuerza en deltoides, tríceps y core sin impulso de piernas.',
    pasos: ['Barra en rack a la altura de los hombros, agarre ligeramente más ancho.','Codos ligeramente adelante de la barra.','Activá el core y los glúteos.','Empujá la barra hacia arriba en trayectoria vertical.','Al pasar la cabeza, llevá el cuerpo levemente hacia adelante.','Bloqueá los codos arriba con la barra sobre el centro de masa.']
  },
  pullup: {
    nombre: 'Pull-up',
    desc: 'La dominada es el ejercicio de tracción por excelencia. Trabaja dorsal ancho, bíceps y core.',
    pasos: ['Colgá de la barra con agarre prono, manos algo más anchas que los hombros.','Activá el core y los glúteos.','Iniciá el movimiento retrayendo las escápulas.','Jalá hacia arriba hasta que la barbilla supere la barra.','Controlá el descenso con los brazos extendidos.','Para kipping: usá el balanceo del cuerpo para generar impulso.']
  },
  pushJerk: { nombre: 'Push Jerk', desc: null, pasos: [] },
  pushPress: { nombre: 'Push Press', desc: null, pasos: [] },
  pushup: { nombre: 'Push-up', desc: null, pasos: [] },
  ringDip: { nombre: 'Ring Dip', desc: null, pasos: [] },
  ringMuscleUp: { nombre: 'Ring Muscle-up', desc: null, pasos: [] },
  ropeClimb: {
    nombre: 'Rope Climb',
    desc: 'La escalada de soga trabaja la tracción de brazos, el core y la coordinación de todo el cuerpo.',
    pasos: ['Tomá la soga con ambas manos, brazos extendidos.','Elevá las rodillas y enroscá la soga alrededor de un pie.','Pisá la soga con el otro pie para bloquearla.','Empujá con las piernas mientras jalás con los brazos.','Repetí el proceso hasta llegar arriba.','En el descenso, controlá la velocidad con brazos y pies.']
  },
  rowErg: { nombre: 'Row (Remo)', desc: null, pasos: [] },
  russianKB: { nombre: 'Russian KB Swing', desc: null, pasos: [] },
  situp: { nombre: 'Sit-up', desc: null, pasos: [] },
  snatch: {
    nombre: 'Snatch',
    desc: 'El Snatch o Arranque consiste en levantar la barra desde el suelo hasta sobre la cabeza en un solo movimiento explosivo.',
    pasos: ['Posicioná los pies al ancho de caderas, agarre ancho sobre la barra.','Empujá el suelo alejando la barra de las espinillas manteniendo la espalda recta.','Cuando la barra supera las rodillas, extendé las caderas explosivamente.','Elevá los hombros y jalá la barra hacia arriba pegada al cuerpo.','Debajo de la barra en squat, recibila con los brazos extendidos.','Levantate manteniendo la barra estable sobre la cabeza.']
  },
  splitJerk: { nombre: 'Split Jerk', desc: null, pasos: [] },
  sumoDeadlift: { nombre: 'Sumo Deadlift', desc: null, pasos: [] },
  sumoDeadliftHighPull: { nombre: 'Sumo Deadlift High Pull', desc: null, pasos: [] },
  thruster: {
    nombre: 'Thruster',
    desc: 'El Thruster combina una sentadilla frontal con un push press. Es uno de los movimientos más demandantes del CrossFit.',
    pasos: ['Barra en rack position, pies al ancho de caderas.','Descendé en sentadilla frontal manteniendo los codos altos.','Al llegar al fondo, revertí el movimiento explosivamente.','Usá el impulso de las piernas para proyectar la barra hacia arriba.','Extendé brazos completamente por encima de la cabeza.','Bajá la barra al rack position para el siguiente rep.']
  },
  toeToBar: {
    nombre: 'Toes to Bar',
    desc: 'El Toes to Bar trabaja abdominales, flexores de cadera y dorsales en un movimiento colgado de la barra.',
    pasos: ['Colgá de la barra con agarre prono, brazos extendidos.','Iniciá el kipping con un balanceo suave.','En el balanceo hacia atrás, jalá con los dorsales.','Llevá las piernas juntas hacia la barra.','Tocá la barra con ambos pies simultáneamente.','Dejá bajar las piernas y repetí aprovechando el balanceo.']
  },
  wallBall: { nombre: 'Wall Ball', desc: null, pasos: [] },
};

// Lista ordenada alfabéticamente por nombre
const ENC_LISTA = Object.entries(ENC_MOVIMIENTOS)
  .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, 'es'));

// ─── RENDER LISTA ─────────────────────────────────────────────────────────────
function lndRenderEncLista(containerId) {
  const cont = document.getElementById(containerId || 'lnd-enc-list');
  if (!cont) return;
  cont.innerHTML = ENC_LISTA.map(([id, mov]) => `
    <div class="lnd-enc-list-item ${!mov.desc ? 'proximamente' : ''}"
      onclick="${mov.desc ? `lndMostrarMovimiento('${id}')` : ''}"
      id="lnd-enc-item-${id}">
      <span class="lnd-enc-list-dot"></span>
      <span>${mov.nombre}</span>
      ${!mov.desc ? '<span style="font-size:0.65rem; margin-left:auto; opacity:0.5;">próx.</span>' : ''}
    </div>`).join('');
}

// ─── MOSTRAR MOVIMIENTO ───────────────────────────────────────────────────────
window.lndMostrarMovimiento = function(id) {
  const mov    = ENC_MOVIMIENTOS[id];
  const detail = document.getElementById('lnd-enc-detail');
  if (!mov?.desc || !detail) return;

  // Marcar activo
  document.querySelectorAll('.lnd-enc-list-item').forEach(el => el.classList.remove('active'));
  document.getElementById('lnd-enc-item-' + id)?.classList.add('active');

  document.getElementById('lnd-enc-nombre').textContent = mov.nombre;
  document.getElementById('lnd-enc-desc').textContent   = mov.desc;
  document.getElementById('lnd-enc-pasos').innerHTML    = mov.pasos
    .map((p, i) => `<div class="lnd-enc-paso"><span class="lnd-enc-paso-num">${i+1}</span><span>${p}</span></div>`)
    .join('');

  detail.classList.remove('hidden');
};

window.lndCerrarMovimiento = function() {
  document.getElementById('lnd-enc-detail')?.classList.add('hidden');
  document.querySelectorAll('.lnd-enc-list-item').forEach(el => el.classList.remove('active'));
};

// ─── INIT EN DOMContentLoaded ─────────────────────────────────────────────────
// Render inicial con datos base al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  lndRenderEncLista('lnd-enc-list');
});

// Cargar movimientos custom desde Firestore con reintentos
async function cargarEnciclopediaFirestore(intentos) {
  intentos = intentos || 0;
  if (intentos > 5) return; // máximo 5 reintentos
  try {
    const fsGet = window._fsGet;
    if (!fsGet) {
      // _fsGet no está listo, reintentar en 1 segundo
      setTimeout(() => cargarEnciclopediaFirestore(intentos + 1), 1000);
      return;
    }
    const custom = await fsGet('enciclopedia');
    if (custom?.movimientos && Object.keys(custom.movimientos).length > 0) {
      Object.assign(ENC_MOVIMIENTOS, custom.movimientos);
      lndRenderEncLista('lnd-enc-list');
    } else {
      // Sin datos aún, reintentar
      setTimeout(() => cargarEnciclopediaFirestore(intentos + 1), 2000);
    }
  } catch(e) {
    // Error de Firestore, reintentar con backoff
    const delay = Math.min(1000 * Math.pow(2, intentos), 10000);
    setTimeout(() => cargarEnciclopediaFirestore(intentos + 1), delay);
  }
}

// ─── RENDER CON CUSTOM ───────────────────────────────────────────────────────
function renderizarMovimientosLanding(custom) {
  if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) {
    Object.assign(ENC_MOVIMIENTOS, custom);
  }
  lndRenderEncLista('lnd-enc-list');
}

// ─── CARGA DIRECTA DESDE FIRESTORE ───────────────────────────────────────────
async function cargarMovimientosLandingDirecto() {
  try {
    if (typeof window._fsGet !== 'function') {
      // _fsGet no está listo aún — reintentar en 500ms una sola vez
      setTimeout(cargarMovimientosLandingDirecto, 500);
      return;
    }
    const data = await window._fsGet('enciclopedia');
    const custom = data?.movimientos || {};
    renderizarMovimientosLanding(custom);
  } catch(e) {
    console.warn('[Landing] No se pudieron cargar movimientos custom:', e.message);
    renderizarMovimientosLanding({});
  }
}

// Render base inmediato al cargar el DOM + carga async de custom
document.addEventListener('DOMContentLoaded', () => {
  lndRenderEncLista('lnd-enc-list');
  cargarMovimientosLandingDirecto();
});

// ─── ENCICLOPEDIA EN APP (tab Calculadora RM) ─────────────────────────────────
// Usa los mismos datos de ENC_MOVIMIENTOS del landing
// El coach puede agregar/editar/eliminar desde Firestore

let appEncMovimientos = {}; // se carga desde Firestore + merge con ENC_MOVIMIENTOS

async function appEncCargar() {
  // Cargar custom desde Firestore
  try {
    const fsGet = window._fsGet;
    if (fsGet) {
      const custom = await fsGet('enciclopedia');
      appEncMovimientos = { ...ENC_MOVIMIENTOS };
      if (custom?.movimientos) Object.assign(appEncMovimientos, custom.movimientos);
    } else {
      appEncMovimientos = { ...ENC_MOVIMIENTOS };
    }
  } catch(e) {
    appEncMovimientos = { ...ENC_MOVIMIENTOS };
  }
  appEncRenderLista();
}

function appEncRenderLista() {
  const cont = document.getElementById('app-enc-list');
  if (!cont) return;
  const lista = Object.entries(appEncMovimientos)
    .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, 'es'));
  cont.innerHTML = lista.map(([id, mov]) => `
    <div class="lnd-enc-list-item ${!mov.desc ? 'proximamente' : ''}"
      onclick="${mov.desc ? `appEncMostrar('${id}')` : ''}"
      id="app-enc-item-${id}">
      <span class="lnd-enc-list-dot"></span>
      <span>${mov.nombre}</span>
      ${!mov.desc ? '<span style="font-size:0.65rem;margin-left:auto;opacity:0.5;">próx.</span>' : ''}
    </div>`).join('');
}

window.appEncMostrar = function(id) {
  const mov    = appEncMovimientos[id];
  const detail = document.getElementById('app-enc-detail');
  if (!mov?.desc || !detail) return;

  detail.dataset.id = id;

  // Marcar activo
  document.querySelectorAll('#app-enc-list .lnd-enc-list-item').forEach(el => el.classList.remove('active'));
  document.getElementById('app-enc-item-' + id)?.classList.add('active');

  document.getElementById('app-enc-nombre').textContent = mov.nombre;
  document.getElementById('app-enc-desc').textContent   = mov.desc;

  // Media
  const mediaEl = document.getElementById('app-enc-media');
  if (mov.mediaUrl) {
    const isYT = mov.mediaUrl.includes('youtube') || mov.mediaUrl.includes('youtu.be');
    if (isYT) {
      const ytId = mov.mediaUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1];
      mediaEl.innerHTML = ytId
        ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${ytId}"
            frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`
        : `<div class="lnd-enc-media-placeholder"><span>▶</span><p>URL de video inválida</p></div>`;
    } else {
      mediaEl.innerHTML = `<img src="${mov.mediaUrl}" alt="${mov.nombre}"
        style="width:100%; border-radius:8px; object-fit:cover;" onerror="this.parentNode.innerHTML='<div class=lnd-enc-media-placeholder><span>🖼</span><p>Imagen no disponible</p></div>'" />`;
    }
  } else {
    mediaEl.innerHTML = `<div class="lnd-enc-media-placeholder"><span>▶</span><p>Sin recursos visuales aún</p></div>`;
  }

  // Mostrar botones coach
  const { currentUser } = window._legionState || {};
  const esCoach = currentUser?.role === 'coach' || document.getElementById('app-enc-btn-editar')?.dataset.coach === 'true';
  document.getElementById('app-enc-btn-editar')?.classList.toggle('hidden', !esCoach);
  document.getElementById('app-enc-btn-eliminar')?.classList.toggle('hidden', !esCoach);

  detail.classList.remove('hidden');
};

window.appEncCerrar = function() {
  document.getElementById('app-enc-detail')?.classList.add('hidden');
  document.querySelectorAll('#app-enc-list .lnd-enc-list-item').forEach(el => el.classList.remove('active'));
};

window.appEncNuevo = function() {
  document.getElementById('app-enc-editor-titulo').textContent = 'Nuevo Movimiento';
  document.getElementById('app-enc-nombre-input').value  = '';
  document.getElementById('app-enc-desc-input').value    = '';
  document.getElementById('app-enc-media-input').value   = '';
  document.getElementById('app-enc-edit-id').value       = '';
  document.getElementById('app-enc-editor').classList.remove('hidden');
};

window.appEncEditar = function(id) {
  const mov = appEncMovimientos[id];
  if (!mov) return;
  document.getElementById('app-enc-editor-titulo').textContent = 'Editar: ' + mov.nombre;
  document.getElementById('app-enc-nombre-input').value  = mov.nombre;
  document.getElementById('app-enc-desc-input').value    = mov.desc || '';
  document.getElementById('app-enc-media-input').value   = mov.mediaUrl || '';
  document.getElementById('app-enc-edit-id').value       = id;
  document.getElementById('app-enc-editor').classList.remove('hidden');
};

window.appEncCancelar = function() {
  document.getElementById('app-enc-editor').classList.add('hidden');
};

window.appEncGuardar = async function() {
  const nombre   = document.getElementById('app-enc-nombre-input').value.trim();
  const desc     = document.getElementById('app-enc-desc-input').value.trim();
  const mediaUrl = document.getElementById('app-enc-media-input').value.trim();
  const editId   = document.getElementById('app-enc-edit-id').value.trim();

  if (!nombre || !desc) return alert('Completá nombre y descripción.');

  const id = editId || nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
  appEncMovimientos[id] = { nombre, desc, mediaUrl: mediaUrl || null, pasos: [] };

  try {
    const fsGet = window._fsGet;
    const fsSet = window._fsSet;
    if (fsGet && fsSet) {
      const custom = await fsGet('enciclopedia') || { movimientos: {} };
      custom.movimientos[id] = appEncMovimientos[id];
      await fsSet('enciclopedia', custom);
    }
  } catch(e) { console.log('Error guardando enciclopedia:', e); }

  appEncRenderLista();
  // Sincronizar con el landing
  if (typeof lndRenderEncLista === 'function') {
    // Actualizar ENC_MOVIMIENTOS con los datos custom
    Object.assign(ENC_MOVIMIENTOS, appEncMovimientos);
    lndRenderEncLista('lnd-enc-list');
  }
  window.appEncCancelar();
  alert('Movimiento guardado.');
};

window.appEncEliminar = async function(id) {
  const mov = appEncMovimientos[id];
  if (!confirm(`¿Eliminar "${mov?.nombre}"?`)) return;

  // Solo eliminar si es custom (no está en ENC_MOVIMIENTOS base)
  if (ENC_MOVIMIENTOS[id]) {
    return alert('No se pueden eliminar los movimientos base. Solo podés editar su descripción.');
  }

  delete appEncMovimientos[id];
  try {
    const fsGet = window._fsGet;
    const fsSet = window._fsSet;
    if (fsGet && fsSet) {
      const custom = await fsGet('enciclopedia') || { movimientos: {} };
      delete custom.movimientos[id];
      await fsSet('enciclopedia', custom);
    }
  } catch(e) { console.log('Error:', e); }

  appEncRenderLista();
  document.getElementById('app-enc-detail')?.classList.add('hidden');
};

// Inicializar enciclopedia en app cuando se abre el tab
window.appEncInit = function(isCoach) {
  const addBtn = document.getElementById('app-enc-add-btn-wrap');
  if (addBtn) addBtn.classList.toggle('hidden', !isCoach);
  // Marcar botones editar/eliminar para saber el rol
  const btnEdit = document.getElementById('app-enc-btn-editar');
  const btnDel  = document.getElementById('app-enc-btn-eliminar');
  if (btnEdit) btnEdit.dataset.coach = isCoach ? 'true' : 'false';
  if (btnDel)  btnDel.dataset.coach  = isCoach ? 'true' : 'false';
  appEncCargar();
};