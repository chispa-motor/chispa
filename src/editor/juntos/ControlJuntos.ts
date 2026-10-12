/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PROGRAMAR JUNTOS (en el editor): el botón «Juntos», las ventanas para crear una sala o entrar con un
 * código, la lista de quién está, y lo que ves de los demás (sus cursores en el código y un borde de su
 * color en el objeto que tienen seleccionado).
 *
 * La sala la mantiene colaborar/SesionJuntos.ts; aquí solo está lo que se ve.
 */
import { servidorSalas } from '../../configuracion';
import { SesionJuntos, type Participante } from '../../colaborar/SesionJuntos';
import { cargarYo, guardarYo, leerCodigo, mostrarCodigo, nombreAlAzar, LARGO_CODIGO, type Yo } from '../../colaborar/sala';
import type { EstadoEditor } from '../estado/EstadoEditor';
import type { EditorCodigo } from '../codigo/EditorCodigo';
import type { VistaEscena } from '../escena/VistaEscena';
import { abrirDialogo, avisar, confirmar, notificar } from '../interfaz/dialogos';
import { botonIcono, fondoDeColor, h, icono, rellenar } from '../interfaz/dom';

export interface PartesEditor {
  estado: EstadoEditor;
  codigo: EditorCodigo;
  escena: VistaEscena;
  /** Guarda el proyecto actual en «Mis proyectos» (antes de abrir el de la sala). */
  guardar(): Promise<void>;
  /** Para el juego si está en marcha y deja el editor listo para otro proyecto. */
  prepararParaAbrir(): void;
  /** Después de abrir el proyecto de la sala. */
  despuesDeAbrir(): void;
  /** Hay que volver a pintar la barra de arriba. */
  redibujar(): void;
}

/** ¿Se está escribiendo en una casilla (Propiedades, un nombre...)? Entonces lo de los demás espera. */
function escribiendoEnCasilla(): boolean {
  const a = document.activeElement;
  return a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement;
}

/** El enlace para entrar directamente: la dirección del editor con ?sala=CODIGO. */
export function enlaceDeSala(codigo: string): string {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('sala', codigo);
  return u.toString();
}

export class ControlJuntos {
  sesion: SesionJuntos | null = null;
  private yo: Yo = cargarYo();
  private cerrarVentana: (() => void) | null = null;
  private pintarVentana: (() => void) | null = null;
  private quitarOyenteSesion: (() => void) | null = null;

  constructor(private partes: PartesEditor) {
    const e = partes.estado;
    // Abrir otro proyecto (Nuevo, Abrir, Mis proyectos...) te saca de la sala: si no, se mandaría a todos
    e.antesDeAbrir = () => {
      if (this.sesion) this.acabar('Has salido de la sala porque has abierto otro proyecto. Lo que hicisteis juntos se queda en «Mis proyectos».');
    };
    e.alCambiar((c) => {
      if (this.sesion && (c === 'seleccion' || c === 'archivos' || c === 'escena' || c === 'proyecto')) this.contarQueMiro();
    });
    partes.escena.marcasDeOtros = () => {
      if (!this.sesion) return [];
      return this.sesion
        .participantes()
        .filter((p) => !p.yo && p.objeto && p.escena === e.escenaActual)
        .map((p) => ({ objeto: p.objeto!, nombre: p.nombre, color: p.color }));
    };
  }

  get disponible(): boolean {
    return servidorSalas() !== '';
  }

  /** Quién está mirando cada script (para marcar las pestañas). */
  quienEnScript(archivo: string): Participante[] {
    return this.sesion?.participantes().filter((p) => !p.yo && p.script === archivo) ?? [];
  }

  private contarQueMiro(): void {
    const e = this.partes.estado;
    this.sesion?.ponerPresencia({
      escena: e.escenaActual,
      objeto: e.seleccion?.tipo === 'escena' ? (e.seleccionado?.nombre ?? null) : null,
      script: e.pestanaActiva !== 'escena' ? e.pestanaActiva : null,
    });
  }

  // ───────────────────────── La barra de arriba ─────────────────────────

  /** El botón de la barra: «Juntos» sin sala; con sala, el código y los circulitos de quién está. */
  boton(compacto: boolean): HTMLElement {
    const s = this.sesion;
    if (!s) return botonIcono('juntos', 'Programar juntos: haced el juego entre varios a la vez, cada uno desde su aparato', () => this.abrir(), compacto ? undefined : 'Juntos', 'boton-juntos');
    const gente = s.participantes();
    const conexion = s.conexion === 'conectado' ? '' : s.conexion === 'conectando' ? ' · conectando…' : ' · reconectando…';
    return h('button', {
      class: `boton boton-juntos en-sala ${s.conexion !== 'conectado' ? 'sin-conexion' : ''}`,
      title: `Sala ${mostrarCodigo(s.codigo)}${conexion}\n${gente.map((p) => `${p.nombre}${p.yo ? ' (tú)' : ''}`).join('\n')}`,
      'aria-label': `Programar juntos: sala ${mostrarCodigo(s.codigo)}, ${gente.length} ${gente.length === 1 ? 'persona' : 'personas'}`,
      onclick: () => this.abrir(),
    },
      h('span', { class: 'circulos-juntos' }, gente.slice(0, compacto ? 3 : 6).map((p) => fondoDeColor(h('span', { class: 'circulo-juntos' }, p.nombre[0]), p.color))),
      compacto ? null : h('span', { class: 'codigo-juntos' }, mostrarCodigo(s.codigo)),
      s.conexion !== 'conectado' ? icono('aviso', 14) : null,
    );
  }

  /** Abre la ventana de programar juntos (la de empezar, o la de la sala si ya estás en una). */
  abrir(codigoInicial = ''): void {
    if (this.sesion) this.ventanaSala();
    else this.ventanaEmpezar(codigoInicial);
  }

  // ───────────────────────── Empezar ─────────────────────────

  private ventanaEmpezar(codigoInicial: string): void {
    if (!this.disponible) {
      return avisar('Programar juntos', h('div', {},
        h('p', {}, 'Programar juntos todavía no está activado en esta copia de Chispa.'),
        h('p', { class: 'nota' }, 'Hace falta un servidor de salas. Quien mantiene esta copia de Chispa tiene los pasos en SERVIDOR_SALAS.md (es gratis).'),
      ));
    }
    const etiquetaYo = h('span', { class: 'yo-juntos' });
    const pintarYo = () => rellenar(etiquetaYo, fondoDeColor(h('span', { class: 'circulo-juntos' }, this.yo.nombre[0]), this.yo.color), h('strong', {}, this.yo.nombre));
    pintarYo();
    const campo = h('input', {
      class: 'campo-codigo-juntos',
      type: 'text',
      inputmode: 'text',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      maxlength: String(LARGO_CODIGO + 4),
      placeholder: 'K7Q-MX4-P2R',
      'aria-label': 'Código de la sala',
      value: codigoInicial ? mostrarCodigo(leerCodigo(codigoInicial) ?? codigoInicial) : '',
    }) as HTMLInputElement;
    const error = h('p', { class: 'error-juntos', role: 'alert' });
    const ocupado = (si: boolean) => {
      for (const b of caja.querySelectorAll('button')) (b as HTMLButtonElement).disabled = si;
      campo.disabled = si;
    };
    const entrar = async () => {
      const codigo = leerCodigo(campo.value);
      if (!codigo) return rellenar(error, `El código tiene ${LARGO_CODIGO} letras y números (por ejemplo K7Q-MX4-P2R). Comprueba que está bien escrito.`);
      rellenar(error);
      ocupado(true);
      try {
        await this.unirse(codigo);
        cerrar();
      } catch (err) {
        rellenar(error, err instanceof Error ? err.message : 'No he podido entrar en la sala.');
        ocupado(false);
      }
    };
    campo.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        ev.stopPropagation();
        void entrar();
      }
    });
    const caja = h('div', { class: 'juntos-empezar' },
      h('p', {}, 'Haced el juego entre varios A LA VEZ, cada uno desde su ordenador, tablet o móvil. Lo que hace uno lo ven los demás al momento: el código, los objetos, todo.'),
      h('div', { class: 'fila-yo-juntos' },
        h('span', {}, 'Aquí eres:'), etiquetaYo,
        botonIcono('deshacer', 'Otro animal al azar', () => {
          this.yo = nombreAlAzar();
          guardarYo(this.yo);
          pintarYo();
        }, 'Cambiar'),
      ),
      h('div', { class: 'opcion-juntos' },
        h('h3', {}, 'Crear una sala'),
        h('p', {}, 'Con el proyecto que tienes abierto. Te daré un código para que se lo pases a tus amigos.'),
        h('button', { class: 'boton principal', onclick: async () => {
          rellenar(error);
          ocupado(true);
          try {
            await this.crear();
            cerrar();
            this.ventanaSala();
          } catch (err) {
            rellenar(error, err instanceof Error ? err.message : 'No he podido crear la sala.');
            ocupado(false);
          }
        } }, icono('juntos', 16), ' Crear una sala'),
      ),
      h('div', { class: 'opcion-juntos' },
        h('h3', {}, 'Entrar con un código'),
        h('p', {}, 'Si alguien ya ha creado una sala. Se abrirá su proyecto (el tuyo se queda guardado en «Mis proyectos»).'),
        h('div', { class: 'fila-codigo-juntos' }, campo, h('button', { class: 'boton', onclick: () => void entrar() }, icono('entrar', 16), ' Entrar')),
      ),
      error,
      h('p', { class: 'nota nota-seguridad-juntos' }, '🔒 Pasa el código solo a gente que conozcas. Aquí nadie ve tu nombre de verdad (eres un animal) y no hay chat.'),
    );
    const cerrar = abrirDialogo('Programar juntos', caja, [{ texto: 'Cerrar' }], 'dialogo-juntos');
    if (codigoInicial) setTimeout(() => campo.focus(), 50);
  }

  private opcionesVinculo() {
    return {
      ocupado: escribiendoEnCasilla,
      alProblema: (texto: string) => notificar(texto, 'error'),
    };
  }

  /** Crea una sala con el proyecto abierto. */
  async crear(): Promise<void> {
    const s = await SesionJuntos.crear(servidorSalas(), this.partes.estado, this.yo, this.opcionesVinculo());
    this.empezar(s);
    notificar(`Sala creada: ${mostrarCodigo(s.codigo)}. Pásale el código a tus amigos.`, 'ok');
  }

  /** Entra en una sala con su código: se guarda lo tuyo y se abre el proyecto de la sala. */
  async unirse(codigo: string): Promise<void> {
    await this.partes.guardar();
    const { sesion, proyecto } = await SesionJuntos.unirse(servidorSalas(), codigo, this.yo);
    try {
      this.partes.prepararParaAbrir();
      // abrir() comprueba el proyecto ENTERO (viene de otro ordenador)
      this.partes.estado.abrir(proyecto);
    } catch (err) {
      sesion.salir();
      throw new Error(`El proyecto de la sala no se puede abrir. ${err instanceof Error ? err.message : ''}`);
    }
    sesion.vincular(this.partes.estado, this.opcionesVinculo());
    this.partes.despuesDeAbrir();
    this.empezar(sesion);
    notificar(`Estás en la sala ${mostrarCodigo(codigo)} como «${this.yo.nombre}».`, 'ok');
  }

  private empezar(s: SesionJuntos): void {
    this.sesion = s;
    s.alTerminar = (motivo) => {
      this.acabar(null);
      avisar('Programar juntos', h('div', {}, h('p', {}, motivo), h('p', { class: 'nota' }, 'El proyecto se queda en tu editor (y en «Mis proyectos»): puedes seguir tú solo.')));
    };
    // Cada vez que alguien mueve el cursor llega un aviso: solo se repinta si cambia algo que se ve
    let firma = '';
    let pendiente = false;
    this.quitarOyenteSesion = s.alCambiar(() => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        if (this.sesion !== s) return;
        const nueva = JSON.stringify([s.conexion, s.bloqueada, s.esDueno, s.participantes().map((p) => [p.id, p.nombre, p.color, p.escena, p.objeto, p.script])]);
        if (nueva === firma) return;
        firma = nueva;
        this.partes.redibujar();
        this.partes.escena.redibujar();
        this.pintarVentana?.();
      });
    });
    this.partes.codigo.usarJuntos({ texto: (archivo) => s.vinculo?.texto(archivo) ?? null, presencia: s.proveedor.awareness });
    this.contarQueMiro();
    this.partes.redibujar();
  }

  /** Sales de la sala (o te sacan). El proyecto se queda en el editor. */
  acabar(mensaje: string | null): void {
    const s = this.sesion;
    if (!s) return;
    this.sesion = null;
    this.quitarOyenteSesion?.();
    this.quitarOyenteSesion = null;
    s.salir();
    this.partes.codigo.usarJuntos(null);
    this.cerrarVentana?.();
    this.partes.redibujar();
    this.partes.escena.redibujar();
    if (mensaje) notificar(mensaje, 'normal');
  }

  // ───────────────────────── La sala ─────────────────────────

  private ventanaSala(): void {
    const s = this.sesion;
    if (!s) return;
    const cuerpo = h('div', { class: 'juntos-sala' });
    const copiar = async (texto: string, que: string) => {
      try {
        await navigator.clipboard.writeText(texto);
        notificar(`${que} copiado`, 'ok');
      } catch {
        notificar(`No he podido copiarlo: ${texto}`, 'normal');
      }
    };
    const pintar = () => {
      if (!this.sesion) return;
      const gente = s.participantes();
      const estado = this.partes.estado;
      const queMira = (p: Participante) =>
        p.script ? `escribiendo en ${p.script}` : p.objeto ? `con «${p.objeto}»${p.escena && p.escena !== estado.escenaActual ? ` (escena ${p.escena})` : ''}` : p.escena ? `en la escena ${p.escena}` : '';
      rellenar(cuerpo,
        h('div', { class: 'codigo-sala-juntos' },
          h('span', { class: 'etiqueta' }, 'Código de la sala'),
          h('strong', { class: 'codigo-grande-juntos' }, mostrarCodigo(s.codigo)),
          h('div', { class: 'fila-botones-juntos' },
            botonIcono('copiar', 'Copiar el código', () => void copiar(mostrarCodigo(s.codigo), 'Código'), 'Copiar código'),
            botonIcono('copiar', 'Copiar un enlace que abre Chispa y entra en esta sala', () => void copiar(enlaceDeSala(s.codigo), 'Enlace'), 'Copiar enlace'),
          ),
        ),
        h('p', { class: `estado-conexion-juntos ${s.conexion}` },
          s.conexion === 'conectado' ? '● Conectado' : s.conexion === 'conectando' ? 'Conectando…' : 'Se ha cortado la conexión: reconectando… (lo que hagas se mandará al volver)',
          s.bloqueada ? ' · 🔒 con candado: no puede entrar nadie más' : '',
        ),
        h('h3', {}, `En la sala (${gente.length})`),
        h('ul', { class: 'lista-juntos' }, gente.map((p) =>
          h('li', {},
            fondoDeColor(h('span', { class: 'circulo-juntos' }, p.nombre[0]), p.color),
            h('span', { class: 'nombre-juntos' }, h('span', {}, h('strong', {}, p.nombre), p.yo ? ' (tú)' : ''), h('small', {}, queMira(p))),
            s.esDueno && !p.yo
              ? h('button', { class: 'boton peligro pequeno', title: `Sacar a ${p.nombre} de la sala (no podrá volver a entrar desde ese aparato)`, onclick: async () => {
                  if (await confirmar('Sacar de la sala', `¿Sacar a «${p.nombre}»? No podrá volver a entrar desde ese aparato.`, 'Sacar', true)) s.echar(p.id);
                } }, 'Sacar')
              : null,
          ))),
        s.esDueno
          ? h('div', { class: 'dueno-juntos' },
              h('h3', {}, 'Eres el dueño de la sala'),
              h('label', { class: 'casilla' },
                h('input', { type: 'checkbox', checked: s.bloqueada, onchange: (ev: Event) => s.bloquear((ev.target as HTMLInputElement).checked) }),
                ' Poner el candado (que no entre nadie más)',
              ),
              h('button', { class: 'boton peligro', onclick: async () => {
                if (await confirmar('Cerrar la sala', 'Se saca a todos y la sala se borra (cada uno se queda con su copia del proyecto). El código dejará de funcionar.', 'Cerrar la sala', true)) s.cerrarSala();
              } }, 'Cerrar la sala para todos'),
            )
          : null,
        h('p', { class: 'nota' }, 'Cada uno ejecuta el juego en su aparato. «Deshacer» solo deshace lo tuyo. Si una sala se queda vacía 7 días, se borra sola.'),
      );
    };
    pintar();
    this.pintarVentana = pintar;
    this.cerrarVentana = abrirDialogo('Programar juntos', cuerpo, [
      { texto: 'Salir de la sala', alPulsar: () => void this.acabar('Has salido de la sala. El proyecto se queda en tu editor y en «Mis proyectos».') },
      { texto: 'Seguir', clase: 'principal' },
    ], 'dialogo-juntos');
    const cerrarOriginal = this.cerrarVentana;
    this.cerrarVentana = () => {
      cerrarOriginal();
      this.cerrarVentana = null;
      this.pintarVentana = null;
    };
    // Si se cierra con Escape o tocando fuera, se deja de repintar
    const vigilar = setInterval(() => {
      if (!cuerpo.isConnected) {
        clearInterval(vigilar);
        if (this.pintarVentana === pintar) this.pintarVentana = null;
      }
    }, 500);
  }
}
