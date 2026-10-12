/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * TESTS DEL SERVIDOR DE SALAS (su lógica, sin Cloudflare) y de los códigos y nombres de las salas.
 * La prueba con el servidor de verdad está en servidor-salas/probar-salas.mjs.
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import { CIERRE as CIERRE_SERVIDOR, LIMITES, LogicaSala, MENSAJE as MENSAJE_SERVIDOR, MOTIVOS as MOTIVOS_SERVIDOR, ORDEN as ORDEN_SERVIDOR, codigoValido, type Conexion } from '../servidor-salas/src/logica';
import { ALFABETO_CODIGO, ANIMALES, CIERRE, COLORES, LARGO_CODIGO, MENSAJE, ORDEN, colorSeguro, leerCodigo, mostrarCodigo, nombreAlAzar, nombreSeguro, nuevaClave, nuevoCodigo } from '../src/colaborar/sala';

/** Un editor de mentira conectado a la sala. */
function conexion(id: string, opciones: { dueno?: boolean; aparato?: string } = {}) {
  const recibido: Uint8Array[] = [];
  const c: Conexion & { recibido: Uint8Array[]; cerradoCon: number | null; doc: Y.Doc } = {
    id,
    dueno: opciones.dueno ?? false,
    aparato: opciones.aparato ?? `aparato${id}xxxxxxxxxxxx`,
    clientes: new Set(),
    recibido,
    cerradoCon: null,
    doc: new Y.Doc(),
    enviar: (d) => recibido.push(d),
    cerrar: (codigo) => (c.cerradoCon = codigo),
  };
  return c;
}
/** Aplica a su documento lo que la sala le ha mandado (como haría y-websocket). */
function leer(c: ReturnType<typeof conexion>, sala: LogicaSala) {
  for (const m of c.recibido.splice(0)) {
    const d = decoding.createDecoder(m);
    if (decoding.readVarUint(d) !== 0) continue;
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, 0);
    syncProtocol.readSyncMessage(d, e, c.doc, 'sala');
    if (encoding.length(e) > 1) sala.recibir(c, encoding.toUint8Array(e));
  }
}
/** Lo primero que hace un editor al conectarse: «esto es lo que tengo» (y la sala le manda lo que le falta). */
function pedir(c: ReturnType<typeof conexion>, sala: LogicaSala) {
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, 0);
  syncProtocol.writeSyncStep1(e, c.doc);
  sala.recibir(c, encoding.toUint8Array(e));
  leer(c, sala);
}
function mandarCambio(c: ReturnType<typeof conexion>, sala: LogicaSala, fn: () => void) {
  const antes = Y.encodeStateVector(c.doc);
  c.doc.transact(fn);
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, 0);
  syncProtocol.writeUpdate(e, Y.encodeStateAsUpdate(c.doc, antes));
  sala.recibir(c, encoding.toUint8Array(e));
}
function orden(c: Conexion, sala: LogicaSala, ...n: number[]) {
  const e = encoding.createEncoder();
  encoding.writeVarUint(e, 60);
  for (const x of n) encoding.writeVarUint(e, x);
  sala.recibir(c, encoding.toUint8Array(e));
}

describe('La sala (servidor)', () => {
  it('junta lo que manda cada uno y se lo pasa a los demás', () => {
    const sala = new LogicaSala();
    const ana = conexion('a', { dueno: true });
    const beto = conexion('b');
    expect(sala.entrar(ana)).toBeNull();
    leer(ana, sala);
    mandarCambio(ana, sala, () => ana.doc.getMap('proyecto').set('nombre', 'Juego'));
    expect(sala.entrar(beto)).toBeNull();
    pedir(beto, sala);
    expect(beto.doc.getMap('proyecto').get('nombre')).toBe('Juego');
    mandarCambio(beto, sala, () => beto.doc.getMap('proyecto').set('ancho', 800));
    leer(ana, sala);
    expect(ana.doc.getMap('proyecto').get('ancho')).toBe(800);
    expect(sala.sucio).toBe(true);
  });

  it('el proyecto guardado se recupera al volver a montar la sala', () => {
    const sala = new LogicaSala();
    const ana = conexion('a', { dueno: true });
    sala.entrar(ana);
    leer(ana, sala);
    mandarCambio(ana, sala, () => ana.doc.getMap('proyecto').set('nombre', 'Guardado'));
    const otra = new LogicaSala(sala.estado());
    expect(otra.doc.getMap('proyecto').get('nombre')).toBe('Guardado');
  });

  it('solo el dueño puede echar, bloquear y cerrar', () => {
    const sala = new LogicaSala();
    const ana = conexion('a', { dueno: true });
    const beto = conexion('b');
    sala.entrar(ana);
    sala.entrar(beto);
    beto.clientes.add(1234);
    ana.clientes.add(99);
    // Beto intenta echar a Ana y cerrar la sala: no puede
    orden(beto, sala, ORDEN_SERVIDOR.echar, 99);
    orden(beto, sala, ORDEN_SERVIDOR.cerrar);
    expect(ana.cerradoCon).toBeNull();
    expect(sala.cerrada).toBe(false);
    // Ana echa a Beto: fuera, y no puede volver desde ese aparato
    orden(ana, sala, ORDEN_SERVIDOR.echar, 1234);
    expect(beto.cerradoCon).toBe(CIERRE_SERVIDOR.echado);
    expect(sala.entrar(conexion('b2', { aparato: beto.aparato }))).toBe(CIERRE_SERVIDOR.echado);
    // Candado
    orden(ana, sala, ORDEN_SERVIDOR.bloquear, 1);
    expect(sala.entrar(conexion('c'))).toBe(CIERRE_SERVIDOR.bloqueada);
    orden(ana, sala, ORDEN_SERVIDOR.bloquear, 0);
    expect(sala.entrar(conexion('d'))).toBeNull();
    // Cerrar: todos fuera
    orden(ana, sala, ORDEN_SERVIDOR.cerrar);
    expect(sala.cerrada).toBe(true);
    expect(ana.cerradoCon).toBe(CIERRE_SERVIDOR.cerrada);
  });

  it('no deja entrar a más de 12, ni mensajes enormes o raros', () => {
    const sala = new LogicaSala();
    for (let i = 0; i < LIMITES.conexiones; i++) expect(sala.entrar(conexion(`p${i}`))).toBeNull();
    expect(sala.entrar(conexion('sobra'))).toBe(CIERRE_SERVIDOR.llena);
    const raro = [...sala.conexiones.values()][0] as ReturnType<typeof conexion>;
    sala.recibir(raro, new Uint8Array([0, 7, 7]));
    expect(raro.cerradoCon).toBe(CIERRE_SERVIDOR.mensajeRaro);
    const grande = [...sala.conexiones.values()][0] as ReturnType<typeof conexion>;
    sala.recibir(grande, new Uint8Array(LIMITES.mensaje + 1));
    expect(grande.cerradoCon).toBe(CIERRE_SERVIDOR.demasiadoGrande);
  });

  it('un proyecto demasiado grande no entra en la sala', () => {
    const sala = new LogicaSala();
    const ana = conexion('a', { dueno: true });
    sala.entrar(ana);
    leer(ana, sala);
    // Trozos de 4,5 MB (cada mensaje cabe), hasta pasarse de lo que puede ocupar un proyecto
    const trozo = 'x'.repeat(4_500_000);
    let i = 0;
    while (ana.cerradoCon === null && i < 10) mandarCambio(ana, sala, () => ana.doc.getMap('proyecto').set(`imagen${i++}`, trozo));
    expect(ana.cerradoCon).toBe(CIERRE_SERVIDOR.demasiadoGrande);
    expect(i).toBe(Math.floor(LIMITES.documento / 4_500_000) + 1);
    expect(Y.encodeStateAsUpdate(sala.doc).byteLength).toBeLessThanOrEqual(LIMITES.documento);
  });

  it('el editor y el servidor usan los mismos números', () => {
    expect(CIERRE).toEqual(CIERRE_SERVIDOR);
    expect(ORDEN).toEqual(ORDEN_SERVIDOR);
    expect(MENSAJE.orden).toBe(MENSAJE_SERVIDOR.orden);
    expect(MENSAJE.aviso).toBe(MENSAJE_SERVIDOR.aviso);
    for (const codigo of Object.values(CIERRE)) expect(MOTIVOS_SERVIDOR[codigo]).toBeTruthy();
  });
});

describe('Códigos de sala y nombres', () => {
  it('los códigos nuevos son válidos, distintos y sin letras que se confunden', () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const c = nuevoCodigo();
      expect(c).toHaveLength(LARGO_CODIGO);
      expect(codigoValido(c)).toBe(true);
      expect(c).not.toMatch(/[01OIL]/);
      vistos.add(c);
    }
    expect(vistos.size).toBe(500);
    expect(ALFABETO_CODIGO.length ** LARGO_CODIGO).toBeGreaterThan(2e13);
    expect(nuevaClave()).toMatch(/^[A-Za-z0-9]{40}$/);
  });

  it('se puede escribir el código con guiones, espacios o en minúsculas', () => {
    expect(leerCodigo('k7q-mx4-p2r')).toBe('K7QMX4P2R');
    expect(leerCodigo(' K7Q MX4 P2R ')).toBe('K7QMX4P2R');
    expect(leerCodigo('K7Q-MX4')).toBeNull();
    expect(leerCodigo('K7Q-MX4-P0R')).toBeNull();
    expect(mostrarCodigo('K7QMX4P2R')).toBe('K7Q-MX4-P2R');
  });

  it('solo se enseñan nombres de animal y colores de la lista (nada de texto libre)', () => {
    const yo = nombreAlAzar();
    expect(nombreSeguro(yo.nombre)).toBe(yo.nombre);
    expect(colorSeguro(yo.color)).toBe(yo.color);
    expect(nombreSeguro('Pepe Pérez, 2ºB')).toBe('Invitado');
    expect(nombreSeguro('<img src=x onerror=alert(1)>')).toBe('Invitado');
    expect(colorSeguro('red; background:url(https://malo)')).toBe('#9aa3b3');
    expect(ANIMALES.length * COLORES.length).toBeGreaterThan(100);
  });
});
