// ─── js/cronometro.js ─────────────────────────────────────────────────────────

// ─── ESTADO ───────────────────────────────────────────────────────────────────
let timerMode         = 'fortime';
let timerInterval     = null;
let timerRunning      = false;
let timerSeconds      = 0;
let timerPhase        = 'work';
let timerRound        = 1;
let timerTotalRounds  = 0;
let timerPhaseSeconds = 0;
let timerWorkSecs     = 0;
let timerRestSecs     = 0;
let timerLimitSecs    = 0;
let timerCountdown    = false;
let timerCountdownSec = 10;
let wodBlocks         = [];
let currentBlockIdx   = 0;
let emomExercises     = [];

// ─── AUDIO ────────────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function beep(freq = 880, duration = 0.15, vol = 2.0) {
  try {
    if(!audioCtx) audioCtx = new AudioCtx();
    const osc  = audioCtx.createOscillator();
    osc.type   = 'square';
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch(e) {}
}

function beepFinish()    { beep(660,0.15); setTimeout(()=>beep(880,0.15),150); setTimeout(()=>beep(1100,0.4),300); }
function beepVictory()   { beep(880,0.2);  setTimeout(()=>beep(1100,0.2),200); setTimeout(()=>beep(1320,0.5),400); }
function beepCountdown() { beep(440, 0.12, 2.0); }
function beepTen()       { beep(660, 0.2,  2.0); }
function beepStart()     { beep(1100, 0.35, 2.0); }
function beepNewRound()  {
  beep(880, 0.1);
  setTimeout(() => beep(880,  0.1),  120);
  setTimeout(() => beep(1100, 0.45), 240);
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function formatTime(s) {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
}

function setDisplay(main, sub = '') {
  const clock = document.getElementById('timer-clock');
  if(clock) clock.textContent = main;

  const phase = document.getElementById('timer-phase-label');
  if(phase) {
    phase.textContent = sub;
    phase.style.fontSize = sub ? '2.2rem' : '0';
  }

  // Fondo verde/rojo según fase
  const display = document.getElementById('timer-display');
  if(display) {
    display.classList.remove('timer-work', 'timer-rest');
    if(sub === '¡TRABAJO!') display.classList.add('timer-work');
    else if(sub === 'DESCANSO') display.classList.add('timer-rest');
  }

  // Mostrar modo en el div separado
  const modeEl = document.getElementById('timer-mode-display');
  if(modeEl) {
    const labels = {
      fortime:'FOR TIME', amrap:'AMRAP', emom:'EMOM',
      tabata:'TABATA', interval:'INTERVALOS', compound:'WOD COMPUESTO'
    };
    modeEl.textContent = labels[timerMode] || '';
  }
}

function setStatus(txt) {
  const el = document.getElementById('timer-round-label');
  if(!el) return;
  el.textContent      = txt;
  el.style.fontSize   = '1.2rem';
  el.style.color      = 'var(--text)';
  el.style.fontFamily = "'Barlow Condensed', sans-serif";
  el.style.fontWeight = '700';
  el.style.letterSpacing = '2px';
}

// ─── MODOS ────────────────────────────────────────────────────────────────────
export function setTimerMode(mode) {
  timerMode = mode;
  timerReset();
  document.querySelectorAll('.timer-mode-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.querySelectorAll('.timer-config-panel').forEach(p => p.classList.add('hidden'));
  const panels = {
    fortime:'fortime', amrap:'fortime', emom:'emom',
    tabata:'tabata', interval:'interval', compound:'compound'
  };
  document.getElementById('timer-config-' + panels[mode]).classList.remove('hidden');
  const labels = {
    fortime:'For Time', amrap:'AMRAP', emom:'EMOM',
    tabata:'Tabata', interval:'Intervalos', compound:'WOD Compuesto'
  };
  const labelEl = document.getElementById('timer-mode-label');
  if(labelEl) labelEl.textContent = labels[mode] || mode;
}

// ─── START / PAUSE / RESUME ───────────────────────────────────────────────────
export function timerStart() {
  const btn = document.getElementById('timer-btn-start');

  // PAUSAR
  if(timerRunning) {
    clearInterval(timerInterval);
    timerRunning   = false;
    timerCountdown = false;
    if(btn) btn.textContent = 'CONTINUAR';
    return;
  }

  if(btn) btn.textContent = 'PAUSAR';

  // Ocultar configuración al iniciar
  document.getElementById('timer-mode-selector').style.display = 'none';
  document.querySelectorAll('.timer-config-panel').forEach(p => p.style.display = 'none');

  if(timerMode === 'compound') {
    startCompound();
    return;
  }

  // REANUDAR — no resetear variables, solo reiniciar el setInterval
  if(timerSeconds > 0 || timerPhaseSeconds > 0) {
    timerRunning = true;
    resumeMainTimer();
    return;
  }

  // PRIMER INICIO — cuenta regresiva
  timerRunning      = true;
  timerCountdown    = true;
  timerCountdownSec = 10;
  setDisplay('00:10', '¡Preparate!');

  timerInterval = setInterval(() => {
    timerCountdownSec--;
    beepCountdown();
    if(timerCountdownSec <= 0) {
      clearInterval(timerInterval);
      timerCountdown = false;
      beepStart();
      setStatus('EN CURSO');
      setDisplay('00:00', '');
      startMainTimer();
    } else {
      setDisplay(formatTime(timerCountdownSec), '¡Preparate!');
    }
  }, 1000);
}

function startMainTimer() {
  if(timerMode === 'fortime' || timerMode === 'amrap') {
    startForTimeAmrap();
  } else if(timerMode === 'emom') {
    startEmom();
  } else if(timerMode === 'tabata') {
    startTabata();
  } else if(timerMode === 'interval') {
    startInterval();
  }
}

function resumeMainTimer() {
  if(timerMode === 'fortime' || timerMode === 'amrap') {
    timerInterval = setInterval(() => {
      timerSeconds++;
      if(timerSeconds === timerLimitSecs - 10) beepTen();
      if(timerLimitSecs > 0 && timerLimitSecs - timerSeconds <= 3 && timerLimitSecs - timerSeconds > 0) beepCountdown();
      if(timerLimitSecs > 0 && timerSeconds >= timerLimitSecs) {
        clearInterval(timerInterval);
        timerRunning = false;
        beepFinish();
        setDisplay(formatTime(timerSeconds), timerMode === 'amrap' ? '¡TIEMPO!' : '¡TIEMPO LÍMITE!');
        setStatus('FINALIZADO');
        const b = document.getElementById('timer-btn-start');
        if(b) b.textContent = 'INICIAR';
        return;
      }
      const sub = timerMode === 'amrap' && timerLimitSecs > 0
        ? `Quedan ${formatTime(timerLimitSecs - timerSeconds)}` : '';
      setDisplay(formatTime(timerSeconds), sub);
    }, 1000);

  } else if(timerMode === 'emom') {
    const intervalSec = parseInt(document.getElementById('emom-interval')?.value || 1) * 60;
    const exercises   = emomExercises.length ? emomExercises : Array(timerTotalRounds).fill('');
    timerInterval = setInterval(() => {
      timerPhaseSeconds++;
      const remaining = intervalSec - timerPhaseSeconds;
      if(remaining === 10) beepTen();
      if(remaining <= 3 && remaining > 0) beepCountdown();
      const exActual = exercises[(timerRound - 1) % exercises.length] || '';
      setDisplay(formatTime(remaining), exActual);
      if(timerPhaseSeconds >= intervalSec) {
        timerPhaseSeconds = 0;
        timerRound++;
        if(timerRound > timerTotalRounds) {
          clearInterval(timerInterval);
          timerRunning = false;
          beepVictory();
          setDisplay('¡LISTO!', `${timerTotalRounds} rondas completadas`);
          setStatus('FINALIZADO');
        } else {
          beepNewRound();
          setStatus(`RONDA ${timerRound} / ${timerTotalRounds}`);
        }
      }
    }, 1000);

  } else if(timerMode === 'tabata' || timerMode === 'interval') {
    timerInterval = setInterval(() => {
      timerPhaseSeconds++;
      const limit     = timerPhase === 'work' ? timerWorkSecs : timerRestSecs;
      const remaining = limit - timerPhaseSeconds;
      if(remaining === 10) beepTen();
      if(remaining <= 3 && remaining > 0) beepCountdown();
      setDisplay(formatTime(remaining), timerPhase === 'work' ? '¡TRABAJO!' : 'DESCANSO');
      if(timerPhaseSeconds >= limit) {
        timerPhaseSeconds = 0;
        if(timerPhase === 'work') {
          timerPhase = 'rest';
          beepFinish();
          setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);
        } else {
          timerPhase = 'work';
          timerRound++;
          if(timerRound > timerTotalRounds) {
            clearInterval(timerInterval);
            timerRunning = false;
            beepVictory();
            setDisplay('¡LISTO!', `${timerTotalRounds} rondas completadas`);
            setStatus('FINALIZADO');
          } else {
            beepNewRound();
            setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);
          }
        }
      }
    }, 1000);
  }
}

// ─── FOR TIME / AMRAP ─────────────────────────────────────────────────────────
function startForTimeAmrap() {
  const minEl = document.getElementById('fortime-min');
  const secEl = document.getElementById('fortime-sec');
  const limitMin = parseInt(minEl?.value || 0);
  const limitSec = parseInt(secEl?.value || 0);
  timerLimitSecs = limitMin * 60 + limitSec;
  timerSeconds   = 0;

  timerInterval = setInterval(() => {
    timerSeconds++;
    if(timerSeconds === timerLimitSecs - 10) beepTen();
    if(timerLimitSecs > 0 && timerLimitSecs - timerSeconds <= 3 && timerLimitSecs - timerSeconds > 0) beepCountdown();
    if(timerLimitSecs > 0 && timerSeconds >= timerLimitSecs) {
      clearInterval(timerInterval);
      timerRunning = false;
      beepFinish();
      setDisplay(formatTime(timerSeconds), timerMode === 'amrap' ? '¡TIEMPO!' : '¡TIEMPO LÍMITE!');
      setStatus('FINALIZADO');
      return;
    }
    const sub = timerMode === 'amrap' && timerLimitSecs > 0
      ? `Quedan ${formatTime(timerLimitSecs - timerSeconds)}`
      : '';
    setDisplay(formatTime(timerSeconds), sub);
  }, 1000);
}

// ─── EMOM ─────────────────────────────────────────────────────────────────────
function startEmom() {
  const intervalMin = parseInt(document.getElementById('emom-interval')?.value || 1);
  const rounds      = parseInt(document.getElementById('emom-rounds')?.value   || 10);
  const intervalSec = intervalMin * 60;
  timerTotalRounds  = rounds;
  timerRound        = 1;
  timerPhaseSeconds = 0;

  const exercises = emomExercises.length
    ? emomExercises
    : Array(rounds).fill('');

  setStatus(`RONDA ${timerRound} / ${timerTotalRounds}`);
  if(exercises[0]) setDisplay(formatTime(intervalSec - timerPhaseSeconds), exercises[0]);

  timerInterval = setInterval(() => {
    timerPhaseSeconds++;
    const remaining = intervalSec - timerPhaseSeconds;
    if(remaining === 10) beepTen();
    if(remaining <= 3 && remaining > 0) beepCountdown();

    const exActual = exercises[(timerRound - 1) % exercises.length] || '';
    setDisplay(formatTime(remaining), exActual);

    if(timerPhaseSeconds >= intervalSec) {
      timerPhaseSeconds = 0;
      timerRound++;
      if(timerRound > timerTotalRounds) {
        clearInterval(timerInterval);
        timerRunning = false;
        beepVictory();
        setDisplay('¡LISTO!', `${timerTotalRounds} rondas completadas`);
        setStatus('FINALIZADO');
      } else {
        beepNewRound();
        setStatus(`RONDA ${timerRound} / ${timerTotalRounds}`);
      }
    }
  }, 1000);
}

// ─── TABATA ───────────────────────────────────────────────────────────────────
function startTabata() {
  const workSec  = parseInt(document.getElementById('tabata-work')?.value  || 20);
  const restSec  = parseInt(document.getElementById('tabata-rest')?.value  || 10);
  const rounds   = parseInt(document.getElementById('tabata-rounds')?.value || 8);
  timerWorkSecs  = workSec;
  timerRestSecs  = restSec;
  timerTotalRounds = rounds;
  timerRound       = 1;
  timerPhase       = 'work';
  timerPhaseSeconds = 0;

  setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);

  timerInterval = setInterval(() => {
    timerPhaseSeconds++;
    const limit     = timerPhase === 'work' ? timerWorkSecs : timerRestSecs;
    const remaining = limit - timerPhaseSeconds;
    if(remaining === 10) beepTen();
    if(remaining <= 3 && remaining > 0) beepCountdown();
    setDisplay(formatTime(remaining), timerPhase === 'work' ? '¡TRABAJO!' : 'DESCANSO');

    if(timerPhaseSeconds >= limit) {
      timerPhaseSeconds = 0;
      if(timerPhase === 'work') {
        timerPhase = 'rest';
        beepFinish();
        setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);
      } else {
        timerPhase = 'work';
        timerRound++;
        if(timerRound > timerTotalRounds) {
          clearInterval(timerInterval);
          timerRunning = false;
          beepVictory();
          setDisplay('¡LISTO!', `${timerTotalRounds} rondas completadas`);
          setStatus('FINALIZADO');
        } else {
          beepNewRound();
          setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);
        }
      }
    }
  }, 1000);
}

// ─── INTERVALOS ───────────────────────────────────────────────────────────────
function startInterval() {
  const workSec    = parseInt(document.getElementById('interval-work')?.value   || 30);
  const restSec    = parseInt(document.getElementById('interval-rest')?.value   || 30);
  const rounds     = parseInt(document.getElementById('interval-rounds')?.value || 5);
  timerWorkSecs    = workSec;
  timerRestSecs    = restSec;
  timerTotalRounds = rounds;
  timerRound       = 1;
  timerPhase       = 'work';
  timerPhaseSeconds = 0;

  setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);

  timerInterval = setInterval(() => {
    timerPhaseSeconds++;
    const limit     = timerPhase === 'work' ? timerWorkSecs : timerRestSecs;
    const remaining = limit - timerPhaseSeconds;
    if(remaining === 10) beepTen();
    if(remaining <= 3 && remaining > 0) beepCountdown();
    setDisplay(formatTime(remaining), timerPhase === 'work' ? '¡TRABAJO!' : 'DESCANSO');

    if(timerPhaseSeconds >= limit) {
      timerPhaseSeconds = 0;
      if(timerPhase === 'work') {
        timerPhase = 'rest';
        beepFinish();
        setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);
      } else {
        timerPhase = 'work';
        timerRound++;
        if(timerRound > timerTotalRounds) {
          clearInterval(timerInterval);
          timerRunning = false;
          beepVictory();
          setDisplay('¡LISTO!', `${timerTotalRounds} rondas completadas`);
          setStatus('FINALIZADO');
        } else {
          beepNewRound();
          setStatus(`Ronda ${timerRound}/${timerTotalRounds}`);
        }
      }
    }
  }, 1000);
}

// ─── COMPOUND ─────────────────────────────────────────────────────────────────
function startCompound() {
  if(!wodBlocks.length) return alert('Agregá al menos un bloque.');
  currentBlockIdx = 0;
  runBlock(wodBlocks[0]);
}

function runBlock(bloque) {
  setStatus(`Bloque ${currentBlockIdx + 1}/${wodBlocks.length}: ${bloque.label}`);
  timerRunning = true;

  if(bloque.tipo === 'rest') {
    timerSeconds = bloque.min * 60 + bloque.sec;
    setDisplay(formatTime(timerSeconds), 'DESCANSO');
    timerInterval = setInterval(() => {
      timerSeconds--;
      setDisplay(formatTime(timerSeconds), 'DESCANSO');
      if(timerSeconds <= 0) {
        clearInterval(timerInterval);
        nextBlock();
      }
    }, 1000);

  } else if(bloque.tipo === 'fortime' || bloque.tipo === 'amrap') {
    const limitSec = bloque.min * 60 + bloque.sec;
    timerSeconds   = 0;
    timerInterval  = setInterval(() => {
      timerSeconds++;
      const sub = bloque.tipo === 'amrap' && limitSec > 0
        ? `Quedan ${formatTime(limitSec - timerSeconds)}`
        : '';
      setDisplay(formatTime(timerSeconds), sub);
      if(limitSec > 0 && timerSeconds >= limitSec) {
        clearInterval(timerInterval);
        beepFinish();
        nextBlock();
      }
    }, 1000);

  } else if(bloque.tipo === 'interval') {
    timerWorkSecs    = bloque.work;
    timerRestSecs    = bloque.rest;
    timerTotalRounds = bloque.rounds;
    timerRound       = 1;
    timerPhase       = 'work';
    timerPhaseSeconds = 0;

    timerInterval = setInterval(() => {
      timerPhaseSeconds++;
      const limit     = timerPhase === 'work' ? timerWorkSecs : timerRestSecs;
      const remaining = limit - timerPhaseSeconds;
      setDisplay(formatTime(remaining), timerPhase === 'work' ? '¡TRABAJO!' : 'DESCANSO');
      if(timerPhaseSeconds >= limit) {
        timerPhaseSeconds = 0;
        if(timerPhase === 'work') {
          timerPhase = 'rest';
          beepFinish();
        } else {
          timerPhase = 'work';
          timerRound++;
          if(timerRound > timerTotalRounds) {
            clearInterval(timerInterval);
            beepNewRound();
            nextBlock();
          } else {
            beepNewRound();
          }
        }
      }
    }, 1000);
  }
}

function nextBlock() {
  currentBlockIdx++;
  if(currentBlockIdx >= wodBlocks.length) {
    timerRunning = false;
    beepVictory();
    setDisplay('¡LISTO!', 'WOD completado');
    setStatus('FINALIZADO');
  } else {
    beepNewRound();
    setTimeout(() => runBlock(wodBlocks[currentBlockIdx]), 1000);
  }
}

// ─── RESET ────────────────────────────────────────────────────────────────────
export function timerReset() {
  clearInterval(timerInterval);
  timerRunning      = false;
  timerSeconds      = 0;
  timerPhase        = 'work';
  timerRound        = 1;
  timerPhaseSeconds = 0;
  timerCountdown    = false;
  currentBlockIdx   = 0;
  setDisplay('00:00', '');
  setStatus('');
  const modeEl = document.getElementById('timer-mode-display');
  if(modeEl) modeEl.textContent = '';
  const display = document.getElementById('timer-display');
  if(display) display.classList.remove('timer-work', 'timer-rest');
  const btn = document.getElementById('timer-btn-start');
  if(btn) btn.textContent = 'INICIAR';
  // Mostrar configuración sin llamar timerReset recursivamente
  const sel = document.getElementById('timer-mode-selector');
  if(sel) sel.style.display = '';
  document.querySelectorAll('.timer-config-panel').forEach(p => {
    p.style.display = '';
    p.classList.add('hidden');
  });
  const panels = {
    fortime:'fortime', amrap:'fortime', emom:'emom',
    tabata:'tabata', interval:'interval', compound:'compound'
  };
  const panelId = 'timer-config-' + (panels[timerMode] || 'fortime');
  const panel = document.getElementById(panelId);
  if(panel) { panel.classList.remove('hidden'); panel.style.display = ''; }
}

// ─── EMOM EJERCICIOS ──────────────────────────────────────────────────────────
export function agregarEjercicioEmom() {
  document.querySelectorAll('#emom-exercises input').forEach((input, i) => {
    emomExercises[i] = input.value;
  });
  emomExercises.push('');
  renderEjerciciosEmom();
}

function renderEjerciciosEmom() {
  const cont = document.getElementById('emom-exercises');
  cont.innerHTML = '';
  emomExercises.forEach((ex, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex; gap:8px; align-items:center; margin-bottom:8px;';
    div.innerHTML = `
      <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700;
        color:var(--accent); min-width:40px;">MIN ${i+1}</span>
      <input type="text" placeholder="Ej: 10 Burpees"
        style="flex:1; padding:8px 12px; font-size:0.82rem;">
      <button onclick="eliminarEjercicioEmom(${i})"
        style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:1rem;">✕</button>`;
    div.querySelector('input').value = ex;
    div.querySelector('input').addEventListener('input', e => { emomExercises[i] = e.target.value; });
    cont.appendChild(div);
  });
}

export function eliminarEjercicioEmom(i) {
  document.querySelectorAll('#emom-exercises input').forEach((input, idx) => {
    emomExercises[idx] = input.value;
  });
  emomExercises.splice(i, 1);
  renderEjerciciosEmom();
}

// ─── WOD COMPUESTO ────────────────────────────────────────────────────────────
export function agregarBloqueWod() {
  const tipo = document.getElementById('compound-tipo').value;
  let bloque = { tipo };

  if(tipo === 'rest') {
    bloque.min   = parseInt(document.getElementById('compound-min').value  || 0);
    bloque.sec   = parseInt(document.getElementById('compound-sec').value  || 0);
    bloque.label = 'REST ' + formatTime(bloque.min*60 + bloque.sec);
  } else if(tipo === 'emom') {
    bloque.interval  = parseInt(document.getElementById('compound-emom-interval').value || 1);
    bloque.rounds    = parseInt(document.getElementById('compound-emom-rounds').value   || 10);
    bloque.exercises = [];
    bloque.label     = 'EMOM ' + bloque.interval + 'min x' + bloque.rounds;
  } else if(tipo === 'amrap' || tipo === 'fortime') {
    bloque.min   = parseInt(document.getElementById('compound-min').value || 0);
    bloque.sec   = parseInt(document.getElementById('compound-sec').value || 0);
    bloque.label = tipo.toUpperCase() + ' ' + formatTime(bloque.min*60 + bloque.sec);
  } else if(tipo === 'interval') {
    bloque.work   = parseInt(document.getElementById('compound-int-work').value   || 30);
    bloque.rest   = parseInt(document.getElementById('compound-int-rest').value   || 30);
    bloque.rounds = parseInt(document.getElementById('compound-int-rounds').value || 5);
    bloque.label  = 'INTERVALOS ' + bloque.work + '/' + bloque.rest + 'seg x' + bloque.rounds;
  }

  wodBlocks.push(bloque);
  renderBloquesWod();
}

function renderBloquesWod() {
  const cont = document.getElementById('compound-blocks-list');
  cont.innerHTML = '';
  if(!wodBlocks.length) {
    cont.innerHTML = '<small style="color:var(--text-tertiary)">Sin bloques agregados.</small>';
    return;
  }
  wodBlocks.forEach((b, i) => {
    cont.innerHTML += `
      <div class="comp-cat-pill" style="margin-bottom:6px;">
        <div>
          <span style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem;
            font-weight:700; color:var(--accent); margin-right:8px;">${i+1}</span>
          <b>${b.label}</b>
        </div>
        <button onclick="eliminarBloqueWod(${i})"
          style="background:none;border:none;color:var(--danger);cursor:pointer;">✕</button>
      </div>`;
  });
}

export function eliminarBloqueWod(i) {
  wodBlocks.splice(i, 1);
  renderBloquesWod();
}

export function toggleCompoundTipo() {
  const tipo = document.getElementById('compound-tipo').value;
  document.getElementById('compound-config-time').classList.toggle('hidden',
    !['rest','amrap','fortime'].includes(tipo));
  document.getElementById('compound-config-emom').classList.toggle('hidden', tipo !== 'emom');
  document.getElementById('compound-config-interval').classList.toggle('hidden', tipo !== 'interval');
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.setTimerMode          = setTimerMode;
window.timerStart            = timerStart;
window.timerReset            = timerReset;
window.agregarEjercicioEmom  = agregarEjercicioEmom;
window.eliminarEjercicioEmom = eliminarEjercicioEmom;
window.agregarBloqueWod      = agregarBloqueWod;
window.eliminarBloqueWod     = eliminarBloqueWod;
window.toggleCompoundTipo    = toggleCompoundTipo;