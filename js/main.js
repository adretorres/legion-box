// ─── js/main.js ───────────────────────────────────────────────────────────────
import {
  cargarDatos, cargarCompetencia,
  cacheUsers, cachePrograms, cacheResults, cacheInfo, cacheComp,
  currentUser, setCurrentUser,
  SCHEDULES,
  fsGet, fsSet, setCacheResults,
  escucharResultados } from './firebase.js';

import { doLogin, cerrarSesion }         from './auth.js';
import { renderUserList, renderBirthdays, renderVencimientos,
         refreshScheduleUI, editUser, saveUser, eliminarAtleta,
         addPaymentRecord, deletePayment, renderPaymentHistory,
         exportAtletas, setSocioFilter,
         toggleAtleta, switchAtletaTab, togglePagoPanel,
         seleccionarTipoPagoAtleta, guardarPagoAtleta,
         deletePaymentInline, abrirDrawerAtleta, cerrarDrawerAtleta,
         renderHistorialPagosInline,
         verificarVencimientoAtleta } from './atletas.js';
import { renderClass, syncAdminView, saveClass, changeViewDay,
         setupPlanSwitcher, saveNews, savePrices, loadBoxInfo,
         resetProgramacion, toggleResetDay,
         renderNoticiasPublico }              from './clases.js';
import { renderRanking, saveWodScore,
         editarResultadoRanking, cargarResultadoCoach,
         seleccionarModalidad, cambiarDiaRanking,
         cambiarPlanRanking } from './ranking.js';
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
import { inicializarNotificaciones }     from './notificaciones.js';
import { renderHorariosAdmin, agregarHorario,
         eliminarHorario, renderHorariosPublico } from './horarios.js';
import { toggleAccordion } from './ui.js';
import './share.js';
import { cargarPlanes, renderPlanesLanding, renderPlanesAdmin,
         renderPlanesAtleta, elegirPlan } from './planes.js';

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

// ─── LISTENER DE RESULTADOS EN TIEMPO REAL ────────────────────────────────────
// Se llama una sola vez; la referencia al unsubscribe permite limpiarlo si se
// necesita en el futuro (por ejemplo al cerrar sesión).
let _unsubResultados = null;

function suscribirResultados() {
  if (_unsubResultados) return; // ya está activo, no duplicar
  _unsubResultados = escucharResultados(() => {
    renderRanking();
  });
}

// ─── RESET SEMANAL SEGURO (solo coach, clave en Firestore) ────────────────────
async function checkAutoReset() {
  // Solo el coach ejecuta el reset para evitar que cualquier dispositivo borre
  // los datos de todos los usuarios.
  if (!currentUser || currentUser.role !== 'coach') return;

  const ahora           = new Date();
  const diasDesde       = ahora.getDay() === 0 ? 0 : ahora.getDay();
  const ultimoDomingo   = new Date(ahora);
  ultimoDomingo.setDate(ahora.getDate() - diasDesde);
  ultimoDomingo.setHours(0, 0, 0, 0);
  const claveEsteReset  = ultimoDomingo.toISOString().split('T')[0]; // "2025-06-01"

  // Leer la clave del último reset desde Firestore
  const info            = await fsGet('info');
  const claveGuardada   = info?.lastReset || null;

  if (claveGuardada !== claveEsteReset) {
    const confirmar = confirm(
      `Nueva semana detectada.\n¿Limpiar los resultados del ranking anterior?\n` +
      `(Semana del ${claveEsteReset})\n\n` +
      `Esta acción borrará todos los resultados cargados hasta ahora.`
    );

    // Siempre guardar la clave en Firestore, haya confirmado o no.
    // Así no vuelve a preguntar hasta la próxima semana.
    await fsSet('info', { ...info, lastReset: claveEsteReset });

    if (confirmar) {
      setCacheResults({});
      await fsSet('results', {});
      renderRanking();
      console.log('Reset semanal ejecutado para semana del', claveEsteReset);
    }
  }
}

// ─── SHOW APP ─────────────────────────────────────────────────────────────────
export async function showApp(isCoach, userData = null) {
  // Ocultar landing, mostrar app
  document.getElementById("screen-landing")?.classList.add("hidden");
  document.getElementById("screen-app").classList.remove("hidden");
  window.scrollTo(0, 0);
  localStorage.setItem('legion_session', JSON.stringify(currentUser));

  document.getElementById("news-text").textContent = cacheInfo.news;

  // Sincronizar nav-username legacy (usado por otros módulos)
  const navUser = document.getElementById("nav-username");
  if(navUser) {
    if(isCoach) navUser.textContent = "Hola, Coach";
    else navUser.textContent = "Hola, " + (userData?.name ? userData.name.split(" ")[0] : "Atleta");
  }

  renderBirthdays();

  // ── Suscribir resultados en tiempo real para TODOS los roles ──────────────
  suscribirResultados();

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
    // Planes admin
    const adminPlanes = document.getElementById('admin-planes-editor');
    if (adminPlanes) adminPlanes.classList.remove('hidden');
    await cargarPlanes();
    renderPlanesAdmin();
    renderPlanesLanding();
    // Reset semanal solo lo evalúa el coach
    checkAutoReset();
  } else {
    currentViewPlan = userData.plans && userData.plans.length > 0
      ? userData.plans[0] : "crossfit";

    const tieneCrossFit  = userData.plans?.includes('crossfit');
    const tieneFuncional = userData.plans?.includes('funcional');
    const puedeRanking   = tieneCrossFit || tieneFuncional;

    if(puedeRanking) {
      document.getElementById("score-upload-container").classList.remove("hidden");
      document.querySelector('[onclick="switchTab(\'ranking\', this)"]')?.classList.remove("hidden");
    } else {
      document.getElementById("score-upload-container").classList.add("hidden");
      document.querySelector('[onclick="switchTab(\'ranking\', this)"]')?.classList.add("hidden");
    }
    setupPlanSwitcher(userData.plans);
    const btnH = document.getElementById("btn-" + selectedViewDay);
    if(btnH) changeViewDay(selectedViewDay, btnH);
    await cargarPlanes();
    renderPlanesLanding();
    renderPlanesAtleta(userData);
    verificarVencimientoAtleta(userData);
    setTimeout(() => inicializarNotificaciones(), 2000);
  }

  // Detectar si el acceso viene desde el código QR físico de recepción
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('pago_presencial') === 'true' && isCoach) {
    const modalQR = document.getElementById('modal-pago-rapido-qr');
    if (modalQR) {
      modalQR.classList.remove('hidden');
      // Limpiar el parámetro de la URL para que no se reabra al recargar
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

// ─── SWITCH TAB ───────────────────────────────────────────────────────────────
export function switchTab(id, btn) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + id).classList.add("active");
  if (btn) btn.classList.add("active");

  if(id === "profile")     loadProfileData();
  if(id === "ranking") {
    // Marcar el día actual como activo si ningún botón tiene activo todavía
    const rankDayBtns = document.querySelectorAll('#rank-day-btns .day-btn');
    const hayActivo   = Array.from(rankDayBtns).some(b => b.classList.contains('active'));
    if(!hayActivo) {
      rankDayBtns.forEach(b => {
        const onclick = b.getAttribute('onclick') || '';
        if(onclick.includes(`'${selectedViewDay}'`)) {
          b.classList.add('active');
        }
      });
    }
    renderRanking();
  }
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
    // Renderizar datos públicos en el landing al cargar
  Promise.all([cargarDatos(), cargarPlanes()]).then(() => {
    renderHorariosPublico();
    renderPlanesLanding();
    if(window.lndMostrarCompetencia) window.lndMostrarCompetencia(cacheComp);
  }).catch(() => {});

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

  // Marcar día activo en el selector de ranking al cargar
  document.querySelectorAll('#rank-day-btns .day-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    if(onclick.includes(`'${selectedViewDay}'`)) btn.classList.add('active');
  });

  const payDateInput = document.getElementById("pay-date");
  if(payDateInput) payDateInput.valueAsDate = new Date();

  cargarCompetencia().then(() => {
    actualizarBotonLeaderboard();
    if(window.lndMostrarCompetencia) window.lndMostrarCompetencia(cacheComp);
  });

  // Cargar datos públicos del landing sin sesión
  Promise.all([cargarDatos(), cargarPlanes()])
    .then(() => {
      renderHorariosPublico();
      renderPlanesLanding();
      renderNoticiasPublico();
    })
    .catch(() => {
      // Si Firestore falla, renderizar igual con los datos por defecto de respaldo
      renderHorariosPublico();
      renderPlanesLanding();
      renderNoticiasPublico();
    });

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
        renderHorariosPublico();
        renderPlanesLanding();
        renderNoticiasPublico();

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
window.cambiarDiaRanking  = cambiarDiaRanking;
window.cambiarPlanRanking    = cambiarPlanRanking;
window.renderPlanesLanding   = renderPlanesLanding;
window.renderNoticiasPublico = renderNoticiasPublico;
window.renderHorariosPublico = renderHorariosPublico;
window.elegirPlan         = elegirPlan;