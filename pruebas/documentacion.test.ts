/**
 * La documentación (autocompletado y ayuda del editor) tiene que coincidir
 * EXACTAMENTE con la API real: ni cosas sin documentar, ni fichas de cosas
 * que no existen. Y todo sin tildes (la forma oficial).
 */
import { describe, expect, it } from 'vitest';
import { DOC_ESPECIALES, DOC_EVENTOS, DOC_FUNCIONES, DOC_MODULOS, DOC_OBJETO, DOC_PALABRAS, buscarDoc } from '../src/chispa/api/documentacion';
import { globalesDelMotor } from '../src/proyecto/Revision';
import { Anfitrion } from '../src/chispa/ejecucion/valores';
import { PALABRAS_CLAVE } from '../src/chispa/lexico/tokens';
import { NOMBRES_PROPIEDADES_OBJETO } from '../src/chispa/api/objetos';
import { normalizar, quitarTildes } from '../src/utilidades/texto';
import { compilar } from '../src/chispa/sintaxis/parser';

const globales = globalesDelMotor();

describe('Documentación de la API', () => {
  it('todas las funciones, módulos y variables globales están documentados', () => {
    const documentados = new Set([...DOC_FUNCIONES, ...DOC_ESPECIALES].map((d) => normalizar(d.nombre)).concat(DOC_MODULOS.map((m) => normalizar(m.nombre))));
    const sinDocumentar = globales.nombresPropios().filter((n) => !documentados.has(n));
    expect(sinDocumentar).toEqual([]);
  });

  it('no hay fichas de funciones que no existen', () => {
    const inventadas = DOC_FUNCIONES.filter((d) => !globales.buscar(normalizar(d.nombre)));
    expect(inventadas.map((d) => d.nombre)).toEqual([]);
  });

  it('los miembros de cada módulo coinciden con los de verdad', () => {
    for (const m of DOC_MODULOS) {
      const partes = m.nombre.split('.');
      let modulo = globales.buscar(partes[0])?.valor as Anfitrion;
      for (const p of partes.slice(1)) modulo = modulo.submodulo(p)!;
      expect(modulo, m.nombre).toBeInstanceOf(Anfitrion);
      const reales = modulo.propiedadesConocidas().map(normalizar).sort();
      const documentados = m.miembros.map((x) => normalizar(x.nombre)).sort();
      expect(documentados, m.nombre).toEqual(reales);
    }
  });

  it('las propiedades y acciones de los objetos coinciden con las de verdad', () => {
    expect(DOC_OBJETO.map((d) => d.nombre).sort()).toEqual([...NOMBRES_PROPIEDADES_OBJETO].sort());
  });

  it('todas las palabras reservadas están documentadas (mostrar aparece como función)', () => {
    const documentadas = new Set([...DOC_PALABRAS, ...DOC_FUNCIONES].map((d) => d.nombre));
    expect([...PALABRAS_CLAVE].filter((p) => !documentadas.has(p))).toEqual([]);
  });

  it('todo está escrito sin tildes (forma oficial), salvo la ñ', () => {
    const todas = [...DOC_PALABRAS, ...DOC_EVENTOS, ...DOC_FUNCIONES, ...DOC_ESPECIALES, ...DOC_OBJETO, ...DOC_MODULOS.flatMap((m) => m.miembros)];
    const conTilde = todas.filter((d) => quitarTildes(d.nombre) !== d.nombre || quitarTildes(d.firma) !== d.firma || quitarTildes(d.insertar ?? '') !== (d.insertar ?? ''));
    expect(conTilde.map((d) => d.nombre)).toEqual([]);
  });

  it('todos los ejemplos son código Chispa bien escrito', () => {
    const todas = [...DOC_PALABRAS, ...DOC_EVENTOS, ...DOC_FUNCIONES, ...DOC_ESPECIALES, ...DOC_OBJETO, ...DOC_MODULOS.flatMap((m) => m.miembros)];
    for (const doc of todas) {
      // Algunos ejemplos son trozos (una condición sin cuerpo): les ponemos un cuerpo para comprobarlos
      let codigo = doc.ejemplo;
      if (codigo.trimEnd().endsWith(':')) codigo += '\n    mostrar(1)';
      const sangrar = (t: string) => t.split('\n').map((l) => '    ' + l).join('\n');
      // romper/continuar necesitan un bucle alrededor (dentro de la función)
      if (/\b(romper|continuar)\b/.test(codigo) && !codigo.startsWith('mientras')) codigo = `mientras verdadero:\n${sangrar(codigo)}`;
      const envuelto = /^\s*(cuando|funcion)/.test(codigo) ? codigo : `funcion prueba():\n${sangrar(codigo)}`;
      expect(() => compilar(envuelto, 'ejemplo.chs'), `${doc.nombre}: ${doc.ejemplo}`).not.toThrow();
    }
  });

  it('buscarDoc encuentra fichas por su ruta', () => {
    expect(buscarDoc('mostrar')?.tipo).toBe('funcion');
    expect(buscarDoc('mientras')?.tipo).toBe('palabra');
    expect(buscarDoc('teclado.pulsada')?.firma).toBe('teclado.pulsada("tecla")');
    expect(buscarDoc('escena.camara.zoom')?.tipo).toBe('propiedad');
    expect(buscarDoc('yo.velocidad')?.nombre).toBe('velocidad');
    expect(buscarDoc('enemigo.enSuelo')?.nombre).toBe('enSuelo');
    expect(buscarDoc('Teclado.PULSADA')?.nombre).toBe('pulsada');
  });
});
