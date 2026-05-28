// ─── LANDING JS ───────────────────────────────────────────────────────────────

// ─── MODAL LOGIN ──────────────────────────────────────────────────────────────
window.abrirModalLogin = function() {
  document.getElementById('modal-login').classList.remove('hidden');
  setTimeout(() => document.getElementById('login-user')?.focus(), 100);
};

window.cerrarModalLogin = function(e) {
  if (e && e.target !== document.getElementById('modal-login')) return;
  document.getElementById('modal-login').classList.add('hidden');
  document.getElementById('login-error').textContent = '';
};

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') window.cerrarModalLogin();
});

// ─── MOBILE MENU ──────────────────────────────────────────────────────────────
window.toggleMobileMenu = function() {
  document.getElementById('lnd-mobile-menu').classList.toggle('hidden');
};

// ─── TABS DE LA APP DESDE LA LANDING ──────────────────────────────────────────
window.lndSwitchTab = function(id, btn) {
  // Scroll hasta el contenido de la app
  const appEl = document.getElementById('screen-app');
  if (appEl) {
    const navH  = document.querySelector('.lnd-nav')?.offsetHeight  || 64;
    const tabsH = document.querySelector('.lnd-app-tabs')?.offsetHeight || 42;
    const top   = appEl.getBoundingClientRect().top + window.scrollY - navH - tabsH - 8;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  // Delegar al switchTab de main.js
  if (window.switchTab) window.switchTab(id, btn);
};

// ─── CALCULADORA PÚBLICA ──────────────────────────────────────────────────────
window.lndCalculate = function() {
  const rm  = parseFloat(document.getElementById('lnd-rm-input').value);
  const res = document.getElementById('lnd-calc-results');
  if (!rm || rm <= 0) { res.innerHTML = ''; return; }
  const percents = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 40];
  res.innerHTML = percents.map(p => `
    <div class="lnd-rm-cell">
      <small>${p}%</small>
      <b>${((rm * p) / 100).toFixed(1)}</b>
      <span>kg</span>
    </div>`).join('');
};

// ─── CARGAR HORARIOS DESDE FIRESTORE ──────────────────────────────────────────
window.lndRenderSchedules = function(SCHEDULES) {
  const renderTimes = (id, disc) => {
    const el = document.getElementById(id);
    if (!el || !SCHEDULES[disc]?.length) return;
    el.innerHTML = SCHEDULES[disc].map(t => `<span>${t}</span>`).join('');
  };
  renderTimes('lnd-times-crossfit',  'crossfit');
  renderTimes('lnd-times-funcional', 'funcional');
};

// ─── CARGAR MEMBRESÍAS DESDE FIRESTORE ────────────────────────────────────────
// Solo se usa si el coach actualizó info.prices con contenido enriquecido
window.lndRenderPricing = function(prices) {
  // Las membresías están hardcodeadas en el HTML — solo sobreescribir si hay contenido
  // enriquecido guardado por el coach en Firestore
  if (!prices || prices.trim() === '' ||
      prices.includes('Membresías y Planes actualizados')) return;
  const cont = document.getElementById('lnd-pricing-content');
  if (!cont) return;
  cont.innerHTML = prices;
};

// ─── COMPETENCIA PÚBLICA ──────────────────────────────────────────────────────
window.lndMostrarCompetencia = function(comp) {
  if (!comp || !comp.activa || !comp.accesoPublico) return;
  const banner = document.getElementById('lnd-comp-banner');
  if (!banner) return;
  banner.classList.remove('hidden');
  const nombreEl = document.getElementById('lnd-comp-nombre');
  const descEl   = document.getElementById('lnd-comp-desc');
  if (nombreEl && comp.nombre) nombreEl.textContent = comp.nombre;
  if (descEl) descEl.textContent = 'Competencia en curso — seguí el leaderboard en vivo.';
};

// ─── SMOOTH SCROLL ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#screen-landing a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        const navH  = document.querySelector('.lnd-nav')?.offsetHeight  || 64;
        const tabsH = document.querySelector('.lnd-app-tabs')?.offsetHeight || 0;
        const top   = target.getBoundingClientRect().top + window.scrollY - navH - tabsH - 8;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
});