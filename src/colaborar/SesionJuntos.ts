/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * UNA SESIÓN DE «PROGRAMAR JUNTOS»: la conexión con la sala (por internet, con y-websocket) y el
 * vínculo con el editor (Vinculo.ts).
 *
 *   SesionJuntos.crear(...)    crea una sala nueva con el proyecto que tienes abierto
 *   SesionJuntos.unirse(...)   entra en una sala con su código y trae su proyecto
 *
 * Si se corta internet, se vuelve a conectar sola; lo que hagas mientras tanto se manda al volver.
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import type { EstadoEditor } from '../editor/estado/EstadoEditor';
import { Vinculo, llenarDoc, proyectoDeDoc, type OpcionesVinculo } from './Vinculo';
import { MAXIMO_PROYECTO_SALA, MENSAJE, MOTIVOS, ORDEN, aparato, claveDeSala, colorSeguro, guardarClaveDeSala, nombreSeguro, nuevaClave, nuevoCodigo, type Yo } from './sala';

export type EstadoConexion = 'conectando' | 'conectado' | 'reconectando';

/** Alguien que está en la sala. */
export interface Participante {
  /** Su número en Yjs (para echarle). */
  id: number;
  nombre: string;
  color: string;
  yo: boolean;
  /** Lo que está mirando (para enseñarlo en la escena y en las pestañas). */
  escena: string | null;
  objeto: string | null;
  script: string | null;
}

/** Lo que cada uno cuenta de sí mismo además del nombre (qué está mirando). */
export interface Presencia {
  escena: string | null;
  objeto: string | null;
  script: string | null;
}

const ESPERA_CONECTAR = 12_000;

function textoCorto(v: unknown): string | null {
  return typeof v === 'string' && v.length <= 200 ? v : null;
}

export class SesionJuntos {
  readonly doc = new Y.Doc();
  readonly proveedor: WebsocketProvider;
  vinculo: Vinculo | null = null;
  conexion: EstadoConexion = 'conectando';
  bloqueada = false;
  esDueno: boolean;
  /** Se ha terminado la sesión (porque has salido, te han echado o se ha cerrado la sala). */
  terminada = false;
  /** Avisa cuando la sala se termina sin que tú hayas salido (te echan, se cierra...). */
  alTerminar: (motivo: string) => void = () => {};
  private oyentes = new Set<() => void>();
  private cerrandoYo = false;

  private constructor(
    readonly servidor: string,
    readonly codigo: string,
    clave: string | null,
    readonly yo: Yo,
  ) {
    this.esDueno = clave !== null;
    const params: Record<string, string> = { aparato: aparato() };
    if (clave) params.dueno = clave;
    this.proveedor = new WebsocketProvider(`${servidor.replace(/\/+$/, '')}/sala`, codigo, this.doc, { params, disableBc: true, maxBackoffTime: 4000, connect: false });
    // El aviso propio de la sala de Chispa: si está bloqueada y si eres el dueño
    this.proveedor.messageHandlers[MENSAJE.aviso] = (_codificador, decodificador) => {
      this.bloqueada = decoding.readVarUint(decodificador) === 1;
      this.esDueno = decoding.readVarUint(decodificador) === 1;
      this.avisar();
    };
    this.proveedor.on('status', ({ status }) => {
      this.conexion = status === 'connected' ? 'conectado' : this.conexion === 'conectando' ? 'conectando' : 'reconectando';
      this.avisar();
    });
    this.proveedor.on('closed', ({ code }) => {
      if (code === 4402 || code === 4401) guardarClaveDeSala(this.codigo, null);
      this.terminar(this.cerrandoYo ? 'Has cerrado la sala.' : (MOTIVOS[code] ?? 'La sala ha cerrado la conexión.'));
    });
    // Lo que cuentan los demás de sí mismos se comprueba ANTES de enseñarlo (también en los cursores
    // del editor de código): solo nombres de animal y colores de la lista
    const presencia = this.proveedor.awareness;
    presencia.on('change', ({ added, updated }: { added: number[]; updated: number[] }) => {
      for (const id of [...added, ...updated]) {
        if (id === this.doc.clientID) continue;
        const st = presencia.getStates().get(id) as Record<string, unknown> | undefined;
        if (!st) continue;
        const u = (st.user ?? {}) as Record<string, unknown>;
        const color = colorSeguro(u.color);
        st.user = { name: nombreSeguro(u.name), color, colorLight: `${color}33` };
        const c = (st.chispa ?? {}) as Record<string, unknown>;
        st.chispa = { escena: textoCorto(c.escena), objeto: textoCorto(c.objeto), script: textoCorto(c.script) } satisfies Presencia;
      }
      this.avisar();
    });
    presencia.setLocalStateField('user', { name: yo.nombre, color: yo.color, colorLight: `${yo.color}33` });
  }

  /** Crea una sala con el proyecto del editor (y ya queda vinculada). */
  static async crear(servidor: string, estado: EstadoEditor, yo: Yo, opciones: OpcionesVinculo = {}): Promise<SesionJuntos> {
    if (estado.aJSON().length > MAXIMO_PROYECTO_SALA) throw new Error(MOTIVOS[4409]);
    const codigo = nuevoCodigo();
    const clave = nuevaClave();
    const s = new SesionJuntos(servidor, codigo, clave, yo);
    llenarDoc(s.doc, estado.proyecto);
    await s.conectar();
    guardarClaveDeSala(codigo, clave);
    s.vincular(estado, opciones);
    return s;
  }

  /**
   * Entra en una sala. Devuelve la sesión y el proyecto de la sala, SIN COMPROBAR: hay que abrirlo en
   * el editor (que lo comprueba entero) y después llamar a `vincular`.
   */
  static async unirse(servidor: string, codigo: string, yo: Yo): Promise<{ sesion: SesionJuntos; proyecto: unknown }> {
    const s = new SesionJuntos(servidor, codigo, claveDeSala(codigo), yo);
    await s.conectar();
    if (!s.doc.getMap('proyecto').size) {
      s.salir();
      throw new Error('La sala todavía está vacía. Espera a que quien la ha creado termine de subir el proyecto y vuelve a probar.');
    }
    return { sesion: s, proyecto: proyectoDeDoc(s.doc) };
  }

  private conectar(): Promise<void> {
    return new Promise((bien, mal) => {
      let hecho = false;
      const acabar = (error: string | null) => {
        if (hecho) return;
        hecho = true;
        clearTimeout(reloj);
        this.proveedor.off('sync', alSincronizar);
        this.proveedor.off('closed', alCerrar);
        if (error === null) return bien();
        this.salir();
        mal(new Error(error));
      };
      const alSincronizar = (listo: boolean) => listo && acabar(null);
      const alCerrar = ({ code }: { code: number }) => acabar(MOTIVOS[code] ?? 'La sala no deja entrar.');
      const reloj = setTimeout(() => acabar('No he podido conectar con la sala. Mira si tienes internet y vuelve a probar.'), ESPERA_CONECTAR);
      this.proveedor.on('sync', alSincronizar);
      this.proveedor.on('closed', alCerrar);
      this.proveedor.connect();
    });
  }

  vincular(estado: EstadoEditor, opciones: OpcionesVinculo = {}): void {
    this.vinculo = new Vinculo(this.doc, estado, opciones);
  }

  /** Cuenta a los demás qué estás mirando. */
  ponerPresencia(p: Presencia): void {
    const antes = this.proveedor.awareness.getLocalState()?.chispa as Presencia | undefined;
    if (antes && antes.escena === p.escena && antes.objeto === p.objeto && antes.script === p.script) return;
    this.proveedor.awareness.setLocalStateField('chispa', p);
  }

  participantes(): Participante[] {
    const lista: Participante[] = [];
    for (const [id, st] of this.proveedor.awareness.getStates()) {
      const u = (st.user ?? {}) as Record<string, unknown>;
      const c = (st.chispa ?? {}) as Partial<Presencia>;
      const yo = id === this.doc.clientID;
      lista.push({ id, yo, nombre: yo ? this.yo.nombre : nombreSeguro(u.name), color: yo ? this.yo.color : colorSeguro(u.color), escena: c.escena ?? null, objeto: c.objeto ?? null, script: c.script ?? null });
    }
    return lista.sort((a, b) => Number(b.yo) - Number(a.yo) || a.nombre.localeCompare(b.nombre));
  }

  alCambiar(fn: () => void): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }
  private avisar(): void {
    for (const fn of this.oyentes) fn();
  }

  // ───────────────────────── Órdenes del dueño ─────────────────────────

  private orden(...numeros: number[]): boolean {
    const ws = this.proveedor.ws;
    if (!this.esDueno || !ws || ws.readyState !== WebSocket.OPEN) return false;
    const e = encoding.createEncoder();
    encoding.writeVarUint(e, MENSAJE.orden);
    for (const n of numeros) encoding.writeVarUint(e, n);
    ws.send(encoding.toUint8Array(e));
    return true;
  }
  echar(id: number): boolean {
    return this.orden(ORDEN.echar, id);
  }
  bloquear(si: boolean): boolean {
    return this.orden(ORDEN.bloquear, si ? 1 : 0);
  }
  cerrarSala(): boolean {
    this.cerrandoYo = true;
    return this.orden(ORDEN.cerrar);
  }

  // ───────────────────────── Salir ─────────────────────────

  /** Sales de la sala (el proyecto se queda en tu editor). */
  salir(): void {
    if (this.terminada) return;
    this.terminada = true;
    this.vinculo?.destruir();
    this.vinculo = null;
    this.oyentes.clear();
    this.proveedor.destroy();
  }

  private terminar(motivo: string): void {
    if (this.terminada) return;
    this.salir();
    this.alTerminar(motivo);
  }
}
