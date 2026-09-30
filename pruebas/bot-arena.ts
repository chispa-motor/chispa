/** El "bot" que juega a la Arena de Habilidades en los tests (ver arena.test.ts). */
import type { juegoDePrueba } from './ayudantes';
import { Vector2 } from '../src/motor/Vector2';

type Juego = ReturnType<typeof juegoDePrueba>;

/**
 * Un "bot" que juega: apunta al enemigo más cercano, se aleja si está cerca,
 * usa el orbe a menudo, la nova si le rodean, el escudo si tiene poca vida y
 * la Tormenta cuando está cargada. En los diálogos elige la primera opción.
 */
export function jugarUnRato(j: Juego, fotogramas: number) {
  const entrada = j.juego.motor.entrada;
  const pulsadas = new Set<string>();
  const mantener = (teclas: string[]) => {
    for (const t of [...pulsadas]) if (!teclas.includes(t)) (j.soltar(t), pulsadas.delete(t));
    for (const t of teclas) if (!pulsadas.has(t)) (j.pulsar(t), pulsadas.add(t));
  };
  for (let f = 0; f < fotogramas; f++) {
    const escena = j.juego.escena;
    if (escena.enDialogo) {
      mantener(f % 2 ? [] : ['Space']);
      j.avanzar(1);
      continue;
    }
    const yo = escena.buscar('Jugador');
    const enemigos = escena.objetos.filter((o) => !o.destruido && o.etiquetas.has('enemigo'));
    const teclas: string[] = [];
    if (yo && enemigos.length) {
      const cerca = enemigos.reduce((a, b) => (a.posicion.distancia(yo.posicion) < b.posicion.distancia(yo.posicion) ? a : b));
      entrada.posicionRaton = new Vector2(cerca.posicion.x, 720 - cerca.posicion.y);
      const d = cerca.posicion.distancia(yo.posicion);
      // Se aleja del más cercano (hacia el centro si está en un borde)
      const huir = yo.posicion.restar(cerca.posicion).normalizado().sumar(new Vector2(640, 320).restar(yo.posicion).normalizado().multiplicar(0.8));
      if (d < 260) {
        if (huir.x > 0.3) teclas.push('KeyD');
        if (huir.x < -0.3) teclas.push('KeyA');
        if (huir.y > 0.3) teclas.push('KeyW');
        if (huir.y < -0.3) teclas.push('KeyS');
      }
      const vida = (yo.propiedades.get('vida') as { valor: number }).valor;
      const carga = (yo.propiedades.get('carga') as { valor: number }).valor;
      const rodeado = enemigos.filter((e) => e.posicion.distancia(yo.posicion) < 150).length;
      if (f % 8 === 0) teclas.push('Digit2');
      if (rodeado >= 2 && f % 5 === 0) teclas.push('Digit3');
      if (vida < 50 && f % 5 === 1) teclas.push('Digit4');
      if (d < 90 && f % 7 === 2) teclas.push('Digit1');
      if (carga >= 100) teclas.push('Digit5');
    }
    mantener(teclas);
    j.avanzar(1);
  }
  mantener([]);
}

