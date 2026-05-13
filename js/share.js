// ─── js/share.js ──────────────────────────────────────────────────────────────
import { cachePrograms, cacheResults, cacheUsers } from './firebase.js';
import { selectedViewDay, currentViewPlan } from './main.js';

const STORY_W = 1080;
const STORY_H = 1920;

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar: ' + src));
    img.src = src + '?v=' + Date.now();
  });
}

function wrapText(ctx, text, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function calcularLineas(ctx, contenido, maxWidth, lineHeight) {
  const todas = [];
  for (const linea of contenido.split('\n')) {
    if (linea.trim() === '') { todas.push(''); continue; }
    const wrapped = wrapText(ctx, linea, maxWidth, lineHeight);
    todas.push(...wrapped);
  }
  return todas;
}

async function crearCanvasBase() {
  const canvas  = document.createElement('canvas');
  canvas.width  = STORY_W;
  canvas.height = STORY_H;
  const ctx     = canvas.getContext('2d');

  // Fondo
  try {
    const bg = await cargarImagen('img/2.jpg');
    // Crop centrado para llenar 1080x1920
    const scale = Math.max(STORY_W / bg.width, STORY_H / bg.height);
    const w = bg.width * scale;
    const h = bg.height * scale;
    ctx.drawImage(bg, (STORY_W - w) / 2, (STORY_H - h) / 2, w, h);
  } catch {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }

  // Overlay — menos denso arriba, más oscuro abajo para leer el texto
  const grad = ctx.createLinearGradient(0, 0, 0, STORY_H);
  grad.addColorStop(0,    'rgba(0,0,0,0.30)');
  grad.addColorStop(0.25, 'rgba(0,0,0,0.50)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.72)');
  grad.addColorStop(1,    'rgba(0,0,0,0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  return { canvas, ctx };
}

function dibujarLogo(ctx, img, cx, y, targetH) {
  const logoW = (img.width / img.height) * targetH;
  ctx.drawImage(img, cx - logoW / 2, y, logoW, targetH);
  return y + targetH;
}

function dibujarFooter(ctx) {
  // Línea decorativa
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(100, STORY_H - 180);
  ctx.lineTo(STORY_W - 100, STORY_H - 180);
  ctx.stroke();

  ctx.textAlign   = 'center';
  ctx.font        = '400 36px sans-serif';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText('Fotheringham 65  ·  Formosa Capital', STORY_W / 2, STORY_H - 122);
  ctx.fillText('(370) 481-8550  ·  @legion.box', STORY_W / 2, STORY_H - 70);
  ctx.textAlign   = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function descargarCanvas(canvas, nombre) {
  const link    = document.createElement('a');
  link.download = nombre;
  link.href     = canvas.toDataURL('image/png');
  link.click();
}

// ─── COMPARTIR WOD ────────────────────────────────────────────────────────────
export async function compartirWOD() {
  const dia = window.getDiaRankingActual ? window.getDiaRankingActual() : selectedViewDay;
  const plan = currentViewPlan;
  const c    = cachePrograms[dia]?.[plan] || {};

  if (!c.wod) {
    alert('No hay WOD cargado para este día.');
    return;
  }

  const { canvas, ctx } = await crearCanvasBase();
  const cx = STORY_W / 2;

  // ── LOGO ──
  let logoBottomY = 120;
  try {
    const logo = await cargarImagen('img/logo-cuadrado-legion.png');
    const logoH = 200;
    dibujarLogo(ctx, logo, cx, 80, logoH);
    logoBottomY = 80 + logoH + 30;
  } catch { logoBottomY = 120; }

  // ── TÍTULO WOD DEL DÍA ──
  ctx.textAlign   = 'center';
  ctx.font        = '700 48px sans-serif';
  ctx.fillStyle   = '#FFFFFF';
  ctx.fillText('WOD DEL DÍA', cx, logoBottomY + 70);

  // Día + Plan
  const diaLabel = dia.toUpperCase();
  const planLabel = plan.toUpperCase();
  ctx.font        = '600 42px sans-serif';
  ctx.fillStyle   = '#48F135';
  ctx.fillText(`${diaLabel}  ·  ${planLabel}`, cx, logoBottomY + 132);

  // Línea decorativa
  const lineY = logoBottomY + 158;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(100, lineY);
  ctx.lineTo(STORY_W - 100, lineY);
  ctx.stroke();

  // ── CONTENIDO WOD centrado ──
  const PAD       = 100;
  const ANCHO     = STORY_W - PAD * 2;
  const LINE_H    = 46;
  const FONT_SIZE = 38;

  ctx.font        = `${FONT_SIZE}px sans-serif`;
  ctx.fillStyle   = 'rgba(255,255,255,0.9)';

  const lineas    = calcularLineas(ctx, c.wod, ANCHO, LINE_H);
  const totalH    = lineas.length * LINE_H;

  // Zona de contenido: entre lineY+30 y footer (STORY_H - 220)
  const zonaTop   = lineY + 30;
  const zonaBot   = STORY_H - 220;
  const zonaH     = zonaBot - zonaTop;
  const startY    = zonaTop + (zonaH - totalH) / 2 + FONT_SIZE;

  // Texto
  ctx.font        = `${FONT_SIZE}px sans-serif`;
  ctx.fillStyle   = 'rgba(255,255,255,0.92)';
  ctx.textAlign   = 'center';
  lineas.forEach((l, i) => {
    ctx.fillStyle = l === '' ? 'transparent' : 'rgba(255,255,255,0.92)';
    ctx.fillText(l, cx, startY + i * LINE_H);
  });

  ctx.textAlign = 'left';
  dibujarFooter(ctx);
  descargarCanvas(canvas, `legion-wod-${dia}.png`);
}

// ─── COMPARTIR RANKING ────────────────────────────────────────────────────────
export async function compartirRanking() {
  const dia = window.getDiaRankingActual ? window.getDiaRankingActual() : selectedViewDay;
  const plan = currentViewPlan;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const lista = cacheResults[dia]?.[plan] || {};

  const todos = Object.entries(cacheUsers)
    .filter(([id, u]) => {
      if (id === 'coach') return false;
      const fv   = u.expiry ? new Date(u.expiry + 'T00:00:00') : null;
      const diff = fv ? (hoy - fv) / (1000*60*60*24) : 0;
      return diff < 60 && u.plans?.includes(plan);
    });

  const conResultado = todos
    .filter(([id]) => lista[id]?.score)
    .map(([id, u]) => ({ id, name: u.name, ...lista[id] }));

  const tipo  = cachePrograms[dia]?.[plan]?.resultType || 'time';
  const toSec = str => { const p = str.trim().split(':'); return p.length === 2 ? parseInt(p[0])*60 + parseFloat(p[1]) : parseFloat(p[0]); };
  const toNum = str => parseFloat(str.replace(',','.')) || 0;

  const ordenado = conResultado.sort((a, b) =>
    tipo === 'time' ? toSec(a.score) - toSec(b.score) : toNum(b.score) - toNum(a.score)
  );

  if (!ordenado.length) { alert('No hay resultados cargados para este día.'); return; }

  const { canvas, ctx } = await crearCanvasBase();
  const cx = STORY_W / 2;

  // ── LOGO ──
  let logoBottomY = 120;
  try {
    const logo = await cargarImagen('img/logo-cuadrado-legion.png');
    const logoH = 200;
    dibujarLogo(ctx, logo, cx, 80, logoH);
    logoBottomY = 80 + logoH + 30;
  } catch { logoBottomY = 120; }

  // ── TÍTULO ──
  ctx.textAlign   = 'center';
  ctx.font        = '700 72px sans-serif';
  ctx.fillStyle   = '#FFFFFF';
  ctx.fillText('RANKING', cx, logoBottomY + 70);

  const diaLabel = dia.toUpperCase();
  ctx.font        = '600 48px sans-serif';
  ctx.fillStyle   = '#48F135';
  ctx.fillText(diaLabel, cx, logoBottomY + 132);

  const lineY = logoBottomY + 158;
  ctx.strokeStyle = '#48F135';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(100, lineY);
  ctx.lineTo(STORY_W - 100, lineY);
  ctx.stroke();

  // ── FILAS RANKING ──
  const PAD    = 80;
  const ANCHO  = STORY_W - PAD * 2;
  const ROW_H  = 96;
  const medals = ['🥇', '🥈', '🥉'];

  // Calcular startY para centrar las filas
  const totalFilas = ordenado.length;
  const totalH     = totalFilas * (ROW_H + 10);
  const zonaTop    = lineY + 30;
  const zonaBot    = STORY_H - 220;
  let   y          = zonaTop + ((zonaBot - zonaTop) - totalH) / 2;

  ctx.textAlign = 'left';

  ordenado.forEach((r, idx) => {
    if (y > zonaBot) return;
    const esPodio = idx < 3;

    ctx.fillStyle = `rgba(0,0,0,${esPodio ? 0.4 : 0.25})`;
    roundRect(ctx, PAD, y, ANCHO, ROW_H, 14);
    ctx.fill();

    ctx.strokeStyle = esPodio ? 'rgba(200,241,53,0.6)' : 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = esPodio ? 1.5 : 1;
    roundRect(ctx, PAD, y, ANCHO, ROW_H, 14);
    ctx.stroke();

    // Posición / medalla
    ctx.font      = esPodio ? '700 48px sans-serif' : '600 38px sans-serif';
    ctx.fillStyle = esPodio ? '#C8F135' : 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'center';
    ctx.fillText(esPodio ? medals[idx] : `#${idx+1}`, PAD + 52, y + 62);

    // Nombre
    ctx.font      = '600 36px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(r.name, PAD + 106, y + 62);

    // Modalidad
    ctx.font      = '700 26px sans-serif';
    ctx.fillStyle = r.modalidad === 'rx' ? '#C8F135' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'right';
    ctx.fillText(r.modalidad === 'rx' ? 'RX' : 'SC', STORY_W - PAD - 130, y + 50);

    // Score
    ctx.font      = '700 40px sans-serif';
    ctx.fillStyle = esPodio ? '#C8F135' : 'rgba(255,255,255,0.85)';
    ctx.fillText(r.score, STORY_W - PAD, y + 66);

    ctx.textAlign = 'left';
    y += ROW_H + 10;
  });

  dibujarFooter(ctx);
  descargarCanvas(canvas, `legion-ranking-${dia}.png`);
}

window.compartirWOD     = compartirWOD;
window.compartirRanking = compartirRanking;