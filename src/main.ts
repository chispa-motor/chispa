/**
 * DEMO DE LA FASE 1
 *
 * Sirve para probar el núcleo del motor: bucle, delta time, formas,
 * imágenes, texto, teclado y ratón.
 *
 * Esta demo está escrita en TypeScript "a mano". En la Fase 2 la haremos con
 * objetos y componentes, y en la Fase 3 la escribiremos en Chispa.
 */
import './estilos.css';
import { Motor } from './motor/Motor';
import { Vector2 } from './motor/Vector2';
import { mostrarError } from './motor/Errores';

const canvas = document.querySelector<HTMLCanvasElement>('#lienzo')!;
const motor = new Motor({ canvas, ancho: 960, alto: 540, colorFondo: '#1b1d2a' });
const { entrada, recursos, tiempo } = motor;

// ───────────────────────── Estado de la demo ─────────────────────────

const jugador = {
  posicion: new Vector2(480, 300),
  velocidad: 320, // píxeles por SEGUNDO (no por fotograma)
  rotacion: 0,
  tamano: 72,
  indiceColor: 0,
};
const COLORES_HALO = ['amarillo', 'cian', 'rosa', 'verde', 'naranja'];

interface Particula {
  posicion: Vector2;
  velocidad: Vector2;
  vida: number;
  vidaMaxima: number;
  color: string;
  radio: number;
}
const particulas: Particula[] = [];
const GRAVEDAD = 700; // píxeles/segundo², hace que las partículas caigan

function crearExplosion(centro: Vector2): void {
  for (let i = 0; i < 24; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const rapidez = 120 + Math.random() * 260;
    const vida = 0.6 + Math.random() * 0.8;
    particulas.push({
      posicion: centro.copiar(),
      velocidad: new Vector2(Math.cos(angulo) * rapidez, Math.sin(angulo) * rapidez - 150),
      vida,
      vidaMaxima: vida,
      color: COLORES_HALO[i % COLORES_HALO.length],
      radio: 3 + Math.random() * 5,
    });
  }
}

// ───────────────────────── Actualizar ─────────────────────────

motor.alActualizar((dt) => {
  // Pausa: fíjate en que la entrada SIGUE funcionando (si no, no podrías quitar la pausa).
  if (entrada.sePulso('p')) tiempo.escala = tiempo.escala === 0 ? 1 : 0;
  if (entrada.sePulso('c')) tiempo.escala = tiempo.escala === 0.3 ? 1 : 0.3; // cámara lenta

  // Dirección a partir de flechas o WASD
  let direccion = Vector2.cero();
  if (entrada.estaPulsada('izquierda') || entrada.estaPulsada('a')) direccion.x -= 1;
  if (entrada.estaPulsada('derecha') || entrada.estaPulsada('d')) direccion.x += 1;
  if (entrada.estaPulsada('arriba') || entrada.estaPulsada('w')) direccion.y -= 1; // Y hacia abajo: subir es restar
  if (entrada.estaPulsada('abajo') || entrada.estaPulsada('s')) direccion.y += 1;
  // Normalizamos para que en diagonal no vaya un 41 % más rápido (√2 ≈ 1,41).
  direccion = direccion.normalizado();

  // Mayús = correr
  const rapidez = jugador.velocidad * (entrada.estaPulsada('mayus') ? 2 : 1);
  jugador.posicion = jugador.posicion.sumar(direccion.multiplicar(rapidez * dt));

  // No salirse de la pantalla
  const m = jugador.tamano / 2;
  jugador.posicion.x = Math.min(Math.max(jugador.posicion.x, m), 960 - m);
  jugador.posicion.y = Math.min(Math.max(jugador.posicion.y, m), 540 - m);

  // Q / E = rotar 180 grados por segundo
  if (entrada.estaPulsada('q')) jugador.rotacion -= 180 * dt;
  if (entrada.estaPulsada('e')) jugador.rotacion += 180 * dt;

  // Espacio = cambiar el color del halo (sePulso: una vez por pulsación, aunque la mantengas)
  if (entrada.sePulso('espacio')) jugador.indiceColor = (jugador.indiceColor + 1) % COLORES_HALO.length;

  // Ratón: clic izquierdo = explosión, clic derecho = borrar partículas
  if (entrada.ratonSePulso('izquierdo')) crearExplosion(entrada.posicionRaton);
  if (entrada.ratonPulsado('derecho')) particulas.length = 0;
  // Rueda = cambiar tamaño
  jugador.tamano = Math.min(160, Math.max(32, jugador.tamano - entrada.rueda * 8));

  // Partículas: física muy simple (la Fase 2 la hará en serio)
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.velocidad.y += GRAVEDAD * dt;
    p.posicion = p.posicion.sumar(p.velocidad.multiplicar(dt));
    p.vida -= dt;
    if (p.vida <= 0) particulas.splice(i, 1); // recorremos al revés para poder borrar sin saltarnos ninguna
  }
});

// ───────────────────────── Dibujar ─────────────────────────

motor.alDibujar((r) => {
  // Cuadrícula de fondo
  for (let x = 0; x <= 960; x += 48) r.linea(x, 0, x, 540, '#262a3d', 1);
  for (let y = 0; y <= 540; y += 48) r.linea(0, y, 960, y, '#262a3d', 1);

  // Formas que se animan con el tiempo total (prueba del delta time)
  r.rectangulo(760, 380, 90, 90, 'morado', { rotacion: tiempo.total * 90 });
  r.rectangulo(760, 380, 90, 90, 'blanco', { relleno: false, grosor: 3, rotacion: -tiempo.total * 45 });
  r.circulo(140, 430, 40 + Math.sin(tiempo.total * 3) * 15, 'azul');
  r.circulo(140, 430, 70, 'azul', { relleno: false, grosor: 2 });

  // Jugador: halo + imagen
  const { x, y } = jugador.posicion;
  r.circulo(x, y, jugador.tamano * 0.62, COLORES_HALO[jugador.indiceColor]);
  r.imagen(recursos.imagen('estrella'), x, y, {
    ancho: jugador.tamano,
    alto: jugador.tamano,
    rotacion: jugador.rotacion,
  });

  // Partículas (se desvanecen según la vida que les queda)
  for (const p of particulas) {
    r.ctx.globalAlpha = Math.max(0, p.vida / p.vidaMaxima);
    r.circulo(p.posicion.x, p.posicion.y, p.radio, p.color);
  }
  r.ctx.globalAlpha = 1;

  // Cursor
  const raton = entrada.posicionRaton;
  r.circulo(raton.x, raton.y, 10, entrada.ratonPulsado() ? 'rojo' : 'blanco', { relleno: false, grosor: 2 });
  r.linea(raton.x - 16, raton.y, raton.x + 16, raton.y, 'blanco', 1);
  r.linea(raton.x, raton.y - 16, raton.x, raton.y + 16, 'blanco', 1);

  // Panel de información (HUD)
  r.rectangulo(10, 10, 330, 150, 'rgba(0,0,0,0.55)');
  const estado = tiempo.escala === 0 ? '  ⏸ PAUSA' : tiempo.escala < 1 ? '  🐢 CÁMARA LENTA' : '';
  r.texto(`Chispa · Fase 1${estado}`, 22, 20, { tamano: 20, negrita: true, color: 'amarillo' });
  r.texto(`FPS: ${tiempo.fps}`, 22, 50);
  r.texto(`Delta time: ${(tiempo.deltaReal * 1000).toFixed(1)} ms`, 22, 72);
  r.texto(`Ratón: ${raton}`, 22, 94);
  r.texto(`Teclas: ${entrada.teclasPulsadas().join(', ') || '—'}`, 22, 116);
  r.texto(`Partículas: ${particulas.length}`, 22, 138);

  // Controles
  r.texto('Flechas/WASD mover · Mayús correr · Q/E rotar · Espacio color', 950, 494, { alinear: 'derecha', tamano: 15, color: 'gris' });
  r.texto('Clic izq. explosión · Clic der. borrar · Rueda tamaño · P pausa · C cámara lenta', 950, 514, { alinear: 'derecha', tamano: 15, color: 'gris' });
});

// ───────────────────────── Arrancar ─────────────────────────

async function arrancar(): Promise<void> {
  try {
    // Primero cargamos las imágenes y DESPUÉS arrancamos el bucle.
    await recursos.cargarImagenes({ estrella: 'imagenes/estrella.svg' });
    motor.iniciar();
  } catch (error) {
    mostrarError(error);
  }
}

arrancar();
