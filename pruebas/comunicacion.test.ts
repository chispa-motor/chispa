/**
 * COMUNICACIÓN ENTRE OBJETOS (noche, bloque 3): mensajes (enviar / cuando recibo),
 * datos compartidos (juego) y llamar a las funciones de otro objeto.
 */
import { describe, expect, it } from 'vitest';
import { juegoDePrueba } from './ayudantes';
import { Depurador, type Parada } from '../src/chispa/ejecucion/depurador';
import { compilar } from '../src/chispa/sintaxis/parser';
import { ErrorChispa, ErrorCompilacion } from '../src/chispa/errores/ErrorChispa';
import { revisarProyecto, revisarScript } from '../src/proyecto/Revision';
import { leerDatoInicial, proyectoVacio } from '../src/proyecto/formato';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';

const PUERTA = [
  'funcion abrir():', //                                  1
  '    yo.abierta = verdadero', //                        2
  '    mostrar(yo.nombre, "se abre")', //                 3
  '    devolver "hecho"', //                              4
  'cuando recibo "abrir_puerta":', //                     5
  '    mostrar("recibido por", yo.nombre, dato)', //      6
].join('\n');

function conPuerta(llave: string, extra: Record<string, string> = {}) {
  return juegoDePrueba({
    scripts: { 'puerta.chs': PUERTA, 'llave.chs': llave, ...extra },
    escena: [
      { nombre: 'Puerta', script: 'puerta.chs', propiedades: { abierta: false } },
      { nombre: 'Llave', script: 'llave.chs' },
    ],
  });
}

describe('Mensajes', () => {
  it('enviar llega a todos los que lo reciben, al empezar el siguiente fotograma, con su dato', () => {
    const j = juegoDePrueba({
      scripts: { 'puerta.chs': PUERTA, 'llave.chs': 'cuando se pulsa "espacio":\n    enviar("Abrir_Puerta", 7)\n    mostrar("enviado")' },
      escena: [
        { nombre: 'Puerta', script: 'puerta.chs' },
        { nombre: 'Puerta2', script: 'puerta.chs' },
        { nombre: 'Llave', script: 'llave.chs' },
      ],
    });
    j.pulsar('Space');
    j.avanzar(1);
    expect(j.salida).toEqual(['enviado']); // todavía no ha llegado
    j.avanzar(1);
    expect(j.salida.slice(1).sort()).toEqual(['recibido por Puerta 7', 'recibido por Puerta2 7']);
  });

  it('sin dato, dato es nulo; y responder a un mensaje no se queda en un bucle infinito', () => {
    const j = juegoDePrueba({
      scripts: {
        'a.chs': 'cuando empieza:\n    enviar("ping")\ncuando recibo "pong":\n    mostrar("pong", dato)\n    enviar("ping")',
        'b.chs': 'cuando recibo ping:\n    mostrar("ping", dato)\n    enviar("pong")',
      },
      escena: [{ nombre: 'A', script: 'a.chs' }, { nombre: 'B', script: 'b.chs' }],
    });
    j.avanzar(4);
    // Un mensaje por fotograma: ping, pong, ping, pong... sin colgar el juego
    expect(j.salida).toEqual(['ping nulo', 'pong nulo', 'ping nulo', 'pong nulo']);
  });

  it('un objeto creado o destruido entre medias no rompe nada', () => {
    const j = juegoDePrueba({
      scripts: { 'e.chs': 'cuando recibo "boom":\n    destruir(yo)', 'j.chs': 'cuando empieza:\n    enviar("boom")' },
      escena: [{ nombre: 'E1', script: 'e.chs' }, { nombre: 'E2', script: 'e.chs' }, { nombre: 'J', script: 'j.chs' }],
    });
    j.avanzar(3);
    expect(j.juego.escena.objetos.map((o) => o.nombre)).toEqual(['J']);
    expect(j.errores).toEqual([]);
  });

  it('el mensaje tiene que ser un texto, y un «cuando recibo» sin nombre explica qué falta', () => {
    const j = juegoDePrueba({ scripts: { 'l.chs': 'cuando empieza:\n    enviar(3)' }, escena: [{ nombre: 'L', script: 'l.chs' }] });
    j.avanzar(1);
    expect(j.errores[0].error.mensajeCorto).toContain('enviar');
    expect(() => compilar('cuando recibo:\n    mostrar(1)', 'x.chs')).toThrow(/nombre del mensaje/);
    // Otras palabras que se le ocurren a un principiante llevan a la buena
    try {
      compilar('cuando llega "abrir":\n    mostrar(1)', 'x.chs');
      expect.unreachable();
    } catch (e) {
      expect(String((e as ErrorCompilacion).errores[0].pista)).toContain('cuando recibo "mensaje":');
    }
  });

  it('avisa si nadie recibe un mensaje, y sugiere el parecido', () => {
    const p = proyectoVacio();
    p.scripts['puerta.chs'] = PUERTA;
    const avisos = revisarScript('llave.chs', 'cuando empieza:\n    enviar("abrir_puera")\n    enviar("otra_cosa")', p);
    expect(avisos.map((a) => a.mensaje)).toEqual([
      'nadie recibe el mensaje "abrir_puera": ningún script tiene \'cuando recibo "abrir_puera":\'.',
      'nadie recibe el mensaje "otra_cosa": ningún script tiene \'cuando recibo "otra_cosa":\'.',
    ]);
    expect(avisos[0].pista).toBe('¿Querías decir "abrir_puerta"?');
    expect(avisos[1].pista).toContain('cuando recibo "otra_cosa":');
    expect(revisarScript('llave.chs', 'cuando empieza:\n    enviar("abrir_puerta")', p)).toEqual([]);
  });
});

describe('Llamar a las funciones de otro objeto', () => {
  it('buscar("Puerta").abrir() se ejecuta como la puerta (yo es la puerta) y devuelve su valor', () => {
    const j = conPuerta('cuando empieza:\n    mostrar(buscar("Puerta").abrir())\n    mostrar(yo.nombre)');
    j.avanzar(1);
    expect(j.salida).toEqual(['Puerta se abre', 'hecho', 'Llave']);
    expect(j.buscar('Puerta').propiedades.get('abierta')).toMatchObject({ valor: true });
  });

  it('funciona también con esperar() dentro de la función', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'funcion abrirDespacio():\n    esperar(0.1)\n    mostrar(yo.nombre)', 'l.chs': 'cuando empieza:\n    buscar("Puerta").abrirDespacio()\n    mostrar(yo.nombre)' },
      escena: [{ nombre: 'Puerta', script: 'p.chs' }, { nombre: 'Llave', script: 'l.chs' }],
    });
    j.avanzar(12);
    expect(j.salida).toEqual(['Puerta', 'Llave']);
  });

  it('un error dentro de la función sale en el archivo de la puerta', () => {
    const j = conPuerta('cuando empieza:\n    buscar("Puerta").estropear()', { 'puerta.chs': PUERTA + '\nfuncion estropear():\n    mostrar(1 + nulo)' });
    j.avanzar(1);
    const e = j.errores[0].error;
    expect(e.ubicacion.archivo).toBe('puerta.chs');
    expect(e.ubicacion.linea).toBe(8);
  });

  it('una función que no existe sugiere la parecida', () => {
    const j = conPuerta('cuando empieza:\n    buscar("Puerta").abri()');
    j.avanzar(1);
    const e = j.errores[0].error;
    expect(e.pista).toContain('abrir');
  });

  it('las variables del script de otro objeto no se leen desde fuera: explica cómo hacerlo', () => {
    const j = juegoDePrueba({
      scripts: { 'p.chs': 'variable llaves = 2', 'l.chs': 'cuando empieza:\n    mostrar(buscar("Puerta").llaves)' },
      escena: [{ nombre: 'Puerta', script: 'p.chs' }, { nombre: 'Llave', script: 'l.chs' }],
    });
    j.avanzar(1);
    const e = j.errores[0].error;
    expect(e.mensajeCorto).toContain('llaves');
    expect(e.pista).toMatch(/yo\.llaves|juego\.llaves/);
  });

  it('el depurador entra en la función del otro objeto y para en su archivo', () => {
    const d = new Depurador();
    d.ponerPuntos('llave.chs', [2]);
    const paradas: Parada[] = [];
    d.alParar = (p) => paradas.push(p);
    const j = juegoDePrueba({
      scripts: { 'puerta.chs': PUERTA, 'llave.chs': 'cuando empieza:\n    buscar("Puerta").abrir()' },
      escena: [{ nombre: 'Puerta', script: 'puerta.chs' }, { nombre: 'Llave', script: 'llave.chs' }],
      depurador: d,
    });
    j.avanzar(1);
    d.entrar();
    j.avanzar(1);
    expect(paradas.map((p) => [p.archivo, p.linea])).toEqual([['llave.chs', 2], ['puerta.chs', 2]]);
    d.continuar();
    j.avanzar(1);
    expect(j.salida).toEqual(['Puerta se abre']);
  });
});

describe('Datos del juego (juego.x)', () => {
  it('empiezan con los valores del editor, antes de cualquier script', () => {
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando empieza:\n    mostrar(juego.vidas, juego.nombre, juego.facil)\n    juego.vidas -= 1', 'b.chs': 'cuando cada fotograma:\n    mostrar("b ve", juego.vidas)' },
      escena: [{ nombre: 'A', script: 'a.chs' }, { nombre: 'B', script: 'b.chs' }],
      datos: { vidas: 3, nombre: 'Ana', facil: true },
    });
    j.avanzar(1);
    expect(j.salida).toEqual(['3 Ana verdadero', 'b ve 2']);
    expect(j.avisos).toEqual([]);
  });

  it('avisa si se lee un dato que ningún script guarda, y sugiere el parecido', () => {
    const p = proyectoVacio();
    p.scripts['a.chs'] = 'cuando empieza:\n    juego.puntos = 0';
    p.datos = { vidas: 3 };
    const avisos = revisarScript('b.chs', 'cuando cada fotograma:\n    mostrar(juego.punto, juego.vidas, juego.nivel, juego.nivel)', p);
    expect(avisos.map((a) => a.mensaje)).toEqual([
      "ningún script guarda nada en 'juego.punto', así que al leerlo el juego se parará.",
      "ningún script guarda nada en 'juego.nivel', así que al leerlo el juego se parará.",
    ]);
    expect(avisos[0].pista).toBe("¿Querías decir 'juego.puntos'?");
    expect(avisos[1].pista).toContain('Datos del juego');
    // Comparar (==) no es guardar; += sí cuenta
    p.scripts['c.chs'] = 'cuando empieza:\n    si juego.monedas == 1:\n        mostrar(1)\n    juego.nivel += 1';
    const r = revisarProyecto(p);
    expect(r.avisos.map((a) => a.mensaje).filter((m) => m.includes('monedas'))).toHaveLength(1);
    expect(r.avisos.map((a) => a.mensaje).filter((m) => m.includes('nivel'))).toHaveLength(0);
  });

  it('el depurador enseña lo que hay en juego', () => {
    const d = new Depurador();
    d.ponerPuntos('a.chs', [3]);
    const j = juegoDePrueba({
      scripts: { 'a.chs': 'cuando empieza:\n    juego.puntos = 5\n    mostrar(1)' },
      escena: [{ nombre: 'A', script: 'a.chs' }],
      datos: { vidas: 3 },
      depurador: d,
    });
    j.avanzar(1);
    const v = d.variables(j.juego.interprete.globales).filter((x) => x.grupo === 'juego');
    expect(v.map((x) => `${x.nombre}=${x.valor}`)).toEqual(['juego.vidas=3', 'juego.puntos=5']);
  });

  it('en el editor: se añaden, se cambian y se quitan con deshacer; el valor escrito se entiende', () => {
    expect([leerDatoInicial('3'), leerDatoInicial('2,5'), leerDatoInicial('verdadero'), leerDatoInicial('"hola"'), leerDatoInicial('Ana'), leerDatoInicial('')]).toEqual([3, 2.5, true, 'hola', 'Ana', '']);
    const e = new EstadoEditor();
    e.cambiarDatoJuego('vidas', 3);
    e.cambiarDatoJuego('nivel', 1);
    e.cambiarDatoJuego('vidas', undefined);
    expect(e.proyecto.datos).toEqual({ nivel: 1 });
    e.deshacer();
    expect(e.proyecto.datos).toEqual({ vidas: 3, nivel: 1 });
  });
});

it('los errores de este bloque son ErrorChispa con pista', () => {
  const j = conPuerta('cuando empieza:\n    variable p = buscar("Nadie")\n    p.abrir()');
  j.avanzar(1);
  expect(j.errores[0].error).toBeInstanceOf(ErrorChispa);
  expect(j.errores[0].error.pista).toBeTruthy();
});
