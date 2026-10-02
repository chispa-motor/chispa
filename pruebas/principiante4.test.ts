/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Problemas de la prueba de principiante de la versión 1.1 (día 6): cuatro
 * juegos hechos como los haría alguien de 12 años que no sabe programar ni
 * inglés, sobre todo con lo nuevo. Un test por cada problema arreglado
 * (ver PROBLEMAS_PRINCIPIANTE.md, «Cuarta prueba»).
 */
import { describe, expect, it } from 'vitest';
import { EstadoEditor } from '../src/editor/estado/EstadoEditor';
import { CATEGORIAS, paleta, paletaPara } from '../src/editor/bloques/EditorBloques';
import { MAXIMO_NOTIFICACIONES, notificar } from '../src/editor/interfaz/dialogos';
import { ACCIONES, DATOS_CON_BLOQUE } from '../src/editor/bloques/modelo';
import { revisarProyecto } from '../src/proyecto/Revision';
import { migrarProyecto, type DefObjeto } from '../src/proyecto/formato';
import { sitioDeControlNuevo } from '../src/editor/escena/geometria';
import { CONTROLES_NUEVOS } from '../src/editor/interfaz/controlesNuevos';
import type { TipoControl } from '../src/objetos/componentes/Control';
import { datoDeControl } from '../src/editor/paneles/Inspector';
import { campoTexto } from '../src/editor/paneles/campos';
import { juegoDePrueba, unObjeto } from './ayudantes';
import { plantillaPorId } from '../src/plantillas/indice';
import { Sprite } from '../src/objetos/componentes/Sprite';
import { Control } from '../src/objetos/componentes/Control';
import { OPACIDAD_OCULTO } from '../src/editor/escena/VistaEscena';

/** Los errores que da un script al revisarlo, como en la pestaña Problemas. */
function errores(codigo: string, preparar: (e: EstadoEditor) => void = () => {}) {
  const e = new EstadoEditor();
  e.crearObjeto('rectangulo', 100, 100);
  const archivo = e.crearScriptPara(e.seleccion!)!;
  e.cambiarCodigo(archivo, codigo);
  preparar(e);
  return revisarProyecto(migrarProyecto(JSON.parse(e.aJSON()))).errores.map((x) => ({ mensaje: x.mensajeCorto, pista: x.pista ?? '' }));
}

describe('Prueba de principiante 4: los bloques', () => {
  it('TODOS los bloques están en la paleta, en su categoría (los de interfaz no se veían)', () => {
    const enPaleta = new Map(CATEGORIAS.map((c) => [c.id, paleta(c.id)]));
    for (const a of ACCIONES) {
      expect(enPaleta.get(a.categoria)!.some((b) => b.tipo === 'accion' && b.accion === a.id), `falta el bloque «${a.id}» en ${a.categoria}`).toBe(true);
    }
    for (const d of DATOS_CON_BLOQUE) {
      expect(enPaleta.get(d.categoria)!.some((b) => b.tipo === 'asignar' && b.objetivo === d.objetivo && b.valor === d.valor), `falta el bloque «${d.objetivo} = ${d.valor}» en ${d.categoria}`).toBe(true);
    }
  });

  it('hay una categoría «Interfaz» con lo de las barras, las listas, el inventario y las puntuaciones', () => {
    expect(CATEGORIAS.map((c) => c.nombre)).toContain('Interfaz');
    const textos = JSON.stringify(paleta('interfaz'));
    for (const t of ['yo.valor', 'buscar(\\"Barra\\").valor', 'yo.opciones', 'meter', 'sacar', 'abrirControl', 'guardarPuntuacion']) expect(textos).toContain(t);
    // Y en Control, cómo preguntar por el botón de un jugador
    expect(JSON.stringify(paleta('control'))).toContain('controles(1).sePulso');
  });
});

describe('Prueba de principiante 4: bloques que funcionan nada más soltarlos', () => {
  const nombres = { sonidos: ['moneda', 'pum'], musicas: ['aventura'], plantillas: ['Ovni'], escenas: ['Fin'], animaciones: ['andar'], objetos: ['Gema', 'Fantasma'] };
  const campos = (cat: Parameters<typeof paletaPara>[0], accion: string, n: typeof nombres | null = nombres) => {
    const b = paletaPara(cat, n).find((x) => x.tipo === 'accion' && x.accion === accion)!;
    return b.tipo === 'accion' ? b.campos : [];
  };

  it('los bloques que nombran algo del proyecto salen con un nombre que existe', () => {
    expect(campos('sonido', 'reproducir')[0]).toBe('"moneda"');
    expect(campos('sonido', 'musica')[0]).toBe('"aventura"');
    expect(campos('objetos', 'crear')).toEqual(['"Ovni"', 'yo.x', 'yo.y']);
    expect(campos('control', 'cambiarEscena')[0]).toBe('"Fin"');
    expect(campos('apariencia', 'animar')[0]).toBe('"andar"');
    const toco = paletaPara('eventos', nombres).find((b) => b.tipo === 'evento' && b.clase === 'toco')!;
    expect(toco.tipo === 'evento' && toco.dato).toBe('Gema');
  });

  it('si el proyecto aún no tiene nada de eso, salen los de ejemplo; y los demás bloques no cambian', () => {
    const vacio = { sonidos: [], musicas: [], plantillas: [], escenas: [], animaciones: [], objetos: [] };
    expect(campos('sonido', 'reproducir', vacio)[0]).toBe('"salto"');
    expect(campos('objetos', 'crear', vacio)[0]).toBe('"Bala"');
    expect(paletaPara('movimiento', nombres)).toEqual(paleta('movimiento'));
    expect(paletaPara('sonido', null)).toEqual(paleta('sonido'));
    // sonido.efecto usa los sonidos que trae el motor, no los del proyecto
    expect(campos('sonido', 'efecto')[0]).toBe('"moneda"');
  });

  it('como mucho hay tres avisos a la vez (no tapan el inspector)', () => {
    for (let i = 0; i < 8; i++) notificar(`aviso ${i}`);
    const zona = document.getElementById('notificaciones')!;
    expect(zona.children.length).toBe(MAXIMO_NOTIFICACIONES);
    expect(zona.lastElementChild!.textContent).toBe('aviso 7');
  });
});

describe('Prueba de principiante 4: errores al escribir con lo nuevo', () => {
  it('jugador(2).x: explica que se escribe controles(2)', () => {
    const [e] = errores('cuando cada fotograma:\n    yo.x += jugador(2).x * 100 * delta\n');
    expect(e.mensaje).toContain("'controles'");
    expect(e.pista).toContain('controles(2).x');
  });

  it('pero una variable «jugador» propia sigue funcionando como siempre', () => {
    expect(errores('variable jugador = buscar("Cuadrado")\ncuando empieza:\n    mostrar(jugador.x)\n')).toEqual([]);
    expect(errores('funcion jugador(n):\n    devolver n * 2\ncuando empieza:\n    mostrar(jugador(2))\n')).toEqual([]);
  });

  it('«al empezar:», «al tocar Moneda:» y «al pulsar espacio:» dicen cómo se escribe el evento', () => {
    expect(errores('al empezar:\n    mostrar(1)\n')[0].pista).toContain('cuando empieza:');
    expect(errores('al tocar Moneda:\n    mostrar(1)\n')[0].pista).toContain('cuando toco Moneda:');
    expect(errores('al pulsar espacio:\n    mostrar(1)\n')[0].pista).toContain('cuando se pulsa "espacio":');
    expect(errores('al empezar:\n    mostrar(1)\n')[0].mensaje).toContain("empiezan por 'cuando'");
  });

  it('un nombre sin comillas dentro de unos paréntesis: avisa de las comillas', () => {
    const [e] = errores('cuando empieza:\n    yo.meter(llave)\n');
    expect(e.pista).toContain('va entre comillas: "llave"');
    // Si se parece a una variable que sí existe, lo primero es eso
    const [f] = errores('variable puntos = 0\ncuando empieza:\n    mostrar(puntoss)\n');
    expect(f.pista).toBe("¿Querías decir 'puntos'?");
  });

  it('un sonido que no existe: «ningún sonido llamado», y dónde conseguir uno', () => {
    const [e] = errores('cuando empieza:\n    sonido.reproducir("pum")\n');
    expect(e.mensaje).toBe('no existe ningún sonido llamado "pum".');
    expect(e.pista).toContain('Proyecto > Sonidos');
    const [f] = errores('cuando empieza:\n    sonido.reproducir("pum")\n', (ed) => void ed.anadirRecursoListo('sonido', 'moneda'));
    expect(f.pista).toBe('Los que hay son: moneda.');
    // Las plantillas siguen en femenino
    expect(errores('cuando empieza:\n    crear("Bala")\n')[0].mensaje).toContain('ninguna plantilla llamada');
  });
});

describe('Prueba de principiante 4: los dibujos listos', () => {
  it('lo que se añade seguido no queda amontonado: cada dibujo va a un sitio libre', () => {
    const e = new EstadoEditor();
    for (const d of ['heroe', 'gema', 'fantasma', 'slime', 'llave', 'cofre']) e.anadirRecursoListo('dibujo', d, true);
    const sitios = e.escena.objetos.map((o) => `${o.x},${o.y}`);
    expect(new Set(sitios).size).toBe(6);
    expect(sitios[0]).toBe('480,270');
    for (const o of e.escena.objetos) {
      expect(o.x).toBeGreaterThan(60);
      expect(o.x).toBeLessThan(900);
      expect(o.y).toBeGreaterThan(40);
      expect(o.y).toBeLessThan(500);
    }
  });

  it('los objetos se llaman con mayúscula (Gema, Gema2), como los demás', () => {
    const e = new EstadoEditor();
    e.anadirRecursoListo('dibujo', 'gema', true);
    e.anadirRecursoListo('dibujo', 'gema', true);
    expect(e.escena.objetos.map((o) => o.nombre)).toEqual(['Gema', 'Gema2']);
    expect(Object.keys(e.proyecto.imagenes)).toEqual(['gema']);
  });

  it('en un proyecto sin imágenes se activan los píxeles nítidos (y se deshace todo de una vez); si ya había imágenes, no se toca', () => {
    const e = new EstadoEditor();
    expect(e.proyecto.pixelArt).toBe(false);
    e.anadirRecursoListo('dibujo', 'gema', true);
    expect(e.proyecto.pixelArt).toBe(true);
    e.deshacer();
    expect(e.proyecto.pixelArt).toBe(false);
    expect(e.escena.objetos.length).toBe(0);
    expect(Object.keys(e.proyecto.imagenes)).toEqual([]);

    const conFoto = new EstadoEditor();
    conFoto.agregarImagen('foto', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    conFoto.anadirRecursoListo('dibujo', 'gema', true);
    expect(conFoto.proyecto.pixelArt).toBe(false);
  });
});

describe('Prueba de principiante 4: la interfaz', () => {
  it('una barra o un icono con contador nuevos van arriba a la izquierda (no encima del jugador), y no se pisan', () => {
    const objetos: DefObjeto[] = [];
    const poner = (tipo: TipoControl) => {
      const s = sitioDeControlNuevo(tipo, 960, 540, objetos);
      objetos.push({ x: s.x, y: s.y, ...structuredClone(CONTROLES_NUEVOS[tipo].def) });
      return s;
    };
    const barra = poner('barra');
    expect(barra.x).toBeLessThan(200);
    expect(barra.y).toBeGreaterThan(480);
    const icono = poner('icono');
    expect(icono.x).toBeLessThan(100);
    expect(icono.y).toBeLessThan(barra.y - 20);
    const otro = poner('icono');
    expect(otro.y).toBeLessThan(icono.y - 20);
    // El minimapa, arriba a la derecha; un botón o una lista, en el centro (y el segundo, debajo)
    expect(poner('minimapa').x).toBeGreaterThan(800);
    expect(poner('lista')).toEqual({ x: 480, y: 270 });
    expect(poner('lista').y).toBeLessThan(270);
    // Nunca se sale por abajo
    for (let i = 0; i < 30; i++) expect(poner('icono').y).toBeGreaterThan(0);
  });

  it('en «dato» de una barra, escribir «puntos» vale por «juego.puntos» si es un dato del juego', () => {
    expect(datoDeControl('puntos', ['puntos', 'vidas'])).toBe('juego.puntos');
    expect(datoDeControl(' Vidas ', ['puntos', 'vidas'])).toBe('juego.vidas');
    expect(datoDeControl('juego.puntos', ['puntos'])).toBe('juego.puntos');
    expect(datoDeControl('yo.vida', ['puntos'])).toBe('yo.vida');
    expect(datoDeControl('  ', ['puntos'])).toBeUndefined();
  });

  it('el campo «dato» ofrece los datos del juego que ya existen', () => {
    const campo = campoTexto('dato', 'control.dato', '', () => {}, 'ayuda', 'juego.vida', ['juego.puntos', 'juego.vidas']);
    const lista = campo.querySelector('datalist')!;
    expect([...lista.querySelectorAll('option')].map((o) => o.value)).toEqual(['juego.puntos', 'juego.vidas']);
    expect(campo.querySelector('input')!.getAttribute('list')).toBe(lista.id);
    expect(campoTexto('nombre', 'x', '', () => {}).querySelector('datalist')).toBeNull();
  });

  it('usar un dato del juego que no existe: el error dice cómo crearlo sin código', () => {
    const j = unObjeto('cuando empieza:\n    juego.puntos += 1\n');
    j.avanzar(2);
    expect(j.errores[0].error.pista).toContain('Datos del juego');
    expect(j.errores[0].error.pista).toContain('juego.puntos = 0');
  });
});

describe('Prueba de principiante 4: sin código', () => {
  it('al activar «Comportamiento», el enemigo persigue al objeto que se maneja, se llame como se llame', () => {
    const e = new EstadoEditor();
    for (const d of ['gema', 'heroe', 'fantasma']) e.anadirRecursoListo('dibujo', d, true);
    const indice = (n: string) => e.escena.objetos.findIndex((o) => o.nombre === n);
    const ref = (n: string) => ({ tipo: 'escena' as const, escena: e.escenaActual, indice: indice(n) });
    // Sin nadie que se maneje: al primero que no sea él
    e.activarComponente(ref('Fantasma'), 'comportamiento', true);
    expect(e.escena.objetos[indice('Fantasma')].comportamiento).toEqual({ tipo: 'perseguir', objetivo: 'Gema' });
    e.activarComponente(ref('Fantasma'), 'comportamiento', false);
    // Con un objeto que se mueve con las flechas: a ese
    const archivo = e.crearScriptPara(ref('Heroe'))!;
    e.cambiarCodigo(archivo, 'cuando cada fotograma:\n    yo.moverConFlechas(300)\n');
    e.activarComponente(ref('Fantasma'), 'comportamiento', true);
    expect(e.escena.objetos[indice('Fantasma')].comportamiento?.objetivo).toBe('Heroe');
    // Y si hay un «Jugador», a ese (como siempre)
    e.activarComponente(ref('Fantasma'), 'comportamiento', false);
    e.renombrar(ref('Gema'), 'Jugador');
    e.activarComponente(ref('Fantasma'), 'comportamiento', true);
    expect(e.escena.objetos[indice('Fantasma')].comportamiento?.objetivo).toBe('Jugador');
    // En una escena vacía se queda el nombre de ejemplo
    const solo = new EstadoEditor();
    solo.crearObjeto('rectangulo', 0, 0);
    solo.activarComponente(solo.seleccion!, 'comportamiento', true);
    expect(solo.seleccionado?.comportamiento?.objetivo).toBe('Jugador');
  });
});

describe('Prueba de principiante 4: cambiar el nombre a las cosas de una plantilla', () => {
  const abrir = (id: string) => {
    const e = new EstadoEditor();
    e.abrir(plantillaPorId(id)!.crear());
    return e;
  };
  const sinProblemas = (e: EstadoEditor) => {
    const r = revisarProyecto(migrarProyecto(JSON.parse(e.aJSON())));
    expect(r.errores.map((x) => x.mensajeCorto)).toEqual([]);
  };
  const ref = (e: EstadoEditor, nombre: string) => ({ tipo: 'escena' as const, escena: e.escenaActual, indice: e.escena.objetos.findIndex((o) => o.nombre === nombre) });

  it('renombrar un objeto cambia su nombre en «cuando toco», en buscar("...") y en la cámara, y se deshace entero', () => {
    const e = abrir('historia');
    const antes = e.aJSON();
    e.renombrar(ref(e, 'Jugador'), 'Pepe');
    expect(e.proyecto.scripts['gato.chs']).toContain('buscar("Pepe")');
    expect(e.proyecto.scripts['gato.chs']).not.toContain('"Jugador"');
    sinProblemas(e);
    e.deshacer();
    expect(e.aJSON()).toBe(antes);

    const n = abrir('naves');
    n.renombrar(ref(n, 'Nave'), 'Cohete');
    // La imagen se sigue llamando «nave»: eso no se toca
    expect(n.escena.objetos[0].sprite?.imagen).toBe('nave');
    expect(n.proyecto.imagenes.nave).toBeDefined();
    sinProblemas(n);

    const p = abrir('plataformas');
    p.renombrar(ref(p, 'Jugador'), 'Heroe');
    expect(p.escena.camara?.seguir).toBe('Heroe');
    p.renombrar(ref(p, 'Bandera'), 'Meta');
    expect(p.proyecto.scripts['jugador.chs']).toContain('cuando toco Meta:');
    // Las casillas («cuando toco pinchos») no son objetos: se quedan como están
    expect(p.proyecto.scripts['jugador.chs']).toContain('cuando toco pinchos:');
    sinProblemas(p);
  });

  it('renombrar una plantilla cambia crear("...") y «cuando toco»; el juego sigue funcionando', () => {
    const e = abrir('naves');
    e.renombrar({ tipo: 'plantilla', nombre: 'Ovni' }, 'Marciano');
    expect(e.proyecto.scripts['oleadas.chs']).toContain('crear("Marciano"');
    expect(e.proyecto.scripts['bala.chs']).toContain('cuando toco Marciano:');
    expect(e.proyecto.scripts['nave.chs']).toContain('cuando toco Marciano:');
    sinProblemas(e);
    const j = juegoDePrueba({ proyecto: migrarProyecto(JSON.parse(e.aJSON())) });
    j.avanzar(130);
    expect(j.juego.escena.objetos.some((o) => o.tipo === 'Marciano')).toBe(true);
    expect(j.errores).toEqual([]);
  });

  it('si quedan más objetos de ese tipo, no se toca el código; el último que queda sí lo cambia', () => {
    const e = abrir('plataformas');
    e.renombrar(ref(e, 'Moneda3'), 'Diamante');
    expect(e.proyecto.scripts['jugador.chs']).toContain('cuando toco Moneda:');
    // A quién sigue un enemigo o un minimapa también se actualiza
    const a = abrir('aventura');
    a.renombrar(ref(a, 'Jugador'), 'Ana');
    expect(a.escena.objetos.filter((o) => o.comportamiento).map((o) => o.comportamiento!.objetivo)).toEqual(['Ana', 'Ana']);
    expect(a.escena.camara?.seguir).toBe('Ana');
    // Cofre es el único Cofre: al llamarlo Tesoro, «cuando toco Cofre» pasa a «cuando toco Tesoro»
    a.renombrar(ref(a, 'Cofre'), 'Tesoro');
    expect(a.proyecto.scripts['jugador.chs']).toContain('cuando toco Tesoro:');
    sinProblemas(a);
  });

  it('la ventana de pausa de «Pantallas listas» empieza sin verse (en el editor no tapa la escena) y se abre al pausar', () => {
    const e = new EstadoEditor();
    e.crearObjeto('rectangulo', 480, 270);
    const plan = e.anadirPantallas(['pausa'], {});
    expect(plan.enElJuego.length).toBe(2);
    for (const o of plan.enElJuego) expect(o.sprite?.visible).toBe(false);
    const j = juegoDePrueba({ proyecto: migrarProyecto(JSON.parse(e.aJSON())) });
    j.avanzar(3);
    const ventana = j.buscar('VentanaPausa').obtener(Sprite)!;
    const menu = j.buscar('MenuPausa').obtener(Sprite)!;
    expect([ventana.visible, menu.visible]).toEqual([false, false]);
    j.pulsar('Escape', 'Escape');
    j.avanzar(2);
    j.soltar('Escape', 'Escape');
    expect([ventana.visible, menu.visible]).toEqual([true, true]);
    expect(OPACIDAD_OCULTO).toBeLessThan(0.3);
  });
});

describe('Prueba de principiante 4: una barra con la vida del jugador', () => {
  /** Un héroe con vida = 100 y una barra con ese dato. Devuelve los errores (como en Problemas) y el juego. */
  function conBarra(dato: string) {
    const e = new EstadoEditor();
    e.anadirRecursoListo('dibujo', 'heroe', true);
    e.cambiarPropiedad(e.seleccion!, 'propiedades', { vida: 80 });
    e.crearControl('barra', 100, 500);
    e.cambiarPropiedad(e.seleccion!, 'control.dato', dato);
    const proyecto = migrarProyecto(JSON.parse(e.aJSON()));
    return { errores: revisarProyecto(proyecto).errores.map((x) => ({ mensaje: x.mensajeCorto, pista: x.pista ?? '' })), proyecto };
  }

  it('buscar("Heroe").vida funciona (antes, las comillas dentro del dato daban un error raro)', () => {
    const { errores: err, proyecto } = conBarra('buscar("Heroe").vida');
    expect(err).toEqual([]);
    const j = juegoDePrueba({ proyecto });
    j.avanzar(3);
    expect(j.buscar('Barra').obtener(Control)!.numero).toBe(80);
    expect(j.errores).toEqual([]);
  });

  it('en el inspector, «Heroe.vida» se convierte solo en buscar("Heroe").vida', () => {
    expect(datoDeControl('Heroe.vida', [], ['Heroe', 'Barra'])).toBe('buscar("Heroe").vida');
    expect(datoDeControl('heroe.vida', [], ['Heroe'])).toBe('buscar("Heroe").vida');
    expect(datoDeControl('juego.vida', [], ['Heroe'])).toBe('juego.vida');
    expect(datoDeControl('yo.valor', [], ['Heroe'])).toBe('yo.valor');
  });

  it('yo.vida en la barra: se avisa ANTES de jugar de que «yo» es la barra, y de quién es la vida', () => {
    const [e] = conBarra('yo.vida').errores;
    expect(e.mensaje).toContain("'yo' es este mismo objeto");
    expect(e.pista).toContain('buscar("Heroe").vida');
    // Lo que sí es de la barra, o de cualquier objeto, no da error
    expect(conBarra('yo.maximo').errores).toEqual([]);
    expect(conBarra('yo.x').errores).toEqual([]);
  });

  it('Heroe.vida escrito a mano en el proyecto: dice que hay que buscarlo', () => {
    const [e] = conBarra('Heroe.vida').errores;
    expect(e.pista).toContain('buscar("Heroe").vida');
  });

  it('en un texto del inspector también vale un dato de otro objeto, con sus comillas', () => {
    const e = new EstadoEditor();
    e.anadirRecursoListo('dibujo', 'heroe', true);
    e.cambiarPropiedad(e.seleccion!, 'propiedades', { vida: 80 });
    e.crearObjeto('texto', 100, 500);
    e.cambiarPropiedad(e.seleccion!, 'sprite.texto', 'Vida: {buscar("Heroe").vida}');
    const proyecto = migrarProyecto(JSON.parse(e.aJSON()));
    expect(revisarProyecto(proyecto).errores).toEqual([]);
    const j = juegoDePrueba({ proyecto });
    j.avanzar(2);
    const s = j.buscar('Texto').obtener(Sprite)!;
    s.actualizarTexto();
    expect(s.texto).toBe('Vida: 80');
  });
});

describe('Prueba de principiante 4: más pistas', () => {
  it('yo.letra = pixel y yo.texto = Hola: faltan las comillas', () => {
    expect(errores('cuando empieza:\n    yo.letra = pixel\n')[0].pista).toContain('"pixel" entre comillas');
    expect(errores('cuando empieza:\n    yo.forma = estrella\n')[0].pista).toContain('"estrella" entre comillas');
    expect(errores('cuando empieza:\n    yo.texto = Hola\n')[0].pista).toContain('Si es un texto, va entre comillas: "Hola"');
    // Una variable de verdad a la derecha sigue valiendo
    expect(errores('variable nombre = "Ana"\ncuando empieza:\n    yo.texto = nombre\n')).toEqual([]);
  });

  it('yo.luz = 200: explica que la luz se enciende con verdadero y el tamaño es radioLuz', () => {
    const j = unObjeto('cuando empieza:\n    yo.luz = 200\n');
    j.avanzar(2);
    expect(j.errores[0].error.pista).toContain('yo.radioLuz = 200');
  });

  it('pasar el nombre de un objeto entre comillas donde hace falta el objeto: dice que hay que buscarlo', () => {
    const j = unObjeto('cuando empieza:\n    escena.camara.seguir("Prueba")\n');
    j.avanzar(2);
    expect(j.errores[0].error.pista).toContain('buscar("Prueba")');
  });
});
