/**
 * APLICACIÓN DEL EDITOR: junta todas las piezas en una ventana.
 *
 *   ┌──────────────────── barra: archivo · deshacer · ▶ ⏸ ⏹ · ayuda ────────────────────┐
 *   │ Escena/Proyecto │  [Escena] [jugador.chs] [enemigo.chs]   │  Vista del juego      │
 *   │ (objetos y sus  │                                         │                       │
 *   │  scripts .chs)  │  vista de la escena  ó  editor de código├───────────────────────┤
 *   │                 ├─────────────────────────────────────────┤  Propiedades          │
 *   │                 │  Consola · Problemas · Guía             │                       │
 *   └─────────────────┴─────────────────────────────────────────┴───────────────────────┘
 *
 * DECISIÓN: la "Zona de Programación" (3D) y el editor visual (Fase 4) son la
 * MISMA ventana. En la pestaña "Escena" colocas objetos; al abrir un script,
 * el centro se convierte en el editor de código, y el juego, la consola y los
 * objetos siguen a la vista. Así no hay que aprender dos programas.
 */
import { ErrorChispa, ErrorCompilacion } from '../chispa/errores/ErrorChispa';
import { ErrorMotor } from '../motor/Errores';
import { prepararPublicacion, type DestinoPublicar } from '../exportar/publicar';
import { proyectoMinimo } from '../ejemplos/minimo/proyecto';
import { proyectoVacio } from '../proyecto/formato';
import { cargarAutomatico, descargar, elegirArchivo, guardarAutomatico, nombreDeArchivo } from './Almacen';
import { EditorCodigo } from './codigo/EditorCodigo';
import { EstadoEditor } from './estado/EstadoEditor';
import { VistaEscena } from './escena/VistaEscena';
import { VistaJuego } from './juego/VistaJuego';
import { abrirDialogo, avisar, confirmar, notificar } from './interfaz/dialogos';
import { botonIcono, h, icono, rellenar } from './interfaz/dom';
import { Inspector } from './paneles/Inspector';
import { PanelInferior } from './paneles/PanelInferior';
import { PanelIzquierdo } from './paneles/PanelIzquierdo';
import { Tutorial, conNegritas, marcarTutorialVisto, tutorialVisto } from './tutorial/Tutorial';
import { Depurador } from '../chispa/ejecucion/depurador';
import { importarArchivos, resumenImportar } from './recursos/importar';
import { PanelDepurador } from './paneles/PanelDepurador';
import { revisarProyecto } from '../proyecto/Revision';
import { ATAJOS, abrirAtajos, tablaAtajos } from './atajos';
import { abrirAjustes } from './ajustes';
import { LIMITES_PROYECTO } from '../proyecto/validar';

const CLAVE_DISPOSICION = 'chispa-editor:disposicion';
/** Milisegundos después de un cambio para guardar solo, y como mucho sin guardar mientras se sigue cambiando. */
const ESPERA_GUARDADO = 1200;
const ESPERA_MAXIMA_GUARDADO = 5000;

export class Aplicacion {
  readonly estado = new EstadoEditor(proyectoMinimo);
  private vistaEscena: VistaEscena;
  private editorCodigo: EditorCodigo;
  private vistaJuego = new VistaJuego();
  private inspector: Inspector;
  private izquierdo: PanelIzquierdo;
  private inferior: PanelInferior;

  private barra = h('header', { class: 'barra-principal' });
  private pestanas = h('div', { class: 'pestanas-centro', role: 'tablist' });
  private zonaCodigo = h('div', { class: 'zona-codigo' });
  private zonaEscena = h('div', { class: 'zona-escena' });
  private errores = 0;
  private temporizadorGuardado = 0;
  private guardadoEn: number | null = null;
  /** Puntos de parada y paso a paso (se guarda aquí: sirve para todas las partidas). */
  readonly depurador = new Depurador();
  private panelDepurador: PanelDepurador;
  /** El tutorial guiado, si está abierto. */
  tutorial: Tutorial | null = null;

  constructor(private raiz: HTMLElement) {
    const e = this.estado;
    this.vistaEscena = new VistaEscena(e);
    this.editorCodigo = new EditorCodigo(this.zonaCodigo, e, this.depurador);
    this.panelDepurador = new PanelDepurador(this.depurador, () => this.vistaJuego.globales, (archivo, linea) => this.irA(archivo, linea, 1));
    this.inspector = new Inspector(e, this.vistaEscena);
    this.izquierdo = new PanelIzquierdo(e, this.vistaEscena);
    this.inferior = new PanelInferior(e, (archivo, linea, columna) => this.irA(archivo, linea, columna), this.panelDepurador.elemento);
    this.conectarDepurador();
    this.zonaEscena.append(this.vistaEscena.elemento);

    this.montar();
    this.soltarArchivos();
    this.dibujarBarra();
    this.dibujarPestanas();

    e.alCambiar((c) => {
      if (c === 'proyecto' || c === 'archivos' || c === 'scripts' || c === 'escena') {
        this.editorCodigo.sincronizar();
        this.dibujarPestanas();
      }
      if (c === 'recursos' || c === 'objetos' || c === 'escena') this.editorCodigo.revisarTodo();
      if (c !== 'seleccion') this.programarGuardado();
      if (c === 'historial' || c === 'proyecto') this.dibujarBarra();
    });
    this.vistaJuego.alCambiarEstado = () => this.dibujarBarra();
    this.inferior.alOrden = (codigo) => this.ejecutarOrden(codigo);
    this.inferior.alCambiarProblemas = (n) => {
      if (n !== this.errores) {
        this.errores = n;
        this.dibujarBarra();
      }
    };
    this.errores = this.inferior.revisar();
    this.atajos();
    window.addEventListener('beforeunload', () => void guardarAutomatico(e.aJSON()));
  }

  /**
   * ¿Se ha abierto un proyecto guardado de antes? (entonces, antes de cerrarlo,
   * se pregunta). El ejemplo del principio no cuenta, aunque se guarde solo.
   */
  private recuperado = false;

  /** Recupera el último proyecto guardado en el navegador (si hay). */
  async recuperar(): Promise<void> {
    const guardado = await cargarAutomatico();
    if (!guardado) return;
    try {
      this.estado.abrir(JSON.parse(guardado.json));
      this.recuperado = true;
      this.guardadoEn = guardado.fecha;
      const minutos = Math.round((Date.now() - guardado.fecha) / 60000);
      notificar(`Recuperado «${this.estado.proyecto.nombre}», tal como estaba ${minutos < 1 ? 'hace un momento' : minutos < 60 ? `hace ${minutos} min` : 'la última vez'}.`, 'ok');
      this.vistaEscena.encuadrar();
      this.dibujarBarra();
    } catch {
      notificar('No he podido recuperar el último proyecto. Empezamos con el ejemplo.', 'error');
    }
  }

  /** Soltar imágenes o sonidos encima del editor los importa al proyecto (en la escena, las imágenes se colocan). */
  private soltarArchivos(): void {
    const r = this.raiz;
    const conArchivos = (ev: DragEvent) => !!ev.dataTransfer?.types.includes('Files');
    r.addEventListener('dragover', (ev) => {
      if (!conArchivos(ev)) return;
      ev.preventDefault();
      r.classList.add('soltando-archivos');
    });
    r.addEventListener('dragleave', (ev) => {
      if (!ev.relatedTarget || !r.contains(ev.relatedTarget as Node)) r.classList.remove('soltando-archivos');
    });
    r.addEventListener('drop', async (ev) => {
      r.classList.remove('soltando-archivos');
      if (ev.defaultPrevented || !conArchivos(ev)) return; // la escena ya los ha cogido
      ev.preventDefault();
      const m = resumenImportar(await importarArchivos(this.estado, ev.dataTransfer?.files ?? []));
      if (m) notificar(m.texto, m.tipo);
      if (m?.tipo === 'ok') this.izquierdo.mostrarProyecto();
    });
  }

  // ═════════════════════════ Tutorial ═════════════════════════

  /** La primera vez que se abre el editor en este navegador: «¿Hacemos tu primer juego?». */
  ofrecerTutorial(): void {
    if (tutorialVisto()) return;
    marcarTutorialVisto();
    abrirDialogo('¡Hola! ¿Hacemos tu primer juego?',
      h('div', { class: 'ofrecer-tutorial' },
        h('p', {}, 'Te llevo paso a paso, aquí mismo en el editor: yo te señalo dónde hacer clic y tú lo haces. En unos 5 minutos tendrás un juego pequeño hecho por ti: un personaje que salta y coge una moneda.'),
        h('p', { class: 'nota' }, 'Si prefieres explorar solo, lo puedes abrir cuando quieras desde el botón Ayuda.'),
      ),
      [
        { texto: 'Ahora no' },
        // Si se ha recuperado un proyecto guardado, se pregunta antes de cerrarlo
        { texto: '¡Vamos!', clase: 'principal', alPulsar: () => void this.empezarTutorial(this.recuperado || this.estado.modificado) },
      ]);
  }

  /** Empieza el tutorial con un proyecto vacío. */
  async empezarTutorial(preguntar = true): Promise<void> {
    // Se pregunta siempre: lo recuperado del navegador no cuenta como «modificado», pero es trabajo de alguien
    if (preguntar && !(await confirmar('Tutorial: tu primer juego', 'El tutorial empieza con un proyecto vacío y el actual se cerrará. Si quieres conservarlo, descárgalo antes con «Guardar». ¿Seguir?', 'Empezar el tutorial'))) return;
    this.tutorial?.cerrar();
    this.parar();
    this.estado.abrir(proyectoVacio('Mi primer juego'));
    this.vistaEscena.ponerHerramienta('mover');
    this.vistaEscena.encuadrar(false);
    this.inferior.limpiar();
    this.tutorial = new Tutorial({
      estado: this.estado,
      herramienta: () => this.vistaEscena.herramienta,
      ponerHerramienta: (h_) => this.vistaEscena.ponerHerramienta(h_),
      anadir: (tipo) => this.vistaEscena.anadir(tipo),
      juegoEnMarcha: () => this.vistaJuego.estadoJuego === 'jugando' || this.vistaJuego.estadoJuego === 'pausado',
      ejecutar: () => void this.ejecutar(),
      datoDelJuego: (n) => this.vistaJuego.datoDelJuego(n),
      escribirCodigo: (archivo, codigo) => {
        this.estado.cambiarCodigo(archivo, codigo);
        this.editorCodigo.sincronizar();
      },
      hayErrores: () => [...revisarProyecto(this.estado.proyecto).porArchivo.values()].flat().some((d) => d.gravedad === 'error'),
    }, () => (this.tutorial = null));
  }

  // ═════════════════════════ Disposición ═════════════════════════

  private montar(): void {
    const divisor = (variable: string, eje: 'x' | 'y', signo: 1 | -1, min: number, max: number) => {
      const d = h('div', { class: `divisor divisor-${eje}`, role: 'separator', title: 'Arrastra para cambiar el tamaño' });
      d.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        d.setPointerCapture(ev.pointerId);
        const inicio = eje === 'x' ? ev.clientX : ev.clientY;
        const valor0 = parseFloat(getComputedStyle(this.raiz).getPropertyValue(variable)) || 300;
        d.classList.add('arrastrando');
        const mover = (m: PointerEvent) => {
          const actual = eje === 'x' ? m.clientX : m.clientY;
          const v = Math.min(max, Math.max(min, valor0 + (actual - inicio) * signo));
          this.raiz.style.setProperty(variable, `${v}px`);
        };
        const soltar = () => {
          d.removeEventListener('pointermove', mover);
          d.removeEventListener('pointerup', soltar);
          d.classList.remove('arrastrando');
          this.guardarDisposicion();
        };
        d.addEventListener('pointermove', mover);
        d.addEventListener('pointerup', soltar);
      });
      return d;
    };

    const centro = h('main', { class: 'columna-centro' },
      this.pestanas,
      h('div', { class: 'contenido-centro' }, this.zonaEscena, this.zonaCodigo),
      divisor('--alto-abajo', 'y', -1, 80, 700),
      this.inferior.elemento,
    );
    const derecha = h('aside', { class: 'columna-derecha' },
      h('div', { class: 'titulo-panel' }, icono('jugar', 14), h('span', {}, 'Juego'), h('span', { class: 'espacio' }),
        botonIcono('ampliar', 'Ver el juego en grande (Escape o el botón de arriba para volver)', () => this.vistaJuego.ampliar(), undefined, 'pequeno')),
      this.vistaJuego.elemento,
      divisor('--alto-juego', 'y', 1, 120, 800),
      h('div', { class: 'titulo-panel' }, icono('menu', 14), h('span', {}, 'Propiedades')),
      this.inspector.elemento,
    );
    const izquierda = h('aside', { class: 'columna-izquierda' }, this.izquierdo.elemento);
    this.raiz.classList.add('editor-chispa');
    this.raiz.replaceChildren(
      this.barra,
      h('div', { class: 'cuerpo-editor' },
        izquierda,
        divisor('--ancho-izq', 'x', 1, 160, 520),
        centro,
        divisor('--ancho-der', 'x', -1, 240, 900),
        derecha,
      ),
    );
    try {
      const guardada = JSON.parse(localStorage.getItem(CLAVE_DISPOSICION) ?? '{}') as Record<string, string>;
      for (const [k, v] of Object.entries(guardada)) this.raiz.style.setProperty(k, v);
    } catch {
      /* sin disposición guardada */
    }
  }

  private guardarDisposicion(): void {
    const valores: Record<string, string> = {};
    for (const v of ['--ancho-izq', '--ancho-der', '--alto-abajo', '--alto-juego']) {
      const x = this.raiz.style.getPropertyValue(v);
      if (x) valores[v] = x;
    }
    try {
      localStorage.setItem(CLAVE_DISPOSICION, JSON.stringify(valores));
    } catch {
      /* el navegador no deja guardar: da igual */
    }
  }

  // ═════════════════════════ Barra de arriba ═════════════════════════

  private dibujarBarra(): void {
    const e = this.estado;
    const j = this.vistaJuego.estadoJuego;
    const enMarcha = j === 'jugando' || j === 'pausado' || j === 'cargando';
    const ejecutar = botonIcono('jugar', this.errores ? `Hay ${this.errores} ${this.errores === 1 ? 'error' : 'errores'} en el código: arréglalos para poder ejecutar (F5)` : enMarcha ? 'Volver a empezar el juego (F5)' : 'Ejecutar el juego (F5)', () => this.ejecutar(), enMarcha ? 'Reiniciar' : 'Ejecutar', `ejecutar ${this.errores ? 'bloqueado' : ''}`);
    const pausar = botonIcono(j === 'pausado' ? 'reproducir' : 'pausa', j === 'pausado' ? 'Seguir jugando' : 'Pausar el juego', () => (this.depurador.parada ? this.depurador.continuar() : this.vistaJuego.pausar()), j === 'pausado' ? 'Seguir' : 'Pausar', 'pausar');
    const parar = botonIcono('parar', 'Parar el juego (Mayús+F5)', () => this.parar(), 'Parar', 'parar');
    pausar.disabled = !(j === 'jugando' || j === 'pausado');
    parar.disabled = !enMarcha;
    const deshacer = botonIcono('deshacer', 'Deshacer (Ctrl+Z)', () => e.deshacer());
    const rehacer = botonIcono('rehacer', 'Rehacer (Ctrl+Y)', () => e.rehacer());
    deshacer.disabled = !e.puedeDeshacer;
    rehacer.disabled = !e.puedeRehacer;
    const guardado = this.guardadoEn ? `Guardado en este navegador a las ${new Date(this.guardadoEn).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : 'Se guarda solo en este navegador';

    rellenar(this.barra,
      h('div', { class: 'marca' }, icono('estrella', 20), h('span', {}, 'Chispa')),
      h('div', { class: 'grupo-barra' },
        botonIcono('nuevo', 'Proyecto nuevo', () => this.nuevo(), 'Nuevo'),
        botonIcono('abrir', 'Abrir un proyecto (.chispa.json)', () => this.abrirArchivo(), 'Abrir'),
        botonIcono('guardar', 'Descargar el proyecto como archivo .chispa.json (Ctrl+S)', () => this.descargarProyecto(), 'Guardar'),
        botonIcono('exportar', 'Exportar el juego como una página web que funciona sola', () => this.exportar(), 'Exportar'),
      ),
      h('div', { class: 'grupo-barra' }, deshacer, rehacer),
      h('div', { class: 'grupo-barra controles-juego' }, ejecutar, pausar, parar),
      h('div', { class: 'nombre-proyecto', title: guardado },
        h('span', {}, e.proyecto.nombre),
        h('span', { class: 'estado-guardado' }, this.guardadoEn ? '✓ guardado' : ''),
      ),
      h('div', { class: 'grupo-barra derecha' },
        botonIcono('ajustes', 'Ajustes: tema claro u oscuro y tamaño de la letra (Ctrl + ,)', () => abrirAjustes(), 'Ajustes'),
        botonIcono('ayuda', 'Ayuda: primeros pasos y atajos (F1: todos los atajos)', () => this.ayuda(), 'Ayuda'),
      ),
    );
  }

  // ═════════════════════════ Pestañas del centro ═════════════════════════

  private dibujarPestanas(): void {
    const e = this.estado;
    const pestana = (id: string, texto: string, ic: string, cerrable: boolean) =>
      h('div', {
        class: `pestana ${e.pestanaActiva === id ? 'activa' : ''}`,
        role: 'tab',
        'aria-selected': String(e.pestanaActiva === id),
        title: id === 'escena' ? 'Vista de la escena (colocar objetos)' : `${texto} · clic central para cerrar`,
        onclick: () => e.activarPestana(id),
        onauxclick: (ev: MouseEvent) => ev.button === 1 && cerrable && e.cerrarPestana(id),
      },
        icono(ic, 14),
        h('span', {}, texto),
        cerrable ? h('button', { class: 'cerrar-pestana', title: 'Cerrar', 'aria-label': `Cerrar ${texto}`, onclick: (ev: Event) => {
          ev.stopPropagation();
          e.cerrarPestana(id);
        } }, icono('cerrar', 12)) : null,
      );
    rellenar(this.pestanas,
      pestana('escena', `Escena: ${e.escenaActual}`, 'escena', false),
      ...e.pestanas.map((p) => pestana(p, p, 'script', true)),
    );
    const esEscena = e.pestanaActiva === 'escena';
    this.zonaEscena.hidden = !esEscena;
    this.zonaCodigo.hidden = esEscena;
    if (!esEscena) {
      this.editorCodigo.mostrar(e.pestanaActiva);
      requestAnimationFrame(() => this.editorCodigo.enfocar(e.pestanaActiva));
    } else this.vistaEscena.redibujar();
  }

  private irA(archivo: string, linea: number, columna: number): void {
    if (!(archivo in this.estado.proyecto.scripts)) return;
    this.estado.abrirScript(archivo);
    this.editorCodigo.irA(archivo, linea, columna);
  }

  // ═════════════════════════ Jugar ═════════════════════════

  async ejecutar(): Promise<void> {
    this.olvidarParada();
    const c = this.inferior;
    c.revisar();
    c.limpiar();
    c.info(`▶ Ejecutando "${this.estado.proyecto.nombre}"…`);
    try {
      await this.vistaJuego.ejecutar(this.estado.proyecto, {
        alMostrar: (t) => c.mostrar(t),
        depurador: this.depurador,
        alError: (err, veces) => c.diagnostico(err.diagnostico(), veces),
        alAviso: (avisos) => avisos.forEach((a) => c.diagnostico(a)),
        alFallar: (err) => this.falloDelMotor(err),
      });
    } catch (err) {
      if (err instanceof ErrorCompilacion) {
        c.info(`No se puede ejecutar: ${err.errores.length === 1 ? 'hay 1 error' : `hay ${err.errores.length} errores`} en el código. Haz clic en uno para ir a su línea.`);
        for (const x of err.errores) c.diagnostico(x.diagnostico());
        c.mostrarPestana('consola');
      } else this.falloDelMotor(err);
    }
  }

  /** Una orden de la consola: se ejecuta en el juego en marcha y se enseña el resultado o el error. */
  private ejecutarOrden(codigo: string): void {
    const c = this.inferior;
    const explicar = (mensaje: string, pista?: string) => c.info(`✖ ${mensaje.charAt(0).toUpperCase()}${mensaje.slice(1)}${pista ? `\n💡 ${pista}` : ''}`);
    try {
      const valor = this.vistaJuego.ejecutarOrden(codigo);
      if (valor !== null) c.mostrar(`= ${valor}`);
    } catch (err) {
      if (err instanceof ErrorCompilacion) for (const x of err.errores) explicar(x.mensajeCorto, x.pista);
      else if (err instanceof ErrorChispa) explicar(err.mensajeCorto, err.pista);
      else if (err instanceof ErrorMotor) explicar(err.message, err.pista);
      else this.falloDelMotor(err);
    }
  }

  private falloDelMotor(err: unknown): void {
    console.error(err);
    if (err instanceof ErrorMotor) {
      const d = { gravedad: 'error' as const, archivo: err.ubicacion.archivo, pos: { linea: err.ubicacion.linea ?? 1, columna: err.ubicacion.columna ?? 1, longitud: err.ubicacion.longitud ?? 1 }, mensaje: err.message.replace(/^Línea \d+: /, ''), pista: err.pista };
      if (d.archivo) this.inferior.diagnostico(d);
      else this.inferior.info(`✖ ${err.message}${err.pista ? `\n💡 ${err.pista}` : ''}`);
    } else {
      this.inferior.info('✖ Error interno del motor (no es culpa de tu juego). El detalle técnico está en la consola del navegador (F12).');
    }
    this.inferior.mostrarPestana('consola');
  }

  /** Qué hace el editor cuando el juego se para en una línea, y cuando sigue. */
  private conectarDepurador(): void {
    const d = this.depurador;
    d.alParar = (p) => {
      this.vistaJuego.ponerEnPausa(true);
      this.irA(p.archivo, p.linea, 1);
      this.editorCodigo.mostrarParada(p.archivo, p.linea);
      this.panelDepurador.dibujar();
      this.inferior.avisarParada(true);
    };
    d.alSeguir = () => {
      this.editorCodigo.mostrarParada(null);
      this.panelDepurador.dibujar();
      this.inferior.avisarParada(false);
      this.vistaJuego.ponerEnPausa(false);
    };
  }

  /** Si el juego estaba parado en una línea, se olvida (al parar o volver a empezar). */
  private olvidarParada(): void {
    if (!this.depurador.parada) return;
    this.depurador.olvidar();
    this.editorCodigo.mostrarParada(null);
    this.inferior.avisarParada(false);
    this.panelDepurador.dibujar();
  }

  parar(): void {
    this.olvidarParada();
    if (this.vistaJuego.estadoJuego === 'parado') return;
    this.vistaJuego.parar();
    this.inferior.info('⏹ Juego parado.');
  }

  // ═════════════════════════ Archivos ═════════════════════════

  /**
   * Guardado automático: un momento después de cada cambio. Si se sigue
   * cambiando sin parar (escribiendo mucho rato), no se espera a que se pare:
   * se guarda como mucho cada 5 segundos. Así, si el navegador se cierra de
   * golpe, como mucho se pierden los últimos segundos.
   */
  private programarGuardado(): void {
    clearTimeout(this.temporizadorGuardado);
    const ahora = Date.now();
    this.cambioSinGuardarDesde ??= ahora;
    const espera = ahora - this.cambioSinGuardarDesde >= ESPERA_MAXIMA_GUARDADO ? 0 : ESPERA_GUARDADO;
    this.temporizadorGuardado = window.setTimeout(() => void this.guardarEnNavegador(), espera);
  }
  private cambioSinGuardarDesde: number | null = null;

  async guardarEnNavegador(avisar = false): Promise<void> {
    try {
      this.cambioSinGuardarDesde = null;
      await guardarAutomatico(this.estado.aJSON());
      this.guardadoEn = Date.now();
      this.dibujarBarra();
      if (avisar) notificar('Guardado en este navegador', 'ok');
    } catch {
      if (avisar) notificar('No he podido guardar en el navegador. Usa «Guardar» para descargar el archivo.', 'error');
    }
  }

  private async nuevo(): Promise<void> {
    const elegir = await new Promise<'vacio' | 'ejemplo' | null>((resolver) => {
      abrirDialogo('Proyecto nuevo',
        h('div', {},
          h('p', {}, 'El proyecto actual se cerrará. Si quieres conservarlo, descárgalo antes con «Guardar».'),
          h('p', {}, '¿Cómo quieres empezar?'),
        ),
        [
          { texto: 'Cancelar', alPulsar: () => resolver(null) },
          { texto: 'Con el ejemplo', alPulsar: () => resolver('ejemplo') },
          { texto: 'Vacío', clase: 'principal', alPulsar: () => resolver('vacio') },
        ]);
    });
    if (!elegir) return;
    this.parar();
    this.estado.abrir(elegir === 'vacio' ? proyectoVacio('Mi juego') : proyectoMinimo);
    this.vistaEscena.encuadrar();
    this.inferior.limpiar();
  }

  private async abrirArchivo(): Promise<void> {
    if (this.estado.modificado && !(await confirmar('Abrir proyecto', 'El proyecto actual se cerrará. Si quieres conservarlo, descárgalo antes con «Guardar». ¿Seguir?', 'Abrir otro'))) return;
    const texto = await elegirArchivo();
    if (!texto) return;
    if (texto.length > LIMITES_PROYECTO.archivo) {
      return avisar('No he podido abrir el archivo', `Es demasiado grande (${Math.round(texto.length / 1024 / 1024)} MB). Un proyecto de Chispa puede tener como mucho ${LIMITES_PROYECTO.archivo / 1024 / 1024} MB.`);
    }
    try {
      const datos = JSON.parse(texto);
      this.parar();
      this.estado.abrir(datos);
      this.vistaEscena.encuadrar();
      this.inferior.limpiar();
      notificar(`Abierto: ${this.estado.proyecto.nombre}`, 'ok');
    } catch (err) {
      avisar('No he podido abrir el archivo', err instanceof ErrorMotor ? `${err.message} ${err.pista ?? ''}` : 'El archivo no es un proyecto de Chispa válido (debe ser un .chispa.json guardado desde el editor).');
    }
  }

  private descargarProyecto(): void {
    descargar(nombreDeArchivo(this.estado.proyecto.nombre, '.chispa.json'), this.estado.aJSON());
    this.estado.marcarGuardado();
    void this.guardarEnNavegador();
    notificar('Proyecto descargado. Para abrirlo otra vez: botón «Abrir».', 'ok');
  }

  async exportar(): Promise<void> {
    if (this.inferior.revisar() > 0) {
      this.inferior.mostrarPestana('problemas');
      return avisar('Hay errores en el código', 'Arregla los errores (pestaña Problemas) antes de exportar el juego.');
    }
    let reproductor: string;
    try {
      const r = await fetch('reproductor.js');
      if (!r.ok) throw new Error();
      reproductor = await r.text();
    } catch {
      return avisar('No encuentro el reproductor', 'Falta el archivo reproductor.js. Arranca el editor con "npm run dev" (lo genera solo) o ejecuta "npm run reproductor".');
    }
    this.dialogoPublicar(reproductor);
  }

  /** Exportar: un archivo, itch.io o GitHub Pages. Descarga lo que hace falta y enseña los pasos en la web de cada sitio. */
  private dialogoPublicar(reproductor: string): void {
    const cuerpo = h('div', { class: 'publicar' });
    const elegir = () =>
      rellenar(cuerpo,
        h('p', {}, '¿Dónde quieres tu juego? No hace falta conectar ninguna cuenta: te preparo el archivo y te digo paso a paso qué hacer.'),
        h('div', { class: 'opciones-publicar' },
          opcion('archivo', 'descargar', 'Un archivo', 'Una página (.html) con el juego dentro. Para jugar en tu ordenador o mandárselo a alguien.'),
          opcion('itch', 'estrella', 'itch.io', 'La web de juegos independientes. Tu juego tendrá su página y se juega en el navegador.'),
          opcion('github', 'mundo', 'GitHub Pages', 'Una página web gratis, con tu propia dirección, para compartir el enlace.'),
        ),
      );
    const opcion = (destino: DestinoPublicar, ic: string, titulo: string, texto: string) =>
      h('button', { class: `opcion-publicar destino-${destino}`, onclick: () => pasos(destino) },
        icono(ic, 26), h('strong', {}, titulo), h('span', {}, texto));
    const pasos = (destino: DestinoPublicar) => {
      const p = prepararPublicacion(this.estado.proyecto, reproductor, destino);
      const bajar = () => descargar(p.descarga.nombre, p.descarga.contenido, p.descarga.tipo);
      bajar();
      rellenar(cuerpo,
        h('h3', { class: 'titulo-publicar' }, p.titulo),
        h('ol', { class: 'pasos-publicar' }, p.pasos.map((t) => h('li', {}, ...conNegritas(t)))),
        p.nota ? h('p', { class: 'nota' }, p.nota) : null,
        h('div', { class: 'botones-publicar' },
          h('button', { class: 'boton-enlace', onclick: elegir }, '← Otras opciones'),
          h('span', { class: 'espacio' }),
          h('button', { class: 'boton', onclick: bajar, title: p.descarga.nombre }, 'Descargar otra vez'),
          p.enlace ? h('a', { class: 'boton principal', href: p.enlace.url, target: '_blank', rel: 'noopener' }, p.enlace.texto) : null,
        ),
      );
    };
    elegir();
    abrirDialogo('Exportar y publicar tu juego', cuerpo, [{ texto: 'Cerrar' }], 'dialogo-ancho');
  }

  private ayuda(): void {
    abrirDialogo('Ayuda de Chispa', h('div', { class: 'ayuda' },
      h('h3', {}, 'Primeros pasos'),
      h('ol', {},
        h('li', {}, 'Añade un objeto con el botón ', h('strong', {}, '+ Añadir'), ' de la escena.'),
        h('li', {}, 'Con el objeto seleccionado, pulsa ', h('strong', {}, 'Crear script'), ' en Propiedades.'),
        h('li', {}, 'Escribe el código. Si te equivocas, se subraya en rojo: pasa el ratón por encima para ver la explicación.'),
        h('li', {}, 'Pulsa ', h('strong', {}, '▶ Ejecutar'), ' y prueba tu juego a la derecha.'),
      ),
      h('p', { class: 'nota' }, '¿Primera vez? El botón ', h('strong', {}, 'Tutorial: tu primer juego'), ' (abajo) te lleva paso a paso, señalando dónde hacer clic.'),
      h('h3', {}, 'Los atajos más útiles'),
      tablaAtajos(ATAJOS.filter((g) => g.grupo === 'General' || g.grupo === 'Jugar')),
      h('p', { class: 'nota' }, 'Todos los atajos: pulsa ', h('kbd', {}, 'F1'), '.'),
      h('p', { class: 'nota' }, 'Toda la documentación del lenguaje está en la pestaña ', h('strong', {}, 'Guía'), ' de abajo, con buscador.'),
    ), [
      { texto: 'Tutorial: tu primer juego', alPulsar: () => void this.empezarTutorial() },
      { texto: 'Abrir la Guía', alPulsar: () => this.inferior.mostrarPestana('guia') },
      { texto: 'Todos los atajos', alPulsar: () => abrirAtajos() },
      { texto: 'Cerrar', clase: 'principal' },
    ], 'dialogo-ancho');
  }

  // ═════════════════════════ Atajos de teclado ═════════════════════════

  private atajos(): void {
    window.addEventListener('keydown', (ev) => {
      const objetivo = ev.target as HTMLElement | null;
      const enCodigo = !!objetivo?.closest?.('.cm-editor');
      const enCampo = !!objetivo && (objetivo.tagName === 'INPUT' || objetivo.tagName === 'TEXTAREA' || objetivo.tagName === 'SELECT');
      const enJuego = !!objetivo?.closest?.('.vista-juego');
      const ctrl = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      if (document.querySelector('.dialogo-fondo')) return;

      // Depurador: F8 continuar, F10 siguiente línea, F11 entrar en función (solo si está parado)
      if (this.depurador.parada && (ev.key === 'F8' || ev.key === 'F10' || ev.key === 'F11')) {
        ev.preventDefault();
        if (ev.key === 'F8') this.depurador.continuar();
        else if (ev.key === 'F10') this.depurador.siguienteLinea();
        else this.depurador.entrar();
        return;
      }
      if (ev.key === 'F5') {
        ev.preventDefault();
        if (ev.shiftKey) this.parar();
        else void this.ejecutar();
        return;
      }
      if (ctrl && k === 's') {
        ev.preventDefault();
        this.descargarProyecto();
        return;
      }
      if (ctrl && k === 'enter') {
        ev.preventDefault();
        void this.ejecutar();
        return;
      }
      if (ev.key === 'F1') {
        ev.preventDefault();
        abrirAtajos();
        return;
      }
      if (ctrl && ev.key === ',') {
        ev.preventDefault();
        abrirAjustes();
        return;
      }
      if (ctrl && k === 'b' && this.estado.pestanaActiva !== 'escena') {
        ev.preventDefault();
        this.editorCodigo.alternarModo(this.estado.pestanaActiva);
        return;
      }
      // El editor de código, los bloques y los campos de texto tienen su propio deshacer
      if (enCodigo || enCampo || enJuego || objetivo?.closest?.('.editor-bloques')) return;
      if (ctrl && (k === 'z' || k === 'y')) {
        ev.preventDefault();
        if (k === 'y' || ev.shiftKey) this.estado.rehacer();
        else this.estado.deshacer();
      } else if (ctrl && k === 'a' && this.estado.pestanaActiva === 'escena') {
        ev.preventDefault();
        this.estado.seleccionarTodo();
      } else if (ctrl && k === 'd') {
        ev.preventDefault();
        this.estado.duplicarSeleccionado();
      } else if (ctrl && k === 'c') {
        if (this.estado.copiarSeleccionado()) notificar('Copiado. Pégalo con Ctrl+V (también en otra escena).', 'ok');
      } else if (ctrl && k === 'v') {
        if (this.estado.pegar() < 0) notificar('No hay nada copiado. Selecciona un objeto y pulsa Ctrl+C.');
      }
    });
  }
}
