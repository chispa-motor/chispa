/**
 * MODO BLOQUES (noche, bloque 5): el código se convierte en bloques y los
 * bloques en código, sin perder nada.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { aCodigo, desdeCodigo, type Bloque } from '../src/editor/bloques/modelo';
import { analizarSintaxis } from '../src/chispa/sintaxis/parser';

/** El árbol de un programa sin las posiciones (para comparar dos códigos que dicen lo mismo). */
function arbol(codigo: string): unknown {
  const { programa, errores } = analizarSintaxis(codigo, 'x.chs');
  expect(errores.map((e) => e.message)).toEqual([]);
  return JSON.parse(JSON.stringify(programa.sentencias, (k, v) => (k === 'pos' || k === 'posNombre' ? undefined : v)));
}

function ida(codigo: string): Bloque[] {
  const r = desdeCodigo(codigo);
  if (!r.ok) throw new Error(r.motivo);
  return r.bloques;
}

describe('Código → bloques → código', () => {
  it('todos los scripts de la Arena de Habilidades van y vuelven sin cambiar lo que hacen', () => {
    const carpeta = 'proyectos/arena-de-habilidades/scripts';
    for (const archivo of readdirSync(carpeta)) {
      const codigo = readFileSync(`${carpeta}/${archivo}`, 'utf8');
      const vuelta = aCodigo(ida(codigo)).codigo;
      expect(arbol(vuelta), archivo).toEqual(arbol(codigo));
      // Y la segunda vuelta deja el texto exactamente igual
      expect(aCodigo(ida(vuelta)).codigo, archivo).toBe(vuelta);
    }
  });

  it('las acciones conocidas son bloques con palabras; lo demás, bloques «hacer»', () => {
    const b = ida('cuando se pulsa "espacio", "w":\n    yo.saltar(600)\n    mostrar("hola", 2)\n    sonido.efecto("salto")');
    expect(b).toEqual([
      {
        tipo: 'evento', clase: 'pulsa', dato: '"espacio", "w"',
        cuerpo: [
          { tipo: 'accion', accion: 'saltar', campos: ['600'] },
          { tipo: 'hacer', codigo: 'mostrar("hola", 2)' },
          { tipo: 'accion', accion: 'efecto', campos: ['"salto"'] },
        ],
      },
    ]);
  });

  it('paréntesis solo donde hacen falta, y textos con huecos y comillas', () => {
    const codigo = 'variable a = (1 + 2) * 3 - (4 - 5)\nvariable b = no (a > 2 y a < 9)\nvariable c = "Vida: {a} \\"x\\" {{llave}}"\nvariable d = -(a + 1)\n';
    expect(aCodigo(ida(codigo)).codigo).toBe(codigo);
  });

  it('los comentarios de una línea se convierten en notas; los del final de una línea se avisan', () => {
    const r = desdeCodigo('# Empieza aqui\ncuando empieza:\n    # saluda\n    mostrar(1)  # esto se pierde\n');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bloques[0]).toEqual({ tipo: 'nota', texto: 'Empieza aqui' });
    expect((r.bloques[1] as { cuerpo: Bloque[] }).cuerpo[0]).toEqual({ tipo: 'nota', texto: 'saluda' });
    expect(r.perdidos).toEqual(['el comentario del final de la línea 4']);
  });

  it('con errores de escritura no se puede: dice por qué y en qué líneas', () => {
    const r = desdeCodigo('cuando empieza:\n    mientas 1:\n        mostrar(1)');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toContain('error');
    expect(r.lineas).toEqual([2]);
  });

  it('un bloque vacío se escribe con una nota (y el código lo marca como no terminado)', () => {
    const { codigo } = aCodigo([{ tipo: 'evento', clase: 'empieza', dato: '', cuerpo: [{ tipo: 'si', ramas: [{ condicion: 'verdadero', cuerpo: [] }], sino: null }] }]);
    expect(codigo).toBe('cuando empieza:\n    si verdadero:\n        # (vacío: falta lo que tiene que hacer)\n');
    expect(analizarSintaxis(codigo, 'x').errores.length).toBe(1);
  });

  it('apunta en qué línea empieza cada bloque (para resaltar errores y paradas)', () => {
    const bloques: Bloque[] = [
      { id: 1, tipo: 'evento', clase: 'empieza', dato: '', cuerpo: [{ id: 2, tipo: 'accion', accion: 'mostrar', campos: ['1'] }] },
      { id: 3, tipo: 'evento', clase: 'clic', dato: '', cuerpo: [{ id: 4, tipo: 'romper' }] },
    ];
    expect([...aCodigo(bloques).lineaDe]).toEqual([[1, 1], [2, 2], [3, 4], [4, 5]]);
  });
});
