/**
 * Consola del juego: aquí aparece lo que escribes con `mostrar` en Chispa.
 *
 * DECISIÓN: mostrarlo DENTRO de la página y no solo en la consola del
 * navegador (F12), porque la persona que empieza no sabe que existe F12.
 */
const MAXIMO_LINEAS = 6;
let lineas: string[] = [];

export function escribirEnConsola(texto: string): void {
  console.log('[Chispa]', texto);
  const panel = document.getElementById('consola');
  if (!panel) return;
  lineas.push(texto);
  if (lineas.length > MAXIMO_LINEAS) lineas = lineas.slice(-MAXIMO_LINEAS);
  panel.replaceChildren(
    ...lineas.map((l) => {
      const div = document.createElement('div');
      div.textContent = '› ' + l;
      return div;
    }),
  );
  panel.hidden = false;
}

export function limpiarConsola(): void {
  lineas = [];
  const panel = document.getElementById('consola');
  if (panel) {
    panel.replaceChildren();
    panel.hidden = true;
  }
}
