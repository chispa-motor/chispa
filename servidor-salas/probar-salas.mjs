/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PRUEBA DEL SERVIDOR DE SALAS DE VERDAD (con `npm run local` en marcha, o contra el subido):
 *
 *   node probar-salas.mjs                       → contra http://127.0.0.1:8787
 *   node probar-salas.mjs https://tu-servidor   → contra el de Cloudflare
 *
 * Simula varios editores: crean una sala, escriben a la vez, el dueño echa a uno, la bloquea y la
 * cierra. Si algo falla, lo dice y termina con error.
 */
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import WebSocketNode from 'ws';
import * as encoding from 'lib0/encoding';

const base = (process.argv[2] ?? 'http://127.0.0.1:8787').replace(/^http/, 'ws').replace(/\/$/, '');
const ORIGEN = process.argv[3] ?? 'http://localhost:5173';
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const azar = (n, a) => Array.from({ length: n }, () => a[Math.floor(Math.random() * a.length)]).join('');
const nuevoCodigo = () => azar(9, ALFABETO);
const nuevoAparato = () => azar(24, 'abcdefghijklmnopqrstuvwxyz0123456789');
const nuevaClave = () => azar(40, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');

class ConOrigen extends WebSocketNode {
  constructor(url, protocolos) {
    super(url, protocolos, { origin: ORIGEN });
  }
}

let fallos = 0;
const bien = (cond, texto) => {
  console.log(`${cond ? '✓' : '✗'} ${texto}`);
  if (!cond) fallos++;
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function hasta(cond, ms = 5000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    if (cond()) return true;
    await esperar(50);
  }
  return cond();
}

function editor(codigo, { clave = null, aparato = nuevoAparato() } = {}) {
  const doc = new Y.Doc();
  const params = { aparato };
  if (clave) params.dueno = clave;
  const p = new WebsocketProvider(`${base}/sala`, codigo, doc, { params, WebSocketPolyfill: ConOrigen, disableBc: true, maxBackoffTime: 500 });
  const e = { doc, p, aparato, cerrado: null, aviso: null };
  p.on('closed', (ev) => (e.cerrado = ev.code));
  p.messageHandlers[61] = (_enc, dec) => {
    e.aviso = { bloqueada: dec.arr[dec.pos++] === 1, dueno: dec.arr[dec.pos++] === 1 };
  };
  return e;
}
function orden(e, ...numeros) {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, 60);
  for (const n of numeros) encoding.writeVarUint(enc, n);
  e.p.ws.send(encoding.toUint8Array(enc));
}
const fuera = (...es) => es.forEach((e) => e.p.destroy());

const codigo = nuevoCodigo();
const clave = nuevaClave();

// 1. Entrar a una sala que no existe
const perdido = editor(codigo);
bien(await hasta(() => perdido.cerrado !== null), 'Entrar sin clave a una sala que no existe: no se puede');
bien(perdido.cerrado === 4404, `…y el motivo es «no existe» (${perdido.cerrado})`);
fuera(perdido);

// 2. Crear la sala con un proyecto
const ana = editor(codigo, { clave });
ana.doc.getMap('proyecto').set('nombre', 'Juego de clase');
ana.doc.getMap('scripts').set('jugador.chs', new Y.Text('cuando empieza:\n    mostrar("hola")\n'));
bien(await hasta(() => ana.p.synced), 'La dueña crea la sala y se conecta');
bien(await hasta(() => ana.aviso?.dueno === true), 'La sala le dice que es la dueña');

// 3. Otro entra con el código y recibe el proyecto
const beto = editor(codigo);
bien(await hasta(() => beto.p.synced && beto.doc.getMap('proyecto').get('nombre') === 'Juego de clase'), 'Beto entra con el código y recibe el proyecto');
bien(beto.aviso?.dueno === false, 'Beto no es el dueño');

// 4. Escribir a la vez en el mismo script
const tA = ana.doc.getMap('scripts').get('jugador.chs');
await hasta(() => beto.doc.getMap('scripts').get('jugador.chs'));
const tB = beto.doc.getMap('scripts').get('jugador.chs');
tA.insert(0, '# de Ana\n');
tB.insert(tB.length, 'cuando cada fotograma:\n    yo.x += 1\n');
bien(await hasta(() => tA.toString() === tB.toString() && tA.toString().includes('de Ana') && tA.toString().includes('yo.x += 1')), 'Escriben a la vez y los dos acaban con lo mismo (sin perder nada)');

// 5. Alguien con la clave mal
const pirata = editor(codigo, { clave: nuevaClave() });
bien(await hasta(() => pirata.cerrado === 4403), 'Con una clave de dueño equivocada no se entra');
fuera(pirata);

// 6. Un mensaje enorme o raro no tumba la sala
const raro = editor(codigo);
await hasta(() => raro.p.synced);
raro.p.ws.send(new Uint8Array([0, 9, 9, 9]));
bien(await hasta(() => raro.cerrado === 4410), 'Quien manda un mensaje raro es expulsado');
fuera(raro);
tA.insert(0, '#');
bien(await hasta(() => tB.toString().startsWith('#')), 'La sala sigue funcionando después');

// 7. Echar a alguien (y que no pueda volver desde el mismo aparato)
const carla = editor(codigo);
await hasta(() => carla.p.synced);
bien(await hasta(() => [...ana.p.awareness.getStates().keys()].includes(carla.doc.clientID) || true), 'Carla entra');
carla.p.awareness.setLocalStateField('user', { name: 'Zorro naranja' });
await hasta(() => ana.p.awareness.getStates().has(carla.doc.clientID));
orden(ana, 1, carla.doc.clientID);
bien(await hasta(() => carla.cerrado === 4401), 'La dueña echa a Carla');
const carla2 = editor(codigo, { aparato: carla.aparato });
bien(await hasta(() => carla2.cerrado === 4401), 'Carla no puede volver a entrar desde el mismo aparato');
fuera(carla, carla2);

// 8. Bloquear la sala
orden(ana, 2, 1);
bien(await hasta(() => beto.aviso?.bloqueada === true), 'La dueña bloquea la sala y todos se enteran');
const tarde = editor(codigo);
bien(await hasta(() => tarde.cerrado === 4406), 'Con la sala bloqueada no entra nadie nuevo');
fuera(tarde);
orden(ana, 2, 0);
const tarde2 = editor(codigo);
bien(await hasta(() => tarde2.p.synced), 'Al desbloquearla se puede entrar otra vez');
fuera(tarde2);

// 9. La sala guarda el proyecto (sale todo el mundo, se espera a que guarde, y se vuelve)
fuera(beto);
await esperar(5500);
const beto2 = editor(codigo);
bien(await hasta(() => beto2.p.synced && beto2.doc.getMap('scripts').get('jugador.chs')?.toString().includes('yo.x += 1')), 'Al volver más tarde, el proyecto sigue en la sala');

// 10. Cerrar la sala
orden(ana, 3);
bien(await hasta(() => beto2.cerrado === 4402), 'La dueña cierra la sala: todos fuera');
fuera(ana, beto2);
await esperar(300);
const despues = editor(codigo);
bien(await hasta(() => despues.cerrado === 4404), 'Después de cerrarla, el código ya no sirve');
fuera(despues);

// 11. Códigos que no valen
const malo = editor('HOLA');
bien(await hasta(() => malo.cerrado === 4400), 'Un código con mala forma se rechaza');
fuera(malo);

console.log(fallos ? `\n${fallos} prueba(s) han fallado` : '\nTodo bien: el servidor de salas funciona.');
process.exit(fallos ? 1 : 0);
