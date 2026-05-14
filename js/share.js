// ─── js/share.js ──────────────────────────────────────────────────────────────
import { cachePrograms, cacheResults, cacheUsers } from './firebase.js';
import { selectedViewDay, currentViewPlan } from './main.js';

const STORY_W = 1080;
const STORY_H = 1920;
const MAX_RANKING_ROWS = 10; // máximo de atletas visibles en el flyer

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar: ' + src));
    img.src = src + '?v=' + Date.now();
  });
}

function wrapText(ctx, text, maxWidth) {
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
    const wrapped = wrapText(ctx, linea, maxWidth);
    todas.push(...wrapped);
  }
  return todas;
}

async function crearCanvasBase() {
  const canvas  = document.createElement('canvas');
  canvas.width  = STORY_W;
  canvas.height = STORY_H;
  const ctx     = canvas.getContext('2d');

  try {
    const bg = await cargarImagen('img/2.jpg');
    const scale = Math.max(STORY_W / bg.width, STORY_H / bg.height);
    const w = bg.width * scale;
    const h = bg.height * scale;
    ctx.drawImage(bg, (STORY_W - w) / 2, (STORY_H - h) / 2, w, h);
  } catch {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, STORY_W, STORY_H);
  }

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
  const dia  = window.getDiaRankingActual ? window.getDiaRankingActual() : selectedViewDay;
  const plan = currentViewPlan;
  const c    = cachePrograms[dia]?.[plan] || {};

  if (!c.wod) {
    alert('No hay WOD cargado para este día.');
    return;
  }

  const { canvas, ctx } = await crearCanvasBase();
  const cx = STORY_W / 2;

  let logoBottomY = 120;
  try {
    const logo = await cargarImagen('img/logo-cuadrado-legion.png');
    dibujarLogo(ctx, logo, cx, 80, 200);
    logoBottomY = 80 + 200 + 30;
  } catch { logoBottomY = 120; }

  ctx.textAlign   = 'center';
  ctx.font        = '700 48px sans-serif';
  ctx.fillStyle   = '#FFFFFF';
  ctx.fillText('WOD DEL DÍA', cx, logoBottomY + 70);

  ctx.font        = '600 42px sans-serif';
  ctx.fillStyle   = '#48F135';
  ctx.fillText(`${dia.toUpperCase()}  ·  ${plan.toUpperCase()}`, cx, logoBottomY + 132);

  const lineY = logoBottomY + 158;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(100, lineY);
  ctx.lineTo(STORY_W - 100, lineY);
  ctx.stroke();

  const PAD       = 100;
  const ANCHO     = STORY_W - PAD * 2;
  const LINE_H    = 46;
  const FONT_SIZE = 38;

  ctx.font = `${FONT_SIZE}px sans-serif`;
  const lineas  = calcularLineas(ctx, c.wod, ANCHO);
  const totalH  = lineas.length * LINE_H;
  const zonaTop = lineY + 30;
  const zonaBot = STORY_H - 220;
  const zonaH   = zonaBot - zonaTop;
  const startY  = zonaTop + (zonaH - totalH) / 2 + FONT_SIZE;

  ctx.textAlign = 'center';
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
  const dia  = window.getDiaRankingActual ? window.getDiaRankingActual() : selectedViewDay;
  const plan = currentViewPlan;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const lista = cacheResults[dia]?.[plan] || {};
  const c     = cachePrograms[dia]?.[plan] || {};

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

  const ordenadoCompleto = conResultado.sort((a, b) =>
    tipo === 'time' ? toSec(a.score) - toSec(b.score) : toNum(b.score) - toNum(a.score)
  );

  if (!ordenadoCompleto.length) { alert('No hay resultados cargados para este día.'); return; }

  const ordenado     = ordenadoCompleto.slice(0, MAX_RANKING_ROWS);
  const hayMas       = ordenadoCompleto.length > MAX_RANKING_ROWS;
  const totalAtletas = ordenadoCompleto.length;

  const { canvas, ctx } = await crearCanvasBase();
  const cx = STORY_W / 2;

  // ── LOGO ──
  const LOGO_Y = 80;
  const LOGO_H = 150;
  let cursorY  = LOGO_Y + LOGO_H;
  try {
    const logo = await cargarImagen('img/logo-cuadrado-legion.png');
    dibujarLogo(ctx, logo, cx, LOGO_Y, LOGO_H);
  } catch {}

  // ── ENCABEZADO ──
  // Layout:
  //   [logo]
  //   <GAP_LOGO>     ← espacio logo → línea superior
  //   ────────────   ← línea verde
  //   <GAP_INNER>    ← espacio línea → RANKING  (= mismo valor que RANKING → línea inferior)
  //   RANKING
  //   <GAP_SUB>      ← espacio RANKING → disciplina (compacto, son un bloque)
  //   CROSSFIT · DÍA
  //   <GAP_INNER>    ← espacio disciplina → línea inferior (= mismo valor que arriba)
  //   ────────────   ← línea verde

  const GAP_LOGO  = 36; // separación logo → línea superior
  const GAP_INNER = 48; // separación línea → contenido (arriba)
  const GAP_INNER_BOTTOM = 20; // separación contenido → línea (abajo, más ajustado)
  const GAP_SUB   = 10; // separación entre RANKING y disciplina (son un bloque)

  // Espacio logo → línea superior
  cursorY += GAP_LOGO;

  // Línea superior
  ctx.strokeStyle = '#48F135';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(80, cursorY);
  ctx.lineTo(STORY_W - 80, cursorY);
  ctx.stroke();
  cursorY += GAP_INNER;

  // RANKING
  ctx.textAlign = 'center';
  ctx.font      = '700 58px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('RANKING', cx, cursorY);
  cursorY += GAP_SUB + 36; // +36 = descenso tipográfico aprox de 58px

  // Disciplina · día
  ctx.font      = '700 36px sans-serif';
  ctx.fillStyle = '#48F135';
  ctx.fillText(`${plan.toUpperCase()}  ·  ${dia.toUpperCase()}`, cx, cursorY);
  cursorY += GAP_INNER_BOTTOM;

  // Línea inferior
  ctx.strokeStyle = '#48F135';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(80, cursorY);
  ctx.lineTo(STORY_W - 80, cursorY);
  ctx.stroke();
  cursorY += 28;

  // ── WOD — si existe, se muestra en un bloque compacto ──
  const FOOTER_TOP = STORY_H - 210;
  if (c.wod) {
    // Fondo semitransparente para el bloque WOD
    const WOD_PAD   = 60;
    const WOD_ANCHO = STORY_W - WOD_PAD * 2;

    // Calcular cuántas líneas ocupa el WOD con fuente pequeña
    const WOD_FONT  = 30;
    const WOD_LH    = 42;
    ctx.font = `400 ${WOD_FONT}px sans-serif`;
    const wodLineas = calcularLineas(ctx, c.wod, WOD_ANCHO - 40);

    // Limitar a máx 6 líneas para no invadir el ranking
    const lineasMostrar   = wodLineas.slice(0, 15);
    const hayMasWod       = wodLineas.length > 15;
    const WOD_BLOCK_H     = 32 + lineasMostrar.length * WOD_LH + (hayMasWod ? WOD_LH : 0) + 20;

    // Asegurarse de que el bloque WOD + ranking + footer quepan
    // Estimamos espacio mínimo para el ranking
    const MIN_RANKING_H = ordenado.length * 74 + 60;
    const espacioTotal  = FOOTER_TOP - cursorY;
    const mostrarWod    = espacioTotal > WOD_BLOCK_H + MIN_RANKING_H + 20;

    if (mostrarWod) {
      // Fondo del bloque WOD
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      roundRect(ctx, WOD_PAD, cursorY, WOD_ANCHO, WOD_BLOCK_H, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth   = 1;
      roundRect(ctx, WOD_PAD, cursorY, WOD_ANCHO, WOD_BLOCK_H, 12);
      ctx.stroke();

      // Etiqueta "WOD"
      ctx.font      = '700 22px sans-serif';
      ctx.fillStyle = '#48F135';
      ctx.textAlign = 'left';
      ctx.fillText('WOD', WOD_PAD + 20, cursorY + 26);

      // Texto del WOD
      ctx.font      = `400 ${WOD_FONT}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.textAlign = 'center';
      let ly = cursorY + 26 + WOD_LH;
      lineasMostrar.forEach(l => {
        ctx.fillStyle = l === '' ? 'transparent' : 'rgba(255,255,255,0.82)';
        ctx.fillText(l, cx, ly);
        ly += WOD_LH;
      });
      if (hayMasWod) {
        ctx.font      = '400 26px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('…', cx, ly);
      }

      cursorY += WOD_BLOCK_H + 18;
    }
  }

  // Línea separadora entre WOD y ranking
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(80, cursorY);
  ctx.lineTo(STORY_W - 80, cursorY);
  ctx.stroke();
  cursorY += 16;

  // ── FILAS RANKING ──
  const PAD      = 60;
  const ANCHO    = STORY_W - PAD * 2;
  const medals   = ['🥇', '🥈', '🥉'];
  const zonaTop  = cursorY;
  const zonaBot  = FOOTER_TOP - (hayMas ? 44 : 0);
  const zonaH    = zonaBot - zonaTop;

  const totalFilas = ordenado.length;
  const GAP        = 6;
  const ROW_H      = Math.min(100, Math.max(68, Math.floor((zonaH - GAP * (totalFilas - 1)) / totalFilas)));
  const totalH     = totalFilas * ROW_H + GAP * (totalFilas - 1);

  // Alinear desde arriba (no centrar verticalmente) para que quede prolijo
  let y = zonaTop;

  ctx.textAlign = 'left';

  ordenado.forEach((r, idx) => {
    const esPodio = idx < 3;

    ctx.fillStyle = `rgba(0,0,0,${esPodio ? 0.45 : 0.28})`;
    roundRect(ctx, PAD, y, ANCHO, ROW_H, 12);
    ctx.fill();

    ctx.strokeStyle = esPodio ? 'rgba(200,241,53,0.55)' : 'rgba(255,255,255,0.10)';
    ctx.lineWidth   = esPodio ? 1.5 : 1;
    roundRect(ctx, PAD, y, ANCHO, ROW_H, 12);
    ctx.stroke();

    const midY = y + ROW_H / 2;

    // Posición / medalla
    const numFontSize = Math.max(26, ROW_H * 0.40);
    ctx.font      = `${esPodio ? 700 : 600} ${numFontSize}px sans-serif`;
    ctx.fillStyle = esPodio ? '#48F135' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(esPodio ? medals[idx] : `#${idx+1}`, PAD + 46, midY + numFontSize * 0.36);

    // Nombre
    const nameFontSize = Math.max(22, ROW_H * 0.36);
    ctx.font = `600 ${nameFontSize}px sans-serif`;
    let displayName = r.name;
    const maxNombreW = ANCHO - 210;
    while(ctx.measureText(displayName).width > maxNombreW && displayName.length > 6) {
      displayName = displayName.slice(0, -1);
    }
    if(displayName !== r.name) displayName += '…';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.fillText(displayName, PAD + 92, midY + nameFontSize * 0.36);

    // Modalidad
    const mdFontSize = Math.max(18, ROW_H * 0.28);
    ctx.font      = `700 ${mdFontSize}px sans-serif`;
    ctx.fillStyle = r.modalidad === 'rx' ? '#C8F135' : 'rgba(255,255,255,0.38)';
    ctx.textAlign = 'right';
    ctx.fillText(r.modalidad === 'rx' ? 'RX' : 'SC', STORY_W - PAD - 110, midY + mdFontSize * 0.28);

    // Score
    const scoreFontSize = Math.max(24, ROW_H * 0.38);
    ctx.font      = `700 ${scoreFontSize}px sans-serif`;
    ctx.fillStyle = esPodio ? '#48F135' : 'rgba(255,255,255,0.88)';
    ctx.textAlign = 'right';
    ctx.fillText(r.score, STORY_W - PAD - 4, midY + scoreFontSize * 0.36);

    ctx.textAlign = 'left';
    y += ROW_H + GAP;
  });

  // Nota de atletas adicionales
  if(hayMas) {
    ctx.font      = '400 28px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${totalAtletas - MAX_RANKING_ROWS} atleta${totalAtletas - MAX_RANKING_ROWS !== 1 ? 's' : ''} más`, cx, y + 32);
  }

  dibujarFooter(ctx);
  descargarCanvas(canvas, `legion-ranking-${dia}.png`);
}

window.compartirWOD     = compartirWOD;
window.compartirRanking = compartirRanking;