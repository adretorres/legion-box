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
         verificarVencimientoAtleta,
         renderCotizacion } from './atletas.js';
import { renderClass, syncAdminView, saveClass, changeViewDay,
         setupPlanSwitcher, saveNews, savePrices, loadBoxInfo,
         resetProgramacion, toggleResetDay }  from './clases.js';
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
         eliminarHorario, renderHorariosPublico,
         renderHorariosInfoBox } from './horarios.js';
import { toggleAccordion } from './ui.js';
import './share.js';
import { calcularCotizacionSocio, generarMensajeWhatsApp,
         crearOrdenPendiente, aprobarOrden,
         obtenerOrdenesPendientes, TARIFAS } from './motor-pagos.js';
import { cargarPlanes, renderPlanesLanding, renderPlanesAdmin,
         renderPlanesAtleta, renderPlanesInfoBox, elegirPlan } from './planes.js';

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
  // Asegurar que el tab activo sea Clases al ingresar
  const tabDashboard = document.querySelector('.tab-btn');
  if (tabDashboard) switchTab('dashboard', tabDashboard);
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
    document.getElementById("admin-prices-editor")?.classList.remove("hidden");
    document.getElementById("tab-link-profile").classList.add("hidden");
    document.getElementById("score-upload-container").classList.add("hidden");
    renderUserList();
    syncAdminView();
    renderClass();
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
    renderPlanesInfoBox();
    renderHorariosInfoBox();
    window.renderOrdenesPendientes();
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


}

// ─── SWITCH TAB ───────────────────────────────────────────────────────────────
export function switchTab(id, btn) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + id).classList.add("active");
  if (btn) btn.classList.add("active");

  if(id === "profile")     loadProfileData();
  if(id === "calc") {
    if(window.appEncInit) window.appEncInit(currentUser?.role === 'coach');
  }
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
    renderPlanesInfoBox();
    renderHorariosInfoBox();
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
  // Registrar Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.log('SW error:', err));
  }

  const sesionGuardada = localStorage.getItem('legion_session');
  if(sesionGuardada) {
    // Con sesión: cargar datos y mostrar app directamente
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
      Promise.all([cargarDatos(), cargarPlanes()]).then(() => {
        if(s.role === 'coach') showApp(true);
        else showApp(false, cacheUsers[s.id] || s);
        renderHorariosPublico();
        renderPlanesLanding();

        const lastTab = localStorage.getItem('legion_last_tab');
        if (lastTab) {
          const btn = document.querySelector(`[onclick="switchTab('${lastTab}', this)"]`);
          if (btn) setTimeout(() => switchTab(lastTab, btn), 100);
        }
      });
    }
  } else {
    // Sin sesión: cargar datos para el landing público
    Promise.all([
      cargarDatos(),
      cargarPlanes(),
      fsGet('enciclopedia').catch(() => null)
    ])
      .then(([_, __, encData]) => {
        renderHorariosPublico();
        renderPlanesLanding();
        // Pasar movimientos custom directamente a window para landing.js
        window._encMovimientosCustom = encData?.movimientos || {};
        setTimeout(() => window.dispatchEvent(new CustomEvent('landingDataLoaded')), 100);
      })
      .catch(() => {
        renderHorariosPublico();
        renderPlanesLanding();
        window._encMovimientosCustom = {};
        setTimeout(() => window.dispatchEvent(new CustomEvent('landingDataLoaded')), 100);
      });
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
// Exponer estado para módulos externos
window._legionState = { get currentUser() { return currentUser; } };
// Exponer fsGet/fsSet de forma inmediata (import estático ya cargado)
window._fsGet = fsGet;
window._fsSet = fsSet;
window.renderPlanesInfoBox   = renderPlanesInfoBox;
window.renderCotizacion      = renderCotizacion;
window.renderHorariosInfoBox = renderHorariosInfoBox;
window.renderHorariosPublico = renderHorariosPublico;

// ─── MÓDULO DE PAGOS — FUNCIONES GLOBALES ─────────────────────────────────────

// Abrir modal notificación de pago
window.abrirModalNotifPago = function(montoSugerido, detalle, tipoGestion, editable) {
  const modal = document.getElementById('modal-notif-pago');
  if (!modal) return;
  const hoy = new Date().toISOString().split('T')[0];
  const inputMonto = document.getElementById('notif-monto-input');
  const inputFecha = document.getElementById('notif-fecha-input');
  const inputTipo  = document.getElementById('notif-tipo-input');
  if (inputMonto) {
    inputMonto.value = montoSugerido || '';
    inputMonto.dataset.montoCalculado = editable ? 0 : (montoSugerido || 0);
    inputMonto.readOnly = !editable && montoSugerido > 0;
    inputMonto.style.opacity = (!editable && montoSugerido > 0) ? '0.7' : '1';
  }
  if (inputFecha) inputFecha.value = hoy;
  if (inputTipo)  inputTipo.value  = tipoGestion || 'renovacion';
  // Mostrar monto calculado
  const montoCont = document.getElementById('notif-monto-calculado');
  const montoVal  = document.getElementById('notif-monto-valor');
  const montoDet  = document.getElementById('notif-monto-detalle');
  if (montoCont && montoSugerido) {
    montoCont.style.display = 'block';
    if (montoVal) montoVal.textContent = '$' + Number(montoSugerido).toLocaleString('es-AR');
    if (montoDet) montoDet.textContent = detalle || '';
    if (montoDet && !detalle) montoDet.style.display = 'none';
  }
  document.getElementById('notif-error').textContent = '';
  modal.classList.remove('hidden');
};

window.cerrarModalNotifPago = function() {
  document.getElementById('modal-notif-pago')?.classList.add('hidden');
  // Si venía del login, restaurar el formulario
  _restaurarFormLogin();
};

function _restaurarFormLogin() {
  // Mostrar campos del login nuevamente
  ['login-user', 'login-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.closest('.lnd-form-row').style.display = '';
  });
  const tagline = document.querySelector('.lnd-modal-tagline');
  if (tagline) tagline.style.display = '';
  const btnLogin = document.querySelector('[onclick="doLogin()"]');
  if (btnLogin) btnLogin.style.display = '';
  // Ocultar panel vencida
  document.getElementById('panel-cuota-vencida')?.classList.add('hidden');
  // Limpiar campos
  const userEl = document.getElementById('login-user');
  const passEl = document.getElementById('login-pass');
  const errEl  = document.getElementById('login-error');
  if (userEl) userEl.value = '';
  if (passEl) passEl.value = '';
  if (errEl)  errEl.textContent = '';
  // Mostrar modal login
  document.getElementById('modal-login')?.classList.remove('hidden');
}

// Enviar notificación de pago
window.enviarNotificacionPago = async function() {
  const monto  = parseFloat(document.getElementById('notif-monto-input')?.value);
  const fecha  = document.getElementById('notif-fecha-input')?.value;
  const medio  = document.getElementById('notif-medio-input')?.value;
  const obs    = document.getElementById('notif-obs-input')?.value || '';
  const errEl  = document.getElementById('notif-error');

  if (!monto || monto <= 0) { if(errEl) errEl.textContent = 'Ingresá un monto válido.'; return; }
  if (!fecha)               { if(errEl) errEl.textContent = 'Seleccioná la fecha del pago.'; return; }

  // Si no hay sesión activa, usar el DNI del campo de login
  const atletaId = currentUser?.id || document.getElementById('login-user')?.value?.toLowerCase()?.trim();
  if (!atletaId) { if(errEl) errEl.textContent = 'Error: no se pudo identificar al atleta.'; return; }

  // Validar que el monto coincida con el calculado (±5% tolerancia por redondeo)
  const montoCalculado = parseFloat(document.getElementById('notif-monto-input')?.dataset.montoCalculado || 0);
  if (montoCalculado > 0) {
    const diferencia = Math.abs(monto - montoCalculado) / montoCalculado;
    if (diferencia > 0.05) {
      if(errEl) errEl.textContent =
        'El monto debe ser $' + montoCalculado.toLocaleString('es-AR') +
        '. No puede ser diferente al monto calculado.';
      return;
    }
  }

  try {
    const tipo    = document.getElementById('notif-tipo-input')?.value || 'renovacion';
    const concepto = medio + (obs ? ' — ' + obs : '') + ' | Fecha: ' + fecha;
    await crearOrdenPendiente(atletaId, monto, concepto, tipo);
    window.cerrarModalNotifPago();
    // Si no había sesión (venía del login), restaurar formulario limpio
    if (!currentUser?.id) {
      alert('✅ Notificación enviada. El coach revisará y aprobará tu pago a la brevedad.');
    } else {
      alert('✅ Notificación enviada. El coach revisará y aprobará tu pago a la brevedad.');
      if (window.loadProfileData) loadProfileData();
    }
    // Recargar perfil
    if (window.loadProfileData) loadProfileData();
  } catch(e) {
    if (errEl) errEl.textContent = 'Error al enviar: ' + e.message;
  }
};

// Abrir modal desde login cuota vencida
window.abrirModalNotifPagoLogin = function() {
  const userIn = document.getElementById('login-user')?.value?.toLowerCase()?.trim();
  if (!userIn) { alert('Ingresá tu DNI primero.'); return; }
  // Cerrar modal login, abrir notif
  document.getElementById('modal-login')?.classList.add('hidden');
  // Calcular monto si hay datos en caché
  const u = cacheUsers?.[userIn];
  let monto = 0;
  if (u && window.TARIFAS && window.calcularCotizacionSocio) {
    const planKey = (u.plans?.[0] || 'crossfit') + '_x5';
    const precioBase = window.TARIFAS[planKey] || 45000;
    const c = window.calcularCotizacionSocio(
      { condicion: u.condicion || 'regular', esPlanFamiliar: u.esPlanFamiliar,
        primerMes: u.primerMes, primerMesUsado: u.primerMesUsado },
      { fechaPago: new Date(), precioBase }
    );
    monto = c.montoFinal;
  }
  // Sin detalle y monto editable — atleta ingresa lo que abonó
  window.abrirModalNotifPago(monto, null, 'renovacion', true);
};

// Panel órdenes pendientes (coach)
window.renderOrdenesPendientes = async function() {
  const wrap  = document.getElementById('ordenes-pendientes-wrap');
  const list  = document.getElementById('ordenes-pendientes-list');
  const badge = document.getElementById('ordenes-count-badge');
  if (!wrap || !list) return;

  const ordenes = await obtenerOrdenesPendientes();
  if (ordenes.length === 0) { wrap.classList.add('hidden'); return; }

  wrap.classList.remove('hidden');
  if (badge) badge.textContent = ordenes.length;

  list.innerHTML = '';
  ordenes.forEach(function(o) {
    const atletaNombre = cacheUsers[o.atletaId]?.name || o.atletaId;
    const div = document.createElement('div');
    div.style.cssText = 'background:var(--surface); border:1px solid var(--border);' +
      'border-radius:var(--radius); padding:12px; margin-bottom:8px;' +
      'display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;';
    div.innerHTML =
      '<div>' +
        '<div style="font-size:0.85rem; font-weight:700;">' + atletaNombre + '</div>' +
        '<div style="font-size:0.78rem; color:var(--text-secondary);">' + (o.concepto || '') + '</div>' +
        '<div style="font-size:0.72rem; color:var(--text-tertiary);">' +
          new Date(o.fechaCreacion).toLocaleDateString('es-AR') +
        '</div>' +
      '</div>' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
        '<span style="font-family:Bebas Neue,sans-serif; font-size:1.3rem; color:var(--accent);">' +
          '$' + Number(o.monto).toLocaleString('es-AR') +
        '</span>' +
        '<button data-orden-id="' + o.id + '"' +
        ' style="background:var(--accent); color:#000; border:none; padding:6px 14px;' +
        'border-radius:var(--radius-sm); cursor:pointer; font-family:Barlow Condensed,sans-serif;' +
        'font-size:0.75rem; font-weight:700; letter-spacing:1px;">APROBAR</button>' +
        '<button data-orden-del="' + o.id + '"' +
        ' style="background:none; border:1px solid var(--danger); color:var(--danger);' +
        'padding:6px 10px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.75rem;">✕</button>' +
      '</div>';
    // Eventos sin onclick inline
    const btnAprobar = div.querySelector('[data-orden-id]');
    const btnEliminar = div.querySelector('[data-orden-del]');
    btnAprobar.addEventListener('click', function() {
      window.aprobarOrdenCoach(o.id);
    });
    btnEliminar.addEventListener('click', function() {
      window.eliminarOrdenCoach(o.id);
    });
    list.appendChild(div);
  });
};

window.aprobarOrdenCoach = async function(idOrden) {
  if (!confirm('¿Aprobar este pago y actualizar la membresía del atleta?')) return;
  try {
    await aprobarOrden(idOrden, 'coach');
    // Recargar cacheUsers desde Firestore para reflejar el nuevo expiry
    await cargarDatos();
    alert('✅ Pago aprobado. Membresía actualizada.');
    window.renderOrdenesPendientes();
    renderUserList();
    renderVencimientos();
  } catch(e) {
    alert('Error al aprobar: ' + e.message);
  }
};

window.eliminarOrdenCoach = async function(idOrden) {
  if (!confirm('¿Eliminar esta notificación de pago?')) return;
  try {
    const ordenes = await fsGet('ordenes_pago') || {};
    delete ordenes[idOrden];
    await fsSet('ordenes_pago', ordenes);
    window.renderOrdenesPendientes();
  } catch(e) {
    alert('Error al eliminar: ' + e.message);
  }
};
window.elegirPlan         = elegirPlan;