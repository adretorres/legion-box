// ─── js/ui.js ─────────────────────────────────────────────────────────────────

export function toggleAccordion(id) {
  const body  = document.getElementById('acc-body-' + id);
  const arrow = document.getElementById('acc-arrow-' + id);
  if(!body || !arrow) return;
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
}

window.toggleAccordion = toggleAccordion;