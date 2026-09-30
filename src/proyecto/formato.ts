/**
 * FORMATO DEL PROYECTO: la descripción completa de un juego en un objeto JSON.
 *
 * DECISIÓN: todo el juego (escenas, plantillas, imágenes, sonidos, animaciones
 * y el CÓDIGO de los scripts) cabe en UN SOLO JSON. Así:
 *   - El editor lo guarda y lo carga tal cual (un archivo .chispa.json).
 *   - Exportar el juego es meter este JSON dentro de una página web.
 *   - Las imágenes y sonidos que importas se guardan dentro, como "data URL",
 *     y el proyecto nunca pierde archivos por el camino.
 *
 * "plantillas" son como los Prefabs de Unity o los modelos de ReplicatedStorage
 * en Roblox: objetos que no están en la escena pero que se pueden clonar con
 * crear("Nombre").
 *
 * Coordenadas: la Y crece hacia ARRIBA y (0,0) es la esquina inferior
 * izquierda de la pantalla al empezar.
 */
import type { FormaSprite } from '../objetos/componentes/Sprite';
import type { TipoCasilla } from '../objetos/componentes/MapaCasillas';
import type { DefAnimacion } from '../objetos/componentes/Animador';
import type { Limites } from '../objetos/Camara';
import { ErrorMotor } from '../motor/Errores';

export const VERSION_PROYECTO = 2;

export interface DefSprite {
  imagen?: string;
  forma?: FormaSprite;
  color?: string;
  ancho?: number;
  alto?: number;
  capa?: number;
  visible?: boolean;
  opacidad?: number;
  voltear?: boolean;
  /** Pegado a la pantalla (interfaz). */
  fijo?: boolean;
  texto?: string;
  tamano?: number;
  colorTexto?: string;
  alinear?: 'izquierda' | 'centro' | 'derecha';
}

export interface DefColision {
  ancho?: number;
  alto?: number;
  /** falso = "fantasma": se atraviesa, pero avisa con "cuando toco". */
  solido?: boolean;
  desplazamientoX?: number;
  desplazamientoY?: number;
  /** Plataforma que se atraviesa desde abajo (solo para a lo que cae encima). */
  soloDesdeArriba?: boolean;
}

/** Se mueve solo según otro objeto: lo sigue, lo persigue si está cerca o huye de él. */
export interface DefComportamiento {
  tipo: 'seguir' | 'perseguir' | 'huir';
  /** Nombre, tipo o etiqueta del otro objeto. */
  objetivo: string;
  /** Píxeles por segundo (150 si no se dice). */
  rapidez?: number;
  /** seguir: a qué distancia se queda. perseguir y huir: desde qué distancia reacciona. */
  distancia?: number;
}

/** Camino que sigue el objeto él solo (plataformas que se mueven, enemigos que patrullan). */
export interface DefRecorrido {
  /** Puntos RELATIVOS al sitio donde empieza el objeto (el inicio no se escribe). */
  puntos: { x: number; y: number }[];
  /** Píxeles por segundo (100 si no se dice). */
  rapidez?: number;
  /** idaYVuelta (por defecto) o bucle. */
  modo?: 'idaYVuelta' | 'bucle';
  /** Segundos parado en cada extremo (0.5 si no se dice). */
  pausa?: number;
}

export interface DefFisica {
  gravedad?: number;
  estatico?: boolean;
  rozamiento?: number;
  rebote?: number;
  masa?: number;
}

export interface DefMapa {
  tamano: number;
  capa?: number;
  tipos: Record<string, TipoCasilla>;
  /** "columna,fila" → nombre del tipo */
  celdas: Record<string, string>;
}

export interface DefObjeto {
  nombre?: string;
  tipo?: string;
  /**
   * Si es una copia ENLAZADA de una plantilla, su nombre: al cambiar una copia
   * (o la plantilla) cambian todas, menos el nombre y el sitio de cada una.
   */
  plantilla?: string;
  x?: number;
  y?: number;
  rotacion?: number;
  escala?: number;
  sprite?: DefSprite;
  colision?: DefColision;
  fisica?: DefFisica;
  mapa?: DefMapa;
  recorrido?: DefRecorrido;
  comportamiento?: DefComportamiento;
  /** Animación con la que empieza. */
  animacion?: string;
  /** Nombre de un script de `proyecto.scripts`. */
  script?: string;
  /** Propiedades propias con su valor inicial (como los Attributes de Roblox): vida = 3... */
  propiedades?: Record<string, DatoInicial>;
}

export interface DefCamara {
  x?: number;
  y?: number;
  zoom?: number;
  /** Nombre del objeto al que sigue desde el principio. */
  seguir?: string;
  limites?: Limites;
  /** La cámara no enseña nada fuera de los mapas de casillas de la escena. */
  limitarAlMapa?: boolean;
}

export interface DefEscena {
  colorFondo: string;
  /** Gravedad en píxeles/segundo² (0 = vista desde arriba). Por defecto 1500. */
  gravedad?: number;
  camara?: DefCamara;
  objetos: DefObjeto[];
}

export interface DefProyecto {
  formato: 'chispa-proyecto';
  version: number;
  nombre: string;
  ancho: number;
  alto: number;
  pixelArt?: boolean;
  /** En el juego exportado, botones en la pantalla de los móviles (si no se dice: sí). */
  controlesTactiles?: boolean;
  /** nombre corto → ruta del archivo o "data URL" */
  imagenes: Record<string, string>;
  /** nombre corto → ruta del archivo o "data URL" (.mp3, .ogg, .wav) */
  sonidos: Record<string, string>;
  animaciones: Record<string, DefAnimacion>;
  /** nombre del archivo (.chs) → código */
  scripts: Record<string, string>;
  plantillas: Record<string, DefObjeto>;
  escenas: Record<string, DefEscena>;
  escenaInicial: string;
  /** Valores con los que empieza `juego` (puntos, vidas...), puestos en el editor. */
  datos?: Record<string, DatoInicial>;
}

/** Un valor inicial (de `juego` o de una propiedad propia): un número, un texto o verdadero/falso. */
export type DatoInicial = number | string | boolean;

/** Lo que se escribe en el editor como valor inicial: "3" → 3, "verdadero" → verdadero, lo demás es texto. */
export function leerDatoInicial(texto: string): DatoInicial {
  const t = texto.trim();
  if (t === 'verdadero' || t === 'falso') return t === 'verdadero';
  const n = Number(t.replace(',', '.'));
  if (t !== '' && Number.isFinite(n)) return n;
  return t.replace(/^"(.*)"$/, '$1');
}

/**
 * Acepta un proyecto de cualquier versión y lo devuelve en la versión actual.
 * Si no es un proyecto de Chispa, da un error amable.
 */
export function migrarProyecto(datos: unknown): DefProyecto {
  const p = datos as Record<string, unknown> | null;
  if (!p || typeof p !== 'object' || p.formato !== 'chispa-proyecto') {
    throw new ErrorMotor('Este archivo no es un proyecto de Chispa.', 'Los proyectos de Chispa son archivos .chispa.json guardados desde el editor.');
  }
  const version = typeof p.version === 'number' ? p.version : 1;
  if (version > VERSION_PROYECTO) {
    throw new ErrorMotor('Este proyecto se hizo con una versión más nueva de Chispa.', 'Actualiza el motor para poder abrirlo.');
  }
  // v1 → v2: una sola escena ("escena" + "colorFondo") pasa a ser la escena "Principal"
  if (version === 1) {
    const v1 = p as unknown as { escena?: DefObjeto[]; colorFondo?: string } & Partial<DefProyecto>;
    return completar({
      ...v1,
      version: 2,
      escenas: { Principal: { colorFondo: v1.colorFondo ?? '#1e2233', objetos: v1.escena ?? [] } },
      escenaInicial: 'Principal',
    } as DefProyecto);
  }
  return completar(p as unknown as DefProyecto);
}

/** Rellena lo que falte con valores por defecto (así nunca hay "undefined" sueltos). */
function completar(p: DefProyecto): DefProyecto {
  const escenas = p.escenas && Object.keys(p.escenas).length ? p.escenas : { Principal: { colorFondo: '#1e2233', objetos: [] } };
  return {
    formato: 'chispa-proyecto',
    version: VERSION_PROYECTO,
    nombre: p.nombre ?? 'Mi juego',
    ancho: p.ancho ?? 960,
    alto: p.alto ?? 540,
    pixelArt: p.pixelArt ?? false,
    controlesTactiles: p.controlesTactiles ?? true,
    imagenes: p.imagenes ?? {},
    sonidos: p.sonidos ?? {},
    animaciones: p.animaciones ?? {},
    scripts: p.scripts ?? {},
    plantillas: p.plantillas ?? {},
    escenas,
    escenaInicial: p.escenaInicial && escenas[p.escenaInicial] ? p.escenaInicial : Object.keys(escenas)[0],
    datos: p.datos ?? {},
  };
}

/** Un proyecto nuevo, vacío, listo para empezar. */
export function proyectoVacio(nombre = 'Mi juego'): DefProyecto {
  return completar({ nombre } as DefProyecto);
}

/**
 * El TIPO de un objeto si no se ha dicho otro: su nombre sin los números del
 * final. Así "Moneda", "Moneda2" y "Moneda3" son todas del tipo "Moneda", y
 * `cuando toco Moneda` funciona con todas (al duplicar un objeto sale "Moneda2").
 */
export function tipoPorNombre(nombre: string): string {
  return nombre.replace(/\d+$/, '') || nombre;
}

/** El tipo de un objeto definido en el editor. */
export function tipoDe(def: DefObjeto, nombrePorDefecto = 'Objeto'): string {
  return def.tipo ?? tipoPorNombre(def.nombre ?? nombrePorDefecto);
}

/** Todos los nombres (y tipos) de objetos que pueden existir: los de todas las escenas y las plantillas. */
export function nombresDeObjetos(p: DefProyecto): string[] {
  const nombres = Object.values(p.escenas).flatMap((e) => e.objetos.flatMap((o) => [o.nombre ?? '', tipoDe(o)]));
  return [...new Set([...nombres, ...Object.keys(p.plantillas)])].filter(Boolean);
}
