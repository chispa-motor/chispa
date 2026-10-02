/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PLANTILLAS DE PROYECTO (día 5, bloque 1): plataformas, vista desde arriba,
 * naves, puzle, carreras, cartas y diálogos. Aquí se comprueba que cada una
 * es un proyecto correcto, pequeño y comentado, y se JUEGA de verdad.
 */
import { describe, expect, it } from 'vitest';
import { PLANTILLAS, plantillaPorId } from '../src/plantillas/indice';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { elegirPlantilla, fichasDeProyecto } from '../src/editor/plantillas/elegirPlantilla';
import { celdasDeTexto, sitiosDeTexto } from '../src/plantillas/ayudas';
import { DIBUJOS } from '../src/recursos/dibujos';
import { migrarProyecto } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { MapaCasillas } from '../src/objetos/componentes/MapaCasillas';
import { Control } from '../src/objetos/componentes/Control';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { juegoDePrueba } from './ayudantes';

function jugar(id: string, almacen = new Map<string, string>()) {
  const proyecto = migrarProyecto(JSON.parse(JSON.stringify(plantillaPorId(id)!.crear())));
  const j = juegoDePrueba({ proyecto, almacen });
  const tecla = (codigo: string, letra = codigo, fotogramas = 1) => {
    j.pulsar(codigo, letra);
    j.avanzar(fotogramas);
    j.soltar(codigo, letra);
    j.avanzar(1);
  };
  /** Pasa los diálogos que haya abiertos (con espacio), hasta `veces`. */
  const pasarDialogos = (veces = 6) => {
    for (let i = 0; i < veces && j.juego.escena.enDialogo; i++) {
      j.avanzar(90);
      tecla('Space', ' ');
      j.avanzar(5);
    }
  };
  const sinErrores = () => expect(j.errores.map((e) => `${e.error.ubicacion?.archivo}:${e.error.linea} ${e.error.mensajeCorto}`)).toEqual([]);
  return { ...j, proyecto, tecla, pasarDialogos, sinErrores };
}

describe('La ventana «Proyecto nuevo»', () => {
  it('ofrece empezar en blanco, las siete plantillas y el ejemplo mínimo; cada ficha da un proyecto que se abre', () => {
    const fichas = fichasDeProyecto();
    expect(fichas.map((f) => f.id)).toEqual(['vacio', ...PLANTILLAS.map((p) => p.id), 'ejemplo']);
    for (const f of fichas) {
      const e = new EstadoEditor();
      e.abrir(f.crear());
      expect(e.proyecto.nombre.length).toBeGreaterThan(3);
      expect(Object.keys(e.proyecto.escenas)).toContain(e.proyecto.escenaInicial);
    }
  });

  it('al elegir una ficha se cierra y devuelve su proyecto; al cancelar, nada', async () => {
    const eleccion = elegirPlantilla(true);
    expect(document.querySelectorAll('[data-plantilla]').length).toBe(9);
    expect(document.querySelector('.dialogo')!.textContent).toContain('El proyecto actual se cerrará');
    document.querySelector<HTMLButtonElement>('[data-plantilla="naves"]')!.click();
    const proyecto = await eleccion;
    expect(proyecto!.nombre).toBe('Mi juego de naves');
    expect(document.querySelector('.dialogo-fondo')).toBeNull();

    const otra = elegirPlantilla(false);
    [...document.querySelectorAll<HTMLButtonElement>('.dialogo-botones button')].find((b) => b.textContent === 'Cancelar')!.click();
    expect(await otra).toBeNull();
    const conEscape = elegirPlantilla(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(await conEscape).toBeNull();
  });
});

describe('Las ayudas para escribir mapas', () => {
  it('convierten el texto en casillas (la primera fila es la de arriba) y encuentran las letras', () => {
    const filas = ['#..', '.J#'];
    expect(celdasDeTexto(filas, { '#': 'muro' })).toEqual({ '0,1': 'muro', '2,0': 'muro' });
    expect(celdasDeTexto(filas, { '#': 'muro' }, 'suelo')['1,0']).toBe('suelo');
    expect(sitiosDeTexto(filas, 'J')).toEqual([{ x: 72, y: 24 }]);
    expect(sitiosDeTexto(filas, 'J', 100, 10)).toEqual([{ x: 172, y: 34 }]);
    expect(() => celdasDeTexto(['##', '#'], {})).toThrow(/igual de largas/);
  });
});

describe('Todas las plantillas', () => {
  it('están las siete que tocan, cada una con su ficha', () => {
    expect(PLANTILLAS.map((p) => p.id)).toEqual(['plataformas', 'aventura', 'naves', 'puzzle', 'carreras', 'cartas', 'historia']);
    const dibujos = DIBUJOS.map((d) => d.nombre);
    for (const p of PLANTILLAS) {
      expect(p.titulo.length).toBeGreaterThan(3);
      expect(p.descripcion.length).toBeGreaterThan(20);
      expect(p.controles.length).toBeGreaterThan(3);
      expect(dibujos).toContain(p.dibujo);
      // Su dibujo es el icono del juego, y está entre sus imágenes
      expect(p.crear().icono).toBe(p.dibujo);
      expect(Object.keys(p.crear().imagenes)).toContain(p.dibujo);
    }
    expect(plantillaPorId('no-existe')).toBeNull();
  });

  for (const plantilla of PLANTILLAS) {
    describe(plantilla.titulo, () => {
      const crudo = plantilla.crear();

      it('es un proyecto correcto: se abre igual que se guardó, sin errores ni avisos', () => {
        const abierto = migrarProyecto(JSON.parse(JSON.stringify(crudo)));
        // El validador no ha tenido que quitar nada
        const { id: _id, ...sinId } = abierto;
        expect(sinId).toEqual({ controlesTactiles: true, ...JSON.parse(JSON.stringify(crudo)) });
        const revision = revisarProyecto(abierto);
        expect(revision.errores.map((e) => e.message)).toEqual([]);
        expect(revision.avisos.map((a) => a.mensaje)).toEqual([]);
      });

      it('cada vez que se pide es un proyecto nuevo (cambiar uno no cambia el siguiente)', () => {
        const otro = plantilla.crear();
        expect(otro).toEqual(crudo);
        otro.escenas[otro.escenaInicial].objetos.length = 0;
        Object.values(otro.canciones ?? {}).forEach((c) => (c.tempo = 1));
        expect(plantilla.crear()).toEqual(crudo);
      });

      it('solo usa recursos de Chispa, y todos los que lleva los usa', () => {
        const texto = JSON.stringify({ ...crudo, imagenes: {}, sonidosHechos: {}, canciones: {} });
        for (const n of [...Object.keys(crudo.imagenes), ...Object.keys(crudo.sonidosHechos ?? {}), ...Object.keys(crudo.canciones ?? {})]) {
          expect(texto.includes(`"${n}"`) || texto.includes(`\\"${n}\\"`), `${plantilla.id}: «${n}» no se usa`).toBe(true);
        }
        expect(Object.keys(crudo.sonidos)).toEqual([]);
      });

      it('sus scripts son pequeños, están comentados y no llevan tildes en el código', () => {
        const scripts = Object.entries(crudo.scripts);
        expect(scripts.length).toBeGreaterThan(0);
        let total = 0;
        for (const [nombre, codigo] of scripts) {
          const lineas = codigo.split('\n').filter((l) => l.trim());
          total += lineas.length;
          expect(lineas.length, nombre).toBeLessThanOrEqual(75);
          // Empieza explicando qué es, y lleva comentarios por dentro
          expect(lineas[0].startsWith('# '), nombre).toBe(true);
          const comentarios = lineas.filter((l) => l.trim().startsWith('#')).length;
          expect(comentarios / lineas.length, nombre).toBeGreaterThanOrEqual(0.1);
          // Fuera de los textos y los comentarios, ni tildes (la ñ de «añadir» sí vale)
          const soloCodigo = lineas.map((l) => l.replace(/"[^"]*"/g, '""').replace(/#.*$/, '')).join('\n');
          expect(soloCodigo, nombre).not.toMatch(/[áéíóúÁÉÍÓÚ]/);
        }
        expect(total, plantilla.id).toBeLessThanOrEqual(150);
      });

      it('se juega 10 segundos sin tocar nada y no da ningún error', () => {
        const j = jugar(plantilla.id);
        for (let i = 0; i < 10; i++) {
          j.avanzar(60);
          j.pasarDialogos(1);
        }
        j.sinErrores();
        expect(j.avisos).toEqual([]);
      });
    });
  }
});

// ───────────────────────── Jugarlas de verdad ─────────────────────────

type Juego = ReturnType<typeof jugar>;
/** Lo que vale juego.<nombre> ahora. */
function dato(j: Juego, nombre: string): unknown {
  const tabla = j.juego.interprete.globales.buscar('juego')!.valor as { resumenParaDepurar(): Iterable<[string, unknown]> };
  return new Map(tabla.resumenParaDepurar()).get(nombre);
}
/** Pone un objeto en un sitio, de golpe y parado. */
function llevar(j: Juego, nombre: string, x: number, y: number) {
  const o = j.buscar(nombre);
  o.posicion.x = x;
  o.posicion.y = y;
  const f = o.obtener(Fisica);
  if (f) f.velocidad.x = f.velocidad.y = 0;
}
const mantener = (j: Juego, codigo: string, fotogramas: number, letra = codigo) => {
  j.pulsar(codigo, letra);
  j.avanzar(fotogramas);
  j.soltar(codigo, letra);
  j.avanzar(1);
};
const cuantos = (j: Juego, tipo: string) => j.juego.escena.objetos.filter((o) => !o.destruido && o.tipo === tipo).length;

describe('Plataformas, jugando', () => {
  it('anda, salta y coge las monedas que tiene delante', () => {
    const j = jugar('plataformas');
    j.avanzar(30);
    const jugador = j.buscar('Jugador');
    expect(jugador.obtener(Fisica)!.enSuelo).toBe(true);
    const x0 = jugador.posicion.x;
    const y0 = jugador.posicion.y;
    j.tecla('Space', ' ');
    j.avanzar(10);
    expect(jugador.posicion.y).toBeGreaterThan(y0 + 40);
    j.avanzar(80);
    mantener(j, 'ArrowRight', 60);
    expect(jugador.posicion.x).toBeGreaterThan(x0 + 200);
    expect(dato(j, 'monedas')).toBe(2);
    j.sinErrores();
  });

  it('caer en los pinchos quita una vida y devuelve al principio; sin vidas, se empieza de cero', () => {
    const j = jugar('plataformas');
    j.avanzar(30);
    const jugador = j.buscar('Jugador');
    const x0 = jugador.posicion.x;
    // Andar a la derecha sin saltar: se cae al foso de los pinchos
    j.pulsar('ArrowRight', 'ArrowRight');
    for (let i = 0; i < 200 && dato(j, 'vidas') === 3; i++) j.avanzar(1);
    j.soltar('ArrowRight', 'ArrowRight');
    j.avanzar(1);
    expect(dato(j, 'vidas')).toBe(2);
    expect(Math.abs(j.buscar('Jugador').posicion.x - x0)).toBeLessThan(20);
    for (let i = 0; i < 2; i++) {
      llevar(j, 'Jugador', 11 * 48 + 24, 60);
      j.avanzar(20);
    }
    expect(j.juego.escena.enDialogo).toBe(true);
    j.pasarDialogos();
    j.avanzar(30);
    expect(dato(j, 'vidas')).toBe(3);
    expect(dato(j, 'monedas')).toBe(0);
    expect(cuantos(j, 'Moneda')).toBe(9);
    j.sinErrores();
  });

  it('caerle encima a un slime lo aplasta; tocarlo de lado quita una vida', () => {
    const j = jugar('plataformas');
    j.avanzar(30);
    const slime = j.buscar('Slime1');
    // El slime anda hacia la derecha: se le cae un poco por delante
    llevar(j, 'Jugador', slime.posicion.x + 10, slime.posicion.y + 44);
    j.avanzar(40);
    // Lo ha aplastado y ha rebotado hacia arriba
    expect(slime.destruido).toBe(true);
    expect(cuantos(j, 'Slime')).toBe(1);
    expect(dato(j, 'vidas')).toBe(3);
    const otro = j.buscar('Slime2');
    llevar(j, 'Jugador', otro.posicion.x + 30, otro.posicion.y);
    j.avanzar(5);
    expect(dato(j, 'vidas')).toBe(2);
    j.sinErrores();
  });

  it('el nivel se puede terminar: un jugador que corre y salta los fosos y los slimes llega a la bandera', () => {
    const j = jugar('plataformas');
    j.avanzar(30);
    const mapa = j.buscar('Mapa').obtener(MapaCasillas)!;
    j.pulsar('ArrowRight', 'ArrowRight');
    let gano = false;
    for (let i = 0; i < 60 * 60 && !gano; i++) {
      const jugador = j.buscar('Jugador');
      const { x, y } = jugador.posicion;
      const columna = Math.floor((x + 40) / 48);
      const fila = Math.floor(y / 48);
      // Salta si delante no hay suelo, hay un escalón o viene un slime
      const solida = (c: number, f: number) => { const t = mapa.obtener(c, f); return !!t && mapa.esSolida(t); };
      const sinSuelo = !solida(columna, fila - 1);
      const escalon = solida(columna, fila);
      const slime = j.juego.escena.objetos.some((o) => !o.destruido && o.tipo === 'Slime' && o.posicion.x - x > 0 && o.posicion.x - x < 110 && Math.abs(o.posicion.y - y) < 60);
      if (jugador.obtener(Fisica)!.enSuelo && (sinSuelo || escalon || slime)) j.tecla('Space', ' ');
      else j.avanzar(1);
      gano = j.juego.escena.enDialogo && j.buscar('Jugador').posicion.x > 40 * 48;
    }
    expect(gano).toBe(true);
    expect(j.buscar('Jugador').posicion.x).toBeGreaterThan(40 * 48);
    j.sinErrores();
  });
});

describe('Vista desde arriba, jugando', () => {
  it('se mueve en las cuatro direcciones y las paredes lo paran', () => {
    const j = jugar('aventura');
    j.avanzar(10);
    const jugador = j.buscar('Jugador');
    const { x, y } = jugador.posicion;
    mantener(j, 'ArrowDown', 20);
    expect(jugador.posicion.y).toBeLessThan(y - 40);
    mantener(j, 'ArrowLeft', 120);
    // La pared de la izquierda ocupa la primera columna (48 píxeles)
    expect(jugador.posicion.x).toBeLessThan(x);
    expect(jugador.posicion.x).toBeGreaterThanOrEqual(48 + 14);
    j.sinErrores();
  });

  it('las gemas y la llave van al inventario; el cofre pide la llave y las tres gemas', () => {
    const j = jugar('aventura');
    j.avanzar(10);
    const mochila = j.buscar('Inventario').obtener(Control)!;
    const cofre = j.buscar('Cofre').posicion;
    const tocarCofre = () => {
      llevar(j, 'Jugador', cofre.x - 60, cofre.y);
      j.avanzar(2);
      mantener(j, 'ArrowRight', 20);
    };
    tocarCofre();
    expect(j.juego.escena.enDialogo).toBe(true);
    j.pasarDialogos();
    const llave = j.buscar('Llave').posicion;
    llevar(j, 'Jugador', llave.x, llave.y);
    j.avanzar(3);
    expect(mochila.cuantos('llave')).toBe(1);
    for (const n of ['Gema1', 'Gema2']) {
      const g = j.buscar(n).posicion;
      llevar(j, 'Jugador', g.x, g.y);
      j.avanzar(3);
    }
    expect(mochila.cuantos('gema')).toBe(2);
    tocarCofre();
    expect(j.juego.escena.enDialogo).toBe(true);
    j.pasarDialogos();
    expect(cuantos(j, 'Gema')).toBe(1);
    const g = j.buscar('Gema3').posicion;
    llevar(j, 'Jugador', g.x, g.y);
    j.avanzar(3);
    tocarCofre();
    j.pasarDialogos();
    j.avanzar(30);
    // Ha ganado: la escena vuelve a empezar, con todo en su sitio
    expect(cuantos(j, 'Gema')).toBe(3);
    expect(j.buscar('Inventario').obtener(Control)!.cuantos('gema')).toBe(0);
    j.sinErrores();
  });

  it('los fantasmas persiguen de cerca y quitan una vida al tocar', () => {
    const j = jugar('aventura');
    j.avanzar(10);
    const fantasma = j.buscar('Fantasma1');
    const x0 = fantasma.posicion.x;
    j.avanzar(60);
    expect(fantasma.posicion.x).toBe(x0); // lejos del jugador: quieto
    llevar(j, 'Jugador', x0 - 150, fantasma.posicion.y);
    j.avanzar(30);
    expect(fantasma.posicion.x).toBeLessThan(x0 - 20);
    llevar(j, 'Jugador', fantasma.posicion.x, fantasma.posicion.y);
    j.avanzar(3);
    expect(dato(j, 'vidas')).toBe(2);
    j.sinErrores();
  });
});

describe('Naves, jugando', () => {
  it('dispara con la cadencia que toca, salen ovnis y derribarlos da puntos', () => {
    const j = jugar('naves');
    j.avanzar(5);
    mantener(j, 'Space', 60, ' ');
    // Un segundo a un disparo cada 0.25 s: cuatro o cinco balas (algunas ya han salido de la pantalla)
    expect(cuantos(j, 'Bala')).toBeGreaterThanOrEqual(2);
    expect(cuantos(j, 'Bala')).toBeLessThanOrEqual(5);
    j.avanzar(60);
    expect(cuantos(j, 'Ovni')).toBeGreaterThanOrEqual(1);
    // Un ovni justo encima de la nave, y un disparo
    const nave = j.buscar('Nave').posicion;
    const ovni = j.juego.escena.objetos.find((o) => o.tipo === 'Ovni' && !o.destruido)!;
    const antes = dato(j, 'puntos') as number;
    ovni.posicion.x = nave.x;
    ovni.posicion.y = nave.y + 150;
    mantener(j, 'Space', 3, ' ');
    j.avanzar(20);
    expect(dato(j, 'puntos')).toBe(antes + 10);
    expect(ovni.destruido).toBe(true);
    j.sinErrores();
  });

  it('la nave no se sale de la pantalla', () => {
    const j = jugar('naves');
    mantener(j, 'ArrowLeft', 200);
    expect(j.buscar('Nave').posicion.x).toBe(30);
    mantener(j, 'ArrowUp', 200);
    expect(j.buscar('Nave').posicion.y).toBe(260);
    j.sinErrores();
  });

  it('tres choques acaban la partida, y el récord se guarda para la siguiente', () => {
    const almacen = new Map<string, string>();
    const j = jugar('naves', almacen);
    j.avanzar(70);
    const nave = j.buscar('Nave').posicion;
    const derribar = () => {
      const ovni = j.juego.escena.objetos.find((o) => o.tipo === 'Ovni' && !o.destruido)!;
      ovni.posicion.x = nave.x;
      ovni.posicion.y = nave.y + 150;
      mantener(j, 'Space', 3, ' ');
      j.avanzar(30);
    };
    derribar();
    const puntos = dato(j, 'puntos') as number;
    expect(puntos).toBeGreaterThanOrEqual(10);
    for (let i = 0; i < 3; i++) {
      j.avanzar(70);
      const ovni = j.juego.escena.objetos.find((o) => o.tipo === 'Ovni' && !o.destruido)!;
      ovni.posicion.x = nave.x;
      ovni.posicion.y = nave.y;
      j.avanzar(3);
    }
    expect(j.juego.escena.enDialogo).toBe(true);
    j.pasarDialogos();
    j.avanzar(30);
    expect(dato(j, 'puntos')).toBe(0);
    expect(dato(j, 'vidas')).toBe(3);
    expect(dato(j, 'record')).toBe(puntos);
    expect([...almacen.values()].join(' ')).toContain(String(puntos));
    j.sinErrores();
  });
});

describe('Puzle, jugando', () => {
  /** El nivel, leído del proyecto: paredes, cajas, marcas y jugador, en casillas. */
  function nivel() {
    const p = plantillaPorId('puzzle')!.crear();
    const objetos = p.escenas[p.escenaInicial].objetos;
    const mapa = objetos.find((o) => o.mapa)!;
    const casilla = (o: { x?: number; y?: number }) => `${Math.floor((o.x! - mapa.x!) / 48)},${Math.floor((o.y! - mapa.y!) / 48)}`;
    return {
      paredes: new Set(Object.entries(mapa.mapa!.celdas).filter(([, t]) => t === 'pared').map(([c]) => c)),
      cajas: objetos.filter((o) => /^Caja\d/.test(o.nombre ?? '')).map(casilla),
      marcas: objetos.filter((o) => /^Marca\d/.test(o.nombre ?? '')).map(casilla),
      jugador: casilla(objetos.find((o) => o.nombre === 'Jugador')!),
    };
  }

  const PASOS: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };

  /** Busca (a lo ancho) la solución más corta: la lista de teclas. null si no tiene. */
  function resolver(): string[] | null {
    const { paredes, cajas, marcas, jugador } = nivel();
    const clave = (j: string, c: string[]) => `${j}|${[...c].sort().join(';')}`;
    const vistos = new Set([clave(jugador, cajas)]);
    let cola: { j: string; c: string[]; teclas: string[] }[] = [{ j: jugador, c: cajas, teclas: [] }];
    while (cola.length) {
      const siguiente: typeof cola = [];
      for (const estado of cola) {
        if (marcas.every((m) => estado.c.includes(m))) return estado.teclas;
        const [x, y] = estado.j.split(',').map(Number);
        for (const [tecla, [dx, dy]] of Object.entries(PASOS)) {
          const a = `${x + dx},${y + dy}`;
          if (paredes.has(a)) continue;
          let c = estado.c;
          if (c.includes(a)) {
            const detras = `${x + dx * 2},${y + dy * 2}`;
            if (paredes.has(detras) || c.includes(detras)) continue;
            c = c.map((k) => (k === a ? detras : k));
          }
          const k = clave(a, c);
          if (vistos.has(k)) continue;
          vistos.add(k);
          siguiente.push({ j: a, c, teclas: [...estado.teclas, tecla] });
        }
      }
      cola = siguiente;
    }
    return null;
  }

  it('hay tantas cajas como marcas, y el nivel tiene solución', () => {
    const n = nivel();
    expect(n.cajas.length).toBe(n.marcas.length);
    expect(n.cajas.length).toBeGreaterThanOrEqual(3);
    const solucion = resolver();
    expect(solucion).not.toBeNull();
    // Ni regalado ni imposible para alguien que empieza
    expect(solucion!.length).toBeGreaterThanOrEqual(15);
    expect(solucion!.length).toBeLessThanOrEqual(80);
  });

  it('las paredes paran, las cajas se empujan de una en una y cada paso cuenta', () => {
    const j = jugar('puzzle');
    j.avanzar(5);
    const jugador = j.buscar('Jugador');
    const { x, y } = jugador.posicion;
    j.tecla('ArrowLeft');
    expect(jugador.posicion.x).toBe(x - 48);
    j.tecla('ArrowLeft');
    expect(jugador.posicion.x).toBe(x - 48); // pared
    expect(dato(j, 'pasos')).toBe(1);
    j.tecla('ArrowRight');
    j.tecla('ArrowRight');
    const caja = j.buscar('Caja1');
    const cx = caja.posicion.x;
    expect(cx).toBe(x + 96);
    j.tecla('ArrowRight');
    expect(jugador.posicion.x).toBe(x + 96);
    expect(caja.posicion.x).toBe(cx + 48);
    expect(jugador.posicion.y).toBe(y);
    expect(dato(j, 'pasos')).toBe(4);
    // R: todo vuelve a su sitio
    j.tecla('KeyR', 'r');
    j.avanzar(20);
    expect(j.buscar('Caja1').posicion.x).toBe(cx);
    expect(dato(j, 'pasos')).toBe(0);
    j.sinErrores();
  });

  it('jugando la solución, se gana', () => {
    const j = jugar('puzzle');
    j.avanzar(5);
    const solucion = resolver()!;
    for (const tecla of solucion) j.tecla(tecla);
    expect(j.juego.escena.enDialogo).toBe(true);
    expect(dato(j, 'pasos')).toBe(solucion.length);
    j.pasarDialogos();
    j.avanzar(20);
    expect(dato(j, 'pasos')).toBe(0);
    j.sinErrores();
  });
});

describe('Carreras, jugando', () => {
  it('acelera hacia donde mira, el muro lo para y por la hierba va lento', () => {
    const j = jugar('carreras');
    j.avanzar(5);
    const coche = j.buscar('Coche');
    const x0 = coche.posicion.x;
    mantener(j, 'ArrowUp', 60);
    expect(coche.posicion.x).toBeGreaterThan(x0 + 100);
    expect(Math.abs(coche.posicion.y - 144)).toBeLessThan(2);
    // Sigue recto: se sale de la pista, pisa la hierba (lento) y choca con el muro
    mantener(j, 'ArrowUp', 600);
    expect(coche.posicion.x).toBeLessThanOrEqual(23 * 48 - 18);
    expect(coche.posicion.x).toBeGreaterThan(22 * 48);
    llevar(j, 'Coche', 600, 70);
    mantener(j, 'ArrowUp', 120);
    expect(coche.obtener(Fisica)!.velocidad.x).toBeGreaterThan(100);
    expect(coche.obtener(Fisica)!.velocidad.x).toBeLessThanOrEqual(120);
    j.sinErrores();
  });

  it('el circuito se puede correr: tres vueltas siguiendo la pista, y el mejor tiempo se guarda', () => {
    const almacen = new Map<string, string>();
    const j = jugar('carreras', almacen);
    j.avanzar(5);
    const ruta = [[1008, 144], [1008, 480], [720, 480], [720, 336], [432, 336], [432, 480], [144, 480], [144, 144], [620, 144]];
    let hacia = 0;
    const teclas = { ArrowUp: false, ArrowLeft: false, ArrowRight: false };
    const poner = (tecla: keyof typeof teclas, si: boolean) => {
      if (teclas[tecla] === si) return;
      teclas[tecla] = si;
      if (si) j.pulsar(tecla, tecla);
      else j.soltar(tecla, tecla);
    };
    let vueltaMaxima = 1;
    let fotogramas = 0;
    for (; fotogramas < 60 * 150 && !j.juego.escena.enDialogo; fotogramas++) {
      const coche = j.buscar('Coche');
      const [px, py] = ruta[hacia];
      if (Math.hypot(px - coche.posicion.x, py - coche.posicion.y) < 50) hacia = (hacia + 1) % ruta.length;
      const quiere = (Math.atan2(ruta[hacia][1] - coche.posicion.y, ruta[hacia][0] - coche.posicion.x) * 180) / Math.PI;
      const falta = ((quiere - coche.transformacion.rotacion + 540) % 360) - 180;
      poner('ArrowLeft', falta > 4);
      poner('ArrowRight', falta < -4);
      poner('ArrowUp', Math.abs(falta) < 50 || coche.obtener(Fisica)!.velocidad.longitud() < 120);
      j.avanzar(1);
      vueltaMaxima = Math.max(vueltaMaxima, dato(j, 'vuelta') as number);
    }
    expect(j.juego.escena.enDialogo).toBe(true);
    expect(vueltaMaxima).toBe(4);
    const tiempo = dato(j, 'tiempo') as number;
    // Tres vueltas en un tiempo razonable (ni 10 segundos ni 2 minutos)
    expect(tiempo).toBeGreaterThan(25);
    expect(tiempo).toBeLessThan(100);
    expect([...almacen.values()].join(' ')).toContain(String(tiempo));
    for (const t of Object.keys(teclas) as (keyof typeof teclas)[]) poner(t, false);
    j.pasarDialogos();
    j.avanzar(30);
    expect(dato(j, 'vuelta')).toBe(1);
    expect(dato(j, 'mejor')).toBe(tiempo);
    j.sinErrores();
  });

  it('cruzar la meta sin haber dado la vuelta (sin pasar por el control) no cuenta', () => {
    const j = jugar('carreras');
    j.avanzar(5);
    for (let i = 0; i < 3; i++) {
      llevar(j, 'Coche', 400, 144);
      j.avanzar(3);
      llevar(j, 'Coche', 576, 144);
      j.avanzar(3);
    }
    expect(dato(j, 'vuelta')).toBe(1);
    llevar(j, 'Coche', 264, 480);
    j.avanzar(3);
    llevar(j, 'Coche', 400, 144);
    j.avanzar(3);
    llevar(j, 'Coche', 576, 144);
    j.avanzar(3);
    expect(dato(j, 'vuelta')).toBe(2);
    j.sinErrores();
  });
});

describe('Cartas, jugando', () => {
  const cartasDe = (j: Juego) => j.juego.escena.objetos.filter((o) => o.tipo === 'Carta' && !o.destruido);
  const clicEn = (j: Juego, o: { posicion: { x: number; y: number } }) => {
    j.clic(o.posicion.x, o.posicion.y);
    j.avanzar(3);
  };

  it('reparte doce cartas boca abajo, sin salirse de la pantalla: seis parejas, cada vez en otro orden', () => {
    const ordenes = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const j = jugar('cartas');
      j.avanzar(3);
      const cartas = cartasDe(j);
      expect(cartas.length).toBe(12);
      const dibujos = cartas.map((c) => (c.propiedades.get('dibujo') as { valor: string }).valor);
      for (const d of new Set(dibujos)) expect(dibujos.filter((x) => x === d).length).toBe(2);
      expect(new Set(dibujos).size).toBe(6);
      for (const c of cartas) {
        expect(c.obtener(Sprite)!.imagen).toBe('madera');
        expect(c.posicion.x).toBeGreaterThan(60);
        expect(c.posicion.x).toBeLessThan(900);
        expect(c.posicion.y).toBeGreaterThan(90);
        expect(c.posicion.y).toBeLessThan(470);
      }
      expect(new Set(cartas.map((c) => `${c.posicion.x},${c.posicion.y}`)).size).toBe(12);
      ordenes.add(dibujos.join());
    }
    expect(ordenes.size).toBeGreaterThan(1);
  });

  it('dos iguales se quedan levantadas; dos distintas se tapan; una tercera, mientras, no se levanta', () => {
    const j = jugar('cartas');
    j.avanzar(3);
    const cartas = cartasDe(j);
    const dibujo = (c: (typeof cartas)[number]) => (c.propiedades.get('dibujo') as { valor: string }).valor;
    const a = cartas[0];
    const igual = cartas.find((c) => c !== a && dibujo(c) === dibujo(a))!;
    const distinta = cartas.find((c) => dibujo(c) !== dibujo(a))!;
    const otra = cartas.find((c) => c !== a && c !== igual && c !== distinta)!;
    clicEn(j, a);
    expect(a.obtener(Sprite)!.imagen).toBe(dibujo(a));
    clicEn(j, a); // otra vez la misma: no cuenta
    clicEn(j, distinta);
    expect(dato(j, 'intentos')).toBe(1);
    clicEn(j, otra);
    expect(otra.obtener(Sprite)!.imagen).toBe('madera');
    j.avanzar(60);
    expect(a.obtener(Sprite)!.imagen).toBe('madera');
    expect(distinta.obtener(Sprite)!.imagen).toBe('madera');
    clicEn(j, a);
    clicEn(j, igual);
    j.avanzar(60);
    expect(dato(j, 'parejas')).toBe(1);
    expect(a.obtener(Sprite)!.imagen).toBe(dibujo(a));
    expect(igual.obtener(Sprite)!.imagen).toBe(dibujo(a));
    j.sinErrores();
  });

  it('con las seis parejas se gana y se reparte otra vez', () => {
    const j = jugar('cartas');
    j.avanzar(3);
    const cartas = cartasDe(j);
    const dibujo = (c: (typeof cartas)[number]) => (c.propiedades.get('dibujo') as { valor: string }).valor;
    for (const d of new Set(cartas.map(dibujo))) {
      for (const c of cartas.filter((x) => dibujo(x) === d)) clicEn(j, c);
      j.avanzar(5);
    }
    expect(j.juego.escena.enDialogo).toBe(true);
    expect(dato(j, 'intentos')).toBe(6);
    j.pasarDialogos();
    j.avanzar(20);
    expect(dato(j, 'parejas')).toBe(0);
    expect(cartasDe(j).length).toBe(12);
    expect(cartasDe(j).every((c) => c.obtener(Sprite)!.imagen === 'madera')).toBe(true);
    j.sinErrores();
  });
});

describe('Diálogos, jugando', () => {
  /** Se pone al lado de alguien y pulsa espacio. */
  function hablarCon(j: Juego, nombre: string) {
    const o = j.buscar(nombre).posicion;
    llevar(j, 'Jugador', o.x + 50, o.y);
    j.avanzar(3);
    j.tecla('Space', ' ');
    j.avanzar(3);
    expect(j.juego.escena.enDialogo, `hablar con ${nombre}`).toBe(true);
  }
  /** Lee hasta que salen las opciones y elige la número n; luego pasa lo que quede. */
  function elegir(j: Juego, n: number) {
    j.avanzar(240);
    j.tecla(`Digit${n}`, String(n));
    j.avanzar(5);
    j.pasarDialogos();
  }
  const empezar = () => {
    const j = jugar('historia');
    j.avanzar(5);
    j.pasarDialogos(); // el texto del principio
    expect(j.juego.escena.enDialogo).toBe(false);
    return j;
  };

  it('la historia entera: Ana pide ayuda, el robot quiere una poción, el gato aparece y vuelve con Ana', () => {
    const j = empezar();
    expect(dato(j, 'mision')).toBe(0);
    hablarCon(j, 'Ana');
    elegir(j, 1);
    expect(dato(j, 'mision')).toBe(1);
    // El gato aún no dice dónde está el robot: sin poción, el robot no se acuerda
    hablarCon(j, 'Robot');
    j.pasarDialogos();
    expect(dato(j, 'pista')).toBe(false);
    expect(dato(j, 'objetivo')).toContain('pocion');
    const pocion = j.buscar('Pocion').posicion;
    llevar(j, 'Jugador', pocion.x, pocion.y);
    j.avanzar(3);
    j.pasarDialogos();
    expect(dato(j, 'pocion')).toBe(true);
    expect(cuantos(j, 'Pocion')).toBe(0);
    hablarCon(j, 'Robot');
    elegir(j, 1);
    expect(dato(j, 'pista')).toBe(true);
    expect(dato(j, 'pocion')).toBe(false);
    hablarCon(j, 'Gato');
    j.pasarDialogos();
    expect(dato(j, 'mision')).toBe(2);
    // El gato sigue al jugador hasta Ana
    const ana = j.buscar('Ana').posicion;
    llevar(j, 'Jugador', ana.x + 50, ana.y);
    j.avanzar(60 * 8);
    expect(Math.hypot(j.buscar('Gato').posicion.x - (ana.x + 50), j.buscar('Gato').posicion.y - ana.y)).toBeLessThan(70);
    j.tecla('Space', ' ');
    j.avanzar(3);
    expect(j.juego.escena.enDialogo).toBe(true);
    j.pasarDialogos();
    expect(dato(j, 'mision')).toBe(3);
    j.sinErrores();
  });

  it('se puede decir que no (y luego que sí), y quedarse la poción', () => {
    const j = empezar();
    hablarCon(j, 'Ana');
    elegir(j, 2);
    expect(dato(j, 'mision')).toBe(0);
    // El gato, sin misión, solo maúlla
    hablarCon(j, 'Gato');
    j.pasarDialogos();
    expect(dato(j, 'mision')).toBe(0);
    hablarCon(j, 'Ana');
    elegir(j, 1);
    const pocion = j.buscar('Pocion').posicion;
    llevar(j, 'Jugador', pocion.x, pocion.y);
    j.avanzar(3);
    j.pasarDialogos();
    hablarCon(j, 'Robot');
    elegir(j, 2);
    expect(dato(j, 'pocion')).toBe(true);
    expect(dato(j, 'pista')).toBe(false);
    j.sinErrores();
  });

  it('lejos de todos, espacio no hace nada; y cerrar un diálogo con espacio no lo vuelve a abrir', () => {
    const j = empezar();
    j.tecla('Space', ' ');
    j.avanzar(3);
    expect(j.juego.escena.enDialogo).toBe(false);
    hablarCon(j, 'Robot');
    j.avanzar(200);
    j.tecla('Space', ' ');
    j.avanzar(10);
    expect(j.juego.escena.enDialogo).toBe(false);
    j.sinErrores();
  });

  it('el lago no se atraviesa', () => {
    const j = empezar();
    const jugador = j.buscar('Jugador');
    mantener(j, 'ArrowRight', 400);
    // El lago (columna 12 en adelante en esa fila) lo para
    expect(jugador.posicion.x).toBeLessThan(13 * 48);
    j.sinErrores();
  });
});
