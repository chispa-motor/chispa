/**
 * Pruebas del lenguaje Chispa (sin navegador). Ejecuta: npm run pruebas
 * Enseña programas que funcionan y los mensajes de error de programas rotos.
 */
import { compilar } from '../src/chispa/parser';
import { Interprete } from '../src/chispa/interprete';
import { Entorno } from '../src/chispa/entorno';
import { FuncionNativa, PeticionEspera } from '../src/chispa/valores';

function ejecutar(codigo: string): string[] {
  const salida: string[] = [];
  const it = new Interprete();
  it.alMostrar = (t) => salida.push(t);
  it.globales.declarar('esperar', new FuncionNativa('esperar', (a) => new PeticionEspera((a[0] as number) ?? 0)));
  it.globales.declarar('longitud', new FuncionNativa('longitud', (a) => (a[0] as string).length));
  const p = compilar(codigo, 'prueba.chs');
  const gen = it.ejecutarBloque(p.sentencias, new Entorno(it.globales));
  let pausas = 0;
  for (let r = gen.next(); !r.done; r = gen.next()) pausas++;
  if (pausas) salida.push(`(pausas: ${pausas})`);
  return salida;
}
function probar(titulo: string, codigo: string) {
  try {
    console.log(`✔ ${titulo}:`, ejecutar(codigo).join(' | '));
  } catch (e: any) {
    console.log(
      `✖ ${titulo}:\n    ${e.message}\n    💡 ${e.pista ?? ''}\n    [${e.ubicacion?.archivo} · ${e.ubicacion?.codigo ?? ''}]`,
    );
  }
}

probar('aritmética', 'mostrar 2 + 3 * 4, (2 + 3) * 4, 10 / 4, 0.1 + 0.2, -7 % 3');
probar('textos', 'variable n = 5\nmostrar "Tengo " + n + " monedas", "hola".longitud');
probar('tildes y mayúsculas', 'Función Saludar(Nombre):\n    Devolver "¡Hola, " + nombre + "!"\nmostrar saludar("Rodri")');
probar(
  'si / sino si / sino',
  'variable v = 50\nsi v > 80:\n    mostrar "alta"\nsino si v > 20:\n    mostrar "media"\nsino:\n    mostrar "baja"',
);
probar('mientras + salir', 'variable i = 0\nmientras verdadero:\n    i += 1\n    si i >= 5:\n        salir\nmostrar i');
probar('repetir', 'variable t = ""\nrepetir 3 veces:\n    t += "*"\nmostrar t');
probar(
  'para cada lista y texto',
  'variable s = 0\npara cada n en [1, 2, 3]:\n    s += n\nmostrar s\npara cada l en "ñú":\n    mostrar l',
);
probar('listas 1-based', 'variable l = [10, 20]\nl.añadir(30)\nl[1] = 5\nmostrar l, l.longitud, l[3]');
probar(
  'closure/recursión',
  'funcion fib(n):\n    si n < 2:\n        devolver n\n    devolver fib(n - 1) + fib(n - 2)\nmostrar fib(15)',
);
probar('esperar pausa', 'mostrar "a"\nesperar(1)\nmostrar "b"');
probar('lista multilínea', 'variable m = [\n    "ab",\n    "cd",\n]\nmostrar m[2][1]');
probar('y/o cortocircuito', 'variable e = nulo\nsi e != nulo y e.vida > 0:\n    mostrar "vivo"\nsino:\n    mostrar "no hay"');
console.log('\n──────── ERRORES ────────');
probar('variable no existe', 'variable vida = 3\nvidda = 2');
probar('nombre mal escrito', 'variable puntos = 1\nmostrar puntoss');
probar('propiedad de algo que no existe', 'enemigo.vida = enemigo.vida - 10');
probar('nulo', 'variable enemigo = nulo\nenemigo.vida = 5');
probar('falta dos puntos', 'si 3 > 2\n    mostrar 1');
probar('= en condición', 'variable a = 1\nsi a = 1:\n    mostrar a');
probar('sangría rara', 'si verdadero:\n    mostrar 1\n  mostrar 2');
probar('sangría sin bloque', 'mostrar 1\n    mostrar 2');
probar('texto sin cerrar', 'mostrar "hola');
probar('palabra reservada y', 'variable y = 3');
probar('sumar texto+lista', 'mostrar [1] - "a"');
probar('dividir entre cero', 'mostrar 5 / 0');
probar('índice 0', 'variable l = [1,2]\nmostrar l[0]');
probar('bucle infinito', 'variable i = 0\nmientras verdadero:\n    i += 1');
probar('función: nº argumentos', 'funcion f(a, b):\n    devolver a\nmostrar f(1)');
probar('símbolo raro', 'mostrar ¡hola!');
probar('punto y coma', 'mostrar 1;');
probar('paréntesis sin cerrar', 'mostrar (1 + 2');
probar('salir fuera de bucle', 'salir');
probar('cuando mal', 'cuando salto:\n    mostrar 1');
probar('comparar texto y número', 'si "5" > 3:\n    mostrar 1');
probar('sino suelto', 'sino:\n    mostrar 1');
probar('llamar a no función', 'variable x = 3\nx()');
