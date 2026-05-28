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
      document.getElementById("login-error").innerHTML =
        "CUOTA VENCIDA.<br>Comunicate con el Coach.";
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