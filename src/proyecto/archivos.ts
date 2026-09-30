/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * ARCHIVOS DE IMAGEN Y SONIDO: comprobar que son lo que dicen ser.
 *
 * Dentro de un proyecto, las imágenes y los sonidos van como "data URL":
 *     data:image/png;base64,iVBORw0KGgo...
 * Por seguridad (ver AUDITORIA_SEGURIDAD.md), un proyecto SOLO puede llevar
 * data URL: nunca una dirección de internet (http://...), porque entonces
 * abrir el proyecto de otra persona avisaría a su servidor de que lo has
 * abierto, y desde dónde.
 *
 * Tampoco nos fiamos del tipo que dice el archivo ("image/png"): miramos sus
 * primeros bytes (la "firma" del formato). Un PNG siempre empieza igual, un
 * MP3 también... Así un archivo disfrazado no pasa.
 */

/** Tamaño máximo de una imagen o un sonido (lo mismo al importar y al abrir un proyecto). */
export const TAMANO_MAXIMO_ARCHIVO = 15 * 1024 * 1024;

export type TipoRecurso = 'imagen' | 'sonido';

const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
const TIPOS_SONIDO = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/x-flac', 'video/webm', 'video/ogg', 'application/ogg'];

const empieza = (b: Uint8Array, firma: number[], desde = 0) => firma.every((x, i) => b[desde + i] === x);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** Por los primeros bytes: ¿qué formato es de verdad? */
export function formatoReal(b: Uint8Array): { tipo: TipoRecurso; formato: string } | null {
  if (empieza(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { tipo: 'imagen', formato: 'png' };
  if (empieza(b, [0xff, 0xd8, 0xff])) return { tipo: 'imagen', formato: 'jpeg' };
  if (empieza(b, ascii('GIF8'))) return { tipo: 'imagen', formato: 'gif' };
  if (empieza(b, ascii('RIFF')) && empieza(b, ascii('WEBP'), 8)) return { tipo: 'imagen', formato: 'webp' };
  if (empieza(b, ascii('BM'))) return { tipo: 'imagen', formato: 'bmp' };
  if (empieza(b, ascii('RIFF')) && empieza(b, ascii('WAVE'), 8)) return { tipo: 'sonido', formato: 'wav' };
  if (empieza(b, ascii('OggS'))) return { tipo: 'sonido', formato: 'ogg' };
  if (empieza(b, ascii('fLaC'))) return { tipo: 'sonido', formato: 'flac' };
  if (empieza(b, ascii('ID3'))) return { tipo: 'sonido', formato: 'mp3' };
  if (empieza(b, [0x1a, 0x45, 0xdf, 0xa3])) return { tipo: 'sonido', formato: 'webm' };
  if (empieza(b, ascii('ftyp'), 4)) return { tipo: 'sonido', formato: 'm4a' };
  // MP3 sin etiqueta y AAC "ADTS": empiezan con 11 bits a 1 (sincronía de cuadro)
  if (b[0] === 0xff && b.length > 1 && (b[1] & 0xe0) === 0xe0) return { tipo: 'sonido', formato: 'mp3' };
  return null;
}

/** Base64 → bytes (los primeros `cuantos`, que es lo único que hace falta para la firma). */
function decodificar(base64: string, cuantos?: number): Uint8Array {
  const trozo = cuantos === undefined ? base64 : base64.slice(0, Math.ceil(cuantos / 3) * 4);
  const binario = atob(trozo);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * Un SVG es texto, y un texto puede llevar cosas peligrosas: <script>,
 * enlaces a internet... Solo aceptamos los que son dibujo y nada más.
 */
function problemaSVG(texto: string): string | null {
  if (!/<svg[\s>]/i.test(texto)) return 'no es un dibujo SVG';
  if (/<script|<foreignobject|<iframe|<embed|<object|javascript:|\son[a-z]+\s*=/i.test(texto)) return 'el SVG lleva código dentro, y eso no se permite';
  if (/(href|src)\s*=\s*["']?\s*(https?:|\/\/|data:text)/i.test(texto) || /url\(\s*["']?\s*(https?:|\/\/)/i.test(texto) || /@import/i.test(texto)) {
    return 'el SVG carga cosas de internet, y eso no se permite';
  }
  return null;
}

/**
 * ¿Es una data URL buena para una imagen o un sonido? Devuelve el problema
 * (en español, para el error) o null si está bien.
 */
export function problemaDataURL(valor: string, esperado: TipoRecurso): string | null {
  const que = esperado === 'imagen' ? 'una imagen' : 'un sonido';
  if (!valor.startsWith('data:')) {
    return /^(https?:|\/\/|ftp:|file:|blob:)/i.test(valor.trim())
      ? `es una dirección de internet o del ordenador («${valor.slice(0, 60)}»). Por seguridad, los proyectos solo pueden llevar ${que} dentro del propio archivo`
      : `no es ${que} guardado dentro del proyecto`;
  }
  const m = /^data:([a-z0-9.+/-]+)(;[a-z0-9=.+-]+)*;base64,([A-Za-z0-9+/]*={0,2})$/i.exec(valor);
  if (!m) return `no es ${que} bien guardado (tiene que ser "data:...;base64,...")`;
  const mime = m[1].toLowerCase();
  const permitidos = esperado === 'imagen' ? TIPOS_IMAGEN : TIPOS_SONIDO;
  if (!permitidos.includes(mime)) return `es de tipo "${mime}", y ${que === 'una imagen' ? 'las imágenes' : 'los sonidos'} de Chispa solo pueden ser ${esperado === 'imagen' ? 'PNG, JPG, GIF, WEBP, BMP o SVG' : 'MP3, OGG, WAV, WEBM, M4A o FLAC'}`;
  const base64 = m[3];
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > TAMANO_MAXIMO_ARCHIVO) return `es demasiado grande (${(bytes / 1024 / 1024).toFixed(1)} MB; el máximo es ${TAMANO_MAXIMO_ARCHIVO / 1024 / 1024} MB)`;
  if (!base64.length) return 'está vacío';
  let inicio: Uint8Array;
  try {
    inicio = decodificar(base64, 64);
  } catch {
    return `no es ${que} bien guardado (el base64 está roto)`;
  }
  if (mime === 'image/svg+xml') {
    let texto: string;
    try {
      texto = new TextDecoder().decode(decodificar(base64));
    } catch {
      return 'no es un SVG bien guardado';
    }
    return problemaSVG(texto);
  }
  const real = formatoReal(inicio);
  if (!real) return `dice ser ${que}, pero por dentro no lo es (no tiene la firma de ningún formato conocido)`;
  if (real.tipo !== esperado) return `dice ser ${que}, pero por dentro es ${real.tipo === 'imagen' ? 'una imagen' : 'un sonido'} (${real.formato})`;
  return null;
}

/** Para importar un archivo del ordenador: ¿es de verdad una imagen o un sonido? Mira sus primeros bytes. */
export async function tipoRealDeArchivo(archivo: Blob & { name: string; type: string }): Promise<TipoRecurso | null> {
  const bytes = new Uint8Array(await archivo.slice(0, 64).arrayBuffer());
  const real = formatoReal(bytes);
  if (real) return real.tipo;
  // Los SVG son texto: se comprueban enteros al guardarlos (problemaDataURL)
  if (archivo.type === 'image/svg+xml' || /\.svg$/i.test(archivo.name)) return 'imagen';
  return null;
}
