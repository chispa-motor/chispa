/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL MÓDULO `tactil`: jugar con el dedo (Chispa 1.2).
 *
 *     cuando empieza:
 *         tactil.joystick()                  # una palanca: mueve como las flechas
 *         tactil.boton("Saltar", "espacio")  # un botón que pulsa la tecla espacio
 *
 * Sirven para cualquier juego: la palanca hace de flechas y cada botón pulsa
 * una tecla, así que el resto del código no cambia (yo.moverConFlechas,
 * «cuando se pulsa "espacio"»...). Solo se ven cuando se juega con el dedo.
 * Lo que hay por debajo está en motor/Tactil.ts.
 */
import { Modulo } from './motor';
import { argNumero, argTexto, comoLogico, comoNumero } from './argumentos';
import { ErrorChispa } from '../errores/ErrorChispa';
import { sugerir } from '../errores/sugerencias';
import type { Posicion } from '../lexico/tokens';
import { aTexto, nombreTipo, type Valor } from '../ejecucion/valores';
import { comprobarNombreTecla } from '../../motor/Entrada';
import { ErrorMotor } from '../../motor/Errores';
import { LETRAS_BOTON, MAXIMO_BOTONES, TAMANO_MAXIMO, TAMANO_MINIMO, type CuandoMostrar, type Tactil } from '../../motor/Tactil';
import { Vector2 } from '../../motor/Vector2';
import { normalizar } from '../../utilidades/texto';

export interface ContextoTactil {
  tactil(): Tactil;
  /** Un punto de la pantalla del juego (píxeles, la Y hacia abajo) → un punto del mundo. */
  aMundo(x: number, y: number): Vector2;
  guardarDato(clave: string, texto: string): void;
  cargarDato(clave: string): string | null;
}

const CLAVE = 'chispa.tactil';
const MOSTRAR: CuandoMostrar[] = ['auto', 'siempre', 'nunca'];

export function crearModuloTactil(ctx: ContextoTactil): Modulo {
  const t = () => {
    const tactil = ctx.tactil();
    // Dónde ha dejado los controles quien juega se guarda con los datos del juego (como guardar y cargar)
    tactil.almacen ??= { leer: () => ctx.cargarDato(CLAVE), guardar: (texto) => ctx.guardarDato(CLAVE, texto) };
    return tactil;
  };
  /** El nombre de un control que existe: "joystick" o un botón. */
  const control = (a: Valor[], i: number, funcion: string, p: Posicion, ej: string): string => {
    const nombre = argTexto(a, i, funcion, p, ej);
    const n = normalizar(nombre);
    if (n === 'joystick' || n === 'palanca') {
      if (!t().conJoystick) throw new ErrorChispa(p, `'${funcion}' habla del joystick, pero no hay ninguno puesto.`, 'Ponlo antes con tactil.joystick() (en «cuando empieza»).');
      return 'joystick';
    }
    if (!t().existe(nombre)) {
      const hay = t().nombres;
      const parecido = sugerir(nombre, hay);
      throw new ErrorChispa(p, `no hay ningún botón en pantalla llamado "${nombre}".`, parecido ? `¿Querías decir "${parecido}"?` : hay.length ? `Los que hay son: ${hay.map((x) => `"${x}"`).join(', ')}.` : 'Todavía no hay ninguno. Ponlo con tactil.boton("Saltar", "espacio").');
    }
    return nombre;
  };
  const nombreDeBoton = (a: Valor[], funcion: string, p: Posicion, ej: string): string => {
    if (a[0] === undefined) throw new ErrorChispa(p, `a '${funcion}' le falta el nombre del botón.`, `Ejemplo: ${ej}`);
    return control(a, 0, funcion, p, ej);
  };

  return new Modulo(
    'tactil',
    {
      hay: { obtener: () => t().hay },
      x: { obtener: () => t().x },
      y: { obtener: () => t().y },
      mirax: { obtener: () => t().miraX },
      miray: { obtener: () => t().miraY },
      gesto: { obtener: () => t().gesto },
      pellizco: { obtener: () => t().pellizco },
      dedos: { obtener: () => t().toques.length },
      toques: { obtener: () => t().toques.map((q) => ctx.aMundo(q.x, q.y)) },
      mostrar: {
        obtener: () => t().mostrar,
        asignar: (v, p) => {
          const m = normalizar(aTexto(v)) as CuandoMostrar;
          if (typeof v !== 'string' || !MOSTRAR.includes(m)) {
            throw new ErrorChispa(p, `'tactil.mostrar' es "auto" (solo cuando se juega con el dedo), "siempre" o "nunca", y le das ${typeof v === 'string' ? `"${v}"` : nombreTipo(v)}.`, 'Ejemplo: tactil.mostrar = "siempre"');
          }
          t().mostrar = m;
        },
      },
      tamano: {
        obtener: () => t().tamano,
        asignar: (v, p) => {
          const n = comoNumero(v, 'tactil.tamano', p);
          if (!(n >= TAMANO_MINIMO && n <= TAMANO_MAXIMO)) throw new ErrorChispa(p, `'tactil.tamano' va de ${TAMANO_MINIMO} (la mitad) a ${TAMANO_MAXIMO} (el doble), y le das ${n}.`, 'Ejemplo: tactil.tamano = 1.3');
          t().tamano = n;
        },
      },
      opacidad: {
        obtener: () => t().opacidad,
        asignar: (v, p) => {
          const n = comoNumero(v, 'tactil.opacidad', p);
          if (!(n >= 0.1 && n <= 1)) throw new ErrorChispa(p, `'tactil.opacidad' va de 0.1 (casi no se ven) a 1 (del todo), y le das ${n}.`, 'Ejemplo: tactil.opacidad = 0.4');
          t().opacidad = n;
        },
      },
    },
    {
      joystick: (a, p) => {
        const ej = 'tactil.joystick("izquierda")';
        let lado: 'izquierda' | 'derecha' = 'izquierda';
        if (a[0] !== undefined) {
          const l = normalizar(argTexto(a, 0, 'tactil.joystick', p, ej));
          if (l !== 'izquierda' && l !== 'derecha') throw new ErrorChispa(p, `el joystick va a la "izquierda" o a la "derecha" de la pantalla, no a "${aTexto(a[0])}".`, `Ejemplo: ${ej}`);
          lado = l;
        }
        // El segundo dato: falso = no pulsa las flechas (solo se lee con tactil.x y tactil.y)
        const flechas = a[1] === undefined ? true : comoLogico(a[1], 'tactil.joystick', p);
        t().joystick(lado, flechas);
        return null;
      },
      boton: (a, p) => {
        const ej = 'tactil.boton("Saltar", "espacio")';
        if (a[0] === undefined) throw new ErrorChispa(p, "a 'tactil.boton' le falta el nombre del botón (lo que se lee en él).", `Ejemplo: ${ej}`);
        const nombre = argTexto(a, 0, 'tactil.boton', p, ej).trim();
        if (!nombre) throw new ErrorChispa(p, 'el nombre del botón no puede estar vacío.', `Ejemplo: ${ej}`);
        if ([...nombre].length > LETRAS_BOTON) throw new ErrorChispa(p, `el nombre de un botón tiene ${LETRAS_BOTON} letras como mucho (no cabe más), y "${nombre}" tiene ${[...nombre].length}.`, `Ejemplo: ${ej}`);
        if (normalizar(nombre) === 'joystick') throw new ErrorChispa(p, 'un botón no se puede llamar "joystick": ese nombre es de la palanca.', 'Para poner la palanca: tactil.joystick()');
        // Las teclas que pulsa (ninguna = solo se pregunta con tactil.pulsado)
        const teclas: string[] = [];
        for (let i = 1; i < a.length; i++) {
          const tecla = argTexto(a, i, 'tactil.boton', p, ej);
          try {
            teclas.push(comprobarNombreTecla(tecla));
          } catch (e) {
            if (e instanceof ErrorMotor) throw new ErrorChispa(p, `el botón "${nombre}" no puede pulsar la tecla "${tecla}": no la conozco.`, e.pista ?? `Ejemplo: ${ej}`);
            throw e;
          }
        }
        if (!t().boton(nombre, teclas)) throw new ErrorChispa(p, `en la pantalla caben ${MAXIMO_BOTONES} botones como mucho, y "${nombre}" ya no cabe.`, 'Quita alguno con tactil.quitar("nombre"). Si esto está en «cuando cada fotograma», ponlo en «cuando empieza».');
        return null;
      },
      pulsado: (a, p) => t().pulsado(nombreDeBoton(a, 'tactil.pulsado', p, 'si tactil.pulsado("Fuego"):')),
      sepulso: (a, p) => t().sePulso(nombreDeBoton(a, 'tactil.sePulso', p, 'si tactil.sePulso("Fuego"):')),
      sesolto: (a, p) => t().seSolto(nombreDeBoton(a, 'tactil.seSolto', p, 'si tactil.seSolto("Fuego"):')),
      mirar: (a, p) => {
        t().mirar(a[0] === undefined ? true : comoLogico(a[0], 'tactil.mirar', p));
        return null;
      },
      mover: (a, p) => {
        const ej = 'tactil.mover("Saltar", 85, 20)';
        if (a.length < 3) throw new ErrorChispa(p, "'tactil.mover' necesita el nombre del control y dónde va: de 0 a 100 de izquierda a derecha, y de 0 a 100 de abajo arriba.", `Ejemplo: ${ej}`);
        const nombre = control(a, 0, 'tactil.mover', p, ej);
        const x = argNumero(a, 1, 'tactil.mover', p, ej);
        const y = argNumero(a, 2, 'tactil.mover', p, ej);
        if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) throw new ErrorChispa(p, `el sitio de un control va de 0 a 100 (es un tanto por ciento de la pantalla), y le das ${x} y ${y}.`, `Ejemplo: ${ej}  (85 = casi a la derecha, 20 = cerca de abajo)`);
        t().mover(nombre, x, y);
        return null;
      },
      quitar: (a, p) => {
        if (a[0] === undefined) t().quitar();
        else t().quitar(control(a, 0, 'tactil.quitar', p, 'tactil.quitar("Saltar")'));
        return null;
      },
      colocar: (a, p) => {
        t().colocar(a[0] === undefined ? true : comoLogico(a[0], 'tactil.colocar', p));
        return null;
      },
      vibrar: (a, p) => {
        const ej = 'tactil.vibrar(0.2)';
        const segundos = argNumero(a, 0, 'tactil.vibrar', p, ej, 0.1);
        if (!(segundos >= 0 && segundos <= 5)) throw new ErrorChispa(p, `se puede vibrar de 0 a 5 segundos, y le das ${segundos}.`, `Ejemplo: ${ej}`);
        return t().vibrar(segundos);
      },
    },
    ['hay', 'x', 'y', 'miraX', 'miraY', 'gesto', 'pellizco', 'dedos', 'toques', 'mostrar', 'tamano', 'opacidad', 'joystick', 'boton', 'pulsado', 'sePulso', 'seSolto', 'mirar', 'mover', 'quitar', 'colocar', 'vibrar'],
  );
}
