/**
 * LO QUE FALTABA EN EL MOTOR (encontrado haciendo la Arena de Habilidades).
 * Cada cosa de FALTABA_EN_EL_MOTOR.md tiene aquí su test.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba, mostrado } from './ayudantes';
import { proyectoVacio } from '../src/proyecto/formato';
import { revisarProyecto, revisarScript } from '../src/proyecto/Revision';
import { compilar } from '../src/chispa/sintaxis/parser';
import { ErrorCompilacion } from '../src/chispa/errores/ErrorChispa';
import { Fisica } from '../src/objetos/componentes/Fisica';
import { Comportamiento } from '../src/objetos/componentes/Comportamiento';
import { normalizar } from '../src/utilidades/texto';
import { ObjetoJuego } from '../src/objetos/ObjetoJuego';
import { Sprite } from '../src/objetos/componentes/Sprite';
import type { Renderizador } from '../src/motor/Renderizador';

describe('Scripts de funciones (bibliotecas)', () => {
  const conBiblioteca = (extra: Record<string, string> = {}) =>
    juegoDePrueba({
      scripts: {
        'danos.chs': 'variable golpes = 0\nfuncion herir(quien, cantidad):\n    golpes += 1\n    quien.vida -= cantidad\n    devolver golpes',
        'a.chs': 'cuando empieza:\n    mostrar(herir(yo, 3), yo.vida)\n    mostrar(herir(buscar("B"), 5))',
        ...extra,
      },
      escena: [{ nombre: 'A', script: 'a.chs', propiedades: { vida: 10 } }, { nombre: 'B', propiedades: { vida: 10 } }],
    });

  it('las funciones de un script que no es de ningún objeto se usan desde todos; sus variables son suyas', () => {
    const j = conBiblioteca();
    j.avanzar(1);
    expect(j.salida).toEqual(['1 7', '2']);
    expect(j.errores).toEqual([]);
  });

  it('un error dentro de la función sale en el archivo de la biblioteca', () => {
    const j = conBiblioteca({ 'a.chs': 'cuando empieza:\n    herir(yo, "mucho")' });
    j.avanzar(1);
    expect(j.errores[0].error.ubicacion.archivo).toBe('danos.chs');
    expect(j.errores[0].error.ubicacion.linea).toBe(4);
  });

  it('avisos y errores: yo no existe, órdenes sueltas, scripts sin objeto, nombres repetidos', () => {
    const p = proyectoVacio();
    p.escenas.Principal.objetos.push({ nombre: 'A', script: 'a.chs' });
    p.scripts['a.chs'] = 'cuando empieza:\n    mostrar(doble(2))';
    p.scripts['lib.chs'] = 'funcion doble(n):\n    devolver n * 2\nfuncion crear(x):\n    devolver x\nmostrar(1)';
    p.scripts['suelto.chs'] = 'cuando empieza:\n    yo.x = 1';
    p.scripts['lib2.chs'] = 'funcion doble(n):\n    devolver yo.x';
    const r = revisarProyecto(p);
    const mensajes = [...r.porArchivo.values()].flat().map((d) => `${d.gravedad} ${d.archivo}:${d.pos.linea} ${d.mensaje}`);
    expect(mensajes).toContain("error lib.chs:3 ya hay una función del motor que se llama 'crear'.");
    expect(mensajes).toContain('aviso lib.chs:5 en un script de funciones esto no se ejecuta: solo cuentan las funciones y las variables.');
    // Un script con «cuando» sin objeto no es de funciones: puede usar yo, pero se avisa de que no se ejecuta
    expect(mensajes).toContain('aviso suelto.chs:1 este script no está puesto en ningún objeto, así que no se ejecuta.');
    expect(mensajes.filter((m) => m.startsWith('error suelto.chs'))).toEqual([]);
    expect(mensajes).toContain("error lib2.chs:1 la función 'doble' ya está en el script de funciones lib.chs.");
    expect(mensajes.some((m) => m.startsWith("error lib2.chs:2 'yo' solo existe"))).toBe(true);
    // Mientras se escribe, el editor también conoce las funciones de las bibliotecas
    expect(revisarScript('a.chs', p.scripts['a.chs'], p).filter((d) => d.gravedad === 'error')).toEqual([]);
  });
});

describe('aLaVez', () => {
  it('la función empieza ya pero por su cuenta: el que la llama sigue sin esperar', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'funcion cuenta(n):\n    repetir n veces:\n        mostrar("tic")\n        esperar(0.1)\n\ncuando empieza:\n    aLaVez(cuenta, 2)\n    mostrar("sigo")' },
      escena: [{ nombre: 'A', script: 'a.chs' }],
    });
    j.avanzar(1);
    expect(j.salida).toEqual(['tic', 'sigo']);
    j.avanzar(12);
    expect(j.salida).toEqual(['tic', 'sigo', 'tic']);
  });

  it('error claro si se le pasa la llamada en vez de la función', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'funcion f():\n    devolver 1\ncuando empieza:\n    aLaVez(f())' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.mensajeCorto).toContain('sin paréntesis');
  });
});

describe('rango', () => {
  it('cuenta hacia delante, hacia atrás y con paso', () => {
    expect(mostrado('mostrar(rango(1, 4))\nmostrar(rango(3, 1))\nmostrar(rango(0, 10, 5))')).toBe('[1, 2, 3, 4] | [3, 2, 1] | [0, 5, 10]');
    expect(mostrado('variable s = 0\npara cada i en rango(1, 100):\n    s += i\nmostrar(s)')).toBe('5050');
  });
});

describe('atravesar', () => {
  it('no choca con lo que atraviesa (sí con lo demás) y sigue avisando con cuando toco', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'bala.chs': 'cuando empieza:\n    yo.atravesar("enemigo")\ncuando toco enemigo:\n    mostrar("toco", otro.nombre)' },
      escena: [
        { nombre: 'Bala', x: 100, y: 100, sprite: { ancho: 10, alto: 10 }, colision: {}, fisica: { gravedad: 0, rozamiento: 0 }, script: 'bala.chs' },
        { nombre: 'Malo', x: 160, y: 100, sprite: { ancho: 20, alto: 20 }, colision: {}, fisica: { gravedad: 0, rozamiento: 0, masa: 100 } },
        { nombre: 'Pared', x: 300, y: 100, sprite: { ancho: 20, alto: 200 }, colision: {} },
      ],
      plantillas: {},
    });
    j.buscar('Malo').etiquetas.set('enemigo', 'enemigo');
    j.buscar('Bala').obtener(Fisica)!.velocidad.x = 300;
    j.avanzar(60);
    expect(j.salida).toEqual(['toco Malo']);
    expect(j.buscar('Malo').posicion.x).toBe(160); // no lo ha empujado
    expect(j.buscar('Bala').posicion.x).toBeCloseTo(285, 0); // la pared sí la para
  });
});

describe('dibujar.arco y dibujar.enPantalla', () => {
  it('se apuntan para dibujarse (en el mundo o fijos) y se borran en el fotograma siguiente', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando empieza:\n    dibujar.arco(10, 20, 30, 90, 270, "rojo", verdadero)\n    dibujar.enPantalla.rectangulo(100, 700, 200, 16, "verde", verdadero)' },
      escena: [{ nombre: 'A', script: 'a.chs' }],
    });
    expect(j.juego.escena.dibujos).toEqual([
      { tipo: 'arco', x: 10, y: 20, radio: 30, desde: 90, hasta: 270, color: 'rojo', relleno: true, grosor: 3 },
      { tipo: 'rectangulo', x: 100, y: 700, ancho: 200, alto: 16, color: 'verde', relleno: true, fijo: true },
    ]);
    j.avanzar(1);
    expect(j.juego.escena.dibujos).toEqual([]);
  });
});

describe('sonido.efecto', () => {
  it('efectos generados por nombre, y sugerencia si no existe', () => {
    const j = juegoDePrueba({ scripts: { 'a.chs': 'cuando empieza:\n    sonido.efecto("Explosion")\n    sonido.efecto("explocion")' }, escena: [{ nombre: 'A', script: 'a.chs' }] });
    j.avanzar(1);
    expect(j.juego.motor.sonido.historial).toContain('efecto explosion');
    expect(j.errores[0].error.pista).toContain('¿Querías decir "explosion"?');
  });
});

describe('Órdenes en la consola mientras se juega', () => {
  const juego = () =>
    juegoDePrueba({
      scripts: { 'a.chs': 'funcion curar(n):\n    yo.vida += n\n    devolver yo.vida\nfuncion lento():\n    esperar(1)' },
      escena: [{ nombre: 'A', x: 5, script: 'a.chs', propiedades: { vida: 10 } }],
    });

  it('cambian datos, llaman a funciones de los objetos y enseñan valores', () => {
    const j = juego();
    j.avanzar(1);
    expect(j.juego.ejecutarOrden('juego.vidas = 3')).toBeNull();
    expect(j.juego.ejecutarOrden('juego.vidas')).toBe('3');
    expect(j.juego.ejecutarOrden('buscar("A").curar(5)')).toBe('15');
    expect(j.juego.ejecutarOrden('buscar("A")')).toBe("el objeto 'A'");
    expect(j.juego.ejecutarOrden('mostrar(buscar("A").x + 1)')).toBeNull();
    expect(j.salida).toEqual(['6']);
  });

  it('errores claros: mal escrita, con cuando, o con esperar', () => {
    const j = juego();
    j.avanzar(1);
    expect(() => j.juego.ejecutarOrden('mostar(1)')).toThrow(ErrorCompilacion);
    expect(() => j.juego.ejecutarOrden('cuando empieza:\n    mostrar(1)')).toThrow(/una orden no puede tener 'cuando'/);
    expect(() => j.juego.ejecutarOrden('buscar("A").lento()')).toThrow(/no se puede esperar/);
  });
});

describe('Arreglos del motor', () => {
  it('un texto con \\n se dibuja en varias líneas, y la escala agranda la letra', () => {
    const o = new ObjetoJuego('T');
    const s = o.agregar(new Sprite());
    Object.assign(s, { forma: 'texto', texto: 'PAUSA\nSeguir', tamano: 20 });
    o.transformacion.escala.x = o.transformacion.escala.y = 2;
    const llamadas: [string, number, number][] = [];
    const r = { ctx: { globalAlpha: 1 }, texto: (t: string, _x: number, y: number, e: { tamano: number }) => llamadas.push([t, y, e.tamano]) };
    s.dibujarEn(r as unknown as Renderizador, 100, 100);
    expect(llamadas).toEqual([['PAUSA', 75, 40], ['Seguir', 125, 40]]);
  });

  it('and / or de otros lenguajes: la pista dice cómo se escribe en Chispa', () => {
    const pista = (codigo: string) => {
      try {
        compilar(codigo, 'x.chs');
      } catch (e) {
        return (e as ErrorCompilacion).errores[0].pista;
      }
      return '';
    };
    expect(pista('si 1 < 2 and 2 < 3:\n    mostrar(1)')).toContain("aquí se escribe 'y'");
    expect(pista('variable a = verdadero or falso')).toContain("aquí se escribe 'o'");
  });

  it('una propiedad propia parecida a una del motor (bala.rebotes ~ rebote) no es un error de escritura', () => {
    const p = proyectoVacio();
    p.plantillas.Bala = { nombre: 'Bala', propiedades: { rebotes: 3 }, script: 'b.chs' };
    p.scripts['b.chs'] = 'cuando empieza:\n    yo.rebotes -= 1';
    expect(revisarProyecto(p).errores).toEqual([]);
    // Pero yo.rebotes sin definirla en ningún sitio sí se avisa (seguramente es yo.rebote)
    delete p.plantillas.Bala.propiedades;
    expect(revisarProyecto(p).errores[0].pista).toBe("¿Querías decir 'rebote'?");
  });

  it('irHacia en cada fotograma con el mismo destino no vuelve a buscar el camino', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'a.chs': 'cuando cada fotograma:\n    yo.irHacia(buscar("Meta"), 100)' },
      escena: [{ nombre: 'A', x: 0, y: 0, script: 'a.chs' }, { nombre: 'Meta', x: 500, y: 0 }],
    });
    j.avanzar(1);
    const c = j.buscar('A').obtener(Comportamiento)!;
    let veces = 0;
    (c as unknown as { calcularCamino: () => boolean }).calcularCamino = () => (veces++, true);
    j.avanzar(10);
    expect(veces).toBe(0);
    expect(j.buscar('A').posicion.x).toBeGreaterThan(10);
  });

  it('normalizar recuerda resultados pero da siempre lo mismo', () => {
    expect(normalizar('  Canción ')).toBe('cancion');
    expect(normalizar('  Canción ')).toBe('cancion');
    expect(normalizar('Año')).toBe('año');
  });

  it('moverConFlechas usa la palanca del mando (poco inclinada = despacio)', () => {
    const j = juegoDePrueba({
      gravedad: 0,
      scripts: { 'a.chs': 'cuando cada fotograma:\n    yo.moverConFlechas(200)' },
      escena: [{ nombre: 'A', sprite: { ancho: 10, alto: 10 }, fisica: { gravedad: 0, rozamiento: 0 }, script: 'a.chs' }],
    });
    j.juego.motor.entrada.ponerMando(true, new Set(), 0.5, 0);
    j.avanzar(1);
    expect(j.buscar('A').obtener(Fisica)!.velocidad.x).toBeCloseTo(100, 0);
  });
});
