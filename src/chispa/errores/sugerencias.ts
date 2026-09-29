/**
 * SUGERENCIAS: "¿Querías decir 'vida'?"
 *
 * Usamos la DISTANCIA DE LEVENSHTEIN: el número mínimo de letras que hay que
 * añadir, quitar o cambiar para pasar de una palabra a otra.
 *     vidda → vida      = 1 (quitar una d)
 *     mientas → mientras = 1 (añadir una r)
 * Si la palabra más parecida está lo bastante cerca, la sugerimos.
 */
import { normalizar } from '../../utilidades/texto';

export function distancia(a: string, b: string): number {
  // Programación dinámica: `fila[j]` = distancia entre a[0..i] y b[0..j]
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const arriba = fila[j];
      fila[j] = Math.min(
        fila[j] + 1, // quitar
        fila[j - 1] + 1, // añadir
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1), // cambiar (o nada si son iguales)
      );
      diagonal = arriba;
    }
  }
  return fila[b.length];
}

/** Devuelve la opción más parecida si se parece lo suficiente, o null. */
export function sugerir(nombre: string, opciones: Iterable<string>): string | null {
  const n = normalizar(nombre);
  let mejor: string | null = null;
  let mejorDistancia = Infinity;
  for (const opcion of opciones) {
    const d = distancia(n, normalizar(opcion));
    if (d < mejorDistancia) {
      mejorDistancia = d;
      mejor = opcion;
    }
  }
  // Palabras cortas: 1 error como mucho. Largas: 1 de cada 3 letras.
  const limite = Math.max(1, Math.floor(n.length / 3));
  return mejor !== null && mejorDistancia > 0 && mejorDistancia <= limite ? mejor : null;
}

/**
 * Palabras de otros lenguajes (Python, JavaScript, Lua...) y cómo se dicen
 * en Chispa. Mucha gente llega habiendo visto algo de programación en inglés.
 */
export const EQUIVALENCIAS_INGLES: Record<string, string> = {
  print: 'mostrar(...)',
  console: 'mostrar(...)',
  true: 'verdadero',
  false: 'falso',
  null: 'nulo',
  none: 'nulo',
  nil: 'nulo',
  undefined: 'nulo',
  if: 'si',
  else: 'sino',
  elif: 'sino si',
  elseif: 'sino si',
  while: 'mientras',
  for: 'para cada',
  foreach: 'para cada',
  repeat: 'repetir',
  def: 'funcion',
  function: 'funcion',
  func: 'funcion',
  fn: 'funcion',
  return: 'devolver',
  break: 'romper',
  continue: 'continuar',
  var: 'variable',
  let: 'variable',
  const: 'variable',
  local: 'variable',
  and: 'y',
  or: 'o',
  not: 'no',
  this: 'yo',
  self: 'yo',
  wait: 'esperar(...)',
  when: 'cuando',
  show: 'mostrar(...)',
};

/** Palabras clave que pueden empezar una línea (para detectar "mientas", "fucnion"...). */
export const PALABRAS_DE_INICIO = ['si', 'sino', 'mientras', 'repetir', 'para', 'funcion', 'devolver', 'variable', 'cuando', 'romper', 'continuar'];

/** Si `nombre` es una palabra de otro lenguaje, la pista para escribirla en Chispa. */
export function pistaIngles(nombre: string): string | null {
  const equivalente = EQUIVALENCIAS_INGLES[normalizar(nombre)];
  return equivalente ? `'${nombre}' es de otro lenguaje de programación. En Chispa se escribe: ${equivalente}` : null;
}

/** Enumera nombres de forma legible: "a, b y c". */
export function enumerar(nombres: string[], maximo = 8): string {
  const lista = [...new Set(nombres)];
  const cortada = lista.slice(0, maximo);
  const resto = lista.length - cortada.length;
  if (resto > 0) return `${cortada.join(', ')} y ${resto} más`;
  if (cortada.length <= 1) return cortada.join('');
  return `${cortada.slice(0, -1).join(', ')} y ${cortada[cortada.length - 1]}`;
}

/** Lo que se sabe en un sitio del código, para explicar por qué un nombre no existe. */
export interface ContextoNombres {
  /** Todos los nombres visibles (variables, funciones y API). */
  visibles: string[];
  /** Solo los que ha creado quien programa (para enumerarlos). */
  deUsuario: string[];
  /** Nombres de objetos de la escena. */
  objetosEscena?: string[];
}

/**
 * La pista para "no existe ninguna variable llamada X". En orden:
 *   1. ¿Es una palabra de otro lenguaje? (print → mostrar)
 *   2. ¿Se parece a algo que existe? (puntoss → puntos)
 *   3. ¿Es el nombre de un objeto de la escena? (hay que buscarlo)
 *   4. Si no, enumera las variables que sí existen.
 */
export function pistaNombreDesconocido(nombre: string, c: ContextoNombres, comoCrearla = `Si es una variable nueva, créala antes con: variable ${nombre} = ...`): string {
  const ingles = pistaIngles(nombre);
  if (ingles) return ingles;
  const parecido = sugerir(nombre, c.visibles);
  if (parecido) return `¿Querías decir '${parecido}'?`;
  const objeto = c.objetosEscena?.find((n) => normalizar(n) === normalizar(nombre));
  if (objeto) {
    return `Hay un objeto llamado '${objeto}' en la escena, pero para usarlo primero hay que buscarlo: variable ${nombre.toLowerCase()} = buscar("${objeto}"). Dentro de "cuando toco ${objeto}:" lo tienes en 'otro'.`;
  }
  if (c.deUsuario.length) return `Las variables que sí existen aquí son: ${enumerar(c.deUsuario)}. ${comoCrearla}`;
  return comoCrearla;
}
