/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ESTADO DEL EDITOR: el proyecto que se está editando y todo lo que se le hace.
 *
 * DECISIÓN: aquí NO hay nada de interfaz (ni botones ni HTML). Toda la lógica
 * de "crear objeto", "renombrar", "deshacer"... vive aquí, y la interfaz solo
 * llama a estas funciones y se redibuja cuando el estado avisa de un cambio.
 * Así se puede probar todo con tests, sin navegador.
 *
 * DESHACER / REHACER: antes de cada cambio guardamos una "foto" (el proyecto
 * en JSON). Deshacer = volver a la foto anterior. Es la forma más sencilla y
 * a prueba de fallos (los proyectos son pequeños).
 * El código de los scripts NO entra en este historial: el editor de código
 * tiene su propio deshacer, letra a letra (como en cualquier editor).
 */
import { migrarProyecto, nombresDeSonidos, proyectoVacio, tipoDe, tipoPorNombre, type DatoInicial, type DefEscena, type DefObjeto, type DefProyecto, type DefSprite } from '../../proyecto/formato';
import { FORMAS, FORMAS_DIBUJO, type Forma, type PuntoCamino } from '../../objetos/formas/figuras';
import { combinarFormas, encajarCamino, esFormaCombinable } from '../recursos/operacionesFormas';
import { BIBLIOTECA } from '../biblioteca/biblioteca';
import { CLIMAS } from '../../objetos/Efectos';
import { FILTROS_NORMALES, type Filtros } from '../../motor/Filtros';
import type { ConfigParticulas } from '../../objetos/Particulas';
import type { DefAnimacion } from '../../objetos/componentes/Animador';
import type { TipoCasilla } from '../../objetos/componentes/MapaCasillas';
import { normalizar, quitarTildes } from '../../utilidades/texto';
import { esNombreProhibido, tiene } from '../../utilidades/seguro';
import { problemaDataURL, problemaLetra, type TipoRecurso as TipoRecursoArchivo } from '../../proyecto/archivos';
import { LETRAS, MAXIMO_LETRAS } from '../../motor/Letras';
import type { TipoControl } from '../../objetos/componentes/Control';
import { CONTROLES_NUEVOS } from '../interfaz/controlesNuevos';
import { imagenDeDibujo } from '../../recursos/dibujos';
import { CANCIONES_LISTAS, SONIDOS_LISTOS } from '../../recursos/sonidos';
import { planDePantallas, type PlanPantallas, type TipoPantalla } from '../pantallas/pantallas';
import { completarSonido, type ParamsSonido } from '../../sonido/generador';
import type { DefCancion } from '../../sonido/musica';
import { ErrorMotor } from '../../motor/Errores';
import { esColorValido } from '../../motor/Color';

/** A qué objeto se refiere una selección: uno de una escena, o una plantilla. */
export type RefObjeto = { tipo: 'escena'; escena: string; indice: number } | { tipo: 'plantilla'; nombre: string };

/** Qué ha cambiado (para que cada panel sepa si tiene que redibujarse). */
export type TipoCambio = 'proyecto' | 'seleccion' | 'objetos' | 'escena' | 'recursos' | 'scripts' | 'codigo' | 'historial' | 'archivos';

export type TipoNuevoObjeto = 'rectangulo' | 'circulo' | 'texto' | 'boton' | 'imagen' | 'mapa' | 'vacio' | 'forma';

/** Tamaño (y datos) con los que aparece cada forma nueva. */
const DATOS_FORMA_NUEVA: Partial<Record<Forma, DefSprite>> & Record<string, DefSprite | undefined> = {
  linea: { ancho: 160, alto: 60, grosor: 8 },
  capsula: { ancho: 96, alto: 48 },
  flecha: { ancho: 96, alto: 64 },
  elipse: { ancho: 96, alto: 64 },
  redondeado: { ancho: 96, alto: 64 },
  arco: { ancho: 96, alto: 96 },
  camino: { ancho: 96, alto: 64, puntos: [{ x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }, { x: 0.2, y: 0.5, entrada: { x: 0.5, y: 0.2 } }, { x: -0.2, y: 0.5 }] },
};
for (const f of FORMAS) DATOS_FORMA_NUEVA[f] = { ancho: 64, alto: 64, ...DATOS_FORMA_NUEVA[f] };

/** "Corazón" → "Corazon": el nombre del objeto (sin tildes, como los nombres de Chispa). */
export function nombreDeForma(forma: Forma): string {
  const texto = FORMAS_DIBUJO.find((f) => f.forma === forma)?.texto.split(' ')[0] ?? 'Forma';
  return quitarTildes(texto);
}

const MAXIMO_HISTORIAL = 100;
/** Lo que cada copia de una plantilla tiene suyo. Todo lo demás es igual en todas las copias. */
const CAMPOS_DE_CADA_COPIA = new Set(['nombre', 'tipo', 'plantilla', 'x', 'y']);
const COLORES_NUEVOS = ['#4aa3ff', '#ff6b6b', '#ffd23f', '#5ad17a', '#b57cff', '#ff9f45', '#3ad6c9'];

/** Las funciones de Chispa que reciben el NOMBRE (o el tipo) de un objeto entre comillas. */
const FUNCIONES_CON_NOMBRE_DE_OBJETO = ['buscar', 'buscarTodos', 'contar', 'crear', 'tocando', 'masCercano', 'cercanos', 'atravesar', 'dejarDeAtravesar'];

export class EstadoEditor {
  proyecto: DefProyecto;
  escenaActual: string;
  seleccion: RefObjeto | null = null;
  /**
   * SELECCIÓN MÚLTIPLE: posiciones (en la escena actual) de todos los objetos
   * seleccionados. Con uno solo es [seleccion.indice]. `seleccion` es siempre
   * el último elegido (el que enseña el inspector si solo hay uno).
   */
  seleccionados: number[] = [];
  /** Scripts abiertos en pestañas, y la pestaña activa ('escena' = la vista de la escena). */
  pestanas: string[] = [];
  pestanaActiva = 'escena';
  /** ¿Hay cambios sin guardar? */
  modificado = false;

  private pasado: string[] = [];
  private futuro: string[] = [];
  private oyentes = new Set<(c: TipoCambio) => void>();
  /** Foto guardada al empezar un cambio largo (arrastrar, pintar): se apunta una sola vez al terminar. */
  private fotoPendiente: string | null = null;
  private colorSiguiente = 0;

  constructor(proyecto: DefProyecto = proyectoVacio()) {
    this.proyecto = migrarProyecto(proyecto);
    this.escenaActual = this.proyecto.escenaInicial;
  }

  // ═════════════════════════ Avisos de cambios ═════════════════════════

  alCambiar(fn: (c: TipoCambio) => void): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  private avisar(c: TipoCambio): void {
    for (const fn of this.oyentes) fn(c);
  }

  // ═════════════════════════ Deshacer / rehacer ═════════════════════════

  /** Hace un cambio que se puede deshacer. */
  cambiar(tipo: TipoCambio, fn: () => void): void {
    const foto = this.fotoPendiente ?? JSON.stringify(this.proyecto);
    fn();
    if (this.fotoPendiente === null) this.apuntar(foto);
    this.modificado = true;
    this.avisar(tipo);
  }

  /** Para cambios que duran (arrastrar un objeto, pintar casillas): se deshacen de una vez. */
  empezarCambioLargo(): void {
    this.fotoPendiente = JSON.stringify(this.proyecto);
  }
  terminarCambioLargo(): void {
    if (this.fotoPendiente === null) return;
    if (this.fotoPendiente !== JSON.stringify(this.proyecto)) this.apuntar(this.fotoPendiente);
    this.fotoPendiente = null;
  }

  private apuntar(foto: string): void {
    this.pasado.push(foto);
    if (this.pasado.length > MAXIMO_HISTORIAL) this.pasado.shift();
    this.futuro = [];
    this.avisar('historial');
  }

  get puedeDeshacer(): boolean {
    return this.pasado.length > 0;
  }
  get puedeRehacer(): boolean {
    return this.futuro.length > 0;
  }

  deshacer(): void {
    const foto = this.pasado.pop();
    if (!foto) return;
    this.futuro.push(JSON.stringify(this.proyecto));
    this.restaurar(foto);
  }

  rehacer(): void {
    const foto = this.futuro.pop();
    if (!foto) return;
    this.pasado.push(JSON.stringify(this.proyecto));
    this.restaurar(foto);
  }

  private restaurar(foto: string): void {
    this.proyecto = JSON.parse(foto);
    if (!this.proyecto.escenas[this.escenaActual]) this.escenaActual = this.proyecto.escenaInicial;
    if (this.seleccion && !this.definicion(this.seleccion)) this.seleccion = null;
    this.seleccionados = this.seleccionados.filter((i) => i < this.escena.objetos.length);
    if (this.seleccion?.tipo !== 'escena') this.seleccionados = [];
    this.pestanas = this.pestanas.filter((p) => tiene(this.proyecto.scripts, p));
    if (this.pestanaActiva !== 'escena' && !(tiene(this.proyecto.scripts, this.pestanaActiva))) this.pestanaActiva = 'escena';
    this.modificado = true;
    this.avisar('proyecto');
  }

  // ═════════════════════════ Proyecto entero ═════════════════════════

  /** Abre otro proyecto (borra el historial). */
  abrir(datos: unknown): void {
    this.proyecto = migrarProyecto(datos);
    this.escenaActual = this.proyecto.escenaInicial;
    this.seleccion = null;
    this.seleccionados = [];
    this.pestanas = [];
    this.pestanaActiva = 'escena';
    this.pasado = [];
    this.futuro = [];
    this.modificado = false;
    this.avisar('proyecto');
  }

  aJSON(): string {
    return JSON.stringify(this.proyecto, null, 2);
  }

  marcarGuardado(): void {
    this.modificado = false;
    this.avisar('historial');
  }

  renombrarProyecto(nombre: string): void {
    const n = nombre.trim();
    if (!n || esNombreProhibido(n)) return;
    this.cambiar('proyecto', () => (this.proyecto.nombre = n));
  }

  /** Tamaño de la pantalla del juego y pixel art. */
  cambiarAjusteProyecto(ajuste: 'ancho' | 'alto' | 'pixelArt' | 'controlesTactiles' | 'pantallaDeCarga', valor: number | boolean): void {
    this.cambiar('proyecto', () => {
      // La pantalla de carga solo se apunta si se quita (lo normal es que esté)
      if (ajuste === 'pantallaDeCarga') {
        if (valor) delete this.proyecto.pantallaDeCarga;
        else this.proyecto.pantallaDeCarga = false;
      } else if (ajuste === 'pixelArt' || ajuste === 'controlesTactiles') this.proyecto[ajuste] = Boolean(valor);
      else this.proyecto[ajuste] = Math.max(64, Math.min(4096, Math.round(Number(valor) || 0)));
    });
  }

  /**
   * Los ajustes del juego para móviles: cómo hay que tener el aparato, la calidad con la que empieza y el
   * límite de fotogramas. Lo normal (da igual, automática, sin límite) no se apunta en el proyecto.
   */
  cambiarAjusteMovil(ajuste: 'orientacion' | 'calidad' | 'maximoFps', valor: string | number): void {
    this.cambiar('proyecto', () => {
      const p = this.proyecto;
      if (ajuste === 'orientacion') {
        if (valor === 'horizontal' || valor === 'vertical') p.orientacion = valor;
        else delete p.orientacion;
      } else if (ajuste === 'calidad') {
        if (valor === 'alta' || valor === 'media' || valor === 'baja' || valor === 'minima') p.calidad = valor;
        else delete p.calidad;
      } else {
        const n = Math.round(Number(valor) || 0);
        if (n >= 15 && n <= 240) p.maximoFps = n;
        else delete p.maximoFps;
      }
    });
  }

  /** El icono del juego: una de las imágenes del proyecto (null o un nombre que no existe = sin icono). */
  ponerIcono(nombre: string | null): void {
    const vale = !!nombre && tiene(this.proyecto.imagenes, nombre);
    if (!vale && !this.proyecto.icono) return;
    this.cambiar('proyecto', () => {
      if (vale) this.proyecto.icono = nombre!;
      else delete this.proyecto.icono;
    });
  }

  /** Un dato de «Datos del juego» (con qué empieza juego.puntos...). `undefined` lo quita. */
  cambiarDatoJuego(nombre: string, valor: DatoInicial | undefined): void {
    const n = nombre.trim();
    if (!n || esNombreProhibido(n)) return;
    this.cambiar('proyecto', () => {
      const datos = (this.proyecto.datos ??= {});
      if (valor === undefined) delete datos[n];
      else datos[n] = valor;
    });
  }

  /**
   * Une las formas seleccionadas en una (o le resta a la primera las demás).
   * Las originales se quitan y se selecciona la nueva. Devuelve falso si no
   * se puede (menos de dos formas, o no queda nada).
   */
  combinarFormas(modo: 'unir' | 'restar'): boolean {
    const indices = this.indicesSeleccionados().filter((i) => esFormaCombinable(this.escena.objetos[i]));
    if (indices.length < 2) return false;
    const defs = indices.map((i) => this.escena.objetos[i]);
    const nueva = combinarFormas(defs, modo);
    if (!nueva) return false;
    let indice = -1;
    this.cambiar('objetos', () => {
      const quitar = new Set(indices);
      const quedan = this.escena.objetos.filter((_, i) => !quitar.has(i));
      const nombre = this.nombreLibre(modo === 'unir' ? 'Union' : 'Recorte', quedan.map((o) => o.nombre ?? ''));
      this.escena.objetos = [...quedan, { nombre, ...nueva }];
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return true;
  }

  /** El camino de la pluma de una forma (la convierte en camino, encajado en su objeto). */
  cambiarCamino(ref: RefObjeto, puntos: PuntoCamino[], cerrado: boolean): void {
    const def = this.definicion(ref);
    if (!def?.sprite || puntos.length < 2) return;
    const e = encajarCamino(puntos, cerrado, def.sprite.ancho ?? 64, def.sprite.alto ?? 64);
    this.cambiarObjeto(ref, 'objetos', () => {
      const s = def.sprite!;
      s.forma = 'camino';
      s.puntos = e.puntos;
      s.ancho = e.ancho;
      s.alto = e.alto;
      delete s.figuras;
      delete s.imagen;
      if (cerrado) delete s.cerrado;
      else s.cerrado = false;
      if (ref.tipo === 'escena') {
        def.x = (def.x ?? 0) + e.dx;
        def.y = (def.y ?? 0) + e.dy;
      }
    });
  }

  /**
   * Convierte una forma en una imagen (un sprite): la dibuja en un PNG, lo
   * guarda en Imágenes y el objeto pasa a usarlo. Sigue chocando con su forma.
   */
  convertirEnImagen(ref: RefObjeto, png: string): string | null {
    const def = this.definicion(ref);
    if (!def?.sprite || def.sprite.imagen || def.sprite.forma === 'texto') return null;
    comprobarRecurso(png, 'imagen', 'forma');
    const nombre = this.nombreLibre(nombreDeRecurso(def.nombre ?? (ref.tipo === 'plantilla' ? ref.nombre : 'forma')).toLowerCase(), Object.keys(this.proyecto.imagenes));
    this.cambiar('recursos', () => {
      this.proyecto.imagenes[nombre] = png;
      const s = def.sprite!;
      const esFiguraDeVerdad = (s.forma ?? 'rectangulo') !== 'rectangulo';
      // El relleno y el borde ya están en la imagen; la sombra, el resplandor y la mezcla se quedan
      for (const k of ['relleno', 'color2', 'anguloDegradado', 'patron', 'imagenRelleno', 'borde', 'colorBorde', 'bordeDiscontinuo'] as const) delete s[k];
      s.imagen = nombre;
      if (def.colision && esFiguraDeVerdad && !def.colision.forma) def.colision.forma = 'figura';
      this.propagar(ref);
    });
    return nombre;
  }

  /**
   * Pone en la escena un elemento de la biblioteca en (x, y): sus objetos,
   * sus scripts, sus plantillas y los datos de juego que use (si no estaban).
   * Un script que ya existe con el mismo código se comparte; si es distinto,
   * el nuevo se guarda con otro nombre. Devuelve las posiciones de los objetos nuevos.
   */
  insertarDeBiblioteca(id: string, x: number, y: number): number[] {
    const el = BIBLIOTECA.find((b) => b.id === id);
    if (!el) return [];
    const nuevos: number[] = [];
    this.cambiar('objetos', () => {
      const p = this.proyecto;
      const archivos = new Map<string, string>();
      for (const [archivo, codigo] of Object.entries(el.scripts)) {
        if (!tiene(p.scripts, archivo)) p.scripts[archivo] = codigo;
        else if (p.scripts[archivo] !== codigo) {
          const otro = this.nombreLibre(archivo, Object.keys(p.scripts));
          p.scripts[otro] = codigo;
          archivos.set(archivo, otro);
          continue;
        }
        archivos.set(archivo, archivo);
      }
      const conScript = (def: DefObjeto): DefObjeto => {
        const copia = structuredClone(def);
        if (copia.script) copia.script = archivos.get(copia.script) ?? copia.script;
        return copia;
      };
      for (const [nombre, def] of Object.entries(el.plantillas ?? {})) if (!tiene(p.plantillas, nombre)) p.plantillas[nombre] = conScript(def);
      for (const [dato, valor] of Object.entries(el.datos ?? {})) if (!tiene(p.datos ?? {}, dato)) (p.datos ??= {})[dato] = valor;
      for (const def of el.objetos) {
        const o = conScript(def);
        o.nombre = this.nombreLibre(def.nombre ?? 'Objeto');
        if (o.sprite?.fijo) {
          // La interfaz va pegada a la pantalla: los textos de la izquierda, arriba a la izquierda; lo demás, en el centro
          const arribaIzquierda = o.sprite.alinear === 'izquierda';
          o.x = arribaIzquierda ? 20 : Math.round(p.ancho / 2 + (def.x ?? 0));
          o.y = arribaIzquierda ? p.alto - 30 : Math.round(p.alto / 2 + (def.y ?? 0));
        } else {
          o.x = Math.round(x + (def.x ?? 0));
          o.y = Math.round(y + (def.y ?? 0));
        }
        this.escena.objetos.push(o);
        nuevos.push(this.escena.objetos.length - 1);
      }
    });
    if (nuevos.length > 1) this.seleccionarVarios(nuevos);
    else if (nuevos.length === 1) this.seleccionarIndice(nuevos[0]);
    return nuevos;
  }

  /** Guarda un efecto del editor de partículas (si se le cambia el nombre, se quita el de antes y se cambia donde se use). */
  guardarEfecto(nombre: string, config: ConfigParticulas, anterior?: string): string | null {
    const n = nombre.trim();
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ_][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9_ ]{0,39}$/.test(n) || esNombreProhibido(n)) return null;
    const limpio = migrarProyecto({ ...proyectoVacio(), efectos: { [n]: config } }).efectos?.[n];
    if (!limpio) return null;
    this.cambiar('recursos', () => {
      const efectos = (this.proyecto.efectos ??= {});
      if (anterior && anterior !== n && tiene(efectos, anterior)) {
        delete efectos[anterior];
        for (const o of this.todosLosObjetos()) if (o.efecto === anterior) o.efecto = n;
      }
      efectos[n] = limpio;
    });
    return n;
  }

  /** Borra un efecto propio (y se lo quita a los objetos que lo llevaban). */
  borrarEfecto(nombre: string): void {
    if (!tiene(this.proyecto.efectos ?? {}, nombre)) return;
    this.cambiar('recursos', () => {
      delete this.proyecto.efectos![nombre];
      if (!Object.keys(this.proyecto.efectos!).length) delete this.proyecto.efectos;
      for (const o of this.todosLosObjetos()) if (o.efecto === nombre) delete o.efecto;
    });
  }

  /** «Mis colores» del selector de color (se guardan en el proyecto). Como mucho 40, sin repetir. */
  ponerMisColores(colores: string[]): void {
    const lista = [...new Set(colores.map((c) => c.trim()).filter((c) => c && esColorValido(c)))].slice(0, 40);
    this.cambiar('proyecto', () => {
      if (lista.length) this.proyecto.colores = lista;
      else delete this.proyecto.colores;
    });
  }

  // ═════════════════════════ Selección ═════════════════════════

  get escena(): DefEscena {
    return this.proyecto.escenas[this.escenaActual];
  }

  seleccionar(ref: RefObjeto | null): void {
    this.seleccion = ref;
    this.seleccionados = ref?.tipo === 'escena' && ref.escena === this.escenaActual ? [ref.indice] : [];
    this.avisar('seleccion');
  }

  /** Selecciona varios objetos de la escena actual a la vez (rectángulo). */
  seleccionarVarios(indices: number[]): void {
    const validos = [...new Set(indices)].filter((i) => i >= 0 && i < this.escena.objetos.length);
    if (validos.length === 0) return this.seleccionar(null);
    this.seleccion = { tipo: 'escena', escena: this.escenaActual, indice: validos[validos.length - 1] };
    this.seleccionados = validos;
    this.avisar('seleccion');
  }

  /** Ctrl+A: todos los objetos de la escena menos los mapas (casi nunca se quieren mover con lo demás). */
  seleccionarTodo(): void {
    this.seleccionarVarios(this.escena.objetos.flatMap((o, i) => (o.mapa ? [] : [i])));
  }

  /** Ctrl+clic: añade el objeto a la selección, o lo quita si ya estaba. */
  alternarSeleccion(indice: number): void {
    const actuales = this.indicesSeleccionados();
    if (actuales.includes(indice)) this.seleccionarVarios(actuales.filter((i) => i !== indice));
    else this.seleccionarVarios([...actuales, indice]);
  }

  /** Posiciones de los objetos seleccionados en la escena actual (vacío si no hay, o si es una plantilla). */
  indicesSeleccionados(): number[] {
    const s = this.seleccion;
    if (s?.tipo !== 'escena' || s.escena !== this.escenaActual) return [];
    return this.seleccionados.length ? [...this.seleccionados] : [s.indice];
  }

  /** ¿Hay más de un objeto seleccionado? */
  get variosSeleccionados(): boolean {
    return this.indicesSeleccionados().length > 1;
  }

  estaSeleccionado(indice: number): boolean {
    return this.indicesSeleccionados().includes(indice);
  }

  seleccionarIndice(indice: number | null): void {
    this.seleccionar(indice === null ? null : { tipo: 'escena', escena: this.escenaActual, indice });
  }

  /** La definición (JSON) del objeto al que apunta una referencia. */
  definicion(ref: RefObjeto): DefObjeto | null {
    if (ref.tipo === 'plantilla') return this.proyecto.plantillas[ref.nombre] ?? null;
    return this.proyecto.escenas[ref.escena]?.objetos[ref.indice] ?? null;
  }

  get seleccionado(): DefObjeto | null {
    return this.seleccion ? this.definicion(this.seleccion) : null;
  }

  // ═════════════════════════ Objetos ═════════════════════════

  /** Un nombre que no está en uso en la escena: "Cuadrado", "Cuadrado2", "Cuadrado3"... */
  nombreLibre(base: string, usados: string[] = this.escena.objetos.map((o) => o.nombre ?? '')): string {
    // "__proto__" no puede ser el nombre de nada (ver utilidades/seguro.ts)
    base = base.replace(/__proto__/gi, 'proto');
    const ocupados = new Set(usados.map(normalizar));
    if (!ocupados.has(normalizar(base))) return base;
    // "Moneda2" ocupado → "Moneda3" (y no "Moneda22"). Los archivos (.chs) conservan su extensión.
    const extension = /\.[a-z]+$/i.exec(base)?.[0] ?? '';
    const raiz = tipoPorNombre(base.slice(0, base.length - extension.length));
    for (let i = 2; ; i++) if (!ocupados.has(normalizar(`${raiz}${i}${extension}`))) return `${raiz}${i}${extension}`;
  }

  /** Crea un objeto nuevo en la escena actual y lo selecciona. Devuelve su posición en la lista. */
  crearObjeto(tipo: TipoNuevoObjeto, x: number, y: number, imagen?: string, forma: Forma = 'estrella'): number {
    const color = COLORES_NUEVOS[this.colorSiguiente++ % COLORES_NUEVOS.length];
    const base: Record<TipoNuevoObjeto, [string, DefObjeto]> = {
      rectangulo: ['Cuadrado', { sprite: { forma: 'rectangulo', color, ancho: 64, alto: 64 }, colision: {} }],
      circulo: ['Circulo', { sprite: { forma: 'circulo', color, ancho: 64, alto: 64 }, colision: {} }],
      // Los textos nuevos son de INTERFAZ (pegados a la pantalla): casi siempre son vidas, puntos o títulos
      texto: ['Texto', { sprite: { forma: 'texto', texto: 'Texto', tamano: 32, color: 'blanco', ancho: 160, alto: 40, fijo: true, alinear: 'izquierda' } }],
      boton: ['Boton', { sprite: { forma: 'rectangulo', color: '#3b82f6', ancho: 180, alto: 56, texto: 'Boton', tamano: 24, fijo: true }, control: { tipo: 'boton' } }],
      // El objeto se llama como su imagen, con mayúscula (como los demás: Cuadrado, Texto...): «gema» → «Gema»
      imagen: [imagen ? imagen.charAt(0).toUpperCase() + imagen.slice(1) : 'Imagen', { sprite: { imagen, ancho: 64, alto: 64 }, colision: {} }],
      mapa: ['Mapa', { mapa: { tamano: 48, tipos: { suelo: { color: '#5ad17a', solida: true } }, celdas: {} } }],
      vacio: ['Objeto', {}],
      forma: [nombreDeForma(forma), { sprite: { forma, color, ...DATOS_FORMA_NUEVA[forma] }, colision: {} }],
    };
    const [nombre, def] = base[tipo];
    // Los mapas empiezan en la esquina (0, 0); lo demás, donde se ha pedido
    const pos = tipo === 'mapa' ? { x: 0, y: 0 } : { x: Math.round(x), y: Math.round(y) };
    let indice = -1;
    this.cambiar('objetos', () => {
      this.escena.objetos.push({ nombre: this.nombreLibre(nombre), ...pos, ...structuredClone(def) });
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return indice;
  }

  /**
   * Añade pantallas listas (menú, opciones, créditos, puntuaciones, fin, pausa),
   * conectadas entre sí y con la escena del juego. Todo de una vez (un solo
   * deshacer). Devuelve los nombres con los que quedan.
   */
  anadirPantallas(cuales: readonly TipoPantalla[], opciones: { escenaDeJuego?: string; empezarPorMenu?: boolean } = {}): PlanPantallas {
    const escenaDeJuego = opciones.escenaDeJuego && tiene(this.proyecto.escenas, opciones.escenaDeJuego) ? opciones.escenaDeJuego : this.escenaActual;
    const plan = planDePantallas(this.proyecto, cuales, escenaDeJuego);
    this.cambiar('proyecto', () => {
      Object.assign(this.proyecto.escenas, structuredClone(plan.escenas));
      Object.assign(this.proyecto.scripts, plan.scripts);
      this.proyecto.escenas[escenaDeJuego].objetos.push(...structuredClone(plan.enElJuego));
      // Fin y Récords usan juego.puntos: si el juego no lo tiene, se le pone (empieza en 0)
      if (plan.necesitaPuntos && !Object.keys(this.proyecto.datos ?? {}).some((d) => normalizar(d) === 'puntos')) (this.proyecto.datos ??= {}).puntos = 0;
      if (opciones.empezarPorMenu && plan.nombres.menu && tiene(plan.escenas, plan.nombres.menu)) this.proyecto.escenaInicial = plan.nombres.menu;
    });
    this.avisar('scripts');
    return plan;
  }

  /** Crea un control de interfaz (barra, lista, ventana...) en la escena actual y lo selecciona. */
  crearControl(tipo: TipoControl, x: number, y: number): number {
    const { nombre, def } = CONTROLES_NUEVOS[tipo];
    let indice = -1;
    this.cambiar('objetos', () => {
      this.escena.objetos.push({ nombre: this.nombreLibre(nombre), x: Math.round(x), y: Math.round(y), ...structuredClone(def) });
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return indice;
  }

  /** Borra lo seleccionado (uno o varios objetos, o la plantilla). */
  borrarSeleccionado(): void {
    const ref = this.seleccion;
    if (!ref) return;
    const indices = this.indicesSeleccionados().sort((a, b) => b - a);
    this.cambiar('objetos', () => {
      if (ref.tipo === 'plantilla') {
        delete this.proyecto.plantillas[ref.nombre];
        // Sus copias en las escenas se quedan, pero ya no están enlazadas a nada
        for (const o of this.todosLosObjetos()) if (o.plantilla === ref.nombre) delete o.plantilla;
      } else for (const i of indices) this.proyecto.escenas[ref.escena].objetos.splice(i, 1);
    });
    this.seleccionar(null);
  }

  /** Duplica lo seleccionado (uno o varios). Las copias quedan seleccionadas. */
  duplicarSeleccionado(): void {
    const indices = this.indicesSeleccionados().sort((a, b) => a - b);
    if (indices.length === 0) return;
    const nuevos: number[] = [];
    this.cambiar('objetos', () => {
      const lista = this.escena.objetos;
      const originales = indices.map((i) => lista[i]);
      const usados = lista.map((o) => o.nombre ?? '');
      for (const def of originales) {
        const copia = structuredClone(def);
        copia.nombre = this.nombreLibre(def.nombre ?? 'Objeto', usados);
        usados.push(copia.nombre);
        copia.x = (def.x ?? 0) + 24;
        copia.y = (def.y ?? 0) - 24;
        if (indices.length === 1) {
          lista.splice(indices[0] + 1, 0, copia);
          nuevos.push(indices[0] + 1);
        } else {
          lista.push(copia);
          nuevos.push(lista.length - 1);
        }
      }
    });
    this.seleccionarVarios(nuevos);
  }

  /** Copia de lo seleccionado (Ctrl+C), para pegarla en esta u otra escena (Ctrl+V). */
  portapapeles: DefObjeto[] | null = null;

  copiarSeleccionado(): boolean {
    const defs = this.indicesSeleccionados().sort((a, b) => a - b).map((i) => this.escena.objetos[i]);
    if (defs.length === 0) return false;
    this.portapapeles = structuredClone(defs);
    this.avisar('seleccion'); // para que aparezca el botón Pegar
    return true;
  }

  /** Pega lo copiado en la escena actual. Si ya hay algo en ese sitio, un poco desplazado. Devuelve la posición del último pegado. */
  pegar(): number {
    const copias = this.portapapeles;
    if (!copias?.length) return -1;
    const nuevos: number[] = [];
    this.cambiar('objetos', () => {
      const lista = this.escena.objetos;
      const usados = lista.map((o) => o.nombre ?? '');
      // Todos se desplazan lo mismo (así un grupo pegado conserva su forma)
      let dx = 0;
      let dy = 0;
      const ocupado = (d: DefObjeto) => !d.mapa && lista.some((o) => o.x === (d.x ?? 0) + dx && o.y === (d.y ?? 0) + dy && !o.mapa);
      while (copias.some(ocupado)) {
        dx += 24;
        dy -= 24;
      }
      for (const copia of copias) {
        const nuevo = structuredClone(copia);
        nuevo.nombre = this.nombreLibre(copia.nombre ?? 'Objeto', usados);
        usados.push(nuevo.nombre);
        if (!nuevo.mapa || copias.length > 1) {
          nuevo.x = (nuevo.x ?? 0) + dx;
          nuevo.y = (nuevo.y ?? 0) + dy;
        }
        // Una copia de plantilla pegada donde ya no existe esa plantilla, deja de estar enlazada
        if (nuevo.plantilla && !this.proyecto.plantillas[nuevo.plantilla]) delete nuevo.plantilla;
        lista.push(nuevo);
        nuevos.push(lista.length - 1);
      }
    });
    this.seleccionarVarios(nuevos);
    return nuevos[nuevos.length - 1];
  }

  /** Pone varios objetos en su sitio de una vez (al arrastrar una selección múltiple). */
  colocarObjetos(posiciones: { indice: number; x: number; y: number }[]): void {
    const lista = this.escena.objetos;
    const cambia = posiciones.some((p) => lista[p.indice] && (lista[p.indice].x !== Math.round(p.x) || lista[p.indice].y !== Math.round(p.y)));
    if (!cambia) return;
    this.cambiar('objetos', () => {
      for (const p of posiciones) {
        const def = lista[p.indice];
        if (!def) continue;
        def.x = Math.round(p.x);
        def.y = Math.round(p.y);
      }
    });
  }

  /** Mueve todos los objetos seleccionados a la vez (arrastrando o con las flechas). */
  moverSeleccionados(dx: number, dy: number): void {
    const indices = this.indicesSeleccionados();
    if (indices.length === 0 || (dx === 0 && dy === 0)) return;
    this.cambiar('objetos', () => {
      for (const i of indices) {
        const def = this.escena.objetos[i];
        def.x = Math.round((def.x ?? 0) + dx);
        def.y = Math.round((def.y ?? 0) + dy);
      }
    });
  }

  /** Cambia el orden (sube o baja en la lista). */
  moverEnLista(indice: number, hacia: number): void {
    const lista = this.escena.objetos;
    const destino = Math.max(0, Math.min(lista.length - 1, hacia));
    if (destino === indice) return;
    this.cambiar('objetos', () => lista.splice(destino, 0, lista.splice(indice, 1)[0]));
    // (la selección múltiple se pierde: las posiciones han cambiado)
    this.seleccionarIndice(destino);
  }

  /** Renombra un objeto (sin repetir nombre en la escena). Devuelve el nombre final. */
  renombrar(ref: RefObjeto, nombre: string): string {
    const def = this.definicion(ref);
    const limpio = nombre.trim().replace(/\s+/g, '');
    if (!def || !limpio || limpio === def.nombre) return def?.nombre ?? '';
    if (ref.tipo === 'plantilla') {
      const final = this.nombreLibre(limpio, Object.keys(this.proyecto.plantillas));
      this.cambiar('objetos', () => {
        this.proyecto.plantillas[final] = this.proyecto.plantillas[ref.nombre];
        delete this.proyecto.plantillas[ref.nombre];
        // Lo que se crea con crear("Marciano") se llama Marciano (y no como se llamaba la plantilla antes)
        if (normalizar(this.proyecto.plantillas[final].nombre ?? '') === normalizar(ref.nombre)) this.proyecto.plantillas[final].nombre = final;
        // Las copias enlazadas siguen enlazadas (y son del tipo nuevo)
        for (const o of this.todosLosObjetos()) {
          if (o.plantilla !== ref.nombre) continue;
          o.plantilla = final;
          if (o.tipo === ref.nombre) o.tipo = final;
        }
        this.renombrarObjetoEnElProyecto(ref.nombre, final);
      });
      this.seleccionar({ tipo: 'plantilla', nombre: final });
      this.avisar('scripts');
      return final;
    }
    const otros = this.proyecto.escenas[ref.escena].objetos.filter((o) => o !== def).map((o) => o.nombre ?? '');
    const final = this.nombreLibre(limpio, otros);
    const viejo = def.nombre;
    const tipoViejo = tipoDe(def);
    this.cambiar('objetos', () => {
      def.nombre = final;
      if (viejo) this.renombrarObjetoEnElProyecto(viejo, final);
      // «Moneda2» pasa a «Estrella»: si ya no queda ninguna Moneda, lo que hablaba de las Monedas habla de las Estrellas
      if (tipoViejo !== viejo && !def.tipo) this.renombrarObjetoEnElProyecto(tipoViejo, tipoDe(def));
    });
    this.avisar('scripts');
    return final;
  }

  /** Mueve un objeto. Si se está arrastrando (cambio largo), se deshace de una vez. */
  moverObjeto(ref: RefObjeto, x: number, y: number): void {
    const def = this.definicion(ref);
    if (!def) return;
    this.cambiar('objetos', () => {
      def.x = Math.round(x);
      def.y = Math.round(y);
    });
  }

  /**
   * Cambia una propiedad con una "ruta": "rotacion", "sprite.color", "fisica.masa"...
   * `undefined` quita la propiedad (vuelve al valor por defecto).
   */
  cambiarPropiedad(ref: RefObjeto, ruta: string, valor: unknown): void {
    const def = this.definicion(ref);
    if (!def) return;
    this.cambiarObjeto(ref, 'objetos', () => {
      const partes = ruta.split('.');
      let actual = def as Record<string, unknown>;
      for (const p of partes.slice(0, -1)) {
        if (typeof actual[p] !== 'object' || actual[p] === null) actual[p] = {};
        actual = actual[p] as Record<string, unknown>;
      }
      const ultima = partes[partes.length - 1];
      if (valor === undefined) delete actual[ultima];
      else actual[ultima] = valor;
    });
  }

  /** Pone o quita un componente entero: sprite, colision, fisica o mapa. */
  activarComponente(ref: RefObjeto, componente: 'sprite' | 'colision' | 'fisica' | 'mapa' | 'recorrido' | 'comportamiento' | 'luz', activo: boolean): void {
    const porDefecto = {
      sprite: { forma: 'rectangulo', color: '#4aa3ff', ancho: 64, alto: 64 },
      colision: {},
      fisica: {},
      mapa: { tamano: 48, tipos: { suelo: { color: '#5ad17a', solida: true } }, celdas: {} },
      // Una plataforma que va y viene 200 píxeles a la derecha
      recorrido: { puntos: [{ x: 200, y: 0 }], rapidez: 100 },
      // Lo más pedido: un enemigo que va a por el jugador
      comportamiento: { tipo: 'perseguir', objetivo: 'Jugador' },
      // Una luz cálida, como una antorcha
      luz: { color: '#ffd9a0', radio: 220 },
    };
    const nuevo = activo ? structuredClone(porDefecto[componente]) : undefined;
    // El enemigo persigue a alguien QUE EXISTE: al jugador de esta escena, se llame como se llame
    if (nuevo && componente === 'comportamiento') (nuevo as { objetivo: string }).objetivo = this.aQuienPerseguir(ref);
    this.cambiarPropiedad(ref, componente, nuevo);
  }

  /**
   * A quién persigue un enemigo si no se dice: al objeto «Jugador»; si no lo hay, al que
   * se maneja (con las flechas o con los controles de un jugador); si no, al primer
   * objeto de la escena que no sea de la interfaz ni un mapa. Si no hay nadie, «Jugador».
   */
  private aQuienPerseguir(ref: RefObjeto): string {
    const yo = this.definicion(ref);
    const otros = this.escena.objetos.filter((o) => o !== yo && o.nombre && !o.mapa && !o.sprite?.fijo);
    const seManeja = (o: DefObjeto) => o.comportamiento?.tipo === 'jugador' || /moverCon(Flechas|Jugador)|controles\(|teclado\./.test(o.script ? this.proyecto.scripts[o.script] ?? '' : '');
    const elegido = otros.find((o) => normalizar(o.nombre!) === 'jugador') ?? otros.find(seManeja) ?? otros[0];
    return elegido?.nombre ?? 'Jugador';
  }

  /** Propiedades propias (vida = 3...). */
  cambiarPropiedadPropia(ref: RefObjeto, nombre: string, valor: number | string | boolean | undefined): void {
    const def = this.definicion(ref);
    if (!def || !nombre.trim() || esNombreProhibido(nombre)) return;
    this.cambiarObjeto(ref, 'objetos', () => {
      def.propiedades ??= {};
      if (valor === undefined) delete def.propiedades[nombre];
      else def.propiedades[nombre.trim()] = valor;
      if (Object.keys(def.propiedades).length === 0) delete def.propiedades;
    });
  }

  // ═════════════════════════ Scripts ═════════════════════════

  /** Crea un script para un objeto (si no tiene) y lo abre. Devuelve el nombre del archivo. */
  crearScriptPara(ref: RefObjeto): string | null {
    const def = this.definicion(ref);
    if (!def) return null;
    if (def.script && tiene(this.proyecto.scripts, def.script)) {
      this.abrirScript(def.script);
      return def.script;
    }
    const nombre = def.nombre ?? (ref.tipo === 'plantilla' ? ref.nombre : 'objeto');
    const archivo = this.nombreLibre(`${nombre.toLowerCase()}.chs`, Object.keys(this.proyecto.scripts));
    this.cambiarObjeto(ref, 'scripts', () => {
      this.proyecto.scripts[archivo] = plantillaDeScript(nombre);
      def.script = archivo;
    });
    this.abrirScript(archivo);
    return archivo;
  }

  crearScriptSuelto(nombre: string): string {
    const base = nombre.trim().toLowerCase().replace(/\s+/g, '_').replace(/\.chs$/, '') || 'script';
    const archivo = this.nombreLibre(`${base}.chs`, Object.keys(this.proyecto.scripts));
    this.cambiar('scripts', () => (this.proyecto.scripts[archivo] = `# ${archivo}\n`));
    this.abrirScript(archivo);
    return archivo;
  }

  /** Guarda el código de un script (mientras se escribe: no entra en el historial de deshacer). */
  cambiarCodigo(archivo: string, codigo: string): void {
    if (this.proyecto.scripts[archivo] === codigo) return;
    this.proyecto.scripts[archivo] = codigo;
    this.modificado = true;
    this.avisar('codigo');
  }

  /** ¿Se ve este script como bloques? */
  enBloques(archivo: string): boolean {
    return this.proyecto.bloques?.includes(archivo) ?? false;
  }

  /** Ver un script como bloques o como código (se recuerda en el proyecto; no se deshace: es solo cómo se ve). */
  ponerEnBloques(archivo: string, si: boolean): void {
    const lista = (this.proyecto.bloques ?? []).filter((b) => b !== archivo);
    if (si) lista.push(archivo);
    this.proyecto.bloques = lista;
    this.modificado = true;
    this.avisar('proyecto');
  }

  asignarScript(ref: RefObjeto, archivo: string | null): void {
    this.cambiarPropiedad(ref, 'script', archivo ?? undefined);
  }

  renombrarScript(viejo: string, nuevo: string): string {
    let n = nuevo.trim().replace(/\s+/g, '_');
    if (!n.endsWith('.chs')) n += '.chs';
    if (n === viejo || !(tiene(this.proyecto.scripts, viejo))) return viejo;
    const final = this.nombreLibre(n, Object.keys(this.proyecto.scripts));
    this.cambiar('scripts', () => {
      this.proyecto.scripts[final] = this.proyecto.scripts[viejo];
      delete this.proyecto.scripts[viejo];
      for (const o of this.todosLosObjetos()) if (o.script === viejo) o.script = final;
      if (this.proyecto.bloques) this.proyecto.bloques = this.proyecto.bloques.map((b) => (b === viejo ? final : b));
    });
    this.pestanas = this.pestanas.map((p) => (p === viejo ? final : p));
    if (this.pestanaActiva === viejo) this.pestanaActiva = final;
    this.avisar('archivos');
    return final;
  }

  borrarScript(archivo: string): void {
    this.cambiar('scripts', () => {
      delete this.proyecto.scripts[archivo];
      for (const o of this.todosLosObjetos()) if (o.script === archivo) delete o.script;
      if (this.proyecto.bloques) this.proyecto.bloques = this.proyecto.bloques.filter((b) => b !== archivo);
    });
    this.cerrarPestana(archivo);
  }

  abrirScript(archivo: string): void {
    if (!this.pestanas.includes(archivo)) this.pestanas.push(archivo);
    this.pestanaActiva = archivo;
    this.avisar('archivos');
  }

  cerrarPestana(archivo: string): void {
    this.pestanas = this.pestanas.filter((p) => p !== archivo);
    if (this.pestanaActiva === archivo) this.pestanaActiva = this.pestanas[this.pestanas.length - 1] ?? 'escena';
    this.avisar('archivos');
  }

  activarPestana(p: string): void {
    this.pestanaActiva = p;
    this.avisar('archivos');
  }

  /** Todos los objetos del proyecto (todas las escenas y plantillas). */
  todosLosObjetos(): DefObjeto[] {
    return [...Object.values(this.proyecto.escenas).flatMap((e) => e.objetos), ...Object.values(this.proyecto.plantillas)];
  }

  // ═════════════════════════ Escenas ═════════════════════════

  cambiarEscenaActual(nombre: string): void {
    if (!this.proyecto.escenas[nombre]) return;
    this.escenaActual = nombre;
    this.seleccion = null;
    this.seleccionados = [];
    this.avisar('escena');
  }

  crearEscena(nombre = 'Nivel'): string {
    const final = this.nombreLibre(nombre.trim() || 'Nivel', Object.keys(this.proyecto.escenas));
    this.cambiar('escena', () => (this.proyecto.escenas[final] = { colorFondo: this.escena.colorFondo, objetos: [] }));
    this.cambiarEscenaActual(final);
    return final;
  }

  duplicarEscena(nombre: string): string {
    const final = this.nombreLibre(nombre, Object.keys(this.proyecto.escenas));
    this.cambiar('escena', () => (this.proyecto.escenas[final] = structuredClone(this.proyecto.escenas[nombre])));
    this.cambiarEscenaActual(final);
    return final;
  }

  renombrarEscena(viejo: string, nuevo: string): string {
    const limpio = nuevo.trim();
    if (!limpio || limpio === viejo || !this.proyecto.escenas[viejo]) return viejo;
    const final = this.nombreLibre(limpio, Object.keys(this.proyecto.escenas));
    this.cambiar('escena', () => {
      // Reconstruimos el objeto para conservar el ORDEN de las escenas
      const nuevas: Record<string, DefEscena> = {};
      for (const [k, v] of Object.entries(this.proyecto.escenas)) nuevas[k === viejo ? final : k] = v;
      this.proyecto.escenas = nuevas;
      if (this.proyecto.escenaInicial === viejo) this.proyecto.escenaInicial = final;
    });
    if (this.escenaActual === viejo) this.escenaActual = final;
    this.avisar('escena');
    return final;
  }

  /** Borra una escena (nunca la última). */
  borrarEscena(nombre: string): boolean {
    const nombres = Object.keys(this.proyecto.escenas);
    if (nombres.length <= 1 || !this.proyecto.escenas[nombre]) return false;
    this.cambiar('escena', () => {
      delete this.proyecto.escenas[nombre];
      if (this.proyecto.escenaInicial === nombre) this.proyecto.escenaInicial = Object.keys(this.proyecto.escenas)[0];
    });
    if (this.escenaActual === nombre) this.cambiarEscenaActual(this.proyecto.escenaInicial);
    return true;
  }

  ponerEscenaInicial(nombre: string): void {
    if (this.proyecto.escenas[nombre]) this.cambiar('escena', () => (this.proyecto.escenaInicial = nombre));
  }

  cambiarEscenaPropiedad(ruta: 'oscuridad' | 'luzAmbiente' | 'colorFondo' | 'gravedad' | 'camara.zoom' | 'camara.seguir' | 'camara.x' | 'camara.y' | 'camara.limitarAlMapa' | 'camara.jugadores' | 'clima' | `filtros.${keyof Filtros}`, valor: unknown): void {
    this.cambiar('escena', () => {
      const e = this.escena;
      if (ruta === 'colorFondo') e.colorFondo = String(valor);
      else if (ruta === 'oscuridad') {
        if (!valor) delete e.oscuridad;
        else e.oscuridad = Math.min(1, Math.max(0, Number(valor)));
      } else if (ruta === 'luzAmbiente') {
        if (!valor || valor === 'negro') delete e.luzAmbiente;
        else e.luzAmbiente = String(valor);
      } else if (ruta.startsWith('filtros.')) {
        const k = ruta.slice(8) as keyof Filtros;
        const filtros = (e.filtros ??= {}) as Record<string, unknown>;
        if (valor === undefined || valor === FILTROS_NORMALES[k]) delete filtros[k];
        else filtros[k] = k === 'crt' ? Boolean(valor) : Number(valor);
        if (!Object.keys(filtros).length) delete e.filtros;
      }
      else if (ruta === 'clima') {
        const c = valor as DefEscena['clima'];
        if (c && (CLIMAS as readonly string[]).includes(c.tipo)) e.clima = { tipo: c.tipo, ...(c.intensidad !== undefined && c.intensidad !== 1 ? { intensidad: Math.min(10, Math.max(0, c.intensidad)) } : {}) };
        else delete e.clima;
      }
      else if (ruta === 'gravedad') {
        if (valor === undefined) delete e.gravedad;
        else e.gravedad = Number(valor);
      } else {
        e.camara ??= {};
        if (ruta === 'camara.zoom') e.camara.zoom = Number(valor) || 1;
        else if (ruta === 'camara.limitarAlMapa') {
          if (valor) e.camara.limitarAlMapa = true;
          else delete e.camara.limitarAlMapa;
        } else if (ruta === 'camara.jugadores') {
          if (valor) e.camara.jugadores = structuredClone(valor) as NonNullable<DefEscena['camara']>['jugadores'];
          else delete e.camara.jugadores;
        } else if (ruta === 'camara.seguir') {
          if (valor) e.camara.seguir = String(valor);
          else delete e.camara.seguir;
        } else {
          const eje = ruta === 'camara.x' ? 'x' : 'y';
          if (valor === undefined) delete e.camara[eje];
          else e.camara[eje] = Number(valor);
        }
      }
    });
  }

  // ═════════════════════════ Plantillas ═════════════════════════

  /**
   * Convierte el objeto en una plantilla (para crear("Nombre") desde el código):
   * lo SACA de la escena y lo guarda en Plantillas. Para poner copias en la
   * escena, se arrastra la plantilla desde el panel Proyecto.
   */
  convertirEnPlantilla(ref: RefObjeto): string | null {
    const def = this.definicion(ref);
    if (!def || ref.tipo !== 'escena') return null;
    const nombre = this.nombreLibre(tipoPorNombre(def.nombre ?? 'Plantilla'), Object.keys(this.proyecto.plantillas));
    this.cambiar('recursos', () => {
      const copia = structuredClone(def);
      delete copia.nombre;
      delete copia.tipo;
      copia.x = 0;
      copia.y = 0;
      this.proyecto.plantillas[nombre] = copia;
      this.proyecto.escenas[ref.escena].objetos.splice(ref.indice, 1);
    });
    this.seleccionar({ tipo: 'plantilla', nombre });
    return nombre;
  }

  /** Pone una copia de una plantilla en la escena. */
  colocarPlantilla(nombre: string, x: number, y: number): number {
    const p = this.proyecto.plantillas[nombre];
    if (!p) return -1;
    let indice = -1;
    this.cambiar('objetos', () => {
      this.escena.objetos.push({ ...structuredClone(p), nombre: this.nombreLibre(nombre), tipo: nombre, plantilla: nombre, x: Math.round(x), y: Math.round(y) });
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return indice;
  }

  crearPlantillaVacia(nombre = 'Plantilla'): string {
    const final = this.nombreLibre(nombre, Object.keys(this.proyecto.plantillas));
    this.cambiar('recursos', () => (this.proyecto.plantillas[final] = { sprite: { forma: 'rectangulo', color: '#ff6b6b', ancho: 32, alto: 32 }, colision: {} }));
    this.seleccionar({ tipo: 'plantilla', nombre: final });
    return final;
  }

  /** Las copias enlazadas de una plantilla que hay en todas las escenas. */
  copiasDe(plantilla: string): DefObjeto[] {
    return Object.values(this.proyecto.escenas).flatMap((e) => e.objetos.filter((o) => o.plantilla === plantilla));
  }

  /** La plantilla a la que está enlazado un objeto (o él mismo, si es una plantilla). */
  plantillaDe(ref: RefObjeto): string | null {
    if (ref.tipo === 'plantilla') return ref.nombre;
    const p = this.definicion(ref)?.plantilla;
    return p && this.proyecto.plantillas[p] ? p : null;
  }

  /** Esta copia deja de estar enlazada: a partir de ahora se cambia sola. */
  desvincular(ref: RefObjeto): void {
    const def = this.definicion(ref);
    if (!def?.plantilla) return;
    this.cambiar('objetos', () => delete def.plantilla);
  }

  /** Un cambio en un objeto: si es una plantilla o una copia enlazada, se hace en todas (en un solo paso de deshacer). */
  private cambiarObjeto(ref: RefObjeto, tipo: TipoCambio, fn: () => void): void {
    this.cambiar(tipo, () => {
      fn();
      this.propagar(ref);
    });
  }

  /** Copia lo compartido del objeto a su plantilla y a todas las demás copias enlazadas. */
  private propagar(ref: RefObjeto): void {
    const def = this.definicion(ref);
    const nombre = this.plantillaDe(ref);
    if (!def || !nombre) return;
    const compartido: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(def)) if (!CAMPOS_DE_CADA_COPIA.has(k)) compartido[k] = v;
    const destinos = [this.proyecto.plantillas[nombre], ...this.copiasDe(nombre)].filter((o) => o !== def);
    for (const d of destinos) {
      const obj = d as Record<string, unknown>;
      for (const k of Object.keys(obj)) if (!CAMPOS_DE_CADA_COPIA.has(k)) delete obj[k];
      Object.assign(obj, structuredClone(compartido));
    }
  }

  // ═════════════════════════ Imágenes, sonidos y animaciones ═════════════════════════

  /** Añade una imagen (como "data URL"). Devuelve el nombre final (sin repetir). */
  agregarImagen(nombre: string, datos: string): string {
    comprobarRecurso(datos, 'imagen', nombre);
    const final = this.nombreLibre(nombreDeRecurso(nombre), Object.keys(this.proyecto.imagenes));
    this.cambiar('recursos', () => (this.proyecto.imagenes[final] = datos));
    return final;
  }

  borrarImagen(nombre: string): void {
    this.cambiar('recursos', () => {
      delete this.proyecto.imagenes[nombre];
      for (const o of this.todosLosObjetos()) {
        if (o.sprite?.imagen === nombre) delete o.sprite.imagen;
        for (const t of Object.values(o.mapa?.tipos ?? {})) if (t.imagen === nombre) delete t.imagen;
      }
      for (const a of Object.values(this.proyecto.animaciones)) a.fotogramas = a.fotogramas.filter((f) => f !== nombre);
      if (this.proyecto.icono === nombre) delete this.proyecto.icono;
    });
  }

  /** Cambia el dibujo de una imagen que ya existe (al guardar desde el editor de pixel art). */
  cambiarImagen(nombre: string, datos: string): void {
    if (!(tiene(this.proyecto.imagenes, nombre))) return;
    comprobarRecurso(datos, 'imagen', nombre);
    this.cambiar('recursos', () => (this.proyecto.imagenes[nombre] = datos));
  }

  /**
   * Dónde se usa una imagen, un sonido o una animación: en qué objetos,
   * animaciones, tipos de casilla y scripts (donde sale su nombre entre comillas).
   */
  usosDe(tipo: TipoRecurso, nombre: string): string[] {
    const usos: string[] = [];
    const donde = (o: DefObjeto, clave: string) => (clave.startsWith('plantilla:') ? `la plantilla ${clave.slice(10)}` : `${o.nombre ?? 'un objeto'} (escena ${clave})`);
    for (const [clave, o] of this.objetosConSitio()) {
      if (tipo === 'imagen' && o.sprite?.imagen === nombre) usos.push(donde(o, clave));
      if (tipo === 'imagen') for (const [t, def] of Object.entries(o.mapa?.tipos ?? {})) if (def.imagen === nombre) usos.push(`la casilla «${t}» de ${donde(o, clave)}`);
      if (tipo === 'animacion' && o.animacion === nombre) usos.push(donde(o, clave));
    }
    if (tipo === 'imagen') for (const [n, a] of Object.entries(this.proyecto.animaciones)) if (a.fotogramas.includes(nombre)) usos.push(`la animación «${n}»`);
    for (const [archivo, codigo] of Object.entries(this.proyecto.scripts)) {
      const lineas = codigo.split('\n').flatMap((l, i) => (textosDe(l).some((t) => normalizar(t) === normalizar(nombre)) ? [i + 1] : []));
      if (lineas.length) usos.push(`${archivo} (línea ${lineas.join(', ')})`);
    }
    return usos;
  }

  /** Todos los objetos con dónde están: "Principal", "plantilla:Bala"... */
  private objetosConSitio(): [string, DefObjeto][] {
    return [
      ...Object.entries(this.proyecto.escenas).flatMap(([n, e]) => e.objetos.map((o): [string, DefObjeto] => [n, o])),
      ...Object.entries(this.proyecto.plantillas).map(([n, o]): [string, DefObjeto] => [`plantilla:${n}`, o]),
    ];
  }

  /**
   * Renombra una imagen, un sonido o una animación, y la cambia en TODOS los
   * sitios donde se usa: objetos, animaciones, casillas y el código (el texto
   * entre comillas). Devuelve el nombre final (sin repetir).
   */
  renombrarRecurso(tipo: TipoRecurso, viejo: string, nuevo: string): string {
    const tabla = tipo === 'imagen' ? this.proyecto.imagenes : tipo === 'sonido' ? this.proyecto.sonidos : this.proyecto.animaciones;
    if (!tiene(tabla, viejo)) return viejo;
    const limpio = nombreDeRecurso(nuevo.trim());
    if (!nuevo.trim() || limpio === viejo) return viejo;
    const final = this.nombreLibre(limpio, Object.keys(tabla).filter((k) => k !== viejo));
    this.cambiar('recursos', () => {
      // El mismo sitio en la lista (Object.entries conserva el orden)
      const entradas = Object.entries(tabla as Record<string, unknown>).map(([k, v]): [string, unknown] => [k === viejo ? final : k, v]);
      for (const k of Object.keys(tabla)) delete (tabla as Record<string, unknown>)[k];
      for (const [k, v] of entradas) (tabla as Record<string, unknown>)[k] = v;
      for (const [, o] of this.objetosConSitio()) {
        if (tipo === 'imagen' && o.sprite?.imagen === viejo) o.sprite.imagen = final;
        if (tipo === 'imagen') for (const t of Object.values(o.mapa?.tipos ?? {})) if (t.imagen === viejo) t.imagen = final;
        if (tipo === 'animacion' && o.animacion === viejo) o.animacion = final;
      }
      if (tipo === 'imagen') for (const a of Object.values(this.proyecto.animaciones)) a.fotogramas = a.fotogramas.map((f) => (f === viejo ? final : f));
      if (tipo === 'imagen' && this.proyecto.icono === viejo) this.proyecto.icono = final;
      for (const [archivo, codigo] of Object.entries(this.proyecto.scripts)) {
        this.proyecto.scripts[archivo] = codigo.replace(/"([^"\n]*)"/g, (entero, dentro: string) => (normalizar(dentro) === normalizar(viejo) ? `"${final}"` : entero));
      }
    });
    this.avisar('scripts');
    return final;
  }

  /**
   * Guarda un dibujo del editor de pixel art. Con un fotograma es una imagen;
   * con varios, una imagen por fotograma (Nombre1, Nombre2...) y una animación
   * con ese nombre. Devuelve el nombre de la imagen (o de la animación).
   */
  guardarDibujo(nombre: string, fotogramas: string[], velocidad = 8, opciones: { sobrescribir?: boolean; animacion?: boolean } = {}): string {
    const comoAnimacion = opciones.animacion || fotogramas.length > 1;
    // Un dibujo nuevo nunca pisa uno que ya existe: se le busca un nombre libre (Dibujo2...)
    const pedido = nombreDeRecurso(nombre.trim() || 'Dibujo');
    const ocupados = comoAnimacion ? Object.keys(this.proyecto.animaciones) : Object.keys(this.proyecto.imagenes);
    const base = opciones.sobrescribir ? pedido : this.nombreLibre(pedido, ocupados);
    if (!comoAnimacion) {
      if (tiene(this.proyecto.imagenes, base)) {
        this.cambiarImagen(base, fotogramas[0] ?? '');
        return base;
      }
      return this.agregarImagen(base, fotogramas[0] ?? '');
    }
    const nombres = fotogramas.map((_, i) => `${base}${i + 1}`);
    fotogramas.forEach((f, i) => comprobarRecurso(f, 'imagen', nombres[i]));
    this.cambiar('recursos', () => {
      nombres.forEach((n, i) => (this.proyecto.imagenes[n] = fotogramas[i]));
      const a = this.proyecto.animaciones[base];
      if (a) Object.assign(a, { fotogramas: nombres, velocidad });
      else this.proyecto.animaciones[base] = { fotogramas: nombres, velocidad, repetir: true };
    });
    return base;
  }

  agregarSonido(nombre: string, datos: string): string {
    comprobarRecurso(datos, 'sonido', nombre);
    const final = this.nombreLibre(nombreDeRecurso(nombre), nombresDeSonidos(this.proyecto));
    this.cambiar('recursos', () => (this.proyecto.sonidos[final] = datos));
    return final;
  }

  borrarSonido(nombre: string): void {
    this.cambiar('recursos', () => delete this.proyecto.sonidos[nombre]);
  }

  /**
   * El nombre con el que se guarda un sonido hecho o una canción: fácil de
   * escribir en el código y sin repetir entre sonidos importados, hechos y canciones.
   * `anterior`: el nombre que tenía (ese sí puede «repetirse»: es él mismo).
   */
  private nombreDeSonidoLibre(nombre: string, anterior?: string): string | null {
    const n = nombreDeRecurso(nombre.trim());
    if (!nombre.trim() || n.length > 40 || esNombreProhibido(n)) return null;
    return this.nombreLibre(n, nombresDeSonidos(this.proyecto).filter((x) => x !== anterior));
  }

  /**
   * Al cambiar el nombre de un objeto o de una plantilla: se cambia también donde se le
   * nombra, para que el juego no deje de funcionar sin avisar. En el código, solo en los
   * sitios que hablan de OBJETOS (cuando toco X, buscar("X"), crear("X")...; no en
   * yo.imagen = "x", aunque la imagen se llame igual). En el inspector: a quién sigue la
   * cámara, a quién persigue un enemigo y el centro de un minimapa.
   * Si todavía queda algún objeto o plantilla con el nombre viejo (o de ese tipo), no se toca nada.
   */
  private renombrarObjetoEnElProyecto(viejo: string, nuevo: string): void {
    const v = normalizar(viejo);
    if (!v || v === normalizar(nuevo)) return;
    const sigue = Object.keys(this.proyecto.plantillas).some((n) => normalizar(n) === v) || this.todosLosObjetos().some((o) => normalizar(o.nombre ?? '') === v || normalizar(tipoDe(o)) === v);
    if (sigue) return;
    const es = (texto: string | undefined) => normalizar(texto ?? '') === v;
    for (const escena of Object.values(this.proyecto.escenas)) {
      if (es(escena.camara?.seguir)) escena.camara!.seguir = nuevo;
      if (escena.camara?.jugadores) escena.camara.jugadores.seguir = escena.camara.jugadores.seguir.map((n) => (es(n) ? nuevo : n));
    }
    for (const o of this.todosLosObjetos()) {
      if (o.comportamiento && es(o.comportamiento.objetivo)) o.comportamiento.objetivo = nuevo;
      if (o.control && es(o.control.seguir)) o.control.seguir = nuevo;
    }
    const enLlamada = new RegExp(`(\\b(?:${FUNCIONES_CON_NOMBRE_DE_OBJETO.join('|')})\\((?:[^()"\\n]|"[^"\\n]*")*?)"([^"\\n]*)"`, 'g');
    const enEvento = /^(\s*cuando\s+(?:dejo\s+de\s+tocar|toco)\s+)([\p{L}_][\p{L}\p{N}_]*)/gmu;
    // El nombre nuevo se escribe DENTRO del código: solo si no puede romperlo ni colar nada
    // (en «cuando toco X» tiene que ser una palabra; entre comillas, no puede llevar comillas ni saltos de línea)
    const esPalabra = /^[\p{L}_][\p{L}\p{N}_]*$/u.test(nuevo);
    const cabeEntreComillas = !/["\\\n\r{}]/.test(nuevo);
    for (const [archivo, codigo] of Object.entries(this.proyecto.scripts)) {
      this.proyecto.scripts[archivo] = codigo
        .replace(enEvento, (entero, antes: string, nombre: string) => (esPalabra && es(nombre) ? antes + nuevo : entero))
        .replace(enLlamada, (entero, antes: string, nombre: string) => (cabeEntreComillas && es(nombre) ? `${antes}"${nuevo}"` : entero));
    }
  }

  /** Al cambiar el nombre de un sonido o una canción: también en el código (el texto entre comillas). */
  private renombrarEnElCodigo(viejo: string, nuevo: string): void {
    for (const [archivo, codigo] of Object.entries(this.proyecto.scripts)) {
      if (/["\\\n\r{}]/.test(nuevo)) return; // un nombre con comillas rompería el código: se deja como estaba
      this.proyecto.scripts[archivo] = codigo.replace(/"([^"\n]*)"/g, (entero, dentro: string) => (normalizar(dentro) === normalizar(viejo) ? `"${nuevo}"` : entero));
    }
  }

  /** Guarda un sonido del generador de efectos. Devuelve el nombre con el que queda (o null si el nombre no vale). */
  guardarSonidoHecho(nombre: string, params: ParamsSonido, anterior?: string): string | null {
    const n = this.nombreDeSonidoLibre(nombre, anterior);
    if (!n) return null;
    const limpio = completarSonido(params);
    this.cambiar('recursos', () => {
      const hechos = (this.proyecto.sonidosHechos ??= {});
      if (anterior && anterior !== n && tiene(hechos, anterior)) {
        delete hechos[anterior];
        this.renombrarEnElCodigo(anterior, n);
      }
      hechos[n] = limpio;
    });
    if (anterior && anterior !== n) this.avisar('scripts');
    return n;
  }

  borrarSonidoHecho(nombre: string): void {
    if (!tiene(this.proyecto.sonidosHechos ?? {}, nombre)) return;
    this.cambiar('recursos', () => {
      delete this.proyecto.sonidosHechos![nombre];
      if (!Object.keys(this.proyecto.sonidosHechos!).length) delete this.proyecto.sonidosHechos;
    });
  }

  /** Guarda una canción del editor de música. Devuelve el nombre con el que queda (o null si no vale). */
  guardarCancion(nombre: string, cancion: DefCancion, anterior?: string): string | null {
    const n = this.nombreDeSonidoLibre(nombre, anterior);
    if (!n) return null;
    let limpia: DefCancion | undefined;
    try {
      limpia = migrarProyecto({ ...proyectoVacio(), canciones: { [n]: cancion } }).canciones?.[n];
    } catch {
      return null;
    }
    if (!limpia) return null;
    this.cambiar('recursos', () => {
      const canciones = (this.proyecto.canciones ??= {});
      if (anterior && anterior !== n && tiene(canciones, anterior)) {
        delete canciones[anterior];
        this.renombrarEnElCodigo(anterior, n);
      }
      canciones[n] = limpia;
    });
    if (anterior && anterior !== n) this.avisar('scripts');
    return n;
  }

  borrarCancion(nombre: string): void {
    if (!tiene(this.proyecto.canciones ?? {}, nombre)) return;
    this.cambiar('recursos', () => {
      delete this.proyecto.canciones![nombre];
      if (!Object.keys(this.proyecto.canciones!).length) delete this.proyecto.canciones;
    });
  }

  /**
   * Añade al proyecto un recurso de los que trae Chispa (un dibujo, un sonido o una
   * canción). Si ya está, no lo repite. `enEscena`: además, pone el dibujo en la
   * escena (en el centro de la pantalla). Devuelve el nombre con el que queda.
   */
  anadirRecursoListo(tipo: 'dibujo' | 'sonido' | 'cancion', nombre: string, enEscena = false): string | null {
    if (tipo === 'dibujo') {
      const datos = imagenDeDibujo(nombre);
      if (!datos) return null;
      this.empezarCambioLargo();
      // Son dibujos de 16×16: en un proyecto que aún no tiene imágenes se activan los «píxeles nítidos» (si no, se ven borrosos)
      if (!Object.keys(this.proyecto.imagenes).length && !this.proyecto.pixelArt) this.cambiarAjusteProyecto('pixelArt', true);
      // Si ya hay una imagen con ese nombre y es la misma, se usa esa; si es otra, se añade con otro nombre
      const final = this.proyecto.imagenes[nombre] === datos && tiene(this.proyecto.imagenes, nombre) ? nombre : this.agregarImagen(nombre, datos);
      if (enEscena) {
        const sitio = this.sitioLibre();
        this.crearObjeto('imagen', sitio.x, sitio.y, final);
      }
      this.terminarCambioLargo();
      return final;
    }
    if (tipo === 'sonido') {
      const s = SONIDOS_LISTOS.find((x) => x.nombre === nombre);
      if (!s) return null;
      return tiene(this.proyecto.sonidosHechos ?? {}, nombre) ? nombre : this.guardarSonidoHecho(nombre, s.sonido);
    }
    const c = CANCIONES_LISTAS.find((x) => x.nombre === nombre);
    if (!c) return null;
    return tiene(this.proyecto.canciones ?? {}, nombre) ? nombre : this.guardarCancion(nombre, structuredClone(c.cancion));
  }

  /**
   * Un sitio de la pantalla del juego donde no hay ya otro objeto: el centro y, si
   * está ocupado, a su derecha, a su izquierda, debajo... Así lo que se añade
   * seguido no queda amontonado (y tapado) en el mismo punto.
   */
  sitioLibre(): { x: number; y: number } {
    const cx = Math.round(this.proyecto.ancho / 2);
    const cy = Math.round(this.proyecto.alto / 2);
    const ocupado = (x: number, y: number) => this.escena.objetos.some((o) => !o.sprite?.fijo && Math.abs((o.x ?? 0) - x) < 40 && Math.abs((o.y ?? 0) - y) < 40);
    for (const dy of [0, -96, 96, -192, 192]) {
      for (const dx of [0, 96, -96, 192, -192, 288, -288]) if (!ocupado(cx + dx, cy + dy)) return { x: cx + dx, y: cy + dy };
    }
    return { x: cx, y: cy };
  }

  /** Añade un tipo de letra (.ttf, .otf, .woff, .woff2, como "data URL"). Devuelve el nombre final. */
  agregarLetra(nombre: string, datos: string): string {
    const problema = problemaLetra(datos);
    if (problema) throw new ErrorMotor(`No se puede añadir «${nombre}»: ${problema}.`);
    const hay = Object.keys(this.proyecto.letras ?? {});
    if (hay.length >= MAXIMO_LETRAS) throw new ErrorMotor(`No se puede añadir «${nombre}»: un proyecto puede llevar ${MAXIMO_LETRAS} tipos de letra como mucho.`);
    // Que no se llame como una de las letras listas (redonda, pixel...)
    const final = this.nombreLibre(nombreDeRecurso(nombre), [...hay, ...LETRAS]);
    this.cambiar('recursos', () => ((this.proyecto.letras ??= {})[final] = datos));
    return final;
  }

  /** Borra un tipo de letra; los textos que lo usaban vuelven a la letra normal. */
  borrarLetra(nombre: string): void {
    this.cambiar('recursos', () => {
      if (this.proyecto.letras) {
        delete this.proyecto.letras[nombre];
        if (!Object.keys(this.proyecto.letras).length) delete this.proyecto.letras;
      }
      for (const o of this.todosLosObjetos()) if (o.sprite?.letra === nombre) delete o.sprite.letra;
    });
    this.avisar('escena');
  }

  crearAnimacion(nombre: string, fotogramas: string[] = []): string {
    const final = this.nombreLibre(nombreDeRecurso(nombre || 'animacion'), Object.keys(this.proyecto.animaciones));
    this.cambiar('recursos', () => (this.proyecto.animaciones[final] = { fotogramas, velocidad: 8, repetir: true }));
    return final;
  }

  cambiarAnimacion(nombre: string, cambios: Partial<DefAnimacion>): void {
    const a = this.proyecto.animaciones[nombre];
    if (a) this.cambiar('recursos', () => Object.assign(a, cambios));
  }

  borrarAnimacion(nombre: string): void {
    this.cambiar('recursos', () => {
      delete this.proyecto.animaciones[nombre];
      for (const o of this.todosLosObjetos()) if (o.animacion === nombre) delete o.animacion;
    });
  }

  // ═════════════════════════ Mapas de casillas ═════════════════════════

  /** Pinta (o borra, con tipo null) una casilla. Para pintar arrastrando, usar empezar/terminarCambioLargo. */
  pintarCasilla(ref: RefObjeto, columna: number, fila: number, tipo: string | null): void {
    const mapa = this.definicion(ref)?.mapa;
    if (!mapa) return;
    const clave = `${columna},${fila}`;
    if ((mapa.celdas[clave] ?? null) === tipo) return;
    this.cambiarObjeto(ref, 'objetos', () => {
      if (tipo === null) delete mapa.celdas[clave];
      else mapa.celdas[clave] = tipo;
    });
  }

  /** Pinta (o borra) todas las casillas de un rectángulo (Mayús + arrastrar con el pincel). */
  pintarRectangulo(ref: RefObjeto, c0: number, f0: number, c1: number, f1: number, tipo: string | null): void {
    const mapa = this.definicion(ref)?.mapa;
    if (!mapa) return;
    const [ca, cb] = [Math.min(c0, c1), Math.max(c0, c1)];
    const [fa, fb] = [Math.min(f0, f1), Math.max(f0, f1)];
    if ((cb - ca + 1) * (fb - fa + 1) > 250_000) return; // demasiado grande: seguro que es un error
    this.cambiarObjeto(ref, 'objetos', () => {
      for (let c = ca; c <= cb; c++) {
        for (let f = fa; f <= fb; f++) {
          if (tipo === null) delete mapa.celdas[`${c},${f}`];
          else mapa.celdas[`${c},${f}`] = tipo;
        }
      }
    });
  }

  /** Crea o cambia un tipo de casilla. */
  ponerTipoCasilla(ref: RefObjeto, nombre: string, tipo: TipoCasilla): string {
    const mapa = this.definicion(ref)?.mapa;
    const limpio = nombreDeRecurso(nombre || 'casilla');
    if (!mapa) return limpio;
    this.cambiarObjeto(ref, 'objetos', () => (mapa.tipos[limpio] = tipo));
    return limpio;
  }

  borrarTipoCasilla(ref: RefObjeto, nombre: string): void {
    const mapa = this.definicion(ref)?.mapa;
    if (!mapa || Object.keys(mapa.tipos).length <= 1) return;
    this.cambiarObjeto(ref, 'objetos', () => {
      delete mapa.tipos[nombre];
      for (const [k, v] of Object.entries(mapa.celdas)) if (v === nombre) delete mapa.celdas[k];
    });
  }
}

export type TipoRecurso = 'imagen' | 'sonido' | 'animacion';

/** Los textos entre comillas de una línea de código (sin los comentarios). */
function textosDe(linea: string): string[] {
  const sinComentario = linea.replace(/#.*$/, (c) => (c.split('"').length % 2 === 1 ? '' : c));
  return [...sinComentario.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

/** "Mi Imagen (1).png" → "MiImagen1" (un nombre fácil de escribir en el código). */
/** Una imagen o un sonido tiene que ser de verdad lo que dice (archivos.ts); si no, error claro. */
function comprobarRecurso(datos: string, tipo: TipoRecursoArchivo, nombre: string): void {
  const problema = problemaDataURL(datos, tipo);
  if (problema) throw new ErrorMotor(`No se puede añadir «${nombre}»: ${problema}.`);
}

export function nombreDeRecurso(archivo: string): string {
  const sinExtension = archivo.replace(/\.[a-z0-9]+$/i, '');
  const limpio = sinExtension.normalize('NFC').replace(/[^\p{L}\p{N}_]/gu, '');
  return /^\p{L}/u.test(limpio) ? limpio : `r${limpio || 'ecurso'}`;
}

function plantillaDeScript(nombre: string): string {
  return [
    `# Script de ${nombre}`,
    '# Aquí dices qué hace este objeto. ¿Ideas? Mira la pestaña Guía > Recetas.',
    '',
    'cuando empieza:',
    '    mostrar("Hola, soy " + yo.nombre)',
    '',
    '# Para moverte con las flechas, quita los # de estas dos líneas',
    '# (o, en bloques, arrastra «cuando cada fotograma» y «moverme con las flechas»):',
    '# cuando cada fotograma:',
    '#     yo.moverConFlechas(300)',
    '',
  ].join('\n');
}
