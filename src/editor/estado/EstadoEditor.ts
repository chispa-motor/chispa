/**
 * ESTADO DEL EDITOR: el proyecto que se está editando y todo lo que se le hace.
 *
 * DECISIÓN: aquí NO hay nada de interfaz (ni botones ni HTML). Toda la lógica
 * de "crear objeto", "renombrar", "deshacer"... vive aquí, y la interfaz solo
 * llama a estas funciones y se redibuja cuando el estado avisa de un cambio.
 * Así se puede probar todo con tests, sin navegador.
 *
 * DESHACER / REHACER: antes de cada cambio guardamos una "foto" (el proyecto
 * en JSON). Deshacer = volver a la foto anterior. Es la forma más sencilla y
 * a prueba de fallos (los proyectos son pequeños).
 * El código de los scripts NO entra en este historial: el editor de código
 * tiene su propio deshacer, letra a letra (como en cualquier editor).
 */
import { migrarProyecto, proyectoVacio, tipoPorNombre, type DefEscena, type DefObjeto, type DefProyecto } from '../../proyecto/formato';
import type { DefAnimacion } from '../../objetos/componentes/Animador';
import type { TipoCasilla } from '../../objetos/componentes/MapaCasillas';
import { normalizar } from '../../utilidades/texto';

/** A qué objeto se refiere una selección: uno de una escena, o una plantilla. */
export type RefObjeto = { tipo: 'escena'; escena: string; indice: number } | { tipo: 'plantilla'; nombre: string };

/** Qué ha cambiado (para que cada panel sepa si tiene que redibujarse). */
export type TipoCambio = 'proyecto' | 'seleccion' | 'objetos' | 'escena' | 'recursos' | 'scripts' | 'codigo' | 'historial' | 'archivos';

export type TipoNuevoObjeto = 'rectangulo' | 'circulo' | 'texto' | 'boton' | 'imagen' | 'mapa' | 'vacio';

const MAXIMO_HISTORIAL = 100;
const COLORES_NUEVOS = ['#4aa3ff', '#ff6b6b', '#ffd23f', '#5ad17a', '#b57cff', '#ff9f45', '#3ad6c9'];

export class EstadoEditor {
  proyecto: DefProyecto;
  escenaActual: string;
  seleccion: RefObjeto | null = null;
  /** Scripts abiertos en pestañas, y la pestaña activa ('escena' = la vista de la escena). */
  pestanas: string[] = [];
  pestanaActiva = 'escena';
  /** ¿Hay cambios sin guardar? */
  modificado = false;

  private pasado: string[] = [];
  private futuro: string[] = [];
  private oyentes = new Set<(c: TipoCambio) => void>();
  /** Foto guardada al empezar un cambio largo (arrastrar, pintar): se apunta una sola vez al terminar. */
  private fotoPendiente: string | null = null;
  private colorSiguiente = 0;

  constructor(proyecto: DefProyecto = proyectoVacio()) {
    this.proyecto = migrarProyecto(proyecto);
    this.escenaActual = this.proyecto.escenaInicial;
  }

  // ═════════════════════════ Avisos de cambios ═════════════════════════

  alCambiar(fn: (c: TipoCambio) => void): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  private avisar(c: TipoCambio): void {
    for (const fn of this.oyentes) fn(c);
  }

  // ═════════════════════════ Deshacer / rehacer ═════════════════════════

  /** Hace un cambio que se puede deshacer. */
  cambiar(tipo: TipoCambio, fn: () => void): void {
    const foto = this.fotoPendiente ?? JSON.stringify(this.proyecto);
    fn();
    if (this.fotoPendiente === null) this.apuntar(foto);
    this.modificado = true;
    this.avisar(tipo);
  }

  /** Para cambios que duran (arrastrar un objeto, pintar casillas): se deshacen de una vez. */
  empezarCambioLargo(): void {
    this.fotoPendiente = JSON.stringify(this.proyecto);
  }
  terminarCambioLargo(): void {
    if (this.fotoPendiente === null) return;
    if (this.fotoPendiente !== JSON.stringify(this.proyecto)) this.apuntar(this.fotoPendiente);
    this.fotoPendiente = null;
  }

  private apuntar(foto: string): void {
    this.pasado.push(foto);
    if (this.pasado.length > MAXIMO_HISTORIAL) this.pasado.shift();
    this.futuro = [];
    this.avisar('historial');
  }

  get puedeDeshacer(): boolean {
    return this.pasado.length > 0;
  }
  get puedeRehacer(): boolean {
    return this.futuro.length > 0;
  }

  deshacer(): void {
    const foto = this.pasado.pop();
    if (!foto) return;
    this.futuro.push(JSON.stringify(this.proyecto));
    this.restaurar(foto);
  }

  rehacer(): void {
    const foto = this.futuro.pop();
    if (!foto) return;
    this.pasado.push(JSON.stringify(this.proyecto));
    this.restaurar(foto);
  }

  private restaurar(foto: string): void {
    this.proyecto = JSON.parse(foto);
    if (!this.proyecto.escenas[this.escenaActual]) this.escenaActual = this.proyecto.escenaInicial;
    if (this.seleccion && !this.definicion(this.seleccion)) this.seleccion = null;
    this.pestanas = this.pestanas.filter((p) => p in this.proyecto.scripts);
    if (this.pestanaActiva !== 'escena' && !(this.pestanaActiva in this.proyecto.scripts)) this.pestanaActiva = 'escena';
    this.modificado = true;
    this.avisar('proyecto');
  }

  // ═════════════════════════ Proyecto entero ═════════════════════════

  /** Abre otro proyecto (borra el historial). */
  abrir(datos: unknown): void {
    this.proyecto = migrarProyecto(datos);
    this.escenaActual = this.proyecto.escenaInicial;
    this.seleccion = null;
    this.pestanas = [];
    this.pestanaActiva = 'escena';
    this.pasado = [];
    this.futuro = [];
    this.modificado = false;
    this.avisar('proyecto');
  }

  aJSON(): string {
    return JSON.stringify(this.proyecto, null, 2);
  }

  marcarGuardado(): void {
    this.modificado = false;
    this.avisar('historial');
  }

  renombrarProyecto(nombre: string): void {
    const n = nombre.trim();
    if (!n) return;
    this.cambiar('proyecto', () => (this.proyecto.nombre = n));
  }

  /** Tamaño de la pantalla del juego y pixel art. */
  cambiarAjusteProyecto(ajuste: 'ancho' | 'alto' | 'pixelArt', valor: number | boolean): void {
    this.cambiar('proyecto', () => {
      if (ajuste === 'pixelArt') this.proyecto.pixelArt = Boolean(valor);
      else this.proyecto[ajuste] = Math.max(64, Math.min(4096, Math.round(Number(valor) || 0)));
    });
  }

  // ═════════════════════════ Selección ═════════════════════════

  get escena(): DefEscena {
    return this.proyecto.escenas[this.escenaActual];
  }

  seleccionar(ref: RefObjeto | null): void {
    this.seleccion = ref;
    this.avisar('seleccion');
  }

  seleccionarIndice(indice: number | null): void {
    this.seleccionar(indice === null ? null : { tipo: 'escena', escena: this.escenaActual, indice });
  }

  /** La definición (JSON) del objeto al que apunta una referencia. */
  definicion(ref: RefObjeto): DefObjeto | null {
    if (ref.tipo === 'plantilla') return this.proyecto.plantillas[ref.nombre] ?? null;
    return this.proyecto.escenas[ref.escena]?.objetos[ref.indice] ?? null;
  }

  get seleccionado(): DefObjeto | null {
    return this.seleccion ? this.definicion(this.seleccion) : null;
  }

  // ═════════════════════════ Objetos ═════════════════════════

  /** Un nombre que no está en uso en la escena: "Cuadrado", "Cuadrado2", "Cuadrado3"... */
  nombreLibre(base: string, usados: string[] = this.escena.objetos.map((o) => o.nombre ?? '')): string {
    const ocupados = new Set(usados.map(normalizar));
    if (!ocupados.has(normalizar(base))) return base;
    // "Moneda2" ocupado → "Moneda3" (y no "Moneda22"). Los archivos (.chs) conservan su extensión.
    const extension = /\.[a-z]+$/i.exec(base)?.[0] ?? '';
    const raiz = tipoPorNombre(base.slice(0, base.length - extension.length));
    for (let i = 2; ; i++) if (!ocupados.has(normalizar(`${raiz}${i}${extension}`))) return `${raiz}${i}${extension}`;
  }

  /** Crea un objeto nuevo en la escena actual y lo selecciona. Devuelve su posición en la lista. */
  crearObjeto(tipo: TipoNuevoObjeto, x: number, y: number, imagen?: string): number {
    const color = COLORES_NUEVOS[this.colorSiguiente++ % COLORES_NUEVOS.length];
    const base: Record<TipoNuevoObjeto, [string, DefObjeto]> = {
      rectangulo: ['Cuadrado', { sprite: { forma: 'rectangulo', color, ancho: 64, alto: 64 }, colision: {} }],
      circulo: ['Circulo', { sprite: { forma: 'circulo', color, ancho: 64, alto: 64 }, colision: {} }],
      // Los textos nuevos son de INTERFAZ (pegados a la pantalla): casi siempre son vidas, puntos o títulos
      texto: ['Texto', { sprite: { forma: 'texto', texto: 'Texto', tamano: 32, color: 'blanco', ancho: 160, alto: 40, fijo: true } }],
      boton: ['Boton', { sprite: { forma: 'rectangulo', color: '#3b82f6', ancho: 180, alto: 56, texto: 'Boton', tamano: 24, fijo: true } }],
      imagen: [imagen ?? 'Imagen', { sprite: { imagen, ancho: 64, alto: 64 }, colision: {} }],
      mapa: ['Mapa', { mapa: { tamano: 48, tipos: { suelo: { color: '#5ad17a', solida: true } }, celdas: {} } }],
      vacio: ['Objeto', {}],
    };
    const [nombre, def] = base[tipo];
    // Los mapas empiezan en la esquina (0, 0); lo demás, donde se ha pedido
    const pos = tipo === 'mapa' ? { x: 0, y: 0 } : { x: Math.round(x), y: Math.round(y) };
    let indice = -1;
    this.cambiar('objetos', () => {
      this.escena.objetos.push({ nombre: this.nombreLibre(nombre), ...pos, ...structuredClone(def) });
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return indice;
  }

  borrarSeleccionado(): void {
    const ref = this.seleccion;
    if (!ref) return;
    this.cambiar('objetos', () => {
      if (ref.tipo === 'plantilla') delete this.proyecto.plantillas[ref.nombre];
      else this.proyecto.escenas[ref.escena].objetos.splice(ref.indice, 1);
    });
    this.seleccionar(null);
  }

  duplicarSeleccionado(): void {
    const ref = this.seleccion;
    const def = this.seleccionado;
    if (!ref || ref.tipo !== 'escena' || !def) return;
    let indice = -1;
    this.cambiar('objetos', () => {
      const copia = structuredClone(def);
      copia.nombre = this.nombreLibre(def.nombre ?? 'Objeto');
      copia.x = (def.x ?? 0) + 24;
      copia.y = (def.y ?? 0) - 24;
      this.escena.objetos.splice(ref.indice + 1, 0, copia);
      indice = ref.indice + 1;
    });
    this.seleccionarIndice(indice);
  }

  /** Copia del objeto seleccionado (Ctrl+C), para pegarla en esta u otra escena (Ctrl+V). */
  portapapeles: DefObjeto | null = null;

  copiarSeleccionado(): boolean {
    const def = this.seleccion?.tipo === 'escena' ? this.seleccionado : null;
    if (!def) return false;
    this.portapapeles = structuredClone(def);
    this.avisar('seleccion'); // para que aparezca el botón Pegar
    return true;
  }

  /** Pega lo copiado en la escena actual. Si ya hay uno en ese sitio, un poco desplazado. Devuelve su posición en la lista. */
  pegar(): number {
    const copia = this.portapapeles;
    if (!copia) return -1;
    let indice = -1;
    this.cambiar('objetos', () => {
      const nuevo = structuredClone(copia);
      nuevo.nombre = this.nombreLibre(copia.nombre ?? 'Objeto');
      while (this.escena.objetos.some((o) => o.x === nuevo.x && o.y === nuevo.y && !o.mapa)) {
        nuevo.x = (nuevo.x ?? 0) + 24;
        nuevo.y = (nuevo.y ?? 0) - 24;
      }
      this.escena.objetos.push(nuevo);
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return indice;
  }

  /** Cambia el orden (sube o baja en la lista). */
  moverEnLista(indice: number, hacia: number): void {
    const lista = this.escena.objetos;
    const destino = Math.max(0, Math.min(lista.length - 1, hacia));
    if (destino === indice) return;
    this.cambiar('objetos', () => lista.splice(destino, 0, lista.splice(indice, 1)[0]));
    this.seleccionarIndice(destino);
  }

  /** Renombra un objeto (sin repetir nombre en la escena). Devuelve el nombre final. */
  renombrar(ref: RefObjeto, nombre: string): string {
    const def = this.definicion(ref);
    const limpio = nombre.trim().replace(/\s+/g, '');
    if (!def || !limpio || limpio === def.nombre) return def?.nombre ?? '';
    if (ref.tipo === 'plantilla') {
      const final = this.nombreLibre(limpio, Object.keys(this.proyecto.plantillas));
      this.cambiar('objetos', () => {
        this.proyecto.plantillas[final] = this.proyecto.plantillas[ref.nombre];
        delete this.proyecto.plantillas[ref.nombre];
      });
      this.seleccionar({ tipo: 'plantilla', nombre: final });
      return final;
    }
    const otros = this.proyecto.escenas[ref.escena].objetos.filter((o) => o !== def).map((o) => o.nombre ?? '');
    const final = this.nombreLibre(limpio, otros);
    this.cambiar('objetos', () => (def.nombre = final));
    return final;
  }

  /** Mueve un objeto. Si se está arrastrando (cambio largo), se deshace de una vez. */
  moverObjeto(ref: RefObjeto, x: number, y: number): void {
    const def = this.definicion(ref);
    if (!def) return;
    this.cambiar('objetos', () => {
      def.x = Math.round(x);
      def.y = Math.round(y);
    });
  }

  /**
   * Cambia una propiedad con una "ruta": "rotacion", "sprite.color", "fisica.masa"...
   * `undefined` quita la propiedad (vuelve al valor por defecto).
   */
  cambiarPropiedad(ref: RefObjeto, ruta: string, valor: unknown): void {
    const def = this.definicion(ref);
    if (!def) return;
    this.cambiar('objetos', () => {
      const partes = ruta.split('.');
      let actual = def as Record<string, unknown>;
      for (const p of partes.slice(0, -1)) {
        if (typeof actual[p] !== 'object' || actual[p] === null) actual[p] = {};
        actual = actual[p] as Record<string, unknown>;
      }
      const ultima = partes[partes.length - 1];
      if (valor === undefined) delete actual[ultima];
      else actual[ultima] = valor;
    });
  }

  /** Pone o quita un componente entero: sprite, colision, fisica o mapa. */
  activarComponente(ref: RefObjeto, componente: 'sprite' | 'colision' | 'fisica' | 'mapa', activo: boolean): void {
    const porDefecto = {
      sprite: { forma: 'rectangulo', color: '#4aa3ff', ancho: 64, alto: 64 },
      colision: {},
      fisica: {},
      mapa: { tamano: 48, tipos: { suelo: { color: '#5ad17a', solida: true } }, celdas: {} },
    };
    this.cambiarPropiedad(ref, componente, activo ? structuredClone(porDefecto[componente]) : undefined);
  }

  /** Propiedades propias (vida = 3...). */
  cambiarPropiedadPropia(ref: RefObjeto, nombre: string, valor: number | string | boolean | undefined): void {
    const def = this.definicion(ref);
    if (!def || !nombre.trim()) return;
    this.cambiar('objetos', () => {
      def.propiedades ??= {};
      if (valor === undefined) delete def.propiedades[nombre];
      else def.propiedades[nombre.trim()] = valor;
      if (Object.keys(def.propiedades).length === 0) delete def.propiedades;
    });
  }

  // ═════════════════════════ Scripts ═════════════════════════

  /** Crea un script para un objeto (si no tiene) y lo abre. Devuelve el nombre del archivo. */
  crearScriptPara(ref: RefObjeto): string | null {
    const def = this.definicion(ref);
    if (!def) return null;
    if (def.script && def.script in this.proyecto.scripts) {
      this.abrirScript(def.script);
      return def.script;
    }
    const nombre = def.nombre ?? (ref.tipo === 'plantilla' ? ref.nombre : 'objeto');
    const archivo = this.nombreLibre(`${nombre.toLowerCase()}.chs`, Object.keys(this.proyecto.scripts));
    this.cambiar('scripts', () => {
      this.proyecto.scripts[archivo] = plantillaDeScript(nombre);
      def.script = archivo;
    });
    this.abrirScript(archivo);
    return archivo;
  }

  crearScriptSuelto(nombre: string): string {
    const base = nombre.trim().toLowerCase().replace(/\s+/g, '_').replace(/\.chs$/, '') || 'script';
    const archivo = this.nombreLibre(`${base}.chs`, Object.keys(this.proyecto.scripts));
    this.cambiar('scripts', () => (this.proyecto.scripts[archivo] = `# ${archivo}\n`));
    this.abrirScript(archivo);
    return archivo;
  }

  /** Guarda el código de un script (mientras se escribe: no entra en el historial de deshacer). */
  cambiarCodigo(archivo: string, codigo: string): void {
    if (this.proyecto.scripts[archivo] === codigo) return;
    this.proyecto.scripts[archivo] = codigo;
    this.modificado = true;
    this.avisar('codigo');
  }

  asignarScript(ref: RefObjeto, archivo: string | null): void {
    this.cambiarPropiedad(ref, 'script', archivo ?? undefined);
  }

  renombrarScript(viejo: string, nuevo: string): string {
    let n = nuevo.trim().replace(/\s+/g, '_');
    if (!n.endsWith('.chs')) n += '.chs';
    if (n === viejo || !(viejo in this.proyecto.scripts)) return viejo;
    const final = this.nombreLibre(n, Object.keys(this.proyecto.scripts));
    this.cambiar('scripts', () => {
      this.proyecto.scripts[final] = this.proyecto.scripts[viejo];
      delete this.proyecto.scripts[viejo];
      for (const o of this.todosLosObjetos()) if (o.script === viejo) o.script = final;
    });
    this.pestanas = this.pestanas.map((p) => (p === viejo ? final : p));
    if (this.pestanaActiva === viejo) this.pestanaActiva = final;
    this.avisar('archivos');
    return final;
  }

  borrarScript(archivo: string): void {
    this.cambiar('scripts', () => {
      delete this.proyecto.scripts[archivo];
      for (const o of this.todosLosObjetos()) if (o.script === archivo) delete o.script;
    });
    this.cerrarPestana(archivo);
  }

  abrirScript(archivo: string): void {
    if (!this.pestanas.includes(archivo)) this.pestanas.push(archivo);
    this.pestanaActiva = archivo;
    this.avisar('archivos');
  }

  cerrarPestana(archivo: string): void {
    this.pestanas = this.pestanas.filter((p) => p !== archivo);
    if (this.pestanaActiva === archivo) this.pestanaActiva = this.pestanas[this.pestanas.length - 1] ?? 'escena';
    this.avisar('archivos');
  }

  activarPestana(p: string): void {
    this.pestanaActiva = p;
    this.avisar('archivos');
  }

  /** Todos los objetos del proyecto (todas las escenas y plantillas). */
  todosLosObjetos(): DefObjeto[] {
    return [...Object.values(this.proyecto.escenas).flatMap((e) => e.objetos), ...Object.values(this.proyecto.plantillas)];
  }

  // ═════════════════════════ Escenas ═════════════════════════

  cambiarEscenaActual(nombre: string): void {
    if (!this.proyecto.escenas[nombre]) return;
    this.escenaActual = nombre;
    this.seleccion = null;
    this.avisar('escena');
  }

  crearEscena(nombre = 'Nivel'): string {
    const final = this.nombreLibre(nombre.trim() || 'Nivel', Object.keys(this.proyecto.escenas));
    this.cambiar('escena', () => (this.proyecto.escenas[final] = { colorFondo: this.escena.colorFondo, objetos: [] }));
    this.cambiarEscenaActual(final);
    return final;
  }

  duplicarEscena(nombre: string): string {
    const final = this.nombreLibre(nombre, Object.keys(this.proyecto.escenas));
    this.cambiar('escena', () => (this.proyecto.escenas[final] = structuredClone(this.proyecto.escenas[nombre])));
    this.cambiarEscenaActual(final);
    return final;
  }

  renombrarEscena(viejo: string, nuevo: string): string {
    const limpio = nuevo.trim();
    if (!limpio || limpio === viejo || !this.proyecto.escenas[viejo]) return viejo;
    const final = this.nombreLibre(limpio, Object.keys(this.proyecto.escenas));
    this.cambiar('escena', () => {
      // Reconstruimos el objeto para conservar el ORDEN de las escenas
      const nuevas: Record<string, DefEscena> = {};
      for (const [k, v] of Object.entries(this.proyecto.escenas)) nuevas[k === viejo ? final : k] = v;
      this.proyecto.escenas = nuevas;
      if (this.proyecto.escenaInicial === viejo) this.proyecto.escenaInicial = final;
    });
    if (this.escenaActual === viejo) this.escenaActual = final;
    this.avisar('escena');
    return final;
  }

  /** Borra una escena (nunca la última). */
  borrarEscena(nombre: string): boolean {
    const nombres = Object.keys(this.proyecto.escenas);
    if (nombres.length <= 1 || !this.proyecto.escenas[nombre]) return false;
    this.cambiar('escena', () => {
      delete this.proyecto.escenas[nombre];
      if (this.proyecto.escenaInicial === nombre) this.proyecto.escenaInicial = Object.keys(this.proyecto.escenas)[0];
    });
    if (this.escenaActual === nombre) this.cambiarEscenaActual(this.proyecto.escenaInicial);
    return true;
  }

  ponerEscenaInicial(nombre: string): void {
    if (this.proyecto.escenas[nombre]) this.cambiar('escena', () => (this.proyecto.escenaInicial = nombre));
  }

  cambiarEscenaPropiedad(ruta: 'colorFondo' | 'gravedad' | 'camara.zoom' | 'camara.seguir' | 'camara.x' | 'camara.y' | 'camara.limitarAlMapa', valor: unknown): void {
    this.cambiar('escena', () => {
      const e = this.escena;
      if (ruta === 'colorFondo') e.colorFondo = String(valor);
      else if (ruta === 'gravedad') {
        if (valor === undefined) delete e.gravedad;
        else e.gravedad = Number(valor);
      } else {
        e.camara ??= {};
        if (ruta === 'camara.zoom') e.camara.zoom = Number(valor) || 1;
        else if (ruta === 'camara.limitarAlMapa') {
          if (valor) e.camara.limitarAlMapa = true;
          else delete e.camara.limitarAlMapa;
        } else if (ruta === 'camara.seguir') {
          if (valor) e.camara.seguir = String(valor);
          else delete e.camara.seguir;
        } else {
          const eje = ruta === 'camara.x' ? 'x' : 'y';
          if (valor === undefined) delete e.camara[eje];
          else e.camara[eje] = Number(valor);
        }
      }
    });
  }

  // ═════════════════════════ Plantillas ═════════════════════════

  /**
   * Convierte el objeto en una plantilla (para crear("Nombre") desde el código):
   * lo SACA de la escena y lo guarda en Plantillas. Para poner copias en la
   * escena, se arrastra la plantilla desde el panel Proyecto.
   */
  convertirEnPlantilla(ref: RefObjeto): string | null {
    const def = this.definicion(ref);
    if (!def || ref.tipo !== 'escena') return null;
    const nombre = this.nombreLibre(tipoPorNombre(def.nombre ?? 'Plantilla'), Object.keys(this.proyecto.plantillas));
    this.cambiar('recursos', () => {
      const copia = structuredClone(def);
      delete copia.nombre;
      delete copia.tipo;
      copia.x = 0;
      copia.y = 0;
      this.proyecto.plantillas[nombre] = copia;
      this.proyecto.escenas[ref.escena].objetos.splice(ref.indice, 1);
    });
    this.seleccionar({ tipo: 'plantilla', nombre });
    return nombre;
  }

  /** Pone una copia de una plantilla en la escena. */
  colocarPlantilla(nombre: string, x: number, y: number): number {
    const p = this.proyecto.plantillas[nombre];
    if (!p) return -1;
    let indice = -1;
    this.cambiar('objetos', () => {
      this.escena.objetos.push({ ...structuredClone(p), nombre: this.nombreLibre(nombre), tipo: nombre, x: Math.round(x), y: Math.round(y) });
      indice = this.escena.objetos.length - 1;
    });
    this.seleccionarIndice(indice);
    return indice;
  }

  crearPlantillaVacia(nombre = 'Plantilla'): string {
    const final = this.nombreLibre(nombre, Object.keys(this.proyecto.plantillas));
    this.cambiar('recursos', () => (this.proyecto.plantillas[final] = { sprite: { forma: 'rectangulo', color: '#ff6b6b', ancho: 32, alto: 32 }, colision: {} }));
    this.seleccionar({ tipo: 'plantilla', nombre: final });
    return final;
  }

  // ═════════════════════════ Imágenes, sonidos y animaciones ═════════════════════════

  /** Añade una imagen (como "data URL"). Devuelve el nombre final (sin repetir). */
  agregarImagen(nombre: string, datos: string): string {
    const final = this.nombreLibre(nombreDeRecurso(nombre), Object.keys(this.proyecto.imagenes));
    this.cambiar('recursos', () => (this.proyecto.imagenes[final] = datos));
    return final;
  }

  borrarImagen(nombre: string): void {
    this.cambiar('recursos', () => {
      delete this.proyecto.imagenes[nombre];
      for (const o of this.todosLosObjetos()) if (o.sprite?.imagen === nombre) delete o.sprite.imagen;
      for (const a of Object.values(this.proyecto.animaciones)) a.fotogramas = a.fotogramas.filter((f) => f !== nombre);
    });
  }

  agregarSonido(nombre: string, datos: string): string {
    const final = this.nombreLibre(nombreDeRecurso(nombre), Object.keys(this.proyecto.sonidos));
    this.cambiar('recursos', () => (this.proyecto.sonidos[final] = datos));
    return final;
  }

  borrarSonido(nombre: string): void {
    this.cambiar('recursos', () => delete this.proyecto.sonidos[nombre]);
  }

  crearAnimacion(nombre: string, fotogramas: string[] = []): string {
    const final = this.nombreLibre(nombreDeRecurso(nombre || 'animacion'), Object.keys(this.proyecto.animaciones));
    this.cambiar('recursos', () => (this.proyecto.animaciones[final] = { fotogramas, velocidad: 8, repetir: true }));
    return final;
  }

  cambiarAnimacion(nombre: string, cambios: Partial<DefAnimacion>): void {
    const a = this.proyecto.animaciones[nombre];
    if (a) this.cambiar('recursos', () => Object.assign(a, cambios));
  }

  borrarAnimacion(nombre: string): void {
    this.cambiar('recursos', () => {
      delete this.proyecto.animaciones[nombre];
      for (const o of this.todosLosObjetos()) if (o.animacion === nombre) delete o.animacion;
    });
  }

  // ═════════════════════════ Mapas de casillas ═════════════════════════

  /** Pinta (o borra, con tipo null) una casilla. Para pintar arrastrando, usar empezar/terminarCambioLargo. */
  pintarCasilla(ref: RefObjeto, columna: number, fila: number, tipo: string | null): void {
    const mapa = this.definicion(ref)?.mapa;
    if (!mapa) return;
    const clave = `${columna},${fila}`;
    if ((mapa.celdas[clave] ?? null) === tipo) return;
    this.cambiar('objetos', () => {
      if (tipo === null) delete mapa.celdas[clave];
      else mapa.celdas[clave] = tipo;
    });
  }

  /** Pinta (o borra) todas las casillas de un rectángulo (Mayús + arrastrar con el pincel). */
  pintarRectangulo(ref: RefObjeto, c0: number, f0: number, c1: number, f1: number, tipo: string | null): void {
    const mapa = this.definicion(ref)?.mapa;
    if (!mapa) return;
    const [ca, cb] = [Math.min(c0, c1), Math.max(c0, c1)];
    const [fa, fb] = [Math.min(f0, f1), Math.max(f0, f1)];
    if ((cb - ca + 1) * (fb - fa + 1) > 250_000) return; // demasiado grande: seguro que es un error
    this.cambiar('objetos', () => {
      for (let c = ca; c <= cb; c++) {
        for (let f = fa; f <= fb; f++) {
          if (tipo === null) delete mapa.celdas[`${c},${f}`];
          else mapa.celdas[`${c},${f}`] = tipo;
        }
      }
    });
  }

  /** Crea o cambia un tipo de casilla. */
  ponerTipoCasilla(ref: RefObjeto, nombre: string, tipo: TipoCasilla): string {
    const mapa = this.definicion(ref)?.mapa;
    const limpio = nombreDeRecurso(nombre || 'casilla');
    if (!mapa) return limpio;
    this.cambiar('objetos', () => (mapa.tipos[limpio] = tipo));
    return limpio;
  }

  borrarTipoCasilla(ref: RefObjeto, nombre: string): void {
    const mapa = this.definicion(ref)?.mapa;
    if (!mapa || Object.keys(mapa.tipos).length <= 1) return;
    this.cambiar('objetos', () => {
      delete mapa.tipos[nombre];
      for (const [k, v] of Object.entries(mapa.celdas)) if (v === nombre) delete mapa.celdas[k];
    });
  }
}

/** "Mi Imagen (1).png" → "MiImagen1" (un nombre fácil de escribir en el código). */
export function nombreDeRecurso(archivo: string): string {
  const sinExtension = archivo.replace(/\.[a-z0-9]+$/i, '');
  const limpio = sinExtension.normalize('NFC').replace(/[^\p{L}\p{N}_]/gu, '');
  return /^\p{L}/u.test(limpio) ? limpio : `r${limpio || 'ecurso'}`;
}

function plantillaDeScript(nombre: string): string {
  return [
    `# Script de ${nombre}`,
    '# Aquí dices qué hace este objeto. ¿Ideas? Mira la pestaña Guía > Recetas.',
    '',
    'cuando empieza:',
    '    mostrar("Hola, soy " + yo.nombre)',
    '',
    '# Para moverte con las flechas, quita los # de estas dos líneas:',
    '# cuando cada fotograma:',
    '#     yo.moverConFlechas(300)',
    '',
  ].join('\n');
}
