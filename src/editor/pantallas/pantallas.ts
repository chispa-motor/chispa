/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * PANTALLAS LISTAS: las que tiene casi cualquier juego, ya hechas y
 * conectadas entre sí: menú principal, opciones (volumen, pantalla completa
 * y controles), créditos, tabla de puntuaciones, fin del juego y pausa.
 *
 * Cada una es una escena normal (la pausa, unos objetos en la escena del
 * juego) hecha con los controles de interfaz y con scripts cortos y
 * comentados: se pueden abrir, entender y cambiar como cualquier otra cosa.
 *
 * Aquí solo se CALCULA lo que hay que añadir (un «plan»); quien lo añade al
 * proyecto, de una vez y con deshacer, es EstadoEditor.anadirPantallas.
 */
import type { DefEscena, DefObjeto, DefProyecto } from '../../proyecto/formato';
import { normalizar } from '../../utilidades/texto';

export const PANTALLAS = ['menu', 'opciones', 'creditos', 'records', 'fin', 'pausa'] as const;
export type TipoPantalla = (typeof PANTALLAS)[number];

export const INFO_PANTALLAS: Record<TipoPantalla, { nombre: string; escena: string; ayuda: string }> = {
  menu: { nombre: 'Menú principal', escena: 'Menu', ayuda: 'El título del juego y un menú: Jugar y las demás pantallas que haya' },
  opciones: { nombre: 'Opciones', escena: 'Opciones', ayuda: 'Volumen del sonido y de la música, pantalla completa y los controles. Se acuerda de lo elegido' },
  creditos: { nombre: 'Créditos', escena: 'Creditos', ayuda: 'Quién ha hecho el juego, en un texto que va subiendo' },
  records: { nombre: 'Tabla de puntuaciones', escena: 'Records', ayuda: 'Las 10 mejores puntuaciones, con su nombre. Se guardan en el ordenador de quien juega' },
  fin: { nombre: 'Fin del juego', escena: 'Fin', ayuda: 'Los puntos conseguidos, guardar el nombre si es un récord, jugar otra vez o volver al menú' },
  pausa: { nombre: 'Pausa', escena: '', ayuda: 'En la escena del juego: con Escape o P se para todo y sale un menú (Seguir, Reiniciar, Salir)' },
};

export interface PlanPantallas {
  /** Escenas nuevas (con su nombre definitivo). */
  escenas: Record<string, DefEscena>;
  /** Scripts nuevos (archivo → código). */
  scripts: Record<string, string>;
  /** Objetos que se añaden a la escena del juego (la pausa). */
  enElJuego: DefObjeto[];
  /** La escena del juego (a la que lleva «Jugar»). */
  escenaDeJuego: string;
  /** El nombre con el que queda cada pantalla (las nuevas y las que ya había). */
  nombres: Partial<Record<TipoPantalla, string>>;
  /** Hace falta el dato del juego «puntos» (lo usan Fin y Récords). */
  necesitaPuntos: boolean;
}

const AZUL = '#3b82f6';
const GRIS = '#55607a';

/** Un nombre que no esté cogido (Menu, Menu2, Menu3...). */
function libre(base: string, usados: Set<string>, extension = ''): string {
  let nombre = `${base}${extension}`;
  for (let i = 2; usados.has(normalizar(nombre)); i++) nombre = `${base}${i}${extension}`;
  usados.add(normalizar(nombre));
  return nombre;
}

/**
 * Calcula lo que hay que añadir para tener esas pantallas. `escenaDeJuego`:
 * la escena a la que lleva «Jugar» (y donde se pone la pausa).
 */
export function planDePantallas(p: DefProyecto, cuales: readonly TipoPantalla[], escenaDeJuego: string): PlanPantallas {
  const W = p.ancho;
  const H = p.alto;
  const escenasUsadas = new Set(Object.keys(p.escenas).map(normalizar));
  const scriptsUsados = new Set(Object.keys(p.scripts).map(normalizar));
  const plan: PlanPantallas = { escenas: {}, scripts: {}, enElJuego: [], escenaDeJuego, nombres: {}, necesitaPuntos: false };

  // 1. Los nombres: los de las pantallas que ya hay (con su nombre de siempre) y los de las nuevas
  for (const tipo of PANTALLAS) {
    const { escena } = INFO_PANTALLAS[tipo];
    if (!escena) continue;
    if (cuales.includes(tipo)) plan.nombres[tipo] = libre(escena, escenasUsadas);
    else if (Object.prototype.hasOwnProperty.call(p.escenas, escena)) plan.nombres[tipo] = escena;
  }
  const n = plan.nombres;
  const script = (base: string, codigo: string): string => {
    const archivo = libre(base, scriptsUsados, '.chs');
    plan.scripts[archivo] = codigo;
    return archivo;
  };
  /** A dónde se vuelve desde una pantalla: al menú si lo hay; si no, al juego. */
  const volverA = n.menu ?? escenaDeJuego;

  const titulo = (texto: string, y = H * 0.85): DefObjeto => ({
    nombre: 'Titulo', x: W / 2, y, sprite: { forma: 'texto', texto, tamano: Math.round(H / 9), color: 'blanco', ancho: W * 0.8, alto: H / 7, fijo: true, alinear: 'centro', letra: 'titulo' },
  });
  const texto = (nombre: string, contenido: string, x: number, y: number, tamano = 22, alinear: 'izquierda' | 'centro' | 'derecha' = 'centro', color = 'blanco'): DefObjeto => ({
    nombre, x, y, sprite: { forma: 'texto', texto: contenido, tamano, color, ancho: 300, alto: tamano * 1.5, fijo: true, alinear },
  });
  const boton = (nombre: string, etiqueta: string, x: number, y: number, archivo: string, color = AZUL, ancho = 220): DefObjeto => ({
    nombre, x, y, sprite: { color, ancho, alto: 52, texto: etiqueta, tamano: 22, fijo: true }, control: { tipo: 'boton' }, script: archivo,
  });
  const botonVolver = (): DefObjeto =>
    boton('BotonVolver', '← Volver', 130, 50, script('volver', [
      '# Vuelve a la pantalla de antes: con un clic o con la tecla Escape.',
      'cuando hago clic encima:',
      `    escena.cambiar("${volverA}", 0.3)`,
      '',
      'cuando se pulsa "escape":',
      `    escena.cambiar("${volverA}", 0.3)`,
      '',
    ].join('\n')), GRIS, 180);
  const fondo = '#141a2a';

  // 2. Menú principal
  if (cuales.includes('menu')) {
    const opciones: [string, string][] = [['Jugar', escenaDeJuego]];
    if (n.opciones) opciones.push(['Opciones', n.opciones]);
    if (n.records) opciones.push(['Puntuaciones', n.records]);
    if (n.creditos) opciones.push(['Créditos', n.creditos]);
    const codigo = [
      '# MENU PRINCIPAL. Se maneja con el raton, o con las flechas y la tecla Intro.',
      '# Para añadir una opcion: escribela en el inspector (Control > opciones)',
      '# y añade aqui debajo otro «si» con lo que tiene que pasar.',
      '',
      'cuando empieza:',
      '    # El volumen que se eligio en Opciones la ultima vez que se jugo',
      '    sonido.volumen = cargar("volumen", 100) / 100',
      '    musica.volumen = cargar("volumenMusica", 60) / 100',
      '',
      'cuando cambia:',
      ...opciones.flatMap(([opcion, escena]) => [
        `    si yo.valor == "${opcion}":`,
        ...(opcion === 'Jugar' && cuales.some((c) => c === 'fin' || c === 'records') ? ['        juego.puntos = 0'] : []),
        `        escena.cambiar("${escena}", 0.4)`,
      ]),
      '',
    ].join('\n');
    plan.escenas[n.menu!] = {
      colorFondo: fondo,
      objetos: [
        { ...titulo(p.nombre || 'Mi juego', H * 0.8), sprite: { ...titulo(p.nombre || 'Mi juego').sprite, tamano: Math.round(H / 7) } },
        { nombre: 'MenuPrincipal', x: W / 2, y: H * 0.38, sprite: { color: AZUL, ancho: 300, alto: 200, tamano: 28, fijo: true }, control: { tipo: 'menu', opciones: opciones.map(([o]) => o), elegido: 1 }, script: script('menu', codigo) },
        texto('Ayuda', 'Flechas e Intro, o el ratón', W / 2, 30, 16, 'centro', '#8a93a8'),
      ],
    };
  }

  // 3. Opciones
  if (cuales.includes('opciones')) {
    const deslizador = (nombre: string, clave: string, porDefecto: number, que: string, y: number): DefObjeto => ({
      nombre, x: W / 2 + 60, y, sprite: { color: AZUL, ancho: 280, alto: 26, fijo: true }, control: { tipo: 'deslizador', minimo: 0, maximo: 100, valor: porDefecto, paso: 5 },
      script: script(nombre.toLowerCase(), [
        `# El volumen ${que === 'sonido' ? 'de los efectos de sonido' : 'de la musica'}: se guarda para la proxima vez que se juegue.`,
        'cuando empieza:',
        `    yo.valor = cargar("${clave}", ${porDefecto})`,
        '',
        'cuando cambia:',
        `    ${que}.volumen = yo.valor / 100`,
        `    guardar("${clave}", yo.valor)`,
        ...(que === 'sonido' ? ['    sonido.efecto("moneda")'] : []),
        '',
      ].join('\n')),
    });
    plan.escenas[n.opciones!] = {
      colorFondo: fondo,
      objetos: [
        titulo('OPCIONES'),
        texto('TextoSonido', 'Sonido', W / 2 - 110, H * 0.66, 24, 'derecha'),
        deslizador('VolumenSonido', 'volumen', 100, 'sonido', H * 0.66),
        texto('TextoMusica', 'Música', W / 2 - 110, H * 0.55, 24, 'derecha'),
        deslizador('VolumenMusica', 'volumenMusica', 60, 'musica', H * 0.55),
        {
          nombre: 'PantallaCompleta', x: W / 2, y: H * 0.43, sprite: { color: AZUL, ancho: 280, alto: 30, texto: 'Pantalla completa', tamano: 22, fijo: true }, control: { tipo: 'casilla' },
          script: script('pantallacompleta', ['cuando empieza:', '    yo.valor = pantalla.completa', '', 'cuando cambia:', '    pantalla.completa = yo.valor', ''].join('\n')),
        },
        texto('Controles', 'CONTROLES\nFlechas o WASD: moverse   ·   Espacio: saltar\nEscape o P: pausa', W / 2, H * 0.24, 18, 'centro', '#c0c7d1'),
        botonVolver(),
      ],
    };
  }

  // 4. Créditos
  if (cuales.includes('creditos')) {
    plan.escenas[n.creditos!] = {
      colorFondo: fondo,
      objetos: [
        {
          nombre: 'Creditos', x: W / 2, y: -40,
          sprite: { forma: 'texto', texto: `${p.nombre || 'Mi juego'}\n\nUn juego de\nTU NOMBRE\n\nMúsica y sonidos\nhechos en Chispa\n\nGracias por jugar\n\nHecho con Chispa`, tamano: 28, color: 'blanco', ancho: W * 0.8, alto: 400, fijo: true, alinear: 'centro' },
          script: script('creditos', [
            '# El texto sube poco a poco y vuelve a empezar. Cambialo en el inspector (Dibujo > texto).',
            'cuando cada fotograma:',
            '    yo.y += 40 * delta',
            '    si yo.y > pantalla.alto + 250:',
            '        yo.y = -200',
            '',
          ].join('\n')),
        },
        botonVolver(),
      ],
    };
  }

  // 5. Tabla de puntuaciones
  if (cuales.includes('records')) {
    plan.necesitaPuntos = true;
    plan.escenas[n.records!] = {
      colorFondo: fondo,
      objetos: [
        titulo('PUNTUACIONES'),
        {
          nombre: 'Tabla', x: W / 2, y: H * 0.42,
          sprite: { forma: 'texto', texto: '', tamano: Math.max(16, Math.round(H / 24)), color: 'blanco', ancho: W * 0.6, alto: H * 0.6, fijo: true, alinear: 'centro', letra: 'maquina' },
          script: script('tabla', [
            '# Escribe la tabla: las 10 mejores puntuaciones guardadas en este ordenador.',
            'cuando empieza:',
            '    variable t = ""',
            '    variable puesto = 1',
            '    para cada p en puntuaciones.lista():',
            '        t = t + "{puesto}. {p.nombre}  {p.puntos}\\n"',
            '        puesto += 1',
            '    si t == "":',
            '        t = "Todavia no hay puntuaciones.\\nJuega y deja aqui tu nombre."',
            '    yo.texto = t',
            '',
          ].join('\n')),
        },
        botonVolver(),
      ],
    };
  }

  // 6. Fin del juego
  if (cuales.includes('fin')) {
    plan.necesitaPuntos = true;
    const conTabla = !!n.records;
    const objetos: DefObjeto[] = [
      titulo('FIN DEL JUEGO'),
      texto('Puntos', 'Puntos: {juego.puntos}', W / 2, H * 0.66, 36),
    ];
    if (conTabla) {
      objetos.push(
        { nombre: 'CampoNombre', x: W / 2 - 70, y: H * 0.5, sprite: { color: AZUL, ancho: 240, alto: 44, tamano: 22, fijo: true }, control: { tipo: 'campo', pista: 'Tu nombre', largoMaximo: 10 } },
        boton('BotonGuardar', 'Guardar', W / 2 + 130, H * 0.5, script('guardarpuntos', [
          '# Guarda la puntuacion con el nombre escrito y enseña la tabla.',
          '# Si la puntuacion no entra entre las 10 mejores, el boton y el campo no salen.',
          'cuando empieza:',
          '    si no puntuaciones.entra(juego.puntos):',
          '        yo.cerrar()',
          '        buscar("CampoNombre").cerrar()',
          '    sino:',
          '        buscar("CampoNombre").enfocar()',
          '',
          'cuando hago clic encima:',
          '    variable nombre = buscar("CampoNombre").valor',
          '    si nombre == "":',
          '        nombre = "Anonimo"',
          '    puntuaciones.guardar(nombre, juego.puntos)',
          `    escena.cambiar("${n.records}", 0.3)`,
          '',
        ].join('\n')), '#2ecc71', 140),
      );
    }
    objetos.push(
      boton('BotonOtraVez', 'Jugar otra vez', W / 2, H * 0.32, script('otravez', ['cuando hago clic encima:', '    juego.puntos = 0', `    escena.cambiar("${escenaDeJuego}", 0.4)`, ''].join('\n'))),
    );
    if (n.menu) objetos.push(boton('BotonMenu', 'Menú', W / 2, H * 0.2, script('almenu', ['cuando hago clic encima:', `    escena.cambiar("${n.menu}", 0.4)`, ''].join('\n')), GRIS));
    plan.escenas[n.fin!] = { colorFondo: '#1a1020', objetos };
  }

  // 7. Pausa (en la escena del juego)
  if (cuales.includes('pausa')) {
    const yaHay = new Set((p.escenas[escenaDeJuego]?.objetos ?? []).map((o) => normalizar(o.nombre ?? '')));
    const ventana = libre('VentanaPausa', yaHay);
    const menu = libre('MenuPausa', yaHay);
    const opciones = ['Seguir', 'Reiniciar', ...(n.menu ? ['Salir al menú'] : [])];
    plan.enElJuego.push(
      {
        nombre: ventana, x: W / 2, y: H / 2, sprite: { color: AZUL, ancho: 340, alto: 110 + opciones.length * 50, tamano: 22, fijo: true, capa: 100 },
        control: { tipo: 'ventana', titulo: 'PAUSA', colorFondo: '#10141fee' },
        script: script('pausa', [
          '# PAUSA: con Escape o con P se para el juego y sale esta ventana con su menu.',
          'cuando empieza:',
          `    buscar("${menu}").pegarA(yo)`,
          '    yo.cerrar()',
          '',
          'cuando se pulsa "escape" o "p":',
          '    si tiempo.pausado:',
          '        tiempo.seguir()',
          '        yo.cerrar()',
          '    sino:',
          '        tiempo.pausar()',
          '        yo.abrir()',
          '',
        ].join('\n')),
      },
      {
        nombre: menu, x: W / 2, y: H / 2 - 18, sprite: { color: AZUL, ancho: 280, alto: opciones.length * 46, tamano: 24, fijo: true, capa: 101 },
        control: { tipo: 'menu', opciones, elegido: 1 },
        script: script('menupausa', [
          '# Lo que hace cada opcion del menu de pausa.',
          'cuando cambia:',
          '    tiempo.seguir()',
          '    si yo.valor == "Seguir":',
          `        buscar("${ventana}").cerrar()`,
          '    si yo.valor == "Reiniciar":',
          '        escena.reiniciar()',
          ...(n.menu ? ['    si yo.valor == "Salir al menú":', `        escena.cambiar("${n.menu}", 0.3)`] : []),
          '',
        ].join('\n')),
      },
    );
  }
  return plan;
}
