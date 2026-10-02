/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * MANUAL DE CHISPA (MANUAL_CHISPA.md).
 *
 * DECISIÓN: el manual NO se escribe a mano. Se genera con las MISMAS fichas
 * que usa el editor para la ayuda al pasar el ratón, el autocompletado y la
 * Guía (documentacion.ts). Así el manual y la ayuda del editor dicen siempre
 * exactamente lo mismo.
 *
 * Un test (pruebas/manual.test.ts) comprueba que MANUAL_CHISPA.md está al
 * día. Si cambias alguna ficha, regenera el manual con: npm run manual
 */
import { NOMBRES_TECLAS } from '../../motor/Entrada';
import { NOMBRES_COLORES } from '../../motor/Color';
import { TIPOS_PARTICULAS } from '../../objetos/Particulas';
import { DOC_ESPECIALES, DOC_EVENTOS, DOC_FUNCIONES, DOC_MODULOS, DOC_OBJETO, DOC_PALABRAS, DOC_VALORES, RECETAS, type Doc } from './documentacion';

const PLURALES: Record<string, string> = { lista: 'Listas', texto: 'Textos', tabla: 'Tablas', vector: 'Vectores', controles: 'Controles de cada jugador (varios en el mismo ordenador)' };

/** Las fichas de acciones de los mapas empiezan por "mapa." en su firma. */
const esDeMapa = (d: Doc) => d.firma.startsWith('mapa.');

function ficha(d: Doc): string {
  return [`#### \`${d.firma}\``, '', d.descripcion, '', '```', d.ejemplo, '```', ''].join('\n');
}

function seccion(titulo: string, docs: Doc[], intro = ''): string {
  return [`### ${titulo}`, '', intro ? `${intro}\n` : '', ...docs.map(ficha)].join('\n');
}

const LO_BASICO = `## 1. Lo básico

### Cómo se escribe Chispa

- Cada objeto de la escena puede tener un **script** (un archivo \`.chs\`) que dice qué hace.
- Una instrucción por línea. No hace falta \`;\` al final.
- Las líneas que abren un bloque (\`si\`, \`mientras\`, \`repetir\`, \`para cada\`, \`funcion\`, \`cuando\`) terminan en **dos puntos \`:\`**, y lo que va dentro lleva **4 espacios más** al principio (la *sangría*). El editor los pone solo al pulsar Intro.
- Todo lo que va detrás de \`#\` es un **comentario**: una nota para ti que el juego no lee.
- Las mayúsculas no importan: \`Vida\` y \`vida\` son lo mismo.
- La forma oficial va **sin tildes** (\`funcion\`, \`rotacion\`). Si pones tildes también funciona. La **ñ** sí se escribe (\`añadir\`, \`tamaño\`).

\`\`\`
# Esto es un comentario
variable vidas = 3

cuando se pulsa "espacio":
    vidas -= 1
    si vidas == 0:
        mostrar("Has perdido")
\`\`\`

### Los valores

| Tipo | Ejemplos | Para qué |
|---|---|---|
| número | \`5\`, \`-3\`, \`2.5\` | Cuentas, posiciones, velocidades. Los decimales llevan **punto**. |
| texto | \`"Hola"\` | Palabras y frases, entre comillas. |
| lógico | \`verdadero\`, \`falso\` | Sí o no. |
| nulo | \`nulo\` | «Nada». Lo que da \`buscar()\` si no encuentra nada. |
| lista | \`["rojo", "azul"]\` | Varios valores en orden. **La primera posición es la 1.** |
| tabla | \`{vida: 3, nombre: "Ana"}\` | Datos con nombre. Se leen con un punto: \`jugador.vida\`. |
| vector | \`vector(10, 20)\` | Dos números juntos: una posición o una velocidad. |
| objeto | \`yo\`, \`otro\`, \`buscar("Jugador")\` | Los objetos de la escena. |

### Textos con huecos

Dentro de un texto, lo que va **entre llaves** se cambia por su valor:

\`\`\`
mostrar("Vida: {yo.vida}")                  # Vida: 3
mostrar("{a} + {b} = {a + b}")
yo.texto = "Puntos: {juego.puntos}"         # este se actualiza solo
\`\`\`

- Si el texto se le da a \`yo.texto\` (o se escribe en el editor, en el texto de un objeto), **se actualiza solo** mientras juegas. En el editor, «Enseñar un dato» lo pone por ti.
- Para escribir una llave de verdad se ponen dos: \`"{{"\` y \`"}}"\`.

### Variables

\`\`\`
variable puntos = 0     # crear: la primera vez, con la palabra variable
puntos = 10             # cambiar el valor
puntos += 1             # sumar (también -=, *= y /=)
\`\`\`

Una variable creada dentro de un bloque solo existe dentro de ese bloque.

### Operaciones

| Qué | Cómo |
|---|---|
| Sumar, restar, multiplicar, dividir | \`+\`, \`-\`, \`*\`, \`/\` |
| Resto de una división | \`%\` (por ejemplo, \`7 % 2\` es \`1\`) |
| Comparar | \`==\` igual, \`!=\` distinto, \`<\`, \`>\`, \`<=\`, \`>=\` |
| Combinar condiciones | \`y\`, \`o\`, \`no\` |
| ¿Está dentro? | \`en\`: \`"vida" en jugador\`, \`3 en lista\`, \`"ola" en "hola"\` |
| Unir textos | \`+\`: \`"Puntos: " + puntos\` (el número se convierte solo) |

- **\`=\` guarda y \`==\` compara.** \`si vida == 0:\` pregunta; \`vida = 0\` cambia.
- En un \`si\`, solo cuentan como «no» \`falso\` y \`nulo\`.

### Coordenadas

- **La Y crece hacia ARRIBA**: subir es sumar a la Y. Caer es que la Y baje.
- Al empezar, \`(0, 0)\` es la esquina de **abajo a la izquierda** de la pantalla del juego.
- Los objetos **fijos** en la pantalla (vidas, puntos, botones) se miden desde esa misma esquina de la pantalla, aunque la cámara se mueva.
- En el editor, la barra de la escena te dice la x y la y del ratón.
`;

const ERRORES = `## 11. Cuando algo sale mal

- **Mientras escribes**, lo que está mal se subraya en rojo (errores) o en amarillo (avisos). Pasa el ratón por encima para ver qué pasa y cómo arreglarlo.
- **Con errores no se puede ejecutar**: el botón Ejecutar se pone rojo y la pestaña **Problemas** los enseña todos. Haz clic en uno para ir a su línea.
- **Si algo falla con el juego en marcha**, el error sale en la **Consola**. Solo se para el script que ha fallado; el resto del juego sigue. Si el mismo error pasa muchas veces (por ejemplo, en 50 enemigos), sale una vez con «×50».
- Los mensajes dicen **qué** ha pasado, **dónde** (archivo y línea) y **cómo arreglarlo** (💡). Si algo se parece a lo que querías escribir, te lo sugieren: «¿Querías decir…?».
- **\`mostrar(...)\`** es tu mejor amigo para averiguar qué está pasando: escribe en la consola el valor de lo que quieras.
`;

export function generarManual(): string {
  const acciones = DOC_OBJETO.filter((d) => d.tipo === 'accion' && !esDeMapa(d));
  const propiedades = DOC_OBJETO.filter((d) => d.tipo === 'propiedad');
  const mapas = DOC_OBJETO.filter(esDeMapa);
  const partes = [
    '# Manual de Chispa',
    '',
    'Todo lo que se puede escribir en Chispa, con una explicación sencilla y un ejemplo corto.',
    '',
    '> Este manual se genera solo a partir de la ayuda del editor (la que sale al pasar el ratón y en la pestaña **Guía**), así que los dos dicen siempre lo mismo. **No lo edites a mano**: cambia las fichas en `src/chispa/api/documentacion.ts` y ejecuta `npm run manual`.',
    '',
    '**Índice:** 1. Lo básico · 2. Palabras del lenguaje · 3. Eventos · 4. Variables especiales · 5. Funciones · 6. Objetos · 7. Mapas de casillas · 8. Módulos · 9. Listas, textos, tablas y vectores · 10. Nombres (teclas, colores, partículas) · 11. Cuando algo sale mal · 12. Recetas',
    '',
    LO_BASICO,
    '## 2. Palabras del lenguaje',
    '',
    ...DOC_PALABRAS.map(ficha),
    '## 3. Eventos',
    '',
    'Los eventos dicen **cuándo** se ejecuta un trozo de código. Van al principio de la línea (sin sangría) y terminan en `:`. Cada evento funciona por su cuenta: `esperar()` pausa solo ese evento, no el juego.',
    '',
    ...DOC_EVENTOS.map(ficha),
    '## 4. Variables especiales',
    '',
    ...DOC_ESPECIALES.map(ficha),
    '## 5. Funciones',
    '',
    'Se usan con paréntesis: `nombre(valores)`. Los paréntesis son obligatorios, aunque vayan vacíos.',
    '',
    ...DOC_FUNCIONES.map(ficha),
    '## 6. Objetos',
    '',
    'Lo que tienen `yo`, `otro` y cualquier objeto (el que te da `buscar("Nombre")` o `crear("Plantilla")`). Aquí se escriben con `yo.`, pero sirven igual con cualquier otro objeto: `otro.x`, `enemigo.destruir()`.',
    '',
    'El **tipo** de un objeto es el nombre de su plantilla o, si no viene de una plantilla, su nombre sin los números del final: `Moneda`, `Moneda2` y `Moneda3` son del tipo `Moneda`. Por eso `cuando toco Moneda` vale para todas.',
    '',
    'Además puedes inventarte **propiedades propias**: `yo.vida = 3`. También se pueden poner en el editor, en Propiedades > Propiedades propias.',
    '',
    seccion('Propiedades', propiedades),
    seccion('Acciones', acciones),
    '## 7. Mapas de casillas',
    '',
    'Un mapa de casillas es una rejilla que se pinta en el editor con el pincel. Cada **tipo de casilla** (suelo, pared, agua, puerta…) puede ser sólido (no se atraviesa) o no. Tocar una casilla lanza `cuando toco <tipo>`; dentro, `casilla` dice el tipo. Las columnas y filas empiezan en 0, en la esquina de abajo a la izquierda del mapa.',
    '',
    ...mapas.map(ficha),
    '## 8. Módulos',
    '',
    'Grupos de cosas del motor. Se escriben con un punto: `teclado.pulsada("a")`, `escena.camara.zoom`.',
    '',
    ...DOC_MODULOS.map((m) => seccion(`\`${m.nombre}\``, m.miembros, `${m.descripcion}\n\n\`\`\`\n${m.ejemplo}\n\`\`\``)),
    '## 9. Listas, textos, tablas y vectores',
    '',
    ...DOC_VALORES.map((v) => seccion(PLURALES[v.tipo] ?? v.tipo, v.miembros, v.descripcion)),
    '## 10. Nombres que se escriben entre comillas',
    '',
    `**Teclas:** ${NOMBRES_TECLAS.map((t) => `\`"${t}"\``).join(', ')}. Para letras y números, el carácter: \`"a"\`, \`"ñ"\`, \`"1"\`.`,
    '',
    `**Colores:** ${NOMBRES_COLORES.map((c) => `\`"${c}"\``).join(', ')}. También códigos como \`"#ff8800"\`.`,
    '',
    `**Partículas:** ${Object.keys(TIPOS_PARTICULAS).map((t) => `\`"${t}"\``).join(', ')}.`,
    '',
    '**Tuyos:** los nombres de tus plantillas, escenas, imágenes, sonidos y animaciones también van entre comillas: `crear("Bala")`, `escena.cambiar("Nivel2")`.',
    '',
    ERRORES,
    '## 12. Recetas: ¿cómo hago…?',
    '',
    'Soluciones cortas para lo más común. También están en el editor, en la pestaña **Guía**, con un botón para copiarlas.',
    '',
    ...RECETAS.flatMap((r) => [`### ${r.titulo}`, '', r.descripcion, '', '```', r.codigo, '```', '']),
  ];
  return partes.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
