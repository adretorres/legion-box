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
  const role   = document.getElementById("login-role").value;
  const userIn = document.getElementById("login-user").value.toLowerCase().trim();
  const passIn = document.getElementById("login-pass").value;

  document.getElementById("login-error").textContent = "Verificando...";
  await cargarCompetencia();
  await cargarDatos();

  const coachData = cacheUsers['coach'];
  if (role === "admin" && coachData && passIn === coachData.pass) {
    setCurrentUser({ id: "coach", role: "coach", name: "Coach" });
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
    showApp(false, u);
  } else {
    document.getElementById("login-error").textContent =
      "Credenciales incorrectas.";
  }
}

// ─── CERRAR SESIÓN ────────────────────────────────────────────────────────────
export function cerrarSesion() {
  localStorage.removeItem('legion_session');
  location.reload();
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.doLogin      = doLogin;
window.cerrarSesion = cerrarSesion;