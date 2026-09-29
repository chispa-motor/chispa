/**
 * Ejemplo mínimo: un solo objeto con un script de Chispa.
 * Sirve para comprobar que el lenguaje funciona dentro del motor.
 * (En la Fase 3D este ejemplo se abrirá en la Zona de Programación.)
 */
import type { DefProyecto } from '../../proyecto/formato';
import cuadrado from './cuadrado.chs?raw';

export const proyectoMinimo: DefProyecto = {
  formato: 'chispa-proyecto',
  version: 2,
  nombre: 'Ejemplo mínimo',
  ancho: 960,
  alto: 540,
  imagenes: {},
  sonidos: {},
  animaciones: {},
  scripts: { 'cuadrado.chs': cuadrado },
  plantillas: {},
  escenas: {
    Principal: {
      colorFondo: '#1e2233',
      objetos: [{ nombre: 'Cuadrado', x: 480, y: 270, sprite: { forma: 'rectangulo', color: 'cian', ancho: 80, alto: 80 }, script: 'cuadrado.chs' }],
    },
  },
  escenaInicial: 'Principal',
};
