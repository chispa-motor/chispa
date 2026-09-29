/**
 * Punto de entrada. Elige qué arrancar según la dirección:
 *   http://localhost:5173/           → juego de plataformas en Chispa (Fase 3)
 *   http://localhost:5173/?demo=1    → demo de la Fase 1
 *   http://localhost:5173/?demo=2    → demo de la Fase 2
 */
import './estilos.css';
import { Motor } from './motor/Motor';
import { mostrarError } from './motor/Errores';
import { JuegoEnMarcha } from './proyecto/Proyecto';
import { proyectoPlataformas } from './juegos/plataformas/proyecto';
import { demoFase1 } from './demos/demoFase1';
import { demoFase2 } from './demos/demoFase2';

const canvas = document.querySelector<HTMLCanvasElement>('#lienzo')!;
const demo = new URLSearchParams(location.search).get('demo');

// Marcar en el menú la opción activa
document.querySelectorAll<HTMLAnchorElement>('#menu-demos a').forEach((a) => {
  if ((a.dataset.demo ?? '') === (demo ?? '')) a.classList.add('activo');
});

async function arrancar(): Promise<void> {
  try {
    if (demo === '1') await demoFase1(new Motor({ canvas }));
    else if (demo === '2') await demoFase2(new Motor({ canvas }));
    else {
      const p = proyectoPlataformas;
      const motor = new Motor({ canvas, ancho: p.ancho, alto: p.alto, pixelArt: p.pixelArt });
      await JuegoEnMarcha.arrancar(motor, p);
    }
  } catch (error) {
    mostrarError(error);
  }
}

arrancar();
