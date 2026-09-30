/**
 * IMPORTAR ARCHIVOS: imágenes y sonidos del ordenador al proyecto.
 * Lo usan el botón «Importar» y soltar archivos encima del editor.
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import { leerComoDataURL } from '../escena/VistaEscena';
import { TAMANO_MAXIMO_ARCHIVO, formatoReal, tipoRealDeArchivo } from '../../proyecto/archivos';
import { ErrorMotor } from '../../motor/Errores';

/** Más grande que esto no cabe bien en un proyecto que se guarda en el navegador. */
export const TAMANO_MAXIMO = TAMANO_MAXIMO_ARCHIVO;

/** El tipo que se escribe en la data URL, según lo que el archivo ES de verdad (no lo que dice su nombre). */
const MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', mp3: 'audio/mpeg', webm: 'audio/webm', m4a: 'audio/mp4' };

/** data:application/octet-stream;base64,... → data:image/png;base64,... (con el tipo de verdad). */
function conTipoReal(datos: string): string {
  const coma = datos.indexOf(',');
  if (coma < 0 || !/;base64$/i.test(datos.slice(0, coma))) return datos;
  let inicio: Uint8Array;
  try {
    const bin = atob(datos.slice(coma + 1, coma + 1 + 88));
    inicio = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return datos;
  }
  const real = formatoReal(inicio);
  return real ? `data:${MIME[real.formato]};base64,${datos.slice(coma + 1)}` : datos;
}

export interface ResultadoImportar {
  imagenes: string[];
  sonidos: string[];
  /** Archivos que no se han podido importar, con el motivo. */
  rechazados: string[];
}

/** ¿Es una imagen o un sonido? Por el tipo que dice el navegador o, si no lo dice, por la extensión. */
export function tipoDeArchivo(archivo: { name: string; type: string }): 'imagen' | 'sonido' | null {
  if (archivo.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(archivo.name)) return 'imagen';
  if (archivo.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|aac|flac|webm)$/i.test(archivo.name)) return 'sonido';
  return null;
}

export async function importarArchivos(estado: EstadoEditor, archivos: Iterable<File>): Promise<ResultadoImportar> {
  const r: ResultadoImportar = { imagenes: [], sonidos: [], rechazados: [] };
  for (const archivo of archivos) {
    const tipo = tipoDeArchivo(archivo);
    if (!tipo) {
      r.rechazados.push(`"${archivo.name}" no es una imagen ni un sonido`);
      continue;
    }
    if (archivo.size > TAMANO_MAXIMO) {
      r.rechazados.push(`"${archivo.name}" es demasiado grande (más de ${TAMANO_MAXIMO / 1024 / 1024} MB)`);
      continue;
    }
    // No nos fiamos del nombre ni de lo que dice el navegador: miramos los primeros bytes
    const real = await tipoRealDeArchivo(archivo);
    if (real !== tipo) {
      r.rechazados.push(real ? `"${archivo.name}" dice ser ${tipo === 'imagen' ? 'una imagen' : 'un sonido'}, pero por dentro es ${real === 'imagen' ? 'una imagen' : 'un sonido'}` : `"${archivo.name}" no es de verdad ${tipo === 'imagen' ? 'una imagen' : 'un sonido'} (o está dañado)`);
      continue;
    }
    try {
      const datos = conTipoReal(await leerComoDataURL(archivo));
      if (tipo === 'imagen') r.imagenes.push(estado.agregarImagen(archivo.name, datos));
      else r.sonidos.push(estado.agregarSonido(archivo.name, datos));
    } catch (e) {
      r.rechazados.push(e instanceof ErrorMotor ? e.message.replace(/^No se puede añadir /, '').replace(/\.$/, '') : `"${archivo.name}" no se ha podido leer`);
    }
  }
  return r;
}

/** El mensaje para contar lo que ha pasado. */
export function resumenImportar(r: ResultadoImportar): { texto: string; tipo: 'ok' | 'error' } | null {
  const partes: string[] = [];
  if (r.imagenes.length) partes.push(`${r.imagenes.length === 1 ? 'Imagen' : 'Imágenes'}: ${r.imagenes.join(', ')}`);
  if (r.sonidos.length) partes.push(`${r.sonidos.length === 1 ? 'Sonido' : 'Sonidos'}: ${r.sonidos.join(', ')}`);
  if (!partes.length && !r.rechazados.length) return null;
  const texto = [partes.length ? `Importado. ${partes.join(' · ')}.` : '', r.rechazados.length ? `No se ha podido: ${r.rechazados.join('; ')}. Se pueden importar imágenes (.png, .jpg, .gif, .svg) y sonidos (.mp3, .ogg, .wav).` : ''].filter(Boolean).join(' ');
  return { texto, tipo: partes.length ? 'ok' : 'error' };
}
