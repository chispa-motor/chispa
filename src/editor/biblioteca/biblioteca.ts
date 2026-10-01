/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LA BIBLIOTECA: objetos listos para arrastrar a la escena (un jugador que ya
 * anda y salta, una moneda que suma puntos, un enemigo que patrulla...).
 *
 * Cada objeto trae su dibujo, su colisión y su física, y un script corto y
 * comentado para que se entienda y se cambie. Algunos traen más de un
 * objeto (la llave y su puerta) o una plantilla (la nave trae su bala).
 *
 * Todos usan los mismos datos de juego: juego.puntos y juego.vidas, así se
 * pueden mezclar unos con otros sin tocar nada.
 */
import type { DatoInicial, DefObjeto } from '../../proyecto/formato';

export const CATEGORIAS_BIBLIOTECA = ['Jugadores', 'Enemigos', 'Cosas para coger', 'Escenario', 'Interfaz'] as const;
export type CategoriaBiblioteca = (typeof CATEGORIAS_BIBLIOTECA)[number];

export interface ElementoBiblioteca {
  id: string;
  nombre: string;
  categoria: CategoriaBiblioteca;
  descripcion: string;
  /** Palabras para el buscador (además del nombre y la descripción). */
  palabras: string;
  /** Los objetos, con su sitio RELATIVO al punto donde se suelta. */
  objetos: DefObjeto[];
  /** Los scripts que usan (archivo → código). */
  scripts: Record<string, string>;
  /** Plantillas que hacen falta (la bala de la nave...). */
  plantillas?: Record<string, DefObjeto>;
  /** Datos del juego con los que empieza (si el proyecto no los tiene ya). */
  datos?: Record<string, DatoInicial>;
}

/** Quita lo que pasa al jugador cuando le hacen daño: lo mismo en todo lo que hace daño. */
const DANO = [
  'cuando toco Jugador:',
  '    juego.vidas -= 1',
  '    otro.parpadear(1)',
  '    sonido.efecto("dano")',
  '    # Sin vidas: todo vuelve a empezar',
  '    si juego.vidas <= 0:',
  '        juego.vidas = 3',
  '        juego.puntos = 0',
  '        escena.reiniciar()',
].join('\n');

const BALA: DefObjeto = {
  sprite: { forma: 'capsula', ancho: 10, alto: 22, color: 'amarillo', resplandor: 'naranja', tamanoResplandor: 10, capa: 1 },
  colision: { solido: false },
  fisica: { gravedad: 0, rozamiento: 0 },
  script: 'bala.chs',
};
const SCRIPT_BALA = [
  '# Bala: se crea con crear("Bala", x, y) y vuela con la velocidad que le den.',
  '# Desaparece al salir de la pantalla y al darle a un enemigo (que tambien desaparece).',
  'cuando salgo de la pantalla:',
  '    destruir(yo)',
  '',
  'cuando toco Enemigo:',
  '    particulas("explosion", otro.x, otro.y)',
  '    sonido.efecto("explosion")',
  '    juego.puntos += 10',
  '    destruir(otro)',
  '    destruir(yo)',
].join('\n');

export const BIBLIOTECA: ElementoBiblioteca[] = [
  // ───────────────────────── Jugadores ─────────────────────────
  {
    id: 'jugador-plataformas',
    nombre: 'Jugador de plataformas',
    categoria: 'Jugadores',
    descripcion: 'Anda con las flechas (o A y D) y salta con espacio. La cámara lo sigue.',
    palabras: 'personaje heroe saltar correr plataformas mario',
    objetos: [{ nombre: 'Jugador', sprite: { forma: 'redondeado', ancho: 40, alto: 56, color: '#4aa3ff', radioEsquina: 10, borde: 3, colorBorde: '#1d5d99' }, colision: {}, fisica: {}, script: 'jugador_plataformas.chs' }],
    scripts: {
      'jugador_plataformas.chs': [
        '# Jugador de plataformas: flechas (o A y D) para andar, espacio (o W o flecha arriba) para saltar.',
        '# Cambia estos numeros para que se sienta como tu quieras.',
        'cuando empieza:',
        '    yo.rapidez = 260      # pixeles por segundo al andar',
        '    yo.fuerzaSalto = 650  # cuanto salta',
        '    escena.camara.seguir(yo)',
        '',
        'cuando cada fotograma:',
        '    yo.velocidad.x = 0',
        '    si teclado.pulsada("izquierda") o teclado.pulsada("a"):',
        '        yo.velocidad.x = -yo.rapidez',
        '        yo.voltear = verdadero',
        '    si teclado.pulsada("derecha") o teclado.pulsada("d"):',
        '        yo.velocidad.x = yo.rapidez',
        '        yo.voltear = falso',
        '    # Si se cae del mundo, vuelve a empezar',
        '    si yo.y < -600:',
        '        escena.reiniciar()',
        '',
        'cuando se pulsa "espacio", "arriba", "w":',
        '    si yo.saltar(yo.fuerzaSalto):',
        '        sonido.efecto("salto")',
      ].join('\n'),
    },
    datos: { vidas: 3, puntos: 0 },
  },
  {
    id: 'jugador-arriba',
    nombre: 'Jugador visto desde arriba',
    categoria: 'Jugadores',
    descripcion: 'Se mueve en las cuatro direcciones con las flechas (o W A S D), como en un juego de aventuras.',
    palabras: 'personaje heroe zelda aventura rpg cenital top down andar',
    objetos: [{ nombre: 'Jugador', sprite: { forma: 'circulo', ancho: 44, alto: 44, color: '#5ad17a', borde: 3, colorBorde: '#2c7a43' }, colision: {}, fisica: { gravedad: 0, rozamiento: 0 }, script: 'jugador_arriba.chs' }],
    scripts: {
      'jugador_arriba.chs': [
        '# Jugador visto desde arriba: se mueve en las cuatro direcciones con las flechas (o W A S D).',
        '# No le afecta la gravedad (gravedad 0 en su Fisica).',
        'cuando empieza:',
        '    escena.camara.seguir(yo)',
        '',
        'cuando cada fotograma:',
        '    yo.moverConFlechas(220)   # pixeles por segundo',
      ].join('\n'),
    },
    datos: { vidas: 3, puntos: 0 },
  },
  {
    id: 'nave',
    nombre: 'Nave',
    categoria: 'Jugadores',
    descripcion: 'Una nave que se mueve con las flechas y dispara con espacio. Trae la plantilla Bala.',
    palabras: 'shooter disparar espacio cohete avion marcianos',
    objetos: [{ nombre: 'Nave', sprite: { forma: 'triangulo', ancho: 48, alto: 52, color: '#3ad6c9', borde: 2, colorBorde: '#ffffff' }, colision: {}, script: 'nave.chs' }],
    scripts: {
      'nave.chs': [
        '# Nave: se mueve con las flechas y dispara con espacio.',
        '# Las balas son la plantilla "Bala" (mirala en Proyecto > Plantillas).',
        'cuando cada fotograma:',
        '    yo.moverConFlechas(320)',
        '    # Que no se salga de la pantalla',
        '    yo.x = limitar(yo.x, 30, pantalla.ancho - 30)',
        '    yo.y = limitar(yo.y, 30, pantalla.alto - 30)',
        '',
        'cuando se pulsa "espacio":',
        '    variable bala = crear("Bala", yo.x, yo.y + 30)',
        '    bala.velocidad = vector(0, 700)',
        '    sonido.efecto("laser")',
      ].join('\n'),
      'bala.chs': SCRIPT_BALA,
    },
    plantillas: { Bala: BALA },
    datos: { puntos: 0 },
  },
  // ───────────────────────── Enemigos ─────────────────────────
  {
    id: 'enemigo-patrulla',
    nombre: 'Enemigo que patrulla',
    categoria: 'Enemigos',
    descripcion: 'Va y viene él solo (su Recorrido). Si toca al jugador, le quita una vida.',
    palabras: 'malo monstruo patrullar ir y venir goomba',
    objetos: [{ nombre: 'Enemigo', sprite: { forma: 'redondeado', ancho: 44, alto: 40, color: '#ff6b6b', radioEsquina: 12, borde: 3, colorBorde: '#8c2a2a' }, colision: {}, recorrido: { puntos: [{ x: 200, y: 0 }], rapidez: 100 }, script: 'enemigo_patrulla.chs' }],
    scripts: {
      'enemigo_patrulla.chs': [
        '# Enemigo que patrulla: va y viene el solo. Su camino esta en el inspector (Recorrido):',
        '# puedes cambiar hasta donde va y a que velocidad.',
        DANO,
      ].join('\n'),
    },
    datos: { vidas: 3, puntos: 0 },
  },
  {
    id: 'enemigo-persigue',
    nombre: 'Enemigo que persigue',
    categoria: 'Enemigos',
    descripcion: 'Persigue al jugador cuando se acerca (su Comportamiento). Si lo toca, le quita una vida.',
    palabras: 'malo monstruo perseguir seguir fantasma zombi',
    objetos: [{ nombre: 'Enemigo', sprite: { forma: 'estrella', ancho: 48, alto: 48, lados: 8, radioInterior: 0.7, color: '#b57cff', borde: 2, colorBorde: '#4b2a7a' }, colision: { solido: false }, comportamiento: { tipo: 'perseguir', objetivo: 'Jugador', rapidez: 110, distancia: 350 }, script: 'enemigo_persigue.chs' }],
    scripts: {
      'enemigo_persigue.chs': [
        '# Enemigo que persigue: cuando el jugador esta cerca, va a por el (su Comportamiento, en el',
        '# inspector: a que distancia lo ve y a que velocidad va).',
        DANO,
      ].join('\n'),
    },
    datos: { vidas: 3, puntos: 0 },
  },
  // ───────────────────────── Cosas para coger ─────────────────────────
  {
    id: 'moneda',
    nombre: 'Moneda',
    categoria: 'Cosas para coger',
    descripcion: 'Flota, brilla y suma un punto al cogerla.',
    palabras: 'dinero oro puntos coleccionable coger recoger',
    objetos: [{ nombre: 'Moneda', sprite: { forma: 'circulo', ancho: 28, alto: 28, color: '#ffd23f', borde: 3, colorBorde: '#c99700', resplandor: '#ffd23f', tamanoResplandor: 12 }, colision: { solido: false }, script: 'moneda.chs' }],
    scripts: {
      'moneda.chs': [
        '# Moneda: flota arriba y abajo y, al tocarla el jugador, suma un punto y desaparece.',
        'cuando empieza:',
        '    yo.alturaInicial = yo.y',
        '',
        'cuando cada fotograma:',
        '    yo.y = yo.alturaInicial + seno(tiempo.total * 180) * 5',
        '',
        'cuando toco Jugador:',
        '    juego.puntos += 1',
        '    sonido.efecto("moneda")',
        '    particulas("chispas", yo.x, yo.y)',
        '    destruir(yo)',
      ].join('\n'),
    },
    datos: { puntos: 0 },
  },
  {
    id: 'corazon',
    nombre: 'Corazón de vida',
    categoria: 'Cosas para coger',
    descripcion: 'Da una vida más al cogerlo.',
    palabras: 'vida salud curar corazon',
    objetos: [{ nombre: 'Corazon', sprite: { forma: 'corazon', ancho: 34, alto: 30, color: '#ff4f7b', resplandor: '#ff9fb6', tamanoResplandor: 10 }, colision: { solido: false }, script: 'corazon.chs' }],
    scripts: {
      'corazon.chs': [
        '# Corazon de vida: al cogerlo, una vida mas.',
        'cuando toco Jugador:',
        '    juego.vidas += 1',
        '    sonido.efecto("subir")',
        '    particulas("estrellas", yo.x, yo.y)',
        '    destruir(yo)',
      ].join('\n'),
    },
    datos: { vidas: 3 },
  },
  {
    id: 'llave-puerta',
    nombre: 'Llave y puerta',
    categoria: 'Cosas para coger',
    descripcion: 'Al coger la llave, la puerta se abre (se desvanece).',
    palabras: 'abrir cerrar candado secreto',
    objetos: [
      { nombre: 'Llave', x: -150, y: 0, sprite: { forma: 'capsula', ancho: 40, alto: 16, color: '#ffd23f', borde: 2, colorBorde: '#a07800', resplandor: '#ffe680', tamanoResplandor: 8 }, colision: { solido: false }, script: 'llave.chs' },
      { nombre: 'Puerta', x: 150, y: 30, sprite: { forma: 'rectangulo', ancho: 40, alto: 110, color: '#8e5a2b', relleno: 'patron', patron: 'ladrillos', color2: '#5e3a1b' }, colision: {}, script: 'puerta.chs' },
    ],
    scripts: {
      'llave.chs': [
        '# Llave: al cogerla, avisa a las puertas con el mensaje "abrir".',
        'cuando toco Jugador:',
        '    sonido.efecto("moneda")',
        '    enviar("abrir")',
        '    destruir(yo)',
      ].join('\n'),
      'puerta.chs': [
        '# Puerta: cuando le llega el mensaje "abrir", se desvanece y desaparece.',
        'cuando recibo "abrir":',
        '    sonido.efecto("subir")',
        '    animar(yo.opacidad, 0, 0.5)',
        '    esperar(0.5)',
        '    destruir(yo)',
      ].join('\n'),
    },
  },
  // ───────────────────────── Escenario ─────────────────────────
  {
    id: 'plataforma-movil',
    nombre: 'Plataforma móvil',
    categoria: 'Escenario',
    descripcion: 'Va y viene ella sola; lo que está encima se mueve con ella.',
    palabras: 'ascensor suelo moverse',
    objetos: [{ nombre: 'Plataforma', sprite: { forma: 'redondeado', ancho: 140, alto: 24, color: '#5ad17a', radioEsquina: 6, borde: 2, colorBorde: '#2c7a43' }, colision: {}, recorrido: { puntos: [{ x: 220, y: 0 }], rapidez: 90, pausa: 0.6 } }],
    scripts: {},
  },
  {
    id: 'pinchos',
    nombre: 'Pinchos',
    categoria: 'Escenario',
    descripcion: 'Si los toca el jugador, pierde una vida y sale rebotado.',
    palabras: 'peligro trampa espinas daño',
    objetos: [{
      nombre: 'Pinchos',
      sprite: {
        forma: 'camino', ancho: 96, alto: 28, color: '#c9d1d9', borde: 2, colorBorde: '#5d6670',
        puntos: [{ x: -0.5, y: -0.5 }, { x: -0.375, y: 0.5 }, { x: -0.25, y: -0.5 }, { x: -0.125, y: 0.5 }, { x: 0, y: -0.5 }, { x: 0.125, y: 0.5 }, { x: 0.25, y: -0.5 }, { x: 0.375, y: 0.5 }, { x: 0.5, y: -0.5 }],
      },
      colision: {},
      script: 'pinchos.chs',
    }],
    scripts: {
      'pinchos.chs': [
        '# Pinchos: si los toca el jugador, pierde una vida y sale rebotado hacia arriba.',
        '# (El jugador necesita Fisica para rebotar.)',
        'cuando toco Jugador:',
        '    otro.velocidad.y = 550',
        '    escena.camara.temblar(6, 0.2)',
        '    juego.vidas -= 1',
        '    otro.parpadear(1)',
        '    sonido.efecto("dano")',
        '    si juego.vidas <= 0:',
        '        juego.vidas = 3',
        '        juego.puntos = 0',
        '        escena.reiniciar()',
      ].join('\n'),
    },
    datos: { vidas: 3, puntos: 0 },
  },
  {
    id: 'muelle',
    nombre: 'Muelle',
    categoria: 'Escenario',
    descripcion: 'El jugador que cae encima sale disparado hacia arriba.',
    palabras: 'saltar rebotar trampolin cama elastica',
    objetos: [{ nombre: 'Muelle', sprite: { forma: 'redondeado', ancho: 56, alto: 20, color: '#ff9f45', radioEsquina: 8, borde: 2, colorBorde: '#a35a14' }, colision: {}, script: 'muelle.chs' }],
    scripts: {
      'muelle.chs': [
        '# Muelle: el jugador que cae encima sale disparado hacia arriba.',
        'cuando toco Jugador:',
        '    si otro.y > yo.y:',
        '        otro.velocidad.y = 1100   # cuanto lanza',
        '        sonido.efecto("salto", 1, 1.5)',
        '        # Se aplasta un momento y vuelve a su forma',
        '        yo.escala = vector(1.3, 0.6)',
        '        animar(yo.escala, vector(1, 1), 0.3)',
      ].join('\n'),
    },
  },
  {
    id: 'caja',
    nombre: 'Caja empujable',
    categoria: 'Escenario',
    descripcion: 'Una caja con física que se puede empujar (y en la que subirse).',
    palabras: 'empujar mover puzle bloque madera',
    objetos: [{ nombre: 'Caja', sprite: { forma: 'rectangulo', ancho: 48, alto: 48, color: '#c48a52', relleno: 'patron', patron: 'cuadros', color2: '#b07a45', borde: 3, colorBorde: '#6b4423' }, colision: {}, fisica: { masa: 3, rozamiento: 0.9 } }],
    scripts: {},
  },
  {
    id: 'meta',
    nombre: 'Meta',
    categoria: 'Escenario',
    descripcion: 'Al llegar el jugador, ¡has ganado! (o pasa al siguiente nivel).',
    palabras: 'final ganar bandera nivel salida',
    objetos: [{ nombre: 'Meta', sprite: { forma: 'estrella', ancho: 64, alto: 64, color: '#ffd23f', relleno: 'radial', color2: '#ff9f45', resplandor: '#fff3a0', tamanoResplandor: 18 }, colision: { solido: false }, script: 'meta.chs' }],
    scripts: {
      'meta.chs': [
        '# Meta: al llegar el jugador, has ganado.',
        '# Para pasar a otro nivel, cambia escena.reiniciar() por escena.cambiar("Nivel2").',
        'cuando cada fotograma:',
        '    yo.rotar(60 * delta)',
        '',
        'cuando toco Jugador:',
        '    particulas("confeti", yo.x, yo.y)',
        '    sonido.efecto("subir")',
        '    dialogo("Meta", "¡Has llegado! Puntos: {juego.puntos}")',
        '    escena.reiniciar()',
      ].join('\n'),
    },
    datos: { puntos: 0 },
  },
  {
    id: 'bala',
    nombre: 'Bala',
    categoria: 'Escenario',
    descripcion: 'La plantilla de una bala: créala con crear("Bala", x, y) y dale velocidad. Destruye a los enemigos.',
    palabras: 'disparo proyectil laser plantilla',
    objetos: [],
    scripts: { 'bala.chs': SCRIPT_BALA },
    plantillas: { Bala: BALA },
    datos: { puntos: 0 },
  },
  // ───────────────────────── Interfaz ─────────────────────────
  {
    id: 'boton',
    nombre: 'Botón',
    categoria: 'Interfaz',
    descripcion: 'Un botón pegado a la pantalla que crece con el ratón encima y hace algo al pulsarlo.',
    palabras: 'menu jugar pulsar clic boton',
    objetos: [{ nombre: 'Boton', sprite: { forma: 'redondeado', ancho: 200, alto: 60, color: '#3b82f6', radioEsquina: 14, texto: 'Jugar', tamano: 26, fijo: true, sombra: '#00000066', sombraY: -4, sombraX: 0 }, script: 'boton.chs' }],
    scripts: {
      'boton.chs': [
        '# Boton: crece un poco con el raton encima y hace algo al pulsarlo.',
        'cuando cada fotograma:',
        '    si yo.ratonEncima:',
        '        yo.escala = 1.08',
        '    sino:',
        '        yo.escala = 1',
        '',
        'cuando hago clic encima:',
        '    sonido.efecto("clic")',
        '    # Pon aqui lo que tiene que hacer, por ejemplo: escena.cambiar("Nivel1")',
        '    mostrar("¡Has pulsado el boton!")',
      ].join('\n'),
    },
  },
  {
    id: 'texto-puntos',
    nombre: 'Texto de puntos',
    categoria: 'Interfaz',
    descripcion: 'Enseña los puntos y las vidas arriba a la izquierda; se actualiza solo.',
    palabras: 'marcador puntuacion vidas hud contador',
    objetos: [{ nombre: 'Marcador', x: 0, y: 0, sprite: { forma: 'texto', texto: 'Puntos: {juego.puntos}   Vidas: {juego.vidas}', tamano: 28, color: 'blanco', ancho: 360, alto: 40, fijo: true, alinear: 'izquierda' } }],
    scripts: {},
    datos: { puntos: 0, vidas: 3 },
  },
];

/** Normaliza para buscar: minúsculas y sin tildes. */
const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lo que encaja con la búsqueda (todas las palabras) y la categoría (null = todas). */
export function buscarEnBiblioteca(texto: string, categoria: CategoriaBiblioteca | null = null): ElementoBiblioteca[] {
  const palabras = plano(texto).split(/\s+/).filter(Boolean);
  return BIBLIOTECA.filter((e) => {
    if (categoria && e.categoria !== categoria) return false;
    const donde = plano(`${e.nombre} ${e.descripcion} ${e.palabras} ${e.categoria}`);
    return palabras.every((p) => donde.includes(p));
  });
}
