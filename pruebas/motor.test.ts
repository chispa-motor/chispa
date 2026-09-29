/**
 * TESTS DE CHISPA DENTRO DEL MOTOR: eventos, hilos con esperar(), teclado,
 * coordenadas con la Y hacia arriba, física, crear/destruir, sonido...
 * Usan un motor de mentira donde los fotogramas se avanzan a mano.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba, unObjeto } from './ayudantes';
import { Camara } from '../src/objetos/Camara';
import { Vector2 } from '../src/motor/Vector2';
import { ErrorChispa } from '../src/chispa/errores/ErrorChispa';

describe('Eventos', () => {
  it('cuando empieza se ejecuta una sola vez', () => {
    const j = unObjeto('cuando empieza:\n    mostrar("hola")');
    j.avanzar(10);
    expect(j.salida).toEqual(['hola']);
  });

  it('esperar() pausa solo ese evento, sin congelar el resto', () => {
    const j = unObjeto('cuando empieza:\n    mostrar("a")\n    esperar(0.5)\n    mostrar("b")\ncuando cada fotograma:\n    yo.x += 1');
    j.avanzar(15); // 0.25 s
    expect(j.salida).toEqual(['a']);
    expect(j.buscar('Prueba').posicion.x).toBe(115); // el otro evento sigue funcionando
    j.avanzar(20); // 0.58 s
    expect(j.salida).toEqual(['a', 'b']);
  });

  it('un "cada fotograma" con esperar no se acumula', () => {
    const j = unObjeto('variable n = 0\ncuando cada fotograma:\n    n += 1\n    esperar(1)\ncuando cada 2 segundos:\n    mostrar(n)');
    j.avanzar(121); // un poco más de 2 s
    // Solo han empezado 2 vueltas (en 0 s y en 1 s). Si se acumularan, n valdría ~120.
    expect(j.salida).toEqual(['2']);
  });

  it('cuando se pulsa una tecla', () => {
    const j = unObjeto('cuando se pulsa "espacio", "w":\n    mostrar("salto")');
    j.pulsar('Space');
    j.avanzar();
    j.soltar('Space');
    j.pulsar('KeyW', 'w');
    j.avanzar();
    j.avanzar(5);
    expect(j.salida).toEqual(['salto', 'salto']);
  });

  it('una tecla con nombre mal escrito da error al empezar', () => {
    expect(() => unObjeto('cuando se pulsa "espaico":\n    mostrar(1)')).toThrow(/No conozco ninguna tecla llamada "espaico"/i);
  });
});

describe('Coordenadas: la Y crece hacia arriba', () => {
  it('subir es sumar a la Y', () => {
    const j = unObjeto('cuando cada fotograma:\n    si teclado.pulsada("arriba"):\n        yo.y += 10');
    j.pulsar('ArrowUp');
    j.avanzar(3);
    expect(j.buscar('Prueba').posicion.y).toBe(130);
  });

  it('la cámara convierte mundo (Y arriba) ↔ pantalla (Y abajo)', () => {
    const c = new Camara(960, 540);
    expect(c.mundoAPantalla(0, 0)).toEqual(new Vector2(0, 540)); // (0,0) = esquina inferior izquierda
    expect(c.mundoAPantalla(100, 500)).toEqual(new Vector2(100, 40));
    expect(c.pantallaAMundo(new Vector2(0, 540))).toEqual(new Vector2(0, 0));
  });

  it('la gravedad hace caer (la Y baja) y el suelo para al objeto', () => {
    const j = juegoDePrueba({
      scripts: { 'caja.chs': 'cuando toco Suelo:\n    mostrar("aterriza")' },
      escena: [
        { nombre: 'Suelo', x: 480, y: 20, sprite: { ancho: 960, alto: 40 }, colision: {} },
        { nombre: 'Caja', x: 480, y: 300, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: {}, script: 'caja.chs' },
      ],
    });
    j.avanzar(10);
    expect(j.buscar('Caja').posicion.y).toBeLessThan(300);
    j.avanzar(120);
    // Encima del suelo: suelo llega hasta y = 40, la caja mide 40 → su centro queda en y = 60
    expect(j.buscar('Caja').posicion.y).toBeCloseTo(60, 5);
    expect(j.salida).toEqual(['aterriza']);
  });

  it('yo.saltar() hace subir (velocidad positiva)', () => {
    const j = juegoDePrueba({
      scripts: { 'caja.chs': 'cuando se pulsa "espacio":\n    yo.saltar(600)\n    mostrar(yo.velocidad.y)' },
      escena: [
        { nombre: 'Suelo', x: 480, y: 20, sprite: { ancho: 960, alto: 40 }, colision: {} },
        { nombre: 'Caja', x: 480, y: 60, sprite: { ancho: 40, alto: 40 }, colision: {}, fisica: {}, script: 'caja.chs' },
      ],
    });
    j.avanzar(5);
    j.pulsar('Space');
    j.avanzar(10);
    expect(j.salida).toEqual(['600']);
    expect(j.buscar('Caja').posicion.y).toBeGreaterThan(80);
  });
});

describe('Objetos, datos compartidos y sonido', () => {
  it('crear() desde una plantilla y destruir()', () => {
    const j = juegoDePrueba({
      scripts: { 'fabrica.chs': 'cuando empieza:\n    variable b = crear("Bola", 50, 70)\n    mostrar(b.nombre, b.x, b.y)\n    destruir(b)' },
      plantillas: { Bola: { sprite: { forma: 'circulo', ancho: 10, alto: 10 } } },
      escena: [{ nombre: 'Fabrica', script: 'fabrica.chs' }],
    });
    j.avanzar();
    expect(j.salida).toEqual(['Bola 50 70']);
    expect(j.juego.escena.buscar('Bola')).toBeNull();
  });

  it('juego guarda datos compartidos entre scripts', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando empieza:\n    juego.puntos = 10', 'b.chs': 'cuando cada fotograma:\n    juego.puntos += 1' },
      escena: [
        { nombre: 'A', script: 'a.chs' },
        { nombre: 'B', script: 'b.chs' },
      ],
    });
    j.avanzar(5);
    expect(j.juego.escena.buscar('A')).not.toBeNull(); // B suma sobre lo que guardó A sin errores
    const j2 = juegoDePrueba({
      scripts: { 'lee.chs': 'cuando cada 1 segundos:\n    mostrar(juego.puntos)', 'escribe.chs': 'cuando empieza:\n    juego.puntos = 7' },
      escena: [
        { nombre: 'Lee', script: 'lee.chs' },
        { nombre: 'Escribe', script: 'escribe.chs' },
      ],
    });
    j2.avanzar(61);
    expect(j2.salida).toEqual(['7']);
  });

  it('sonido.tono() funciona sin archivos', () => {
    const j = unObjeto('cuando empieza:\n    sonido.tono(440, 0.1)');
    expect(j.motor.sonido.historial).toEqual(['tono 440 0.1']);
  });

  it('los módulos se escriben con o sin tildes (escena.cámara)', () => {
    const j = unObjeto('cuando empieza:\n    escena.cámara.x = 123\n    mostrar(escena.camara.x)');
    expect(j.salida).toEqual(['123']);
  });

  it('un error en un script dice el archivo, la línea y el código', () => {
    const j = unObjeto('cuando cada fotograma:\n    yo.vida = yo.vidda - 1');
    j.avanzar();
    expect(j.errores).toHaveLength(1);
    const e = j.errores[0].error;
    expect(e).toBeInstanceOf(ErrorChispa);
    expect(e.ubicacion.archivo).toBe('prueba.chs');
    expect(e.linea).toBe(2);
    expect(e.ubicacion.codigo).toBe('    yo.vida = yo.vidda - 1');
    expect(e.message).toMatch(/no tiene nada llamado 'vidda'/);
  });
});

describe('Ejemplo mínimo', () => {
  it('compila y funciona 6 segundos sin errores', async () => {
    const { proyectoMinimo } = await import('../src/ejemplos/minimo/proyecto');
    const j = juegoDePrueba({ scripts: proyectoMinimo.scripts, escena: proyectoMinimo.escena });
    j.pulsar('ArrowUp');
    j.avanzar(60);
    j.soltar('ArrowUp');
    j.pulsar('Space');
    j.avanzar(310);
    const cuadrado = j.buscar('Cuadrado');
    expect(cuadrado.posicion.y).toBeGreaterThan(270); // la flecha arriba sube (Y hacia arriba)
    expect(j.salida[1]).toBe('nombre: Cuadrado'); // la tabla se recorre en orden
    expect(j.salida).toContain('Llevo 5 segundos funcionando');
  });
});
