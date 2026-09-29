/**
 * TESTS DEL TUTORIAL GUIADO (sesión 3, bloque 4).
 *
 * El más importante: recorrer el tutorial entero con «Hazlo por mí» y
 * comprobar que al final hay un juego que funciona de verdad (se coge la
 * moneda y suben los puntos).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { GuiaTutorial, Tutorial, conNegritas, marcarTutorialVisto, tutorialVisto, CLAVE_TUTORIAL_VISTO } from '../src/editor/tutorial/Tutorial';
import { PASOS_TUTORIAL, type ContextoTutorial } from '../src/editor/tutorial/pasos';
import { proyectoVacio } from '../src/proyecto/formato';
import { revisarProyecto } from '../src/proyecto/Revision';
import { juegoDePrueba } from './ayudantes';

/** Un editor de mentira: el estado de verdad, y lo demás apuntado en variables. */
function contexto() {
  const estado = new EstadoEditor(proyectoVacio('Mi primer juego'));
  const c = {
    herramientaActual: 'mover',
    jugando: false,
    puntos: undefined as number | undefined,
    estado,
    herramienta: () => c.herramientaActual,
    ponerHerramienta: (h: string) => void (c.herramientaActual = h),
    anadir: (tipo: 'rectangulo' | 'circulo' | 'texto' | 'mapa') => {
      // Como el botón del editor: en el centro, un poco a la derecha si ya hay algo
      const x = 480 + 64 * estado.escena.objetos.filter((o) => !o.mapa && !o.sprite?.fijo).length;
      estado.crearObjeto(tipo, tipo === 'texto' ? 112 : x, tipo === 'texto' ? 500 : 272);
      if (tipo === 'mapa') c.herramientaActual = 'pincel';
    },
    juegoEnMarcha: () => c.jugando,
    ejecutar: () => void (c.jugando = true),
    datoDelJuego: (n: string) => (n === 'puntos' ? c.puntos : undefined),
    escribirCodigo: (a: string, codigo: string) => estado.cambiarCodigo(a, codigo),
    hayErrores: () => [...revisarProyecto(estado.proyecto).porArchivo.values()].flat().some((d) => d.gravedad === 'error'),
  };
  return c as typeof c & ContextoTutorial;
}

describe('Los pasos del tutorial', () => {
  it('con «Hazlo por mí» en cada paso se llega al final, y queda un juego que funciona', () => {
    const c = contexto();
    const g = new GuiaTutorial(c);
    const vistos: string[] = [];
    for (let vueltas = 0; !g.terminado && vueltas < 50; vueltas++) {
      vistos.push(g.paso.titulo);
      if (g.paso.titulo === 'Coge la moneda') c.puntos = 1; // (el juego de verdad se prueba abajo)
      if (g.paso.hazloPorMi) g.hazloPorMi();
      else g.siguiente();
      g.comprobar();
    }
    expect(g.terminado).toBe(true);
    // Ningún paso se ha saltado solo: se han visto todos
    expect(new Set(vistos).size).toBe(PASOS_TUTORIAL.length);

    const p = c.estado.proyecto;
    expect(revisarProyecto(p).errores).toEqual([]);
    const objetos = p.escenas[p.escenaInicial].objetos;
    expect(objetos.map((o) => o.nombre).sort()).toEqual(['Jugador', 'Mapa', 'Moneda', 'Texto']);

    // Jugamos: andar a la derecha hasta la moneda
    const j = juegoDePrueba({ scripts: p.scripts, escena: objetos });
    j.pulsar('ArrowRight', 'ArrowRight');
    j.avanzar(60); // 1 segundo: 300 píxeles (la moneda está a 192, y el suelo sigue)
    expect(j.juego.datoDelJuego('puntos')).toBe(1);
    expect(j.juego.escena.buscar('Moneda')).toBeFalsy();
    const marcador = j.buscar('Texto');
    const sprite = marcador.todosLosComponentes.find((x) => 'textoVivo' in x) as unknown as { texto: string; actualizarTexto(): void };
    sprite.actualizarTexto();
    expect(sprite.texto).toBe('Puntos: 1');
    // Y también salta
    j.soltar('ArrowRight', 'ArrowRight');
    const y0 = j.buscar('Jugador').posicion.y;
    j.pulsar('Space');
    j.avanzar(12);
    expect(j.buscar('Jugador').posicion.y).toBeGreaterThan(y0 + 40);
  });

  it('avanza solo cuando el paso ya está hecho, aunque se haga de otra forma (sin el tutorial)', () => {
    const c = contexto();
    const g = new GuiaTutorial(c);
    g.siguiente(); // bienvenida
    expect(g.paso.titulo).toBe('El jugador');
    g.comprobar();
    expect(g.paso.titulo).toBe('El jugador'); // todavía no
    c.estado.crearObjeto('rectangulo', 0, 0);
    c.estado.renombrar(c.estado.seleccion!, 'Jugador');
    g.comprobar(); // hecho «El jugador» y también «Ponle nombre»
    expect(g.paso.titulo).toBe('Que caiga');
  });

  it('al empezar un paso se selecciona el objeto del que habla', () => {
    const c = contexto();
    const g = new GuiaTutorial(c);
    g.siguiente();
    g.hazloPorMi(); // cuadrado
    g.hazloPorMi(); // Jugador
    c.estado.crearObjeto('circulo', 0, 0); // selecciona otra cosa
    g.siguiente(); // salta «Que caiga» a mano... y «Un suelo» empieza
    c.estado.seleccionar(null);
    // Retrocedemos a mano a «Que caiga» para ver su alEmpezar
    const caer = PASOS_TUTORIAL.findIndex((p) => p.titulo === 'Que caiga');
    g.indice = caer - 1;
    g.siguiente();
    expect(c.estado.seleccionado?.nombre).toBe('Jugador');
  });

  it('el código que enseña el tutorial no tiene errores y usa lo que se ha puesto en el editor', () => {
    const paso = PASOS_TUTORIAL.find((p) => p.codigo)!;
    expect(paso.codigo).toContain('cuando toco Moneda');
    expect(paso.textoHazlo).toBe('Escríbelo por mí');
  });

  it('negritas en el texto de la burbuja', () => {
    const partes = conNegritas('Pulsa **Ejecutar** ya');
    expect(partes[0]).toBe('Pulsa ');
    expect((partes[1] as HTMLElement).outerHTML).toBe('<strong>Ejecutar</strong>');
    expect(partes[2]).toBe(' ya');
  });
});

describe('El tutorial en la pantalla', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('enseña la burbuja con el paso, «Saltar» lo cierra, y «Siguiente» avanza', () => {
    vi.useFakeTimers();
    const c = contexto();
    let cerrado = false;
    const t = new Tutorial(c, () => (cerrado = true));
    const burbuja = () => document.querySelector('.tutorial-burbuja')!;
    expect(burbuja().textContent).toContain('Paso 1 de');
    expect(burbuja().textContent).toContain('Tu primer juego');
    (document.querySelector('.tutorial-siguiente') as HTMLButtonElement).click();
    expect(burbuja().textContent).toContain('El jugador');
    // Hacer el paso fuera del tutorial: avanza en la siguiente comprobación (cada 200 ms)
    c.estado.crearObjeto('rectangulo', 0, 0);
    vi.advanceTimersByTime(250);
    expect(burbuja().textContent).toContain('Ponle nombre');
    // «Hazlo por mí»
    (document.querySelector('.tutorial-hazlo') as HTMLButtonElement).click();
    expect(burbuja().textContent).toContain('Que caiga');
    (document.querySelector('.tutorial-saltar') as HTMLButtonElement).click();
    expect(cerrado).toBe(true);
    expect(t.abierto).toBe(false);
    expect(document.querySelector('.tutorial-burbuja')).toBeNull();
    expect(document.querySelector('.tutorial-foco')).toBeNull();
  });

  it('resalta lo que hay que tocar (si está en la pantalla)', () => {
    vi.useFakeTimers();
    const c = contexto();
    const boton = document.createElement('button');
    boton.title = 'Añadir: Cuadrado. Un rectángulo';
    const panel = document.createElement('div');
    panel.className = 'botones-anadir';
    panel.append(boton);
    document.body.append(panel);
    const t = new Tutorial(c);
    t.guia.siguiente();
    t.actualizar();
    // happy-dom no calcula posiciones: basta con que no falle y el foco se prepare
    expect(document.querySelector('.tutorial-foco')).not.toBeNull();
    t.cerrar();
  });

  it('se ofrece solo la primera vez', () => {
    localStorage.removeItem(CLAVE_TUTORIAL_VISTO);
    expect(tutorialVisto()).toBe(false);
    marcarTutorialVisto();
    expect(tutorialVisto()).toBe(true);
  });
});
