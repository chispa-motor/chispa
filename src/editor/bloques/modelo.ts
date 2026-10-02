/*
 * Chispa — Copyright (c) 2026 Rodrigo y colaboradores de Chispa (ver CREDITOS.md)
 * SPDX-License-Identifier: MPL-2.0
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * MODO BLOQUES: el mismo código Chispa, pero como piezas que se encajan (al estilo Scratch).
 *
 * DECISIÓN: el CÓDIGO es lo que se guarda, siempre. Los bloques son otra
 * forma de verlo y de editarlo:
 *     código  ──(leer)──▶  bloques   (desdeCodigo)
 *     bloques ──(escribir)──▶ código (aCodigo)
 * Así un juego hecho con bloques es un juego de Chispa normal: se puede
 * pasar a código en cualquier momento y seguir desde ahí.
 *
 * Las órdenes (si, repetir, mover...) son bloques. Los VALORES que van
 * dentro de los huecos (yo.x + 10, "hola", buscar("Jugador")) se escriben
 * como código pequeño: así no hace falta un bloque para cada operación y se
 * aprende la escritura poco a poco.
 */
import type { Bloque as BloqueAst, Evento, Expresion, Sentencia } from '../../chispa/sintaxis/ast';
import { analizarSintaxis } from '../../chispa/sintaxis/parser';

// ───────────────────────── Tipos de bloque ─────────────────────────

export type ClaseEvento =
  | 'empieza' | 'fotograma' | 'cada' | 'pasen' | 'pulsa' | 'mantiene' | 'suelta'
  | 'toco' | 'dejoDeTocar' | 'clic' | 'clicEncima' | 'cambia' | 'animacion' | 'pantalla' | 'recibo';

export type Bloque = (
  /** cuando ...: (dato: la tecla, los segundos, con quién, el mensaje...) */
  | { tipo: 'evento'; clase: ClaseEvento; dato: string; cuerpo: Bloque[] }
  | { tipo: 'funcion'; nombre: string; parametros: string; cuerpo: Bloque[] }
  | { tipo: 'variable'; nombre: string; valor: string }
  | { tipo: 'asignar'; objetivo: string; operador: string; valor: string }
  | { tipo: 'si'; ramas: { condicion: string; cuerpo: Bloque[] }[]; sino: Bloque[] | null }
  | { tipo: 'mientras'; condicion: string; cuerpo: Bloque[] }
  | { tipo: 'repetir'; veces: string; cuerpo: Bloque[] }
  | { tipo: 'paraCada'; variables: string; coleccion: string; cuerpo: Bloque[] }
  | { tipo: 'devolver'; valor: string }
  | { tipo: 'romper' }
  | { tipo: 'continuar' }
  /** Una acción conocida (mostrar, esperar, crear...): `accion` dice cuál y `campos` lo que va en sus huecos. */
  | { tipo: 'accion'; accion: string; campos: string[] }
  /** Cualquier otra orden, escrita como código: yo.animar("correr") */
  | { tipo: 'hacer'; codigo: string }
  /** Un comentario (# ...) */
  | { tipo: 'nota'; texto: string }
) & {
  /** Para la vista (arrastrar, resaltar): no se guarda. */
  id?: number;
};

/** Las cabeceras de los eventos: lo que se ve en el bloque y cómo se escribe. */
export const EVENTOS: { clase: ClaseEvento; texto: string; dato?: { nombre: string; porDefecto: string } }[] = [
  { clase: 'empieza', texto: 'cuando empieza' },
  { clase: 'fotograma', texto: 'cuando cada fotograma' },
  { clase: 'pulsa', texto: 'cuando se pulsa', dato: { nombre: 'tecla', porDefecto: '"espacio"' } },
  { clase: 'mantiene', texto: 'cuando se mantiene', dato: { nombre: 'tecla', porDefecto: '"derecha"' } },
  { clase: 'suelta', texto: 'cuando se suelta', dato: { nombre: 'tecla', porDefecto: '"espacio"' } },
  { clase: 'toco', texto: 'cuando toco', dato: { nombre: 'con quién (vacío = cualquiera)', porDefecto: 'Moneda' } },
  { clase: 'dejoDeTocar', texto: 'cuando dejo de tocar', dato: { nombre: 'con quién', porDefecto: 'Agua' } },
  { clase: 'clic', texto: 'cuando hago clic' },
  { clase: 'clicEncima', texto: 'cuando hago clic encima' },
  { clase: 'cambia', texto: 'cuando cambia' },
  { clase: 'cada', texto: 'cuando cada … segundos', dato: { nombre: 'segundos', porDefecto: '2' } },
  { clase: 'pasen', texto: 'cuando pasen … segundos', dato: { nombre: 'segundos', porDefecto: '3' } },
  { clase: 'recibo', texto: 'cuando recibo', dato: { nombre: 'mensaje', porDefecto: 'empezar' } },
  { clase: 'animacion', texto: 'cuando termina la animacion' },
  { clase: 'pantalla', texto: 'cuando salgo de la pantalla' },
];

/**
 * ACCIONES CONOCIDAS: las órdenes más usadas tienen su propio bloque, con
 * palabras en vez de paréntesis. `partes` mezcla texto fijo y huecos (números:
 * la posición del campo). Al leer código, una llamada que encaja con una
 * acción se convierte en su bloque; si no, en un bloque «hacer».
 */
export interface Accion {
  id: string;
  categoria: 'movimiento' | 'apariencia' | 'efectos' | 'sonido' | 'objetos' | 'control' | 'interfaz';
  /** Texto y huecos: ['mostrar', 0] */
  partes: (string | number)[];
  /** Lo que se escribe: el nombre de la función (con su «yo.» si es de yo) */
  funcion: string;
  /** Valores con los que aparece en la paleta */
  porDefecto: string[];
}

export const ACCIONES: Accion[] = [
  { id: 'moverConFlechas', categoria: 'movimiento', partes: ['moverme con las flechas a', 0], funcion: 'yo.moverConFlechas', porDefecto: ['300'] },
  { id: 'mover', categoria: 'movimiento', partes: ['mover x', 0, 'y', 1], funcion: 'yo.mover', porDefecto: ['10', '0'] },
  { id: 'moverConJugador', categoria: 'movimiento', partes: ['moverme con los controles del jugador', 0, 'a', 1], funcion: 'yo.moverConJugador', porDefecto: ['2', '300'] },
  { id: 'saltar', categoria: 'movimiento', partes: ['saltar con fuerza', 0], funcion: 'yo.saltar', porDefecto: ['600'] },
  { id: 'irA', categoria: 'movimiento', partes: ['ir suavemente a x', 0, 'y', 1, 'en', 2, 'segundos'], funcion: 'yo.irA', porDefecto: ['400', '300', '1'] },
  { id: 'irHacia', categoria: 'movimiento', partes: ['ir hacia', 0, 'a', 1, 'píxeles por segundo'], funcion: 'yo.irHacia', porDefecto: ['buscar("Jugador")', '120'] },
  { id: 'rotar', categoria: 'movimiento', partes: ['girar', 0, 'grados'], funcion: 'yo.rotar', porDefecto: ['15'] },
  { id: 'mirarA', categoria: 'movimiento', partes: ['mirar hacia', 0], funcion: 'yo.mirarA', porDefecto: ['raton.posicion'] },
  { id: 'mostrar', categoria: 'apariencia', partes: ['mostrar', 0], funcion: 'mostrar', porDefecto: ['"¡Hola!"'] },
  { id: 'animar', categoria: 'apariencia', partes: ['poner la animación', 0], funcion: 'yo.animar', porDefecto: ['"correr"'] },
  { id: 'ponerCamino', categoria: 'apariencia', partes: ['dibujarme con los puntos', 0], funcion: 'yo.ponerCamino', porDefecto: ['[vector(-50, -30), vector(0, 40), vector(50, -30)]'] },
  { id: 'parpadear', categoria: 'apariencia', partes: ['parpadear', 0, 'segundos'], funcion: 'yo.parpadear', porDefecto: ['1'] },
  { id: 'ocultar', categoria: 'apariencia', partes: ['esconderme'], funcion: 'yo.ocultar', porDefecto: [] },
  { id: 'aparecer', categoria: 'apariencia', partes: ['aparecer'], funcion: 'yo.aparecer', porDefecto: [] },
  { id: 'particulas', categoria: 'apariencia', partes: ['partículas de', 0], funcion: 'particulas', porDefecto: ['"explosion"'] },
  { id: 'dialogo', categoria: 'apariencia', partes: ['diálogo:', 0, 'dice', 1], funcion: 'dialogo', porDefecto: ['"Ana"', '"¡Hola!"'] },
  { id: 'temblar', categoria: 'apariencia', partes: ['temblar la pantalla', 0, 'durante', 1, 'segundos'], funcion: 'escena.camara.temblar', porDefecto: ['8', '0.3'] },
  { id: 'efExplosion', categoria: 'efectos', partes: ['explosión en', 0, 'de tamaño', 1], funcion: 'efecto.explosion', porDefecto: ['yo', '1'] },
  { id: 'efFuego', categoria: 'efectos', partes: ['fuego en', 0], funcion: 'efecto.fuego', porDefecto: ['yo'] },
  { id: 'efHumo', categoria: 'efectos', partes: ['humo en', 0], funcion: 'efecto.humo', porDefecto: ['yo'] },
  { id: 'efChispas', categoria: 'efectos', partes: ['chispas en', 0], funcion: 'efecto.chispas', porDefecto: ['yo'] },
  { id: 'efRayo', categoria: 'efectos', partes: ['rayo de', 0, 'a', 1], funcion: 'efecto.rayo', porDefecto: ['yo', 'buscar("Enemigo")'] },
  { id: 'efEstela', categoria: 'efectos', partes: ['estela detrás de', 0], funcion: 'efecto.estela', porDefecto: ['yo'] },
  { id: 'efOnda', categoria: 'efectos', partes: ['onda en', 0, 'de radio', 1], funcion: 'efecto.onda', porDefecto: ['yo', '150'] },
  { id: 'efDestello', categoria: 'efectos', partes: ['destello en', 0], funcion: 'efecto.destello', porDefecto: ['yo'] },
  { id: 'efLluvia', categoria: 'efectos', partes: ['lluvia de intensidad', 0], funcion: 'efecto.lluvia', porDefecto: ['1'] },
  { id: 'efNieve', categoria: 'efectos', partes: ['nieve de intensidad', 0], funcion: 'efecto.nieve', porDefecto: ['1'] },
  { id: 'efHojas', categoria: 'efectos', partes: ['hojas cayendo, intensidad', 0], funcion: 'efecto.hojas', porDefecto: ['1'] },
  { id: 'efBurbujas', categoria: 'efectos', partes: ['burbujas en', 0], funcion: 'efecto.burbujas', porDefecto: ['yo'] },
  { id: 'efConfeti', categoria: 'efectos', partes: ['confeti en', 0], funcion: 'efecto.confeti', porDefecto: ['yo'] },
  { id: 'efSangre', categoria: 'efectos', partes: ['salpicadura (sangre o tinta) en', 0], funcion: 'efecto.sangre', porDefecto: ['otro'] },
  { id: 'efTinta', categoria: 'efectos', partes: ['tinta en', 0], funcion: 'efecto.tinta', porDefecto: ['otro'] },
  { id: 'efPolvo', categoria: 'efectos', partes: ['polvo a los pies de', 0], funcion: 'efecto.polvo', porDefecto: ['yo'] },
  { id: 'efGolpe', categoria: 'efectos', partes: ['golpe a', 0, 'con daño', 1], funcion: 'efecto.golpe', porDefecto: ['otro', '10'] },
  { id: 'efTexto', categoria: 'efectos', partes: ['texto que sube', 0, 'en', 1], funcion: 'efecto.texto', porDefecto: ['"+1"', 'yo'] },
  { id: 'efUsar', categoria: 'efectos', partes: ['mi efecto', 0, 'en', 1], funcion: 'efecto.usar', porDefecto: ['"magia"', 'yo'] },
  { id: 'efParar', categoria: 'efectos', partes: ['parar el efecto', 0, 'de', 1], funcion: 'efecto.parar', porDefecto: ['"fuego"', 'yo'] },
  { id: 'congelar', categoria: 'efectos', partes: ['congelar el juego', 0, 'segundos'], funcion: 'tiempo.congelar', porDefecto: ['0.08'] },
  { id: 'flashPantalla', categoria: 'efectos', partes: ['flash de pantalla', 0, 'durante', 1, 'segundos'], funcion: 'pantalla.flash', porDefecto: ['"blanco"', '0.2'] },
  { id: 'dividirPantalla', categoria: 'efectos', partes: ['dividir la pantalla en', 0], funcion: 'pantalla.dividir', porDefecto: ['2'] },
  { id: 'camara2Sigue', categoria: 'efectos', partes: ['la cámara 2 sigue a', 0], funcion: 'escena.camaraDe(2).seguir', porDefecto: ['buscar("Jugador2")'] },
  { id: 'dibujarElipse', categoria: 'apariencia', partes: ['dibujar una elipse en x', 0, 'y', 1, 'de ancho', 2, 'y alto', 3, 'de color', 4], funcion: 'dibujar.elipse', porDefecto: ['yo.x', 'yo.y', '120', '60', '"verde"'] },
  { id: 'dibujarPoligono', categoria: 'apariencia', partes: ['dibujar un polígono con los puntos', 0, 'de color', 1], funcion: 'dibujar.poligono', porDefecto: ['[vector(100, 100), vector(200, 100), vector(150, 180)]', '"amarillo"'] },
  { id: 'dibujarElipsePantalla', categoria: 'apariencia', partes: ['dibujar en la pantalla una elipse en x', 0, 'y', 1, 'de ancho', 2, 'y alto', 3, 'de color', 4], funcion: 'dibujar.enPantalla.elipse', porDefecto: ['480', '60', '300', '40', '"blanco"'] },
  { id: 'dibujarPoligonoPantalla', categoria: 'apariencia', partes: ['dibujar en la pantalla un polígono con los puntos', 0, 'de color', 1], funcion: 'dibujar.enPantalla.poligono', porDefecto: ['[vector(20, 20), vector(60, 20), vector(40, 55)]', '"rojo"'] },
  { id: 'semilla', categoria: 'control', partes: ['que el azar se repita con la semilla', 0], funcion: 'semilla', porDefecto: ['1234'] },
  { id: 'cuerda', categoria: 'objetos', partes: ['atar con una cuerda', 0, 'a', 1, 'de largo', 2], funcion: 'junta.cuerda', porDefecto: ['yo', 'buscar("Gancho")', '200'] },
  { id: 'muelle', categoria: 'objetos', partes: ['unir con un muelle', 0, 'a', 1, 'de largo', 2], funcion: 'junta.muelle', porDefecto: ['yo', 'buscar("Techo")', '120'] },
  { id: 'bisagra', categoria: 'objetos', partes: ['poner una bisagra a', 0, 'con el eje en', 1], funcion: 'junta.bisagra', porDefecto: ['yo', 'vector(400, 300)'] },
  { id: 'quitarJuntas', categoria: 'objetos', partes: ['soltar las juntas de', 0], funcion: 'junta.quitar', porDefecto: ['yo'] },
  { id: 'abrirControl', categoria: 'interfaz', partes: ['abrir (con lo que lleva dentro)'], funcion: 'yo.abrir', porDefecto: [] },
  { id: 'cerrarControl', categoria: 'interfaz', partes: ['cerrar (con lo que lleva dentro)'], funcion: 'yo.cerrar', porDefecto: [] },
  { id: 'enfocar', categoria: 'interfaz', partes: ['empezar a escribir en mí'], funcion: 'yo.enfocar', porDefecto: [] },
  { id: 'meter', categoria: 'interfaz', partes: ['meter en mi inventario', 0, 'cantidad', 1], funcion: 'yo.meter', porDefecto: ['"llave"', '1'] },
  { id: 'sacar', categoria: 'interfaz', partes: ['sacar de mi inventario', 0, 'cantidad', 1], funcion: 'yo.sacar', porDefecto: ['"llave"', '1'] },
  { id: 'vaciarInventario', categoria: 'interfaz', partes: ['vaciar mi inventario'], funcion: 'yo.vaciar', porDefecto: [] },
  { id: 'guardarPuntuacion', categoria: 'interfaz', partes: ['apuntar en la tabla de puntuaciones a', 0, 'con', 1, 'puntos'], funcion: 'puntuaciones.guardar', porDefecto: ['"Ana"', 'juego.puntos'] },
  { id: 'borrarPuntuaciones', categoria: 'interfaz', partes: ['borrar la tabla de puntuaciones'], funcion: 'puntuaciones.borrar', porDefecto: [] },
  { id: 'encuadrar', categoria: 'efectos', partes: ['que la cámara encuadre a', 0], funcion: 'escena.camara.encuadrar', porDefecto: ['[buscar("Jugador1"), buscar("Jugador2")]'] },
  { id: 'ponerTecla', categoria: 'control', partes: ['el jugador 1 usa para', 0, 'la tecla', 1], funcion: 'controles(1).ponerTecla', porDefecto: ['"a"', '"m"'] },
  { id: 'pantallaNormal', categoria: 'efectos', partes: ['quitar los filtros de pantalla'], funcion: 'pantalla.normal', porDefecto: [] },
  { id: 'flashObjeto', categoria: 'efectos', partes: ['flash del objeto', 0, 'durante', 1, 'segundos'], funcion: 'yo.flash', porDefecto: ['"blanco"', '0.1'] },
  { id: 'efecto', categoria: 'sonido', partes: ['sonido', 0], funcion: 'sonido.efecto', porDefecto: ['"moneda"'] },
  { id: 'reproducir', categoria: 'sonido', partes: ['reproducir el sonido', 0], funcion: 'sonido.reproducir', porDefecto: ['"salto"'] },
  { id: 'reproducirEn', categoria: 'sonido', partes: ['reproducir el sonido', 0, 'en', 1, 'que se oye hasta', 2], funcion: 'sonido.reproducirEn', porDefecto: ['"salto"', 'yo', '800'] },
  { id: 'bucleEn', categoria: 'sonido', partes: ['sonido sin parar', 0, 'pegado a', 1, 'que se oye hasta', 2], funcion: 'sonido.bucleEn', porDefecto: ['"motor"', 'yo', '600'] },
  { id: 'ponerVolumen', categoria: 'sonido', partes: ['poner el volumen del sonido', 0, 'a', 1, 'en', 2, 'segundos'], funcion: 'sonido.ponerVolumen', porDefecto: ['"motor"', '0.5', '1'] },
  { id: 'ponerTono', categoria: 'sonido', partes: ['poner el tono del sonido', 0, 'a', 1], funcion: 'sonido.ponerTono', porDefecto: ['"motor"', '1.5'] },
  { id: 'ponerPan', categoria: 'sonido', partes: ['poner el sonido', 0, 'por el lado', 1], funcion: 'sonido.ponerPan', porDefecto: ['"motor"', '-1'] },
  { id: 'cruzarMusica', categoria: 'sonido', partes: ['cruzar a la música', 0, 'en', 1, 'segundos'], funcion: 'musica.cruzar', porDefecto: ['"combate"', '2'] },
  { id: 'capaMusica', categoria: 'sonido', partes: ['poner la capa', 0, 'de la música a', 1, 'en', 2, 'segundos'], funcion: 'musica.capa', porDefecto: ['2', '1', '2'] },
  { id: 'musica', categoria: 'sonido', partes: ['poner la música', 0], funcion: 'musica.reproducir', porDefecto: ['"tema"'] },
  { id: 'crear', categoria: 'objetos', partes: ['crear', 0, 'en x', 1, 'y', 2], funcion: 'crear', porDefecto: ['"Bala"', 'yo.x', 'yo.y'] },
  { id: 'destruir', categoria: 'objetos', partes: ['destruir', 0], funcion: 'destruir', porDefecto: ['otro'] },
  { id: 'enviar', categoria: 'objetos', partes: ['enviar el mensaje', 0], funcion: 'enviar', porDefecto: ['"empezar"'] },
  { id: 'esperar', categoria: 'control', partes: ['esperar', 0, 'segundos'], funcion: 'esperar', porDefecto: ['1'] },
  { id: 'cambiarEscena', categoria: 'control', partes: ['ir a la escena', 0], funcion: 'escena.cambiar', porDefecto: ['"Nivel2"'] },
  { id: 'cambiarEscenaTransicion', categoria: 'control', partes: ['ir a la escena', 0, 'con la transición', 2, 'en', 1, 'segundos'], funcion: 'escena.cambiar', porDefecto: ['"Nivel2"', '1', '"circulo"'] },
  { id: 'reiniciar', categoria: 'control', partes: ['reiniciar la escena'], funcion: 'escena.reiniciar', porDefecto: [] },
];

export const accionPorId = (id: string) => ACCIONES.find((a) => a.id === id);

/**
 * DATOS CON BLOQUE: propiedades que tienen su bloque «poner … a …» en la
 * paleta de su categoría (yo.forma = "estrella"). Son bloques de asignar
 * normales: al leer código, cualquier asignación se ve igual.
 */
export interface DatoConBloque {
  categoria: Accion['categoria'];
  /** Lo que se cambia: yo.forma */
  objetivo: string;
  /** Con qué valor aparece en la paleta */
  valor: string;
}

export const DATOS_CON_BLOQUE: DatoConBloque[] = [
  { categoria: 'apariencia', objetivo: 'yo.color', valor: 'paleta("pastel", 3)' },
  { categoria: 'apariencia', objetivo: 'yo.color', valor: 'mezclarColores("rojo", "amarillo", 0.5)' },
  { categoria: 'apariencia', objetivo: 'yo.relleno', valor: '"degradado"' },
  { categoria: 'apariencia', objetivo: 'yo.color2', valor: '"azul"' },
  { categoria: 'apariencia', objetivo: 'yo.anguloDegradado', valor: '0' },
  { categoria: 'apariencia', objetivo: 'yo.patron', valor: '"rayas"' },
  { categoria: 'apariencia', objetivo: 'yo.imagenRelleno', valor: '"ladrillo"' },
  { categoria: 'apariencia', objetivo: 'yo.borde', valor: '3' },
  { categoria: 'apariencia', objetivo: 'yo.colorBorde', valor: '"negro"' },
  { categoria: 'apariencia', objetivo: 'yo.bordeDiscontinuo', valor: 'verdadero' },
  { categoria: 'apariencia', objetivo: 'yo.sombra', valor: 'verdadero' },
  { categoria: 'apariencia', objetivo: 'yo.sombraX', valor: '10' },
  { categoria: 'apariencia', objetivo: 'yo.sombraY', valor: '-10' },
  { categoria: 'apariencia', objetivo: 'yo.desenfoqueSombra', valor: '8' },
  { categoria: 'apariencia', objetivo: 'yo.resplandor', valor: '"amarillo"' },
  { categoria: 'apariencia', objetivo: 'yo.tamanoResplandor', valor: '20' },
  { categoria: 'apariencia', objetivo: 'yo.mezcla', valor: '"sumar"' },
  { categoria: 'apariencia', objetivo: 'yo.forma', valor: '"estrella"' },
  { categoria: 'apariencia', objetivo: 'yo.lados', valor: '6' },
  { categoria: 'apariencia', objetivo: 'yo.radioInterior', valor: '0.5' },
  { categoria: 'apariencia', objetivo: 'yo.radioEsquina', valor: '12' },
  { categoria: 'apariencia', objetivo: 'yo.inicioArco', valor: '0' },
  { categoria: 'apariencia', objetivo: 'yo.finArco', valor: '270' },
  { categoria: 'apariencia', objetivo: 'yo.grosor', valor: '8' },
  { categoria: 'objetos', objetivo: 'yo.formaColision', valor: '"caja"' },
  { categoria: 'efectos', objetivo: 'yo.polvo', valor: 'verdadero' },
  { categoria: 'efectos', objetivo: 'yo.efecto', valor: '"fuego"' },
  { categoria: 'efectos', objetivo: 'efecto.suave', valor: 'falso' },
  { categoria: 'apariencia', objetivo: 'yo.letra', valor: '"pixel"' },
  // Lo normal es cambiar una barra desde el script de OTRO objeto (el jugador): por eso va también con buscar
  { categoria: 'interfaz', objetivo: 'buscar("Barra").valor', valor: '50' },
  { categoria: 'interfaz', objetivo: 'yo.valor', valor: '50' },
  { categoria: 'movimiento', objetivo: 'yo.x', valor: 'yo.x + controles(1).x * 5' },
  { categoria: 'movimiento', objetivo: 'yo.y', valor: 'yo.y + controles(1).y * 5' },
  { categoria: 'movimiento', objetivo: 'yo.visible', valor: 'controles(1).pulsado("a")' },
  { categoria: 'movimiento', objetivo: 'yo.visible', valor: 'controles(1).sePulso("a")' },
  { categoria: 'movimiento', objetivo: 'yo.visible', valor: 'controles(1).seSolto("a")' },
  { categoria: 'movimiento', objetivo: 'yo.visible', valor: 'controles(1).mando' },
  { categoria: 'interfaz', objetivo: 'juego.tabla', valor: 'puntuaciones.lista()' },
  { categoria: 'interfaz', objetivo: 'yo.visible', valor: 'puntuaciones.entra(juego.puntos)' },
  { categoria: 'interfaz', objetivo: 'yo.minimo', valor: '0' },
  { categoria: 'interfaz', objetivo: 'yo.maximo', valor: '100' },
  { categoria: 'interfaz', objetivo: 'yo.opciones', valor: '["Jugar", "Opciones", "Salir"]' },
  { categoria: 'interfaz', objetivo: 'yo.elegido', valor: '1' },
  { categoria: 'interfaz', objetivo: 'yo.activado', valor: 'falso' },
  { categoria: 'interfaz', objetivo: 'yo.titulo', valor: '"Tienda"' },
  { categoria: 'interfaz', objetivo: 'yo.texto', valor: 'yo.cuantos("llave")' },
  { categoria: 'objetos', objetivo: 'junta.visibles', valor: 'falso' },
  { categoria: 'sonido', objetivo: 'sonido.oyente', valor: 'yo' },
  { categoria: 'sonido', objetivo: 'musica.intensidad', valor: '0.5' },
  { categoria: 'sonido', objetivo: 'musica.tono', valor: '1.2' },
  { categoria: 'efectos', objetivo: 'escena.oscuridad', valor: '0.9' },
  { categoria: 'efectos', objetivo: 'escena.luzAmbiente', valor: '"#0a1030"' },
  { categoria: 'efectos', objetivo: 'yo.luz', valor: 'verdadero' },
  { categoria: 'efectos', objetivo: 'yo.tipoLuz', valor: '"foco"' },
  { categoria: 'efectos', objetivo: 'yo.colorLuz', valor: '"naranja"' },
  { categoria: 'efectos', objetivo: 'yo.radioLuz', valor: '300' },
  { categoria: 'efectos', objetivo: 'yo.intensidadLuz', valor: '0.8' },
  { categoria: 'efectos', objetivo: 'yo.anguloLuz', valor: '40' },
  { categoria: 'efectos', objetivo: 'yo.luzConSombras', valor: 'verdadero' },
  { categoria: 'efectos', objetivo: 'yo.parpadeoLuz', valor: '0.5' },
  { categoria: 'efectos', objetivo: 'pantalla.grises', valor: '1' },
  { categoria: 'efectos', objetivo: 'pantalla.desenfoque', valor: '4' },
  { categoria: 'efectos', objetivo: 'pantalla.pixelado', valor: '4' },
  { categoria: 'efectos', objetivo: 'pantalla.brillo', valor: '0.6' },
  { categoria: 'efectos', objetivo: 'pantalla.vineta', valor: '0.7' },
  { categoria: 'efectos', objetivo: 'pantalla.aberracion', valor: '4' },
  { categoria: 'efectos', objetivo: 'pantalla.crt', valor: 'verdadero' },
  { categoria: 'efectos', objetivo: 'pantalla.bloom', valor: '0.6' },
  { categoria: 'efectos', objetivo: 'yo.contorno', valor: '"blanco"' },
  { categoria: 'efectos', objetivo: 'yo.grosorContorno', valor: '5' },
  { categoria: 'efectos', objetivo: 'yo.brillo', valor: '1.5' },
  { categoria: 'efectos', objetivo: 'yo.grises', valor: '1' },
  { categoria: 'efectos', objetivo: 'yo.desenfoque', valor: '3' },
];

export const datoPorObjetivo = (objetivo: string) => DATOS_CON_BLOQUE.find((d) => d.objetivo === objetivo.trim());

// ───────────────────────── Código → bloques ─────────────────────────

export type ResultadoLectura =
  | { ok: true; bloques: Bloque[]; perdidos: string[] }
  | { ok: false; motivo: string; lineas: number[] };

/**
 * Convierte un script en bloques. Si no se puede (tiene errores de
 * escritura), dice por qué. `perdidos` son cosas que existen en el código
 * pero no en los bloques (comentarios al final de una línea...): hay que avisar.
 */
export function desdeCodigo(codigo: string): ResultadoLectura {
  const { programa, errores } = analizarSintaxis(codigo, 'bloques');
  if (errores.length) {
    return {
      ok: false,
      motivo: `El código tiene ${errores.length === 1 ? 'un error' : `${errores.length} errores`} de escritura, y así no se puede pasar a bloques. Arréglalo primero en el código.`,
      lineas: errores.map((e) => e.ubicacion.linea ?? 0),
    };
  }
  const lineas = codigo.split('\n');
  const notas = leerNotas(lineas);
  const perdidos: string[] = [];
  lineas.forEach((l, i) => {
    if (comentarioAlFinal(l)) perdidos.push(`el comentario del final de la línea ${i + 1}`);
  });
  const bloques = convertirBloque(programa.sentencias, notas, 0);
  // Las notas que no han encontrado sitio (al final de un bloque) van al final, si estaban sin sangría; si no, se pierden
  for (const n of notas) {
    if (n.usada) continue;
    if (n.sangria === 0) bloques.push({ tipo: 'nota', texto: n.texto });
    else perdidos.push(`el comentario de la línea ${n.linea}`);
  }
  return { ok: true, bloques, perdidos };
}

interface Nota {
  linea: number;
  sangria: number;
  texto: string;
  usada: boolean;
}

/** Las líneas que son solo un comentario (# ...), con su sangría. */
function leerNotas(lineas: string[]): Nota[] {
  const r: Nota[] = [];
  lineas.forEach((l, i) => {
    const m = /^(\s*)#\s?(.*)$/.exec(l);
    if (m) r.push({ linea: i + 1, sangria: m[1].replace(/\t/g, '    ').length, texto: m[2], usada: false });
  });
  return r;
}

/** ¿Tiene la línea código y DESPUÉS un comentario? (el # dentro de un texto no cuenta) */
function comentarioAlFinal(linea: string): boolean {
  if (/^\s*#/.test(linea)) return false;
  let comillas: string | null = null;
  for (const c of linea) {
    if (comillas) {
      if (c === comillas) comillas = null;
    } else if (c === '"' || c === "'" || c === '“' || c === '”') comillas = c === '“' ? '”' : c;
    else if (c === '#') return true;
  }
  return false;
}

function convertirBloque(sentencias: BloqueAst, notas: Nota[], sangria: number): Bloque[] {
  const r: Bloque[] = [];
  for (const s of sentencias) {
    // Los comentarios de antes de esta orden, con su misma sangría, van delante como notas
    for (const n of notas) {
      if (!n.usada && n.linea < s.pos.linea && n.sangria === sangria) {
        n.usada = true;
        r.push({ tipo: 'nota', texto: n.texto });
      }
    }
    r.push(convertir(s, notas, sangria));
  }
  return r;
}

function convertir(s: Sentencia, notas: Nota[], sangria: number): Bloque {
  const cuerpo = (b: BloqueAst) => convertirBloque(b, notas, sangria + 4);
  switch (s.tipo) {
    case 'Cuando': {
      const { clase, dato } = leerEvento(s.evento);
      return { tipo: 'evento', clase, dato, cuerpo: cuerpo(s.cuerpo) };
    }
    case 'Funcion':
      return { tipo: 'funcion', nombre: s.original, parametros: s.parametros.map((p) => p.original).join(', '), cuerpo: cuerpo(s.cuerpo) };
    case 'Variable':
      return { tipo: 'variable', nombre: s.original, valor: escribir(s.valor) };
    case 'Asignacion':
      return { tipo: 'asignar', objetivo: escribir(s.objetivo), operador: s.operador, valor: escribir(s.valor) };
    case 'Si':
      return { tipo: 'si', ramas: s.ramas.map((r) => ({ condicion: escribir(r.condicion), cuerpo: cuerpo(r.cuerpo) })), sino: s.sino ? cuerpo(s.sino) : null };
    case 'Mientras':
      return { tipo: 'mientras', condicion: escribir(s.condicion), cuerpo: cuerpo(s.cuerpo) };
    case 'Repetir':
      return { tipo: 'repetir', veces: escribir(s.veces), cuerpo: cuerpo(s.cuerpo) };
    case 'ParaCada':
      return { tipo: 'paraCada', variables: s.variables.map((v) => v.original).join(', '), coleccion: escribir(s.coleccion), cuerpo: cuerpo(s.cuerpo) };
    case 'Devolver':
      return { tipo: 'devolver', valor: s.valor ? escribir(s.valor) : '' };
    case 'Romper':
      return { tipo: 'romper' };
    case 'Continuar':
      return { tipo: 'continuar' };
    case 'ExpresionSuelta':
      return reconocerAccion(s.expresion) ?? { tipo: 'hacer', codigo: escribir(s.expresion) };
  }
}

/** Si la llamada es una acción conocida con el número de valores justo, su bloque. */
function reconocerAccion(e: Expresion): Bloque | null {
  if (e.tipo !== 'Llamada') return null;
  const nombre = escribir(e.funcion);
  const accion = ACCIONES.find((a) => a.funcion.toLowerCase() === nombre.toLowerCase() && a.porDefecto.length === e.argumentos.length);
  return accion ? { tipo: 'accion', accion: accion.id, campos: e.argumentos.map(escribir) } : null;
}

function leerEvento(ev: Evento): { clase: ClaseEvento; dato: string } {
  switch (ev.tipo) {
    case 'empieza':
    case 'fotograma':
    case 'animacion':
    case 'pantalla':
    case 'cambia':
      return { clase: ev.tipo, dato: '' };
    case 'intervalo':
      return { clase: 'cada', dato: escribir(ev.segundos) };
    case 'pasen':
      return { clase: 'pasen', dato: escribir(ev.segundos) };
    case 'tecla':
      return { clase: ev.modo, dato: ev.teclas.map(escribir).join(', ') };
    case 'toco':
      return { clase: ev.dejar ? 'dejoDeTocar' : 'toco', dato: ev.original ?? '' };
    case 'clic':
      return { clase: ev.encima ? 'clicEncima' : 'clic', dato: '' };
    case 'recibo':
      return { clase: 'recibo', dato: ev.original };
  }
}

// ───────────────────────── Escribir expresiones ─────────────────────────

/** Fuerza de cada operador (más alto = se agrupa antes), como en el parser. */
const FUERZA: Record<string, number> = { o: 1, y: 2, no: 3, '==': 4, '!=': 4, '<': 4, '>': 4, '<=': 4, '>=': 4, en: 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

function fuerzaDe(e: Expresion): number {
  if (e.tipo === 'Binaria' || e.tipo === 'Logica') return FUERZA[e.operador];
  if (e.tipo === 'Unaria') return e.operador === 'no' ? 3 : 7;
  return 9;
}

/** Escribe una expresión como código Chispa (con paréntesis solo donde hacen falta). */
export function escribir(e: Expresion): string {
  const conFuerza = (hijo: Expresion, minima: number) => (fuerzaDe(hijo) < minima ? `(${escribir(hijo)})` : escribir(hijo));
  switch (e.tipo) {
    case 'Numero':
      return String(e.valor);
    case 'Texto':
      return `"${(e.partes ?? [e.valor]).map((p) => (typeof p === 'string' ? escaparTexto(p, !!e.partes) : `{${escribir(p)}}`)).join('')}"`;
    case 'Logico':
      return e.valor ? 'verdadero' : 'falso';
    case 'Nulo':
      return 'nulo';
    case 'Identificador':
      return e.original;
    case 'Lista':
      return `[${e.elementos.map(escribir).join(', ')}]`;
    case 'Tabla':
      return `{${e.entradas.map((x) => `${/^[\p{L}_][\p{L}\p{N}_]*$/u.test(x.original) ? x.original : JSON.stringify(x.original)}: ${escribir(x.valor)}`).join(', ')}}`;
    case 'Binaria':
    case 'Logica': {
      const f = FUERZA[e.operador];
      // El de la derecha con la misma fuerza necesita paréntesis: a - (b - c)
      return `${conFuerza(e.izquierda, f)} ${e.operador} ${conFuerza(e.derecha, f + 1)}`;
    }
    case 'Unaria':
      return e.operador === 'no' ? `no ${conFuerza(e.operando, 3)}` : `-${conFuerza(e.operando, 7)}`;
    case 'Llamada':
      return `${conFuerza(e.funcion, 9)}(${e.argumentos.map(escribir).join(', ')})`;
    case 'Miembro':
      return `${conFuerza(e.objeto, 9)}.${e.original}`;
    case 'Indice':
      return `${conFuerza(e.objeto, 9)}[${escribir(e.indice)}]`;
  }
}

function escaparTexto(t: string, conHuecos: boolean): string {
  let r = t.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  if (conHuecos) r = r.replace(/\{/g, '{{').replace(/\}/g, '}}');
  return r;
}

// ───────────────────────── Bloques → código ─────────────────────────

export interface CodigoGenerado {
  codigo: string;
  /** En qué línea (empezando en 1) empieza cada bloque, por su id: para resaltar el bloque de un error. */
  lineaDe: Map<number, number>;
}

/** Escribe los bloques como código Chispa (sangría de 4 espacios, una línea en blanco entre los de arriba). */
export function aCodigo(bloques: Bloque[]): CodigoGenerado {
  const lineas: string[] = [];
  const lineaDe = new Map<number, number>();
  const escribirBloque = (b: Bloque, sangria: string): void => {
    if (b.id !== undefined) lineaDe.set(b.id, lineas.length + 1);
    const l = (t: string): void => void lineas.push(sangria + t);
    switch (b.tipo) {
      case 'evento':
        l(`${cabeceraEvento(b.clase, b.dato)}:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'funcion':
        l(`funcion ${b.nombre}(${b.parametros}):`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'variable':
        return l(`variable ${b.nombre} = ${b.valor}`);
      case 'asignar':
        return l(`${b.objetivo} ${b.operador} ${b.valor}`);
      case 'si':
        b.ramas.forEach((r, i) => {
          l(`${i === 0 ? 'si' : 'sino si'} ${r.condicion}:`);
          cuerpoONada(r.cuerpo, sangria);
        });
        if (b.sino) {
          l('sino:');
          cuerpoONada(b.sino, sangria);
        }
        return;
      case 'mientras':
        l(`mientras ${b.condicion}:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'repetir':
        l(`repetir ${b.veces} veces:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'paraCada':
        l(`para cada ${b.variables} en ${b.coleccion}:`);
        return cuerpoONada(b.cuerpo, sangria);
      case 'devolver':
        return l(b.valor ? `devolver ${b.valor}` : 'devolver');
      case 'romper':
        return l('romper');
      case 'continuar':
        return l('continuar');
      case 'accion': {
        const a = accionPorId(b.accion)!;
        return l(`${a.funcion}(${b.campos.join(', ')})`);
      }
      case 'hacer':
        return l(b.codigo);
      case 'nota':
        return l(`# ${b.texto}`);
    }
  };
  // Un «si» o un «repetir» sin nada dentro no está terminado: en el código queda un bloque vacío
  // (que el código marca como error, igual que si se escribiera a mano) con una nota que lo explica
  const cuerpoONada = (bs: Bloque[], sangria: string) => {
    for (const b of bs) escribirBloque(b, sangria + '    ');
    if (!bs.some((b) => b.tipo !== 'nota')) lineas.push(`${sangria}    # (vacío: falta lo que tiene que hacer)`);
  };
  bloques.forEach((b, i) => {
    if (i > 0 && (esDeArriba(b) || esDeArriba(bloques[i - 1]))) lineas.push('');
    escribirBloque(b, '');
  });
  return { codigo: lineas.join('\n') + '\n', lineaDe };
}

const esDeArriba = (b: Bloque) => b.tipo === 'evento' || b.tipo === 'funcion';

/** La línea del «cuando» (sin los dos puntos). */
export function cabeceraEvento(clase: ClaseEvento, dato: string): string {
  switch (clase) {
    case 'empieza':
      return 'cuando empieza';
    case 'fotograma':
      return 'cuando cada fotograma';
    case 'cada':
      return `cuando cada ${dato || '1'} segundos`;
    case 'pasen':
      return `cuando pasen ${dato || '1'} segundos`;
    case 'pulsa':
    case 'mantiene':
    case 'suelta':
      return `cuando se ${clase} ${dato || '"espacio"'}`;
    case 'toco':
      return dato.trim() ? `cuando toco ${dato.trim()}` : 'cuando toco';
    case 'dejoDeTocar':
      return `cuando dejo de tocar ${dato.trim() || 'Nombre'}`;
    case 'clic':
      return 'cuando hago clic';
    case 'clicEncima':
      return 'cuando hago clic encima';
    case 'cambia':
      return 'cuando cambia';
    case 'animacion':
      return 'cuando termina la animacion';
    case 'pantalla':
      return 'cuando salgo de la pantalla';
    case 'recibo':
      return `cuando recibo "${dato.replace(/"/g, '')}"`;
  }
}
