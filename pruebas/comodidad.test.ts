/**
 * ROBUSTEZ Y COMODIDAD (noche, bloque 6): ajustes del editor y lista de atajos.
 * (El guardado automático, el tema en pantalla y el rendimiento con 2000
 * objetos se prueban en el navegador: pruebas-navegador/editor.mjs.)
 */
import { describe, expect, it } from 'vitest';
import { AJUSTES_POR_DEFECTO, aplicarAjustes, leerAjustes } from '../src/editor/ajustes';
import { ATAJOS, teclasHtml } from '../src/editor/atajos';

describe('Ajustes', () => {
  it('lo guardado se arregla si está mal (números fuera de sus límites, un tema que no existe, texto roto)', () => {
    expect(leerAjustes(null)).toEqual(AJUSTES_POR_DEFECTO);
    expect(leerAjustes('esto no es json')).toEqual(AJUSTES_POR_DEFECTO);
    expect(leerAjustes('{"tema":"rosa","letraCodigo":100,"letraInterfaz":2}')).toEqual({ tema: 'oscuro', letraCodigo: 26, letraInterfaz: 11 });
    expect(leerAjustes('{"tema":"claro","letraCodigo":18}')).toEqual({ tema: 'claro', letraCodigo: 18, letraInterfaz: 13.5 });
  });

  it('se aplican con variables de CSS', () => {
    const raiz = document.createElement('div');
    aplicarAjustes({ tema: 'claro', letraCodigo: 20, letraInterfaz: 27 }, raiz);
    expect(raiz.dataset.tema).toBe('claro');
    expect(raiz.style.getPropertyValue('--tamano-codigo')).toBe('20px');
    expect(raiz.style.getPropertyValue('--zoom-interfaz')).toBe('2');
  });
});

describe('Atajos', () => {
  it('cada atajo tiene sus teclas y lo que hace, y no se repiten', () => {
    const todas = ATAJOS.flatMap((g) => g.atajos);
    expect(todas.every((a) => a.teclas && a.que)).toBe(true);
    expect(new Set(todas.map((a) => a.teclas)).size).toBe(todas.length);
  });

  it('las teclas entre corchetes se ven como teclas', () => {
    const partes = teclasHtml('[Ctrl]+[S]');
    expect(partes.map((p) => (typeof p === 'string' ? p : `<${p.tagName.toLowerCase()}>${p.textContent}`))).toEqual(['<kbd>Ctrl', '+', '<kbd>S']);
  });
});
