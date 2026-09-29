/**
 * UN ZIP MUY SENCILLO: para subir el juego a itch.io, que pide los juegos web
 * dentro de un .zip con un index.html.
 *
 * DECISIÓN: los archivos se guardan SIN COMPRIMIR ("stored"). Así el código
 * cabe en unas pocas líneas y no hace falta ninguna biblioteca. Para un juego
 * de Chispa da igual: es una sola página, e itch.io la sirve comprimida de
 * todas formas.
 *
 * Formato (APPNOTE de PKWARE): por cada archivo, una cabecera local y sus
 * bytes; al final, el directorio central con una entrada por archivo y el
 * registro de fin de directorio.
 */

export interface ArchivoZip {
  nombre: string;
  contenido: string | Uint8Array;
  /** Fecha del archivo (por defecto, ahora). */
  fecha?: Date;
}

// Tabla para calcular el CRC-32 (el mismo que usan ZIP, PNG y gzip)
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 de unos bytes: una "huella" de 4 bytes para comprobar que el archivo llega bien. */
export function crc32(datos: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en el formato de MS-DOS que usa ZIP (resolución de 2 segundos, desde 1980). */
function fechaDOS(d: Date): { hora: number; dia: number } {
  const anio = Math.max(1980, d.getFullYear());
  return {
    hora: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    dia: ((anio - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/** Crea un .zip con estos archivos (sin comprimir). Los nombres pueden llevar carpetas: "img/fondo.png". */
export function crearZip(archivos: ArchivoZip[]): Uint8Array {
  const codificador = new TextEncoder();
  const locales: Uint8Array[] = [];
  const centrales: Uint8Array[] = [];
  let desplazamiento = 0;

  for (const a of archivos) {
    const nombre = codificador.encode(a.nombre);
    const datos = typeof a.contenido === 'string' ? codificador.encode(a.contenido) : a.contenido;
    const crc = crc32(datos);
    const { hora, dia } = fechaDOS(a.fecha ?? new Date());
    // Bit 11: los nombres van en UTF-8 (para que "niño.png" se vea bien)
    const banderas = 0x0800;

    const local = new Uint8Array(30 + nombre.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true); // firma de cabecera local
    l.setUint16(4, 20, true); // versión necesaria (2.0)
    l.setUint16(6, banderas, true);
    l.setUint16(8, 0, true); // método 0 = sin comprimir
    l.setUint16(10, hora, true);
    l.setUint16(12, dia, true);
    l.setUint32(14, crc, true);
    l.setUint32(18, datos.length, true); // tamaño comprimido
    l.setUint32(22, datos.length, true); // tamaño real
    l.setUint16(26, nombre.length, true);
    l.setUint16(28, 0, true); // sin campo extra
    local.set(nombre, 30);

    const central = new Uint8Array(46 + nombre.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true); // firma del directorio central
    c.setUint16(4, 20, true); // hecho con la versión 2.0
    c.setUint16(6, 20, true); // versión necesaria
    c.setUint16(8, banderas, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, hora, true);
    c.setUint16(14, dia, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, datos.length, true);
    c.setUint32(24, datos.length, true);
    c.setUint16(28, nombre.length, true);
    // (30: extra, 32: comentario, 34: disco, 36: atributos internos: todo 0)
    c.setUint32(38, 0, true); // atributos externos
    c.setUint32(42, desplazamiento, true); // dónde empieza su cabecera local
    central.set(nombre, 46);

    locales.push(local, datos);
    centrales.push(central);
    desplazamiento += local.length + datos.length;
  }

  const tamanoCentral = centrales.reduce((s, x) => s + x.length, 0);
  const fin = new Uint8Array(22);
  const f = new DataView(fin.buffer);
  f.setUint32(0, 0x06054b50, true); // firma de fin del directorio central
  f.setUint16(8, archivos.length, true); // entradas en este disco
  f.setUint16(10, archivos.length, true); // entradas en total
  f.setUint32(12, tamanoCentral, true);
  f.setUint32(16, desplazamiento, true); // dónde empieza el directorio central

  const partes = [...locales, ...centrales, fin];
  const total = new Uint8Array(partes.reduce((s, x) => s + x.length, 0));
  let i = 0;
  for (const p of partes) {
    total.set(p, i);
    i += p.length;
  }
  return total;
}
