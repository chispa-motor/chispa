/**
 * EDITOR DE PIXEL ART: dibujar sprites dentro de Chispa, píxel a píxel.
 *
 *   Herramientas: lápiz, goma, cubo (rellenar) y cuentagotas (coger un color).
 *   Colores: una paleta para empezar y cualquier otro con el selector.
 *   Zoom, voltear, limpiar, deshacer (Ctrl+Z) y rehacer (Ctrl+Y).
 *   Fotogramas: se ve el anterior en transparente («papel cebolla») para
 *   animar, y una vista previa que se mueve a la velocidad elegida.
 *
 * Al guardar, cada fotograma se convierte en una imagen PNG del proyecto.
 * Con varios fotogramas se crea también una animación (ver EstadoEditor.guardarDibujo).
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import { abrirDialogo, notificar } from '../interfaz/dialogos';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';
import { PALETA, PixelArt, TAMANOS, pixelesDesdeRGBA, type Pixel } from './PixelArt';

type Herramienta = 'lapiz' | 'goma' | 'cubo' | 'cuentagotas';

/** Convierte un fotograma en una imagen PNG ("data URL"): un píxel de la imagen por cada casilla. */
export function fotogramaAPNG(dibujo: PixelArt, fotograma: number): string {
  const c = document.createElement('canvas');
  c.width = dibujo.ancho;
  c.height = dibujo.alto;
  const ctx = c.getContext('2d')!;
  for (let y = 0; y < dibujo.alto; y++) {
    for (let x = 0; x < dibujo.ancho; x++) {
      const p = dibujo.obtener(x, y, fotograma);
      if (!p) continue;
      ctx.fillStyle = p;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c.toDataURL('image/png');
}

/** Carga una imagen del proyecto como dibujo (si es pequeña: hasta 64 × 64). */
function cargarImagen(url: string): Promise<PixelArt | null> {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > 64 || img.height > 64 || !img.width) return resolver(null);
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolver(new PixelArt(img.width, img.height, [pixelesDesdeRGBA(ctx.getImageData(0, 0, img.width, img.height).data, img.width, img.height)]));
    };
    img.onerror = () => resolver(null);
    img.src = url;
  });
}

/**
 * Abre el editor. Sin `imagen`, un dibujo nuevo; con `imagen`, edita esa
 * imagen del proyecto (o la animación, si se da `animacion`).
 */
export async function abrirEditorPixelArt(estado: EstadoEditor, opciones: { imagen?: string; animacion?: string } = {}): Promise<void> {
  let dibujo = new PixelArt(16, 16);
  let nombre = opciones.animacion ?? opciones.imagen ?? 'Dibujo';
  let velocidad = 8;
  const editando = !!(opciones.imagen || opciones.animacion);
  if (opciones.animacion && estado.proyecto.animaciones[opciones.animacion]?.fotogramas.length) {
    const a = estado.proyecto.animaciones[opciones.animacion];
    const cargados = await Promise.all(a.fotogramas.map((f) => cargarImagen(estado.proyecto.imagenes[f] ?? '')));
    const primero = cargados[0];
    if (!primero || cargados.some((c) => !c || c.ancho !== primero.ancho || c.alto !== primero.alto)) {
      return notificar('Esta animación no se puede editar aquí: sus imágenes son muy grandes (más de 64 × 64) o de tamaños distintos.', 'error');
    }
    dibujo = new PixelArt(primero.ancho, primero.alto, cargados.map((c) => c!.fotogramas[0]));
    velocidad = a.velocidad;
  } else if (opciones.imagen) {
    const cargado = await cargarImagen(estado.proyecto.imagenes[opciones.imagen] ?? '');
    if (!cargado) return notificar(`"${opciones.imagen}" es muy grande para editarla aquí (el editor de píxeles es para dibujos de hasta 64 × 64).`, 'error');
    dibujo = cargado;
  }

  let herramienta: Herramienta = 'lapiz';
  let color: string = PALETA[0];
  let zoom = Math.max(6, Math.floor(384 / Math.max(dibujo.ancho, dibujo.alto)));
  let cebolla = true;

  const lienzo = h('canvas', { class: 'lienzo-pixel', 'aria-label': 'Dibujo (haz clic y arrastra para pintar)' });
  const ctx = lienzo.getContext('2d')!;
  const zonaHerramientas = h('div', { class: 'herramientas-pixel' });
  const zonaColores = h('div', { class: 'paleta-pixel' });
  const tira = h('div', { class: 'tira-pixel' });
  const vistaPrevia = h('canvas', { class: 'previa-pixel', title: 'Vista previa (así se verá la animación)' });
  const entradaNombre = h('input', { class: 'campo', value: nombre, spellcheck: 'false', 'aria-label': 'Nombre del dibujo' });
  const entradaVelocidad = h('input', { class: 'campo', type: 'number', min: '1', max: '30', value: String(velocidad), title: 'Fotogramas por segundo' });
  const selectorTamano = h('select', { class: 'campo', title: 'Tamaño del dibujo (empieza de nuevo)', disabled: editando },
    TAMANOS.map((t) => h('option', { value: String(t), selected: t === dibujo.ancho }, `${t} × ${t}`)));

  // ── Dibujar en la pantalla ──
  const pintarLienzo = () => {
    lienzo.width = dibujo.ancho * zoom;
    lienzo.height = dibujo.alto * zoom;
    // Cuadros grises de fondo: así se ve lo transparente
    for (let y = 0; y < dibujo.alto; y++) {
      for (let x = 0; x < dibujo.ancho; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#3a3f4b' : '#2e323c';
        ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        // Papel cebolla: el fotograma anterior, muy flojito
        const antes = cebolla && dibujo.actual > 0 ? dibujo.obtener(x, y, dibujo.actual - 1) : null;
        if (antes) {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = antes;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
          ctx.globalAlpha = 1;
        }
        const p = dibujo.obtener(x, y);
        if (p) {
          ctx.fillStyle = p;
          ctx.fillRect(x * zoom, y * zoom, zoom, zoom);
        }
      }
    }
    if (zoom >= 8) {
      ctx.strokeStyle = '#ffffff14';
      ctx.lineWidth = 1;
      for (let x = 1; x < dibujo.ancho; x++) ctx.strokeRect(x * zoom + 0.5, 0, 0, lienzo.height);
      for (let y = 1; y < dibujo.alto; y++) ctx.strokeRect(0, y * zoom + 0.5, lienzo.width, 0);
    }
  };

  const miniatura = (f: number, tamano: number) => {
    const c = h('canvas', {});
    c.width = c.height = tamano;
    const x = c.getContext('2d')!;
    const escala = tamano / Math.max(dibujo.ancho, dibujo.alto);
    for (let py = 0; py < dibujo.alto; py++) for (let px = 0; px < dibujo.ancho; px++) {
      const p = dibujo.obtener(px, py, f);
      if (!p) continue;
      x.fillStyle = p;
      x.fillRect(px * escala, py * escala, Math.ceil(escala), Math.ceil(escala));
    }
    return c;
  };

  const pintarTira = () =>
    rellenar(tira,
      dibujo.fotogramas.map((_, i) =>
        h('button', { class: `fotograma-pixel ${i === dibujo.actual ? 'actual' : ''}`, title: `Fotograma ${i + 1}`, onclick: () => {
          dibujo.actual = i;
          todo();
        } }, miniatura(i, 48), h('span', {}, String(i + 1)))),
      h('div', { class: 'botones-fotogramas' },
        botonIcono('copiar', 'Nuevo fotograma: una copia de este (lo normal para animar: cambias un poco)', () => cambio(() => dibujo.duplicarFotograma()), undefined, 'pequeno'),
        botonIcono('mas', 'Nuevo fotograma vacío', () => cambio(() => dibujo.nuevoFotograma()), undefined, 'pequeno'),
        botonIcono('izquierda', 'Mover este fotograma a la izquierda', () => cambio(() => dibujo.moverFotograma(-1)), undefined, 'pequeno'),
        botonIcono('derecha', 'Mover este fotograma a la derecha', () => cambio(() => dibujo.moverFotograma(1)), undefined, 'pequeno'),
        botonIcono('basura', 'Borrar este fotograma', () => cambio(() => dibujo.borrarFotograma()), undefined, 'pequeno'),
      ),
    );

  const boton = (h_: Herramienta, ic: string, texto: string, ayuda: string) =>
    h('button', { class: `boton-herramienta ${herramienta === h_ ? 'activo' : ''}`, title: ayuda, onclick: () => {
      herramienta = h_;
      pintarHerramientas();
    } }, icono(ic, 18), h('span', {}, texto));

  const pintarHerramientas = () =>
    rellenar(zonaHerramientas,
      boton('lapiz', 'pincel', 'Lápiz', 'Pinta píxeles del color elegido (L)'),
      boton('goma', 'goma', 'Goma', 'Borra píxeles: los deja transparentes (G)'),
      boton('cubo', 'cubo', 'Cubo', 'Rellena toda una zona del mismo color (C)'),
      boton('cuentagotas', 'cuentagotas', 'Coger color', 'Haz clic en un píxel para usar su color (K)'),
      h('div', { class: 'separador' }),
      botonIcono('lupa', 'Acercar', () => {
        zoom = Math.min(48, zoom + 2);
        pintarLienzo();
      }, 'Acercar', 'pequeno'),
      botonIcono('lupa', 'Alejar', () => {
        zoom = Math.max(2, zoom - 2);
        pintarLienzo();
      }, 'Alejar', 'pequeno'),
      botonIcono('deshacer', 'Deshacer (Ctrl+Z)', () => dibujo.deshacer() && todo(), 'Deshacer', 'pequeno'),
      botonIcono('rehacer', 'Rehacer (Ctrl+Y)', () => dibujo.rehacer() && todo(), 'Rehacer', 'pequeno'),
      botonIcono('espejo', 'Voltear (como en un espejo)', () => cambio(() => dibujo.voltear()), 'Voltear', 'pequeno'),
      botonIcono('basura', 'Borrar todo este fotograma', () => cambio(() => dibujo.limpiar()), 'Limpiar', 'pequeno'),
      h('label', { class: 'casilla-cebolla', title: 'Ver el fotograma anterior en transparente, para animar' },
        h('input', { type: 'checkbox', checked: cebolla, onchange: (ev: Event) => {
          cebolla = (ev.target as HTMLInputElement).checked;
          pintarLienzo();
        } }), 'Ver el anterior'),
    );

  const selectorColor = h('input', { type: 'color', value: color, title: 'Otro color', oninput: (ev: Event) => elegirColor((ev.target as HTMLInputElement).value) });
  const elegirColor = (c: string) => {
    color = c;
    if (herramienta === 'goma' || herramienta === 'cuentagotas') herramienta = 'lapiz';
    selectorColor.value = c;
    pintarColores();
    pintarHerramientas();
  };
  const pintarColores = () =>
    rellenar(zonaColores,
      PALETA.map((c) => h('button', { class: `color-pixel ${c === color ? 'actual' : ''}`, style: `background:${c}`, title: c, 'aria-label': `Color ${c}`, onclick: () => elegirColor(c) })),
      h('label', { class: 'otro-color' }, selectorColor, 'Otro'),
      h('div', { class: 'color-actual', style: `background:${color}`, title: 'Color elegido' }),
    );

  const todo = () => {
    pintarLienzo();
    pintarTira();
  };
  /** Un cambio que se puede deshacer. */
  const cambio = (fn: () => void) => {
    dibujo.apuntar();
    fn();
    todo();
  };

  // ── Ratón sobre el lienzo ──
  let ultimo: [number, number] | null = null;
  const casillaDe = (ev: PointerEvent): [number, number] => {
    const r = lienzo.getBoundingClientRect();
    return [Math.floor(((ev.clientX - r.left) / r.width) * dibujo.ancho), Math.floor(((ev.clientY - r.top) / r.height) * dibujo.alto)];
  };
  const aplicar = (x: number, y: number) => {
    const c: Pixel = herramienta === 'goma' ? null : color;
    if (ultimo) dibujo.linea(ultimo[0], ultimo[1], x, y, c);
    else dibujo.pintar(x, y, c);
    ultimo = [x, y];
  };
  lienzo.addEventListener('pointerdown', (ev) => {
    const [x, y] = casillaDe(ev);
    if (!dibujo.dentro(x, y)) return;
    if (herramienta === 'cuentagotas') {
      const p = dibujo.obtener(x, y);
      if (p) elegirColor(p);
      return;
    }
    dibujo.apuntar();
    if (herramienta === 'cubo') {
      dibujo.rellenar(x, y, color);
      todo();
      return;
    }
    lienzo.setPointerCapture(ev.pointerId);
    ultimo = null;
    aplicar(x, y);
    pintarLienzo();
  });
  lienzo.addEventListener('pointermove', (ev) => {
    if (!ultimo) return;
    aplicar(...casillaDe(ev));
    pintarLienzo();
  });
  const soltar = () => {
    if (!ultimo) return;
    ultimo = null;
    pintarTira();
  };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  // ── Vista previa animada, a la velocidad elegida ──
  let fotogramaPrevia = 0;
  let intervaloPrevia = 0;
  const empezarPrevia = () => {
    clearInterval(intervaloPrevia);
    intervaloPrevia = window.setInterval(() => {
      fotogramaPrevia = (fotogramaPrevia + 1) % dibujo.fotogramas.length;
      vistaPrevia.width = vistaPrevia.height = 96;
      vistaPrevia.getContext('2d')!.drawImage(miniatura(fotogramaPrevia, 96), 0, 0);
    }, 1000 / Math.max(1, Number(entradaVelocidad.value) || 8));
  };
  empezarPrevia();
  entradaVelocidad.addEventListener('change', empezarPrevia);

  selectorTamano.addEventListener('change', () => {
    const t = Number(selectorTamano.value);
    dibujo = new PixelArt(t, t);
    zoom = Math.max(6, Math.floor(384 / t));
    todo();
  });

  // ── Atajos dentro del editor ──
  const teclas = (ev: KeyboardEvent) => {
    if ((ev.target as HTMLElement).tagName === 'INPUT') return;
    const ctrl = ev.ctrlKey || ev.metaKey;
    const k = ev.key.toLowerCase();
    if (ctrl && k === 'z') dibujo.deshacer() && todo();
    else if (ctrl && k === 'y') dibujo.rehacer() && todo();
    else if (!ctrl && (k === 'l' || k === 'g' || k === 'c' || k === 'k')) {
      herramienta = ({ l: 'lapiz', g: 'goma', c: 'cubo', k: 'cuentagotas' } as const)[k];
      pintarHerramientas();
    } else return;
    ev.preventDefault();
  };

  const contenido = h('div', { class: 'editor-pixel', tabindex: '0', onkeydown: teclas },
    h('div', { class: 'columna-herramientas' }, zonaHerramientas, zonaColores),
    h('div', { class: 'centro-pixel' }, h('div', { class: 'marco-lienzo-pixel' }, lienzo), h('h4', {}, 'Fotogramas'), tira),
    h('div', { class: 'columna-opciones' },
      h('label', { class: 'campo-fila' }, h('span', { class: 'campo-etiqueta' }, 'nombre'), entradaNombre),
      h('label', { class: 'campo-fila' }, h('span', { class: 'campo-etiqueta' }, 'tamaño'), selectorTamano),
      h('label', { class: 'campo-fila' }, h('span', { class: 'campo-etiqueta' }, 'velocidad'), entradaVelocidad),
      h('h4', {}, 'Vista previa'), vistaPrevia,
      h('p', { class: 'nota' }, 'Con un fotograma se guarda una imagen. Con varios, una imagen por fotograma y una animación con este nombre: en el código, ', h('code', {}, 'yo.animar("nombre")'), '.'),
    ),
  );
  pintarHerramientas();
  pintarColores();
  todo();

  abrirDialogo(editando ? `Editar dibujo: ${nombre}` : 'Dibujar un sprite', contenido, [
    { texto: 'Cancelar', alPulsar: () => clearInterval(intervaloPrevia) },
    {
      texto: 'Guardar',
      clase: 'principal',
      alPulsar: () => {
        nombre = entradaNombre.value.trim() || 'Dibujo';
        if (dibujo.fotogramas.every((_, i) => dibujo.estaVacio(i))) {
          notificar('El dibujo está vacío: pinta algo antes de guardarlo.', 'error');
          return false;
        }
        clearInterval(intervaloPrevia);
        const pngs = dibujo.fotogramas.map((_, i) => fotogramaAPNG(dibujo, i));
        const final = estado.guardarDibujo(nombre, pngs, Math.max(1, Number(entradaVelocidad.value) || 8), { sobrescribir: editando, animacion: !!opciones.animacion });
        notificar(pngs.length > 1 || opciones.animacion ? `Animación "${final}" guardada (${pngs.length} fotogramas). En el código: yo.animar("${final}")` : `Imagen "${final}" guardada. Arrástrala a la escena desde Proyecto > Imágenes.`, 'ok');
      },
    },
  ], 'dialogo-ancho dialogo-pixel');
  requestAnimationFrame(() => contenido.focus());
}
