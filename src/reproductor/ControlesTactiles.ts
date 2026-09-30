/**
 * CONTROLES TÁCTILES: botones en la pantalla para jugar en el móvil.
 *
 * DECISIÓN: salen SOLOS, sin configurar nada. Se mira qué teclas usan los
 * scripts ("izquierda", "espacio"...) y se ponen esos botones: una cruceta
 * a la izquierda para las direcciones y botones redondos a la derecha para
 * lo demás. Al tocarlos, el juego cree que se ha pulsado esa tecla.
 * Solo aparecen en pantallas táctiles, y se pueden quitar en el proyecto.
 * Tocar la pantalla del juego sigue contando como hacer clic.
 */
import type { Entrada } from '../motor/Entrada';
import type { DefProyecto } from '../proyecto/formato';
import { normalizarNombreTecla } from '../motor/Entrada';
import { sinPrototipo } from '../utilidades/seguro';

const DIRECCIONES: Record<string, 'arriba' | 'abajo' | 'izquierda' | 'derecha'> = sinPrototipo({
  arriba: 'arriba', abajo: 'abajo', izquierda: 'izquierda', derecha: 'derecha', w: 'arriba', s: 'abajo', a: 'izquierda', d: 'derecha',
});
/** Como mucho, estos botones de acción (más no caben en un móvil). */
const MAXIMO_ACCIONES = 6;

export interface TeclasDelJuego {
  /** Cada dirección de la cruceta y las teclas que pulsa (flecha y, si se usan, WASD). */
  direcciones: Partial<Record<'arriba' | 'abajo' | 'izquierda' | 'derecha', string[]>>;
  /** Las demás teclas, en el orden en que aparecen. */
  acciones: string[];
}

/** Las teclas que usa el juego: las de «cuando se pulsa/mantiene/suelta» y las de teclado.xxx("..."). */
export function teclasDelJuego(proyecto: DefProyecto): TeclasDelJuego {
  const usadas: string[] = [];
  const patron = /(?:cuando\s+se\s+(?:pulsa|mantiene|suelta)\s+|teclado\s*\.\s*\w+\s*\(\s*)((?:"[^"\n]*"\s*,?\s*)+)/giu;
  for (const codigo of Object.values(proyecto.scripts)) {
    for (const m of codigo.matchAll(patron)) {
      for (const t of m[1].matchAll(/"([^"\n]*)"/g)) {
        const n = normalizarNombreTecla(t[1]);
        if (n && !usadas.includes(n)) usadas.push(n);
      }
    }
  }
  // moverConFlechas() usa las flechas sin nombrarlas
  if (Object.values(proyecto.scripts).some((c) => /moverconflechas/i.test(c))) for (const f of ['izquierda', 'derecha', 'arriba', 'abajo']) if (!usadas.includes(f)) usadas.push(f);
  const r: TeclasDelJuego = { direcciones: {}, acciones: [] };
  for (const t of usadas) {
    const d = DIRECCIONES[t];
    if (d) (r.direcciones[d] ??= []).push(t);
    else if (r.acciones.length < MAXIMO_ACCIONES) r.acciones.push(t);
  }
  return r;
}

/** ¿Es una pantalla que se toca con el dedo? */
export function esPantallaTactil(): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
}

/** Los estilos de los botones táctiles. */
export const ESTILOS_TACTILES = `.controles-tactiles { position: fixed; inset: auto 0 0 0; height: 0; z-index: 10; user-select: none; -webkit-user-select: none; touch-action: none; } .controles-tactiles button { position: fixed; border: 2px solid rgba(255,255,255,.55); background: rgba(20,24,40,.45); color: #fff; font: bold 20px system-ui, sans-serif; border-radius: 16px; width: 64px; height: 64px; touch-action: none; } .controles-tactiles button.pulsado { background: rgba(255,255,255,.35); } .controles-tactiles button.accion { border-radius: 50%; width: 72px; height: 72px; font-size: 15px; }`;

const FLECHAS = { arriba: '▲', abajo: '▼', izquierda: '◀', derecha: '▶' };

/** Pone los botones en la página. Devuelve el contenedor (o null si el juego no usa teclas). */
export function ponerControlesTactiles(entrada: Entrada, proyecto: DefProyecto): HTMLElement | null {
  const teclas = teclasDelJuego(proyecto);
  if (!Object.keys(teclas.direcciones).length && !teclas.acciones.length) return null;
  const capa = document.createElement('div');
  capa.className = 'controles-tactiles';
  // Los estilos van en la página del juego exportado (exportar.ts), con la política de
  // seguridad (CSP). Si no están (en el editor, en los tests), se ponen aquí como texto.
  if (!document.querySelector('style[data-controles-tactiles]')) {
    const estilo = document.createElement('style');
    estilo.dataset.controlesTactiles = '';
    estilo.textContent = ESTILOS_TACTILES;
    document.head.appendChild(estilo);
  }
  const boton = (texto: string, id: string, pulsa: string[], estilo: Partial<CSSStyleDeclaration>, clase = '') => {
    const b = document.createElement('button');
    b.textContent = texto;
    b.className = clase;
    b.setAttribute('aria-label', pulsa.join(' + '));
    Object.assign(b.style, estilo);
    const abajo = (e: Event) => {
      e.preventDefault();
      b.classList.add('pulsado');
      pulsa.forEach((t, i) => entrada.pulsarVirtual(`tactil:${id}:${i}`, t));
    };
    const arriba = (e: Event) => {
      e.preventDefault();
      b.classList.remove('pulsado');
      pulsa.forEach((_, i) => entrada.soltarVirtual(`tactil:${id}:${i}`));
    };
    b.addEventListener('pointerdown', abajo);
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, arriba);
    capa.appendChild(b);
  };
  const sitio = { arriba: { left: '84px', bottom: '160px' }, abajo: { left: '84px', bottom: '16px' }, izquierda: { left: '12px', bottom: '88px' }, derecha: { left: '156px', bottom: '88px' } };
  for (const [d, pulsa] of Object.entries(teclas.direcciones) as ['arriba' | 'abajo' | 'izquierda' | 'derecha', string[]][]) {
    boton(FLECHAS[d], d, pulsa, sitio[d]);
  }
  // Los de acción, en dos filas desde la esquina de abajo a la derecha
  teclas.acciones.forEach((t, i) => {
    boton(t === 'espacio' ? '⎵' : t, t, [t], { right: `${16 + (i % 3) * 84}px`, bottom: `${20 + Math.floor(i / 3) * 84}px` }, 'accion');
  });
  document.body.appendChild(capa);
  return capa;
}
