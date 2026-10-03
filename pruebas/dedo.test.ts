/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * CHISPA 1.2, BLOQUE 2: programar con el dedo. La barra de atajos, los bloques
 * sin arrastrar, el tutorial en el móvil y los archivos (mis proyectos, fotos
 * enormes). Con toques de verdad: pruebas-navegador/moviles.mjs.
 */
import { describe, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { ATAJOS_DE_CODIGO, barraDeAtajos, cambioDeAtajo } from '../src/editor/codigo/barraAtajos';
import { EditorBloques } from '../src/editor/bloques/EditorBloques';
import { desdeCodigo } from '../src/editor/bloques/modelo';
import { GuiaTutorial, Tutorial } from '../src/editor/tutorial/Tutorial';
import { PASOS_TUTORIAL, type CajonDelPaso, type ContextoTutorial } from '../src/editor/tutorial/pasos';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { proyectoVacio } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { MAXIMO_PROYECTOS_GUARDADOS, fichaDeProyecto, proyectosQueSobran } from '../src/editor/Almacen';
import { LADO_MAXIMO_IMAGEN, LADO_REDUCIDO, PESO_MAXIMO_IMAGEN, hayQueReducir, importarArchivos, resumenImportar, tamanoReducido } from '../src/editor/recursos/importar';
import { analizarSintaxis } from '../src/chispa/sintaxis/parser';

/** El código con el cursor en «|» (o lo marcado entre «[» y «]») → el código después del atajo, con el cursor marcado igual. */
function atajo(id: string, codigo: string): string {
  const marcado = /\[(.*)\]/s.exec(codigo);
  const limpio = codigo.replace(/[|[\]]/g, '');
  const desde = marcado ? codigo.indexOf('[') : codigo.indexOf('|');
  const hasta = marcado ? desde + marcado[1].length : desde;
  const estado = EditorState.create({ doc: limpio, selection: EditorSelection.range(desde, hasta) });
  const cambio = cambioDeAtajo(estado, id);
  if (!cambio) throw new Error(`el atajo ${id} no escribe nada`);
  const nuevo = estado.update(cambio).state;
  const s = nuevo.selection.main;
  const texto = nuevo.doc.toString();
  return s.empty ? `${texto.slice(0, s.from)}|${texto.slice(s.from)}` : `${texto.slice(0, s.from)}[${texto.slice(s.from, s.to)}]${texto.slice(s.to)}`;
}

describe('La barra de atajos para escribir con el dedo', () => {
  it('tiene lo que pide el plan: si, sino, mientras, repetir, funcion, dos puntos, paréntesis, comillas, sangría y deshacer', () => {
    const ids = ATAJOS_DE_CODIGO.map((a) => a.id);
    for (const id of ['si', 'sino', 'mientras', 'repetir', 'funcion', 'dosPuntos', 'parentesis', 'comillas', 'sangria', 'quitarSangria', 'deshacer', 'rehacer']) expect(ids, id).toContain(id);
    // Cada uno con su ayuda (sale al dejar el dedo encima)
    for (const a of ATAJOS_DE_CODIGO) expect(a.ayuda.length, a.id).toBeGreaterThan(4);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('las palabras que abren un bloque dejan el cursor donde hay que escribir', () => {
    expect(atajo('si', '    |')).toBe('    si |:');
    expect(atajo('mientras', '|')).toBe('mientras |:');
    expect(atajo('repetir', '|')).toBe('repetir | veces:');
    expect(atajo('funcion', '|')).toBe('funcion [nombre]():');
    expect(atajo('cuando', '|')).toBe('cuando |');
    // Con algo marcado, lo marcado pasa a ser la condición
    expect(atajo('si', '    [yo.x > 5]')).toBe('    si yo.x > 5|:');
    // En mitad de una línea no se pega a lo de antes
    expect(atajo('si', 'x|')).toBe('x si |:');
  });

  it('«sino» en una línea vacía con sangría sale a la altura de su «si»', () => {
    expect(atajo('sino', 'si a:\n    b()\n    |')).toBe('si a:\n    b()\nsino:\n    |');
    expect(atajo('sino', '    si a:\n        b()\n        |')).toBe('    si a:\n        b()\n    sino:\n        |');
    expect(atajo('sino', '|')).toBe('sino:\n    |');
  });

  it('paréntesis y comillas dejan el cursor dentro, o rodean lo marcado', () => {
    expect(atajo('parentesis', 'mostrar|')).toBe('mostrar(|)');
    expect(atajo('comillas', 'mostrar(|)')).toBe('mostrar("|")');
    expect(atajo('comillas', 'mostrar([hola])')).toBe('mostrar("[hola]")');
    expect(atajo('parentesis', '[a + b] * 2')).toBe('([a + b]) * 2');
    expect(atajo('dosPuntos', 'si a|')).toBe('si a:|');
    expect(atajo('igual', 'vida|')).toBe('vida = |');
    expect(atajo('punto', 'yo|')).toBe('yo.|');
  });

  it('lo que escriben los atajos es código de Chispa que se entiende', () => {
    // Un script entero hecho solo con atajos y lo mínimo escrito a mano
    let estado = EditorState.create({ doc: '' });
    const pulsar = (id: string) => (estado = estado.update(cambioDeAtajo(estado, id)!).state);
    const escribir = (t: string) => (estado = estado.update(estado.replaceSelection(t)).state);
    const fin = () => (estado = estado.update({ selection: EditorSelection.cursor(estado.doc.length) }).state);
    pulsar('cuando');
    escribir('empieza:\n    ');
    pulsar('si');
    escribir('yo.x > 5');
    fin();
    escribir('\n        mostrar');
    pulsar('parentesis');
    pulsar('comillas');
    escribir('hola');
    fin();
    // (al pulsar Intro, el editor deja la sangría de la línea de antes)
    escribir('\n        ');
    pulsar('sino');
    escribir('mostrar(1)\n    ');
    pulsar('repetir');
    escribir('3');
    fin();
    escribir('\n        yo.x += 1\n');
    pulsar('funcion');
    fin();
    escribir('\n    devolver 2\n');
    const codigo = estado.doc.toString();
    expect(codigo).toBe('cuando empieza:\n    si yo.x > 5:\n        mostrar("hola")\n    sino:\n        mostrar(1)\n    repetir 3 veces:\n        yo.x += 1\nfuncion nombre():\n    devolver 2\n');
    expect(analizarSintaxis(codigo, 'atajos.chs').errores).toEqual([]);
  });

  it('la barra tiene un botón por atajo, y pulsarlos no se lleva el foco (el teclado no se esconde)', () => {
    const barra = barraDeAtajos(() => null);
    const botones = [...barra.querySelectorAll<HTMLButtonElement>('button')];
    expect(botones.map((b) => b.dataset.atajo)).toEqual(ATAJOS_DE_CODIGO.map((a) => a.id));
    for (const b of botones) {
      expect(b.title, b.dataset.atajo).toBeTruthy();
      const ev = new Event('pointerdown', { cancelable: true, bubbles: true });
      b.dispatchEvent(ev);
      expect(ev.defaultPrevented, b.dataset.atajo).toBe(true);
    }
    // Sin editor delante no falla
    expect(() => botones[0].click()).not.toThrow();
  });
});

describe('Bloques sin arrastrar: coger con un toque y poner en un sitio', () => {
  const editor = (codigo: string) => {
    let escrito = codigo;
    const e = new EditorBloques((c) => (escrito = c));
    const lectura = desdeCodigo(codigo);
    if (!lectura.ok) throw new Error('no se puede pasar a bloques');
    e.cargar(lectura.bloques);
    document.body.replaceChildren(e.elemento);
    return { e, codigo: () => escrito };
  };
  const tocar = (el: Element | null | undefined) => {
    if (!el) throw new Error('no está lo que hay que tocar');
    (el as HTMLElement).click();
  };
  const categoria = (e: EditorBloques, nombre: string) => tocar([...e.elemento.querySelectorAll('.categoria-bloques')].find((c) => c.textContent === nombre));
  const dePaleta = (e: EditorBloques, texto: string) => [...e.elemento.querySelectorAll('.bloque-paleta')].find((b) => b.textContent!.includes(texto));
  const sitios = (e: EditorBloques) => [...e.elemento.querySelectorAll<HTMLElement>('.sitio-soltar')];

  it('con el código vacío, tocar un bloque de la paleta lo pone sin preguntar', () => {
    const { e, codigo } = editor('');
    tocar(dePaleta(e, 'cuando empieza'));
    expect(codigo()).toContain('cuando empieza:');
    expect(sitios(e)).toEqual([]);
  });

  it('tocar un bloque de la paleta y luego un sitio lo pone ahí', () => {
    const { e, codigo } = editor('cuando empieza:\n    mostrar("a")\n    mostrar("b")\n');
    expect(sitios(e)).toEqual([]);
    categoria(e, 'Control');
    tocar(dePaleta(e, 'repetir'));
    // Salen los sitios: antes y después del evento, y antes, entre y después de sus dos bloques
    expect(e.elemento.classList.contains('colocando')).toBe(true);
    expect(sitios(e).length).toBe(5);
    expect(e.elemento.querySelector('.aviso-bloques')!.textContent).toContain('repetir');
    // Entre «a» y «b»
    tocar(sitios(e)[2]);
    expect(codigo()).toMatch(/mostrar\("a"\)\n {4}repetir .* veces:\n(.*\n)? {4}mostrar\("b"\)/);
    // Ya no hay nada en la mano
    expect(sitios(e)).toEqual([]);
    expect(e.elemento.classList.contains('colocando')).toBe(false);
  });

  it('tocar la cabecera de un bloque lo coge para moverlo (también dentro de otro), duplicarlo o borrarlo', () => {
    const { e, codigo } = editor('cuando empieza:\n    mostrar("a")\n    repetir 2 veces:\n        mostrar("b")\n');
    const cabeza = (texto: string) => [...e.elemento.querySelectorAll('.bloque')].filter((b) => b.querySelector(':scope > .cabeza-bloque')!.textContent!.includes(texto) || [...b.querySelectorAll(':scope > .cabeza-bloque input')].some((i) => (i as HTMLInputElement).value.includes(texto))).pop()!.querySelector(':scope > .cabeza-bloque');
    // Mover «a» dentro del repetir
    tocar(cabeza('"a"'));
    expect(e.elemento.querySelector('.bloque.en-mano')).not.toBeNull();
    // No se ofrecen los dos sitios que lo dejarían donde está
    expect(sitios(e).length).toBe(5);
    // El último sitio de dentro del «repetir»
    const dentro = [...e.elemento.querySelectorAll('.bloque.tipo-repetir .boca-bloque .sitio-soltar')];
    expect(dentro.length).toBe(2);
    tocar(dentro[1]);
    expect(codigo()).toBe('cuando empieza:\n    repetir 2 veces:\n        mostrar("b")\n        mostrar("a")\n');
    // Duplicar «b»
    tocar(cabeza('"b"'));
    tocar(e.elemento.querySelector('[data-accion="duplicar"]'));
    expect(codigo()).toBe('cuando empieza:\n    repetir 2 veces:\n        mostrar("b")\n        mostrar("b")\n        mostrar("a")\n');
    // Borrar «a»
    tocar(cabeza('"a"'));
    tocar(e.elemento.querySelector('[data-accion="borrar"]'));
    expect(codigo()).toBe('cuando empieza:\n    repetir 2 veces:\n        mostrar("b")\n        mostrar("b")\n');
    // Cancelar no cambia nada; tocar el mismo otra vez, tampoco
    tocar(cabeza('repetir'));
    // Un bloque no se puede meter dentro de sí mismo: dentro del repetir no hay sitios
    expect(e.elemento.querySelector('.bloque.en-mano .sitio-soltar')).toBeNull();
    tocar(e.elemento.querySelector('[data-accion="cancelar"]'));
    expect(sitios(e)).toEqual([]);
    tocar(cabeza('repetir'));
    tocar(cabeza('repetir'));
    expect(sitios(e)).toEqual([]);
    expect(codigo()).toBe('cuando empieza:\n    repetir 2 veces:\n        mostrar("b")\n        mostrar("b")\n');
  });

  it('los botones de deshacer y rehacer hacen lo que Ctrl+Z y Ctrl+Y; tocar un hueco no coge el bloque', () => {
    const { e, codigo } = editor('cuando empieza:\n    mostrar("a")\n');
    tocar(e.elemento.querySelector('.bloque .bloque .quitar-bloque'));
    expect(codigo()).not.toContain('mostrar');
    tocar(e.elemento.querySelector('.deshacer-bloques'));
    expect(codigo()).toContain('mostrar("a")');
    tocar(e.elemento.querySelector('.rehacer-bloques'));
    expect(codigo()).not.toContain('mostrar');
    tocar(e.elemento.querySelector('.deshacer-bloques'));
    // Tocar el hueco de escribir es para escribir, no para mover el bloque
    tocar(e.elemento.querySelector('.bloque .bloque input'));
    expect(sitios(e)).toEqual([]);
    // Escape suelta lo que se tiene en la mano
    tocar(e.elemento.querySelector('.bloque .bloque .cabeza-bloque'));
    expect(sitios(e).length).toBeGreaterThan(0);
    e.elemento.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(sitios(e)).toEqual([]);
  });

  it('con el teclado (sin ratón ni dedo): Intro en un bloque de la paleta lo coge', () => {
    const { e } = editor('cuando empieza:\n    mostrar("a")\n');
    const b = dePaleta(e, 'cuando empieza')!;
    expect(b.getAttribute('tabindex')).toBe('0');
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(sitios(e).length).toBeGreaterThan(0);
  });
});

describe('El tutorial en el móvil', () => {
  function contexto(tactil: boolean) {
    const estado = new EstadoEditor();
    estado.abrir(proyectoVacio('Mi primer juego'));
    const cajones: CajonDelPaso[] = [];
    let jugando = false;
    const c: ContextoTutorial = {
      estado,
      herramienta: () => herramienta,
      ponerHerramienta: (h) => (herramienta = h),
      anadir: (tipo) => void estado.crearObjeto(tipo, 480, 270),
      juegoEnMarcha: () => jugando,
      ejecutar: () => (jugando = true),
      datoDelJuego: () => 0,
      escribirCodigo: (archivo, codigo) => estado.cambiarCodigo(archivo, codigo),
      hayErrores: () => [...revisarProyecto(estado.proyecto).porArchivo.values()].flat().some((d) => d.gravedad === 'error'),
      tactil: () => tactil,
      abrirCajon: (x) => void cajones.push(x),
    };
    let herramienta = 'mover';
    return { c, cajones, estado };
  }

  it('cada paso dice en qué cajón está lo que hay que tocar, y los que hablan del ratón tienen su texto para el dedo', () => {
    for (const p of PASOS_TUTORIAL) {
      const texto = p.textoTactil ?? p.texto;
      expect(texto, p.titulo).not.toMatch(/haz clic|con el ratón|\bF5\b|Ctrl\+|Mayús|tecla V/i);
      // Lo que está en un panel (la lista de objetos, las propiedades, el juego) lleva su cajón
      const fuente = String(p.objetivo ?? '');
      if (/inspector|seccionInspector/.test(fuente)) expect(p.cajon, p.titulo).toBe('propiedades');
      if (/botonAnadir|filaObjeto/.test(fuente) || p.titulo === 'El jugador') expect(p.cajon, p.titulo).toBe('objetos');
      if (/vista-juego/.test(fuente)) expect(p.cajon, p.titulo).toBe('juego');
    }
    // Los textos de siempre (con ratón) no han cambiado de sentido: siguen hablando de clic donde toca
    expect(PASOS_TUTORIAL[0].texto).toContain('hacer clic');
    expect(PASOS_TUTORIAL[0].textoTactil).toContain('tocar');
  });

  it('en el móvil, el tutorial abre el cajón de cada paso y enseña el texto para el dedo; se puede recorrer entero', () => {
    const { c, cajones, estado } = contexto(true);
    const t = new Tutorial(c);
    const burbuja = () => document.querySelector('.tutorial-burbuja')!;
    expect(burbuja().textContent).toContain('dónde tocar');
    expect(cajones).toEqual(['']);
    const vistos: string[] = [];
    for (let i = 0; i < 60 && t.abierto; i++) {
      const p = t.guia.paso;
      vistos.push(p.titulo);
      // Se ha abierto el cajón de este paso
      expect(cajones[cajones.length - 1], p.titulo).toBe(p.cajon ?? '');
      if (p.textoTactil) expect(burbuja().textContent, p.titulo).toContain(p.textoTactil.replace(/\*\*/g, '').slice(0, 30));
      if (p.hazloPorMi) burbuja().querySelector<HTMLButtonElement>('.tutorial-hazlo')!.click();
      else burbuja().querySelector<HTMLButtonElement>('.tutorial-siguiente')!.click();
      if (!document.querySelector('.tutorial-burbuja')) break;
    }
    // (algún paso se da por hecho solo: «vuelve a la flecha» si ya se tenía la flecha)
    expect(vistos.length).toBeGreaterThanOrEqual(PASOS_TUTORIAL.length - 2);
    expect(vistos[vistos.length - 1]).toBe(PASOS_TUTORIAL[PASOS_TUTORIAL.length - 1].titulo);
    expect(t.abierto).toBe(false);
    // El juego ha quedado hecho
    expect(estado.escena.objetos.map((o) => o.nombre)).toEqual(expect.arrayContaining(['Jugador', 'Moneda']));
    expect(cajones).toContain('objetos');
    expect(cajones).toContain('propiedades');
    expect(cajones).toContain('juego');
  });

  it('con ratón no se abre ningún cajón distinto ni cambian los textos', () => {
    const { c } = contexto(false);
    const g = new GuiaTutorial(c);
    expect(g.paso.texto).toContain('hacer clic');
    const t = new Tutorial(c);
    expect(document.querySelector('.tutorial-burbuja')!.textContent).toContain('dónde hacer clic');
    t.cerrar();
  });

  it('la burbuja se puede encoger para ver lo de debajo, y vuelve a su tamaño en el paso siguiente', () => {
    const { c } = contexto(true);
    const t = new Tutorial(c);
    const burbuja = () => document.querySelector('.tutorial-burbuja')!;
    burbuja().querySelector<HTMLButtonElement>('.tutorial-encoger')!.click();
    expect(burbuja().classList.contains('encogida')).toBe(true);
    expect(burbuja().querySelector('p')).toBeNull();
    expect(burbuja().textContent).toContain('Tu primer juego');
    burbuja().querySelector<HTMLButtonElement>('.tutorial-encoger')!.click();
    expect(burbuja().querySelector('p')).not.toBeNull();
    burbuja().querySelector<HTMLButtonElement>('.tutorial-encoger')!.click();
    t.guia.siguiente();
    t.actualizar();
    expect(burbuja().classList.contains('encogida')).toBe(false);
    t.cerrar();
  });
});

describe('Archivos en el móvil', () => {
  it('Mis proyectos: de cada proyecto se guarda su identificador y su nombre; al pasar del máximo, sobran los más viejos', () => {
    expect(fichaDeProyecto(JSON.stringify(proyectoVacio('Mi juego')))).toEqual({ id: expect.any(String), nombre: 'Mi juego' });
    expect(fichaDeProyecto('{"nombre":"sin id"}')).toBeNull();
    expect(fichaDeProyecto('esto no es json')).toBeNull();
    expect(fichaDeProyecto('{"id":"abc"}')).toEqual({ id: 'abc', nombre: 'Sin nombre' });
    const lista = Array.from({ length: MAXIMO_PROYECTOS_GUARDADOS + 3 }, (_, i) => ({ id: `p${i}`, nombre: `P${i}`, fecha: 1000 + i, tamano: 10 }));
    expect(proyectosQueSobran(lista)).toEqual(['p2', 'p1', 'p0']);
    expect(proyectosQueSobran(lista.slice(0, 5))).toEqual([]);
  });

  it('una foto enorme se reduce sin deformarla; una imagen normal se deja como está', () => {
    expect(tamanoReducido(4000, 3000)).toEqual({ ancho: LADO_REDUCIDO, alto: 768 });
    expect(tamanoReducido(3000, 4000)).toEqual({ ancho: 768, alto: LADO_REDUCIDO });
    expect(tamanoReducido(64, 64)).toEqual({ ancho: 64, alto: 64 });
    expect(tamanoReducido(5000, 3)).toEqual({ ancho: LADO_REDUCIDO, alto: 1 });
    expect(hayQueReducir(4000, 3000, 100)).toBe(true);
    expect(hayQueReducir(LADO_MAXIMO_IMAGEN, 100, 100)).toBe(false);
    expect(hayQueReducir(800, 600, PESO_MAXIMO_IMAGEN + 1)).toBe(true);
    expect(hayQueReducir(64, 64, 2000)).toBe(false);
  });

  it('una foto HEIC del iPhone se rechaza diciendo qué hacer', async () => {
    const estado = new EstadoEditor();
    const bytes = new Uint8Array([0, 0, 0, 0x18, ...[...'ftypheic'].map((c) => c.charCodeAt(0)), 0, 0, 0, 0]);
    const r = await importarArchivos(estado, [new File([bytes], 'IMG_0001.HEIC', { type: 'image/heic' })]);
    expect(r.imagenes).toEqual([]);
    expect(r.rechazados[0]).toMatch(/HEIC.*JPG/);
    expect(resumenImportar(r)!.tipo).toBe('error');
  });

  it('el resumen cuenta las que se han reducido', () => {
    const m = resumenImportar({ imagenes: ['foto'], sonidos: [], letras: [], rechazados: [], reducidas: ['foto (ahora mide 1024×768)'] });
    expect(m!.tipo).toBe('ok');
    expect(m!.texto).toContain('Era muy grande y se ha reducido: foto (ahora mide 1024×768)');
  });
});
