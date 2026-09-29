/**
 * PANEL IZQUIERDO, con dos pestañas:
 *
 *   - ESCENA: los objetos de la escena actual (como la "Hierarchy" de Unity o
 *     el "Explorer" de Roblox), cada uno con su script .chs debajo.
 *   - PROYECTO: todo lo demás: escenas, scripts, plantillas, imágenes,
 *     sonidos y animaciones.
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import type { DefObjeto } from '../../proyecto/formato';
import { OBJETOS_NUEVOS, leerComoDataURL, type VistaEscena } from '../escena/VistaEscena';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';
import { abrirDialogo, confirmar, notificar, pedirTexto } from '../interfaz/dialogos';

type Pestana = 'escena' | 'proyecto';

function iconoDe(def: DefObjeto): string {
  if (def.mapa) return 'mapa';
  if (!def.sprite) return 'vacio';
  if (def.sprite.imagen) return 'imagen';
  if (def.sprite.forma === 'texto') return 'texto';
  if (def.sprite.fijo && def.sprite.texto) return 'boton';
  return def.sprite.forma === 'circulo' ? 'circulo' : 'objeto';
}

export class PanelIzquierdo {
  readonly elemento: HTMLElement;
  private pestana: Pestana = 'escena';
  private cuerpo = h('div', { class: 'panel-cuerpo' });
  private cabecera = h('div', { class: 'pestanas-panel' });
  private sonando: HTMLAudioElement | null = null;

  constructor(
    private estado: EstadoEditor,
    private vista: VistaEscena,
  ) {
    this.elemento = h('div', { class: 'panel-izquierdo' }, this.cabecera, this.cuerpo);
    estado.alCambiar((c) => {
      if (c !== 'codigo' && c !== 'historial') this.dibujarLuego();
    });
    this.dibujar();
  }

  private pendiente = false;
  private firmaDibujada = '';

  /** Redibuja en el siguiente fotograma, y solo si ha cambiado algo de lo que se ve. */
  private dibujarLuego(): void {
    if (this.pendiente) return;
    this.pendiente = true;
    requestAnimationFrame(() => {
      this.pendiente = false;
      if (this.firma() !== this.firmaDibujada) this.dibujar();
    });
  }

  /** Todo lo que enseña el panel, en un texto (si no cambia, no hace falta redibujar: por ejemplo, al arrastrar). */
  private firma(): string {
    const e = this.estado;
    const p = e.proyecto;
    const comun = [this.pestana, e.escenaActual, JSON.stringify(e.seleccion), e.pestanaActiva, e.portapapeles?.nombre ?? ''];
    if (this.pestana === 'escena') {
      return JSON.stringify([comun, Object.keys(p.escenas), p.escenaInicial, e.escena.objetos.map((o) => [o.nombre, o.script, o.script && o.script in p.scripts, iconoDe(o), o.sprite?.fijo])]);
    }
    return JSON.stringify([comun, Object.keys(p.escenas), p.escenaInicial, Object.keys(p.scripts), Object.keys(p.plantillas), Object.keys(p.imagenes), Object.keys(p.sonidos), Object.entries(p.animaciones).map(([n, a]) => [n, a.fotogramas.length]), e.todosLosObjetos().map((o) => o.script)]);
  }

  dibujar(): void {
    this.firmaDibujada = this.firma();
    const scroll = this.cuerpo.scrollTop;
    const pestana = (p: Pestana, texto: string, ic: string) =>
      h('button', { class: `pestana-panel ${this.pestana === p ? 'activa' : ''}`, onclick: () => {
        this.pestana = p;
        this.dibujar();
      } }, icono(ic, 15), texto);
    rellenar(this.cabecera, pestana('escena', 'Escena', 'escena'), pestana('proyecto', 'Proyecto', 'carpeta'));
    rellenar(this.cuerpo, ...(this.pestana === 'escena' ? this.pestanaEscena() : this.pestanaProyecto()));
    this.cuerpo.scrollTop = scroll;
  }

  // ═════════════════════════ Pestaña Escena ═════════════════════════

  private pestanaEscena(): HTMLElement[] {
    const e = this.estado;
    const escenas = Object.keys(e.proyecto.escenas);
    const selector = h('div', { class: 'selector-escena' },
      h('select', { class: 'campo', title: 'Escena que estás editando', onchange: (ev: Event) => e.cambiarEscenaActual((ev.target as HTMLSelectElement).value) },
        escenas.map((n) => h('option', { value: n, selected: n === e.escenaActual }, n + (n === e.proyecto.escenaInicial ? '  ★' : ''))),
      ),
      botonIcono('mas', 'Nueva escena (por ejemplo, otro nivel o un menú)', () => this.nuevaEscena()),
    );

    const objetos = e.escena.objetos;
    const lista = h('ul', { class: 'arbol', role: 'tree', 'aria-label': 'Objetos de la escena' });
    objetos.forEach((def, i) => {
      const seleccionado = e.seleccion?.tipo === 'escena' && e.seleccion.indice === i;
      const conScript = def.script && def.script in e.proyecto.scripts;
      const fila = h('li', {
        class: `nodo ${seleccionado ? 'seleccionado' : ''}`,
        draggable: 'true',
        role: 'treeitem',
        tabindex: '0',
        title: 'Clic: seleccionar · Doble clic: renombrar · Arrastrar: cambiar el orden',
        onclick: () => e.seleccionarIndice(i),
        ondblclick: async () => {
          const n = await pedirTexto('Renombrar objeto', 'Nuevo nombre (sin espacios):', def.nombre);
          if (n) e.renombrar({ tipo: 'escena', escena: e.escenaActual, indice: i }, n);
        },
        onkeydown: (ev: KeyboardEvent) => {
          if (ev.key === 'Delete') e.borrarSeleccionado();
          else if (ev.key === 'ArrowDown' && i + 1 < objetos.length) e.seleccionarIndice(i + 1);
          else if (ev.key === 'ArrowUp' && i > 0) e.seleccionarIndice(i - 1);
          else return;
          ev.preventDefault();
          requestAnimationFrame(() => this.cuerpo.querySelector<HTMLElement>('.nodo.seleccionado')?.focus());
        },
        ondragstart: (ev: DragEvent) => ev.dataTransfer?.setData('chispa/indice', String(i)),
        ondragover: (ev: DragEvent) => {
          if (ev.dataTransfer?.types.includes('chispa/indice')) {
            ev.preventDefault();
            fila.classList.add('soltar-aqui');
          }
        },
        ondragleave: () => fila.classList.remove('soltar-aqui'),
        ondrop: (ev: DragEvent) => {
          ev.preventDefault();
          const desde = Number(ev.dataTransfer?.getData('chispa/indice'));
          if (Number.isInteger(desde)) e.moverEnLista(desde, i);
        },
      },
        icono(iconoDe(def), 15),
        h('span', { class: 'nombre' }, def.nombre ?? '(sin nombre)'),
        def.sprite?.fijo ? h('span', { class: 'etiqueta', title: 'Pegado a la pantalla (interfaz)' }, 'IU') : null,
      );
      lista.append(fila);
      if (conScript) {
        lista.append(h('li', {
          class: `nodo hijo script ${e.pestanaActiva === def.script ? 'abierto' : ''}`,
          title: 'Abrir el código',
          onclick: () => e.abrirScript(def.script!),
        }, icono('script', 14), h('span', { class: 'nombre' }, def.script!)));
      }
    });

    const anadir = h('div', { class: 'botones-anadir' },
      OBJETOS_NUEVOS.map((o) => botonIcono(o.icono, `Añadir: ${o.texto}. ${o.ayuda}`, () => this.vista.anadir(o.tipo))),
    );
    return [
      selector,
      h('div', { class: 'titulo-lista' }, h('span', {}, `Objetos (${objetos.length})`),
        e.portapapeles ? botonIcono('copiar', `Pegar "${e.portapapeles.nombre ?? 'objeto'}" en esta escena (Ctrl+V)`, () => e.pegar(), 'Pegar', 'pequeno') : null),
      objetos.length ? lista : h('p', { class: 'nota' }, 'La escena está vacía. Añade un objeto con los botones de abajo.'),
      h('div', { class: 'titulo-lista' }, h('span', {}, 'Añadir')),
      anadir,
    ];
  }

  // ═════════════════════════ Pestaña Proyecto ═════════════════════════

  private grupo(titulo: string, ic: string, acciones: HTMLElement[], contenido: HTMLElement | HTMLElement[], vacio: string): HTMLElement {
    const hijos = Array.isArray(contenido) ? contenido : [contenido];
    return h('details', { class: 'grupo-proyecto', open: true },
      h('summary', {}, icono(ic, 15), h('span', {}, titulo), h('span', { class: 'acciones' }, acciones)),
      hijos.length ? hijos : h('p', { class: 'nota' }, vacio),
    );
  }

  private fila(ic: string | HTMLElement, nombre: string, extra: (HTMLElement | null)[], props: Record<string, unknown> = {}): HTMLElement {
    return h('div', { class: 'fila-recurso', tabindex: '0', ...props }, typeof ic === 'string' ? icono(ic, 15) : ic, h('span', { class: 'nombre' }, nombre), h('span', { class: 'acciones' }, extra));
  }

  private pestanaProyecto(): HTMLElement[] {
    const e = this.estado;
    const p = e.proyecto;

    // Escenas
    const escenas = Object.keys(p.escenas).map((n) =>
      this.fila(n === p.escenaInicial ? 'estrella' : 'escena', n, [
        n === p.escenaInicial ? null : botonIcono('estrella', 'Empezar el juego en esta escena', () => e.ponerEscenaInicial(n), undefined, 'pequeno'),
        botonIcono('copiar', 'Duplicar la escena', () => e.duplicarEscena(n), undefined, 'pequeno'),
        botonIcono('basura', 'Borrar la escena', async () => {
          if (Object.keys(p.escenas).length <= 1) return notificar('Un juego necesita al menos una escena.', 'error');
          if (await confirmar('Borrar escena', `¿Borrar la escena "${n}" y todos sus objetos?`, 'Borrar', true)) e.borrarEscena(n);
        }, undefined, 'pequeno'),
      ], {
        class: `fila-recurso ${n === e.escenaActual ? 'seleccionado' : ''}`,
        title: 'Clic: editar esta escena · Doble clic: renombrar',
        onclick: () => e.cambiarEscenaActual(n),
        ondblclick: async () => {
          const nuevo = await pedirTexto('Renombrar escena', 'Nuevo nombre:', n);
          if (nuevo) e.renombrarEscena(n, nuevo);
        },
      }),
    );

    // Scripts
    const usos = (archivo: string) => e.todosLosObjetos().filter((o) => o.script === archivo).length;
    const scripts = Object.keys(p.scripts).map((archivo) =>
      this.fila('script', archivo, [
        h('span', { class: 'etiqueta', title: 'Objetos que usan este script' }, String(usos(archivo))),
        botonIcono('basura', 'Borrar el script', async () => {
          if (await confirmar('Borrar script', `¿Borrar "${archivo}"? Se perderá su código.`, 'Borrar', true)) e.borrarScript(archivo);
        }, undefined, 'pequeno'),
      ], {
        class: `fila-recurso ${e.pestanaActiva === archivo ? 'seleccionado' : ''}`,
        title: 'Clic: abrir · Doble clic: renombrar',
        onclick: () => e.abrirScript(archivo),
        ondblclick: async () => {
          const n = await pedirTexto('Renombrar script', 'Nuevo nombre:', archivo);
          if (n) e.renombrarScript(archivo, n);
        },
      }),
    );

    // Plantillas
    const plantillas = Object.keys(p.plantillas).map((n) =>
      this.fila('plantilla', n, [
        botonIcono('basura', 'Borrar la plantilla', async () => {
          e.seleccionar({ tipo: 'plantilla', nombre: n });
          if (await confirmar('Borrar plantilla', `¿Borrar la plantilla "${n}"?`, 'Borrar', true)) e.borrarSeleccionado();
        }, undefined, 'pequeno'),
      ], {
        class: `fila-recurso ${e.seleccion?.tipo === 'plantilla' && e.seleccion.nombre === n ? 'seleccionado' : ''}`,
        draggable: 'true',
        title: 'Clic: ver sus propiedades · Arrástrala a la escena para poner una copia · En el código: crear("' + n + '")',
        onclick: () => e.seleccionar({ tipo: 'plantilla', nombre: n }),
        ondragstart: (ev: DragEvent) => ev.dataTransfer?.setData('chispa/plantilla', n),
      }),
    );

    // Imágenes
    const imagenes = h('div', { class: 'rejilla-imagenes' },
      Object.entries(p.imagenes).map(([n, url]) =>
        h('div', { class: 'imagen-recurso', draggable: 'true', title: `${n}\nArrástrala a la escena · En el código: yo.imagen = "${n}"`, ondragstart: (ev: DragEvent) => ev.dataTransfer?.setData('chispa/imagen', n) },
          h('img', { src: url, alt: n, draggable: 'false' }),
          h('span', {}, n),
          botonIcono('cerrar', `Borrar la imagen "${n}"`, async () => {
            if (await confirmar('Borrar imagen', `¿Borrar la imagen "${n}"? Los objetos que la usan se quedarán sin imagen.`, 'Borrar', true)) e.borrarImagen(n);
          }, undefined, 'borrar-imagen'),
        ),
      ),
    );

    // Sonidos
    const sonidos = Object.entries(p.sonidos).map(([n, url]) =>
      this.fila('sonido', n, [
        botonIcono('reproducir', 'Escuchar', () => this.escuchar(url), undefined, 'pequeno'),
        botonIcono('basura', 'Borrar el sonido', async () => {
          if (await confirmar('Borrar sonido', `¿Borrar el sonido "${n}"?`, 'Borrar', true)) e.borrarSonido(n);
        }, undefined, 'pequeno'),
      ], { title: `En el código: sonido.reproducir("${n}")` }),
    );

    // Animaciones
    const animaciones = Object.entries(p.animaciones).map(([n, a]) =>
      this.fila('animacion', n, [
        h('span', { class: 'etiqueta' }, `${a.fotogramas.length}`),
        botonIcono('basura', 'Borrar la animación', async () => {
          if (await confirmar('Borrar animación', `¿Borrar la animación "${n}"?`, 'Borrar', true)) e.borrarAnimacion(n);
        }, undefined, 'pequeno'),
      ], { title: `Clic: editar · En el código: yo.animar("${n}")`, onclick: () => this.editarAnimacion(n) }),
    );

    return [
      this.grupo('Escenas', 'escena', [botonIcono('mas', 'Nueva escena', () => this.nuevaEscena(), undefined, 'pequeno')], escenas, ''),
      this.grupo('Scripts', 'script', [botonIcono('mas', 'Nuevo script (sin objeto)', async () => {
        const n = await pedirTexto('Nuevo script', 'Nombre del archivo:', 'script');
        if (n) e.crearScriptSuelto(n);
      }, undefined, 'pequeno')], scripts, 'Sin scripts. Selecciona un objeto y pulsa «Crear script».'),
      this.grupo('Plantillas', 'plantilla', [botonIcono('mas', 'Nueva plantilla', async () => {
        const n = await pedirTexto('Nueva plantilla', 'Nombre (lo usarás en crear("…")):', 'Bala');
        if (n) e.crearPlantillaVacia(n.replace(/\s+/g, ''));
      }, undefined, 'pequeno')], plantillas, 'Objetos para crear desde el código con crear("…"). Selecciona un objeto y pulsa «Plantilla».'),
      this.grupo('Imágenes', 'imagen', [botonIcono('abrir', 'Importar imágenes (.png, .jpg, .svg, .gif)', () => this.importar('image/*', (n, d) => e.agregarImagen(n, d)), undefined, 'pequeno')],
        Object.keys(p.imagenes).length ? imagenes : [], 'Importa imágenes o arrástralas desde tu ordenador a la escena.'),
      this.grupo('Sonidos', 'sonido', [botonIcono('abrir', 'Importar sonidos (.mp3, .ogg, .wav)', () => this.importar('audio/*', (n, d) => e.agregarSonido(n, d)), undefined, 'pequeno')],
        sonidos, 'Sin sonidos. También puedes usar sonido.tono(440, 0.2) sin importar nada.'),
      this.grupo('Animaciones', 'animacion', [botonIcono('mas', 'Nueva animación (con imágenes del proyecto)', async () => {
        if (!Object.keys(p.imagenes).length) return notificar('Primero importa las imágenes de los fotogramas.', 'error');
        const n = await pedirTexto('Nueva animación', 'Nombre (por ejemplo: andar, saltar):', 'andar');
        if (n) this.editarAnimacion(e.crearAnimacion(n));
      }, undefined, 'pequeno')], animaciones, 'Una animación es una lista de imágenes que se van cambiando.'),
    ];
  }

  private async nuevaEscena(): Promise<void> {
    const n = await pedirTexto('Nueva escena', 'Nombre de la escena (por ejemplo: Menu, Nivel2, Fin). En el código: escena.cambiar("Nivel2")', 'Nivel2');
    if (n) this.estado.crearEscena(n);
  }

  private escuchar(url: string): void {
    this.sonando?.pause();
    this.sonando = new Audio(url);
    this.sonando.play().catch(() => notificar('No he podido reproducir este sonido.', 'error'));
  }

  /** Abre el selector de archivos y añade cada archivo elegido. */
  private importar(tipos: string, agregar: (nombre: string, datos: string) => string): void {
    const entrada = h('input', { type: 'file', accept: tipos, multiple: true });
    entrada.addEventListener('change', async () => {
      const nombres: string[] = [];
      for (const archivo of entrada.files ?? []) {
        if (archivo.size > 15 * 1024 * 1024) {
          notificar(`"${archivo.name}" es demasiado grande (más de 15 MB).`, 'error');
          continue;
        }
        nombres.push(agregar(archivo.name, await leerComoDataURL(archivo)));
      }
      if (nombres.length) notificar(`Importado: ${nombres.join(', ')}`, 'ok');
    });
    entrada.click();
  }

  /** Diálogo para elegir los fotogramas, la velocidad y si se repite. */
  editarAnimacion(nombre: string): void {
    const e = this.estado;
    const anim = e.proyecto.animaciones[nombre];
    if (!anim) return;
    const fotogramas = [...anim.fotogramas];
    const tira = h('div', { class: 'tira-fotogramas' });
    const pintarTira = () =>
      rellenar(tira, fotogramas.length
        ? fotogramas.map((f, i) => h('button', { class: 'fotograma', title: 'Clic para quitarlo', onclick: () => {
            fotogramas.splice(i, 1);
            pintarTira();
          } }, h('img', { src: e.proyecto.imagenes[f] ?? '', alt: f }), h('span', {}, String(i + 1))))
        : h('p', { class: 'nota' }, 'Haz clic en las imágenes de abajo, en orden, para añadir fotogramas.'));
    pintarTira();
    const disponibles = h('div', { class: 'rejilla-imagenes pequena' },
      Object.entries(e.proyecto.imagenes).map(([n, url]) => h('button', { class: 'imagen-recurso', title: `Añadir "${n}"`, onclick: () => {
        fotogramas.push(n);
        pintarTira();
      } }, h('img', { src: url, alt: n }), h('span', {}, n))),
    );
    const velocidad = h('input', { type: 'number', class: 'campo', min: '1', max: '60', value: String(anim.velocidad) });
    const repetir = h('input', { type: 'checkbox', checked: anim.repetir });
    const contenido = h('div', { class: 'editor-animacion' },
      h('h3', {}, 'Fotogramas'), tira,
      h('h3', {}, 'Imágenes del proyecto'), disponibles,
      h('div', { class: 'dos-columnas' },
        h('label', { class: 'campo-fila' }, h('span', { class: 'campo-etiqueta' }, 'fotogramas por segundo'), velocidad),
        h('label', { class: 'campo-fila casilla' }, h('span', { class: 'campo-etiqueta' }, 'repetir'), repetir),
      ),
      h('p', { class: 'nota' }, 'En el código: ', h('code', {}, `yo.animar("${nombre}")`), '. Si no se repite, al acabar avisa con "cuando termina la animacion".'),
    );
    abrirDialogo(`Animación: ${nombre}`, contenido, [
      { texto: 'Cancelar' },
      { texto: 'Guardar', clase: 'principal', alPulsar: () => e.cambiarAnimacion(nombre, { fotogramas, velocidad: Math.max(1, Number(velocidad.value) || 8), repetir: repetir.checked }) },
    ], 'dialogo-ancho');
  }
}
