// ─── js/auth.js ───────────────────────────────────────────────────────────────
import {
  fsGet, fsSet,
  cargarDatos, cargarCompetencia,
  cacheUsers, cacheComp, cacheInfo,
  currentUser, setCurrentUser
} from './firebase.js';

import { showApp } from './main.js';

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export async function doLogin() {
  const userIn = document.getElementById("login-user").value.toLowerCase().trim();
  const passIn = document.getElementById("login-pass").value;

  document.getElementById("login-error").textContent = "Verificando...";

  // Solo cargar si el caché no está disponible aún
  if (!cacheUsers) {
    await cargarCompetencia();
    await cargarDatos();
  }

  // Coach se detecta por ID, no por selector de rol
  const coachData = cacheUsers['coach'];
  if ((userIn === 'coach') && coachData && passIn === coachData.pass) {
    setCurrentUser({ id: "coach", role: "coach", name: "Coach" });
    document.getElementById('modal-login')?.classList.add('hidden');
    showApp(true);
    return;
  }

  const u = cacheUsers[userIn];
  if (u && u.pass === passIn) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fv = u.expiry ? new Date(u.expiry + "T00:00:00") : null;
    if (fv && fv < hoy) {
      // Ocultar solo los campos del formulario de login
      document.getElementById('login-error').textContent = '';
      ['login-user', 'login-pass'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.closest('.lnd-form-row').style.display = 'none';
      });
      document.querySelector('.lnd-modal-tagline')?.style && (document.querySelector('.lnd-modal-tagline').style.display = 'none');
      // Ocultar solo el botón INICIAR SESIÓN (no los botones del panel)
      document.querySelector('[onclick="doLogin()"]')?.style && (document.querySelector('[onclick="doLogin()"]').style.display = 'none');

      const panel = document.getElementById('panel-cuota-vencida');
      if (panel) {
        panel.classList.remove('hidden');
        // Nombre personalizado
        const nombreEl = document.getElementById('login-vencida-nombre');
        const fechaEl  = document.getElementById('login-vencida-fecha');
        const nombre   = u.name ? 'Hola, ' + u.name.split(' ')[0] + '!' : 'Hola!';
        const fechaVenc = fv ? fv.toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit', year:'numeric'}) : '';
        if (nombreEl) nombreEl.textContent = nombre;
        if (fechaEl)  fechaEl.textContent  = fechaVenc ? 'Venció el ' + fechaVenc : '';
      }
      return;
    }
    setCurrentUser({ id: userIn, ...u, role: "atleta" });
    document.getElementById('modal-login')?.classList.add('hidden');
    showApp(false, u);
  } else {
    document.getElementById("login-error").textContent =
      "Credenciales incorrectas.";
  }
}

// ─── CERRAR SESIÓN ────────────────────────────────────────────────────────────
export function cerrarSesion() {
  localStorage.removeItem('legion_session');
  document.getElementById('screen-app')?.classList.add('hidden');
  document.getElementById('screen-landing')?.classList.remove('hidden');
  window.scrollTo(0, 0);
  if(window.renderPlanesLanding)   window.renderPlanesLanding();
  if(window.renderHorariosPublico) window.renderHorariosPublico();
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.doLogin      = doLogin;
window.cerrarSesion = cerrarSesion;

// Placeholder Mercado Pago — se integra en siguiente fase
window.abrirPagoMercadoPago = function() {
  alert('Próximamente podés pagar directamente con Mercado Pago. Por ahora, notificá tu pago manual o consultá al Coach.');
};