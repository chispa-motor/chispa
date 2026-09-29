/**
 * Proyecto del juego de ejemplo: un plataformas pequeño.
 *
 * TODA la lógica está en los archivos .chs (Chispa). Aquí solo se describe
 * qué objetos hay y qué aspecto tienen, igual que hará el editor de la Fase 4.
 * `?raw` le dice a Vite: "dame el contenido del archivo como texto".
 */
import type { DefProyecto } from '../../proyecto/Proyecto';
import nivel from './nivel.chs?raw';
import jugador from './jugador.chs?raw';
import enemigo from './enemigo.chs?raw';
import moneda from './moneda.chs?raw';
import nube from './nube.chs?raw';
import marcador from './marcador.chs?raw';
import mensaje from './mensaje.chs?raw';

export const proyectoPlataformas: DefProyecto = {
  formato: 'chispa-proyecto',
  version: 1,
  nombre: 'Plataformas',
  ancho: 960,
  alto: 540,
  colorFondo: '#8fd3ff',
  imagenes: {
    jugador: 'imagenes/jugador.svg',
    enemigo: 'imagenes/enemigo.svg',
    moneda: 'imagenes/moneda.svg',
    cesped: 'imagenes/cesped.svg',
    tierra: 'imagenes/tierra.svg',
    pinchos: 'imagenes/pinchos.svg',
    bandera: 'imagenes/bandera.svg',
    nube: 'imagenes/nube.svg',
  },
  scripts: {
    'nivel.chs': nivel,
    'jugador.chs': jugador,
    'enemigo.chs': enemigo,
    'moneda.chs': moneda,
    'nube.chs': nube,
    'marcador.chs': marcador,
    'mensaje.chs': mensaje,
  },
  plantillas: {
    Cesped: { sprite: { imagen: 'cesped', ancho: 48, alto: 48 }, colision: {} },
    Tierra: { sprite: { imagen: 'tierra', ancho: 48, alto: 48 }, colision: {} },
    Moneda: {
      sprite: { imagen: 'moneda', ancho: 28, alto: 28, capa: 1 },
      // Ancho fijo en la colisión: el script cambia el ancho del DIBUJO para que parezca que gira
      colision: { ancho: 28, alto: 28, solido: false },
      script: 'moneda.chs',
    },
    Enemigo: {
      sprite: { imagen: 'enemigo', ancho: 44, alto: 36, capa: 2 },
      colision: { ancho: 40, alto: 34 },
      fisica: {},
      script: 'enemigo.chs',
    },
    Pinchos: {
      sprite: { imagen: 'pinchos', ancho: 48, alto: 48 },
      colision: { ancho: 40, alto: 20, desplazamientoY: 12, solido: false },
    },
    // Sin sprite: es invisible
    Limite: { colision: { ancho: 48, alto: 48, solido: false } },
    Bandera: { sprite: { imagen: 'bandera', ancho: 48, alto: 96, capa: 1 }, colision: { ancho: 24, alto: 96, solido: false } },
    Jugador: {
      sprite: { imagen: 'jugador', ancho: 40, alto: 46, capa: 3 },
      colision: { ancho: 30, alto: 44 },
      fisica: {},
      script: 'jugador.chs',
    },
    Nube: { sprite: { imagen: 'nube', ancho: 120, alto: 60, capa: -5, opacidad: 0.85 }, script: 'nube.chs' },
  },
  escena: [
    { nombre: 'Nivel', script: 'nivel.chs' },
    { nombre: 'Marcador', x: 20, y: 16, sprite: { forma: 'texto', fijo: true, capa: 10, tamano: 26 }, script: 'marcador.chs' },
    {
      nombre: 'Mensaje',
      x: 480,
      y: 210,
      sprite: { forma: 'texto', fijo: true, capa: 10, tamano: 52, color: 'amarillo', alinear: 'centro' },
      script: 'mensaje.chs',
    },
  ],
};
