/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PANEL DE PROPIEDADES (el "Inspector" de Unity): enseña y cambia todo lo del
 * objeto seleccionado. Si no hay nada seleccionado, enseña los ajustes de la
 * escena y del proyecto.
 *
 * Cada parte del objeto (dibujo, colisión, física, mapa...) es una sección
 * que se puede plegar, y las opcionales tienen un interruptor para ponerlas
 * o quitarlas (como los componentes de Unity).
 */
import { NOMBRES_COLORES } from '../../motor/Color';
import { DISTANCIA_POR_DEFECTO } from '../../objetos/componentes/Comportamiento';
import { leerDatoInicial, tipoPorNombre, type DatoInicial, type DefControl, type DefEscena, type DefObjeto, type DefSprite } from '../../proyecto/formato';
import { NOMBRES_CONTROLES } from '../../objetos/componentes/Control';
import { CONTROLES_NUEVOS } from '../interfaz/controlesNuevos';
import { FORMAS_DIBUJO, MAX_LADOS, POR_DEFECTO } from '../../objetos/formas/figuras';
import { ESTILO_POR_DEFECTO, NOMBRES_MEZCLAS, PATRONES } from '../../motor/Estilo';
import { misColores } from '../interfaz/SelectorColor';
import { abrirEditorPluma } from '../recursos/EditorPluma';
import { esFormaCombinable, formaAPNG } from '../recursos/operacionesFormas';
import { tieneHuecos } from '../../proyecto/TextosConHuecos';
import { datosParaTextos, insertarDato } from '../estado/datosTextos';
import type { EstadoEditor, RefObjeto } from '../estado/EstadoEditor';
import type { VistaEscena } from '../escena/VistaEscena';
import { botonIcono, fondoDeColor, h, icono, rellenar } from '../interfaz/dom';
import { confirmar, notificar, pedirTexto } from '../interfaz/dialogos';
import { campoCasilla, campoColor, campoLista, campoNumero, campoTexto, seccion } from './campos';
import { LETRAS } from '../../motor/Letras';

/** Cómo se llaman las letras listas en el inspector. */
const NOMBRES_LETRAS: Record<string, string> = { normal: 'Normal', redonda: 'Redonda', clasica: 'Clásica', maquina: 'Máquina de escribir', manuscrita: 'Manuscrita', titulo: 'Título (gruesa)', pixel: 'Píxel' };
import { tiene } from '../../utilidades/seguro';

export class Inspector {
  readonly elemento = h('div', { class: 'inspector' });
  /** Secciones que el usuario ha plegado (se recuerdan al redibujar). */
  private plegadas = new Set<string>();

  constructor(
    private estado: EstadoEditor,
    private vista: VistaEscena,
  ) {
    estado.alCambiar((c) => {
      if (c !== 'codigo' && c !== 'historial') this.dibujar();
    });
    vista.alCambiarHerramienta = () => this.dibujar();
    // «Mis colores» del selector de color se guardan en el proyecto
    misColores.leer = () => estado.proyecto.colores ?? [];
    misColores.guardar = (colores) => estado.ponerMisColores(colores);
    this.dibujar();
  }

  dibujar(): void {
    // Recordamos dónde estaba el cursor para devolverlo al mismo campo
    const enfocado = (document.activeElement as HTMLElement | null)?.dataset?.ruta;
    const scroll = this.elemento.scrollTop;
    const ref = this.estado.seleccion;
    const def = this.estado.seleccionado;
    if (this.estado.variosSeleccionados) rellenar(this.elemento, ...this.varios());
    else if (ref && def) rellenar(this.elemento, ...this.objeto(ref, def));
    else rellenar(this.elemento, ...this.ajustesEscena());
    for (const d of this.elemento.querySelectorAll('details')) {
      const titulo = d.querySelector('.seccion-titulo')?.textContent ?? '';
      if (this.plegadas.has(titulo)) d.open = false;
      d.addEventListener('toggle', () => (d.open ? this.plegadas.delete(titulo) : this.plegadas.add(titulo)));
    }
    this.elemento.scrollTop = scroll;
    if (enfocado) this.elemento.querySelector<HTMLElement>(`[data-ruta="${CSS.escape(enfocado)}"]`)?.focus();
  }

  /** Relleno (degradado, patrón, imagen), borde, sombra, resplandor y mezcla. */
  private seccionEstilo(s: DefSprite, cambiar: (ruta: string) => (v: unknown) => void, largo: { empezar: () => void; terminar: () => void }): HTMLElement {
    const e = this.estado;
    const relleno = s.relleno ?? 'color';
    const esTexto = s.forma === 'texto' && !s.imagen;
    const quitarSi = <T,>(porDefecto: T) => (v: T | undefined) => (v === undefined || v === porDefecto ? undefined : v);
    const d = ESTILO_POR_DEFECTO;
    const imagenes = Object.keys(e.proyecto.imagenes);
    const conEstilo = !!(s.relleno || s.borde || s.sombra || s.resplandor || s.mezcla || s.contorno || s.brillo !== undefined || s.grises || s.desenfoque);
    return seccion('Estilo', [
      esTexto || s.imagen ? null : campoLista('relleno', 'sprite.relleno', relleno, [['color', 'Un color'], ['degradado', 'Degradado'], ['radial', 'Degradado redondo'], ['patron', 'Patrón'], ['imagen', 'Imagen repetida']], (v) => cambiar('sprite.relleno')(quitarSi('color')(v)), 'Cómo se rellena la forma por dentro (yo.relleno)'),
      !esTexto && !s.imagen && relleno !== 'color' && relleno !== 'imagen'
        ? campoColor(relleno === 'patron' ? 'dibujo' : 'color 2', 'sprite.color2', s.color2 ?? d.color2, cambiar('sprite.color2'), relleno === 'patron' ? 'El color del dibujo del patrón (yo.color2)' : 'El color donde termina el degradado (yo.color2)')
        : null,
      !esTexto && !s.imagen && relleno === 'degradado'
        ? campoNumero('ángulo', 'sprite.anguloDegradado', s.anguloDegradado ?? d.anguloDegradado, (v) => cambiar('sprite.anguloDegradado')(quitarSi(d.anguloDegradado)(v)), { ...largo, paso: 15, ayuda: 'Hacia dónde va: 0 = de izquierda a derecha, 90 = de abajo arriba' })
        : null,
      !esTexto && !s.imagen && relleno === 'patron'
        ? campoLista('patrón', 'sprite.patron', s.patron ?? 'rayas', PATRONES.map((p): [string, string] => [p, p]), (v) => cambiar('sprite.patron')(quitarSi('rayas')(v)))
        : null,
      !esTexto && !s.imagen && relleno === 'imagen'
        ? imagenes.length
          ? campoLista('imagen', 'sprite.imagenRelleno', s.imagenRelleno ?? '', [['', '(elige una)'], ...imagenes.map((i): [string, string] => [i, i])], (v) => cambiar('sprite.imagenRelleno')(v || undefined), 'La imagen que se repite dentro de la forma')
          : h('p', { class: 'nota' }, 'Importa una imagen en Proyecto > Imágenes para rellenar con ella.')
        : null,
      esTexto ? null : h('div', { class: 'dos-columnas' },
        campoNumero('borde', 'sprite.borde', s.borde ?? 0, (v) => cambiar('sprite.borde')(v || undefined), { ...largo, min: 0, ayuda: 'Grosor del borde en píxeles (0 = sin borde)' }),
        s.borde ? campoCasilla('a rayas', 'sprite.bordeDiscontinuo', s.bordeDiscontinuo ?? false, (v) => cambiar('sprite.bordeDiscontinuo')(v || undefined), 'Borde discontinuo (a rayitas)') : null,
      ),
      !esTexto && s.borde ? campoColor('color borde', 'sprite.colorBorde', s.colorBorde ?? d.colorBorde, cambiar('sprite.colorBorde')) : null,
      campoCasilla('sombra', 'sprite.sombra', !!s.sombra, (v) => cambiar('sprite.sombra')(v ? '#00000088' : undefined), 'Una sombra debajo del objeto'),
      s.sombra ? campoColor('color sombra', 'sprite.sombraColor', s.sombra, cambiar('sprite.sombra')) : null,
      s.sombra ? h('div', { class: 'tres-columnas' },
        campoNumero('x', 'sprite.sombraX', s.sombraX ?? d.sombraX, (v) => cambiar('sprite.sombraX')(quitarSi(d.sombraX)(v)), { ...largo, ayuda: 'Cuánto se aparta a la derecha' }),
        campoNumero('y', 'sprite.sombraY', s.sombraY ?? d.sombraY, (v) => cambiar('sprite.sombraY')(quitarSi(d.sombraY)(v)), { ...largo, ayuda: 'Cuánto se aparta hacia arriba (negativo: hacia abajo)' }),
        campoNumero('borrosa', 'sprite.desenfoqueSombra', s.desenfoqueSombra ?? d.desenfoqueSombra, (v) => cambiar('sprite.desenfoqueSombra')(quitarSi(d.desenfoqueSombra)(v)), { ...largo, min: 0, ayuda: 'Lo borrosa que es (0 = bordes duros)' }),
      ) : null,
      campoCasilla('resplandor', 'sprite.resplandor', !!s.resplandor, (v) => cambiar('sprite.resplandor')(v ? 'amarillo' : undefined), 'Un brillo alrededor del objeto'),
      s.resplandor ? h('div', { class: 'dos-columnas' },
        campoColor('color', 'sprite.resplandorColor', s.resplandor, cambiar('sprite.resplandor')),
        campoNumero('tamaño', 'sprite.tamanoResplandor', s.tamanoResplandor ?? d.tamanoResplandor, (v) => cambiar('sprite.tamanoResplandor')(quitarSi(d.tamanoResplandor)(v)), { ...largo, min: 0 }),
      ) : null,
      h('div', { class: 'dos-columnas' },
        campoCasilla('contorno', 'sprite.contorno', !!s.contorno, (v) => cambiar('sprite.contorno')(v ? 'blanco' : undefined), 'Una línea de color alrededor de todo el objeto (yo.contorno)'),
        s.contorno ? campoNumero('grosor', 'sprite.grosorContorno', s.grosorContorno ?? d.grosorContorno, (v) => cambiar('sprite.grosorContorno')(quitarSi(d.grosorContorno)(v)), { ...largo, min: 0 }) : null,
      ),
      s.contorno ? campoColor('color contorno', 'sprite.contornoColor', s.contorno, cambiar('sprite.contorno')) : null,
      h('div', { class: 'tres-columnas' },
        campoNumero('brillo', 'sprite.brillo', s.brillo ?? 1, (v) => cambiar('sprite.brillo')(quitarSi(1)(v)), { ...largo, paso: 0.1, min: 0, ayuda: '1 = normal, 2 = el doble de claro (yo.brillo)' }),
        campoNumero('grises', 'sprite.grises', s.grises ?? 0, (v) => cambiar('sprite.grises')(quitarSi(0)(v)), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '0 = colores, 1 = blanco y negro (yo.grises)' }),
        campoNumero('borroso', 'sprite.desenfoque', s.desenfoque ?? 0, (v) => cambiar('sprite.desenfoque')(quitarSi(0)(v)), { ...largo, min: 0, ayuda: 'Desenfoque en píxeles (yo.desenfoque)' }),
      ),
      campoLista('mezcla', 'sprite.mezcla', s.mezcla ?? 'normal', NOMBRES_MEZCLAS.map((m): [string, string] => [m, m]), (v) => cambiar('sprite.mezcla')(quitarSi('normal')(v)), 'Cómo se junta con lo de detrás: «sumar» hace que brille (fuego, magia), «multiplicar» oscurece (sombras)'),
    ], { plegada: !conEstilo, ayuda: 'Degradados, patrones, borde, sombra, resplandor y mezcla' });
  }

  /** Los datos propios de algunas formas (lados del polígono, hueco del anillo...). */
  private datosDeForma(s: DefSprite, cambiar: (ruta: string) => (v: unknown) => void, largo: { empezar: () => void; terminar: () => void }): (HTMLElement | null)[] {
    const forma = s.forma ?? 'rectangulo';
    const sinValor = (porDefecto: number) => (v: number | undefined) => (v === undefined || v === porDefecto ? undefined : v);
    const res: (HTMLElement | null)[] = [];
    if (forma === 'poligono' || forma === 'estrella') {
      const porDefecto = forma === 'estrella' ? POR_DEFECTO.puntas : POR_DEFECTO.lados;
      res.push(campoNumero(forma === 'estrella' ? 'puntas' : 'lados', 'sprite.lados', s.lados ?? porDefecto, (v) => cambiar('sprite.lados')(sinValor(porDefecto)(v)), { ...largo, min: 3, max: MAX_LADOS, ayuda: forma === 'estrella' ? 'Cuántas puntas tiene la estrella' : 'Cuántos lados tiene: 3 = triángulo, 6 = hexágono...' }));
    }
    if (forma === 'estrella' || forma === 'anillo' || forma === 'arco') {
      const porDefecto = forma === 'estrella' ? POR_DEFECTO.radioInteriorEstrella : POR_DEFECTO.radioInteriorAnillo;
      res.push(campoNumero('hueco', 'sprite.radioInterior', s.radioInterior ?? porDefecto, (v) => cambiar('sprite.radioInterior')(sinValor(porDefecto)(v)), { ...largo, paso: 0.05, min: 0, max: 1, ayuda: 'Lo grande que es el hueco de dentro: 0 = nada, 1 = todo (yo.radioInterior)' }));
    }
    if (forma === 'redondeado') {
      res.push(campoNumero('esquinas', 'sprite.radioEsquina', s.radioEsquina, (v) => cambiar('sprite.radioEsquina')(v), { ...largo, min: 0, vacio: 'auto', ayuda: 'Radio de las esquinas en píxeles (vacío: un 20 % del lado corto)' }));
    }
    if (forma === 'arco') {
      res.push(h('div', { class: 'dos-columnas' },
        campoNumero('desde', 'sprite.inicioArco', s.inicioArco ?? POR_DEFECTO.desde, (v) => cambiar('sprite.inicioArco')(sinValor(POR_DEFECTO.desde)(v)), { ...largo, paso: 15, ayuda: 'Dónde empieza, en grados (0 = derecha, 90 = arriba)' }),
        campoNumero('hasta', 'sprite.finArco', s.finArco ?? POR_DEFECTO.hasta, (v) => cambiar('sprite.finArco')(sinValor(POR_DEFECTO.hasta)(v)), { ...largo, paso: 15, ayuda: 'Dónde termina, en grados' }),
      ));
    }
    if (forma === 'linea' || (forma === 'camino' && s.cerrado === false)) {
      res.push(campoNumero('grosor', 'sprite.grosor', s.grosor ?? POR_DEFECTO.grosor, (v) => cambiar('sprite.grosor')(sinValor(POR_DEFECTO.grosor)(v)), { ...largo, min: 1, ayuda: 'Lo gorda que es la línea, en píxeles' }));
    }
    if (forma === 'camino') {
      res.push(campoCasilla('cerrado (relleno)', 'sprite.cerrado', s.cerrado ?? true, (v) => cambiar('sprite.cerrado')(v ? undefined : false), 'Cerrado se rellena; abierto es una línea'));
    }
    return res;
  }

  // ═════════════════════════ Un objeto ═════════════════════════

  private objeto(ref: RefObjeto, def: DefObjeto): HTMLElement[] {
    const e = this.estado;
    const cambiar = (ruta: string) => (v: unknown) => e.cambiarPropiedad(ref, ruta, v);
    const largo = { empezar: () => e.empezarCambioLargo(), terminar: () => e.terminarCambioLargo() };
    const esPlantilla = ref.tipo === 'plantilla';
    const nombre = esPlantilla ? ref.nombre : def.nombre ?? '';

    const cabecera = h('div', { class: 'inspector-cabecera' },
      icono(esPlantilla ? 'plantilla' : def.mapa ? 'mapa' : def.sprite?.forma === 'texto' ? 'texto' : 'objeto', 20),
      h('input', {
        class: 'campo nombre-objeto',
        value: nombre,
        spellcheck: 'false',
        'data-ruta': 'nombre',
        title: esPlantilla ? 'Nombre de la plantilla (el que usas en crear("…"))' : 'Nombre del objeto (el que usas en buscar("…") y en "cuando toco …")',
        onchange: (ev: Event) => e.renombrar(ref, (ev.target as HTMLInputElement).value),
      }),
    );
    const enlazada = esPlantilla ? null : e.plantillaDe(ref);
    const copias = esPlantilla ? e.copiasDe(ref.nombre).length : 0;
    const info = esPlantilla
      ? h('p', { class: 'nota' }, 'Plantilla: créala desde el código con ', h('code', {}, `crear("${nombre}")`), ' o arrástrala a la escena.',
          copias ? ` Lo que cambies aquí cambia también en sus ${copias} ${copias === 1 ? 'copia' : 'copias'} de las escenas.` : '')
      : enlazada
        ? h('div', { class: 'nota nota-enlazada' },
            icono('plantilla', 14),
            h('span', {}, 'Copia de la plantilla ', h('code', {}, enlazada), `. Lo que cambies aquí cambia en la plantilla y en todas sus copias (${e.copiasDe(enlazada).length}), menos el nombre y el sitio.`),
            h('span', { class: 'botones-nota' },
              h('button', { class: 'boton-enlace', title: 'Ver la plantilla en el inspector', onclick: () => e.seleccionar({ tipo: 'plantilla', nombre: enlazada }) }, 'Ver la plantilla'),
              h('button', { class: 'boton-enlace desvincular', title: 'Esta copia se separa: a partir de ahora se cambia ella sola', onclick: () => e.desvincular(ref) }, 'Desvincular'),
            ),
          )
      : def.tipo && def.tipo !== def.nombre
        ? h('p', { class: 'nota' }, 'Copia de la plantilla ', h('code', {}, def.tipo), '.')
        : /\d$/.test(nombre) && tipoPorNombre(nombre) !== nombre
          ? h('p', { class: 'nota' }, 'Tipo: ', h('code', {}, tipoPorNombre(nombre)), `. "cuando toco ${tipoPorNombre(nombre)}" vale para todas las copias.`)
          : null;

    const partes: (HTMLElement | null)[] = [cabecera, info];

    // Transformación
    partes.push(seccion('Posición', [
      esPlantilla ? null : h('div', { class: 'dos-columnas' },
        campoNumero('x', 'x', def.x ?? 0, (v) => e.moverObjeto(ref, v ?? 0, def.y ?? 0), { ...largo, ayuda: def.sprite?.fijo ? 'Distancia desde el borde IZQUIERDO de la pantalla' : 'Posición horizontal (crece hacia la derecha)' }),
        campoNumero('y', 'y', def.y ?? 0, (v) => e.moverObjeto(ref, def.x ?? 0, v ?? 0), { ...largo, ayuda: def.sprite?.fijo ? 'Distancia desde el borde de ABAJO de la pantalla' : 'Posición vertical (crece hacia ARRIBA)' }),
      ),
      h('div', { class: 'dos-columnas' },
        campoNumero('rotacion', 'rotacion', def.rotacion ?? 0, (v) => cambiar('rotacion')(v || undefined), { ...largo, paso: 5, ayuda: 'Giro en grados (positivo = contra las agujas del reloj)' }),
        campoNumero('escala', 'escala', def.escala ?? 1, (v) => cambiar('escala')(v === 1 ? undefined : v), { ...largo, paso: 0.1, min: 0.05, ayuda: '1 = tamaño normal, 2 = el doble' }),
      ),
    ]));

    // Dibujo
    const s = def.sprite;
    const imagenes = Object.keys(e.proyecto.imagenes);
    const aspecto = s
      ? [
          // Un control se dibuja a su manera: no elige forma (el icono sí puede llevar una imagen)
          def.control && def.control.tipo !== 'icono' ? null : campoLista(def.control ? 'imagen' : 'dibujo', 'sprite.dibujo', s.imagen ? `imagen:${s.imagen}` : s.forma ?? 'rectangulo',
            def.control ? [['rectangulo', '(un círculo de color)'], ...imagenes.map((i): [string, string] => [`imagen:${i}`, `Imagen: ${i}`])] : [...FORMAS_DIBUJO.map((f): [string, string] => [f.forma, f.texto]), ['texto', 'Texto'], ...imagenes.map((i): [string, string] => [`imagen:${i}`, `Imagen: ${i}`])],
            (v) => {
              e.empezarCambioLargo();
              if (v.startsWith('imagen:')) {
                e.cambiarPropiedad(ref, 'sprite.imagen', v.slice(7));
                e.cambiarPropiedad(ref, 'sprite.forma', undefined);
              } else {
                e.cambiarPropiedad(ref, 'sprite.imagen', undefined);
                e.cambiarPropiedad(ref, 'sprite.forma', v);
                if (v === 'texto' && !s.texto) e.cambiarPropiedad(ref, 'sprite.texto', 'Texto');
              }
              e.terminarCambioLargo();
            },
            'Qué se dibuja: una forma de color, un texto o una imagen del proyecto'),
          s.imagen ? null : campoColor('color', 'sprite.color', s.color ?? 'blanco', cambiar('sprite.color')),
          ...(s.imagen || def.control ? [] : this.datosDeForma(s, cambiar, largo)),
          s.imagen || s.forma === 'texto' || def.control ? null : h('div', { class: 'acciones-forma' },
            h('button', { class: 'boton-enlace', 'data-accion': 'pluma', title: 'Retocar la forma punto a punto, o dibujar una nueva, con la pluma', onclick: () => abrirEditorPluma(e, ref) }, '✒ Editar con la pluma'),
            h('button', { class: 'boton-enlace', 'data-accion': 'a-imagen', title: 'Dibuja la forma (con su relleno y su borde) en una imagen y el objeto pasa a usarla. Sigue chocando con su forma.', onclick: () => {
              const png = formaAPNG(def);
              const nombre = png ? e.convertirEnImagen(ref, png) : null;
              notificar(nombre ? `Forma convertida en la imagen «${nombre}» (está en Proyecto > Imágenes).` : 'Esta forma no se puede convertir en imagen.', nombre ? 'ok' : 'error');
            } }, '🖼 Convertir en imagen'),
          ),
          h('div', { class: 'dos-columnas' },
            campoNumero('ancho', 'sprite.ancho', s.ancho ?? 64, cambiar('sprite.ancho'), { ...largo, min: 1 }),
            campoNumero('alto', 'sprite.alto', s.alto ?? 64, cambiar('sprite.alto'), { ...largo, min: 1 }),
          ),
          def.control ? null : s.forma === 'texto' || s.texto
            ? campoTexto(s.forma === 'texto' ? 'texto' : 'etiqueta', 'sprite.texto', s.texto, (v) => cambiar('sprite.texto')(v || undefined), s.forma === 'texto' ? 'Lo que pone. Entre llaves, un dato que se actualiza solo: Puntos: {juego.puntos}' : 'Texto encima (para botones)')
            : h('button', { class: 'boton-enlace', onclick: () => cambiar('sprite.texto')('Boton') }, '+ Añadir un texto encima (para botones)'),
          !def.control && (s.forma === 'texto' || s.texto) ? this.menuDatos(ref, def) : null,
          tieneHuecos(s.texto) ? h('p', { class: 'nota' }, 'Este texto se actualiza solo mientras juegas: lo que va entre llaves { } se cambia por su valor.') : null,
          !def.control && (s.forma === 'texto' || s.texto)
            ? h('div', { class: 'dos-columnas' },
                campoNumero('tamaño', 'sprite.tamano', s.tamano ?? 24, cambiar('sprite.tamano'), { ...largo, min: 4, ayuda: 'Tamaño de la letra' }),
                s.forma === 'texto' && !s.imagen
                  ? campoLista('alinear', 'sprite.alinear', s.alinear ?? 'centro', [['izquierda', 'Izquierda'], ['centro', 'Centro'], ['derecha', 'Derecha']], cambiar('sprite.alinear'))
                  : campoColor('letra', 'sprite.colorTexto', s.colorTexto ?? 'blanco', cambiar('sprite.colorTexto'), 'Color de la letra'),
              )
            : null,
          !def.control && (s.forma === 'texto' || s.texto)
            ? campoLista('tipo de letra', 'sprite.letra', s.letra ?? 'normal', [...LETRAS, ...Object.keys(this.estado.proyecto.letras ?? {})].map((l): [string, string] => [l, NOMBRES_LETRAS[l] ?? l]), (v) => cambiar('sprite.letra')(v === 'normal' ? undefined : v))
            : null,
          h('div', { class: 'dos-columnas' },
            campoNumero('capa', 'sprite.capa', s.capa ?? 0, (v) => cambiar('sprite.capa')(v || undefined), { ...largo, ayuda: 'Las capas más altas se dibujan encima' }),
            campoNumero('opacidad', 'sprite.opacidad', s.opacidad ?? 1, (v) => cambiar('sprite.opacidad')(v === 1 ? undefined : v), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '1 = se ve entero, 0 = invisible' }),
          ),
          h('div', { class: 'casillas' },
            campoCasilla('visible', 'sprite.visible', s.visible ?? true, (v) => cambiar('sprite.visible')(v ? undefined : false)),
            s.imagen ? campoCasilla('voltear', 'sprite.voltear', s.voltear ?? false, (v) => cambiar('sprite.voltear')(v || undefined), 'Dibujar la imagen al revés (mirando a la izquierda)') : null,
            esPlantilla ? null : campoCasilla('fijo en pantalla', 'sprite.fijo', s.fijo ?? false, (v) => this.cambiarFijo(ref, def, v), 'Pegado a la pantalla: no se mueve con la cámara (para vidas, puntos, botones)'),
          ),
          Object.keys(e.proyecto.animaciones).length
            ? campoLista('animacion', 'animacion', def.animacion ?? '', [['', '(ninguna)'], ...Object.keys(e.proyecto.animaciones).map((a): [string, string] => [a, a])], (v) => cambiar('animacion')(v || undefined), 'Animación con la que empieza (desde el código: yo.animar("…"))')
            : null,
        ]
      : [];
    partes.push(seccion('Dibujo', aspecto, { activo: !!s, alActivar: (v) => e.activarComponente(ref, 'sprite', v), ayuda: 'Cómo se ve el objeto' }));
    if (s) partes.push(this.seccionEstilo(s, cambiar, largo));
    // Control de interfaz (botón, barra, lista, ventana...)
    if (def.control && s) partes.push(this.seccionControl(def, def.control, s, cambiar, largo));
    // Luz (se ve cuando la escena tiene oscuridad)
    const l = def.luz;
    partes.push(seccion('Luz', l ? [
      e.escena.oscuridad ? null : h('p', { class: 'nota' }, 'La luz solo se ve si la escena tiene oscuridad (ajustes de la escena, sección Luz y oscuridad).'),
      h('div', { class: 'dos-columnas' },
        campoLista('tipo', 'luz.tipo', l.tipo ?? 'punto', [['punto', 'De punto (antorcha)'], ['foco', 'Foco (linterna)']], (v) => cambiar('luz.tipo')(v === 'punto' ? undefined : v)),
        campoNumero('radio', 'luz.radio', l.radio ?? 220, (v) => cambiar('luz.radio')(v), { ...largo, min: 0, paso: 10, ayuda: 'Hasta dónde llega, en píxeles' }),
      ),
      campoColor('color', 'luz.color', l.color ?? 'blanco', cambiar('luz.color'), 'El color de la luz (tiñe un poco lo que ilumina)'),
      h('div', { class: 'dos-columnas' },
        campoNumero('intensidad', 'luz.intensidad', l.intensidad ?? 1, (v) => cambiar('luz.intensidad')(v === 1 ? undefined : v), { ...largo, paso: 0.1, min: 0, max: 10 }),
        campoNumero('parpadeo', 'luz.parpadeo', l.parpadeo ?? 0, (v) => cambiar('luz.parpadeo')(v || undefined), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: 'Tiembla como una llama (0 = quieta)' }),
      ),
      (l.tipo ?? 'punto') === 'foco' ? campoNumero('ángulo', 'luz.angulo', l.angulo ?? 60, (v) => cambiar('luz.angulo')(v === 60 ? undefined : v), { ...largo, paso: 5, min: 1, max: 360, ayuda: 'Lo abierto que es el cono (mira hacia la rotación del objeto)' }) : null,
      campoCasilla('hace sombras', 'luz.sombras', l.sombras ?? false, (v) => cambiar('luz.sombras')(v || undefined), 'Lo sólido tapa esta luz (paredes de un laberinto, columnas...)'),
    ] : [], { activo: !!l, alActivar: (v) => e.activarComponente(ref, 'luz', v), ayuda: 'Una luz que lleva encima (para cuevas y noches)' }));
    // Efecto que lleva puesto (fuego, humo...)
    const propios = Object.keys(e.proyecto.efectos ?? {});
    partes.push(seccion('Efecto', [
      campoLista('efecto', 'efecto', def.efecto ?? '', [['', '(ninguno)'], ['fuego', 'Fuego'], ['humo', 'Humo'], ['burbujas', 'Burbujas'], ['estela', 'Estela'], ...propios.map((n): [string, string] => [n, `${n} (tuyo)`])], (v) => cambiar('efecto')(v || undefined), 'Un efecto que lleva siempre puesto mientras juegas (desde el código: yo.efecto = "fuego")'),
      h('p', { class: 'nota' }, 'Para hacer tus propios efectos: Proyecto > Efectos > Nuevo efecto.'),
    ], { plegada: !def.efecto, ayuda: 'Fuego, humo, burbujas o una estela que lleva siempre puesta' }));

    // Colisión
    const c = def.colision;
    partes.push(seccion('Colisión', c ? [
      campoCasilla('sólido', 'colision.solido', c.solido ?? true, (v) => cambiar('colision.solido')(v ? undefined : false), 'Sólido: los objetos chocan con él. Si lo quitas es un "fantasma": se atraviesa, pero avisa con "cuando toco"'),
      s && !s.imagen && s.forma !== 'texto'
        ? campoLista('forma', 'colision.forma', c.forma ?? 'auto', [['auto', s.forma === 'rectangulo' ? 'Caja (rectángulo)' : 'Su forma de verdad'], ['caja', 'Una caja (rectángulo)'], ['figura', 'Su forma, también girada']], (v) => cambiar('colision.forma')(v === 'auto' ? undefined : v), 'Con qué forma choca: con la del dibujo o con una caja. Las formas chocan con su forma de verdad (una pelota rueda por una rampa)')
        : null,
      (c.solido ?? true) ? campoCasilla('solo desde arriba', 'colision.soloDesdeArriba', c.soloDesdeArriba ?? false, (v) => cambiar('colision.soloDesdeArriba')(v || undefined), 'Plataforma que se atraviesa desde abajo: se puede saltar a través de ella, y solo para a lo que cae encima') : null,
      h('div', { class: 'dos-columnas' },
        campoNumero('ancho', 'colision.ancho', c.ancho, cambiar('colision.ancho'), { ...largo, min: 1, vacio: 'igual', ayuda: 'Vacío = igual que el dibujo' }),
        campoNumero('alto', 'colision.alto', c.alto, cambiar('colision.alto'), { ...largo, min: 1, vacio: 'igual', ayuda: 'Vacío = igual que el dibujo' }),
      ),
      h('div', { class: 'dos-columnas' },
        campoNumero('mover x', 'colision.desplazamientoX', c.desplazamientoX ?? 0, (v) => cambiar('colision.desplazamientoX')(v || undefined), largo),
        campoNumero('mover y', 'colision.desplazamientoY', c.desplazamientoY ?? 0, (v) => cambiar('colision.desplazamientoY')(v || undefined), largo),
      ),
    ] : [], { activo: !!c, alActivar: (v) => e.activarComponente(ref, 'colision', v), ayuda: 'Para chocar con otros objetos y saber cuándo se tocan' }));

    // Física
    const f = def.fisica;
    partes.push(seccion('Física', f ? [
      campoCasilla('estático', 'fisica.estatico', f.estatico ?? false, (v) => cambiar('fisica.estatico')(v || undefined), 'Estático: no se mueve nunca (suelos, paredes, plataformas)'),
      h('div', { class: 'dos-columnas' },
        campoNumero('gravedad', 'fisica.gravedad', f.gravedad ?? 1, (v) => cambiar('fisica.gravedad')(v === 1 ? undefined : v), { ...largo, paso: 0.1, ayuda: '1 = normal, 0 = flota, 2 = cae el doble de rápido' }),
        campoNumero('masa', 'fisica.masa', f.masa ?? 1, (v) => cambiar('fisica.masa')(v === 1 ? undefined : v), { ...largo, paso: 0.5, min: 0.01, ayuda: 'Lo que pesa: los objetos con más masa empujan más' }),
      ),
      h('div', { class: 'dos-columnas' },
        campoNumero('rozamiento', 'fisica.rozamiento', f.rozamiento ?? 0.5, cambiar('fisica.rozamiento'), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '0 = resbala como en hielo, 1 = frena en seco' }),
        campoNumero('rebote', 'fisica.rebote', f.rebote ?? 0, (v) => cambiar('fisica.rebote')(v || undefined), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '0 = no rebota, 1 = rebota sin perder fuerza' }),
      ),
      campoCasilla('polvo al saltar y caer', 'fisica.polvo', f.polvo ?? false, (v) => cambiar('fisica.polvo')(v || undefined), 'Levanta una nubecita de polvo al saltar (con yo.saltar) y al caer al suelo'),
    ] : [], { activo: !!f, alActivar: (v) => {
      e.activarComponente(ref, 'fisica', v);
      if (v && !def.colision) e.activarComponente(ref, 'colision', true);
    }, ayuda: 'Gravedad, velocidad, choques y empujones' }));

    // Recorrido (plataformas que se mueven solas) y comportamiento (seguir, perseguir, huir)
    if (!def.mapa) partes.push(this.seccionRecorrido(ref, def), this.seccionComportamiento(ref, def));

    // Mapa de casillas
    if (def.mapa) partes.push(this.seccionMapa(ref, def));

    // Propiedades propias
    partes.push(this.seccionPropiedades(ref, def));

    // Script
    partes.push(this.seccionScript(ref, def));

    // Acciones
    partes.push(h('div', { class: 'acciones-objeto' },
      esPlantilla ? null : botonIcono('copiar', 'Duplicar (Ctrl+D)', () => e.duplicarSeleccionado(), 'Duplicar'),
      esPlantilla ? null : botonIcono('copiar', 'Copiar (Ctrl+C), para pegarlo en otra escena con Ctrl+V', () => {
        if (e.copiarSeleccionado()) notificar(`"${nombre}" copiado. Pégalo con Ctrl+V (también en otra escena).`, 'ok');
      }, 'Copiar'),
      esPlantilla ? null : botonIcono('plantilla', 'Convertir en plantilla: sale de la escena y se crea desde el código con crear("…"), como las balas o los enemigos que aparecen', async () => {
        const base = nombre.replace(/\d+$/, '') || nombre;
        if (!(await confirmar('Convertir en plantilla', `"${nombre}" saldrá de la escena y pasará a Proyecto > Plantillas. Desde el código lo crearás con crear("${base}"). Para poner copias en la escena, arrastra la plantilla desde el panel Proyecto.`, 'Convertir'))) return;
        const n = e.convertirEnPlantilla(ref);
        if (n) notificar(`Plantilla "${n}" lista. Úsala con crear("${n}")`, 'ok');
      }, 'Plantilla'),
      botonIcono('basura', 'Borrar (Supr)', async () => {
        if (await confirmar('Borrar', `¿Borrar "${nombre}"?`, 'Borrar', true)) e.borrarSeleccionado();
      }, 'Borrar', 'peligro'),
    ));
    return partes.filter((p): p is HTMLElement => !!p);
  }

  // ═════════════════════════ Varios objetos ═════════════════════════

  private varios(): (HTMLElement | null)[] {
    const e = this.estado;
    const indices = e.indicesSeleccionados();
    const nombres = indices.map((i) => e.escena.objetos[i]?.nombre ?? '(sin nombre)');
    const formas = indices.filter((i) => e.escena.objetos[i] && esFormaCombinable(e.escena.objetos[i]));
    return [
      h('div', { class: 'inspector-cabecera' }, icono('objeto', 20), h('strong', { class: 'titulo-varios' }, `${indices.length} objetos seleccionados`)),
      h('p', { class: 'nota' }, nombres.join(', ')),
      h('p', { class: 'nota' }, 'Arrastra uno de ellos en la escena para moverlos todos a la vez (o usa las flechas). Ctrl+clic añade o quita uno de la selección.'),
      formas.length >= 2
        ? h('div', { class: 'acciones-objeto' },
            botonIcono('mas', 'Juntar las formas elegidas en una sola (las originales se quitan)', () => {
              if (!e.combinarFormas('unir')) notificar('No se han podido unir.', 'error');
            }, 'Unir formas'),
            botonIcono('cerrar', `A «${e.escena.objetos[formas[0]].nombre}» (el primero que elegiste) le quita lo que tapan las demás`, () => {
              if (!e.combinarFormas('restar')) notificar('No queda nada: lo que restas tapa la forma entera.', 'error');
            }, 'Restar formas'),
          )
        : null,
      h('div', { class: 'acciones-objeto' },
        botonIcono('copiar', 'Duplicar todos (Ctrl+D)', () => e.duplicarSeleccionado(), 'Duplicar'),
        botonIcono('copiar', 'Copiar todos (Ctrl+C), para pegarlos en otra escena con Ctrl+V', () => {
          if (e.copiarSeleccionado()) notificar(`${indices.length} objetos copiados. Pégalos con Ctrl+V (también en otra escena).`, 'ok');
        }, 'Copiar'),
        botonIcono('basura', 'Borrar todos (Supr)', async () => {
          if (await confirmar('Borrar', `¿Borrar estos ${indices.length} objetos?`, 'Borrar', true)) e.borrarSeleccionado();
        }, 'Borrar', 'peligro'),
      ),
    ];
  }

  /**
   * «Enseñar un dato»: enlaza el texto a un dato sin escribir código. Pone un
   * hueco {…} en el texto (por ejemplo, Puntos: {juego.puntos}).
   */
  private menuDatos(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const opciones = datosParaTextos(e.proyecto, e.escena.objetos, def);
    const lista = h('select', { class: 'campo menu-datos', 'data-ruta': 'sprite.dato', title: 'Enseña en el texto un dato que se actualiza solo mientras juegas (puntos, vidas, tiempo...)' },
      h('option', { value: '' }, '{ } Enseñar un dato…'),
      opciones.map(([grupo, datos]) => h('optgroup', { label: grupo }, datos.map(([hueco, texto]) => h('option', { value: hueco }, texto)))),
      h('option', { value: '?' }, 'Otro dato del juego…'),
    );
    lista.addEventListener('change', async () => {
      let hueco = lista.value;
      lista.value = '';
      if (hueco === '?') {
        const n = await pedirTexto('Enseñar un dato del juego', 'Nombre del dato (por ejemplo: puntos, vidas, nivel). En el código se guarda con juego.puntos = 0', 'puntos');
        if (!n) return;
        hueco = `{juego.${n.trim().replace(/\s+/g, '_')}}`;
      }
      if (!hueco) return;
      e.cambiarPropiedad(ref, 'sprite.texto', insertarDato(def.sprite?.texto, hueco));
    });
    return lista;
  }

  /** Recorrido: el objeto va solo por unos puntos (plataformas, ascensores, enemigos que patrullan). */
  private seccionRecorrido(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const r = def.recorrido;
    const largo = { empezar: () => e.empezarCambioLargo(), terminar: () => e.terminarCambioLargo() };
    const puntos = r?.puntos ?? [];
    const cambiarPunto = (i: number, eje: 'x' | 'y', v: number) => {
      const nuevos = puntos.map((p, k) => (k === i ? { ...p, [eje]: v } : p));
      e.cambiarPropiedad(ref, 'recorrido.puntos', nuevos);
    };
    const contenido = r
      ? [
          h('div', { class: 'dos-columnas' },
            campoNumero('rapidez', 'recorrido.rapidez', r.rapidez ?? 100, (v) => e.cambiarPropiedad(ref, 'recorrido.rapidez', v ?? 100), { ...largo, min: 1, paso: 10, ayuda: 'Píxeles por segundo' }),
            campoNumero('pausa', 'recorrido.pausa', r.pausa ?? 0.5, (v) => e.cambiarPropiedad(ref, 'recorrido.pausa', v === 0.5 ? undefined : v), { ...largo, min: 0, paso: 0.25, ayuda: 'Segundos que se para en cada extremo' }),
          ),
          campoLista('al acabar', 'recorrido.modo', r.modo ?? 'idaYVuelta', [['idaYVuelta', 'Vuelve por el mismo camino'], ['bucle', 'Vuelve al principio (en círculo)']], (v) => e.cambiarPropiedad(ref, 'recorrido.modo', v === 'idaYVuelta' ? undefined : v), 'Qué hace al llegar al último punto'),
          h('div', { class: 'lista-puntos' },
            puntos.map((p, i) =>
              h('div', { class: 'punto-recorrido' },
                h('span', { class: 'numero-punto', title: 'Punto del camino (desde donde empieza el objeto)' }, String(i + 2)),
                campoNumero('x', `recorrido.puntos.${i}.x`, p.x, (v) => cambiarPunto(i, 'x', v ?? 0), { ...largo, paso: 8, ayuda: 'Cuánto a la derecha del inicio (negativo: a la izquierda)' }),
                campoNumero('y', `recorrido.puntos.${i}.y`, p.y, (v) => cambiarPunto(i, 'y', v ?? 0), { ...largo, paso: 8, ayuda: 'Cuánto por encima del inicio (negativo: por debajo)' }),
                puntos.length > 1 ? botonIcono('cerrar', `Quitar el punto ${i + 2}`, () => e.cambiarPropiedad(ref, 'recorrido.puntos', puntos.filter((_, k) => k !== i)), undefined, 'pequeno') : null,
              ),
            ),
          ),
          h('button', { class: 'boton-enlace', onclick: () => {
            const ultimo = puntos[puntos.length - 1] ?? { x: 0, y: 0 };
            e.cambiarPropiedad(ref, 'recorrido.puntos', [...puntos, { x: ultimo.x, y: ultimo.y + 150 }]);
          } }, '+ Añadir un punto al camino'),
          h('p', { class: 'nota' }, 'El punto 1 es donde está el objeto. Arrastra los puntos en la escena. Lo que se pone encima viaja con él.'),
        ]
      : [];
    return seccion('Recorrido', contenido, {
      activo: !!r,
      alActivar: (v) => e.activarComponente(ref, 'recorrido', v),
      ayuda: 'Se mueve solo por un camino: plataformas que van y vienen, ascensores, enemigos que patrullan',
      plegada: !r,
    });
  }

  /** Comportamiento: se mueve solo según otro objeto, sin código. */
  private seccionComportamiento(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const c = def.comportamiento;
    const largo = { empezar: () => e.empezarCambioLargo(), terminar: () => e.terminarCambioLargo() };
    const otros = [...new Set([...e.escena.objetos.map((o) => o.nombre ?? ''), ...Object.keys(e.proyecto.plantillas)])].filter((n) => n && n !== def.nombre);
    if (c && c.objetivo && !otros.includes(c.objetivo)) otros.unshift(c.objetivo);
    const que = { seguir: 'se queda a', perseguir: 'si está a menos de', huir: 'si está a menos de', jugador: '' };
    const tipos: [string, string][] = [['perseguir', 'Perseguir si está cerca'], ['huir', 'Huir si está cerca'], ['seguir', 'Seguir (como una mascota)'], ['jugador', 'Lo maneja un jugador']];
    const cambiarTipo = (v: string) => {
      e.empezarCambioLargo();
      e.cambiarPropiedad(ref, 'comportamiento.tipo', v);
      e.cambiarPropiedad(ref, 'comportamiento.distancia', undefined);
      // «Lo maneja un jugador» no tiene objetivo; los demás, sí (y no tienen jugador)
      if (v === 'jugador') e.cambiarPropiedad(ref, 'comportamiento.rapidez', 300);
      else {
        e.cambiarPropiedad(ref, 'comportamiento.jugador', undefined);
        e.cambiarPropiedad(ref, 'comportamiento.salto', undefined);
        if (!c?.objetivo) e.cambiarPropiedad(ref, 'comportamiento.objetivo', otros[0] ?? 'Jugador');
      }
      e.terminarCambioLargo();
    };
    const TECLAS = ['W A S D · salta con Espacio (y con las flechas si juega solo)', 'Flechas · salta con Intro', 'I J K L · salta con O', '8 4 5 6 · salta con 0'];
    const contenido = !c
      ? []
      : c.tipo === 'jugador'
        ? [
            campoLista('qué hace', 'comportamiento.tipo', c.tipo, tipos, cambiarTipo, 'Cómo se mueve'),
            campoLista('jugador', 'comportamiento.jugador', String(c.jugador ?? 1), [['1', 'Jugador 1'], ['2', 'Jugador 2'], ['3', 'Jugador 3'], ['4', 'Jugador 4']], (v) => e.cambiarPropiedad(ref, 'comportamiento.jugador', v === '1' ? undefined : Number(v)), 'Qué jugador lo maneja: cada uno tiene su trozo del teclado y, si hay, su mando'),
            h('div', { class: 'dos-columnas' },
              campoNumero('rapidez', 'comportamiento.rapidez', c.rapidez ?? 150, (v) => e.cambiarPropiedad(ref, 'comportamiento.rapidez', v === 150 ? undefined : v), { ...largo, min: 1, paso: 10, ayuda: 'Píxeles por segundo' }),
              campoNumero('salto', 'comportamiento.salto', c.salto ?? 600, (v) => e.cambiarPropiedad(ref, 'comportamiento.salto', v === 600 ? undefined : v), { ...largo, min: 0, paso: 50, ayuda: 'Con qué fuerza salta al pulsar «a» (solo si cae: con Física y gravedad). 0 = no salta' }),
            ),
            h('p', { class: 'nota' }, `Teclas del jugador ${c.jugador ?? 1}: ${TECLAS[(c.jugador ?? 1) - 1]}. Con mando: la cruceta o la palanca, y el botón A. Desde el código: controles(${c.jugador ?? 1}).sePulso("b")`),
          ]
        : [
            campoLista('qué hace', 'comportamiento.tipo', c.tipo, tipos, cambiarTipo, 'Cómo se mueve según el otro objeto'),
            campoLista('a quién', 'comportamiento.objetivo', c.objetivo, otros.map((n): [string, string] => [n, n]), (v) => e.cambiarPropiedad(ref, 'comportamiento.objetivo', v), 'El objeto (o el tipo: la plantilla) al que sigue, persigue o del que huye. Si hay varios, el más cercano'),
            h('div', { class: 'dos-columnas' },
              campoNumero('rapidez', 'comportamiento.rapidez', c.rapidez ?? 150, (v) => e.cambiarPropiedad(ref, 'comportamiento.rapidez', v === 150 ? undefined : v), { ...largo, min: 1, paso: 10, ayuda: 'Píxeles por segundo' }),
              campoNumero(que[c.tipo], 'comportamiento.distancia', c.distancia ?? DISTANCIA_POR_DEFECTO[c.tipo], (v) => e.cambiarPropiedad(ref, 'comportamiento.distancia', v === DISTANCIA_POR_DEFECTO[c.tipo] ? undefined : v), { ...largo, min: 0, paso: 10, ayuda: c.tipo === 'seguir' ? 'Píxeles a los que se queda del otro' : 'Píxeles: más lejos que eso, no hace caso' }),
            ),
            h('p', { class: 'nota' }, 'Si hay un mapa con paredes y el juego se ve desde arriba, las rodea. Con recorrido: patrulla y deja el camino mientras persigue. Desde el código: yo.irHacia(sitio).'),
          ];
    return seccion('Comportamiento', contenido, {
      activo: !!c,
      alActivar: (v) => e.activarComponente(ref, 'comportamiento', v),
      ayuda: 'Se mueve sin código: persigue al jugador, huye de él, lo sigue... o lo maneja un jugador con sus teclas',
      plegada: !c,
    });
  }

  /** Al pegar un objeto a la pantalla (o despegarlo) conservamos dónde se ve. */
  private cambiarFijo(ref: RefObjeto, def: DefObjeto, fijo: boolean): void {
    const e = this.estado;
    const cam = e.escena.camara;
    const zoom = cam?.zoom ?? 1;
    const izq = (cam?.x ?? e.proyecto.ancho / 2) - e.proyecto.ancho / 2 / zoom;
    const abajo = (cam?.y ?? e.proyecto.alto / 2) - e.proyecto.alto / 2 / zoom;
    e.empezarCambioLargo();
    if (fijo) e.moverObjeto(ref, ((def.x ?? 0) - izq) * zoom, ((def.y ?? 0) - abajo) * zoom);
    else e.moverObjeto(ref, izq + (def.x ?? 0) / zoom, abajo + (def.y ?? 0) / zoom);
    e.cambiarPropiedad(ref, 'sprite.fijo', fijo || undefined);
    e.terminarCambioLargo();
  }

  private seccionMapa(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const mapa = def.mapa!;
    const tipos = Object.keys(mapa.tipos);
    if (!this.vista.tipoPincel || !mapa.tipos[this.vista.tipoPincel]) this.vista.tipoPincel = tipos[0] ?? null;
    const herramientas = h('div', { class: 'herramientas-mapa' },
      botonIcono('mover', 'Mover el mapa entero (V)', () => this.vista.ponerHerramienta('mover'), 'Mover', this.vista.herramienta === 'mover' ? 'activo' : ''),
      botonIcono('pincel', 'Pintar casillas (B)', () => this.vista.ponerHerramienta('pincel'), 'Pintar', this.vista.herramienta === 'pincel' ? 'activo' : ''),
      botonIcono('goma', 'Borrar casillas (E)', () => this.vista.ponerHerramienta('goma'), 'Borrar', this.vista.herramienta === 'goma' ? 'activo' : ''),
    );
    const imagenes = Object.keys(e.proyecto.imagenes);
    const listaTipos = h('div', { class: 'tipos-casilla' },
      tipos.map((nombre) => {
        const t = mapa.tipos[nombre];
        const elegido = this.vista.tipoPincel === nombre;
        const muestra = t.imagen && e.proyecto.imagenes[t.imagen]
          ? h('img', { class: 'muestra', src: e.proyecto.imagenes[t.imagen], alt: '' })
          : fondoDeColor(h('span', { class: 'muestra' }), t.color);
        return h('div', { class: `tipo-casilla ${elegido ? 'elegido' : ''}` },
          h('button', { class: 'elegir-tipo', title: `Pintar con "${nombre}"`, onclick: () => {
            this.vista.tipoPincel = nombre;
            if (this.vista.herramienta !== 'pincel') this.vista.ponerHerramienta('pincel');
            else this.dibujar();
          } }, muestra, h('span', {}, nombre)),
          h('div', { class: 'tipo-detalles' },
            campoColor('color', `tipo.${nombre}.color`, t.color ?? 'gris', (v) => e.ponerTipoCasilla(ref, nombre, { ...t, color: v })),
            imagenes.length ? campoLista('imagen', `tipo.${nombre}.imagen`, t.imagen ?? '', [['', '(solo color)'], ...imagenes.map((i): [string, string] => [i, i])], (v) => e.ponerTipoCasilla(ref, nombre, { ...t, imagen: v || undefined })) : null,
            campoCasilla('sólida', `tipo.${nombre}.solida`, t.solida, (v) => e.ponerTipoCasilla(ref, nombre, { ...t, solida: v }), 'Sólida = pared o suelo. Si no, se atraviesa (agua, pinchos, monedas...) y avisa con "cuando toco"'),
            t.solida ? campoCasilla('solo desde arriba', `tipo.${nombre}.soloDesdeArriba`, t.soloDesdeArriba ?? false, (v) => e.ponerTipoCasilla(ref, nombre, { ...t, soloDesdeArriba: v || undefined }), 'Plataforma que se atraviesa saltando desde abajo: solo para a lo que cae encima') : null,
            tipos.length > 1 ? botonIcono('basura', `Quitar el tipo "${nombre}" (y sus casillas)`, async () => {
              if (await confirmar('Quitar tipo de casilla', `¿Quitar "${nombre}" y borrar todas sus casillas del mapa?`, 'Quitar', true)) e.borrarTipoCasilla(ref, nombre);
            }, undefined, 'pequeno') : null,
          ),
        );
      }),
    );
    const nuevoTipo = h('button', { class: 'boton-enlace', onclick: async () => {
      const n = await pedirTexto('Nuevo tipo de casilla', 'Nombre (por ejemplo: pared, agua, pinchos). Lo usarás en "cuando toco pinchos".');
      if (!n) return;
      this.vista.tipoPincel = e.ponerTipoCasilla(ref, n, { color: '#b57cff', solida: true });
      if (this.vista.herramienta === 'mover') this.vista.ponerHerramienta('pincel');
      this.dibujar(); // el tipo nuevo queda elegido y con sus opciones a la vista
    } }, '+ Nuevo tipo de casilla');
    return seccion('Mapa de casillas', [
      herramientas,
      h('div', { class: 'dos-columnas' },
        campoNumero('casilla', 'mapa.tamano', mapa.tamano, (v) => e.cambiarPropiedad(ref, 'mapa.tamano', Math.max(4, v ?? 48)), { min: 4, ayuda: 'Tamaño de cada casilla, en píxeles' }),
        campoNumero('capa', 'mapa.capa', mapa.capa ?? -1, (v) => e.cambiarPropiedad(ref, 'mapa.capa', v === -1 ? undefined : v), { ayuda: 'Las capas más altas se dibujan encima (-1 = detrás de todo)' }),
      ),
      h('p', { class: 'nota' }, `${Object.keys(mapa.celdas).length} casillas pintadas. Elige un tipo y pinta en la escena.`),
      listaTipos,
      nuevoTipo,
    ], { ayuda: 'Una rejilla para pintar suelos, paredes, agua...' });
  }

  private seccionPropiedades(ref: RefObjeto, def: DefObjeto): HTMLElement {
    return seccion('Propiedades propias', [
      listaDeDatos(def.propiedades ?? {}, 'prop', 'yo', (n, v) => this.estado.cambiarPropiedadPropia(ref, n, v),
        'Datos tuyos para este objeto (vida, puntos...). En el código: yo.vida', '+ Nueva propiedad'),
    ], { ayuda: 'Como los Attributes de Roblox: datos con un valor inicial que el código puede leer y cambiar' });
  }

  private seccionScript(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const scripts = Object.keys(e.proyecto.scripts);
    const conScript = def.script && tiene(e.proyecto.scripts, def.script);
    return seccion('Script', [
      campoLista('archivo', 'script', conScript ? def.script! : '', [['', '(ninguno)'], ...scripts.map((s): [string, string] => [s, s])], (v) => e.asignarScript(ref, v || null), 'El código .chs que controla este objeto'),
      h('div', { class: 'acciones-script' },
        conScript
          ? botonIcono('codigo', 'Abrir el código (o doble clic en el objeto)', () => e.abrirScript(def.script!), 'Abrir el código', 'principal')
          : botonIcono('mas', 'Crear un script nuevo para este objeto', () => e.crearScriptPara(ref), 'Crear script', 'principal'),
      ),
    ], { ayuda: 'El código que da vida al objeto' });
  }

  // ═════════════════════════ Sin selección: escena y proyecto ═════════════════════════

  private ajustesEscena(): HTMLElement[] {
    const e = this.estado;
    const esc = e.escena;
    const nombres = e.escena.objetos.map((o) => o.nombre ?? '').filter(Boolean);
    return [
      h('div', { class: 'inspector-cabecera' }, icono('escena', 20), h('span', { class: 'titulo-escena' }, `Escena: ${e.escenaActual}`)),
      h('p', { class: 'nota' }, 'Nada seleccionado. Haz clic en un objeto para ver sus propiedades.'),
      seccion('Escena', [
        campoColor('fondo', 'escena.colorFondo', esc.colorFondo, (v) => e.cambiarEscenaPropiedad('colorFondo', v), 'Color del fondo de la escena'),
        campoNumero('gravedad', 'escena.gravedad', esc.gravedad, (v) => e.cambiarEscenaPropiedad('gravedad', v), { vacio: '1500', ayuda: 'Gravedad del mundo en píxeles/segundo². 0 = juego visto desde arriba. Vacío = 1500' }),
        campoCasilla('escena inicial', 'escena.inicial', e.proyecto.escenaInicial === e.escenaActual, (v) => v && e.ponerEscenaInicial(e.escenaActual), 'La escena con la que empieza el juego'),
        h('div', { class: 'dos-columnas' },
          campoLista('clima', 'escena.clima', esc.clima?.tipo ?? '', [['', '(nada)'], ['lluvia', 'Lluvia'], ['nieve', 'Nieve'], ['hojas', 'Hojas cayendo']], (v) => e.cambiarEscenaPropiedad('clima', v ? { tipo: v, intensidad: esc.clima?.intensidad } : undefined), 'Lluvia, nieve u hojas cayendo por toda la pantalla (desde el código: efecto.lluvia())'),
          esc.clima ? campoNumero('intensidad', 'escena.climaIntensidad', esc.clima.intensidad ?? 1, (v) => e.cambiarEscenaPropiedad('clima', { tipo: esc.clima!.tipo, intensidad: v ?? 1 }), { paso: 0.5, min: 0, max: 10, ayuda: '1 = normal, 3 = tormenta' }) : null,
        ),
      ]),
      seccion('Luz y oscuridad', [
        campoNumero('oscuridad', 'escena.oscuridad', esc.oscuridad ?? 0, (v) => e.cambiarEscenaPropiedad('oscuridad', v), { paso: 0.1, min: 0, max: 1, ayuda: '0 = de día (sin luces), 1 = negro donde no llega ninguna luz. Los objetos llevan luz en su sección Luz' }),
        esc.oscuridad ? campoColor('color', 'escena.luzAmbiente', esc.luzAmbiente ?? 'negro', (v) => e.cambiarEscenaPropiedad('luzAmbiente', v), 'El color de la oscuridad: negro, o un azul muy oscuro para la noche') : null,
      ], { plegada: !esc.oscuridad, ayuda: 'Para cuevas y noches: la escena se oscurece y solo se ve lo que alumbran las luces' }),
      seccion('Pantalla', [
        h('div', { class: 'dos-columnas' },
          campoNumero('grises', 'filtros.grises', esc.filtros?.grises ?? 0, (v) => e.cambiarEscenaPropiedad('filtros.grises', v), { paso: 0.1, min: 0, max: 1, ayuda: '0 = colores, 1 = blanco y negro (pantalla.grises)' }),
          campoNumero('pixelado', 'filtros.pixelado', esc.filtros?.pixelado ?? 1, (v) => e.cambiarEscenaPropiedad('filtros.pixelado', v), { paso: 1, min: 1, max: 100, ayuda: 'Tamaño de los píxeles gordos (1 = normal)' }),
        ),
        h('div', { class: 'dos-columnas' },
          campoNumero('brillo', 'filtros.brillo', esc.filtros?.brillo ?? 1, (v) => e.cambiarEscenaPropiedad('filtros.brillo', v), { paso: 0.1, min: 0, max: 10, ayuda: '1 = normal, 0.5 = de noche' }),
          campoNumero('viñeta', 'filtros.vineta', esc.filtros?.vineta ?? 0, (v) => e.cambiarEscenaPropiedad('filtros.vineta', v), { paso: 0.1, min: 0, max: 1, ayuda: 'Bordes oscuros, de 0 a 1' }),
        ),
        h('div', { class: 'dos-columnas' },
          campoNumero('desenfoque', 'filtros.desenfoque', esc.filtros?.desenfoque ?? 0, (v) => e.cambiarEscenaPropiedad('filtros.desenfoque', v), { paso: 1, min: 0, max: 100, ayuda: 'Todo borroso (píxeles)' }),
          campoNumero('bloom', 'filtros.bloom', esc.filtros?.bloom ?? 0, (v) => e.cambiarEscenaPropiedad('filtros.bloom', v), { paso: 0.1, min: 0, max: 1, ayuda: 'Halo de luz en lo brillante, de 0 a 1' }),
        ),
        h('div', { class: 'dos-columnas' },
          campoNumero('aberración', 'filtros.aberracion', esc.filtros?.aberracion ?? 0, (v) => e.cambiarEscenaPropiedad('filtros.aberracion', v), { paso: 1, min: 0, max: 100, ayuda: 'Los colores se separan (píxeles)' }),
          campoCasilla('tele antigua', 'filtros.crt', esc.filtros?.crt ?? false, (v) => e.cambiarEscenaPropiedad('filtros.crt', v), 'Rayas, bordes oscuros y colores separados, como una tele de las de antes (pantalla.crt)'),
        ),
      ], { plegada: !esc.filtros, ayuda: 'Filtros para todo lo que se ve en esta escena (se ven al jugar)' }),
      seccion('Cámara', [
        campoLista('seguir a', 'camara.seguir', esc.camara?.seguir ?? '', [['', '(nadie)'], ...nombres.map((n): [string, string] => [n, n])], (v) => e.cambiarEscenaPropiedad('camara.seguir', v || undefined), 'La cámara sigue a este objeto (desde el código: escena.camara.seguir(yo))'),
...this.camposJugadores(esc, nombres),
                campoCasilla('no salir del mapa', 'camara.limitarAlMapa', esc.camara?.limitarAlMapa ?? false, (v) => e.cambiarEscenaPropiedad('camara.limitarAlMapa', v), 'La cámara no enseña nada fuera de los mapas de casillas de la escena (no se ve el vacío de los bordes)'),
        campoNumero('zoom', 'camara.zoom', esc.camara?.zoom ?? 1, (v) => e.cambiarEscenaPropiedad('camara.zoom', v ?? 1), { paso: 0.1, min: 0.1, max: 10, ayuda: '1 = normal, 2 = todo el doble de grande' }),
        h('div', { class: 'dos-columnas' },
          campoNumero('centro x', 'camara.x', esc.camara?.x, (v) => e.cambiarEscenaPropiedad('camara.x', v), { vacio: String(e.proyecto.ancho / 2), ayuda: 'Punto al que mira la cámara al empezar' }),
          campoNumero('centro y', 'camara.y', esc.camara?.y, (v) => e.cambiarEscenaPropiedad('camara.y', v), { vacio: String(e.proyecto.alto / 2), ayuda: 'Punto al que mira la cámara al empezar' }),
        ),
      ]),
      seccion('Proyecto', [
        campoTexto('nombre', 'proyecto.nombre', e.proyecto.nombre, (v) => e.renombrarProyecto(v), 'Nombre del juego (sale en el título de la página al exportar)'),
        h('div', { class: 'dos-columnas' },
          campoNumero('ancho', 'proyecto.ancho', e.proyecto.ancho, (v) => e.cambiarAjusteProyecto('ancho', v ?? 960), { min: 64, max: 4096, paso: 16, ayuda: 'Ancho de la pantalla del juego, en píxeles' }),
          campoNumero('alto', 'proyecto.alto', e.proyecto.alto, (v) => e.cambiarAjusteProyecto('alto', v ?? 540), { min: 64, max: 4096, paso: 16, ayuda: 'Alto de la pantalla del juego, en píxeles' }),
        ),
        campoCasilla('píxeles nítidos', 'proyecto.pixelArt', e.proyecto.pixelArt ?? false, (v) => e.cambiarAjusteProyecto('pixelArt', v), 'Dibuja las imágenes pequeñas con píxeles nítidos, sin suavizar'),
        campoCasilla('botones en el móvil', 'proyecto.controlesTactiles', e.proyecto.controlesTactiles ?? true, (v) => e.cambiarAjusteProyecto('controlesTactiles', v), 'En el juego exportado, si se abre en un móvil o una tableta, salen botones en la pantalla con las teclas que usa tu juego'),
        h('p', { class: 'nota' }, 'Colores con nombre: ', NOMBRES_COLORES.filter((c) => c !== 'violeta').join(', '), '.'),
      ]),
      seccion('Datos del juego', [
        listaDeDatos(e.proyecto.datos ?? {}, 'juego', 'juego', (n, v) => e.cambiarDatoJuego(n, v),
          'Datos que comparten todos los scripts (puntos, vidas, nivel...). En el código: juego.puntos', '+ Nuevo dato'),
      ], { ayuda: 'Los valores con los que empieza juego. Se pueden leer y cambiar desde cualquier script' }),
    ];
  }

  /** La sección de un control de interfaz: lo que tiene cada tipo. */
  private seccionControl(def: DefObjeto, c: DefControl, s: DefSprite, cambiar: (ruta: string) => (v: unknown) => void, largo: { empezar: () => void; terminar: () => void }): HTMLElement {
    const t = c.tipo;
    const conNumero = t === 'barra' || t === 'deslizador' || t === 'icono';
    const conTexto = t === 'boton' || t === 'casilla' || t === 'barra' || t === 'icono';
    const lineas = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);
    const opciones = h('textarea', { class: 'campo', rows: '4', spellcheck: 'false', 'data-ruta': 'control.opciones', 'aria-label': 'Opciones, una por línea', onchange: () => cambiar('control.opciones')(lineas(opciones.value).slice(0, 200)) }, (c.opciones ?? []).join('\n'));
    return seccion(`Control: ${NOMBRES_CONTROLES[t]}`, [
      h('p', { class: 'nota' }, CONTROLES_NUEVOS[t].ayuda),
      conTexto ? campoTexto(t === 'icono' ? 'delante' : 'texto', 'sprite.texto', s.texto, (v) => cambiar('sprite.texto')(v || undefined), t === 'barra' ? 'Un texto encima de la barra. Entre llaves, un dato: {yo.valor} / {yo.maximo}' : t === 'icono' ? 'Lo que va delante del número: × o nada' : 'Lo que pone') : null,
      t === 'campo' ? campoTexto('pista', 'control.pista', c.pista, (v) => cambiar('control.pista')(v || undefined), 'Lo que se ve en gris cuando está vacío') : null,
      t === 'campo' ? campoNumero('letras', 'control.largoMaximo', c.largoMaximo ?? 20, (v) => cambiar('control.largoMaximo')(v), { ...largo, min: 1, max: 500, ayuda: 'Cuántas letras caben como mucho' }) : null,
      conNumero ? h('div', { class: 'dos-columnas' },
        campoNumero('valor', 'control.valor', c.valor ?? 0, (v) => cambiar('control.valor')(v), { ...largo, ayuda: 'Con cuánto empieza' }),
        t === 'icono' ? null : campoNumero('máximo', 'control.maximo', c.maximo ?? 100, (v) => cambiar('control.maximo')(v), { ...largo }),
      ) : null,
      t === 'deslizador' ? h('div', { class: 'dos-columnas' },
        campoNumero('mínimo', 'control.minimo', c.minimo ?? 0, (v) => cambiar('control.minimo')(v || undefined), { ...largo }),
        campoNumero('paso', 'control.paso', c.paso ?? 1, (v) => cambiar('control.paso')(v), { ...largo, min: 0, ayuda: 'De cuánto en cuánto se mueve (0 = suave)' }),
      ) : null,
      conNumero || t === 'casilla' ? campoTexto('dato', 'control.dato', c.dato, (v) => cambiar('control.dato')(v.trim() || undefined), 'Un dato que se lee SOLO mientras juegas, sin código: juego.vida, juego.monedas...', 'juego.vida') : null,
      t === 'casilla' ? campoCasilla('marcada', 'control.marcada', c.marcada ?? false, (v) => cambiar('control.marcada')(v || undefined), 'Si empieza marcada') : null,
      t === 'lista' || t === 'menu' ? h('label', { class: 'campo-fila', title: 'Las opciones, una en cada línea' }, h('span', { class: 'campo-etiqueta' }, 'opciones'), opciones) : null,
      t === 'lista' || t === 'menu' ? campoNumero('elegida', 'control.elegido', c.elegido ?? 0, (v) => cambiar('control.elegido')(v || undefined), { ...largo, min: 0, max: (c.opciones ?? []).length, ayuda: 'La que está elegida al empezar (1 = la primera, 0 = ninguna)' }) : null,
      t === 'ventana' ? campoTexto('título', 'control.titulo', c.titulo, (v) => cambiar('control.titulo')(v || undefined)) : null,
      t === 'ventana' ? campoCasilla('se arrastra', 'control.arrastrable', c.arrastrable ?? false, (v) => cambiar('control.arrastrable')(v || undefined), 'Se puede mover cogiéndola por la barra del título') : null,
      t === 'ventana' ? campoCasilla('botón de cerrar', 'control.conCerrar', c.conCerrar ?? false, (v) => cambiar('control.conCerrar')(v || undefined), 'Una X para cerrarla (desde el código: yo.cerrar() y yo.abrir())') : null,
      t === 'ventana' ? h('p', { class: 'nota' }, 'Para meter cosas dentro: en el script de cada cosa, cuando empieza: yo.pegarA(buscar("' + (def.nombre ?? 'Ventana') + '")). Se mueven, se abren y se cierran con ella.') : null,
      t === 'inventario' ? h('div', { class: 'dos-columnas' },
        campoNumero('columnas', 'control.columnas', c.columnas ?? 4, (v) => cambiar('control.columnas')(v), { ...largo, min: 1, max: 20 }),
        campoNumero('filas', 'control.filas', c.filas ?? 2, (v) => cambiar('control.filas')(v), { ...largo, min: 1, max: Math.floor(100 / (c.columnas ?? 4)) }),
      ) : null,
      t === 'minimapa' ? campoTexto('centro', 'control.seguir', c.seguir, (v) => cambiar('control.seguir')(v.trim() || undefined), 'El objeto que va siempre en el centro (su nombre). Vacío: se ve el mundo entero', 'Jugador') : null,
      t === 'minimapa' && c.seguir ? campoNumero('alcance', 'control.alcance', c.alcance ?? 2000, (v) => cambiar('control.alcance')(v), { ...largo, min: 50, paso: 100, ayuda: 'Cuántos píxeles del mundo se ven a lo ancho' }) : null,
      t === 'boton' || t === 'minimapa' ? null : campoColor('fondo', 'control.colorFondo', c.colorFondo ?? '#1b2130', (v) => cambiar('control.colorFondo')(v === '#1b2130' ? undefined : v), 'El color de detrás (la barra vacía, el fondo de la lista...)'),
      t === 'deslizador' || t === 'minimapa' ? null : h('div', { class: 'dos-columnas' },
        campoNumero('letra', 'sprite.tamano', s.tamano ?? 24, cambiar('sprite.tamano'), { ...largo, min: 4, ayuda: 'Tamaño de la letra' }),
        campoColor('color', 'sprite.colorTexto', s.colorTexto ?? 'blanco', cambiar('sprite.colorTexto'), 'Color de la letra'),
      ),
      t === 'deslizador' || t === 'minimapa' ? null : campoLista('tipo de letra', 'sprite.letra', s.letra ?? 'normal', [...LETRAS, ...Object.keys(this.estado.proyecto.letras ?? {})].map((l): [string, string] => [l, NOMBRES_LETRAS[l] ?? l]), (v) => cambiar('sprite.letra')(v === 'normal' ? undefined : v)),
      campoCasilla('activado', 'control.activado', c.activado ?? true, (v) => cambiar('control.activado')(v ? undefined : false), 'Si no está activado se ve apagado y no se puede usar (desde el código: yo.activado = falso)'),
    ], { ayuda: 'Lo que hace que este objeto sea un control de interfaz' });
  }

  /** En la cámara de la escena: varios jugadores, con la pantalla dividida o compartida. */
  private camposJugadores(esc: DefEscena, nombres: string[]): (HTMLElement | null)[] {
    const e = this.estado;
    const j = esc.camara?.jugadores;
    const cuantos = j ? Math.max(2, j.seguir.length) : 1;
    const poner = (nuevo: NonNullable<NonNullable<DefEscena['camara']>['jugadores']> | undefined) => e.cambiarEscenaPropiedad('camara.jugadores', nuevo);
    /** Los objetos que maneja cada jugador (los que tienen el comportamiento «lo maneja un jugador»), para proponerlos. */
    const deJugador = (n: number) => esc.objetos.find((o) => o.comportamiento?.tipo === 'jugador' && (o.comportamiento.jugador ?? 1) === n)?.nombre ?? nombres[n - 1] ?? '';
    const modo = j ? `${j.modo}:${cuantos}` : '';
    return [
      campoLista('jugadores', 'camara.jugadores', modo, [
        ['', 'Un jugador (o todos en la misma pantalla quieta)'],
        ['dividida:2', '2 jugadores, pantalla dividida'], ['dividida:3', '3 jugadores, pantalla dividida'], ['dividida:4', '4 jugadores, pantalla dividida'],
        ['compartida:2', '2 jugadores, pantalla compartida'], ['compartida:3', '3 jugadores, pantalla compartida'], ['compartida:4', '4 jugadores, pantalla compartida'],
      ], (v) => {
        if (!v) return poner(undefined);
        const [m, n] = v.split(':');
        poner({ modo: m as 'dividida' | 'compartida', seguir: Array.from({ length: Number(n) }, (_, i) => j?.seguir[i] || deJugador(i + 1)), ...(j?.division ? { division: j.division } : {}) });
      }, 'Dividida: un trozo de pantalla para cada jugador, con su cámara. Compartida: una sola cámara que se aleja para que se vean todos'),
      ...(j ? j.seguir.map((nombre, i) =>
        campoLista(`jugador ${i + 1}`, `camara.jugador${i + 1}`, nombre, [['', '(nadie)'], ...nombres.map((n): [string, string] => [n, n])], (v) => poner({ ...j, seguir: j.seguir.map((x, k) => (k === i ? v : x)) }), j.modo === 'dividida' ? `El objeto al que sigue la cámara del trozo ${i + 1}` : 'Uno de los objetos que la cámara mantiene a la vista'),
      ) : []),
      j?.modo === 'dividida' && cuantos === 2
        ? campoLista('se divide en', 'camara.division', j.division ?? 'columnas', [['columnas', 'Columnas (lado a lado)'], ['filas', 'Filas (uno encima de otro)']], (v) => poner({ modo: j.modo, seguir: j.seguir, ...(v === 'filas' ? { division: 'filas' as const } : {}) }))
        : null,
      j ? h('p', { class: 'nota' }, 'Para que cada jugador mueva lo suyo sin código: en cada objeto, Comportamiento > «Lo maneja un jugador».') : null,
    ];
  }
}

/**
 * Una lista de datos con su valor inicial (número, texto o verdadero/falso),
 * para las propiedades propias de un objeto (yo.vida) y los datos del juego (juego.puntos).
 */
function listaDeDatos(
  datos: Record<string, DatoInicial>,
  ruta: string,
  prefijo: 'yo' | 'juego',
  alCambiar: (nombre: string, valor: DatoInicial | undefined) => void,
  explicacion: string,
  textoNuevo: string,
): HTMLElement {
  const filas = Object.entries(datos).map(([nombre, valor]) => {
    const tipo = typeof valor;
    const control =
      tipo === 'boolean'
        ? h('input', { type: 'checkbox', checked: valor, 'data-ruta': `${ruta}.${nombre}`, onchange: (ev: Event) => alCambiar(nombre, (ev.target as HTMLInputElement).checked) })
        : h('input', { class: 'campo', type: tipo === 'number' ? 'number' : 'text', value: String(valor), 'data-ruta': `${ruta}.${nombre}`, onchange: (ev: Event) => {
            const t = (ev.target as HTMLInputElement).value;
            alCambiar(nombre, tipo === 'number' ? Number(t.replace(',', '.')) || 0 : t);
          } });
    return h('div', { class: 'propiedad-propia' },
      h('code', { title: `En el código: ${prefijo}.${nombre}` }, nombre),
      control,
      botonIcono('cerrar', `Quitar "${nombre}"`, () => alCambiar(nombre, undefined), undefined, 'pequeno'),
    );
  });
  const nueva = h('button', { class: 'boton-enlace', 'data-ruta': `${ruta}.nuevo`, onclick: async () => {
    const n = await pedirTexto('Nuevo dato', `Nombre (por ejemplo: vida, puntos, nivel). En el código será ${prefijo}.vida`);
    if (!n) return;
    const limpio = n.trim().replace(/\s+/g, '_');
    if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(limpio)) return notificar('Un nombre empieza por una letra y solo lleva letras, números y _', 'error');
    const valor = await pedirTexto('Valor inicial', `Valor con el que empieza ${limpio} (un número, un texto, verdadero o falso)`, '0');
    if (valor === null) return;
    alCambiar(limpio, leerDatoInicial(valor));
  } }, textoNuevo);
  return h('div', {},
    filas.length ? h('div', { class: 'lista-propiedades' }, filas) : h('p', { class: 'nota' }, explicacion),
    nueva,
  );
}
