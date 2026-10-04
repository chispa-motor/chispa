/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL MÓDULO `vista3d`: ver el juego en PRIMERA PERSONA (3D simulado).
 *
 *     cuando empieza:
 *         vista3d.ver(yo)                    # el mundo, desde mis ojos
 *         vista3d.niebla("negro", 200, 900)  # lo lejano se pierde en la niebla
 *
 * El juego es el de siempre, visto desde arriba: un mapa de casillas (las
 * sólidas son paredes), objetos con su dibujo, física sin gravedad. Lo único
 * que cambia es cómo se mira. Se gira con yo.rotacion y se anda con yo.mover.
 * Lo que hay por debajo está en objetos/Vista3D.ts y motor/Raycaster.ts.
 */
import { Modulo } from './motor';
import { argNumero, argTexto, comoNumero } from './argumentos';
import { RefObjeto, referencia } from './objetos';
import { ErrorChispa } from '../errores/ErrorChispa';
import { sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import { nombreTipo, type Valor } from '../ejecucion/valores';
import { esColorValido } from '../../motor/Color';
import { Vector2 } from '../../motor/Vector2';
import { MapaCasillas } from '../../objetos/componentes/MapaCasillas';
import type { Escena } from '../../objetos/Escena';
import type { ObjetoJuego } from '../../objetos/ObjetoJuego';
import { CAMPO_MAXIMO, CAMPO_MINIMO } from '../../objetos/Vista3D';

export interface ContextoVista3D {
  escena(): Escena;
  /** El objeto del script que está hablando (para vista3d.ver() sin decir cuál). */
  yo(): ObjetoJuego | null;
  /** Las imágenes del proyecto que están cargadas. */
  hayImagen(nombre: string): boolean;
  imagenes(): string[];
}

/** Columnas de la pantalla 3D que se pueden pedir a mano. */
export const COLUMNAS_MINIMAS = 64;
export const COLUMNAS_MAXIMAS = 1280;

export function crearModuloVista3D(ctx: ContextoVista3D): Modulo {
  const v = () => ctx.escena().vista3d;

  const numeroEntre = (valor: Valor, nombre: string, min: number, max: number, p: Posicion, ejemplo: string, explica: string): number => {
    const n = comoNumero(valor, `vista3d.${nombre}`, p);
    if (!(n >= min && n <= max)) throw new ErrorChispa(p, `'vista3d.${nombre}' va de ${min} a ${max} (${explica}), y le das ${n}.`, `Ejemplo: ${ejemplo}`);
    return n;
  };

  /** Un valor que es una imagen del proyecto o un color: dice cuál de los dos. */
  const imagenOColor = (a: Valor[], funcion: string, p: Posicion, ej: string): { imagen: string | null; color: string | null } => {
    if (a[0] === undefined) throw new ErrorChispa(p, `a '${funcion}' le falta la imagen o el color.`, `Ejemplo: ${ej}`);
    const texto = argTexto(a, 0, funcion, p, ej);
    if (ctx.hayImagen(texto)) return { imagen: texto, color: null };
    if (esColorValido(texto)) return { imagen: null, color: texto };
    const parecida = sugerir(texto, ctx.imagenes());
    throw new ErrorChispa(p, `"${texto}" no es una imagen del proyecto ni un color.`, parecida ? `¿Querías decir "${parecida}"?` : `Ejemplo: ${ej}  (o un color: "gris", "#334455")`);
  };

  const unaImagen = (a: Valor[], i: number, funcion: string, p: Posicion, ej: string): string => {
    const nombre = argTexto(a, i, funcion, p, ej);
    if (!ctx.hayImagen(nombre)) {
      const parecida = sugerir(nombre, ctx.imagenes());
      throw new ErrorChispa(p, `no hay ninguna imagen llamada "${nombre}" en el proyecto.`, parecida ? `¿Querías decir "${parecida}"?` : ctx.imagenes().length ? `Las que hay: ${ctx.imagenes().slice(0, 12).join(', ')}.` : 'Importa una en Proyecto > Imágenes.');
    }
    return nombre;
  };

  /** Un objeto (su posición y su altura de en medio) o un vector. */
  const punto = (a: Valor[], funcion: string, p: Posicion, ej: string): { x: number; y: number; z: number; objeto: ObjetoJuego | null } => {
    const que = a[0];
    const mapa = v().mapa(ctx.escena());
    const medio = (mapa?.tamano ?? 48) / 2;
    if (que instanceof RefObjeto) return { x: que.objeto.posicion.x, y: que.objeto.posicion.y, z: a[1] === undefined ? que.objeto.elevacion + medio : argNumero(a, 1, funcion, p, ej), objeto: que.objeto };
    if (que instanceof Vector2) return { x: que.x, y: que.y, z: argNumero(a, 1, funcion, p, ej, medio), objeto: null };
    throw new ErrorChispa(p, `'${funcion}' necesita un objeto o una posición, y le das ${que === undefined ? 'nada' : nombreTipo(que)}.`, `Ejemplo: ${ej}`);
  };

  return new Modulo(
    'vista3d',
    {
      activa: { obtener: () => v().activa },
      observador: { obtener: () => (v().activa ? referencia(v().observador!) : null) },
      campo: {
        obtener: () => v().campo,
        asignar: (x, p) => void (v().campo = numeroEntre(x, 'campo', CAMPO_MINIMO, CAMPO_MAXIMO, p, 'vista3d.campo = 75', 'los grados que se ven a lo ancho')),
      },
      altura: {
        obtener: () => v().altura,
        asignar: (x, p) => void (v().altura = numeroEntre(x, 'altura', 0.05, 0.95, p, 'vista3d.altura = 0.3', '0 = los ojos en el suelo, 1 = en el techo')),
      },
      inclinacion: {
        obtener: () => v().inclinacion,
        asignar: (x, p) => void (v().inclinacion = numeroEntre(x, 'inclinacion', -1, 1, p, 'vista3d.inclinacion = 0.2', 'negativo = mirar abajo, positivo = mirar arriba')),
      },
      brillo: {
        obtener: () => v().brillo,
        asignar: (x, p) => void (v().brillo = numeroEntre(x, 'brillo', 0, 3, p, 'vista3d.brillo = 1.5', '1 = normal, 0 = a oscuras')),
      },
      columnas: {
        obtener: () => v().raycaster.ancho || v().columnas,
        asignar: (x, p) => {
          const n = comoNumero(x, 'vista3d.columnas', p);
          if (n !== 0 && !(n >= COLUMNAS_MINIMAS && n <= COLUMNAS_MAXIMAS)) throw new ErrorChispa(p, `'vista3d.columnas' va de ${COLUMNAS_MINIMAS} a ${COLUMNAS_MAXIMAS} (0 = las que diga pantalla.calidad), y le das ${n}.`, 'Ejemplo: vista3d.columnas = 320  (menos columnas = más rápido y más «pixelado»)');
          v().columnas = Math.round(n);
        },
      },
      milisegundos: { obtener: () => Math.round(v().milisegundos * 10) / 10 },
    },
    {
      ver: (a, p) => {
        const ej = 'vista3d.ver(yo)';
        let o: ObjetoJuego | null;
        if (a[0] === undefined) o = ctx.yo();
        else if (a[0] instanceof RefObjeto) o = a[0].objeto;
        else throw new ErrorChispa(p, `'vista3d.ver' necesita el objeto desde el que se mira, y le das ${nombreTipo(a[0])}.`, `Ejemplo: ${ej}`);
        if (!o) throw new ErrorChispa(p, "a 'vista3d.ver' le falta el objeto desde el que se mira.", `Ejemplo: ${ej}`);
        if (!v().mapa(ctx.escena())) throw new ErrorChispa(p, 'para ver en primera persona hace falta un mapa de casillas en la escena: sus casillas sólidas son las paredes.', 'Añádelo en el editor: Añadir > Mapa de casillas, y pinta las paredes.');
        v().observador = o;
        return null;
      },
      quitar: () => {
        v().observador = null;
        return null;
      },
      mapa: (a, p) => {
        const ej = 'vista3d.mapa(buscar("Mapa"))';
        if (!(a[0] instanceof RefObjeto)) throw new ErrorChispa(p, `'vista3d.mapa' necesita el objeto del mapa de casillas, y le das ${a[0] === undefined ? 'nada' : nombreTipo(a[0])}.`, `Ejemplo: ${ej}`);
        if (!a[0].objeto.obtener(MapaCasillas)) throw new ErrorChispa(p, `'${a[0].objeto.nombre}' no es un mapa de casillas.`, `Ejemplo: ${ej}`);
        v().mapaElegido = a[0].objeto;
        return null;
      },
      suelo: (a, p) => {
        const r = imagenOColor(a, 'vista3d.suelo', p, 'vista3d.suelo("baldosa")');
        v().suelo = { imagen: r.imagen, color: r.color ?? v().suelo.color };
        return null;
      },
      techo: (a, p) => {
        const r = imagenOColor(a, 'vista3d.techo', p, 'vista3d.techo("#222233")');
        v().techo = { imagen: r.imagen, color: r.color ?? v().techo.color };
        v().cielo = null;
        return null;
      },
      cielo: (a, p) => {
        v().cielo = a[0] === undefined || a[0] === null ? null : unaImagen(a, 0, 'vista3d.cielo', p, 'vista3d.cielo("nubes")');
        return null;
      },
      pared: (a, p) => {
        const ej = 'vista3d.pared("muro", "ladrillo")';
        if (a.length < 2) throw new ErrorChispa(p, "'vista3d.pared' necesita el tipo de casilla y la imagen con la que se pinta.", `Ejemplo: ${ej}`);
        const tipo = argTexto(a, 0, 'vista3d.pared', p, ej);
        const m = v().mapa(ctx.escena());
        const existe = m?.tipoExistente(tipo);
        if (!existe) {
          const hay = Object.keys(m?.tipos ?? {});
          const parecido = sugerir(tipo, hay);
          throw new ErrorChispa(p, `el mapa no tiene ningún tipo de casilla llamado "${tipo}".`, parecido ? `¿Querías decir "${parecido}"?` : hay.length ? `Los tipos del mapa: ${hay.join(', ')}.` : 'Añade un mapa de casillas a la escena.');
        }
        v().imagenDeTipo.set(existe.toLowerCase(), unaImagen(a, 1, 'vista3d.pared', p, ej));
        return null;
      },
      niebla: (a, p) => {
        const ej = 'vista3d.niebla("negro", 200, 900)';
        if (a[0] === undefined || a[0] === null || a[0] === false) {
          v().niebla = null;
          return null;
        }
        const color = argTexto(a, 0, 'vista3d.niebla', p, ej);
        if (!esColorValido(color)) throw new ErrorChispa(p, `no conozco el color "${color}".`, `Ejemplo: ${ej}`);
        const desde = argNumero(a, 1, 'vista3d.niebla', p, ej, 150);
        const hasta = argNumero(a, 2, 'vista3d.niebla', p, ej, 900);
        if (!(desde >= 0 && hasta > desde && hasta <= 100000)) throw new ErrorChispa(p, `la niebla va de una distancia a otra MAYOR (en píxeles), y le das de ${desde} a ${hasta}.`, `Ejemplo: ${ej}  (a 200 píxeles empieza a notarse y a 900 ya no se ve nada)`);
        v().niebla = { color, desde, hasta };
        return null;
      },
      enpantalla: (a, p) => {
        const q = punto(a, 'vista3d.enPantalla', p, 'vista3d.enPantalla(buscar("Enemigo"))');
        const r = v().enPantalla(q.x, q.y, q.z);
        return r ? new Vector2(r.x, r.y) : null;
      },
      seve: (a, p) => {
        const q = punto(a, 'vista3d.seVe', p, 'si vista3d.seVe(buscar("Enemigo")):');
        const r = v().enPantalla(q.x, q.y, q.z);
        if (!r || r.tapado) return false;
        const e = ctx.escena().motor.renderizador;
        return r.x >= 0 && r.x <= e.ancho;
      },
    },
    ['activa', 'observador', 'campo', 'altura', 'inclinacion', 'brillo', 'columnas', 'milisegundos', 'ver', 'quitar', 'mapa', 'suelo', 'techo', 'cielo', 'pared', 'niebla', 'enPantalla', 'seVe'],
  );
}
