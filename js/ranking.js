// ─── js/ranking.js ────────────────────────────────────────────────────────────
import {
  fsSet,
  cacheResults, setCacheResults,
  cachePrograms,
  currentUser
} from './firebase.js';

import { selectedViewDay, currentViewPlan, currentRankingMode, setCurrentRankingMode } from './main.js';

// ─── RANKING ──────────────────────────────────────────────────────────────────
export function setRankingMode(mode) {
  setCurrentRankingMode(mode);
  document.getElementById("rank-mode-day").classList.toggle("active", mode === "day");
  document.getElementById("rank-mode-week").classList.toggle("active", mode === "week");
  document.getElementById("rank-filters-row").style.display = mode === "day" ? "grid" : "none";
  renderRanking();
}

export async function saveWodScore() {
  const score = document.getElementById("input-score").value.trim();
  if(!score) return alert("Ingresa un resultado.");

  if(!cacheResults[selectedViewDay]) cacheResults[selectedViewDay] = {};
  if(!cacheResults[selectedViewDay][currentViewPlan]) cacheResults[selectedViewDay][currentViewPlan] = {};

  cacheResults[selectedViewDay][currentViewPlan][currentUser.id] = {
    name:      currentUser.name,
    score:     score,
    timestamp: Date.now(),
  };

  await fsSet('results', cacheResults);
  document.getElementById("input-score").value = "";
  alert("¡Resultado subido con éxito!");
}

export function renderRanking() {
  const cont    = document.getElementById("ranking-list-container");
  const results = cacheResults || {};
  cont.innerHTML = "";

  if(currentRankingMode === "day") {
    const day  = document.getElementById("rank-day-select").value;
    const plan = document.getElementById("rank-plan-select").value;
    const list = results[day]?.[plan] || {};
    const entries = Object.entries(list).map(([uid, data]) => ({ uid, ...data }));

    if(!entries.length) {
      cont.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">No hay resultados cargados para este día.</p>';
      return;
    }

    const resultType = cachePrograms[day]?.[plan]?.resultType || 'time';

    const toSec = str => {
      const parts = str.trim().replace(',','.').split(':');
      return parts.length === 2 ? parseInt(parts[0])*60 + parseFloat(parts[1]) : parseFloat(parts[0]);
    };
    const toNum = str => parseFloat(str.replace(',','.')) || 0;

    entries.sort((a, b) => resultType === 'time'
      ? toSec(a.score) - toSec(b.score)
      : toNum(b.score) - toNum(a.score)
    );

    entries.forEach((r, idx) => {
      cont.innerHTML += `
        <div class="ranking-row">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="rank-num">#${idx+1}</span>
            <span style="font-size:0.9rem;">${r.name}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="rank-score">${r.score}</span>
            ${currentUser?.role === 'coach'
              ? `<button onclick="editarResultadoRanking('${day}','${plan}','${r.uid}')"
                  style="background:none;border:1px solid var(--border-strong);color:var(--text-secondary);
                  padding:3px 8px;border-radius:var(--radius-sm);cursor:pointer;font-size:0.7rem;">Editar</button>`
              : ''}
          </div>
        </div>`;
    });

  } else {
    let athletes = {};

    for(let d in results) {
      for(let p in results[d]) {
        const entriesDay = Object.entries(results[d][p]);
        if(!entriesDay.length) continue;

        const resultType = cachePrograms[d]?.[p]?.resultType || 'time';
        const toSec = str => {
          const parts = str.trim().replace(',','.').split(':');
          return parts.length === 2 ? parseInt(parts[0])*60 + parseFloat(parts[1]) : parseFloat(parts[0]);
        };
        const toNum = str => parseFloat(str.replace(',','.')) || 0;

        entriesDay.sort(([, a], [, b]) => resultType === 'time'
          ? toSec(a.score) - toSec(b.score)
          : toNum(b.score) - toNum(a.score)
        );

        entriesDay.forEach(([uid, entry], idx) => {
          if(!athletes[uid]) athletes[uid] = { name: entry.name, points: 0, wods: 0 };
          athletes[uid].points += (idx + 1);
          athletes[uid].wods++;
        });
      }
    }

    const sorted = Object.values(athletes).sort((a, b) => a.points - b.points);

    if(!sorted.length) {
      cont.innerHTML = '<p style="text-align:center; color:var(--text-tertiary); padding:20px;">Sin actividad semanal registrada.</p>';
      return;
    }

    sorted.forEach((r, idx) => {
      cont.innerHTML += `
        <div class="ranking-row">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="rank-num">#${idx+1}</span>
            <span style="font-size:0.9rem;">${r.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.75rem; color:var(--text-tertiary);">${r.wods} WOD${r.wods !== 1 ? 's' : ''}</span>
            <span class="rank-score">${r.points} pts</span>
          </div>
        </div>`;
    });
  }
}

export async function editarResultadoRanking(day, plan, uid) {
  const scoreActual = cacheResults[day]?.[plan]?.[uid]?.score || '';
  const nuevoScore  = prompt(`Editar resultado de ${cacheResults[day][plan][uid].name}:`, scoreActual);
  if(nuevoScore === null) return;
  if(!nuevoScore.trim()) {
    if(!confirm('¿Eliminar este resultado del ranking?')) return;
    delete cacheResults[day][plan][uid];
  } else {
    cacheResults[day][plan][uid].score = nuevoScore.trim();
  }
  await fsSet('results', cacheResults);
  renderRanking();
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.setRankingMode        = setRankingMode;
window.renderRanking         = renderRanking;
window.saveWodScore          = saveWodScore;
window.editarResultadoRanking = editarResultadoRanking;