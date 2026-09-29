/**
 * TESTS DEL ESTADO DEL EDITOR: todo lo que se puede hacer con un proyecto
 * desde el editor (sin interfaz): objetos, deshacer, scripts, escenas,
 * plantillas, recursos y mapas de casillas.
 */
import { describe, expect, it } from 'vitest';
import { EstadoEditor, nombreDeRecurso } from '../src/editor/estado/EstadoEditor';
import { revisarProyecto } from '../src/proyecto/Revision';

describe('Objetos', () => {
  it('crear objetos les da nombres sin repetir y los selecciona', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 100, 200);
    e.crearObjeto('rectangulo', 300, 200);
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Cuadrado', 'Cuadrado2']);
    expect(e.seleccionado?.nombre).toBe('Cuadrado2');
    expect(e.seleccionado?.x).toBe(300);
  });

  it('renombrar no permite nombres repetidos y quita los espacios', () => {
    const e = new EstadoEditor();
    e.crearObjeto('circulo', 0, 0);
    e.crearObjeto('circulo', 0, 0);
    expect(e.renombrar(e.seleccion!, 'Circulo')).toBe('Circulo2');
    expect(e.renombrar(e.seleccion!, 'Mi Jugador')).toBe('MiJugador');
  });

  it('cambiar propiedades con rutas, activar y quitar componentes', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    const ref = e.seleccion!;
    e.cambiarPropiedad(ref, 'sprite.color', 'rojo');
    e.activarComponente(ref, 'fisica', true);
    e.cambiarPropiedad(ref, 'fisica.masa', 5);
    expect(e.seleccionado?.sprite?.color).toBe('rojo');
    expect(e.seleccionado?.fisica?.masa).toBe(5);
    e.activarComponente(ref, 'fisica', false);
    expect(e.seleccionado?.fisica).toBeUndefined();
  });

  it('duplicar, reordenar y borrar', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    e.duplicarSeleccionado();
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Cuadrado', 'Cuadrado2']);
    e.moverEnLista(1, 0);
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Cuadrado2', 'Cuadrado']);
    e.borrarSeleccionado();
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Cuadrado']);
    expect(e.seleccion).toBeNull();
  });

  it('propiedades propias (vida = 3)', () => {
    const e = new EstadoEditor();
    e.crearObjeto('vacio', 0, 0);
    e.cambiarPropiedadPropia(e.seleccion!, 'vida', 3);
    expect(e.seleccionado?.propiedades).toEqual({ vida: 3 });
    e.cambiarPropiedadPropia(e.seleccion!, 'vida', undefined);
    expect(e.seleccionado?.propiedades).toBeUndefined();
  });
});

describe('Deshacer y rehacer', () => {
  it('deshace y rehace cambios uno a uno', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    e.cambiarPropiedad(e.seleccion!, 'sprite.color', 'rojo');
    e.deshacer();
    expect(e.seleccionado?.sprite?.color).not.toBe('rojo');
    e.deshacer();
    expect(e.escena.objetos).toHaveLength(0);
    e.rehacer();
    e.rehacer();
    expect(e.escena.objetos[0].sprite?.color).toBe('rojo');
    expect(e.puedeRehacer).toBe(false);
  });

  it('arrastrar (un cambio largo) se deshace de una sola vez', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    const ref = e.seleccion!;
    e.empezarCambioLargo();
    for (let i = 1; i <= 10; i++) e.moverObjeto(ref, i * 10, 0);
    e.terminarCambioLargo();
    expect(e.seleccionado?.x).toBe(100);
    e.deshacer();
    expect(e.seleccionado?.x).toBe(0);
  });

  it('escribir código no llena el historial de deshacer (el editor de código tiene el suyo)', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    const archivo = e.crearScriptPara(e.seleccion!)!;
    const antes = e.puedeDeshacer;
    e.cambiarCodigo(archivo, 'mostrar(1)');
    e.cambiarCodigo(archivo, 'mostrar(12)');
    e.deshacer();
    expect(antes).toBe(true);
    expect(e.proyecto.scripts[archivo]).toBeUndefined(); // se deshizo la creación del script
  });

  it('avisa a quien escucha de cada tipo de cambio', () => {
    const e = new EstadoEditor();
    const cambios: string[] = [];
    e.alCambiar((c) => cambios.push(c));
    e.crearObjeto('texto', 0, 0);
    expect(cambios).toContain('objetos');
    expect(cambios).toContain('seleccion');
  });
});

describe('Scripts', () => {
  it('crear el script de un objeto: lo asigna, lo abre en una pestaña y el proyecto funciona', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    const archivo = e.crearScriptPara(e.seleccion!);
    expect(archivo).toBe('cuadrado.chs');
    expect(e.seleccionado?.script).toBe('cuadrado.chs');
    expect(e.pestanaActiva).toBe('cuadrado.chs');
    expect(revisarProyecto(e.proyecto).errores).toEqual([]);
  });

  it('renombrar un script actualiza los objetos que lo usan y las pestañas', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    e.crearScriptPara(e.seleccion!);
    expect(e.renombrarScript('cuadrado.chs', 'jugador')).toBe('jugador.chs');
    expect(e.seleccionado?.script).toBe('jugador.chs');
    expect(e.pestanas).toEqual(['jugador.chs']);
  });

  it('borrar un script lo quita de los objetos y cierra su pestaña', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    e.crearScriptPara(e.seleccion!);
    e.borrarScript('cuadrado.chs');
    expect(e.seleccionado?.script).toBeUndefined();
    expect(e.pestanaActiva).toBe('escena');
  });
});

describe('Escenas', () => {
  it('crear, renombrar (conservando el orden), poner como inicial y borrar', () => {
    const e = new EstadoEditor();
    e.crearEscena('Nivel');
    e.crearEscena('Final');
    expect(Object.keys(e.proyecto.escenas)).toEqual(['Principal', 'Nivel', 'Final']);
    e.renombrarEscena('Nivel', 'Nivel1');
    expect(Object.keys(e.proyecto.escenas)).toEqual(['Principal', 'Nivel1', 'Final']);
    e.ponerEscenaInicial('Nivel1');
    e.borrarEscena('Nivel1');
    expect(e.proyecto.escenaInicial).toBe('Principal');
  });

  it('nunca se borra la última escena', () => {
    const e = new EstadoEditor();
    expect(e.borrarEscena('Principal')).toBe(false);
  });

  it('cada escena tiene sus objetos', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    e.crearEscena('Nivel2');
    e.crearObjeto('circulo', 0, 0);
    expect(e.proyecto.escenas.Principal.objetos.map((o) => o.nombre)).toEqual(['Cuadrado']);
    expect(e.proyecto.escenas.Nivel2.objetos.map((o) => o.nombre)).toEqual(['Circulo']);
  });
});

describe('Plantillas y recursos', () => {
  it('convertir en plantilla y colocar copias', () => {
    const e = new EstadoEditor();
    e.crearObjeto('circulo', 0, 0);
    e.renombrar(e.seleccion!, 'Bala');
    e.convertirEnPlantilla(e.seleccion!);
    // Convertir la saca de la escena (así no se queda una bala quieta al empezar)
    expect(e.escena.objetos).toEqual([]);
    expect(e.seleccion).toEqual({ tipo: 'plantilla', nombre: 'Bala' });
    e.colocarPlantilla('Bala', 50, 60);
    e.colocarPlantilla('Bala', 80, 60);
    expect(e.proyecto.plantillas.Bala.nombre).toBeUndefined();
    expect(e.seleccionado).toMatchObject({ nombre: 'Bala2', tipo: 'Bala', x: 80, y: 60 });
    e.deshacer();
    e.deshacer();
    e.deshacer();
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Bala']);
  });

  it('imágenes: nombres fáciles de escribir, y al borrarlas se quitan de donde se usaban', () => {
    const e = new EstadoEditor();
    expect(nombreDeRecurso('Mi Nave (1).png')).toBe('MiNave1');
    expect(nombreDeRecurso('3d.png')).toBe('r3d');
    const n = e.agregarImagen('nave.png', 'data:image/png;base64,AAAA');
    e.crearObjeto('imagen', 0, 0, n);
    e.crearAnimacion('volar', [n, n]);
    e.borrarImagen(n);
    expect(e.seleccionado?.sprite?.imagen).toBeUndefined();
    expect(e.proyecto.animaciones.volar.fotogramas).toEqual([]);
  });

  it('animaciones: crear, cambiar y borrar', () => {
    const e = new EstadoEditor();
    const a = e.crearAnimacion('correr');
    e.cambiarAnimacion(a, { velocidad: 12, repetir: false });
    expect(e.proyecto.animaciones.correr).toEqual({ fotogramas: [], velocidad: 12, repetir: false });
    e.borrarAnimacion(a);
    expect(e.proyecto.animaciones).toEqual({});
  });
});

describe('Mapas de casillas', () => {
  it('pintar y borrar casillas; pintar arrastrando se deshace de una vez', () => {
    const e = new EstadoEditor();
    e.crearObjeto('mapa', 0, 0);
    const ref = e.seleccion!;
    e.empezarCambioLargo();
    for (let c = 0; c < 5; c++) e.pintarCasilla(ref, c, 0, 'suelo');
    e.terminarCambioLargo();
    expect(Object.keys(e.seleccionado!.mapa!.celdas)).toHaveLength(5);
    e.pintarCasilla(ref, 0, 0, null);
    expect(Object.keys(e.seleccionado!.mapa!.celdas)).toHaveLength(4);
    e.deshacer();
    e.deshacer();
    expect(Object.keys(e.seleccionado!.mapa!.celdas)).toHaveLength(0);
  });

  it('tipos de casilla: crear y borrar (quita sus casillas)', () => {
    const e = new EstadoEditor();
    e.crearObjeto('mapa', 0, 0);
    const ref = e.seleccion!;
    e.ponerTipoCasilla(ref, 'pinchos', { color: 'gris', solida: false });
    e.pintarCasilla(ref, 1, 1, 'pinchos');
    e.borrarTipoCasilla(ref, 'pinchos');
    expect(e.seleccionado!.mapa!.tipos).not.toHaveProperty('pinchos');
    expect(e.seleccionado!.mapa!.celdas).toEqual({});
  });
});

describe('Guardar y abrir', () => {
  it('el JSON guardado se vuelve a abrir igual, y abrir borra el historial', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 10, 20);
    const json = e.aJSON();
    const otro = new EstadoEditor();
    otro.abrir(JSON.parse(json));
    expect(otro.proyecto).toEqual(e.proyecto);
    expect(otro.puedeDeshacer).toBe(false);
    expect(otro.modificado).toBe(false);
  });
});

describe('Copiar, pegar, pintar rectángulos y la cámara (bloque 3)', () => {
  it('copiar un objeto y pegarlo en otra escena (y en la misma, un poco desplazado)', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 100, 100);
    e.renombrar(e.seleccion!, 'Jugador');
    expect(e.copiarSeleccionado()).toBe(true);
    e.pegar();
    expect(e.seleccionado).toMatchObject({ nombre: 'Jugador2', x: 124, y: 76 });
    e.crearEscena('Nivel2');
    e.pegar();
    expect(e.escena.objetos.map((o) => [o.nombre, o.x, o.y])).toEqual([['Jugador', 100, 100]]);
    e.deshacer();
    expect(e.escena.objetos).toEqual([]);
  });

  it('pintar un rectángulo de casillas (y borrarlo) se deshace de una vez', () => {
    const e = new EstadoEditor();
    e.crearObjeto('mapa', 0, 0);
    const ref = e.seleccion!;
    e.pintarRectangulo(ref, 3, 2, 0, 0, 'suelo');
    expect(Object.keys(e.seleccionado!.mapa!.celdas).length).toBe(12);
    e.pintarRectangulo(ref, 1, 1, 2, 1, null);
    expect(Object.keys(e.seleccionado!.mapa!.celdas).length).toBe(10);
    e.deshacer();
    expect(Object.keys(e.seleccionado!.mapa!.celdas).length).toBe(12);
  });

  it('los textos nuevos son de interfaz (fijos en la pantalla)', () => {
    const e = new EstadoEditor();
    e.crearObjeto('texto', 10, 10);
    expect(e.seleccionado?.sprite?.fijo).toBe(true);
  });

  it('la plantilla de un script nuevo no tiene errores y enseña cómo moverse', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 0, 0);
    const archivo = e.crearScriptPara(e.seleccion!)!;
    expect(e.proyecto.scripts[archivo]).toContain('yo.moverConFlechas(300)');
    expect(revisarProyecto(e.proyecto).errores).toEqual([]);
  });

  it('la cámara puede no salir del mapa', () => {
    const e = new EstadoEditor();
    e.cambiarEscenaPropiedad('camara.limitarAlMapa', true);
    expect(e.escena.camara?.limitarAlMapa).toBe(true);
    e.cambiarEscenaPropiedad('camara.limitarAlMapa', false);
    expect(e.escena.camara).toEqual({});
  });
});
