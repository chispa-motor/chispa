/**
 * TESTS DEL LENGUAJE (sin motor): variables, operadores, control, funciones,
 * listas y tablas. Cada test ejecuta un trozo de Chispa y comprueba lo que
 * se ha mostrado con mostrar().
 */
import { describe, expect, it } from 'vitest';
import { ejecutar, mostrado } from './ayudantes';

describe('Variables y operadores', () => {
  it('respeta la precedencia de operadores', () => {
    expect(mostrado('mostrar(2 + 3 * 4, (2 + 3) * 4, 10 / 4)')).toBe('14 20 2.5');
  });

  it('muestra los decimales redondeados (0.1 + 0.2 se ve como 0.3)', () => {
    expect(mostrado('mostrar(0.1 + 0.2)')).toBe('0.3');
  });

  it('el resto (%) siempre es positivo', () => {
    expect(mostrado('mostrar(-7 % 3, 7 % 3)')).toBe('2 1');
  });

  it('une textos con + y convierte los números', () => {
    expect(mostrado('variable n = 5\nmostrar("Tengo " + n + " monedas")')).toBe('Tengo 5 monedas');
  });

  it('los atajos += -= *= /= funcionan', () => {
    expect(mostrado('variable x = 10\nx += 5\nx -= 3\nx *= 2\nx /= 4\nmostrar(x)')).toBe('6');
  });

  it('comparaciones y operadores lógicos y / o / no', () => {
    expect(mostrado('mostrar(3 > 2 y 2 > 1, 3 < 2 o falso, no verdadero, 2 == 2, "a" != "b")')).toBe('verdadero falso falso verdadero verdadero');
  });

  it("'y' no evalúa la parte derecha si la izquierda es falsa (cortocircuito)", () => {
    // Si evaluara `e.vida` con e = nulo daría error
    expect(mostrado('variable e = nulo\nsi e != nulo y e.vida > 0:\n    mostrar("vivo")\nsino:\n    mostrar("no hay")')).toBe('no hay');
  });

  it('solo falso y nulo cuentan como falso (el 0 es verdadero)', () => {
    expect(mostrado('si 0:\n    mostrar("0 es verdadero")\nsi nulo:\n    mostrar("nunca")')).toBe('0 es verdadero');
  });

  it('tildes y mayúsculas dan igual en palabras clave y nombres', () => {
    expect(mostrado('Función Saludar(Nombre):\n    Devolver "¡Hola, " + nombre + "!"\nmostrar(saludar("Rodri"))')).toBe('¡Hola, Rodri!');
  });

  it('ignora comentarios y líneas vacías', () => {
    expect(mostrado('# comentario\n\nvariable a = 1  # otro\n\nmostrar(a)')).toBe('1');
  });
});

describe('Control de flujo', () => {
  it('si / sino si / sino', () => {
    const codigo = (v: number) => `variable v = ${v}\nsi v > 80:\n    mostrar("alta")\nsino si v > 20:\n    mostrar("media")\nsino:\n    mostrar("baja")`;
    expect(mostrado(codigo(90))).toBe('alta');
    expect(mostrado(codigo(50))).toBe('media');
    expect(mostrado(codigo(5))).toBe('baja');
  });

  it('mientras + romper', () => {
    expect(mostrado('variable i = 0\nmientras verdadero:\n    i += 1\n    si i >= 5:\n        romper\nmostrar(i)')).toBe('5');
  });

  it('continuar salta a la siguiente vuelta', () => {
    expect(mostrado('para cada n en [1, 2, 3, 4]:\n    si n % 2 == 0:\n        continuar\n    mostrar(n)')).toBe('1 | 3');
  });

  it('repetir N veces', () => {
    expect(mostrado('variable t = ""\nrepetir 3 veces:\n    t += "*"\nmostrar(t)')).toBe('***');
  });

  it('para cada recorre listas y textos (letra a letra, con ñ)', () => {
    expect(mostrado('variable s = 0\npara cada n en [1, 2, 3]:\n    s += n\nmostrar(s)\npara cada l en "ñú":\n    mostrar(l)')).toBe('6 | ñ | ú');
  });

  it('una variable creada dentro de un bloque no existe fuera', () => {
    expect(() => ejecutar('si verdadero:\n    variable dentro = 1\nmostrar(dentro)')).toThrow(/intentas usar 'dentro', pero no existe ninguna variable con ese nombre/);
  });
});

describe('Funciones', () => {
  it('devolver un valor, y nulo si no hay devolver', () => {
    expect(mostrado('funcion doble(n):\n    devolver n * 2\nfuncion nada():\n    variable x = 1\nmostrar(doble(21), nada())')).toBe('42 nulo');
  });

  it('recursión', () => {
    expect(mostrado('funcion fib(n):\n    si n < 2:\n        devolver n\n    devolver fib(n - 1) + fib(n - 2)\nmostrar(fib(15))')).toBe('610');
  });

  it('las funciones recuerdan su entorno (closures)', () => {
    const codigo = 'funcion crearContador():\n    variable n = 0\n    funcion sumar():\n        n += 1\n        devolver n\n    devolver sumar\nvariable c = crearContador()\nc()\nc()\nmostrar(c())';
    expect(mostrado(codigo)).toBe('3');
  });

  it('esperar() pausa la ejecución (el hilo se duerme)', () => {
    const r = ejecutar('mostrar("a")\nesperar(1)\nmostrar("b")');
    expect(r.salida).toEqual(['a', 'b']);
    expect(r.pausas).toBe(1);
  });

  it('funciones básicas: redondear, minimo, maximo, numero, texto', () => {
    expect(mostrado('mostrar(redondear(3.14159, 2), mínimo(4, 2, 8), maximo(4, 2, 8), numero("3,5") + 1, texto(7) + "!")')).toBe('3.14 2 8 4.5 7!');
  });
});

describe('Listas', () => {
  it('empiezan en 1; añadir, quitar y longitud', () => {
    expect(mostrado('variable l = [10, 20]\nl.añadir(30)\nl[1] = 5\nl.quitar(2)\nmostrar(l, l.longitud, l[2])')).toBe('[5, 30] 2 30');
  });

  it('se pueden escribir en varias líneas', () => {
    expect(mostrado('variable m = [\n    "ab",\n    "cd",\n]\nmostrar(m[2][1])')).toBe('c');
  });

  it('las listas se comparten; los vectores se copian', () => {
    const codigo = 'variable a = [1]\nvariable b = a\nb.añadir(2)\nvariable v = vector(1, 1)\nvariable w = v\nw.x = 99\nmostrar(a, v.x)';
    expect(mostrado(codigo)).toBe('[1, 2] 1');
  });
});

describe('Tablas', () => {
  it('se crean con {clave: valor} y se leen con punto o corchetes', () => {
    expect(mostrado('variable f = {nombre: "Ana", vida: 3}\nmostrar(f.nombre, f["vida"])')).toBe('Ana 3');
  });

  it('se pueden añadir, cambiar y quitar claves', () => {
    expect(mostrado('variable f = {vida: 3}\nf.nivel = 2\nf.vida -= 1\nf.quitar("nivel")\nmostrar(f, longitud(f))')).toBe('{vida: 2} 1');
  });

  it('las claves no distinguen tildes ni mayúsculas', () => {
    expect(mostrado('variable f = {Energía: 5}\nmostrar(f.energia, "ENERGIA" en f)')).toBe('5 verdadero');
  });

  it('para cada clave, valor recorre en el orden en que se añadieron las claves', () => {
    const codigo = [
      'variable t = {zeta: 1, alfa: 2, medio: 3}',
      't.beta = 4',
      't.alfa = 20        # cambiar un valor NO lo mueve de sitio',
      't.quitar("zeta")',
      't.zeta = 5         # quitar y volver a añadir la pone al final',
      'para cada clave, valor en t:',
      '    mostrar(clave, valor)',
    ].join('\n');
    expect(ejecutar(codigo).salida).toEqual(['alfa 20', 'medio 3', 'beta 4', 'zeta 5']);
  });

  it('el orden también se respeta en .claves, para cada con un nombre y al mostrar', () => {
    expect(mostrado('variable t = {c: 1, a: 2, b: 3}\nmostrar(t.claves)\npara cada k en t:\n    mostrar(k)\nmostrar(t)')).toBe('["c", "a", "b"] | c | a | b | {c: 1, a: 2, b: 3}');
  });

  it("el operador 'en' funciona con tablas, listas y textos", () => {
    const codigo = 'variable j = {vida: 3}\nmostrar("vida" en j, "mana" en j, 3 en [1, 2, 3], "ola" en "hola", no ("mana" en j))';
    expect(mostrado(codigo)).toBe('verdadero falso verdadero verdadero verdadero');
  });

  it('se pueden escribir en varias líneas', () => {
    expect(mostrado('variable t = {\n    a: 1,\n    b: [1, 2],\n}\nmostrar(t.b[2])')).toBe('2');
  });
});
