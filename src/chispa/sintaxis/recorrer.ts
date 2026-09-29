/**
 * RECORRER EL ÁRBOL: visita todas las expresiones de un programa (también las
 * que van dentro de otras). Lo usan las comprobaciones que miran todo el
 * proyecto, como «nadie recibe este mensaje».
 */
import type { Bloque, Evento, Expresion } from './ast';

export function recorrerExpresiones(bloque: Bloque, visitar: (e: Expresion) => void): void {
  const expr = (e: Expresion | null | undefined): void => {
    if (!e) return;
    visitar(e);
    switch (e.tipo) {
      case 'Texto':
        for (const p of e.partes ?? []) if (typeof p !== 'string') expr(p);
        return;
      case 'Lista':
        e.elementos.forEach(expr);
        return;
      case 'Tabla':
        e.entradas.forEach((x) => expr(x.valor));
        return;
      case 'Binaria':
      case 'Logica':
        expr(e.izquierda);
        expr(e.derecha);
        return;
      case 'Unaria':
        expr(e.operando);
        return;
      case 'Llamada':
        expr(e.funcion);
        e.argumentos.forEach(expr);
        return;
      case 'Miembro':
        expr(e.objeto);
        return;
      case 'Indice':
        expr(e.objeto);
        expr(e.indice);
        return;
    }
  };
  const evento = (ev: Evento) => {
    if (ev.tipo === 'intervalo' || ev.tipo === 'pasen') expr(ev.segundos);
    if (ev.tipo === 'tecla') ev.teclas.forEach(expr);
  };
  const bloqueR = (b: Bloque): void => {
    for (const s of b) {
      switch (s.tipo) {
        case 'Variable':
          expr(s.valor);
          break;
        case 'Asignacion':
          expr(s.objetivo);
          expr(s.valor);
          break;
        case 'Si':
          for (const r of s.ramas) {
            expr(r.condicion);
            bloqueR(r.cuerpo);
          }
          if (s.sino) bloqueR(s.sino);
          break;
        case 'Mientras':
          expr(s.condicion);
          bloqueR(s.cuerpo);
          break;
        case 'Repetir':
          expr(s.veces);
          bloqueR(s.cuerpo);
          break;
        case 'ParaCada':
          expr(s.coleccion);
          bloqueR(s.cuerpo);
          break;
        case 'Funcion':
          bloqueR(s.cuerpo);
          break;
        case 'Devolver':
          expr(s.valor);
          break;
        case 'Cuando':
          evento(s.evento);
          bloqueR(s.cuerpo);
          break;
        case 'ExpresionSuelta':
          expr(s.expresion);
          break;
      }
    }
  };
  bloqueR(bloque);
}
