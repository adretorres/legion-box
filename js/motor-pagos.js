// ─── js/motor-pagos.js ────────────────────────────────────────────────────────
import { fsGet, fsSet, cacheUsers, setCacheUsers } from './firebase.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFAS CENTRALIZADAS
// ═══════════════════════════════════════════════════════════════════════════════
export const TARIFAS = {
  crossfit_x5:              45000,
  crossfit_x3:              40000,
  funcional_x5:             40000,
  funcional_x3:             35000,
  clase_suelta:              5000,
  precio_semana:            15000,
  descuento_familiar:        0.10,
  descuento_primer_mes:      0.15,
  recargo_mora_diario:        500,
  dia_limite_sin_recargo:      10,
  dia_limite_tolerancia:       15,
};

// ═══════════════════════════════════════════════════════════════════════════════
// DÍA LÍMITE REAL (considera fines de semana)
// ═══════════════════════════════════════════════════════════════════════════════
export function calcularDiaLimiteReal(anio, mes) {
  // mes es 0-based (JS)
  const d = new Date(anio, mes, TARIFAS.dia_limite_sin_recargo);
  const dia = d.getDay(); // 0=dom, 6=sab
  if (dia === 6) d.setDate(d.getDate() + 2); // sábado → lunes
  if (dia === 0) d.setDate(d.getDate() + 1); // domingo → lunes
  return d;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULAR ESTADO DEL ATLETA
// ═══════════════════════════════════════════════════════════════════════════════
export function calcularEstadoAtleta(u) {
  if (!u) return 'desconocido';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fv  = u.expiry ? new Date(u.expiry + 'T00:00:00') : null;

  if (!fv) return 'bloqueado';
  if (u.promesaPago) return 'promesa_pago';

  const diffDias = Math.round((fv - hoy) / (1000*60*60*24));

  if (diffDias > 7)  return 'al_dia';
  if (diffDias >= 0) return 'proximo_vencer';
  return 'bloqueado';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR DE COTIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════════
export function calcularCotizacionSocio(datosSocio, datosPago) {
  const fechaPago  = datosPago.fechaPago || new Date();
  const precioBase = datosPago.precioBase || TARIFAS.crossfit_x5;

  let montoFinal       = precioBase;
  let recargo          = 0;
  let diasMora         = 0;
  let fechaVencimiento = _calcularVencimientoRenovacion(fechaPago);
  let detalle          = '';

  // ── Si está al día, no hay mora ──────────────────────────────────────────
  if (datosSocio.expiry) {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const fv  = new Date(datosSocio.expiry + 'T00:00:00');
    if (fv >= hoy) {
      return {
        montoFinal: precioBase, recargo: 0, diasMora: 0,
        precioBase, fechaVencimiento: fv,
        alDia: true, detalle: 'Membresía al día'
      };
    }
  }

  // ── Promesa de pago activa — 2 cuotas sin mora ──────────────────────────
  if (datosSocio.promesaPago) {
    montoFinal = precioBase * 2;
    detalle = 'Promesa de pago — 2 cuotas sin mora: $' + precioBase.toLocaleString('es-AR') + ' × 2';
    return { montoFinal, recargo: 0, diasMora: 0, precioBase,
             fechaVencimiento, detalle, promesa: true };
  }

  const anio      = fechaPago.getFullYear();
  const mes       = fechaPago.getMonth();
  const diaActual = fechaPago.getDate();
  const limiteReal = calcularDiaLimiteReal(anio, mes);
  const diaLimite  = limiteReal.getDate();

  const condicion = datosSocio.condicion || 'regular';

  // ── RENOVACIÓN ───────────────────────────────────────────────────────────
  if (condicion === 'regular') {
    if (diaActual <= diaLimite) {
      // En término — verificar descuentos
      if (datosSocio.primerMes && !datosSocio.primerMesUsado) {
        const desc = Math.round(precioBase * TARIFAS.descuento_primer_mes);
        montoFinal = precioBase - desc;
        detalle = 'Primer mes — 15% OFF (-$' + desc.toLocaleString('es-AR') + ')';
      } else if (datosSocio.esPlanFamiliar) {
        const desc = Math.round(precioBase * TARIFAS.descuento_familiar);
        montoFinal = precioBase - desc;
        detalle = 'Plan Familiar — 10% OFF (-$' + desc.toLocaleString('es-AR') + ')';
      } else {
        detalle = 'Pago en término';
      }
    } else {
      // Fuera de término — mora diaria
      diasMora   = diaActual - diaLimite;
      recargo    = diasMora * TARIFAS.recargo_mora_diario;
      montoFinal = precioBase + recargo;
      detalle    = diasMora + ' días de mora — +$' + recargo.toLocaleString('es-AR') +
                   ' ($' + TARIFAS.recargo_mora_diario + '/día)';
    }

  // ── REINCORPORACIÓN ──────────────────────────────────────────────────────
  } else if (condicion === 'nuevo_absoluto' || condicion === 'reincorporado') {
    if (diaActual > TARIFAS.dia_limite_tolerancia) {
      // Post día 15 — parche encarrilador
      const semanasRest = _calcularSemanasRestantes(fechaPago);
      montoFinal = semanasRest * TARIFAS.precio_semana;
      fechaVencimiento = _calcularVencimientoSubsiguiente(fechaPago);
      detalle = 'Parche encarrilador — ' + semanasRest + ' sem. × $' +
        TARIFAS.precio_semana.toLocaleString('es-AR') + ' = $' +
        montoFinal.toLocaleString('es-AR') + '. Venc: ' + _formatFecha(fechaVencimiento);
    } else if (diaActual <= diaLimite) {
      if (datosSocio.primerMes && !datosSocio.primerMesUsado) {
        const desc = Math.round(precioBase * TARIFAS.descuento_primer_mes);
        montoFinal = precioBase - desc;
        detalle = 'Primer mes — 15% OFF (-$' + desc.toLocaleString('es-AR') + ')';
      } else {
        detalle = 'Reincorporación en término';
      }
      // Vencimiento desde fecha de pago (no fijo el 10)
      fechaVencimiento = _calcularVencimientoReincorporacion(fechaPago);
    } else {
      diasMora   = diaActual - diaLimite;
      recargo    = diasMora * TARIFAS.recargo_mora_diario;
      montoFinal = precioBase + recargo;
      fechaVencimiento = _calcularVencimientoReincorporacion(fechaPago);
      detalle = 'Fuera de término — ' + diasMora + ' días de mora (+$' +
                recargo.toLocaleString('es-AR') + ')';
    }
  }

  return { montoFinal, recargo, diasMora, precioBase, fechaVencimiento, detalle };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS DE FECHA
// ═══════════════════════════════════════════════════════════════════════════════

// Renovación: siempre día 10 del mes siguiente
function _calcularVencimientoRenovacion(fecha) {
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + 1);
  d.setDate(10);
  d.setHours(0,0,0,0);
  return d;
}

// Reincorporación: 30 días desde la fecha de pago
function _calcularVencimientoReincorporacion(fecha) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + 30);
  d.setHours(0,0,0,0);
  return d;
}

// Subsiguiente: día 10 del mes que sigue al siguiente
function _calcularVencimientoSubsiguiente(fecha) {
  const d = new Date(fecha);
  d.setMonth(d.getMonth() + 2);
  d.setDate(10);
  d.setHours(0,0,0,0);
  return d;
}

function _calcularSemanasRestantes(fecha) {
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  const diasRest = ultimo.getDate() - fecha.getDate();
  return Math.max(1, Math.ceil(diasRest / 7));
}

export function _formatFecha(date) {
  return String(date.getDate()).padStart(2,'0') + '/' +
         String(date.getMonth()+1).padStart(2,'0') + '/' +
         date.getFullYear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR DE MENSAJES WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════════
export function generarMensajeWhatsApp(id, u) {
  const tel = (u.phone || '').replace(/\D/g, '');
  if (!tel) return { url: '', msg: '', tipo: 'sin_telefono' };

  const nombre1 = u.name.split(' ')[0];
  const estado  = calcularEstadoAtleta(u);
  const hoy     = new Date(); hoy.setHours(0,0,0,0);
  const fv      = u.expiry ? new Date(u.expiry + 'T00:00:00') : null;
  const fechaVencStr = fv ? _formatFecha(fv) : '';
  const diasParaVencer = fv ? Math.round((fv - hoy) / (1000*60*60*24)) : null;

  let msg = '', tipo = '';

  if (estado === 'bloqueado') {
    const diaActual  = hoy.getDate();
    const limiteReal = calcularDiaLimiteReal(hoy.getFullYear(), hoy.getMonth());
    const diasMora   = Math.max(0, diaActual - limiteReal.getDate());
    const plan       = u.plans?.[0] || 'crossfit';
    const precioBase = TARIFAS[plan + '_x5'] || TARIFAS.crossfit_x5;
    const recargo    = diasMora * TARIFAS.recargo_mora_diario;
    const total      = precioBase + recargo;

    if (u.esPlanFamiliar && diaActual >= 11) {
      tipo = 'familiar_irregular';
      msg  = 'Hola ' + nombre1 + '! Te contactamos desde Legión Box 🏋️. ' +
             'Te recordamos que para mantener el beneficio del Plan Familiar, ' +
             'ambas cuentas deben estar al día antes del ' + limiteReal.getDate() + '. ' +
             'El descuento ha quedado inactivo. Podés regularizar desde la app o en el mostrador. ¡Te esperamos!';
    } else {
      tipo = 'mora';
      msg  = 'Hola ' + nombre1 + '! Te contactamos desde Legión Box 🏋️. ' +
             'Tu pase se encuentra vencido. ' +
             'Recordá que el sistema aplica un recargo de $' + TARIFAS.recargo_mora_diario + ' por día de mora. ' +
             'Tu saldo al día de hoy: ' + diasMora + ' día(s) de retraso — ' +
             'Total a abonar: $' + total.toLocaleString('es-AR') +
             ' (base $' + precioBase.toLocaleString('es-AR') +
             ' + recargo $' + recargo.toLocaleString('es-AR') + '). ' +
             'Podés abonar por Mercado Pago, transferencia o en el mostrador. ¡Te esperamos!';
    }
  } else if (diasParaVencer !== null && diasParaVencer <= 7) {
    tipo = 'recordatorio';
    msg  = 'Hola ' + nombre1 + '! Te saludamos desde Legión Box 🏋️. ' +
           'Te recordamos que tu cuota vence el ' + fechaVencStr + '. ' +
           'Estamos en el período de pago (del 1 al ' +
           calcularDiaLimiteReal(hoy.getFullYear(), hoy.getMonth()).getDate() + '). ' +
           'Podés abonar desde la app. ¡A meterle duro al WOD!';
  } else {
    tipo = 'generico';
    msg  = 'Hola ' + nombre1 + '! Te saludamos desde Legión Box 🏋️. ' +
           'Cualquier consulta sobre tu membresía estamos disponibles. ¡Seguí entrenando!';
  }

  return { url: 'https://wa.me/54' + tel + '?text=' + encodeURIComponent(msg), msg, tipo };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLUJO DE ÓRDENES EN FIRESTORE
// ═══════════════════════════════════════════════════════════════════════════════
export async function crearOrdenPendiente(atletaId, monto, concepto, tipoGestion) {
  const orden = {
    atletaId, monto, concepto,
    tipoGestion:     tipoGestion || 'renovacion',
    estado:          'pendiente_aprobacion',
    metodo:          'transferencia',
    fechaCreacion:   new Date().toISOString(),
    fechaAprobacion: null,
  };
  const ordenes   = await fsGet('ordenes_pago') || {};
  const idOrden   = 'ord_' + atletaId + '_' + Date.now();
  ordenes[idOrden] = orden;
  await fsSet('ordenes_pago', ordenes);
  return idOrden;
}

export async function aprobarOrden(idOrden, coachId) {
  const ordenes = await fsGet('ordenes_pago') || {};
  const orden   = ordenes[idOrden];
  if (!orden) throw new Error('Orden no encontrada');

  orden.estado          = 'aprobado';
  orden.aprobadoPor     = coachId || 'coach';
  orden.fechaAprobacion = new Date().toISOString();
  ordenes[idOrden]      = orden;
  await fsSet('ordenes_pago', ordenes);

  // Actualizar vencimiento del atleta
  const usersData = await fsGet('users');
  if (usersData) setCacheUsers(usersData);

  const u = cacheUsers[orden.atletaId];
  if (u) {
    // Calcular nuevo vencimiento según tipo de gestión y expiry actual
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const expiryActual = u.expiry ? new Date(u.expiry + 'T00:00:00') : null;
    const base = (expiryActual && expiryActual > hoy) ? expiryActual : hoy;
    let fv;
    if (orden.tipoGestion === 'reincorporacion') {
      // Reincorporación: 30 días desde la base
      fv = new Date(base);
      fv.setDate(fv.getDate() + 30);
    } else {
      // Renovación: día 10 del mes siguiente a la base
      fv = new Date(base.getFullYear(), base.getMonth() + 1, 10);
    }
    u.expiry = fv.getFullYear() + '-' +
               String(fv.getMonth()+1).padStart(2,'0') + '-' +
               String(fv.getDate()).padStart(2,'0');
    u.condicion = 'regular';
    u.promesaPago = false;
    // Marcar primerMes como usado si aplicó
    if (u.primerMes) { u.primerMes = false; u.primerMesUsado = true; }

    if (!u.payments) u.payments = [];
    u.payments.push({
      id:     Date.now(),
      date:   _formatFecha(new Date()),
      amount: orden.monto,
      method: orden.metodo,
      obs:    orden.concepto,
      tipo:   orden.tipoGestion
    });
    await fsSet('users', cacheUsers);
  }
  return orden;
}

export async function obtenerOrdenesPendientes() {
  const ordenes = await fsGet('ordenes_pago') || {};
  return Object.entries(ordenes)
    .filter(([, o]) => o.estado === 'pendiente_aprobacion')
    .map(([id, o]) => ({ id, ...o }));
}

// ─── EXPONER AL WINDOW ────────────────────────────────────────────────────────
window.calcularCotizacionSocio  = calcularCotizacionSocio;
window.calcularEstadoAtleta     = calcularEstadoAtleta;
window.calcularDiaLimiteReal    = calcularDiaLimiteReal;
window.generarMensajeWhatsApp   = generarMensajeWhatsApp;
window.crearOrdenPendiente      = crearOrdenPendiente;
window.aprobarOrden             = aprobarOrden;
window.obtenerOrdenesPendientes = obtenerOrdenesPendientes;
window.TARIFAS                  = TARIFAS;