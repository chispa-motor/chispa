/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * GENERA APRENDE_CHISPA.md (el curso) y CHULETA_CHISPA.md (el resumen) a
 * partir de los datos del curso (curso.ts) y de la API de verdad
 * (documentacion.ts). Así los dos documentos nunca se quedan atrás: si un
 * comando cambia, cambian solos (npm run manual los vuelve a escribir).
 */
import { DOC_ESPECIALES, DOC_EVENTOS, DOC_FUNCIONES, DOC_MODULOS, DOC_OBJETO, DOC_PALABRAS, DOC_VALORES, type Doc } from './documentacion';
import { COMANDOS_CURSO, EJEMPLO_BASE, FUNCION_BASE, NIVELES_CURSO, TEMAS_CURSO, type ComandoCurso } from './curso';
import { CONFIGURACION } from '../../configuracion';

export interface FichaApi {
  /** grupo:nombre (el mismo que en curso.ts) */
  id: string;
  doc: Doc;
  /** Cómo se escribe (lo que sale en la chuleta): la firma de la ficha. */
  etiqueta: string;
}

/** TODOS los comandos de la API, cada uno con su id. */
export function fichasDeLaApi(): FichaApi[] {
  const f = (grupo: string, d: Doc): FichaApi => ({ id: `${grupo}:${d.nombre}`, doc: d, etiqueta: d.firma.replace(/:$/, '') });
  return [
    ...DOC_PALABRAS.map((d) => f('palabra', d)),
    ...DOC_EVENTOS.map((d) => f('evento', d)),
    ...DOC_FUNCIONES.map((d) => f('funcion', d)),
    ...DOC_ESPECIALES.map((d) => f('especial', d)),
    ...DOC_MODULOS.flatMap((m) => m.miembros.map((d) => f(m.nombre, d))),
    ...DOC_OBJETO.map((d) => f('objeto', d)),
    ...DOC_VALORES.flatMap((v) => v.miembros.map((d) => f(v.tipo, d))),
  ];
}

const fichas = () => new Map(fichasDeLaApi().map((x) => [x.id, x]));
const comandos = () => new Map(COMANDOS_CURSO.map((c) => [c.id, c]));

/** La primera frase de la descripción: qué hace, en una frase sencilla. */
export function unaFrase(d: Doc): string {
  const primera = d.descripcion.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? d.descripcion;
  return primera.trim();
}

const bloque = (codigo: string) => ['```', codigo, '```'].join('\n');
const celda = (t: string) => t.replace(/\|/g, '\\|');
const ancla = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, '').trim().replace(/ +/g, '-');

const TITULO_NIVEL = (n: number) => `Nivel ${n}: ${NIVELES_CURSO[n - 1].titulo}`;

// ───────────────────────── El curso ─────────────────────────

function comandoEnCurso(c: ComandoCurso, f: FichaApi): string[] {
  const aviso = c.error.tipo === 'error' ? 'Chispa te avisa con un error que explica qué pasa.' : 'Esto no da error: funciona, pero no hace lo que querías.';
  return [
    `#### \`${f.etiqueta}\``,
    '',
    unaFrase(f.doc),
    '',
    bloque(c.ejemplo),
    '',
    `**Error típico:** ${c.error.explica} ${aviso}`,
    '',
    bloque(c.error.mal),
    '',
  ];
}

const DEPURAR = [
  '### Depurar: encontrar los fallos',
  '',
  'Un fallo (un *bug*) casi nunca es un misterio: es una línea que no hace lo que crees. Estas son las herramientas de Chispa para verlo:',
  '',
  '- **Los errores te dicen la línea y qué pasa.** Mientras escribes, lo que está mal se subraya en rojo; pasa el ratón por encima para leer la explicación y la pista («¿Querías decir...?»). En la pestaña **Problemas** están todos: haz clic en uno para ir a su línea.',
  '- **mostrar()** es la herramienta más sencilla: pon `mostrar("aqui llego", yo.x)` en el sitio que no entiendes y mira la consola.',
  '- **Puntos de parada.** Haz clic en el número de una línea: sale un punto rojo. Al ejecutar, el juego se para justo antes de esa línea y en la pestaña **Depurar** ves cuánto vale cada variable (también las de `juego` y las de `yo`). **F10** ejecuta la siguiente línea, **F11** entra en una función y **F8** sigue jugando.',
  '- **Órdenes en la consola.** Con el juego en marcha, abajo de la consola puedes escribir una línea de Chispa y pulsar Intro: `juego.vidas = 99`, `buscar("Jugador").x = 500`, `mostrar(contar("Enemigo"))`. Sirve para probar cosas sin tocar el código.',
  '- **Avisos amarillos.** No son errores, pero casi siempre esconden uno: un mensaje que nadie recibe, un dato de `juego` que nadie guarda, una variable que no se usa...',
  '- **tiempo.fps** te dice si el juego va lento: `yo.texto = "FPS: {tiempo.fps}"`. Si baja mucho de 60, hay demasiadas cosas (o un bucle muy grande en cada fotograma).',
  '',
  '**El método:** 1) mira el error y su línea; 2) si no hay error, pon un mostrar() o un punto de parada antes de lo que falla; 3) comprueba si cada variable vale lo que crees; 4) cambia UNA cosa y vuelve a probar.',
  '',
];

export function generarAprende(): string {
  const F = fichas();
  const K = comandos();
  const salida: string[] = [
    '# Aprende Chispa desde cero',
    '',
    '> Este archivo se genera solo con `npm run manual`, a partir de la API de verdad (no lo cambies a mano: cambia `src/chispa/api/curso.ts`). Un test ejecuta cada ejemplo, cada ejercicio y cada mini proyecto para comprobar que funcionan.',
    '',
    `Un curso por niveles para aprender a programar juegos con Chispa, aunque no hayas programado nunca. Salen **todos** los comandos que existen (${F.size}), cada uno con qué hace, un ejemplo corto que funciona y el error que más se comete con él.`,
    '',
    '**Cómo usarlo:**',
    '',
    `1. Abre el editor (${CONFIGURACION.web}, sin instalar nada) y lee [EMPIEZA_AQUI.md](EMPIEZA_AQUI.md) si es tu primera vez.`,
    '2. Ve nivel a nivel. Copia los ejemplos en un script y ejecútalos: cambia números y mira qué pasa. Así es como se aprende.',
    '3. Al final de cada nivel hay **ejercicios** (las soluciones están [al final del todo](#soluciones), ¡inténtalo antes!) y un **mini proyecto** que junta todo lo del nivel.',
    '4. Para buscar algo rápido, tienes la [chuleta](CHULETA_CHISPA.md): una línea por comando.',
    '',
    'Una regla para todo el curso: en el código **no hacen falta tildes**. Se escribe `funcion`, `ultimo`, `animacion`... (si pones la tilde también funciona, pero la forma oficial es sin ella). Los textos entre comillas sí pueden llevarlas.',
    '',
    '## Índice',
    '',
  ];
  for (const n of NIVELES_CURSO) {
    salida.push(`- [${TITULO_NIVEL(n.numero)}](#${ancla(TITULO_NIVEL(n.numero))})`);
    for (const t of TEMAS_CURSO.filter((x) => x.nivel === n.numero)) salida.push(`  - [${t.titulo}](#${ancla(t.titulo)})`);
    if (n.numero === 4) salida.push('  - [Depurar: encontrar los fallos](#depurar-encontrar-los-fallos)');
  }
  salida.push('- [Soluciones de los ejercicios](#soluciones)', '');

  for (const n of NIVELES_CURSO) {
    salida.push(`## ${TITULO_NIVEL(n.numero)}`, '', n.intro, '');
    for (const t of TEMAS_CURSO.filter((x) => x.nivel === n.numero)) {
      salida.push(`### ${t.titulo}`, '', t.intro, '');
      for (const id of t.ids) salida.push(...comandoEnCurso(K.get(id)!, F.get(id)!));
    }
    if (n.numero === 4) salida.push(...DEPURAR);
    salida.push(`### Ejercicios del nivel ${n.numero}`, '');
    n.ejercicios.forEach((e, i) => salida.push(`${i + 1}. ${e.enunciado}`));
    salida.push('', `Las soluciones, en [Soluciones](#soluciones) (nivel ${n.numero}).`, '');
    const p = n.proyecto;
    salida.push(`### Mini proyecto: ${p.titulo}`, '', p.queHace, '', '**Qué poner en la escena:**', '', ...p.montaje.map((m) => `- ${m}`), '');
    for (const [archivo, codigo] of Object.entries(p.scripts)) salida.push(`**${archivo}**`, '', bloque(codigo), '');
    salida.push('Cuando funcione, cámbialo: más enemigos, otro color, un sonido nuevo... ¡Es tuyo!', '');
  }

  salida.push('## Soluciones', '', 'Hay muchas formas buenas de resolver cada ejercicio: si la tuya funciona, está bien. Estas son solo una de ellas.', '');
  for (const n of NIVELES_CURSO) {
    salida.push(`### Soluciones del nivel ${n.numero}`, '');
    n.ejercicios.forEach((e, i) => salida.push(`**${i + 1}.** ${e.enunciado.replace(/^\*\*(.+?)\*\*.*$/s, '$1')}`, '', bloque(e.solucion), ''));
  }
  return salida.join('\n');
}

// ───────────────────────── La chuleta ─────────────────────────

export function generarChuleta(): string {
  const F = fichas();
  const K = comandos();
  const salida: string[] = [
    '# Chuleta de Chispa',
    '',
    '> Se genera sola con `npm run manual` (no la cambies a mano). Un test comprueba que no falta ningún comando y que cada ejemplo funciona.',
    '',
    `Todos los comandos de Chispa (${F.size}), una línea cada uno, para tenerla abierta mientras programas o imprimirla. Para aprender con calma, el [curso](APRENDE_CHISPA.md).`,
    '',
    'En los ejemplos se usan estas variables y esta función, como si ya las tuvieras (y en la escena hay un Jugador y un Mapa de casillas):',
    '',
    bloque(`${EJEMPLO_BASE}\n\n${FUNCION_BASE}`),
    '',
    'Las líneas que terminan en `:` empiezan un bloque: lo de dentro va debajo, con 4 espacios. `yo` es el objeto del script. En el código no hacen falta tildes.',
    '',
  ];
  for (const n of NIVELES_CURSO) {
    // El último nivel es de hacer un juego entero: no trae comandos nuevos
    if (!TEMAS_CURSO.some((x) => x.nivel === n.numero)) continue;
    salida.push(`## ${TITULO_NIVEL(n.numero)}`, '');
    for (const t of TEMAS_CURSO.filter((x) => x.nivel === n.numero)) {
      salida.push(`### ${t.titulo}`, '', '| Comando | Qué hace | Ejemplo |', '|---|---|---|');
      for (const id of t.ids) {
        const f = F.get(id)!;
        salida.push(`| ${celda('`' + f.etiqueta + '`')} | ${celda(unaFrase(f.doc))} | ${celda('`' + K.get(id)!.corto + '`')} |`);
      }
      salida.push('');
    }
  }
  return salida.join('\n');
}
