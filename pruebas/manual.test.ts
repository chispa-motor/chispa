/**
 * MANUAL_CHISPA.md tiene que estar al día con la ayuda del editor.
 * Si este test falla, regenera el manual con: npm run manual
 */
import { describe, expect, it } from 'vitest';
import { generarManual } from '../src/chispa/api/manual';
import { DOC_ESPECIALES, DOC_EVENTOS, DOC_FUNCIONES, DOC_MODULOS, DOC_OBJETO, DOC_PALABRAS, DOC_VALORES, RECETAS } from '../src/chispa/api/documentacion';

describe('Manual de Chispa', () => {
  const manual = generarManual();

  it('trae todas las fichas de la ayuda del editor y todas las recetas', () => {
    const todas = [...DOC_PALABRAS, ...DOC_EVENTOS, ...DOC_FUNCIONES, ...DOC_ESPECIALES, ...DOC_OBJETO, ...DOC_MODULOS.flatMap((m) => m.miembros), ...DOC_VALORES.flatMap((v) => v.miembros)];
    const faltan = todas.filter((d) => !manual.includes(`#### \`${d.firma}\``) || !manual.includes(d.descripcion));
    expect(faltan.map((d) => d.firma)).toEqual([]);
    for (const r of RECETAS) expect(manual).toContain(r.codigo);
  });

  it('MANUAL_CHISPA.md está al día (si falla: npm run manual)', async () => {
    await expect(manual).toMatchFileSnapshot('../MANUAL_CHISPA.md');
  });
});
