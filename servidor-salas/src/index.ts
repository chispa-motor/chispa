/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * EL SERVIDOR DE SALAS DE CHISPA, en Cloudflare (un Worker y un Durable Object por sala).
 *
 *   wss://<tu-servidor>/sala/K7QMX4P2R   → la sala con ese código
 *
 * Cada sala es un Durable Object: un pequeño programa que Cloudflare pone en marcha cuando alguien
 * entra, que guarda su proyecto en su propia base de datos y que se DUERME (sin gastar) mientras
 * nadie escribe. La lógica está en logica.ts; aquí solo está lo que es de Cloudflare.
 *
 * Guardar: como mucho cada pocos segundos (en el plan gratis hay un límite de escrituras al día).
 * Borrar: una sala sin nadie durante 7 días se borra sola, con todo lo que tenía.
 * No se apunta nada de las personas que entran (ni su dirección ni nada).
 */
import { DurableObject } from 'cloudflare:workers';
import { CIERRE, LogicaSala, MOTIVOS, aparatoValido, claveValida, codigoValido, type Conexion } from './logica';

export interface Env {
  SALAS: DurableObjectNamespace<Sala>;
  /** Las webs que pueden usar el servidor, separadas por comas (la de Chispa y la de pruebas en tu ordenador). */
  ORIGENES: string;
}

const GUARDAR_CADA = 4000;
const BORRAR_TRAS = 7 * 24 * 60 * 60 * 1000;
/** Un trozo del proyecto guardado (la base de datos de Cloudflare admite hasta 2 MB por dato). */
const TROZO = 1_500_000;

function origenPermitido(origen: string | null, permitidos: string): boolean {
  if (!origen) return false;
  return permitidos.split(',').map((o) => o.trim()).filter(Boolean).includes(origen);
}

export default {
  async fetch(peticion: Request, env: Env): Promise<Response> {
    const url = new URL(peticion.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Servidor de salas de Chispa: aquí se conectan los editores para programar juntos.\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }
    const m = /^\/sala\/([^/]+)$/.exec(url.pathname);
    if (!m) return new Response('No existe', { status: 404 });
    if (!origenPermitido(peticion.headers.get('Origin'), env.ORIGENES)) return new Response('Esta web no puede usar el servidor de salas de Chispa', { status: 403 });
    if (peticion.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Aquí solo se conectan los editores de Chispa', { status: 426 });
    const codigo = m[1].toUpperCase();
    if (!codigoValido(codigo)) return cerrarEnSeguida(CIERRE.codigoMalo);
    const sala = env.SALAS.get(env.SALAS.idFromName(codigo));
    return sala.fetch(peticion);
  },
} satisfies ExportedHandler<Env>;

/** Acepta la conexión solo para cerrarla con un motivo (así el editor puede explicar qué ha pasado). */
function cerrarEnSeguida(codigo: number): Response {
  const [cliente, servidor] = Object.values(new WebSocketPair());
  servidor.accept();
  servidor.close(codigo, MOTIVOS[codigo] ?? '');
  return new Response(null, { status: 101, webSocket: cliente });
}

async function huella(texto: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Lo que se recuerda de cada conexión aunque la sala se duerma. */
interface Recuerdo {
  id: string;
  dueno: boolean;
  aparato: string;
  clientes: number[];
}

export class Sala extends DurableObject<Env> {
  private logica!: LogicaSala;
  private huellaDueno: string | null = null;
  private conexiones = new Map<WebSocket, Conexion>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      const s = ctx.storage;
      this.huellaDueno = (await s.get<string>('dueno')) ?? null;
      const trozos = (await s.get<number>('trozos')) ?? 0;
      let guardado: Uint8Array | null = null;
      if (trozos) {
        const partes = await s.get<Uint8Array>(Array.from({ length: trozos }, (_, i) => `doc:${i}`));
        const lista = Array.from({ length: trozos }, (_, i) => partes.get(`doc:${i}`) ?? new Uint8Array());
        guardado = new Uint8Array(lista.reduce((n, p) => n + p.length, 0));
        let pos = 0;
        for (const p of lista) {
          guardado.set(p, pos);
          pos += p.length;
        }
      }
      this.montarLogica(guardado);
      this.logica.bloqueada = (await s.get<boolean>('bloqueada')) ?? false;
      for (const a of (await s.get<string[]>('echados')) ?? []) this.logica.echados.add(a);
      // Si la sala se había dormido con gente dentro, se vuelve a montar con sus conexiones
      for (const ws of ctx.getWebSockets()) {
        const r = ws.deserializeAttachment() as Recuerdo | null;
        if (!r) continue;
        const c = this.conexion(ws, r);
        this.conexiones.set(ws, c);
        this.logica.recordar(c);
      }
    });
  }

  private montarLogica(guardado: Uint8Array | null): void {
    this.logica = new LogicaSala(guardado);
    this.logica.alCambiar = () => void this.programarGuardado();
    this.logica.alCerrar = () => void this.borrarTodo();
    this.logica.alCambiarConexion = (c) => {
      for (const [ws, otra] of this.conexiones) if (otra === c) ws.serializeAttachment({ id: c.id, dueno: c.dueno, aparato: c.aparato, clientes: [...c.clientes] } satisfies Recuerdo);
    };
  }

  private conexion(ws: WebSocket, r: Recuerdo): Conexion {
    return {
      id: r.id,
      dueno: r.dueno,
      aparato: r.aparato,
      clientes: new Set(r.clientes),
      enviar: (datos) => {
        try {
          ws.send(datos);
        } catch {
          /* ya estaba cerrada */
        }
      },
      cerrar: (codigo, motivo) => {
        this.conexiones.delete(ws);
        try {
          ws.close(codigo, motivo);
        } catch {
          /* ya estaba cerrada */
        }
      },
    };
  }

  async fetch(peticion: Request): Promise<Response> {
    const url = new URL(peticion.url);
    const aparato = url.searchParams.get('aparato') ?? '';
    const clave = url.searchParams.get('dueno');
    if (!aparatoValido(aparato) || (clave !== null && !claveValida(clave))) return cerrarEnSeguida(CIERRE.prohibido);

    let esDueno = false;
    if (clave !== null) {
      const h = await huella(clave);
      if (this.huellaDueno === null) {
        // Crear la sala: quien llega con una clave a una sala que no existe es su dueño
        this.huellaDueno = h;
        await this.ctx.storage.put('dueno', h);
        this.logica.cerrada = false;
      } else if (h !== this.huellaDueno) return cerrarEnSeguida(CIERRE.prohibido);
      esDueno = true;
    } else if (this.huellaDueno === null) return cerrarEnSeguida(CIERRE.noExiste);

    const no = this.logica.puedeEntrar({ dueno: esDueno, aparato });
    if (no !== null) return cerrarEnSeguida(no);
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    const recuerdo: Recuerdo = { id: crypto.randomUUID(), dueno: esDueno, aparato, clientes: [] };
    servidor.serializeAttachment(recuerdo);
    const c = this.conexion(servidor, recuerdo);
    this.conexiones.set(servidor, c);
    const rechazo = this.logica.entrar(c);
    if (rechazo !== null) c.cerrar(rechazo, MOTIVOS[rechazo] ?? '');
    await this.ctx.storage.put('ultima', Date.now());
    await this.programarAlarma(Date.now() + BORRAR_TRAS);
    return new Response(null, { status: 101, webSocket: cliente });
  }

  async webSocketMessage(ws: WebSocket, mensaje: string | ArrayBuffer): Promise<void> {
    const c = this.conexiones.get(ws);
    if (!c || typeof mensaje === 'string') return;
    this.logica.recibir(c, new Uint8Array(mensaje));
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.adios(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.adios(ws);
  }

  private async adios(ws: WebSocket): Promise<void> {
    const c = this.conexiones.get(ws);
    this.conexiones.delete(ws);
    if (c) this.logica.salir(c);
    if (this.huellaDueno !== null) await this.ctx.storage.put('ultima', Date.now());
  }

  private async programarAlarma(cuando: number): Promise<void> {
    const actual = await this.ctx.storage.getAlarm();
    if (actual === null || cuando < actual) await this.ctx.storage.setAlarm(cuando);
  }

  private async programarGuardado(): Promise<void> {
    if (this.huellaDueno === null) return;
    await this.programarAlarma(Date.now() + GUARDAR_CADA);
  }

  /** La alarma: guarda lo pendiente y, si la sala lleva 7 días vacía, la borra. */
  async alarm(): Promise<void> {
    if (this.huellaDueno === null) return;
    if (this.logica.sucio) await this.guardar();
    const ultima = (await this.ctx.storage.get<number>('ultima')) ?? Date.now();
    if (this.conexiones.size === 0 && Date.now() - ultima >= BORRAR_TRAS) return this.borrarTodo();
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 60_000, ultima + BORRAR_TRAS));
  }

  private async guardar(): Promise<void> {
    const estado = this.logica.estado();
    const s = this.ctx.storage;
    const antes = (await s.get<number>('trozos')) ?? 0;
    const trozos = Math.ceil(estado.length / TROZO);
    const datos: Record<string, unknown> = { trozos, bloqueada: this.logica.bloqueada, echados: [...this.logica.echados] };
    for (let i = 0; i < trozos; i++) datos[`doc:${i}`] = estado.slice(i * TROZO, (i + 1) * TROZO);
    await s.put(datos);
    if (antes > trozos) await s.delete(Array.from({ length: antes - trozos }, (_, i) => `doc:${trozos + i}`));
  }

  private async borrarTodo(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(CIERRE.cerrada, MOTIVOS[CIERRE.cerrada]);
      } catch {
        /* ya estaba cerrada */
      }
    }
    this.conexiones.clear();
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
    this.huellaDueno = null;
    this.montarLogica(null);
  }
}
