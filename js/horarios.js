// ─── js/horarios.js ───────────────────────────────────────────────────────────
import {
  fsSet,
  cacheInfo, setCacheInfo,
  SCHEDULES, setSchedules
} from './firebase.js';

// ─── ADMIN ────────────────────────────────────────────────────────────────────
export function renderHorariosAdmin() {
  const cont = document.getElementById('horarios-admin-cont');
  if(!cont) return;
  cont.innerHTML = '';

  ['crossfit', 'funcional', 'openbox'].forEach(disc => {
    const label   = { crossfit:'CrossFit', funcional:'Funcional', openbox:'Open Box (Sábado)' }[disc];
    const horarios = SCHEDULES[disc] || [];

    cont.innerHTML += `
      <div style="margin-bottom:16px;">
        <p style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700;
          letter-spacing:2px; color:var(--accent); text-transform:uppercase; margin-bottom:8px;">
          ${label}</p>
        <div id="horarios-${disc}" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
          ${horarios.map(h => `
            <span style="background:var(--card); border:1px solid var(--border);
              border-radius:var(--radius-sm); padding:4px 10px; font-size:0.8rem;
              display:flex; align-items:center; gap:6px;">
              ${h}
              <button onclick="eliminarHorario('${disc}','${h}')"
                style="background:none;border:none;color:var(--danger);
                cursor:pointer;font-size:0.9rem;padding:0;line-height:1;">✕</button>
            </span>`).join('')}
        </div>
        <div style="display:flex; gap:8px;">
          <input type="text" id="nuevo-horario-${disc}"
            placeholder="Ej: 10:00 hs"
            style="flex:1; padding:8px 12px; font-size:0.82rem;">
          <button onclick="agregarHorario('${disc}')"
            class="btn-save"
            style="padding:8px 16px; background:none; border:1px solid var(--accent);
            color:var(--accent); white-space:nowrap;">+ Agregar</button>
        </div>
      </div>`;
  });
}

export async function agregarHorario(disc) {
  const input = document.getElementById(`nuevo-horario-${disc}`);
  const valor = input.value.trim();
  if(!valor) return alert('Ingresá un horario.');
  if(!SCHEDULES[disc]) SCHEDULES[disc] = [];
  if(SCHEDULES[disc].includes(valor)) return alert('Ese horario ya existe.');

  SCHEDULES[disc].push(valor);
  SCHEDULES[disc].sort();

  if(!cacheInfo.schedules) cacheInfo.schedules = {};
  cacheInfo.schedules = { ...SCHEDULES };
  await fsSet('info', cacheInfo);

  input.value = '';
  renderHorariosAdmin();
  refreshScheduleUI();
}

export async function eliminarHorario(disc, horario) {
  if(!confirm(`¿Eliminar el horario "${horario}" de ${disc}?`)) return;
  SCHEDULES[disc] = SCHEDULES[disc].filter(h => h !== horario);

  if(!cacheInfo.schedules) cacheInfo.schedules = {};
  cacheInfo.schedules = { ...SCHEDULES };
  await fsSet('info', cacheInfo);

  renderHorariosAdmin();
  refreshScheduleUI();
}

// ─── PÚBLICO ──────────────────────────────────────────────────────────────────
export function renderHorariosPublico() {
  const cont = document.getElementById('horarios-publico-cont');
  if(!cont) return;
  cont.innerHTML = '';

  const labels = { crossfit:'CrossFit', funcional:'Funcional', openbox:'Open Box (Sábado)' };
  ['crossfit', 'funcional', 'openbox'].forEach(disc => {
    const horarios = SCHEDULES[disc] || [];
    cont.innerHTML += `
      <div style="margin-bottom:12px;">
        <p style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem; font-weight:700;
          letter-spacing:2px; color:var(--accent); text-transform:uppercase; margin-bottom:6px;">
          ${labels[disc]}</p>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${horarios.map(h => `
            <span style="white-space:nowrap; font-size:0.85rem; color:var(--text-secondary);
              background:var(--card); border:1px solid var(--border);
              border-radius:var(--radius-sm); padding:3px 10px;">${h}</span>`).join('')}
        </div>
      </div>`;
  });
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.renderHorariosAdmin = renderHorariosAdmin;
window.agregarHorario      = agregarHorario;
window.eliminarHorario     = eliminarHorario;
window.renderHorariosPublico = renderHorariosPublico;