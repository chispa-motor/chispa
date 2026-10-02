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
import { CATEGORIAS_BIBLIOTECA, buscarEnBiblioteca, type CategoriaBiblioteca } from '../biblioteca/biblioteca';
import { miniatura } from '../interfaz/iconosFormas';
import { abrirEditorParticulas } from '../recursos/EditorParticulas';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';
import { confirmar, notificar, pedirTexto } from '../interfaz/dialogos';
import { abrirEditorSonidos } from '../recursos/EditorSonidos';
import { abrirPantallasListas } from '../pantallas/dialogoPantallas';
import { abrirRecursosListos } from '../recursos/RecursosListos';
import { abrirEditorMusica } from '../recursos/EditorMusica';
import { callar, tocar } from '../recursos/audioEditor';
import { FRECUENCIA_MUESTREO, generarSonido } from '../../sonido/generador';
import { FRECUENCIA_MUSICA, renderizarCancion } from '../../sonido/musica';
import { tiene } from '../../utilidades/seguro';

type Pestana = 'escena' | 'proyecto' | 'biblioteca';

function iconoDe(def: DefObjeto): string {
  if (def.mapa) return 'mapa';
  if (!def.sprite) return 'vacio';
  if (def.sprite.imagen) return 'imagen';
  if (def.sprite.forma === 'texto') return 'texto';
  if (def.control || (def.sprite.fijo && def.sprite.texto)) return 'boton';
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
    if (this.pestana === 'biblioteca') return JSON.stringify([this.pestana]);
    if (this.pestana === 'escena') {
      return JSON.stringify([comun, Object.keys(p.escenas), p.escenaInicial, e.escena.objetos.map((o) => [o.nombre, o.script, o.script && o.script in p.scripts, iconoDe(o), o.sprite?.fijo, o.plantilla])]);
    }
    return JSON.stringify([comun, Object.keys(p.efectos ?? {}), Object.keys(p.escenas), p.escenaInicial, Object.keys(p.scripts), Object.keys(p.plantillas), Object.keys(p.imagenes), Object.keys(p.sonidos), Object.keys(p.sonidosHechos ?? {}), Object.entries(p.canciones ?? {}).map(([n, c]) => [n, c.pistas.length]), Object.keys(p.letras ?? {}), Object.entries(p.animaciones).map(([n, a]) => [n, a.fotogramas.length]), e.todosLosObjetos().map((o) => o.script)]);
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
      } }, icono(ic, 15), h('span', { class: 'texto-pestana' }, texto));
    rellenar(this.cabecera, pestana('escena', 'Escena', 'escena'), pestana('proyecto', 'Proyecto', 'carpeta'), pestana('biblioteca', 'Biblioteca', 'libro'));
    rellenar(this.cuerpo, ...(this.pestana === 'escena' ? this.pestanaEscena() : this.pestana === 'proyecto' ? this.pestanaProyecto() : this.pestanaBiblioteca()));
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
      botonIcono('boton', 'Pantallas listas: menú, opciones, créditos, puntuaciones, fin del juego y pausa', () => abrirPantallasListas(this.estado)),
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

  // ═════════════════════════ Pestaña Biblioteca ═════════════════════════

  private busqueda = '';
  private categoria: CategoriaBiblioteca | null = null;

  /** Objetos listos: se arrastran a la escena (o se pulsan para ponerlos en el centro). */
  private pestanaBiblioteca(): HTMLElement[] {
    const lista = h('div', { class: 'lista-biblioteca' });
    const pintarLista = () => {
      const encontrados = buscarEnBiblioteca(this.busqueda, this.categoria);
      rellenar(lista, ...(encontrados.length
        ? encontrados.map((el) =>
            h('button', {
              class: 'ficha-biblioteca',
              draggable: 'true',
              'data-biblioteca': el.id,
              title: `${el.descripcion}\nArrástralo a la escena (o haz clic para ponerlo en el centro).`,
              ondragstart: (ev: DragEvent) => ev.dataTransfer?.setData('chispa/biblioteca', el.id),
              onclick: () => this.vista.anadirDeBiblioteca(el.id),
            },
            miniatura(el.objetos[0]?.sprite ?? el.plantillas?.[Object.keys(el.plantillas)[0]]?.sprite),
            h('span', { class: 'texto-ficha' }, h('strong', {}, el.nombre), h('span', {}, el.descripcion)),
            ))
        : [h('p', { class: 'nota' }, `No hay nada con «${this.busqueda}». Prueba con otra palabra: jugador, enemigo, moneda...`)]));
    };
    const buscador = h('input', { type: 'search', class: 'campo buscador-biblioteca', placeholder: 'Buscar: moneda, enemigo, saltar…', value: this.busqueda, 'aria-label': 'Buscar en la biblioteca', oninput: () => {
      this.busqueda = buscador.value;
      pintarLista();
    } });
    const chip = (c: CategoriaBiblioteca | null, texto: string) =>
      h('button', { class: `chip ${this.categoria === c ? 'activo' : ''}`, onclick: () => {
        this.categoria = c;
        this.dibujar();
      } }, texto);
    pintarLista();
    return [
      buscador,
      h('div', { class: 'chips-biblioteca' }, chip(null, 'Todo'), CATEGORIAS_BIBLIOTECA.map((c) => chip(c, c))),
      lista,
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

    // Sonidos hechos con el generador de efectos, y canciones del editor de música
    const hechos = Object.entries(p.sonidosHechos ?? {}).map(([n, datos]) =>
      this.fila('sonido', n, [
        botonIcono('reproducir', 'Escuchar', () => void tocar(generarSonido(datos), FRECUENCIA_MUESTREO), undefined, 'pequeno'),
        botonIcono('pincel', 'Cambiar el sonido', () => abrirEditorSonidos(e, n), undefined, 'pequeno'),
        botonIcono('basura', 'Borrar el sonido', async () => {
          if (await confirmar('Borrar sonido', `¿Borrar el sonido «${n}»? El código que lo usa dará un error.`, 'Borrar', true)) e.borrarSonidoHecho(n);
        }, undefined, 'pequeno peligro'),
      ], { title: `Hecho con el generador · Clic en el pincel: cambiarlo · En el código: sonido.reproducir("${n}")` }),
    );
    const canciones = Object.entries(p.canciones ?? {}).map(([n, c]) =>
      this.fila('nota', n, [
        h('span', { class: 'etiqueta', title: 'Pistas (capas)' }, `${c.pistas.length}`),
        botonIcono('reproducir', 'Escuchar (otra vez: parar)', () => {
          if (this.cancionSonando === n) {
            this.cancionSonando = null;
            callar();
          } else {
            this.cancionSonando = n;
            tocar(renderizarCancion(c), FRECUENCIA_MUSICA, { alAcabar: () => this.cancionSonando === n && (this.cancionSonando = null) });
          }
        }, undefined, 'pequeno'),
        botonIcono('basura', 'Borrar la canción', async () => {
          if (await confirmar('Borrar canción', `¿Borrar la canción «${n}»? El código que la usa dará un error.`, 'Borrar', true)) e.borrarCancion(n);
        }, undefined, 'pequeno peligro'),
      ], { title: `Clic: abrirla en el editor de música · En el código: musica.reproducir("${n}")`, onclick: (ev: MouseEvent) => !(ev.target as HTMLElement).closest('button') && abrirEditorMusica(e, n) }),
    );

    // Animaciones
    const animaciones = Object.entries(p.animaciones).map(([n, a]) =>
      this.fila('animacion', n, [
        h('span', { class: 'etiqueta' }, `${a.fotogramas.length}`),
        botonIcono('basura', 'Borrar la animación', () => this.borrarRecurso('animacion', n), undefined, 'pequeno'),
      ], { title: `Clic: editar · Doble clic: cambiar el nombre · En el código: yo.animar("${n}")`, onclick: () => abrirEditorAnimacion(e, n), ondblclick: () => this.renombrarRecurso('animacion', n) }),
    );

    return [
      this.grupo('Escenas', 'escena', [
        botonIcono('boton', 'Pantallas listas: menú, opciones, créditos, puntuaciones, fin del juego y pausa', () => abrirPantallasListas(e), undefined, 'pequeno'),
        botonIcono('mas', 'Nueva escena', () => this.nuevaEscena(), undefined, 'pequeno'),
      ], escenas, ''),
      this.grupo('Scripts', 'script', [botonIcono('mas', 'Nuevo script (sin objeto)', async () => {
        const n = await pedirTexto('Nuevo script', 'Nombre del archivo:', 'script');
        if (n) e.crearScriptSuelto(n);
      }, undefined, 'pequeno')], scripts, 'Sin scripts. Selecciona un objeto y pulsa «Crear script».'),
      this.grupo('Plantillas', 'plantilla', [botonIcono('mas', 'Nueva plantilla', async () => {
        const n = await pedirTexto('Nueva plantilla', 'Nombre (lo usarás en crear("…")):', 'Bala');
        if (n) e.crearPlantillaVacia(n.replace(/\s+/g, ''));
      }, undefined, 'pequeno')], plantillas, 'Objetos para crear desde el código con crear("…"). Selecciona un objeto y pulsa «Plantilla».'),
      this.grupo('Imágenes', 'imagen', [
        botonIcono('libro', 'Dibujos listos: personajes, enemigos, objetos y casillas', () => abrirRecursosListos(e, 'dibujos'), undefined, 'pequeno'),
        botonIcono('pincel', 'Dibujar un sprite nuevo, píxel a píxel', () => void abrirEditorPixelArt(e), undefined, 'pequeno'),
        botonIcono('abrir', 'Importar imágenes (.png, .jpg, .svg, .gif)', () => this.importar('image/*'), undefined, 'pequeno'),
      ], Object.keys(p.imagenes).length ? imagenes : [], 'Dibuja una con el pincel, impórtala, o arrastra imágenes desde tu ordenador hasta el editor.'),
      this.grupo('Sonidos', 'sonido', [
        botonIcono('libro', 'Sonidos listos: salto, moneda, explosión, disparo...', () => abrirRecursosListos(e, 'sonidos'), undefined, 'pequeno'),
        botonIcono('mas', 'Hacer un efecto de sonido (salto, moneda, explosión...) sin archivos', () => abrirEditorSonidos(e), undefined, 'pequeno'),
        botonIcono('abrir', 'Importar sonidos (.mp3, .ogg, .wav)', () => this.importar('audio/*'), undefined, 'pequeno'),
      ], [...hechos, ...sonidos], 'Sin sonidos. Pulsa + para HACER uno (salto, moneda, explosión...) o arrastra archivos de sonido hasta el editor.'),
      this.grupo('Música', 'nota', [
        botonIcono('libro', 'Música lista: aventura, misterio y acción', () => abrirRecursosListos(e, 'musica'), undefined, 'pequeno'),
        botonIcono('mas', 'Nueva canción (editor de música)', () => abrirEditorMusica(e), undefined, 'pequeno'),
      ],
        canciones, 'Haz tu propia música en una rejilla de notas: pulsa +. También vale un archivo de sonido importado: musica.reproducir("nombre").'),
      this.grupo('Letras', 'texto', [botonIcono('abrir', 'Importar tipos de letra (.ttf, .otf, .woff, .woff2)', () => this.importar('.ttf,.otf,.woff,.woff2,font/*'), undefined, 'pequeno')],
        Object.keys(p.letras ?? {}).map((n) =>
          this.fila('texto', n, [
            botonIcono('basura', 'Borrar el tipo de letra', async () => {
              if (await confirmar('Borrar letra', `¿Borrar el tipo de letra «${n}»? Los textos que lo usan volverán a la letra normal.`, 'Borrar', true)) e.borrarLetra(n);
            }, undefined, 'pequeno peligro'),
          ], { title: `Elígela en el inspector de un texto · En el código: yo.letra = "${n}"` }),
        ),
        'Tipos de letra tuyos (.ttf, .otf, .woff). Sin importar nada ya hay 7 listas: normal, redonda, clasica, maquina, manuscrita, titulo y pixel.'),
      this.grupo('Animaciones', 'animacion', [botonIcono('mas', 'Nueva animación (con imágenes del proyecto)', async () => {
        const n = await pedirTexto('Nueva animación', 'Nombre (por ejemplo: andar, saltar):', 'andar');
        if (n) abrirEditorAnimacion(e, e.crearAnimacion(n));
      }, undefined, 'pequeno')], animaciones, 'Una animación es una lista de imágenes que se van cambiando. También se pueden dibujar con varios fotogramas en el editor de píxeles.'),
      this.grupo('Efectos', 'estrella', [botonIcono('mas', 'Nuevo efecto de partículas (fuego, magia, polvo de estrellas...)', () => abrirEditorParticulas(e), undefined, 'pequeno')],
        Object.keys(p.efectos ?? {}).map((n) =>
          this.fila('estrella', n, [
            botonIcono('pincel', 'Cambiar el efecto', () => abrirEditorParticulas(e, n), undefined, 'pequeno'),
            botonIcono('basura', 'Borrar el efecto', async () => {
              if (await confirmar('Borrar efecto', `¿Borrar el efecto «${n}»? Los objetos que lo llevan se quedan sin él.`, 'Borrar', true)) e.borrarEfecto(n);
            }, undefined, 'pequeno peligro'),
          ], { title: `En el código: efecto.usar("${n}", yo)` }),
        ),
        'Tus efectos de partículas: hazlos moviendo deslizadores y úsalos con efecto.usar("nombre", yo).'),
    ];
  }

  private async nuevaEscena(): Promise<void> {
    const n = await pedirTexto('Nueva escena', 'Nombre de la escena (por ejemplo: Menu, Nivel2, Fin). En el código: escena.cambiar("Nivel2")', 'Nivel2');
    if (n) this.estado.crearEscena(n);
  }

  /** La canción que se está escuchando desde el panel (para pararla con el mismo botón). */
  private cancionSonando: string | null = null;

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
