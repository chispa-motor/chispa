/**
 * DEMO DE LA FASE 2: objetos y componentes (todavía en TypeScript).
 *
 * Coordenadas del MUNDO: la Y crece hacia ARRIBA y (0,0) es la esquina
 * inferior izquierda. Por eso el suelo está en y = 20 y saltar es sumar.
 *
 * Fíjate en que ya no hay que mover ni dibujar nada a mano: creamos objetos,
 * les ponemos componentes y la Escena se encarga de todo. El jugador usa un
 * componente Script escrito en TypeScript; en la Fase 3 esto mismo se
 * escribe en Chispa.
 */
import type { Motor } from '../motor/Motor';
import { Escena } from '../objetos/Escena';
import { Colision } from '../objetos/componentes/Colision';
import { Fisica } from '../objetos/componentes/Fisica';
import { Script } from '../objetos/componentes/Script';
import { Sprite } from '../objetos/componentes/Sprite';

export async function demoFase2(motor: Motor): Promise<void> {
  await motor.recursos.cargarImagenes({ estrella: 'imagenes/estrella.svg' });
  motor.colorFondo = '#20243a';
  const escena = new Escena(motor);
  const { entrada } = motor;
  let puntos = 0;
  let verCajas = false;

  // ── Bloques sólidos: Sprite + Colisión (sin Física = no se mueven) ──
  function bloque(x: number, y: number, ancho: number, alto: number, color: string) {
    const o = escena.crear('Suelo').en(x, y);
    Object.assign(o.agregar(new Sprite()), { ancho, alto, color });
    o.agregar(new Colision());
  }
  bloque(480, 20, 960, 40, 'verde'); // suelo (abajo del todo)
  bloque(10, 270, 20, 540, 'gris');
  bloque(950, 270, 20, 540, 'gris');
  bloque(250, 140, 220, 24, 'marron');
  bloque(700, 230, 220, 24, 'marron');
  bloque(470, 340, 140, 24, 'marron');

  // ── Jugador: Sprite + Colisión + Física + Script ──
  const jugador = escena.crear('Jugador').en(100, 100);
  Object.assign(jugador.agregar(new Sprite()), { imagen: 'estrella', ancho: 48, alto: 48, capa: 2 });
  Object.assign(jugador.agregar(new Colision()), { ancho: 40, alto: 44 });
  const fisica = jugador.agregar(new Fisica());
  jugador.agregar(
    new Script({
      alActualizar(yo) {
        let dir = 0;
        if (entrada.estaPulsada('izquierda') || entrada.estaPulsada('a')) dir -= 1;
        if (entrada.estaPulsada('derecha') || entrada.estaPulsada('d')) dir += 1;
        fisica.velocidad.x = dir * 280;
        if (dir !== 0) yo.transformacion.rotacion += dir * 6; // rueda al andar
        // Saltar solo si está en el suelo (lo calcula la física)
        if ((entrada.sePulso('espacio') || entrada.sePulso('arriba')) && fisica.enSuelo) fisica.velocidad.y = 640; // positivo = hacia arriba
      },
      alTocar(_yo, otro) {
        if (otro.tipo === 'Moneda') {
          otro.destruir();
          puntos++;
        }
      },
    }),
  );

  // ── Monedas que caen donde haces clic (con física, así que chocan con las plataformas) ──
  motor.alActualizar(() => {
    if (entrada.sePulso('c')) verCajas = !verCajas;
    if (entrada.ratonSePulso('izquierdo')) {
      const p = escena.ratonEnMundo();
      const m = escena.crear('Moneda').en(p.x, p.y);
      Object.assign(m.agregar(new Sprite()), { forma: 'circulo', color: 'amarillo', ancho: 26, alto: 26, capa: 1 });
      m.agregar(new Colision());
      m.agregar(new Fisica()).gravedad = 0.6;
    }
  });

  // ── Encima de la escena: marcador y (opcional) las cajas de colisión ──
  motor.alDibujar((r) => {
    if (verCajas) {
      for (const o of escena.objetos) {
        const c = o.obtener(Colision);
        if (!c) continue;
        const k = c.caja();
        // La caja está en el mundo (Y arriba): su esquina superior izquierda en pantalla es (izquierda, arriba)
        const esquina = escena.camara.mundoAPantalla(k.izquierda, k.arriba);
        r.rectangulo(esquina.x, esquina.y, k.derecha - k.izquierda, k.arriba - k.abajo, c.solido ? 'cian' : 'amarillo', {
          relleno: false,
          grosor: 2,
        });
      }
      const f = fisica;
      r.texto(`enSuelo: ${f.enSuelo}  tocaPared: ${f.tocaPared}  tocaTecho: ${f.tocaTecho}`, 30, 60, {
        tamano: 16,
        sombra: true,
      });
    }
    r.texto(`Chispa · Fase 2   Bolas: ${puntos}   Objetos: ${escena.objetos.length}`, 30, 26, {
      tamano: 20,
      negrita: true,
      color: 'amarillo',
      sombra: true,
    });
    r.texto('Flechas/WASD mover · Espacio saltar · Clic: soltar bola · C: ver cajas de colisión', 930, 490, {
      tamano: 15,
      alinear: 'derecha',
      color: 'blanco',
    });
  });

  motor.escena = escena;
  escena.iniciar();
  motor.iniciar();
}
