/**
 * Punto de entrada. Elige qué arrancar según la dirección:
 *   http://localhost:5173/           → ejemplo mínimo en Chispa
 *   http://localhost:5173/?demo=1    → demo de la Fase 1 (núcleo)
 *   http://localhost:5173/?demo=2    → demo de la Fase 2 (objetos y componentes)
 * En la Fase 3D esto se sustituirá por la Zona de Programación.
 */
import './estilos.css';
import { Motor } from './motor/Motor';
import { mostrarError } from './motor/Errores';
import { demoFase1 } from './demos/demoFase1';
import { demoFase2 } from './demos/demoFase2';
import { JuegoEnMarcha } from './proyecto/Proyecto';
import { proyectoMinimo } from './ejemplos/minimo/proyecto';

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
    else await JuegoEnMarcha.arrancar(new Motor({ canvas }), proyectoMinimo);
  } catch (error) {
    mostrarError(error);
  }
}

arrancar();
