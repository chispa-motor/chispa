/**
 * ATAJOS DE TECLADO: la lista de todos, en un solo sitio. De aquí salen la
 * ventana de atajos (F1) y la tabla de la Ayuda, así nunca se contradicen.
 */
import { h } from './interfaz/dom';
import { abrirDialogo } from './interfaz/dialogos';

/** Una tecla se escribe entre corchetes: "[Ctrl]+[S]". Lo demás es texto normal. */
export interface Atajo {
  teclas: string;
  que: string;
}

export const ATAJOS: { grupo: string; atajos: Atajo[] }[] = [
  {
    grupo: 'General',
    atajos: [
      { teclas: '[F1]', que: 'Esta ventana con todos los atajos' },
      { teclas: '[Ctrl]+[S]', que: 'Guardar (descargar el proyecto)' },
      { teclas: '[Ctrl]+[Z] / [Ctrl]+[Y]', que: 'Deshacer / rehacer (en la escena, en el código y en los bloques)' },
      { teclas: '[Ctrl]+[,]', que: 'Ajustes: tema claro u oscuro y tamaño de la letra' },
    ],
  },
  {
    grupo: 'Jugar',
    atajos: [
      { teclas: '[F5] o [Ctrl]+[Intro]', que: 'Ejecutar (o reiniciar) el juego' },
      { teclas: '[Mayús]+[F5]', que: 'Parar el juego' },
      { teclas: 'Abajo de la consola', que: 'Escribir una orden mientras se juega (juego.vidas = 99) y pulsar [Intro]' },
    ],
  },
  {
    grupo: 'Escena',
    atajos: [
      { teclas: '[Ctrl]+[D]', que: 'Duplicar lo seleccionado' },
      { teclas: '[Ctrl]+clic', que: 'Seleccionar varios objetos (en la escena o en la lista)' },
      { teclas: 'Arrastrar el fondo', que: 'Seleccionar con un rectángulo todo lo que toque' },
      { teclas: '[Ctrl]+[A]', que: 'Seleccionar todos los objetos de la escena (menos los mapas)' },
      { teclas: '[Ctrl]+[C] / [Ctrl]+[V]', que: 'Copiar y pegar objetos (también de una escena a otra)' },
      { teclas: '[Supr]', que: 'Borrar lo seleccionado' },
      { teclas: '[Flechas]', que: 'Mover lo seleccionado (con [Mayús], de 10 en 10)' },
      { teclas: 'Botón derecho + arrastrar', que: 'Mover la vista (también con el botón central, o con [Espacio] + arrastrar)' },
      { teclas: '[Rueda]', que: 'Acercar / alejar' },
      { teclas: '[V] [B] [E]', que: 'Mover · pintar casillas · borrar casillas' },
      { teclas: '[Mayús] + arrastrar', que: 'Con el pincel: pintar un rectángulo de casillas' },
    ],
  },
  {
    grupo: 'Código y bloques',
    atajos: [
      { teclas: '[Ctrl]+[B]', que: 'Cambiar el script abierto entre código y bloques' },
      { teclas: '[Ctrl]+[Espacio]', que: 'Sugerencias en el código' },
      { teclas: '[Ctrl]+[F]', que: 'Buscar en el código' },
      { teclas: '[Tab] / [Mayús]+[Tab]', que: 'Meter o sacar la sangría de las líneas elegidas' },
    ],
  },
  {
    grupo: 'Depurar',
    atajos: [
      { teclas: 'Clic en el número de una línea', que: 'Poner o quitar un punto de parada (el juego se para ahí)' },
      { teclas: '[F8]', que: 'Continuar' },
      { teclas: '[F10]', que: 'Siguiente línea' },
      { teclas: '[F11]', que: 'Entrar en la función' },
    ],
  },
];

/** "[Ctrl]+[S]" → <kbd>Ctrl</kbd>+<kbd>S</kbd> */
export function teclasHtml(teclas: string): (HTMLElement | string)[] {
  return teclas.split(/(\[[^\]]+\])/).filter(Boolean).map((t) => (t.startsWith('[') ? h('kbd', {}, t.slice(1, -1)) : t));
}

/** Una tabla con los atajos de unos grupos. */
export function tablaAtajos(grupos = ATAJOS): HTMLElement {
  return h('div', { class: 'grupos-atajos' },
    grupos.map((g) => h('section', {},
      h('h3', {}, g.grupo),
      h('table', { class: 'atajos' }, g.atajos.map((a) => h('tr', {}, h('td', {}, teclasHtml(a.teclas)), h('td', {}, teclasHtml(a.que))))),
    )),
  );
}

export function abrirAtajos(): void {
  abrirDialogo('Atajos de teclado', tablaAtajos(), [{ texto: 'Cerrar', clase: 'principal' }], 'dialogo-ancho');
}
