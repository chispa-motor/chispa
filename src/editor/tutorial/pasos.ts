/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS PASOS DEL TUTORIAL «Tu primer juego».
 *
 * Cada paso dice QUÉ hacer, DÓNDE (el elemento que se resalta) y CÓMO SABER
 * QUE YA ESTÁ HECHO (mirando el proyecto, no los clics). Así da igual cómo lo
 * haga la persona: con el botón, con un atajo o deshaciendo y volviendo a
 * hacer. El tutorial avanza solo en cuanto el paso está hecho.
 *
 * Al final hay un juego pequeño: un Jugador que anda y salta sobre un suelo
 * pintado, una Moneda que se coge y un marcador de puntos.
 *
 * DECISIÓN: cada paso tiene un «Hazlo por mí» que hace exactamente lo que se
 * pide. Sirve si alguien se atasca y, además, los tests recorren el tutorial
 * entero con él para comprobar que los pasos encajan unos con otros.
 */
import type { DefObjeto } from '../../proyecto/formato';
import type { EstadoEditor, RefObjeto } from '../estado/EstadoEditor';
import { normalizar } from '../../utilidades/texto';

/** Lo que el tutorial necesita del editor. */
export interface ContextoTutorial {
  estado: EstadoEditor;
  herramienta(): string;
  ponerHerramienta(h: 'mover' | 'pincel' | 'goma'): void;
  /** Añade un objeto como el botón del panel (en el centro de la vista). */
  anadir(tipo: 'rectangulo' | 'circulo' | 'texto' | 'mapa'): void;
  juegoEnMarcha(): boolean;
  ejecutar(): void;
  datoDelJuego(nombre: string): unknown;
  /** Cambia el código de un script (y lo que se ve en el editor de código). */
  escribirCodigo(archivo: string, codigo: string): void;
  /** ¿Hay errores en el código? */
  hayErrores(): boolean;
}

/** Lo que un paso quiere recordar (por ejemplo, dónde estaba la moneda al empezar el paso). */
export type Memoria = Record<string, unknown>;

export interface PasoTutorial {
  titulo: string;
  /** El texto de la burbuja. Lo que va entre **asteriscos** sale en negrita. */
  texto: string;
  /** Código para copiar (se enseña en la burbuja). */
  codigo?: string;
  /** Qué se resalta. null = nada (la burbuja sale en el centro). */
  objetivo?: (raiz: ParentNode) => Element | null;
  /** Se hace al empezar el paso (por ejemplo, seleccionar el objeto del que se habla). */
  alEmpezar?: (c: ContextoTutorial, m: Memoria) => void;
  /** ¿Ya está hecho? Si no tiene, el paso se pasa con el botón «Siguiente». */
  hecho?: (c: ContextoTutorial, m: Memoria) => boolean;
  hazloPorMi?: (c: ContextoTutorial, m: Memoria) => void;
  /** Texto del botón de «Hazlo por mí» (por ejemplo, «Escríbelo por mí»). */
  textoHazlo?: string;
  /** Enseñar también el botón «Siguiente» (para pasos que se pueden saltar). */
  siguiente?: boolean;
  /** Si lo resaltado es grande (la escena, el código), en qué esquina va la burbuja. Por defecto, arriba. */
  esquina?: 'arriba' | 'abajo';
}

export const CODIGO_JUGADOR = [
  'cuando empieza:',
  '    juego.puntos = 0',
  '',
  'cuando cada fotograma:',
  '    yo.moverConFlechas(300)',
  '',
  'cuando se pulsa "espacio", "arriba":',
  '    yo.saltar(700)',
  '',
  'cuando toco Moneda:',
  '    destruir(otro)',
  '    juego.puntos += 1',
  '',
].join('\n');

// ═════════════════════════ Ayudas para buscar cosas ═════════════════════════

function indiceDe(e: EstadoEditor, fn: (o: DefObjeto) => boolean): number {
  return e.escena.objetos.findIndex(fn);
}
const llamado = (nombre: string) => (o: DefObjeto) => normalizar(o.nombre ?? '') === normalizar(nombre);
const esCuadrado = (o: DefObjeto) => o.sprite?.forma === 'rectangulo' && !o.sprite.texto;
const esCirculo = (o: DefObjeto) => o.sprite?.forma === 'circulo';
const esTexto = (o: DefObjeto) => o.sprite?.forma === 'texto';

function objeto(e: EstadoEditor, fn: (o: DefObjeto) => boolean): DefObjeto | undefined {
  return e.escena.objetos.find(fn);
}
function ref(e: EstadoEditor, indice: number): RefObjeto {
  return { tipo: 'escena', escena: e.escenaActual, indice };
}
/** Selecciona el primer objeto que cumpla la condición (si no está ya seleccionado). */
function seleccionarSi(e: EstadoEditor, fn: (o: DefObjeto) => boolean): void {
  const i = indiceDe(e, fn);
  if (i >= 0 && !(e.seleccionado && fn(e.seleccionado))) e.seleccionarIndice(i);
}

/** Un botón de «Añadir» del panel izquierdo. */
const botonAnadir = (texto: string) => (r: ParentNode) => r.querySelector(`.botones-anadir button[title^="Añadir: ${texto}"]`);
/** Una sección del inspector (y su interruptor). */
function seccionInspector(r: ParentNode, titulo: string): HTMLElement | null {
  for (const d of r.querySelectorAll<HTMLElement>('.inspector details.seccion')) {
    if (d.querySelector('.seccion-titulo')?.textContent === titulo) return d;
  }
  return null;
}
/** Una fila de la lista de objetos. */
function filaObjeto(r: ParentNode, nombre: string): Element | null {
  for (const n of r.querySelectorAll('.arbol .nodo:not(.hijo)')) if (n.querySelector('.nombre')?.textContent === nombre) return n;
  return null;
}

// ═════════════════════════ Los pasos ═════════════════════════

export const PASOS_TUTORIAL: PasoTutorial[] = [
  {
    titulo: 'Tu primer juego',
    texto: 'Vamos a hacer un juego pequeño: un personaje que anda y salta por un suelo y coge una moneda. Lo haces tú; yo te digo **dónde hacer clic** en cada momento. Son unos 5 minutos.',
    siguiente: true,
  },
  {
    titulo: 'El jugador',
    texto: 'Todo lo que hay en un juego es un **objeto**. Añade un cuadrado: será tu jugador.',
    objetivo: botonAnadir('Cuadrado'),
    hecho: (c) => !!objeto(c.estado, esCuadrado),
    hazloPorMi: (c) => c.anadir('rectangulo'),
  },
  {
    titulo: 'Ponle nombre',
    texto: 'En **Propiedades**, cambia su nombre: escribe **Jugador** y pulsa Intro. Con ese nombre lo encontrarás en el código.',
    objetivo: (r) => r.querySelector('.inspector .nombre-objeto'),
    alEmpezar: (c) => seleccionarSi(c.estado, esCuadrado),
    hecho: (c) => !!objeto(c.estado, llamado('Jugador')),
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, esCuadrado);
      if (i >= 0) c.estado.renombrar(ref(c.estado, i), 'Jugador');
    },
  },
  {
    titulo: 'Que caiga',
    texto: 'Activa la **Física** del Jugador (el interruptor de la derecha). Con física, cae, choca y puede saltar.',
    objetivo: (r) => seccionInspector(r, 'Física')?.querySelector('.interruptor') ?? null,
    alEmpezar: (c) => seleccionarSi(c.estado, llamado('Jugador')),
    hecho: (c) => !!objeto(c.estado, llamado('Jugador'))?.fisica,
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, llamado('Jugador'));
      if (i < 0) return;
      c.estado.activarComponente(ref(c.estado, i), 'fisica', true);
      if (!c.estado.escena.objetos[i].colision) c.estado.activarComponente(ref(c.estado, i), 'colision', true);
    },
  },
  {
    titulo: 'Un suelo',
    texto: 'Sin suelo, el jugador caería para siempre. Añade un **mapa de casillas**: una rejilla donde se pintan suelos y paredes.',
    objetivo: botonAnadir('Mapa'),
    hecho: (c) => !!objeto(c.estado, (o) => !!o.mapa),
    hazloPorMi: (c) => c.anadir('mapa'),
  },
  {
    titulo: 'Pinta el suelo',
    texto: 'Ya tienes el **pincel**. Mantén pulsada la tecla **Mayús** y arrastra por la parte de abajo de la pantalla del juego (el rectángulo de puntos), de lado a lado. Se pinta un rectángulo entero.',
    objetivo: (r) => r.querySelector('.lienzo-escena'),
    alEmpezar: (c) => {
      seleccionarSi(c.estado, (o) => !!o.mapa);
      if (c.herramienta() === 'mover') c.ponerHerramienta('pincel');
    },
    hecho: (c) => Object.keys(objeto(c.estado, (o) => !!o.mapa)?.mapa?.celdas ?? {}).length >= 6,
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, (o) => !!o.mapa);
      if (i >= 0) c.estado.pintarRectangulo(ref(c.estado, i), 0, 0, 19, 0, Object.keys(c.estado.escena.objetos[i].mapa!.tipos)[0]);
    },
  },
  {
    titulo: 'Vuelve a la flecha',
    texto: 'Para seguir colocando cosas, vuelve a la herramienta **Mover** (la flecha de la barra, o la tecla V).',
    objetivo: (r) => r.querySelector('.barra-escena button[title^="Mover y seleccionar"]'),
    hecho: (c) => c.herramienta() === 'mover',
    hazloPorMi: (c) => c.ponerHerramienta('mover'),
  },
  {
    titulo: 'Una moneda',
    texto: 'Añade un **círculo**: será la moneda que hay que coger.',
    objetivo: botonAnadir('Círculo'),
    hecho: (c) => !!objeto(c.estado, esCirculo),
    hazloPorMi: (c) => c.anadir('circulo'),
  },
  {
    titulo: 'Llámala Moneda',
    texto: 'Cámbiale el nombre: escribe **Moneda** y pulsa Intro.',
    objetivo: (r) => r.querySelector('.inspector .nombre-objeto'),
    alEmpezar: (c) => seleccionarSi(c.estado, esCirculo),
    hecho: (c) => !!objeto(c.estado, llamado('Moneda')),
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, esCirculo);
      if (i >= 0) c.estado.renombrar(ref(c.estado, i), 'Moneda');
    },
  },
  {
    titulo: 'Que se pueda atravesar',
    texto: 'Una moneda no es una pared: en **Colisión**, quita la marca de **sólido**. Así el jugador la atraviesa, pero el juego sabe cuándo la toca.',
    objetivo: (r) => r.querySelector('.inspector [data-ruta="colision.solido"]')?.closest('.campo-fila') ?? null,
    alEmpezar: (c) => seleccionarSi(c.estado, llamado('Moneda')),
    hecho: (c) => objeto(c.estado, llamado('Moneda'))?.colision?.solido === false,
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, llamado('Moneda'));
      if (i >= 0) c.estado.cambiarPropiedad(ref(c.estado, i), 'colision.solido', false);
    },
  },
  {
    titulo: 'Colócala',
    texto: '**Arrastra** la moneda con el ratón a donde quieras: un poco por encima del suelo y a un lado del jugador, para cogerla de un salto.',
    objetivo: (r) => r.querySelector('.lienzo-escena'),
    alEmpezar: (c, m) => {
      const o = objeto(c.estado, llamado('Moneda'));
      m.moneda = o ? `${o.x},${o.y}` : '';
    },
    hecho: (c, m) => {
      const o = objeto(c.estado, llamado('Moneda'));
      return !!o && `${o.x},${o.y}` !== m.moneda;
    },
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, llamado('Moneda'));
      const j = objeto(c.estado, llamado('Jugador'));
      if (i >= 0) c.estado.moverObjeto(ref(c.estado, i), (j?.x ?? 480) + 192, 128);
    },
    siguiente: true,
  },
  {
    titulo: 'Ahora, el código',
    texto: 'Lo que hace cada objeto se escribe en su **script**. Selecciona al **Jugador** en la lista de objetos.',
    objetivo: (r) => filaObjeto(r, 'Jugador'),
    hecho: (c) => !!c.estado.seleccionado && llamado('Jugador')(c.estado.seleccionado),
    hazloPorMi: (c) => seleccionarSi(c.estado, llamado('Jugador')),
  },
  {
    titulo: 'Su script',
    texto: 'Pulsa **Crear script**: se abre el editor de código con un script para el Jugador.',
    objetivo: (r) => seccionInspector(r, 'Script')?.querySelector('button.principal') ?? null,
    alEmpezar: (c) => seleccionarSi(c.estado, llamado('Jugador')),
    hecho: (c) => {
      const s = objeto(c.estado, llamado('Jugador'))?.script;
      return !!s && s in c.estado.proyecto.scripts;
    },
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, llamado('Jugador'));
      if (i >= 0) c.estado.crearScriptPara(ref(c.estado, i));
    },
  },
  {
    titulo: 'Escribe el código',
    texto: 'Borra lo que hay y escribe esto. Cada «cuando» es algo que pasa en el juego; lo de debajo (con sangría) es lo que se hace entonces. Mientras escribes, te sugiero palabras: acepta con Intro o Tab.',
    codigo: CODIGO_JUGADOR,
    objetivo: (r) => r.querySelector('.zona-codigo .caja-script:not([style*="none"]) .cm-editor') ?? r.querySelector('.zona-codigo'),
    alEmpezar: (c) => {
      const s = objeto(c.estado, llamado('Jugador'))?.script;
      if (s && c.estado.pestanaActiva !== s) c.estado.abrirScript(s);
    },
    hecho: (c) => {
      const s = objeto(c.estado, llamado('Jugador'))?.script;
      const codigo = normalizar(s ? c.estado.proyecto.scripts[s] ?? '' : '').replace(/\s+/g, ' ');
      const piezas = ['moverconflechas', 'saltar', 'cuando toco moneda', 'juego.puntos += 1'];
      return piezas.every((p) => codigo.includes(p)) && !c.hayErrores();
    },
    hazloPorMi: (c) => {
      const s = objeto(c.estado, llamado('Jugador'))?.script;
      if (s) c.escribirCodigo(s, CODIGO_JUGADOR);
    },
    textoHazlo: 'Escríbelo por mí',
    esquina: 'abajo', // arriba a la izquierda es donde se escribe
  },
  {
    titulo: 'Vuelve a la escena',
    texto: 'Haz clic en la pestaña **Escena**, arriba, para volver a ver tus objetos.',
    objetivo: (r) => r.querySelector('.pestanas-centro .pestana'),
    hecho: (c) => c.estado.pestanaActiva === 'escena',
    hazloPorMi: (c) => c.estado.activarPestana('escena'),
  },
  {
    titulo: 'Un marcador',
    texto: 'Añade un **texto**: enseñará los puntos. Los textos nuevos se quedan pegados a la pantalla, arriba a la izquierda.',
    objetivo: botonAnadir('Texto'),
    hecho: (c) => !!objeto(c.estado, esTexto),
    hazloPorMi: (c) => c.anadir('texto'),
  },
  {
    titulo: 'Enséñale los puntos',
    texto: 'En **{ } Enseñar un dato…**, elige **juego.puntos**. El texto se actualizará solo mientras juegas, sin escribir nada de código.',
    objetivo: (r) => r.querySelector('.inspector .menu-datos'),
    alEmpezar: (c) => seleccionarSi(c.estado, esTexto),
    hecho: (c) => /\{\s*juego\.puntos\s*\}/.test(objeto(c.estado, esTexto)?.sprite?.texto ?? ''),
    hazloPorMi: (c) => {
      const i = indiceDe(c.estado, esTexto);
      if (i >= 0) c.estado.cambiarPropiedad(ref(c.estado, i), 'sprite.texto', 'Puntos: {juego.puntos}');
    },
  },
  {
    titulo: '¡A jugar!',
    texto: 'Pulsa **Ejecutar** (o F5). El juego empieza a la derecha.',
    objetivo: (r) => r.querySelector('.controles-juego .ejecutar'),
    hecho: (c) => c.juegoEnMarcha(),
    hazloPorMi: (c) => c.ejecutar(),
  },
  {
    titulo: 'Coge la moneda',
    texto: 'Haz clic en el juego y usa las **flechas** para andar y **espacio** para saltar. Cuando cojas la moneda, el marcador sube.',
    objetivo: (r) => r.querySelector('.vista-juego'),
    hecho: (c) => Number(c.datoDelJuego('puntos') ?? 0) >= 1,
    siguiente: true,
  },
  {
    titulo: '¡Lo has hecho!',
    texto: 'Este juego es **tuyo**. Ideas para seguir: pon más monedas (selecciona una y pulsa Ctrl+D), cambia colores y tamaños en Propiedades, o mira **Guía > Recetas** abajo para aprender a disparar, poner enemigos o cambiar de nivel. Se guarda solo en este navegador; con **Guardar** te lo llevas en un archivo, y con **Exportar** lo publicas.',
    siguiente: true,
  },
];
