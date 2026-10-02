/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: CC0-1.0 (las plantillas son de dominio público: ver LICENCIA.md)
 */

/** PLANTILLA «Vista desde arriba»: una cueva oscura con fantasmas, una llave, tres gemas y un cofre. */
import type { DefProyecto } from '../../proyecto/formato';
import { figura, mapa, proyectoBase, recursos, sitiosDeTexto } from '../ayudas';
import jugador from './jugador.chs?raw';

// P piedra (pared) · A agua (no se pasa) · lo demás es suelo
// J jugador · g gema · k llave · f fantasma · C cofre
const NIVEL = [
  'PPPPPPPPPPPPPPPPPPPPPPPP',
  'P..........P...........P',
  'P.J........P.....g.....P',
  'P..........P...........P',
  'P....PPP...P...AAAA....P',
  'P......................P',
  'P...k..........AAAA..f.P',
  'P.........PPPP.........P',
  'PPPP..PPPPP..P.........P',
  'P.........P..PPPPPP..PPP',
  'P..g..f...P............P',
  'P.........P......C...g.P',
  'PPPPPPPPPPPPPPPPPPPPPPPP',
];

export function aventura(): DefProyecto {
  const en = (letra: string) => sitiosDeTexto(NIVEL, letra);
  return {
    ...proyectoBase('Mi aventura'),
    ...recursos(['heroina', 'fantasma', 'gema', 'llave', 'cofre', 'corazon', 'piedra', 'agua', 'tierra'], ['moneda', 'powerup', 'herida', 'ganar'], ['misterio']),
    scripts: { 'jugador.chs': jugador },
    datos: { vidas: 3 },
    escenaInicial: 'Cueva',
    escenas: {
      Cueva: {
        colorFondo: '#1a1423',
        // Vista desde arriba: sin gravedad. Y a oscuras: solo se ve lo que alumbra una luz
        gravedad: 0,
        oscuridad: 0.75,
        luzAmbiente: '#0a1030',
        camara: { seguir: 'Jugador', limitarAlMapa: true },
        objetos: [
          mapa(NIVEL, { P: 'piedra', A: 'agua' }, {
            suelo: { imagen: 'tierra', solida: false },
            piedra: { imagen: 'piedra', solida: true },
            agua: { imagen: 'agua', solida: true },
          }, -1, 'suelo'),
          ...en('g').map((p, i) => figura(`Gema${i + 1}`, 'gema', p.x, p.y, { colision: { solido: false, ancho: 28, alto: 28 }, luz: { color: 'cian', radio: 90, intensidad: 0.8 } }, { ancho: 32, alto: 32 })),
          ...en('k').map((p) => figura('Llave', 'llave', p.x, p.y, { colision: { solido: false, ancho: 28, alto: 28 }, luz: { color: 'amarillo', radio: 90, intensidad: 0.8 } }, { ancho: 32, alto: 32 })),
          ...en('C').map((p) => figura('Cofre', 'cofre', p.x, p.y, { colision: {}, fisica: { estatico: true }, luz: { color: 'naranja', radio: 120, parpadeo: 0.4 } })),
          // Los fantasmas persiguen al jugador cuando lo tienen cerca (su «comportamiento») y atraviesan las paredes
          ...en('f').map((p, i) => figura(`Fantasma${i + 1}`, 'fantasma', p.x, p.y, { colision: { solido: false, ancho: 34, alto: 34 }, comportamiento: { tipo: 'perseguir', objetivo: 'Jugador', rapidez: 75, distancia: 260 }, luz: { color: '#b388ff', radio: 70, intensidad: 0.6 } }, { opacidad: 0.85 })),
          ...en('J').map((p) => figura('Jugador', 'heroina', p.x, p.y, { colision: { ancho: 30, alto: 36 }, fisica: { gravedad: 0, rozamiento: 0 }, luz: { radio: 230, sombras: true }, script: 'jugador.chs' }, { capa: 3 })),
          // La interfaz: las vidas (lee sola juego.vidas) y la mochila
          { nombre: 'Vidas', x: 40, y: 506, sprite: { imagen: 'corazon', color: 'blanco', ancho: 36, alto: 36, texto: '×', tamano: 24, fijo: true, capa: 20, letra: 'pixel' }, control: { tipo: 'icono', dato: 'juego.vidas' } },
          { nombre: 'Inventario', x: 860, y: 494, sprite: { color: '#f1c40f', ancho: 176, alto: 64, tamano: 16, fijo: true, capa: 20 }, control: { tipo: 'inventario', columnas: 3, filas: 1 } },
        ],
      },
    },
  };
}
