// ─── js/notificaciones.js ─────────────────────────────────────────────────────
import {
  messaging, VAPID_KEY,
  fsSet,
  cacheUsers, setCacheUsers,
  currentUser,
  getToken, onMessage
} from './firebase.js';

// ─── INICIALIZAR PUSH ─────────────────────────────────────────────────────────
export async function inicializarNotificaciones() {
  try {
    const permiso = await Notification.requestPermission();
    if(permiso !== 'granted') return;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if(!token || !currentUser?.id) return;

    if(!cacheUsers[currentUser.id]) return;
    cacheUsers[currentUser.id].fcmToken = token;
    await fsSet('users', cacheUsers);

    onMessage(messaging, payload => {
      const { title, body } = payload.notification;
      mostrarNotificacionInApp(title, body);
    });
  } catch(e) {
    console.log('Notificaciones no disponibles:', e);
  }
}

// ─── NOTIFICACIÓN IN-APP ──────────────────────────────────────────────────────
export function mostrarNotificacionInApp(title, body) {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position:fixed; top:70px; right:16px; z-index:9999;
    background:var(--card); border:1px solid var(--accent);
    border-left:4px solid var(--accent);
    border-radius:var(--radius); padding:14px 16px;
    max-width:300px; box-shadow:0 8px 24px rgba(0,0,0,0.4);
    animation: slideIn 0.3s ease;
  `;
  notif.innerHTML = `
    <div style="font-family:'Barlow Condensed',sans-serif; font-size:0.72rem;
      font-weight:700; letter-spacing:1.5px; color:var(--accent); margin-bottom:4px;">
      ${title}</div>
    <div style="font-size:0.82rem; color:var(--text-secondary);">${body}</div>
  `;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

// ─── ENVIAR NOTIFICACIÓN ──────────────────────────────────────────────────────
export async function enviarNotificacion(tipo, textoCustom = null) {
  const mensajes = {
    clases:      { title: '💪 Nueva clase disponible',      body: 'Ya podés ver la programación de hoy en la app.' },
    comunicado:  { title: '📢 Nuevo comunicado',            body: document.getElementById('edit-news')?.value || 'Revisá los últimos avisos del box.' },
    vencimiento: { title: '⏰ Recordatorio de cuota',       body: 'Tu cuota está próxima a vencer. No te olvides de renovar para seguir entrenando.' },
    general:     { title: '🔔 Legión Box',                  body: textoCustom || 'Tenés un nuevo mensaje del box.' }
  };

  const { title, body } = mensajes[tipo];

  const tokens = [];
  for(let id in cacheUsers) {
    if(cacheUsers[id].fcmToken && id !== 'coach')
      tokens.push(cacheUsers[id].fcmToken);
  }

  if(!tokens.length) {
    alert('No hay atletas con notificaciones habilitadas aún.');
    return;
  }

  await fsSet('notificacion', { title, body, tipo, timestamp: Date.now() });
  alert(`Notificación enviada a ${tokens.length} atleta(s).`);
}

export async function enviarNotificacionGeneral() {
  const texto = document.getElementById('notif-general-texto')?.value?.trim();
  if(!texto) return alert('Escribí un mensaje primero.');
  await enviarNotificacion('general', texto);
  document.getElementById('notif-general-texto').value = '';
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.enviarNotificacion        = enviarNotificacion;
window.enviarNotificacionGeneral = enviarNotificacionGeneral;