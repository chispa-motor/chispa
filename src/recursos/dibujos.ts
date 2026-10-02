/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS DIBUJOS QUE TRAE CHISPA: personajes, enemigos, objetos y casillas de
 * 16×16 píxeles, hechos para Chispa (son originales: se pueden usar en
 * cualquier juego, también para venderlo, sin pedir permiso ni poner el
 * nombre de nadie).
 *
 * Cada dibujo está escrito con letras: cada letra es un color de la PALETA y
 * el punto es «transparente». Así se pueden leer y retocar aquí mismo. Los
 * que son simétricos solo llevan su mitad izquierda (8 letras por fila): la
 * derecha es su reflejo. Las casillas (hierba, ladrillo, agua...) se pintan
 * con una receta, para que encajen unas con otras al repetirse.
 */
import { codificarPNG, pngADataURL } from './png';

/** Los colores: una letra para cada uno. */
export const PALETA: Record<string, string> = {
  k: '#1b1b2f', w: '#ffffff', g: '#9aa5b1', d: '#5b6472',
  r: '#e43b44', R: '#a22633', o: '#f77622', y: '#fee761', Y: '#f9a31b',
  l: '#63c74d', G: '#3e8948', b: '#0099db', B: '#124e89', c: '#2ce8f5',
  p: '#ff77a8', P: '#8b5cb5', s: '#f4c9a0', S: '#c28569', n: '#b86f50', N: '#733e39', h: '#5a3a22',
};

export const CATEGORIAS_DIBUJOS = ['personajes', 'enemigos', 'objetos', 'casillas'] as const;
export type CategoriaDibujo = (typeof CATEGORIAS_DIBUJOS)[number];

export interface Dibujo {
  nombre: string;
  /** Cómo se llama en la lista (con tildes). */
  titulo: string;
  categoria: CategoriaDibujo;
  /** 16 filas de 16 letras (o de 8, si es simétrico: la mitad izquierda). */
  filas: string[];
  /** Dibujado mirando hacia arriba, pero se entrega tumbado: mirando a la DERECHA (hacia donde va yo.avanzar con rotación 0). */
  tumbado?: boolean;
}

const LADO = 16;
const VACIA = '........';

const dibujo = (nombre: string, titulo: string, categoria: CategoriaDibujo, filas: string[]): Dibujo => ({ nombre, titulo, categoria, filas });

const tumbar = (d: Dibujo): Dibujo => ({ ...d, tumbado: true });

const DIBUJADOS: Dibujo[] = [
  // ── Personajes ──
  dibujo('heroe', 'Héroe', 'personajes', [
    VACIA, '.....kkk', '....khhh', '...khhhh', '...khhss', '...kssks', '...kssss', '....ksss',
    '...kkbbb', '..kbkbbb', '..kskbbb', '...kkbbb', '....kBBB', '....kBBk', '....kNNk', '....kkkk',
  ]),
  dibujo('heroe2', 'Héroe (andando)', 'personajes', [
    VACIA, VACIA, '.....kkk', '....khhh', '...khhhh', '...khhss', '...kssks', '...kssss',
    '....ksss', '..kkkbbb', '.ksbkbbb', '..kkkbbb', '....kBBB', '...kBBk.', '...kNNk.', '...kkkk.',
  ]),
  dibujo('heroina', 'Heroína', 'personajes', [
    VACIA, '.....kkk', '....kooo', '...koooo', '...kooss', '...kosks', '..kkosss', '..kooksS',
    '..kookpp', '..kkkppp', '..kskppp', '...kkppp', '....kPPP', '....kPPk', '....kNNk', '....kkkk',
  ]),
  dibujo('robot', 'Robot', 'personajes', [
    '.......r', '.......k', '...kkkkk', '..kggggg', '..kgccgg', '..kgccgg', '..kggggg', '...kkkkk',
    '..kkdddd', '.kgkdddd', '.kgkdyyd', '.kkkdddd', '...kdddd', '...kkkkk', '...kggk.', '...kkkk.',
  ]),
  dibujo('gato', 'Gato', 'personajes', [
    VACIA, '..k.....', '.kok....', '.kookkkk', '.koooooo', '.koowkoo', '.koooooo', '.kooooop',
    '..kooooo', '...kkkkk', '..kooooo', '.koooooo', '.koooooo', '.kowoooo', '.kkwwkoo', '..kkkkkk',
  ]),
  dibujo('nave', 'Nave', 'personajes', [
    '.......w', '......kw', '......kc', '.....kbc', '.....kbc', '....kbbb', '....kbbb', '...kbbbb',
    '..kgbbbb', '.kggbbBB', 'kgggbbBB', 'kggkkbbb', 'kgk..kbb', 'kk...koo', '......oy', '.......y',
  ]),
  tumbar(dibujo('coche', 'Coche (visto desde arriba)', 'personajes', [
    VACIA, '....kkkk', '...krrrr', '..kyrrrr', '..krrrrr', '.kkrcccc', '.kkrcccc', '..krrrrr',
    '..krRRRR', '..krRRRR', '..krrrrr', '.kkrcccc', '.kkrrrrr', '..krrrrr', '..kRrrrr', '...kkkkk',
  ])),
  // ── Enemigos ──
  dibujo('slime', 'Slime', 'enemigos', [
    VACIA, VACIA, VACIA, VACIA, VACIA, '.....kkk', '...kklll', '..kllwll',
    '.kllllll', '.klllkll', 'kllllkll', 'klllllll', 'klllllll', 'kGllllll', 'kGGGGGGG', '.kkkkkkk',
  ]),
  dibujo('slime2', 'Slime (aplastado)', 'enemigos', [
    VACIA, VACIA, VACIA, VACIA, VACIA, VACIA, VACIA, '....kkkk',
    '..kkllll', '.kllwlll', 'kllllkll', 'kllllkll', 'klllllll', 'kGllllll', 'kGGGGGGG', '.kkkkkkk',
  ]),
  dibujo('murcielago', 'Murciélago', 'enemigos', [
    VACIA, VACIA, 'k.......', 'kk...k..', 'kPk..kk.', 'kPPk.kPk', 'kPPPkkPP', 'kPPPPkPP',
    '.kPPPPrP', '.kPPPPPP', '..kkPPPP', '....kPwP', '.....kkk', VACIA, VACIA, VACIA,
  ]),
  dibujo('murcielago2', 'Murciélago (alas abajo)', 'enemigos', [
    VACIA, VACIA, VACIA, '.....k..', '.....kk.', '....kkPk', '..kkkkPP', '.kPPPkPP',
    'kPPPPPrP', 'kPPPPPPP', 'kPPkkPPP', 'kPk..kwP', 'kk....kk', 'k.......', VACIA, VACIA,
  ]),
  dibujo('fantasma', 'Fantasma', 'enemigos', [
    VACIA, '.....kkk', '...kkwww', '..kwwwww', '.kwwwwww', '.kwwkkww', '.kwwkkww', '.kwwwwww',
    '.kwwwwwk', '.kwwwwww', '.kwwwwww', '.kwwwwww', '.kwwwwww', '.kwkwwkw', '.kk.kk.k', VACIA,
  ]),
  dibujo('ovni', 'Nave enemiga', 'enemigos', [
    VACIA, '......kk', '.....kcc', '....kccw', '....kccc', '..kkkkkk', '.kRRrrrr', 'kRrryrry',
    'kRrrrrrr', '.kkRRRRR', '...kkkkk', '....k..k', '...k....', VACIA, VACIA, VACIA,
  ]),
  dibujo('pinchos', 'Bola de pinchos', 'enemigos', [
    '.......k', '...k..kg', '..kgkkgg', '...kgggg', '..kggwgg', '.kkggggg', '..kggggg', 'kkgggggg',
    'kkgggggg', '..kggggd', '.kkggggd', '..kggddd', '...kgddd', '..kgkkdd', '...k..kd', '.......k',
  ]),
  // ── Objetos ──
  dibujo('moneda', 'Moneda', 'objetos', [
    VACIA, '.....kkk', '...kkyyy', '..kyyyyy', '..kyyYYy', '.kyywyYy', '.kyywyYy', '.kyyyyYy',
    '.kyyyyYy', '.kyyyyYy', '.kyyyyYy', '..kyyYYy', '..kYyyyy', '...kkYYY', '.....kkk', VACIA,
  ]),
  dibujo('corazon', 'Corazón', 'objetos', [
    VACIA, VACIA, '..kkkk..', '.krrrrk.', 'krwrrrrk', 'krwrrrrr', 'krrrrrrr', 'krrrrrrr',
    '.krrrrrr', '..krrrrr', '...krrrr', '....krrr', '.....krr', '......kr', '.......k', VACIA,
  ]),
  dibujo('llave', 'Llave', 'objetos', [
    '................', '......kkkk......', '.....kyyyyk.....', '....kyykkyyk....', '....kyk..kyk....', '....kyk..kyk....', '....kyykkyyk....', '.....kyyyyk.....',
    '......kyyk......', '......kyyk......', '......kyyk......', '......kyykkk....', '......kyyyyk....', '......kyykkk....', '......kyyyyk....', '......kkkkkk....',
  ]),
  dibujo('cofre', 'Cofre', 'objetos', [
    VACIA, VACIA, VACIA, '..kkkkkk', '.knnnnnn', 'knnnnnnn', 'knNNNNNN', 'kkkkkkky',
    'knnnnnyy', 'knnnnnny', 'knnnnnnn', 'knnnnnnn', 'knNNNNNN', 'kkkkkkkk', VACIA, VACIA,
  ]),
  dibujo('gema', 'Gema', 'objetos', [
    VACIA, VACIA, VACIA, '...kkkkk', '..kcwccc', '.kcwcccc', 'kccccccc', '.kbccccb',
    '..kbcccb', '...kbccb', '....kbcb', '.....kbb', '......kb', '.......k', VACIA, VACIA,
  ]),
  dibujo('estrella', 'Estrella', 'objetos', [
    '.......k', '......ky', '......ky', '.....kyy', '.....kyy', 'kkkkkyyy', 'kyyyyyyy', '.kyyyyyy',
    '..kyyyyy', '...kyyyy', '...kyyyy', '..kyyyyy', '..kyyykk', '.kyykk..', '.kkk....', VACIA,
  ]),
  dibujo('bomba', 'Bomba', 'objetos', [
    '.......o', '.......n', '.......n', '.....kkk', '...kkddd', '..kddddd', '.kdwdddd', '.kdwdddd',
    'kddddddd', 'kddddddd', 'kddddddd', '.kdddddd', '.kdddddd', '..kddddd', '...kkddd', '.....kkk',
  ]),
  dibujo('pocion', 'Poción', 'objetos', [
    VACIA, '.....kkk', '.....knn', '.....kkk', '......kw', '......kw', '.....kww', '....kwww',
    '...kwwww', '..krrrrr', '.krrrrrr', '.krwrrrr', '.krrrrrr', '.krrrrrr', '..krrrrr', '...kkkkk',
  ]),
  dibujo('bala', 'Bala', 'objetos', [
    VACIA, VACIA, VACIA, VACIA, VACIA, '......kk', '.....kyy', '....kyyw',
    '....kyyw', '.....kyy', '......kk', VACIA, VACIA, VACIA, VACIA, VACIA,
  ]),
  dibujo('bandera', 'Bandera (meta)', 'objetos', [
    '................', '...kk...........', '...kgkkkkkk.....', '...kgrrrrrrkk...', '...kgrrrrrrrrk..', '...kgrrrrrrrrk..', '...kgrrrrrrkk...', '...kgkkkkkk.....',
    '...kgk..........', '...kgk..........', '...kgk..........', '...kgk..........', '...kgk..........', '...kgk..........', '..kkgkk.........', '..kkkkk.........',
  ]),
];

// ───────────────────────── Casillas: se pintan con una receta ─────────────────────────

/** Un «azar» que da siempre lo mismo para la misma casilla y el mismo punto (así el dibujo no cambia nunca). */
function grano(x: number, y: number, semilla: number): number {
  let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(semilla + 1, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Pinta una casilla: para cada punto (x, y), el color (una letra de la paleta, o un código #rrggbb). */
type Receta = (x: number, y: number) => string;

const CASILLAS: [string, string, Receta][] = [
  ['hierba', 'Hierba', (x, y) => {
    const alto = 3 + (grano(x, 0, 1) > 0.6 ? 1 : 0);
    if (y < alto) return y === 0 || grano(x, y, 2) > 0.75 ? 'l' : 'G';
    return grano(x, y, 3) > 0.85 ? 'N' : grano(x, y, 4) > 0.9 ? '#c98a66' : 'n';
  }],
  // La hierba vista desde arriba: toda verde, con matas más claras y más oscuras
  ['cesped', 'Césped (visto desde arriba)', (x, y) => (grano(x, y, 12) > 0.9 ? 'l' : grano(x, y, 13) > 0.88 ? '#2f8f3e' : grano(x >> 1, y >> 1, 14) > 0.8 ? '#45ad52' : 'G')],
  ['tierra', 'Tierra', (x, y) => (grano(x, y, 5) > 0.86 ? 'N' : grano(x, y, 6) > 0.9 ? '#c98a66' : 'n')],
  ['ladrillo', 'Ladrillo', (x, y) => {
    const fila = Math.floor(y / 4);
    const xx = (x + (fila % 2) * 4) % 8;
    if (y % 4 === 3 || xx === 7) return '#c9c0b0';
    return y % 4 === 2 || grano(Math.floor((x + (fila % 2) * 4) / 8), fila, 7) > 0.6 ? 'R' : '#c8553d';
  }],
  ['piedra', 'Piedra', (x, y) => {
    const fila = Math.floor(y / 8);
    const xx = (x + fila * 4) % 8;
    if (y % 8 === 7 || xx === 7) return 'd';
    return y % 8 === 0 || xx === 0 ? '#b8c2cc' : grano(x, y, 8) > 0.88 ? '#7d8794' : 'g';
  }],
  ['agua', 'Agua', (x, y) => {
    const ola = (x + Math.floor(y / 4) * 5) % 8;
    if (y % 4 === 1 && ola < 3) return '#8fe3ff';
    return y % 4 === 2 && ola >= 4 && ola < 6 ? '#0b7fc0' : 'b';
  }],
  ['arena', 'Arena', (x, y) => (grano(x, y, 9) > 0.88 ? '#d9a858' : grano(x, y, 10) > 0.93 ? '#fff3b0' : '#f2cf7a')],
  ['madera', 'Madera', (x, y) => {
    if (y % 8 === 7) return 'N';
    const tabla = Math.floor(y / 8);
    if ((x + tabla * 6) % 16 === 15) return 'N';
    return y % 8 === 0 ? '#d08a63' : grano(x >> 2, y, 11) > 0.8 ? '#a55f43' : 'n';
  }],
  ['hielo', 'Hielo', (x, y) => {
    const d = (x + y) % 16;
    if (d === 3 || d === 4 || d === 11) return 'w';
    return y === 0 || x === 0 ? '#d6f6ff' : y === 15 || x === 15 ? '#6ccbe6' : '#a5e9fb';
  }],
  ['lava', 'Lava', (x, y) => {
    const v = Math.sin((x * Math.PI) / 4) + Math.sin((y * Math.PI) / 4 + (x * Math.PI) / 8);
    return v > 1.1 ? 'y' : v > 0.2 ? 'Y' : v > -0.9 ? 'o' : 'r';
  }],
];

/** Las letras de una casilla (16 filas de 16), con las letras de la paleta o colores sueltos entre paréntesis. */
function pintarCasilla(receta: Receta): string[][] {
  return Array.from({ length: LADO }, (_, y) => Array.from({ length: LADO }, (_, x) => receta(x, y)));
}

// ───────────────────────── De letras a imagen ─────────────────────────

function colorDe(letra: string): [number, number, number, number] {
  if (letra === '.') return [0, 0, 0, 0];
  const hex = letra.startsWith('#') ? letra : PALETA[letra];
  if (!hex) throw new Error(`El dibujo usa la letra «${letra}», que no está en la paleta.`);
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
}

/** Las 16 filas de 16 colores de un dibujo (los simétricos, ya completos). */
export function coloresDe(d: Dibujo): string[][] {
  const filas = d.filas.map((fila) => {
    const letras = [...fila];
    return letras.length === LADO / 2 ? [...letras, ...[...letras].reverse()] : letras;
  });
  // Tumbado: un cuarto de vuelta, para que lo de arriba quede a la derecha
  return d.tumbado ? filas.map((_, y) => filas.map((__, x) => filas[LADO - 1 - x][y])) : filas;
}

function aPNG(colores: string[][]): Uint8Array {
  const rgba = new Uint8Array(LADO * LADO * 4);
  colores.forEach((fila, y) => fila.forEach((letra, x) => rgba.set(colorDe(letra), (y * LADO + x) * 4)));
  return codificarPNG(LADO, LADO, rgba);
}

export interface DibujoListo {
  nombre: string;
  titulo: string;
  categoria: CategoriaDibujo;
}

/** Todos los dibujos que trae Chispa (sin la imagen: se hace al pedirla). */
export const DIBUJOS: DibujoListo[] = [
  ...DIBUJADOS.map(({ nombre, titulo, categoria }) => ({ nombre, titulo, categoria })),
  ...CASILLAS.map(([nombre, titulo]): DibujoListo => ({ nombre, titulo, categoria: 'casillas' })),
];

const hechas = new Map<string, string>();

/** La imagen de un dibujo, como "data:image/png;base64,..." (16×16 píxeles). null si no existe. */
export function imagenDeDibujo(nombre: string): string | null {
  const ya = hechas.get(nombre);
  if (ya) return ya;
  const dibujado = DIBUJADOS.find((d) => d.nombre === nombre);
  const casilla = CASILLAS.find(([n]) => n === nombre);
  if (!dibujado && !casilla) return null;
  const url = pngADataURL(aPNG(dibujado ? coloresDe(dibujado) : pintarCasilla(casilla![2])));
  hechas.set(nombre, url);
  return url;
}

/** Para las pruebas: los dibujos escritos a mano, con sus filas. */
export const dibujosEscritos = (): Dibujo[] => DIBUJADOS;
