/**
 * IMPORTAR ARCHIVOS: imágenes y sonidos del ordenador al proyecto.
 * Lo usan el botón «Importar» y soltar archivos encima del editor.
 */
import type { EstadoEditor } from '../estado/EstadoEditor';
import { leerComoDataURL } from '../escena/VistaEscena';

/** Más grande que esto no cabe bien en un proyecto que se guarda en el navegador. */
export const TAMANO_MAXIMO = 15 * 1024 * 1024;

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
      r.rechazados.push(`"${archivo.name}" es demasiado grande (más de 15 MB)`);
      continue;
    }
    const datos = await leerComoDataURL(archivo);
    if (tipo === 'imagen') r.imagenes.push(estado.agregarImagen(archivo.name, datos));
    else r.sonidos.push(estado.agregarSonido(archivo.name, datos));
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
