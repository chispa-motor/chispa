/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PANEL IZQUIERDO, con dos pestañas:
 *
 *   - ESCENA: los objetos de la escena actual (como la "Hierarchy" de Unity o
 *     el "Explorer" de Roblox), cada uno con su script .chs debajo.
 *   - PROYECTO: todo lo demás: escenas, scripts, plantillas, imágenes,
 *     sonidos y animaciones.
 */
import type { EstadoEditor, TipoRecurso } from '../estado/EstadoEditor';
import { abrirEditorPixelArt } from '../recursos/EditorPixelArt';
import { abrirEditorAnimacion } from '../recursos/EditorAnimaciones';
import { importarArchivos, resumenImportar } from '../recursos/importar';
import type { DefObjeto } from '../../proyecto/formato';
import { OBJETOS_NUEVOS, type VistaEscena } from '../escena/VistaEscena';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';
import { confirmar, notificar, pedirTexto } from '../interfaz/dialogos';
import { tiene } from '../../utilidades/seguro';

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
    const comun = [this.pestana, e.escenaActual, JSON.stringify(e.seleccion), e.seleccionados.join(), e.pestanaActiva, textoPortapapeles(e.portapapeles)];
    if (this.pestana === 'escena') {
      return JSON.stringify([comun, Object.keys(p.escenas), p.escenaInicial, e.escena.objetos.map((o) => [o.nombre, o.script, o.script && o.script in p.scripts, iconoDe(o), o.sprite?.fijo, o.plantilla])]);
    }
    return JSON.stringify([comun, Object.keys(p.escenas), p.escenaInicial, Object.keys(p.scripts), Object.keys(p.plantillas), Object.keys(p.imagenes), Object.keys(p.sonidos), Object.entries(p.animaciones).map(([n, a]) => [n, a.fotogramas.length]), e.todosLosObjetos().map((o) => o.script)]);
  }

  /** Enseña la pestaña Proyecto (por ejemplo, después de importar algo, para verlo). */
  mostrarProyecto(): void {
    this.pestana = 'proyecto';
    this.dibujar();
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
      const seleccionado = e.estaSeleccionado(i);
      const conScript = def.script && tiene(e.proyecto.scripts, def.script);
      const fila = h('li', {
        class: `nodo ${seleccionado ? 'seleccionado' : ''}`,
        draggable: 'true',
        role: 'treeitem',
        tabindex: '0',
        title: 'Clic: seleccionar · Ctrl+clic: seleccionar varios · Doble clic: renombrar · Arrastrar: cambiar el orden',
        onclick: (ev: MouseEvent) => (ev.ctrlKey || ev.metaKey ? e.alternarSeleccion(i) : e.seleccionarIndice(i)),
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
        def.plantilla && e.proyecto.plantillas[def.plantilla] ? h('span', { class: 'etiqueta enlazada', title: `Copia de la plantilla "${def.plantilla}": al cambiarla, cambian todas` }, icono('plantilla', 11)) : null,
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
        e.portapapeles ? botonIcono('copiar', `Pegar ${textoPortapapeles(e.portapapeles)} en esta escena (Ctrl+V)`, () => e.pegar(), 'Pegar', 'pequeno') : null),
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
          const copias = e.copiasDe(n).length;
          const aviso = copias ? ` Sus ${copias} copias en las escenas se quedan, pero ya no estarán enlazadas.` : '';
          if (await confirmar('Borrar plantilla', `¿Borrar la plantilla "${n}"?${aviso}`, 'Borrar', true)) e.borrarSeleccionado();
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
        h('div', { class: 'imagen-recurso', draggable: 'true', title: `${n}\nArrástrala a la escena · Doble clic: cambiar el nombre · En el código: yo.imagen = "${n}"`, ondragstart: (ev: DragEvent) => ev.dataTransfer?.setData('chispa/imagen', n), ondblclick: () => this.renombrarRecurso('imagen', n) },
          h('img', { src: url, alt: n, draggable: 'false', onload: marcarPixelado }),
          h('span', {}, n),
          h('div', { class: 'acciones-imagen' },
            botonIcono('pincel', `Editar "${n}" en el editor de píxeles`, () => void abrirEditorPixelArt(e, { imagen: n }), undefined, 'pequeno'),
            botonIcono('cerrar', `Borrar la imagen "${n}"`, () => this.borrarRecurso('imagen', n), undefined, 'pequeno'),
          ),
        ),
      ),
    );

    // Sonidos
    const sonidos = Object.entries(p.sonidos).map(([n, url]) =>
      this.fila('sonido', n, [
        botonIcono('reproducir', 'Escuchar', () => this.escuchar(url), undefined, 'pequeno'),
        botonIcono('basura', 'Borrar el sonido', () => this.borrarRecurso('sonido', n), undefined, 'pequeno'),
      ], { title: `Doble clic: cambiar el nombre · En el código: sonido.reproducir("${n}")`, ondblclick: () => this.renombrarRecurso('sonido', n) }),
    );

    // Animaciones
    const animaciones = Object.entries(p.animaciones).map(([n, a]) =>
      this.fila('animacion', n, [
        h('span', { class: 'etiqueta' }, `${a.fotogramas.length}`),
        botonIcono('basura', 'Borrar la animación', () => this.borrarRecurso('animacion', n), undefined, 'pequeno'),
      ], { title: `Clic: editar · Doble clic: cambiar el nombre · En el código: yo.animar("${n}")`, onclick: () => abrirEditorAnimacion(e, n), ondblclick: () => this.renombrarRecurso('animacion', n) }),
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
      this.grupo('Imágenes', 'imagen', [
        botonIcono('pincel', 'Dibujar un sprite nuevo, píxel a píxel', () => void abrirEditorPixelArt(e), undefined, 'pequeno'),
        botonIcono('abrir', 'Importar imágenes (.png, .jpg, .svg, .gif)', () => this.importar('image/*'), undefined, 'pequeno'),
      ], Object.keys(p.imagenes).length ? imagenes : [], 'Dibuja una con el pincel, impórtala, o arrastra imágenes desde tu ordenador hasta el editor.'),
      this.grupo('Sonidos', 'sonido', [botonIcono('abrir', 'Importar sonidos (.mp3, .ogg, .wav)', () => this.importar('audio/*'), undefined, 'pequeno')],
        sonidos, 'Sin sonidos. Arrastra archivos de sonido hasta el editor para importarlos. También puedes usar sonido.tono(440, 0.2) sin importar nada.'),
      this.grupo('Animaciones', 'animacion', [botonIcono('mas', 'Nueva animación (con imágenes del proyecto)', async () => {
        const n = await pedirTexto('Nueva animación', 'Nombre (por ejemplo: andar, saltar):', 'andar');
        if (n) abrirEditorAnimacion(e, e.crearAnimacion(n));
      }, undefined, 'pequeno')], animaciones, 'Una animación es una lista de imágenes que se van cambiando. También se pueden dibujar con varios fotogramas en el editor de píxeles.'),
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

  /** Abre el selector de archivos e importa los elegidos. */
  private importar(tipos: string): void {
    const entrada = h('input', { type: 'file', accept: tipos, multiple: true });
    entrada.addEventListener('change', async () => {
      const m = resumenImportar(await importarArchivos(this.estado, entrada.files ?? []));
      if (m) notificar(m.texto, m.tipo);
    });
    entrada.click();
  }

  /** Cambia el nombre de un recurso (y en todos los sitios donde se usa, también en el código). */
  private async renombrarRecurso(tipo: TipoRecurso, n: string): Promise<void> {
    const que = { imagen: 'la imagen', sonido: 'el sonido', animacion: 'la animación' }[tipo];
    const nuevo = await pedirTexto('Cambiar el nombre', `Nombre nuevo para ${que} "${n}". Se cambiará también donde se use, incluido el código.`, n);
    if (!nuevo) return;
    const final = this.estado.renombrarRecurso(tipo, n, nuevo);
    if (final !== n) notificar(`Ahora se llama "${final}".`, 'ok');
  }

  /** Borra un recurso, avisando antes de dónde se usa. */
  private async borrarRecurso(tipo: TipoRecurso, n: string): Promise<void> {
    const e = this.estado;
    const que = { imagen: 'la imagen', sonido: 'el sonido', animacion: 'la animación' }[tipo];
    const usos = e.usosDe(tipo, n);
    const aviso = usos.length
      ? `Se usa en: ${usos.slice(0, 6).join('; ')}${usos.length > 6 ? ` y ${usos.length - 6} sitios más` : ''}. ${tipo === 'sonido' ? 'El código que lo usa dará un error.' : 'Esos sitios se quedarán sin ella (y el código que la nombra dará un error).'}`
      : 'No se usa en ningún sitio.';
    if (!(await confirmar(`Borrar ${que}`, `¿Borrar ${que} "${n}"? ${aviso}`, 'Borrar', true))) return;
    if (tipo === 'imagen') e.borrarImagen(n);
    else if (tipo === 'sonido') e.borrarSonido(n);
    else e.borrarAnimacion(n);
  }
}

/** "Moneda" o "3 objetos": lo que hay copiado, para el botón Pegar. */
function textoPortapapeles(lista: DefObjeto[] | null): string {
  if (!lista?.length) return '';
  return lista.length === 1 ? `"${lista[0].nombre ?? 'objeto'}"` : `${lista.length} objetos`;
}

/** Las imágenes pequeñas (pixel art) se enseñan con sus píxeles cuadrados, sin emborronar. */
function marcarPixelado(ev: Event): void {
  const img = ev.target as HTMLImageElement;
  if (img.naturalWidth <= 64 && img.naturalHeight <= 64) img.classList.add('pixelado');
}
