// ─── js/main.js ───────────────────────────────────────────────────────────────
import {
  cargarDatos, cargarCompetencia,
  cacheUsers, cachePrograms, cacheResults, cacheInfo, cacheComp,
  currentUser, setCurrentUser,
  SCHEDULES, setSchedules,
  fsSet, setCacheResults
} from './firebase.js';

import { doLogin, cerrarSesion }         from './auth.js';
import { renderUserList, renderBirthdays, renderVencimientos,
         refreshScheduleUI, editUser, saveUser, eliminarAtleta,
         addPaymentRecord, deletePayment, renderPaymentHistory,
         exportAtletas, setSocioFilter,
         toggleAtleta, switchAtletaTab, togglePagoPanel,
         seleccionarTipoPagoAtleta, guardarPagoAtleta,
         deletePaymentInline, abrirDrawerAtleta, cerrarDrawerAtleta,
         renderHistorialPagosInline } from './atletas.js';
import { renderClass, syncAdminView, saveClass, changeViewDay,
         setupPlanSwitcher, saveNews, savePrices, loadBoxInfo,
         resetProgramacion, toggleResetDay }  from './clases.js';
import { renderRanking, saveWodScore,
         editarResultadoRanking, cargarResultadoCoach,
         seleccionarModalidad } from './ranking.js';
import { renderCompAdmin, mostrarFormComp, guardarCompetencia,
         agregarCategoria, eliminarCategoria,
         agregarEvento, eliminarEvento, editarEvento, guardarEdicionEvento,
         agregarParticipante, eliminarParticipante,
         editarParticipante, cancelarEdicionParticipante, guardarEdicionParticipante,
         renderParticipantesResultado, guardarResultados,
         renderRankingPublico, toggleAccesoPublico,
         actualizarBotonLeaderboard, entrarLeaderboard,
         finalizarCompetencia }           from './competencia.js';
import { setTimerMode, timerStart, timerReset,
         agregarEjercicioEmom, eliminarEjercicioEmom,
         agregarBloqueWod, eliminarBloqueWod,
         toggleCompoundTipo }             from './cronometro.js';
import { calculate, loadRMValue, saveRM,
         renderRMChart, loadProfileData,
         updateOwnProfile }              from './rm.js';
import { inicializarNotificaciones, enviarNotificacion,
         enviarNotificacionGeneral }      from './notificaciones.js';
import { renderHorariosAdmin, agregarHorario,
         eliminarHorario, renderHorariosPublico } from './horarios.js';
import { toggleAccordion } from './ui.js';

// ─── ESTADO LOCAL ─────────────────────────────────────────────────────────────
export let selectedViewDay          = "lunes";
export let currentViewPlan          = "crossfit";
export let currentSocioStatusFilter = "all";
export let editingUserId            = null;
export let currentRankingMode       = "day";
export let tipoPagoSeleccionado     = 'renovacion';
export const diasSeleccionadosReset = new Set();

export function setSelectedViewDay(v)          { selectedViewDay          = v; }
export function setCurrentViewPlan(v)          { currentViewPlan          = v; }
export function setCurrentSocioStatusFilter(v) { currentSocioStatusFilter = v; }
export function setEditingUserId(v)            { editingUserId            = v; }
export function setCurrentRankingMode(v)       { currentRankingMode       = v; }
export function setTipoPagoSeleccionado(v)     { tipoPagoSeleccionado     = v; }

// ─── SHOW APP ─────────────────────────────────────────────────────────────────
export async function showApp(isCoach, userData = null) {
  document.getElementById("screen-login").classList.add("hidden");
  document.getElementById("screen-app").classList.remove("hidden");
  localStorage.setItem('legion_session', JSON.stringify(currentUser));

  document.getElementById("news-text").textContent = cacheInfo.news;

  const navUser = document.getElementById("nav-username");
  if(isCoach) navUser.textContent = "Hola, Coach";
  else navUser.textContent = "Hola, " + (userData.name ? userData.name.split(" ")[0] : "Atleta");

  renderBirthdays();

  if(isCoach) {
    document.getElementById("admin-panel").classList.remove("hidden");
    document.getElementById("tab-link-users").classList.remove("hidden");
    document.getElementById("admin-prices-editor").classList.remove("hidden");
    document.getElementById("tab-link-profile").classList.add("hidden");
    document.getElementById("score-upload-container").classList.add("hidden");
    renderUserList();
    syncAdminView();
    renderHorariosAdmin();
    renderVencimientos();
    document.getElementById('tab-link-comp').classList.remove('hidden');
    await cargarCompetencia();
    if(cacheComp && cacheComp.activa) {
      mostrarFormComp();
      renderCompAdmin();
    } else {
      document.getElementById('comp-empty').classList.remove('hidden');
      document.getElementById('comp-form').classList.add('hidden');
    }
  } else {
    currentViewPlan = userData.plans && userData.plans.length > 0
      ? userData.plans[0] : "crossfit";
      const esSoloCrossFit = userData.plans?.includes('crossfit');
      const esSoloFuncional = !esSoloCrossFit && userData.plans?.includes('funcional');

      if(esSoloCrossFit) {
        document.getElementById("score-upload-container").classList.remove("hidden");
        document.querySelector('[onclick="switchTab(\'ranking\', this)"]')?.classList.remove("hidden");
      } else {
        document.getElementById("score-upload-container").classList.add("hidden");
        document.querySelector('[onclick="switchTab(\'ranking\', this)"]')?.classList.add("hidden");
      }
      setupPlanSwitcher(userData.plans);
    const btnH = document.getElementById("btn-" + selectedViewDay);
    if(btnH) changeViewDay(selectedViewDay, btnH);
    setTimeout(() => inicializarNotificaciones(), 2000);
  }
}

// ─── SWITCH TAB ───────────────────────────────────────────────────────────────
export function switchTab(id, btn) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + id).classList.add("active");
  btn.classList.add("active");

  if(id === "profile")     loadProfileData();
  if(id === "ranking")     renderRanking();
  if(id === "info") {
    loadBoxInfo();
    renderBirthdays();
    const wrap = document.getElementById('info-comp-btn-wrap');
    if(wrap) {
      if(cacheComp?.activa && cacheComp?.accesoPublico) {
        wrap.classList.remove('hidden');
      } else {
        wrap.classList.add('hidden');
      }
    }
  }
  if(id === "users")       { renderUserList(); renderVencimientos(); }
  if(id === 'comp') {
    cargarCompetencia().then(() => {
      if(cacheComp && cacheComp.activa) {
        mostrarFormComp();
        renderCompAdmin();
      } else {
        document.getElementById('comp-empty').classList.remove('hidden');
        document.getElementById('comp-form').classList.add('hidden');
      }
    });
  }
  if(id === 'comp-public') renderRankingPublico();
  localStorage.setItem('legion_last_tab', id);
}

// ─── PAGO TIPO ────────────────────────────────────────────────────────────────
export function seleccionarTipoPago(tipo) {
  tipoPagoSeleccionado = tipo;
  const btnRen  = document.getElementById('pay-tipo-renovacion');
  const btnRein = document.getElementById('pay-tipo-reincorporacion');
  const inputVenc = document.getElementById('pay-nuevo-venc');

  if(tipo === 'renovacion') {
    btnRen.style.background  = 'var(--accent)';
    btnRen.style.color       = '#000';
    btnRen.style.border      = 'none';
    btnRein.style.background = 'none';
    btnRein.style.color      = 'var(--text-secondary)';
    btnRein.style.border     = '1px solid var(--border-strong)';

    const expiry = cacheUsers[editingUserId]?.expiry;
    const base   = expiry ? new Date(expiry + 'T00:00:00') : new Date();
    base.setMonth(base.getMonth() + 1);
    if(inputVenc) {
      inputVenc.value    = base.toISOString().split('T')[0];
      inputVenc.disabled = false;
      inputVenc.style.opacity = '1';
    }
  } else {
    btnRein.style.background = 'var(--accent)';
    btnRein.style.color      = '#000';
    btnRein.style.border     = 'none';
    btnRen.style.background  = 'none';
    btnRen.style.color       = 'var(--text-secondary)';
    btnRen.style.border      = '1px solid var(--border-strong)';

    const fechaPago = document.getElementById('pay-date')?.value;
    const base      = fechaPago ? new Date(fechaPago + 'T00:00:00') : new Date();
    base.setDate(base.getDate() + 30);
    if(inputVenc) {
      inputVenc.value    = base.toISOString().split('T')[0];
      inputVenc.disabled = false;
      inputVenc.style.opacity = '1';
    }
  }
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const dias   = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
  const hoyIdx = new Date().getDay();
  setSelectedViewDay(hoyIdx === 0 ? "lunes" : dias[hoyIdx]);

  document.querySelectorAll('#rank-day-btns .day-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    if(onclick.includes(selectedViewDay)) btn.classList.add('active');
  });

  const payDateInput = document.getElementById("pay-date");
  if(payDateInput) payDateInput.valueAsDate = new Date();

  cargarCompetencia().then(() => actualizarBotonLeaderboard());

  // ─── AUTO RESET SEMANAL ──────────────────────────────────────────────────────
async function checkAutoReset() {
  const ahora     = new Date();
  const diaSemana = ahora.getDay(); // 0=domingo

  // Calcular el domingo más reciente (o hoy si es domingo)
  const diasDesdeUltimoDomingo = diaSemana === 0 ? 0 : diaSemana;
  const ultimoDomingo = new Date(ahora);
  ultimoDomingo.setDate(ahora.getDate() - diasDesdeUltimoDomingo);
  ultimoDomingo.setHours(0, 0, 0, 0);
  const claveUltimoDomingo = ultimoDomingo.toISOString().split('T')[0]; // "2025-06-01"

  const claveGuardada = localStorage.getItem('legion_reset_semana');

  if(claveGuardada !== claveUltimoDomingo) {
    // No se hizo el reset de esta semana todavía
    setCacheResults({});
    await fsSet('results', {});
    localStorage.setItem('legion_reset_semana', claveUltimoDomingo);
    renderRanking();
    console.log('Reset semanal ejecutado para semana del', claveUltimoDomingo);
  }
}
  checkAutoReset();  // se ejecuta al abrir la app, no cada 30 segundos

  // Registrar Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/legion-box/service-worker.js')
      .catch(err => console.log('SW error:', err));
  }

  const sesionGuardada = localStorage.getItem('legion_session');
  if(sesionGuardada) {
    const s = JSON.parse(sesionGuardada);
    setCurrentUser(s);
    if(s.role === 'espectador') {
      cargarCompetencia().then(() => {
        if(cacheComp && cacheComp.activa) {
          entrarLeaderboard();
        } else {
          localStorage.removeItem('legion_session');
        }
      });
    } else {
      cargarDatos().then(() => {
        if(s.role === 'coach') showApp(true);
        else showApp(false, cacheUsers[s.id] || s);
        const lastTab = localStorage.getItem('legion_last_tab');
        if (lastTab) {
          const btn = document.querySelector(`[onclick="switchTab('${lastTab}', this)"]`);
          if (btn) setTimeout(() => switchTab(lastTab, btn), 100);
        }
      });
    }
  }
});

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.doLogin              = doLogin;
window.cerrarSesion         = cerrarSesion;
window.switchTab            = switchTab;
window.showApp              = showApp;
window.seleccionarTipoPago  = seleccionarTipoPago;
window.changeViewDay        = changeViewDay;
window.setSocioFilter       = setSocioFilter;
window.saveUser             = saveUser;
window.editUser             = editUser;
window.eliminarAtleta       = eliminarAtleta;
window.saveClass            = saveClass;
window.saveNews             = saveNews;
window.savePrices           = savePrices;
window.saveRM               = saveRM;
window.saveWodScore         = saveWodScore;
window.calculate            = calculate;
window.loadRMValue          = loadRMValue;
window.updateOwnProfile     = updateOwnProfile;
window.addPaymentRecord     = addPaymentRecord;
window.deletePayment        = deletePayment;
window.renderRanking        = renderRanking;
window.refreshScheduleUI    = refreshScheduleUI;
window.syncAdminView        = syncAdminView;
window.toggleResetDay       = toggleResetDay;
window.resetProgramacion    = resetProgramacion;
window.exportAtletas        = exportAtletas;
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
window.setTimerMode          = setTimerMode;
window.timerStart            = timerStart;
window.timerReset            = timerReset;
window.agregarEjercicioEmom  = agregarEjercicioEmom;
window.eliminarEjercicioEmom = eliminarEjercicioEmom;
window.agregarBloqueWod      = agregarBloqueWod;
window.eliminarBloqueWod     = eliminarBloqueWod;
window.toggleCompoundTipo    = toggleCompoundTipo;
window.enviarNotificacion        = enviarNotificacion;
window.enviarNotificacionGeneral = enviarNotificacionGeneral;
window.renderHorariosAdmin   = renderHorariosAdmin;
window.agregarHorario        = agregarHorario;
window.eliminarHorario       = eliminarHorario;
window.renderVencimientos    = renderVencimientos;
window.renderBirthdays       = renderBirthdays;
window.editarResultadoRanking = editarResultadoRanking;
window.actualizarTamEquipo   = function(){};
window.toggleAccordion       = toggleAccordion;
window.toggleAtleta              = toggleAtleta;
window.switchAtletaTab           = switchAtletaTab;
window.togglePagoPanel           = togglePagoPanel;
window.seleccionarTipoPagoAtleta = seleccionarTipoPagoAtleta;
window.guardarPagoAtleta         = guardarPagoAtleta;
window.deletePaymentInline       = deletePaymentInline;
window.abrirDrawerAtleta         = abrirDrawerAtleta;
window.cerrarDrawerAtleta        = cerrarDrawerAtleta;
window.renderHistorialPagosInline = renderHistorialPagosInline;