// ─── js/pagos-qr.js ───────────────────────────────────────────────────────────
import {
  fsSet,
  cacheUsers, fsGet, setCacheUsers
} from './firebase.js';

// ─── ABRIR MODAL ──────────────────────────────────────────────────────────────
export function abrirPagoRapidoQR() {
  // Pre-completar el campo coach con "Coach"
  const coachInput = document.getElementById('qr-pago-coach');
  if (coachInput) coachInput.value = 'Coach';
  document.getElementById('modal-pago-rapido-qr')?.classList.remove('hidden');
}

// ─── CALCULAR NUEVO VENCIMIENTO ───────────────────────────────────────────────
function calcularNuevoVencimiento(expiryActual, tipoGestion) {
  const base = expiryActual && tipoGestion === 'renovacion'
    ? new Date(expiryActual + 'T00:00:00')
    : new Date();
  base.setHours(0, 0, 0, 0);
  base.setMonth(base.getMonth() + 1);
  const yyyy = base.getFullYear();
  const mm   = String(base.getMonth() + 1).padStart(2, '0');
  const dd   = String(base.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── LIMPIAR FORMULARIO ───────────────────────────────────────────────────────
function limpiarFormulario() {
  document.getElementById('qr-pago-atleta').value  = '';
  document.getElementById('qr-pago-monto').value   = '';
  document.getElementById('qr-pago-coach').value   = '';
  document.getElementById('qr-pago-gestion').value = 'renovacion';
  document.getElementById('qr-pago-clase').value   = 'crossfit';
}

// ─── PROCESAR PAGO ────────────────────────────────────────────────────────────
window.procesarPagoRapidoQR = async function() {
  const atletaId = document.getElementById('qr-pago-atleta').value.toLowerCase().trim();
  const monto    = document.getElementById('qr-pago-monto').value.trim();
  const gestion  = document.getElementById('qr-pago-gestion').value;
  const clase    = document.getElementById('qr-pago-clase').value;
  const coach    = document.getElementById('qr-pago-coach').value.trim() || 'Coach';

  // ── Validación ──────────────────────────────────────────────────────────────
  if (!atletaId) return alert('Ingresá el DNI o usuario del atleta.');
  if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0)
    return alert('Ingresá un monto válido.');

  // ── Buscar atleta — refrescar desde Firestore para datos actualizados ───────
  const usersActualizados = await fsGet('users');
  if (usersActualizados) setCacheUsers(usersActualizados);

  const atleta = cacheUsers[atletaId];
  if (!atleta) return alert(`Atleta "${atletaId}" no encontrado.\nVerificá el DNI o usuario.`);

  // ── Calcular nuevo vencimiento ───────────────────────────────────────────────
  const nuevoVenc = calcularNuevoVencimiento(atleta.expiry, gestion);

  // ── Construir registro de pago ───────────────────────────────────────────────
  const hoy   = new Date();
  const fecha = `${String(hoy.getDate()).padStart(2,'0')}/${String(hoy.getMonth()+1).padStart(2,'0')}/${hoy.getFullYear()}`;

  if (!cacheUsers[atletaId].payments) cacheUsers[atletaId].payments = [];

  cacheUsers[atletaId].payments.push({
    id:     Date.now(),
    date:   fecha,
    amount: monto,
    method: 'efectivo/transferencia',
    obs:    `Clase: ${clase} | Coach: ${coach}`,
    tipo:   gestion
  });

  // ── Actualizar vencimiento ───────────────────────────────────────────────────
  cacheUsers[atletaId].expiry = nuevoVenc;

  // ── Guardar en Firestore ─────────────────────────────────────────────────────
  await fsSet('users', cacheUsers);

  // ── Limpiar y cerrar ─────────────────────────────────────────────────────────
  limpiarFormulario();
  document.getElementById('modal-pago-rapido-qr')?.classList.add('hidden');

  alert(
    `✅ Pago registrado con éxito.\n\n` +
    `Atleta: ${atleta.name}\n` +
    `Monto: $${parseFloat(monto).toLocaleString('es-AR')}\n` +
    `Tipo: ${gestion}\n` +
    `Nuevo vencimiento: ${nuevoVenc.split('-').reverse().join('/')}`
  );

  // Refrescar listas en la app si están disponibles
  if (window.renderUserList)    window.renderUserList();
  if (window.renderVencimientos) window.renderVencimientos();
};

// ─── EXPONER ABRIR MODAL AL WINDOW ───────────────────────────────────────────
window.abrirPagoRapidoQR = abrirPagoRapidoQR;