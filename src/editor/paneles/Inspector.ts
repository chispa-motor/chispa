/**
 * PANEL DE PROPIEDADES (el "Inspector" de Unity): enseña y cambia todo lo del
 * objeto seleccionado. Si no hay nada seleccionado, enseña los ajustes de la
 * escena y del proyecto.
 *
 * Cada parte del objeto (dibujo, colisión, física, mapa...) es una sección
 * que se puede plegar, y las opcionales tienen un interruptor para ponerlas
 * o quitarlas (como los componentes de Unity).
 */
import { NOMBRES_COLORES } from '../../motor/Color';
import { tipoPorNombre, type DefObjeto } from '../../proyecto/formato';
import type { EstadoEditor, RefObjeto } from '../estado/EstadoEditor';
import type { VistaEscena } from '../escena/VistaEscena';
import { botonIcono, h, icono, rellenar } from '../interfaz/dom';
import { confirmar, notificar, pedirTexto } from '../interfaz/dialogos';
import { campoCasilla, campoColor, campoLista, campoNumero, campoTexto, seccion } from './campos';

export class Inspector {
  readonly elemento = h('div', { class: 'inspector' });
  /** Secciones que el usuario ha plegado (se recuerdan al redibujar). */
  private plegadas = new Set<string>();

  constructor(
    private estado: EstadoEditor,
    private vista: VistaEscena,
  ) {
    estado.alCambiar((c) => {
      if (c !== 'codigo' && c !== 'historial') this.dibujar();
    });
    vista.alCambiarHerramienta = () => this.dibujar();
    this.dibujar();
  }

  dibujar(): void {
    // Recordamos dónde estaba el cursor para devolverlo al mismo campo
    const enfocado = (document.activeElement as HTMLElement | null)?.dataset?.ruta;
    const scroll = this.elemento.scrollTop;
    const ref = this.estado.seleccion;
    const def = this.estado.seleccionado;
    if (ref && def) rellenar(this.elemento, ...this.objeto(ref, def));
    else rellenar(this.elemento, ...this.ajustesEscena());
    for (const d of this.elemento.querySelectorAll('details')) {
      const titulo = d.querySelector('.seccion-titulo')?.textContent ?? '';
      if (this.plegadas.has(titulo)) d.open = false;
      d.addEventListener('toggle', () => (d.open ? this.plegadas.delete(titulo) : this.plegadas.add(titulo)));
    }
    this.elemento.scrollTop = scroll;
    if (enfocado) this.elemento.querySelector<HTMLElement>(`[data-ruta="${CSS.escape(enfocado)}"]`)?.focus();
  }

  // ═════════════════════════ Un objeto ═════════════════════════

  private objeto(ref: RefObjeto, def: DefObjeto): HTMLElement[] {
    const e = this.estado;
    const cambiar = (ruta: string) => (v: unknown) => e.cambiarPropiedad(ref, ruta, v);
    const largo = { empezar: () => e.empezarCambioLargo(), terminar: () => e.terminarCambioLargo() };
    const esPlantilla = ref.tipo === 'plantilla';
    const nombre = esPlantilla ? ref.nombre : def.nombre ?? '';

    const cabecera = h('div', { class: 'inspector-cabecera' },
      icono(esPlantilla ? 'plantilla' : def.mapa ? 'mapa' : def.sprite?.forma === 'texto' ? 'texto' : 'objeto', 20),
      h('input', {
        class: 'campo nombre-objeto',
        value: nombre,
        spellcheck: 'false',
        'data-ruta': 'nombre',
        title: esPlantilla ? 'Nombre de la plantilla (el que usas en crear("…"))' : 'Nombre del objeto (el que usas en buscar("…") y en "cuando toco …")',
        onchange: (ev: Event) => e.renombrar(ref, (ev.target as HTMLInputElement).value),
      }),
    );
    const info = esPlantilla
      ? h('p', { class: 'nota' }, 'Plantilla: no está en la escena. Créala desde el código con ', h('code', {}, `crear("${nombre}")`), ' o arrástrala a la escena.')
      : def.tipo && def.tipo !== def.nombre
        ? h('p', { class: 'nota' }, 'Copia de la plantilla ', h('code', {}, def.tipo), '.')
        : /\d$/.test(nombre) && tipoPorNombre(nombre) !== nombre
          ? h('p', { class: 'nota' }, 'Tipo: ', h('code', {}, tipoPorNombre(nombre)), `. "cuando toco ${tipoPorNombre(nombre)}" vale para todas las copias.`)
          : null;

    const partes: (HTMLElement | null)[] = [cabecera, info];

    // Transformación
    partes.push(seccion('Posición', [
      esPlantilla ? null : h('div', { class: 'dos-columnas' },
        campoNumero('x', 'x', def.x ?? 0, (v) => e.moverObjeto(ref, v ?? 0, def.y ?? 0), { ...largo, ayuda: def.sprite?.fijo ? 'Distancia desde el borde IZQUIERDO de la pantalla' : 'Posición horizontal (crece hacia la derecha)' }),
        campoNumero('y', 'y', def.y ?? 0, (v) => e.moverObjeto(ref, def.x ?? 0, v ?? 0), { ...largo, ayuda: def.sprite?.fijo ? 'Distancia desde el borde de ABAJO de la pantalla' : 'Posición vertical (crece hacia ARRIBA)' }),
      ),
      h('div', { class: 'dos-columnas' },
        campoNumero('rotacion', 'rotacion', def.rotacion ?? 0, (v) => cambiar('rotacion')(v || undefined), { ...largo, paso: 5, ayuda: 'Giro en grados (positivo = contra las agujas del reloj)' }),
        campoNumero('escala', 'escala', def.escala ?? 1, (v) => cambiar('escala')(v === 1 ? undefined : v), { ...largo, paso: 0.1, min: 0.05, ayuda: '1 = tamaño normal, 2 = el doble' }),
      ),
    ]));

    // Dibujo
    const s = def.sprite;
    const imagenes = Object.keys(e.proyecto.imagenes);
    const aspecto = s
      ? [
          campoLista('dibujo', 'sprite.dibujo', s.imagen ? `imagen:${s.imagen}` : s.forma ?? 'rectangulo',
            [['rectangulo', 'Rectángulo'], ['circulo', 'Círculo'], ['texto', 'Texto'], ...imagenes.map((i): [string, string] => [`imagen:${i}`, `Imagen: ${i}`])],
            (v) => {
              e.empezarCambioLargo();
              if (v.startsWith('imagen:')) {
                e.cambiarPropiedad(ref, 'sprite.imagen', v.slice(7));
                e.cambiarPropiedad(ref, 'sprite.forma', undefined);
              } else {
                e.cambiarPropiedad(ref, 'sprite.imagen', undefined);
                e.cambiarPropiedad(ref, 'sprite.forma', v);
                if (v === 'texto' && !s.texto) e.cambiarPropiedad(ref, 'sprite.texto', 'Texto');
              }
              e.terminarCambioLargo();
            },
            'Qué se dibuja: una forma de color, un texto o una imagen del proyecto'),
          s.imagen ? null : campoColor('color', 'sprite.color', s.color ?? 'blanco', cambiar('sprite.color')),
          h('div', { class: 'dos-columnas' },
            campoNumero('ancho', 'sprite.ancho', s.ancho ?? 64, cambiar('sprite.ancho'), { ...largo, min: 1 }),
            campoNumero('alto', 'sprite.alto', s.alto ?? 64, cambiar('sprite.alto'), { ...largo, min: 1 }),
          ),
          s.forma === 'texto' || s.texto
            ? campoTexto(s.forma === 'texto' ? 'texto' : 'etiqueta', 'sprite.texto', s.texto, (v) => cambiar('sprite.texto')(v || undefined), s.forma === 'texto' ? 'Lo que pone (desde el código: yo.texto = "…")' : 'Texto encima (para botones)')
            : h('button', { class: 'boton-enlace', onclick: () => cambiar('sprite.texto')('Boton') }, '+ Añadir un texto encima (para botones)'),
          s.forma === 'texto' || s.texto
            ? h('div', { class: 'dos-columnas' },
                campoNumero('tamaño', 'sprite.tamano', s.tamano ?? 24, cambiar('sprite.tamano'), { ...largo, min: 4, ayuda: 'Tamaño de la letra' }),
                s.forma === 'texto' && !s.imagen
                  ? campoLista('alinear', 'sprite.alinear', s.alinear ?? 'centro', [['izquierda', 'Izquierda'], ['centro', 'Centro'], ['derecha', 'Derecha']], cambiar('sprite.alinear'))
                  : campoColor('letra', 'sprite.colorTexto', s.colorTexto ?? 'blanco', cambiar('sprite.colorTexto'), 'Color de la letra'),
              )
            : null,
          h('div', { class: 'dos-columnas' },
            campoNumero('capa', 'sprite.capa', s.capa ?? 0, (v) => cambiar('sprite.capa')(v || undefined), { ...largo, ayuda: 'Las capas más altas se dibujan encima' }),
            campoNumero('opacidad', 'sprite.opacidad', s.opacidad ?? 1, (v) => cambiar('sprite.opacidad')(v === 1 ? undefined : v), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '1 = se ve entero, 0 = invisible' }),
          ),
          h('div', { class: 'casillas' },
            campoCasilla('visible', 'sprite.visible', s.visible ?? true, (v) => cambiar('sprite.visible')(v ? undefined : false)),
            s.imagen ? campoCasilla('voltear', 'sprite.voltear', s.voltear ?? false, (v) => cambiar('sprite.voltear')(v || undefined), 'Dibujar la imagen al revés (mirando a la izquierda)') : null,
            esPlantilla ? null : campoCasilla('fijo en pantalla', 'sprite.fijo', s.fijo ?? false, (v) => this.cambiarFijo(ref, def, v), 'Pegado a la pantalla: no se mueve con la cámara (para vidas, puntos, botones)'),
          ),
          Object.keys(e.proyecto.animaciones).length
            ? campoLista('animacion', 'animacion', def.animacion ?? '', [['', '(ninguna)'], ...Object.keys(e.proyecto.animaciones).map((a): [string, string] => [a, a])], (v) => cambiar('animacion')(v || undefined), 'Animación con la que empieza (desde el código: yo.animar("…"))')
            : null,
        ]
      : [];
    partes.push(seccion('Dibujo', aspecto, { activo: !!s, alActivar: (v) => e.activarComponente(ref, 'sprite', v), ayuda: 'Cómo se ve el objeto' }));

    // Colisión
    const c = def.colision;
    partes.push(seccion('Colisión', c ? [
      campoCasilla('sólido', 'colision.solido', c.solido ?? true, (v) => cambiar('colision.solido')(v ? undefined : false), 'Sólido: los objetos chocan con él. Si lo quitas es un "fantasma": se atraviesa, pero avisa con "cuando toco"'),
      h('div', { class: 'dos-columnas' },
        campoNumero('ancho', 'colision.ancho', c.ancho, cambiar('colision.ancho'), { ...largo, min: 1, vacio: 'igual', ayuda: 'Vacío = igual que el dibujo' }),
        campoNumero('alto', 'colision.alto', c.alto, cambiar('colision.alto'), { ...largo, min: 1, vacio: 'igual', ayuda: 'Vacío = igual que el dibujo' }),
      ),
      h('div', { class: 'dos-columnas' },
        campoNumero('mover x', 'colision.desplazamientoX', c.desplazamientoX ?? 0, (v) => cambiar('colision.desplazamientoX')(v || undefined), largo),
        campoNumero('mover y', 'colision.desplazamientoY', c.desplazamientoY ?? 0, (v) => cambiar('colision.desplazamientoY')(v || undefined), largo),
      ),
    ] : [], { activo: !!c, alActivar: (v) => e.activarComponente(ref, 'colision', v), ayuda: 'Para chocar con otros objetos y saber cuándo se tocan' }));

    // Física
    const f = def.fisica;
    partes.push(seccion('Física', f ? [
      campoCasilla('estático', 'fisica.estatico', f.estatico ?? false, (v) => cambiar('fisica.estatico')(v || undefined), 'Estático: no se mueve nunca (suelos, paredes, plataformas)'),
      h('div', { class: 'dos-columnas' },
        campoNumero('gravedad', 'fisica.gravedad', f.gravedad ?? 1, (v) => cambiar('fisica.gravedad')(v === 1 ? undefined : v), { ...largo, paso: 0.1, ayuda: '1 = normal, 0 = flota, 2 = cae el doble de rápido' }),
        campoNumero('masa', 'fisica.masa', f.masa ?? 1, (v) => cambiar('fisica.masa')(v === 1 ? undefined : v), { ...largo, paso: 0.5, min: 0.01, ayuda: 'Lo que pesa: los objetos con más masa empujan más' }),
      ),
      h('div', { class: 'dos-columnas' },
        campoNumero('rozamiento', 'fisica.rozamiento', f.rozamiento ?? 0.5, cambiar('fisica.rozamiento'), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '0 = resbala como en hielo, 1 = frena en seco' }),
        campoNumero('rebote', 'fisica.rebote', f.rebote ?? 0, (v) => cambiar('fisica.rebote')(v || undefined), { ...largo, paso: 0.1, min: 0, max: 1, ayuda: '0 = no rebota, 1 = rebota sin perder fuerza' }),
      ),
    ] : [], { activo: !!f, alActivar: (v) => {
      e.activarComponente(ref, 'fisica', v);
      if (v && !def.colision) e.activarComponente(ref, 'colision', true);
    }, ayuda: 'Gravedad, velocidad, choques y empujones' }));

    // Mapa de casillas
    if (def.mapa) partes.push(this.seccionMapa(ref, def));

    // Propiedades propias
    partes.push(this.seccionPropiedades(ref, def));

    // Script
    partes.push(this.seccionScript(ref, def));

    // Acciones
    partes.push(h('div', { class: 'acciones-objeto' },
      esPlantilla ? null : botonIcono('copiar', 'Duplicar (Ctrl+D)', () => e.duplicarSeleccionado(), 'Duplicar'),
      esPlantilla ? null : botonIcono('copiar', 'Copiar (Ctrl+C), para pegarlo en otra escena con Ctrl+V', () => {
        if (e.copiarSeleccionado()) notificar(`"${nombre}" copiado. Pégalo con Ctrl+V (también en otra escena).`, 'ok');
      }, 'Copiar'),
      esPlantilla ? null : botonIcono('plantilla', 'Convertir en plantilla: sale de la escena y se crea desde el código con crear("…"), como las balas o los enemigos que aparecen', async () => {
        const base = nombre.replace(/\d+$/, '') || nombre;
        if (!(await confirmar('Convertir en plantilla', `"${nombre}" saldrá de la escena y pasará a Proyecto > Plantillas. Desde el código lo crearás con crear("${base}"). Para poner copias en la escena, arrastra la plantilla desde el panel Proyecto.`, 'Convertir'))) return;
        const n = e.convertirEnPlantilla(ref);
        if (n) notificar(`Plantilla "${n}" lista. Úsala con crear("${n}")`, 'ok');
      }, 'Plantilla'),
      botonIcono('basura', 'Borrar (Supr)', async () => {
        if (await confirmar('Borrar', `¿Borrar "${nombre}"?`, 'Borrar', true)) e.borrarSeleccionado();
      }, 'Borrar', 'peligro'),
    ));
    return partes.filter((p): p is HTMLElement => !!p);
  }

  /** Al pegar un objeto a la pantalla (o despegarlo) conservamos dónde se ve. */
  private cambiarFijo(ref: RefObjeto, def: DefObjeto, fijo: boolean): void {
    const e = this.estado;
    const cam = e.escena.camara;
    const zoom = cam?.zoom ?? 1;
    const izq = (cam?.x ?? e.proyecto.ancho / 2) - e.proyecto.ancho / 2 / zoom;
    const abajo = (cam?.y ?? e.proyecto.alto / 2) - e.proyecto.alto / 2 / zoom;
    e.empezarCambioLargo();
    if (fijo) e.moverObjeto(ref, ((def.x ?? 0) - izq) * zoom, ((def.y ?? 0) - abajo) * zoom);
    else e.moverObjeto(ref, izq + (def.x ?? 0) / zoom, abajo + (def.y ?? 0) / zoom);
    e.cambiarPropiedad(ref, 'sprite.fijo', fijo || undefined);
    e.terminarCambioLargo();
  }

  private seccionMapa(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const mapa = def.mapa!;
    const tipos = Object.keys(mapa.tipos);
    if (!this.vista.tipoPincel || !mapa.tipos[this.vista.tipoPincel]) this.vista.tipoPincel = tipos[0] ?? null;
    const herramientas = h('div', { class: 'herramientas-mapa' },
      botonIcono('mover', 'Mover el mapa entero (V)', () => this.vista.ponerHerramienta('mover'), 'Mover', this.vista.herramienta === 'mover' ? 'activo' : ''),
      botonIcono('pincel', 'Pintar casillas (B)', () => this.vista.ponerHerramienta('pincel'), 'Pintar', this.vista.herramienta === 'pincel' ? 'activo' : ''),
      botonIcono('goma', 'Borrar casillas (E)', () => this.vista.ponerHerramienta('goma'), 'Borrar', this.vista.herramienta === 'goma' ? 'activo' : ''),
    );
    const imagenes = Object.keys(e.proyecto.imagenes);
    const listaTipos = h('div', { class: 'tipos-casilla' },
      tipos.map((nombre) => {
        const t = mapa.tipos[nombre];
        const elegido = this.vista.tipoPincel === nombre;
        const muestra = t.imagen && e.proyecto.imagenes[t.imagen]
          ? h('img', { class: 'muestra', src: e.proyecto.imagenes[t.imagen], alt: '' })
          : h('span', { class: 'muestra', style: `background:${t.color ?? 'gray'}` });
        return h('div', { class: `tipo-casilla ${elegido ? 'elegido' : ''}` },
          h('button', { class: 'elegir-tipo', title: `Pintar con "${nombre}"`, onclick: () => {
            this.vista.tipoPincel = nombre;
            if (this.vista.herramienta !== 'pincel') this.vista.ponerHerramienta('pincel');
            else this.dibujar();
          } }, muestra, h('span', {}, nombre)),
          h('div', { class: 'tipo-detalles' },
            campoColor('color', `tipo.${nombre}.color`, t.color ?? 'gris', (v) => e.ponerTipoCasilla(ref, nombre, { ...t, color: v })),
            imagenes.length ? campoLista('imagen', `tipo.${nombre}.imagen`, t.imagen ?? '', [['', '(solo color)'], ...imagenes.map((i): [string, string] => [i, i])], (v) => e.ponerTipoCasilla(ref, nombre, { ...t, imagen: v || undefined })) : null,
            campoCasilla('sólida', `tipo.${nombre}.solida`, t.solida, (v) => e.ponerTipoCasilla(ref, nombre, { ...t, solida: v }), 'Sólida = pared o suelo. Si no, se atraviesa (agua, pinchos, monedas...) y avisa con "cuando toco"'),
            tipos.length > 1 ? botonIcono('basura', `Quitar el tipo "${nombre}" (y sus casillas)`, async () => {
              if (await confirmar('Quitar tipo de casilla', `¿Quitar "${nombre}" y borrar todas sus casillas del mapa?`, 'Quitar', true)) e.borrarTipoCasilla(ref, nombre);
            }, undefined, 'pequeno') : null,
          ),
        );
      }),
    );
    const nuevoTipo = h('button', { class: 'boton-enlace', onclick: async () => {
      const n = await pedirTexto('Nuevo tipo de casilla', 'Nombre (por ejemplo: pared, agua, pinchos). Lo usarás en "cuando toco pinchos".');
      if (!n) return;
      this.vista.tipoPincel = e.ponerTipoCasilla(ref, n, { color: '#b57cff', solida: true });
      if (this.vista.herramienta === 'mover') this.vista.ponerHerramienta('pincel');
      this.dibujar(); // el tipo nuevo queda elegido y con sus opciones a la vista
    } }, '+ Nuevo tipo de casilla');
    return seccion('Mapa de casillas', [
      herramientas,
      h('div', { class: 'dos-columnas' },
        campoNumero('casilla', 'mapa.tamano', mapa.tamano, (v) => e.cambiarPropiedad(ref, 'mapa.tamano', Math.max(4, v ?? 48)), { min: 4, ayuda: 'Tamaño de cada casilla, en píxeles' }),
        campoNumero('capa', 'mapa.capa', mapa.capa ?? -1, (v) => e.cambiarPropiedad(ref, 'mapa.capa', v === -1 ? undefined : v), { ayuda: 'Las capas más altas se dibujan encima (-1 = detrás de todo)' }),
      ),
      h('p', { class: 'nota' }, `${Object.keys(mapa.celdas).length} casillas pintadas. Elige un tipo y pinta en la escena.`),
      listaTipos,
      nuevoTipo,
    ], { ayuda: 'Una rejilla para pintar suelos, paredes, agua...' });
  }

  private seccionPropiedades(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const filas = Object.entries(def.propiedades ?? {}).map(([nombre, valor]) => {
      const tipo = typeof valor;
      const control =
        tipo === 'boolean'
          ? h('input', { type: 'checkbox', checked: valor, 'data-ruta': `prop.${nombre}`, onchange: (ev: Event) => e.cambiarPropiedadPropia(ref, nombre, (ev.target as HTMLInputElement).checked) })
          : h('input', { class: 'campo', type: tipo === 'number' ? 'number' : 'text', value: String(valor), 'data-ruta': `prop.${nombre}`, onchange: (ev: Event) => {
              const t = (ev.target as HTMLInputElement).value;
              e.cambiarPropiedadPropia(ref, nombre, tipo === 'number' ? Number(t.replace(',', '.')) || 0 : t);
            } });
      return h('div', { class: 'propiedad-propia' },
        h('code', { title: `En el código: yo.${nombre}` }, nombre),
        control,
        botonIcono('cerrar', `Quitar "${nombre}"`, () => e.cambiarPropiedadPropia(ref, nombre, undefined), undefined, 'pequeno'),
      );
    });
    const nueva = h('button', { class: 'boton-enlace', onclick: async () => {
      const n = await pedirTexto('Nueva propiedad', 'Nombre de la propiedad (por ejemplo: vida, puntos, velocidad). En el código será yo.vida');
      if (!n) return;
      const limpio = n.replace(/\s+/g, '_');
      if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(limpio)) return notificar('Un nombre de propiedad empieza por una letra y solo lleva letras, números y _', 'error');
      const valor = await pedirTexto('Valor inicial', `Valor con el que empieza ${limpio} (un número, un texto, verdadero o falso)`, '0');
      if (valor === null) return;
      const v = valor === 'verdadero' ? true : valor === 'falso' ? false : Number.isFinite(Number(valor.replace(',', '.'))) ? Number(valor.replace(',', '.')) : valor;
      e.cambiarPropiedadPropia(ref, limpio, v);
    } }, '+ Nueva propiedad');
    return seccion('Propiedades propias', [
      filas.length ? h('div', { class: 'lista-propiedades' }, filas) : h('p', { class: 'nota' }, 'Datos tuyos para este objeto (vida, puntos...). En el código: yo.vida'),
      nueva,
    ], { ayuda: 'Como los Attributes de Roblox: datos con un valor inicial que el código puede leer y cambiar' });
  }

  private seccionScript(ref: RefObjeto, def: DefObjeto): HTMLElement {
    const e = this.estado;
    const scripts = Object.keys(e.proyecto.scripts);
    const tiene = def.script && def.script in e.proyecto.scripts;
    return seccion('Script', [
      campoLista('archivo', 'script', tiene ? def.script! : '', [['', '(ninguno)'], ...scripts.map((s): [string, string] => [s, s])], (v) => e.asignarScript(ref, v || null), 'El código .chs que controla este objeto'),
      h('div', { class: 'acciones-script' },
        tiene
          ? botonIcono('codigo', 'Abrir el código (o doble clic en el objeto)', () => e.abrirScript(def.script!), 'Abrir el código', 'principal')
          : botonIcono('mas', 'Crear un script nuevo para este objeto', () => e.crearScriptPara(ref), 'Crear script', 'principal'),
      ),
    ], { ayuda: 'El código que da vida al objeto' });
  }

  // ═════════════════════════ Sin selección: escena y proyecto ═════════════════════════

  private ajustesEscena(): HTMLElement[] {
    const e = this.estado;
    const esc = e.escena;
    const nombres = e.escena.objetos.map((o) => o.nombre ?? '').filter(Boolean);
    return [
      h('div', { class: 'inspector-cabecera' }, icono('escena', 20), h('span', { class: 'titulo-escena' }, `Escena: ${e.escenaActual}`)),
      h('p', { class: 'nota' }, 'Nada seleccionado. Haz clic en un objeto para ver sus propiedades.'),
      seccion('Escena', [
        campoColor('fondo', 'escena.colorFondo', esc.colorFondo, (v) => e.cambiarEscenaPropiedad('colorFondo', v), 'Color del fondo de la escena'),
        campoNumero('gravedad', 'escena.gravedad', esc.gravedad, (v) => e.cambiarEscenaPropiedad('gravedad', v), { vacio: '1500', ayuda: 'Gravedad del mundo en píxeles/segundo². 0 = juego visto desde arriba. Vacío = 1500' }),
        campoCasilla('escena inicial', 'escena.inicial', e.proyecto.escenaInicial === e.escenaActual, (v) => v && e.ponerEscenaInicial(e.escenaActual), 'La escena con la que empieza el juego'),
      ]),
      seccion('Cámara', [
        campoLista('seguir a', 'camara.seguir', esc.camara?.seguir ?? '', [['', '(nadie)'], ...nombres.map((n): [string, string] => [n, n])], (v) => e.cambiarEscenaPropiedad('camara.seguir', v || undefined), 'La cámara sigue a este objeto (desde el código: escena.camara.seguir(yo))'),
        campoCasilla('no salir del mapa', 'camara.limitarAlMapa', esc.camara?.limitarAlMapa ?? false, (v) => e.cambiarEscenaPropiedad('camara.limitarAlMapa', v), 'La cámara no enseña nada fuera de los mapas de casillas de la escena (no se ve el vacío de los bordes)'),
        campoNumero('zoom', 'camara.zoom', esc.camara?.zoom ?? 1, (v) => e.cambiarEscenaPropiedad('camara.zoom', v ?? 1), { paso: 0.1, min: 0.1, max: 10, ayuda: '1 = normal, 2 = todo el doble de grande' }),
        h('div', { class: 'dos-columnas' },
          campoNumero('centro x', 'camara.x', esc.camara?.x, (v) => e.cambiarEscenaPropiedad('camara.x', v), { vacio: String(e.proyecto.ancho / 2), ayuda: 'Punto al que mira la cámara al empezar' }),
          campoNumero('centro y', 'camara.y', esc.camara?.y, (v) => e.cambiarEscenaPropiedad('camara.y', v), { vacio: String(e.proyecto.alto / 2), ayuda: 'Punto al que mira la cámara al empezar' }),
        ),
      ]),
      seccion('Proyecto', [
        campoTexto('nombre', 'proyecto.nombre', e.proyecto.nombre, (v) => e.renombrarProyecto(v), 'Nombre del juego (sale en el título de la página al exportar)'),
        h('div', { class: 'dos-columnas' },
          campoNumero('ancho', 'proyecto.ancho', e.proyecto.ancho, (v) => e.cambiarAjusteProyecto('ancho', v ?? 960), { min: 64, max: 4096, paso: 16, ayuda: 'Ancho de la pantalla del juego, en píxeles' }),
          campoNumero('alto', 'proyecto.alto', e.proyecto.alto, (v) => e.cambiarAjusteProyecto('alto', v ?? 540), { min: 64, max: 4096, paso: 16, ayuda: 'Alto de la pantalla del juego, en píxeles' }),
        ),
        campoCasilla('píxeles nítidos', 'proyecto.pixelArt', e.proyecto.pixelArt ?? false, (v) => e.cambiarAjusteProyecto('pixelArt', v), 'Dibuja las imágenes pequeñas con píxeles nítidos, sin suavizar'),
        h('p', { class: 'nota' }, 'Colores con nombre: ', NOMBRES_COLORES.filter((c) => c !== 'violeta').join(', '), '.'),
      ]),
    ];
  }
}
