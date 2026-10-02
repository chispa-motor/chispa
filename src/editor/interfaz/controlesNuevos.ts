/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * LOS CONTROLES DE INTERFAZ QUE SE AÑADEN DESDE EL EDITOR: con qué nombre,
 * tamaño, colores y datos nace cada uno. Todos van pegados a la pantalla
 * (son interfaz) y se pueden cambiar luego en el inspector.
 */
import type { TipoControl } from '../../objetos/componentes/Control';
import type { DefObjeto } from '../../proyecto/formato';

const AZUL = '#3b82f6';
const ORO = '#f1c40f';

export const CONTROLES_NUEVOS: Record<TipoControl, { nombre: string; texto: string; ayuda: string; def: DefObjeto }> = {
  boton: {
    nombre: 'Boton', texto: 'Botón', ayuda: 'Un botón: se ilumina al pasar el ratón y se hunde al pulsarlo. En su script: cuando hago clic encima:',
    def: { sprite: { color: AZUL, ancho: 180, alto: 56, texto: 'Botón', tamano: 24, fijo: true }, control: { tipo: 'boton' } },
  },
  barra: {
    nombre: 'Barra', texto: 'Barra', ayuda: 'Una barra de vida o de energía. Puede leer sola un dato (juego.vida) o cambiarse con yo.valor',
    def: { sprite: { color: '#e74c3c', ancho: 220, alto: 22, tamano: 14, fijo: true }, control: { tipo: 'barra', maximo: 100, valor: 100 } },
  },
  campo: {
    nombre: 'Campo', texto: 'Campo de texto', ayuda: 'Un sitio donde quien juega escribe (su nombre, una respuesta...). Lo escrito está en yo.valor',
    def: { sprite: { color: AZUL, ancho: 240, alto: 40, tamano: 20, fijo: true }, control: { tipo: 'campo', pista: 'Escribe aquí', largoMaximo: 20 } },
  },
  deslizador: {
    nombre: 'Deslizador', texto: 'Deslizador', ayuda: 'Para elegir un número arrastrando (el volumen, la dificultad...). Su número está en yo.valor',
    def: { sprite: { color: AZUL, ancho: 220, alto: 24, fijo: true }, control: { tipo: 'deslizador', minimo: 0, maximo: 100, valor: 50, paso: 1 } },
  },
  casilla: {
    nombre: 'Casilla', texto: 'Casilla', ayuda: 'Para marcar o desmarcar (sonido sí/no, pantalla completa...). yo.valor es verdadero o falso',
    def: { sprite: { color: AZUL, ancho: 220, alto: 28, texto: 'Casilla', tamano: 20, fijo: true }, control: { tipo: 'casilla' } },
  },
  lista: {
    nombre: 'Lista', texto: 'Lista', ayuda: 'Una lista para elegir una opción (con la rueda del ratón si no caben todas). La elegida está en yo.valor',
    def: { sprite: { color: AZUL, ancho: 220, alto: 150, tamano: 18, fijo: true }, control: { tipo: 'lista', opciones: ['Uno', 'Dos', 'Tres'], elegido: 1 } },
  },
  menu: {
    nombre: 'Menu', texto: 'Menú', ayuda: 'Un menú de opciones: con el ratón, o con las flechas e Intro. En su script: cuando cambia: (yo.valor es la opción)',
    def: { sprite: { color: AZUL, ancho: 260, alto: 144, tamano: 26, fijo: true }, control: { tipo: 'menu', opciones: ['Jugar', 'Opciones', 'Salir'], elegido: 1 } },
  },
  ventana: {
    nombre: 'Ventana', texto: 'Ventana', ayuda: 'Un panel con título para meter cosas dentro: lo que se ponga como hijo suyo (yo.pegarA) se mueve, se abre y se cierra con ella',
    def: { sprite: { color: AZUL, ancho: 360, alto: 240, tamano: 20, fijo: true, capa: -1 }, control: { tipo: 'ventana', titulo: 'Ventana', conCerrar: true, arrastrable: true } },
  },
  inventario: {
    nombre: 'Inventario', texto: 'Inventario', ayuda: 'Casillas para guardar cosas: yo.meter("llave"), yo.sacar("llave"), yo.cuantos("llave"). Si hay una imagen con ese nombre, se ve',
    def: { sprite: { color: ORO, ancho: 280, alto: 140, tamano: 18, fijo: true }, control: { tipo: 'inventario', columnas: 4, filas: 2 } },
  },
  minimapa: {
    nombre: 'Minimapa', texto: 'Minimapa', ayuda: 'El mundo en pequeño: las casillas sólidas, los objetos como puntos y lo que ve la cámara',
    def: { sprite: { color: ORO, ancho: 200, alto: 130, fijo: true }, control: { tipo: 'minimapa' } },
  },
  icono: {
    nombre: 'Icono', texto: 'Icono con contador', ayuda: 'Un dibujo con un número al lado (monedas, llaves, vidas). Puede leer solo un dato (juego.monedas)',
    def: { sprite: { color: ORO, ancho: 36, alto: 36, texto: '×', tamano: 24, fijo: true }, control: { tipo: 'icono', valor: 0 } },
  },
};
