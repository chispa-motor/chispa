/**
 * Colores con nombre en español.
 *
 * Así, en el futuro, en Chispa se podrá escribir `color = "rojo"` en lugar de
 * "#e74c3c". Si el texto no es un nombre conocido, se pasa tal cual al
 * navegador, así que "#ff00ff" o "rgb(10, 20, 30)" también funcionan.
 */
import { normalizar } from '../utilidades/texto';

const COLORES: Record<string, string> = {
  rojo: '#e74c3c',
  verde: '#2ecc71',
  azul: '#3498db',
  amarillo: '#f1c40f',
  naranja: '#e67e22',
  morado: '#9b59b6',
  violeta: '#9b59b6',
  rosa: '#ff6fa8',
  cian: '#1abcd4',
  blanco: '#ffffff',
  negro: '#000000',
  gris: '#7f8c8d',
  marron: '#8e5a2b', // también acepta "marrón" gracias a normalizar()
  transparente: 'rgba(0,0,0,0)',
};

/** Convierte "Rojo", "rojo" o "#ff0000" en un color que entiende el Canvas. */
export function resolverColor(color: string): string {
  return COLORES[normalizar(color)] ?? color;
}

/** Lista de nombres disponibles (útil para el editor y los mensajes de error). */
export const NOMBRES_COLORES = Object.keys(COLORES);

/** ¿Es un color que el motor sabe dibujar? (un nombre en español, "#ff8800", "rgb(...)"...) */
export function esColorValido(color: string): boolean {
  const c = color.trim();
  return normalizar(c) in COLORES || /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c) || /^(rgb|rgba|hsl|hsla)\(.+\)$/i.test(c);
}

/** "rojo", "#e74c3c" o "#f00" → [r, g, b, a] (0-255, a de 0 a 1). null si no se puede leer (rgb(), hsl()...). */
export function colorAComponentes(color: string): [number, number, number, number] | null {
  const c = resolverColor(color.trim());
  if (c === 'rgba(0,0,0,0)') return [0, 0, 0, 0];
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((x) => x + x).join('');
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
}

/** [r, g, b, a] → "#rrggbb" (o "#rrggbbaa" si es transparente). */
export function componentesAColor([r, g, b, a]: [number, number, number, number]): string {
  const hex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 1 ? hex(a * 255) : ''}`;
}
