/**
 * AUTOCOMPLETADO del editor de código.
 *
 * Mira qué hay justo antes del cursor y sugiere lo que tiene sentido ahí:
 *   - al principio de una línea: palabras clave (si, mientras...) y eventos (cuando ...)
 *   - después de "cuando ": los eventos que existen
 *   - después de "cuando toco ": los objetos del proyecto y los tipos de casilla
 *   - después de un punto: las propiedades y acciones de ESE módulo u objeto
 *   - dentro de un texto: lo que ese sitio espera (plantillas en crear("…"),
 *     teclas en teclado.pulsada("…"), escenas, sonidos, colores...)
 *   - en cualquier otro sitio: funciones de la API y las variables del script
 *
 * Todo sale del catálogo de documentación, así que cada sugerencia lleva su
 * explicación y su ejemplo. Y todo SIN TILDES (la forma oficial).
 */
import { snippetCompletion, type Completion, type CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete';
import { DOC_ESPECIALES, DOC_EVENTOS, DOC_PALABRAS, docsGlobales, miembrosDe, type Doc } from '../../chispa/api/documentacion';
import { NOMBRES_TECLAS } from '../../motor/Entrada';
import { NOMBRES_COLORES } from '../../motor/Color';
import { TIPOS_PARTICULAS } from '../../objetos/Particulas';
import { nombresDeObjetos, type DefProyecto } from '../../proyecto/formato';
import { normalizar } from '../../utilidades/texto';

/** Caja con la explicación que acompaña a cada sugerencia. */
export function fichaDOM(doc: Doc): HTMLElement {
  const caja = document.createElement('div');
  caja.className = 'ficha-ayuda';
  const firma = document.createElement('code');
  firma.className = 'ficha-firma';
  firma.textContent = doc.firma;
  const texto = document.createElement('p');
  texto.textContent = doc.descripcion;
  const ejemplo = document.createElement('pre');
  ejemplo.textContent = doc.ejemplo;
  caja.append(firma, texto, ejemplo);
  return caja;
}

const TIPO_CM: Record<Doc['tipo'], string> = {
  palabra: 'keyword',
  evento: 'keyword',
  funcion: 'function',
  modulo: 'namespace',
  propiedad: 'property',
  accion: 'method',
  variable: 'variable',
};

/** Convierte una ficha en una sugerencia (con plantilla de código si la tiene). */
function sugerencia(doc: Doc, etiqueta = doc.nombre, insertar = doc.insertar, prioridad = 0): Completion {
  const base = { label: etiqueta, detail: doc.firma === etiqueta ? undefined : doc.firma, type: TIPO_CM[doc.tipo], info: () => fichaDOM(doc), boost: prioridad };
  // En las plantillas de CodeMirror, un tabulador al principio de línea = una sangría
  return insertar ? snippetCompletion(insertar.replace(/\n {4}/g, '\n\t') + (insertar.includes('${') ? '' : '${}'), base) : base;
}

/** Nombres creados en el script: variables, funciones, parámetros y variables de bucle. */
function nombresDelScript(texto: string): Completion[] {
  const vistos = new Map<string, Completion>();
  const agregar = (nombre: string, tipo: string, detalle: string) => {
    if (!vistos.has(normalizar(nombre))) vistos.set(normalizar(nombre), { label: nombre, type: tipo, detail: detalle, boost: 2 });
  };
  for (const m of texto.matchAll(/^\s*variable\s+([\p{L}_][\p{L}\p{N}_]*)/gmu)) agregar(m[1], 'variable', 'variable');
  for (const m of texto.matchAll(/^\s*funcion\s+([\p{L}_][\p{L}\p{N}_]*)\s*\(([^)]*)\)/gimu)) {
    agregar(m[1], 'function', 'función tuya');
    for (const p of m[2].split(',')) if (p.trim()) agregar(p.trim(), 'variable', 'parámetro');
  }
  for (const m of texto.matchAll(/para\s+cada\s+([\p{L}_][\p{L}\p{N}_]*)(?:\s*,\s*([\p{L}_][\p{L}\p{N}_]*))?/gu)) {
    agregar(m[1], 'variable', 'variable del bucle');
    if (m[2]) agregar(m[2], 'variable', 'variable del bucle');
  }
  return [...vistos.values()];
}

/** Qué lista de nombres espera un texto, según lo que hay antes de las comillas. */
function listaParaTexto(antesDeComillas: string, p: DefProyecto): { nombres: string[]; tipo: string } | null {
  const t = normalizar(antesDeComillas.trimEnd());
  if (/^\s*cuando se (pulsa|mantiene|suelta)\b/.test(t) || /\.(pulsada|sepulso|sesolto)\($/.test(t)) {
    return { nombres: [...NOMBRES_TECLAS, 'a', 'w', 's', 'd'], tipo: 'constant' };
  }
  const llamada = /([\p{L}_][\p{L}\p{N}_.]*)\($/u.exec(t)?.[1];
  const final = llamada?.split('.').pop();
  if (llamada === 'crear') return { nombres: Object.keys(p.plantillas), tipo: 'class' };
  if (llamada === 'buscar' || llamada === 'buscartodos') return { nombres: nombresDeObjetos(p), tipo: 'class' };
  if (llamada === 'escena.cambiar') return { nombres: Object.keys(p.escenas), tipo: 'constant' };
  if (llamada === 'sonido.reproducir' || llamada === 'sonido.parar' || llamada === 'musica.reproducir') return { nombres: Object.keys(p.sonidos), tipo: 'constant' };
  if (final === 'animar') return { nombres: Object.keys(p.animaciones), tipo: 'constant' };
  if (llamada === 'particulas') return { nombres: Object.keys(TIPOS_PARTICULAS), tipo: 'constant' };
  if (final === 'ponercasilla') return { nombres: tiposDeCasilla(p), tipo: 'constant' };
  if (/\.color\s*=$/.test(t) || /\.colortexto\s*=$/.test(t)) return { nombres: NOMBRES_COLORES, tipo: 'constant' };
  if (/\.imagen\s*=$/.test(t)) return { nombres: Object.keys(p.imagenes), tipo: 'constant' };
  if (/\.animacion\s*=$/.test(t)) return { nombres: Object.keys(p.animaciones), tipo: 'constant' };
  return null;
}

function tiposDeCasilla(p: DefProyecto): string[] {
  const todos = [...Object.values(p.escenas).flatMap((e) => e.objetos), ...Object.values(p.plantillas)];
  return [...new Set(todos.flatMap((o) => Object.keys(o.mapa?.tipos ?? {})))];
}

export function fuenteAutocompletado(proyecto: () => DefProyecto): CompletionSource {
  return (c: CompletionContext): CompletionResult | null => {
    const linea = c.state.doc.lineAt(c.pos);
    const antes = linea.text.slice(0, c.pos - linea.from);
    const p = proyecto();

    // 1. Dentro de un texto: ¿qué nombres espera?
    const comillas = /["“']([^"”']*)$/u.exec(antes);
    if (comillas && (antes.slice(0, comillas.index).match(/["“”']/g)?.length ?? 0) % 2 === 0) {
      const lista = listaParaTexto(antes.slice(0, comillas.index), p);
      if (!lista) return null;
      return {
        from: c.pos - comillas[1].length,
        options: lista.nombres.map((n) => ({ label: n, type: lista.tipo })),
        validFor: /^[\p{L}\p{N}_ ]*$/u,
      };
    }
    // Comentarios: nada
    if (/#/.test(antes.replace(/"[^"]*"|'[^']*'/g, ''))) return null;

    // 2. Después de un punto: miembros del módulo u objeto
    const punto = /([\p{L}_][\p{L}\p{N}_]*(?:\.[\p{L}_][\p{L}\p{N}_]*)*)\.([\p{L}_\p{N}]*)$/u.exec(antes);
    if (punto) {
      return {
        from: c.pos - punto[2].length,
        options: miembrosDe(punto[1]).map((d) => sugerencia(d)),
        validFor: /^[\p{L}\p{N}_]*$/u,
      };
    }

    const palabra = c.matchBefore(/[\p{L}_][\p{L}\p{N}_]*/u);
    if (!palabra && !c.explicit) return null;
    const desde = palabra ? palabra.from : c.pos;
    const antesDePalabra = antes.slice(0, desde - linea.from);

    // 3. "cuando toco ___" / "cuando dejo de tocar ___": objetos y tipos de casilla
    if (/^\s*cuando\s+(toco|dejo\s+de\s+tocar)\s+$/u.test(antesDePalabra)) {
      return { from: desde, options: [...nombresDeObjetos(p), ...tiposDeCasilla(p)].map((n) => ({ label: n, type: 'class' })) };
    }
    // 4. "cuando ___": los eventos
    if (/^\s*cuando\s+$/u.test(antesDePalabra)) {
      return { from: desde, options: DOC_EVENTOS.map((d) => sugerencia(d, d.nombre.replace(/^cuando /, ''), d.insertar?.replace(/^cuando /, ''))) };
    }
    // 5. Al principio de la línea: palabras clave y eventos completos, además de lo demás
    const inicioDeLinea = /^\s*$/.test(antesDePalabra);
    const opciones: Completion[] = [
      ...nombresDelScript(c.state.doc.toString()),
      ...docsGlobales().map((d) => sugerencia(d, d.nombre, d.insertar, 1)),
      ...DOC_ESPECIALES.filter((d) => d.nombre !== 'casilla').map((d) => sugerencia(d)),
    ];
    if (inicioDeLinea) {
      opciones.push(...DOC_PALABRAS.filter((d) => !['verdadero', 'falso', 'nulo', 'y', 'o', 'en'].includes(d.nombre)).map((d) => sugerencia(d, d.nombre, d.insertar, 3)));
      opciones.push(...DOC_EVENTOS.map((d) => sugerencia(d, d.nombre, d.insertar, 2)));
    } else {
      opciones.push(...DOC_PALABRAS.filter((d) => ['verdadero', 'falso', 'nulo', 'y', 'o', 'no', 'en'].includes(d.nombre)).map((d) => sugerencia(d)));
    }
    return { from: desde, options: opciones, validFor: /^[\p{L}\p{N}_]*$/u };
  };
}
